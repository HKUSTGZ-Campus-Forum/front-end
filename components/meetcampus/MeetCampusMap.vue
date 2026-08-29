<script setup lang="ts">
import MeetCampusAvatar from "~/components/meetcampus/MeetCampusAvatar.vue";
import type { MeetCampusResident, MeetCampusScene } from "~/types/meetcampus";
import { localizeText } from "~/utils/meetcampus";
import { interpolateJourneyPath, journeyProgress } from "~/utils/meetcampusJourney";

const props = defineProps<{
  scenes: MeetCampusScene[];
  residents: MeetCampusResident[];
  myResidentId: string;
  selectedSceneId?: string | null;
  serverTime: string;
}>();
const emit = defineEmits<{ selectScene: [id: string]; selectResident: [id: string] }>();
const { t } = useI18n();
const { locale } = useAppLocale();

const topScenes = computed(() => props.scenes.filter(scene => scene.parentSceneId && scene.parentSceneId.endsWith("campus")));
const sceneById = computed(() => new Map(props.scenes.map(scene => [scene.id, scene])));
const clientNow = ref(Date.now());
const serverOffset = ref(Date.parse(props.serverTime) - Date.now());
let clockTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => { clockTimer = setInterval(() => { clientNow.value = Date.now(); }, 1_000); });
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer); });
watch(() => props.serverTime, value => { serverOffset.value = Date.parse(value) - Date.now(); });
const residentPosition = (resident: MeetCampusResident) => {
  if (resident.state.journey?.path?.length) {
    const progress = journeyProgress(resident.state.journey.departAt, resident.state.journey.arriveAt, clientNow.value + serverOffset.value);
    const point = interpolateJourneyPath(resident.state.journey.path, progress);
    if (point) return { left: `${point.x}%`, top: `${point.y}%` };
  }
  const scene = sceneById.value.get(resident.state.sceneId);
  const parent = scene?.parentSceneId ? sceneById.value.get(scene.parentSceneId) : null;
  const anchor = parent?.slug === "campus" ? scene : parent ?? scene;
  const jitterX = (resident.state.position.x - 50) * 0.08;
  const jitterY = (resident.state.position.y - 50) * 0.08;
  return { left: `${Math.max(5, Math.min(95, (anchor?.map.x ?? 50) + jitterX))}%`, top: `${Math.max(8, Math.min(92, (anchor?.map.y ?? 50) + jitterY))}%` };
};
const sceneIcon = (kind: string) => ({ study: "lucide:book-open", sport: "lucide:dumbbell", dining: "lucide:utensils", home: "lucide:house", activity: "lucide:sparkles", outdoor: "lucide:trees" }[kind] || "lucide:map-pin");
</script>

<template>
  <section class="world-map" :aria-label="t('meetCampus.world.mapAria')">
    <div class="world-map__status" role="status">
      <span aria-hidden="true"></span>
      {{ t('meetCampus.world.residentsAlive', { count: residents.length }) }}
    </div>
    <button
      v-for="scene in topScenes"
      :key="scene.id"
      type="button"
      class="world-map__place"
      :class="{ 'world-map__place--selected': scene.id === selectedSceneId }"
      :style="{ left: `${scene.map.x}%`, top: `${scene.map.y}%` }"
      @click="emit('selectScene', scene.id)"
    >
      <span><Icon :name="sceneIcon(scene.kind)" aria-hidden="true" /></span>
      {{ localizeText(scene.name, locale) }}
    </button>
    <button
      v-for="resident in residents"
      :key="resident.id"
      type="button"
      class="pixel-person"
      :class="{ 'pixel-person--mine': resident.id === myResidentId }"
      :style="residentPosition(resident)"
      :aria-label="localizeText(resident.name, locale)"
      @click="emit('selectResident', resident.id)"
    >
      <span class="pixel-person__shadow"></span>
      <MeetCampusAvatar :appearance="resident.appearance" size="map" animated />
      <strong v-if="resident.id === myResidentId">{{ t('meetCampus.world.mine') }}</strong>
      <i v-if="resident.state.journey" class="pixel-person__walking"><Icon name="lucide:footprints" /></i>
    </button>
    <div class="world-map__legend"><Icon name="lucide:clock-3" />{{ t('meetCampus.world.softRealtime') }}</div>
  </section>
