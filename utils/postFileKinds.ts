/** Forum post attachments: size limit (must match backend `File.MAX_UPLOAD_BYTES`). */
export const MAX_POST_FILE_BYTES = 10 * 1024 * 1024;

export function isPostImageFile(file: {
  mime_type?: string | null;
  original_filename?: string | null;
}): boolean {
  if (!file) return false;
  if (file.mime_type?.startsWith("image/")) return true;
  const n = (file.original_filename || "").toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|avif|heic)$/i.test(n);
}

export function isPdfFile(file: {
  mime_type?: string | null;
  original_filename?: string | null;
}): boolean {
  if (file.mime_type === "application/pdf") return true;
  const n = (file.original_filename || "").toLowerCase();
  return n.endsWith(".pdf");
}

export function isDocxFile(file: {
  mime_type?: string | null;
  original_filename?: string | null;
}): boolean {
  if (
    file.mime_type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }
  const n = (file.original_filename || "").toLowerCase();
  return n.endsWith(".docx");
}

/** Legacy Word .doc (binary) — use Office Web viewer iframe. */
export function isLegacyDocFile(file: {
  mime_type?: string | null;
  original_filename?: string | null;
}): boolean {
  if (file.mime_type === "application/msword") return true;
  const n = (file.original_filename || "").toLowerCase();
  return n.endsWith(".doc") && !n.endsWith(".docx");
}

export function isDownloadOnlyFile(file: {
  mime_type?: string | null;
  original_filename?: string | null;
}): boolean {
  return (
    !isPostImageFile(file) &&
    !isPdfFile(file) &&
    !isDocxFile(file) &&
    !isLegacyDocFile(file)
  );
}
