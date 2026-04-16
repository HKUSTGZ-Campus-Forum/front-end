<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useApi } from "~/composables/useApi";
import {
  buildCourseListBackQuery,
  COURSE_REVIEW_TAG,
  getVisiblePostTags,
  type CourseOffering,
} from "~/utils/courseOffering";

definePageMeta({ layout: "keguang" });

interface Course {
  id: number
  code: string
  name: string
  description: string
  instructor_id: number | null
  credits: number
  capacity: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface DiscussionPost {
  id: number
  title: string
  content: string
  author: string
  created_at: string
  comment_count: number
  view_count: number
  tags: any[]
}

const route = useRoute();
const { fetchPublic, getApiUrl } = useApi();

const courseDetail = ref<Course>({
  id: 0,
  code: "",
  name: "",
  description: "",
  instructor_id: null,
  credits: 0,
  capacity: null,
  is_active: false,
  created_at: "",
  updated_at: "",
});
const offerings = ref<CourseOffering[]>([]);
const discussions = ref<DiscussionPost[]>([]);

const isLoading = ref(true);
const isLoadingDiscussions = ref(false);
const error = ref("");

const courseId = computed(() => String(route.params.id || ""));
const semesterTag = computed(() => String(route.params.semesterTag || ""));
const listBackQuery = computed(() => buildCourseListBackQuery(route.query as Record<string, unknown>));
const listBackTo = computed(() => ({ path: "/courses", query: listBackQuery.value }));
const selectedOffering = computed(() => (
  offerings.value.find((offering) => offering.offering_tag === semesterTag.value) || null
));
const reviewPageTo = computed(() => ({
  path: `/courses/${courseId.value}/reviews/${semesterTag.value}`,
  query: listBackQuery.value,
}));
const discussionCreateTo = computed(() => ({
  path: "/forum/postMessage",
  query: {
    ...listBackQuery.value,
    lockedTag: [courseDetail.value.code, semesterTag.value],
    returnTo: route.fullPath,
  },
}));

const formatDate = (dateString: string) => {
  if (!dateString) return "未知";
  try {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "日期格式错误";
  }
};

const truncateContent = (content: string, limit = 140) => {
  if (!content) return "";
  return content.length > limit ? `${content.slice(0, limit)}...` : content;
};

const fetchCourseDetail = async () => {
  const response = await fetchPublic(getApiUrl(`/api/courses/${courseId.value}`));
  if (!response.ok) {
    if (response.status === 404) throw new Error("课程不存在或已被删除");
    throw new Error(`获取课程详情失败: ${response.status}`);
  }
  courseDetail.value = await response.json();
};

const fetchOfferings = async () => {
  const response = await fetchPublic(getApiUrl(`/api/courses/${courseId.value}/semesters?lang=zh`));
  if (!response.ok) {
    throw new Error(`获取开课学期失败: ${response.status}`);
  }
  const data = await response.json();
  offerings.value = data.semesters || [];
};

const fetchDiscussions = async () => {
  if (!courseDetail.value.code || !selectedOffering.value) return;

  try {
    isLoadingDiscussions.value = true;
    const params = new URLSearchParams({
      limit: "30",
      sort_by: "created_at",
      sort_order: "desc",
      tags: [courseDetail.value.code, semesterTag.value].join(","),
      tag_match: "all",
      exclude_tags: COURSE_REVIEW_TAG,
    });
    const response = await fetchPublic(getApiUrl(`/api/posts?${params.toString()}`));
    if (!response.ok) {
      throw new Error(`获取讨论区失败: ${response.status}`);
    }
    const data = await response.json();
    discussions.value = (data.posts || []).map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      author: post.author || "匿名用户",
      created_at: post.created_at,
      comment_count: post.comment_count || 0,
      view_count: post.view_count || 0,
      tags: getVisiblePostTags(post.tags || []),
    }));
  } finally {
    isLoadingDiscussions.value = false;
  }
};

