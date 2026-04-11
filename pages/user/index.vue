<script setup lang="ts">
definePageMeta({
  layout: 'keguang',
})

useHead({
  title: '用户页面跳转中 - UniKorn Campus',
})

onMounted(async () => {
  await navigateTo('/profile', { replace: true })
})
</script>

<template>
  <div class="route-redirect-placeholder">正在跳转...</div>
</template>

<style scoped>
.route-redirect-placeholder {
  min-height: 30vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b8aaa;
}
</style>
