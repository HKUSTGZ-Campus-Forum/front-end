<template>
  <div class="test-identity-page">
    <h1>Identity System Test Page</h1>
    
    <!-- Test 1: Identity Types Loading -->
    <section class="test-section">
      <h2>🔧 Test 1: Identity Types</h2>
      <button @click="testIdentityTypes" :disabled="loading" class="test-btn">
        {{ loading ? 'Loading...' : 'Load Identity Types' }}
      </button>
      
      <div v-if="identityTypes.length > 0" class="test-results success">
        <h3>✅ Identity Types Loaded Successfully</h3>
        <div class="identity-types-list">
          <div 
            v-for="type in identityTypes" 
            :key="type.id" 
            class="identity-type-item"
          >
            <span class="type-icon" :style="{ color: type.color }">
              {{ getIcon(type.icon_name) }}
            </span>
            <div class="type-details">
              <strong>{{ type.display_name }}</strong>
              <p>{{ type.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Test 2: User Identities -->
    <section class="test-section">
      <h2>🔧 Test 2: User Identities</h2>
      <button @click="testUserIdentities" :disabled="loading" class="test-btn">
        {{ loading ? 'Loading...' : 'Load My Identities' }}
      </button>
      
      <div v-if="userIdentitiesLoaded" class="test-results">
        <h3 v-if="userIdentities.length > 0" class="success">
          ✅ Found {{ userIdentities.length }} User Identity(ies)
        </h3>
        <h3 v-else class="info">
          ℹ️ No user identities found (this is normal for new users)
        </h3>
        
        <div v-if="userIdentities.length > 0" class="user-identities-list">
          <div 
            v-for="identity in userIdentities" 
            :key="identity.id"
            class="user-identity-item"
            :class="`status-${identity.status}`"
          >
            <IdentityBadge 
              :identity="identity"
              size="md"
              :show-tooltip="true"
            />
            <div class="identity-info">
              <p><strong>Status:</strong> {{ identity.status }}</p>
              <p><strong>Created:</strong> {{ new Date(identity.created_at).toLocaleDateString() }}</p>
              <p v-if="identity.verified_at"><strong>Verified:</strong> {{ new Date(identity.verified_at).toLocaleDateString() }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Test 3: Identity Selector Component -->
    <section class="test-section">
      <h2>🔧 Test 3: Identity Selector Component</h2>
      <div class="test-results">
        <p>Selected Identity ID: <strong>{{ selectedIdentityId || 'None' }}</strong></p>
        <IdentitySelector 
          v-model="selectedIdentityId"
          size="md"
          :show-label="true"
          @change="handleIdentityChange"
        />
        <p v-if="selectedIdentity" class="selected-info">
          ✅ Selected: {{ selectedIdentity.identity_type.display_name }}
        </p>
      </div>
    </section>

    <!-- Test 4: Manual Identity Creation (for testing) -->
    <section class="test-section">
      <h2>🔧 Test 4: Create Test Identity (Admin Only)</h2>
      <div class="admin-warning">
        ⚠️ This will create a test approved identity for the current user
      </div>
      <button @click="createTestIdentity" :disabled="loading" class="test-btn danger">
        Create Test Professor Identity
      </button>
    </section>

    <!-- Test 5: Identity Request Form -->
    <section class="test-section">
      <h2>🔧 Test 5: Identity Request Form</h2>
      <button @click="showRequestForm = true" class="test-btn">
        Open Request Form
      </button>
      
      <div v-if="showRequestForm" class="modal-overlay" @click="showRequestForm = false">
        <div class="modal-content" @click.stop>
          <IdentityRequestForm 
            :identity-types="identityTypes"
            :existing-requests="userIdentities"
            @request-submitted="handleRequestSubmitted"
            @close="showRequestForm = false"
          />
        </div>
      </div>
    </section>

    <!-- Test Results Summary -->
    <section class="test-section">
      <h2>📊 Test Summary</h2>
      <div class="test-summary">
        <div class="summary-item" :class="{ success: identityTypes.length > 0 }">
          Identity Types: {{ identityTypes.length > 0 ? '✅ Working' : '❌ Failed' }}
        </div>
        <div class="summary-item" :class="{ success: userIdentitiesLoaded }">
          User Identities: {{ userIdentitiesLoaded ? '✅ Working' : '❌ Not tested' }}
        </div>
        <div class="summary-item" :class="{ success: approvedIdentities.length > 0 }">
          Approved Identities: {{ approvedIdentities.length }} found
        </div>
      </div>
    </section>

    <!-- Error Display -->
    <div v-if="error" class="error-section">
      <h3>❌ Error</h3>
      <pre>{{ error }}</pre>
      <button @click="clearError" class="test-btn">Clear Error</button>
    </div>

    <!-- Debug Info -->
    <section class="test-section">
      <h2>🐛 Debug Info</h2>
      <details>
        <summary>Raw Data</summary>
        <pre>{{ JSON.stringify({ 
          identityTypes, 
          userIdentities, 
          selectedIdentityId,
          isLoggedIn: !!user
        }, null, 2) }}</pre>
      </details>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useIdentity } from '~/composables/useIdentity'
import { useAuth } from '~/composables/useAuth'
import { useApi } from '~/composables/useApi'
import IdentityBadge from '~/components/identity/IdentityBadge.vue'
import IdentitySelector from '~/components/identity/IdentitySelector.vue'
import IdentityRequestForm from '~/components/identity/IdentityRequestForm.vue'
import type { UserIdentity } from '~/types/identity'

// Composables
const {
  identityTypes,
  userIdentities,
  loading,
  error,
  approvedIdentities,
  fetchIdentityTypes,
  fetchUserIdentities,
  clearError
} = useIdentity()

const { user } = useAuth()
const { fetchWithAuth } = useApi()

// Local state
const userIdentitiesLoaded = ref(false)
const selectedIdentityId = ref<number | null>(null)
const showRequestForm = ref(false)

// Computed
const selectedIdentity = computed(() => {
  if (!selectedIdentityId.value) return null
  return approvedIdentities.value.find(identity => identity.id === selectedIdentityId.value) || null
})

// Methods
const getIcon = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    'academic-cap': '🎓',
    'user-group': '👥',
    'shield-check': '🛡️',
    'star': '⭐'
  }
  return iconMap[iconName] || '🏷️'
}