</template>

<style scoped lang="scss">
.world-map { position: relative; min-height: 680px; overflow: hidden; isolation: isolate; border: 1px solid var(--border-primary); border-radius: 20px; background: var(--meetcampus-map-grass) url('/image/meetcampus/campus-map.webp') center/100% 100% no-repeat; box-shadow: var(--shadow-medium); }
.world-map::after { content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 1; background: linear-gradient(180deg, color-mix(in srgb, var(--surface-primary) 6%, transparent), transparent 60%, color-mix(in srgb, var(--text-primary) 10%, transparent)); }
.world-map__status,.world-map__legend { position: absolute; z-index: 12; display: flex; align-items: center; gap: 8px; padding: 9px 13px; border: 1px solid color-mix(in srgb,var(--border-primary) 70%,transparent); border-radius: 999px; color: var(--text-primary); background: color-mix(in srgb,var(--surface-primary) 92%,transparent); box-shadow: var(--shadow-small); backdrop-filter: blur(10px); font-size: .78rem; font-weight: 700; }
.world-map__status { top: 16px; left: 16px; }.world-map__status span { width: 9px; height: 9px; border-radius: 50%; background: var(--semantic-success); box-shadow: 0 0 0 4px color-mix(in srgb,var(--semantic-success) 16%,transparent); }
.world-map__legend { right: 14px; bottom: 14px; border-radius: 10px; font-size: .72rem; }
.world-map__place { position: absolute; z-index: 5; display: flex; align-items: center; gap: 7px; max-width: 180px; min-height: 38px; padding: 6px 11px 6px 6px; border: 1px solid color-mix(in srgb,var(--border-primary) 70%,transparent); border-radius: 999px; color: var(--text-primary); background: color-mix(in srgb,var(--surface-primary) 93%,transparent); box-shadow: var(--shadow-small); transform: translate(-50%,-50%); cursor: pointer; font-size: .74rem; font-weight: 750; transition: transform .18s ease, box-shadow .18s ease; }
.world-map__place:hover,.world-map__place--selected { z-index: 8; transform: translate(-50%,-50%) scale(1.05); box-shadow: 0 0 0 3px color-mix(in srgb,var(--interactive-primary) 24%,transparent),var(--shadow-medium); }
.world-map__place > span { display:grid; place-items:center; width:27px; height:27px; border-radius:50%; color:var(--text-inverse); background:var(--interactive-primary); }
.pixel-person { position:absolute; z-index:7; width:42px; height:56px; padding:0; border:0; background:transparent; transform:translate(-50%,-50%); cursor:pointer; filter:drop-shadow(0 2px 2px rgba(15,35,68,.3)); transition:transform .18s ease; }
.pixel-person:hover { z-index:10; transform:translate(-50%,-50%) scale(1.18); }.pixel-person--mine { z-index:9; }
.pixel-person__shadow { display:none }.pixel-person strong { position:absolute; left:50%; top:-15px; transform:translateX(-50%); padding:3px 6px; border-radius:999px; color:var(--text-inverse); background:var(--semantic-purple); font-size:.58rem; white-space:nowrap; }
.pixel-person__walking{position:absolute;right:-12px;bottom:1px;display:grid;width:19px;height:19px;place-items:center;border-radius:50%;color:var(--interactive-active-text);background:var(--surface-primary);box-shadow:var(--shadow-small)}.pixel-person__walking :deep(svg){width:11px;height:11px}
@media(max-width:760px){.world-map{min-height:calc(100dvh - 154px);border-radius:0;border-left:0;border-right:0}.world-map__place{max-width:128px;font-size:.65rem}.world-map__status{top:12px;left:12px}.world-map__legend{display:none}.pixel-person{transform:translate(-50%,-50%) scale(.9)}}
@media(prefers-reduced-motion:reduce){.world-map__place,.pixel-person{transition:none}}
</style>
