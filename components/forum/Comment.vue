<template>
  <div class="comment-item" :class="{ 'reply-comment': isReply }">
    <!-- 评论内容 -->
    <div class="comment-content">
      <div class="comment-header">
        <span class="comment-author">{{ comment.author || '匿名用户' }}</span>
        <span class="comment-time">{{ formatDate(comment.created_at) }}</span>
      </div>
      
      <div class="comment-text">{{ comment.content }}</div>
      
      <!-- 评论操作 -->
      <div class="comment-actions">
        <button 
          @click="toggleReplyForm" 
          class="reply-btn"
          :disabled="!isAuthenticated"
        >
          回复
        </button>
        <button 
          v-if="canDelete" 
          @click="deleteComment" 
          class="delete-btn"
        >
          删除
        </button>
      </div>
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

    <!-- 子评论列表 -->
    <div v-if="comment.replies && comment.replies.length > 0" class="replies">
      <Comment
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :is-reply="true"
        @comment-deleted="$emit('comment-deleted', $event)"
        @comment-updated="$emit('comment-updated', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApi } from '~/composables/useApi';
import { formatDate } from '~/utils/dateFormat';
import type { Comment } from '~/types/comment';

interface Props {
  comment: Comment;
  isReply?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits(['comment-deleted', 'comment-updated']);

const { isAuthenticated, user } = useAuth();
const { fetchWithAuth } = useApi();

const showReplyForm = ref(false);

// 检查是否可以删除评论
const canDelete = computed(() => {
  return isAuthenticated.value && 
         (user.value?.id === props.comment.user_id || user.value?.role === 'admin');
});

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
  emit('comment-updated', props.comment);
};

// 删除评论
const deleteComment = async () => {
  if (!confirm('确定要删除这条评论吗？')) return;
  
  try {
    await fetchWithAuth(`https://dev.unikorn.axfff.com/api/comments/${props.comment.id}`, {
      method: 'DELETE'
    });
    
    emit('comment-deleted', props.comment.id);
  } catch (error) {
    console.error('删除评论失败:', error);
    alert('删除失败，请重试');
  }
};
</script>

<style lang="scss" scoped>
.comment-item {
  margin-bottom: 1rem;
  
  &.reply-comment {
    margin-left: 2rem;
    border-left: 2px solid #e0e0e0;
    padding-left: 1rem;
  }
}

.comment-content {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 1rem;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: #666;
}

.comment-author {
  font-weight: bold;
  color: #333;
}

.comment-text {
  margin-bottom: 0.75rem;
  line-height: 1.5;
}

.comment-actions {
  display: flex;
  gap: 0.5rem;
  
  button {
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 4px;
    font-size: 0.8rem;
    cursor: pointer;
    
    &.reply-btn {
      background-color: #e3f2fd;
      color: #1976d2;
      
      &:hover {
        background-color: #bbdefb;
      }
    }
    
    &.delete-btn {
      background-color: #ffebee;
      color: #d32f2f;
      
      &:hover {
        background-color: #ffcdd2;
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
}

.replies {
  margin-top: 1rem;
}
</style>