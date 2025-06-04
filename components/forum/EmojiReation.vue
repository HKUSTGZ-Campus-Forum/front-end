<!-- components/forum/EmojiReactions.vue -->
<template>
  <div class="emoji-reactions">
    <!-- 已选择的表情显示区 -->
    <div class="reactions-display" v-if="Object.keys(reactions).length > 0">
      <button
        v-for="(reaction, emojiId) in reactions"
        :key="emojiId"
        @click="toggleReaction(reaction.emoji)"
        class="reaction-item"
        :class="{
          'user-reacted': isUserReacted(reaction.emoji.id),
          'single-selected':
            userReactions.length === 1 && isUserReacted(reaction.emoji.id),
        }"
      >
        <!-- 🔥 修复：使用 emoji_code 字段 -->
        <span class="emoji">{{
          getEmojiFromCode(reaction.emoji.emoji_code) || "❓"
        }}</span>
        <span class="count">{{ reaction.count }}</span>
        <!-- 🔥 添加用户选择指示器 -->
        <span v-if="isUserReacted(reaction.emoji.id)" class="user-indicator"
          >👤</span
        >
      </button>
    </div>

    <!-- 添加表情按钮 -->
    <div class="add-reaction">
      <button
        @click="toggleEmojiPicker"
        class="add-emoji-btn"
        :class="{ active: showEmojiPicker }"
      >
        <i class="fas fa-smile"></i>
        <span>添加表情</span>
      </button>

      <!-- 表情选择器 -->
      <div v-if="showEmojiPicker" class="emoji-picker" @click.stop>
        <div class="emoji-categories">
          <div class="emoji-category">
            <div class="category-title">
              可用表情 ({{ availableEmojis.length }} 个)
            </div>

            <!-- 表情网格 -->
            <div v-if="availableEmojis.length > 0" class="emoji-grid">
              <button
                v-for="(emoji, index) in availableEmojis"
                :key="emoji.id || index"
                @click="selectEmoji(emoji)"
                class="emoji-option"
                :title="`${emoji.description || '表情'} (ID: ${emoji.id})`"
              >
                {{ emoji.emoji_code || "❓" }}
              </button>
            </div>

            <!-- 无表情状态 -->
            <div v-else class="no-emojis">
              <p>😕 暂无可用表情</p>
              <p style="font-size: 0.75rem; color: #999">
                数组长度: {{ availableEmojis.length }}<br />
                数据: {{ availableEmojis }}
              </p>
              <button @click="fetchAvailableEmojis" class="retry-btn">
                🔄 重新获取
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAuth } from "~/composables/useAuth";
import { useApi } from "~/composables/useApi";

const props = defineProps({
  postId: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    default: "post", // 'post' or 'comment'
  },
});

const { isLoggedIn, user } = useAuth();
const { fetchWithAuth } = useApi();

// 响应式数据
const reactions = ref({});
const userReactions = ref([]);
const availableEmojis = ref([]);
const showEmojiPicker = ref(false);

// 计算属性
const totalReactions = computed(() => {
  return Object.values(reactions.value).reduce(
    (sum, reaction) => sum + reaction.count,
    0
  );
});

// 检查用户是否已经对某个表情做过反应
const isUserReacted = (emojiId) => {
  return userReactions.value.some((emoji) => emoji.id === emojiId);
};

