<template>
  <HomeContainer>
    <div class="post-container">
      <div class="post-header">
        <h1 class="post-title">{{ post.title || "加载中..." }}</h1>
        <div class="post-meta">
          <span class="author">作者: {{ post.author }}</span>
          <span class="date">发布于: {{ formatDate(post.publishDate) }}</span>
          <span class="views" v-if="post.views_count !== undefined">
            <i class="fas fa-eye"></i> {{ post.views_count }} 浏览
          </span>
        </div>

        <!-- 标签展示 -->
        <div class="post-tags" v-if="post.tags && post.tags.length > 0">
          <span v-for="tag in post.tags" :key="tag.tag_id" class="tag">
            {{ tag.name }}
          </span>
        </div>
      </div>

      <div class="post-content">
        {{ post.content }}
      </div>

      <div class="post-actions">
        <button class="like-button">
          <i class="fas fa-thumbs-up"></i> 点赞 ({{ post.reaction_count }})
        </button>
        <button class="comment-button">
          <i class="fas fa-comment"></i> 评论 ({{ post.comment_count }})
        </button>
      </div>

      <div class="comments-section" v-if="post.comments?.length">
        <h3>评论 ({{ post.comments.length }})</h3>
        <div class="comment-list">
          <div
            v-for="comment in post.comments"
            :key="comment.id"
            class="comment"
          >
            <div class="comment-author">{{ comment.author }}</div>
            <div class="comment-content">{{ comment.content }}</div>
          </div>
        </div>
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { formatDate } from "~/utils/dateFormat";
import { useUser } from '~/composables/useUser';

const { getUsernameById } = useUser();

const route = useRoute();
const postId = route.params.id;
const post = ref({});
const isLoading = ref(true);
const errorMessage = ref("");

// 获取认证令牌
const { token } = useAuth();

// 获取文章数据
onMounted(async () => {
  try {
    isLoading.value = true;
    // console.log(token.value, "token");
    const response = await fetch(
      `https://dev.unikorn.axfff.com/api/posts/${postId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // 添加授权头
          ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
        },
      }
    );

    if (!response.ok) {
      // 处理错误状态码
      const errorText = await response.text().catch(() => "未知错误");
      errorMessage.value = `获取文章失败 (${response.status}): ${errorText}`;
      console.error("API错误:", {
        状态: response.status,
        响应: errorText,
      });

      // 使用模拟数据继续渲染
      useFallbackData();
      return;
    }

    // 解析API返回的真实数据
    const data = await response.json();

    if (data.author_id) {
      const username = await getUsernameById(data.author_id);
      post.value.author = username;
    } else {
      post.value.author = "匿名用户";
    }

    post.value = data;


    if (data.author_id) {
      const username = await getUsernameById(data.author_id);
      post.value.author = username;
    } else {
      post.value.author = "匿名用户";
    }
    
    post.value.author = data.author;
    post.value.publishDate = data.time;
    post.value.view_count = data.view_count || 0;
  } catch (error) {
    console.error("获取文章失败:", error);
    errorMessage.value = "无法连接到服务器，请稍后再试";

    // 连接失败时使用模拟数据
    // useFallbackData();
  } finally {
    isLoading.value = false;
  }
});

// 回退到模拟数据
// function useFallbackData() {
//   console.log("使用模拟数据...");
//   post.value = {
//     id: postId,
//     title: `文章标题 #${postId}`,
//     author: "张三",
//     publishDate: new Date().toISOString(),
//     content:
//       "这里是文章内容，可以包含很长的文本。这里是文章内容，可以包含很长的文本。",
//     reaction_count: 42,
//     comment_count: 2,
//     views_count: 156,
//     tags: [
//       { tag_id: 1, name: "标签1" },
//       { tag_id: 2, name: "标签2" },
//     ],
//     comments: [
//       { id: 1, author: "李四", content: "很棒的文章！" },
//       { id: 2, author: "王五", content: "学习了，谢谢分享。" },
//     ],
//   };
// }
</script>

<style lang="scss" scoped>
.post-container {
  max-width: 800px;
  margin: 0 auto;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.post-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 1rem;
}

.post-title {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.post-meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;

  .tag {
    font-size: 0.8rem;
    background-color: #edf2f7;
    color: #3182ce;
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
  }
}

.post-content {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
}

.post-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;

  button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    background-color: #f0f0f0;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background-color: #e0e0e0;
    }
  }
}

.comments-section {
  border-top: 1px solid #e0e0e0;
  padding-top: 1rem;

  h3 {
    margin-bottom: 1rem;
  }
}

.comment {
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;

  .comment-author {
    font-weight: bold;
    margin-bottom: 0.5rem;
  }
}

.views {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
