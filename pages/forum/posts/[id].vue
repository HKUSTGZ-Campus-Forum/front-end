<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatDate } from "~/utils/dateFormat";
import { useApi } from "~/composables/useApi";
import { useAuth } from "~/composables/useAuth";
import CommentList from "~/components/forum/CommentList.vue";
import { SuccessModal, ErrorModal, ConfirmModal, ImageModal } from "~/components/ui";
import EmojiReactions from "~/components/forum/EmojiReation.vue";
import UserAvatar from "~/components/user/UserAvatar.vue";
import IdentityBadge from "~/components/identity/IdentityBadge.vue";
import { getVisiblePostTags } from "~/utils/courseOffering";
import PostPdfPageViewer from "~/components/forum/PostPdfPageViewer.vue";
import PostDocxPagesViewer from "~/components/forum/PostDocxPagesViewer.vue";
import PostOfficeDocViewer from "~/components/forum/PostOfficeDocViewer.vue";
import {
  isPostImageFile,
  isPdfFile,
  isDocxFile,
  isLegacyDocFile,
  isDownloadOnlyFile,
} from "~/utils/postFileKinds";

definePageMeta({ layout: 'keguang' });

const route = useRoute();
const router = useRouter();
const { fetchWithAuth, fetchPublic } = useApi();
const { isLoggedIn, user } = useAuth();

const showConfirmModal = ref(false);
const showSuccessModal = ref(false);
const showErrorModal = ref(false);
const errorMsg = ref("");
const shareSuccess = ref(false);
const showImageModal = ref(false);
const currentImageIndex = ref(0);
const currentImage = ref(null);

const postId = route.params.id;
const post = ref({});
const isLoading = ref(true);
const errorMessage = ref("");

const postData = computed(() => post.value);
const visibleTags = computed(() => getVisiblePostTags(postData.value.tags || []));

const getTagKey = (tag, index) => {
  if (tag && typeof tag === 'object') {
    return tag.id || tag.tag_id || tag.name || tag.tag_name || index;
  }
  return tag || index;
};

const getTagLabel = (tag) => {
  if (tag && typeof tag === 'object') {
    return tag.name || tag.tag_name || '';
  }
  return String(tag || '');
};

const canDeletePost = computed(() => {
  if (!isLoggedIn.value || !user.value || !postData.value.user_id) return false;
  return Number(user.value.id) === Number(postData.value.user_id);
});

const postImages = computed(() => {
  if (!postData.value.files) return [];
  return postData.value.files.filter((file) => file && isPostImageFile(file));
});

const postPdfFiles = computed(() =>
  (postData.value.files || []).filter((f) => f && isPdfFile(f))
);

const postDocxFiles = computed(() =>
  (postData.value.files || []).filter((f) => f && isDocxFile(f))
);

const postLegacyDocFiles = computed(() =>
  (postData.value.files || []).filter((f) => f && isLegacyDocFile(f))
);

const postDownloadOnlyFiles = computed(() =>
  (postData.value.files || []).filter((f) => f && isDownloadOnlyFile(f))
);

const filePublicUrl = (file) => file?.url || file?.file_url || "";

const showDeleteConfirm = () => {
  if (!canDeletePost.value) {
    errorMsg.value = "您没有权限删除此帖子";
    showErrorModal.value = true;
    return;
  }
  showConfirmModal.value = true;
};

const handleDeleteConfirm = async () => {
  try {
    const { getApiUrl } = useApi();
    const response = await fetchWithAuth(getApiUrl(`/api/posts/${postId}`), { method: "DELETE" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      errorMsg.value = data.message || `删除失败 (${response.status})`;
      showErrorModal.value = true;
      showConfirmModal.value = false;
      return;
    }
    showSuccessModal.value = true;
  } catch (error) {
    if (error.name === "TypeError" || error.message.includes("fetch") || error.message.includes("network")) {
      errorMsg.value = "网络连接失败，请检查您的网络设置后重试";
    } else if (error.message.includes("permission") || error.message.includes("权限") || error.message.includes("403")) {
      errorMsg.value = "您没有权限执行此操作，请联系管理员获取相应权限";
    } else {
      errorMsg.value = error.message || "删除失败，请稍后重试";
    }
    showErrorModal.value = true;
  }
};

const handleSuccessClose = () => {
  showSuccessModal.value = false;
  router.push("/forum");
};

const goToUserProfile = () => {
  if (postData.value.user_id) router.push(`/users/${postData.value.user_id}`);
};

const sharePost = async () => {
  try {
    const postUrl = `${window.location.origin}/forum/posts/${postId}`;
    const shareMessage = `📖 ${postData.value.title}\n🔗 查看详情: ${postUrl}\n - UniKorn 科广汇`;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareMessage);
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = shareMessage;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
    shareSuccess.value = true;
    setTimeout(() => { shareSuccess.value = false; }, 2000);
  } catch (error) {
    errorMsg.value = '复制失败，请手动复制链接';
    showErrorModal.value = true;
  }
};

