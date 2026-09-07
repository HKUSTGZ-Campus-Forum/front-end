import type { MakerDraft } from '~/types/makerspace'

export function useMakerSpace() {
  const api = useApi()
  const { isLoggedIn } = useAuth()
  const { t, te, locale } = useI18n()
  async function request<T>(path = '', method = 'GET', body?: unknown): Promise<T> {
    const send = isLoggedIn.value ? api.fetchWithAuth : api.fetchPublic
    const response = await send(`/api/makerspace${path}`, {
      method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.code || (response.status === 401 ? 'authentication_required' : 'request_failed'))
    return payload as T
  }
  function errorMessage(error: unknown) {
    const code = error instanceof Error ? error.message : 'request_failed'
    const key = `makerspace.errors.${code}`
    return te(key) ? t(key) : t('makerspace.errors.request_failed')
  }
  function title(value: { title_zh: string; title_en: string }) { return locale.value === 'en' ? value.title_en : value.title_zh }
  function description(value: { description_zh: string; description_en: string }) { return locale.value === 'en' ? value.description_en : value.description_zh }
  return { request, errorMessage, title, description }
}

export function emptyMakerDraft(): MakerDraft {
  return { slug: '', title_zh: '', title_en: '', description_zh: '', description_en: '', category: 'tools', repository: '', branch: 'main', auto_deploy: true, settings: { runtime: 'static', directory: '.', output_directory: 'dist', build_command: 'npm ci && npm run build', start_command: '' } }
}
