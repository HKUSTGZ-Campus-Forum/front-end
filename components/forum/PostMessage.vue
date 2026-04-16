<template>
  <div class="post-message-component">
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
    </div>

    <form v-else @submit.prevent="handleSubmit" class="post-form">
      <!-- 帖子标题 -->
      <div class="form-group">
        <label for="postTitle">标题</label>
        <input
          id="postTitle"
          v-model="title"
          type="text"
          placeholder="请输入帖子标题"
          required
          @blur="validateTitle"
        />
        <span v-if="errors.title" class="error-text">{{ errors.title }}</span>
      </div>

      <!-- 帖子内容 -->
      <div class="form-group">
        <label for="postContent">内容</label>
        <textarea
          id="postContent"
          v-model="content"
          placeholder="请输入帖子内容"
          rows="10"
          required
          @blur="validateContent"
        ></textarea>
        <span v-if="errors.content" class="error-text">{{
          errors.content
        }}</span>
      </div>

      <!-- 帖子标签 -->
      <div class="form-group">
        <label for="postTagInput">标签</label>
        <div class="tags-container">
          <div class="tag-input-row">
            <input
              id="postTagInput"
              v-model="tagInput"
              type="text"
              placeholder="输入标签后按回车或点击添加"
              maxlength="50"
              @keydown="handleTagKeydown"
              @blur="clearTagError"
            />
            <button
              type="button"
              class="tag-add-btn"
              :disabled="tags.length >= MAX_TAG_COUNT"
              @click="addTag"
            >
              添加
            </button>
          </div>
          <span class="tag-hint">
            最多 {{ MAX_TAG_COUNT }} 个标签，每个不超过 {{ MAX_TAG_LENGTH }} 个字符
          </span>
          <span v-if="hasLockedTags" class="tag-hint">
            带锁的标签来自课程页面，不能删除
          </span>
          <span v-if="errors.tags" class="error-text">{{ errors.tags }}</span>

          <div v-if="tags.length > 0" class="tags-list">
            <span
              v-for="(tag, index) in tags"
              :key="`${tag}-${index}`"
              :class="['tag', { 'tag--locked': isLockedTag(tag) }]"
            >
              {{ tag }}
              <span v-if="isLockedTag(tag)" class="tag-lock">锁定</span>
              <button
                v-if="!isLockedTag(tag)"
                type="button"
                class="tag-remove"
                :aria-label="`删除标签 ${tag}`"
                @click="removeTag(index)"
              >
                ×
              </button>
            </span>
          </div>
        </div>
      </div>

      <!-- 身份选择 -->
      <div class="form-group">
        <IdentitySelector 
          v-model="selectedIdentityId"
          size="md"
          :show-label="true"
          @change="handleIdentityChange"
        />
      </div>

      <!-- 上传图片 -->
      <div class="form-group">
        <label>图片附件</label>
        <FileUpload
          file-type="post_image"
          accept="image/*"
          :max-size="MAX_POST_FILE_BYTES"
          show-preview
          allow-delete
          drag-text="点击或拖拽图片到此处上传"
          @upload-success="handleImageUploadSuccess"
          @upload-error="handleImageUploadError"
          @delete-success="handleImageDeleteSuccess"
          @delete-error="handleImageDeleteError"
        />
        <span class="upload-hint">最多 5 张图片，每张不超过 10MB</span>
        
        <!-- 已上传图片预览 -->
        <div v-if="uploadedImages.length > 0" class="uploaded-images">
          <h4>已上传图片 ({{ uploadedImages.length }}/{{ MAX_POST_IMAGES }}):</h4>
          <div class="image-grid">
            <div v-for="(image, index) in uploadedImages" :key="image.id" class="image-preview">
              <img :src="image.url" :alt="getGenericImageName(image, index)" class="preview-img">
              <div class="image-info">
                <span class="filename">{{ getGenericImageName(image, index) }}</span>
                <button type="button" @click="removeUploadedImage(index)" class="remove-btn">×</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 其他附件（非图片：PDF/Office/压缩包等） -->
      <div class="form-group">
        <label>其他附件</label>
        <FileUpload
          :key="otherUploadKey"
          file-type="post_attachment"
          :max-size="MAX_POST_FILE_BYTES"
          :enable-compression="false"
          allow-delete
          drag-text="点击或拖拽文件到此处上传（图片请用上方区域）"
          @upload-success="handleOtherUploadSuccess"
          @upload-error="handleOtherUploadError"
          @delete-success="handleOtherDeleteSuccess"
          @delete-error="handleOtherDeleteError"
        />
        <span class="upload-hint">任意类型文件（单文件不超过 10MB），最多 {{ MAX_OTHER_ATTACHMENTS }} 个；图片请仅用上方「图片附件」上传。</span>

        <div v-if="otherAttachments.length > 0" class="uploaded-files-list">
          <h4>已选附件 ({{ otherAttachments.length }}/{{ MAX_OTHER_ATTACHMENTS }})</h4>
          <ul class="other-files-ul">
            <li v-for="(f, index) in otherAttachments" :key="f.id" class="other-file-row">
              <span class="other-file-name">{{ f.original_filename || `附件 ${index + 1}` }}</span>
              <button type="button" class="remove-btn" @click="removeOtherAttachment(index)">×</button>
            </li>
          </ul>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="errorMessage" class="global-error">
        {{ errorMessage }}
      </div>

      <!-- 提交按钮 -->
      <div class="button-group">
        <button type="button" class="cancel-btn" @click="handleCancel">
          取消
        </button>
        <button
          type="submit"
          class="submit-btn"
          :disabled="isLoading || !formValid"
        >
          {{ isLoading ? "发布中..." : "发布帖子" }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useApi } from "~/composables/useApi";
