<template>
    <HomeContainer>
      <div class="posts-container">
        <h1 class="page-title">论坛文章</h1>
        
        <div class="posts-list">
          <div v-for="post in posts" :key="post.id" class="post-card">
            <h2 class="post-title">
              <NuxtLink :to="`/forum/post/${post.id}`">{{ post.title }}</NuxtLink>
            </h2>
            
            <div class="post-meta">
              <span class="author">{{ post.author }}</span>
              <span class="date">{{ formatDate(post.publishDate) }}</span>
            </div>
            
            <p class="post-excerpt">{{ post.excerpt }}</p>
            
            <div class="post-stats">
              <span class="likes">{{ post.likes }} 点赞</span>
              <span class="comments">{{ post.comments }} 评论</span>
            </div>
            
            <NuxtLink :to="`/forum/post/${post.id}`" class="read-more">阅读更多</NuxtLink>
          </div>
        </div>
        
        <div class="pagination">
          <button class="prev-page" :disabled="currentPage === 1" @click="prevPage">上一页</button>
          <span class="page-number">{{ currentPage }}/{{ totalPages }}</span>
          <button class="next-page" :disabled="currentPage === totalPages" @click="nextPage">下一页</button>
        </div>
      </div>
    </HomeContainer>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  
  const posts = ref([]);
  const currentPage = ref(1);
  const totalPages = ref(1);
  
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('zh-CN');
  }
  
  function prevPage() {
    if (currentPage.value > 1) {
      currentPage.value--;
      fetchPosts();
    }
  }
  
  function nextPage() {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
      fetchPosts();
    }
  }
  
  async function fetchPosts() {
    try {
      // const response = await fetch(`/api/posts?page=${currentPage.value}`);
      // const data = await response.json();
      // posts.value = data.posts;
      // totalPages.value = data.totalPages;
      
      // 模拟数据
      posts.value = Array(10).fill().map((_, i) => ({
        id: i + 1 + ((currentPage.value - 1) * 10),
        title: `文章标题 #${i + 1 + ((currentPage.value - 1) * 10)}`,
        author: '用户名',
        publishDate: new Date().toISOString(),
        excerpt: '这是文章摘要，简单介绍文章的内容...',
        likes: Math.floor(Math.random() * 100),
        comments: Math.floor(Math.random() * 20)
      }));
      totalPages.value = 5;
    } catch (error) {
      console.error('获取文章列表失败:', error);
    }
  }
  
  onMounted(() => {
    fetchPosts();
  });
  </script>
  
  <style lang="scss" scoped>
  .posts-container {
    max-width: 900px;
    margin: 0 auto;
  }
  
  .page-title {
    margin-bottom: 1.5rem;
    font-size: 2rem;
  }
  
  .posts-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .post-card {
    background-color: rgba(255, 255, 255, 0.7);
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: transform 0.2s, box-shadow 0.2s;
    
    &:hover {
      transform: translateY(-5px);
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
    margin-bottom: 1rem;
  }
  
  .post-excerpt {
    margin-bottom: 1rem;
    color: #333;
  }
  
  .post-stats {
    display: flex;
    gap: 1rem;
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
  
  .read-more {
    color: #3498db;
    text-decoration: none;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
    
    button {
      padding: 0.5rem 1rem;
      border: none;
      background-color: #3498db;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      
      &:disabled {
        background-color: #ccc;
        cursor: not-allowed;
      }
      
      &:hover:not(:disabled) {
        background-color: #2980b9;
      }
    }
    
    .page-number {
      font-weight: bold;
    }
  }
  </style>