const fetchPage = async () => {
  try {
    isLoading.value = true;
    error.value = "";
    await fetchCourseDetail();
    await fetchOfferings();
    if (!selectedOffering.value) {
      throw new Error("当前学期不存在或未开设这门课");
    }
    await fetchDiscussions();
  } catch (err: any) {
    error.value = err.message || "加载失败";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchPage);

useHead({
  title: computed(() => `${semesterTag.value} ${courseDetail.value.name || "课程"} - 课程主页`),
  meta: [{
    name: "description",
    content: computed(() => `查看 ${semesterTag.value} ${courseDetail.value.name} 的课程简介、评价入口和讨论区`),
  }],
});
</script>

<template>
  <div class="kg-course-offering">
    <div class="kg-back-bar">
      <NuxtLink :to="listBackTo" class="kg-back-link">← 返回课程列表</NuxtLink>
    </div>

    <div v-if="isLoading" class="kg-loading">
      <div class="kg-spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="error" class="kg-error-box">
      <p>{{ error }}</p>
      <div class="kg-error-actions">
        <button class="kg-btn-ghost" @click="fetchPage">重试</button>
        <NuxtLink :to="listBackTo" class="kg-btn-primary-outline">返回列表</NuxtLink>
      </div>
    </div>

    <template v-else>
      <div class="kg-card kg-course-header">
        <div class="kg-offering-chip-row">
          <span class="kg-offering-chip">{{ selectedOffering?.display_name }}</span>
          <span class="kg-offering-chip kg-offering-chip--outline">{{ semesterTag }}</span>
        </div>
        <div class="kg-course-title-row">
          <div>
            <span class="kg-course-code-badge">{{ courseDetail.code }}</span>
            <h1 class="kg-course-name">{{ courseDetail.name }}</h1>
          </div>
          <span :class="['kg-status-badge', courseDetail.is_active ? 'active' : 'inactive']">
            {{ courseDetail.is_active ? '开放中' : '已结束' }}
          </span>
        </div>
        <div class="kg-course-meta">
          <span class="kg-meta-chip"><i class="fas fa-graduation-cap"></i> {{ courseDetail.credits }} 学分</span>
          <span v-if="courseDetail.capacity" class="kg-meta-chip"><i class="fas fa-users"></i> 容量 {{ courseDetail.capacity }}</span>
        </div>
        <div class="kg-course-desc">
          <h3 class="kg-sub-title">课程简介</h3>
          <p>{{ courseDetail.description || "暂无课程描述" }}</p>
        </div>
      </div>

      <div class="kg-card kg-review-entry">
        <div class="kg-review-entry__content">
          <div>
            <p class="kg-subtitle">课程评价</p>
            <h2 class="kg-section-title">查看 {{ selectedOffering?.display_name || semesterTag }} 的课程评价</h2>
            <p class="kg-copy">这里汇总的是这个 offering 的课程评价与打分，不再和其他学期混在一起。</p>
          </div>
          <NuxtLink :to="reviewPageTo" class="kg-btn-primary">进入课程评价</NuxtLink>
        </div>
      </div>

      <div class="kg-card kg-discussion-card">
        <div class="kg-discussion-header">
          <div>
            <p class="kg-subtitle">课程讨论区</p>
            <h2 class="kg-section-title">所有同时带有 {{ courseDetail.code }} 和 {{ semesterTag }} 标签的帖子</h2>
          </div>
          <NuxtLink :to="discussionCreateTo" class="kg-btn-primary">去发帖</NuxtLink>
        </div>

        <div v-if="isLoadingDiscussions" class="kg-loading kg-loading--sm">
          <div class="kg-spinner kg-spinner--sm"></div>
          <span>加载讨论中...</span>
        </div>

        <div v-else-if="discussions.length === 0" class="kg-empty-state">
          <p>这个 offering 暂时还没有讨论帖，从这里发帖会自动带上课程和学期标签。</p>
          <NuxtLink :to="discussionCreateTo" class="kg-btn-primary">发布第一篇讨论</NuxtLink>
        </div>

        <div v-else class="kg-discussion-list">
          <NuxtLink
            v-for="post in discussions"
            :key="post.id"
            :to="`/forum/posts/${post.id}`"
            class="kg-discussion-item"
          >
            <div class="kg-discussion-item__header">
              <h3 class="kg-discussion-title">{{ post.title }}</h3>
              <span class="kg-discussion-date">{{ formatDate(post.created_at) }}</span>
            </div>
            <p class="kg-discussion-excerpt">{{ truncateContent(post.content) }}</p>
            <div v-if="post.tags.length" class="kg-discussion-tags">
              <span v-for="tag in post.tags" :key="tag.id || tag.tag_id || tag.name || tag.tag_name" class="kg-tag">
                {{ tag.name || tag.tag_name }}
              </span>
            </div>
            <div class="kg-discussion-meta">
              <span>{{ post.author }}</span>
              <span>评论 {{ post.comment_count }}</span>
              <span>浏览 {{ post.view_count }}</span>
            </div>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.kg-course-offering {
  width: 100%;
  max-width: 980px;
  margin: 0 auto;
  padding: 20px 20px 60px;
}

.kg-back-bar {
  margin-bottom: 16px;
}

.kg-back-link {
  color: #26a4ff;
  text-decoration: none;
  font-size: 0.9rem;
  &:hover { text-decoration: underline; }
}

.kg-card {
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
  padding: 24px 28px;
  margin-bottom: 20px;
}

.kg-offering-chip-row,
.kg-course-title-row,
.kg-discussion-header,
.kg-review-entry__content,
.kg-error-actions,
.kg-discussion-item__header,
.kg-discussion-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.kg-offering-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(38, 164, 255, 0.12);
  color: #1178c8;
  font-size: 0.82rem;
  font-weight: 700;
  &--outline {
    background: transparent;
    border: 1px solid rgba(17, 120, 200, 0.25);
  }
}

