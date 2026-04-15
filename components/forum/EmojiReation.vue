<!-- components/forum/EmojiReactions.vue -->
<template>
  <div class="emoji-reactions">
    <!-- 紧凑的反应显示区 - 单行布局 -->
    <div class="reactions-row">
      <!-- 默认反应按钮组 (ID1点赞 + 更多按钮) - 放在最前面 -->
      <div class="default-reaction-group">
        <!-- 快速点赞按钮 (默认ID1表情) -->
        <button
          @click="quickReaction"
          class="default-reaction-btn"
          :class="{ 'user-reacted': isQuickReacted }"
          :title="isLoggedIn ? '点赞' : '请先登录后点赞'"
        >
          <span class="emoji">
            <ForumUiIcon
              v-if="defaultEmojiData?.emoji_code && getEmojiIconName(defaultEmojiData.emoji_code)"
              :name="getEmojiIconName(defaultEmojiData.emoji_code)"
              class="emoji-icon"
            />
            <img
              v-else-if="defaultEmojiData?.image_url"
              :src="defaultEmojiData.image_url"
              :alt="defaultEmojiData.description || 'emoji'"
              class="emoji-image"
            />
            <ForumUiIcon v-else name="heart" class="emoji-icon" />
          </span>
          <span v-if="quickReactionCount > 0" class="count">{{ quickReactionCount }}</span>
        </button>

        <!-- 更多表情按钮 -->
        <button
          @click="toggleEmojiPicker"
          class="expand-btn"
          :class="{ active: showEmojiPicker }"
          title="更多表情"
        >
          <ForumUiIcon name="chevron-down" class="chevron-icon" :class="{ rotated: showEmojiPicker }" />
        </button>
      </div>

      <!-- 现有的表情反应 (过滤掉ID1，因为它有专门的默认按钮) -->
      <button
        v-for="(reaction, emojiId) in filteredReactions"
        :key="emojiId"
        @click="toggleReaction(reaction.emoji)"
        class="reaction-item"
        :class="{
          'user-reacted': isUserReacted(reaction.emoji.id),
        }"
        >
        <span class="emoji">
          <ForumUiIcon
            v-if="getEmojiIconName(reaction.emoji.emoji_code)"
            :name="getEmojiIconName(reaction.emoji.emoji_code)"
            class="emoji-icon"
          />
          <img 
            v-else-if="reaction.emoji.image_url" 
            :src="reaction.emoji.image_url" 
            :alt="reaction.emoji.description || 'emoji'"
            class="emoji-image"
          />
          <span v-else>{{ getEmojiFromCode(reaction.emoji.emoji_code) || "?" }}</span>
        </span>
        <span class="count">{{ reaction.count }}</span>
      </button>
    </div>

    <!-- 表情选择器 - 紧贴默认按钮组 -->
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
              :title="`${emoji.description || '表情'} (ID: ${emoji.id}) - URL: ${emoji.image_url}`"
            >
              <!-- Always use fallback emoji since OSS images have display issues -->
              <ForumUiIcon
                v-if="getEmojiIconName(emoji.emoji_code)"
                :name="getEmojiIconName(emoji.emoji_code)"
                class="emoji-fallback emoji-fallback--icon"
              />
              <span v-else class="emoji-fallback">{{ getEmojiFromCode(emoji.emoji_code) || "?" }}</span>
            </button>
          </div>

          <!-- 无表情状态 -->
          <div v-else class="no-emojis">
            <p class="no-emojis__title">
              <ForumUiIcon name="info" class="no-emojis__icon" />
              <span>暂无可用表情</span>
            </p>
            <p style="font-size: 0.75rem; color: #999">
              数组长度: {{ availableEmojis.length }}<br />
              数据: {{ availableEmojis }}
            </p>
            <button @click="fetchAvailableEmojis" class="retry-btn">
              重新获取
            </button>
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
const { fetchWithAuth, fetchPublic, getApiUrl } = useApi();

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

// 快速反应相关计算属性 (假设ID1是点赞表情)
const QUICK_REACTION_ID = 1;
const isQuickReacted = computed(() => {
  return userReactions.value.some(emoji => emoji.id === QUICK_REACTION_ID);
});

const quickReactionCount = computed(() => {
  return reactions.value[QUICK_REACTION_ID]?.count || 0;
});

// 过滤掉ID1的反应，因为它有专门的默认按钮
const filteredReactions = computed(() => {
  const filtered = {};
  Object.keys(reactions.value).forEach(emojiId => {
    if (parseInt(emojiId) !== QUICK_REACTION_ID) {
      filtered[emojiId] = reactions.value[emojiId];
    }
  });
  return filtered;
});

