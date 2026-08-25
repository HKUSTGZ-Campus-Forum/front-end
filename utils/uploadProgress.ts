export const UPLOAD_PROGRESS_STAGE = {
  started: 1,
  prepared: 8,
  signed: 12,
  transferred: 95,
  verifying: 99,
  complete: 100,
} as const

export const mapUploadByteProgress = (loaded: number, total: number) => {
  if (!Number.isFinite(total) || total <= 0) return UPLOAD_PROGRESS_STAGE.signed

  const ratio = Math.min(1, Math.max(0, loaded / total))
  const transferRange = UPLOAD_PROGRESS_STAGE.transferred - UPLOAD_PROGRESS_STAGE.signed
  return UPLOAD_PROGRESS_STAGE.signed + ratio * transferRange
}

