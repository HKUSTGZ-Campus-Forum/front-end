export interface AdminMetricGroup {
  [key: string]: number | AdminMetricGroup
}

export interface AdminOverviewResponse {
  metrics: {
    users: Record<string, number>
    content: {
      posts: Record<string, number>
      comments: Record<string, number>
      tags: Record<string, number>
      files: Record<string, number>
      gugu: Record<string, number>
    }
    feedback: Record<string, number>
    merge_requests: Record<string, number>
    identity: Record<string, number>
    courses: Record<string, number>
    academic_map: Record<string, number>
    matching: Record<string, number>
    contest: Record<string, number>
    operations: Record<string, number>
  }
  pending: {
    feedbacks: number
    merge_requests: number
    identity_requests: number
  }
  recent_activity: AdminAuditLog[]
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

export interface AdminContentSummary {
  posts: Record<string, number>
  comments: Record<string, number>
  tags: Record<string, number>
  files: Record<string, number>
  gugu: Record<string, number>
}

export interface AdminPostsResponse extends AdminListResponse<AdminPost> {
  posts: AdminPost[]
}

export interface AdminCommentsResponse extends AdminListResponse<AdminComment> {
  comments: AdminComment[]
}

export interface AdminQuery {
  search?: string
  role?: string
  deleted?: '' | 'true' | 'false'
  email_verified?: '' | 'true' | 'false'
  page?: number
  per_page?: number
}

