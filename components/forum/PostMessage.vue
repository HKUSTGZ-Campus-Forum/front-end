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

      <!-- 帖子分类 -->
      <div class="form-group">
        <label for="postCategory">分类</label>
        <select
          id="postCategory"
          v-model="category"
          required
          class="category-select"
        >
          <option value="" disabled>请选择分类</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>

      <!-- 帖子标签 -->
      <div class="form-group">
        <label for="postTags">标签</label>
        <div class="tags-container">
          <input
            id="postTags"
            v-model="tagInput"
            type="text"
            placeholder="输入标签后按回车添加"
            @keydown.enter.prevent="addTag"
            @blur="addTag"
          />
          <div v-if="tags.length > 0" class="tags-list">
            <span v-for="(tag, index) in tags" :key="index" class="tag">
              {{ tag }}
              <button
                type="button"
                class="tag-remove"
                @click="removeTag(index)"
              >
                &times;
              </button>
            </span>
          </div>
        </div>
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
      <!-- 修改以下部分，添加到图片上传部分 -->
      <div class="form-group">
        <label>图片附件</label>
        <div class="upload-container">
          <input
            type="file"
            ref="fileInput"
            accept="image/*"
            multiple
            @change="handleImageUpload"
            class="file-input"
          />
          <button
            type="button"
            class="upload-btn"
            @click="$refs.fileInput.click()"
            :disabled="isUploading"
          >
            选择图片
          </button>
          <span class="upload-info">{{ uploadMsg }}</span>
        </div>

        <!-- 添加上传进度条 -->
        <div v-if="isUploading" class="upload-progress">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="`width: ${uploadProgress}%`"
            ></div>
          </div>
          <div class="progress-text">上传中... {{ uploadProgress }}%</div>
        </div>

        <div v-if="images.length > 0" class="image-previews">
          <div
            v-for="(image, index) in images"
            :key="index"
            class="image-preview"
          >
            <img :src="image.url" :alt="`Preview ${index}`" />
            <button
              type="button"
              class="image-remove"
              @click="removeImage(index)"
            >
              &times;
            </button>
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

<script setup>
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "~/composables/useAuth";
import { uploadFileToOSS } from "~/utils/ossUpload";
import { useApi } from "~/composables/useApi";

const isUploading = ref(false);
const uploadProgress = ref(0);

const { token } = useAuth();
const router = useRouter();

// 表单数据
const title = ref("");
const category = ref("");
const tagInput = ref("");
const tags = ref([]);
const content = ref("");
const images = ref([]);
const uploadMsg = ref("最多可上传5张图片");

// 错误和状态
const errors = ref({
  title: "",
  content: "",
});
const errorMessage = ref("");
const successMessage = ref("");
const isLoading = ref(false);

// 模拟分类数据
const categories = ref([
  { id: "tech", name: "技术讨论" },
  { id: "share", name: "资源分享" },
  { id: "question", name: "问题求助" },
  { id: "chat", name: "灌水闲聊" },
]);

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
const removeTag = (index) => {
  tags.value.splice(index, 1);
};

// 处理图片上传
const handleImageUpload = async (event) => {
  const files = event.target.files;
  if (!files || !files.length) return;

  // 检查上传数量限制
  if (images.value.length + files.length > 5) {
    uploadMsg.value = "最多只能上传5张图片";
    return;
  }

  isUploading.value = true;
  uploadMsg.value = "正在上传...";

  try {
    // 处理每个文件
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        uploadMsg.value = "只能上传图片文件";
        continue;
      }

      // 上传到OSS
      const result = await uploadFileToOSS(file, (progress) => {
        uploadProgress.value = progress;
      });

      // 添加到图片列表
      images.value.push({
        file: file,
        url: result.url,
        ossUrl: result.url, // 保存OSS URL以便提交表单时使用
      });
    }

    uploadMsg.value = `已上传${images.value.length}张图片，最多可上传5张`;
  } catch (error) {
    console.error("上传失败:", error);
    uploadMsg.value = `上传失败: ${error.message || "未知错误"}`;
  } finally {
    isUploading.value = false;
    uploadProgress.value = 0;
    // 清空文件输入框，允许再次选择相同文件
    event.target.value = "";
  }
};

// 删除图片
const removeImage = (index) => {
  images.value.splice(index, 1);
  uploadMsg.value = `已选择${images.value.length}张图片，最多可上传5张`;
};

// 计算表单是否有效
const formValid = computed(() => {
  return (
    title.value &&
    category.value &&
    content.value &&
    !errors.value.title &&
    !errors.value.content
  );
});

// 取消按钮处理
const handleCancel = () => {
  // 询问用户是否确认放弃编辑
  if (title.value || content.value || images.value.length > 0) {
    if (!confirm("确定要放弃当前编辑的内容吗？")) {
      return;
    }
  }
  router.go(-1);
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

    const { fetchWithAuth } = useApi();

    const jsonData = {
      title: title.value,
      category: category.value,
      content: content.value,
      tags: tags.value,
      images: images.value.map((img) => img.ossUrl),
    };

    const response = await fetchWithAuth(
      "https://dev.unikorn.axfff.com/api/posts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify(jsonData),
      }
    );

    console.log("📥 发帖响应状态:", response.status, response.ok);

    // 只读取一次响应体
    if (!response.ok) {
      // 处理错误响应
      let errorMessage = "发布失败";
      try {
        const errorData = await response.json();
        errorMessage =
          errorData.message ||
          errorData.error ||
          `发布失败: ${response.status}`;
      } catch (parseError) {
        // 如果无法解析 JSON，使用默认错误信息
        errorMessage = `发布失败: ${response.status} ${response.statusText}`;
      }

      console.error("❌ 发帖失败:", errorMessage);
      throw new Error(errorMessage);
    }

    // 成功响应：解析 JSON
    const postData = await response.json();
    console.log("✅ 发帖成功:", postData);

    // 显示成功消息
    successMessage.value = "帖子发布成功！";

    // 清空表单
    resetForm();

    // 触发成功事件
    emit("post-success", postData.id || postData.postId);

    // 可选：3秒后跳转到新帖子
    setTimeout(() => {
      router.push(`/forum/posts/${postData.id || postData.postId}`);
    }, 3000);
  } catch (err) {
    console.error("💥 发布异常:", err);
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

.category-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23333' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 12px;
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
</style>
