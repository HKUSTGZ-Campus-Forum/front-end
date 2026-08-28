export type HomeCarouselLocale = 'zh' | 'en' | 'all'
export type HomeCarouselVariant = 'image' | 'scheduler'

export interface HomeCarouselPublicSlide {
  id: number
  locale: HomeCarouselLocale
  image_url: string
  alt_text: string
  href: string | null
  presentation_variant: HomeCarouselVariant
  sort_order: number
}

export interface HomeCarouselAdminSlide {
  id: number
  locale: HomeCarouselLocale
  image_file_id: number | null
  image_path: string | null
  image_url: string | null
  alt_text_zh: string | null
  alt_text_en: string | null
  href: string | null
  presentation_variant: HomeCarouselVariant
  sort_order: number
  is_active: boolean
  is_deleted: boolean
  created_by_user_id: number | null
  updated_by_user_id: number | null
  deleted_by_user_id: number | null
  deleted_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface HomeCarouselWritePayload {
  locale: HomeCarouselLocale
  alt_text_zh: string
  alt_text_en: string
  href: string
  is_active: boolean
  image_file_id?: number
}
