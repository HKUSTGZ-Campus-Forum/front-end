<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import SearchDropdown from '~/components/ui/SearchDropdown.vue'
import UserAvatar from '~/components/user/UserAvatar.vue'

const { t } = useI18n()
const router = useRouter()
const { isLoggedIn, logout, user } = useAuth()
const { locale, availableLocales, getLocalePath, switchToLocale } = useAppLocale()

const props = defineProps<{
  sidebarExpanded?: boolean
}>()

const navStyle = computed(() => ({
  left: props.sidebarExpanded ? '200px' : '72px',
  transition: 'left 0.3s ease',
}))

const searchQuery = ref('')
const isLoggingOut = ref(false)

const handleSearch = (query: string) => {
  if (query.trim()) {
    router.push({ path: getLocalePath('/search'), query: { q: query.trim() } })
  }
}

const handleLoginOrLogout = () => {
  navigateTo(getLocalePath('/login'))
}

const handleMenuLogout = async () => {
  if (isLoggingOut.value) return
  isLoggingOut.value = true
  try {
    await logout()
  } catch {
    // logout already handles cleanup and redirect
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <nav class="kg-topnav" :style="navStyle">
    <NuxtLink class="kg-topnav__brand" :to="getLocalePath('/')">
      <div class="kg-topnav__brand-logo">
        <img src="/icons/topbar_logo.svg" alt="uniKorn" />
      </div>
    </NuxtLink>

    <div class="kg-topnav__right">
      <div class="kg-topnav__search">
        <SearchDropdown
          v-model="searchQuery"
          :placeholder="t('search.placeholder')"
          :show-history="true"
          @search="handleSearch"
        />
      </div>

      <div class="kg-topnav__locale-switch">
        <button
          v-for="item in availableLocales"
          :key="item.code"
          type="button"
          :class="['kg-topnav__locale-btn', { active: locale === item.code }]"
          @click="switchToLocale(item.code)"
        >
          {{ item.code === 'zh' ? t('common.locale.zh') : t('common.locale.en') }}
        </button>
      </div>

      <div class="kg-topnav__user">
        <div v-if="isLoggedIn && user" class="kg-topnav__user-menu">
          <NuxtLink :to="getLocalePath(`/users/${user.id}`)" class="kg-topnav__avatar-link">
            <UserAvatar
              :avatar-url="user.profile_picture_url"
              :username="user.username"
              :user-id="user.id"
              size="md"
              class="topbar-user-avatar"
            />
          </NuxtLink>

          <div class="kg-topnav__menu-panel">
            <div class="kg-topnav__menu-header">
              <span class="kg-topnav__menu-name">{{ user.username }}</span>
              <span class="kg-topnav__menu-subtitle">{{ t('layout.accountCenter') }}</span>
            </div>

            <div class="kg-topnav__menu-list">
              <NuxtLink :to="getLocalePath('/setting/account')" class="kg-topnav__menu-item">
                <ForumUiIcon name="settings" class="kg-topnav__menu-icon" />
                <span>{{ t('layout.accountSettings') }}</span>
              </NuxtLink>
              <NuxtLink :to="getLocalePath('/setting/identity')" class="kg-topnav__menu-item">
                <ForumUiIcon name="academic-cap" class="kg-topnav__menu-icon" />
                <span>{{ t('layout.identityVerification') }}</span>
              </NuxtLink>
              <NuxtLink :to="getLocalePath('/setting/theme')" class="kg-topnav__menu-item">
                <ForumUiIcon name="palette" class="kg-topnav__menu-icon" />
                <span>{{ t('layout.themeSettings') }}</span>
              </NuxtLink>
              <button
                type="button"
                class="kg-topnav__menu-item kg-topnav__menu-item--button"
                :disabled="isLoggingOut"
                @click="handleMenuLogout"
              >
                <ForumUiIcon name="logout" class="kg-topnav__menu-icon" />
                <span>{{ isLoggingOut ? t('layout.loggingOut') : t('actions.logout') }}</span>
              </button>
            </div>
          </div>
        </div>
        <button type="button" v-else class="login-btn-text" @click="handleLoginOrLogout">
          {{ t('actions.login') }}
        </button>
      </div>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.kg-topnav {
  position: fixed;
  top: 0;
  right: 0;
  height: 84px;
  background: var(--surface-primary);
  box-shadow: var(--topbar-shadow);
  display: flex;
  align-items: center;
  padding: 0 32px 0 28px;
  z-index: 1009;
  gap: 1.5rem;
}

.kg-topnav__brand {
  text-decoration: none;
  flex-shrink: 0;

  &-logo {
    height: 56px;
    width: auto;
    display: flex;
    align-items: center;

    img {
      height: 100%;
      width: auto;
      object-fit: contain;
    }
  }
}

.kg-topnav__right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-left: auto;
}

.kg-topnav__locale-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kg-topnav__locale-btn {
  min-width: 48px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid var(--border-secondary);
  background: var(--surface-secondary);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active,
  &:hover {
    color: var(--interactive-active);
    border-color: var(--border-focus);
    background: var(--bg-secondary);
  }
}

.kg-topnav__search {
  min-width: 280px;
  max-width: 520px;
  flex: 1;
}

.kg-topnav__user {
  position: relative;
  flex-shrink: 0;
}

.kg-topnav__user-menu {
  position: relative;
  padding: 8px 0;

  &::after {
    content: '';
    position: absolute;
    top: calc(100% - 6px);
    right: 0;
    width: 240px;
    height: 18px;
  }

  &:hover,
  &:focus-within {
    .kg-topnav__menu-panel {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: auto;
    }
  }
}

.kg-topnav__avatar-link {
  display: flex;
  align-items: center;
  text-decoration: none;

  .topbar-user-avatar {
    border: 2px solid var(--border-primary);
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s;

    &:hover {
      transform: scale(1.08);
      border-color: var(--interactive-primary);
    }
  }
}

.kg-topnav__menu-panel {
  position: absolute;
  top: calc(100% + 1px);
  right: 0;
  min-width: 220px;
  padding: 12px;
  border-radius: 16px;
  background: var(--surface-overlay);
  border: 1px solid var(--border-secondary);
  box-shadow: var(--modal-shadow);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-6px);
  transition: opacity 0.18s ease, transform 0.18s ease, visibility 0.18s ease;
  pointer-events: none;
  z-index: 1020;

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 18px;
    width: 12px;
    height: 12px;
    background: var(--surface-overlay);
    border-left: 1px solid var(--border-secondary);
    border-top: 1px solid var(--border-secondary);
    transform: rotate(45deg);
  }
}

