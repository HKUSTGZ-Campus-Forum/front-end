<template>
  <div class="emoji-stats" v-if="Object.keys(reactions).length > 0">
    <div class="reactions-summary">
      <span
        v-for="(reaction, emojiId) in topReactions"
        :key="emojiId"
        class="reaction-stat"
        :title="t('forum.reactions.statTitle', {
          count: reaction.count,
          label: reaction.emoji.description || getReactionLabel(reaction.emoji.emoji_code),
        })"
      >
        <span class="emoji">
          <iconify-icon
            :icon="getReactionIconifyName(reaction.emoji.emoji_code)"
            class="emoji-icon"
          />
        </span>
        <span class="count">{{ reaction.count }}</span>
      </span>

      <span class="total-reactions" v-if="totalCount > maxDisplay">
        +{{ totalCount - displayedCount }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "#imports";
import { useApi } from "~/composables/useApi";
import {
  getReactionIconifyName,
  getReactionLabel,
} from "~/utils/reactionIcons";

const props = defineProps({
  postId: {
    type: Number,
    required: true,
  },
  maxDisplay: {
    type: Number,
    default: 3,
  },
});

const { t } = useI18n();
const { fetchWithAuth, getApiUrl } = useApi();
const reactions = ref({});

const topReactions = computed(() => {
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

const fetchReactions = async () => {
  try {
    const response = await fetchWithAuth(
      getApiUrl(`/api/reactions/posts/${props.postId}/reactions`)
    );

    if (!response.ok) return;

    const data = await response.json();

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
    console.error("Failed to fetch reaction stats:", error);
  }
};

onMounted(() => {
  fetchReactions();
});
</script>

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

.emoji-icon {
  width: 0.9rem;
  height: 0.9rem;
  display: block;
  color: currentColor;
}
</style>
