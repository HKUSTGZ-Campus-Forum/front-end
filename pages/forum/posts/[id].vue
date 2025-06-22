<template>
  <HomeContainer>
    <div class="post-container">
      <!-- 加载状态 -->
      <div v-if="isLoading" class="loading">加载中...</div>

      <!-- 错误状态 -->
      <div v-else-if="errorMessage" class="error">
        {{ errorMessage }}
      </div>

      <!-- 正常内容 -->
      <div v-else>
        <div class="post-header">
          <h1 class="post-title">{{ postData.title || "无标题" }}</h1>
          <div class="post-meta">
            <div class="author-info">
              <UserAvatar 
                :avatar-url="postData.author_avatar"
                :username="postData.author"
                :user-id="postData.user_id"
                size="sm"
                :clickable="true"
                @click="goToUserProfile"
              />
              <span class="author">{{ postData.author || "匿名用户" }}</span>
            </div>
            <span class="date"
              >发布于: {{ formatDate(postData.publishDate) }}</span
            >
            <span class="views" v-if="postData.views_count !== undefined">
              <i class="fas fa-eye"></i> {{ postData.views_count }} 浏览
            </span>
          </div>

          <!-- 标签展示 -->
          <div
            class="post-tags"
            v-if="postData.tags && postData.tags.length > 0"
          >
            <span v-for="tag in postData.tags" :key="tag.tag_id" class="tag">
              {{ tag.name }}
            </span>
          </div>
        </div>

        <div class="post-content">
          {{ postData.content }}
        </div>


        <!-- Post Images -->
        <div v-if="postData?.files?.length > 0" class="post-images">
          <div class="image-gallery">
            <div 
              v-for="(file, index) in postData.files.filter(f => f && isImageFile(f))" 
              :key="file.id"
              class="image-item"
            >
              <div class="image-container">
                <img 
                  :src="file.url" 
                  :alt="getGenericImageName(file, index)"
                  class="post-image"
                  @click="openImageModal(file)"
                  @error="handleImageError"
                  @load="handleImageLoad"
                />
                <div class="image-overlay">
                  <span class="image-filename">{{ getGenericImageName(file, index) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="post-reactions">
          <EmojiReactions :post-id="parseInt(postId)" type="post" />
        </div>

        <div class="post-actions" v-if="canDeletePost">
          <button class="delete-button" @click="showDeleteConfirm">
            <i class="fas fa-trash"></i> 删除
          </button>
        </div>

        <!-- <div
          class="test-actions"
          style="
            margin-bottom: 2rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
          " -->
        <!-- <h4 style="margin: 0 0 1rem 0; color: #666">🧪 弹窗测试区域</h4>
          <div style="display: flex; gap: 1rem; flex-wrap: wrap">
            <button class="test-btn success-test" @click="testSuccessModal">
              ✅ 测试成功弹窗
            </button>
            <button class="test-btn error-test" @click="testErrorModal">
              ❌ 测试错误弹窗
            </button>
            <button class="test-btn confirm-test" @click="testConfirmModal">
              ⚠️ 测试确认弹窗
            </button>
            <button
              class="test-btn permission-test"
              @click="testPermissionError"
            >
              🚫 测试权限错误
            </button>
          </div> -->
        <!-- </div> -->

        <ConfirmModal
          :show="showConfirmModal"
          title="删除确认"
          message="确定要删除这篇帖子吗？此操作无法撤销。"
          confirm-text="删除"
          cancel-text="取消"
          @confirm="handleDeleteConfirm"
          @cancel="showConfirmModal = false"
          @close="showConfirmModal = false"
        />

        <SuccessModal
          :show="showSuccessModal"
          title="删除成功"
          message="帖子已成功删除！即将跳转到论坛首页..."
          :auto-close="true"
          :auto-close-delay="3000"
          :show-button="false"
          @close="handleSuccessClose"
        />

        <ErrorModal
          :show="showErrorModal"
          title="删除失败"
          :message="errorMsg"
          @close="showErrorModal = false"
        />

        <!-- Image Modal -->
        <ImageModal
          :show="showImageModal"
          :image-url="currentImage?.url"
          :image-alt="getGenericImageName(currentImage, currentImageIndex)"
          :filename="getGenericImageName(currentImage, currentImageIndex)"
          :show-navigation="postImages.length > 1"
          :has-previous="currentImageIndex > 0"
          :has-next="currentImageIndex < postImages.length - 1"
          @close="closeImageModal"
          @previous="showPreviousImage"
          @next="showNextImage"
        />

        <!-- 评论区域 -->
        <CommentList :post-id="parseInt(postId)" />
      </div>
    </div>
  </HomeContainer>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatDate } from "~/utils/dateFormat";
import { useUser } from "~/composables/useUser";
import { useApi } from "~/composables/useApi";
import { useAuth } from "~/composables/useAuth";
import CommentList from "~/components/forum/CommentList.vue";
import { SuccessModal, ErrorModal, ConfirmModal, ImageModal } from "~/components/ui";
import EmojiReactions from "~/components/forum/EmojiReation.vue";
import UserAvatar from "~/components/user/UserAvatar.vue";

// Composables
const route = useRoute();
const router = useRouter();
const { getUsernameById } = useUser();
const { fetchWithAuth, fetchPublic } = useApi();
const { isLoggedIn, user } = useAuth();

// 弹窗状态
const showConfirmModal = ref(false);
const showSuccessModal = ref(false);
const showErrorModal = ref(false);
const errorMsg = ref("");

// 图片模态框状态
const showImageModal = ref(false);
const currentImageIndex = ref(0);
const currentImage = ref(null);

// 响应式数据
const postId = route.params.id;
const post = ref({});
const isLoading = ref(true);
const errorMessage = ref("");

// 计算属性
const postData = computed(() => post.value);

const canDeletePost = computed(() => {
  if (!isLoggedIn.value || !user.value || !postData.value.user_id) {
    return false;
  }
  return Number(user.value.id) === Number(postData.value.user_id);
});

// 计算帖子中的所有图片
const postImages = computed(() => {
  if (!postData.value.files) return [];
  return postData.value.files.filter(file => file && isImageFile(file));
});

// 显示删除确认弹窗
const showDeleteConfirm = () => {
  if (!canDeletePost.value) {
    // 也可以改为用错误弹窗显示权限错误
    errorMsg.value = "您没有权限删除此帖子";
    showErrorModal.value = true;
    return;
  }
  showConfirmModal.value = true;
};

// 处理删除确认
const handleDeleteConfirm = async () => {
  try {
    const { getApiUrl } = useApi();

    const response = await fetchWithAuth(
      getApiUrl(`/api/posts/${postId}`),
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      errorMsg.value = data.message || `删除失败 (${response.status})`;
      showErrorModal.value = true;
      showConfirmModal.value = false;
      return;
    }

    // 显示成功弹窗
    showSuccessModal.value = true;
  } catch (error) {
    console.error("❌ 删除失败:", error);

    // 判断错误类型
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
      errorMsg.value = error.message || "删除失败，请稍后重试";
    }

    showErrorModal.value = true;
  }
};

