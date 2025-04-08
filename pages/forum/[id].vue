<template>
    <HomeContainer>
      <div class="post-container">
        <div class="post-header">
          <h1 class="post-title">{{ post.title || '加载中...' }}</h1>
          <div class="post-meta">
            <span class="author">作者: {{ post.author }}</span>
            <span class="date">发布于: {{ formatDate(post.publishDate) }}</span>
          </div>
        </div>
        
        <div class="post-content">
          {{ post.content }}
        </div>
        
        <div class="post-actions">
          <button class="like-button">
            <i class="like-icon"></i> 点赞 ({{ post.likes }})
          </button>
          <button class="comment-button">
            <i class="comment-icon"></i> 评论 ({{ post.comments?.length || 0 }})
          </button>
        </div>
        
        <div class="comments-section" v-if="post.comments?.length">
          <h3>评论 ({{ post.comments.length }})</h3>
          <div class="comment-list">
            <div v-for="comment in post.comments" :key="comment.id" class="comment">
              <div class="comment-author">{{ comment.author }}</div>
              <div class="comment-content">{{ comment.content }}</div>
            </div>
          </div>
        </div>
      </div>
    </HomeContainer>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  
  const route = useRoute();
  const postId = route.params.id;
  const post = ref({});
  
  // 日期格式化函数
  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // 获取文章数据
  onMounted(async () => {
    try {
      // 实际项目中替换为API调用
      // const response = await fetch(`/api/posts/${postId}`);
      // post.value = await response.json();
      
      // 模拟数据
      post.value = {
        id: postId,
        title: `文章标题 #${postId}`,
        author: '张三',
        publishDate: new Date().toISOString(),
        content: '这里是文章内容，可以包含很长的文本。这里是文章内容，可以包含很长的文本。这里是文章内容，可以包含很长的文本。',
        likes: 42,
        comments: [
          { id: 1, author: '李四', content: '很棒的文章！' },
          { id: 2, author: '王五', content: '学习了，谢谢分享。' }
        ]
      };
    } catch (error) {
      console.error('获取文章失败:', error);
    }
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
  </style>