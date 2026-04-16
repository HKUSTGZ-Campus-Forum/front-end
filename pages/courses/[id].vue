<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import FileUpload from "~/components/FileUpload.vue";
import { useCustomFileUpload } from "~/composables/useFileUpload";
import { SuccessModal, ErrorModal, ConfirmModal } from "~/components/ui";

definePageMeta({ layout: 'keguang' });

interface Course {
  id: number; code: string; name: string; description: string;
  instructor_id: number | null; credits: number; capacity: number | null;
  is_active: boolean; created_at: string; updated_at: string;
}
interface Review {
  id: number; content: string; rating?: number; semester?: string;
  author?: { username: string }; created_at: string;
  like_count?: number; isLiked?: boolean; replies?: Reply[];
}
interface Reply {
  id: number; content: string; author?: { username: string }; created_at: string;
}
interface ReviewForm { title: string; content: string; rating: number | null; semester: string; }

const { user, isLoggedIn } = useAuth();
const { fetchWithAuth, fetchPublic, getApiUrl } = useApi();
const { deleteFile } = useCustomFileUpload();
const route = useRoute();
const router = useRouter();

const courseDetail = ref<Course>({ id: 0, code: "", name: "", description: "", instructor_id: null, credits: 0, capacity: null, is_active: false, created_at: "", updated_at: "" });
const reviews = ref<Review[]>([]);
const reviewForm = ref<ReviewForm>({ title: "", content: "", rating: null, semester: "" });
const uploadedFileIds = ref<number[]>([]);
const uploadedImages = ref<any[]>([]);
const availableSemesters = ref<Array<{ code: string; display_name: string; year: string; season: string; season_display: string }>>([]);

const isLoading = ref(true);
const isLoadingReviews = ref(false);
const isSubmittingReview = ref(false);
const error = ref("");
const showReviewForm = ref(false);
const showReplyForm = ref<number | null>(null);
const replyContent = ref("");

const showSuccessModal = ref(false);
const showErrorModal = ref(false);
const showConfirmModal = ref(false);
const errorMsg = ref("");

const courseId = computed(() => route.params.id as string);
const averageRating = computed(() => {
  const ratedReviews = reviews.value.filter((r) => r.rating);
  if (ratedReviews.length === 0) return 0;
  return ratedReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / ratedReviews.length;
});

const fetchCourseDetail = async () => {
  try {
    isLoading.value = true; error.value = "";
    const response = await fetchPublic(getApiUrl(`/api/courses/${courseId.value}`));
    if (!response.ok) {
      if (response.status === 404) throw new Error("课程不存在或已被删除");
      throw new Error(`获取课程详情失败: ${response.status}`);
    }
    courseDetail.value = await response.json();
    await Promise.all([fetchCourseReviews(), fetchAvailableSemesters()]);
  } catch (err: any) {
    error.value = err.message || "获取课程详情失败";
  } finally { isLoading.value = false; }
};

const fetchCourseReviews = async () => {
  try {
    isLoadingReviews.value = true;
    const response = await fetchPublic(getApiUrl(`/api/courses/${courseId.value}/posts?limit=50`));
    if (response.ok) {
      const data = await response.json();
      reviews.value = (data.posts || []).map((post: any) => ({
        id: post.id, content: post.content, rating: extractRating(post.content),
        semester: extractSemester(post.tags), author: post.author,
        created_at: post.created_at, like_count: post.like_count || 0, isLiked: false, replies: [],
      }));
    }
  } catch (error) { console.error("获取课程评价失败:", error); }
  finally { isLoadingReviews.value = false; }
};

