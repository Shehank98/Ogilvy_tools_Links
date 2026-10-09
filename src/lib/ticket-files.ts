import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { ticketCode } from "@/lib/tickets";
import { deleteObjects, deletePrefix, putObject, storageEnabled } from "@/lib/storage";
import { ALLOWED_TYPES, checkFileSet, extOf } from "@/lib/uploads";

export type PreparedUpload = { name: string; contentType: string; data: Buffer };

/** First bytes of common formats, so a renamed .exe cannot pass as a .png. */
function looksRight(ext: string, d: Buffer): boolean {
  const starts = (...b: number[]) => b.every((x, i) => d[i] === x);
  switch (ext) {
    case "png": return starts(0x89, 0x50, 0x4e, 0x47);
    case "jpg":
    case "jpeg": return starts(0xff, 0xd8, 0xff);
    case "gif": return starts(0x47, 0x49, 0x46, 0x38);
    case "pdf": return starts(0x25, 0x50, 0x44, 0x46);
    case "webp": return d.length > 12 && d.toString("ascii", 0, 4) === "RIFF" && d.toString("ascii", 8, 12) === "WEBP";
    case "zip":
    case "docx":
    case "xlsx":
    case "pptx": return starts(0x50, 0x4b);
    default: return true;
  }
}

const safeName = (n: string) =>
  n.normalize("NFKD").replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim().slice(-90) || "file";

/** Reads and validates the uploaded files. Returns an error message or the ready-to-store files. */
export async function prepareUploads(
  files: File[]
): Promise<{ error: string } | { files: PreparedUpload[] }> {
  if (files.length === 0) return { files: [] };
  if (!storageEnabled()) return { error: "File uploads are not switched on yet. Please submit the ticket without attachments." };
  const meta = checkFileSet(files);
  if (meta) return { error: meta };

  const out: PreparedUpload[] = [];
  for (const f of files) {
    const ext = extOf(f.name);
    const data = Buffer.from(await f.arrayBuffer());
    if (!looksRight(ext, data)) return { error: `"${f.name}" does not look like a real .${ext} file.` };
    out.push({ name: safeName(f.name), contentType: ALLOWED_TYPES[ext], data });
  }
  return { files: out };
}

/** Stores files under tickets/<TICKET-CODE>/ and records them. A failed file is
 *  counted and skipped so one bad upload never loses the ticket. */
export async function saveTicketFiles(
  ticket: { id: string; ticketNo: number },
  files: PreparedUpload[]
): Promise<{ saved: number; failed: number }> {
  let saved = 0;
  let failed = 0;
  const folder = `tickets/${ticketCode(ticket.ticketNo)}`;
  for (const f of files) {
    const objectPath = `${folder}/${randomBytes(4).toString("hex")}-${f.name}`;
    try {
      await putObject(objectPath, f.data, f.contentType);
      await prisma.ticketFile.create({
        data: {
          feedbackId: ticket.id,
          name: f.name,
          path: objectPath,
          size: f.data.length,
          contentType: f.contentType,
        },
      });
      saved++;
    } catch (e) {
      failed++;
      console.error(`[files] upload failed for ${objectPath}:`, e);
      await deleteObjects([objectPath]).catch(() => {});
    }
  }
  return { saved, failed };
}

/** Deletes a ticket's files from storage and marks them removed. Safe to call
 *  repeatedly. Returns how many files were removed. */
export async function purgeTicketFiles(
  feedbackId: string
): Promise<{ removed: number; failed: boolean }> {
  const live = await prisma.ticketFile.findMany({
    where: { feedbackId, deletedAt: null },
    select: { id: true, path: true, feedback: { select: { ticketNo: true } } },
  });
  if (live.length === 0) return { removed: 0, failed: false };
  try {
    await deleteObjects(live.map((f) => f.path));
    // Belt and braces: also clear the ticket's folder in case anything else is in it.
    await deletePrefix(`tickets/${ticketCode(live[0].feedback.ticketNo)}/`);
  } catch (e) {
    console.error(`[files] could not delete files for ticket ${feedbackId}:`, e);
    return { removed: 0, failed: true }; // rows stay "live" so the clean-up job retries
  }
  await prisma.ticketFile.updateMany({
    where: { id: { in: live.map((f) => f.id) } },
    data: { deletedAt: new Date() },
  });
  return { removed: live.length, failed: false };
}

/** Clean-up sweep: removes files that belong to tickets already Done or Closed
 *  (for example when an earlier delete failed). Run by /api/cron/purge-files. */
export async function purgeResolvedStragglers(): Promise<{ tickets: number; removed: number; failed: number }> {
  const stale = await prisma.ticketFile.findMany({
    where: { deletedAt: null, feedback: { status: { in: ["DONE", "DISMISSED"] } } },
    select: { feedbackId: true },
    distinct: ["feedbackId"],
  });
  let removed = 0;
  let failed = 0;
  for (const { feedbackId } of stale) {
    const r = await purgeTicketFiles(feedbackId);
    removed += r.removed;
    if (r.failed) failed++;
  }
  return { tickets: stale.length, removed, failed };
}

export const isFinalStatus = (s: string) => s === "DONE" || s === "DISMISSED";
