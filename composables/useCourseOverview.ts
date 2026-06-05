import type {
  CourseOverviewPayload,
  CourseResolvePayload,
} from '~/types/course-overview'
import { compactCourseCode } from '~/utils/courseUniverse'

export function useCourseOverview() {
  const { fetchPublic, fetchWithAuth, getApiUrl } = useApi()
  const { isLoggedIn } = useAuth()

  const fetchCourseOverview = async (courseCode: string, lang = 'zh') => {
    const code = compactCourseCode(courseCode)
    const path = `/api/courses/by-code/${encodeURIComponent(code)}/overview?lang=${encodeURIComponent(lang)}`
    const response = isLoggedIn.value
      ? await fetchWithAuth(getApiUrl(path))
      : await fetchPublic(getApiUrl(path))
    if (!response.ok) throw new Error(`Failed to load course overview: ${response.status}`)
    return await response.json() as CourseOverviewPayload
  }

  const resolveCourseIdentifier = async (identifier: string) => {
    const response = await fetchPublic(getApiUrl(`/api/courses/resolve/${encodeURIComponent(identifier)}`))
    if (!response.ok) throw new Error(`Failed to resolve course: ${response.status}`)
    return await response.json() as CourseResolvePayload
  }

  const markCourseInterested = async (courseCode: string) => {
    const code = compactCourseCode(courseCode)
    const response = await fetchWithAuth(getApiUrl(`/api/academic-map/courses/${encodeURIComponent(code)}/interest`), {
      method: 'PUT',
      body: {},
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      const error = new Error(data.error || `Failed to mark interest: ${response.status}`)
      ;(error as Error & { record?: unknown }).record = data.record
      throw error
    }
    return data
  }

  const cancelCourseInterest = async (courseCode: string) => {
    const code = compactCourseCode(courseCode)
    const response = await fetchWithAuth(getApiUrl(`/api/academic-map/courses/${encodeURIComponent(code)}/interest`), {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error(`Failed to cancel interest: ${response.status}`)
    return await response.json() as { deleted: number }
  }

  return {
    fetchCourseOverview,
    resolveCourseIdentifier,
    markCourseInterested,
    cancelCourseInterest,
  }
}
