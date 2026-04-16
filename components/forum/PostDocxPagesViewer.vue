<template>
  <div class="post-docx-viewer">
    <p v-if="errorMsg" class="post-docx-viewer__error">{{ errorMsg }}</p>
    <template v-else>
      <div v-if="loading" class="post-docx-viewer__hint">加载 Word 文档…</div>
      <template v-else>
        <div v-if="pageCount > 1" class="post-docx-viewer__toolbar">
          <button
            type="button"
            class="post-docx-viewer__btn"
            :disabled="currentPage <= 0"
            @click="goPrev"
          >
            上一页
          </button>
          <span class="post-docx-viewer__page">{{ currentPage + 1 }} / {{ pageCount }}</span>
          <button
            type="button"
            class="post-docx-viewer__btn"
            :disabled="currentPage >= pageCount - 1"
            @click="goNext"
          >
            下一页
          </button>
        </div>
        <div ref="styleHost" class="post-docx-viewer__style-host" />
        <div ref="bodyHost" class="post-docx-viewer__body" />
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

const props = defineProps<{
  url: string;
}>();

const loading = ref(true);
const errorMsg = ref("");
const bodyHost = ref<HTMLElement | null>(null);
const styleHost = ref<HTMLElement | null>(null);
const pageCount = ref(1);
const currentPage = ref(0);

let pageElements: HTMLElement[] = [];

function applyPageVisibility() {
  pageElements.forEach((el, i) => {
    el.style.display = i === currentPage.value ? "block" : "none";
  });
}

function goPrev() {
  if (currentPage.value <= 0) return;
  currentPage.value -= 1;
  applyPageVisibility();
}

function goNext() {
  if (currentPage.value >= pageCount.value - 1) return;
  currentPage.value += 1;
  applyPageVisibility();
}

async function loadDocx() {
  errorMsg.value = "";
  loading.value = true;
  pageElements = [];
  currentPage.value = 0;
  pageCount.value = 1;

  if (!import.meta.client) {
    loading.value = false;
    return;
  }
  if (!props.url?.trim()) {
    loading.value = false;
    errorMsg.value = "无效的文档地址";
    return;
  }

  const body = bodyHost.value;
  const style = styleHost.value;
  if (!body || !style) {
    loading.value = false;
    return;
  }

  try {
    body.innerHTML = "";
    style.innerHTML = "";
    const res = await fetch(props.url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();

    const { renderAsync } = await import("docx-preview");
    await renderAsync(blob, body, style, {
      className: "docx",
      breakPages: true,
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      renderHeaders: true,
      renderFooters: true,
    });

    await nextTick();

    const sections = body.querySelectorAll<HTMLElement>(".docx-wrapper > section.docx");
    if (sections.length > 0) {
      pageElements = [...sections];
    } else {
      const wrap = body.querySelector<HTMLElement>(".docx-wrapper");
      if (wrap) pageElements = [wrap];
      else pageElements = [body];
    }

    pageCount.value = Math.max(1, pageElements.length);
    currentPage.value = 0;
    applyPageVisibility();
  } catch {
    errorMsg.value =
      "无法预览该 DOCX（请尝试下载后本地打开，或检查存储跨域设置）。";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.url,
  () => {
    void loadDocx();
  },
  { immediate: true }
);
</script>

<style scoped>
.post-docx-viewer {
  width: 100%;
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 8px;
  padding: 12px;
  background: var(--surface-secondary, #f3f4f6);
}

.post-docx-viewer__error {
  color: var(--semantic-error, #b91c1c);
  margin: 0;
  font-size: 0.9rem;
}

.post-docx-viewer__hint {
  margin: 0;
  color: var(--text-secondary, #6b7280);
  font-size: 0.9rem;
}

.post-docx-viewer__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.post-docx-viewer__btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border-primary, #d1d5db);
  background: var(--surface-primary, #fff);
  cursor: pointer;
  font-size: 0.875rem;
}

.post-docx-viewer__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.post-docx-viewer__page {
  font-size: 0.875rem;
  color: var(--text-secondary, #4b5563);
}

.post-docx-viewer__style-host {
  display: none;
}

.post-docx-viewer__body {
  max-height: 70vh;
  overflow: auto;
  border-radius: 6px;
  background: #9ca3af;
  padding: 8px;
}

.post-docx-viewer__body :deep(.docx-wrapper) {
  min-height: 200px;
}
</style>
