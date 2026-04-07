<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";
import CarouselBanner from "~/components/home/CarouselBanner.vue";
import PostCardGrid from "~/components/home/PostCardGrid.vue";

const router = useRouter();
const { fetchWithAuth, fetchPublic } = useApi();
const { isLoggedIn } = useAuth();

// ── 热门帖子 ───────────────────────────────────────────────────────
const hotPosts = ref([]);
const isLoading = ref(true);

const fetchHotPosts = async () => {
  try {
    const { getApiUrl } = useApi();
    const response = await fetchPublic(
      getApiUrl("/api/analytics/hot-posts?limit=8&hours=72")
    );
    if (response.ok) {
      const data = await response.json();
      hotPosts.value = data.hot_posts || [];
    }
  } catch {
    // 静默失败，保留空列表
  } finally {
    isLoading.value = false;
  }
};

// ── 咕咕消息 ──────────────────────────────────────────────────────
const kgAllGuguMessages = ref<any[]>([]);
const kgGuguDisplayCount = ref(6);
const kgGuguLoading = ref(false);
const kgGuguInputText = ref('');
const kgGuguSending = ref(false);

const fetchKgGuguMessages = async () => {
  kgGuguLoading.value = true;
  try {
    const { getApiUrl } = useApi();
    const response = await fetchPublic(getApiUrl('/api/gugu/recent?limit=100'));
    if (response.ok) {
      const data = await response.json();
      kgAllGuguMessages.value = data.messages || [];
    }
  } catch {
    kgAllGuguMessages.value = [];
  } finally {
    kgGuguLoading.value = false;
  }
};

const sendKgGuguMessage = async () => {
  const text = kgGuguInputText.value.trim();
  if (!text) return;

  if (!isLoggedIn.value) {
    router.push('/login');
    return;
  }

  kgGuguSending.value = true;
  try {
    const { getApiUrl } = useApi();
    const response = await fetchWithAuth(getApiUrl('/api/gugu/messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        kgAllGuguMessages.value.unshift(data.data);
        kgGuguInputText.value = '';
      }
    }
  } catch (err) {
    console.error('发送咕咕消息失败', err);
  } finally {
    kgGuguSending.value = false;
  }
};

const kgLoadMoreMessages = () => {
  kgGuguDisplayCount.value += 6;
};

// ── 工具函数 ──────────────────────────────────────────────────────
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN");
};

const goToGugu = () => router.push("/gugu");

onMounted(() => {
  fetchHotPosts();
  fetchKgGuguMessages();
});
</script>

<template>
  <div class="kg-home">

    <!-- Section 1：轮播横幅 + 相关链接 -->
    <div class="kg-card kg-top-card">
      <div class="kg-banner-row">
        <div class="kg-carousel-wrap">
          <CarouselBanner />
        </div>
        <div class="kg-links-panel">
          <p class="kg-links-title">相关链接</p>
          <a href="https://wiki.hkust-gz.top/en/home" target="_blank" class="kg-link-btn">科广Wiki</a>
          <a href="https://myportal.hkust-gz.edu.cn" target="_blank" class="kg-link-btn">myPortal</a>
          <a href="https://hkust-gz.instructure.com" target="_blank" class="kg-link-btn">Canvas</a>
        </div>
      </div>
    </div>

    <!-- Section 2：热门帖子卡片网格 -->
    <div class="kg-card kg-posts-card">
      <PostCardGrid :posts="hotPosts.slice(0, 3)" :loading="isLoading" />
    </div>

    <!-- Section 3：咕咕聊天预览（内嵌展示） -->
    <div class="kg-card kg-chat-card">
      <h2 class="kg-chat-title">聊聊新鲜事儿～咕咕</h2>

      <!-- 输入区 -->
      <div class="kg-chat-input-row">
        <textarea
          class="kg-chat-input"
          v-model="kgGuguInputText"
          placeholder="写下你想说的话吧......"
          rows="2"
          @keydown.enter.exact.prevent="sendKgGuguMessage"
          @keydown.enter.shift.exact="() => {}"
        />
        <button
          class="kg-chat-send-btn"
          @click="sendKgGuguMessage"
          :disabled="kgGuguSending"
        >咕了个咕～</button>
      </div>

      <!-- 消息列表：时间降序，最新在上 -->
      <div class="kg-messages-list">
        <div v-if="kgGuguLoading" class="kg-msg-placeholder">加载消息中...</div>
        <div v-else-if="kgAllGuguMessages.length === 0" class="kg-msg-placeholder">
          还没有消息，快来发第一条吧！
        </div>
        <template v-else>
          <div
            v-for="msg in kgAllGuguMessages.slice(0, kgGuguDisplayCount)"
            :key="msg.id"
            class="kg-message-item"
          >
            <div class="kg-msg-avatar">
              <img v-if="msg.author_avatar" :src="msg.author_avatar" :alt="msg.author" />
            </div>
            <div class="kg-msg-body">
              <div class="kg-msg-meta">
                <span class="kg-msg-author">{{ msg.author || '匿名用户' }}</span>
                <span class="kg-msg-time">{{ formatTimeAgo(msg.created_at) }}</span>
                <span class="kg-msg-reply" @click="goToGugu">回复</span>
              </div>
              <div class="kg-msg-text">{{ msg.content }}</div>
            </div>
          </div>

          <!-- 加载更多 / 已到尽头 -->
          <div
            v-if="kgGuguDisplayCount < kgAllGuguMessages.length"
            class="kg-view-more-chat"
            @click="kgLoadMoreMessages"
          >查看更多历史消息</div>
          <div v-else class="kg-no-more-chat">已显示全部历史消息</div>
        </template>
      </div>
    </div>

  </div><!-- /.kg-home -->
