import archive from '~/data/announcementArchive'

export const ANNOUNCEMENT_TAG = 'platform-announcement'

export interface Announcement {
  key: string
  id: number
  title: string
  title_en?: string
  summary_en?: string
  content: string
  author: string
  created_at: string
  archived: boolean
  source_post_id?: number
}

export const archivedAnnouncements: Announcement[] = archive

export function isAnnouncementPost(post: any): boolean {
  return Array.isArray(post?.tags) && post.tags.some((tag: any) =>
    (tag.name || tag.tag_name) === ANNOUNCEMENT_TAG)
}

export function useAnnouncements() {
  const { fetchPublic, getApiUrl } = useApi()
  const announcements = ref<Announcement[]>([...archivedAnnouncements])
  const loading = ref(false)
  const error = ref(false)

  async function load() {
    loading.value = true
    error.value = false
    try {
      const response = await fetchPublic(getApiUrl(
        `/api/posts?tags=${ANNOUNCEMENT_TAG}&limit=100&sort_by=created_at&sort_order=desc`,
      ))
      if (!response.ok) throw new Error(`Announcement request failed: ${response.status}`)
      const payload = await response.json()
      const current: Announcement[] = (payload.posts || [])
        .filter(isAnnouncementPost)
        .map((post: any) => ({
          key: `post-${post.id}`,
          id: post.id,
          title: post.title,
          content: post.content,
          author: post.author,
          created_at: post.created_at,
          archived: false,
        }))
      announcements.value = [...current, ...archivedAnnouncements]
        .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    } catch {
      error.value = true
      announcements.value = [...archivedAnnouncements]
    } finally {
      loading.value = false
    }
  }

  return { announcements, loading, error, load }
}
