<!-- pages/courses/[id].vue -->
<template>
  <HomeContainer>
    <div class="course-detail-page">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载课程信息中...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h2>加载失败</h2>
        <p>{{ error }}</p>
        <div class="error-actions">
          <button @click="fetchCourseDetail" class="retry-btn">重试</button>
          <NuxtLink to="/courses" class="back-btn">返回课程列表</NuxtLink>
        </div>
      </div>

      <!-- 课程详情 -->
      <div v-else class="course-detail-content">
        <!-- 课程头部信息 -->
        <div class="course-header">
          <div class="course-basic-info">
            <div class="course-title-section">
              <h1 class="course-name">{{ courseDetail.name }}</h1>
              <span class="course-code">{{ courseDetail.code }}</span>
            </div>
            <div class="course-meta">
              <span class="course-credits">
                <i class="fas fa-graduation-cap"></i>
                {{ courseDetail.credits }} 学分
              </span>
              <span class="course-capacity" v-if="courseDetail.capacity">
                <i class="fas fa-users"></i>
                容量: {{ courseDetail.capacity }}
              </span>
              <span
                class="course-status"
                :class="courseDetail.is_active ? 'active' : 'inactive'"
              >
                <i class="fas fa-circle"></i>
                {{ courseDetail.is_active ? "开放评课" : "关闭评课" }}
              </span>
            </div>
          </div>
        </div>

        <!-- 课程描述 -->
        <div class="course-description-section">
          <h3>
            <i class="fas fa-info-circle"></i>
            课程描述
          </h3>
          <div class="course-description">
            {{ courseDetail.description || "暂无课程描述" }}
          </div>
        </div>

        <!-- 🔥 课程评价区域 -->
        <div class="course-reviews-section">
          <div class="reviews-header">
            <h3>
              <i class="fas fa-comments"></i>
              课程评价
              <span class="reviews-count">({{ reviews.length }})</span>
            </h3>
            <button
              v-if="!showReviewForm"
              @click="showReviewForm = true"
              class="btn btn-primary"
            >
              <i class="fas fa-plus"></i>
              写评价
            </button>

            <!-- 评价统计 -->
            <!-- <div class="reviews-stats" v-if="reviews.length > 0">
              <div class="average-rating">
                <span class="rating-number">{{
                  averageRating.toFixed(1)
                }}</span>
                <div class="stars">
                  <i
                    v-for="star in 5"
                    :key="star"
                    :class="[
                      'fas fa-star',
                      { active: star <= Math.round(averageRating) },
                    ]"
                  ></i>
                </div>
                <span class="rating-text">平均评分</span>
              </div>
            </div> -->
          </div>

          <!-- 发表评价表单 -->
          <div class="review-form-section" v-if="isLoggedIn && showReviewForm">
            <!-- <div class="form-header"></div> -->

            <div v-if="showReviewForm" class="review-form">
              <form @submit.prevent="submitReview">
                <!-- 学期选择 -->
                <div class="form-group">
                  <label for="semester" class="form-label">
                    <i class="fas fa-calendar-alt"></i>
                    学期
                  </label>
                  <select
                    id="semester"
                    v-model="reviewForm.semester"
                    class="form-select"
                  >
                    <option value="">选择学期（可选）</option>
                    <option 
                      v-for="semester in availableSemesters" 
                      :key="semester.code"
                      :value="semester.code"
                    >
                      {{ semester.display_name }}
                    </option>
                  </select>
                </div>

                <!-- 评价标题 -->
                <div class="form-group">
                  <label for="title" class="form-label">
                    <i class="fas fa-heading"></i>
                    评价标题
                  </label>
                  <input
                    id="title"
                    v-model="reviewForm.title"
                    type="text"
                    class="form-input"
                    :placeholder="`${courseDetail.name} 课程评价`"
                    maxlength="100"
                  />
                  <div class="char-count">
                    {{ reviewForm.title.length }}/100
                  </div>
                  <div class="form-hint">
                    留空将使用默认标题
                  </div>
                </div>

                <!-- 评价内容 -->
                <div class="form-group">
                  <label for="content" class="form-label">
                    <i class="fas fa-edit"></i>
                    评价内容 *
                  </label>
                  <textarea
                    id="content"
                    v-model="reviewForm.content"
                    class="form-textarea"
                    placeholder="分享您对这门课程的看法、学习体验、建议等..."
                    required
                    rows="4"
                    maxlength="500"
                  ></textarea>
                  <div class="char-count">
                    {{ reviewForm.content.length }}/500
                  </div>
                </div>

                <!-- 图片上传 -->
                <div class="form-group">
                  <label class="form-label">
                    <i class="fas fa-images"></i>
                    上传图片
                  </label>
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
                  <div class="form-hint">
                    最多上传3张图片，支持JPG、PNG、GIF格式，单张图片最大5MB ({{ uploadedImages.length }}/3)
                  </div>
                  
                  <!-- 已上传图片预览 -->
                  <div v-if="uploadedImages.length > 0" class="uploaded-images">
                    <h4>已上传图片 ({{ uploadedImages.length }}/3):</h4>
                    <div class="image-grid">
                      <div v-for="(image, index) in uploadedImages" :key="image.id" class="image-preview">
                        <img :src="image.url" :alt="image.original_filename" class="preview-img">
                        <div class="image-info">
                          <span class="filename">{{ image.original_filename }}</span>
                          <button type="button" @click="removeUploadedImage(index)" class="remove-btn">×</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 提交按钮 -->
                <div class="form-actions">
                  <button
                    type="button"
                    @click="cancelReview"
                    class="btn btn-secondary"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    :disabled="isSubmittingReview"
                    class="btn btn-primary"
                  >
                    <i class="fas fa-paper-plane"></i>
                    {{ isSubmittingReview ? "发布中..." : "发布评价" }}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- 未登录提示 -->
          <div class="login-prompt" v-if="!isLoggedIn && showReviewForm">
            <i class="fas fa-sign-in-alt"></i>
            <p>请先登录后发表评价</p>
            <NuxtLink to="/login" class="btn btn-primary">去登录</NuxtLink>
          </div>

          <!-- 评价列表 -->
          <div class="reviews-list">
            <div v-if="isLoadingReviews" class="loading-reviews">
              <div class="loading-spinner small"></div>
              <p>加载评价中...</p>
            </div>

            <div v-else-if="reviews.length === 0" class="no-reviews">
              <i class="fas fa-comments"></i>
              <h4>暂无评价</h4>
              <p>成为第一个评价这门课程的同学吧！</p>
            </div>

            <div v-else class="review-items">
              <div
                v-for="review in reviews"
                :key="review.id"
                class="review-item"
              >
                <div class="review-header">
                  <div class="reviewer-info">
                    <span class="reviewer-name">{{
                      review.author?.username || "匿名用户"
                    }}</span>
                    <span class="review-date">{{
                      formatDate(review.created_at)
                    }}</span>
                    <span v-if="review.semester" class="review-semester">{{
                      review.semester
                    }}</span>
                  </div>
                  <div v-if="review.rating" class="review-rating">
                    <div class="stars">
                      <i
                        v-for="star in 5"
                        :key="star"
                        :class="[
                          'fas fa-star',
                          { active: star <= review.rating },
                        ]"
                      ></i>
                    </div>
                    <span class="rating-number">{{ review.rating }}</span>
                  </div>
                </div>

                <div class="review-content">
                  {{ review.content }}
                </div>

                <!-- 评价操作 -->
                <div class="review-actions">
                  <button
                    @click="toggleLike(review)"
                    :class="['action-btn', { liked: review.isLiked }]"
                  >
                    <i class="fas fa-thumbs-up"></i>
                    {{ review.like_count || 0 }}
                  </button>
                  <button @click="toggleReply(review.id)" class="action-btn">
                    <i class="fas fa-reply"></i>
                    回复
                  </button>
                </div>

                <!-- 回复表单 -->
                <div v-if="showReplyForm === review.id" class="reply-form">
                  <form @submit.prevent="submitReply(review.id)">
                    <textarea
                      v-model="replyContent"
                      class="reply-textarea"
                      placeholder="写下你的回复..."
                      rows="2"
                      maxlength="200"
                    ></textarea>
                    <div class="reply-actions">
                      <button
                        type="button"
                        @click="cancelReply"
                        class="btn btn-small btn-secondary"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        :disabled="!replyContent.trim()"
                        class="btn btn-small btn-primary"
                      >
                        回复
                      </button>
                    </div>
                  </form>
                </div>

                <!-- 回复列表 -->
                <div v-if="review.replies?.length" class="replies-list">
                  <div
                    v-for="reply in review.replies"
                    :key="reply.id"
                    class="reply-item"
                  >
                    <div class="reply-header">
                      <span class="reply-author">{{
                        reply.author?.username || "匿名用户"
                      }}</span>
                      <span class="reply-date">{{
                        formatDate(reply.created_at)
                      }}</span>
                    </div>
                    <div class="reply-content">{{ reply.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 🔥 统一弹窗组件 -->
      <!-- 成功提示弹窗 -->
      <SuccessModal
        :show="showSuccessModal"
        title="发布成功"
        message="评价发布成功！感谢您的分享。"
        :auto-close="true"
        :auto-close-delay="2000"
        :show-button="false"
        @close="showSuccessModal = false"
      />

      <!-- 错误提示弹窗 -->
      <ErrorModal
        :show="showErrorModal"
        title="发布失败"
        :message="errorMsg"
        @close="showErrorModal = false"
      />

      <!-- 确认提示弹窗（暂时预留，可以用于删除评价等操作） -->
      <ConfirmModal
        :show="showConfirmModal"
        title="确认操作"
        message="确定要执行此操作吗？"
        confirm-text="确认"
        cancel-text="取消"
        @confirm="handleConfirm"
        @cancel="showConfirmModal = false"
        @close="showConfirmModal = false"
      />
    </div>
  </HomeContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import HomeContainer from "~/components/home/HomeContainer.vue";
import FileUpload from "~/components/FileUpload.vue";
import { useFileUpload } from "~/composables/useFileUpload";
// 🔥 导入统一弹窗组件
import { SuccessModal, ErrorModal, ConfirmModal } from "~/components/ui";

// ... 接口定义保持不变 ...
interface Course {
  id: number;
  code: string;
  name: string;
  description: string;
  instructor_id: number | null;
  credits: number;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Review {
  id: number;
  content: string;
  rating?: number;
  semester?: string;
  author?: {
    username: string;
  };
  created_at: string;
  like_count?: number;
  isLiked?: boolean;
  replies?: Reply[];
}

interface Reply {
  id: number;
  content: string;
  author?: {
    username: string;
  };
  created_at: string;
}

interface ReviewForm {
  title: string;
  content: string;
  rating: number | null;
  semester: string;
}

// Composables
const { user, isLoggedIn } = useAuth();
const { fetchWithAuth } = useApi();
const { deleteFile } = useFileUpload();
const route = useRoute();

// 响应式数据
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

const reviews = ref<Review[]>([]);
const reviewForm = ref<ReviewForm>({
  title: "",
  content: "",
  rating: null,
  semester: "",
});
const uploadedFileIds = ref<number[]>([]);
const uploadedImages = ref<any[]>([]); // Store uploaded image objects
const availableSemesters = ref<Array<{
  code: string;
  display_name: string;
  year: string;
  season: string;
  season_display: string;
}>>([]);

const isLoading = ref(true);
const isLoadingReviews = ref(false);
const isSubmittingReview = ref(false);
const error = ref("");
const showReviewForm = ref(false);
const showReplyForm = ref<number | null>(null);
const replyContent = ref("");

// 🔥 弹窗状态
const showSuccessModal = ref(false);
const showErrorModal = ref(false);
const showConfirmModal = ref(false);
const errorMsg = ref("");

// 计算属性
const courseId = computed(() => route.params.id as string);
const averageRating = computed(() => {
  const ratedReviews = reviews.value.filter((r) => r.rating);
  if (ratedReviews.length === 0) return 0;
  const sum = ratedReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
  return sum / ratedReviews.length;
});

// 核心业务逻辑（获取课程详情和评价的代码保持不变）
const fetchCourseDetail = async () => {
  try {
    isLoading.value = true;
    error.value = "";

    console.log("📤 获取课程详情，课程ID:", courseId.value);

    const response = await fetchWithAuth(
      `https://dev.unikorn.axfff.com/api/courses/${courseId.value}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("课程不存在或已被删除");
      }
      throw new Error(`获取课程详情失败: ${response.status}`);
    }

    const data = await response.json();
    courseDetail.value = data;

    console.log("✅ 课程详情获取成功:", data);
    await Promise.all([
      fetchCourseReviews(),
      fetchAvailableSemesters()
    ]);
  } catch (err: any) {
    console.error("❌ 获取课程详情失败:", err);
    error.value = err.message || "获取课程详情失败";
  } finally {
    isLoading.value = false;
  }
};

const fetchCourseReviews = async () => {
  try {
    isLoadingReviews.value = true;

    const response = await fetchWithAuth(
      `https://dev.unikorn.axfff.com/api/courses/${courseId.value}/posts?limit=50`
    );

    if (response.ok) {
      const data = await response.json();
      reviews.value = (data.posts || []).map((post: any) => ({
        id: post.id,
        content: post.content,
        rating: extractRating(post.content),
        semester: extractSemester(post.tags),
        author: post.author,
        created_at: post.created_at,
        like_count: post.like_count || 0,
        isLiked: false,
        replies: [],
      }));

      console.log("✅ 课程评价获取成功:", reviews.value);
    } else {
      console.error("❌ 获取课程评价失败:", response.status);
    }
  } catch (error) {
    console.error("❌ 获取课程评价失败:", error);
  } finally {
    isLoadingReviews.value = false;
  }
};

const fetchAvailableSemesters = async () => {
  try {
    const response = await fetchWithAuth(
      `https://dev.unikorn.axfff.com/api/courses/${courseId.value}/semesters?lang=zh`
    );

    if (response.ok) {
      const data = await response.json();
      availableSemesters.value = data.semesters || [];
      console.log("✅ 可用学期获取成功:", availableSemesters.value);
    } else {
      console.error("❌ 获取可用学期失败:", response.status);
      // Fallback to some default semesters if API fails
      availableSemesters.value = [
        { code: "2024spring", display_name: "2024春", year: "2024", season: "spring", season_display: "春" },
        { code: "2024fall", display_name: "2024秋", year: "2024", season: "fall", season_display: "秋" },
        { code: "2025spring", display_name: "2025春", year: "2025", season: "spring", season_display: "春" },
        { code: "2025fall", display_name: "2025秋", year: "2025", season: "fall", season_display: "秋" }
      ];
    }
  } catch (error) {
    console.error("❌ 获取可用学期失败:", error);
    // Fallback to some default semesters if API fails
    availableSemesters.value = [
      { code: "2024spring", display_name: "2024春", year: "2024", season: "spring", season_display: "春" },
      { code: "2024fall", display_name: "2024秋", year: "2024", season: "fall", season_display: "秋" },
      { code: "2025spring", display_name: "2025春", year: "2025", season: "spring", season_display: "春" },
      { code: "2025fall", display_name: "2025秋", year: "2025", season: "fall", season_display: "秋" }
    ];
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

    // 构造标签
    const tags = [courseDetail.value.code];
    if (reviewForm.value.semester) {
      // reviewForm.value.semester now contains the semester code (e.g., "2024fall")
      // Need to convert it to the tag format used in backend
      const selectedSemester = availableSemesters.value.find(s => s.code === reviewForm.value.semester);
      if (selectedSemester) {
        // Create tag in format: "COURSE_CODE-YEARseason" (e.g., "AIAA 1010-2024fall")
        tags.push(`${courseDetail.value.code}-${selectedSemester.code}`);
      }
    }

    // 构造帖子内容（包含评分）
    let content = reviewForm.value.content;
    if (reviewForm.value.rating) {
      content += `\n\n⭐ 评分：${reviewForm.value.rating}/5 星`;
    }

    const postData = {
      title: reviewForm.value.title.trim() || `${courseDetail.value.name} 课程评价`,
      content: content,
      tags: tags,
      file_ids: uploadedFileIds.value,
    };

    console.log("📤 发布课程评价:", postData);

    const response = await fetchWithAuth(
      "https://dev.unikorn.axfff.com/api/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      }
    );

    if (response.ok) {
      const createdPost = await response.json();
      console.log("✅ 课程评价发布成功:", createdPost);

      // 🔥 重置表单
      reviewForm.value = {
        title: "",
        content: "",
        rating: null,
        semester: "",
      };
      uploadedFileIds.value = [];
      uploadedImages.value = []; // Reset uploaded images
      showReviewForm.value = false;

      // 🔥 重新加载评价列表
      await fetchCourseReviews();

      // 🔥 显示成功弹窗
      showSuccessModal.value = true;
    } else {
      const errorData = await response.json().catch(() => ({}));

      // 🔥 显示错误弹窗
      errorMsg.value =
        errorData.msg || errorData.message || "发布失败，请稍后重试";
      showErrorModal.value = true;
    }
  } catch (error: any) {
    console.error("❌ 发布课程评价失败:", error);

    // 🔥 根据错误类型显示不同的错误信息
    if (
      error.name === "TypeError" ||
      error.message.includes("fetch") ||
      error.message.includes("network")
    ) {
      errorMsg.value = "网络连接失败，请检查您的网络设置后重试";
    } else if (
      error.message.includes("permission") ||
      error.message.includes("权限") ||
      error.message.includes("403")
    ) {
      errorMsg.value = "您没有权限执行此操作，请联系管理员获取相应权限";
    } else {
      errorMsg.value = error.message || "发布失败，请稍后重试";
    }

    showErrorModal.value = true;
  } finally {
    isSubmittingReview.value = false;
  }
};

// 工具函数
const extractRating = (content: string) => {
  const ratingMatch = content.match(/⭐ 评分：(\d)/);
  return ratingMatch ? parseInt(ratingMatch[1]) : null;
};

const extractSemester = (tags: any[]) => {
  if (!tags || !Array.isArray(tags)) return null;
  
  // Look for semester tags in new format: "COURSE_CODE-YEARseason"
  const semesterTag = tags.find((tag) => {
    if (!tag.name || !tag.name.includes("-")) return false;
    
    const parts = tag.name.split("-");
    if (parts.length < 2) return false;
    
    const semesterPart = parts[1];
    // Match patterns like "2024fall", "2024spring", "2024春", "2024秋"
    return /^\d{4}(spring|summer|fall|winter|春|夏|秋|冬)$/i.test(semesterPart);
  });
  
  if (semesterTag) {
    const semesterCode = semesterTag.name.split("-")[1];
    
    // Convert to display format for Chinese UI
    const year = semesterCode.match(/\d{4}/)?.[0] || "";
    const seasonMatch = semesterCode.match(/(spring|summer|fall|winter|春|夏|秋|冬)$/i);
    
    if (seasonMatch) {
      const season = seasonMatch[1].toLowerCase();
      const seasonMap: Record<string, string> = {
        'spring': '春',
        'summer': '夏', 
        'fall': '秋',
        'winter': '冬',
        '春': '春',
        '夏': '夏',
        '秋': '秋',
        '冬': '冬'
      };
      
      return `${year}${seasonMap[season] || season}`;
    }
  }
  
  return null;
};

const formatDate = (dateString: string) => {
  if (!dateString) return "未知";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "日期格式错误";
  }
};

// 交互功能
const cancelReview = () => {
  showReviewForm.value = false;
  reviewForm.value = {
    title: "",
    content: "",
    rating: null,
    semester: "",
  };
  uploadedFileIds.value = [];
  uploadedImages.value = []; // Reset uploaded images
};

// File upload handlers
const onFileUploadSuccess = (file: any) => {
  console.log('✅ 图片上传成功:', file);
  uploadedImages.value.push(file);
  uploadedFileIds.value.push(file.id);
};

const removeUploadedImage = async (index: number) => {
  const image = uploadedImages.value[index];
  
  try {
    // Delete from server using the composable defined at top level
    await deleteFile(image.id);
    
    // Remove from local arrays
    uploadedImages.value.splice(index, 1);
    uploadedFileIds.value.splice(uploadedFileIds.value.indexOf(image.id), 1);
    
    console.log('✅ 图片删除成功:', image.original_filename);
  } catch (error) {
    console.error('❌ 图片删除失败:', error);
    errorMsg.value = `图片删除失败: ${error.message}`;
    showErrorModal.value = true;
  }
};

const onUploadError = (error: Error) => {
  errorMsg.value = `图片上传失败: ${error.message}`;
  showErrorModal.value = true;
};

const toggleLike = async (review: Review) => {
  console.log("点赞评价:", review.id);
};

const toggleReply = (reviewId: number) => {
  showReplyForm.value = showReplyForm.value === reviewId ? null : reviewId;
  replyContent.value = "";
};

const submitReply = async (reviewId: number) => {
  console.log("回复评价:", reviewId, replyContent.value);
  cancelReply();
};

const cancelReply = () => {
  showReplyForm.value = null;
  replyContent.value = "";
};

// 🔥 确认弹窗处理（预留）
const handleConfirm = () => {
  showConfirmModal.value = false;
  // 在这里处理确认操作
};

// 生命周期
onMounted(() => {
  console.log("🔄 课程详情页面加载，课程ID:", courseId.value);
  if (courseId.value && courseId.value !== "0") {
    fetchCourseDetail();
  } else {
    error.value = "无效的课程ID";
    isLoading.value = false;
  }
});

// SEO 元数据
useHead({
  title: computed(() => `${courseDetail.value.name || "课程"} - 评课系统`),
  meta: [
    {
      name: "description",
      content: computed(
        () => `查看 ${courseDetail.value.name} 的评课信息和学生评价`
      ),
    },
  ],
});
</script>

<!-- 样式保持不变 -->
<style lang="scss" scoped>
// ... 保留原有所有样式 ...
.course-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  gap: 1rem;

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3498db;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-state {
  text-align: center;
  padding: 3rem 2rem;
  background-color: #fdf2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 2rem auto;
  max-width: 600px;

  i {
    font-size: 3rem;
    color: #dc2626;
    margin-bottom: 1rem;
  }

  h2 {
    color: #dc2626;
    margin-bottom: 1rem;
  }

  p {
    color: #7f1d1d;
    margin-bottom: 1.5rem;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .retry-btn,
  .back-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
  }

  .retry-btn {
    background-color: #dc2626;
    color: white;
    &:hover {
      background-color: #b91c1c;
    }
  }

  .back-btn {
    background-color: #6b7280;
    color: white;
    &:hover {
      background-color: #4b5563;
    }
  }
}

.course-detail-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.course-header {
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.course-title-section {
  margin-bottom: 1rem;

  .course-name {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
  }

  .course-code {
    background: rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 500;
  }
}

.course-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;

  span {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.15);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.875rem;
  }
}

.course-description-section {
  padding: 2rem;
  border-bottom: 1px solid #f0f0f0;

  h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #2c3e50;
    margin-bottom: 1.5rem;
    font-size: 1.25rem;

    i {
      color: #3498db;
    }
  }
}

