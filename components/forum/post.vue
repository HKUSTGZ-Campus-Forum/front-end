<script setup lang="ts">
// 导入类型和工具
import { defineProps, withDefaults } from "vue";
// 从正确的地方导入 useRouter
import { useRouter } from "vue-router"; // 如果使用标准 Vue Router
// 或者在 Nuxt 3 中直接使用
// const router = useRouter();  // Nuxt 自动提供

import { formatDate } from "~/utils/dateFormat"; // 假设有这个工具函数

// 定义帖子属性接口，基于数据库结构
interface PostProps {
  id: number;
  title: string;
  user_id?: number;
  author: string;
  content?: string;
  excerpt?: string;
  publishDate: string; // 实际应该对应数据库中的created_at
  comment_count?: number;
  reaction_count?: number;
  views_count?: number;
  tags?: Array<{ tag_id: number; name: string }>;
  // 其他可能的属性
}

// 使用withDefaults为可选属性设置默认值
const props = withDefaults(defineProps<PostProps>(), {
  author: "匿名用户",
  excerpt: "无内容摘要...",
  comment_count: 0,
  reaction_count: 0,
  views_count: 0,
  tags: () => [],
});

// 路由导航
const router = useRouter();
const goToPostDetail = () => {
  router.push(`/forum/posts/${props.id}`);
};
</script>

<template>
  <div class="post-card" @click="goToPostDetail">
    <h2 class="post-title">
      <NuxtLink :to="`/forum/post/${id}`">{{ title }}</NuxtLink>
    </h2>

    <div class="post-meta">
      <span class="author">{{ author }}</span>
      <span class="date">{{ formatDate(publishDate) }}</span>
      <span class="views" v-if="views_count !== undefined">
        <i class="fas fa-eye"></i> {{ views_count }}
      </span>
    </div>

    <!-- 标签展示 -->
    <div class="post-tags" v-if="tags && tags.length > 0">
      <span v-for="tag in tags" :key="tag.tag_id" class="tag">
        {{ tag.name }}
      </span>
    </div>

    <p class="post-excerpt">{{ excerpt }}</p>

    <div class="post-stats">
      <span class="reactions">
        <i class="fas fa-thumbs-up"></i> {{ reaction_count }}
      </span>
      <span class="comments">
        <i class="fas fa-comment"></i> {{ comment_count }}
      </span>
    </div>

    <NuxtLink :to="`/forum/post/${id}`" class="read-more">阅读更多</NuxtLink>
  </div>
</template>

<style lang="scss" scoped>
.post-card {
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.post-title {
  margin-bottom: 0.5rem;

  a {
    color: #2c3e50;
    text-decoration: none;

    &:hover {
      color: #3498db;
    }
  }
}

.post-meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  align-items: center;

  .views {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;

  .tag {
    font-size: 0.8rem;
    background-color: #edf2f7;
    color: #3182ce;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
  }
}

.post-excerpt {
  margin-bottom: 1rem;
  color: #333;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.post-stats {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1rem;

  .reactions,
  .comments {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
}

.read-more {
  color: #3498db;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}
</style>
