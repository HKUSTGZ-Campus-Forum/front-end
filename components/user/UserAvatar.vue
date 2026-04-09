<template>
  <div
    class="user-avatar"
    :class="[`size-${normalizedSize}`, { clickable: clickable }]"
    :title="showTooltip ? resolvedUsername : ''"
    @click="handleClick"
  >
    <img
      v-if="currentAvatarUrl && !imageError"
      :src="currentAvatarUrl"
      :alt="`${resolvedUsername}的头像`"
      class="avatar-image"
      @error="handleImageError"
      @load="handleImageLoad"
    />
    <div v-else class="avatar-placeholder" :style="placeholderStyle">
      {{ initials }}
    </div>

    <div v-if="showOnlineStatus && isOnline" class="online-indicator"></div>

    <div v-if="isRetrying" class="refresh-indicator" aria-hidden="true">
      <span class="refresh-indicator__icon">↻</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useApi } from '~/composables/useApi'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface LegacyUserShape {
  id?: number | string
  username?: string
  profile_picture_url?: string | null
  avatar_url?: string | null
}

export interface Props {
  avatarUrl?: string | null
  username?: string
  userId?: number | string
  user?: LegacyUserShape
  size?: AvatarSize | number
  clickable?: boolean
  showTooltip?: boolean
  showOnlineStatus?: boolean
  isOnline?: boolean
  enableAutoRefresh?: boolean
}

interface Emits {
  (e: 'click', userId?: number | string): void
  (e: 'imageError'): void
  (e: 'avatarRefreshed', newUrl: string): void
}

const props = withDefaults(defineProps<Props>(), {
  username: '用户',
  size: 'md',
  clickable: false,
  showTooltip: true,
  showOnlineStatus: false,
  isOnline: false,
  enableAutoRefresh: true,
})

const emit = defineEmits<Emits>()

const { fetchPublic, getApiUrl } = useApi()

const imageError = ref(false)
const isRetrying = ref(false)
const retryCount = ref(0)
const currentAvatarUrl = ref<string | null>(null)
const refreshAttempts = ref(0)

const MAX_RETRY_ATTEMPTS = 3
const MAX_REFRESH_ATTEMPTS = 2

let refreshInterval: ReturnType<typeof setInterval> | null = null

const normalizedSize = computed<AvatarSize>(() => {
  if (typeof props.size === 'string') {
    return props.size
  }

  const numericSize = Number(props.size)
  if (Number.isNaN(numericSize) || numericSize <= 0) return 'md'
  if (numericSize <= 24) return 'xs'
  if (numericSize <= 36) return 'sm'
  if (numericSize <= 48) return 'md'
  if (numericSize <= 64) return 'lg'
  return 'xl'
})

const resolvedUsername = computed(() => {
  return props.username || props.user?.username || '用户'
})

const resolvedUserId = computed(() => {
  return props.userId ?? props.user?.id
})

const resolvedAvatarUrl = computed(() => {
  return props.avatarUrl ?? props.user?.profile_picture_url ?? props.user?.avatar_url ?? null
})

const normalizeAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null
  return url.trim().replace(/^http:\/\//i, 'https://')
}

const initializeAvatarUrl = () => {
  currentAvatarUrl.value = normalizeAvatarUrl(resolvedAvatarUrl.value)
  imageError.value = false
  retryCount.value = 0
  refreshAttempts.value = 0
}

watch(
  [() => resolvedAvatarUrl.value, () => resolvedUserId.value],
  (newValues, oldValues) => {
    if (!oldValues || newValues[0] !== oldValues[0] || newValues[1] !== oldValues[1]) {
      initializeAvatarUrl()
    }
  }
)

const isOSSSignedUrl = (url: string): boolean => {
  if (!url) return false
  return url.includes('aliyuncs.com') &&
    (url.includes('Expires=') || url.includes('x-oss-expires') || url.includes('security-token'))
}

const getUrlExpiration = (url: string): Date | null => {
  if (!isOSSSignedUrl(url)) return null

  try {
    const urlObj = new URL(url)
    const expires = urlObj.searchParams.get('Expires') || urlObj.searchParams.get('x-oss-expires')
    if (expires) {
      return new Date(parseInt(expires, 10) * 1000)
    }
  } catch (error) {
    console.warn('Failed to parse URL expiration:', error)
  }

  return null
}