// 处理成功弹窗关闭
const handleSuccessClose = () => {
  showSuccessModal.value = false;
  // 跳转到论坛首页
  router.push("/forum");
};

// Navigate to user profile
const goToUserProfile = () => {
  if (postData.value.user_id) {
    router.push(`/users/${postData.value.user_id}`);
  }
};

// const testSuccessModal = () => {
//   showSuccessModal.value = true;
// };

// const testErrorModal = () => {
//   errorMsg.value = "这是一个测试错误消息：网络连接失败，请检查您的网络设置后重试。";
//   showErrorModal.value = true;
// };

// const testConfirmModal = () => {
//   showConfirmModal.value = true;
// };

// const testPermissionError = () => {
//   errorMsg.value = "您没有权限执行此操作，请联系管理员获取相应权限。";
//   showErrorModal.value = true;
// };

const fetchPostData = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = "";
    const { getApiUrl } = useApi();

    const response = await fetchPublic(
      getApiUrl(`/api/posts/${postId}`)
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      errorMessage.value = `获取帖子失败 (${response.status}): ${errorText}`;
      console.error("API error:", {
        status: response.status,
        response: errorText,
      });
      return;
    }

    const data = await response.json();

    // 统一数据格式 - 使用后端提供的 author 和 author_avatar 字段
    post.value = {
      id: data.id || data.post_id,
      title: data.title,
      content: data.content,
      author: data.author || "匿名用户", // 使用后端提供的 author 字段
      author_avatar: data.author_avatar, // 使用后端提供的 author_avatar 字段
      publishDate: data.created_at || data.time || new Date().toISOString(),
      reaction_count: data.reaction_count || 0,
      comment_count: data.comment_count || 0,
      views_count: data.views_count || data.view_count || 0,
      tags: data.tags || [],
      user_id: data.author_id || data.user_id,
      files: data.files || [], // Include files from API response
    };
  } catch (error) {
    console.error("获取帖子失败:", error);
    errorMessage.value = "无法连接到服务器，请稍后重试";
  } finally {
    isLoading.value = false;
  }
};