.kg-topnav__menu-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--border-secondary);
}

.kg-topnav__menu-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
}

.kg-topnav__menu-subtitle {
  font-size: 0.76rem;
  color: var(--text-muted);
}

.kg-topnav__menu-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.kg-topnav__menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-primary);
  font-size: 0.87rem;
  font-weight: 500;
  background: var(--surface-secondary);
  border: 1px solid transparent;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border-primary);
    transform: translateX(2px);
  }
}

.kg-topnav__menu-item--button {
  cursor: pointer;
  font: inherit;
}

.kg-topnav__menu-icon {
  width: 18px;
  height: 18px;
  color: currentColor;
  flex-shrink: 0;
}

.login-btn-text {
  background: var(--interactive-secondary);
  border: 1px solid var(--interactive-primary);
  border-radius: 20px;
  padding: 0.375rem 0.75rem;
  min-height: 36px;
  display: flex;
  align-items: center;
  color: var(--text-primary);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: var(--interactive-primary);
    color: var(--text-inverse);
  }
}

@media (max-width: 768px) {
  .kg-topnav {
    left: 0 !important;
    height: 64px;
    padding: 0 16px;
  }

  .kg-topnav__search {
    min-width: 120px;
  }

  .kg-topnav__menu-panel {
    right: -8px;
    min-width: 200px;
  }
}
</style>
