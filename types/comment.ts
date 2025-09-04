import type { UserIdentity } from './identity';

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  parent_comment_id?: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author?: string;
  author_avatar?: string | null;
  display_identity?: UserIdentity | null; // Identity verification badge
  replies?: Comment[]; // 子评论
}

export interface CommentCreateData {
  content: string;
  post_id: number;
  parent_comment_id?: number;
  display_identity_id?: number | null;
}