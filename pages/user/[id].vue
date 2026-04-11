<script setup lang="ts">
import { useRoute } from 'vue-router'

definePageMeta({
  layout: 'keguang',
})

useHead({
  title: '用户页面跳转中 - UniKorn Campus',
})

const route = useRoute()

onMounted(async () => {
  const id = route.params.id
  if (!id) {
    await navigateTo('/forum', { replace: true })
    return
  }

  const normalizedId = Array.isArray(id) ? id[0] : id
  await navigateTo(`/users/${normalizedId}`, { replace: true })
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
