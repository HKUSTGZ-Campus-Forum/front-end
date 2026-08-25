<script setup lang="ts">
import type { CartCourse } from '~/utils/scheduler'
import type {
  SchedulerOptimizerCourseCountRule,
  SchedulerOptimizerCourseRule,
  SchedulerOptimizerEarlyRule,
  SchedulerOptimizerRuleApplication,
  SchedulerOptimizerScoreProfile,
  SchedulerOptimizerSectionRule,
  SchedulerOptimizerTimeRule,
} from '~/utils/schedulerOptimizer'

type RuleCollection = 'countRules' | 'courseRules' | 'sectionRules' | 'earlyRules' | 'timeRules'

const props = defineProps<{
  visible: boolean
  courseList: CartCourse[]
  candidateCodes: string[]
  minCourses: number
  maxCourses: number
  topX: number
  profile: SchedulerOptimizerScoreProfile
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'update:minCourses', value: number): void
  (event: 'update:maxCourses', value: number): void
  (event: 'update:topX', value: number): void
  (event: 'update:profile', value: SchedulerOptimizerScoreProfile): void
}>()

const { t } = useI18n()
const closeButton = ref<HTMLButtonElement | null>(null)
const drawerRef = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null
let generatedRuleId = 0

const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const weekdayNumbers = [1, 2, 3, 4, 5]

const courseByCode = computed(() => new Map<string, CartCourse>(
  props.courseList.map(course => [course.course_code, course] as const),
))

const candidateCourses = computed(() => props.candidateCodes.map((code) => {
  const course = courseByCode.value.get(code)
  return {
    code,
    title: course?.course_title || code,
    credit: course?.credit,
  }
}))

const candidateLimit = computed(() => Math.max(1, props.candidateCodes.length))
const visibleCandidateCourses = computed(() => candidateCourses.value.slice(0, 10))
const hiddenCandidateCount = computed(() => Math.max(0, candidateCourses.value.length - 10))

interface SectionChoice {
  id: string
  label: string
}

function sectionChoices(courseCode: string): SectionChoice[] {
  const course = courseByCode.value.get(courseCode)
  if (!course) return []

  const seen = new Set<string>()
  const choices: SectionChoice[] = []
  for (const [layerText, bundles] of Object.entries(course.layers)) {
    const layer = Number(layerText)
    for (const bundle of bundles) {
      for (const section of bundle.sections) {
        if (!section.section_id || seen.has(section.section_id)) continue
        seen.add(section.section_id)
        choices.push({
          id: section.section_id,
          label: `${section.name || section.section_id} · ${t('scheduler.layer', { layer })}`,
        })
      }
    }
  }
  return choices
}

const canAddCourseRule = computed(() => candidateCourses.value.length > 0)
const canAddSectionRule = computed(() => candidateCourses.value.some(course => sectionChoices(course.code).length > 0))

function cloneProfile(profile: SchedulerOptimizerScoreProfile): SchedulerOptimizerScoreProfile {
  return {
    schemaVersion: 1,
    baseScore: profile.baseScore,
    creditDelta: profile.creditDelta,
    countRules: profile.countRules.map(rule => ({ ...rule })),
    courseRules: profile.courseRules.map(rule => ({ ...rule })),
    sectionRules: profile.sectionRules.map(rule => ({ ...rule })),
    earlyRules: profile.earlyRules.map(rule => ({ ...rule })),
    timeRules: profile.timeRules.map(rule => ({ ...rule, days: [...rule.days] })),
  }
}

function updateProfile(mutator: (profile: SchedulerOptimizerScoreProfile) => void) {
  const nextProfile = cloneProfile(props.profile)
  mutator(nextProfile)
  emit('update:profile', nextProfile)
}

function updateRule(collection: RuleCollection, id: string, patch: Record<string, unknown>) {
  updateProfile((profile) => {
    const rules = profile[collection] as unknown as Array<{ id: string } & Record<string, unknown>>
    const rule = rules.find(item => item.id === id)
    if (rule) Object.assign(rule, patch)
  })
}

function removeRule(collection: RuleCollection, id: string) {
  updateProfile((profile) => {
    const rules = profile[collection] as unknown as Array<{ id: string }>
    const index = rules.findIndex(rule => rule.id === id)
    if (index >= 0) rules.splice(index, 1)
  })
}

function addRule(collection: RuleCollection, rule: SchedulerOptimizerScoreProfile[RuleCollection][number]) {
  updateProfile((profile) => {
    const rules = profile[collection] as unknown as Array<typeof rule>
    rules.push(rule)
  })
}