import { useCustomFileUpload } from "~/composables/useFileUpload";
import FileUpload from "~/components/FileUpload.vue";
import IdentitySelector from "~/components/identity/IdentitySelector.vue";
import type { FileRecord } from "~/types/file";
import type { UserIdentity } from "~/types/identity";
import { MAX_POST_FILE_BYTES, isPostImageFile } from "~/utils/postFileKinds";

const { deleteFile } = useCustomFileUpload();
const { fetchWithAuth, getApiUrl } = useApi();
const router = useRouter();
const MAX_TAG_COUNT = 5;
const MAX_TAG_LENGTH = 50;
const MAX_POST_IMAGES = 5;
const MAX_OTHER_ATTACHMENTS = 30;

const props = withDefaults(defineProps<{
  initialTags?: string[]
  lockedTags?: string[]
  returnTo?: string | null
}>(), {
  initialTags: () => [],
  lockedTags: () => [],
  returnTo: null,
});

// 表单数据
const title = ref("");
const tagInput = ref("");
const content = ref("");
const uploadedImages = ref<FileRecord[]>([]);
const otherAttachments = ref<FileRecord[]>([]);
/** Remount FileUpload after rejecting an upload so its internal state resets. */
const otherUploadKey = ref(0);
const selectedIdentityId = ref<number | null>(null);

// 错误和状态
const errors = ref({
  title: "",
  content: "",
  tags: "",
});
const errorMessage = ref("");
const successMessage = ref("");
const isLoading = ref(false);
const normalizeTag = (tag: string) => tag.trim().replace(/\s+/g, " ");
const normalizeTagKey = (tag: string) => normalizeTag(tag).toLocaleLowerCase();
const dedupeTags = (rawTags: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const rawTag of rawTags) {
    const normalized = normalizeTag(rawTag);
    if (!normalized) continue;
    const key = normalizeTagKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }

  return out;
};
const defaultTags = computed(() => dedupeTags([...(props.lockedTags || []), ...(props.initialTags || [])]));
const tags = ref<string[]>([...defaultTags.value]);
const normalizedLockedTags = computed(() => new Set(
  (props.lockedTags || []).map((tag) => normalizeTagKey(tag))
));
const hasLockedTags = computed(() => normalizedLockedTags.value.size > 0);


// 验证标题
const validateTitle = () => {
  if (!title.value) {
    errors.value.title = "请输入标题";
  } else if (title.value.length < 5) {
    errors.value.title = "标题至少需要5个字符";
  } else if (title.value.length > 100) {
    errors.value.title = "标题不能超过100个字符";
  } else {
    errors.value.title = "";
  }
};

// 验证内容
const validateContent = () => {
  if (!content.value) {
    errors.value.content = "请输入内容";
  } else if (content.value.length < 10) {
    errors.value.content = "内容至少需要10个字符";
  } else {
    errors.value.content = "";
  }
};

// 添加标签
const clearTagError = () => {
  if (errors.value.tags) {
    errors.value.tags = "";
  }
};

