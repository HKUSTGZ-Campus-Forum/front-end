<template>
  <HomeContainer>
    <div class="post-container">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading">加载中...</div>

      <!-- 错误状态 -->
      <div v-else-if="errorMessage" class="error">
        {{ errorMessage }}
      </div>

      <!-- 正常内容 -->
      <div v-else>
        <div class="post-header">
          <h1 class="post-title">{{ postData.title || "无标题" }}</h1>
          <div class="post-meta">
            <span class="author"
              >作者: {{ postData.author || "匿名用户" }}</span
            >
            <span class="date"
              >发布于: {{ formatDate(postData.publishDate) }}</span
            >
            <span class="views" v-if="postData.views_count !== undefined">
              <i class="fas fa-eye"></i> {{ postData.views_count }} 浏览
            </span>
          </div>

          <!-- 标签展示 -->
          <div
            class="post-tags"
            v-if="postData.tags && postData.tags.length > 0"
          >
            <span v-for="tag in postData.tags" :key="tag.tag_id" class="tag">
              {{ tag.name }}
            </span>
          </div>
        </div>

        <div class="post-content">
          {{ postData.content }}
        </div>

        <div class="post-actions" v-if="canDeletePost">
          <button class="delete-button" @click="showDeleteConfirm">
            <i class="fas fa-trash"></i> 删除帖子
          </button>
        </div>

        <ConfirmModal
          :show="showConfirmModal"
          title="删除确认"
          message="确定要删除这篇帖子吗？此操作无法撤销。"
          confirm-text="删除"
          cancel-text="取消"
          @confirm="handleDeleteConfirm"
          @cancel="showConfirmModal = false"
          @close="showConfirmModal = false"
        />

        <SuccessModal
          :show="showSuccessModal"
          title="删除成功"
          message="帖子已成功删除！即将跳转到论坛首页..."
          :auto-close="true"
          :auto-close-delay="3000"
          :show-button="false"
          @close="handleSuccessClose"
        />

        <!-- 评论区域 -->
        <CommentList :post-id="parseInt(postId)" />
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatDate } from "~/utils/dateFormat";
import { useUser } from "~/composables/useUser";
import { useApi } from "~/composables/useApi";
import { useAuth } from "~/composables/useAuth";
import CommentList from "~/components/forum/CommentList.vue";
import ConfirmModal from "~/components/ui/ConfirmModal.vue";
import SuccessModal from "~/components/ui/SuccessModal.vue";

// Composables
const route = useRoute();
const router = useRouter();
const { getUsernameById } = useUser();
const { fetchWithAuth } = useApi();
const { isLoggedIn, user } = useAuth();

// 弹窗状态
const showConfirmModal = ref(false);
const showSuccessModal = ref(false);

// 响应式数据
const postId = route.params.id;
const post = ref({});
const isLoading = ref(true);
const errorMessage = ref("");

// 计算属性
const postData = computed(() => post.value);

const canDeletePost = computed(() => {
  if (!isLoggedIn.value || !user.value || !postData.value.user_id) {
    return false;
  }
  return Number(user.value.id) === Number(postData.value.user_id);
});

// 显示删除确认弹窗
const showDeleteConfirm = () => {
  if (!canDeletePost.value) {
    alert("您没有权限删除此帖子");
    return;
  }
  showConfirmModal.value = true;
};

// 处理删除确认
const handleDeleteConfirm = async () => {
  try {
    console.log("🗑️ 开始删除帖子:", postId);

    const response = await fetchWithAuth(
      `https://dev.unikorn.axfff.com/api/posts/${postId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error(`删除失败: ${response.status}`);
    }

    console.log("✅ 删除成功");

    // 显示成功弹窗
    showSuccessModal.value = true;
  } catch (error) {
    console.error("💥 删除帖子失败:", error);
    alert("删除失败，请重试");
  }
};

// 添加：处理成功弹窗关闭
const handleSuccessClose = () => {
  showSuccessModal.value = false;
  // 跳转到论坛首页
  router.push("/forum");
};

// 原有的 fetchPostData 函数保持不变
const fetchPostData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = "";

    const response = await fetchWithAuth(
      `https://dev.unikorn.axfff.com/api/posts/${postId}`
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      errorMessage.value = `获取帖子失败 (${response.status}): ${errorText}`;
      console.error("API error:", {
        status: response.status,
        response: errorText,
      });
      return;
    }

    const data = await response.json();
    console.log("获取到的帖子数据:", data);

    // 获取作者用户名
    let authorName = "匿名用户";
    if (data.author_id || data.user_id) {
      try {
        const userId = data.author_id || data.user_id;
        authorName = await getUsernameById(userId);
      } catch (error) {
        console.warn("获取作者用户名失败:", error);
      }
    }

    // 统一数据格式
    post.value = {
      id: data.id || data.post_id,
      title: data.title,
      content: data.content,
      author: authorName,
      publishDate: data.created_at || data.time || new Date().toISOString(),
      reaction_count: data.reaction_count || 0,
      comment_count: data.comment_count || 0,
      views_count: data.views_count || data.view_count || 0,
      tags: data.tags || [],
      user_id: data.author_id || data.user_id,
    };
  } catch (error) {
    console.error("获取帖子失败:", error);
    errorMessage.value = "无法连接到服务器，请稍后重试";
  } finally {
    isLoading.value = false;
  }
};

// 组件挂载时获取数据
onMounted(() => {
  fetchPostData();
});
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

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: #666;
}

.error {
  text-align: center;
  padding: 2rem;
  color: #e74c3c;
  background-color: #ffebee;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.post-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 1rem;
}

.post-title {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.post-meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.views {
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
  white-space: pre-wrap;
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
    transition: background-color 0.3s;

    &:hover {
      background-color: #e0e0e0;
    }

    &.like-button:hover {
      background-color: #e8f5e8;
      color: #27ae60;
    }

    &.comment-button:hover {
      background-color: #e8f4fd;
      color: #3498db;
    }
  }
}
</style>
