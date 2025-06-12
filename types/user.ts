export interface User {
  id: string | number;
  username: string;
  email?: string;
  phone_number?: string;
  profile_picture_url?: string | null;
  profile_picture_file_id?: number | null;
  role_id?: number;
  role_name?: string;
  is_first_login?: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  created_at?: string;
  updated_at?: string;
  last_active_at?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
} 