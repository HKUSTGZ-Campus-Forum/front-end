import type {
  CartCourse,
  CourseDetail,
  SchedulerPopularityResponse,
  SchedulerSubject,
  SearchResponse,
  SemesterInfo,
} from '~/utils/scheduler'

export function useScheduler() {
  const { fetchPublic, fetchWithAuth } = useApi()

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
    addToCart,
    removeFromCart,
    toggleCourse,
    toggleBundle,
    toggleLayer,
    getPopularity,
    getMapComponents,
    getMapLines,
    getMapCourses,
  }
}
