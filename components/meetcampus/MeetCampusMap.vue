<script setup lang="ts">
import type { MeetCampusLocation } from "~/types/meetcampus";
import { localizeText } from "~/utils/meetcampus";

const props = defineProps<{
  locations: MeetCampusLocation[];
  activeLocationId?: string | null;
}>();

const { t } = useI18n();
const { locale } = useAppLocale();

const markerIcon = (kind: MeetCampusLocation["kind"]) => ({
  study: "lucide:book-open",
  dining: "lucide:utensils",
  activity: "lucide:sparkles",
}[kind]);

const agentMarkers = [
  { id: "mine", label: "M", x: 38, y: 53, tone: "mine" },
  { id: "blue", label: "B", x: 65, y: 45, tone: "blue" },
  { id: "orange", label: "O", x: 57, y: 61, tone: "orange" },
  { id: "mo", label: "A", x: 72, y: 70, tone: "purple" },
];
</script>

<template>
  <section class="mc-map" :aria-label="t('meetCampus.map.ariaLabel')">
    <div class="mc-map__status" role="status">
      <span class="mc-map__status-dot" aria-hidden="true"></span>
      {{ t('meetCampus.map.sandboxAgents') }}
    </div>

    <div
      v-for="locationItem in props.locations"
      :key="locationItem.id"
      class="mc-map__location"
      :class="{
        'mc-map__location--active': locationItem.id === activeLocationId,
        [`mc-map__location--${locationItem.kind}`]: true,
      }"
      :style="{ left: `${locationItem.x}%`, top: `${locationItem.y}%` }"
    >
      <span class="mc-map__location-icon" aria-hidden="true">
        <Icon :name="markerIcon(locationItem.kind)" />
      </span>
      <span>{{ localizeText(locationItem.name, locale) }}</span>
      <span v-if="locationItem.id === activeLocationId" class="mc-map__active-tag">
        {{ t('meetCampus.map.taskLocation') }}
      </span>
    </div>

    <div
      v-for="agent in agentMarkers"
      :key="agent.id"
      class="mc-map__agent"
      :class="`mc-map__agent--${agent.tone}`"
      :style="{ left: `${agent.x}%`, top: `${agent.y}%` }"
      aria-hidden="true"
    >
      <span>{{ agent.label }}</span>
    </div>

    <div class="mc-map__legend">
      <Icon name="lucide:flask-conical" aria-hidden="true" />
      <span>{{ t('meetCampus.map.sandboxLegend') }}</span>
    </div>
  </section>
</template>

<style scoped lang="scss">
.mc-map {
  position: relative;
  width: 100%;
  min-height: 680px;
  overflow: hidden;
  isolation: isolate;
  border-radius: 16px;
  background-color: var(--meetcampus-map-grass);
  background-image:
    linear-gradient(to bottom, transparent 72%, color-mix(in srgb, var(--interactive-primary) 8%, transparent)),
    url('/image/meetcampus/campus-map.webp');
  background-position: center;
  background-size: 100% 100%;
  box-shadow: var(--shadow-medium);
}

.mc-map::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-primary) 10%, transparent);
  border-radius: inherit;
}

.mc-map__status,
.mc-map__legend {
  position: absolute;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  color: var(--meetcampus-map-ink);
  background: var(--meetcampus-map-overlay);
  box-shadow: var(--meetcampus-map-shadow-small);
  backdrop-filter: blur(6px);
}

.mc-map__status {
  top: 16px;
  left: 16px;
  padding: 8px 13px;
  border-radius: 999px;
  font-size: 0.82rem;
  font-weight: 650;
}

.mc-map__status-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--semantic-success);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--semantic-success) 16%, transparent);
}

.mc-map__legend {
  right: 14px;
  bottom: 14px;
  max-width: calc(100% - 28px);
  padding: 8px 11px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.mc-map__legend :deep(svg) {
  flex: 0 0 auto;
  color: var(--meetcampus-map-study);
}

.mc-map__location {
  position: absolute;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  max-width: min(190px, 40%);
  padding: 7px 11px 7px 7px;
  border-radius: 999px;
  color: var(--meetcampus-map-ink);
  background: var(--meetcampus-map-overlay);
  box-shadow: var(--meetcampus-map-shadow-medium);
  transform: translate(-50%, -50%);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.mc-map__location--active {
  z-index: 6;
  box-shadow: 0 0 0 3px var(--meetcampus-map-outline), 0 0 0 6px var(--meetcampus-map-active);
  transform: translate(-50%, -50%) scale(1.04);
}

.mc-map__location-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  border-radius: 50%;
  color: var(--meetcampus-map-outline);
  background: var(--meetcampus-map-study);
}

.mc-map__location--dining .mc-map__location-icon {
  background: var(--meetcampus-map-dining);
}

.mc-map__location--activity .mc-map__location-icon {
  background: var(--meetcampus-map-activity);
}

.mc-map__active-tag {
  position: absolute;
  left: 50%;
  top: calc(100% + 5px);
  padding: 4px 8px;
  border-radius: 6px;
  color: var(--meetcampus-map-study-text);
  background: var(--meetcampus-map-outline);
  box-shadow: var(--meetcampus-map-shadow-small);
  transform: translateX(-50%);
  white-space: nowrap;
  font-size: 0.65rem;
  font-weight: 700;
}

.mc-map__agent {
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 3px solid var(--meetcampus-map-outline);
  border-radius: 9px;
  color: var(--meetcampus-map-outline);
  background: var(--meetcampus-map-agent-neutral);
  box-shadow: var(--meetcampus-map-agent-shadow);
  transform: translate(-50%, -50%);
  font-size: 0.65rem;
  font-weight: 800;
  animation: agent-float 2.8s ease-in-out infinite alternate;
}

.mc-map__agent--mine { background: var(--meetcampus-map-agent-mine); }
.mc-map__agent--blue { background: var(--meetcampus-map-agent-blue); animation-delay: -0.8s; }
.mc-map__agent--orange { background: var(--meetcampus-map-dining); animation-delay: -1.6s; }
.mc-map__agent--purple { background: var(--meetcampus-map-study); animation-delay: -2.1s; }

@keyframes agent-float {
  from { transform: translate(-50%, -50%) translateY(-2px); }
  to { transform: translate(-50%, -50%) translateY(3px); }
}

@media (max-width: 900px) {
  .mc-map {
    min-height: 560px;
  }
}

@media (max-width: 520px) {
  .mc-map {
    min-height: 510px;
    border-radius: 14px;
  }

  .mc-map__status {
    top: 12px;
    left: 12px;
    font-size: 0.75rem;
  }

  .mc-map__location {
    gap: 5px;
    max-width: 43%;
    min-height: 34px;
    padding: 5px 8px 5px 5px;
    font-size: 0.68rem;
  }

  .mc-map__location-icon {
    width: 25px;
    height: 25px;
  }

  .mc-map__agent {
    width: 24px;
    height: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .mc-map__agent {
    animation: none;
  }

  .mc-map__location {
    transition: none;
  }
}
</style>
