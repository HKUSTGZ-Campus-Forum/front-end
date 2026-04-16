<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";
import { buildCourseListBackQuery } from "~/utils/courseOffering";

definePageMeta({ layout: "keguang" });

const route = useRoute();
const router = useRouter();
const { fetchPublic, getApiUrl } = useApi();

const isLoading = ref(true);
const error = ref("");

const redirectToDefaultOffering = async () => {
  try {
    const courseId = String(route.params.id || "");
    const listBackQuery = buildCourseListBackQuery(route.query as Record<string, unknown>);
    const response = await fetchPublic(getApiUrl(`/api/courses/${courseId}/semesters?lang=zh`));
    if (!response.ok) {
      throw new Error(`获取课程学期失败: ${response.status}`);
    }

    const data = await response.json();
    const firstOfferingTag = data?.semesters?.[0]?.offering_tag;

    if (firstOfferingTag) {
      await router.replace({
        path: `/courses/${courseId}/offerings/${firstOfferingTag}`,
        query: listBackQuery,
      });
      return;
    }

    await router.replace({ path: "/courses", query: listBackQuery });
  } catch (err: any) {
    error.value = err.message || "跳转失败";
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
      <span>正在跳转到课程主页...</span>
    </div>
    <div v-else-if="error" class="kg-error-box">
      <p>{{ error }}</p>
      <NuxtLink to="/courses" class="kg-back-link">返回课程列表</NuxtLink>
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
