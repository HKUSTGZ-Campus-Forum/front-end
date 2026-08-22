<script setup lang="ts">
import type { SchedulerPlanVisibility } from '~/utils/scheduler'

const props = withDefaults(defineProps<{
  visible: boolean
  initialName?: string
  initialDescription?: string
  initialVisibility?: SchedulerPlanVisibility
  allowUpdate?: boolean
  submitting?: boolean
  error?: string
}>(), {
  initialName: '',
  initialDescription: '',
  initialVisibility: 'private',
  allowUpdate: false,
  submitting: false,
  error: '',
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', value: {
    name: string
    description: string
    visibility: SchedulerPlanVisibility
    saveAsNew: boolean
  }): void
}>()

const { t } = useI18n()
const name = ref('')
const description = ref('')
const visibility = ref<SchedulerPlanVisibility>('private')
const nameInput = ref<HTMLInputElement | null>(null)

watch(() => props.visible, async (visible) => {
  if (!visible) return
  name.value = props.initialName
  description.value = props.initialDescription
  visibility.value = props.initialVisibility
  await nextTick()
  nameInput.value?.focus()
}, { immediate: true })

const canSubmit = computed(() => name.value.trim().length > 0 && !props.submitting)

function submit(saveAsNew: boolean) {
  if (!canSubmit.value) return
  emit('save', {
    name: name.value,
    description: description.value,
    visibility: visibility.value,
    saveAsNew,
  })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="plan-dialog">
      <div v-if="visible" class="plan-dialog" role="presentation" @mousedown.self="$emit('close')">
        <section class="plan-dialog__panel" role="dialog" aria-modal="true" :aria-labelledby="'plan-dialog-title'">
          <header class="plan-dialog__header">
            <div>
              <p>{{ t('scheduler.savedPlans.dialogEyebrow') }}</p>
              <h2 id="plan-dialog-title">
                {{ allowUpdate ? t('scheduler.savedPlans.updateTitle') : t('scheduler.savedPlans.saveTitle') }}
              </h2>
            </div>
            <button type="button" class="plan-dialog__close" :aria-label="t('scheduler.close')" @click="$emit('close')">
              <Icon name="lucide:x" aria-hidden="true" />
            </button>
          </header>

          <form class="plan-dialog__form" @submit.prevent="submit(false)">
            <label>
              <span>{{ t('scheduler.savedPlans.name') }}</span>
              <input ref="nameInput" v-model="name" maxlength="80" required />
            </label>
            <label>
              <span>{{ t('scheduler.savedPlans.description') }}</span>
              <textarea v-model="description" maxlength="500" rows="3"></textarea>
            </label>
            <fieldset>
              <legend>{{ t('scheduler.savedPlans.visibility') }}</legend>
              <label v-for="value in (['private', 'unlisted', 'public'] as SchedulerPlanVisibility[])" :key="value" class="plan-dialog__choice">
                <input v-model="visibility" type="radio" name="plan-visibility" :value="value" />
                <span>
                  <strong>{{ t(`scheduler.savedPlans.status.${value}`) }}</strong>
                  <small>{{ t(`scheduler.savedPlans.visibilityHelp.${value}`) }}</small>
                </span>
              </label>
            </fieldset>
            <p v-if="error" class="plan-dialog__error" role="alert">{{ error }}</p>
            <footer class="plan-dialog__footer">
              <button type="button" class="plan-dialog__secondary" @click="$emit('close')">{{ t('common.cancel') }}</button>
              <button v-if="allowUpdate" type="button" class="plan-dialog__secondary" :disabled="!canSubmit" @click="submit(true)">
                {{ t('scheduler.savedPlans.saveAsNew') }}
              </button>
              <button type="submit" class="plan-dialog__primary" :disabled="!canSubmit">
                {{ submitting ? t('scheduler.savedPlans.saving') : allowUpdate ? t('scheduler.savedPlans.saveChanges') : t('scheduler.savedPlans.save') }}
              </button>
            </footer>
          </form>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.plan-dialog {
  align-items: center;
  background: rgba(8, 25, 48, 0.48);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 18px;
  position: fixed;
  z-index: 1400;
}

.plan-dialog__panel {
  background: var(--surface-primary);
  border: 1px solid var(--border-secondary);
  border-radius: 18px;
  box-shadow: var(--shadow-large);
  max-height: calc(100vh - 36px);
  max-width: 540px;
  overflow: auto;
  padding: 22px;
  width: 100%;
}

.plan-dialog__header { align-items: flex-start; display: flex; justify-content: space-between; }
.plan-dialog__header p { color: var(--interactive-active); font-size: 0.72rem; font-weight: 750; letter-spacing: 0.08em; margin: 0 0 4px; text-transform: uppercase; }
.plan-dialog__header h2 { color: var(--text-primary); font-size: 1.3rem; margin: 0; }
.plan-dialog__close { align-items: center; background: var(--surface-secondary); border: 1px solid var(--border-secondary); border-radius: 999px; color: var(--text-secondary); cursor: pointer; display: flex; height: 34px; justify-content: center; width: 34px; }
.plan-dialog__form { display: grid; gap: 16px; margin-top: 20px; }
.plan-dialog__form > label > span,
.plan-dialog__form legend { color: var(--text-primary); display: block; font-size: 0.82rem; font-weight: 700; margin-bottom: 7px; }
.plan-dialog__form input[type='text'],
.plan-dialog__form input:not([type]),
.plan-dialog__form textarea { background: var(--surface-secondary); border: 1px solid var(--border-primary); border-radius: 10px; color: var(--text-primary); font: inherit; outline: none; padding: 10px 12px; width: 100%; }
.plan-dialog__form input:focus,
.plan-dialog__form textarea:focus { border-color: var(--interactive-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--interactive-primary) 13%, transparent); }
.plan-dialog__form fieldset { border: 0; margin: 0; padding: 0; }
.plan-dialog__choice { align-items: flex-start; border: 1px solid var(--border-secondary); border-radius: 10px; cursor: pointer; display: flex; gap: 10px; margin-top: 8px; padding: 10px 12px; }
.plan-dialog__choice input { margin-top: 3px; }
.plan-dialog__choice strong { color: var(--text-primary); display: block; font-size: 0.83rem; }
.plan-dialog__choice small { color: var(--text-secondary); display: block; font-size: 0.76rem; line-height: 1.45; margin-top: 2px; }
.plan-dialog__error { color: var(--semantic-error); font-size: 0.82rem; margin: 0; }
.plan-dialog__footer { display: flex; flex-wrap: wrap; gap: 9px; justify-content: flex-end; }
.plan-dialog__footer button { border-radius: 999px; cursor: pointer; font-size: 0.84rem; font-weight: 700; min-height: 38px; padding: 0 16px; }
.plan-dialog__secondary { background: var(--surface-primary); border: 1px solid var(--border-primary); color: var(--text-secondary); }
.plan-dialog__primary { background: var(--btn-primary-bg); border: 1px solid transparent; color: var(--text-inverse); }
.plan-dialog__footer button:disabled { cursor: not-allowed; opacity: 0.55; }
.plan-dialog-enter-active, .plan-dialog-leave-active { transition: opacity 0.18s ease; }
.plan-dialog-enter-from, .plan-dialog-leave-to { opacity: 0; }

@media (max-width: 520px) {
  .plan-dialog { align-items: flex-end; padding: 0; }
  .plan-dialog__panel { border-radius: 18px 18px 0 0; max-height: 92vh; padding: 18px 16px calc(18px + env(safe-area-inset-bottom)); }
  .plan-dialog__footer { display: grid; }
}
</style>
