import type {
  CartCourse, CourseDetail, SearchResponse, SemesterInfo
} from '~/utils/scheduler'

export function useScheduler() {
  const { fetchWithAuth } = useApi()

  async function getSemesters(): Promise<SemesterInfo[]> {
    const resp = await fetch('/api/scheduler/semesters')
    if (!resp.ok) throw new Error('Failed to fetch semesters')
    return resp.json()
  }

  async function searchCourses(query: string, semester: string, page = 1, pageSize = 8): Promise<SearchResponse> {
    const params = new URLSearchParams({ query, page: String(page), pageSize: String(pageSize) })
    if (semester) params.set('semester', semester)
    const resp = await fetch(`/api/scheduler/courses/search?${params}`)
    if (!resp.ok) throw new Error('Search failed')
    return resp.json()
  }

  async function getCourseDetail(code: string, semester: string): Promise<CourseDetail> {
    const resp = await fetch(`/api/scheduler/courses/${code}?semester=${semester}`)
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

  return {
    getSemesters,
    searchCourses,
    getCourseDetail,
    getCart,
    addToCart,
    removeFromCart,
    toggleCourse,
    toggleBundle,
    toggleLayer,
  }
}
