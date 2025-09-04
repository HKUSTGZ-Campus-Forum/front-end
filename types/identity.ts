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

export interface UserIdentity {
  id: number
  user_id: number
  identity_type_id: number
  identity_type: IdentityType
  status: 'pending' | 'approved' | 'rejected' | 'revoked'
  verification_documents?: Record<string, any> | null
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
  user: {
    id: number
    username: string
    email?: string
    profile_picture_url?: string
  }
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