function createRuleId(kind: string): string {
  generatedRuleId += 1
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${kind}-${crypto.randomUUID()}`
  }
  return `${kind}-${Date.now()}-${generatedRuleId}`
}

function addCountRule() {
  const rule: SchedulerOptimizerCourseCountRule = {
    id: createRuleId('count'),
    enabled: true,
    courseCount: Math.max(1, Math.min(props.maxCourses, 5)),
    delta: '10',
  }
  addRule('countRules', rule)
}

function addEarlyRule() {
  const usedDays = new Set(props.profile.earlyRules.map(rule => rule.day))
  const day = weekdayNumbers.find(value => !usedDays.has(value)) ?? 1
  const rule: SchedulerOptimizerEarlyRule = {
    id: createRuleId('early'),
    enabled: true,
    day,
    startMinute: 540,
    delta: '-5',
  }
  addRule('earlyRules', rule)
}

function addTimeRule(state: 'occupied' | 'free') {
  const rule: SchedulerOptimizerTimeRule = {
    id: createRuleId(state),
    enabled: true,
    days: [...weekdayNumbers],
    startMinute: state === 'occupied' ? 720 : 730,
    endMinute: state === 'occupied' ? 730 : 740,
    state,
    application: 'per-day',
    delta: state === 'occupied' ? '-5' : '5',
  }
  addRule('timeRules', rule)
}

function addCourseRule() {
  const courseCode = candidateCourses.value[0]?.code
  if (!courseCode) return
  const rule: SchedulerOptimizerCourseRule = {
    id: createRuleId('course'),
    enabled: true,
    courseCode,
    delta: '5',
  }
  addRule('courseRules', rule)
}

function addSectionRule() {
  const course = candidateCourses.value.find(candidate => sectionChoices(candidate.code).length > 0)
  const section = course ? sectionChoices(course.code)[0] : undefined
  if (!course || !section) return
  const rule: SchedulerOptimizerSectionRule = {
    id: createRuleId('section'),
    enabled: true,
    courseCode: course.code,
    sectionId: section.id,
    delta: '5',
  }
  addRule('sectionRules', rule)
}

function updateSectionRuleCourse(ruleId: string, courseCode: string) {
  updateRule('sectionRules', ruleId, {
    courseCode,
    sectionId: sectionChoices(courseCode)[0]?.id || '',
  })
}

function toggleTimeRuleDay(rule: SchedulerOptimizerTimeRule, day: number, checked: boolean) {
  const days = checked
    ? [...new Set([...rule.days, day])].sort((left, right) => left - right)
    : rule.days.filter(value => value !== day)
  updateRule('timeRules', rule.id, { days })
}

function minutesToTime(minutes: number): string {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.min(1439, Math.trunc(minutes))) : 0
  const hours = Math.floor(safeMinutes / 60)
  const remainder = safeMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}

function timeToMinutes(value: string, fallback: number): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return fallback
  return Number(match[1]) * 60 + Number(match[2])
}

function eventValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value
}

function eventChecked(event: Event): boolean {
  return (event.target as HTMLInputElement).checked
}

function eventInteger(event: Event, fallback: number, minimum = 0): number {
  const value = Number.parseInt(eventValue(event), 10)
  return Number.isSafeInteger(value) ? Math.max(minimum, value) : fallback
}

function updateMinimumCourses(event: Event) {
  const value = eventInteger(event, props.minCourses, 1)
  emit('update:minCourses', Math.min(value, props.maxCourses, candidateLimit.value))
}

function updateMaximumCourses(event: Event) {
  const value = eventInteger(event, props.maxCourses, 1)
  emit('update:maxCourses', Math.max(props.minCourses, Math.min(value, candidateLimit.value)))
}

function updateTopX(event: Event) {
  emit('update:topX', eventInteger(event, props.topX, 1))
}

function eventApplication(event: Event): SchedulerOptimizerRuleApplication {
  const value = eventValue(event)
  return value === 'any-day' || value === 'all-days' ? value : 'per-day'
}

function dayLabel(day: number): string {
  return t(`scheduler.days.${dayKeys[day - 1] || 'mon'}`)
}

function close() {
  emit('close')
}

function onWindowKeydown(event: KeyboardEvent) {
  if (!props.visible) return
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab' || !drawerRef.value) return

  const focusable = [...drawerRef.value.querySelectorAll<HTMLElement>(
    'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
  )].filter(element => !element.hidden && element.getClientRects().length > 0)
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable.at(-1)!
  const active = document.activeElement
  if (event.shiftKey && (active === first || !drawerRef.value.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(() => props.visible, async (visible) => {
  if (typeof window === 'undefined') return
  if (!visible) {
    window.removeEventListener('keydown', onWindowKeydown)
    previousFocus?.focus()
    previousFocus = null
    return
  }
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  window.addEventListener('keydown', onWindowKeydown)
  await nextTick()
  closeButton.value?.focus()
}, { immediate: true })

onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onWindowKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="optimizer-settings">
      <div
        v-if="visible"
        class="optimizer-settings"
        role="presentation"
        @mousedown.self="close"
      >
        <aside
          ref="drawerRef"
          class="optimizer-settings__drawer"
          role="dialog"
          aria-modal="true"
          aria-labelledby="optimizer-settings-title"
        >
          <header class="optimizer-settings__header">
            <div>
              <p>{{ t('scheduler.optimizer.settings') }}</p>
              <h2 id="optimizer-settings-title">{{ t('scheduler.optimizer.title') }}</h2>
            </div>
            <button
              ref="closeButton"
              type="button"
              class="optimizer-settings__close"
              :aria-label="t('scheduler.close')"
              @click="close"
            >
              <Icon name="lucide:x" aria-hidden="true" />
            </button>
          </header>

          <div class="optimizer-settings__body">
            <section class="optimizer-settings__section" aria-labelledby="optimizer-candidate-title">
              <div class="optimizer-settings__section-heading">
                <span>01</span>
                <div>
                  <h3 id="optimizer-candidate-title">{{ t('scheduler.optimizer.candidatePoolTitle') }}</h3>
                  <p>{{ t('scheduler.optimizer.candidatePoolHint') }}</p>
                </div>
              </div>

              <div class="optimizer-settings__candidate-summary">
                <div class="optimizer-settings__candidate-count">
                  <Icon name="lucide:library-big" aria-hidden="true" />
                  <strong>{{ t('scheduler.optimizer.candidatePoolCount', { count: candidateCodes.length }) }}</strong>
                </div>
                <div v-if="visibleCandidateCourses.length" class="optimizer-settings__candidate-list">
                  <span
                    v-for="course in visibleCandidateCourses"
                    :key="course.code"
                    class="optimizer-settings__candidate-chip"
                    :title="course.title"
                  >
                    {{ course.code }}
                  </span>
                  <span v-if="hiddenCandidateCount" class="optimizer-settings__candidate-more">
                    +{{ hiddenCandidateCount }}
                  </span>
                </div>
                <p v-else class="optimizer-settings__empty">{{ t('scheduler.optimizer.candidatePoolEmpty') }}</p>
              </div>
            </section>

            <section class="optimizer-settings__section" aria-labelledby="optimizer-range-title">
              <div class="optimizer-settings__section-heading">
                <span>02</span>
                <div>
                  <h3 id="optimizer-range-title">{{ t('scheduler.optimizer.courseRangeTitle') }}</h3>
                  <p>{{ t('scheduler.optimizer.courseRangeHint') }}</p>
                </div>
              </div>

              <div class="optimizer-settings__range-grid">
                <label class="optimizer-settings__field optimizer-settings__range-field">
                  <span>{{ t('scheduler.optimizer.minimumCourses') }}</span>
                  <strong>{{ minCourses }}</strong>
                  <input
                    type="number"
                    inputmode="numeric"
                    min="1"
                    :max="Math.min(candidateLimit, maxCourses)"
                    :value="minCourses"
                    @input="updateMinimumCourses"
                  />
                  <input
                    type="range"
                    min="1"
                    :max="Math.min(candidateLimit, maxCourses)"
                    :value="minCourses"
                    :aria-label="t('scheduler.optimizer.minimumCourses')"
                    @input="updateMinimumCourses"
                  />
                </label>
                <label class="optimizer-settings__field optimizer-settings__range-field">
                  <span>{{ t('scheduler.optimizer.maximumCourses') }}</span>
                  <strong>{{ maxCourses }}</strong>
                  <input
                    type="number"
                    inputmode="numeric"
                    :min="Math.min(minCourses, candidateLimit)"
                    :max="candidateLimit"
                    :value="maxCourses"
                    @input="updateMaximumCourses"
                  />
                  <input
                    type="range"
                    :min="Math.min(minCourses, candidateLimit)"
                    :max="candidateLimit"
                    :value="maxCourses"
                    :aria-label="t('scheduler.optimizer.maximumCourses')"
                    @input="updateMaximumCourses"
                  />
                </label>
                <label class="optimizer-settings__field optimizer-settings__top-x">
                  <span>{{ t('scheduler.optimizer.topX') }}</span>
                  <input
                    type="number"
                    inputmode="numeric"
                    min="1"
                    :value="topX"
                    @input="updateTopX"
                  />
                  <small>{{ t('scheduler.optimizer.topXHint') }}</small>
                </label>
              </div>
            </section>

            <section class="optimizer-settings__section" aria-labelledby="optimizer-scoring-title">
              <div class="optimizer-settings__section-heading">
                <span>03</span>
                <div>
                  <h3 id="optimizer-scoring-title">{{ t('scheduler.optimizer.scoringTitle') }}</h3>
                  <p>{{ t('scheduler.optimizer.scoringHint') }}</p>
                </div>
              </div>

              <div class="optimizer-settings__score-foundation">
                <label class="optimizer-settings__field">
                  <span>{{ t('scheduler.optimizer.baseScore') }}</span>
                  <input
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    spellcheck="false"
                    :value="profile.baseScore"
                    @input="updateProfile(next => next.baseScore = eventValue($event))"
                  />
                  <small>{{ t('scheduler.optimizer.baseScoreHint') }}</small>
                </label>
                <label class="optimizer-settings__field">
                  <span>{{ t('scheduler.optimizer.creditDelta') }}</span>
                  <input
                    type="text"
                    inputmode="decimal"
                    autocomplete="off"
                    spellcheck="false"
                    :value="profile.creditDelta"
                    @input="updateProfile(next => next.creditDelta = eventValue($event))"
                  />
                  <small>{{ t('scheduler.optimizer.decimalHint') }}</small>
                </label>
              </div>

              <div class="optimizer-settings__rule-group">
                <div class="optimizer-settings__rule-group-heading">
                  <div>
                    <Icon name="lucide:list-plus" aria-hidden="true" />
                    <h4>{{ t('scheduler.optimizer.courseCountRules') }}</h4>
                  </div>
                  <button type="button" @click="addCountRule">
                    <Icon name="lucide:plus" aria-hidden="true" />
                    {{ t('scheduler.optimizer.addRule') }}
                  </button>
                </div>
                <div v-if="profile.countRules.length" class="optimizer-settings__rules">
                  <article v-for="rule in profile.countRules" :key="rule.id" class="optimizer-settings__rule" :class="{ 'is-disabled': !rule.enabled }">
                    <label class="optimizer-settings__rule-toggle">
                      <input :checked="rule.enabled" type="checkbox" @change="updateRule('countRules', rule.id, { enabled: eventChecked($event) })" />
                      <span>{{ rule.enabled ? t('scheduler.optimizer.enabled') : t('scheduler.optimizer.disabled') }}</span>
                    </label>
                    <label class="optimizer-settings__compact-field">
                      <span>{{ t('scheduler.optimizer.courseCount') }}</span>
                      <input type="number" inputmode="numeric" min="0" :value="rule.courseCount" @input="updateRule('countRules', rule.id, { courseCount: eventInteger($event, rule.courseCount) })" />
                    </label>
                    <label class="optimizer-settings__compact-field">
                      <span>{{ t('scheduler.optimizer.scoreDelta') }}</span>
                      <input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" :value="rule.delta" @input="updateRule('countRules', rule.id, { delta: eventValue($event) })" />
                    </label>
                    <button type="button" class="optimizer-settings__delete" :aria-label="t('scheduler.optimizer.deleteRule')" @click="removeRule('countRules', rule.id)">
                      <Icon name="lucide:trash-2" aria-hidden="true" />
                    </button>
                  </article>
                </div>
                <p v-else class="optimizer-settings__empty">{{ t('scheduler.optimizer.noRules') }}</p>
              </div>

              <div class="optimizer-settings__rule-group">
                <div class="optimizer-settings__rule-group-heading">
                  <div>
                    <Icon name="lucide:sunrise" aria-hidden="true" />
                    <h4>{{ t('scheduler.optimizer.earlyStartRules') }}</h4>
                  </div>
                  <button type="button" @click="addEarlyRule">
                    <Icon name="lucide:plus" aria-hidden="true" />
                    {{ t('scheduler.optimizer.addRule') }}
                  </button>
                </div>
                <div v-if="profile.earlyRules.length" class="optimizer-settings__rules">
                  <article v-for="rule in profile.earlyRules" :key="rule.id" class="optimizer-settings__rule optimizer-settings__rule--early" :class="{ 'is-disabled': !rule.enabled }">
                    <label class="optimizer-settings__rule-toggle">
                      <input :checked="rule.enabled" type="checkbox" @change="updateRule('earlyRules', rule.id, { enabled: eventChecked($event) })" />
                      <span>{{ rule.enabled ? t('scheduler.optimizer.enabled') : t('scheduler.optimizer.disabled') }}</span>
                    </label>
                    <label class="optimizer-settings__compact-field">
                      <span>{{ t('scheduler.optimizer.weekday') }}</span>
                      <select :value="rule.day" @change="updateRule('earlyRules', rule.id, { day: eventInteger($event, rule.day, 1) })">
                        <option v-for="day in weekdayNumbers" :key="day" :value="day">{{ dayLabel(day) }}</option>
                      </select>
                    </label>
                    <label class="optimizer-settings__compact-field">
                      <span>{{ t('scheduler.optimizer.startTime') }}</span>
                      <input type="time" :value="minutesToTime(rule.startMinute)" @input="updateRule('earlyRules', rule.id, { startMinute: timeToMinutes(eventValue($event), rule.startMinute) })" />
                    </label>
                    <label class="optimizer-settings__compact-field">
                      <span>{{ t('scheduler.optimizer.scoreDelta') }}</span>
                      <input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" :value="rule.delta" @input="updateRule('earlyRules', rule.id, { delta: eventValue($event) })" />
                    </label>
                    <button type="button" class="optimizer-settings__delete" :aria-label="t('scheduler.optimizer.deleteRule')" @click="removeRule('earlyRules', rule.id)">
                      <Icon name="lucide:trash-2" aria-hidden="true" />
                    </button>
                  </article>
                </div>
                <p v-else class="optimizer-settings__empty">{{ t('scheduler.optimizer.noRules') }}</p>
              </div>

              <div v-for="state in (['occupied', 'free'] as const)" :key="state" class="optimizer-settings__rule-group">
                <div class="optimizer-settings__rule-group-heading">
                  <div>
                    <Icon :name="state === 'occupied' ? 'lucide:clock-alert' : 'lucide:coffee'" aria-hidden="true" />
                    <h4>{{ t(`scheduler.optimizer.${state}TimeRules`) }}</h4>
                  </div>
                  <button type="button" @click="addTimeRule(state)">
                    <Icon name="lucide:plus" aria-hidden="true" />
                    {{ t('scheduler.optimizer.addRule') }}
                  </button>
                </div>
                <div v-if="profile.timeRules.some(rule => rule.state === state)" class="optimizer-settings__rules">
                  <article v-for="rule in profile.timeRules.filter(item => item.state === state)" :key="rule.id" class="optimizer-settings__rule optimizer-settings__rule--time" :class="{ 'is-disabled': !rule.enabled }">
                    <div class="optimizer-settings__rule-line">
                      <label class="optimizer-settings__rule-toggle">
                        <input :checked="rule.enabled" type="checkbox" @change="updateRule('timeRules', rule.id, { enabled: eventChecked($event) })" />
                        <span>{{ rule.enabled ? t('scheduler.optimizer.enabled') : t('scheduler.optimizer.disabled') }}</span>
                      </label>
                      <label class="optimizer-settings__compact-field">
                        <span>{{ t('scheduler.optimizer.startTime') }}</span>
                        <input type="time" :value="minutesToTime(rule.startMinute)" @input="updateRule('timeRules', rule.id, { startMinute: timeToMinutes(eventValue($event), rule.startMinute) })" />
                      </label>
                      <label class="optimizer-settings__compact-field">
                        <span>{{ t('scheduler.optimizer.endTime') }}</span>
                        <input type="time" :value="minutesToTime(rule.endMinute)" @input="updateRule('timeRules', rule.id, { endMinute: timeToMinutes(eventValue($event), rule.endMinute) })" />
                      </label>
                      <label class="optimizer-settings__compact-field">
                        <span>{{ t('scheduler.optimizer.application') }}</span>
                        <select :value="rule.application" @change="updateRule('timeRules', rule.id, { application: eventApplication($event) })">
                          <option value="per-day">{{ t('scheduler.optimizer.applicationPerDay') }}</option>
                          <option value="any-day">{{ t('scheduler.optimizer.applicationAnyDay') }}</option>
                          <option value="all-days">{{ t('scheduler.optimizer.applicationAllDays') }}</option>
                        </select>
                      </label>
                      <label class="optimizer-settings__compact-field">
                        <span>{{ t('scheduler.optimizer.scoreDelta') }}</span>
                        <input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" :value="rule.delta" @input="updateRule('timeRules', rule.id, { delta: eventValue($event) })" />
                      </label>
                      <button type="button" class="optimizer-settings__delete" :aria-label="t('scheduler.optimizer.deleteRule')" @click="removeRule('timeRules', rule.id)">
                        <Icon name="lucide:trash-2" aria-hidden="true" />
                      </button>
                    </div>
                    <fieldset class="optimizer-settings__days">
                      <legend>{{ t('scheduler.optimizer.appliesOn') }}</legend>
                      <label v-for="day in weekdayNumbers" :key="day">
                        <input :checked="rule.days.includes(day)" type="checkbox" @change="toggleTimeRuleDay(rule, day, eventChecked($event))" />
                        <span>{{ dayLabel(day) }}</span>
                      </label>
                    </fieldset>
                  </article>
                </div>
                <p v-else class="optimizer-settings__empty">{{ t('scheduler.optimizer.noRules') }}</p>
              </div>

              <div class="optimizer-settings__rule-group">
                <div class="optimizer-settings__rule-group-heading">
                  <div>
                    <Icon name="lucide:book-plus" aria-hidden="true" />
                    <h4>{{ t('scheduler.optimizer.courseSelectionRules') }}</h4>
                  </div>
                  <button type="button" :disabled="!canAddCourseRule" @click="addCourseRule">
                    <Icon name="lucide:plus" aria-hidden="true" />
                    {{ t('scheduler.optimizer.addRule') }}
                  </button>
                </div>
                <div v-if="profile.courseRules.length" class="optimizer-settings__rules">
                  <article v-for="rule in profile.courseRules" :key="rule.id" class="optimizer-settings__rule" :class="{ 'is-disabled': !rule.enabled }">
                    <label class="optimizer-settings__rule-toggle">
                      <input :checked="rule.enabled" type="checkbox" @change="updateRule('courseRules', rule.id, { enabled: eventChecked($event) })" />
                      <span>{{ rule.enabled ? t('scheduler.optimizer.enabled') : t('scheduler.optimizer.disabled') }}</span>
                    </label>
                    <label class="optimizer-settings__compact-field optimizer-settings__compact-field--wide">
                      <span>{{ t('scheduler.optimizer.course') }}</span>
                      <select :value="rule.courseCode" @change="updateRule('courseRules', rule.id, { courseCode: eventValue($event) })">
                        <option v-for="course in candidateCourses" :key="course.code" :value="course.code">{{ course.code }} · {{ course.title }}</option>
                      </select>
                    </label>
                    <label class="optimizer-settings__compact-field">
                      <span>{{ t('scheduler.optimizer.scoreDelta') }}</span>
                      <input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" :value="rule.delta" @input="updateRule('courseRules', rule.id, { delta: eventValue($event) })" />
                    </label>
                    <button type="button" class="optimizer-settings__delete" :aria-label="t('scheduler.optimizer.deleteRule')" @click="removeRule('courseRules', rule.id)">
                      <Icon name="lucide:trash-2" aria-hidden="true" />
                    </button>
                  </article>
                </div>
                <p v-else class="optimizer-settings__empty">{{ t('scheduler.optimizer.noRules') }}</p>
              </div>

              <div class="optimizer-settings__rule-group">
                <div class="optimizer-settings__rule-group-heading">
                  <div>
                    <Icon name="lucide:badge-plus" aria-hidden="true" />
                    <h4>{{ t('scheduler.optimizer.sectionSelectionRules') }}</h4>
                  </div>
                  <button type="button" :disabled="!canAddSectionRule" @click="addSectionRule">
                    <Icon name="lucide:plus" aria-hidden="true" />
                    {{ t('scheduler.optimizer.addRule') }}
                  </button>
                </div>
                <div v-if="profile.sectionRules.length" class="optimizer-settings__rules">
                  <article v-for="rule in profile.sectionRules" :key="rule.id" class="optimizer-settings__rule optimizer-settings__rule--section" :class="{ 'is-disabled': !rule.enabled }">
                    <label class="optimizer-settings__rule-toggle">
                      <input :checked="rule.enabled" type="checkbox" @change="updateRule('sectionRules', rule.id, { enabled: eventChecked($event) })" />
                      <span>{{ rule.enabled ? t('scheduler.optimizer.enabled') : t('scheduler.optimizer.disabled') }}</span>
                    </label>
                    <label class="optimizer-settings__compact-field optimizer-settings__compact-field--wide">
                      <span>{{ t('scheduler.optimizer.course') }}</span>
                      <select :value="rule.courseCode" @change="updateSectionRuleCourse(rule.id, eventValue($event))">
                        <option v-for="course in candidateCourses" :key="course.code" :value="course.code">{{ course.code }} · {{ course.title }}</option>
                      </select>
                    </label>
                    <label class="optimizer-settings__compact-field optimizer-settings__compact-field--wide">
                      <span>{{ t('scheduler.optimizer.section') }}</span>
                      <select :value="rule.sectionId" @change="updateRule('sectionRules', rule.id, { sectionId: eventValue($event) })">
                        <option v-for="section in sectionChoices(rule.courseCode)" :key="section.id" :value="section.id">{{ section.label }}</option>
                      </select>
                    </label>
                    <label class="optimizer-settings__compact-field">
                      <span>{{ t('scheduler.optimizer.scoreDelta') }}</span>
                      <input type="text" inputmode="decimal" autocomplete="off" spellcheck="false" :value="rule.delta" @input="updateRule('sectionRules', rule.id, { delta: eventValue($event) })" />
                    </label>
                    <button type="button" class="optimizer-settings__delete" :aria-label="t('scheduler.optimizer.deleteRule')" @click="removeRule('sectionRules', rule.id)">
                      <Icon name="lucide:trash-2" aria-hidden="true" />
                    </button>
                  </article>
                </div>
                <p v-else class="optimizer-settings__empty">{{ t('scheduler.optimizer.noRules') }}</p>
              </div>
            </section>
          </div>

          <footer class="optimizer-settings__footer">
            <p>{{ t('scheduler.optimizer.autoSaveHint') }}</p>
            <button type="button" @click="close">{{ t('scheduler.optimizer.done') }}</button>
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.optimizer-settings {
  position: fixed;
  z-index: 1450;
  inset: 0;
  display: flex;
  justify-content: flex-end;
  background: var(--modal-backdrop);
}

.optimizer-settings__drawer {
  width: min(880px, calc(100vw - 32px));
  height: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border-left: 1px solid var(--border-secondary);
  background: var(--surface-primary);
  box-shadow: var(--modal-shadow);
}

.optimizer-settings__header,
.optimizer-settings__footer {
  position: relative;
  z-index: 1;
  background: var(--surface-primary);
}

.optimizer-settings__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-secondary);

  p {
    margin: 0 0 4px;
    color: var(--interactive-active-text);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.35rem;
    line-height: 1.25;
  }
}

.optimizer-settings__close {
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  background: var(--surface-secondary);
  color: var(--text-secondary);
  cursor: pointer;

  &:hover {
    border-color: var(--border-primary);
    color: var(--text-primary);
  }

  &:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--interactive-primary) 24%, transparent);
    outline-offset: 2px;
  }
}

.optimizer-settings__body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 24px;
}

.optimizer-settings__section {
  padding: 0 0 28px;

  + .optimizer-settings__section {
    padding-top: 28px;
    border-top: 1px solid var(--border-secondary);
  }
}

.optimizer-settings__section-heading {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 18px;

  > span {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border: 1px solid var(--scheduler-chip-border-active);
    border-radius: 11px;
    background: var(--scheduler-chip-bg-active);
    color: var(--scheduler-chip-text-active);
    font-size: 0.75rem;
    font-weight: 850;
  }

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1.1rem;
    line-height: 1.35;
  }

  p {
    margin: 5px 0 0;
    color: var(--text-secondary);
    font-size: 0.79rem;
    line-height: 1.55;
  }
}

.optimizer-settings__candidate-summary,
.optimizer-settings__score-foundation,
.optimizer-settings__rule-group {
  border: 1px solid var(--border-secondary);
  border-radius: 14px;
  background: var(--surface-secondary);
}

.optimizer-settings__candidate-summary {
  display: grid;
  gap: 12px;
  padding: 16px;
}

.optimizer-settings__candidate-count {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--text-primary);

  svg {
    width: 20px;
    height: 20px;
    color: var(--interactive-active-text);
  }

  strong {
    font-size: 0.88rem;
  }
}

.optimizer-settings__candidate-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.optimizer-settings__candidate-chip,
.optimizer-settings__candidate-more {
  max-width: 190px;
  overflow: hidden;
  padding: 5px 9px;
  border: 1px solid var(--scheduler-chip-border-active);
  border-radius: 999px;
  background: var(--scheduler-chip-bg-active);
  color: var(--scheduler-chip-text-active);
  font-size: 0.72rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.optimizer-settings__candidate-more {
  border-color: var(--border-secondary);
  background: var(--surface-primary);
  color: var(--text-secondary);
}

.optimizer-settings__range-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.optimizer-settings__field,
.optimizer-settings__compact-field {
  min-width: 0;
  display: grid;
  gap: 7px;

  > span {
    color: var(--text-primary);
    font-size: 0.78rem;
    font-weight: 750;
  }

  > small {
    color: var(--text-secondary);
    font-size: 0.7rem;
    line-height: 1.45;
  }

  input,
  select {
    width: 100%;
    min-width: 0;
    min-height: 42px;
    padding: 9px 11px;
    border: 1px solid var(--border-primary);
    border-radius: 9px;
    outline: none;
    background: var(--surface-primary);
    color: var(--text-primary);
    font: inherit;

    &:focus-visible {
      border-color: var(--interactive-primary);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 14%, transparent);
    }
  }
}

.optimizer-settings__range-field,
.optimizer-settings__top-x {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 82px;
  align-items: center;
  padding: 15px;
  border: 1px solid var(--border-secondary);
  border-radius: 13px;
  background: var(--surface-secondary);

  > strong {
    position: absolute;
    top: 14px;
    right: 108px;
    color: var(--interactive-active-text);
    font-size: 1rem;
  }

  input[type='range'] {
    grid-column: 1 / -1;
    min-height: 28px;
    padding: 0;
    border: 0;
    box-shadow: none;
    accent-color: var(--interactive-primary);
  }
}

.optimizer-settings__top-x {
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1fr) 120px;

  small {
    grid-column: 1 / -1;
  }
}

.optimizer-settings__score-foundation {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 16px;
}

.optimizer-settings__rule-group {
  margin-top: 14px;
  padding: 14px;
}

.optimizer-settings__rule-group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  > div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-primary);

    svg {
      width: 18px;
      height: 18px;
      color: var(--interactive-active-text);
    }
  }

  h4 {
    margin: 0;
    font-size: 0.88rem;
  }

  > button {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 0 11px;
    border: 1px solid var(--scheduler-chip-border-active);
    border-radius: 999px;
    background: var(--scheduler-chip-bg-active);
    color: var(--scheduler-chip-text-active);
    cursor: pointer;
    font: inherit;
    font-size: 0.78rem;
    font-weight: 750;

    svg {
      width: 15px;
      height: 15px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }
}

.optimizer-settings__rules {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.optimizer-settings__rule {
  display: grid;
  grid-template-columns: auto minmax(110px, 0.7fr) minmax(110px, 0.7fr) 36px;
  gap: 9px;
  align-items: end;
  padding: 12px;
  border: 1px solid var(--border-secondary);
  border-radius: 11px;
  background: var(--surface-primary);
  transition: opacity 0.15s ease;

  &.is-disabled {
    opacity: 0.58;
  }

  &--section {
    grid-template-columns: auto minmax(150px, 1.1fr) minmax(150px, 1.1fr) minmax(95px, 0.55fr) 36px;
  }

  &--early {
    grid-template-columns: auto repeat(3, minmax(100px, 1fr)) 36px;
  }

  &--time {
    display: block;
  }
}

.optimizer-settings__rule-line {
  display: grid;
  grid-template-columns: auto repeat(4, minmax(100px, 1fr)) 36px;
  gap: 9px;
  align-items: end;
}

.optimizer-settings__rule-toggle {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 7px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 700;

  input {
    width: 17px;
    height: 17px;
    margin: 0;
    accent-color: var(--interactive-primary);
  }
}

.optimizer-settings__compact-field {
  gap: 5px;

  > span {
    font-size: 0.69rem;
  }

  input,
  select {
    min-height: 38px;
    padding: 7px 9px;
    font-size: 0.76rem;
  }

  &--wide {
    min-width: 150px;
  }
}

.optimizer-settings__delete {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  align-self: end;
  border: 1px solid var(--border-secondary);
  border-radius: 9px;
  background: var(--surface-secondary);
  color: var(--text-muted);
  cursor: pointer;

  &:hover {
    border-color: var(--semantic-error);
    color: var(--semantic-error);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.optimizer-settings__days {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 10px 0 0;
  padding: 9px 0 0;
  border: 0;
  border-top: 1px solid var(--border-secondary);

  legend {
    width: 100%;
    margin-bottom: 5px;
    color: var(--text-secondary);
    font-size: 0.75rem;
    font-weight: 700;
  }

  label {
    cursor: pointer;

    input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    span {
      min-height: 38px;
      display: inline-flex;
      align-items: center;
      padding: 0 10px;
      border: 1px solid var(--scheduler-chip-border);
      border-radius: 999px;
      background: var(--scheduler-chip-bg);
      color: var(--scheduler-chip-text);
      font-size: 0.75rem;
      font-weight: 700;
    }

    input:checked + span {
      border-color: var(--scheduler-chip-border-active);
      background: var(--scheduler-chip-bg-active);
      color: var(--scheduler-chip-text-active);
    }

    input:focus-visible + span {
      outline: 3px solid color-mix(in srgb, var(--interactive-primary) 24%, transparent);
      outline-offset: 1px;
    }
  }
}

.optimizer-settings__empty {
  margin: 11px 0 0;
  color: var(--text-secondary);
  font-size: 0.75rem;
  line-height: 1.5;
}

.optimizer-settings__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 24px calc(14px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-secondary);

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.73rem;
  }

  button {
    min-width: 112px;
    min-height: 44px;
    padding: 0 18px;
    border: 1px solid transparent;
    border-radius: 999px;
    background: var(--btn-primary-bg);
    color: var(--text-on-interactive);
    cursor: pointer;
    font: inherit;
    font-size: 0.84rem;
    font-weight: 800;

    &:hover {
      background: var(--btn-primary-bg-hover);
    }
  }
}

.optimizer-settings-enter-active,
.optimizer-settings-leave-active {
  transition: opacity 0.18s ease;

  .optimizer-settings__drawer {
    transition: transform 0.22s ease;
  }
}

.optimizer-settings-enter-from,
.optimizer-settings-leave-to {
  opacity: 0;

  .optimizer-settings__drawer {
    transform: translateX(28px);
  }
}

@media (max-width: 760px) {
  .optimizer-settings {
    align-items: flex-end;
  }

  .optimizer-settings__drawer {
    width: 100%;
    height: min(94dvh, 980px);
    border-top: 1px solid var(--border-secondary);
    border-left: 0;
    border-radius: 18px 18px 0 0;
    overflow: hidden;
  }

  .optimizer-settings__header,
  .optimizer-settings__body,
  .optimizer-settings__footer {
    padding-right: 16px;
    padding-left: 16px;
  }

  .optimizer-settings__range-grid,
  .optimizer-settings__score-foundation {
    grid-template-columns: 1fr;
  }

  .optimizer-settings__top-x {
    grid-column: auto;
  }

  .optimizer-settings__rule,
  .optimizer-settings__rule--section,
  .optimizer-settings__rule-line {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .optimizer-settings__rule-toggle {
    padding-left: 0;
  }

  .optimizer-settings__delete {
    grid-column: 2;
    justify-self: end;
  }

  .optimizer-settings__compact-field--wide {
    min-width: 0;
  }

  .optimizer-settings-enter-from .optimizer-settings__drawer,
  .optimizer-settings-leave-to .optimizer-settings__drawer {
    transform: translateY(28px);
  }
}

@media (max-width: 460px) {
  .optimizer-settings__header h2 {
    font-size: 1.18rem;
  }

  .optimizer-settings__body {
    padding-top: 18px;
  }

  .optimizer-settings__section-heading {
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 9px;

    > span {
      width: 30px;
      height: 30px;
      border-radius: 9px;
    }

    h3 {
      font-size: 0.96rem;
    }
  }

  .optimizer-settings__rule,
  .optimizer-settings__rule--section,
  .optimizer-settings__rule-line {
    grid-template-columns: 1fr;
  }

  .optimizer-settings__delete {
    grid-column: 1;
  }

  .optimizer-settings__footer {
    align-items: stretch;
    flex-direction: column;

    button {
      width: 100%;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .optimizer-settings-enter-active,
  .optimizer-settings-leave-active,
  .optimizer-settings-enter-active .optimizer-settings__drawer,
  .optimizer-settings-leave-active .optimizer-settings__drawer,
  .optimizer-settings__rule {
    transition: none;
  }
}
</style>
