<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { CartCourse, PlanSelection } from '~/utils/scheduler'
import { buildSchedulerCalendar } from '~/utils/schedulerCalendar'
import { downloadSchedulerCalendar } from '~/utils/schedulerCalendarDownload'

const props = withDefaults(defineProps<{
  semesterId: string
  courses: CartCourse[]
  selections: PlanSelection[]
  name?: string
  disabled?: boolean
}>(), { name: '', disabled: false })

const { t } = useI18n()
const id = useId()
const dialog = ref<HTMLDialogElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const isOpen = ref(false)
const startDate = ref('')
const endDate = ref('')
const downloaded = ref(false)
const downloadFailed = ref(false)
const unavailable = computed(() => props.disabled || props.selections.length === 0)
const calendarName = computed(() => props.name || t('scheduler.calendar.defaultName', { semester: props.semesterId }))
const input = computed(() => ({
  semesterId: props.semesterId,
  courses: props.courses,
  selections: props.selections,
  calendarName: calendarName.value,
}))
const basePreview = computed(() => isOpen.value ? buildSchedulerCalendar(input.value) : null)
const needsDates = computed(() => Boolean(basePreview.value?.missingDateCourses.length))
const preview = computed(() => {
  if (!isOpen.value) return null
  if (!needsDates.value || (!startDate.value && !endDate.value)) return basePreview.value
  return buildSchedulerCalendar({
    ...input.value,
    fallbackDateRange: { start_date: startDate.value, end_date: endDate.value },
  })
})
const canDownload = computed(() => !unavailable.value && Boolean(preview.value?.content))

watch([input, startDate, endDate], () => {
  downloaded.value = false
  downloadFailed.value = false
}, { deep: true })

async function openDialog() {
  if (unavailable.value) return
  startDate.value = ''
  endDate.value = ''
  downloaded.value = false
  downloadFailed.value = false
  isOpen.value = true
  await nextTick()
  dialog.value?.showModal()
}

function onClose() {
  isOpen.value = false
  trigger.value?.focus()
}

function download() {
  if (!canDownload.value || !preview.value?.content) return
  try {
    downloadSchedulerCalendar(preview.value.content, preview.value.filename)
    downloaded.value = true
    downloadFailed.value = false
  } catch {
    downloaded.value = false
    downloadFailed.value = true
  }
}
</script>

<template>
  <button
    ref="trigger"
    type="button"
    class="calendar-export__trigger"
    :disabled="unavailable"
    :title="unavailable ? t('scheduler.calendar.unavailable') : t('scheduler.calendar.hint')"
    @click="openDialog"
  >
    <Icon name="lucide:calendar-arrow-down" aria-hidden="true" />
    {{ t('scheduler.calendar.export') }}
  </button>

  <Teleport to="body">
    <dialog
      ref="dialog"
      class="calendar-export__dialog"
      :aria-labelledby="`${id}-title`"
      :aria-describedby="`${id}-hint`"
      @close="onClose"
    >
      <form v-if="isOpen" class="calendar-export__form" @submit.prevent="download">
        <header class="calendar-export__header">
          <h2 :id="`${id}-title`">{{ t('scheduler.calendar.title') }}</h2>
          <button type="button" class="calendar-export__close" :aria-label="t('scheduler.close')" autofocus @click="dialog?.close()">
            <Icon name="lucide:x" aria-hidden="true" />
          </button>
        </header>
        <p :id="`${id}-hint`" class="calendar-export__hint">{{ t('scheduler.calendar.hint') }}</p>
        <div class="calendar-export__summary">
          <strong>{{ calendarName }}</strong>
          <span>{{ t('scheduler.calendar.timezone') }}</span>
          <span v-if="preview?.content" aria-live="polite">
            {{ t('scheduler.calendar.summary', { count: preview.eventCount, start: preview.startDate, end: preview.endDate }) }}
          </span>
        </div>

        <fieldset v-if="needsDates" class="calendar-export__dates" :aria-describedby="`${id}-dates-hint`">
          <legend>{{ t('scheduler.calendar.fallbackTitle') }}</legend>
          <p :id="`${id}-dates-hint`">
            {{ t('scheduler.calendar.fallbackHint', { courses: basePreview?.missingDateCourses.join(t('scheduler.calendar.listSeparator')) }) }}
          </p>
          <div class="calendar-export__date-inputs">
            <label :for="`${id}-start`">
              <span>{{ t('scheduler.calendar.startDate') }}</span>
              <input :id="`${id}-start`" v-model="startDate" type="date" min="1992-01-01" max="9999-12-31" required :aria-describedby="`${id}-dates-hint`" />
            </label>
            <label :for="`${id}-end`">
              <span>{{ t('scheduler.calendar.endDate') }}</span>
              <input :id="`${id}-end`" v-model="endDate" type="date" :min="startDate || '1992-01-01'" max="9999-12-31" required :aria-describedby="`${id}-dates-hint`" />
            </label>
          </div>
        </fieldset>

        <p v-if="preview?.untimedCourses.length" class="calendar-export__warning" role="status">
          {{ t('scheduler.calendar.untimed', { courses: preview.untimedCourses.join(t('scheduler.calendar.listSeparator')) }) }}
        </p>
        <p v-if="unavailable" class="calendar-export__error" role="alert">{{ t('scheduler.calendar.unavailable') }}</p>
        <p v-else-if="preview?.error && preview.error !== 'missing-dates'" class="calendar-export__error" role="alert">
          {{ t(`scheduler.calendar.errors.${preview.error}`) }}
        </p>
        <p v-if="downloadFailed" class="calendar-export__error" role="alert">{{ t('scheduler.calendar.downloadFailed') }}</p>
        <p v-if="downloaded" class="calendar-export__success" role="status">{{ t('scheduler.calendar.downloaded') }}</p>

        <ul class="calendar-export__notes">
          <li>{{ t('scheduler.calendar.sourceNotice') }}</li>
          <li>{{ t('scheduler.calendar.importNotice') }}</li>
        </ul>
        <footer class="calendar-export__footer">
          <button type="button" class="calendar-export__secondary" @click="dialog?.close()">{{ t('scheduler.close') }}</button>
          <button type="submit" class="calendar-export__primary" :disabled="!canDownload">
            <Icon name="lucide:download" aria-hidden="true" />
            {{ t('scheduler.calendar.download') }}
          </button>
        </footer>
      </form>
    </dialog>
  </Teleport>
