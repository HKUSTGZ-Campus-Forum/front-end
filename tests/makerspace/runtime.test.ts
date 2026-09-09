import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMakerRuntime } from '../../composables/useMakerRuntime'

const response = (id = 'a') => ({ url: `/api/makerspace/run/${id.repeat(48)}/`, expires_at: new Date(Date.now() + 3600000).toISOString() })
afterEach(() => vi.useRealTimers())

describe('MakerSpace public and private runtime lifecycle', () => {
  it('opens the published runtime by default and requests a private deployment only explicitly', async () => {
    vi.useFakeTimers()
    const request = vi.fn().mockImplementation(async () => response())
    const runtime = useMakerRuntime(request)
    await runtime.launch('teamup')
    expect(request).toHaveBeenLastCalledWith('/teamup/launch', 'POST', {})
    expect(runtime.previewId.value).toBeNull()
    expect(runtime.frame.value).toBe(response().url)
    await runtime.launch('teamup', 'private-build')
    expect(request).toHaveBeenLastCalledWith('/teamup/launch', 'POST', { deployment_id: 'private-build' })
    expect(runtime.previewId.value).toBe('private-build')
    runtime.reset()
  })
  it('discards late responses after navigation, auth reset or a newer launch', async () => {
    vi.useFakeTimers()
    let resolve!: (value: ReturnType<typeof response>) => void
    const request = vi.fn().mockImplementationOnce(() => new Promise(done => { resolve = done })).mockImplementation(async () => response('b'))
    const runtime = useMakerRuntime(request)
    const stale = runtime.launch('old')
    await runtime.launch('new')
    resolve(response('a')); await stale
    expect(runtime.frame.value).toBe(response('b').url)
    runtime.reset()
    expect(runtime.frame.value).toBe('')
    expect(runtime.launching.value).toBe(false)
    await vi.advanceTimersByTimeAsync(3600000)
    expect(runtime.expired.value).toBe(false)
  })
  it('reports expiry without replacing a frame or silently discarding user input', async () => {
    vi.useFakeTimers()
    const runtime = useMakerRuntime(vi.fn().mockImplementation(async () => response()))
    await runtime.launch('teamup'); runtime.loaded()
    await vi.advanceTimersByTimeAsync(3600000)
    expect(runtime.expired.value).toBe(true)
    expect(runtime.frame.value).toBe(response().url)
    expect(runtime.slow.value).toBe(false)
    runtime.reset()
  })
  it('recovers from an unavailable runtime and reports a slow frame load', async () => {
    vi.useFakeTimers()
    const request = vi.fn().mockRejectedValueOnce(new Error('runtime_unavailable')).mockImplementation(async () => response())
    const runtime = useMakerRuntime(request)
    await runtime.launch('teamup')
    expect(runtime.launchError.value).toEqual(new Error('runtime_unavailable'))
    expect(runtime.launching.value).toBe(false)
    await runtime.launch('teamup')
    expect(runtime.launchError.value).toBeNull()
    await vi.advanceTimersByTimeAsync(30000)
    expect(runtime.slow.value).toBe(true)
    runtime.loaded()
    expect(runtime.slow.value).toBe(false)
    runtime.reset()
  })
  it('rejects unsafe runtime URLs and invalid or expired session timestamps', async () => {
    for (const value of [
      { ...response(), url: 'https://evil.example/' },
      { ...response(), url: '/api/makerspace/run/short/' },
      { ...response(), expires_at: 'invalid' },
      { ...response(), expires_at: new Date(0).toISOString() },
    ]) {
      const runtime = useMakerRuntime(vi.fn().mockResolvedValue(value))
      await runtime.launch('teamup')
      expect(runtime.frame.value).toBe('')
      expect(runtime.launchError.value).toEqual(new Error('request_failed'))
      runtime.reset()
    }
  })
})
