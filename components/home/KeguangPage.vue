<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";
import CarouselBanner from "~/components/home/CarouselBanner.vue";
import PostCardGrid from "~/components/home/PostCardGrid.vue";
import UserAvatar from "~/components/user/UserAvatar.vue";

const router = useRouter();
const { fetchWithAuth, fetchPublic } = useApi();
const { isLoggedIn } = useAuth();
const { t, locale } = useI18n();
const { getLocalePath } = useAppLocale();
const { formatRelativeTime } = useDateFormat();

const GUGU_INITIAL_LIMIT = 6;
const GUGU_PAGE_LIMIT = 20;
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
  } finally {
    isLoading.value = false;
  }
};

const kgAllGuguMessages = ref<any[]>([]);
const kgGuguLoading = ref(false);
const kgGuguLoadingOlder = ref(false);
const kgGuguHasMoreOlder = ref(false);
const kgGuguInputText = ref('');
const kgGuguSending = ref(false);
const kgChatInputRef = ref<HTMLTextAreaElement | null>(null);
const kgReplyTarget = ref<any | null>(null);

const relatedLinks = computed(() => [
  {
    key: "wiki",
    label: t("homePage.relatedLinks.wiki"),
    href: locale.value === "en" ? "https://wiki.hkust-gz.top/en/home" : "https://wiki.hkust-gz.top",
  },
  {
    key: "portal",
    label: t("homePage.relatedLinks.portal"),
    href: "https://myportal.hkust-gz.edu.cn",
  },
  {
    key: "canvas",
    label: t("homePage.relatedLinks.canvas"),
    href: "https://hkust-gz.instructure.com",
  },
]);

const getReplyDisplayName = (message: any) => message?.author || t("common.unknownAuthor");
const getReplyPreview = (message: any, maxLength = 60) => {
  const raw = String(message?.content || '').replace(/\s+/g, ' ').trim();
  if (!raw) return t("homePage.chat.replyUnavailable");
  return raw.length > maxLength ? `${raw.slice(0, maxLength)}...` : raw;
};

const fetchKgGuguMessages = async () => {
  kgGuguLoading.value = true;
  try {
    const { getApiUrl } = useApi();
    const q = new URLSearchParams({
      limit: String(GUGU_INITIAL_LIMIT),
    });
    const response = await fetchPublic(
      getApiUrl(`/api/gugu/messages?${q.toString()}`)
    );
    if (response.ok) {
      const data = await response.json();
      kgAllGuguMessages.value = data.messages || [];
      kgGuguHasMoreOlder.value = Boolean(data.has_more);
    }
  } catch {
    kgAllGuguMessages.value = [];
    kgGuguHasMoreOlder.value = false;
  } finally {
    kgGuguLoading.value = false;
  }
};

const fetchKgGuguOlderPage = async () => {
  const list = kgAllGuguMessages.value;
  if (!list.length || kgGuguLoadingOlder.value || !kgGuguHasMoreOlder.value) return;
  const oldest = list[list.length - 1];
  if (!oldest?.id) return;

  kgGuguLoadingOlder.value = true;
  try {
    const { getApiUrl } = useApi();
    const q = new URLSearchParams({
      limit: String(GUGU_PAGE_LIMIT),
      before_id: String(oldest.id),
    });
    const response = await fetchPublic(
      getApiUrl(`/api/gugu/messages?${q.toString()}`)
    );
    if (response.ok) {
      const data = await response.json();
      const chunk = data.messages || [];
      kgAllGuguMessages.value = [...list, ...chunk];
      kgGuguHasMoreOlder.value = Boolean(data.has_more);
    }
  } catch {
  } finally {
    kgGuguLoadingOlder.value = false;
  }
};

const sendKgGuguMessage = async () => {
  const text = kgGuguInputText.value.trim();
  if (!text) return;

  if (!isLoggedIn.value) {
    router.push(getLocalePath("/login"));
    return;
  }

  kgGuguSending.value = true;
  try {
    const { getApiUrl } = useApi();
    const response = await fetchWithAuth(getApiUrl('/api/gugu/messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text,
        reply_to_message_id: kgReplyTarget.value?.id ?? null,
      }),
    });
    if (response.ok) {
      const data = await response.json();
      if (data.data) {
        kgAllGuguMessages.value.unshift(data.data);
        kgGuguInputText.value = '';
        kgReplyTarget.value = null;
      }
    }
  } catch (err) {
    console.error("Failed to send gugu message", err);
  } finally {
    kgGuguSending.value = false;
  }
};

const focusKgGuguInput = () => {
  nextTick(() => {
    kgChatInputRef.value?.focus();
  });
};

const replyToKgMessage = (message: any) => {
  kgReplyTarget.value = message;
  focusKgGuguInput();
};

const clearKgReplyTarget = () => {
  kgReplyTarget.value = null;
};

const goToKgUserProfile = (userId?: number | string) => {
  if (!userId) return;
  router.push(getLocalePath(`/users/${userId}`));
};

const formatTimeAgo = (dateString: string) => {
  return formatRelativeTime(dateString);
};

onMounted(() => {
  fetchHotPosts();
  fetchKgGuguMessages();
});
</script>

