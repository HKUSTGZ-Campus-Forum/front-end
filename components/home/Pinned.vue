<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { useAuth } from "~/composables/useAuth"
import { useRouter } from "vue-router"
import SearchDropdown from "~/components/ui/SearchDropdown.vue"

const router = useRouter();

const { t } = useI18n();
const { isLoggedIn, logout, user } = useAuth(); // 获取登录状态和用户信息
// 定义组件属性，允许自定义
const props = defineProps({
  brandName: {
    type: String,
    default: "uniKorn",
  },
  showSearch: {
    type: Boolean,
    default: true,
  },
  // 添加用户头像URL属性（作为fallback）
  userAvatar: {
    type: String,
    default: "/image/testpic1.jpg",
  },
  // 添加用户名属性（作为fallback）
  username: {
    type: String,
    default: "测试",
  },
  // 添加侧边栏折叠状态属性
  sidebarFolded: {
    type: Boolean,
    default: false,
  },
  // Mobile state
  isMobile: {
    type: Boolean,
    default: false,
  },
});

// 处理侧边栏切换
const emit = defineEmits(["toggle-sidebar"]);
const toggleSidebar = () => {
  emit("toggle-sidebar");
};

const handleLoginOrLogout = async () => {
  if (isLoggedIn.value) {
    // 如果已登录，执行登出
    await logout();
    router.push("/");
  } else {
    // 如果未登录，跳转到登录页
    router.push("/login");
  }
};

// Search functionality
const searchQuery = ref("")

const handleSearch = (query: string) => {
  if (query.trim()) {
    router.push({
      path: "/search",
      query: { q: query.trim() }
    })
  }
}

const handleSearchSelect = (type: string, item: any) => {
  console.log("Search item selected:", type, item)
  // The SearchDropdown component handles navigation automatically
}
</script>

<template>
  <nav class="top-nav" :class="{ 'mobile-nav': isMobile }">
    <!-- Mobile hamburger menu -->
    <button class="mobile-menu-btn" v-if="isMobile" @click="toggleSidebar">
      <span class="hamburger-icon">☰</span>
    </button>

    <!-- 品牌/Logo -->
    <a class="brand" :class="{ 
      'sidebar-expanded': !sidebarFolded && !isMobile,
      'mobile-brand': isMobile 
    }" href="/">
      {{ brandName }}
    </a>

    <!-- Desktop sidebar toggle -->
    <button class="sidebar-toggle" v-if="!isMobile" @click="toggleSidebar">
      <span class="toggle-icon">☰</span>
    </button>

    <!-- 右侧功能区 -->
    <div class="right-section">
      <!-- 搜索框 -->
      <div v-if="showSearch" class="search-form">
        <SearchDropdown
          v-model="searchQuery"
          placeholder="搜索帖子、用户、课程..."
          :show-history="true"
          @search="handleSearch"
          @select="handleSearchSelect"
        />
      </div>

      <!-- 用户下拉菜单 -->
      <div class="user-menu">
        <div class="dropdown">
          <a class="dropdown-toggle" href="#" role="button">
            <!-- Logged in with avatar -->
            <div v-if="isLoggedIn && user?.profile_picture_url" class="user-avatar">
              <img :src="user.profile_picture_url" :alt="user.username" />
            </div>
            <!-- Logged in without avatar -->
            <span v-else-if="isLoggedIn" class="user-icon-fallback">👤</span>
            <!-- Not logged in - show login button -->
            <div v-else class="login-button" :class="{ 'mobile-login': isMobile }">
              <span class="login-text">登录</span>
            </div>
          </a>
          <ul class="dropdown-menu">
            <!-- Logged in user menu -->
            <template v-if="isLoggedIn">
              <li class="dropdown-header" v-if="user?.username">{{ user.username }}</li>
              <li class="dropdown-header" v-else>用户</li>
              <li>
                <NuxtLink class="dropdown-item" to="/activity">活动日志</NuxtLink>
              </li>
              <li>
                <NuxtLink class="dropdown-item" to="/setting/background">设置</NuxtLink>
              </li>
              <li><hr class="divider" /></li>
              <li>
                <a class="dropdown-item" href="#" @click.prevent="handleLoginOrLogout">
                  退出登录
                </a>
              </li>
            </template>
            <!-- Guest user menu -->
            <template v-else>
              <li class="dropdown-header">访客用户</li>
              <li>
                <a class="dropdown-item" href="#" @click.prevent="handleLoginOrLogout">
                  登录
                </a>
              </li>
              <li>
                <NuxtLink class="dropdown-item" to="/register">注册</NuxtLink>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.top-nav {
  box-shadow: var(--topbar-shadow);
  display: flex;
  align-items: center;
  background: var(--topbar-bg);
  backdrop-filter: var(--topbar-backdrop);
  padding: 0.5rem 1rem;
  color: var(--text-primary);
  height: 70px;
  width: 100%;
  position: fixed;
  z-index: 1010;
  top: 0;
  left: 0;
  
  &.mobile-nav {
    height: 60px;
    padding: 0.25rem 0.75rem;
  }
}