.course-description {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  color: #555;
  line-height: 1.6;
}

// 课程评价区域样式
.course-reviews-section {
  padding: 2rem;

  .reviews-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;

    h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #2c3e50;
      font-size: 1.25rem;
      margin: 0;

      i {
        color: #3498db;
      }

      .reviews-count {
        color: #666;
        font-size: 0.9rem;
        font-weight: normal;
      }
    }

    .reviews-stats {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .average-rating {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: #f8f9fa;
      padding: 0.5rem 1rem;
      border-radius: 8px;

      .rating-number {
        font-size: 1.5rem;
        font-weight: 700;
        color: #2c3e50;
      }

      .stars {
        display: flex;
        gap: 0.125rem;

        i {
          font-size: 1rem;
          color: #ddd;

          &.active {
            color: #ffd700;
          }
        }
      }

      .rating-text {
        font-size: 0.875rem;
        color: #666;
      }
    }
  }
}

// 评价表单样式
.review-form-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;

  // .form-header {
  //   display: flex;
  //   justify-content: space-between;
  //   align-items: center;
  //   margin-bottom: 1rem;

  //   h4 {
  //     color: #2c3e50;
  //     margin: 0;
  //   }
  // }

  .review-form {
    margin-top: 1rem;

    .form-group {
      margin-bottom: 1.5rem;

      .form-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 0.5rem;

        i {
          color: #3498db;
          width: 16px;
        }
      }

      .form-select,
      .form-input,
      .form-textarea {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #e1e8ed;
        border-radius: 8px;
        font-size: 1rem;
        font-family: inherit;
        transition: border-color 0.3s ease;

        &:focus {
          outline: none;
          border-color: #3498db;
        }
      }

      .form-textarea {
        resize: vertical;
        line-height: 1.6;
      }

      .char-count {
        text-align: right;
        font-size: 0.875rem;
        color: #666;
        margin-top: 0.25rem;
      }

      .form-hint {
        font-size: 0.75rem;
        color: #999;
        margin-top: 0.25rem;
        font-style: italic;
      }

      .uploaded-images {
        margin-top: 1rem;
        
        h4 {
          color: #2c3e50;
          margin-bottom: 1rem;
          font-size: 1rem;
          font-weight: 600;
        }
      }

      .image-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
      }

      .image-preview {
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        background: #f8f9fa;
        border: 1px solid #e1e8ed;
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .preview-img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          display: block;
        }

        .image-info {
          padding: 0.75rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;

          .filename {
            font-size: 0.75rem;
            color: #666;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            flex: 1;
          }

          .remove-btn {
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 0.875rem;
            line-height: 1;
            transition: all 0.3s ease;

            &:hover {
              background: #c82333;
              transform: scale(1.1);
            }
          }
        }
      }
    }

    // 评分输入样式
    .rating-input {
      display: flex;
      align-items: center;
      gap: 1rem;

      .stars {
        display: flex;
        gap: 0.25rem;
      }

      .star {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #ddd;
        cursor: pointer;
        transition: color 0.3s ease;

        &:hover,
        &.active {
          color: #ffd700;
        }
      }

      .rating-text {
        color: #666;
        font-size: 0.875rem;
      }

      .clear-rating {
        background: none;
        border: none;
        color: #666;
        font-size: 0.875rem;
        cursor: pointer;
        text-decoration: underline;

        &:hover {
          color: #dc2626;
        }
      }
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;

      @media (max-width: 768px) {
        flex-direction: column;
      }
    }
  }
}

