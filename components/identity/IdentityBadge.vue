<script setup lang="ts">
import { defineProps, withDefaults } from 'vue'

// Identity interface based on backend UserIdentity model
interface Identity {
  id: number
  identity_type: {
    name: string
    display_name: string
    color: string
    icon_name: string
    description: string
  }
  status: string
}

interface IdentityBadgeProps {
  identity?: Identity | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showTooltip?: boolean
  clickable?: boolean
}

const props = withDefaults(defineProps<IdentityBadgeProps>(), {
  size: 'sm',
  showIcon: true,
  showTooltip: true,
  clickable: false
})

// Map icon names to Unicode fallbacks
const getIconFallback = (iconName: string): string => {
  const iconMap: Record<string, string> = {
    'academic-cap': '🎓',
    'user-group': '👥',
    'shield-check': '🛡️',
    'star': '⭐'
  }
  return iconMap[iconName] || '🏷️'
}

// Only show badge if identity exists and is approved
const shouldShowBadge = computed(() => {
  return props.identity && 
         props.identity.status === 'approved' &&
         props.identity.identity_type
})

const badgeClasses = computed(() => [
  'identity-badge',
  `identity-badge--${props.size}`,
  {
    'identity-badge--clickable': props.clickable,
    'identity-badge--with-icon': props.showIcon
  }
])

const badgeStyles = computed(() => ({
  '--badge-color': props.identity?.identity_type?.color || '#2563eb',
  '--badge-bg': `${props.identity?.identity_type?.color || '#2563eb'}20`
}))
</script>

<template>
  <span 
    v-if="shouldShowBadge"
    :class="badgeClasses"
    :style="badgeStyles"
    :title="showTooltip ? identity?.identity_type?.description : undefined"
  >
    <span 
      v-if="showIcon" 
      class="identity-badge__icon"
    >
      {{ getIconFallback(identity!.identity_type.icon_name) }}
    </span>
    <span class="identity-badge__text">
      {{ identity!.identity_type.display_name }}
    </span>
  </span>
</template>

<style lang="scss" scoped>
.identity-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background-color: var(--badge-bg);
  color: var(--badge-color);
  border: 1px solid var(--badge-color);
  border-radius: 0.375rem;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
  
  // Size variants
  &--xs {
    padding: 0.125rem 0.375rem;
    font-size: 0.7rem;
    
    .identity-badge__icon {
      font-size: 0.7rem;
    }
  }
  
  &--sm {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    
    .identity-badge__icon {
      font-size: 0.75rem;
    }
  }
  
  &--md {
    padding: 0.375rem 0.75rem;
    font-size: 0.875rem;
    
    .identity-badge__icon {
      font-size: 0.875rem;
    }
  }
  
  &--lg {
    padding: 0.5rem 1rem;
    font-size: 1rem;
    
    .identity-badge__icon {
      font-size: 1rem;
    }
  }
  
  // Clickable state
  &--clickable {
    cursor: pointer;
    
    &:hover {
      background-color: var(--badge-color);
      color: var(--surface-primary);
      transform: translateY(-1px);
      box-shadow: var(--shadow-small);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
  
  // Responsive adjustments
  @media (max-width: 480px) {
    &--md {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
    
    &--lg {
      padding: 0.375rem 0.75rem;
      font-size: 0.875rem;
    }
  }
}

.identity-badge__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.identity-badge__text {
  font-family: inherit;
  line-height: 1;
}

// Tooltip enhancement for better UX
.identity-badge[title]:hover {
  position: relative;
}

// Theme integration - use CSS custom properties
.identity-badge {
  // Fallback for themes that don't define custom badge colors
  --fallback-bg: var(--surface-secondary);
  --fallback-border: var(--border-primary);
  --fallback-color: var(--text-secondary);
  
  background-color: var(--badge-bg, var(--fallback-bg));
  border-color: var(--badge-color, var(--fallback-border));
  color: var(--badge-color, var(--fallback-color));
}
</style>