// 获取默认表情数据（ID1）
const defaultEmojiData = computed(() => {
  // 先从现有反应中查找ID1
  if (reactions.value[QUICK_REACTION_ID]) {
    return reactions.value[QUICK_REACTION_ID].emoji;
  }
  // 如果没有反应数据，从可用表情中查找ID1
  return availableEmojis.value.find(emoji => emoji.id === QUICK_REACTION_ID);
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
        url = getApiUrl(`/api/reactions/posts/${props.postId}/reactions?emoji_id=${emoji.id}`);
      } else {
        url = getApiUrl(`/api/reactions/comments/${props.postId}/reactions?emoji_id=${emoji.id}`);
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


// Handle emoji image loading errors
const handleEmojiImageError = (event, emoji) => {
  console.error(`❌ Failed to load emoji image: ${emoji.image_url}`);
  // Hide the broken image and show fallback
  event.target.style.display = 'none';
  // Find the parent button and add fallback text
  const button = event.target.closest('.emoji-option');
  if (button) {
    const fallbackSpan = document.createElement('span');
    fallbackSpan.textContent = getEmojiFromCode(emoji.emoji_code) || "?";
    button.appendChild(fallbackSpan);
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

const getEmojiIconName = (emojiCode) => {
  const iconMap = {
    plus_one: "plus-one",
    thumbs_up: "plus-one",
    heart: "heart",
    love: "heart",
    party_popper: "celebrate",
    rocket: "celebrate",
  };

  return iconMap[emojiCode] || null;
};

// 快速反应方法
const quickReaction = async () => {
  if (!isLoggedIn.value) {
    alert("请先登录后再进行表情反应");
    return;
  }

  try {
    // 创建一个虚拟的emoji对象用于快速反应
    const quickEmoji = { id: QUICK_REACTION_ID };
    await toggleReaction(quickEmoji);
  } catch (error) {
    console.error("快速反应失败:", error);
    alert("反应失败，请重试");
  }
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
    // 🔥 修复：从列表选择时强制单选
    console.log("📝 从列表选择表情:", emoji.id);

    // 先删除所有现有反应
    if (userReactions.value.length > 0) {
      console.log("🔄 清除现有反应:", userReactions.value);

      for (const existingEmoji of [...userReactions.value]) {
        try {
          // 🔥 修复：检查计数为1的情况特殊处理
          const currentCount = reactions.value[existingEmoji.id]?.count || 0;

          if (currentCount === 1) {
            console.log(`🔧 表情${existingEmoji.id}计数为1，直接删除本地状态`);

            // 直接删除本地状态，不发送API请求
            userReactions.value = userReactions.value.filter(
              (e) => e.id !== existingEmoji.id
            );
            delete reactions.value[existingEmoji.id];
            continue; // 跳过API请求
          }

          let deleteUrl;
          if (props.type === "post") {
            deleteUrl = getApiUrl(`/api/reactions/posts/${props.postId}/reactions?emoji_id=${existingEmoji.id}`);
          } else {
            deleteUrl = getApiUrl(`/api/reactions/comments/${props.postId}/reactions?emoji_id=${existingEmoji.id}`);
          }

          await fetchWithAuth(deleteUrl, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          });

          console.log(`✅ 删除表情: ${existingEmoji.id}`);
        } catch (error) {
          console.error(`❌ 删除表情失败: ${existingEmoji.id}`, error);

          // 🔥 修复：删除失败时也强制删除本地状态
          userReactions.value = userReactions.value.filter(
            (e) => e.id !== existingEmoji.id
          );
          if (reactions.value[existingEmoji.id]) {
            delete reactions.value[existingEmoji.id];
          }
        }
      }
    }

    // 检查是否要添加新表情（如果点击的不是当前已选择的）
    const wasAlreadySelected = isUserReacted(emoji.id);

    if (!wasAlreadySelected) {
      // 添加新表情
      let addUrl, body;
      if (props.type === "post") {
        addUrl = getApiUrl(`/api/reactions/posts/${props.postId}/reactions`);
      } else {
        addUrl = getApiUrl(`/api/reactions/comments/${props.postId}/reactions`);
      }

      body = JSON.stringify({ emoji_id: emoji.id });

      await fetchWithAuth(addUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });

      console.log(`✅ 添加表情: ${emoji.id}`);
    }

    // 重新获取数据
    await fetchReactions();
    showEmojiPicker.value = false;
  } catch (error) {
    console.error("选择表情失败:", error);
    showEmojiPicker.value = false;
    alert("选择表情失败，请重试");
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
        url = getApiUrl(`/api/reactions/posts/${props.postId}/reactions?emoji_id=${emoji.id}`);
      } else {
        url = getApiUrl(`/api/reactions/posts/${props.postId}/reactions`);
        body = JSON.stringify({ emoji_id: emoji.id });
      }
    } else {
      if (method === "DELETE") {
        url = getApiUrl(`/api/reactions/comments/${props.postId}/reactions?emoji_id=${emoji.id}`);
      } else {
        url = getApiUrl(`/api/reactions/comments/${props.postId}/reactions`);
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

    const response = await fetchPublic(
      getApiUrl("/api/reactions/emojis")
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API请求失败:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ 获取到的原始表情数据:", data);

    // Use the data as-is since all emojis have image_url
    availableEmojis.value = data;
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
      url = getApiUrl(`/api/reactions/posts/${props.postId}/reactions`);
    } else {
      url = getApiUrl(`/api/reactions/comments/${props.postId}/reactions`);
    }

    // 如果用户已登录，传递 user_id 参数
    if (user.value?.id) {
      url += `?user_id=${user.value.id}`;
    }

    // 使用 fetchPublic 让未登录用户也能看到反应计数
    const response = isLoggedIn.value ? await fetchWithAuth(url) : await fetchPublic(url);

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

<!-- 紧凑布局样式 -->
<style lang="scss" scoped>
.emoji-reactions {
  position: relative;
  margin: 0.5rem 0;
}

.reactions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.reaction-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.05rem 0.3rem;
  border: 1px solid var(--border-secondary);
  border-radius: 16px;
  background: var(--surface-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  color: var(--text-primary);

  &:hover {
    background: var(--surface-elevated);
    transform: translateY(-1px);
    box-shadow: var(--shadow-small);
  }

  &.user-reacted {
    background: rgba(59, 130, 246, 0.1);
    border-color: var(--interactive-primary);
    color: var(--interactive-primary);
  }

  .emoji {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.1rem;
    
    img {
      width: 1.4em;
      height: 1.4em;
    }
  }

  .count {
    font-weight: 500;
    min-width: 1rem;
    text-align: center;
    color: var(--text-primary);
  }
}

// 默认反应按钮组 - 融合设计
.default-reaction-group {
  display: flex;
  border: 1px solid var(--border-secondary);
  border-radius: 16px;
  background: var(--surface-secondary);
  overflow: hidden;
}

// 默认反应按钮 (ID1点赞)
.default-reaction-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.05rem 0.3rem;
  border: none;
  border-right: 1px solid var(--border-secondary);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
  color: var(--text-primary);

  &:hover {
    background: var(--surface-elevated);
  }

  &.user-reacted {
    background: rgba(34, 197, 94, 0.1);
    color: var(--semantic-success);
  }

  .count {
    font-weight: 500;
    font-size: 0.85rem;
    min-width: 1rem;
    text-align: center;
    color: var(--text-primary);
  }
}

// 展开按钮
.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.05rem 0.25rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
  min-width: 1.2rem;

  &:hover,
  &.active {
    background: var(--surface-elevated);
    color: var(--interactive-primary);
  }

  .chevron-icon {
    width: 0.8rem;
    height: 0.8rem;
    transform: rotate(90deg);
    transition: transform 0.2s ease;
    display: block;
    
    &.rotated {
      transform: rotate(270deg);
    }
  }
}

// 整个按钮组的hover效果
.default-reaction-group:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-small);
}

// 移除旧的 add-reaction 样式，现在使用内联布局

.emoji-picker {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  z-index: 1000;
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  box-shadow: var(--shadow-large);
  padding: 0.75rem;
  width: 280px;
  max-height: 300px;
  overflow-y: auto;
  animation: emojiPickerSlideIn 0.2s ease-out;

  @media (max-width: 768px) {
    width: 260px;
    max-height: 250px;
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
  gap: 0.2rem;
}

.emoji-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s ease;

  &:hover {
    background: var(--surface-elevated);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(1.05);
  }

  .emoji-fallback {
    font-size: 1.2rem;
    line-height: 1;
    display: block;
  }

  .emoji-fallback--icon {
    width: 1rem;
    height: 1rem;
  }

  img.emoji-image {
    width: 1.5rem;
    height: 1.5rem;
    object-fit: contain;
    display: block;
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

.emoji-image {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
  vertical-align: middle;
  display: block;
}

.emoji-icon {
  width: 1.1rem;
  height: 1.1rem;
  display: block;
}

.no-emojis__title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0 0 0.35rem;
}

.no-emojis__icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
}
</style>
