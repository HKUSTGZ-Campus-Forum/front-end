<script setup lang="ts">
import CommunityActivityPane from "~/components/community/CommunityActivityPane.vue";
import CommunityFeedbackPane from "~/components/community/CommunityFeedbackPane.vue";
import CommunityForumPane from "~/components/community/CommunityForumPane.vue";
import CommunityPrimaryTabs from "~/components/community/CommunityPrimaryTabs.vue";

definePageMeta({ layout: 'keguang' });

const { t } = useI18n();
const localePath = useLocalePath();
const { isLoggedIn } = useAuth();
const { activeSection, switchSection } = useCommunitySection();

useHead(() => ({
  title: `${t("community.title")} - ${t("common.appName")}`,
  meta: [{ name: "description", content: t("community.metaDescription") }],
}));
</script>

<template>
  <div class="kg-forum">
    <div class="kg-forum-header">
      <h1 class="kg-forum-title">{{ t("community.title") }}</h1>
      <NuxtLink v-if="activeSection === 'forum'" :to="localePath('/forum/postMessage')" class="kg-btn-primary">
        <span>+</span> {{ t("forum.list.createPost") }}
      </NuxtLink>
      <NuxtLink
        v-else-if="activeSection === 'feedback' && isLoggedIn"
        :to="localePath('/feedback/create')"
        class="kg-btn-primary"
      >
        {{ t("feedbackModule.index.cta") }}
      </NuxtLink>
      <NuxtLink
        v-else-if="activeSection === 'activity'"
        :to="localePath('/forum/postMessage')"
        class="kg-btn-primary"
      >
        {{ t("community.activity.cta") }}
      </NuxtLink>
    </div>

    <CommunityPrimaryTabs
      :key="activeSection"
      :model-value="activeSection"
      @update:model-value="switchSection"
    />

    <CommunityForumPane v-if="activeSection === 'forum'" />
    <CommunityFeedbackPane v-else-if="activeSection === 'feedback'" />
    <CommunityActivityPane v-else-if="activeSection === 'activity'" />
  </div>
</template>

<style lang="scss" scoped>
.kg-forum {
  width: 100%;
  max-width: 1160px;
  margin: 0 auto;
  padding: 20px 24px 60px;
}

.kg-forum-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.kg-forum-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0;
}

.kg-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  margin-top: 16px;
  background: #26A4FF;
  color: #fff;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s;
  &:hover { background: #1693ee; }
}
</style>
