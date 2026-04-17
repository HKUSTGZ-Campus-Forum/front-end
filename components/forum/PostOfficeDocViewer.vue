<template>
  <div class="post-office-doc">
    <p class="post-office-doc__hint">
      旧版 .doc 使用 Microsoft 在线预览（需文件地址可被外网访问）。若无法显示，请使用下方下载。
    </p>
    <iframe
      v-if="embedUrl"
      class="post-office-doc__frame"
      title="Word 在线预览"
      referrerpolicy="strict-origin-when-cross-origin"
      :src="embedUrl"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  url: string;
  originalFilename?: string | null;
}>();

const embedUrl = computed(() => {
  if (!props.url?.trim()) return "";
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(props.url)}`;
});
</script>

<style scoped>
.post-office-doc {
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 8px;
  padding: 12px;
  background: var(--surface-secondary, #f9fafb);
}

.post-office-doc__hint {
  margin: 0 0 10px;
  font-size: 0.8rem;
  color: var(--text-secondary, #6b7280);
  line-height: 1.4;
}

.post-office-doc__frame {
  width: 100%;
  min-height: 560px;
  border: none;
  border-radius: 6px;
  background: #fff;
}
</style>
