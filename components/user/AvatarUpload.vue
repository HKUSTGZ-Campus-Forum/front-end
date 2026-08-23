<template>
  <div class="avatar-upload">
    <!-- Current Avatar Display -->
    <div class="current-avatar">
      <div class="avatar-preview">
        <img 
          v-if="currentAvatarUrl" 
          :src="currentAvatarUrl" 
          :alt="t('avatar.user.alt', { username })"
          class="avatar-image"
          @error="handleImageError"
        />
        <div v-else class="avatar-placeholder">
          <i class="fas fa-user"></i>
        </div>
      </div>
      <div class="avatar-info">
        <h4>{{ t("avatar.upload.title") }}</h4>
        <p class="avatar-description">{{ t("avatar.upload.description") }}</p>
      </div>
    </div>

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
          <p>{{ t("avatar.upload.uploading") }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${uploadProgress}%` }"></div>
          </div>
        </div>
        
        <div v-else-if="hasError" class="upload-error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>{{ errorMessage }}</p>
          <button @click="resetUpload" class="retry-btn">{{ t("common.retry") }}</button>
        </div>
        
        <div v-else class="upload-prompt">
          <i class="fas fa-cloud-upload-alt"></i>
          <p>{{ t("avatar.upload.prompt") }}</p>
          <span class="file-restrictions">{{ t("avatar.upload.restrictions") }}</span>
        </div>
      </div>

      <div class="upload-actions">
        <button 
          @click="triggerFileInput" 
          class="upload-btn"
          :disabled="isUploading"
        >
          <i class="fas fa-upload"></i>
          {{ t("avatar.upload.selectImage") }}
        </button>
        
        <button 
          v-if="currentAvatarUrl" 
          @click="removeAvatar" 
          class="remove-btn"
          :disabled="isUploading"
        >
          <i class="fas fa-trash"></i>
          {{ t("avatar.upload.removeImage") }}
        </button>
      </div>
    </div>

    <div v-if="showSuccess" class="success-message">
      <i class="fas fa-check-circle"></i>
      {{ t("avatar.upload.success") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuth } from '~/composables/useAuth';
import { useCustomFileUpload } from '~/composables/useFileUpload';
import { getAvatarUploadErrorKey } from '~/utils/fileUploadError';

interface Props {
  userId?: number;
}

interface Emits {
  (e: 'avatar-updated', url: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();
const { user, updateUserProfile } = useAuth();
const { uploadFile } = useCustomFileUpload();

const fileInput = ref<HTMLInputElement>();
const isDragOver = ref(false);
const isUploading = ref(false);
const uploadProgress = ref(0);
const hasError = ref(false);
const errorMessage = ref('');
const showSuccess = ref(false);
const currentAvatarUrl = ref<string>('');

const username = computed(() => user.value?.username || t('common.user'));
const targetUserId = computed(() => props.userId || user.value?.id);

const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
    return { valid: false, error: t('avatar.upload.errors.invalidType') };
  }
  
  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: t('avatar.upload.errors.invalidSize') };
  }
  
  return { valid: true };
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    uploadAvatar(file);
  }
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragOver.value = false;
  
  const file = event.dataTransfer?.files[0];
  if (file) {
    uploadAvatar(file);
  }
};

const triggerFileInput = () => {
  if (!isUploading.value) {
    fileInput.value?.click();
  }
};

const resetUpload = () => {
  hasError.value = false;
  errorMessage.value = '';
  uploadProgress.value = 0;
};

const handleImageError = () => {
  console.warn('Avatar image failed to load');
  currentAvatarUrl.value = '';
};

const uploadAvatar = async (file: File) => {
  const validation = validateFile(file);
  if (!validation.valid) {
    hasError.value = true;
    errorMessage.value = validation.error || t('avatar.upload.errors.validationFailed');
    return;
  }

  resetUpload();
  isUploading.value = true;

  try {
    const uploadResult = await uploadFile({
      file: file,
      fileType: 'avatar',
      entityType: 'user',
      entityId: targetUserId.value,
      onProgress: (progress) => {
        uploadProgress.value = progress;
      }
    });

    if (uploadResult?.id) {
      const updatedUser = await updateUserProfile({
        profile_picture_file_id: uploadResult.id
      });

      const avatarUrl = updatedUser?.profile_picture_url || `/api/files/avatar/${uploadResult.id}`;
      currentAvatarUrl.value = avatarUrl;
      showSuccess.value = true;
      emit('avatar-updated', avatarUrl);

      setTimeout(() => {
        showSuccess.value = false;
      }, 3000);
    } else {
      throw new Error(t('avatar.upload.errors.missingFileId'));
    }
  } catch (error) {
    hasError.value = true;
    errorMessage.value = t(getAvatarUploadErrorKey(error));
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
  }
};

const removeAvatar = async () => {
  if (!currentAvatarUrl.value) return;

  try {
    isUploading.value = true;

    await updateUserProfile({
      profile_picture_file_id: null
    });

    currentAvatarUrl.value = '';
    showSuccess.value = true;
    
    setTimeout(() => {
      showSuccess.value = false;
    }, 3000);
  } catch (error) {
    console.error('Remove avatar error:', error);
    hasError.value = true;
    errorMessage.value = t('avatar.upload.errors.removeFailed');
  } finally {
    isUploading.value = false;
  }
};

onMounted(() => {
  currentAvatarUrl.value = user.value?.profile_picture_url || '';
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
  background: var(--surface-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-primary);

  .avatar-preview {
    flex-shrink: 0;
  }

  .avatar-image,
  .avatar-placeholder {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    border: 3px solid var(--surface-primary);
    box-shadow: var(--shadow-medium);
  }

  .avatar-image {
    object-fit: cover;
  }

  .avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface-tertiary);
    color: var(--text-secondary);
    font-size: 2rem;
  }

  .avatar-info {
    flex: 1;

    h4 {
      margin: 0 0 0.5rem 0;
      color: var(--text-primary);
      font-size: 1.2rem;
    }

    .avatar-description {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
  }
}

.upload-section {
  .upload-dropzone {
    border: 2px dashed var(--border-primary);
    border-radius: 12px;
    padding: 3rem 2rem;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    background: var(--surface-primary);
    -webkit-tap-highlight-color: transparent; // Remove iOS tap highlight

    @media (max-width: 479px) {
      padding: 2rem 1rem;
      border-radius: 8px;
    }

    &:hover {
      border-color: var(--interactive-primary);
      background: var(--surface-secondary);
    }

    // Enhanced touch feedback for mobile
    &:active {
      transform: scale(0.98);
      border-color: var(--interactive-primary);
      background: color-mix(in srgb, var(--interactive-primary) 8%, var(--surface-primary));
    }

    &.dragover {
      border-color: var(--interactive-primary);
      background: color-mix(in srgb, var(--interactive-primary) 12%, var(--surface-primary));
      transform: scale(1.02);

      @media (max-width: 479px) {
        transform: scale(1.01);
      }
    }

    &.uploading {
      border-color: var(--success-color);
      background: var(--success-background);
      cursor: not-allowed;
    }

    &.error {
      border-color: var(--error-color);
      background: var(--error-background);
    }

    .upload-prompt {
      i {
        font-size: 3rem;
        color: var(--text-secondary);
        margin-bottom: 1rem;
      }

      p {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        color: var(--text-primary);
      }

      .file-restrictions {
        color: var(--text-secondary);
        font-size: 0.9rem;
      }
    }

    .upload-progress {
      i {
        font-size: 2rem;
        color: var(--success-color);
        margin-bottom: 1rem;
      }

      p {
        margin: 0 0 1rem 0;
        color: var(--success-color);
        font-weight: 500;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--surface-tertiary);
        border-radius: 4px;
        overflow: hidden;

        .progress-fill {
          height: 100%;
          background: var(--success-color);
          transition: width 0.3s ease;
        }
      }
    }

    .upload-error {
      i {
        font-size: 2rem;
        color: var(--error-color);
        margin-bottom: 1rem;
      }

      p {
        margin: 0 0 1rem 0;
        color: var(--error-color);
      }

      .retry-btn {
        padding: 0.5rem 1rem;
        border: 1px solid var(--error-color);
        border-radius: 6px;
        background: transparent;
        color: var(--error-color);
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: var(--error-color);
          color: var(--text-inverse);
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
        background: var(--btn-primary-bg);
        color: var(--text-inverse);

        &:hover:not(:disabled) {
          background: var(--btn-primary-bg-hover);
        }
      }

      &.remove-btn {
        background: var(--error-color);
        color: var(--text-inverse);

        &:hover:not(:disabled) {
          background: color-mix(in srgb, var(--error-color) 85%, black);
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
  background: var(--success-background);
  color: var(--success-color);
  border: 1px solid color-mix(in srgb, var(--success-color) 30%, transparent);
  border-radius: 8px;
  animation: slideIn 0.3s ease;

  i {
    color: var(--success-color);
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

@media (max-width: 479px) {
  .avatar-upload {
    padding: 0;
  }

  .current-avatar {
    flex-direction: column;
    text-align: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;

    .avatar-image,
    .avatar-placeholder {
      width: 80px;
      height: 80px;
    }

    .avatar-info {
      h4 {
        font-size: 1.1rem;
      }

      .avatar-description {
        font-size: 0.85rem;
      }
    }
  }

  .upload-dropzone {
    padding: 1.5rem 1rem !important;
    margin: 0 -0.5rem;

    .upload-prompt {
      i {
        font-size: 2rem !important;
      }

      p {
        font-size: 1rem !important;
        margin-bottom: 0.75rem !important;
      }

      .file-restrictions {
        font-size: 0.85rem !important;
      }
    }

    .upload-progress {
      i {
        font-size: 1.5rem !important;
      }

      p {
        font-size: 0.95rem !important;
      }
    }

    .upload-error {
      i {
        font-size: 1.5rem !important;
      }

      p {
        font-size: 0.95rem !important;
      }

      .retry-btn {
        padding: 0.75rem 1.25rem;
        min-height: 44px;
        font-size: 1rem;
      }
    }
  }

  .upload-actions {
    flex-direction: column;
    gap: 0.75rem;

    button {
      width: 100%;
      padding: 1rem 1.25rem;
      font-size: 1rem;
      min-height: 44px;

      &.upload-btn {
        order: 1;
      }

      &.remove-btn {
        order: 2;
      }
    }
  }

  .success-message {
    margin: 1rem -0.5rem 0;
    font-size: 0.95rem;
  }
}

@media (min-width: 480px) and (max-width: 768px) {
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
