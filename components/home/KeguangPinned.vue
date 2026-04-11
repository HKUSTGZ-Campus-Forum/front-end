<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import SearchDropdown from '~/components/ui/SearchDropdown.vue'
import UserAvatar from '~/components/user/UserAvatar.vue'

const { t } = useI18n()
const router = useRouter()
const { isLoggedIn, logout, user } = useAuth()

const props = defineProps<{
  sidebarExpanded?: boolean
}>()

const navStyle = computed(() => ({
  left: props.sidebarExpanded ? '200px' : '72px',
  transition: 'left 0.3s ease',
}))

const searchQuery = ref('')

const handleSearch = (query: string) => {
  if (query.trim()) {
    router.push({ path: '/search', query: { q: query.trim() } })
  }
}

const handleLoginOrLogout = () => {
  router.push('/login')
}
</script>

<template>
  <nav class="kg-topnav" :style="navStyle">
    <a class="kg-topnav__brand" href="/">
      <div class="kg-topnav__brand-logo">
        <img src="/icons/topbar_logo.svg" alt="uniKorn" />
      </div>
    </a>

    <div class="kg-topnav__right">
      <div class="kg-topnav__search">
        <SearchDropdown
          v-model="searchQuery"
          :placeholder="t('Search for posts, users, courses...')"
          :show-history="true"
          @search="handleSearch"
        />
      </div>

      <div class="kg-topnav__user">
        <NuxtLink v-if="isLoggedIn && user" :to="`/users/${user.id}`" class="kg-topnav__avatar-link">
          <UserAvatar
            :avatar-url="user.profile_picture_url"
            :username="user.username"
            :user-id="user.id"
            size="md"
            class="topbar-user-avatar"
          />
        </NuxtLink>
        <button v-else class="login-btn-text" @click="handleLoginOrLogout">
          {{ t('login') }}
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

.kg-topnav__search {
  min-width: 280px;
  max-width: 520px;
  flex: 1;
}

.kg-topnav__user {
  position: relative;
  flex-shrink: 0;
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
}
</style>
