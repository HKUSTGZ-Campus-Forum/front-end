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
const emit = defineEmits(["update:folded"]);

// 本地状态，用于处理悬停效果
const isHovered = ref(false);

function handleMouseEnter() {
  if (props.folded) {
    isHovered.value = true;
    emit("update:folded", false); // 直接发射展开事件
  }
}

function handleMouseLeave() {
  if (!props.folded) {
    isHovered.value = false;
    emit("update:folded", true); // 直接发射折叠事件
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
    :class="{ collapsed: folded }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
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
          >首页</NuxtLink>
        </li>
        <li>
          <NuxtLink 
            to="/forum" 
            :class="{ active: route.path.startsWith('/forum') }"
          >论坛</NuxtLink>
        </li>
        <li>
          <NuxtLink 
            to="/courses" 
            :class="{ active: route.path.startsWith('/courses') }"
          >课程</NuxtLink>
        </li>
        <li>
          <!-- Show user profile link only when logged in -->
          <NuxtLink 
            v-if="isLoggedIn && user?.id"
            :to="`/users/${user.id}`"
            :class="{ active: route.path.startsWith('/users/') }"
          >个人资料</NuxtLink>
          <!-- Show login link when not logged in -->
          <NuxtLink 
            v-else
            to="/login"
            :class="{ active: route.path === '/login' }"
          >登录</NuxtLink>
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
  border: 3px solid rgba(255, 255, 255, 0.2);
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
  }

  &:hover {
    img {
      transform: scale(1.12) rotate(360deg);
    }
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
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
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.3);
  position: fixed;
  left: 0;
  top: 0; /* 从页面顶部开始 */
  height: 100vh;
  width: 200px;
  background-color: #677d94;
  color: white;
  transition: all 0.3s ease;
  z-index: 1010; /* 提高z-index使其在顶部栏之上 */
  padding: 0;

  &.collapsed {
    width: 100px;

    .nav-items span {
      display: none;
    }
  }

  .sidebar-content {
    padding: 1rem;
  }

  .nav-items {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0 0; /* Add top margin to prevent overlap */
    position: relative; /* Ensure proper stacking context */

    li {
      margin-bottom: 0.5rem;
      position: relative; /* For proper stacking */
      z-index: 1; /* Ensure items stay above other elements */
    }

    a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      display: block;
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      margin-left: -10px;
      transition: all 0.3s ease;
      position: relative;

      &:hover {
        background-color: rgba(255, 255, 255, 0.1);
        color: white;
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
        }
      }
    }
  }
}
</style>
