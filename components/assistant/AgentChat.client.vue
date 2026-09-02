<template>
  <Teleport to="body">
    <div v-if="enabled" class="agent-shell">
      <Transition name="agent-panel">
        <section
          v-if="open"
          class="agent-panel"
          role="dialog"
          aria-modal="false"
          :aria-label="t('assistant.label')"
        >
          <header class="agent-header">
            <div class="agent-heading">
              <span class="agent-mark" aria-hidden="true">
                <Icon name="lucide:sparkles" />
              </span>
              <div class="agent-heading-copy">
                <strong>{{ t("assistant.title") }}</strong>
                <span>{{ statusText }}</span>
              </div>
            </div>

            <div class="agent-header-actions">
              <button
                v-if="view === 'history'"
                type="button"
                class="agent-icon-button"
                :aria-label="t('assistant.backToChat')"
                :title="t('assistant.backToChat')"
                @click="view = 'chat'"
              >
                <Icon name="lucide:arrow-left" aria-hidden="true" />
              </button>
              <button
                v-else
                type="button"
                class="agent-icon-button"
                :aria-label="t('assistant.history')"
                :title="t('assistant.history')"
                @click="showHistory"
              >
                <Icon name="lucide:history" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="agent-icon-button"
                :aria-label="t('assistant.newConversation')"
                :title="t('assistant.newConversation')"
                @click="startNewConversation"
              >
                <Icon name="lucide:square-pen" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="agent-icon-button"
                :aria-label="t('assistant.close')"
                :title="t('assistant.close')"
                @click="open = false"
              >
                <Icon name="lucide:x" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div v-if="!authInitialized" class="agent-state" role="status">
            <span class="agent-spinner" aria-hidden="true" />
            <span>{{ t("assistant.loading") }}</span>
          </div>

          <div v-else-if="!isLoggedIn" class="agent-state">
            <Icon name="lucide:log-in" class="agent-state-icon" aria-hidden="true" />
            <strong>{{ t("assistant.loginRequired") }}</strong>
            <button type="button" class="agent-command" @click="goToLogin">
              <Icon name="lucide:log-in" aria-hidden="true" />
              {{ t("assistant.login") }}
            </button>
          </div>

          <div v-else-if="initializing" class="agent-state" role="status">
            <span class="agent-spinner" aria-hidden="true" />
            <span>{{ t("assistant.loading") }}</span>
          </div>

          <div v-else-if="status && !status.enabled" class="agent-state">
            <Icon name="lucide:cloud-off" class="agent-state-icon" aria-hidden="true" />
            <strong>{{ t("assistant.unavailable") }}</strong>
            <button type="button" class="agent-command agent-command--secondary" @click="initialize">
              <Icon name="lucide:refresh-cw" aria-hidden="true" />
              {{ t("common.retry") }}
            </button>
          </div>

          <template v-else-if="view === 'history'">
            <div class="agent-history-heading">
              <strong>{{ t("assistant.history") }}</strong>
              <span>{{ conversations.length }}</span>
            </div>

            <div v-if="historyLoading" class="agent-state" role="status">
              <span class="agent-spinner" aria-hidden="true" />
            </div>
            <div v-else-if="!conversations.length" class="agent-state">
              <Icon name="lucide:messages-square" class="agent-state-icon" aria-hidden="true" />
              <strong>{{ t("assistant.noHistory") }}</strong>
            </div>
            <div v-else class="agent-history-list">
              <div
                v-for="conversation in conversations"
                :key="conversation.id"
                class="agent-history-row"
                :class="{ 'is-active': conversation.id === activeConversationId }"
              >
                <button
                  type="button"
                  class="agent-history-open"
                  @click="openConversation(conversation.id)"
                >
                  <span>{{ conversation.title }}</span>
                  <small>
                    {{ formatDate(conversation.last_message_at) }}
                    ·
                    {{ t("assistant.messageCount", { count: conversation.message_count }) }}
                  </small>
                </button>
                <button
                  type="button"
                  class="agent-icon-button agent-delete"
                  :aria-label="t('assistant.deleteConversation')"
                  :title="t('assistant.deleteConversation')"
                  :disabled="deletingId === conversation.id"
                  @click="removeConversation(conversation)"
                >
                  <Icon
                    :name="deletingId === conversation.id ? 'lucide:loader-circle' : 'lucide:trash-2'"
                    :class="{ 'is-spinning': deletingId === conversation.id }"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>
          </template>

          <template v-else>
            <div ref="messageListRef" class="agent-messages" aria-live="polite">
              <div v-if="conversationLoading" class="agent-state" role="status">
                <span class="agent-spinner" aria-hidden="true" />
              </div>

              <div v-else-if="!messages.length" class="agent-state agent-state--conversation">
                <Icon name="lucide:message-circle-question" class="agent-state-icon" aria-hidden="true" />
                <strong>{{ t("assistant.emptyConversation") }}</strong>
              </div>

              <template v-else>
                <article
                  v-for="message in messages"
                  :key="message.id"
                  class="agent-message"
                  :class="[`agent-message--${message.role}`, { 'is-pending': message.pending }]"
                >
                  <span class="sr-only">
                    {{ message.role === "assistant" ? t("assistant.assistantLabel") : t("assistant.userLabel") }}
                  </span>
                  <p>{{ message.content }}</p>
                </article>
              </template>

              <div v-if="sending" class="agent-typing" role="status">
                <span /><span /><span />
                <span class="sr-only">{{ t("assistant.thinking") }}</span>
              </div>
            </div>

            <p v-if="errorKey" class="agent-error" role="alert">
              <Icon name="lucide:circle-alert" aria-hidden="true" />
              <span>{{ t(errorKey) }}</span>
            </p>

            <form class="agent-composer" @submit.prevent="submitMessage">
              <textarea
                v-model="draft"
                rows="1"
                :maxlength="4000"
                :placeholder="t('assistant.placeholder')"
                :aria-label="t('assistant.placeholder')"
                :disabled="sending"
                @keydown.enter.exact.prevent="submitMessage"
              />
              <button
                type="submit"
                class="agent-send"
                :disabled="!canSend"
                :aria-label="t('assistant.send')"
                :title="t('assistant.send')"
              >
                <Icon name="lucide:send" aria-hidden="true" />
              </button>
            </form>
          </template>
        </section>
      </Transition>

      <button
        v-if="!open"
        type="button"
        class="agent-launcher"
        :aria-label="t('assistant.open')"
        :title="t('assistant.open')"
        @click="openPanel"
      >
        <Icon name="lucide:message-circle" aria-hidden="true" />
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n, useRuntimeConfig } from "#imports";
import {
  AgentApiError,
  type AgentConversation,
  type AgentMessage,
  type AgentStatus,
  useAgentChat,
} from "~/composables/useAgentChat";
import {
  agentErrorI18nKey,
  canSendAgentMessage,
} from "~/utils/agentChat";

