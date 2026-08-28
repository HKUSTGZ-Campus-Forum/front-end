<template>
  <div v-if="slides.length" class="carousel-banner">
    <div class="slides-wrap">
      <div
        class="slides-track"
        :style="{ transform: `translateX(-${current * 100}%)` }"
      >
        <div
          v-for="(slide, idx) in slides"
          :key="slide.id"
          class="slide"
        >
          <div class="slide-inner">
            <NuxtLink
              v-if="slide.variant === 'scheduler'"
              :to="slide.href"
              class="slide-link slide-link--scheduler"
              :aria-label="slide.alt"
            >
              <img
                :src="slide.image"
                alt=""
                aria-hidden="true"
                class="slide-img"
              />
              <span class="scheduler-poster__copy" aria-hidden="true">
                <span class="scheduler-poster__eyebrow">{{ slide.eyebrow }}</span>
                <strong class="scheduler-poster__title">{{ slide.title }}</strong>
                <span class="scheduler-poster__description">{{ slide.description }}</span>
                <span class="scheduler-poster__cta">
                  {{ slide.cta }}
                  <span aria-hidden="true">→</span>
                </span>
              </span>
            </NuxtLink>
            <NuxtLink
              v-else-if="slide.href && !isExternalHref(slide.href)"
              :to="slide.href"
              class="slide-link"
            >
              <img :src="slide.image" :alt="slide.alt" class="slide-img" />
            </NuxtLink>
            <a
              v-else-if="slide.href && isExternalHref(slide.href)"
              :href="slide.href"
              class="slide-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img :src="slide.image" :alt="slide.alt" class="slide-img" />
            </a>
            <img v-else :src="slide.image" :alt="slide.alt" class="slide-img" />
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="slides.length > 1"
      class="arrow arrow-left"
      @click="prev"
      :aria-label="t('homePage.carousel.previousSlide')"
    >
      <span class="chevron chevron-left"></span>
    </button>

    <button
      v-if="slides.length > 1"
      class="arrow arrow-right"
      @click="next"
      :aria-label="t('homePage.carousel.nextSlide')"
    >
      <span class="chevron chevron-right"></span>
    </button>

    <div v-if="slides.length > 1" class="dots">
      <button
        v-for="(_, idx) in slides"
        :key="idx"
        class="dot"
        :class="{ active: current === idx }"
        @click="goTo(idx)"
        :aria-label="t('homePage.carousel.slideLabel', { index: idx + 1 })"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { HomeCarouselPublicSlide } from "~/types/homeCarousel";
import { fallbackHomeCarouselSlides, localizeCarouselHref } from "~/utils/homeCarousel";

const { t, locale } = useI18n();
const localePath = useLocalePath();

type BannerSlide = {
  id: number
  image: string
  alt: string
  href: string
  variant?: "scheduler"
  eyebrow?: string
  title?: string
  description?: string
  cta?: string
}

const localeCode = computed<'zh' | 'en'>(() => locale.value === 'en' ? 'en' : 'zh')
const { fetchPublic } = useApi()
const { data: carouselData, error: carouselError } = await useAsyncData(
  'home-carousel',
  async () => {
    const response = await fetchPublic(`/api/home/carousel?locale=${localeCode.value}`)
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.error || 'Unable to load home carousel')
    }
    return payload as { locale: 'zh' | 'en', slides: HomeCarouselPublicSlide[] }
  },
  { watch: [localeCode] },
)

const sourceSlides = computed(() => {
  if (
    carouselError.value
    || !carouselData.value
    || carouselData.value.locale !== localeCode.value
  ) {
    return fallbackHomeCarouselSlides(localeCode.value)
  }
  return carouselData.value?.slides || []
})

const slides = computed<BannerSlide[]>(() => sourceSlides.value.map((slide) => ({
  id: slide.id,
  image: slide.image_url,
  alt: slide.alt_text || (
    slide.presentation_variant === 'scheduler'
      ? t('homePage.carousel.slides.schedulerAlt')
      : localeCode.value === 'en'
        ? t('homePage.carousel.slides.welcomeEnAlt')
        : t('homePage.carousel.slides.welcomeZhAlt')
  ),
  href: localizeCarouselHref(slide.href, localePath) || '',
  variant: slide.presentation_variant === 'scheduler' ? 'scheduler' : undefined,
  eyebrow: t('homePage.carousel.slides.schedulerEyebrow'),
  title: t('homePage.carousel.slides.schedulerTitle'),
  description: t('homePage.carousel.slides.schedulerDescription'),
  cta: t('homePage.carousel.slides.schedulerCta'),
})))

function isExternalHref(url: string) {
  return /^https?:\/\//i.test(url);
}

const current = ref(0);
let timer: ReturnType<typeof setInterval>;

function next() {
  if (slides.value.length < 2) return;
  current.value = (current.value + 1) % slides.value.length;
  resetTimer();
}

function prev() {
  if (slides.value.length < 2) return;
  current.value = (current.value - 1 + slides.value.length) % slides.value.length;
  resetTimer();
}

function goTo(idx: number) {
  current.value = idx;
  resetTimer();
}

