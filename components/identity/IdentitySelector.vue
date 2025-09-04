<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useIdentity } from '~/composables/useIdentity'
import type { UserIdentity } from '~/types/identity'

interface IdentitySelectorProps {
  modelValue?: number | null  // Selected identity ID
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

interface IdentitySelectorEmits {
  (e: 'update:modelValue', value: number | null): void
  (e: 'change', identity: UserIdentity | null): void
}

const props = withDefaults(defineProps<IdentitySelectorProps>(), {
  modelValue: null,
  disabled: false,
  size: 'md',
  showLabel: true
})

const emit = defineEmits<IdentitySelectorEmits>()

const { 
  userIdentities, 
  approvedIdentities,
  fetchUserIdentities,
  loading,
  error 
} = useIdentity()

// Local state
const isOpen = ref(false)
const selectedIdentityId = ref(props.modelValue)

// Computed properties
const selectedIdentity = computed(() => {
  if (!selectedIdentityId.value) return null
  return approvedIdentities.value.find(identity => identity.id === selectedIdentityId.value) || null
})

const availableIdentities = computed(() => {
  // Only show approved identities
  return approvedIdentities.value
})

const hasIdentities = computed(() => availableIdentities.value.length > 0)

const displayText = computed(() => {
  if (selectedIdentity.value) {
    return selectedIdentity.value.identity_type.display_name
  }
  return hasIdentities.value ? '选择身份' : '暂无可用身份'
})

const selectorClasses = computed(() => [
  'identity-selector',
  `identity-selector--${props.size}`,
  {
    'identity-selector--open': isOpen.value,
    'identity-selector--disabled': props.disabled || !hasIdentities.value,
    'identity-selector--selected': selectedIdentity.value
  }
])

// Methods
const toggleDropdown = () => {
  if (props.disabled || !hasIdentities.value) return
  isOpen.value = !isOpen.value
}

const selectIdentity = (identity: UserIdentity | null) => {
  selectedIdentityId.value = identity?.id || null
  emit('update:modelValue', selectedIdentityId.value)
  emit('change', identity)
  isOpen.value = false
}

const clearSelection = () => {
  selectIdentity(null)
}

// Close dropdown when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement
  if (!target.closest('.identity-selector')) {
    isOpen.value = false
  }
}

// Icon mapping
const getIcon = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    'academic-cap': '🎓',
    'user-group': '👥',
    'shield-check': '🛡️',
    'star': '⭐'
  }
  return iconMap[iconName] || '🏷️'
}

// Lifecycle
onMounted(async () => {
  // Fetch user identities if not already loaded
  if (userIdentities.value.length === 0) {
    try {
      await fetchUserIdentities()
    } catch (err) {
      console.error('Failed to fetch user identities:', err)
    }
  }

  // Add click outside listener
  document.addEventListener('click', handleClickOutside)
})

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  selectedIdentityId.value = newValue
})

// Cleanup
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="identity-selector-container">
    <label v-if="showLabel" class="identity-selector-label">
      发布身份
    </label>
    
    <div :class="selectorClasses">
      <!-- Selected value display -->
      <div 
        class="identity-selector-trigger"
        @click="toggleDropdown"
        :aria-expanded="isOpen"
        :aria-haspopup="true"
        role="button"
        :tabindex="disabled ? -1 : 0"
        @keydown.enter="toggleDropdown"
        @keydown.space.prevent="toggleDropdown"
        @keydown.escape="isOpen = false"
      >
        <div class="trigger-content">
          <!-- Selected identity display -->
          <div v-if="selectedIdentity" class="selected-identity">
            <span 
              class="identity-icon"
              :style="{ color: selectedIdentity.identity_type.color }"
            >
              {{ getIcon(selectedIdentity.identity_type.icon_name) }}
            </span>
            <span class="identity-name">
              {{ selectedIdentity.identity_type.display_name }}
            </span>
          </div>
          
          <!-- Default state -->
          <div v-else class="placeholder">
            <span class="placeholder-icon">👤</span>
            <span class="placeholder-text">{{ displayText }}</span>
          </div>
        </div>
        
        <!-- Dropdown arrow -->
        <span 
          class="dropdown-arrow"
          :class="{ 'dropdown-arrow--open': isOpen }"
        >
          ▼
        </span>
      </div>

      <!-- Dropdown menu -->
      <div 
        v-if="isOpen" 
        class="identity-selector-dropdown"
        role="listbox"
      >
        <!-- No identity option -->
        <div 
          class="dropdown-option"
          :class="{ 'dropdown-option--selected': !selectedIdentity }"
          @click="selectIdentity(null)"
          role="option"
          :aria-selected="!selectedIdentity"
        >
          <div class="option-content">
            <span class="option-icon">👤</span>
            <div class="option-details">
              <span class="option-name">普通用户</span>
              <span class="option-description">以普通身份发布</span>
            </div>
          </div>
        </div>

        <!-- Available identities -->
        <div 
          v-for="identity in availableIdentities"
          :key="identity.id"
          class="dropdown-option"
          :class="{ 'dropdown-option--selected': selectedIdentity?.id === identity.id }"
          @click="selectIdentity(identity)"
          role="option"
          :aria-selected="selectedIdentity?.id === identity.id"
        >
          <div class="option-content">
            <span 
              class="option-icon"
              :style="{ color: identity.identity_type.color }"
            >
              {{ getIcon(identity.identity_type.icon_name) }}
            </span>
            <div class="option-details">
              <span class="option-name">
                {{ identity.identity_type.display_name }}
              </span>
              <span class="option-description">
                {{ identity.identity_type.description }}
              </span>
            </div>
          </div>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="dropdown-loading">
          <span class="loading-spinner">⟳</span>
          <span>加载中...</span>
        </div>

        <!-- Error state -->
        <div v-if="error" class="dropdown-error">
          <span class="error-icon">⚠️</span>
          <span>加载失败</span>
        </div>

        <!-- Empty state -->
        <div v-if="!loading && !error && availableIdentities.length === 0" class="dropdown-empty">
          <span class="empty-icon">📝</span>
          <div class="empty-content">
            <span class="empty-title">暂无认证身份</span>
            <span class="empty-description">您可以在设置中申请身份认证</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.identity-selector-container {
  position: relative;
}

