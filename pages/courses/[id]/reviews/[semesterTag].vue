<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import FileUpload from "~/components/FileUpload.vue";
import { useCustomFileUpload } from "~/composables/useFileUpload";
import { ErrorModal, SuccessModal } from "~/components/ui";
import {
  buildCourseListBackQuery,
  COURSE_REVIEW_TAG,
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

interface Review {
  id: number
  title: string
  content: string
  rating: number | null
  author: string
  created_at: string
}

interface ReviewForm {
  title: string
  content: string
  rating: number | null
}

const route = useRoute();
const router = useRouter();
const { isLoggedIn } = useAuth();
const { fetchPublic, fetchWithAuth, getApiUrl } = useApi();
const { deleteFile } = useCustomFileUpload();

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
const reviews = ref<Review[]>([]);
const reviewForm = ref<ReviewForm>({ title: "", content: "", rating: null });
const uploadedFileIds = ref<number[]>([]);
const uploadedImages = ref<any[]>([]);

const isLoading = ref(true);
const isLoadingReviews = ref(false);
const isSubmittingReview = ref(false);
const showReviewForm = ref(false);
const error = ref("");
const errorMsg = ref("");
const showSuccessModal = ref(false);
const showErrorModal = ref(false);

const courseId = computed(() => String(route.params.id || ""));
const semesterTag = computed(() => String(route.params.semesterTag || ""));
const listBackQuery = computed(() => buildCourseListBackQuery(route.query as Record<string, unknown>));
const listBackTo = computed(() => ({ path: "/courses", query: listBackQuery.value }));
const offeringHomeTo = computed(() => ({
  path: `/courses/${courseId.value}/offerings/${semesterTag.value}`,
  query: listBackQuery.value,
}));
const selectedOffering = computed(() => (
  offerings.value.find((offering) => offering.offering_tag === semesterTag.value) || null
));

const extractRating = (content: string) => {
  const match = content.match(/⭐ 评分：(\d)/);
  return match ? parseInt(match[1], 10) : null;
};

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

const fetchReviews = async () => {
  if (!courseDetail.value.code || !selectedOffering.value) return;

  try {
    isLoadingReviews.value = true;
    const params = new URLSearchParams({
      limit: "50",
      sort_by: "created_at",
      sort_order: "desc",
      tags: [courseDetail.value.code, semesterTag.value, COURSE_REVIEW_TAG].join(","),
      tag_match: "all",
    });
    const response = await fetchPublic(getApiUrl(`/api/posts?${params.toString()}`));
    if (!response.ok) {
      throw new Error(`获取评价失败: ${response.status}`);
    }
    const data = await response.json();
    reviews.value = (data.posts || []).map((post: any) => ({
      id: post.id,
      title: post.title,
      content: post.content,
      rating: extractRating(post.content),
      author: post.author || "匿名用户",
      created_at: post.created_at,
    }));
  } catch (err: any) {
    errorMsg.value = err.message || "获取评价失败";
    showErrorModal.value = true;
  } finally {
    isLoadingReviews.value = false;
  }
};

const submitReview = async () => {
  if (!reviewForm.value.content.trim()) {
    errorMsg.value = "请输入评价内容";
    showErrorModal.value = true;
    return;
  }

  try {
    isSubmittingReview.value = true;
    let content = reviewForm.value.content.trim();
    if (reviewForm.value.rating) {
      content += `\n\n⭐ 评分：${reviewForm.value.rating}/5 星`;
    }

    const payload = {
      title: reviewForm.value.title.trim() || `${selectedOffering.value?.display_name || semesterTag.value} ${courseDetail.value.name} 课程评价`,
      content,
      tags: [courseDetail.value.code, semesterTag.value, COURSE_REVIEW_TAG],
      file_ids: uploadedFileIds.value,
    };

    const response = await fetchWithAuth(getApiUrl("/api/posts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || "发布失败，请稍后重试");
    }

    reviewForm.value = { title: "", content: "", rating: null };
    uploadedFileIds.value = [];
    uploadedImages.value = [];
    showReviewForm.value = false;
    await fetchReviews();
    showSuccessModal.value = true;
  } catch (err: any) {
    errorMsg.value = err.message || "发布失败，请稍后重试";
    showErrorModal.value = true;
  } finally {
    isSubmittingReview.value = false;
  }
};

const cancelReview = () => {
  showReviewForm.value = false;
  reviewForm.value = { title: "", content: "", rating: null };
  uploadedFileIds.value = [];
  uploadedImages.value = [];
};

const onFileUploadSuccess = (file: any) => {
  uploadedImages.value.push(file);
  uploadedFileIds.value.push(file.id);
};

const onUploadError = (uploadError: Error) => {
  errorMsg.value = `图片上传失败: ${uploadError.message}`;
  showErrorModal.value = true;
};

const removeUploadedImage = async (index: number) => {
  const image = uploadedImages.value[index];
  try {
    await deleteFile(image.id);
    uploadedImages.value.splice(index, 1);
    uploadedFileIds.value.splice(uploadedFileIds.value.indexOf(image.id), 1);
  } catch (removeError: any) {
    errorMsg.value = removeError.message || "图片删除失败";
    showErrorModal.value = true;
  }
};

const goToPostDetail = (postId: number) => {
  router.push(`/forum/posts/${postId}`);
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
    await fetchReviews();
  } catch (err: any) {
    error.value = err.message || "加载失败";
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchPage);

useHead({
  title: computed(() => `${selectedOffering.value?.display_name || semesterTag.value} ${courseDetail.value.name || "课程"} - 课程评价`),
  meta: [{
    name: "description",
    content: computed(() => `查看 ${selectedOffering.value?.display_name || semesterTag.value} ${courseDetail.value.name} 的课程评价`),
  }],
});
</script>

<template>
  <div class="kg-course-detail">
    <div class="kg-back-bar">
      <NuxtLink :to="offeringHomeTo" class="kg-back-link">← 返回课程主页</NuxtLink>
      <NuxtLink :to="listBackTo" class="kg-back-link kg-back-link--muted">返回课程列表</NuxtLink>
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
            {{ courseDetail.is_active ? '开放评课' : '关闭评课' }}
          </span>
        </div>
        <p class="kg-page-intro">这里展示的是 {{ selectedOffering?.display_name || semesterTag }} 这一 offering 的课程评价。</p>
      </div>

      <div class="kg-card kg-reviews">
        <div class="kg-reviews-header">
          <h2 class="kg-section-title">课程评价 ({{ reviews.length }})</h2>
          <button v-if="isLoggedIn && !showReviewForm" class="kg-btn-primary" @click="showReviewForm = true">
            + 写评价
          </button>
        </div>

        <div v-if="isLoggedIn && showReviewForm" class="kg-review-form">
          <h3 class="kg-form-title">发表 {{ selectedOffering?.display_name || semesterTag }} 的课程评价</h3>
          <form @submit.prevent="submitReview">
            <div class="kg-form-group">
              <label>评分（可选）</label>
              <div class="kg-star-row">
                <button
                  v-for="star in 5"
                  :key="star"
                  type="button"
                  :class="['kg-star', { active: reviewForm.rating && star <= reviewForm.rating }]"
                  @click="reviewForm.rating = reviewForm.rating === star ? null : star"
                >★</button>
              </div>
            </div>
            <div class="kg-form-group">
              <label>评价标题</label>
              <input
                v-model="reviewForm.title"
                class="kg-input"
                type="text"
                :placeholder="`${selectedOffering?.display_name || semesterTag} ${courseDetail.name} 课程评价`"
                maxlength="100"
              />
              <span class="kg-char-count">{{ reviewForm.title.length }}/100</span>
            </div>
            <div class="kg-form-group">
              <label>评价内容 *</label>
              <textarea
                v-model="reviewForm.content"
                class="kg-textarea"
                rows="4"
                placeholder="分享这门课在这个学期的学习体验、作业负担、考试感受等..."
                required
                maxlength="500"
              ></textarea>
              <span class="kg-char-count">{{ reviewForm.content.length }}/500</span>
            </div>
            <div class="kg-form-group">
              <label>上传图片（最多3张）</label>
              <FileUpload
                v-if="uploadedImages.length < 3"
                :file-type="'post_image'"
                :entity-type="'post'"
                :accept="'image/*'"
                :max-size="5 * 1024 * 1024"
                :show-preview="false"
                :allow-delete="false"
                :drag-text="'点击或拖拽图片到此处上传'"
                @upload-success="onFileUploadSuccess"
                @upload-error="onUploadError"
              />
              <div v-if="uploadedImages.length > 0" class="kg-uploaded-images">
                <div v-for="(img, idx) in uploadedImages" :key="img.id" class="kg-img-preview">
                  <img :src="img.url" :alt="img.original_filename" />
                  <button type="button" class="kg-remove-img" @click="removeUploadedImage(idx)">×</button>
                </div>
              </div>
            </div>
            <div class="kg-form-actions">
              <button type="button" class="kg-btn-ghost" @click="cancelReview">取消</button>
              <button type="submit" class="kg-btn-primary" :disabled="isSubmittingReview">
                {{ isSubmittingReview ? "发布中..." : "发布评价" }}
              </button>
            </div>
          </form>
        </div>

        <div v-if="!isLoggedIn" class="kg-login-hint">
          请 <NuxtLink to="/login" class="kg-link">登录</NuxtLink> 后发表评价
        </div>

        <div v-if="isLoadingReviews" class="kg-loading kg-loading--sm">
          <div class="kg-spinner kg-spinner--sm"></div>
          <span>加载评价...</span>
        </div>

        <div v-else-if="reviews.length === 0" class="kg-empty-state">
          <p>这个 offering 还没有课程评价，欢迎成为第一个分享体验的人。</p>
        </div>

        <div v-else class="kg-review-list">
          <div v-for="review in reviews" :key="review.id" class="kg-review-item" @click="goToPostDetail(review.id)">
            <div class="kg-review-header">
              <div class="kg-review-author">
                <span class="kg-reviewer-name">{{ review.author }}</span>
                <span class="kg-review-date">{{ formatDate(review.created_at) }}</span>
              </div>
              <div v-if="review.rating" class="kg-review-stars">
                <span v-for="star in 5" :key="star" :class="['kg-star-icon', { active: star <= review.rating }]">★</span>
              </div>
            </div>
            <h3 class="kg-review-title">{{ review.title }}</h3>
            <p class="kg-review-content">{{ review.content }}</p>
            <button class="kg-action-btn kg-action-btn--link" @click.stop="goToPostDetail(review.id)">查看详情 →</button>
          </div>
        </div>
      </div>
    </template>

    <SuccessModal
      :show="showSuccessModal"
      title="发布成功"
      message="评价发布成功！"
      :auto-close="true"
      :auto-close-delay="2000"
      :show-button="false"
      @close="showSuccessModal = false"
    />
    <ErrorModal :show="showErrorModal" title="发布失败" :message="errorMsg" @close="showErrorModal = false" />
  </div>
</template>

<style lang="scss" scoped>
.kg-course-detail {
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  padding: 20px 20px 60px;
}

.kg-back-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.kg-back-link {
  color: #26a4ff;
  text-decoration: none;
  font-size: 0.9rem;
  &:hover { text-decoration: underline; }
  &--muted { color: #6a85a0; }
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
.kg-reviews-header,
.kg-form-actions,
.kg-error-actions,
.kg-review-header {
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

.kg-course-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0;
}

.kg-page-intro {
  color: #4a6080;
  margin: 14px 0 0;
  line-height: 1.7;
}

.kg-status-badge {
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 0.78rem;
  font-weight: 700;
  &.active { background: rgba(38, 200, 120, 0.15); color: #1a9a55; border: 1px solid rgba(38, 200, 120, 0.3); }
  &.inactive { background: rgba(160, 160, 160, 0.12); color: #888; border: 1px solid rgba(160, 160, 160, 0.3); }
}

.kg-section-title,
.kg-form-title {
  margin: 0;
  color: #1a2a4a;
}

.kg-form-title {
  font-size: 1rem;
  margin-bottom: 16px;
}

.kg-btn-primary,
.kg-btn-primary-outline,
.kg-btn-ghost,
.kg-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
}

.kg-btn-primary {
  padding: 8px 20px;
  background: #26a4ff;
  color: #fff;
  border: none;
  &:hover:not(:disabled) { background: #0d8de0; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.kg-btn-primary-outline,
.kg-btn-ghost {
  padding: 8px 18px;
  border: 1.5px solid #c8dff8;
  background: transparent;
  color: #4a6080;
}

.kg-btn-primary-outline:hover,
.kg-btn-ghost:hover,
.kg-action-btn:hover {
  border-color: #26a4ff;
  color: #26a4ff;
}

.kg-review-form,
.kg-review-item {
  border-top: 1px solid #e8f4fd;
  padding-top: 18px;
  margin-top: 18px;
}

.kg-form-group {
  margin-bottom: 16px;
  label {
    display: block;
    margin-bottom: 8px;
    color: #4a6080;
    font-weight: 600;
  }
}

.kg-input,
.kg-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1.5px solid #c8dff8;
  border-radius: 12px;
  background: #fff;
  font-size: 0.92rem;
  color: #1a2a4a;
}

.kg-char-count {
  display: inline-block;
  margin-top: 6px;
  color: #7d94ae;
  font-size: 0.78rem;
}

.kg-star-row,
.kg-review-stars {
  display: flex;
  gap: 6px;
}

.kg-star,
.kg-star-icon {
  color: #d4dce5;
}

.kg-star {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.4rem;
  &.active { color: #ffb648; }
}

.kg-star-icon.active { color: #ffb648; }

.kg-uploaded-images {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.kg-img-preview {
  position: relative;
  width: 92px;
  height: 92px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #c8dff8;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.kg-remove-img {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(20, 31, 51, 0.72);
  color: #fff;
  cursor: pointer;
}

.kg-review-author {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.kg-reviewer-name,
.kg-review-title {
  color: #1a2a4a;
  font-weight: 700;
}

.kg-review-title {
  margin: 12px 0 8px;
  font-size: 1rem;
}

.kg-review-date,
.kg-login-hint,
.kg-empty-state,
.kg-review-content,
.kg-loading,
.kg-error-box {
  color: #4a6080;
}

.kg-review-content {
  margin: 0;
  line-height: 1.75;
  white-space: pre-wrap;
}

.kg-action-btn {
  margin-top: 12px;
  padding: 0;
  background: transparent;
  border: none;
  color: #26a4ff;
  &--link { font-weight: 700; }
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
  .kg-course-detail {
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
