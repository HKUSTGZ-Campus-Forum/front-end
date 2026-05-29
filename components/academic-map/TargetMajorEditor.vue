<script setup lang="ts">
const props = defineProps<{
  cohort: string | null
  targetMajors: string[]
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', value: { cohort: string | null; target_majors: string[] }): void
}>()

const { t } = useI18n()

const availableMajors = ['AI', 'DSBD', 'FTEC', 'AMAT', 'ROAS', 'MICS', 'SMMG', 'SEEN']
const availableCohorts = ['2023', '2024', '2025', '2026']
const draftCohort = ref<string | null>(props.cohort)
const draftMajors = ref<string[]>([...props.targetMajors])

watch(() => props.cohort, value => { draftCohort.value = value })
watch(() => props.targetMajors, value => { draftMajors.value = [...value] })

const toggleMajor = (major: string) => {
  if (draftMajors.value.includes(major)) {
    draftMajors.value = draftMajors.value.filter(item => item !== major)
    return
  }
  if (draftMajors.value.length < 3) draftMajors.value = [...draftMajors.value, major]
}

const save = () => {
  emit('save', {
    cohort: draftCohort.value,
    target_majors: draftMajors.value,
  })
}
</script>

<template>
  <section class="am-card am-target">
    <div class="am-section-head">
      <div>
        <h2>{{ t('academicMap.targetMajors.title') }}</h2>
        <p>{{ t('academicMap.targetMajors.copy') }}</p>
      </div>
      <button class="am-primary-btn" :disabled="saving" type="button" @click="save">
        {{ saving ? t('actions.saving') : t('actions.save') }}
      </button>
    </div>

    <div class="am-field-row">
      <label>{{ t('academicMap.cohort') }}</label>
      <div class="am-chip-row">
        <button
          v-for="cohortItem in availableCohorts"
          :key="cohortItem"
          type="button"
          :class="['am-chip', { active: draftCohort === cohortItem }]"
          @click="draftCohort = cohortItem"
        >
          {{ cohortItem }}
        </button>
      </div>
    </div>

    <div class="am-field-row">
      <label>{{ t('academicMap.targetMajors.label') }}</label>
      <div class="am-chip-row">
        <button
          v-for="major in availableMajors"
          :key="major"
          type="button"
          :class="['am-chip', { active: draftMajors.includes(major) }]"
          @click="toggleMajor(major)"
        >
          {{ major }}
        </button>
      </div>
      <p class="am-help">{{ t('academicMap.targetMajors.limit') }}</p>
    </div>
  </section>
</template>

<style scoped lang="scss">
.am-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-primary);
  border-radius: 16px;
  box-shadow: var(--shadow-small);
  padding: 18px;
}

.am-section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.05rem;
  }

  p {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: 0.86rem;
  }
}

.am-field-row {
  display: grid;
  gap: 8px;
  margin-top: 14px;

  label {
    color: var(--text-secondary);
    font-size: 0.82rem;
    font-weight: 700;
  }
}

.am-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.am-chip,
.am-primary-btn {
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.am-chip {
  border: 1px solid var(--border-secondary);
  background: var(--surface-primary);
  color: var(--text-secondary);
  padding: 6px 12px;

  &.active,
  &:hover {
    background: var(--bg-secondary);
    border-color: var(--border-focus);
    color: var(--interactive-active);
  }
}

.am-primary-btn {
  border: 0;
  background: var(--interactive-primary);
  color: var(--text-inverse);
  padding: 8px 18px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
}

.am-help {
  color: var(--text-tertiary);
  font-size: 0.78rem;
  margin: 0;
}
</style>
