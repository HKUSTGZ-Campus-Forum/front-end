<template>
  <div 
    class="user-avatar" 
    :class="[`size-${size}`, { clickable: clickable }]"
    @click="handleClick"
    :title="showTooltip ? `${username}` : ''"
  >
    <img 
      v-if="currentAvatarUrl && !imageError" 
      :src="currentAvatarUrl" 
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
    
    <!-- Refresh indicator when retrying -->
    <div v-if="isRetrying" class="refresh-indicator">
      <i class="fas fa-sync-alt fa-spin"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useApi } from '~/composables/useApi';

export interface Props {
  avatarUrl?: string | null;
  username?: string;
  userId?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  clickable?: boolean;
  showTooltip?: boolean;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  enableAutoRefresh?: boolean;
}

interface Emits {
  (e: 'click', userId?: number): void;
  (e: 'imageError'): void;
  (e: 'avatarRefreshed', newUrl: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  username: '用户',
  size: 'md',
  clickable: false,
  showTooltip: true,
  showOnlineStatus: false,
  isOnline: false,
  enableAutoRefresh: true,
});

const emit = defineEmits<Emits>();

const { fetchWithAuth, getApiUrl } = useApi();

const imageLoaded = ref(false);
const imageError = ref(false);
const isRetrying = ref(false);
const retryCount = ref(0);
const currentAvatarUrl = ref<string | null>(null);
const refreshAttempts = ref(0);

// Maximum retry attempts
const MAX_RETRY_ATTEMPTS = 3;
const MAX_REFRESH_ATTEMPTS = 2;

// Initialize avatar URL
const initializeAvatarUrl = () => {
  currentAvatarUrl.value = props.avatarUrl;
  imageError.value = false;
  retryCount.value = 0;
  refreshAttempts.value = 0;
};

// Watch for changes in avatarUrl prop
watch(() => props.avatarUrl, (newUrl) => {
  if (newUrl !== currentAvatarUrl.value) {
    initializeAvatarUrl();
  }
});

// Check if URL appears to be expired OSS signed URL
const isOSSSignedUrl = (url: string): boolean => {
  if (!url) return false;
  // Check for OSS URL patterns with signature parameters
  return url.includes('aliyuncs.com') && 
         (url.includes('Expires=') || url.includes('x-oss-expires') || url.includes('security-token'));
};

// Extract expiration time from OSS signed URL
const getUrlExpiration = (url: string): Date | null => {
  if (!isOSSSignedUrl(url)) return null;
  
  try {
    const urlObj = new URL(url);
    const expires = urlObj.searchParams.get('Expires') || urlObj.searchParams.get('x-oss-expires');
    if (expires) {
      // OSS expires is usually a Unix timestamp
      return new Date(parseInt(expires) * 1000);
    }
  } catch (error) {
    console.warn('Failed to parse URL expiration:', error);
  }
  
  return null;
};

// Check if URL is likely expired or has mixed content issues
const isUrlLikelyExpired = (url: string): boolean => {
  if (!url) return false;
  
  // Check for mixed content (http in https context)
  if (url.startsWith('http://')) {
    return true;
  }
  
  if (!isOSSSignedUrl(url)) return false;
  
  const expiration = getUrlExpiration(url);
  if (expiration) {
    // Consider expired if within 10 minutes of expiration or already expired
    const now = new Date();
    const timeUntilExpiry = expiration.getTime() - now.getTime();
    return timeUntilExpiry <= 10 * 60 * 1000; // 10 minutes buffer
  }
  
  // If we can't determine expiration, assume it might be expired if it's an OSS URL
  return true;
};

