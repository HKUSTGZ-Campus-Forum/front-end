<template>
  <section class="help-page">
    <div class="help-page__container">
      <p class="help-page__eyebrow">UniKorn</p>
      <h1 class="help-page__title">{{ t("help.rules.title") }}</h1>
      <p class="help-page__summary">{{ t("help.rules.summary") }}</p>

      <div class="help-page__sections">
        <article class="help-page__card">
          <h2>{{ t("help.rules.sectionOneTitle") }}</h2>
          <p>{{ t("help.rules.sectionOneBody") }}</p>
        </article>
        <article class="help-page__card">
          <h2>{{ t("help.rules.sectionTwoTitle") }}</h2>
          <p>{{ t("help.rules.sectionTwoBody") }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ layout: "keguang" });

const { t } = useI18n();

useHead(() => ({
  title: `${t("help.rules.title")} - ${t("common.appName")}`,
  meta: [{ name: "description", content: t("help.rules.summary") }],
}));
</script>

<style scoped lang="scss">
.help-page {
  padding: 48px 20px 80px;
}

.help-page__container {
  max-width: 960px;
  margin: 0 auto;
}

.help-page__eyebrow {
  margin: 0 0 12px;
  color: var(--interactive-primary);
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.help-page__title {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(2rem, 4vw, 3rem);
}

.help-page__summary {
  max-width: 720px;
  margin: 16px 0 0;
  color: var(--text-secondary);
  font-size: 1.05rem;
  line-height: 1.7;
}

.help-page__sections {
  display: grid;
  gap: 20px;
  margin-top: 32px;
}

.help-page__card {
  padding: 24px;
  border: 1px solid var(--border-primary);
  border-radius: 20px;
  background: var(--surface-primary);
  box-shadow: var(--shadow-soft, 0 10px 30px rgba(15, 23, 42, 0.06));

  h2 {
    margin: 0 0 12px;
    color: var(--text-primary);
    font-size: 1.15rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.7;
  }
}
</style>
