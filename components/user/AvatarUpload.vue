<template>
  <div class="avatar-upload">
    <!-- Current Avatar Display -->
    <div class="current-avatar">
      <div class="avatar-preview">
        <img 
          v-if="currentAvatarUrl" 
          :src="currentAvatarUrl" 
          :alt="`${username}的头像`"
          class="avatar-image"
          @error="handleImageError"
        />
        <div v-else class="avatar-placeholder">
          <i class="fas fa-user"></i>
        </div>
      </div>
      <div class="avatar-info">
        <h4>个人头像</h4>
        <p class="avatar-description">建议尺寸: 200x200像素，支持 JPG、PNG 格式</p>
      </div>
    </div>

    <!-- Upload Area -->
    <div class="upload-section">
      <div 
        class="upload-dropzone"
        :class="{ 
          'dragover': isDragOver,
          'uploading': isUploading,
          'error': hasError
        }"
        @drop="handleDrop"
        @dragover.prevent="isDragOver = true"
        @dragleave="isDragOver = false"
        @click="triggerFileInput"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileSelect"
          style="display: none"
        />
        
        <div v-if="isUploading" class="upload-progress">
          <i class="fas fa-spinner fa-spin"></i>
          <p>正在上传...</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
          </div>
        </div>
        
        <div v-else-if="hasError" class="upload-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>{{ errorMessage }}</p>
          <button @click="resetUpload" class="retry-btn">重试</button>
        </div>
        
        <div v-else class="upload-prompt">
          <i class="fas fa-cloud-upload-alt"></i>
          <p>点击或拖拽图片到此处上传</p>
          <span class="file-restrictions">支持 JPG、PNG 格式，最大 5MB</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="upload-actions">
        <button 
          @click="triggerFileInput" 
          class="upload-btn"
          :disabled="isUploading"
        >
          <i class="fas fa-upload"></i>
          选择图片
        </button>
        
        <button 
          v-if="currentAvatarUrl" 
          @click="removeAvatar" 
          class="remove-btn"
          :disabled="isUploading"
        >
          <i class="fas fa-trash"></i>
          移除头像
        </button>
      </div>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="showSuccess" class="success-message">
      <i class="fas fa-check-circle"></i>
      头像上传成功！
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useApi } from '~/composables/useApi';
import { useFileUpload } from '~/composables/useFileUpload';

interface Props {
  userId?: number;
}

interface Emits {
  (e: 'avatar-updated', url: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { user, updateUserProfile } = useAuth();
const { fetchWithAuth } = useApi();
const { uploadFile } = useFileUpload();

// Reactive data
const fileInput = ref<HTMLInputElement>();
const isDragOver = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const hasError = ref(false);
const errorMessage = ref('');
const showSuccess = ref(false);
const currentAvatarUrl = ref<string>('');

// Computed properties
const username = computed(() => user.value?.username || '用户');
const targetUserId = computed(() => props.userId || user.value?.id);

// File validation
const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file type
  if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
    return { valid: false, error: '请选择 JPG 或 PNG 格式的图片' };
  }
  
  // Check file size (5MB limit)
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: '图片大小不能超过 5MB' };
  }
  
  return { valid: true };
};

// Handle file selection
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    uploadAvatar(file);
  }
};

// Handle drag and drop
const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
  
  const file = event.dataTransfer?.files[0];
  if (file) {
    uploadAvatar(file);
  }
};

// Trigger file input
const triggerFileInput = () => {
  if (!isUploading.value) {
    fileInput.value?.click();
  }
};

// Reset upload state
const resetUpload = () => {
  hasError.value = false;
  errorMessage.value = '';
  uploadProgress.value = 0;
};

// Handle image load error
const handleImageError = () => {
  console.warn('Avatar image failed to load');
  currentAvatarUrl.value = '';
};