const handleTagKeydown = (event: KeyboardEvent) => {
  if (event.key === "Enter" || event.key === ",") {
    event.preventDefault();
    addTag();
  }
};

const isLockedTag = (tag: string) => normalizedLockedTags.value.has(normalizeTagKey(tag));

const addTag = () => {
  const tag = normalizeTag(tagInput.value);

  if (!tag) {
    tagInput.value = "";
    clearTagError();
    return false;
  }

  if (tag.length > MAX_TAG_LENGTH) {
    errors.value.tags = `标签长度不能超过 ${MAX_TAG_LENGTH} 个字符`;
    return false;
  }

  if (tags.value.length >= MAX_TAG_COUNT) {
    errors.value.tags = `最多只能添加 ${MAX_TAG_COUNT} 个标签`;
    return false;
  }

  const duplicate = tags.value.some(
    (existingTag) => existingTag.toLocaleLowerCase() === tag.toLocaleLowerCase()
  );
  if (duplicate) {
    errors.value.tags = "该标签已添加";
    return false;
  }

  tags.value.push(tag);
  tagInput.value = "";
  clearTagError();
  return true;
};

// 删除标签
const removeTag = (index: number) => {
  if (isLockedTag(tags.value[index])) {
    errors.value.tags = "来源标签已锁定，不能删除";
    return;
  }
  tags.value.splice(index, 1);
  clearTagError();
};

// 图片上传相关
const handleImageUploadSuccess = (file: FileRecord) => {
  if (uploadedImages.value.length >= MAX_POST_IMAGES) {
    errorMessage.value = `最多只能上传 ${MAX_POST_IMAGES} 张图片`;
    return;
  }
  uploadedImages.value.push(file);
};

const handleImageUploadError = (error: Error) => {
  errorMessage.value = `图片上传失败: ${error.message}`;
};

const handleImageDeleteSuccess = () => {
  // 图片删除成功，不需要特别处理，因为FileUpload组件会自己处理预览
};

const handleImageDeleteError = (error: Error) => {
  errorMessage.value = `图片删除失败: ${error.message}`;
};

const handleOtherUploadSuccess = (file: FileRecord) => {
  if (isPostImageFile(file)) {
    errorMessage.value = "图片请使用上方「图片附件」区域上传。";
    void deleteFile(file.id).catch(() => {});
    otherUploadKey.value += 1;
    return;
  }
  if (otherAttachments.value.length >= MAX_OTHER_ATTACHMENTS) {
    errorMessage.value = `其他附件最多 ${MAX_OTHER_ATTACHMENTS} 个`;
    void deleteFile(file.id).catch(() => {});
    otherUploadKey.value += 1;
    return;
  }
  otherAttachments.value.push(file);
  otherUploadKey.value += 1;
};

const handleOtherUploadError = (err: Error) => {
  errorMessage.value = `附件上传失败: ${err.message}`;
};

const handleOtherDeleteSuccess = () => {};

const handleOtherDeleteError = (err: Error) => {
  errorMessage.value = `附件删除失败: ${err.message}`;
};

const removeOtherAttachment = async (index: number) => {
  const f = otherAttachments.value[index];
  try {
    await deleteFile(f.id);
    otherAttachments.value.splice(index, 1);
  } catch (error) {
    console.error("Delete attachment error:", error);
    errorMessage.value =
      error instanceof Error ? `删除附件失败: ${error.message}` : "删除附件失败";
  }
};

// 删除已上传的图片
const removeUploadedImage = async (index: number) => {
  const imageToRemove = uploadedImages.value[index];
  
  try {
    // 从后端删除文件
    await deleteFile(imageToRemove.id);
    
    // 从数组中移除
    uploadedImages.value.splice(index, 1);
  } catch (error) {
    console.error('Delete error:', error);
    errorMessage.value = error instanceof Error
      ? `删除图片失败: ${error.message}`
      : "删除图片失败";
  }
};

// 处理身份选择变化
const handleIdentityChange = (identity: UserIdentity | null) => {
  selectedIdentityId.value = identity?.id || null;
};

// 计算表单是否有效
const formValid = computed(() => {
  return (
    title.value &&
    content.value &&
    !errors.value.title &&
    !errors.value.content &&
    !errors.value.tags
  );
});