const isUrlLikelyExpired = (url: string): boolean => {
  if (!url) return false

  if (url.startsWith('http://')) {
    return true
  }

  if (!isOSSSignedUrl(url)) return false

  const expiration = getUrlExpiration(url)
  if (expiration) {
    const now = new Date()
    const timeUntilExpiry = expiration.getTime() - now.getTime()
    return timeUntilExpiry <= 10 * 60 * 1000
  }

  return true
}

const refreshAvatarUrl = async (): Promise<string | null> => {
  const userId = resolvedUserId.value
  if (!userId || refreshAttempts.value >= MAX_REFRESH_ATTEMPTS) {
    return null
  }

  try {
    refreshAttempts.value += 1
    const response = await fetchPublic(getApiUrl(`/api/users/public/${userId}`))

    if (!response.ok) {
      throw new Error(`Failed to refresh avatar: ${response.status}`)
    }

    const userData = await response.json()
    const freshUrl = normalizeAvatarUrl(userData.profile_picture_url || userData.avatar_url)

    if (freshUrl && freshUrl !== currentAvatarUrl.value) {
      emit('avatarRefreshed', freshUrl)
      return freshUrl
    }

    return freshUrl
  } catch (error) {
    console.warn('Failed to refresh avatar URL:', error)
    return null
  }
}

const updateRetryUrl = () => {
  if (!currentAvatarUrl.value) return

  const sep = currentAvatarUrl.value.includes('?') ? '&' : '?'
  const fallbackUrl = `${currentAvatarUrl.value}${sep}retry=${retryCount.value}&t=${Date.now()}`

  try {
    const url = new URL(currentAvatarUrl.value)
    url.searchParams.set('retry', retryCount.value.toString())
    url.searchParams.set('t', Date.now().toString())
    currentAvatarUrl.value = url.toString()
  } catch {
    currentAvatarUrl.value = fallbackUrl
  }
}

const handleImageError = async () => {
  const canRefresh = !!resolvedUserId.value && refreshAttempts.value < MAX_REFRESH_ATTEMPTS

  if (canRefresh) {
    isRetrying.value = true
    const newUrl = await refreshAvatarUrl()
    if (newUrl) {
      currentAvatarUrl.value = newUrl
      imageError.value = false
      isRetrying.value = false
      return
    }
  }

  if (retryCount.value < MAX_RETRY_ATTEMPTS && currentAvatarUrl.value) {
    retryCount.value += 1
    isRetrying.value = true

    setTimeout(() => {
      updateRetryUrl()
      isRetrying.value = false
    }, Math.pow(2, retryCount.value - 1) * 1000)

    return
  }

  imageError.value = true
  isRetrying.value = false
  emit('imageError')
}

const handleImageLoad = () => {
  imageError.value = false
  isRetrying.value = false
  retryCount.value = 0
}

const proactiveRefresh = async () => {
  if (!props.enableAutoRefresh || !currentAvatarUrl.value || !resolvedUserId.value) {
    return
  }

  if (isUrlLikelyExpired(currentAvatarUrl.value)) {
    const newUrl = await refreshAvatarUrl()
    if (newUrl) {
      currentAvatarUrl.value = newUrl
    }
  }
}

const initials = computed(() => {
  const name = resolvedUsername.value.trim()
  if (!name) return '用'

  if (/[\u4e00-\u9fff]/.test(name)) {
    return name.charAt(0)
  }

  const words = name.split(' ').filter((word) => word.length > 0)
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }

  return words.slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
})

const placeholderStyle = computed(() => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
  ]

  let hash = 0
  for (let i = 0; i < resolvedUsername.value.length; i += 1) {
    hash = resolvedUsername.value.charCodeAt(i) + ((hash << 5) - hash)
  }

  const colorIndex = Math.abs(hash) % colors.length
  return {
    backgroundColor: colors[colorIndex],
    color: '#FFFFFF'
  }
})

const handleClick = () => {
  if (props.clickable) {
    emit('click', resolvedUserId.value)
  }
}

onMounted(() => {
  initializeAvatarUrl()

  if (props.enableAutoRefresh) {
    refreshInterval = setInterval(proactiveRefresh, 30 * 60 * 1000)

    if (currentAvatarUrl.value && isUrlLikelyExpired(currentAvatarUrl.value)) {
      proactiveRefresh()
    }
  }
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
})
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
    width: 18px;
    height: 18px;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;

    .refresh-indicator__icon {
      color: #fff;
      font-size: 10px;
      line-height: 1;
      animation: avatar-spin 0.8s linear infinite;
    }
  }
}

@keyframes avatar-spin {
  to {
    transform: rotate(360deg);
  }
}

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
