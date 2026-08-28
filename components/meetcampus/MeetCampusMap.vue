<script setup lang="ts">
import type { MeetCampusResident, MeetCampusScene } from "~/types/meetcampus";
import { localizeText } from "~/utils/meetcampus";

const props = defineProps<{
  scenes: MeetCampusScene[];
  residents: MeetCampusResident[];
  myResidentId: string;
  selectedSceneId?: string | null;
}>();
const emit = defineEmits<{ selectScene: [id: string]; selectResident: [id: string] }>();
const { t } = useI18n();
const { locale } = useAppLocale();

const topScenes = computed(() => props.scenes.filter(scene => scene.parentSceneId && scene.parentSceneId.endsWith("campus")));
const sceneById = computed(() => new Map(props.scenes.map(scene => [scene.id, scene])));
const residentPosition = (resident: MeetCampusResident) => {
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
      <span class="pixel-person__body" :data-palette="resident.appearance.palette || 'blue'">
        <i class="pixel-person__hair"></i><i class="pixel-person__face"></i><i class="pixel-person__shirt"></i>
      </span>
      <strong v-if="resident.id === myResidentId">{{ t('meetCampus.world.mine') }}</strong>
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
.pixel-person { position:absolute; z-index:7; width:32px; height:42px; padding:0; border:0; background:transparent; transform:translate(-50%,-50%); cursor:pointer; filter:drop-shadow(0 2px 2px rgba(15,35,68,.3)); transition:transform .18s ease; animation:mc-breathe 2.8s ease-in-out infinite alternate; }
.pixel-person:hover { z-index:10; transform:translate(-50%,-50%) scale(1.18); }.pixel-person--mine { z-index:9; }
.pixel-person__body,.pixel-person__hair,.pixel-person__face,.pixel-person__shirt { position:absolute; display:block; image-rendering:pixelated; }
.pixel-person__body { left:7px; top:3px; width:18px; height:31px; }.pixel-person__hair { left:3px; top:0; width:12px; height:7px; background:#30253a; box-shadow:-3px 3px #30253a,12px 3px #30253a; }.pixel-person__face { left:3px; top:6px; width:12px; height:10px; background:#f4bd88; box-shadow:3px 3px #f4bd88; }.pixel-person__shirt { left:1px; top:17px; width:16px; height:13px; background:var(--interactive-primary); box-shadow:-3px 3px var(--interactive-primary),3px 13px #263d67,10px 13px #263d67; }
.pixel-person__body[data-palette='green'] .pixel-person__shirt,.pixel-person__body[data-palette='mint'] .pixel-person__shirt,.pixel-person__body[data-palette='forest'] .pixel-person__shirt { background:#2f9b73; box-shadow:-3px 3px #2f9b73,3px 13px #263d67,10px 13px #263d67; }.pixel-person__body[data-palette='orange'] .pixel-person__shirt,.pixel-person__body[data-palette='amber'] .pixel-person__shirt { background:#ed7c38; box-shadow:-3px 3px #ed7c38,3px 13px #263d67,10px 13px #263d67; }.pixel-person--mine .pixel-person__shirt { background:#7653d6; box-shadow:-3px 3px #7653d6,3px 13px #263d67,10px 13px #263d67; }
.pixel-person__shadow { position:absolute; left:5px; bottom:1px; width:22px; height:6px; border-radius:50%; background:rgba(17,35,61,.2); }.pixel-person strong { position:absolute; left:50%; top:-19px; transform:translateX(-50%); padding:3px 6px; border-radius:999px; color:var(--text-inverse); background:var(--semantic-purple); font-size:.58rem; white-space:nowrap; }
@keyframes mc-breathe { from { margin-top:-1px } to { margin-top:2px } }
@media(max-width:760px){.world-map{min-height:calc(100dvh - 154px);border-radius:0;border-left:0;border-right:0}.world-map__place{max-width:128px;font-size:.65rem}.world-map__status{top:12px;left:12px}.world-map__legend{display:none}.pixel-person{transform:translate(-50%,-50%) scale(.9)}}
@media(prefers-reduced-motion:reduce){.pixel-person{animation:none}.world-map__place,.pixel-person{transition:none}}
</style>
