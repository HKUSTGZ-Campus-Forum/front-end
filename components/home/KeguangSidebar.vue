<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from '#app'

const { t } = useI18n()
const route = useRoute()
const { user, isLoggedIn } = useAuth()
const { getLocalePath } = useAppLocale()

const emit = defineEmits<{ (e: 'update:expanded', value: boolean): void }>()

const isExpanded = ref(false)

function onMouseEnter() {
  isExpanded.value = true
  emit('update:expanded', true)
}

function onMouseLeave() {
  isExpanded.value = false
  emit('update:expanded', false)
}

function isActive(path: string) {
  const localizedPath = getLocalePath(path)
  if (path === '/') return route.path === localizedPath
  return route.path.startsWith(localizedPath)
}

function isCourseActive() {
  return ['/courses', '/schedule', '/academic-map'].some(path => isActive(path))
}
</script>

<template>
  <div
    class="kg-sidebar"
    :class="{ 'kg-sidebar--expanded': isExpanded }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="kg-sidebar__content">
      <div class="kg-sidebar__header">
        <div class="kg-sidebar__logo">
          <img src="/image/uniKorn.png" alt="uniKorn" />
        </div>
      </div>

      <ul class="kg-sidebar__nav">
        <li>
          <NuxtLink :to="getLocalePath('/')" :class="{ active: isActive('/') }">
            <img src="/icons/sidebar_homelogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('nav.home') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            :to="getLocalePath('/forum')"
            :class="{ active: isActive('/forum') || isActive('/feedback') || isActive('/club') }"
          >
            <img src="/icons/sidebar_forumlogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('nav.community') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="getLocalePath('/courses')" :class="{ active: isCourseActive() }">
            <img src="/icons/sidebar_courselogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('nav.courses') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="getLocalePath('/matching')" :class="{ active: isActive('/matching') }">
            <img src="/icons/sidebar_matching.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('nav.teamMatching') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            v-if="isLoggedIn && user?.id"
            :to="getLocalePath(`/users/${user.id}`)"
            :class="{ active: isActive('/users') }"
          >
            <img src="/icons/sidebar_userlogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('nav.users') }}</span>
          </NuxtLink>
          <NuxtLink v-else :to="getLocalePath('/login')" :class="{ active: isActive('/login') }">
            <img src="/icons/sidebar_userlogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('actions.login') }}</span>
          </NuxtLink>
        </li>
        <li v-if="isLoggedIn && user?.role_name === 'admin'">
          <NuxtLink :to="getLocalePath('/admin')" :class="{ active: isActive('/admin') }">
            <img src="/icons/sidebar_userlogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('nav.admin') }}</span>
          </NuxtLink>
        </li>

        <li class="kg-divider" aria-hidden="true">
          <span class="kg-divider__line"></span>
        </li>

        <li>
          <NuxtLink to="https://wiki.hkust-gz.top" target="_blank" rel="noopener noreferrer">
            <img src="/icons/wiki-pure.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('nav.wiki') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="getLocalePath('/contest')" :class="{ active: isActive('/contest') }">
            <img src="/icons/sidebar_trophy.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('nav.contest') }}</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 72px;
  background: var(--sidebar-bg);
  overflow: hidden;
  z-index: 1010;
  box-shadow: var(--sidebar-shadow);
  transition: width 0.3s ease;

  &--expanded {
    width: 200px;

    .kg-sidebar__header {
      height: 100px;
    }

    .kg-sidebar__logo {
      width: 60px;
      height: 60px;
      left: 50%;
      border-color: color-mix(in srgb, var(--overlay-text) 35%, transparent);
    }

    .kg-label {
      opacity: 1;
      max-width: 150px;
      margin-left: 0.75rem;
    }
  }
}

.kg-sidebar__content {
  padding: 0.5rem 0.5rem 1rem;
}

.kg-sidebar__header {
  position: relative;
  height: 80px;
  transition: height 0.3s ease;
}

.kg-sidebar__logo {
  position: absolute;
  top: 50%;
  left: 28px;
  transform: translate(-50%, -50%);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--overlay-text) 30%, transparent);
  background: var(--overlay-text);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  &:hover {
    border-color: color-mix(in srgb, var(--overlay-text) 60%, transparent);
    box-shadow: 0 0 12px color-mix(in srgb, var(--interactive-primary) 50%, transparent);

    img {
      transform: scale(1.12);
    }
  }
}

.kg-sidebar__nav {
  list-style: none;
  padding: 0;
  margin: 0.25rem 0 0;

  li {
    margin-bottom: 0.2rem;
  }

  a {
    display: flex;
    align-items: center;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
    color: var(--overlay-text-secondary);
    text-decoration: none;
    min-height: 44px;
    transition: background 0.2s ease, color 0.2s ease;

    &:hover {
      background: color-mix(in srgb, var(--overlay-text) 12%, transparent);
      color: var(--overlay-text);
    }

    &.active {
      background: color-mix(in srgb, var(--interactive-primary) 30%, transparent);
      color: var(--overlay-text);
    }
  }
}

img.kg-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  filter: brightness(0) invert(1);
}

.kg-icon--emoji {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.kg-label {
  flex: none;
  min-width: 0;
  white-space: nowrap;
  font-size: 0.9rem;
  color: var(--overlay-text-secondary);
  opacity: 0;
  max-width: 0;
  margin-left: 0;
  overflow: hidden;
  transition: opacity 0.25s ease, max-width 0.25s ease, margin-left 0.25s ease;
}

.kg-divider {
  margin: 0.75rem 0;
  padding: 0;
}

.kg-divider__line {
  display: block;
  height: 1px;
  background: color-mix(in srgb, var(--overlay-text) 15%, transparent);
}

@media (max-width: 768px) {
  .kg-sidebar {
    display: none;
  }
}
</style>