const fetchPostData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = "";
    const { getApiUrl } = useApi();
    const response = await fetchPublic(getApiUrl(`/api/posts/${postId}`));
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      errorMessage.value = `获取帖子失败 (${response.status}): ${errorText}`;
      return;
    }
    const data = await response.json();
    post.value = {
      id: data.id || data.post_id,
      title: data.title,
      content: data.content,
      author: data.author || "匿名用户",
      author_avatar: data.author_avatar,
      publishDate: data.created_at || data.time || new Date().toISOString(),
      reaction_count: data.reaction_count || 0,
      comment_count: data.comment_count || 0,
      views_count: data.views_count || data.view_count || 0,
      tags: data.tags || [],
      user_id: data.author_id || data.user_id,
      files: data.files || [],
      display_identity: data.display_identity || null,
    };
  } catch (error) {
    errorMessage.value = "无法连接到服务器，请稍后重试";
  } finally {
    isLoading.value = false;
  }
};

const getGenericImageName = (file, index) => {
  let imageType = '图片';
  if (file.mime_type) {
    if (file.mime_type.includes('jpeg') || file.mime_type.includes('jpg')) imageType = '照片';
    else if (file.mime_type.includes('png')) imageType = 'PNG图片';
    else if (file.mime_type.includes('gif')) imageType = 'GIF动图';
    else if (file.mime_type.includes('webp')) imageType = 'WebP图片';
  }
  const totalImages = postImages.value.length;
  return totalImages > 1 ? `${imageType} ${index + 1}/${totalImages}` : imageType;
};

const openImageModal = (file) => {
  const images = postImages.value;
  const index = images.findIndex(img => img.id === file.id);
  if (index !== -1) {
    currentImageIndex.value = index;
    currentImage.value = images[index];
    showImageModal.value = true;
  }
};

const closeImageModal = () => {
  showImageModal.value = false;
  currentImage.value = null;
  currentImageIndex.value = 0;
};

const showPreviousImage = () => {
  const images = postImages.value;
  if (currentImageIndex.value > 0) {
    currentImageIndex.value--;
    currentImage.value = images[currentImageIndex.value];
  }
};

const showNextImage = () => {
  const images = postImages.value;
  if (currentImageIndex.value < images.length - 1) {
    currentImageIndex.value++;
    currentImage.value = images[currentImageIndex.value];
  }
};

const handleImageError = (event) => { console.error('Image failed to load:', event.target.src); };
const handleImageLoad = (event) => {};

onMounted(() => { fetchPostData(); });
</script>

