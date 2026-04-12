<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from '#app'

const { t } = useI18n()
const route = useRoute()
const { user, isLoggedIn } = useAuth()

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
          <NuxtLink to="/" :class="{ active: route.path === '/' }">
            <img src="/icons/sidebar_homelogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('home') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/forum" :class="{ active: route.path.startsWith('/forum') }">
            <img src="/icons/sidebar_forumlogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('forum') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/courses" :class="{ active: route.path.startsWith('/courses') }">
            <img src="/icons/sidebar_courselogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('courses') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/club" :class="{ active: route.path.startsWith('/club') }">
            <img src="/icons/sidebar_club.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('activity') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/gugu" :class="{ active: route.path.startsWith('/gugu') }">
            <img src="/icons/sidebar_gugulogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('gugu') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/matching" :class="{ active: route.path.startsWith('/matching') }">
            <img src="/icons/sidebar_matching.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('Form a team') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            v-if="isLoggedIn && user?.id"
            :to="`/users/${user.id}`"
            :class="{ active: route.path.startsWith('/users/') }"
          >
            <img src="/icons/sidebar_userlogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('users') }}</span>
          </NuxtLink>
          <NuxtLink v-else to="/login" :class="{ active: route.path === '/login' }">
            <img src="/icons/sidebar_userlogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('login') }}</span>
          </NuxtLink>
        </li>

        <li class="kg-divider" aria-hidden="true">
          <span class="kg-divider__line"></span>
        </li>

        <li>
          <NuxtLink
            to="https://scheduler.unikorn.axfff.com/dashboard/2510"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/icons/sidebar_schedulerlogo.svg" alt="" class="kg-icon" />
            <span class="kg-label">{{ t('Scheduler') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="https://wiki.hkust-gz.top" target="_blank" rel="noopener noreferrer">
            <img src="/icons/wiki-pure.svg" alt="" class="kg-icon" />
            <span class="kg-label">HKUST-GZ Wiki</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="/contest" :class="{ active: route.path.startsWith('/contest') }">
            <img src="/icons/sidebar_trophy.svg" alt="" class="kg-icon" />
            <span class="kg-label">百块奖金大赛</span>
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
  background: #283965;
  overflow: hidden;
  z-index: 1010;
  box-shadow: 2px 0 16px rgba(40, 57, 101, 0.22);
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
      border-color: rgba(255, 255, 255, 0.35);
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
  border: 2px solid rgba(255, 255, 255, 0.3);
  background: #ffffff;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s ease;
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 12px rgba(38, 164, 255, 0.5);

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
    color: rgba(255, 255, 255, 0.72);
    text-decoration: none;
    min-height: 44px;
    transition: background 0.2s ease, color 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.12);
      color: white;
    }

    &.active {
      background: rgba(38, 164, 255, 0.3);
      color: white;
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
  color: rgba(255, 255, 255, 0.8);
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
  background: rgba(255, 255, 255, 0.15);
}

@media (max-width: 768px) {
  .kg-sidebar {
    display: none;
  }
}
</style>
