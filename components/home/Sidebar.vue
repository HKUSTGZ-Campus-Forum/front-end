<script setup lang="ts">
// 导入国际化相关功能（如果需要）
import { useI18n } from "vue-i18n";
import { useRoute } from "#app"; // Use Nuxt's built-in composables
const { t } = useI18n();

const props = defineProps({
  folded: {
    type: Boolean,
    default: false,
  },
  isMobile: {
    type: Boolean,
    default: false,
  },
  showOnMobile: {
    type: Boolean,
    default: false,
  },
});

const { user, isLoggedIn } = useAuth();
const { fetchWithAuth } = useApi();

const route = useRoute();

const currentUserId = computed(() => {
  // console.log("🔍 当前用户状态:", isLoggedIn.value, user.value);

  if (!isLoggedIn.value || !user.value) {
    // console.log("⚠️ 用户未登录");
    return 2; // 默认值
  }

  const userId = user.value.id;
  // console.log("👤 用户ID:", userId);

  // 🔥 修复：不在 computed 中进行异步操作
  return userId && Number(userId) !== 0 ? userId : 1;
});

// 使用fetchWithAuth请求用户数据
// const fetchUserData = async (userId: string | number) => {
//   try {
//     const response = await fetchWithAuth(`/api/users/${userId}`);
//     console.log("👤 用户数据:", response);
//     return response;
//   } catch (error) {
//     console.error("❌ 获取用户数据失败:", error);
//     throw error;
//   }
// };

// 添加emit用于通知父组件状态变化
const emit = defineEmits(["update:folded", "close-mobile"]);

// 本地状态，用于处理悬停效果
const isHovered = ref(false);

function handleMouseEnter() {
  // Only handle hover on desktop
  if (!props.isMobile && props.folded) {
    isHovered.value = true;
    emit("update:folded", false); // 直接发射展开事件
  }
}

function handleMouseLeave() {
  // Only handle hover on desktop
  if (!props.isMobile && !props.folded) {
    isHovered.value = false;
    emit("update:folded", true); // 直接发射折叠事件
  }
}

// Handle mobile navigation clicks
function handleNavClick() {
  if (props.isMobile) {
    emit("close-mobile");
  }
}

// 监控悬停状态变化
watch(isHovered, (newValue: boolean) => {
  // 只在折叠状态下才触发展开
  if (props.folded) {
    emit("update:folded", !newValue);
  }
});
</script>

