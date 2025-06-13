<template>
  <form @submit.prevent="submitComment" class="comment-form">
    <textarea
      v-model="content"
      :placeholder="placeholder"
      rows="3"
      required
      :disabled="isLoading"
    ></textarea>

    <div class="form-actions">
      <button
        v-if="parentCommentId"
        type="button"
        @click="$emit('cancel')"
        class="cancel-btn"
      >
        取消
      </button>
      <button
        type="submit"
        :disabled="isLoading || !content.trim()"
        class="submit-btn"
      >
        {{ isLoading ? "提交中..." : "提交评论" }}
      </button>
    </div>

    <div v-if="error" class="error-message">{{ error }}</div>
  </form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import type { Comment, CommentCreateData } from "~/types/comment";

interface Props {
  postId: number;
  parentCommentId?: number;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "写下你的评论...",
});

const emit = defineEmits(["comment-added", "cancel"]);

const { user } = useAuth();
const { fetchWithAuth, getApiUrl } = useApi();

const content = ref("");
const isLoading = ref(false);
const error = ref("");

const submitComment = async () => {
  if (!user.value) {
    error.value = "请先登录";
    return;
  }

  if (!content.value.trim()) {
    error.value = "评论内容不能为空";
    return;
  }

  try {
    isLoading.value = true;
    error.value = "";

    const commentData: CommentCreateData = {
      content: content.value.trim(),
      post_id: props.postId,
    };

    if (props.parentCommentId) {
      commentData.parent_comment_id = props.parentCommentId;
    }

    const response = await fetchWithAuth(
      getApiUrl("/api/comments"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commentData),
      }
    );

    if (!response.ok) {
      throw new Error("提交评论失败");
    }

    const newComment: Comment = await response.json();

    // 清空表单
    content.value = "";

    // 通知父组件
    emit("comment-added", newComment);
  } catch (err) {
    console.error("提交评论失败:", err);
    error.value = err instanceof Error ? err.message : "提交失败，请重试";
  } finally {
    isLoading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.comment-form {
  // Mobile form optimizations
  @media (max-width: 480px) {
    margin: 0;
  }
  
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    
    // Mobile textarea optimizations
    @media (max-width: 480px) {
      padding: 1rem;
      font-size: 1rem; // Prevent zoom on iOS
      border-radius: 6px;
      min-height: 120px;
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      padding: 0.875rem;
      font-size: 0.95rem;
    }

    &:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }
    
    // Placeholder styling for mobile
    &::placeholder {
      @media (max-width: 480px) {
        font-size: 0.9rem;
        opacity: 0.7;
      }
    }
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
  
  // Mobile layout adjustments
  @media (max-width: 480px) {
    flex-direction: column-reverse;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    gap: 0.75rem;
    margin-top: 0.625rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 44px; // Touch-friendly minimum height
    font-weight: 500;
    
    // Mobile button optimizations
    @media (max-width: 480px) {
      width: 100%;
      padding: 0.75rem 1rem;
      font-size: 1rem;
      border-radius: 6px;
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      padding: 0.625rem 1.25rem;
      min-height: 40px;
    }

    &.cancel-btn {
      background-color: #f5f5f5;
      color: #666;

      &:hover {
        background-color: #e0e0e0;
      }
      
      // Touch feedback
      &:active {
        @media (max-width: 768px) {
          background-color: #d5d5d5;
          transform: translateY(1px);
        }
      }
    }

    &.submit-btn {
      background-color: #3498db;
      color: white;

      &:hover:not(:disabled) {
        background-color: #2980b9;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      // Touch feedback
      &:active:not(:disabled) {
        @media (max-width: 768px) {
          background-color: #2574a9;
          transform: translateY(1px);
        }
      }
    }
  }
}

.error-message {
  color: #e74c3c;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: rgba(231, 76, 60, 0.1);
  border-radius: 4px;
  border-left: 3px solid #e74c3c;
  
  // Mobile error message styling
  @media (max-width: 480px) {
    font-size: 0.85rem;
    margin-top: 0.75rem;
    padding: 0.75rem;
    border-radius: 6px;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    margin-top: 0.625rem;
    padding: 0.625rem;
  }
}
</style>
