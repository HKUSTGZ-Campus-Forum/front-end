<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import FileUpload from "~/components/FileUpload.vue";
import { useCustomFileUpload } from "~/composables/useFileUpload";
import { ErrorModal, SuccessModal } from "~/components/ui";
import {
  buildCourseListBackQuery,
  COURSE_REVIEW_LABEL,
  COURSE_REVIEW_TAG,
  type CourseOffering,
} from "~/utils/courseOffering";
import { compactCourseCode } from "~/utils/courseUniverse";

definePageMeta({ layout: "keguang" });
const { t } = useI18n();
const { locale, getLocalePath } = useAppLocale();
const { formatDate } = useDateFormat();

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
  offering: CourseOffering & {
    id: number
    semester_id: string
  }
}

interface ReviewForm {
  title: string
  content: string
  rating: number | null
}

const route = useRoute();
const { isLoggedIn } = useAuth();
const { fetchPublic, fetchWithAuth, getApiUrl } = useApi();
const { deleteFile } = useCustomFileUpload();
const { resolveCourseIdentifier } = useCourseOverview();

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
const isLoadingMoreReviews = ref(false);
const isSubmittingReview = ref(false);
const showReviewForm = ref(false);
const error = ref("");
const errorMsg = ref("");
const showSuccessModal = ref(false);
const showErrorModal = ref(false);
const reviewTotal = ref(0);
const reviewPage = ref(1);
const hasMoreReviews = ref(false);

const REVIEW_PAGE_SIZE = 20;

const courseIdentifier = computed(() => String(route.params.id || ""));
const resolvedCourseId = ref("");
const courseId = computed(() => resolvedCourseId.value || courseIdentifier.value);
const overviewCourseCode = computed(() => compactCourseCode(courseDetail.value.code || courseIdentifier.value));
const requestedOfferingTag = computed(() => (
  typeof route.query.offering === "string" ? route.query.offering : ""
));
const listBackQuery = computed(() => buildCourseListBackQuery(route.query as Record<string, unknown>));
const listBackTo = computed(() => getLocalePath({ path: "/courses/explore", query: listBackQuery.value }));
const selectedOffering = computed(() => {
  if (requestedOfferingTag.value) {
    return offerings.value.find((offering) => (
      offering.offering_tag === requestedOfferingTag.value
    )) || null;
  }
  return offerings.value[0] || null;
});
const semesterTag = computed(() => (
  selectedOffering.value?.offering_tag || requestedOfferingTag.value
));
const offeringHomeTo = computed(() => getLocalePath({
  path: `/courses/${overviewCourseCode.value}/offerings/${semesterTag.value}`,
  query: listBackQuery.value,
}));
const fixedReviewTags = computed(() => [
  courseDetail.value.code,
  selectedOffering.value?.display_name || semesterTag.value,
  COURSE_REVIEW_LABEL,
].filter(Boolean));

const extractRating = (content: string) => {
  const match = content.match(/⭐[^\d]*(\d)/);
  return match ? parseInt(match[1], 10) : null;
};

const normalizeReview = (post: any, fallbackOffering?: CourseOffering | null): Review => ({
  id: post.id,
  title: post.title,
  content: post.content,
  rating: extractRating(post.content),
  author: post.author || t("common.unknownAuthor"),
  created_at: post.created_at,
  offering: post.offering || {
    id: 0,
    semester_id: "",
    ...(fallbackOffering || {}),
  },
});

const reviewSubmitErrorMessage = (errorData: any) => {
  if (errorData?.code === "course_offering_not_resolved") {
    return t("courses.errors.courseOfferingNotResolved");
  }
  return errorData?.message || errorData?.error || t("courses.errors.submitReview");
};

const fetchCourseDetail = async () => {
  const response = await fetchPublic(getApiUrl(`/api/courses/${courseId.value}`));
  if (!response.ok) {
    if (response.status === 404) throw new Error(t("courses.detailMissing"));
    throw new Error(`${t("courses.errors.loadCourse")}: ${response.status}`);
  }
  courseDetail.value = await response.json();
};

const resolveCourseId = async () => {
  const result = await resolveCourseIdentifier(courseIdentifier.value);
  resolvedCourseId.value = String(result.course_id);
};