<template>
  <div
    class="sidebar"
    :class="{
      collapsed: folded && !props.isMobile,
      'mobile-sidebar': props.isMobile,
      'mobile-visible': props.isMobile && props.showOnMobile,
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="sidebar-content">
      <div class="sidebar-header">
        <div class="uniKonwn-logo">
          <img src="/image/uniKorn.png" alt="uniKonwn" />
        </div>
      </div>
      <ul class="nav-items">
        <li>
          <NuxtLink
            to="/"
            :class="{ active: route.path === '/' }"
            @click="handleNavClick"
          >
            <img src="/icons/sidebar_homelogo.svg" alt="首页" class="nav-icon" />
            <span class="nav-text">{{ t('home') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/forum"
            :class="{ active: route.path.startsWith('/forum') }"
            @click="handleNavClick"
          >
            <img src="/icons/sidebar_forumlogo.svg" alt="论坛" class="nav-icon" />
            <span class="nav-text">{{ t('forum') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/courses"
            :class="{ active: route.path.startsWith('/courses') }"
            @click="handleNavClick"
          >
            <img src="/icons/sidebar_courselogo.svg" alt="课程" class="nav-icon" />
            <span class="nav-text">{{ t('courses') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/club"
            :class="{ active: route.path.startsWith('/club') }"
            @click="handleNavClick"
          >
            <img src="/icons/sidebar_club.svg" alt="活动" class="nav-icon" />
            <span class="nav-text">{{ t('activity') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/gugu"
            :class="{ active: route.path.startsWith('/gugu') }"
            @click="handleNavClick"
          >
            <img src="/icons/sidebar_gugulogo.svg" alt="咕咕" class="nav-icon" />
            <span class="nav-text">{{ t('gugu') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/matching"
            :class="{ active: route.path.startsWith('/matching') }"
            @click="handleNavClick"
          >
            <img src="/icons/sidebar_matching.svg" alt="组队" class="nav-icon" />
            <span class="nav-text">{{ t('Form a team') }}</span>
          </NuxtLink>
        </li>
        <li>
          <!-- Show user profile link only when logged in -->
          <NuxtLink
            v-if="isLoggedIn && user?.id"
            :to="`/users/${user.id}`"
            :class="{ active: route.path.startsWith('/users/') }"
            @click="handleNavClick"
          >
            <img src="/icons/sidebar_userlogo.svg" alt="用户" class="nav-icon" />
            <span class="nav-text">{{ t('users') }}</span>
          </NuxtLink>
          <!-- Show login link when not logged in -->
          <NuxtLink
            v-else
            to="/login"
            :class="{ active: route.path === '/login' }"
            @click="handleNavClick"
          >
            <img src="/icons/sidebar_userlogo.svg" alt="登录" class="nav-icon" />
            <span class="nav-text">{{ t('login') }}</span>
          </NuxtLink>
        </li>
        <!-- External Links Divider -->
        <li class="nav-divider">
          <hr class="nav-separator" />
        </li>
        <li>
          <NuxtLink to="https://scheduler.unikorn.axfff.com/dashboard/2510" target="_blank" rel="noopener noreferrer">
            <img src="/icons/sidebar_schedulerlogo.svg" alt="课程表" class="nav-icon" />
            <span class="nav-text">{{ t('Scheduler') }}</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink to="https://wiki.hkust-gz.top" target="_blank" rel="noopener noreferrer">
<!--            <span class="nav-icon">📚</span>-->
            <img src="/icons/wiki-pure.svg" alt="登录" class="nav-icon" />
            <span class="nav-text">HKUST-GZ Wiki</span>
          </NuxtLink>
        </li>
        <li>
          <NuxtLink
            to="/contest"
            :class="{ active: route.path.startsWith('/contest') }"
            @click="handleNavClick"
          >
            <span class="nav-icon contest-icon">🏆</span>
            <span class="nav-text">百块奖金大赛</span>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-header {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
  height: 120px; /* Reserve space for logo expansion */
  position: relative; /* For absolute positioning of logo */
}

.uniKonwn-logo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--border-secondary);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    //filter: var(--logo-filter);
  }

  &:hover {
    img {
      transform: scale(1.12) rotate(360deg);
    }
    border-color: var(--border-focus);
    box-shadow: 0 0 20px var(--interactive-primary);
  }
}

// 侧边栏折叠时的logo样式
.sidebar.collapsed .uniKonwn-logo {
  width: 50px;
  height: 50px;
  transform: translate(-50%, -50%);

  img {
    transform: none;
  }
}

.sidebar {
  box-shadow: var(--sidebar-shadow);
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 200px;
  background: var(--sidebar-bg);
  backdrop-filter: var(--sidebar-backdrop);
  color: var(--text-primary);
  transition: all 0.3s ease;
  z-index: 1010;
  padding: 0;

  &.collapsed {
    width: 100px;

    .nav-items .nav-text {
      display: none;
    }

    .nav-items a {
      text-align: center;
      justify-content: center;

      .nav-icon {
        margin-right: 0;
      }
    }
  }

  // Mobile-specific styles
  &.mobile-sidebar {
    transform: translateX(-100%);
    width: 250px;
    z-index: 1015; // Above mobile overlay

    &.mobile-visible {
      transform: translateX(0);
    }
  }

  .sidebar-content {
    padding: 1rem;
  }

  .nav-items {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0 0;
    position: relative;

    li {
      margin-bottom: 0.5rem;
      position: relative;
      z-index: 1;
    }

    a {
      color: var(--text-secondary);
      text-decoration: none;
      display: flex;
      align-items: center;
      padding: 0.75rem 0.5rem;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      margin-left: -10px;
      transition: all 0.3s ease;
      position: relative;
      min-height: 44px; // Touch-friendly minimum height

      .nav-icon {
        font-size: 18px;
        margin-right: 0.75rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        transition: all 0.3s ease;
        
        svg {
          width: 100%;
          height: 100%;
        }
      }

      .contest-icon {
        font-size: 20px;
      }

      .nav-text {
        flex: 1;
        white-space: nowrap;
      }

      &:hover {
        background-color: var(--interactive-secondary);
        color: var(--text-primary);
      }

      &.active {
        background-color: var(--interactive-hover) !important;
        color: var(--text-inverse) !important;
        font-weight: 600;

        &::before {
          content: "";
          position: absolute;
          left: -10px;
          top: 0;
          height: 100%;
          width: 4px;
          background-color: var(--interactive-primary);
          border-radius: 0 2px 2px 0;
        }
      }
    }

    // Navigation divider styles
    .nav-divider {
      margin: 1rem 0;
      padding: 0;

      .nav-separator {
        border: none;
        height: 1px;
        background: var(--border-primary);
        opacity: 0.6;
        margin: 0;
        transition: background var(--transition-normal);
      }
    }
  }
}

// Mobile responsive styles
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    width: 280px;
    z-index: 1015;

    &.mobile-visible {
      transform: translateX(0);
    }

    .sidebar-content {
      padding: 1.5rem 1rem;
    }

    .nav-items a {
      padding: 1rem 0.75rem;
      font-size: 17px;
      min-height: 48px; // Larger touch targets on mobile

      .nav-icon {
        font-size: 20px;
        margin-right: 1rem;
      }
    }
  }
}

// Small mobile devices
@media (max-width: 480px) {
  .sidebar {
    width: 260px;

    .nav-items a {
      padding: 0.875rem 0.5rem;
      font-size: 16px;
    }
  }
}

// Tablet adjustments
@media (max-width: 1024px) and (min-width: 769px) {
  .sidebar {
    &.collapsed {
      width: 80px;
    }
  }
}
</style>
