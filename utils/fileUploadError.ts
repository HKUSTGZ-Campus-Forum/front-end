export type FileUploadErrorCode =
  | 'file_too_large'
  | 'signing_failed'
  | 'storage_network_error'
  | 'storage_rejected'
  | 'status_failed'
  | 'status_timeout'
  | 'upload_failed'

export class FileUploadError extends Error {
  readonly name = 'FileUploadError'

  constructor(
    readonly code: FileUploadErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
  }
}

export function getAvatarUploadErrorKey(error: unknown): string {
  const code = error instanceof FileUploadError
    ? error.code
    : (error && typeof error === 'object' && 'code' in error ? error.code : null)

  switch (code) {
    case 'file_too_large':
      return 'avatar.upload.errors.invalidSize'
    case 'signing_failed':
      return 'avatar.upload.errors.signingFailed'
    case 'storage_network_error':
      return 'avatar.upload.errors.storageNetwork'
    case 'storage_rejected':
      return 'avatar.upload.errors.storageRejected'
    case 'status_failed':
      return 'avatar.upload.errors.statusFailed'
    case 'status_timeout':
      return 'avatar.upload.errors.statusTimeout'
    default:
      return 'avatar.upload.errors.uploadFailed'
  }
}