.kg-course-code-badge {
  display: inline-block;
  padding: 2px 10px;
  background: rgba(38, 164, 255, 0.1);
  border: 1px solid rgba(38, 164, 255, 0.3);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #26a4ff;
  margin-bottom: 6px;
}

.kg-course-name,
.kg-section-title {
  color: #1a2a4a;
  margin: 0;
}

.kg-course-name {
  font-size: 1.5rem;
  font-weight: 700;
}

.kg-section-title {
  font-size: 1.2rem;
  font-weight: 700;
}

.kg-status-badge {
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 0.78rem;
  font-weight: 700;
  &.active { background: rgba(38, 200, 120, 0.15); color: #1a9a55; border: 1px solid rgba(38, 200, 120, 0.3); }
  &.inactive { background: rgba(160, 160, 160, 0.12); color: #888; border: 1px solid rgba(160, 160, 160, 0.3); }
}

.kg-course-meta,
.kg-discussion-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.kg-meta-chip,
.kg-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.8rem;
}

.kg-meta-chip {
  background: rgba(40, 57, 101, 0.06);
  color: #4a6080;
}

.kg-tag {
  background: rgba(38, 164, 255, 0.1);
  border: 1px solid rgba(38, 164, 255, 0.25);
  color: #1178c8;
}

.kg-sub-title,
.kg-subtitle {
  margin: 0 0 6px;
  color: #4a6080;
  font-weight: 700;
}

.kg-copy,
.kg-course-desc p,
.kg-discussion-excerpt,
.kg-discussion-meta,
.kg-discussion-date,
.kg-loading,
.kg-empty-state,
.kg-error-box {
  color: #4a6080;
}

.kg-course-desc {
  border-top: 1px solid #e8f4fd;
  padding-top: 16px;
  margin-top: 16px;
  p {
    margin: 0;
    line-height: 1.75;
  }
}

.kg-btn-primary,
.kg-btn-primary-outline,
.kg-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px;
  border-radius: 14px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}

.kg-btn-primary {
  background: #26a4ff;
  color: #fff;
  border: none;
  &:hover { background: #0d8de0; }
}

.kg-btn-primary-outline,
.kg-btn-ghost {
  background: transparent;
  color: #4a6080;
  border: 1.5px solid #c8dff8;
  cursor: pointer;
  &:hover { border-color: #26a4ff; color: #26a4ff; }
}

.kg-discussion-list {
  display: grid;
  gap: 12px;
}

.kg-discussion-item {
  display: block;
  padding: 18px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #dbeeff;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  &:hover {
    border-color: #26a4ff;
    box-shadow: 0 8px 20px rgba(38, 164, 255, 0.08);
    transform: translateY(-1px);
  }
}

.kg-discussion-title {
  margin: 0;
  color: #1a2a4a;
  font-size: 1rem;
}

.kg-discussion-excerpt {
  margin: 10px 0 12px;
  line-height: 1.7;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  &--sm { padding: 20px; }
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #c8dff8;
  border-top-color: #26a4ff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  &--sm { width: 18px; height: 18px; border-width: 2px; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.kg-error-box {
  text-align: center;
  padding: 60px 20px;
}

@media (max-width: 768px) {
  .kg-course-offering {
    padding: 16px 14px 48px;
  }

  .kg-card {
    padding: 20px 18px;
  }

  .kg-course-name {
    font-size: 1.3rem;
  }
}
</style>
