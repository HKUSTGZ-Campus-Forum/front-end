<script setup lang="ts">
// 导入国际化相关功能（如果需要）
import { useI18n } from "vue-i18n";
const { t } = useI18n();

// 定义组件属性，允许自定义
defineProps({
  brandName: {
    type: String,
    default: "uniKorn",
  },
  showSearch: {
    type: Boolean,
    default: true,
  },
  // 添加用户头像URL属性
  userAvatar: {
    type: String,
    default: "/image/testpic1.jpg",
  },
  // 添加用户名属性
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
      <form v-if="showSearch" class="search-form">
        <div class="search-group">
          <input
            class="search-input"
            type="text"
            :placeholder="t('search.placeholder', '搜索...')"
          />
          <button class="search-button" type="button">
            <i class="fas fa-search"></i>
          </button>
        </div>
      </form>

      <!-- 用户下拉菜单 -->
      <div class="user-menu">
        <div class="dropdown">
          <a class="dropdown-toggle" href="#" role="button">
            <div v-if="userAvatar" class="user-avatar">
              <img :src="userAvatar" :alt="username" />
            </div>
            <i v-else class="fas fa-user"></i>
          </a>
          <ul class="dropdown-menu">
            <li class="dropdown-header" v-if="username">{{ username }}</li>
            <li>
              <NuxtLink class="dropdown-item" to="/activity">活动日志</NuxtLink>
            </li>
            <li>
              <NuxtLink class="dropdown-item" to="/setting/background"
                >设置</NuxtLink
              >
            </li>
            <li><hr class="divider" /></li>
            <li>
              <NuxtLink class="dropdown-item" to="/logout">退出登录</NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </nav>
</template>

<style lang="scss" scoped>
.top-nav {
  display: flex;
  align-items: center;
  background-color: var(--color-blue-7, #9fc3e7);
  padding: 0.5rem 1rem;
  color: white;
  height: 70px;
  width: 100%; 
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
  display: flex;

  @media (max-width: 767px) {
    display: none;
  }
}

.search-group {
  display: flex;
  position: relative;
}

.search-input {
  padding: 0.375rem 0.75rem;
  font-size: 1rem;
  border: 1px solid #ced4da;
  border-radius: 0.25rem 0 0 0.25rem;
  outline: none;
}

.search-button {
  background-color: var(--kungalgame-blue-5, #0d6efd);
  border: 1px solid var(--kungalgame-blue-5, #0d6efd);
  color: white;
  border-radius: 0 0.25rem 0.25rem 0;
  padding: 0.375rem 0.75rem;
  cursor: pointer;

  &:hover {
    background-color: var(--kungalgame-blue-6, #0a58ca);
    border-color: var(--kungalgame-blue-6, #0a58ca);
  }
}

.user-menu {
  position: relative;

  .dropdown {
    position: relative;
    display: inline-block;

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

    i {
      font-size: 1rem;
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
    background-color: white;
    min-width: 10rem;
    padding: 0.5rem 0;
    margin: 0.125rem 0 0;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 0.25rem;
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    z-index: 1000;

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
