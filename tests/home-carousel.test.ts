import { describe, expect, it } from 'vitest'
import { fallbackHomeCarouselSlides, localizeCarouselHref } from '../utils/homeCarousel'

describe('home carousel locale contract', () => {
  it('never shows the English welcome image on the Chinese fallback', () => {
    const slides = fallbackHomeCarouselSlides('zh')

    expect(slides.map((slide) => slide.locale)).toEqual(['all', 'zh'])
    expect(slides.some((slide) => slide.image_url.includes('welcome_en'))).toBe(false)
  })

  it('never shows the Chinese welcome image on the English fallback', () => {
    const slides = fallbackHomeCarouselSlides('en')

    expect(slides.map((slide) => slide.locale)).toEqual(['all', 'en'])
    expect(slides.some((slide) => slide.image_url.includes('welcome_cn'))).toBe(false)
  })

  it('localizes site paths without rewriting HTTPS destinations', () => {
    const localePath = (path: string) => `/en${path}`

    expect(localizeCarouselHref('/courses/planner', localePath)).toBe('/en/courses/planner')
    expect(localizeCarouselHref('https://example.com/banner', localePath)).toBe('https://example.com/banner')
    expect(localizeCarouselHref(null, localePath)).toBeNull()
  })
})
