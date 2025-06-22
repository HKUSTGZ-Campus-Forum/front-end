export type FileType = 'avatar' | 'post_image' | 'comment_attachment' | 'general';

export interface UploadUrlResponse {
  signed_url: string;
  file_id: number;
  object_name: string;
  public_url: string;
}

export interface FileRecord {
  id: number;
  user_id: number;
  object_name: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'uploaded' | 'error';
  file_type: FileType;
  entity_type?: string;
  entity_id?: number;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface UploadOptions {
  file: File;
  fileType: FileType;
  entityType?: string;
  entityId?: number;
  onProgress?: (progress: number) => void;
  onSuccess?: (file: FileRecord) => void;
  onError?: (error: Error) => void;
  /** Enable automatic image compression (default: true for images) */
  enableCompression?: boolean;
  /** Custom compression options (uses preset based on fileType if not specified) */
  compressionOptions?: import('~/utils/imageCompression').CompressionOptions;
} 