// 取消按钮处理
const handleCancel = () => {
  // 询问用户是否确认放弃编辑
  const hasUserAddedTags = tags.value.some((tag) => !isLockedTag(tag));
  if (
    title.value ||
    content.value ||
    tagInput.value ||
    hasUserAddedTags ||
    uploadedImages.value.length > 0 ||
    otherAttachments.value.length > 0
  ) {
    if (!confirm("确定要放弃当前编辑的内容吗？")) {
      return;
    }
  }
  if (props.returnTo) {
    router.push(props.returnTo);
    return;
  }
  router.go(-1);
};

const resetForm = () => {
  title.value = "";
  tagInput.value = "";
  tags.value = [...defaultTags.value];
  content.value = "";
  uploadedImages.value = [];
  otherAttachments.value = [];
  selectedIdentityId.value = null;
  errors.value = {
    title: "",
    content: "",
    tags: "",
  };
  errorMessage.value = "";
};

// 提交表单
const handleSubmit = async () => {
  validateTitle();
  validateContent();
  clearTagError();

  if (tagInput.value.trim()) {
    const added = addTag();
    if (!added) {
      return;
    }
  }

  if (errors.value.title || errors.value.content || errors.value.tags) {
    return;
  }

  try {
    isLoading.value = true;
    errorMessage.value = "";

    const jsonData = {
      title: title.value,
      content: content.value,
      tags: tags.value,
      file_ids: [
        ...uploadedImages.value.map((img: FileRecord) => img.id),
        ...otherAttachments.value.map((f: FileRecord) => f.id),
      ],
      display_identity_id: selectedIdentityId.value,
    };

    const response = await fetchWithAuth(
      getApiUrl("/api/posts"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonData),
      }
    );

    // 只读取一次响应体
    if (!response.ok) {
      // 处理错误响应
      let errorMessage = "发布失败";
      
      if (response.status === 401) {
      errorMessage = "请先登录后再发布帖子";
      } else if (response.status === 403) {
      errorMessage = "您没有权限发布帖子";
      } else if (response.status === 400) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || "请求参数错误，请检查输入内容";
        if (Array.isArray(errorData.tag_errors) && errorData.tag_errors.length > 0) {
          errorMessage = errorData.tag_errors.join("；");
        }
      } catch {
        errorMessage = "请求参数错误，请检查输入内容";
      }
      } else if (response.status === 413) {
      errorMessage = "上传内容过大，请减少附件数量或压缩文件（单文件不超过 10MB）";
      } else if (response.status === 429) {
      errorMessage = "发布过于频繁，请稍后再试";
      } else if (response.status >= 500) {
      errorMessage = "服务器错误，请稍后重试";
      } else if (response.status === 0 || !navigator.onLine) {
      errorMessage = "网络连接失败，请检查网络后重试";
      } else {
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `发布失败: ${response.status}`;
      } catch (parseError) {
        errorMessage = `发布失败: ${response.status} ${response.statusText}`;
      }
      }

      throw new Error(errorMessage);
    }

    // 成功响应：解析 JSON
    const postData = await response.json();

    // 显示成功消息
    successMessage.value = "帖子发布成功！";

    // 清空表单
    resetForm();

    // 触发成功事件
    emit("post-success", postData.id || postData.postId);

    setTimeout(() => {
      if (props.returnTo) {
        router.push(props.returnTo);
      } else {
        router.push(`/forum/posts/${postData.id || postData.postId}`);
      }
    }, 3000);
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "发布失败，请稍后重试";
  } finally {
    isLoading.value = false;
  }
};

// Generate generic image description for privacy
const getGenericImageName = (file: FileRecord, index: number): string => {
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
  const totalImages = uploadedImages.value.length;
  if (totalImages > 1) {
    return `${imageType} ${index + 1}/${totalImages}`;
  } else {
    return imageType;
  }
};

// 定义事件
const emit = defineEmits(["post-success"]);
</script>

<style lang="scss" scoped>
.post-message-component {
  width: 100%;
  
  // Mobile optimizations
  @media (max-width: 480px) {
    padding: 0;
  }
}

