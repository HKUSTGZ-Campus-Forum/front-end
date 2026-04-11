<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useHead } from "#imports";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";

definePageMeta({ layout: 'keguang' });

useHead({
  title: "咕咕聊天室 - UniKorn 科广汇",
  meta: [{ name: "description", content: "实时聊天，与同学们分享生活点滴，畅聊学习心得" }],
});

const { isLoggedIn, user } = useAuth();
const { fetchWithAuth, fetchPublic, getApiUrl } = useApi();

const messages = ref([]);
const newMessage = ref("");
const isLoading = ref(true);
const isSending = ref(false);
const error = ref("");
const chatContainer = ref(null);
const refreshInterval = ref(null);
const hasNewMessages = ref(false);

interface GuguMessage {
  id: number;
  content: string;
  author: string;
  author_id?: number;
  author_avatar?: string;
  created_at: string;
}

const fetchMessages = async (isInitialLoad = false) => {
  try {
    const response = await fetchPublic(getApiUrl("/api/gugu/messages?limit=50"));
    if (response.ok) {
      const data = await response.json();
      const newMessages = data.messages || [];
      if (!isInitialLoad && messages.value.length > 0) {
        const oldMessageIds = new Set(messages.value.map(m => m.id));
        if (newMessages.some(m => !oldMessageIds.has(m.id))) hasNewMessages.value = true;
      }
      messages.value = newMessages;
      error.value = "";
      if (isInitialLoad) nextTick(() => { scrollToBottom(); });
    } else {
      messages.value = [];
    }
  } catch (err) {
    messages.value = [];
  } finally {
    isLoading.value = false;
  }
};

const sendMessage = async () => {
  if (!isLoggedIn.value) { alert("请先登录后再发送消息"); return; }
  if (!newMessage.value.trim()) return;
  const messageContent = newMessage.value.trim();
  newMessage.value = "";
  isSending.value = true;
  try {
    const response = await fetchWithAuth(getApiUrl("/api/gugu/messages"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: messageContent }),
    });
    if (response.ok) {
      hasNewMessages.value = false;
      await fetchMessages(true);
    } else { throw new Error("发送失败"); }
  } catch (err) {
    newMessage.value = messageContent;
    alert("发送失败，请重试");
  } finally {
    isSending.value = false;
  }
};

const scrollToBottom = () => {
  if (chatContainer.value) chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
};

const handleNewMessagesClick = () => {
  scrollToBottom();
  hasNewMessages.value = false;
};

const handleScroll = () => {
  if (!chatContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = chatContainer.value;
  if (scrollHeight - scrollTop - clientHeight < 50 && hasNewMessages.value) hasNewMessages.value = false;
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); }
};

onMounted(() => {
  fetchMessages(true);
  refreshInterval.value = setInterval(() => { fetchMessages(false); }, 10 * 1000);
});

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value);
});
</script>

