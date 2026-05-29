import type {
  AcademicCourseRecord,
  AcademicMapSummary,
  AcademicProfile,
} from '~/types/academic-map'

export function useAcademicMap() {
  const { fetchWithAuth, getApiUrl } = useApi()

  const parseCourseHistory = async (text: string) => {
    const response = await fetchWithAuth(getApiUrl('/api/academic-map/import/parse'), {
      method: 'POST',
      body: { text },
    })
    if (!response.ok) throw new Error('Failed to parse course history')
    return await response.json() as { rows: AcademicCourseRecord[]; count: number }
  }

  const fetchSummary = async () => {
    const response = await fetchWithAuth(getApiUrl('/api/academic-map/summary'))
    if (!response.ok) throw new Error('Failed to load academic map')
    return await response.json() as AcademicMapSummary
  }

  const updateProfile = async (payload: Partial<AcademicProfile>) => {
    const response = await fetchWithAuth(getApiUrl('/api/academic-map/profile'), {
      method: 'PUT',
      body: payload,
    })
    if (!response.ok) throw new Error('Failed to update academic profile')
    return await response.json() as { profile: AcademicProfile }
  }

  const saveImportedRecords = async (records: AcademicCourseRecord[], keepGrades: boolean) => {
    const response = await fetchWithAuth(getApiUrl('/api/academic-map/records/bulk'), {
      method: 'POST',
      body: { records, keep_grades: keepGrades },
    })
    if (!response.ok) throw new Error('Failed to save course records')
    return await response.json() as { records: AcademicCourseRecord[] }
  }

  const updateRecord = async (recordId: number, payload: Partial<AcademicCourseRecord>) => {
    const response = await fetchWithAuth(getApiUrl(`/api/academic-map/records/${recordId}`), {
      method: 'PUT',
      body: payload,
    })
    if (!response.ok) throw new Error('Failed to update course record')
    return await response.json() as { record: AcademicCourseRecord }
  }

  const deleteGrades = async () => {
    const response = await fetchWithAuth(getApiUrl('/api/academic-map/grades'), {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Failed to delete grades')
    return await response.json() as { cleared_count: number }
  }

  return {
    parseCourseHistory,
    fetchSummary,
    updateProfile,
    saveImportedRecords,
    updateRecord,
    deleteGrades,
  }
}
