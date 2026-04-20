export interface CourseOffering {
  code: string
  display_name: string
  year: string
  season: string
  season_display: string
  offering_tag: string
}

type TagLike = {
  id?: number
  tag_id?: number
  name?: string
  tag_name?: string
  tag_type?: string
} | string | null | undefined

export const COURSE_REVIEW_TAG = "course-review"
export const COURSE_REVIEW_LABEL = "课程评价"

export function getSingleQueryValue(value: unknown): string | undefined {
  if (typeof value === "string" && value !== "") return value
  if (Array.isArray(value) && typeof value[0] === "string" && value[0] !== "") {
    return value[0]
  }
  return undefined
}

export function buildCourseListBackQuery(query: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of ["course_type", "semester", "stage", "q"]) {
    const value = getSingleQueryValue(query[key])
    if (value) out[key] = value
  }
  return out
}

export function getTagLabel(tag: TagLike): string {
  if (tag && typeof tag === "object") {
    return tag.name || tag.tag_name || ""
  }
  return String(tag || "")
}

export function isHiddenForumTag(tag: TagLike): boolean {
  return getTagLabel(tag) === COURSE_REVIEW_TAG
}

export function getVisiblePostTags<T extends TagLike>(tags: T[] | null | undefined): T[] {
  if (!Array.isArray(tags)) return []
  return tags.filter((tag) => !isHiddenForumTag(tag))
}
