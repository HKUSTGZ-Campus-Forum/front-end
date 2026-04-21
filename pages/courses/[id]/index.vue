<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useApi } from "~/composables/useApi";
import { buildCourseListBackQuery } from "~/utils/courseOffering";

definePageMeta({ layout: "keguang" });

const route = useRoute();
const router = useRouter();
const { fetchPublic, getApiUrl } = useApi();
const { t } = useI18n();
const { locale, getLocalePath } = useAppLocale();

const isLoading = ref(true);
const error = ref("");

const redirectToDefaultOffering = async () => {
  try {
    const courseId = String(route.params.id || "");
    const listBackQuery = buildCourseListBackQuery(route.query as Record<string, unknown>);
    const response = await fetchPublic(getApiUrl(`/api/courses/${courseId}/semesters?lang=${locale.value}`));
    if (!response.ok) {
      throw new Error(`${t("courses.errors.loadSemesters")}: ${response.status}`);
    }

    const data = await response.json();
    const firstOfferingTag = data?.semesters?.[0]?.offering_tag;

    if (firstOfferingTag) {
      await router.replace({
        path: getLocalePath(`/courses/${courseId}/offerings/${firstOfferingTag}`),
        query: listBackQuery,
      });
      return;
    }

    await router.replace({ path: getLocalePath("/courses"), query: listBackQuery });
  } catch (err: any) {
    error.value = err.message || t("courses.redirectFailed");
  } finally {
    isLoading.value = false;
  }
};

onMounted(redirectToDefaultOffering);
</script>

<template>
  <div class="kg-redirect-page">
    <div v-if="isLoading" class="kg-loading">
      <div class="kg-spinner"></div>
      <span>{{ t("courses.redirecting") }}</span>
    </div>
    <div v-else-if="error" class="kg-error-box">
      <p>{{ error }}</p>
      <NuxtLink :to="getLocalePath('/courses')" class="kg-back-link">{{ t("courses.backToCourses") }}</NuxtLink>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kg-redirect-page {
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 20px 60px;
}

.kg-loading,
.kg-error-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 220px;
  color: #4a6080;
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #c8dff8;
  border-top-color: #26a4ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.kg-back-link {
  color: #26a4ff;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
