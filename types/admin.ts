export interface AdminMetricGroup {
  [key: string]: number | AdminMetricGroup
}

export interface AdminMetricCounts {
  [key: string]: number
}

export interface AdminContentSummary {
  posts: AdminMetricCounts
  comments: AdminMetricCounts
  tags: AdminMetricCounts
  files: AdminMetricCounts
  gugu: AdminMetricCounts
}

export interface AdminCoursesSummary extends AdminMetricCounts {
  courses: number
  active_courses: number
  offerings: number
  sections: number
  meetings: number
}

export interface AdminAcademicMapSummary extends AdminMetricCounts {
  programs: number
  requirement_groups: number
  user_profiles: number
  course_records: number
  records_needing_review: number
}

export interface AdminMatchingSummary extends AdminMetricCounts {
  projects: number
  active_projects: number
  profiles: number
  active_profiles: number
}

export interface AdminContestSummary extends AdminMetricCounts {
  contests: number
  active_contests: number
  organizers: number
  submissions: number
}

export interface AdminOperationsSummary extends AdminMetricCounts {
  files: number
  sts_tokens: number
  valid_sts_tokens: number
  oauth_clients: number
  oauth_tokens: number
  notifications: number
  unread_notifications: number
  push_subscriptions: number
}

export interface AdminOverviewTrendPoint {
  date: string
  [key: string]: unknown
}

export interface AdminOverviewTrendsResponse {
  days?: number
  start_date?: string
  end_date?: string
  items?: AdminOverviewTrendPoint[]
  trends?: AdminOverviewTrendPoint[]
}

export type AdminOverviewTrendsPayload = AdminOverviewTrendPoint[] | AdminOverviewTrendsResponse

export interface AdminOverviewResponse {
  metrics: {
    users: AdminMetricCounts
    content: AdminContentSummary
    feedback: AdminMetricCounts
    merge_requests: AdminMetricCounts
    identity: AdminMetricCounts
    courses: AdminCoursesSummary
    academic_map: AdminAcademicMapSummary
    matching: AdminMatchingSummary
    contest: AdminContestSummary
    operations: AdminOperationsSummary
  }
  pending: {
    feedbacks: number
    merge_requests: number
    identity_requests: number
  }
  recent_activity: AdminAuditLog[]
  trend_days?: number
  trends?: AdminOverviewTrendPoint[]
}

export interface AdminAuditLog {
  id: number
  actor_user_id: number | null
  actor?: string | null
  action: string
  target_type: string
  target_id: number | null
  target_label?: string | null
  note?: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AdminListResponse<T> {
  total: number
  page: number
  pages: number
  per_page: number
  [key: string]: unknown
}

export interface AdminUser {
  id: number
  username: string
  email?: string | null
  email_verified: boolean
  phone_verified: boolean
  role_id: number
  role_name?: string | null
  is_deleted: boolean
  created_at: string
  updated_at?: string | null
  last_active_at?: string | null
}

export interface AdminRole {
  id: number
  name: string
  description?: string | null
}

export interface AdminUsersResponse extends AdminListResponse<AdminUser> {
  users: AdminUser[]
  roles: AdminRole[]
  counts: Record<string, number>
}

export interface AdminPost {
  id: number
  user_id: number
  author?: string | null
  title: string
  comment_count: number
  reaction_count: number
  view_count: number
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface AdminComment {
  id: number
  post_id: number
  user_id: number
  author?: string | null
  content: string
  parent_comment_id?: number | null
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
}

export interface AdminFile {
  id: number
  user_id: number
  owner?: string | null
  object_name?: string
  original_filename: string
  file_size?: number | null
  mime_type?: string | null
  status: string
  file_type: string
  entity_type?: string | null
  entity_id?: number | null
  is_deleted: boolean
  deleted_at?: string | null
  created_at: string
  updated_at?: string | null
  url?: string | null
  view_url?: string | null
}

export interface AdminGuguMessage {
  id: number
  content: string
  author_id: number
  author?: string | null
  author_avatar?: string | null
  reply_to_message_id?: number | null
  reply_to?: {
    id: number
    content: string
    author_id: number
    author?: string | null
    author_avatar?: string | null
    created_at?: string | null
  } | null
  display_identity?: unknown
  is_deleted?: boolean
  deleted_at?: string | null
  created_at: string
  updated_at?: string | null
}

export interface AdminPostsResponse extends AdminListResponse<AdminPost> {
  posts: AdminPost[]
}

export interface AdminCommentsResponse extends AdminListResponse<AdminComment> {
  comments: AdminComment[]
}

export interface AdminFilesResponse extends AdminListResponse<AdminFile> {
  files: AdminFile[]
  counts?: AdminMetricCounts
}

export interface AdminGuguMessagesResponse extends AdminListResponse<AdminGuguMessage> {
  gugu?: AdminGuguMessage[]
  messages?: AdminGuguMessage[]
  counts?: AdminMetricCounts
}

export interface AdminOverviewQuery {
  days?: number
}

export interface AdminQuery {
  search?: string
  role?: string
  deleted?: '' | 'true' | 'false'
  email_verified?: '' | 'true' | 'false'
  status?: string
  file_type?: string
  entity_type?: string
  page?: number
  per_page?: number
}

