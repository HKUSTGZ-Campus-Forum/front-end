<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import SearchDropdown from '~/components/ui/SearchDropdown.vue'
import UserAvatar from '~/components/user/UserAvatar.vue'

const { t } = useI18n()
const router = useRouter()
const { isLoggedIn, logout, user } = useAuth()
const { locale, availableLocales, getLocalePath, switchToLocale } = useAppLocale()
const { setTheme, isDarkTheme } = useTheme()

const props = defineProps<{
  sidebarExpanded?: boolean
}>()

const navStyle = computed(() => ({
  left: props.sidebarExpanded ? '200px' : '72px',
  transition: 'left 0.3s ease',
}))

const searchQuery = ref('')
const isLoggingOut = ref(false)

// Language dropdown
const isLocaleOpen = ref(false)
const localeMenuRef = ref<HTMLElement>()

const selectLocale = async (code: string) => {
  isLocaleOpen.value = false
  await switchToLocale(code as 'zh' | 'en')
}

const handleLocaleClickOutside = (event: Event) => {
  if (localeMenuRef.value && !localeMenuRef.value.contains(event.target as Node)) {
    isLocaleOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleLocaleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleLocaleClickOutside)
})

// Theme toggle (replicates the CoursePlan.search darkmode toggle)
const toggleTheme = () => {
  setTheme(isDarkTheme.value ? 'keguang-blue' : 'deep-dark')
}

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
        <img src="/icons/topbar_logo.svg" alt="uniKorn" class="kg-topnav__logo kg-topnav__logo--light" />
        <img src="/icons/topbar_logo_w.svg" alt="uniKorn" class="kg-topnav__logo kg-topnav__logo--dark" />
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

      <!-- Light/dark theme toggle, replicating the CoursePlan.search
           darkmode-toggle: an animated sun/moon icon (expand transition)
           next to a sliding switch. -->
      <div class="kg-topnav__theme">
        <button
          type="button"
          class="kg-topnav__theme-icon-btn"
          :class="{ 'kg-topnav__theme-icon-btn--toggled': isDarkTheme }"
          :aria-label="isDarkTheme ? t('common.theme.light') : t('common.theme.dark')"
          @click="toggleTheme"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            width="2em"
            height="2em"
            class="kg-topnav__theme-icon"
            viewBox="0 0 32 32"
          >
            <clipPath id="kg-theme-toggle-cutout">
              <path d="M0-11h25a1 1 0 0017 13v30H0Z" />
            </clipPath>
            <g clip-path="url(#kg-theme-toggle-cutout)">
              <circle cx="16" cy="16" r="8.4" />
              <path d="M18.3 3.2c0 1.3-1 2.3-2.3 2.3s-2.3-1-2.3-2.3S14.7.9 16 .9s2.3 1 2.3 2.3zm-4.6 25.6c0-1.3 1-2.3 2.3-2.3s2.3 1 2.3 2.3-1 2.3-2.3 2.3-2.3-1-2.3-2.3zm15.1-10.5c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3 2.3 1 2.3 2.3-1 2.3-2.3 2.3zM3.2 13.7c1.3 0 2.3 1 2.3 2.3s-1 2.3-2.3 2.3S.9 17.3.9 16s1-2.3 2.3-2.3zm5.8-7C9 7.9 7.9 9 6.7 9S4.4 8 4.4 6.7s1-2.3 2.3-2.3S9 5.4 9 6.7zm16.3 21c-1.3 0-2.3-1-2.3-2.3s1-2.3 2.3-2.3 2.3 1 2.3 2.3-1 2.3-2.3 2.3zm2.4-21c0 1.3-1 2.3-2.3 2.3S23 7.9 23 6.7s1-2.3 2.3-2.3 2.4 1 2.4 2.3zM6.7 23C8 23 9 24 9 25.3s-1 2.3-2.3 2.3-2.3-1-2.3-2.3 1-2.3 2.3-2.3z" />
            </g>
          </svg>
        </button>

        <button
          type="button"
          class="kg-topnav__theme-switch"
          :class="{ 'kg-topnav__theme-switch--on': isDarkTheme }"
          :aria-label="isDarkTheme ? t('common.theme.light') : t('common.theme.dark')"
          @click="toggleTheme"
        >
          <span class="kg-topnav__theme-knob" />
        </button>
      </div>

      <!-- Language dropdown -->
      <div ref="localeMenuRef" class="kg-topnav__locale">
        <button
          type="button"
          class="kg-topnav__locale-btn"
          :aria-label="t('common.locale.label')"
          :aria-expanded="isLocaleOpen"
          @click="isLocaleOpen = !isLocaleOpen"
        >
          <Icon name="lucide:globe" class="kg-topnav__locale-icon" aria-hidden="true" />
          <span>{{ locale === 'zh' ? t('common.locale.zh') : t('common.locale.en') }}</span>
          <Icon
            name="lucide:chevron-down"
            class="kg-topnav__locale-icon kg-topnav__locale-icon--chevron"
            aria-hidden="true"
          />
        </button>

        <div v-if="isLocaleOpen" class="kg-topnav__locale-menu">
          <button
            v-for="item in availableLocales"
            :key="item.code"
            type="button"
            :class="['kg-topnav__locale-option', { active: locale === item.code }]"
            @click="selectLocale(item.code)"
          >
            <span>{{ item.code === 'zh' ? t('common.locale.zh') : t('common.locale.en') }}</span>
            <Icon v-if="locale === item.code" name="lucide:check" class="kg-topnav__locale-check" aria-hidden="true" />
          </button>
        </div>
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
                <Icon name="lucide:settings" class="kg-topnav__menu-icon" aria-hidden="true" />
                <span>{{ t('layout.accountSettings') }}</span>
              </NuxtLink>
              <NuxtLink :to="getLocalePath('/setting/identity')" class="kg-topnav__menu-item">
                <Icon name="lucide:graduation-cap" class="kg-topnav__menu-icon" aria-hidden="true" />
                <span>{{ t('layout.identityVerification') }}</span>
              </NuxtLink>
              <NuxtLink :to="getLocalePath('/setting/theme')" class="kg-topnav__menu-item">
                <Icon name="lucide:palette" class="kg-topnav__menu-icon" aria-hidden="true" />
                <span>{{ t('layout.themeSettings') }}</span>
              </NuxtLink>
              <button
                type="button"
                class="kg-topnav__menu-item kg-topnav__menu-item--button"
                :disabled="isLoggingOut"
                @click="handleMenuLogout"
              >
                <Icon name="lucide:log-out" class="kg-topnav__menu-icon" aria-hidden="true" />
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
  height: 64px;
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
  display: flex;
  align-items: center;
  /* Replicates the CoursePlan header logo hover exactly: the card is taller
     than the topbar (72px in a 64px bar) so it pokes out below it, and on
     hover it lifts 4px (translate-y-1) with a soft border and tinted
     background, raised above the bar via z-index. */
  height: 72px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 2px;
  transition: all 0.2s ease-out;
  z-index: 0;

  &:hover {
    transform: translateY(4px);
    border-color: var(--border-primary);
    background: var(--surface-secondary);
    z-index: 50;
  }

  &-logo {
    height: 44px;
    width: auto;
    display: flex;
    align-items: center;

    img {
      height: 100%;
      width: auto;
      object-fit: contain;
    }
  }

  // The colored logo is unreadable on the dark topbar. Both variants are
  // rendered and toggled via the document-level data-theme attribute (set
  // before first paint by the FOUC script), so no JS/SSR flash occurs.
  .kg-topnav__logo--dark {
    display: none;
  }
}

