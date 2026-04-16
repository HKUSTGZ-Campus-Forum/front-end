<template>
  <div class="comment-item" :class="{ 'reply-comment': isReply }">
    <!-- 评论内容 -->
    <div class="comment-content">
      <div class="comment-header">
        <div class="comment-author-info">
          <UserAvatar 
            :avatar-url="comment.author_avatar"
            :username="commentAuthor"
            :user-id="comment.user_id"
            size="xs"
            :clickable="true"
            @click="goToUserProfile"
          />
          <div class="comment-author-details">
            <span class="comment-author">{{ commentAuthor }}</span>
            <IdentityBadge 
              :identity="comment.display_identity"
              size="xs"
              :show-tooltip="true"
            />
          </div>
        </div>
        <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
      </div>

      <div class="comment-text">{{ comment.content }}</div>

      <div class="comment-actions">
        <button
          v-if="canReply"
          @click="toggleReplyForm"
          class="reply-btn"
          :disabled="!isAuthenticated"
        >
          回复
        </button>
        <button v-if="canDelete" @click="deleteComment" class="delete-btn">
          删除
        </button>
      </div>
    </div>

    <!-- 评论表情反应 -->
    <div class="comment-reactions">
      <EmojiReation 
        :post-id="comment.id" 
        type="comment" 
      />
    </div>

    <!-- 回复表单 -->
    <div v-if="showReplyForm" class="reply-form">
      <CommentForm
        :post-id="comment.post_id"
        :parent-comment-id="comment.id"
        placeholder="回复评论..."
        @comment-added="handleReplyAdded"
        @cancel="showReplyForm = false"
      />
    </div>
    <!-- 确认删除弹窗 -->
    <ConfirmModal
      :show="showConfirmModal"
      title="删除评论确认"
      message="确定要删除这条评论吗？此操作无法撤销。"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="handleDeleteConfirm"
      @cancel="showConfirmModal = false"
      @close="showConfirmModal = false"
    />

    <!-- 成功提示弹窗 -->
    <SuccessModal
      :show="showSuccessModal"
      title="删除成功"
      message="评论已成功删除！"
      :auto-close="true"
      :auto-close-delay="2000"
      :show-button="false"
      @close="showSuccessModal = false"
    />

    <!-- 错误提示弹窗 -->
    <ErrorModal
      :show="showErrorModal"
      title="删除失败"
      :message="errorMsg"
      @close="showErrorModal = false"
    />
    <!-- 子评论列表 -->
    <div v-if="comment.replies && comment.replies.length > 0" class="replies">
      <Comment
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :is-reply="true"
        :depth="currentDepth + 1"
        @comment-deleted="$emit('comment-deleted', $event)"
        @comment-updated="$emit('comment-updated', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import { formatDate } from "~/utils/dateFormat";
import type { Comment } from "~/types/comment";
import { useUser } from "~/composables/useUser";
import { onMounted } from "vue";
import CommentForm from "./CommentForm.vue";
import EmojiReation from "./EmojiReation.vue";
import UserAvatar from "~/components/user/UserAvatar.vue";
import IdentityBadge from "~/components/identity/IdentityBadge.vue";
import { ConfirmModal, ErrorModal, SuccessModal } from "../ui";
import type { UserIdentity } from "~/types/identity";

interface Props {
  comment: Comment;
  isReply?: boolean;
  depth?: number;
}

interface Emits {
  (e: "comment-deleted", commentId: number): void;
  (e: "comment-updated", comment: Comment): void;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0
});
const emit = defineEmits(["comment-deleted", "comment-updated"]);

const { user, isLoggedIn: isAuthenticated } = useAuth();

// Constants for comment depth control
const MAX_COMMENT_DEPTH = 1; // 0: top-level, 1: first reply level (total 2 levels)
const currentDepth = computed(() => props.depth || 0);

// Can reply if authenticated and not at max depth
const canReply = computed(() => {
  return isAuthenticated.value && currentDepth.value < MAX_COMMENT_DEPTH;
});

const { fetchWithAuth, fetchPublic, getApiUrl } = useApi();
const { getUserById } = useUser(); // 获取 getUserById 方法

const showReplyForm = ref(false);
const authorName = ref<string>(""); // 用于存储获取到的用户名
// 弹窗状态
const showConfirmModal = ref(false);
const showSuccessModal = ref(false);
const showErrorModal = ref(false);
const errorMsg = ref("");

const commentAuthor = computed(() => {
  // 1. 优先使用后端返回的 author 字段
  if (props.comment.author) {
    return props.comment.author;
  }

  // 2. 使用获取到的用户名
  if (authorName.value) {
    return authorName.value;
  }

  // 3. 如果是当前用户的评论
  if (user.value && Number(user.value.id) === props.comment.user_id) {
    return user.value.username || `用户${props.comment.user_id}`;
  }

  // 4. 加载中显示
  return `用户${props.comment.user_id}`;
});

// 异步获取用户名的函数
const fetchUserName = async () => {
  // 如果已经有作者信息，不需要获取
  if (props.comment.author || authorName.value) {
    return;
  }

  try {
    const userData = await getUserById(props.comment.user_id);
    authorName.value = userData.username || `用户${props.comment.user_id}`;
  } catch (error) {
    console.error("获取用户信息失败:", error);
    authorName.value = `用户${props.comment.user_id}`;
  }
};