const fetchAvailableSemesters = async () => {
  const defaults = [
        { code: "2024spring", display_name: "23-24春", year: "2024", season: "spring", season_display: "春" },
        { code: "2024fall", display_name: "24-25秋", year: "2024", season: "fall", season_display: "秋" },
        { code: "2025spring", display_name: "24-25春", year: "2025", season: "spring", season_display: "春" },
        { code: "2025fall", display_name: "25-26秋", year: "2025", season: "fall", season_display: "秋" }
      ];
  try {
    const response = await fetchPublic(getApiUrl(`/api/courses/${courseId.value}/semesters?lang=zh`));
    if (response.ok) { const data = await response.json(); availableSemesters.value = data.semesters || defaults; }
    else availableSemesters.value = defaults;
  } catch { availableSemesters.value = defaults; }
};

const submitReview = async () => {
  if (!reviewForm.value.content.trim()) { errorMsg.value = "请输入评价内容"; showErrorModal.value = true; return; }
  try {
    isSubmittingReview.value = true;
    const tags = [courseDetail.value.code];
    if (reviewForm.value.semester) {
      const sel = availableSemesters.value.find(s => s.code === reviewForm.value.semester);
      if (sel) tags.push(`${courseDetail.value.code}-${sel.code}`);
    }
    let content = reviewForm.value.content;
    if (reviewForm.value.rating) content += `\n\n⭐ 评分：${reviewForm.value.rating}/5 星`;
    const postData = { title: reviewForm.value.title.trim() || `${courseDetail.value.name} 课程评价`, content, tags, file_ids: uploadedFileIds.value };
    const response = await fetchWithAuth(getApiUrl("/api/posts"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(postData) });
    if (response.ok) {
      reviewForm.value = { title: "", content: "", rating: null, semester: "" };
      uploadedFileIds.value = []; uploadedImages.value = []; showReviewForm.value = false;
      await fetchCourseReviews(); showSuccessModal.value = true;
    } else {
      const errorData = await response.json().catch(() => ({}));
      errorMsg.value = errorData.msg || errorData.message || "发布失败，请稍后重试";
      showErrorModal.value = true;
    }
  } catch (error: any) {
    errorMsg.value = error.message.includes("fetch") || error.message.includes("network") ? "网络连接失败，请检查您的网络设置后重试" : error.message || "发布失败，请稍后重试";
    showErrorModal.value = true;
  } finally { isSubmittingReview.value = false; }
};

const extractRating = (content: string) => { const m = content.match(/⭐ 评分：(\d)/); return m ? parseInt(m[1]) : null; };