const emit = defineEmits<{
  "assistant-message": [text: string];
}>();

const config = useRuntimeConfig();
const { t, locale } = useI18n();
const { isLoggedIn, authInitialized } = useAuth();
const api = useAgentChat();

const enabled = computed(() => String(config.public.agentEnabled) === "true");
const open = ref(false);
const view = ref<"chat" | "history">("chat");
const status = ref<AgentStatus | null>(null);
const conversations = ref<AgentConversation[]>([]);
const activeConversationId = ref<string | null>(null);
const messages = ref<AgentMessage[]>([]);
const draft = ref("");
const initializing = ref(false);
const historyLoading = ref(false);
const conversationLoading = ref(false);
const sending = ref(false);
const deletingId = ref<string | null>(null);
const errorKey = ref("");
const messageListRef = ref<HTMLElement | null>(null);

const available = computed(() => Boolean(status.value?.enabled));
const canSend = computed(() =>
  canSendAgentMessage(draft.value, sending.value, available.value)
);
const statusText = computed(() => {
  if (!isLoggedIn.value) return t("assistant.loginRequiredShort");
  if (initializing.value) return t("assistant.loading");
  return available.value ? t("assistant.ready") : t("assistant.unavailableShort");
});

async function initialize(): Promise<void> {
  if (!isLoggedIn.value || initializing.value) return;
  initializing.value = true;
  errorKey.value = "";
  try {
    const [nextStatus, nextConversations] = await Promise.all([
      api.getStatus(),
      api.listConversations(),
    ]);
    status.value = nextStatus;
    conversations.value = nextConversations;
  } catch (error) {
    handleError(error);
  } finally {
    initializing.value = false;
  }
}

async function openPanel(): Promise<void> {
  open.value = true;
  if (isLoggedIn.value && status.value === null) await initialize();
}

async function showHistory(): Promise<void> {
  view.value = "history";
  if (!isLoggedIn.value) return;
  historyLoading.value = true;
  try {
    conversations.value = await api.listConversations();
  } catch (error) {
    handleError(error);
  } finally {
    historyLoading.value = false;
  }
}

async function openHistory(): Promise<void> {
  open.value = true;
  if (isLoggedIn.value && status.value === null) {
    await initialize();
  }
  await showHistory();
}

function startNewConversation(): void {
  activeConversationId.value = null;
  messages.value = [];
  draft.value = "";
  errorKey.value = "";
  view.value = "chat";
}

async function openConversation(id: string): Promise<void> {
  view.value = "chat";
  conversationLoading.value = true;
  errorKey.value = "";
  try {
    const conversation = await api.getConversation(id);
    activeConversationId.value = conversation.id;
    messages.value = conversation.messages || [];
    await scrollToBottom();
  } catch (error) {
    handleError(error);
  } finally {
    conversationLoading.value = false;
  }
}

