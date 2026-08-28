export const DEFAULT_UPLOAD_PREPARATION_TIMEOUT_MS = 15_000

export class UploadPreparationTimeoutError extends Error {
  readonly name = 'UploadPreparationTimeoutError'
}

interface UploadPreparationOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

const abortError = (signal?: AbortSignal) => {
  if (signal?.reason instanceof Error) return signal.reason
  return new DOMException('Upload cancelled', 'AbortError')
}

/**
 * Bound local file preparation so image decoding/encoding cannot keep an
 * upload UI busy forever. The operation receives an internal signal that is
 * aborted on either caller cancellation or timeout.
 */
export const runUploadPreparation = <T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: UploadPreparationOptions = {},
) => new Promise<T>((resolve, reject) => {
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? DEFAULT_UPLOAD_PREPARATION_TIMEOUT_MS
  let settled = false

  const cleanup = () => {
    if (timer) clearTimeout(timer)
    options.signal?.removeEventListener('abort', handleCallerAbort)
  }
  const settle = (callback: () => void) => {
    if (settled) return
    settled = true
    cleanup()
    callback()
  }
  const handleCallerAbort = () => {
    const error = abortError(options.signal)
    controller.abort(error)
    settle(() => reject(error))
  }
  const timer = timeoutMs > 0
    ? setTimeout(() => {
        const error = new UploadPreparationTimeoutError('Image preparation timed out')
        controller.abort(error)
        settle(() => reject(error))
      }, timeoutMs)
    : undefined

  if (options.signal?.aborted) {
    handleCallerAbort()
    return
  }
  options.signal?.addEventListener('abort', handleCallerAbort, { once: true })

  Promise.resolve()
    .then(() => operation(controller.signal))
    .then(
      value => settle(() => resolve(value)),
      error => settle(() => reject(error)),
    )
})
