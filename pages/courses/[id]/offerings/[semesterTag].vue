<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useApi } from "~/composables/useApi";
import {
  buildCourseListBackQuery,
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
      offering: semesterTag.value,
    });
    const response = await fetchPublic(
      getApiUrl(`/api/courses/${courseId.value}/discussions?${params.toString()}`)
    );
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
      <div class="kg-offering-grid">
        <div class="kg-card kg-pane kg-pane--intro">
          <div class="kg-intro-top">
            <div class="kg-intro-row kg-intro-row--main">
              <h1 class="kg-course-name">{{ courseDetail.code }} {{ courseDetail.name }}</h1>
              <span class="kg-meta-chip">{{ courseDetail.credits }} 学分</span>
              <span v-if="courseDetail.capacity" class="kg-meta-chip">容量 {{ courseDetail.capacity }}</span>
            </div>

            <div class="kg-intro-row kg-intro-row--top">
              <span class="kg-offering-chip">{{ selectedOffering?.display_name }}</span>
              <span :class="['kg-status-badge', courseDetail.is_active ? 'active' : 'inactive']">
                {{ courseDetail.is_active ? '开放中' : '已结束' }}
              </span>
            </div>
          </div>

          <div class="kg-course-desc">
            <h3 class="kg-pane-title">课程简介</h3>
            <p>{{ courseDetail.description || "暂无课程描述" }}</p>
          </div>
        </div>

        <div class="kg-side-stack">
          <div class="kg-card kg-pane kg-pane--review">
            <div class="kg-pane-head">
              <div>
                <p class="kg-pane-eyebrow">课程评价</p>
                <h2 class="kg-pane-title">查看这个学期的课程评价</h2>
              </div>
            </div>
            <p class="kg-pane-copy">{{ selectedOffering?.display_name || semesterTag }} 的评价和打分都在这里。</p>
            <NuxtLink :to="reviewPageTo" class="kg-btn-primary kg-btn-primary--block">进入课程评价</NuxtLink>
          </div>

          <div class="kg-card kg-pane kg-pane--discussion">
            <div class="kg-pane-head kg-pane-head--discussion">
              <div>
                <p class="kg-pane-eyebrow">课程讨论区</p>
                <h2 class="kg-pane-title">最近讨论</h2>
              </div>
              <NuxtLink :to="discussionCreateTo" class="kg-btn-primary">去发帖</NuxtLink>
            </div>

            <div v-if="isLoadingDiscussions" class="kg-loading kg-loading--sm">
              <div class="kg-spinner kg-spinner--sm"></div>
              <span>加载讨论中...</span>
            </div>

            <div v-else-if="discussions.length === 0" class="kg-empty-state">
              <p>还没有讨论，来发第一条吧。</p>
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
                <p class="kg-discussion-excerpt">{{ truncateContent(post.content, 100) }}</p>
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
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.kg-course-offering {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 20px 60px;
}

.kg-back-bar {
  margin-bottom: 16px;
}

.kg-back-link {
  color: var(--interactive-primary);
  text-decoration: none;
  font-size: 0.9rem;
  &:hover { text-decoration: underline; }
}

/* ── Shared card base ── */
.kg-card {
  background: var(--surface-secondary);
  border: 1px solid rgba(38, 164, 255, 0.18);
  border-radius: 22px;
  box-shadow: 0 10px 26px rgba(38, 164, 255, 0.08);
  padding: 28px 30px;
}

.kg-offering-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.48fr) minmax(320px, 0.82fr);
  gap: 22px;
  align-items: stretch;
}

.kg-side-stack {
  display: grid;
  gap: 22px;
  grid-template-rows: auto minmax(0, 1fr);
}

.kg-pane {
  height: 100%;
}

.kg-pane--intro {
  min-height: 360px;
  display: flex;
  flex-direction: column;
}

.kg-pane--review,
.kg-pane--discussion {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(4px);
}

.kg-intro-top {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.kg-intro-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex-wrap: wrap;
}

.kg-intro-row--top {
  justify-content: flex-start;
}

.kg-intro-row--main {
  align-items: baseline;
  gap: 14px;
}