.form-group {
  margin-bottom: 1.5rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    margin-bottom: 1.25rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    margin-bottom: 1.375rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: var(--text-primary);
    
    // Mobile label styling
    @media (max-width: 480px) {
      font-size: 0.95rem;
      margin-bottom: 0.625rem;
    }
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 0.75rem;
    background: var(--surface-primary);
    color: var(--text-primary);
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    font-size: 1rem;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    
    // Mobile input optimizations
    @media (max-width: 480px) {
      padding: 1rem;
      font-size: 1rem; // Prevent zoom on iOS
      border-radius: 6px;
      min-height: 44px; // Touch-friendly minimum height
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      padding: 0.875rem;
    }

    &:focus {
      outline: none;
      border-color: var(--border-focus);
      box-shadow: 0 0 0 2px rgba(159, 195, 231, 0.2);
    }
    
    // Placeholder styling for mobile
    &::placeholder {
      color: var(--text-muted);
      @media (max-width: 480px) {
        font-size: 0.9rem;
        opacity: 0.7;
      }
    }
  }

  textarea {
    resize: vertical;
    min-height: 150px;
    
    // Mobile textarea adjustments
    @media (max-width: 480px) {
      min-height: 120px;
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      min-height: 135px;
    }
  }
}

.category-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23333' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
  cursor: pointer;
  
  // Mobile select optimizations
  @media (max-width: 480px) {
    background-position: right 1rem center;
    background-size: 14px;
    padding-right: 3rem; // Extra space for arrow
  }
}

.tags-container {
  .tag-input-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;

    @media (max-width: 480px) {
      flex-direction: column;
      gap: 0.625rem;
    }
  }

  .tag-hint {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: var(--text-muted);
  }

  .tag-add-btn {
    flex-shrink: 0;
    min-width: 88px;
    padding: 0.75rem 1rem;
    background: var(--color-blue-7, #9fc3e7);
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background-color 0.2s ease, opacity 0.2s ease;

    &:hover:not(:disabled) {
      background: #7ba8d6;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    @media (max-width: 480px) {
      width: 100%;
      min-height: 44px;
    }
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
    
    // Mobile tag spacing
    @media (max-width: 480px) {
      gap: 0.375rem;
      margin-top: 0.625rem;
    }

    .tag {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background-color: var(--color-blue-7, #9fc3e7);
      color: white;
      padding: 0.35rem 0.75rem;
      border-radius: 50px;
      font-size: 0.875rem;
      
      // Mobile tag sizing
      @media (max-width: 480px) {
        padding: 0.5rem 0.875rem;
        font-size: 0.8rem;
      }

      .tag-remove {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        margin-left: 0.35rem;
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        min-height: 18px;
        
        // Touch-friendly remove button on mobile
        @media (max-width: 480px) {
          font-size: 1.3rem;
          margin-left: 0.5rem;
          min-width: 24px;
          min-height: 24px;
        }
      }
    }
  }
}

.tag--locked {
  background-color: rgba(38, 164, 255, 0.14) !important;
  color: #1178c8 !important;
  border: 1px solid rgba(38, 164, 255, 0.28);
}

.tag-lock {
  font-size: 0.72rem;
  font-weight: 700;
}

.error-text {
  display: block;
  margin-top: 0.5rem;
  color: #dc2626;
  font-size: 0.875rem;
}

.upload-container {
  display: flex;
  align-items: center;

  .file-input {
    display: none;
  }

  .upload-btn {
    padding: 0.5rem 1rem;
    background-color: var(--color-blue-7, #9fc3e7);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      background-color: #7ba8d6;
    }
  }

  .upload-info {
    margin-left: 1rem;
    font-size: 0.875rem;
    color: #666;
  }
}

.image-previews {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;

  .image-preview {
    position: relative;
    width: 100px;
    height: 100px;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 4px;
    }

    .image-remove {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background-color: rgba(255, 0, 0, 0.8);
      color: white;
      border: none;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;

      &:hover {
        background-color: red;
      }
    }
  }
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  
  // Mobile button layout
  @media (max-width: 480px) {
    flex-direction: column-reverse;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    gap: 0.75rem;
    margin-top: 1.75rem;
  }
}

.submit-btn,
.cancel-btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px; // Touch-friendly minimum height
  font-weight: 500;
  
  // Mobile button optimizations
  @media (max-width: 480px) {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    border-radius: 6px;
    min-height: 50px;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    padding: 0.875rem 1.75rem;
    min-height: 46px;
  }
}