<template>
  <div class="kg-home">
    <div class="kg-card kg-top-card">
      <div class="kg-banner-row">
        <div class="kg-carousel-wrap">
          <CarouselBanner />
        </div>
        <div class="kg-links-panel">
          <p class="kg-links-title">{{ t("homePage.relatedLinks.title") }}</p>
          <a
            v-for="link in relatedLinks"
            :key="link.key"
            :href="link.href"
            target="_blank"
            rel="noopener noreferrer"
            class="kg-link-btn"
          >
            {{ link.label }}
          </a>
        </div>
      </div>
    </div>

    <div class="kg-card kg-posts-card">
      <PostCardGrid :posts="hotPosts.slice(0, 3)" :loading="isLoading" />
    </div>

    <div class="kg-card kg-chat-card">
      <h2 class="kg-chat-title">{{ t("homePage.chat.title") }}</h2>

      <div v-if="kgReplyTarget" class="kg-chat-reply-banner">
        <div class="kg-chat-reply-banner__content">
          <span class="kg-chat-reply-banner__label">
            {{ t("homePage.chat.replyingTo", { name: getReplyDisplayName(kgReplyTarget) }) }}
          </span>
          <span class="kg-chat-reply-banner__text">
            {{ getReplyPreview(kgReplyTarget) }}
          </span>
        </div>
        <button
          type="button"
          class="kg-chat-reply-banner__clear"
          @click="clearKgReplyTarget"
        >
          {{ t("actions.cancel") }}
        </button>
      </div>
      <div class="kg-chat-input-row">
        <textarea
          ref="kgChatInputRef"
          class="kg-chat-input"
          v-model="kgGuguInputText"
          :placeholder="kgReplyTarget
            ? t('homePage.chat.replyPlaceholder', { name: getReplyDisplayName(kgReplyTarget) })
            : t('homePage.chat.placeholder')"
          rows="2"
          @keydown.enter.exact.prevent="sendKgGuguMessage"
          @keydown.enter.shift.exact="() => {}"
        />
        <button
          class="kg-chat-send-btn"
          @click="sendKgGuguMessage"
          :disabled="kgGuguSending"
        >
          {{ kgGuguSending ? t("actions.sending") : t("homePage.chat.send") }}
        </button>
      </div>

      <div class="kg-messages-list">
        <div v-if="kgGuguLoading" class="kg-msg-placeholder">{{ t("homePage.chat.loading") }}</div>
        <div v-else-if="kgAllGuguMessages.length === 0" class="kg-msg-placeholder">
          {{ t("homePage.chat.empty") }}
        </div>
        <template v-else>
          <div
            v-for="msg in kgAllGuguMessages"
            :key="msg.id"
            class="kg-message-item"
          >
            <div class="kg-msg-avatar">
              <UserAvatar
                :avatar-url="msg.author_avatar"
                :username="msg.author || t('common.unknownAuthor')"
                :user-id="msg.author_id"
                size="md"
                :clickable="Boolean(msg.author_id)"
                :show-tooltip="false"
                @click="goToKgUserProfile"
              />
            </div>
            <div class="kg-msg-body">
              <div class="kg-msg-meta">
                <span class="kg-msg-author">{{ msg.author || t("common.unknownAuthor") }}</span>
                <span class="kg-msg-time">{{ formatTimeAgo(msg.created_at) }}</span>
                <span class="kg-msg-reply" @click="replyToKgMessage(msg)">{{ t("homePage.chat.replyAction") }}</span>
              </div>
              <div class="kg-msg-text">
                <div v-if="msg.reply_to" class="kg-msg-quote">
                  <div class="kg-msg-quote__author">
                    {{ t("homePage.chat.quoteReplyTo", { name: getReplyDisplayName(msg.reply_to) }) }}
                  </div>
                  <div class="kg-msg-quote__text">
                    {{ getReplyPreview(msg.reply_to, 100) }}
                  </div>
                </div>
                <div class="kg-msg-text__content">{{ msg.content }}</div>
              </div>
            </div>
          </div>

          <div
            v-if="kgGuguHasMoreOlder"
            class="kg-view-more-chat"
            :class="{ 'kg-view-more-chat--disabled': kgGuguLoadingOlder }"
            @click="fetchKgGuguOlderPage"
          >
            {{ kgGuguLoadingOlder ? t("common.loading") : t("homePage.chat.loadMore") }}
          </div>
          <div v-else class="kg-no-more-chat">{{ t("homePage.chat.noMore") }}</div>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-home {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 20px 24px 55px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.kg-card {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
}

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

.kg-posts-card {
  padding: 20px 20px 16px;
}

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

.kg-chat-reply-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding: 10px 14px;
  border-radius: 12px;
  background: #eef4ff;
  border: 1px solid #c9d8ff;
}

.kg-chat-reply-banner__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.kg-chat-reply-banner__label {
  color: #42548f;
  font-size: 0.85rem;
  font-weight: 600;
}

.kg-chat-reply-banner__text {
  color: #5b6994;
  font-size: 0.8rem;
  line-height: 1.45;
  word-break: break-word;
}

.kg-chat-reply-banner__clear {
  border: none;
  background: transparent;
  color: #5871c8;
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
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
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: 10px 14px 12px;
  background: #FFFFFF;
  border-radius: 0 0 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.kg-msg-quote {
  padding-left: 10px;
  border-left: 3px solid #9bb2ef;
  opacity: 0.92;
}

.kg-msg-quote__author {
  font-size: 0.73rem;
  font-weight: 600;
  color: #5870bb;
  margin-bottom: 2px;
}

.kg-msg-quote__text {
  font-size: 0.78rem;
  color: #7a86a5;
  line-height: 1.4;
  word-break: break-word;
}

.kg-msg-text__content {
  color: #2a3a5a;
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

  &--disabled {
    pointer-events: none;
    opacity: 0.65;
    cursor: default;
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
