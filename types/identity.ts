// Identity type definitions matching backend models

export interface IdentityType {
  id: number
  name: string
  display_name: string
  color: string
  icon_name: string
  description: string
  is_active: boolean
  created_at: string
}

export type IdentityAdminStatus = 'pending' | 'approved' | 'rejected' | 'revoked'

export interface IdentityVerificationDocument {
  file_id?: number | null
  filename?: string | null
  uploaded_at?: string | null
  size?: number | null
  mime_type?: string | null
  view_url?: string | null
}

export interface UserIdentity {
  id: number
  user_id: number
  identity_type_id: number
  identity_type: IdentityType
  status: IdentityAdminStatus
  verification_documents?: IdentityVerificationDocument[] | Record<string, any> | null
  verified_by?: number | null
  rejection_reason?: string | null
  notes?: string | null
  verified_at?: string | null
  expires_at?: string | null
  created_at: string
  updated_at: string
}

export interface IdentityVerificationRequest {
  identity_type_id: number
  documents?: File[]
  notes?: string
}

export interface UserWithIdentity {
  id: number
  username: string
  email?: string
  profile_picture_url?: string
  role_name?: string
  display_identity?: UserIdentity | null
}

// For admin identity management
export interface IdentityManagementItem extends UserIdentity {
  verification_documents?: IdentityVerificationDocument[] | null
  user: {
    id: number
    username: string
    email?: string
    profile_picture_url?: string
    created_at?: string
  }
}

export interface IdentityAdminCounts {
  pending: number
  approved: number
  rejected: number
  revoked: number
  total: number
  by_type?: Record<string, number>
}

export interface IdentityAdminListQuery {
  status?: IdentityAdminStatus | ''
  identity_type_id?: number | string | ''
  page?: number
  per_page?: number
  sort?: 'newest' | 'oldest' | 'priority'
}

export interface IdentityAdminListResponse {
  success: boolean
  requests: IdentityManagementItem[]
  total: number
  page: number
  pages: number
  per_page: number
  counts: IdentityAdminCounts
}

// Constants matching backend
export const IdentityStatus = {
  PENDING: 'pending',
  APPROVED: 'approved', 
  REJECTED: 'rejected',
  REVOKED: 'revoked'
} as const

export const IdentityTypeNames = {
  PROFESSOR: 'professor',
  STAFF: 'staff',
  OFFICER: 'officer',
  STUDENT_LEADER: 'student_leader'
} as const

export type IdentityStatusType = typeof IdentityStatus[keyof typeof IdentityStatus]
export type IdentityTypeName = typeof IdentityTypeNames[keyof typeof IdentityTypeNames]
