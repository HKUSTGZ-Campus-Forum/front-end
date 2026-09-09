import { ref } from 'vue'

type LaunchResponse = { url: string; expires_at: string }
type LaunchRequest = (path: string, method: string, body: unknown) => Promise<LaunchResponse>

/** One browser-bound work session; stale requests cannot reopen a previous work. */
export function useMakerRuntime(request: LaunchRequest) {
  const frame = ref('')
  const launching = ref(false)
  const frameLoading = ref(false)
  const launchError = ref<unknown>(null)
  const expired = ref(false)
  const slow = ref(false)
  const previewId = ref<string | null>(null)
  let sequence = 0
  let expiryTimer: ReturnType<typeof setTimeout> | undefined
  let loadingTimer: ReturnType<typeof setTimeout> | undefined
  function clearTimers() {
    clearTimeout(expiryTimer)
    clearTimeout(loadingTimer)
  }
  function reset() {
    sequence++
    clearTimers()
    frame.value = ''; launching.value = false; frameLoading.value = false
    launchError.value = null; expired.value = false; slow.value = false; previewId.value = null
  }
  async function launch(slug: string, deploymentId?: string) {
    reset()
    const current = sequence
    previewId.value = deploymentId || null
    launching.value = true
    try {
      const result = await request(`/${slug}/launch`, 'POST', deploymentId ? { deployment_id: deploymentId } : {})
      if (current !== sequence) return
      if (!/^\/api\/makerspace\/run\/[a-f0-9]{48}\/$/.test(result.url)) throw new Error('request_failed')
      const duration = Date.parse(result.expires_at) - Date.now()
      if (!Number.isFinite(duration) || duration <= 0) throw new Error('request_failed')
      frame.value = result.url; frameLoading.value = true
      expiryTimer = setTimeout(() => { expired.value = true }, Math.min(duration, 2147483647))
      loadingTimer = setTimeout(() => { slow.value = true; frameLoading.value = false }, 30000)
    } catch (cause) { if (current === sequence) launchError.value = cause }
    finally { if (current === sequence) launching.value = false }
  }
  function loaded() {
    clearTimeout(loadingTimer)
    frameLoading.value = false; slow.value = false
  }
  return { frame, launching, frameLoading, launchError, expired, slow, previewId, launch, reset, loaded }
}
