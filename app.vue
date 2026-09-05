<template>
  <NuxtLayout>
    <NuxtPage />
    <AppUpdateToast />
    <MascotOverlay
      ref="mascotRef"
      @open-agent-settings="handleOpenAgentSettings"
      @open-chat-history="handleOpenChatHistory"
    />
    <AgentChat ref="agentChatRef" @assistant-message="handleAssistantMessage" @assistant-state="handleAssistantState" />
  </NuxtLayout>
</template>

<script setup lang="ts">
import AppUpdateToast from "~/components/pwa/AppUpdateToast.vue";
import MascotOverlay from "~/components/mascot/Overlay.client.vue";
import AgentChat from "~/components/assistant/AgentChat.client.vue";
import { useAuth } from "~/composables/useAuth";
import { useHead, useI18n } from "#imports";
import type { MascotActivity } from "~/types/mascot";

const { init } = useAuth();
const { t } = useI18n();
const mascotRef = ref<{
  speak: (text: string) => void;
  setActivity: (activity: MascotActivity) => void;
} | null>(null);
const agentChatRef = ref<{
  openHistory: () => Promise<void> | void;
  openSettings: () => Promise<void> | void;
} | null>(null);

function handleAssistantMessage(text: string): void {
  mascotRef.value?.speak(text.slice(0, 120));
}

function handleOpenChatHistory(): void {
  agentChatRef.value?.openHistory();
}

function handleAssistantState(activity: MascotActivity): void {
  mascotRef.value?.setActivity(activity);
}

function handleOpenAgentSettings(): void {
  agentChatRef.value?.openSettings();
}

onMounted(() => {
  if (process.client) {
    init();
  }
});

useHead(() => ({
  title: t("common.appTitle"),
  meta: [{ name: "description", content: t("common.description") }],
  link: [{ rel: "icon", type: "image/x-icon", href: "/favicon-white.ico" }],
  script: [
    {
      // Prevent FOUC: apply persisted theme before first paint.
      // Key "theme" matches the Pinia persisted state store id (see store/themeStore.ts).
      key: 'theme-fouc',
      innerHTML: `(function(){try{var r=localStorage.getItem('theme');var id=r?JSON.parse(r).currentTheme:null;if(id){var el=document.documentElement;el.dataset.theme=id;if(id==='deep-dark'){el.style.colorScheme='dark';}}}catch(e){}})();`,
    },
  ],
}));
</script>

<!-- this is an example module -->