<template>
  <div class="kg-post-detail">
    <div class="kg-back-bar">
      <NuxtLink to="/forum" class="kg-back-link">
        <ForumUiIcon name="back" class="kg-back-link__icon" />
        <span>返回论坛</span>
      </NuxtLink>
    </div>

    <div v-if="isLoading" class="kg-loading">
      <div class="kg-spinner"></div>
      <span>加载中...</span>
    </div>

    <div v-else-if="errorMessage" class="kg-error-box">
      <p>{{ errorMessage }}</p>
      <button class="kg-btn-ghost" @click="fetchPostData">重试</button>
    </div>

    <template v-else>
      <article class="kg-card kg-article">
        <header class="kg-article__header">
          <h1 class="kg-article__title">{{ postData.title }}</h1>
          <div class="kg-article__meta">
            <div class="kg-author" @click="goToUserProfile">
              <UserAvatar
                :avatar-url="postData.author_avatar"
                :username="postData.author"
                :user-id="postData.user_id"
                size="md"
              />
              <div class="kg-author__info">
                <span class="kg-author__name">{{ postData.author }}</span>
                <IdentityBadge v-if="postData.display_identity" :identity="postData.display_identity" />
              </div>
            </div>
            <div class="kg-article__actions">
              <span class="kg-meta-item">{{ formatDate(postData.publishDate) }}</span>
              <span class="kg-meta-item">
                <ForumUiIcon name="eye" class="kg-meta-icon" />
                {{ postData.views_count }}
              </span>
              <button class="kg-icon-btn" @click="sharePost" :title="shareSuccess ? '已复制!' : '分享'">
                <ForumUiIcon :name="shareSuccess ? 'check' : 'share'" class="kg-meta-icon" />
                <span v-if="shareSuccess">已复制</span>
              </button>
              <button v-if="canDeletePost" class="kg-icon-btn kg-icon-btn--danger" @click="showDeleteConfirm">
                <ForumUiIcon name="delete" class="kg-meta-icon" />
              </button>
            </div>
          </div>

          <div v-if="visibleTags.length" class="kg-article__tags">
            <span v-for="(tag, index) in visibleTags" :key="getTagKey(tag, index)" class="kg-tag">
              {{ getTagLabel(tag) }}
            </span>
          </div>
        </header>

        <div class="kg-article__content" v-html="postData.content?.replace(/\n/g, '<br>')"></div>

        <div v-if="postImages.length" class="kg-article__images">
          <div
            v-for="(file, idx) in postImages"
            :key="file.id"
            class="kg-image-thumb"
            @click="openImageModal(file)"
          >
            <img :src="file.url || file.file_url" :alt="getGenericImageName(file, idx)" @error="handleImageError" @load="handleImageLoad" />
          </div>
        </div>

        <div v-if="postPdfFiles.length" class="kg-article__file-previews">
          <h3 class="kg-article__files-heading">PDF</h3>
          <div
            v-for="file in postPdfFiles"
            :key="'pdf-' + file.id"
            class="kg-preview-card"
          >
            <p class="kg-preview-filename">{{ file.original_filename || 'PDF 附件' }}</p>
            <ClientOnly>
              <PostPdfPageViewer :url="filePublicUrl(file)" />
              <template #fallback>
                <p class="kg-preview-fallback">预览加载中…</p>
              </template>
            </ClientOnly>
          </div>
        </div>

        <div v-if="postDocxFiles.length" class="kg-article__file-previews">
          <h3 class="kg-article__files-heading">Word（.docx）</h3>
          <div
            v-for="file in postDocxFiles"
            :key="'docx-' + file.id"
            class="kg-preview-card"
          >
            <p class="kg-preview-filename">{{ file.original_filename || 'Word 附件' }}</p>
            <ClientOnly>
              <PostDocxPagesViewer :url="filePublicUrl(file)" />
              <template #fallback>
                <p class="kg-preview-fallback">预览加载中…</p>
              </template>
            </ClientOnly>
          </div>
        </div>

        <div v-if="postLegacyDocFiles.length" class="kg-article__file-previews">
          <h3 class="kg-article__files-heading">Word（.doc）</h3>
          <div
            v-for="file in postLegacyDocFiles"
            :key="'doc-' + file.id"
            class="kg-preview-card"
          >
            <p class="kg-preview-filename">{{ file.original_filename || 'Word 附件' }}</p>
            <ClientOnly>
              <PostOfficeDocViewer
                :url="filePublicUrl(file)"
                :original-filename="file.original_filename"
              />
              <template #fallback>
                <p class="kg-preview-fallback">预览加载中…</p>
              </template>
            </ClientOnly>
          </div>
        </div>

        <div v-if="postDownloadOnlyFiles.length" class="kg-article__downloads">
          <h3 class="kg-article__files-heading">附件下载</h3>
          <ul class="kg-download-list">
            <li v-for="file in postDownloadOnlyFiles" :key="'dl-' + file.id">
              <a
                class="kg-download-link"
                :href="filePublicUrl(file)"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ file.original_filename || '附件' }}
              </a>
              <span v-if="file.file_size" class="kg-download-meta">
                {{ Math.round(file.file_size / 1024) }} KB
              </span>
            </li>
          </ul>
        </div>

        <div class="kg-article__reactions">
          <EmojiReactions :post-id="postData.id" />
        </div>
      </article>

      <section class="kg-card kg-comments">
        <h2 class="kg-section-title">评论 ({{ postData.comment_count }})</h2>
        <CommentList :post-id="postId" />
      </section>
    </template>

    <ConfirmModal
      v-if="showConfirmModal"
      title="确认删除"
      message="确定要删除这篇帖子吗？此操作无法撤销。"
      @confirm="handleDeleteConfirm"
      @cancel="showConfirmModal = false"
    />
    <SuccessModal v-if="showSuccessModal" message="帖子已成功删除" @close="handleSuccessClose" />
    <ErrorModal v-if="showErrorModal" :message="errorMsg" @close="showErrorModal = false" />
    <ImageModal
      v-if="showImageModal"
      :image="currentImage"
      :images="postImages"
      :current-index="currentImageIndex"
      @close="closeImageModal"
      @prev="showPreviousImage"
      @next="showNextImage"
    />
  </div>