const removeUserOtherReactions = async (newEmojiId) => {
  // 找到用户当前的反应（排除即将添加的表情）
  const otherReactions = userReactions.value.filter(
    (emoji) => emoji.id !== newEmojiId
  );

  if (otherReactions.length === 0) {
    return; // 用户没有其他反应，无需移除
  }

  console.log("🔄 移除用户的其他表情反应:", otherReactions);

  // 逐个删除其他反应
  for (const emoji of otherReactions) {
    try {
      // 🔥 修复：检查是否是最后一个反应
      const currentCount = reactions.value[emoji.id]?.count || 0;

      if (currentCount <= 1) {
        console.log(`🔄 表情${emoji.id}是最后一个反应，直接删除本地状态`);

        // 直接更新本地状态
        userReactions.value = userReactions.value.filter(
          (e) => e.id !== emoji.id
        );
        delete reactions.value[emoji.id];
        continue; // 跳过API请求
      }

      let url;
      if (props.type === "post") {
        url = `https://dev.unikorn.axfff.com/api/reactions/posts/${props.postId}/reactions?emoji_id=${emoji.id}`;
      } else {
        url = `https://dev.unikorn.axfff.com/api/reactions/comments/${props.postId}/reactions?emoji_id=${emoji.id}`;
      }

      console.log(`🔄 删除表情反应 ${emoji.id}，当前计数: ${currentCount}`);

      const response = await fetchWithAuth(url, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        console.log(`✅ 成功移除表情反应: ${emoji.id}`);

        // 更新本地状态
        userReactions.value = userReactions.value.filter(
          (e) => e.id !== emoji.id
        );
        if (reactions.value[emoji.id]) {
          reactions.value[emoji.id].count--;
          if (reactions.value[emoji.id].count <= 0) {
            delete reactions.value[emoji.id];
          }
        }
      } else {
        const errorText = await response.text();
        console.warn(`⚠️ 移除表情反应失败: ${emoji.id}`, errorText);

        // 🔥 如果是约束错误，直接删除本地状态
        if (
          errorText.includes("valid_counts") ||
          errorText.includes("CheckViolation")
        ) {
          console.log("🔧 检测到约束错误，直接删除本地状态");
          userReactions.value = userReactions.value.filter(
            (e) => e.id !== emoji.id
          );
          delete reactions.value[emoji.id];
        }
      }
    } catch (error) {
      console.error(`❌ 移除表情反应出错: ${emoji.id}`, error);

      // 🔥 如果是约束错误，直接删除本地状态
      if (
        error.message.includes("valid_counts") ||
        error.message.includes("CheckViolation")
      ) {
        console.log("🔧 检测到约束错误，直接删除本地状态");
        userReactions.value = userReactions.value.filter(
          (e) => e.id !== emoji.id
        );
        delete reactions.value[emoji.id];
      }
    }
  }
};

const getEmojiFromCode = (emojiCode) => {
  const emojiMap = {
    plus_one: "👍",
    heart: "❤️",
    party_popper: "🎉",
    astonished_face: "😨",
    hot_face: "🥵",
    thumbs_up: "👍",
    thumbs_down: "👎",
    laugh: "😂",
    cry: "😢",
    angry: "😠",
    surprise: "😮",
    love: "😍",
    clap: "👏",
    fire: "🔥",
    rocket: "🚀",
  };

  // 如果 emojiCode 已经是Unicode表情符号，直接返回
  if (
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(
      emojiCode
    )
  ) {
    return emojiCode;
  }

  // 否则从映射表中查找
  return emojiMap[emojiCode] || emojiCode;
};

// 方法
const toggleEmojiPicker = async () => {
  if (!isLoggedIn.value) {
    alert("请先登录后再进行表情反应");
    return;
  }

  console.log("🎭 点击添加表情按钮");
  console.log("当前状态:", {
    showEmojiPicker: showEmojiPicker.value,
    availableEmojis长度: availableEmojis.value.length,
    用户登录: isLoggedIn.value,
    用户信息: user.value,
  });

  showEmojiPicker.value = !showEmojiPicker.value;

  if (showEmojiPicker.value) {
    console.log("🔄 表情选择器打开，开始获取表情列表...");
    await fetchAvailableEmojis();

    // 🔥 获取完成后再次输出
    console.log("🎭 获取完成，最终结果:");
    console.log("availableEmojis.value:", availableEmojis.value);
    console.log("availableEmojis.value.length:", availableEmojis.value.length);
  }
};

const selectEmoji = async (emoji) => {
  try {
    await toggleReaction(emoji);
    showEmojiPicker.value = false;
  } catch (error) {
    console.error("选择表情失败:", error);
  }
};

const toggleReaction = async (emoji) => {
  if (!isLoggedIn.value) {
    alert("请先登录后再进行表情反应");
    return;
  }

  try {
    const isCurrentlyReacted = isUserReacted(emoji.id);
    const method = isCurrentlyReacted ? "DELETE" : "POST";
    if (!isCurrentlyReacted) {
      await removeUserOtherReactions(emoji.id);
    }
    let url, body;

    if (props.type === "post") {
      if (method === "DELETE") {
        url = `https://dev.unikorn.axfff.com/api/reactions/posts/${props.postId}/reactions?emoji_id=${emoji.id}`;
      } else {
        url = `https://dev.unikorn.axfff.com/api/reactions/posts/${props.postId}/reactions`;
        body = JSON.stringify({ emoji_id: emoji.id });
      }
    } else {
      if (method === "DELETE") {
        url = `https://dev.unikorn.axfff.com/api/reactions/comments/${props.postId}/reactions?emoji_id=${emoji.id}`;
      } else {
        url = `https://dev.unikorn.axfff.com/api/reactions/comments/${props.postId}/reactions`;
        body = JSON.stringify({ emoji_id: emoji.id });
      }
    }

    const requestOptions = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (body !== undefined) {
      requestOptions.body = body;
    }

    console.log("🎭 发送请求:", { url, method, emojiId: emoji.id });

    const response = await fetchWithAuth(url, requestOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`操作失败 (${response.status}): ${errorText}`);
    }

    console.log("✅ 操作成功");

    // 重新获取数据确保同步
    await fetchReactions();
  } catch (error) {
    console.error("操作失败:", error);
    alert(error.message || "操作失败，请重试");
  }
};

