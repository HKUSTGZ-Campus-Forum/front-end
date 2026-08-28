import type {
  HomeCarouselAdminSlide,
  HomeCarouselWritePayload,
} from '~/types/homeCarousel'

async function readJsonSafe(response: Response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function useHomeCarouselAdmin() {
  const { t } = useI18n()
  const { fetchWithAuth } = useApi()

  async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetchWithAuth(url, options)
    const data = await readJsonSafe(response)
    if (!response.ok) {
      throw new Error(data?.error || data?.message || t('adminCarousel.errors.requestFailed'))
    }
    return data as T
  }

  const getSlides = () => request<{ slides: HomeCarouselAdminSlide[] }>(
    '/api/admin/carousel?include_archived=true',
  )

  const createSlide = (payload: HomeCarouselWritePayload) => request<{ slide: HomeCarouselAdminSlide }>(
    '/api/admin/carousel',
    { method: 'POST', body: payload as any },
  )

  const updateSlide = (slideId: number, payload: HomeCarouselWritePayload) => request<{ slide: HomeCarouselAdminSlide }>(
    `/api/admin/carousel/${slideId}`,
    { method: 'PATCH', body: payload as any },
  )

  const reorderSlides = (orderedIds: number[]) => request<{ slides: HomeCarouselAdminSlide[] }>(
    '/api/admin/carousel/reorder',
    { method: 'POST', body: { ordered_ids: orderedIds } as any },
  )

  const setSlideArchived = (slideId: number, archived: boolean) => request<{ slide: HomeCarouselAdminSlide }>(
    `/api/admin/carousel/${slideId}/${archived ? 'archive' : 'restore'}`,
    { method: 'POST' },
  )

  return { getSlides, createSlide, updateSlide, reorderSlides, setSlideArchived }
}
