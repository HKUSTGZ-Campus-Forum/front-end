<template>
  <div class="emoji-stats" v-if="Object.keys(reactions).length > 0">
    <div class="reactions-summary">
      <span
        v-for="(reaction, emojiId) in topReactions"
        :key="emojiId"
        class="reaction-stat"
        :title="`${reaction.count} 个 ${reaction.emoji.description || getEmojiFromCode(reaction.emoji.emoji_code)} 反应`"
      >
        <span class="emoji">
          <img 
            v-if="reaction.emoji.image_url" 
            :src="reaction.emoji.image_url" 
            :alt="reaction.emoji.description || 'emoji'"
            class="emoji-image"
          />
          <span v-else>{{ getEmojiFromCode(reaction.emoji.emoji_code) || "❓" }}</span>
        </span>
        <span class="count">{{ reaction.count }}</span>
      </span>

      <!-- 显示总数 -->
      <span class="total-reactions" v-if="totalCount > maxDisplay">
        +{{ totalCount - displayedCount }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useApi } from "~/composables/useApi";

// Add emoji code mapping function
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

  // If emojiCode is already a Unicode emoji, return it directly
  if (
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(
      emojiCode
    )
  ) {
    return emojiCode;
  }

  // Otherwise look up in mapping table
  return emojiMap[emojiCode] || emojiCode;
};

const props = defineProps({
  postId: {
    type: Number,
    required: true,
  },
  maxDisplay: {
    type: Number,
    default: 3, // 最多显示3种表情
  },
});

const { fetchWithAuth, getApiUrl } = useApi();
const reactions = ref({});

// 计算属性
const topReactions = computed(() => {
  // 按数量排序，取前N个
  const sorted = Object.entries(reactions.value)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, props.maxDisplay);

  return Object.fromEntries(sorted);
});

const totalCount = computed(() => {
  return Object.values(reactions.value).reduce(
    (sum, reaction) => sum + reaction.count,
    0
  );
});

const displayedCount = computed(() => {
  return Object.values(topReactions.value).reduce(
    (sum, reaction) => sum + reaction.count,
    0
  );
});

// 获取表情统计
const fetchReactions = async () => {
  try {
    const response = await fetchWithAuth(
      getApiUrl(`/api/reactions/posts/${props.postId}/reactions`)
    );

    if (!response.ok) return;

    const data = await response.json();

    // 处理反应数据，只需要统计
    reactions.value = {};
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

onMounted(() => {
  fetchReactions();
});
</script>

<!-- 样式保持不变 -->
<style lang="scss" scoped>
.emoji-stats {
  display: inline-flex;
  align-items: center;
}

.reactions-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.reaction-stat {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.4rem;
  background: #f8f9fa;
  border-radius: 12px;
  font-size: 0.75rem;
  color: #666;
  border: 1px solid #e9ecef;

  .emoji {
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .emoji-image {
      width: 1em;
      height: 1em;
      object-fit: contain;
      vertical-align: middle;
    }
  }

  .count {
    font-weight: 500;
    min-width: 0.8rem;
    text-align: center;
  }
}

.total-reactions {
  font-size: 0.75rem;
  color: #999;
  font-weight: 500;
}
</style>
