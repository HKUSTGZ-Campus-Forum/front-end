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
  <nav class="top-nav">
    <!-- 品牌/Logo -->
    <a class="brand" :class="{ 'sidebar-expanded': !sidebarFolded }" href="/">
      {{ brandName }}
    </a>

    <!-- 侧边栏切换按钮 -->
    <button class="sidebar-toggle" @click="toggleSidebar">
      <i class="fas fa-bars"></i>
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
            <div v-else class="login-button">
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
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  background-color: var(--color-blue-7, #b9d2ea);
  padding: 0.5rem 1rem;
  color: white;
  height: 70px;
  width: 99%;
  position: fixed;
  z-index: 1010; /* 确保在侧边栏之上 */
  top: 0;
  left: 0;
}

.brand {
  font-size: 1.25rem;
  text-decoration: none;
  color: white;
  padding: 0.5rem 1rem;
  margin-right: 1rem;
  white-space: nowrap;
  margin-left: 170px; // 展开时的位置
  transition: margin-left 0.3s ease; // 添加过渡效果

  &.sidebar-expanded {
    margin-left: 180px; // 展开时的位置
  }

  &:not(.sidebar-expanded) {
    margin-left: 80px; // 折叠时的位置
  }

  &:hover {
    color: rgba(255, 255, 255, 0.75);
  }
}

.sidebar-toggle {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 0.25rem 0.75rem;
  font-size: 1.25rem;

  &:hover {
    color: rgba(255, 255, 255, 0.75);
  }
}

// 添加右侧部分容器
.right-section {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 50px;
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
    color: rgba(255, 255, 255, 0.55);
    text-decoration: none;
    padding: 0.5rem;
    display: flex;
    align-items: center;

    &:hover {
      color: rgba(255, 255, 255, 0.75);
    }

    .user-icon-fallback {
      font-size: 1.2rem;
      color: rgba(255, 255, 255, 0.75);
    }

    .login-button {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      padding: 0.375rem 0.75rem;
      transition: all 0.2s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-1px);
      }

      .login-text {
        color: white;
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
    border: 2px solid rgba(255, 255, 255, 0.2);

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
    background-color: white;
    min-width: 10rem;
    padding: 0.5rem 0;
    margin: 0; /* Remove gap-causing margin */
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 0.25rem;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
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
      color: #6c757d;
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
      color: #212529;
      text-decoration: none;

      &:hover {
        background-color: #f8f9fa;
        color: #16181b;
      }
    }

    .divider {
      height: 0;
      margin: 0.5rem 0;
      overflow: hidden;
      border-top: 1px solid #e9ecef;
    }
  }
}

@media (max-width: 700px) {
  .search-form {
    display: none;
  }
}
</style>
