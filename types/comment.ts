export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  parent_comment_id?: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author?: string; // 从用户表获取的用户名
  replies?: Comment[]; // 子评论
}

export interface CommentCreateData {
  content: string;
  post_id: number;
  parent_comment_id?: number;
}