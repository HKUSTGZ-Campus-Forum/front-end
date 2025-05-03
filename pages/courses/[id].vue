<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAsyncData, useNuxtApp } from 'nuxt/app'

const { $api } = useNuxtApp() as { $api: any }
const route = useRoute()

interface ApiResponse<T> {
  data: T
}

interface CourseResponse {
  id: number
  title: string
  course_code: string
  department: string
  credits: number
  avg_rating?: number
  tags: Array<{
    id: number
    name: string
    tagcolor: string
  }>
}

interface ReviewResponse {
  id: number
  rating: number
  content: string
  created_at: string
}

const { data: course, pending } = useAsyncData<ApiResponse<CourseResponse>>(
  `course-${route.params.id}`, 
  () => $api.get(`/courses/${route.params.id}`)
)

const reviews = ref<ReviewResponse[]>([])
const { data: reviewsData, refresh: refreshReviews } = useAsyncData<ApiResponse<ReviewResponse[]>>(
  `reviews-${route.params.id}`,
  () => $api.get(`/courses/${route.params.id}/reviews`)
)

watch(reviewsData, (newVal) => {
  reviews.value = newVal?.data || []
}, { immediate: true })
</script>

<template>
  <div class="course-page">
    <div v-if="pending" class="loading">
      Loading course details...
    </div>

    <template v-else>
      <CourseCard :course="course.data" :show-details="true" />
      
      <div class="reviews-section">
        <h2>Reviews</h2>
        
        <div v-if="reviews.length" class="reviews-list">
          <div v-for="review in reviews" :key="review.id" class="review-item">
            <div class="review-header">
              <span class="rating">
                <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= review.rating }">
                  ★
                </span>
              </span>
              <span class="date">{{ new Date(review.created_at).toLocaleDateString() }}</span>
            </div>
            <div class="review-content">{{ review.content }}</div>
          </div>
        </div>
        <div v-else class="no-reviews">
          No reviews yet. Be the first to review!
        </div>

        <ReviewForm :course-id="course.data.id" @submitted="refreshReviews" />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.course-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;

  .loading {
    text-align: center;
    padding: 2rem;
  }

  .reviews-section {
    margin-top: 2rem;

    h2 {
      margin-bottom: 1rem;
    }

    .reviews-list {
      margin-bottom: 2rem;

      .review-item {
        padding: 1rem;
        border-bottom: 1px solid var(--border-color);

        .review-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;

          .rating {
            .star {
              color: #ccc;
              &.filled {
                color: #ffc107;
              }
            }
          }

          .date {
            color: var(--text-secondary);
            font-size: 0.9rem;
          }
        }

        .review-content {
          white-space: pre-line;
        }
      }
    }

    .no-reviews {
      text-align: center;
      padding: 1rem;
      color: var(--text-secondary);
      font-style: italic;
    }
  }
}
</style>
