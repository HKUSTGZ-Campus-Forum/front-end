<script setup lang="ts">
import type { Course } from '~/types/forum/courses'

const props = defineProps<{
  course: Course
  showDetails?: boolean
}>()

const ratingStars = computed(() => {
  if (!props.course.avg_rating) return 0
  return Math.round(props.course.avg_rating * 2) / 2 // Round to nearest 0.5
})
</script>

<template>
  <div class="course-card">
    <div class="course-header">
      <h3>{{ course.course_code }} - {{ course.title }}</h3>
      <div class="course-meta">
        <span class="department">{{ course.department }}</span>
        <span class="credits">{{ course.credits }} credits</span>
      </div>
    </div>

    <div v-if="showDetails" class="course-details">
      <div class="rating">
        <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= ratingStars }">
          ★
        </span>
        <span class="rating-value">{{ course.avg_rating?.toFixed(1) || 'N/A' }}</span>
      </div>
      
      <div class="tags">
        <span v-for="tag in course.tags" :key="tag.id" class="tag" :style="{ color: tag.tagcolor }">
          {{ tag.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.course-card {
  @extend .post-card;
  padding: 1rem;
  margin-bottom: 1rem;

  .course-header {
    margin-bottom: 0.5rem;
    
    h3 {
      margin: 0;
      font-size: 1.2rem;
    }

    .course-meta {
      font-size: 0.9rem;
      color: var(--text-secondary);
      
      span:not(:last-child)::after {
        content: '•';
        margin: 0 0.5rem;
      }
    }
  }

  .rating {
    margin: 0.5rem 0;
    
    .star {
      color: #ccc;
      &.filled {
        color: #ffc107;
      }
    }
    
    .rating-value {
      margin-left: 0.5rem;
      font-weight: bold;
    }
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    
    .tag {
      padding: 0.2rem 0.5rem;
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 1rem;
      font-size: 0.8rem;
    }
  }
}
</style>