// Refresh avatar URL from backend
const refreshAvatarUrl = async (): Promise<string | null> => {
  if (!props.userId || refreshAttempts.value >= MAX_REFRESH_ATTEMPTS) {
    return null;
  }
  
  try {
    refreshAttempts.value++;
    const response = await fetchWithAuth(getApiUrl(`/api/users/public/${props.userId}`));
    
    if (!response.ok) {
      throw new Error(`Failed to refresh avatar: ${response.status}`);
    }
    
    const userData = await response.json();
    const newAvatarUrl = userData.profile_picture_url;
    
    if (newAvatarUrl) {
      // Force HTTPS for the new URL
      const httpsUrl = newAvatarUrl.replace(/^http:\/\//, 'https://');
      if (httpsUrl !== currentAvatarUrl.value) {
        emit('avatarRefreshed', httpsUrl);
        return httpsUrl;
      }
    }
    
    return newAvatarUrl;
  } catch (error) {
    console.warn('Failed to refresh avatar URL:', error);
    return null;
  }
};

// Handle image loading error with smart retry logic
const handleImageError = async () => {
  console.log('Avatar image load failed:', currentAvatarUrl.value);
  
  // Always try to refresh if we have a userId and haven't exceeded attempts
  if (props.userId && refreshAttempts.value < MAX_REFRESH_ATTEMPTS) {
    retryCount.value++;
    isRetrying.value = true;
    
    try {
      const newUrl = await refreshAvatarUrl();
      if (newUrl) {
        console.log('Successfully refreshed avatar URL');
        currentAvatarUrl.value = newUrl;
        imageError.value = false;
        isRetrying.value = false;
        return;
      }
    } catch (error) {
      console.warn('Avatar URL refresh failed:', error);
    }
    
    // If refresh failed, try simple retry with exponential backoff
    setTimeout(() => {
      if (currentAvatarUrl.value) {
        // Force refresh by adding cache-busting parameter
        const url = new URL(currentAvatarUrl.value);
        url.searchParams.set('retry', retryCount.value.toString());
        url.searchParams.set('t', Date.now().toString());
        currentAvatarUrl.value = url.toString();
      }
      isRetrying.value = false;
    }, Math.pow(2, retryCount.value - 1) * 1000); // 1s, 2s, 4s
    
  } else {
    // Give up and show placeholder
    imageError.value = true;
    isRetrying.value = false;
    emit('imageError');
  }
};

// Handle successful image load
const handleImageLoad = () => {
  imageLoaded.value = true;
  imageError.value = false;
  isRetrying.value = false;
  retryCount.value = 0; // Reset retry count on successful load
};

// Proactively check and refresh URL if near expiration
const proactiveRefresh = async () => {
  if (!props.enableAutoRefresh || !currentAvatarUrl.value || !props.userId) {
    return;
  }
  
  if (isUrlLikelyExpired(currentAvatarUrl.value)) {
    console.log('Proactively refreshing avatar URL before expiration');
    const newUrl = await refreshAvatarUrl();
    if (newUrl) {
      currentAvatarUrl.value = newUrl;
    }
  }
};

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

// Initialize on mount
onMounted(() => {
  initializeAvatarUrl();
  
  // Set up proactive refresh interval (every 30 minutes)
  if (props.enableAutoRefresh) {
    const interval = setInterval(proactiveRefresh, 30 * 60 * 1000);
    
    // Also check immediately if URL might be expired
    if (currentAvatarUrl.value && isUrlLikelyExpired(currentAvatarUrl.value)) {
      proactiveRefresh();
    }
    
    // Cleanup interval on unmount
    onUnmounted(() => {
      clearInterval(interval);
    });
  }
});
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

  .refresh-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.7);
    border-radius: 50%;
    padding: 2px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    
    i {
      color: white;
      font-size: 0.6em;
    }
  }
}

// Responsive adjustments
@media (max-width: 479px) {
  .user-avatar {
    &.size-sm {
      width: 28px;
      height: 28px;
      
      .avatar-image,
      .avatar-placeholder {
        width: 28px;
        height: 28px;
        font-size: 11px;
      }
    }

    &.size-md {
      width: 36px;
      height: 36px;
      
      .avatar-image,
      .avatar-placeholder {
        width: 36px;
        height: 36px;
        font-size: 13px;
      }
    }

    &.size-lg {
      width: 44px;
      height: 44px;
      
      .avatar-image,
      .avatar-placeholder {
        width: 44px;
        height: 44px;
        font-size: 16px;
      }
    }

    &.size-xl {
      width: 60px;
      height: 60px;
      
      .avatar-image,
      .avatar-placeholder {
        width: 60px;
        height: 60px;
        font-size: 20px;
      }
    }

    &.clickable {
      &:active {
        transform: scale(0.95);
      }
    }

    .online-indicator {
      width: 20%;
      height: 20%;
      min-width: 6px;
      min-height: 6px;
      border-width: 1px;
    }
  }
}

@media (min-width: 480px) and (max-width: 768px) {
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