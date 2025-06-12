<script setup lang="ts">
// 导入国际化相关功能（如果需要）
import { useI18n } from "vue-i18n";
import { useRoute } from '#app';  // Use Nuxt's built-in composables
const { t } = useI18n();

const props = defineProps({
  folded: {
    type: Boolean,
    default: false,
  },
  mobileOpen: {
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
const emit = defineEmits(["update:folded", "update:mobileOpen", "close-mobile"]);

// 本地状态，用于处理悬停效果和移动设备检测
const isHovered = ref(false);
const isMobile = ref(false);

// 检测移动设备
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

// 处理窗口大小变化
const handleResize = () => {
  checkMobile();
  // 在桌面模式下关闭移动菜单
  if (!isMobile.value && props.mobileOpen) {
    emit('update:mobileOpen', false);
  }
};

// 关闭移动菜单
const closeMobile = () => {
  emit('close-mobile');
};

// 处理移动设备上的点击事件
const handleMobileClick = (event: Event) => {
  if (isMobile.value) {
    event.stopPropagation();
  }
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

function handleMouseEnter() {
  // 只在桌面设备上处理悬停
  if (!isMobile.value && props.folded) {
    isHovered.value = true;
    emit("update:folded", false);
  }
}

function handleMouseLeave() {
  // 只在桌面设备上处理悬停
  if (!isMobile.value && !props.folded) {
    isHovered.value = false;
    emit("update:folded", true);
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
  <!-- Mobile overlay -->
  <div 
    v-if="isMobile && mobileOpen" 
    class="mobile-overlay"
    @click="closeMobile"
  ></div>
  
  <div
    class="sidebar"
    :class="{ 
      collapsed: folded && !isMobile, 
      'mobile-open': isMobile && mobileOpen,
      'mobile-closed': isMobile && !mobileOpen
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleMobileClick"
  >
    <div class="sidebar-content">
      <div class="sidebar-header">
        <div class="uniKonwn-logo">
          <img src="/public/image/uniKorn.jpg" alt="uniKonwn" />
        </div>
      </div>
      <ul class="nav-items">
        <li>
          <NuxtLink 
            to="/" 
            :class="{ active: route.path === '/' }"
            @click="isMobile ? closeMobile() : undefined"
          >首页</NuxtLink>
        </li>
        <li>
          <NuxtLink 
            to="/forum" 
            :class="{ active: route.path.startsWith('/forum') }"
            @click="isMobile ? closeMobile() : undefined"
          >论坛</NuxtLink>
        </li>
        <li>
          <NuxtLink 
            to="/courses" 
            :class="{ active: route.path.startsWith('/courses') }"
            @click="isMobile ? closeMobile() : undefined"
          >课程</NuxtLink>
        </li>
        <li>
          <!-- Show user profile link only when logged in -->
          <NuxtLink 
            v-if="isLoggedIn && user?.id"
            :to="`/users/${user.id}`"
            :class="{ active: route.path.startsWith('/users/') }"
            @click="isMobile ? closeMobile() : undefined"
          >用户</NuxtLink>
          <!-- Show login link when not logged in -->
          <NuxtLink 
            v-else
            to="/login"
            :class="{ active: route.path === '/login' }"
            @click="isMobile ? closeMobile() : undefined"
          >登录</NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
// Mobile overlay
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: var(--z-overlay);
  transition: opacity var(--transition-normal) ease;
}

.sidebar-header {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
  height: 120px;
  position: relative;
  
  @media (max-width: 768px) {
    height: 100px;
    padding: 0.75rem 0;
  }
}

.uniKonwn-logo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.2);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
  transition: all var(--transition-slow) cubic-bezier(0.4, 0, 0.2, 1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-slow) cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover {
    img {
      transform: scale(1.12) rotate(360deg);
    }
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
  }
  
  @media (max-width: 768px) {
    width: 60px;
    height: 60px;
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
  
  @media (max-width: 768px) {
    width: 60px;
    height: 60px;
  }
}

.sidebar {
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: var(--sidebar-width-expanded);
  background-color: #677d94;
  color: white;
  transition: all var(--transition-normal) ease;
  z-index: var(--z-header);
  padding: 0;

  // Desktop collapsed state
  &.collapsed {
    width: var(--sidebar-width-collapsed);

    .nav-items span {
      display: none;
    }
  }

  // Mobile states
  @media (max-width: 768px) {
    width: var(--sidebar-width-mobile);
    z-index: var(--z-sidebar-mobile);
    transform: translateX(-100%);
    transition: transform var(--transition-normal) ease;

    &.mobile-open {
      transform: translateX(0);
    }

    &.mobile-closed {
      transform: translateX(-100%);
    }

    // Override collapsed state on mobile
    &.collapsed {
      width: var(--sidebar-width-mobile);
    }
  }

  .sidebar-content {
    padding: 1rem;
    
    @media (max-width: 768px) {
      padding: var(--mobile-padding);
    }
  }

  .nav-items {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0 0;
    position: relative;

    li {
      margin-bottom: var(--mobile-margin);
      position: relative;
      z-index: 1;
      
      @media (max-width: 768px) {
        margin-bottom: 0.75rem;
      }
    }

    a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      display: block;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 500;
      margin-left: -10px;
      transition: all var(--transition-normal) ease;
      position: relative;
      min-height: var(--touch-target-min);
      display: flex;
      align-items: center;

      @media (max-width: 768px) {
        padding: 1rem;
        font-size: 18px;
        min-height: var(--touch-target-comfortable);
        margin-left: 0;
        border-radius: 8px;
      }

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
        transform: translateX(2px);
      }

      &:active {
        transform: translateX(1px) scale(0.98);
      }

      &.active {
        background-color: rgba(255, 255, 255, 0.15) !important;
        color: white !important;
        font-weight: 600;
        
        &::before {
          content: '';
          position: absolute;
          left: -10px;
          top: 0;
          height: 100%;
          width: 4px;
          background-color: white;
          border-radius: 0 2px 2px 0;
          
          @media (max-width: 768px) {
            left: 0;
            width: 6px;
            border-radius: 0 3px 3px 0;
          }
        }
      }
    }
  }
}
</style>
