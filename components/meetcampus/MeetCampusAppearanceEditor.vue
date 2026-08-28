<script setup lang="ts">
import MeetCampusAvatar from "~/components/meetcampus/MeetCampusAvatar.vue";
import type { MeetCampusAppearance } from "~/types/meetcampus";
import { MEETCAMPUS_APPEARANCE_OPTIONS, normalizeMeetCampusAppearance, randomMeetCampusAppearance } from "~/utils/meetcampusAppearance";

const props = defineProps<{ modelValue: MeetCampusAppearance; compact?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [appearance: MeetCampusAppearance] }>();
const { t } = useI18n();
type Category = keyof typeof MEETCAMPUS_APPEARANCE_OPTIONS;
const categories: Category[] = ["skinTone", "hairStyle", "hairColor", "outfit", "accessory"];
const activeCategory = ref<Category>("hairStyle");
const look = computed(() => normalizeMeetCampusAppearance(props.modelValue));
const options = computed(() => MEETCAMPUS_APPEARANCE_OPTIONS[activeCategory.value]);

function previewFor(value: string): MeetCampusAppearance {
  return { ...look.value, [activeCategory.value]: value } as MeetCampusAppearance;
}
function choose(value: string) { emit("update:modelValue", previewFor(value)); }
function shuffle() { emit("update:modelValue", randomMeetCampusAppearance(look.value)); }
</script>

<template>
  <section class="look-editor" :class="{ 'look-editor--compact': compact }" :aria-label="t('meetCampus.appearance.title')">
    <div class="look-editor__preview">
      <div class="look-editor__stage">
        <span class="look-editor__halo" aria-hidden="true"></span>
        <MeetCampusAvatar :appearance="look" size="hero" animated />
      </div>
      <div>
        <small>{{ t('meetCampus.appearance.livePreview') }}</small>
        <h3>{{ t('meetCampus.appearance.previewTitle') }}</h3>
        <p>{{ t('meetCampus.appearance.previewHint') }}</p>
        <button type="button" class="look-editor__shuffle" @click="shuffle"><Icon name="lucide:sparkles" aria-hidden="true" />{{ t('meetCampus.appearance.shuffle') }}</button>
      </div>
    </div>

    <div class="look-editor__workbench">
      <div class="look-editor__tabs" role="tablist" :aria-label="t('meetCampus.appearance.categories')">
        <button v-for="category in categories" :key="category" type="button" role="tab" :aria-selected="activeCategory === category" :class="{ active: activeCategory === category }" @click="activeCategory = category">
          {{ t(`meetCampus.appearance.category.${category}`) }}
        </button>
      </div>
      <div class="look-editor__options" role="radiogroup" :aria-label="t(`meetCampus.appearance.category.${activeCategory}`)">
        <button v-for="option in options" :key="option" type="button" role="radio" :aria-checked="look[activeCategory] === option" :class="{ active: look[activeCategory] === option }" @click="choose(option)">
          <span><MeetCampusAvatar :appearance="previewFor(option)" size="tiny" /></span>
          <strong>{{ t(`meetCampus.appearance.option.${option}`) }}</strong>
          <Icon v-if="look[activeCategory] === option" name="lucide:check" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.look-editor{display:grid;grid-template-columns:minmax(180px,.7fr) minmax(0,1.3fr);overflow:hidden;border:1px solid var(--border-primary);border-radius:18px;background:var(--surface-primary)}
.look-editor__preview{display:flex;min-width:0;align-items:center;justify-content:center;flex-direction:column;padding:22px 20px;text-align:center;background:linear-gradient(160deg,var(--surface-secondary),color-mix(in srgb,var(--interactive-primary) 8%,var(--surface-primary)))}
.look-editor__stage{position:relative;display:grid;width:150px;height:174px;place-items:center}.look-editor__halo{position:absolute;width:118px;height:118px;border-radius:50%;background:color-mix(in srgb,var(--interactive-primary) 13%,var(--surface-primary));box-shadow:0 16px 38px color-mix(in srgb,var(--interactive-primary) 15%,transparent)}
.look-editor__stage :deep(.mc-avatar){position:relative}.look-editor__preview small{color:var(--interactive-active-text);font-size:.64rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.look-editor__preview h3{margin:4px 0 5px;color:var(--text-primary);font-size:1rem}.look-editor__preview p{max-width:28ch;margin:0;color:var(--text-secondary);font-size:.7rem;line-height:1.5}
.look-editor__shuffle{display:inline-flex;align-items:center;gap:6px;min-height:36px;margin-top:13px;padding:7px 11px;border:1px solid var(--border-primary);border-radius:9px;color:var(--interactive-active-text);background:var(--surface-primary);font-size:.7rem;font-weight:750;cursor:pointer}.look-editor__shuffle:hover{border-color:var(--interactive-primary)}
.look-editor__workbench{min-width:0;padding:16px}.look-editor__tabs{display:flex;gap:4px;overflow-x:auto;padding-bottom:10px;border-bottom:1px solid var(--border-primary);scrollbar-width:none}.look-editor__tabs::-webkit-scrollbar{display:none}.look-editor__tabs button{min-height:34px;padding:6px 9px;border:0;border-radius:8px;color:var(--text-secondary);background:transparent;font-size:.66rem;font-weight:750;white-space:nowrap;cursor:pointer}.look-editor__tabs button.active{color:var(--interactive-active-text);background:var(--surface-secondary)}
.look-editor__options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding-top:12px}.look-editor__options button{position:relative;display:flex;min-width:0;min-height:88px;align-items:center;justify-content:center;flex-direction:column;gap:3px;padding:7px 5px;border:1px solid var(--border-primary);border-radius:11px;color:var(--text-secondary);background:var(--surface-primary);cursor:pointer;transition:border-color .16s ease,background .16s ease,transform .16s ease}.look-editor__options button:hover{border-color:color-mix(in srgb,var(--interactive-primary) 52%,var(--border-primary));transform:translateY(-1px)}.look-editor__options button.active{border-color:var(--interactive-primary);color:var(--interactive-active-text);background:color-mix(in srgb,var(--interactive-primary) 6%,var(--surface-primary));box-shadow:0 0 0 2px color-mix(in srgb,var(--interactive-primary) 10%,transparent)}.look-editor__options button>span{display:grid;height:50px;place-items:center}.look-editor__options strong{overflow:hidden;width:100%;font-size:.61rem;font-weight:750;text-overflow:ellipsis;white-space:nowrap}.look-editor__options button>svg{position:absolute;right:5px;top:5px;width:13px;height:13px;color:var(--interactive-primary)}
@media(max-width:640px){.look-editor{grid-template-columns:1fr}.look-editor__preview{display:grid;grid-template-columns:112px 1fr;gap:6px;padding:12px 15px;text-align:left}.look-editor__stage{width:110px;height:118px}.look-editor__stage :deep(.mc-avatar--hero){width:88px;height:112px}.look-editor__halo{width:86px;height:86px}.look-editor__preview p{display:none}.look-editor__shuffle{margin-top:8px}.look-editor__workbench{padding:12px}.look-editor__options{grid-template-columns:repeat(3,minmax(0,1fr))}.look-editor__options button{min-height:82px}}
@media(prefers-reduced-motion:reduce){.look-editor__options button{transition:none}}
</style>
