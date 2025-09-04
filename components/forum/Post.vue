<script setup lang="ts">
// 导入类型和工具
import { defineProps, withDefaults, computed } from "vue";
// 从正确的地方导入 useRouter
import { useRouter } from "vue-router"; // 如果使用标准 Vue Router
import { formatDate } from "~/utils/dateFormat"; // 假设有这个工具函数
import UserAvatar from "~/components/user/UserAvatar.vue";
import IdentityBadge from "~/components/identity/IdentityBadge.vue";
import type { UserIdentity } from "~/types/identity";

// 定义帖子属性接口，基于数据库结构
interface PostProps {
  id: number;
  title: string;
  user_id?: number;
  author: string;
  author_avatar?: string | null;
  content?: string;
  excerpt?: string;
  publishDate: string; // 实际应该对应数据库中的created_at
  comment_count?: number;
  reaction_count?: number;
  view_count?: number;
  tags?: Array<{ tag_id: number; name: string }>;
  display_identity?: UserIdentity | null; // Identity verification badge
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

// 添加计算属性
// 从内容生成摘要
const displayExcerpt = computed(() => {
  // 计算摘要：提取前30个字母或15个汉字
  let excerpt = "";
  let count = 0;
  const limit = 30;

  for (let i = 0; i < props.excerpt.length && count < limit; i++) {
    const char = props.excerpt[i];
    excerpt += char;

    // 汉字计数为2，其他字符计数为1
    if (/[\u4e00-\u9fa5]/.test(char)) {
      count += 2; // 汉字算2个字符
    } else {
      count += 1; // 英文字母和其他字符算1个
    }
  }

  // 如果内容比摘要长，添加省略号
  if (props.excerpt.length > excerpt.length) {
    excerpt += "...";
  }

  return excerpt;
});

// 显示作者ID
const displayAuthor = computed(() => {
  // 优先使用用户ID
  if (props.author) {
    return `用户：${props.author}`;
  }
  return props.author || "匿名用户";
});

// 路由导航
const router = useRouter();
const goToPostDetail = () => {
  router.push(`/forum/posts/${props.id}`);
};

const goToUserProfile = (userId?: number) => {
  if (userId) {
    router.push(`/users/${userId}`);
  }
};
</script>

<template>
  <div class="post-card" @click="goToPostDetail">
    <h2 class="post-title">
      <NuxtLink :to="`/forum/posts/${id}`">{{ title }}</NuxtLink>
    </h2>

    <div class="post-meta">
      <div class="author-info">
        <UserAvatar 
          :avatar-url="author_avatar"
          :username="author"
          :user-id="user_id"
          size="sm"
          :clickable="!!user_id"
          @click="goToUserProfile"
        />
        <div class="author-details">
          <span class="author">{{ displayAuthor }}</span>
          <IdentityBadge 
            :identity="display_identity"
            size="xs"
            :show-tooltip="true"
          />
        </div>
      </div>
      <span class="date">{{ formatDate(publishDate) }}</span>
    </div>

    <div class="post-tags" v-if="tags && tags.length > 0">
      <span v-for="tag in tags" :key="tag.tag_id" class="tag">
        {{ tag.name }}
      </span>
    </div>

    <p class="post-excerpt">{{ displayExcerpt }}</p>

    <div class="post-stats">
      <span class="reactions" v-if="reaction_count !== undefined">
        <i class="fas fa-heart"></i>
        <span class="stat-label">点赞</span>
        {{ reaction_count }}
      </span>
      <span class="comments">
        <i class="fas fa-comment"></i>
        <span class="stat-label">评论</span>
        {{ comment_count }}
      </span>
      <span class="views" v-if="view_count !== undefined">
        <i class="fas fa-eye"></i>
        <span class="stat-label">浏览</span>
        {{ view_count }}
      </span>
    </div>

    <NuxtLink :to="`/forum/post/${id}`" class="read-more">阅读更多</NuxtLink>
  </div>
</template>

<style lang="scss" scoped>
.post-card {
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--card-shadow, var(--shadow-small));
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  border: var(--card-border, 1px solid var(--border-primary));
  
