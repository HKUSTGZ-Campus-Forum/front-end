import type { HomeCarouselPublicSlide } from '~/types/homeCarousel'

export function fallbackHomeCarouselSlides(locale: 'zh' | 'en'): HomeCarouselPublicSlide[] {
  const scheduler: HomeCarouselPublicSlide = {
    id: -1,
    locale: 'all',
    image_url: '/image/banner/scheduler-planner-hero.webp',
    alt_text: '',
    href: '/courses/planner',
    presentation_variant: 'scheduler',
    sort_order: 10,
  }
  const welcome: HomeCarouselPublicSlide = locale === 'en'
    ? {
        id: -3,
        locale: 'en',
        image_url: '/image/banner/welcome_en.jpg',
        alt_text: '',
        href: '/',
        presentation_variant: 'image',
        sort_order: 30,
      }
    : {
        id: -2,
        locale: 'zh',
        image_url: '/image/banner/welcome_cn_2.jpg',
        alt_text: '',
        href: '/',
        presentation_variant: 'image',
        sort_order: 20,
      }
  return [scheduler, welcome]
}

export function localizeCarouselHref(href: string | null, localePath: (path: string) => string) {
  if (!href || /^https:\/\//i.test(href)) return href
  return localePath(href)
}