// 按钮样式
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.btn-primary {
    background: #3498db;
    color: white;

    &:hover:not(:disabled) {
      background: #2980b9;
    }
  }

  &.btn-secondary {
    background: #6b7280;
    color: white;

    &:hover {
      background: #4b5563;
    }
  }

  &.btn-small {
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
  }
}

// 登录提示样式
.login-prompt {
  text-align: center;
  padding: 2rem;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 2rem;

  i {
    font-size: 2rem;
    color: #3498db;
    margin-bottom: 1rem;
  }

  p {
    color: #666;
    margin-bottom: 1rem;
  }
}

// 评价列表样式
.reviews-list {
  .loading-reviews {
    text-align: center;
    padding: 2rem;

    .loading-spinner.small {
      width: 30px;
      height: 30px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .no-reviews {
    text-align: center;
    padding: 3rem 2rem;
    color: #666;

    i {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }
  }

  .review-items {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .review-item {
    background: white;
    border: 1px solid #e1e8ed;
    border-radius: 12px;
    padding: 1.5rem;
    transition: box-shadow 0.3s ease;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      gap: 0.5rem;

      .reviewer-info {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;

        .reviewer-name {
          font-weight: 600;
          color: #2c3e50;
        }

        .review-date {
          color: #666;
          font-size: 0.875rem;
        }

        .review-semester {
          background: #e3f2fd;
          color: #1565c0;
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
        }
      }

      .review-rating {
        display: flex;
        align-items: center;
        gap: 0.5rem;

        .stars {
          display: flex;
          gap: 0.125rem;

          i {
            font-size: 0.875rem;
            color: #ddd;

            &.active {
              color: #ffd700;
            }
          }
        }

        .rating-number {
          font-size: 0.875rem;
          font-weight: 600;
          color: #2c3e50;
        }
      }
    }

    .review-content {
      color: #2c3e50;
      line-height: 1.6;
      margin-bottom: 1rem;
      white-space: pre-wrap;
    }

    .review-actions {
      display: flex;
      gap: 1rem;

      .action-btn {
        background: none;
        border: none;
        color: #666;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        transition: all 0.3s ease;

        &:hover {
          background: #f8f9fa;
          color: #2c3e50;
        }

        &.liked {
          color: #3498db;
        }
      }
    }
  }
}

// 回复相关样式
.reply-form {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e1e8ed;

  .reply-textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e1e8ed;
    border-radius: 8px;
    resize: vertical;
    font-family: inherit;
    margin-bottom: 0.5rem;

    &:focus {
      outline: none;
      border-color: #3498db;
    }
  }

  .reply-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }
}

.replies-list {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e1e8ed;

  .reply-item {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.75rem;

    &:last-child {
      margin-bottom: 0;
    }

    .reply-header {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 0.5rem;

      .reply-author {
        font-weight: 600;
        color: #2c3e50;
        font-size: 0.875rem;
      }

      .reply-date {
        color: #666;
        font-size: 0.75rem;
      }
    }

    .reply-content {
      color: #555;
      line-height: 1.5;
      font-size: 0.875rem;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .course-detail-page {
    padding: 1rem;
  }

  .course-reviews-section {
    padding: 1.5rem;
  }

  .reviews-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .review-form-section {
    padding: 1rem;
  }
}
</style>
