import { ref } from 'vue'
import type { CourseReview } from '~/types/forum/courses'

export function useCourseReviews() {
  const { $api } = useNuxtApp()
  const toast = useToast()

  const submitReview = async (courseId: number, review: Omit<CourseReview, 'id'|'course_id'|'user_id'|'created_at'|'updated_at'>) => {
    try {
      await $api.post(`/courses/${courseId}/reviews`, review)
      toast.success('Review submitted successfully')
      return true
    } catch (error) {
      toast.error('Failed to submit review')
      console.error(error)
      return false
    }
  }

  return {
    submitReview
  }
}