</template>

<style scoped lang="scss">
.calendar-export__trigger {
  align-items: center;
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 999px;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  gap: 6px;
  min-height: 34px;
  padding: 0 11px;
}
.calendar-export__trigger:hover:not(:disabled) {
  border-color: var(--interactive-primary);
  color: var(--interactive-active);
}
.calendar-export__dialog {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 18px;
  box-shadow: var(--shadow-large);
  color: var(--text-primary);
  margin: auto;
  max-height: calc(100dvh - 36px);
  overflow: auto;
  padding: 24px;
  width: min(560px, calc(100% - 36px));
}
.calendar-export__dialog::backdrop { background: var(--modal-backdrop); }
.calendar-export__form { display: grid; gap: 18px; min-width: 0; }
.calendar-export__form p { line-height: 1.6; margin: 0; }
.calendar-export__header { align-items: center; display: flex; gap: 12px; justify-content: space-between; }
.calendar-export__header h2 { font-size: 1.3rem; line-height: 1.4; margin: 0; }
.calendar-export__close { align-items: center; background: var(--surface-secondary); border: 1px solid var(--border-secondary); border-radius: 50%; color: var(--text-secondary); cursor: pointer; display: flex; flex-shrink: 0; height: 36px; justify-content: center; padding: 0; width: 36px; }
.calendar-export__hint, .calendar-export__notes { color: var(--text-secondary); font-size: 0.9rem; }
.calendar-export__summary { background: var(--surface-secondary); border: 1px solid var(--border-secondary); border-radius: 12px; display: grid; font-size: 0.92rem; gap: 8px; overflow-wrap: anywhere; padding: 14px; }
.calendar-export__summary span { color: var(--text-secondary); }
.calendar-export__dates { border: 1px solid var(--border-primary); border-radius: 12px; margin: 0; min-width: 0; padding: 14px; }
.calendar-export__dates legend { font-size: 0.98rem; font-weight: 700; padding: 0 4px; }
.calendar-export__dates p { color: var(--text-secondary); font-size: 0.9rem; overflow-wrap: anywhere; }
.calendar-export__date-inputs { display: grid; gap: 12px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 14px; }
.calendar-export__date-inputs label { display: grid; font-size: 0.92rem; gap: 6px; min-width: 0; }
.calendar-export__date-inputs input { background: var(--surface-secondary); border: 1px solid var(--border-primary); border-radius: 8px; color: var(--text-primary); font: inherit; min-height: 42px; min-width: 0; padding: 8px; width: 100%; }
.calendar-export__warning { color: var(--text-primary); background: var(--warning-background); border-radius: 10px; font-size: 0.9rem; overflow-wrap: anywhere; padding: 12px; }
.calendar-export__error { color: var(--semantic-error); font-size: 0.92rem; }
.calendar-export__success { color: var(--semantic-success); font-size: 0.92rem; }
.calendar-export__notes { display: grid; gap: 8px; line-height: 1.6; margin: 0; padding-left: 20px; }
.calendar-export__footer { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
.calendar-export__footer button { align-items: center; border-radius: 999px; cursor: pointer; display: inline-flex; font: inherit; font-size: 0.94rem; font-weight: 700; gap: 7px; justify-content: center; min-height: 42px; padding: 8px 18px; }
.calendar-export__secondary { background: var(--surface-primary); border: 1px solid var(--border-primary); color: var(--text-secondary); }
.calendar-export__primary { background: var(--btn-primary-bg); border: 1px solid transparent; color: var(--text-on-interactive); }
.calendar-export__trigger:disabled, .calendar-export__footer button:disabled { cursor: not-allowed; opacity: 0.5; }
.calendar-export__trigger:focus-visible, .calendar-export__dialog button:focus-visible, .calendar-export__date-inputs input:focus-visible { outline: 2px solid var(--interactive-primary); outline-offset: 3px; }
@media (max-width: 520px) {
  .calendar-export__dialog { max-height: calc(100dvh - 24px); padding: 18px; width: calc(100% - 24px); }
  .calendar-export__date-inputs { grid-template-columns: minmax(0, 1fr); }
  .calendar-export__footer button { flex: 1; }
}
</style>
