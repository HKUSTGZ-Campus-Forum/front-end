<script setup lang="ts">
import { academicMajors, normalizeAcademicMajorCode } from '~/constants/academicMajors'

const props = defineProps<{
  cohort: string | null
  targetMajors: string[]
  saving?: boolean
}>()

const emit = defineEmits<{
  (e: 'save', value: { cohort: string | null; target_majors: string[]; focus_major?: string | null }): void
}>()

const { locale, t } = useI18n()

const availableMajors = academicMajors
const availableCohorts = ['2023', '2024', '2025', '2026']
const draftCohort = ref<string | null>(props.cohort)
const normalizeMajors = (values: string[]) => values
  .map(value => normalizeAcademicMajorCode(value))
  .filter((value): value is NonNullable<typeof value> => Boolean(value))

const draftMajors = ref<string[]>(normalizeMajors(props.targetMajors))

watch(() => props.cohort, value => { draftCohort.value = value })
watch(() => props.targetMajors, value => { draftMajors.value = normalizeMajors(value) })

const majorLabel = (major: typeof academicMajors[number]) => {
  return locale.value === 'zh'
    ? `${major.code} ${major.nameZh}`
    : `${major.code} ${major.nameEn}`
}

const toggleMajor = (major: string) => {
  if (props.saving) return
  const wasSelected = draftMajors.value.includes(major)
  let nextMajors: string[]
  if (wasSelected) {
    nextMajors = draftMajors.value.filter(item => item !== major)
  } else if (draftMajors.value.length < 3) {
    nextMajors = [...draftMajors.value, major]
  } else {
    return
  }
  draftMajors.value = nextMajors
  emit('save', {
    cohort: draftCohort.value,
    target_majors: nextMajors,
    focus_major: wasSelected ? nextMajors[0] || null : major,
  })
}

const selectCohort = (cohort: string) => {
  if (props.saving || draftCohort.value === cohort) return
  draftCohort.value = cohort
  emit('save', {
    cohort,
    target_majors: draftMajors.value,
    focus_major: draftMajors.value[0] || null,
  })
}
</script>

<template>
  <section class="am-card am-target">
    <div class="am-section-head">
      <div>
        <h2>{{ t('academicMap.targetMajors.title') }}</h2>
      </div>
    </div>

    <div class="am-field-row">
      <label>{{ t('academicMap.cohort') }}</label>
      <div class="am-chip-row">
        <button
          v-for="cohortItem in availableCohorts"
          :key="cohortItem"
          type="button"
          :class="['am-chip', { active: draftCohort === cohortItem }]"
          :disabled="saving"
          @click="selectCohort(cohortItem)"
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
          :key="major.code"
          type="button"
          :class="['am-chip', 'am-chip--major', { active: draftMajors.includes(major.code) }]"
          :title="majorLabel(major)"
          :disabled="saving"
          @click="toggleMajor(major.code)"
        >
          <span class="am-major-code">{{ major.code }}</span>
          <small>{{ locale === 'zh' ? major.nameZh : major.nameEn }}</small>
        </button>
      </div>
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

.am-target {
  margin-bottom: 16px;
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

.am-chip {
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

  &:disabled {
    cursor: wait;
    opacity: 0.65;
  }
}

.am-chip--major {
  align-items: center;
  display: inline-flex;
  gap: 6px;

  small {
    font-size: 0.72rem;
    font-weight: 700;
  }
}

.am-major-code {
  color: inherit;
  font-weight: 800;
}

</style>
