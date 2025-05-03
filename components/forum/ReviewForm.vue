<script setup lang="ts">
import { useCourseReviews } from '~/composables/useCourseReviews'
import { ref } from 'vue'

const { submitReview: submitReviewApi } = useCourseReviews()

const props = defineProps<{
  courseId: number
}>()

const rating = ref(0)
const difficulty = ref<number | undefined>(undefined)
const workload = ref<number | undefined>(undefined)
const content = ref('')
const isLoading = ref(false)

const emit = defineEmits(['submitted'])

const submitReview = async () => {
  if (!rating.value || !content.value) return

  
  isLoading.value = true
  const success = await submitReviewApi(props.courseId, {
    rating: rating.value,
    difficulty: difficulty.value,
    workload: workload.value,
    content: content.value
  })
  
  if (success) {
    rating.value = 0
    difficulty.value = undefined
    workload.value = undefined
    content.value = ''
    emit('submitted')
  }
  isLoading.value = false
}
</script>

<template>
  <div class="review-form">
    <h3>Add Your Review</h3>
    
    <div class="rating-section">
      <label>Overall Rating:</label>
      <div class="stars">
        <button
          v-for="i in 5"
          :key="i"
          class="star"
          :class="{ active: i <= rating }"
          @click="rating = i"
        >
          ★
        </button>
      </div>
    </div>

    <div class="form-group">
      <label>Difficulty (1-5):</label>
      <input
        v-model.number="difficulty"
        type="number"
        min="1"
        max="5"
        placeholder="Optional"
      >
    </div>

    <div class="form-group">
      <label>Weekly Workload (hours):</label>
      <input
        v-model.number="workload"
        type="number"
        min="1"
        placeholder="Optional"
      >
    </div>

    <div class="form-group">
      <label>Review Content:</label>
      <textarea
        v-model="content"
        placeholder="Share your experience with this course..."
        required
      />
    </div>

    <button @click="submitReview" class="submit-btn">
      Submit Review
    </button>
  </div>
</template>

<style lang="scss" scoped>
.review-form {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 0.5rem;
  margin-top: 1rem;

  h3 {
    margin-top: 0;
  }

  .rating-section {
    margin-bottom: 1rem;

    .stars {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;

      .star {
        font-size: 1.5rem;
        color: #ccc;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;

        &.active {
          color: #ffc107;
        }
      }
    }
  }

  .form-group {
    margin-bottom: 1rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    input, textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid var(--border-color);
      border-radius: 0.25rem;
    }

    textarea {
      min-height: 100px;
    }
  }

  .submit-btn {
    background-color: var(--primary);
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-weight: 500;

    &:hover {
      background-color: var(--primary-dark);
    }
  }
}
</style>
