import {
  SchedulerPopularityHistoryAccessError,
  type CartCourse,
  type CourseDetail,
  type SchedulerPopularityHistoryResponse,
  type SchedulerPopularityResponse,
  type SchedulerPlanWriteInput,
  type SchedulerSavedPlan,
  type SchedulerSharedPlanResponse,
  type SchedulerSubject,
  type SearchResponse,
  type SemesterInfo,
} from '~/utils/scheduler'

export function useScheduler() {
  const { fetchPublic, fetchWithAuth } = useApi()
  const { accessToken } = useAuth()

  async function schedulerPlanResponse<T>(response: Response, fallback: string): Promise<T> {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      const error = new Error(payload.error || fallback) as Error & { code?: string; status?: number }
      error.code = payload.code
      error.status = response.status
      throw error
    }
    return response.json()
  }

  function fetchReadablePlan(path: string, options: RequestInit = {}) {
    return accessToken.value
      ? fetchWithAuth(path, options)
      : fetchPublic(path, options)
  }

  async function getSemesters(): Promise<SemesterInfo[]> {
    const resp = await fetchPublic('/api/scheduler/semesters')
    if (!resp.ok) throw new Error('Failed to fetch semesters')
    return resp.json()
  }

  async function searchCourses(
    query: string,
    semester: string,
    page = 1,
    pageSize = 8,
    signal?: AbortSignal,
  ): Promise<SearchResponse> {
    const params = new URLSearchParams({ query, page: String(page), pageSize: String(pageSize) })
    if (semester) params.set('semester', semester)
    const resp = await fetchPublic(`/api/scheduler/courses/search?${params}`, { signal })
    if (!resp.ok) throw new Error('Search failed')
    return resp.json()
  }

  async function getSubjects(semester: string, signal?: AbortSignal): Promise<SchedulerSubject[]> {
    const params = new URLSearchParams()
    if (semester) params.set('semester', semester)
    const query = params.toString()
    const resp = await fetchPublic(`/api/scheduler/subjects${query ? `?${query}` : ''}`, { signal })
    if (!resp.ok) throw new Error('Subjects failed')
    return resp.json()
  }

  async function getCourseDetail(code: string, semester: string, signal?: AbortSignal): Promise<CourseDetail> {
    const resp = await fetchPublic(`/api/scheduler/courses/${code}?semester=${semester}`, { signal })
    if (!resp.ok) throw new Error('Course not found')
    return resp.json()
  }

  async function getCart(semester: string): Promise<CartCourse[]> {
    const resp = await fetchWithAuth(`/api/scheduler/cart/${semester}`)
    if (!resp.ok) throw new Error('Failed to fetch cart')
    return resp.json()
  }

  async function addToCart(semester: string, courseCode: string): Promise<CartCourse> {
    const resp = await fetchWithAuth(`/api/scheduler/cart/${semester}/add`, {
      method: 'POST',
      body: JSON.stringify({ course_code: courseCode }),
    })
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to add to cart')
    }
    return resp.json()
  }

  async function removeFromCart(semester: string, courseCode: string): Promise<void> {
    const resp = await fetchWithAuth(`/api/scheduler/cart/${semester}/remove/${courseCode}`, {
      method: 'DELETE',
    })
    if (!resp.ok) throw new Error('Failed to remove from cart')
  }

  async function clearCart(semester: string): Promise<number> {
    const resp = await fetchWithAuth(`/api/scheduler/cart/${semester}`, { method: 'DELETE' })
    const payload = await schedulerPlanResponse<{ removed_courses: number }>(resp, 'Failed to clear cart')
    return payload.removed_courses
  }

  async function createPlan(payload: SchedulerPlanWriteInput): Promise<SchedulerSavedPlan> {
    const resp = await fetchWithAuth('/api/scheduler/plans', { method: 'POST', body: payload as any })
    return schedulerPlanResponse(resp, 'Failed to save plan')
  }

  async function getMyPlans(semesterId = ''): Promise<SchedulerSavedPlan[]> {
    const params = new URLSearchParams()
    if (semesterId) params.set('semester_id', semesterId)
    const suffix = params.size ? `?${params}` : ''
    const resp = await fetchWithAuth(`/api/scheduler/plans/mine${suffix}`, { cache: 'no-store' })
    const payload = await schedulerPlanResponse<{ plans: SchedulerSavedPlan[] }>(resp, 'Failed to load plans')
    return payload.plans
  }

  async function getSharedPlans(options: {
    semesterId?: string
    courseCode?: string
    page?: number
    pageSize?: number
  } = {}): Promise<SchedulerSharedPlanResponse> {
    const params = new URLSearchParams({
      page: String(options.page || 1),
      page_size: String(options.pageSize || 12),
    })
    if (options.semesterId) params.set('semester_id', options.semesterId)
    if (options.courseCode) params.set('course_code', options.courseCode)
    const resp = await fetchReadablePlan(`/api/scheduler/plans/shared?${params}`)
    return schedulerPlanResponse(resp, 'Failed to load shared plans')
  }

  async function getPlan(publicId: string): Promise<SchedulerSavedPlan> {
    const resp = await fetchReadablePlan(`/api/scheduler/plans/${encodeURIComponent(publicId)}`, {
      cache: 'no-store',
    })
    return schedulerPlanResponse(resp, 'Failed to load plan')
  }

  async function updatePlan(
    publicId: string,
    payload: Partial<SchedulerPlanWriteInput> & { version: number },
  ): Promise<SchedulerSavedPlan> {
    const resp = await fetchWithAuth(`/api/scheduler/plans/${encodeURIComponent(publicId)}`, {
      method: 'PATCH',
      body: payload as any,
    })
    return schedulerPlanResponse(resp, 'Failed to update plan')
  }

  async function deletePlan(publicId: string): Promise<void> {
    const resp = await fetchWithAuth(`/api/scheduler/plans/${encodeURIComponent(publicId)}`, {
      method: 'DELETE',
    })
    if (!resp.ok) await schedulerPlanResponse(resp, 'Failed to delete plan')
  }

  async function clonePlan(publicId: string, name?: string): Promise<SchedulerSavedPlan> {
    const resp = await fetchWithAuth(`/api/scheduler/plans/${encodeURIComponent(publicId)}/clone`, {
      method: 'POST',
      body: name ? { name } as any : {} as any,
    })
    return schedulerPlanResponse(resp, 'Failed to copy plan')
  }

  async function applyPlan(publicId: string): Promise<SchedulerSavedPlan> {
    const resp = await fetchWithAuth(`/api/scheduler/plans/${encodeURIComponent(publicId)}/apply`, {
      method: 'POST',
    })
    const payload = await schedulerPlanResponse<{ plan: SchedulerSavedPlan }>(resp, 'Failed to apply plan')
    return payload.plan
  }

  async function toggleCourse(semester: string, courseCode: string, enabled: boolean): Promise<void> {
    const resp = await fetchWithAuth(`/api/scheduler/cart/${semester}/course/${courseCode}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    })
    if (!resp.ok) throw new Error('Failed to toggle course')
  }

  async function toggleBundle(semester: string, courseCode: string, bundleId: number, layer: number, enabled: boolean): Promise<void> {
    const resp = await fetchWithAuth(`/api/scheduler/cart/${semester}/bundle/${courseCode}/${bundleId}/${layer}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    })
    if (!resp.ok) throw new Error('Failed to toggle bundle')
  }

  async function toggleLayer(semester: string, courseCode: string, layer: number, enabled: boolean): Promise<void> {
    const resp = await fetchWithAuth(`/api/scheduler/cart/${semester}/layer/${courseCode}/${layer}/toggle`, {
      method: 'PUT',
      body: JSON.stringify({ enabled }),
    })
    if (!resp.ok) throw new Error('Failed to toggle layer')
  }

  async function getPopularity(
    semester: string,
    courseCodes: readonly string[],
  ): Promise<SchedulerPopularityResponse | null> {
    const sortedCodes = [...new Set(courseCodes.map(code => code.trim()).filter(Boolean))].sort()
    const params = new URLSearchParams({ course_codes: sortedCodes.join(',') })
    const resp = await fetchWithAuth(`/api/scheduler/popularity/${semester}?${params}`, {
      cache: 'no-store',
    })
    if (resp.status === 403) return null
    if (!resp.ok) throw new Error('Failed to fetch scheduler popularity')
    return resp.json()
  }

  async function getPopularityHistory(
    semester: string,
    courseCode: string,
    options: { sectionId?: string; from: string; to: string; resolution?: 'auto'; signal?: AbortSignal },
  ): Promise<SchedulerPopularityHistoryResponse> {
    const params = new URLSearchParams({
      course_code: courseCode,
      resolution: options.resolution || 'auto',
    })
    if (options.sectionId) params.set('section_id', options.sectionId)
    params.set('from', options.from)
    params.set('to', options.to)

    let resp: Response
    try {
      resp = await fetchWithAuth(`/api/scheduler/popularity/${semester}/history?${params}`, {
        cache: 'no-store',
        signal: options.signal,
      })
    } catch (requestError) {
      if (requestError instanceof Error && requestError.message.startsWith('Authentication')) {
        throw new SchedulerPopularityHistoryAccessError('authentication', 401)
      }
      throw requestError
    }
    if (resp.status === 401) throw new SchedulerPopularityHistoryAccessError('authentication', 401)
    if (resp.status === 403) throw new SchedulerPopularityHistoryAccessError('authorization', 403)
    if (resp.status === 404) throw new SchedulerPopularityHistoryAccessError('scope', 404)
    if (!resp.ok) throw new Error('Failed to fetch scheduler popularity history')
    return resp.json()
  }

  async function getMapComponents() {
    const resp = await fetchPublic('/api/scheduler/map/components')
    if (!resp.ok) throw new Error('Map components failed')
    return resp.json()
  }

  async function getMapLines() {
    const resp = await fetchPublic('/api/scheduler/map/lines')
    if (!resp.ok) throw new Error('Map lines failed')
    return resp.json()
  }

  async function getMapCourses() {
    const resp = await fetchPublic('/api/scheduler/map/courses')
    if (!resp.ok) throw new Error('Map courses failed')
    return resp.json()
  }

  return {
    getSemesters,
    getSubjects,
    searchCourses,
    getCourseDetail,
    getCart,
    clearCart,
    addToCart,
    removeFromCart,
    toggleCourse,
    toggleBundle,
    toggleLayer,
    createPlan,
    getMyPlans,
    getSharedPlans,
    getPlan,
    updatePlan,
    deletePlan,
    clonePlan,
    applyPlan,
    getPopularity,
    getPopularityHistory,
    getMapComponents,
    getMapLines,
    getMapCourses,
  }
}