.mobile-menu-btn {
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1.125rem;
  margin-right: 0.75rem;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;

  .hamburger-icon {
    font-size: 1.25rem;
    line-height: 1;
  }

  &:hover {
    background-color: var(--interactive-secondary);
  }

  &:active {
    background-color: var(--interactive-hover);
  }
}

.brand {
  font-size: 1.25rem;
  text-decoration: none;
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  margin-right: 1rem;
  white-space: nowrap;
  margin-left: 170px;
  transition: margin-left 0.3s ease;

  &.sidebar-expanded {
    margin-left: 180px;
  }

  &:not(.sidebar-expanded) {
    margin-left: 80px;
  }
  
  &.mobile-brand {
    margin-left: 0;
    padding: 0.5rem;
    font-size: 1.125rem;
    flex: 1;
  }

  &:hover {
    color: var(--text-secondary);
  }
}

.sidebar-toggle {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.5rem;
  font-size: 1.125rem;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;

  .toggle-icon {
    font-size: 1.125rem;
    line-height: 1;
  }

  &:hover {
    color: var(--text-primary);
    background-color: var(--interactive-secondary);
  }
}

// 添加右侧部分容器
.right-section {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 50px;
  
  @media (max-width: 768px) {
    gap: 0.75rem;
  }
}

.search-form {
  min-width: 300px;
  max-width: 400px;

  @media (max-width: 1024px) {
    min-width: 250px;
    max-width: 300px;
  }

  @media (max-width: 767px) {
    display: none;
  }
}

.user-menu {
  position: relative;

  .dropdown {
    position: relative;
    display: inline-block;

    /* Show dropdown on hover of dropdown container */
    &:hover .dropdown-menu {
      display: block;
    }
  }

  .dropdown-toggle {
    color: var(--text-secondary);
    text-decoration: none;
    padding: 0.5rem;
    display: flex;
    align-items: center;

    &:hover {
      color: var(--text-primary);
    }

    .user-icon-fallback {
      font-size: 1.2rem;
      color: var(--text-primary);
    }

    .login-button {
      background: var(--interactive-secondary);
      border: 1px solid var(--border-primary);
      border-radius: 20px;
      padding: 0.375rem 0.75rem;
      transition: all 0.2s ease;
      min-height: 44px;
      display: flex;
      align-items: center;

      &.mobile-login {
        padding: 0.5rem 1rem;
        border-radius: 8px;
      }

      &:hover {
        background: var(--interactive-hover);
        border-color: var(--border-focus);
        transform: translateY(-1px);
      }

      .login-text {
        color: var(--text-primary);
        font-size: 0.875rem;
        font-weight: 500;
      }
    }
  }

  // 用户头像样式
  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid var(--border-secondary);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .dropdown-menu {
    display: none;
    position: absolute;
    right: 0;
    top: calc(100% - 2px); /* Slight overlap to prevent gap */
    background-color: var(--surface-elevated);
    min-width: 10rem;
    padding: 0.5rem 0;
    margin: 0; /* Remove gap-causing margin */
    border: var(--card-border);
    border-radius: 0.25rem;
    box-shadow: var(--card-shadow);
    z-index: 1000;

    /* Add padding-top to create invisible hover zone */
    &::before {
      content: '';
      position: absolute;
      top: -2px; /* Extend upward to bridge gap */
      left: 0;
      right: 0;
      height: 4px; /* Invisible hover bridge */
    }

    li {
      list-style: none;
    }

    .dropdown-header {
      display: block;
      padding: 0.5rem 1rem;
      margin-bottom: 0;
      font-size: 0.875rem;
      color: var(--text-muted);
      white-space: nowrap;
      font-weight: bold;
    }

    .dropdown-item {
      display: block;
      width: 100%;
      padding: 0.25rem 1rem;
      clear: both;
      text-align: inherit;
      white-space: nowrap;
      background-color: transparent;
      border: 0;
      color: var(--text-primary);
      text-decoration: none;

      &:hover {
        background-color: var(--interactive-secondary);
        color: var(--text-primary);
      }
    }

    .divider {
      height: 0;
      margin: 0.5rem 0;
      overflow: hidden;
      border-top: 1px solid var(--border-primary);
    }
  }
}

// Mobile responsive adjustments
@media (max-width: 768px) {
  .search-form {
    display: none;
  }
  
  .user-menu .dropdown-menu {
    min-width: 12rem;
    right: -1rem; // Adjust position for mobile
    
    .dropdown-item {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
      min-height: 44px;
      display: flex;
      align-items: center;
    }
  }
  
  .user-avatar {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 480px) {
  .right-section {
    gap: 0.5rem;
  }
  
  .user-menu .dropdown-menu {
    right: -0.5rem;
    min-width: 10rem;
  }
}
</style>
