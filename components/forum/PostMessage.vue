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

      <!-- 上传图片 -->
      <div class="form-group">
        <label>图片附件</label>
        <FileUpload
          file-type="post_image"
          accept="image/*"
          :max-size="5 * 1024 * 1024"
          show-preview
          allow-delete
          drag-text="点击或拖拽图片到此处上传"
          @upload-success="handleImageUploadSuccess"
          @upload-error="handleImageUploadError"
          @delete-success="handleImageDeleteSuccess"
          @delete-error="handleImageDeleteError"
        />
        <span class="upload-hint">最多可上传5张图片，每张不超过5MB</span>
        
        <!-- 已上传图片预览 -->
        <div v-if="uploadedImages.length > 0" class="uploaded-images">
          <h4>已上传图片 ({{ uploadedImages.length }}/5):</h4>
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
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";
import { useFileUpload } from "~/composables/useFileUpload";
import FileUpload from "~/components/FileUpload.vue";
import type { FileRecord } from "~/types/file";

const isUploading = ref(false);
const { deleteFile } = useFileUpload();
const uploadProgress = ref(0);

const { token } = useAuth();
const { fetchWithAuth } = useApi();
const router = useRouter();

// 表单数据
const title = ref("");
const tagInput = ref("");
const tags = ref([]);
const content = ref("");
const uploadedImages = ref<FileRecord[]>([]);
const uploadMsg = ref("最多可上传5张图片");

// 错误和状态
const errors = ref({
  title: "",
  content: "",
});
const errorMessage = ref("");
const successMessage = ref("");
const isLoading = ref(false);


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
const addTag = () => {
  const tag = tagInput.value.trim();
  if (tag && !tags.value.includes(tag) && tags.value.length < 5) {
    tags.value.push(tag);
    tagInput.value = "";
  }
};

// 删除标签
const removeTag = (index: number) => {
  tags.value.splice(index, 1);
};

// 图片上传相关
const handleImageUploadSuccess = (file: FileRecord) => {
  if (uploadedImages.value.length >= 5) {
    errorMessage.value = "最多只能上传5张图片";
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
    errorMessage.value = `删除图片失败: ${error.message}`;
  }
};

// 计算表单是否有效
const formValid = computed(() => {
  return (
    title.value &&
    content.value &&
    !errors.value.title &&
    !errors.value.content
  );
});

// 取消按钮处理
const handleCancel = () => {
  // 询问用户是否确认放弃编辑
  if (title.value || content.value || uploadedImages.value.length > 0) {
    if (!confirm("确定要放弃当前编辑的内容吗？")) {
      return;
    }
  }
  router.go(-1);
};

const resetForm = () => {
  title.value = "";
  tagInput.value = "";
  tags.value = [];
  content.value = "";
  uploadedImages.value = [];
  uploadMsg.value = "最多可上传5张图片";
  errors.value = {
    title: "",
    content: "",
  };
  errorMessage.value = "";
};

// 提交表单
const handleSubmit = async () => {
  validateTitle();
  validateContent();

  if (errors.value.title || errors.value.content) {
    return;
  }

  try {
    isLoading.value = true;
    errorMessage.value = "";

    const jsonData = {
      title: title.value,
      content: content.value,
      tags: tags.value,
      file_ids: uploadedImages.value.map((img: FileRecord) => img.id),
    };

    const response = await fetchWithAuth(
      "https://dev.unikorn.axfff.com/api/posts",
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
      } catch {
        errorMessage = "请求参数错误，请检查输入内容";
      }
      } else if (response.status === 413) {
      errorMessage = "上传内容过大，请减少图片数量或压缩图片";
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
      router.push(`/forum/posts/${postData.id || postData.postId}`);
    }, 3000);
  } catch (err) {
    errorMessage.value =
      err instanceof Error ? err.message : "发布失败，请稍后重试";
  } finally {
    isLoading.value = false;
  }
};

// 定义事件
const emit = defineEmits(["post-success"]);
</script>

<style lang="scss" scoped>
.post-message-component {
  width: 100%;
}

.form-group {
  margin-bottom: 1.5rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #333;
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 1rem;

    &:focus {
      outline: none;
      border-color: var(--color-blue-7, #9fc3e7);
      box-shadow: 0 0 0 2px rgba(159, 195, 231, 0.2);
    }
  }

  textarea {
    resize: vertical;
    min-height: 150px;
  }
}


.tags-container {
  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;

    .tag {
      display: inline-flex;
      align-items: center;
      background-color: var(--color-blue-7, #9fc3e7);
      color: white;
      padding: 0.35rem 0.75rem;
      border-radius: 50px;
      font-size: 0.875rem;

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
      }
    }
  }
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
}

.submit-btn,
.cancel-btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn {
  background-color: var(--color-blue-7, #9fc3e7);
  color: white;

  &:hover:not(:disabled) {
    background-color: #7ba8d6;
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
}

.cancel-btn {
  background-color: #f1f1f1;
  color: #333;

  &:hover {
    background-color: #e4e4e4;
  }
}

.error-text {
  display: block;
  color: #dc3545;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

.global-error {
  color: #dc3545;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: rgba(220, 53, 69, 0.1);
  border-radius: 4px;
  font-size: 0.9rem;
}

.success-message {
  padding: 1rem;
  background-color: rgba(40, 167, 69, 0.1);
  border-radius: 4px;
  color: #28a745;
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
  color: #666;
}

.uploaded-images {
  margin-top: 1rem;
  
  h4 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1rem;
  }
  
  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    
    .image-preview {
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
      background: #f9f9f9;
      
      .preview-img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        display: block;
      }
      
      .image-info {
        padding: 0.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .filename {
          font-size: 0.8rem;
          color: #666;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          margin-right: 0.5rem;
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
          transition: background 0.3s ease;
          
          &:hover {
            background: #ff3742;
          }
        }
      }
    }
  }
}
</style>