// 获取可用表情列表
const fetchAvailableEmojis = async () => {
  try {
    console.log("🎭 开始获取可用表情列表...");

    const response = await fetchWithAuth(
      "https://dev.unikorn.axfff.com/api/reactions/emojis"
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API请求失败:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ 获取到的原始表情数据:", data);

    // 🔥 数据映射：将 emoji_code 转换为真正的表情符号
    const mappedData = data.map((emoji) => ({
      ...emoji,
      emoji: getEmojiFromCode(emoji.emoji_code), // 转换为真正的表情符号
      emoji_code: getEmojiFromCode(emoji.emoji_code), // 同时更新 emoji_code
      name: emoji.description,
    }));

    console.log("🔧 映射后的表情数据:", mappedData);

    availableEmojis.value = mappedData;
    console.log("✅ 设置完成的 availableEmojis:", availableEmojis.value);
  } catch (error) {
    console.error("❌ 获取表情失败:", error);
    alert(`获取表情失败: ${error.message}`);
  }
};

// 获取表情反应
const fetchReactions = async () => {
  try {
    let url;
    if (props.type === "post") {
      url = `https://dev.unikorn.axfff.com/api/reactions/posts/${props.postId}/reactions`;
    } else {
      url = `https://dev.unikorn.axfff.com/api/reactions/comments/${props.postId}/reactions`;
    }

    // 如果用户已登录，传递 user_id 参数
    if (user.value?.id) {
      url += `?user_id=${user.value.id}`;
    }

    const response = await fetchWithAuth(url);

    if (!response.ok) {
      throw new Error("获取反应失败");
    }

    const data = await response.json();

    // 处理反应数据
    reactions.value = {};
    userReactions.value = data.user_reactions || [];

    if (data.reactions) {
      data.reactions.forEach((reaction) => {
        reactions.value[reaction.emoji.id] = {
          emoji: reaction.emoji,
          count: reaction.count,
        };
      });
    }
  } catch (error) {
    console.error("获取表情反应失败:", error);
  }
};

// 点击外部关闭表情选择器
const handleClickOutside = (event) => {
  if (!event.target.closest(".emoji-reactions")) {
    showEmojiPicker.value = false;
  }
};

// 生命周期
onMounted(() => {
  fetchReactions();
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<!-- 样式保持不变 -->
<style lang="scss" scoped>
.emoji-reactions {
  position: relative;
  margin-top: 1rem;
}

.reactions-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.reaction-item {
  // 原有样式保持不变...

  &.single-selected {
    background: #e8f5e8;
    border-color: #4caf50;
    color: #2e7d32;
    box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
  }

  .user-indicator {
    font-size: 0.7rem;
    opacity: 0.7;
    margin-left: 0.2rem;
  }
}

.reaction-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  background: #f8f9fa;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;

  &:hover {
    background: #e9ecef;
    transform: translateY(-1px);
  }

  &.user-reacted {
    background: #e3f2fd;
    border-color: #2196f3;
    color: #1976d2;
  }

  .emoji {
    font-size: 1rem;
  }

  .count {
    font-weight: 500;
    min-width: 1rem;
    text-align: center;
  }
}

.add-reaction {
  position: relative;
}

.add-emoji-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px dashed #ccc;
  border-radius: 8px;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;

  &:hover,
  &.active {
    border-color: #007bff;
    color: #007bff;
    background: #f8f9ff;
  }

  i {
    font-size: 1rem;
  }
}

.emoji-picker {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1000;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  width: 320px;
  max-height: 400px;
  overflow-y: auto;
  animation: emojiPickerSlideIn 0.2s ease-out;

  @media (max-width: 768px) {
    width: 280px;
    right: 0;
    left: auto;
  }
}

.emoji-categories {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.emoji-category {
  .category-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #666;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 0.25rem;
}

.emoji-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s ease;

  &:hover {
    background: #f0f0f0;
    transform: scale(1.2);
  }

  &:active {
    transform: scale(1.1);
  }
}

@keyframes emojiPickerSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// 滚动条样式
.emoji-picker::-webkit-scrollbar {
  width: 6px;
}

.emoji-picker::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.emoji-picker::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;

  &:hover {
    background: #a8a8a8;
  }
}
</style>