// 切换回复表单显示
const toggleReplyForm = () => {
  showReplyForm.value = !showReplyForm.value;
};

// 处理回复添加
const handleReplyAdded = (newReply: Comment) => {
  if (!props.comment.replies) {
    props.comment.replies = [];
  }
  props.comment.replies.push(newReply);
  showReplyForm.value = false;
  emit("comment-updated", props.comment);
};

// 删除评论
const deleteComment = () => {
  if (!canDelete.value) {
    errorMsg.value = "您没有权限删除此评论";
    showErrorModal.value = true;
    return;
  }
  showConfirmModal.value = true;
};

// 确认删除处理
const handleDeleteConfirm = async () => {
  try {
    const response = await fetchWithAuth(
      getApiUrl(`/api/comments/${props.comment.id}`),
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      // 🔥 关闭确认弹窗，显示错误弹窗
      showConfirmModal.value = false;
      errorMsg.value = `删除失败: ${response.status}`;
      showErrorModal.value = true;
      return;
    }

    // 🔥 关闭确认弹窗，显示成功弹窗
    showConfirmModal.value = false;
    showSuccessModal.value = true;

    // 🔥 延迟发送删除事件，让用户看到成功动画
    setTimeout(() => {
      emit("comment-deleted", props.comment.id);
    }, 1500); // 延迟1.5秒，让动画播放完成
  } catch (error) {
    // 🔥 关闭确认弹窗，显示错误弹窗
    showConfirmModal.value = false;
    errorMsg.value = "删除失败，请重试";
    showErrorModal.value = true;
  }
};

// 权限检查
const canDelete = computed(() => {
  return isAuthenticated.value && Number(user.value?.id) === props.comment.user_id;
});

// 导航到用户资料页
const goToUserProfile = (userId?: string | number) => {
  if (userId !== undefined && userId !== null && userId !== "") {
    navigateTo(`/users/${userId}`);
  }
};

onMounted(() => {
  fetchUserName();
});
</script>

<style lang="scss" scoped>
.comment-item {
  margin-bottom: 1rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    margin-bottom: 0.75rem;
  }

  &.reply-comment {
    margin-left: 2rem;
    border-left: 2px solid #e0e0e0;
    padding-left: 1rem;
    
    // Mobile reply indentation
    @media (max-width: 480px) {
      margin-left: 1rem;
      padding-left: 0.75rem;
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      margin-left: 1.5rem;
      padding-left: 0.875rem;
    }
  }
}

.comment-content {
  background: var(--surface-primary);
  border-radius: 8px;
  padding: 0rem 1rem;
  
  // Mobile padding adjustments
  @media (max-width: 480px) {
    padding: 0.75rem;
    border-radius: 6px;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    padding: 0.875rem;
  }
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #666;
  align-items: center;
  flex-wrap: wrap;
  
  // Mobile layout adjustments
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
    font-size: 0.85rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    font-size: 0.875rem;
  }
}

.comment-author-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  // Mobile adjustments
  @media (max-width: 480px) {
    gap: 0.375rem;
  }

  .comment-author-details {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
}

.comment-author {
  font-weight: bold;
  color: var(--text-primary);
}

.comment-text {
  margin-bottom: 0.75rem;
  line-height: 1.5;
  word-wrap: break-word;
  
  // Mobile typography adjustments
  @media (max-width: 480px) {
    font-size: 0.9rem;
    line-height: 1.6;
    margin-bottom: 1rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    font-size: 0.95rem;
    margin-bottom: 0.875rem;
  }
}

.comment-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  
  // Mobile layout adjustments
  @media (max-width: 480px) {
    gap: 0.75rem;
    justify-content: flex-start;
  }

  button {
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 32px; // Touch-friendly minimum height
    
    // Mobile button optimizations
    @media (max-width: 480px) {
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      min-height: 44px; // Larger touch target on mobile
      min-width: 60px;
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      padding: 0.375rem 0.625rem;
      min-height: 36px;
    }

    &.reply-btn {
      background-color: #e3f2fd;
      color: #1976d2;

      &:hover {
        background-color: #bbdefb;
      }
      
      // Touch feedback
      &:active {
        @media (max-width: 768px) {
          background-color: #90caf9;
          transform: translateY(1px);
        }
      }
    }

    &.delete-btn {
      background-color: #ffebee;
      color: #d32f2f;

      &:hover {
        background-color: #ffcdd2;
      }
      
      // Touch feedback
      &:active {
        @media (max-width: 768px) {
          background-color: #ffb3ba;
          transform: translateY(1px);
        }
      }
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.reply-form {
  margin-top: 1rem;
  margin-left: 1rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    margin-left: 0.5rem;
    margin-top: 0.75rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    margin-left: 0.75rem;
    margin-top: 0.875rem;
  }
}

.comment-reactions {
  margin-top: 0.02rem;
  margin-left: 1rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    margin-left: 0.5rem;
    margin-top: 0.5rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    margin-left: 0.75rem;
    margin-top: 0.625rem;
  }
}

.replies {
  margin-top: 1rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    margin-top: 0.75rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    margin-top: 0.875rem;
  }
}
</style>
