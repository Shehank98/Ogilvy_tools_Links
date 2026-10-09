// Upload rules, shared by the form (to give instant feedback) and the server
// (which enforces them; the browser is never trusted).

export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB each
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024; // 25 MB per ticket

/** Allowed extensions and the content type we store them with. The type is
 *  decided here, never taken from the browser. SVG and HTML are deliberately
 *  absent because they can carry scripts. */
export const ALLOWED_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  txt: "text/plain",
  log: "text/plain",
  csv: "text/csv",
  json: "application/json",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export const ACCEPT_ATTR = Object.keys(ALLOWED_TYPES).map((e) => `.${e}`).join(",");
export const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

export const extOf = (name: string) => (name.split(".").pop() ?? "").toLowerCase();

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Checks name and size only (no file contents), so it also runs in the browser. */
export function checkFileMeta(f: { name: string; size: number }): string | null {
  if (!ALLOWED_TYPES[extOf(f.name)]) {
    return `"${f.name}" is not an allowed file type. Allowed: images, PDF, Office files, text/CSV/JSON, ZIP and short videos.`;
  }
  if (f.size === 0) return `"${f.name}" is empty.`;
  if (f.size > MAX_FILE_BYTES) return `"${f.name}" is larger than ${fmtBytes(MAX_FILE_BYTES)}.`;
  return null;
}

export function checkFileSet(files: { name: string; size: number }[]): string | null {
  if (files.length > MAX_FILES) return `You can attach up to ${MAX_FILES} files.`;
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > MAX_TOTAL_BYTES) return `The files together are over ${fmtBytes(MAX_TOTAL_BYTES)}.`;
  for (const f of files) {
    const e = checkFileMeta(f);
    if (e) return e;
  }
  return null;
}