function resetTimer() {
  clearInterval(timer);
  if (slides.value.length > 1) timer = setInterval(next, 4000);
}

watch([locale, () => slides.value.length], () => {
  current.value = 0;
  resetTimer();
});

onMounted(() => {
  resetTimer();
});

onUnmounted(() => clearInterval(timer));
</script>

<style lang="scss" scoped>
.carousel-banner {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 1024 / 341;
  background: var(--surface-secondary);
  box-shadow: var(--card-shadow);
  user-select: none;
}

.slides-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.slides-track {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
}

.slide-inner {
  width: 100%;
  height: 100%;
}

.slide-link {
  display: block;
  width: 100%;
  height: 100%;
  line-height: 0;
  cursor: pointer;
  color: inherit;
  text-decoration: none;

  &:focus-visible {
    outline: 3px solid var(--text-on-interactive);
    outline-offset: -4px;
  }

  &--scheduler {
    isolation: isolate;
    overflow: hidden;
    position: relative;

    .slide-img {
      transition: transform 0.45s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover .slide-img {
      transform: scale(1.012);
    }
  }
}

.slide-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.scheduler-poster__copy {
  box-sizing: border-box;
  color: var(--text-on-interactive);
  display: flex;
  flex-direction: column;
  gap: clamp(5px, 0.75vw, 10px);
  height: 100%;
  justify-content: center;
  left: 0;
  line-height: 1.2;
  padding: clamp(16px, 3vw, 34px) clamp(42px, 5vw, 58px);
  position: absolute;
  top: 0;
  width: 54%;
  z-index: 1;
}

.scheduler-poster__eyebrow {
  color: color-mix(in srgb, var(--interactive-primary) 52%, var(--text-on-interactive));
  font-size: clamp(0.58rem, 0.9vw, 0.76rem);
  font-weight: 750;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.scheduler-poster__title {
  font-size: clamp(1.28rem, 2.8vw, 2.15rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 1.08;
  text-shadow: var(--shadow-medium);
}

.scheduler-poster__description {
  color: var(--overlay-text-secondary);
  font-size: clamp(0.68rem, 1.05vw, 0.9rem);
  line-height: 1.45;
  max-width: 360px;
}

.scheduler-poster__cta {
  align-items: center;
  align-self: flex-start;
  background: color-mix(in srgb, var(--text-on-interactive) 94%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-on-interactive) 70%, transparent);
  border-radius: 999px;
  box-shadow: var(--shadow-medium);
  color: var(--scheduler-chip-text-active);
  display: inline-flex;
  font-size: clamp(0.62rem, 0.95vw, 0.78rem);
  font-weight: 800;
  gap: 5px;
  margin-top: 2px;
  padding: 5px 11px;
  width: fit-content;
}

@media (max-width: 900px) {
  .scheduler-poster__copy {
    gap: 5px;
    width: 58%;
  }

  .scheduler-poster__description {
    display: none;
  }

  .scheduler-poster__title {
    font-size: clamp(1rem, 3.4vw, 1.3rem);
  }
}

@media (max-width: 480px) {
  .scheduler-poster__copy {
    gap: 4px;
    padding: 6px 4px 10px 40px;
    width: 64%;
  }

  .scheduler-poster__eyebrow {
    display: none;
  }

  .scheduler-poster__title {
    font-size: clamp(0.78rem, 4.1vw, 0.98rem);
    line-height: 1.05;
  }

  .scheduler-poster__cta {
    box-shadow: none;
    font-size: 0.58rem;
    gap: 3px;
    margin-top: 0;
    padding: 3px 7px;
  }
}

.arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  min-width: 0;
  min-height: 0;
  max-width: 28px;
  max-height: 28px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 50%;
  background: color-mix(in srgb, var(--surface-primary) 55%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  z-index: 2;
  box-shadow: var(--shadow-small);
  box-sizing: border-box;
  line-height: 1;
  -webkit-appearance: none;
  appearance: none;
  aspect-ratio: 1 / 1;

  &:hover {
    background: color-mix(in srgb, var(--surface-primary) 85%, transparent);
    transform: translateY(-50%) scale(1.1);
  }

  &.arrow-left {
    left: 8px;
  }

  &.arrow-right {
    right: 8px;
  }
}

.chevron {
  display: block;
  width: 7px;
  height: 7px;
  border-top: 1.5px solid var(--text-secondary);
  border-right: 1.5px solid var(--text-secondary);

  &.chevron-left {
    transform: rotate(-135deg) translate(-0.5px, 0.5px);
  }

  &.chevron-right {
    transform: rotate(45deg) translate(-0.5px, 0.5px);
  }
}

.dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  z-index: 2;
}

.dot {
  display: inline-block;
  flex-shrink: 0;
  flex-grow: 0;
  width: 8px !important;
  height: 8px !important;
  min-width: 8px;
  min-height: 8px;
  max-width: 8px;
  max-height: 8px;
  border-radius: 50%;
  border: none;
  background: color-mix(in srgb, var(--surface-primary) 55%, transparent);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, transform 0.2s;
  box-sizing: content-box;

  &.active {
    background: var(--btn-primary-bg);
    transform: scale(1.25);
  }
}
</style>