const testIdentityTypes = async () => {
  try {
    await fetchIdentityTypes()
    console.log('✅ Identity types loaded:', identityTypes.value)
  } catch (err) {
    console.error('❌ Failed to load identity types:', err)
  }
}

const testUserIdentities = async () => {
  try {
    await fetchUserIdentities()
    userIdentitiesLoaded.value = true
    console.log('✅ User identities loaded:', userIdentities.value)
  } catch (err) {
    console.error('❌ Failed to load user identities:', err)
    userIdentitiesLoaded.value = true // Mark as attempted
  }
}

const handleIdentityChange = (identity: UserIdentity | null) => {
  console.log('Identity changed:', identity)
}

const createTestIdentity = async () => {
  if (!user.value) {
    alert('You must be logged in')
    return
  }

  if (!confirm('This will create a test approved identity for your user. Continue?')) {
    return
  }

  try {
    // First submit a request
    const response = await fetchWithAuth('/api/identities/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identity_type_id: 1, // Professor
        notes: 'Test identity created from frontend test page'
      })
    })

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`)
    }

    const requestData = await response.json()
    console.log('✅ Test request created:', requestData)

    // Now approve it (this would normally require admin privileges)
    const approveResponse = await fetchWithAuth(`/api/admin/identities/${requestData.identity.id}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notes: 'Auto-approved for testing'
      })
    })

    if (approveResponse.ok) {
      console.log('✅ Test identity approved')
      alert('Test identity created and approved! Refresh the page to see it.')
      // Refresh data
      await testUserIdentities()
    } else {
      console.log('ℹ️ Request created but could not auto-approve (admin privileges needed)')
      alert('Test request created! You need admin access to approve it.')
    }

  } catch (err) {
    console.error('❌ Failed to create test identity:', err)
    alert(`Error: ${err.message}`)
  }
}

const handleRequestSubmitted = (request: any) => {
  console.log('✅ Request submitted:', request)
  showRequestForm.value = false
  alert('Request submitted successfully!')
  testUserIdentities() // Refresh
}

// Auto-load on mount
onMounted(() => {
  testIdentityTypes()
  testUserIdentities()
})
</script>

<style lang="scss" scoped>
.test-identity-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
}

.test-section {
  margin-bottom: 3rem;
  padding: 2rem;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  background: var(--surface-primary);
}

.test-btn {
  padding: 0.75rem 1.5rem;
  background: var(--interactive-primary);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 1rem;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.danger {
    background: var(--error);
  }

  &:hover:not(:disabled) {
    opacity: 0.9;
  }
}

.test-results {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 6px;
  
  &.success {
    background: var(--success)20;
    border: 1px solid var(--success);
  }
  
  &.info {
    background: var(--interactive-primary)20;
    border: 1px solid var(--interactive-primary);
  }
}

.identity-types-list,
.user-identities-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

.identity-type-item,
.user-identity-item {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  background: var(--surface-secondary);
  border-radius: 6px;
  
  &.status-approved {
    border-left: 4px solid var(--success);
  }
  
  &.status-pending {
    border-left: 4px solid var(--warning);
  }
  
  &.status-rejected {
    border-left: 4px solid var(--error);
  }
}

.type-icon {
  font-size: 1.5rem;
}

.type-details {
  h3 {
    margin: 0 0 0.25rem 0;
    color: var(--text-primary);
  }
  
  p {
    margin: 0;
    color: var(--text-muted);
    font-size: 0.9rem;
  }
}

.identity-info {
  p {
    margin: 0.25rem 0;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
}

.selected-info {
  color: var(--success);
  font-weight: 500;
  margin-top: 0.5rem;
}

.admin-warning {
  background: var(--warning)20;
  color: var(--warning);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  border: 1px solid var(--warning);
}

.test-summary {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-item {
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--error)20;
  color: var(--error);
  
  &.success {
    background: var(--success)20;
    color: var(--success);
  }
}

.error-section {
  background: var(--error)20;
  color: var(--error);
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid var(--error);
  margin: 2rem 0;

  pre {
    background: rgba(0,0,0,0.1);
    padding: 1rem;
    border-radius: 4px;
    overflow: auto;
    font-size: 0.9rem;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

details {
  margin-top: 1rem;
  
  summary {
    cursor: pointer;
    color: var(--interactive-primary);
    font-weight: 500;
  }
  
  pre {
    background: var(--surface-secondary);
    padding: 1rem;
    border-radius: 4px;
    overflow: auto;
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }
}

h1 {
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 2rem;
}

h2 {
  color: var(--text-primary);
  margin-bottom: 1rem;
}

h3 {
  margin-top: 0;
  
  &.success {
    color: var(--success);
  }
  
  &.info {
    color: var(--interactive-primary);
  }
}
</style>