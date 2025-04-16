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
          >
            选择图片
          </button>
          <span class="upload-info">{{ uploadMsg }}</span>
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
const handleImageUpload = (event) => {
  const files = event.target.files;
  if (!files || !files.length) return;

  // 检查上传数量限制
  if (images.value.length + files.length > 5) {
    uploadMsg.value = "最多只能上传5张图片";
    return;
  }

  // 处理每个文件
  Array.from(files).forEach((file) => {
    if (!file.type.startsWith("image/")) {
      uploadMsg.value = "只能上传图片文件";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      images.value.push({
        file: file,
        url: e.target.result,
      });
    };
    reader.readAsDataURL(file);
  });

  uploadMsg.value = `已选择${images.value.length}张图片，最多可上传5张`;
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

// 在组件中添加这个方法
// async function testApiConnection() {
//   try {
//     console.log("开始测试API连接...");

//     // 使用相同的配置做一个更详细的测试
//     const response = await fetch("https://dev.unikorn.axfff.com/api/posts", {
//       method: "GET",
//       mode: "cors", // 尝试明确使用CORS模式
//       credentials: "include", // 尝试包含凭证
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });

//     console.log("收到响应状态:", response.status);
//     const data = await response.json();
//     console.log("API 连接成功:", data);
//     alert(`API 连接成功，返回数据: ${JSON.stringify(data)}`);
//     return true;
//   } catch (err) {
//     console.error("API 连接失败:", err);
//     alert(`API 连接失败类型: ${err.name}, 信息: ${err.message}`);
//     return false;
//   }
// }

// // 在组件加载时或通过按钮调用这个测试方法
// onMounted(() => {
//   testApiConnection();
// });

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

    // 准备表单数据
    // const formData = new FormData();
    // formData.append("title", title.value);
    // formData.append("category", category.value);
    // formData.append("content", content.value);
    // formData.append("tags", JSON.stringify(tags.value));

    const jsonData = {
      title: title.value,
      category: category.value,
      content: content.value,
      tags: tags.value,
    };

    // 添加图片附件
    // images.value.forEach((image, index) => {
    //   formData.append(`image_${index}`, image.file);
    // });

    // 发送请求到API
    // const response = await fetch("c/api/posts", {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${token.value}`,
    //   },
    //   body: formData,
    // });

    const response = await fetch("https://dev.unikorn.axfff.com/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token.value}`,
      },
      body: JSON.stringify(jsonData),
    });

    // 处理响应
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "发布失败");
    }

    // 解析成功响应
    const postData = await response.json();

    // 显示成功消息
    successMessage.value = "帖子发布成功！";

    // 触发成功事件，使用实际返回的帖子ID
    emit("post-success", postData.id || postData.postId);
  } catch (err) {
    console.error("发布出错:", err);
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
</style>
