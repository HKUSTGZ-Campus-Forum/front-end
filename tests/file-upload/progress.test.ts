import { describe, expect, it } from 'vitest'
import { mapUploadByteProgress, UPLOAD_PROGRESS_STAGE } from '../../utils/uploadProgress'

describe('file upload progress', () => {
  it('reserves progress for preparation and server verification', () => {
    expect(mapUploadByteProgress(0, 100)).toBe(UPLOAD_PROGRESS_STAGE.signed)
    expect(mapUploadByteProgress(50, 100)).toBeCloseTo(53.5)
    expect(mapUploadByteProgress(100, 100)).toBe(UPLOAD_PROGRESS_STAGE.transferred)
    expect(UPLOAD_PROGRESS_STAGE.verifying).toBe(99)
    expect(UPLOAD_PROGRESS_STAGE.complete).toBe(100)
  })

  it('clamps invalid and out-of-range byte counts', () => {
    expect(mapUploadByteProgress(-10, 100)).toBe(UPLOAD_PROGRESS_STAGE.signed)
    expect(mapUploadByteProgress(200, 100)).toBe(UPLOAD_PROGRESS_STAGE.transferred)
    expect(mapUploadByteProgress(1, 0)).toBe(UPLOAD_PROGRESS_STAGE.signed)
  })
})

