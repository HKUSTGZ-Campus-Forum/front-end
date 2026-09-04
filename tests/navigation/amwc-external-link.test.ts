import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AMWC_RESULTS_URL } from '../../utils/externalLinks'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

describe('AMWC external navigation contract', () => {
  it('keeps one canonical secure URL', () => {
    expect(AMWC_RESULTS_URL).toBe('https://amwc.unikorn.axfff.com/')
    expect(new URL(AMWC_RESULTS_URL).protocol).toBe('https:')
  })

  it('opens AMWC safely from the desktop and mobile sidebar', () => {
    const sidebar = source('../../components/home/KeguangSidebar.vue')
    const amwcAnchor = sidebar.match(/<a\s+:href="AMWC_RESULTS_URL"[\s\S]*?<\/a>/)?.[0]

    expect(sidebar).toContain("import { AMWC_RESULTS_URL } from '~/utils/externalLinks'")
    expect(amwcAnchor).toBeDefined()
    expect(amwcAnchor).toContain('target="_blank"')
    expect(amwcAnchor).toContain('rel="noopener noreferrer"')
    expect(amwcAnchor).toContain("t('nav.contest')")
    expect(sidebar).not.toContain("getLocalePath('/contest')")
  })

  it('uses the localized scheduler module route for the home banner', () => {
    const carousel = source('../../components/home/CarouselBanner.vue')
    const schedulerPoster = new URL(
      '../../public/image/banner/scheduler-planner-hero.webp',
      import.meta.url,
    )

    expect(carousel).toContain('/api/home/carousel?locale=${localeCode.value}')
    expect(carousel).toContain('fallbackHomeCarouselSlides(localeCode.value)')
    expect(carousel).toContain("localizeCarouselHref(slide.href, localePath)")
    expect(carousel).toContain("t('homePage.carousel.slides.schedulerAlt')")
    expect(carousel).toContain('slide.variant === \'scheduler\'')
    expect(carousel).not.toContain('href: AMWC_RESULTS_URL')
    expect(carousel).not.toContain('/image/banner/AMWC-1.jpg')
    expect(carousel).toContain('v-else-if="slide.href && isExternalHref(slide.href)"')
    expect(carousel).toContain('target="_blank"')
    expect(carousel).toContain('rel="noopener noreferrer"')
    expect(existsSync(schedulerPoster)).toBe(true)
  })

  it('keeps the recruitment challenge as the first localized home banner', () => {
    const carousel = source('../../components/home/CarouselBanner.vue')
    const poster = new URL(
      '../../public/image/banner/recruitment-challenge-v1.jpg',
      import.meta.url,
    )

    expect(carousel).toContain("image: '/image/banner/recruitment-challenge-v1.jpg'")
    expect(carousel).toContain("href: localePath('/recruitment')")
    expect(existsSync(poster)).toBe(true)
  })

  it('keeps the existing contest participant and admin page available', () => {
    const contestPage = source('../../pages/contest/index.vue')

    expect(contestPage).toContain("fetchPublic('/api/contest')")
    expect(contestPage).toContain("localePath('/contest/admin')")
  })
})
