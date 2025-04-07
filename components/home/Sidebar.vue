<script setup lang="ts">
// 导入国际化相关功能（如果需要）
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    folded: boolean;
  }>(),
  {
    folded: false,
  }
);

// 添加emit用于通知父组件状态变化
const emit = defineEmits(['update:folded']);

// 本地状态，用于处理悬停效果
const isHovered = ref(false);

// 处理鼠标悬停
function handleMouseEnter() {
  if (props.folded) {
    isHovered.value = true;
  }
}

function handleMouseLeave() {
  isHovered.value = false;
}

// 监控悬停状态变化
watch(isHovered, (newValue) => {
  // 只在折叠状态下才触发展开
  if (props.folded) {
    emit('update:folded', !newValue);
  }
});
</script>

<template>
    <div 
    class="sidebar" 
    :class="{ collapsed: folded && !isHovered }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="sidebar-content">
      <div class="sidebar-header">
        <div class="uniKonwn-logo">
          <img src="/image/uniKorn.jpg" alt="uniKonwn">
        </div>
      </div>
      <ul class="nav-items">
        <li><NuxtLink to="/">首页</NuxtLink></li>
        <li><NuxtLink to="/posts">论坛</NuxtLink></li>
        <li><NuxtLink to="/users">用户</NuxtLink></li>
        <!-- 更多菜单项 -->
      </ul>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.sidebar-header {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.uniKonwn-logo {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid rgba(255, 255, 255, 0.2);
  transition: all 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  &:hover {
    transform: scale(1.12) rotate(360deg);
    border-color: rgba(255, 255, 255, 0.8);
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.4);
  }
}

// 侧边栏折叠时的logo样式
.sidebar.collapsed .uniKonwn-logo {
  width: 50px;
  height: 50px;
  margin: 0 auto;
}

.sidebar {
  position: fixed;
  left: 0;
  top: 0px; /* 与顶部导航栏高度相匹配 */
  height: 100%;
  width: 200px;
  background-color: #343a40;
  color: white;
  transition: all 0.3s ease;
  z-index: 1010;
  padding : 0;

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
    margin: 0;

    li {
      margin-bottom: 0.5rem;
    }

    a {
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      display: block;
      padding: 0.5rem;
      border-radius: 4px;
      font-size: 16px; // 大小
      font-weight: 500; // 字体粗细
      margin-left: -10px;
      &:hover,
      &.active {
        background-color: rgba(255, 255, 255, 0.1);
      }
    }
  }
}
</style>