</template>

<style lang="scss" scoped>
// ── 页面容器 ──────────────────────────────────────────────────────
.kg-home {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 20px 24px 55px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

// ── 公用卡片壳 ───────────────────────────────────────────────────
.kg-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
}

// ═══════════════════════════════════════════
// Section 1：轮播横幅 + 相关链接
// ═══════════════════════════════════════════
.kg-top-card {
  padding: 20px;
}

.kg-banner-row {
  display: grid;
  grid-template-columns: 1fr 196px;
  gap: 16px;
  align-items: stretch;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
}

.kg-carousel-wrap {
  min-width: 0;
  border-radius: 12px;
  overflow: hidden;

  :deep(.carousel-banner) {
    border-radius: 12px;
  }
}

.kg-links-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.kg-links-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a2a4a;
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef5ff;
}

.kg-link-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #c8dff8;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1a2a4a;
  background: #FFFFFF;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    background: #d7edf9;
    border-color: #26a4ff;
    color: #1278c4;
  }
}

// ═══════════════════════════════════════════
// Section 2：热门帖子
// ═══════════════════════════════════════════
.kg-posts-card {
  padding: 20px 20px 16px;
}

// ═══════════════════════════════════════════
// Section 3：咕咕聊天
// ═══════════════════════════════════════════
.kg-chat-card {
  padding: 20px;
}

.kg-chat-title {
  display: inline-block;
  font-size: 1rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 16px;
}

.kg-chat-input-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.kg-chat-input {
  width: 100%;
  padding: 10px 14px 10px 36px;
  border-radius: 8px;
  border: 1px solid #c8dff8;
  background: #FFFFFF;
  font-size: 0.875rem;
  color: #4a6080;
  outline: none;
  min-height: 42px;
  max-height: 120px;
  resize: none;
  overflow-y: auto;
  line-height: 1.5;
  transition: border-color 0.15s;
  box-sizing: border-box;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a0b8cc' stroke-width='2'%3E%3Cpath d='M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px 12px;

  &::placeholder { color: #a0b8cc; }
  &:focus { border-color: #8b9de8; }
}

.kg-chat-send-btn {
  align-self: flex-end;
  height: 36px;
  padding: 0 22px;
  border-radius: 18px;
  background: #9EAAF4;
  color: white;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, opacity 0.15s;
  letter-spacing: 0.02em;

  &:hover  { background: #8896ec; }
  &:active { background: #7480e0; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.kg-messages-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kg-msg-placeholder {
  text-align: center;
  color: #4a6080;
  padding: 24px;
  font-size: 0.875rem;
}

.kg-message-item {
  display: flex;
  gap: 10px;
  padding: 4px 0;
}

.kg-msg-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #c8ced8;
  flex-shrink: 0;
  margin-top: 8px;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.kg-msg-body {
  flex: 1;
  min-width: 0;
  position: relative;
  background: #BFD7FB;
  border-radius: 12px;
  border: 1.5px solid #BFD7FB;
  overflow: visible;

  &::before {
    content: '';
    position: absolute;
    left: -8px;
    top: 14px;
    width: 0;
    height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-right: 8px solid #BFD7FB;
  }
}

.kg-msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  background: transparent;
  padding: 9px 14px 7px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.55);
}

.kg-msg-author {
  font-weight: 600;
  font-size: 0.85rem;
  color: #1a2458;
}

.kg-msg-time {
  font-size: 0.76rem;
  color: #5a6890;
}

.kg-msg-reply {
  font-size: 0.78rem;
  color: #4a5a9a;
  cursor: pointer;
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover { background: rgba(255, 255, 255, 0.45); }
}

.kg-msg-text {
  font-size: 0.875rem;
  color: #2a3a5a;
  line-height: 1.55;
  word-break: break-word;
  padding: 9px 14px 11px;
  background: #FFFFFF;
  border-radius: 0 0 10px 10px;
}

.kg-view-more-chat {
  text-align: center;
  padding: 12px;
  color: #6b8fe6;
  font-size: 0.85rem;
  cursor: pointer;
  border-top: 1px solid #f0f7ff;
  margin-top: 4px;
  transition: color 0.15s;

  &:hover {
    color: #5577d4;
    text-decoration: underline;
  }
}

.kg-no-more-chat {
  text-align: center;
  padding: 12px;
  color: #a0b8cc;
  font-size: 0.8rem;
  border-top: 1px solid #f0f7ff;
  margin-top: 4px;
}
</style>
