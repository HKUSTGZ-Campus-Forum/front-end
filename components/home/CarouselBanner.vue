<template>
  <div class="carousel-banner">
    <div class="slides-wrap">
      <div
        class="slides-track"
        :style="{ transform: `translateX(-${current * 100}%)` }"
      >
        <div
          v-for="(slide, idx) in slides"
          :key="idx"
          class="slide"
        >
          <div class="slide-inner">
            <NuxtLink
              v-if="slide.href && !isExternalHref(slide.href)"
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
      class="arrow arrow-left"
      @click="prev"
      :aria-label="t('homePage.carousel.previousSlide')"
    >
      <span class="chevron chevron-left"></span>
    </button>

    <button
      class="arrow arrow-right"
      @click="next"
      :aria-label="t('homePage.carousel.nextSlide')"
    >
      <span class="chevron chevron-right"></span>
    </button>

    <div class="dots">
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

const { t, locale } = useI18n();
const localePath = useLocalePath();

type BannerSlide = {
  image: string
  alt: string
  href?: string
}

const slides = computed<BannerSlide[]>(() => [
  {
    image: "/image/banner/AMWC-1.jpg",
    alt: t("homePage.carousel.slides.contestAlt"),
    href: localePath("/contest"),
  },
  {
    image: "/image/banner/welcome_cn_2.jpg",
    alt: t("homePage.carousel.slides.welcomeZhAlt"),
    href: localePath("/"),
  },
  {
    image: "/image/banner/welcome_en.jpg",
    alt: t("homePage.carousel.slides.welcomeEnAlt"),
    href: localePath("/"),
  },
]);

function isExternalHref(url: string) {
  return /^https?:\/\//i.test(url);
}

const current = ref(0);
let timer: ReturnType<typeof setInterval>;

function next() {
  current.value = (current.value + 1) % slides.value.length;
  resetTimer();
}

function prev() {
  current.value = (current.value - 1 + slides.value.length) % slides.value.length;
  resetTimer();
}

function goTo(idx: number) {
  current.value = idx;
  resetTimer();
}

function resetTimer() {
  clearInterval(timer);
  timer = setInterval(next, 4000);
}

watch(locale, () => {
  current.value = 0;
});

onMounted(() => {
  timer = setInterval(next, 4000);
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
  background: #c8e0f4;
  box-shadow: 0 2px 12px rgba(38, 164, 255, 0.1);
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
}

.slide-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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
  background: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  z-index: 2;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
  line-height: 1;
  -webkit-appearance: none;
  appearance: none;
  aspect-ratio: 1 / 1;

  &:hover {
    background: rgba(255, 255, 255, 0.85);
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
  border-top: 1.5px solid #555;
  border-right: 1.5px solid #555;

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
  background: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  padding: 0;
  transition: background 0.2s, transform 0.2s;
  box-sizing: content-box;

  &.active {
    background: #26a4ff;
    transform: scale(1.25);
  }
}
</style>
