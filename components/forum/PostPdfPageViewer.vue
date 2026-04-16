<template>
  <div class="post-pdf-viewer">
    <p v-if="errorMsg" class="post-pdf-viewer__error">{{ errorMsg }}</p>
    <template v-else>
      <!-- canvas 必须在加载过程中也挂在 DOM 里，否则 pdf.js 无法绘制 -->
      <div v-if="loading" class="post-pdf-viewer__hint">加载 PDF…</div>
      <div v-if="totalPages > 0" class="post-pdf-viewer__toolbar">
        <button
          type="button"
          class="post-pdf-viewer__btn"
          :disabled="loading || pageNum <= 1"
          @click="goPrev"
        >
          上一页
        </button>
        <span class="post-pdf-viewer__page">{{ pageNum }} / {{ totalPages }}</span>
        <button
          type="button"
          class="post-pdf-viewer__btn"
          :disabled="loading || pageNum >= totalPages"
          @click="goNext"
        >
          下一页
        </button>
      </div>
      <div class="post-pdf-viewer__canvas-wrap">
        <canvas ref="canvasRef" class="post-pdf-viewer__canvas" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, shallowRef, nextTick, onUnmounted } from "vue";
import { useApi } from "~/composables/useApi";

const props = defineProps<{
  url: string;
  fileId?: number;
}>();

const { fetchWithAuth, getApiUrl } = useApi();

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

async function fetchPdfData(): Promise<Uint8Array> {
  // 优先通过后端代理获取（避免 OSS CORS 问题）
  if (props.fileId) {
    const proxyUrl = getApiUrl(`/api/files/proxy/${props.fileId}`);
    const res = await fetchWithAuth(proxyUrl, {
      headers: { Accept: "application/pdf" },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buf = await res.arrayBuffer();
    if (!buf.byteLength) throw new Error("empty");
    return new Uint8Array(buf);
  }

  // 回退：直接请求 URL（兼容无 fileId 的场景）
  const res = await fetch(props.url, {
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  if (!buf.byteLength) throw new Error("empty");
  return new Uint8Array(buf);
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
  if (!props.fileId && !props.url?.trim()) {
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
    const data = await fetchPdfData();
    const task = pdfjs.getDocument({
      data,
      withCredentials: false,
    });
    const pdf = await task.promise;
    pdfDoc.value = pdf;
    totalPages.value = pdf.numPages || 0;
    if (totalPages.value < 1) {
      errorMsg.value = "PDF 无页面";
      return;
    }
    loading.value = false;
    await nextTick();
    await paintPage();
  } catch (err) {
    const hint =
      err instanceof TypeError
        ? "网络或跨域被拦截（请为 OSS 配置 CORS：允许本站 Origin，暴露 ETag / Content-Length 等头）。"
        : "无法解析或打开该 PDF，请确认文件未损坏，或尝试下载后本地打开。";
    errorMsg.value = `无法加载 PDF。${hint}`;
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
  const outputScale = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const cssScale = maxW / base.width;
  const viewport = page.getViewport({ scale: cssScale * outputScale });

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.style.width = `${Math.floor(viewport.width / outputScale)}px`;
  canvas.style.height = `${Math.floor(viewport.height / outputScale)}px`;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  // v5 解构：canvas 默认取自 canvasContext.canvas，必须提供 2d context
  await page
    .render({
      canvasContext: ctx,
      viewport,
      background: "rgb(255, 255, 255)",
    })
    .promise;
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
  () => [props.url, props.fileId],
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
