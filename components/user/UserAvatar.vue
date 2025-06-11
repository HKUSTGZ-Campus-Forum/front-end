<template>
  <div 
    class="user-avatar" 
    :class="[`size-${size}`, { clickable: clickable }]"
    @click="handleClick"
    :title="showTooltip ? `${username}` : ''"
  >
    <img 
      v-if="avatarUrl" 
      :src="avatarUrl" 
      :alt="`${username}的头像`"
      class="avatar-image"
      @error="handleImageError"
      @load="handleImageLoad"
    />
    <div v-else class="avatar-placeholder" :style="placeholderStyle">
      {{ initials }}
    </div>
    
    <!-- Online indicator -->
    <div v-if="showOnlineStatus && isOnline" class="online-indicator"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

export interface Props {
  avatarUrl?: string | null;
  username?: string;
  userId?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  clickable?: boolean;
  showTooltip?: boolean;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
}

interface Emits {
  (e: 'click', userId?: number): void;
  (e: 'imageError'): void;
}

const props = withDefaults(defineProps<Props>(), {
  username: '用户',
  size: 'md',
  clickable: false,
  showTooltip: true,
  showOnlineStatus: false,
  isOnline: false,
});

const emit = defineEmits<Emits>();

const imageLoaded = ref(false);
const imageError = ref(false);

// Generate initials from username
const initials = computed(() => {
  if (!props.username) return '用';
  
  const name = props.username.trim();
  if (name.length === 0) return '用';
  
  // For Chinese names, take first character
  if (/[\u4e00-\u9fff]/.test(name)) {
    return name.charAt(0);
  }
  
  // For English names, take first letter of each word (max 2)
  const words = name.split(' ').filter(word => word.length > 0);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return words.slice(0, 2)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
});

// Generate background color based on username
const placeholderStyle = computed(() => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
  ];
  
  // Use username to generate consistent color
  let hash = 0;
  for (let i = 0; i < props.username.length; i++) {
    hash = props.username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colorIndex = Math.abs(hash) % colors.length;
  return {
    backgroundColor: colors[colorIndex],
    color: '#FFFFFF'
  };
});

// Handle click
const handleClick = () => {
  if (props.clickable) {
    emit('click', props.userId);
  }
};

// Handle image error
const handleImageError = () => {
  imageError.value = true;
  emit('imageError');
};

// Handle image load
const handleImageLoad = () => {
  imageLoaded.value = true;
  imageError.value = false;
};
</script>

<style lang="scss" scoped>
.user-avatar {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &.clickable {
    cursor: pointer;

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }

  // Size variants
  &.size-xs {
    width: 24px;
    height: 24px;
    
    .avatar-image,
    .avatar-placeholder {
      width: 24px;
      height: 24px;
      font-size: 10px;
    }
  }

  &.size-sm {
    width: 32px;
    height: 32px;
    
    .avatar-image,
    .avatar-placeholder {
      width: 32px;
      height: 32px;
      font-size: 12px;
    }
  }

  &.size-md {
    width: 40px;
    height: 40px;
    
    .avatar-image,
    .avatar-placeholder {
      width: 40px;
      height: 40px;
      font-size: 14px;
    }
  }

  &.size-lg {
    width: 56px;
    height: 56px;
    
    .avatar-image,
    .avatar-placeholder {
      width: 56px;
      height: 56px;
      font-size: 18px;
    }
  }

  &.size-xl {
    width: 80px;
    height: 80px;
    
    .avatar-image,
    .avatar-placeholder {
      width: 80px;
      height: 80px;
      font-size: 24px;
    }
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    border-radius: 50%;
    text-transform: uppercase;
  }

  .online-indicator {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 25%;
    height: 25%;
    min-width: 8px;
    min-height: 8px;
    background: #28a745;
    border: 2px solid #fff;
    border-radius: 50%;
    z-index: 1;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .user-avatar {
    &.size-lg {
      width: 48px;
      height: 48px;
      
      .avatar-image,
      .avatar-placeholder {
        width: 48px;
        height: 48px;
        font-size: 16px;
      }
    }

    &.size-xl {
      width: 64px;
      height: 64px;
      
      .avatar-image,
      .avatar-placeholder {
        width: 64px;
        height: 64px;
        font-size: 20px;
      }
    }
  }
}
</style>