:root[data-theme='deep-dark'] {
  .kg-topnav__logo--light {
    display: none;
  }

  .kg-topnav__logo--dark {
    display: block;
  }
}

.kg-topnav__right {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-left: auto;
}

.kg-topnav__theme {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Animated sun/moon icon. The expand transition CSS is a port of the MIT
   licensed theme-toggles "expand" variant (edent/theme-toggles) used by
   CoursePlan.search, adapted to theme CSS variables. */
.kg-topnav__theme-icon-btn {
  --kg-theme-toggle-duration: 500ms;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  /* Reset the global touch-friendly button rule (min-height: 44px,
     padding: 0.75rem 1rem) that would inflate the control. */
  min-height: 0;
  padding: 0;
  cursor: pointer;
  color: var(--interactive-primary);
  transition: color 0.3s ease;

  &:hover {
    color: var(--interactive-active);
  }

  &--toggled {
    color: var(--semantic-warning);
  }
}

.kg-topnav__theme-icon {
  display: block;
  fill: currentColor;

  g circle,
  g path {
    transform-origin: center;
    transition: transform
        calc(var(--kg-theme-toggle-duration) * 0.65)
        cubic-bezier(0, 0, 0, 1.25)
        calc(var(--kg-theme-toggle-duration) * 0.35);
  }

  :first-child path {
    transition-property: transform, d;
    transition-duration: calc(var(--kg-theme-toggle-duration) * 0.6);
    transition-timing-function: cubic-bezier(0, 0, 0.5, 1);
  }
}

.kg-topnav__theme-icon-btn--toggled .kg-topnav__theme-icon {
  g circle {
    transform: scale(1.4);
    transition-delay: 0s;
  }

  g path {
    transform: scale(0.75);
    transition-delay: 0s;
  }

  :first-child path {
    d: path('M-9 3h25a1 1 0 0017 13v30H0Z');
    transition-delay: calc(var(--kg-theme-toggle-duration) * 0.4);
    transition-timing-function: cubic-bezier(0, 0, 0, 1.25);
  }
}

@supports not (d: path('')) {
  .kg-topnav__theme-icon-btn--toggled .kg-topnav__theme-icon :first-child path {
    transform: translate3d(-9px, 14px, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .kg-topnav__theme-icon-btn * {
    transition: none !important;
  }
}

/* Sliding switch track + knob. */
.kg-topnav__theme-switch {
  position: relative;
  flex-shrink: 0;
  width: 48px;
  height: 28px;
  /* Reset the global touch-friendly button rule (min-height: 44px,
     padding: 0.75rem 1rem) that would inflate the track. */
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 999px;
  /* Visible gray track in both themes (the CoursePlan toggle uses
     gray-300 / gray-500). --border-secondary is nearly invisible on the
     light topbar, so --text-muted is used instead. */
  background: var(--text-muted);
  cursor: pointer;
  transition: background-color 0.4s ease;

  &--on {
    background: var(--interactive-primary);

    &:hover {
      background: var(--interactive-hover);
    }
  }
}

.kg-topnav__theme-knob {
  position: absolute;
  top: 4px;
  left: 0;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  /* White knob on both themes, matching the CoursePlan toggle (bg-white).
     --text-inverse is near-black in the dark theme, so it can't be reused. */
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  /* Matches the CoursePlan geometry (tailwind translate-x-1): the knob sits
     4px from the left edge. Do NOT add a left offset on top of this — the
     on-state translate must end 4px before the right edge of the 48px track. */
  transform: translateX(4px);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.kg-topnav__theme-switch--on .kg-topnav__theme-knob {
  transform: translateX(24px);
}

.kg-topnav__locale {
  position: relative;
}

.kg-topnav__locale-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  /* Reset global touch-friendly button rule (min-height: 44px). */
  min-height: 0;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-secondary);
  background: var(--surface-secondary);
  color: var(--text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover,
  &[aria-expanded='true'] {
    color: var(--interactive-active);
    border-color: var(--border-focus);
    background: var(--bg-secondary);
  }
}

.kg-topnav__locale-icon {
  font-size: 1rem;
  line-height: 1;

  &--chevron {
    font-size: 0.9rem;
  }
}

.kg-topnav__locale-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 130px;
  padding: 6px;
  border-radius: 12px;
  background: var(--surface-overlay);
  border: 1px solid var(--border-secondary);
  box-shadow: var(--modal-shadow);
  z-index: 1020;

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 20px;
    width: 12px;
    height: 12px;
    background: var(--surface-overlay);
    border-left: 1px solid var(--border-secondary);
    border-top: 1px solid var(--border-secondary);
    transform: rotate(45deg);
  }
}

.kg-topnav__locale-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  /* Reset global touch-friendly button rule (min-height: 44px). */
  min-height: 0;
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.18s ease;

  &:hover {
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  &.active {
    color: var(--interactive-active);
    font-weight: 700;
  }
}

.kg-topnav__locale-check {
  font-size: 1rem;
  color: var(--interactive-active);
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

  // Hover bridge between the avatar and the menu panel. Kept to the avatar's
  // own width (left: 0; width: 100%) so it never overlaps the neighboring
  // language control, which would open the menu when clicking there.
  &::after {
    content: '';
    position: absolute;
    top: calc(100% - 6px);
    left: 0;
    width: 100%;
    height: 12px;
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
  /* Reset global touch-friendly button rule (min-height: 44px,
     padding: 0.75rem 1rem). */
  min-height: 0;
  padding: 10px 12px;
  cursor: pointer;
  font-family: inherit;
}

.kg-topnav__menu-icon {
  font-size: 18px;
  line-height: 1;
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