</template>

<style lang="scss" scoped>
.kg-post-detail {
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
  color: #26a4ff;
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
  background: #F5FBFE;
  border: 1.5px solid #c8dff8;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(40, 57, 101, 0.07);
  padding: 28px 32px;
  margin-bottom: 20px;
}

.kg-article__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 16px;
  line-height: 1.4;
}

.kg-article__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
}

.kg-author {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  &:hover .kg-author__name { color: #26a4ff; }
}

.kg-author__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.kg-author__name {
  font-size: 0.9rem;
  font-weight: 600;
  color: #1a2a4a;
  transition: color 0.2s;
}

.kg-article__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kg-meta-item {
  font-size: 0.8rem;
  color: #6a85a0;
  display: flex;
  align-items: center;
  gap: 4px;
}

.kg-meta-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}

.kg-icon-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1.5px solid #c8dff8;
  border-radius: 10px;
  background: transparent;
  color: #4a6080;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: #26a4ff; color: #26a4ff; }
  &--danger { &:hover { border-color: #e05a5a; color: #e05a5a; } }
}

.kg-article__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.kg-tag {
  padding: 3px 12px;
  background: rgba(38, 164, 255, 0.1);
  border: 1px solid rgba(38, 164, 255, 0.3);
  border-radius: 12px;
  font-size: 0.75rem;
  color: #26a4ff;
}

.kg-article__content {
  font-size: 0.95rem;
  line-height: 1.8;
  color: #1a2a4a;
  margin: 20px 0;
  word-break: break-word;
}

.kg-article__images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.kg-image-thumb {
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 1.5px solid #c8dff8;
  aspect-ratio: 1;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s;
  }
  &:hover img { transform: scale(1.04); }
}

.kg-article__files-heading {
  font-size: 1rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 12px;
}

.kg-article__file-previews {
  margin: 20px 0;
}

.kg-preview-card {
  margin-bottom: 20px;
}

.kg-preview-filename {
  margin: 0 0 8px;
  font-size: 0.875rem;
  color: #4a6080;
  word-break: break-all;
}

.kg-preview-fallback {
  margin: 0;
  padding: 12px;
  font-size: 0.875rem;
  color: #6a85a0;
}

.kg-article__downloads {
  margin: 20px 0;
}

.kg-download-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.kg-download-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 8px 0;
  border-bottom: 1px solid #e8f4fd;
}

.kg-download-link {
  color: #2563eb;
  text-decoration: none;
  font-size: 0.9rem;
  word-break: break-all;
}

.kg-download-link:hover {
  text-decoration: underline;
}

.kg-download-meta {
  font-size: 0.8rem;
  color: #6a85a0;
}

.kg-article__reactions {
  border-top: 1px solid #e8f4fd;
  padding-top: 16px;
  margin-top: 16px;
}

.kg-section-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #1a2a4a;
  margin: 0 0 20px;
}

.kg-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px;
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

@keyframes spin { to { transform: rotate(360deg); } }

.kg-error-box {
  text-align: center;
  padding: 60px 20px;
  color: #e05a5a;
  p { margin: 0 0 16px; font-size: 1rem; }
}

.kg-btn-ghost {
  padding: 8px 24px;
  border: 1.5px solid #c8dff8;
  border-radius: 14px;
  background: transparent;
  color: #4a6080;
  cursor: pointer;
  font-size: 0.9rem;
  &:hover { background: #F5FBFE; border-color: #26a4ff; color: #26a4ff; }
}

.kg-comments { }
</style>
