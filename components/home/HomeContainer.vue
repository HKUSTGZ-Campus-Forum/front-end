<script setup lang="ts">
// 从持久化的首页状态管理中获取 fold 状态变量
// storeToRefs 用于保持响应式引用
// usePersistHomeStore 是一个自定义的状态管理存储
const { fold } = storeToRefs(usePersistHomeStore());
</script>

<template>
  <!-- 渲染首页固定内容组件 -->
  <HomePinned />
  <HomeSildebar :folded="fold.updates" />
</template>