// Helper functions
const isImageFile = (file) => {
  if (!file) return false;
  
  // Check by MIME type first (more reliable)
  if (file.mime_type && file.mime_type.startsWith('image/')) {
    return true;
  }
  
  // Fallback to filename extension
  if (file.original_filename) {
    return /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.original_filename);
  }
  
  return false;
};

// Generate generic image description for privacy
const getGenericImageName = (file, index) => {
  if (!file) return '图片';
  
  // Determine image type from MIME type or extension
  let imageType = '图片';
  
  if (file.mime_type) {
    if (file.mime_type.includes('jpeg') || file.mime_type.includes('jpg')) {
      imageType = '照片';
    } else if (file.mime_type.includes('png')) {
      imageType = 'PNG图片';
    } else if (file.mime_type.includes('gif')) {
      imageType = 'GIF动图';
    } else if (file.mime_type.includes('webp')) {
      imageType = 'WebP图片';
    }
  } else if (file.original_filename) {
    const ext = file.original_filename.toLowerCase();
    if (ext.includes('.jpg') || ext.includes('.jpeg')) {
      imageType = '照片';
    } else if (ext.includes('.png')) {
      imageType = 'PNG图片';
    } else if (ext.includes('.gif')) {
      imageType = 'GIF动图';
    } else if (ext.includes('.webp')) {
      imageType = 'WebP图片';
    }
  }
  
  // Return generic name with index if multiple images
  const totalImages = postImages.value.length;
  if (totalImages > 1) {
    return `${imageType} ${index + 1}/${totalImages}`;
  } else {
    return imageType;
  }
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

const handleImageError = (event) => {
  console.error('Image failed to load:', event.target.src);
  // You could show a placeholder image here
  // event.target.src = '/path/to/placeholder.png';
};

const handleImageLoad = (event) => {
  // Image loaded successfully
};

// 组件挂载时获取数据
onMounted(() => {
  fetchPostData();
});
</script>

<style lang="scss" scoped>
.post-reactions {
  margin: 2rem 0;
  padding: 1.5rem 0;
  border-top: 1px solid var(--border-secondary);
  border-bottom: 1px solid var(--border-secondary);
  background: var(--surface-secondary);
  border-radius: 8px;
  padding: 1.5rem;
}

.post-container {
  max-width: 800px;
  margin: 0 auto;
  background-color: var(--card-bg);
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: var(--shadow-medium);
  
  // Mobile responsiveness
  @media (max-width: 480px) {
    margin: 0;
    border-radius: 0;
    padding: 1rem;
    box-shadow: none;
    background-color: var(--card-bg);
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    margin: 0 0.5rem;
    padding: 1.25rem;
  }
  
  @media (min-width: 769px) and (max-width: 1024px) {
    margin: 0 1rem;
  }
}

.loading {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
  color: var(--text-secondary);
}

.error {
  text-align: center;
  padding: 2rem;
  color: var(--semantic-error);
  background-color: var(--surface-secondary);
  border: 1px solid var(--semantic-error);
  border-radius: 8px;
  margin-bottom: 1rem;
}

.post-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-primary);
  padding-bottom: 1rem;
}