.kg-offering-chip-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.kg-offering-chip {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(38, 164, 255, 0.12);
  color: var(--interactive-active);
  font-size: 0.82rem;
  font-weight: 700;
  &--outline {
    background: transparent;
    border: 1px solid rgba(17, 120, 200, 0.25);
  }
}

.kg-course-name {
  color: var(--text-primary);
  margin: 0;
  font-size: 1.45rem;
  line-height: 1.25;
  font-weight: 750;
  flex: 1;
  min-width: 240px;
}

.kg-status-badge {
  padding: 5px 16px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  &.active { background: rgba(38, 200, 120, 0.15); color: #1a9a55; border: 1px solid rgba(38, 200, 120, 0.3); }
  &.inactive { background: rgba(160, 160, 160, 0.12); color: #888; border: 1px solid rgba(160, 160, 160, 0.3); }
}

.kg-course-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.kg-meta-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 13px;
  border-radius: 999px;
  font-size: 0.8rem;
  background: rgba(40, 57, 101, 0.06);
  color: var(--text-secondary);
}

.kg-course-desc {
  margin-top: 20px;
  padding-top: 0;
  p {
    margin: 0;
    line-height: 1.9;
    color: var(--text-secondary);
    font-size: 1rem;
  }
}

.kg-pane-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}

.kg-pane-head--discussion {
  margin-bottom: 18px;
}

.kg-pane-eyebrow {
  margin: 0 0 4px;
  color: var(--text-secondary);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.kg-pane-title {
  color: var(--text-primary);
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.kg-pane-copy {
  color: var(--text-secondary);
  margin: 0 0 18px;
  font-size: 0.93rem;
  line-height: 1.6;
}

.kg-discussion-list {
  display: grid;
  gap: 12px;
}

.kg-discussion-item {
  display: block;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(191, 215, 251, 0.75);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
  &:hover {
    border-color: var(--interactive-primary);
    box-shadow: 0 6px 18px rgba(38, 164, 255, 0.1);
    transform: translateY(-1px);
  }
}

.kg-discussion-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.kg-discussion-title {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.98rem;
  font-weight: 600;
}

.kg-discussion-date {
  color: var(--text-secondary);
  font-size: 0.8rem;
  white-space: nowrap;
}

.kg-discussion-excerpt {
  margin: 8px 0 10px;
  line-height: 1.6;
  color: var(--text-secondary);
  font-size: 0.88rem;
}

.kg-discussion-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.kg-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  background: rgba(38, 164, 255, 0.1);
  border: 1px solid rgba(38, 164, 255, 0.25);
  color: var(--interactive-active);
}

.kg-discussion-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 0.8rem;
  color: var(--text-secondary);
  flex-wrap: wrap;
}

/* ── Buttons ── */
.kg-btn-primary,
.kg-btn-primary-outline,
.kg-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 22px;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
  cursor: pointer;
}

.kg-btn-primary {
  background: var(--interactive-primary);
  color: var(--text-inverse);
  border: none;
  &:hover { background: var(--interactive-hover); }
  &--block {
    width: 100%;
    min-height: 48px;
    font-size: 0.95rem;
    border-radius: 14px;
  }
}

.kg-btn-primary-outline,
.kg-btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1.5px solid var(--border-primary);
  &:hover { border-color: var(--interactive-primary); color: var(--interactive-primary); }
}

/* ── States ── */
.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: var(--text-secondary);
  &--sm { padding: 20px; }
}

.kg-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border-primary);
  border-top-color: var(--interactive-primary);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  &--sm { width: 18px; height: 18px; border-width: 2px; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.kg-empty-state {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-secondary);
  p { margin: 0 0 16px; }
}

.kg-error-box {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.kg-error-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 16px;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .kg-course-offering {
    padding: 16px 14px 48px;
  }

  .kg-card {
    padding: 20px 18px;
    border-radius: 16px;
  }

  .kg-offering-grid {
    grid-template-columns: 1fr;
  }

  .kg-pane--intro {
    min-height: auto;
  }

  .kg-intro-row--top,
  .kg-intro-row--main {
    align-items: flex-start;
  }

  .kg-intro-row--top {
    gap: 10px;
  }

  .kg-course-name {
    min-width: 0;
    font-size: 1.28rem;
  }

  .kg-pane-head {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
