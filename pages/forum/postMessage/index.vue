<script setup>
import { useRouter } from "vue-router";
import PostMessage from "~/components/forum/PostMessage.vue";

definePageMeta({ layout: 'keguang' });

const router = useRouter();

const handlePostSuccess = (postId) => {
  setTimeout(() => {
    router.push(`/forum/posts/${postId}`);
  }, 1000);
};
</script>

<template>
  <div class="kg-post-message">
    <div class="kg-back-bar">
      <NuxtLink to="/forum" class="kg-back-link">
        <ForumUiIcon name="back" class="kg-back-link__icon" />
        <span>返回论坛</span>
      </NuxtLink>
    </div>
    <div class="kg-card">
      <h1 class="kg-page-title">发布帖子</h1>
      <PostMessage @post-success="handlePostSuccess" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-post-message {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 20px 20px 60px;
}

.kg-back-bar {
  margin-bottom: 16px;
}

.kg-back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #26a4ff;
  text-decoration: none;
  font-size: 0.9rem;
  &:hover { text-decoration: underline; }
}

.kg-back-link__icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.kg-card {
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
  padding: 28px 32px;
}

.kg-page-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 24px;
}
</style>