// Upload avatar
const uploadAvatar = async (file: File) => {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    hasError.value = true;
    errorMessage.value = validation.error || '文件验证失败';
    return;
  }

  resetUpload();
  isUploading.value = true;

  try {
    // Upload file using existing file upload system
    const uploadResult = await uploadFile({
      file: file,
      fileType: 'avatar',
      entityType: 'user',
      entityId: targetUserId.value,
      onProgress: (progress) => {
        uploadProgress.value = progress;
      }
    });

    if (uploadResult?.url) {
      // Update user profile with new avatar URL
      await updateUserProfile({
        profile_picture_url: uploadResult.url
      });

      currentAvatarUrl.value = uploadResult.url;
      showSuccess.value = true;
      
      // Emit event to parent to refresh user data
      emit('avatar-updated', uploadResult.url);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        showSuccess.value = false;
      }, 3000);
    } else {
      throw new Error('上传失败：未收到文件URL');
    }
  } catch (error) {
    console.error('Avatar upload error:', error);
    hasError.value = true;
    errorMessage.value = error instanceof Error ? error.message : '上传失败，请重试';
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

// Remove avatar
const removeAvatar = async () => {
  if (!currentAvatarUrl.value) return;

  try {
    isUploading.value = true;
    
    // Update user profile to remove avatar
    await updateUserProfile({
      profile_picture_url: null
    });

    currentAvatarUrl.value = '';
    showSuccess.value = true;
    
    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Remove avatar error:', error);
    hasError.value = true;
    errorMessage.value = '移除头像失败，请重试';
  } finally {
    isUploading.value = false;
  }
};

// Initialize avatar URL
onMounted(() => {
  if (user.value?.profile_picture_url) {
    currentAvatarUrl.value = user.value.profile_picture_url;
  }
});
</script>

<style lang="scss" scoped>
.avatar-upload {
  max-width: 600px;
  margin: 0 auto;
}

.current-avatar {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px solid #e0e0e0;

  .avatar-preview {
    flex-shrink: 0;
  }

  .avatar-image,
  .avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .avatar-image {
    object-fit: cover;
  }

  .avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e9ecef;
    color: #6c757d;
    font-size: 2rem;
  }

  .avatar-info {
    flex: 1;

    h4 {
      margin: 0 0 0.5rem 0;
      color: #333;
      font-size: 1.2rem;
    }

    .avatar-description {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }
  }
}

.upload-section {
  .upload-dropzone {
    border: 2px dashed #d0d7de;
    border-radius: 12px;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #fafbfc;

    &:hover {
      border-color: #0969da;
      background: #f6f8fa;
    }

    &.dragover {
      border-color: #0969da;
      background: #dbeafe;
      transform: scale(1.02);
    }

    &.uploading {
      border-color: #28a745;
      background: #f0f9f0;
      cursor: not-allowed;
    }

    &.error {
      border-color: #dc3545;
      background: #fdf2f2;
    }

    .upload-prompt {
      i {
        font-size: 3rem;
        color: #6c757d;
        margin-bottom: 1rem;
      }

      p {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        color: #333;
      }

      .file-restrictions {
        color: #666;
        font-size: 0.9rem;
      }
    }

    .upload-progress {
      i {
        font-size: 2rem;
        color: #28a745;
        margin-bottom: 1rem;
      }

      p {
        margin: 0 0 1rem 0;
        color: #28a745;
        font-weight: 500;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: #e9ecef;
        border-radius: 4px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: #28a745;
          transition: width 0.3s ease;
        }
      }
    }

    .upload-error {
      i {
        font-size: 2rem;
        color: #dc3545;
        margin-bottom: 1rem;
      }

      p {
        margin: 0 0 1rem 0;
        color: #dc3545;
      }

      .retry-btn {
        padding: 0.5rem 1rem;
        border: 1px solid #dc3545;
        border-radius: 6px;
        background: transparent;
        color: #dc3545;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #dc3545;
          color: white;
        }
      }
    }
  }

  .upload-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
    justify-content: center;

    button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.upload-btn {
        background: #0969da;
        color: white;

        &:hover:not(:disabled) {
          background: #0550ae;
        }
      }

      &.remove-btn {
        background: #dc3545;
        color: white;

        &:hover:not(:disabled) {
          background: #c82333;
        }
      }
    }
  }
}

.success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  margin-top: 1rem;
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  animation: slideIn 0.3s ease;

  i {
    color: #28a745;
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .current-avatar {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
  }

  .upload-dropzone {
    padding: 2rem 1rem !important;

    .upload-prompt i {
      font-size: 2rem !important;
    }
  }

  .upload-actions {
    flex-direction: column;

    button {
      width: 100%;
    }
  }
}
</style>