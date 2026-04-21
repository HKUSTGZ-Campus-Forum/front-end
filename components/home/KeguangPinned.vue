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
                <span class="kg-topnav__menu-icon">⚙️</span>
                <span>{{ t('layout.accountSettings') }}</span>
              </NuxtLink>
              <NuxtLink :to="getLocalePath('/setting/identity')" class="kg-topnav__menu-item">
                <span class="kg-topnav__menu-icon">🎓</span>
                <span>{{ t('layout.identityVerification') }}</span>
              </NuxtLink>
              <NuxtLink :to="getLocalePath('/setting/theme')" class="kg-topnav__menu-item">
                <span class="kg-topnav__menu-icon">🎨</span>
                <span>{{ t('layout.themeSettings') }}</span>
              </NuxtLink>
              <button
                type="button"
                class="kg-topnav__menu-item kg-topnav__menu-item--button"
                :disabled="isLoggingOut"
                @click="handleMenuLogout"
              >
                <span class="kg-topnav__menu-icon">🚪</span>
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
  background: #FFFFFF;
  box-shadow: 0 1px 4px rgba(40, 57, 101, 0.08);
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
  border: 1px solid #d7e7fb;
  background: #f5fbfe;
  color: #4a6080;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &.active,
  &:hover {
    color: #1178c8;
    border-color: #90cfff;
    background: #e6f4ff;
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
    border: 2px solid #c8dff8;
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s;

    &:hover {
      transform: scale(1.08);
      border-color: #26a4ff;
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
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #dbe9fb;
  box-shadow: 0 18px 40px rgba(40, 57, 101, 0.16);
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
    background: rgba(255, 255, 255, 0.98);
    border-left: 1px solid #dbe9fb;
    border-top: 1px solid #dbe9fb;
    transform: rotate(45deg);
  }
}

.kg-topnav__menu-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px 10px;
  margin-bottom: 8px;
  border-bottom: 1px solid #edf4ff;
}

.kg-topnav__menu-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: #1a2a4a;
}

.kg-topnav__menu-subtitle {
  font-size: 0.76rem;
  color: #8ca0bb;
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
  color: #294066;
  font-size: 0.87rem;
  font-weight: 500;
  background: #f6fbff;
  border: 1px solid transparent;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;

  &:hover {
    background: #eef6ff;
    border-color: #d6e7ff;
    transform: translateX(2px);
  }
}

.kg-topnav__menu-item--button {
  cursor: pointer;
  font: inherit;
}

.kg-topnav__menu-icon {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.login-btn-text {
  background: #bfd7fb;
  border: 1px solid #26a4ff;
  border-radius: 20px;
  padding: 0.375rem 0.75rem;
  min-height: 36px;
  display: flex;
  align-items: center;
  color: #1a2a4a;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: #26a4ff;
    color: white;
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