const extractSemester = (tags: any[]) => {
  if (!tags || !Array.isArray(tags)) return null;
  const semesterTag = tags.find((tag) => {
    if (!tag.name || !tag.name.includes("-")) return false;
    const semesterPart = tag.name.split("-")[1];
    return /^\d{4}(spring|summer|fall|winter|春|夏|秋|冬)$/i.test(semesterPart);
  });
  if (semesterTag) {
    const semesterCode = semesterTag.name.split("-")[1];
    const year = semesterCode.match(/\d{4}/)?.[0] || "";
    const seasonMatch = semesterCode.match(/(spring|summer|fall|winter|春|夏|秋|冬)$/i);
    if (seasonMatch) {
      const seasonMap: Record<string, string> = { 'spring': '春', 'summer': '夏', 'fall': '秋', 'winter': '冬', '春': '春', '夏': '夏', '秋': '秋', '冬': '冬' };
      return `${year}${seasonMap[seasonMatch[1].toLowerCase()] || seasonMatch[1]}`;
    }
  }
  return null;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "未知";
  try { return new Date(dateString).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch { return "日期格式错误"; }
};

const cancelReview = () => {
  showReviewForm.value = false;
  reviewForm.value = { title: "", content: "", rating: null, semester: "" };
  uploadedFileIds.value = []; uploadedImages.value = [];
};

const onFileUploadSuccess = (file: any) => { uploadedImages.value.push(file); uploadedFileIds.value.push(file.id); };

const removeUploadedImage = async (index: number) => {
  const image = uploadedImages.value[index];
  try {
    await deleteFile(image.id);
    uploadedImages.value.splice(index, 1);
    uploadedFileIds.value.splice(uploadedFileIds.value.indexOf(image.id), 1);
  } catch (error) { errorMsg.value = `图片删除失败: ${error.message}`; showErrorModal.value = true; }
};

const onUploadError = (error: Error) => { errorMsg.value = `图片上传失败: ${error.message}`; showErrorModal.value = true; };

const toggleLike = async (review: Review) => { console.log("点赞评价:", review.id); };
const toggleReply = (reviewId: number) => { showReplyForm.value = showReplyForm.value === reviewId ? null : reviewId; replyContent.value = ""; };
const goToPostDetail = (postId: number) => { router.push(`/forum/posts/${postId}`); };
const submitReply = async (reviewId: number) => { console.log("回复评价:", reviewId, replyContent.value); cancelReply(); };
const cancelReply = () => { showReplyForm.value = null; replyContent.value = ""; };
const handleConfirm = () => { showConfirmModal.value = false; };

onMounted(() => {
  if (courseId.value && courseId.value !== "0") fetchCourseDetail();
  else { error.value = "无效的课程ID"; isLoading.value = false; }
});

useHead({
  title: computed(() => `${courseDetail.value.name || "课程"} - 评课系统`),
  meta: [{ name: "description", content: computed(() => `查看 ${courseDetail.value.name} 的评课信息和学生评价`) }],
});
</script>

<template>
  <div class="kg-course-detail">
    <div class="kg-back-bar">
      <NuxtLink to="/courses" class="kg-back-link">← 返回课程列表</NuxtLink>
    </div>

    <div v-if="isLoading" class="kg-loading">
      <div class="kg-spinner"></div><span>加载中...</span>
    </div>

    <div v-else-if="error" class="kg-error-box">
      <p>{{ error }}</p>
      <div class="kg-error-actions">
        <button class="kg-btn-ghost" @click="fetchCourseDetail">重试</button>
        <NuxtLink to="/courses" class="kg-btn-primary-outline">返回列表</NuxtLink>
      </div>
    </div>

    <template v-else>
      <!-- 课程头部 -->
      <div class="kg-card kg-course-header">
        <div class="kg-course-title-row">
          <div>
            <span class="kg-course-code-badge">{{ courseDetail.code }}</span>
            <h1 class="kg-course-name">{{ courseDetail.name }}</h1>
          </div>
          <span :class="['kg-status-badge', courseDetail.is_active ? 'active' : 'inactive']">
            {{ courseDetail.is_active ? '开放评课' : '关闭评课' }}
          </span>
        </div>
        <div class="kg-course-meta">
          <span class="kg-meta-chip"><i class="fas fa-graduation-cap"></i> {{ courseDetail.credits }} 学分</span>
          <span v-if="courseDetail.capacity" class="kg-meta-chip"><i class="fas fa-users"></i> 容量 {{ courseDetail.capacity }}</span>
        </div>
        <div class="kg-course-desc">
          <h3 class="kg-sub-title">课程描述</h3>
          <p>{{ courseDetail.description || '暂无课程描述' }}</p>
        </div>
      </div>

      <!-- 评价区 -->
      <div class="kg-card kg-reviews">
        <div class="kg-reviews-header">
          <h2 class="kg-section-title">课程评价 ({{ reviews.length }})</h2>
          <button v-if="isLoggedIn && !showReviewForm" class="kg-btn-primary" @click="showReviewForm = true">
            + 写评价
          </button>
        </div>

        <!-- 评价表单 -->
        <div v-if="isLoggedIn && showReviewForm" class="kg-review-form">
          <h3 class="kg-form-title">发表评价</h3>
          <form @submit.prevent="submitReview">
            <div class="kg-form-group">
              <label>学期</label>
              <select v-model="reviewForm.semester" class="kg-select">
                <option value="">选择学期（可选）</option>
                <option v-for="sem in availableSemesters" :key="sem.code" :value="sem.code">{{ sem.display_name }}</option>
              </select>
            </div>
            <div class="kg-form-group">
              <label>评分（可选）</label>
              <div class="kg-star-row">
                <button
                  v-for="star in 5" :key="star" type="button"
                  :class="['kg-star', { active: reviewForm.rating && star <= reviewForm.rating }]"
                  @click="reviewForm.rating = reviewForm.rating === star ? null : star"
                >★</button>
              </div>
            </div>
            <div class="kg-form-group">
              <label>评价标题</label>
              <input v-model="reviewForm.title" class="kg-input" type="text" :placeholder="`${courseDetail.name} 课程评价`" maxlength="100" />
              <span class="kg-char-count">{{ reviewForm.title.length }}/100</span>
            </div>
            <div class="kg-form-group">
              <label>评价内容 *</label>
              <textarea v-model="reviewForm.content" class="kg-textarea" rows="4" placeholder="分享您对这门课程的看法、学习体验、建议等..." required maxlength="500"></textarea>
              <span class="kg-char-count">{{ reviewForm.content.length }}/500</span>
            </div>
            <div class="kg-form-group">
              <label>上传图片（最多3张）</label>
              <FileUpload
                v-if="uploadedImages.length < 3"
                :file-type="'post_image'" :entity-type="'post'" :accept="'image/*'"
                :max-size="5 * 1024 * 1024" :show-preview="false" :allow-delete="false"
                :drag-text="'点击或拖拽图片到此处上传'"
                @upload-success="onFileUploadSuccess" @upload-error="onUploadError"
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
                {{ isSubmittingReview ? '发布中...' : '发布评价' }}
              </button>
            </div>
          </form>
        </div>

        <div v-if="!isLoggedIn" class="kg-login-hint">
          请 <NuxtLink to="/login" class="kg-link">登录</NuxtLink> 后发表评价
        </div>

        <!-- 评价列表 -->
        <div v-if="isLoadingReviews" class="kg-loading kg-loading--sm">
          <div class="kg-spinner kg-spinner--sm"></div><span>加载评价...</span>
        </div>

        <div v-else-if="reviews.length === 0" class="kg-no-reviews">
          <p>暂无评价，成为第一个评价这门课程的同学吧！</p>
        </div>

        <div v-else class="kg-review-list">
          <div v-for="review in reviews" :key="review.id" class="kg-review-item" @click="goToPostDetail(review.id)">
            <div class="kg-review-header">
              <div class="kg-review-author">
                <span class="kg-reviewer-name">{{ review.author?.username || '匿名用户' }}</span>
                <span v-if="review.semester" class="kg-semester-tag">{{ review.semester }}</span>
                <span class="kg-review-date">{{ formatDate(review.created_at) }}</span>
              </div>
              <div v-if="review.rating" class="kg-review-stars">
                <span v-for="star in 5" :key="star" :class="['kg-star-icon', { active: star <= review.rating }]">★</span>
              </div>
            </div>
            <p class="kg-review-content">{{ review.content }}</p>
            <div class="kg-review-actions" @click.stop>
              <button :class="['kg-action-btn', { active: review.isLiked }]" @click.stop="toggleLike(review)">
                👍 {{ review.like_count || 0 }}
              </button>
              <button class="kg-action-btn" @click.stop="toggleReply(review.id)">💬 回复</button>
              <button class="kg-action-btn kg-action-btn--link" @click.stop="goToPostDetail(review.id)">查看详情 →</button>
            </div>
            <div v-if="showReplyForm === review.id" class="kg-reply-form" @click.stop>
              <form @submit.prevent="submitReply(review.id)">
                <textarea v-model="replyContent" class="kg-textarea kg-textarea--sm" rows="2" placeholder="写下你的回复..." maxlength="200"></textarea>
                <div class="kg-form-actions">
                  <button type="button" class="kg-btn-ghost kg-btn-ghost--sm" @click="cancelReply">取消</button>
                  <button type="submit" class="kg-btn-primary kg-btn-primary--sm" :disabled="!replyContent.trim()">回复</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </template>

    <SuccessModal :show="showSuccessModal" title="发布成功" message="评价发布成功！感谢您的分享。" :auto-close="true" :auto-close-delay="2000" :show-button="false" @close="showSuccessModal = false" />
    <ErrorModal :show="showErrorModal" title="发布失败" :message="errorMsg" @close="showErrorModal = false" />
    <ConfirmModal :show="showConfirmModal" title="确认操作" message="确定要执行此操作吗？" confirm-text="确认" cancel-text="取消" @confirm="handleConfirm" @cancel="showConfirmModal = false" @close="showConfirmModal = false" />
  </div>
</template>

<style lang="scss" scoped>
.kg-course-detail {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 20px 60px;
}

.kg-back-bar { margin-bottom: 16px; }
.kg-back-link { color: #26a4ff; text-decoration: none; font-size: 0.9rem; &:hover { text-decoration: underline; } }

.kg-card {
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
  padding: 24px 28px;
  margin-bottom: 20px;
}

.kg-loading {
    display: flex;
    align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
  color: #4a6080;
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

@keyframes spin { to { transform: rotate(360deg); } }

.kg-error-box { text-align: center; padding: 60px 20px; color: #e05a5a; p { margin: 0 0 16px; } }
.kg-error-actions { display: flex; gap: 12px; justify-content: center; }

.kg-course-title-row {
    display: flex;
    justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
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
  line-height: 1.3;
}

.kg-status-badge {
  flex-shrink: 0;
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 0.78rem;
        font-weight: 700;
  &.active { background: rgba(38, 200, 120, 0.15); color: #1a9a55; border: 1px solid rgba(38, 200, 120, 0.3); }
  &.inactive { background: rgba(160,160,160,0.12); color: #888; border: 1px solid rgba(160,160,160,0.3); }
      }

.kg-course-meta {
        display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.kg-meta-chip {
  display: inline-flex;
        align-items: center;
  gap: 5px;
  padding: 4px 12px;
  background: rgba(40, 57, 101, 0.06);
  border-radius: 10px;
  font-size: 0.83rem;
  color: #4a6080;
  i { font-size: 0.75rem; }
}

.kg-sub-title { font-size: 0.9rem; font-weight: 700; color: #4a6080; margin: 0 0 8px; }

.kg-course-desc {
  border-top: 1px solid #e8f4fd;
  padding-top: 16px;
  p { margin: 0; font-size: 0.9rem; color: #4a6080; line-height: 1.7; }
}

.kg-reviews-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
  margin-bottom: 20px;
}

.kg-section-title { font-size: 1.1rem; font-weight: 700; color: #1a2a4a; margin: 0; }

.kg-btn-primary {
  display: inline-flex;
      align-items: center;
  gap: 5px;
  padding: 8px 20px;
  background: #26a4ff;
  color: #fff;
        border: none;
  border-radius: 14px;
        font-size: 0.875rem;
  font-weight: 600;
        cursor: pointer;
  text-decoration: none;
  transition: background 0.2s;
  &:hover:not(:disabled) { background: #0d8de0; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &--sm { padding: 6px 14px; font-size: 0.82rem; border-radius: 10px; }
}

.kg-btn-primary-outline {
  display: inline-flex;
  align-items: center;
  padding: 8px 20px;
  background: transparent;
  color: #26a4ff;
  border: 1.5px solid #26a4ff;
  border-radius: 14px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s;
  &:hover { background: rgba(38, 164, 255, 0.08); }
}

.kg-btn-ghost {
  padding: 8px 20px;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  background: transparent;
  color: #4a6080;
    cursor: pointer;
          font-size: 0.875rem;
  transition: all 0.2s;
  &:hover { background: #F5FBFE; border-color: #26a4ff; }
  &--sm { padding: 5px 14px; font-size: 0.82rem; border-radius: 10px; }
}

.kg-review-form {
  background: rgba(40, 57, 101, 0.03);
  border: 1.5px solid #c8dff8;
          border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
      }

.kg-form-title { font-size: 1rem; font-weight: 700; color: #1a2a4a; margin: 0 0 16px; }

.kg-form-group {
          display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  label { font-size: 0.85rem; font-weight: 600; color: #4a6080; }
}

.kg-input, .kg-select, .kg-textarea {
  padding: 9px 13px;
  border: 1.5px solid #c8dff8;
  border-radius: 10px;
  background: #fff;
  color: #1a2a4a;
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
  &:focus { border-color: #26a4ff; }
  &::placeholder { color: #9ab0c6; }
}

.kg-textarea { resize: vertical; &--sm { resize: none; } }
.kg-select { cursor: pointer; }

.kg-char-count { font-size: 0.75rem; color: #9ab0c6; text-align: right; }

.kg-star-row { display: flex; gap: 4px; }
.kg-star {
        background: none;
        border: none;
  font-size: 1.4rem;
  color: #c8dff8;
        cursor: pointer;
  padding: 0 2px;
  transition: color 0.15s;
  &.active { color: #ffc107; }
  &:hover { color: #ffc107; }
}

.kg-uploaded-images {
    display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.kg-img-preview {
  position: relative;
  width: 80px;
  height: 80px;
    border-radius: 8px;
  overflow: hidden;
  border: 1.5px solid #c8dff8;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.kg-remove-img {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0,0,0,0.6);
  color: #fff;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
      display: flex;
  align-items: center;
      justify-content: center;
  line-height: 1;
}

.kg-form-actions { display: flex; gap: 10px; justify-content: flex-end; }

.kg-login-hint {
  text-align: center;
  padding: 16px;
  color: #6a85a0;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.kg-link { color: #26a4ff; text-decoration: none; font-weight: 600; &:hover { text-decoration: underline; } }

.kg-no-reviews {
  text-align: center;
  padding: 40px 20px;
  color: #9ab0c6;
  p { margin: 0; font-size: 0.9rem; }
}

.kg-review-list { display: flex; flex-direction: column; gap: 12px; }

.kg-review-item {
  background: #fff;
  border: 1.5px solid #e8f4fd;
  border-radius: 12px;
  padding: 16px 18px;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
  &:hover { border-color: #26a4ff; box-shadow: 0 2px 12px rgba(40, 57, 101, 0.08); }
}

.kg-review-header {
  display: flex;
  justify-content: space-between;
        align-items: flex-start;
  margin-bottom: 8px;
  gap: 10px;
}

.kg-review-author { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.kg-reviewer-name { font-size: 0.9rem; font-weight: 600; color: #1a2a4a; }

.kg-semester-tag {
  padding: 2px 8px;
  background: rgba(158, 170, 244, 0.15);
    border-radius: 8px;
  font-size: 0.72rem;
  color: #9EAAF4;
  font-weight: 600;
}

.kg-review-date { font-size: 0.78rem; color: #9ab0c6; }

.kg-review-stars {
  display: flex;
  gap: 1px;
}

.kg-star-icon { font-size: 0.9rem; color: #c8dff8; &.active { color: #ffc107; } }

.kg-review-content { font-size: 0.88rem; color: #4a6080; line-height: 1.7; margin: 0 0 10px; }

.kg-review-actions {
  display: flex;
  gap: 8px;
  border-top: 1px solid #f0f7fd;
  padding-top: 8px;
}

.kg-action-btn {
  background: none;
  border: none;
  color: #6a85a0;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 6px;
  transition: all 0.2s;
  &:hover { background: rgba(38, 164, 255, 0.08); color: #26a4ff; }
  &.active { color: #26a4ff; }
  &--link { color: #26a4ff; margin-left: auto; }
}

.kg-reply-form {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #e8f4fd;
}
</style>