.post-title {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
  line-height: 1.3;
  word-wrap: break-word;
  
  // Responsive typography
  @media (max-width: 480px) {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
    line-height: 1.4;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    font-size: 1.75rem;
    margin-bottom: 0.625rem;
  }
}

.post-meta {
  display: flex;
  gap: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  flex-wrap: wrap;
  align-items: center;
  
  // Mobile layout optimizations
  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    font-size: 0.85rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    gap: 0.75rem;
  }
}

.author-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  // Mobile layout
  @media (max-width: 480px) {
    width: 100%;
  }
  
  .author {
    font-weight: 500;
    color: var(--text-primary);
    
    @media (max-width: 480px) {
      font-size: 0.9rem;
    }
  }
}

.views {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.post-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  
  // Mobile optimizations
  @media (max-width: 480px) {
    margin-top: 0.75rem;
    gap: 0.375rem;
  }

  .tag {
    font-size: 0.8rem;
    background-color: var(--surface-secondary);
    color: var(--interactive-primary);
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    
    // Mobile touch-friendly sizing
    @media (max-width: 480px) {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
    }
  }
}

.post-content {
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  white-space: pre-wrap;
  word-wrap: break-word;
  
  // Mobile typography adjustments
  @media (max-width: 480px) {
    font-size: 1rem;
    line-height: 1.7;
    margin-bottom: 1.5rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    font-size: 1.05rem;
    margin-bottom: 1.75rem;
  }
}

.post-images {
  margin: 2rem 0;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    margin: 1.5rem 0;
  }
  
  .image-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    max-width: 100%;
    
    // Mobile-first responsive adjustments
    @media (max-width: 480px) {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
    
    @media (min-width: 769px) and (max-width: 1024px) {
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
    
    .image-item {
      border-radius: 8px;
      overflow: hidden;
      background: var(--surface-secondary);
      box-shadow: var(--shadow-small);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-medium);
      }
      
      .image-container {
        position: relative;
        width: 100%;
        
        .post-image {
          width: 100%;
          max-width: 100%;
          height: auto;
          max-height: 400px;
          object-fit: contain;
          cursor: pointer;
          transition: opacity 0.3s ease;
          display: block;
          background: var(--surface-primary);
          
          // Mobile-optimized image sizes
          @media (max-width: 480px) {
            max-height: 250px;
            object-fit: cover;
          }
          
          @media (min-width: 481px) and (max-width: 768px) {
            max-height: 300px;
          }
          
          @media (min-width: 769px) and (max-width: 1024px) {
            max-height: 350px;
          }
          
          @media (min-width: 1200px) {
            max-height: 500px;
          }
          
          &:hover {
            opacity: 0.9;
          }
        }
        
        .image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
          color: var(--text-inverse);
          padding: 0.5rem;
          transform: translateY(100%);
          transition: transform 0.3s ease;
          
          .image-filename {
            font-size: 0.875rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
          }
        }
        
        &:hover .image-overlay {
          transform: translateY(0);
        }
      }
    }
  }
}

.post-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  
  // Mobile layout adjustments
  @media (max-width: 480px) {
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    gap: 0.75rem;
  }

  button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: none;
    background-color: var(--surface-secondary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 44px; // Touch-friendly minimum height
    
    // Mobile optimizations
    @media (max-width: 480px) {
      width: 100%;
      justify-content: center;
      padding: 0.75rem 1rem;
      font-size: 1rem;
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      padding: 0.625rem 1.25rem;
    }

    &:hover {
      background-color: var(--surface-elevated);
      transform: translateY(-1px);
    }
    
    // Touch feedback for mobile
    &:active {
      transform: translateY(1px);
    }

    // Delete button styling
    &.delete-button {
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--semantic-error);
      border: 1px solid var(--semantic-error);

      &:hover {
        background-color: rgba(239, 68, 68, 0.2);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
      }
      
      &:active {
        background-color: rgba(239, 68, 68, 0.3);
      }
    }
  }
}
</style>
