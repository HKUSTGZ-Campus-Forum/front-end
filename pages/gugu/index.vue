<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import { useHead } from "#imports";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";

// 设置页面元信息
useHead({
  title: "咕咕聊天室 - UniKorn 科广汇",
  meta: [
    {
      name: "description",
      content: "实时聊天，与同学们分享生活点滴，畅聊学习心得",
    },
  ],
});

// Composables
const { isLoggedIn, user } = useAuth();
const { fetchWithAuth, fetchPublic, getApiUrl } = useApi();

// 响应式数据
const messages = ref([]);
const newMessage = ref("");
const isLoading = ref(true);
const isSending = ref(false);
const error = ref("");
const chatContainer = ref(null);
const refreshInterval = ref(null);
const hasNewMessages = ref(false);

// 接口类型定义
interface GuguMessage {
  id: number;
  content: string;
  author: string;
  author_id?: number;
  author_avatar?: string;
  created_at: string;
}

// 获取聊天消息
const fetchMessages = async (isInitialLoad = false) => {
  try {
    const response = await fetchPublic(
      getApiUrl("/api/gugu/messages?limit=50")
    );

    if (response.ok) {
      const data = await response.json();
      const newMessages = data.messages || [];
      
      // 检查是否有新消息（非初次加载时）
      if (!isInitialLoad && messages.value.length > 0) {
        const oldMessageIds = new Set(messages.value.map(m => m.id));
        const hasNewContent = newMessages.some(m => !oldMessageIds.has(m.id));
        if (hasNewContent) {
          hasNewMessages.value = true;
        }
      }
      
      messages.value = newMessages;
      error.value = "";
      
      // 只在初次加载或发送消息后滚动到底部
      if (isInitialLoad) {
        nextTick(() => {
          scrollToBottom();
        });
      }
    } else {
      console.log("咕咕消息获取失败，可能服务还未实现");
      // 为演示目的，创建一些示例消息
      messages.value = [];
    }
  } catch (err) {
    console.log("咕咕消息网络请求失败，可能服务还未实现");
    messages.value = [];
  } finally {
    isLoading.value = false;
  }
};

// 发送消息
const sendMessage = async () => {
  if (!isLoggedIn.value) {
    alert("请先登录后再发送消息");
    return;
  }

  if (!newMessage.value.trim()) {
    return;
  }

  const messageContent = newMessage.value.trim();
  newMessage.value = "";
  isSending.value = true;

  try {
    const response = await fetchWithAuth(
      getApiUrl("/api/gugu/messages"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: messageContent,
        }),
      }
    );

    if (response.ok) {
      // 成功发送，重新获取消息并滚动到底部
      hasNewMessages.value = false; // 清除新消息指示器
      await fetchMessages(true); // 标记为初始加载以触发滚动
    } else {
      throw new Error("发送失败");
    }
  } catch (err) {
    console.error("发送消息失败:", err);
    // 恢复消息内容
    newMessage.value = messageContent;
    alert("发送失败，请重试");
  } finally {
    isSending.value = false;
  }
};

// 滚动到底部
const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

// 处理点击新消息指示器
const handleNewMessagesClick = () => {
  scrollToBottom();
  hasNewMessages.value = false;
};

// 处理滚动事件
const handleScroll = () => {
  if (!chatContainer.value) return;
  
  const { scrollTop, scrollHeight, clientHeight } = chatContainer.value;
  
  // 当用户滚动到接近底部时，自动隐藏新消息指示器
  const nearBottom = scrollHeight - scrollTop - clientHeight < 50;
  if (nearBottom && hasNewMessages.value) {
    hasNewMessages.value = false;
  }
};

// 格式化时间
const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 处理键盘事件
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
};

// 生命周期
onMounted(() => {
  fetchMessages(true); // 初次加载时滚动到底部
  
  // 设置定时刷新（每10秒）
  refreshInterval.value = setInterval(() => {
    fetchMessages(false); // 定时刷新时保持用户位置
  }, 10 * 1000);
});

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});
</script>

