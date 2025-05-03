export interface Course {
  id: number
  title: string
  content: string
  course_code: string
  department: string
  credits: number
  avg_rating?: number
  tags: Array<{
    id: number
    name: string
    tagcolor: string
    tag_type: string
  }>
}

export interface CourseReview {
  id: number
  course_id: number
  user_id: number
  rating: number
  difficulty?: number
  workload?: number
  content: string
  created_at: string
  updated_at: string
}