const fetchOfferings = async () => {
  const response = await fetchPublic(getApiUrl(`/api/courses/${courseId.value}/semesters?lang=${locale.value}`));
  if (!response.ok) {
    throw new Error(`${t("courses.errors.loadSemesters")}: ${response.status}`);
  }
  const data = await response.json();
  offerings.value = data.semesters || [];
};

const fetchReviews = async (page = 1, append = false) => {
  if (!courseDetail.value.code) return;

  try {
    if (append) {
      isLoadingMoreReviews.value = true;
    } else {
      isLoadingReviews.value = true;
    }
    const params = new URLSearchParams({
      page: String(page),
      limit: String(REVIEW_PAGE_SIZE),
      lang: locale.value,
    });
    let response = await fetchPublic(
      getApiUrl(`/api/courses/${courseId.value}/reviews?${params.toString()}`)
    );
    let data: any;

    // Keep the page available while frontend and backend production deploys overlap.
    // Older backends only expose the selected offering's tagged post list.
    if (response.status === 404 && selectedOffering.value) {
      const legacyParams = new URLSearchParams({
        page: "1",
        limit: String(REVIEW_PAGE_SIZE),
        sort_by: "created_at",
        sort_order: "desc",
        tags: [courseDetail.value.code, semesterTag.value, COURSE_REVIEW_TAG].join(","),
        tag_match: "all",
      });
      response = await fetchPublic(getApiUrl(`/api/posts?${legacyParams.toString()}`));
      if (response.ok) {
        const legacyData = await response.json();
        const legacyReviews = (legacyData.posts || []).map((post: any) => (
          normalizeReview(post, selectedOffering.value)
        ));
        data = {
          reviews: legacyReviews,
          total_count: legacyData.total_count ?? legacyReviews.length,
          current_page: 1,
          has_next: false,
        };
      }
    }
    if (!response.ok) {
      throw new Error(`${t("courses.errors.loadReviews")}: ${response.status}`);
    }
    data ||= await response.json();
    const nextReviews: Review[] = (data.reviews || []).map((post: any) => (
      normalizeReview(post, selectedOffering.value)
    ));
    if (append) {
      const merged = new Map(reviews.value.map((review) => [review.id, review]));
      nextReviews.forEach((review) => merged.set(review.id, review));
      reviews.value = Array.from(merged.values());
    } else {
      reviews.value = nextReviews;
    }
    reviewTotal.value = data.total_count || 0;
    reviewPage.value = data.current_page || page;
    hasMoreReviews.value = Boolean(data.has_next);
  } catch (err: any) {
    errorMsg.value = err.message || t("courses.errors.loadReviews");
    showErrorModal.value = true;
  } finally {
    isLoadingReviews.value = false;
    isLoadingMoreReviews.value = false;
  }
};

const loadMoreReviews = () => {
  if (!hasMoreReviews.value || isLoadingMoreReviews.value) return;
  fetchReviews(reviewPage.value + 1, true);
};