<template>
  <HomeContainer>
    <div class="gugu-chat">
      <!-- 聊天头部 -->
      <div class="chat-header">
        <div class="header-content">
          <h1 class="chat-title">
            <span>💬</span>
            咕咕聊天室
          </h1>
          <div class="chat-info">
            <span class="live-indicator">
              <span class="live-dot"></span>
              实时聊天
            </span>
            <span class="online-count">{{ messages.length > 0 ? '有消息' : '暂无消息' }}</span>
          </div>
        </div>
      </div>

      <!-- 聊天容器 -->
      <div class="chat-container">
        <!-- 消息区域 -->
        <div ref="chatContainer" class="messages-area" @scroll="handleScroll">
          <!-- 新消息指示器 -->
          <div 
            v-if="hasNewMessages" 
            @click="handleNewMessagesClick"
            class="new-messages-indicator"
          >
            <i class="fas fa-arrow-down"></i>
            <span>有新消息</span>
          </div>

          <!-- 加载状态 -->
          <div v-if="isLoading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>正在加载聊天记录...</p>
          </div>

          <!-- 无消息状态 -->
          <div v-else-if="messages.length === 0" class="empty-state">
            <span>💬</span>
            <h3>欢迎来到咕咕聊天室！</h3>
            <p>这里是实时聊天区域，快来和同学们聊天吧！</p>
          </div>

          <!-- 消息列表 -->
          <div v-else class="messages-list">
            <div
              v-for="message in messages"
              :key="message.id"
              class="message-item"
              :class="{ 'own-message': message.author_id === user?.id }"
            >
              <!-- Avatar - always present, positioned by CSS -->
              <div class="message-avatar">
                <UserAvatar
                  v-if="message.author_id === user?.id"
                  :avatar-url="message.author_avatar || user?.profile_picture_url"
                  :username="message.author || user?.username"
                  :user-id="message.author_id"
                  size="sm"
                  :clickable="true"
                />
                <UserAvatar
                  v-else
                  :avatar-url="message.author_avatar"
                  :username="message.author"
                  :user-id="message.author_id"
                  size="sm"
                  :clickable="true"
                />
              </div>
              
              <!-- Message content -->
              <div class="message-content">
                <!-- Header for other users' messages -->
                <div class="message-header" v-if="message.author_id !== user?.id">
                  <span class="message-author">{{ message.author || '匿名用户' }}</span>
                  <span class="message-time">{{ formatTime(message.created_at) }}</span>
                </div>
                
                <!-- Header for own messages -->
                <div class="message-header own-header" v-else>
                  <span class="message-time">{{ formatTime(message.created_at) }}</span>
                  <span class="message-author-own">我</span>
                </div>
                
                <div class="message-bubble">
                  <p class="message-text">{{ message.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-area">
          <div v-if="!isLoggedIn" class="login-prompt">
            <p>请先登录后再发送消息</p>
            <NuxtLink to="/login" class="btn btn-primary">登录</NuxtLink>
          </div>
          
          <div v-else class="message-input-container">
            <div class="input-wrapper">
              <textarea
                v-model="newMessage"
                @keydown="handleKeydown"
                placeholder="输入消息..."
                class="message-input"
                :disabled="isSending"
                rows="1"
              ></textarea>
              <button
                @click="sendMessage"
                :disabled="!newMessage.trim() || isSending"
                class="send-button"
                :class="{ sending: isSending }"
              >
                <span v-if="isSending">
                  <i class="fas fa-spinner fa-spin"></i>
                  发送中...
                </span>
                <span v-else>咕了个咕～</span>
              </button>
            </div>
            <p class="input-hint">按 Enter 发送消息，Shift + Enter 换行</p>
          </div>
        </div>
      </div>
    </div>
  </HomeContainer>
</template>

<style lang="scss" scoped>
.gugu-chat {
  max-width: 1000px;
  margin: 0 auto;
  padding: 1rem;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
}

.chat-header {
  background: var(--card-bg);
  border-radius: 12px 12px 0 0;
  padding: 1.5rem 2rem;
  box-shadow: var(--shadow-small);
  border-bottom: 1px solid var(--border-primary);

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .chat-title {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;

    span {
      font-size: 1.5rem;
    }
  }

  .chat-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    
    .live-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--semantic-success);
      font-size: 0.875rem;
      font-weight: 500;

      .live-dot {
        width: 8px;
        height: 8px;
        background: var(--semantic-success);
        border-radius: 50%;
        animation: pulse 2s infinite;
      }
    }

    .online-count {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
  }
}