.identity-selector-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.identity-selector {
  position: relative;
  min-width: 200px;
  
  &--sm {
    min-width: 150px;
    
    .identity-selector-trigger {
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
    }
  }
  
  &--md {
    min-width: 200px;
    
    .identity-selector-trigger {
      padding: 0.75rem 1rem;
      font-size: 0.9rem;
    }
  }
  
  &--lg {
    min-width: 250px;
    
    .identity-selector-trigger {
      padding: 1rem 1.25rem;
      font-size: 1rem;
    }
  }
  
  &--disabled {
    .identity-selector-trigger {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

.identity-selector-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover:not(.identity-selector--disabled .identity-selector-trigger) {
    border-color: var(--interactive-primary);
  }
  
  &:focus {
    outline: none;
    border-color: var(--interactive-primary);
    box-shadow: 0 0 0 3px var(--interactive-primary)20;
  }
  
  .identity-selector--open & {
    border-color: var(--interactive-primary);
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;
  }
}

.trigger-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.selected-identity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .identity-icon {
    font-size: 1rem;
    flex-shrink: 0;
  }
  
  .identity-name {
    font-weight: 500;
    color: var(--text-primary);
    truncate: true;
  }
}

.placeholder {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  .placeholder-icon {
    font-size: 1rem;
    opacity: 0.7;
    flex-shrink: 0;
  }
  
  .placeholder-text {
    color: var(--text-muted);
    truncate: true;
  }
}

.dropdown-arrow {
  font-size: 0.7rem;
  color: var(--text-muted);
  transition: transform 0.2s ease;
  flex-shrink: 0;
  
  &--open {
    transform: rotate(180deg);
  }
}

.identity-selector-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface-primary);
  border: 1px solid var(--interactive-primary);
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: var(--shadow-medium);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  
  @media (max-width: 480px) {
    max-height: 250px;
  }
}

.dropdown-option {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-bottom: 1px solid var(--border-primary);
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: var(--surface-secondary);
  }
  
  &--selected {
    background: var(--interactive-primary)10;
    color: var(--interactive-primary);
  }
  
  @media (max-width: 480px) {
    padding: 1rem 0.75rem;
  }
}

.option-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.option-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.option-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  flex: 1;
}

.option-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.2;
}

.option-description {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.3;
  word-wrap: break-word;
}

.dropdown-loading,
.dropdown-error,
.dropdown-empty {
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.dropdown-empty {
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  padding: 1.5rem 1rem;
  
  .empty-icon {
    font-size: 2rem;
    opacity: 0.5;
  }
  
  .empty-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .empty-title {
    font-weight: 500;
    color: var(--text-secondary);
  }
  
  .empty-description {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

// Responsive adjustments
@media (max-width: 480px) {
  .identity-selector {
    min-width: unset;
    width: 100%;
    
    &--sm,
    &--md,
    &--lg {
      min-width: unset;
      width: 100%;
    }
  }
  
  .identity-selector-trigger {
    padding: 0.75rem 1rem !important;
    font-size: 0.9rem !important;
  }
}
</style>