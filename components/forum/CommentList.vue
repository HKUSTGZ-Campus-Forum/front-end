<template>
  <div class="comments-section">
    <h3>{{ t("forum.comments.title", { count: comments.length }) }}</h3>

    <div v-if="isAuthenticated" class="new-comment-form">
      <CommentForm :post-id="postId" @comment-added="handleCommentAdded" />
    </div>
    <div v-else class="login-prompt">
      <p>
        {{ t("forum.comments.loginPromptPrefix") }}
        <NuxtLink :to="localePath('/login')">{{ t("actions.login") }}</NuxtLink>
        {{ t("forum.comments.loginPromptSuffix") }}
      </p>
    </div>

    <div v-if="comments.length > 0" class="comments-list">
      <Comment
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :depth="0"
        @comment-deleted="handleCommentDeleted"
        @comment-updated="handleCommentUpdated"
      />
    </div>
    <div v-else class="no-comments">
      <p>{{ t("forum.comments.empty") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useI18n, useLocalePath } from "#imports";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import type { Comment as CommentType } from "~/types/comment";

import CommentForm from "./CommentForm.vue";
import Comment from "./Comment.vue";

interface Props {
  postId: number;
}

const props = defineProps<Props>();
const { t } = useI18n();
const localePath = useLocalePath();

const { user } = useAuth();
const { fetchPublic, getApiUrl } = useApi();

const comments = ref<CommentType[]>([]);
const isLoading = ref(false);

const isAuthenticated = computed(() => {
  return !!user.value;
});

const fetchComments = async () => {
  try {
    isLoading.value = true;
    const params = new URLSearchParams({
      include_replies: "true",
      top_level_only: "true",
    });

    const response = await fetchPublic(
      getApiUrl(`/api/comments/post/${props.postId}?${params}`)
    );

    if (!response.ok) throw new Error(t("forum.comments.fetchFailed"));

    const data = await response.json();
    comments.value = data.comments || [];
  } catch (error) {
    console.error("Failed to fetch comments:", error);
  } finally {
    isLoading.value = false;
  }
};

const handleCommentAdded = (newComment: CommentType) => {
  if (!newComment.parent_comment_id) {
    comments.value.unshift(newComment);
  }
};

const handleCommentDeleted = (commentId: number) => {
  const deleteFromList = (list: CommentType[]): CommentType[] => {
    return list.filter((comment) => {
      if (comment.id === commentId) {
        return false;
      }
      if (comment.replies) {
        comment.replies = deleteFromList(comment.replies);
      }
      return true;
    });
  };

  comments.value = deleteFromList(comments.value);
};

const handleCommentUpdated = (updatedComment: CommentType) => {
  const updateInList = (list: CommentType[]): void => {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === updatedComment.id) {
        list[i] = updatedComment;
        return;
      }
      if (list[i].replies) {
        updateInList(list[i].replies!);
      }
    }
  };

  updateInList(comments.value);
};

onMounted(() => {
  fetchComments();
});
</script>

<style lang="scss" scoped>
.comments-section {
  margin-top: 2rem;
  border-top: 1px solid #e0e0e0;
  padding-top: 1.5rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    margin-top: 1.5rem;
    padding-top: 1rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    margin-top: 1.75rem;
    padding-top: 1.25rem;
  }

  h3 {
    margin-bottom: 1.5rem;
    
    // Mobile typography adjustments
    @media (max-width: 480px) {
      font-size: 1.25rem;
      margin-bottom: 1rem;
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      font-size: 1.375rem;
      margin-bottom: 1.25rem;
    }
  }
}

.new-comment-form {
  margin-bottom: 2rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    margin-bottom: 1.5rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    margin-bottom: 1.75rem;
  }
}

.login-prompt {
  text-align: center;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 2rem;
  
  // Mobile optimizations
  @media (max-width: 480px) {
    padding: 1.25rem 1rem;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    padding: 1.125rem;
    margin-bottom: 1.75rem;
  }

  a {
    color: #3498db;
    text-decoration: none;
    transition: color 0.2s ease;
    
    // Touch-friendly link sizing on mobile
    @media (max-width: 768px) {
      padding: 0.375rem 0.5rem;
      margin: -0.375rem -0.5rem;
      border-radius: 4px;
      display: inline-block;
    }

    &:hover {
      text-decoration: underline;
    }
    
    // Touch feedback
    &:active {
      @media (max-width: 768px) {
        color: #2980b9;
        background-color: rgba(52, 152, 219, 0.1);
      }
    }
  }
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    gap: 0.75rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    gap: 0.875rem;
  }
}

.no-comments {
  text-align: center;
  color: #666;
  padding: 2rem;
  
  // Mobile optimizations
  @media (max-width: 480px) {
    padding: 1.5rem 1rem;
    font-size: 0.9rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    padding: 1.75rem;
    font-size: 0.95rem;
  }
}
</style>