.submit-btn {
  background: var(--interactive-primary);
  color: var(--text-inverse);

  &:hover:not(:disabled) {
    background: var(--interactive-hover);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  // Touch feedback for mobile
  &:active:not(:disabled) {
    @media (max-width: 768px) {
      background-color: #6b9ac9;
      transform: translateY(1px);
    }
  }
}

.cancel-btn {
  background: var(--surface-secondary);
  color: var(--text-primary);

  &:hover {
    background: var(--interactive-secondary);
  }
  
  // Touch feedback for mobile
  &:active {
    @media (max-width: 768px) {
      background-color: #d7d7d7;
      transform: translateY(1px);
    }
  }
}

.error-text {
  display: block;
  color: var(--semantic-error);
  font-size: 0.85rem;
  margin-top: 0.25rem;
  padding: 0.375rem 0;
  
  // Mobile error text styling
  @media (max-width: 480px) {
    font-size: 0.8rem;
    margin-top: 0.375rem;
    padding: 0.5rem 0;
  }
}

.global-error {
  color: var(--semantic-error);
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: rgba(220, 53, 69, 0.1);
  border-radius: 4px;
  font-size: 0.9rem;
  border-left: 3px solid var(--semantic-error);
  
  // Mobile error styling
  @media (max-width: 480px) {
    padding: 1rem;
    margin-bottom: 1.25rem;
    font-size: 0.85rem;
    border-radius: 6px;
  }
  
  @media (min-width: 481px) and (max-width: 768px) {
    padding: 0.875rem;
    margin-bottom: 1.125rem;
  }
}

.success-message {
  padding: 1rem;
  background-color: rgba(40, 167, 69, 0.1);
  border-radius: 4px;
  color: var(--semantic-success);
  margin-bottom: 1rem;
  text-align: center;
  font-size: 1.1rem;
}

.upload-progress {
  margin-top: 0.5rem;

  .progress-bar {
    height: 0.5rem;
    background-color: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background-color: var(--color-blue-7, #9fc3e7);
      transition: width 0.2s;
    }
  }

  .progress-text {
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.25rem;
    text-align: center;
  }
}

.upload-hint {
  display: block;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  
  // Mobile upload hint styling
  @media (max-width: 480px) {
    font-size: 0.8rem;
    margin-top: 0.625rem;
  }
}

.uploaded-images {
  margin-top: 1rem;
  
  // Mobile spacing adjustments
  @media (max-width: 480px) {
    margin-top: 0.75rem;
  }
  
  h4 {
    margin: 0 0 1rem 0;
    color: var(--text-primary);
    font-size: 1rem;
    
    // Mobile title styling
    @media (max-width: 480px) {
      font-size: 0.9rem;
      margin-bottom: 0.75rem;
    }
  }
  
  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    
    // Mobile grid adjustments
    @media (max-width: 480px) {
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.75rem;
    }
    
    @media (min-width: 481px) and (max-width: 768px) {
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.875rem;
    }
    
    .image-preview {
      border: 1px solid var(--border-primary);
      border-radius: 8px;
      overflow: hidden;
      background: var(--surface-secondary);
      
      // Mobile image preview styling
      @media (max-width: 480px) {
        border-radius: 6px;
      }
      
      .preview-img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        display: block;
        
        // Mobile image sizing
        @media (max-width: 480px) {
          height: 100px;
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          height: 110px;
        }
      }
      
      .image-info {
        padding: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        // Mobile image info styling
        @media (max-width: 480px) {
          padding: 0.375rem;
        }
        
        .filename {
          font-size: 0.8rem;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          margin-right: 0.5rem;
          
          // Mobile filename styling
          @media (max-width: 480px) {
            font-size: 0.75rem;
            margin-right: 0.375rem;
          }
        }
        
        .remove-btn {
          background: #ff4757;
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          
          // Touch-friendly remove button on mobile
          @media (max-width: 480px) {
            width: 28px;
            height: 28px;
            font-size: 16px;
          }
          
          @media (min-width: 481px) and (max-width: 768px) {
            width: 24px;
            height: 24px;
            font-size: 15px;
          }
          
          &:hover {
            background: #ff3742;
          }
          
          // Touch feedback
          &:active {
            @media (max-width: 768px) {
              background: #ff2d3a;
              transform: scale(0.95);
            }
          }
        }
      }
    }
  }
}

.uploaded-files-list {
  margin-top: 1rem;

  h4 {
    margin: 0 0 0.75rem;
    color: var(--text-primary);
    font-size: 1rem;
  }

  .other-files-ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .other-file-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-primary);
    border-radius: 6px;
    margin-bottom: 0.5rem;
    background: var(--surface-secondary);
  }

  .other-file-name {
    font-size: 0.875rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }
}
</style>
