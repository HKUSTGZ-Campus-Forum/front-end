<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useHead, useI18n, useLocalePath } from "#imports";
import PostMessage from "~/components/forum/PostMessage.vue";
import { getSingleQueryValue } from "~/utils/courseOffering";

definePageMeta({ layout: 'keguang' });

const { t } = useI18n();
const localePath = useLocalePath();
const route = useRoute();
const router = useRouter();
const lockedTags = computed(() => {
  const raw = route.query.lockedTag;
  if (Array.isArray(raw)) return raw.filter((item) => typeof item === "string");
  if (typeof raw === "string") return [raw];
  return [];
});
const returnTo = computed(() => getSingleQueryValue(route.query.returnTo) || null);
const source = computed(() => getSingleQueryValue(route.query.source));
const backLabel = computed(() => {
  if (source.value === "activity") return t("forum.create.backToActivity");
  if (returnTo.value) return t("forum.create.backToCourse");
  return t("forum.detail.backToForum");
});

useHead(() => ({
  title: t("forum.create.pageTitle"),
  meta: [{ name: "description", content: t("forum.create.metaDescription") }],
}));

const handlePostSuccess = (postId) => {
  router.replace(returnTo.value || localePath(`/forum/posts/${postId}`));
};
</script>

<template>
  <div class="kg-post-message">
    <div class="kg-back-bar">
      <NuxtLink :to="returnTo || localePath('/forum')" class="kg-back-link">
        <ForumUiIcon name="back" class="kg-back-link__icon" />
        <span>{{ backLabel }}</span>
      </NuxtLink>
    </div>
    <div class="kg-card">
      <h1 class="kg-page-title">{{ t("forum.create.title") }}</h1>
      <PostMessage
        :locked-tags="lockedTags"
        :return-to="returnTo"
        @post-success="handlePostSuccess"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-post-message {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 20px 20px 60px;
}

.kg-back-bar {
  margin-bottom: 16px;
}

.kg-back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--interactive-primary);
  text-decoration: none;
  font-size: 0.9rem;
  &:hover { text-decoration: underline; }
}

.kg-back-link__icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.kg-card {
  background: var(--surface-primary);
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  padding: 28px 32px;
}

.kg-page-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 24px;
}
</style>
