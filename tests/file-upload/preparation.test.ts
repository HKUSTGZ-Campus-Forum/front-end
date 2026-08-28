import { describe, expect, it, vi } from 'vitest'
import {
  runUploadPreparation,
  UploadPreparationTimeoutError,
} from '../../utils/uploadPreparation'

describe('runUploadPreparation', () => {
  it('returns the prepared value and keeps the operation signal active', async () => {
    await expect(runUploadPreparation(async signal => {
      expect(signal.aborted).toBe(false)
      return 'prepared'
    })).resolves.toBe('prepared')
  })

  it('aborts image preparation when the timeout expires', async () => {
    vi.useFakeTimers()
    let operationSignal: AbortSignal | undefined
    const result = runUploadPreparation<string>(signal => {
      operationSignal = signal
      return new Promise(() => {})
    }, { timeoutMs: 100 })
    const rejection = expect(result).rejects.toBeInstanceOf(UploadPreparationTimeoutError)

    await vi.advanceTimersByTimeAsync(100)
    await rejection
    expect(operationSignal?.aborted).toBe(true)
    vi.useRealTimers()
  })

  it('propagates caller cancellation to image preparation', async () => {
    const controller = new AbortController()
    let operationSignal: AbortSignal | undefined
    const result = runUploadPreparation<string>(signal => {
      operationSignal = signal
      return new Promise(() => {})
    }, { signal: controller.signal })

    controller.abort()
    await expect(result).rejects.toMatchObject({ name: 'AbortError' })
    expect(operationSignal?.aborted).toBe(true)
  })
})
