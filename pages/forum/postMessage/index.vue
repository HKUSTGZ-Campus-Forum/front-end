<template>
  <HomeContainer>
    <div class="post-message-container">
      <h1 class="page-title">发布新帖</h1>
      <PostMessage @post-success="handlePostSuccess" />
    </div>
  </HomeContainer>
</template>

<script setup>
import { useRouter } from "vue-router";
import PostMessage from "~/components/forum/PostMessage.vue";

const router = useRouter();

// 处理发帖成功
const handlePostSuccess = (postId) => {
  // 发帖成功后跳转到帖子详情页
  setTimeout(() => {
    router.push(`/forum/posts/${postId}`);
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
  
  // Mobile optimizations
  @media (max-width: 480px) {
    margin: 0;
    padding: 1rem;
    border-radius: 0;
    box-shadow: none;
    background-color: #fff;
    min-height: calc(100vh - 60px); // Account for navigation
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    margin: 1rem;
    padding: 1.5rem;
    border-radius: 6px;
  }
  
  @media (min-width: 769px) and (max-width: 1024px) {
    margin: 1.5rem auto;
    padding: 1.75rem;
  }
}

.page-title {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
  font-size: 1.8rem;
  font-weight: 600;
  
  // Mobile typography adjustments
  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-bottom: 1.25rem;
    padding: 0 0.5rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    font-size: 1.65rem;
    margin-bottom: 1.375rem;
  }
  
  @media (min-width: 769px) and (max-width: 1024px) {
    font-size: 1.75rem;
  }
}
</style>
