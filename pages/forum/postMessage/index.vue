<template>
    <HomeContainer>
      <div class="post-message-container">
        <h1 class="page-title">发布新帖</h1>
        <PostMessage @post-success="handlePostSuccess" />
      </div>
    </HomeContainer>
  </template>
  
  <script setup>
  import { useRouter } from 'vue-router';
  import PostMessage from '~/components/forum/PostMessage.vue';
  
  const router = useRouter();
  
  // 处理发帖成功
  const handlePostSuccess = (postId) => {
    // 发帖成功后跳转到帖子详情页
    setTimeout(() => {
      router.push(`/forum/post/${postId}`);
    }, 1000);
  };
  </script>
  
  <style lang="scss" scoped>
  .post-message-container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  }
  
  .page-title {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #333;
    font-size: 1.8rem;
    font-weight: 600;
  }
  </style>