<template>
  <div class="kg-gugu">
    <div class="kg-gugu-header">
      <h1 class="kg-page-title">咕咕聊天室</h1>
      <p class="kg-page-subtitle">与同学实时交流</p>
    </div>

    <div class="kg-gugu-layout">
      <div class="kg-card kg-chat-box">
        <div v-if="isLoading" class="kg-loading">
          <div class="kg-spinner"></div>
          <span>加载中...</span>
        </div>

        <div v-else>
          <div
            ref="chatContainer"
            class="kg-messages"
            @scroll="handleScroll"
          >
            <div v-if="messages.length === 0" class="kg-no-messages">
              <div class="kg-no-messages-icon">💬</div>
              <p>暂无消息，快来打个招呼吧！</p>
            </div>

            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['kg-msg', { 'kg-msg--self': user && msg.author_id === user.id }]"
            >
              <div class="kg-msg__avatar">
                <img v-if="msg.author_avatar" :src="msg.author_avatar" :alt="msg.author" />
                <div v-else class="kg-msg__avatar-placeholder">{{ msg.author?.charAt(0)?.toUpperCase() }}</div>
              </div>
              <div class="kg-msg__bubble-group">
                <div class="kg-msg__name">
                  {{ msg.author }}
                  <span class="kg-msg__time">{{ formatTime(msg.created_at) }}</span>
                </div>
                <div class="kg-msg__bubble">{{ msg.content }}</div>
              </div>
            </div>
          </div>

          <div v-if="hasNewMessages" class="kg-new-msg-indicator" @click="handleNewMessagesClick">
            ↓ 有新消息
          </div>
        </div>

        <div class="kg-input-area">
          <div v-if="!isLoggedIn" class="kg-login-hint">
            <NuxtLink to="/login" class="kg-link">登录</NuxtLink>后才能发送消息
          </div>
          <template v-else>
            <textarea
              v-model="newMessage"
              class="kg-msg-input"
              placeholder="说点什么...（Enter 发送，Shift+Enter 换行）"
              rows="2"
              :disabled="isSending"
              @keydown="handleKeydown"
            ></textarea>
            <button
              class="kg-send-btn"
              :disabled="isSending || !newMessage.trim()"
              @click="sendMessage"
            >
              {{ isSending ? '发送中...' : '发送' }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-gugu {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.kg-gugu-header {
  margin-bottom: 20px;
}

.kg-page-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 4px;
}

.kg-page-subtitle {
  font-size: 0.9rem;
  color: #4a6080;
  margin: 0;
}

.kg-card {
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
}

.kg-chat-box {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 200px);
  min-height: 500px;
  overflow: hidden;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: #4a6080;
  flex: 1;
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #c8dff8;
  border-top-color: #26a4ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.kg-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-behavior: smooth;
}

.kg-no-messages {
  text-align: center;
  padding: 40px;
  color: #9ab0c6;
  .kg-no-messages-icon { font-size: 2.5rem; margin-bottom: 8px; }
  p { margin: 0; font-size: 0.9rem; }
}

.kg-msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  &--self {
    flex-direction: row-reverse;
    .kg-msg__name { flex-direction: row-reverse; text-align: right; }
    .kg-msg__bubble {
      background: #26a4ff;
      color: #fff;
      border-radius: 16px 4px 16px 16px;
    }
  }
}

.kg-msg__avatar {
  flex-shrink: 0;
  img {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    object-fit: cover;
  }
}

.kg-msg__avatar-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #9EAAF4;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
}

.kg-msg__bubble-group {
  max-width: 70%;
}

.kg-msg__name {
  font-size: 0.78rem;
  color: #6a85a0;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.kg-msg__time {
  color: #9ab0c6;
  font-size: 0.72rem;
}

.kg-msg__bubble {
  background: #fff;
  border: 1.5px solid #c8dff8;
  border-radius: 4px 16px 16px 16px;
  padding: 8px 14px;
  font-size: 0.9rem;
  color: #1a2a4a;
  line-height: 1.5;
  word-break: break-word;
}

.kg-new-msg-indicator {
  text-align: center;
  padding: 8px;
  background: rgba(38, 164, 255, 0.1);
  color: #26a4ff;
  font-size: 0.85rem;
  cursor: pointer;
  border-top: 1px solid #c8dff8;
  &:hover { background: rgba(38, 164, 255, 0.15); }
}

.kg-input-area {
  padding: 16px 20px;
  border-top: 1.5px solid #c8dff8;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kg-login-hint {
  text-align: center;
  color: #6a85a0;
  font-size: 0.9rem;
  padding: 8px;
}

.kg-link {
  color: #26a4ff;
  text-decoration: none;
  font-weight: 600;
  &:hover { text-decoration: underline; }
}

.kg-msg-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #c8dff8;
  border-radius: 12px;
  background: #fff;
  color: #1a2a4a;
  font-size: 0.9rem;
  resize: none;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s;
  &:focus { border-color: #26a4ff; }
  &::placeholder { color: #9ab0c6; }
  &:disabled { opacity: 0.6; }
}

.kg-send-btn {
  align-self: flex-end;
  padding: 9px 28px;
  background: #26a4ff;
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  &:hover:not(:disabled) { background: #0d8de0; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
</style>