.chat-container {
  background: var(--card-bg);
  border-radius: 0 0 12px 12px;
  box-shadow: var(--shadow-medium);
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  position: relative; // Added for absolute positioning of indicator
  
  .new-messages-indicator {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--interactive-primary);
    color: var(--text-inverse);
    padding: 0.75rem 1.5rem;
    border-radius: 25px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: var(--shadow-large);
    transition: all 0.3s ease;
    animation: pulse-glow 2s infinite;
    
    &:hover {
      background: var(--interactive-hover);
      transform: translateX(-50%) translateY(-3px);
      box-shadow: var(--shadow-large), 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    
    i {
      font-size: 0.8rem;
      animation: bounce 1.5s infinite;
    }
  }
  
  .loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: var(--text-muted);

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid var(--border-secondary);
      border-top: 4px solid var(--interactive-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 1rem;
    }

    span {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.6;
    }

    h3 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
    }

    p {
      margin: 0;
      font-size: 0.9rem;
    }
  }

  .messages-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .message-item {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    margin-bottom: 0.75rem;
    width: 100%;

    &.own-message {
      flex-direction: row-reverse;
      
      .message-content {
        align-items: flex-end;
        max-width: 75%;
        
        .message-bubble {
          background: var(--interactive-primary);
          color: var(--text-inverse);
          border-radius: 16px 4px 16px 16px;
        }

        .message-time-container {
          text-align: right;
        }
      }
    }

    &:not(.own-message) {
      .message-content {
        max-width: 75%;
      }
      
      .message-bubble {
        background: var(--surface-secondary);
        color: var(--text-primary);
        border-radius: 4px 16px 16px 16px;
      }

      .message-time-container {
        text-align: left;
      }
    }

    .message-avatar {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
    }

    .message-content {
      display: flex;
      flex-direction: column;
      flex-shrink: 1;
      min-width: 0;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 0.25rem;
      width: fit-content;
      min-width: 120px;

      .message-author {
        font-weight: 600;
        color: var(--interactive-primary);
        font-size: 0.875rem;
      }

      .message-time {
        font-size: 0.75rem;
        color: var(--text-muted);
        flex-shrink: 0;
        margin-left: 1rem;
      }

      &.own-header {
        justify-content: flex-end;
        
        .message-author-own {
          font-weight: 600;
          color: var(--interactive-primary);
          font-size: 0.875rem;
          margin-left: 1rem;
        }
      }
    }

    // Ensure bubble width is independent of header
    &:not(.own-message) .message-content {
      .message-header {
        position: relative;
        width: auto;
        min-width: 0;
      }
      
      .message-bubble {
        width: fit-content;
        min-width: 0;
      }
    }

    .message-bubble {
      padding: 0.5rem 0.75rem;
      position: relative;
      box-shadow: var(--shadow-small);
      display: inline-block;
      max-width: 100%;
      min-width: fit-content;
      word-wrap: break-word;
      border-radius: 16px;

      .message-text {
        margin: 0;
        line-height: 1.4;
        word-wrap: break-word;
        white-space: pre-wrap;
      }

      .message-time-own {
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.7);
        margin-top: 0.25rem;
        display: block;
        text-align: right;
      }
    }
  }
}

.input-area {
  border-top: 1px solid var(--border-primary);
  padding: 1rem;
  
  .login-prompt {
    text-align: center;
    padding: 1rem;
    
    p {
      margin: 0 0 1rem 0;
      color: var(--text-secondary);
    }
  }

  .message-input-container {
    .input-wrapper {
      display: flex;
      gap: 0.75rem;
      align-items: flex-end;
    }

    .message-input {
      flex: 1;
      padding: 0.75rem 1rem;
      border: 1px solid var(--border-primary);
      border-radius: 20px;
      background: var(--surface-primary);
      color: var(--text-primary);
      font-size: 0.9rem;
      resize: none;
      max-height: 120px;
      font-family: inherit;

      &:focus {
        outline: none;
        border-color: var(--interactive-primary);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      &::placeholder {
        color: var(--text-muted);
      }
    }

    .send-button {
      padding: 0.75rem 1.5rem;
      background: var(--interactive-primary);
      color: var(--text-inverse);
      border: none;
      border-radius: 20px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      white-space: nowrap;

      &:hover:not(:disabled) {
        background: var(--interactive-hover);
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
      }
      
      &.sending {
        background: var(--interactive-hover);
        
        i {
          margin-right: 0.25rem;
        }
      }
    }

    .input-hint {
      margin: 0.5rem 0 0 0;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-align: center;
    }
  }
}

@keyframes pulse-glow {
  0% {
    box-shadow: var(--shadow-large);
  }
  50% {
    box-shadow: var(--shadow-large), 0 0 25px rgba(59, 130, 246, 0.4);
  }
  100% {
    box-shadow: var(--shadow-large);
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-4px);
  }
  60% {
    transform: translateY(-2px);
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 响应式设计
@media (max-width: 768px) {
  .gugu-chat {
    padding: 0;
    height: calc(100vh - 100px);
  }

  .chat-header {
    border-radius: 0;
    padding: 1rem 1.5rem;

    .header-content {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .chat-title {
      font-size: 1.5rem;
    }

    .chat-info {
      gap: 0.75rem;
    }
  }

  .chat-container {
    border-radius: 0;
  }

  .messages-area {
    padding: 0.75rem;

    .message-item {
      .message-content {
        max-width: 85%;
      }
    }
  }

  .input-area {
    padding: 0.75rem;

    .message-input-container {
      .input-wrapper {
        flex-direction: column;
        gap: 0.5rem;
      }

      .send-button {
        align-self: flex-end;
        padding: 0.6rem 1.25rem;
      }
    }
  }
}

@media (max-width: 480px) {
  .chat-header {
    padding: 0.75rem 1rem;

    .chat-title {
      font-size: 1.25rem;
    }
  }

  .messages-area {
    .message-item {
      gap: 0.5rem;

      .message-content {
        max-width: 90%;
      }

      .message-bubble {
        padding: 0.6rem 0.8rem;
      }
    }
  }

  .input-area {
    padding: 0.5rem;
  }
}

// 滚动条样式
.messages-area::-webkit-scrollbar {
  width: 6px;
}

.messages-area::-webkit-scrollbar-track {
  background: var(--surface-secondary);
  border-radius: 3px;
}

.messages-area::-webkit-scrollbar-thumb {
  background: var(--border-primary);
  border-radius: 3px;

  &:hover {
    background: var(--text-muted);
  }
}
</style>