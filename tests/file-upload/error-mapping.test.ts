import { describe, expect, it } from 'vitest'
import { FileUploadError, getAvatarUploadErrorKey } from '../../utils/fileUploadError'

describe('getAvatarUploadErrorKey', () => {
  it.each([
    ['file_too_large', 'avatar.upload.errors.invalidSize'],
    ['signing_failed', 'avatar.upload.errors.signingFailed'],
    ['storage_network_error', 'avatar.upload.errors.storageNetwork'],
    ['storage_rejected', 'avatar.upload.errors.storageRejected'],
    ['status_failed', 'avatar.upload.errors.statusFailed'],
    ['status_timeout', 'avatar.upload.errors.statusTimeout'],
    ['upload_failed', 'avatar.upload.errors.uploadFailed'],
  ] as const)('maps %s to %s', (code, key) => {
    expect(getAvatarUploadErrorKey(new FileUploadError(code, 'safe fallback'))).toBe(key)
  })

  it('uses a generic localized message for unknown errors', () => {
    expect(getAvatarUploadErrorKey(new Error('raw transport details')))
      .toBe('avatar.upload.errors.uploadFailed')
  })
})
