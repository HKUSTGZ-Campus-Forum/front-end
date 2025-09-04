import { ref, computed } from 'vue'
import { useApi } from './useApi'
import type { 
  IdentityType, 
  UserIdentity, 
  IdentityVerificationRequest,
  IdentityManagementItem 
} from '~/types/identity'

export function useIdentity() {
  const { fetchWithAuth, fetchPublic } = useApi()

  // State
  const identityTypes = ref<IdentityType[]>([])
  const userIdentities = ref<UserIdentity[]>([])
  const pendingRequests = ref<IdentityManagementItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed
  const activeIdentityTypes = computed(() => 
    identityTypes.value.filter(type => type.is_active)
  )

  const approvedIdentities = computed(() => 
    userIdentities.value.filter(identity => identity.status === 'approved')
  )

  // API Methods
  const fetchIdentityTypes = async (): Promise<IdentityType[]> => {
    try {
      loading.value = true
      error.value = null

      const response = await fetchPublic('/api/identities/types')
      if (!response.ok) {
        throw new Error(`Failed to fetch identity types: ${response.status}`)
      }

      const data = await response.json()
      identityTypes.value = data.identity_types || []
      return identityTypes.value

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  const fetchUserIdentities = async (): Promise<UserIdentity[]> => {
    try {
      loading.value = true
      error.value = null

      const response = await fetchWithAuth('/api/identities/my-identities')
      if (!response.ok) {
        throw new Error(`Failed to fetch user identities: ${response.status}`)
      }

      const data = await response.json()
      userIdentities.value = data.identities || []
      return userIdentities.value

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  const submitIdentityRequest = async (request: IdentityVerificationRequest): Promise<UserIdentity> => {
    try {
      loading.value = true
      error.value = null

      const response = await fetchWithAuth('/api/identities/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed: ${response.status}`)
      }

      const data = await response.json()
      
      // Add to user identities list
      if (data.identity) {
        userIdentities.value.push(data.identity)
      }

      return data.identity

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateDisplayIdentity = async (identityId: number | null): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      const response = await fetchWithAuth('/api/identities/display-identity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity_id: identityId
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Update failed: ${response.status}`)
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  const withdrawRequest = async (identityId: number): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      const response = await fetchWithAuth(`/api/identities/${identityId}/withdraw`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Withdrawal failed: ${response.status}`)
      }

      // Remove from user identities list
      const index = userIdentities.value.findIndex(identity => identity.id === identityId)
      if (index > -1) {
        userIdentities.value.splice(index, 1)
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Admin methods
  const fetchPendingRequests = async (): Promise<IdentityManagementItem[]> => {
    try {
      loading.value = true
      error.value = null

      const response = await fetchWithAuth('/api/admin/identities/pending')
      if (!response.ok) {
        throw new Error(`Failed to fetch pending requests: ${response.status}`)
      }

      const data = await response.json()
      pendingRequests.value = data.requests || []
      return pendingRequests.value

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  const approveIdentityRequest = async (
    identityId: number, 
    notes?: string
  ): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      const response = await fetchWithAuth(`/api/admin/identities/${identityId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Approval failed: ${response.status}`)
      }

      // Remove from pending requests
      const index = pendingRequests.value.findIndex(request => request.id === identityId)
      if (index > -1) {
        pendingRequests.value.splice(index, 1)
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  const rejectIdentityRequest = async (
    identityId: number, 
    reason: string,
    notes?: string
  ): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      const response = await fetchWithAuth(`/api/admin/identities/${identityId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          rejection_reason: reason,
          notes 
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Rejection failed: ${response.status}`)
      }

      // Remove from pending requests
      const index = pendingRequests.value.findIndex(request => request.id === identityId)
      if (index > -1) {
        pendingRequests.value.splice(index, 1)
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  const revokeIdentity = async (identityId: number, reason?: string): Promise<void> => {
    try {
      loading.value = true
      error.value = null

      const response = await fetchWithAuth(`/api/admin/identities/${identityId}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Revocation failed: ${response.status}`)
      }

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Utility methods
  const getIdentityTypeById = (id: number): IdentityType | undefined => {
    return identityTypes.value.find(type => type.id === id)
  }

  const hasApprovedIdentity = (identityTypeId: number): boolean => {
    return approvedIdentities.value.some(identity => 
      identity.identity_type_id === identityTypeId
    )
  }

  const hasPendingRequest = (identityTypeId: number): boolean => {
    return userIdentities.value.some(identity => 
      identity.identity_type_id === identityTypeId && identity.status === 'pending'
    )
  }

  const clearError = () => {
    error.value = null
  }

  const resetState = () => {
    identityTypes.value = []
    userIdentities.value = []
    pendingRequests.value = []
    error.value = null
    loading.value = false
  }

  return {
    // State
    identityTypes: readonly(identityTypes),
    userIdentities: readonly(userIdentities),
    pendingRequests: readonly(pendingRequests),
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    activeIdentityTypes,
    approvedIdentities,

    // User methods
    fetchIdentityTypes,
    fetchUserIdentities,
    submitIdentityRequest,
    updateDisplayIdentity,
    withdrawRequest,

    // Admin methods
    fetchPendingRequests,
    approveIdentityRequest,
    rejectIdentityRequest,
    revokeIdentity,

    // Utilities
    getIdentityTypeById,
    hasApprovedIdentity,
    hasPendingRequest,
    clearError,
    resetState
  }
}