async function removeConversation(conversation: AgentConversation): Promise<void> {
  if (!window.confirm(t("assistant.confirmDelete", { title: conversation.title }))) return;
  deletingId.value = conversation.id;
  try {
    await api.deleteConversation(conversation.id);
    conversations.value = conversations.value.filter(
      (item) => item.id !== conversation.id
    );
    if (activeConversationId.value === conversation.id) startNewConversation();
  } catch (error) {
    handleError(error);
  } finally {
    deletingId.value = null;
  }
}

async function submitMessage(): Promise<void> {
  if (!canSend.value) return;
  const content = draft.value.trim();
  const optimisticId = `pending-${Date.now()}`;
  messages.value.push({
    id: optimisticId,
    role: "user",
    content,
    created_at: new Date().toISOString(),
    pending: true,
  });
  draft.value = "";
  sending.value = true;
  errorKey.value = "";
  await scrollToBottom();

  try {
    const payload = await api.sendMessage(content, activeConversationId.value);
    activeConversationId.value = payload.conversation.id;
    const index = messages.value.findIndex((item) => item.id === optimisticId);
    if (index >= 0) messages.value.splice(index, 1, payload.user_message);
    messages.value.push(payload.assistant_message);
    upsertConversation(payload.conversation);
    emit("assistant-message", payload.assistant_message.content);
  } catch (error) {
    if (error instanceof AgentApiError) {
      const persisted = error.payload.user_message as AgentMessage | undefined;
      const conversation = error.payload.conversation as
        | AgentConversation
        | undefined;
      if (persisted) {
        const index = messages.value.findIndex((item) => item.id === optimisticId);
        if (index >= 0) messages.value.splice(index, 1, persisted);
      }
      if (conversation) {
        activeConversationId.value = conversation.id;
        upsertConversation(conversation);
      }
    }
    handleError(error);
  } finally {
    sending.value = false;
    await scrollToBottom();
  }
}

function upsertConversation(conversation: AgentConversation): void {
  const next = conversations.value.filter((item) => item.id !== conversation.id);
  conversations.value = [conversation, ...next];
}

function handleError(error: unknown): void {
  const code = error instanceof AgentApiError ? error.code : undefined;
  errorKey.value = agentErrorI18nKey(code);
}

async function scrollToBottom(): Promise<void> {
  await nextTick();
  const element = messageListRef.value;
  if (element) element.scrollTop = element.scrollHeight;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale.value === "en" ? "en-US" : "zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function goToLogin(): void {
  navigateTo(locale.value === "en" ? "/en/login" : "/login");
}

defineExpose({ openPanel, openHistory });

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn && open.value) initialize();
  if (!loggedIn) {
    status.value = null;
    conversations.value = [];
    startNewConversation();
  }
});
</script>

<style scoped>
.agent-shell {
  position: fixed;
  right: 24px;
  bottom: calc(24px + env(safe-area-inset-bottom, 0px));
  z-index: 1110;
  pointer-events: none;
}

.agent-launcher,
.agent-icon-button,
.agent-command,
.agent-send,
.agent-history-open {
  font-family: inherit;
}

.agent-launcher,
.agent-icon-button,
.agent-send {
  display: inline-grid;
  place-items: center;
  min-height: 0;
  padding: 0;
  border: 1px solid var(--border-primary);
  color: var(--text-primary);
  background: var(--surface-primary);
  cursor: pointer;
}

.agent-launcher {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  color: var(--text-on-interactive);
  background: var(--interactive-primary);
  border-color: var(--interactive-primary);
  box-shadow: var(--shadow-large);
  pointer-events: auto;
}

.agent-launcher:hover {
  background: var(--interactive-hover);
  border-color: var(--interactive-hover);
}

.agent-launcher :deep(svg) {
  width: 24px;
  height: 24px;
}

.agent-panel {
  width: min(400px, calc(100vw - 32px));
  height: min(650px, calc(100dvh - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--surface-primary);
  box-shadow: var(--modal-shadow);
  pointer-events: auto;
}

.agent-header {
  min-height: 58px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--border-secondary);
  background: var(--surface-elevated);
}

.agent-heading {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
}

.agent-mark {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--text-on-interactive);
  background: var(--interactive-primary);
}

.agent-mark :deep(svg) {
  width: 18px;
  height: 18px;
}

.agent-heading-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.agent-heading-copy strong {
  font-size: 0.9rem;
  line-height: 1.3;
}

.agent-heading-copy span {
  color: var(--text-secondary);
  font-size: 0.72rem;
  line-height: 1.35;
}

.agent-header-actions {
  display: flex;
  align-items: center;
  gap: 3px;
}