const submitReview = async () => {
  if (!reviewForm.value.content.trim()) {
    errorMsg.value = t("courses.reviewInputRequired");
    showErrorModal.value = true;
    return;
  }

  try {
    isSubmittingReview.value = true;
    let content = reviewForm.value.content.trim();
    if (reviewForm.value.rating) {
      const ratingLabel = t("courses.ratingWord");
      content += `\n\n⭐ ${ratingLabel}：${reviewForm.value.rating}/5`;
    }

    const payload = {
      title: reviewForm.value.title.trim() || t("courses.reviewTitlePlaceholder", {
        offering: selectedOffering.value?.display_name || semesterTag.value,
        course: courseDetail.value.name,
      }),
      content,
      tags: [courseDetail.value.code, semesterTag.value, COURSE_REVIEW_TAG, COURSE_REVIEW_LABEL],
      file_ids: uploadedFileIds.value,
    };

    const response = await fetchWithAuth(getApiUrl("/api/posts"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(reviewSubmitErrorMessage(errorData));
    }

    reviewForm.value = { title: "", content: "", rating: null };
    uploadedFileIds.value = [];
    uploadedImages.value = [];
    showReviewForm.value = false;
    await fetchReviews(1, false);
    showSuccessModal.value = true;
  } catch (err: any) {
    errorMsg.value = err.message || t("courses.errors.submitReview");
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
  errorMsg.value = t("courses.imageUploadFailed", { message: uploadError.message });
  showErrorModal.value = true;
};

const removeUploadedImage = async (index: number) => {
  const image = uploadedImages.value[index];
  try {
    await deleteFile(image.id);
    uploadedImages.value.splice(index, 1);
    uploadedFileIds.value.splice(uploadedFileIds.value.indexOf(image.id), 1);
  } catch (removeError: any) {
    errorMsg.value = removeError.message || t("courses.imageRemoveFailed");
    showErrorModal.value = true;
  }
};

const fetchPage = async () => {
  try {
    isLoading.value = true;
    error.value = "";
    await resolveCourseId();
    await fetchCourseDetail();
    await fetchOfferings();
    if (!selectedOffering.value) {
      throw new Error(t("courses.offeringMissing"));
    }
    isLoading.value = false;
    await fetchReviews(1, false);
  } catch (err: any) {
    error.value = err.message || t("courses.loading");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchPage);

useHead({
  title: computed(() => `${courseDetail.value.name || courseDetail.value.code} - ${t("courses.reviewsEyebrow")}`),
  meta: [{
    name: "description",
    content: computed(() => t("courses.reviewMetaDescription", {
      course: courseDetail.value.name || courseDetail.value.code,
    })),
  }],
});
</script>

<template>
  <div class="kg-course-detail">
    <div class="kg-back-bar">
      <NuxtLink :to="offeringHomeTo" class="kg-back-link">← {{ t("courses.homeTitle") }}</NuxtLink>
      <NuxtLink :to="listBackTo" class="kg-back-link kg-back-link--muted">{{ t("courses.backToCourses") }}</NuxtLink>
    </div>

    <div v-if="isLoading" class="kg-loading">
      <div class="kg-spinner"></div>
      <span>{{ t("courses.loading") }}</span>
    </div>

    <div v-else-if="error" class="kg-error-box">
      <p>{{ error }}</p>
      <div class="kg-error-actions">
        <button class="kg-btn-ghost" @click="fetchPage">{{ t("common.retry") }}</button>
        <NuxtLink :to="listBackTo" class="kg-btn-primary-outline">{{ t("common.backToList") }}</NuxtLink>
      </div>
    </div>

    <template v-else>
      <div class="kg-card kg-course-header">
        <div class="kg-course-header-top">
          <h1 class="kg-course-name">
            <span class="kg-course-name__code">{{ courseDetail.code }}</span>
            <span class="kg-course-name__title">{{ courseDetail.name }}</span>
          </h1>
          <span v-if="courseDetail.credits" class="kg-meta-chip">{{ t("courses.credits", { count: courseDetail.credits }) }}</span>
        </div>

        <div class="kg-course-header-tags">
          <span class="kg-offering-chip">{{ t("courses.allOfferings") }}</span>
          <span :class="['kg-status-badge', courseDetail.is_active ? 'active' : 'inactive']">
            {{ courseDetail.is_active ? t('courses.statusActive') : t('courses.statusInactive') }}
          </span>
        </div>

        <p class="kg-page-intro">
          {{ t("courses.pageIntro", {
            offering: selectedOffering?.display_name || semesterTag,
            courseCode: courseDetail.code,
          }) }}
        </p>
      </div>

      <div class="kg-card kg-reviews">
        <div class="kg-reviews-header">
          <h2 class="kg-section-title">{{ t("courses.reviewListTitle", { count: reviewTotal }) }}</h2>
          <button v-if="isLoggedIn && !showReviewForm" class="kg-btn-primary" @click="showReviewForm = true">
            + {{ t("courses.writeReviewFor", { offering: selectedOffering?.display_name || semesterTag }) }}
          </button>
        </div>

        <div v-if="isLoggedIn && showReviewForm" class="kg-review-form">
          <h3 class="kg-form-title">{{ t("courses.publishReviewFor", { offering: selectedOffering?.display_name || semesterTag }) }}</h3>
          <div class="kg-fixed-tags">
            <span class="kg-fixed-tags__label">{{ t("courses.fixedTags") }}</span>
            <div class="kg-fixed-tags__list">
              <span v-for="tag in fixedReviewTags" :key="tag" class="kg-fixed-tag">{{ tag }}</span>
            </div>
          </div>
          <form @submit.prevent="submitReview">
            <div class="kg-form-group">
              <label>{{ t("courses.ratingOptional") }}</label>
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
              <label>{{ t("courses.reviewTitleLabel") }}</label>
              <input
                v-model="reviewForm.title"
                class="kg-input"
                type="text"
                :placeholder="t('courses.reviewTitlePlaceholder', { offering: selectedOffering?.display_name || semesterTag, course: courseDetail.name })"
                maxlength="100"
              />
              <span class="kg-char-count">{{ reviewForm.title.length }}/100</span>
            </div>
            <div class="kg-form-group">
              <label>{{ t("courses.reviewContentLabel") }}</label>
              <textarea
                v-model="reviewForm.content"
                class="kg-textarea"
                rows="4"
                :placeholder="t('courses.reviewContentPlaceholder')"
                required
                maxlength="500"
              ></textarea>
              <span class="kg-char-count">{{ reviewForm.content.length }}/500</span>
            </div>
            <div class="kg-form-group">
              <label>{{ t("courses.uploadImages") }}</label>
              <FileUpload
                v-if="uploadedImages.length < 3"
                :file-type="'post_image'"
                :entity-type="'post'"
                :accept="'image/*'"
                :max-size="5 * 1024 * 1024"
                :show-preview="false"
                :allow-delete="false"
                :drag-text="t('courses.uploadDragText')"
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
              <button type="button" class="kg-btn-ghost" @click="cancelReview">{{ t("actions.cancel") }}</button>
              <button type="submit" class="kg-btn-primary" :disabled="isSubmittingReview">
                {{ isSubmittingReview ? t("actions.publishing") : t("actions.publish") }}
              </button>
            </div>
          </form>
        </div>

        <div v-if="!isLoggedIn" class="kg-login-hint">
          {{ t("courses.loginHint") }}
          <NuxtLink :to="getLocalePath('/login')" class="kg-link">{{ t("actions.login") }}</NuxtLink>
        </div>

        <div v-if="isLoadingReviews && reviews.length === 0" class="kg-review-skeletons" aria-live="polite">
          <span class="kg-sr-only">{{ t("courses.reviewLoading") }}</span>
          <div v-for="item in 3" :key="item" class="kg-review-skeleton" aria-hidden="true">
            <span class="kg-review-skeleton__meta"></span>
            <span class="kg-review-skeleton__title"></span>
            <span class="kg-review-skeleton__line"></span>
            <span class="kg-review-skeleton__line kg-review-skeleton__line--short"></span>
          </div>
        </div>

        <div v-else-if="reviews.length === 0" class="kg-empty-state">
          <p>{{ t("courses.reviewEmpty") }}</p>
        </div>

        <div v-else class="kg-review-list">
          <NuxtLink
            v-for="review in reviews"
            :key="review.id"
            :to="getLocalePath(`/forum/posts/${review.id}`)"
            class="kg-review-item"
          >
            <div class="kg-review-header">
              <div class="kg-review-author">
                <span class="kg-reviewer-name">{{ review.author }}</span>
                <span class="kg-review-date">{{ formatDate(review.created_at) }}</span>
              </div>
              <div class="kg-review-context">
                <span class="kg-review-term">{{ review.offering.display_name }}</span>
                <div v-if="review.rating" class="kg-review-stars" :aria-label="t('courses.ratingOutOfFive', { rating: review.rating })">
                  <span v-for="star in 5" :key="star" :class="['kg-star-icon', { active: star <= review.rating }]" aria-hidden="true">★</span>
                </div>
              </div>
            </div>
            <h3 class="kg-review-title">{{ review.title }}</h3>
            <p class="kg-review-content">{{ review.content }}</p>
            <span class="kg-action-btn kg-action-btn--link">{{ t("courses.reviewDetail") }} →</span>
          </NuxtLink>

          <div v-if="hasMoreReviews" class="kg-review-more">
            <button
              type="button"
              class="kg-btn-ghost"
              :disabled="isLoadingMoreReviews"
              @click="loadMoreReviews"
            >
              {{ isLoadingMoreReviews ? t("courses.reviewLoading") : t("courses.loadMoreReviews") }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <SuccessModal
      :show="showSuccessModal"
      :title="t('actions.publish')"
      :message="t('courses.reviewPublishSuccess')"
      :auto-close="true"
      :auto-close-delay="2000"
      :show-button="false"
      @close="showSuccessModal = false"
    />
    <ErrorModal :show="showErrorModal" :title="t('courses.reviewPublishFailed')" :message="errorMsg" @close="showErrorModal = false" />
  </div>
</template>

<style lang="scss" scoped>
.kg-course-detail {
  width: 100%;
  max-width: 1180px;
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
  color: var(--interactive-primary);
  text-decoration: none;
  font-size: 0.9rem;
  &:hover { text-decoration: underline; }
  &--muted { color: var(--text-secondary); }
}

.kg-card {
  background: var(--surface-primary);
  border: 1.5px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-medium);
  padding: 24px 28px;
  margin-bottom: 20px;
  min-width: 0;
}

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

.kg-course-header {
  padding: 24px 28px 20px;
}

.kg-course-header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.kg-course-header-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.kg-offering-chip {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--interactive-primary) 12%, transparent);
  color: var(--interactive-active);
  font-size: 0.82rem;
  font-weight: 700;
  &--outline {
    background: transparent;
    border: 1px solid color-mix(in srgb, var(--interactive-active) 25%, transparent);
  }
}

.kg-course-name {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(1.55rem, 2.2vw, 2.4rem);
  line-height: 1.12;
  font-weight: 800;
}

.kg-course-name__code {
  margin-right: 10px;
}

.kg-course-name__code,
.kg-course-name__title {
  display: inline;
}

.kg-page-intro {
  color: var(--text-secondary);
  margin: 14px 0 0;
  line-height: 1.7;
  font-size: 0.9rem;
}

.kg-status-badge {
  padding: 8px 20px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 700;
  &.active { background: color-mix(in srgb, var(--semantic-success) 15%, transparent); color: var(--semantic-success); border: 1px solid color-mix(in srgb, var(--semantic-success) 28%, transparent); }
  &.inactive { background: color-mix(in srgb, var(--text-muted) 12%, transparent); color: var(--text-muted); border: 1px solid color-mix(in srgb, var(--text-muted) 30%, transparent); }
}

.kg-meta-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 10px 18px;
  min-width: 80px;
  border-radius: 999px;
  background: var(--surface-secondary);
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
}

