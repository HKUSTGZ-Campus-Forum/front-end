export type FileType = 'avatar' | 'post_image' | 'post_attachment' | 'comment_attachment' | 'general';

export interface UploadUrlResponse {
  signed_url: string;
  file_id: number;
  object_name: string;
  max_upload_bytes: number;
  expiration_seconds: number;
}

export interface FileRecord {
  id: number;
  user_id?: number;
  object_name?: string;
  original_filename: string;
  file_size: number | null;
  mime_type: string | null;
  status: 'pending' | 'uploaded' | 'error';
  file_type: FileType;
  entity_type?: string;
  entity_id?: number;
  url?: string;
  view_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadOptions {
  file: File;
  fileType: FileType;
  entityType?: string;
  entityId?: number;
  /** Reject upload if file exceeds this size (bytes), checked after optional image compression. */
  maxUploadBytes?: number;
  onProgress?: (progress: number) => void;
  onSuccess?: (file: FileRecord) => void;
  onError?: (error: Error) => void;
  /** Enable automatic image compression (default: true for images) */
  enableCompression?: boolean;
  /** Custom compression options (uses preset based on fileType if not specified) */
  compressionOptions?: import('~/utils/imageCompression').CompressionOptions;
  /** Abort an in-flight OSS PUT (for composer removal/cancel actions). */
  signal?: AbortSignal;
}