.agent-icon-button {
  width: 34px;
  height: 34px;
  border-color: transparent;
  border-radius: 6px;
  background: transparent;
}

.agent-icon-button:hover:not(:disabled) {
  color: var(--interactive-active-text);
  background: var(--surface-secondary);
}

.agent-icon-button :deep(svg),
.agent-send :deep(svg) {
  width: 18px;
  height: 18px;
}

.agent-icon-button:disabled,
.agent-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.agent-messages,
.agent-history-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.agent-messages {
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overscroll-behavior: contain;
}

.agent-message {
  max-width: 86%;
  padding: 9px 11px;
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  font-size: 0.86rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.agent-message p {
  margin: 0;
  white-space: pre-wrap;
}

.agent-message--user {
  align-self: flex-end;
  color: var(--text-on-interactive);
  background: var(--interactive-primary);
  border-color: var(--interactive-primary);
}

.agent-message--assistant {
  align-self: flex-start;
  background: var(--surface-secondary);
}

.agent-message.is-pending {
  opacity: 0.72;
}

.agent-state {
  flex: 1;
  min-height: 0;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
  color: var(--text-secondary);
}

.agent-state--conversation {
  padding: 16px;
}

.agent-state strong {
  color: var(--text-primary);
  font-size: 0.9rem;
}

.agent-state-icon {
  width: 28px;
  height: 28px;
  color: var(--interactive-primary);
}

.agent-command {
  min-height: 38px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid var(--interactive-primary);
  border-radius: 6px;
  color: var(--text-on-interactive);
  background: var(--interactive-primary);
}

.agent-command--secondary {
  color: var(--interactive-active-text);
  background: transparent;
}

.agent-command :deep(svg) {
  width: 17px;
  height: 17px;
}

.agent-composer {
  padding: 10px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  align-items: end;
  gap: 8px;
  border-top: 1px solid var(--border-secondary);
  background: var(--surface-elevated);
}

.agent-composer textarea {
  width: 100%;
  min-height: 40px;
  max-height: 112px;
  resize: vertical;
  padding: 9px 10px;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  outline: none;
  color: var(--text-primary);
  background: var(--surface-primary);
  font: inherit;
  font-size: 0.86rem;
  line-height: 1.45;
}

.agent-composer textarea:focus {
  border-color: var(--border-focus);
}

.agent-send {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  color: var(--text-on-interactive);
  background: var(--interactive-primary);
  border-color: var(--interactive-primary);
}

.agent-error {
  margin: 0;
  padding: 7px 11px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-top: 1px solid color-mix(in srgb, var(--semantic-error) 30%, transparent);
  color: var(--semantic-error);
  background: var(--error-background);
  font-size: 0.78rem;
}

.agent-error :deep(svg) {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.agent-typing {
  width: 52px;
  height: 30px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  background: var(--surface-secondary);
}

.agent-typing > span:not(.sr-only) {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--text-secondary);
  animation: agent-typing 1s infinite ease-in-out;
}

.agent-typing > span:nth-child(2) {
  animation-delay: 120ms;
}

.agent-typing > span:nth-child(3) {
  animation-delay: 240ms;
}

.agent-history-heading {
  min-height: 42px;
  padding: 8px 13px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-secondary);
  font-size: 0.84rem;
}

.agent-history-heading span {
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.agent-history-row {
  min-height: 64px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  align-items: center;
  border-bottom: 1px solid var(--border-secondary);
}

.agent-history-row.is-active {
  background: color-mix(in srgb, var(--interactive-primary) 8%, transparent);
}

.agent-history-open {
  min-width: 0;
  min-height: 63px;
  padding: 9px 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  text-align: left;
}

.agent-history-open span {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.84rem;
  font-weight: 600;
}

.agent-history-open small {
  color: var(--text-secondary);
  font-size: 0.69rem;
}

.agent-delete {
  color: var(--semantic-error);
}

.agent-spinner {
  width: 25px;
  height: 25px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--interactive-primary);
  border-radius: 50%;
  animation: agent-spin 0.8s linear infinite;
}

.is-spinning {
  animation: agent-spin 0.8s linear infinite;
}

.agent-panel-enter-active,
.agent-panel-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
  transform-origin: right bottom;
}

.agent-panel-enter-from,
.agent-panel-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes agent-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes agent-typing {
  0%, 70%, 100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  35% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

@media (max-width: 560px) {
  .agent-shell {
    right: 12px;
    bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .agent-panel {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: min(78dvh, 680px);
    border-radius: 8px 8px 0 0;
    border-bottom: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .agent-panel-enter-active,
  .agent-panel-leave-active {
    transition: none;
  }

  .agent-typing > span:not(.sr-only) {
    animation: none;
  }
}

@media print {
  .agent-shell {
    display: none;
  }
}
</style>
