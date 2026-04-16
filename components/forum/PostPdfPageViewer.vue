<template>
  <div class="post-pdf-viewer">
    <p v-if="errorMsg" class="post-pdf-viewer__error">{{ errorMsg }}</p>
    <template v-else>
      <div v-if="loading" class="post-pdf-viewer__hint">加载 PDF…</div>
      <template v-else>
        <div class="post-pdf-viewer__toolbar">
          <button
            type="button"
            class="post-pdf-viewer__btn"
            :disabled="pageNum <= 1"
            @click="goPrev"
          >
            上一页
          </button>
          <span class="post-pdf-viewer__page">{{ pageNum }} / {{ totalPages }}</span>
          <button
            type="button"
            class="post-pdf-viewer__btn"
            :disabled="pageNum >= totalPages"
            @click="goNext"
          >
            下一页
          </button>
        </div>
        <div class="post-pdf-viewer__canvas-wrap">
          <canvas ref="canvasRef" class="post-pdf-viewer__canvas" />
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, shallowRef, nextTick, onUnmounted } from "vue";

const props = defineProps<{
  url: string;
}>();

const loading = ref(true);
const errorMsg = ref("");
const pageNum = ref(1);
const totalPages = ref(0);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const pdfDoc = shallowRef<
  import("pdfjs-dist").PDFDocumentProxy | null
>(null);

let pdfjsModule: typeof import("pdfjs-dist") | null = null;

async function ensurePdfJs() {
  if (!import.meta.client) return null;
  if (pdfjsModule) return pdfjsModule;
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjsModule = await import("pdfjs-dist");
  pdfjsModule.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjsModule;
}

async function loadAndRender() {
  errorMsg.value = "";
  loading.value = true;
  pdfDoc.value = null;
  pageNum.value = 1;
  totalPages.value = 0;

  if (!import.meta.client) {
    loading.value = false;
    return;
  }
  if (!props.url?.trim()) {
    loading.value = false;
    errorMsg.value = "无效的 PDF 地址";
    return;
  }

  try {
    const pdfjs = await ensurePdfJs();
    if (!pdfjs) {
      errorMsg.value = "无法在服务端渲染 PDF";
      return;
    }
    const task = pdfjs.getDocument({
      url: props.url,
      withCredentials: false,
    });
    const pdf = await task.promise;
    pdfDoc.value = pdf;
    totalPages.value = pdf.numPages || 0;
    if (totalPages.value < 1) {
      errorMsg.value = "PDF 无页面";
      return;
    }
    await nextTick();
    await paintPage();
  } catch {
    errorMsg.value =
      "无法加载 PDF（若控制台有 CORS 报错，请在 OSS 为该 Bucket 配置允许本站域名的跨域）。";
  } finally {
    loading.value = false;
  }
}

async function paintPage() {
  const pdf = pdfDoc.value;
  const canvas = canvasRef.value;
  if (!pdf || !canvas || totalPages.value < 1) return;

  const page = await pdf.getPage(pageNum.value);
  const base = page.getViewport({ scale: 1 });
  const maxW = typeof window !== "undefined" ? Math.min(900, window.innerWidth - 48) : 900;
  const scale = maxW / base.width;
  const viewport = page.getViewport({ scale });

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
}

function goPrev() {
  if (pageNum.value <= 1) return;
  pageNum.value -= 1;
}

function goNext() {
  if (pageNum.value >= totalPages.value) return;
  pageNum.value += 1;
}

watch(
  () => props.url,
  () => {
    void loadAndRender();
  },
  { immediate: true }
);

watch(pageNum, () => {
  void paintPage();
});

onUnmounted(() => {
  void pdfDoc.value?.destroy?.();
  pdfDoc.value = null;
});
</script>

<style scoped>
.post-pdf-viewer {
  width: 100%;
  border: 1px solid var(--border-primary, #e5e7eb);
  border-radius: 8px;
  padding: 12px;
  background: var(--surface-secondary, #f9fafb);
}

.post-pdf-viewer__error {
  color: var(--semantic-error, #b91c1c);
  margin: 0;
  font-size: 0.9rem;
}

.post-pdf-viewer__hint {
  margin: 0;
  color: var(--text-secondary, #6b7280);
  font-size: 0.9rem;
}

.post-pdf-viewer__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.post-pdf-viewer__btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border-primary, #d1d5db);
  background: var(--surface-primary, #fff);
  cursor: pointer;
  font-size: 0.875rem;
}

.post-pdf-viewer__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.post-pdf-viewer__page {
  font-size: 0.875rem;
  color: var(--text-secondary, #4b5563);
}

.post-pdf-viewer__canvas-wrap {
  overflow: auto;
  max-width: 100%;
  border-radius: 6px;
  background: #525659;
  padding: 8px;
}

.post-pdf-viewer__canvas {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  height: auto;
}
</style>