.kg-section-title,
.kg-form-title {
  margin: 0;
  color: var(--text-primary);
}

.kg-form-title {
  font-size: 1rem;
  margin-bottom: 16px;
}

.kg-fixed-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.kg-fixed-tags__label {
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 700;
}

.kg-fixed-tags__list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.kg-fixed-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 22%, transparent);
  background: color-mix(in srgb, var(--interactive-primary) 8%, transparent);
  color: var(--interactive-active);
  font-size: 0.8rem;
  font-weight: 700;
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
  min-height: 44px;
  text-decoration: none;
  transition: all 0.2s;
}

.kg-btn-primary {
  padding: 8px 20px;
  background: var(--btn-primary-bg);
  color: var(--text-inverse);
  border: none;
  &:hover:not(:disabled) { background: var(--btn-primary-bg-hover); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.kg-btn-primary-outline,
.kg-btn-ghost {
  padding: 8px 18px;
  border: 1.5px solid var(--border-primary);
  background: transparent;
  color: var(--text-secondary);

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
}

.kg-btn-primary-outline:hover,
.kg-btn-ghost:hover,
.kg-action-btn:hover {
  border-color: var(--interactive-primary);
  color: var(--interactive-primary);
}

.kg-review-form,
.kg-review-item {
  border-top: 1px solid var(--border-secondary);
  padding-top: 18px;
  margin-top: 18px;
  min-width: 0;
}

.kg-review-item {
  color: inherit;
  display: block;
  text-decoration: none;
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &:hover {
    border-color: var(--interactive-primary);
    background: color-mix(in srgb, var(--interactive-primary) 4%, transparent);
  }

  &:focus-visible {
    border-radius: 12px;
    outline: 3px solid color-mix(in srgb, var(--interactive-primary) 35%, transparent);
    outline-offset: 4px;
  }
}

.kg-form-group {
  margin-bottom: 16px;
  label {
    display: block;
    margin-bottom: 8px;
    color: var(--text-secondary);
    font-weight: 600;
  }
}

.kg-input,
.kg-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: 1.5px solid var(--border-primary);
  border-radius: 12px;
  background: var(--surface-primary);
  font-size: 0.92rem;
  color: var(--text-primary);
}

.kg-char-count {
  display: inline-block;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.kg-star-row,
.kg-review-stars {
  display: flex;
  gap: 6px;
}

.kg-star,
.kg-star-icon {
  color: var(--text-muted);
}

.kg-star {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.4rem;
  &.active { color: var(--semantic-warning); }
}

.kg-star-icon.active { color: var(--semantic-warning); }

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
  border: 1px solid var(--border-primary);
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
  background: var(--modal-backdrop);
  color: var(--text-inverse, #ffffff);
  cursor: pointer;
}

.kg-review-author {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
}

.kg-reviewer-name,
.kg-review-title {
  color: var(--text-primary);
  font-weight: 700;
}

.kg-review-title {
  margin: 12px 0 8px;
  font-size: 1rem;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.kg-review-date,
.kg-login-hint,
.kg-empty-state,
.kg-review-content,
.kg-loading,
.kg-error-box {
  color: var(--text-secondary);
}

.kg-review-content {
  margin: 0;
  line-height: 1.75;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.kg-review-header {
  min-width: 0;
}

.kg-review-context {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.kg-review-term {
  align-items: center;
  background: color-mix(in srgb, var(--interactive-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--interactive-primary) 24%, transparent);
  border-radius: 999px;
  color: var(--interactive-active-text);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  min-height: 28px;
  padding: 3px 10px;
  white-space: nowrap;
}

.kg-review-stars {
  flex-shrink: 0;
}

.kg-action-btn {
  margin-top: 12px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--interactive-primary);
  &--link { font-weight: 700; }
}

.kg-review-more {
  display: flex;
  justify-content: center;
  padding-top: 22px;
}

.kg-review-skeletons {
  display: grid;
}

.kg-review-skeleton {
  border-top: 1px solid var(--border-secondary);
  display: grid;
  gap: 10px;
  margin-top: 18px;
  padding-top: 18px;
}

.kg-review-skeleton span {
  animation: review-skeleton-pulse 1.1s ease-in-out infinite alternate;
  background: var(--surface-secondary);
  border-radius: 8px;
  display: block;
  height: 12px;
}

.kg-review-skeleton__meta { width: min(180px, 55%); }
.kg-review-skeleton__title { height: 16px !important; width: min(360px, 78%); }
.kg-review-skeleton__line { width: 100%; }
.kg-review-skeleton__line--short { width: 68%; }

.kg-sr-only {
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  width: 1px;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@keyframes review-skeleton-pulse {
  from { opacity: 0.55; }
  to { opacity: 1; }
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
  border: 3px solid var(--border-primary);
  border-top-color: var(--interactive-primary);
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
    font-size: 1.5rem;
  }

  .kg-course-header {
    padding: 20px 16px;
  }

  .kg-course-header-top {
    flex-direction: column;
    align-items: stretch;
  }

  .kg-course-header-tags {
    gap: 10px;
    margin-top: 14px;
  }

  .kg-offering-chip,
  .kg-status-badge,
  .kg-meta-chip {
    width: fit-content;
    padding: 8px 18px;
  }

  .kg-page-intro {
    margin-top: 12px;
    font-size: 0.86rem;
  }

  .kg-review-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .kg-review-context {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  .kg-review-skeleton span {
    animation: none;
  }
}
</style>
