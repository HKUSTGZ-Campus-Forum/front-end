export type FeedbackStatus = "pending_review" | "rejected" | "published" | "closed";
export type FeedbackCommentVisibility = "visible" | "hidden";
export type FeedbackMergeRequestStatus =
  | "open"
  | "author_changes_requested"
  | "author_rejected"
  | "author_accepted_pending_admin"
  | "admin_rejected"
  | "merged"
  | "withdrawn";

export interface FeedbackVersion {
  id: number;
  feedback_id: number;
  version_number: number;
  markdown_content: string;
  created_by_user_id: number;
  source_merge_request_id?: number | null;
  created_at: string;
}

export interface FeedbackComment {
  id: number;
  feedback_id: number;
  user_id: number;
  parent_comment_id?: number | null;
  content: string;
  visibility: FeedbackCommentVisibility;
  hidden_reason?: string | null;
  hidden_by_admin_id?: number | null;
  hidden_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackMergeComment {
  id: number;
  merge_request_id: number;
  user_id: number;
  parent_comment_id?: number | null;
  content: string;
  visibility: FeedbackCommentVisibility;
  hidden_reason?: string | null;
  hidden_by_admin_id?: number | null;
  hidden_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackMergeRequest {
  id: number;
  feedback_id: number;
  author_id: number;
  base_version_id: number;
  title: string;
  change_summary?: string | null;
  proposed_markdown_content: string;
  status: FeedbackMergeRequestStatus;
  author_reviewed_at?: string | null;
  author_review_note?: string | null;
  admin_reviewed_at?: string | null;
  admin_review_note?: string | null;
  merged_version_id?: number | null;
  created_at: string;
  updated_at: string;
  comments?: FeedbackMergeComment[];
}

export interface Feedback {
  id: number;
  author_id: number;
  title: string;
  author?: string;
  author_avatar?: string | null;
  status: FeedbackStatus;
  current_version_id: number | null;
  current_version?: FeedbackVersion | null;
  comments_ended: boolean;
  created_at: string;
  published_at?: string | null;
  rejected_at?: string | null;
  closed_at?: string | null;
  updated_at: string;
  comments?: FeedbackComment[];
  merge_requests?: FeedbackMergeRequest[];
}

export type AdminFeedbackSort = "newest" | "oldest";

export interface AdminListQuery<TStatus extends string> {
  status?: TStatus | "";
  page?: number;
  per_page?: number;
  sort?: AdminFeedbackSort;
}

export interface FeedbackAdminListResponse {
  feedbacks: Feedback[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
  counts: Record<FeedbackStatus | "total", number>;
}

export interface FeedbackMergeAdminListResponse {
  merge_requests: FeedbackMergeRequest[];
  total: number;
  page: number;
  pages: number;
  per_page: number;
  counts: Record<FeedbackMergeRequestStatus | "total", number>;
}

export interface CreateFeedbackPayload {
  title: string;
  markdown_content: string;
}

export interface CreateFeedbackCommentPayload {
  content: string;
  parent_comment_id?: number | null;
}

export interface CreateFeedbackMergeRequestPayload {
  change_summary: string;
  proposed_markdown_content: string;
}

export interface CreateFeedbackMergeCommentPayload {
  content: string;
  parent_comment_id?: number | null;
}
