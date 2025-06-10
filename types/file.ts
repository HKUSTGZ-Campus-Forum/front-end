export enum FileType {
  AVATAR = 'avatar',
  POST_IMAGE = 'post_image',
  COMMENT_ATTACHMENT = 'comment_attachment',
  GENERAL = 'general'
}

export interface UploadUrlResponse {
  signed_url: string;
  object_name: string;
  file_id: number;
  file_type: FileType;
  url: string;
  expiration_seconds: number;
}

export interface FileRecord {
  id: number;
  user_id: number;
  object_name: string;
  original_filename: string;
  status: 'pending' | 'uploaded' | 'error';
  file_type: FileType;
  entity_type?: string;
  entity_id?: number;
  created_at: string;
  updated_at: string;
  url?: string;
}

export interface UploadOptions {
  file: File;
  fileType: FileType;
  entityType?: string;
  entityId?: number;
  onProgress?: (progress: number) => void;
  onSuccess?: (fileRecord: FileRecord) => void;
  onError?: (error: Error) => void;
} 