  // Mobile optimizations
  @media (max-width: 480px) {
    padding: 1rem;
    border-radius: 6px;
    margin: 0 0.25rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    padding: 1.25rem;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-medium);
    
    // Reduce hover effect on mobile for better touch experience
    @media (max-width: 768px) {
      transform: translateY(-1px);
      box-shadow: var(--shadow-small);
    }
  }
  
  // Touch feedback for mobile
  &:active {
    @media (max-width: 768px) {
      transform: translateY(0);
      transition: transform 0.1s;
    }
  }
}

.post-title {
  margin-bottom: 0.5rem;
  line-height: 1.3;
  
  // Mobile typography adjustments
  @media (max-width: 480px) {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    line-height: 1.4;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    font-size: 1.4rem;
    margin-bottom: 0.625rem;
  }

  a {
    color: var(--text-primary);
    text-decoration: none;
    word-wrap: break-word;
    display: block;
    
    // Touch target optimization
    @media (max-width: 768px) {
      padding: 0.25rem 0;
      margin: -0.25rem 0;
    }

    &:hover {
      color: var(--interactive-primary);
    }
    
    // Touch feedback
    &:active {
      @media (max-width: 768px) {
        color: var(--interactive-active);
      }
    }
  }
}

.post-meta {
  display: flex;
  gap: 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
  
  // Mobile layout adjustments
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    gap: 0.75rem;
    font-size: 0.875rem;
  }

  .author-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    
    // Ensure adequate touch target on mobile
    @media (max-width: 480px) {
      width: 100%;
      padding: 0.25rem 0;
    }

    .author-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      
      @media (max-width: 480px) {
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
    }

    .author {
      font-weight: 500;
      color: var(--text-secondary);
      
      @media (max-width: 480px) {
        font-size: 0.9rem;
      }
    }
  }

  .views {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    
    @media (max-width: 480px) {
      font-size: 0.8rem;
    }
  }
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    gap: 0.375rem;
    margin-bottom: 1rem;
  }

  .tag {
    font-size: 0.8rem;
    background-color: var(--surface-secondary);
    color: var(--interactive-primary);
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    
    // Mobile tag sizing
    @media (max-width: 480px) {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }
  }
}

.post-excerpt {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
  word-wrap: break-word;
  
  // Mobile typography adjustments
  @media (max-width: 480px) {
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 1.25rem;
    -webkit-line-clamp: 2; // Show fewer lines on mobile
    line-clamp: 2;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    font-size: 0.95rem;
    margin-bottom: 1.125rem;
  }
}

.post-stats {
  display: flex;
  gap: 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  
  // Mobile layout adjustments
  @media (max-width: 480px) {
    gap: 0.75rem;
    font-size: 0.85rem;
    margin-bottom: 1.25rem;
  }

  .reactions,
  .comments,
  .views {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    
    // Touch-friendly spacing on mobile
    @media (max-width: 480px) {
      gap: 0.375rem;
    }
    
    .stat-label {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-right: 0.25rem;
      
      @media (max-width: 480px) {
        font-size: 0.8rem;
      }
    }
  }
}

.read-more {
  color: var(--interactive-primary);
  text-decoration: none;
  font-weight: 500;
  display: inline-block;
  transition: color 0.2s ease;
  
  // Touch-friendly sizing on mobile
  @media (max-width: 768px) {
    padding: 0.375rem 0.5rem;
    margin: -0.375rem -0.5rem;
    border-radius: 4px;
  }
  
  @media (max-width: 480px) {
    font-size: 0.9rem;
    padding: 0.5rem 0.75rem;
    margin: -0.5rem -0.75rem;
  }

  &:hover {
    text-decoration: underline;
  }
  
  // Touch feedback
  &:active {
    @media (max-width: 768px) {
      color: var(--interactive-active);
      background-color: var(--surface-secondary);
    }
  }
}
</style>
