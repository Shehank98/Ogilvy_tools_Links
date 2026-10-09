import { promises as fs } from "fs";
import path from "path";

/**
 * Object storage for ticket attachments.
 *
 *  - "firebase": Firebase Storage (a Google Cloud Storage bucket), used in
 *    production. Needs FIREBASE_STORAGE_BUCKET and a service account in
 *    FIREBASE_SERVICE_ACCOUNT (JSON) or FIREBASE_SERVICE_ACCOUNT_BASE64.
 *  - "local": plain files under ./.uploads, for development and tests only
 *    (set STORAGE_DRIVER=local). Not suitable for production: the disk of a
 *    hosted container is wiped on every deploy.
 *
 * Both are used through the same small functions below, so the rest of the app
 * does not care which one is active.
 */

export type StorageDriver = "firebase" | "local" | null;

export function storageDriver(): StorageDriver {
  if (process.env.STORAGE_DRIVER === "local") return "local";
  if (
    process.env.FIREBASE_STORAGE_BUCKET &&
    (process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64)
  ) {
    return "firebase";
  }
  return null;
}

export const storageEnabled = () => storageDriver() !== null;

/* ------------------------------- firebase ------------------------------- */

type GcsBucket = import("@google-cloud/storage").Bucket;
let bucketPromise: Promise<GcsBucket> | null = null;

function serviceAccount(): { project_id: string; client_email: string; private_key: string } {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
    ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8")
    : (process.env.FIREBASE_SERVICE_ACCOUNT ?? "");
  const j = JSON.parse(raw.trim());
  if (!j.client_email || !j.private_key) throw new Error("service account JSON is missing client_email / private_key");
  // Pasted env values often carry literal "\n" instead of real newlines.
  return { ...j, private_key: String(j.private_key).replace(/\\n/g, "\n") };
}

function bucket(): Promise<GcsBucket> {
  bucketPromise ??= (async () => {
    const { Storage } = await import("@google-cloud/storage");
    const sa = serviceAccount();
    const storage = new Storage({
      projectId: sa.project_id,
      credentials: { client_email: sa.client_email, private_key: sa.private_key },
    });
    return storage.bucket(process.env.FIREBASE_STORAGE_BUCKET!);
  })();
  // If setup failed, allow a retry on the next call instead of caching the failure.
  bucketPromise.catch(() => (bucketPromise = null));
  return bucketPromise;
}

/* --------------------------------- local -------------------------------- */

const localRoot = () => path.resolve(process.env.LOCAL_UPLOAD_DIR ?? ".uploads");

function localPath(objectPath: string): string {
  const root = localRoot();
  const full = path.resolve(root, objectPath);
  if (full !== root && !full.startsWith(root + path.sep)) throw new Error("Invalid storage path");
  return full;
}

/* ------------------------------ public API ------------------------------ */

export async function putObject(objectPath: string, data: Buffer, contentType: string): Promise<void> {
  if (storageDriver() === "local") {
    const full = localPath(objectPath);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return;
  }
  const b = await bucket();
  await b.file(objectPath).save(data, { contentType, resumable: false, metadata: { cacheControl: "private, max-age=0" } });
}

/** Deletes objects; one that is already gone is not an error. */
export async function deleteObjects(paths: string[]): Promise<void> {
  if (!paths.length) return;
  if (storageDriver() === "local") {
    await Promise.all(paths.map((p) => fs.rm(localPath(p), { force: true })));
    return;
  }
  const b = await bucket();
  await Promise.all(paths.map((p) => b.file(p).delete({ ignoreNotFound: true })));
}

/** Removes everything under a folder such as "tickets/TH-0031/" (and the empty folder itself). */
export async function deletePrefix(prefix: string): Promise<void> {
  if (storageDriver() === "local") {
    await fs.rm(localPath(prefix), { recursive: true, force: true });
    return;
  }
  const b = await bucket();
  await b.deleteFiles({ prefix, force: true });
}

export type OpenResult =
  | { kind: "redirect"; url: string }
  | { kind: "bytes"; data: Buffer };

/** A way to hand a stored file to an admin: a short-lived signed link (Firebase)
 *  or the bytes themselves (local). */
export async function openObject(
  objectPath: string,
  opts: { contentType: string; fileName: string; inline: boolean }
): Promise<OpenResult> {
  if (storageDriver() === "local") {
    return { kind: "bytes", data: await fs.readFile(localPath(objectPath)) };
  }
  const b = await bucket();
  const [url] = await b.file(objectPath).getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + 2 * 60 * 1000,
    responseType: opts.contentType,
    responseDisposition: `${opts.inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(opts.fileName)}`,
  });
  return { kind: "redirect", url };
}

/** Plain-language check for /api/health. Writes nothing. */
export async function diagnoseStorage(): Promise<string> {
  const d = storageDriver();
  if (d === "local") return "ok (local disk, for development only)";
  if (d === null) {
    const hasBucket = !!process.env.FIREBASE_STORAGE_BUCKET;
    const hasKey = !!(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
    if (!hasBucket && !hasKey) return "NOT CONFIGURED: file uploads are switched off. Set FIREBASE_STORAGE_BUCKET and FIREBASE_SERVICE_ACCOUNT to enable them.";
    return `INCOMPLETE: ${hasBucket ? "FIREBASE_SERVICE_ACCOUNT" : "FIREBASE_STORAGE_BUCKET"} is missing, so file uploads are switched off.`;
  }
  try {
    serviceAccount();
  } catch (e) {
    return `FAILED: the service account value is not valid JSON for a Firebase key (${e instanceof Error ? e.message : String(e)}). Paste the whole downloaded .json file, or use FIREBASE_SERVICE_ACCOUNT_BASE64.`;
  }
  try {
    const b = await bucket();
    const [exists] = await b.exists();
    if (!exists) return `FAILED: the bucket "${process.env.FIREBASE_STORAGE_BUCKET}" was not found. Copy the bucket name from Firebase → Storage (for example my-app.firebasestorage.app), without "gs://".`;
    return `ok (Firebase bucket ${process.env.FIREBASE_STORAGE_BUCKET})`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/403|permission|forbidden/i.test(msg)) return "FAILED: the service account is not allowed to use this bucket. In Google Cloud → IAM give it the role 'Storage Object Admin' (or use the Firebase Admin SDK key).";
    return `FAILED: could not reach Firebase Storage (${msg.slice(0, 160)}).`;
  }
}
