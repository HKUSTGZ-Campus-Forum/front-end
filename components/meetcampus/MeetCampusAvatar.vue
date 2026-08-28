<script setup lang="ts">
import type { MeetCampusAppearance } from "~/types/meetcampus";
import { normalizeMeetCampusAppearance } from "~/utils/meetcampusAppearance";

const props = withDefaults(defineProps<{
  appearance?: MeetCampusAppearance | Record<string, unknown>;
  size?: "map" | "tiny" | "small" | "large" | "hero";
  label?: string;
  animated?: boolean;
}>(), { size: "small", label: "", animated: false });

const look = computed(() => normalizeMeetCampusAppearance(props.appearance as MeetCampusAppearance));
const skin = computed(() => ({
  porcelain: { base: "#f8d6bd", shadow: "#e9b99a", blush: "#e99da0" },
  warm: { base: "#efba87", shadow: "#d99466", blush: "#df7f77" },
  tan: { base: "#c98555", shadow: "#a9633d", blush: "#bf675f" },
  deep: { base: "#815137", shadow: "#603926", blush: "#9d5b59" },
}[look.value.skinTone]));
const hair = computed(() => ({
  ink: { base: "#26324a", light: "#3a4966", dark: "#172033" },
  chestnut: { base: "#70452f", light: "#966348", dark: "#4b2c20" },
  auburn: { base: "#9a4b35", light: "#c56d50", dark: "#653023" },
  plum: { base: "#5b405f", light: "#7c5b82", dark: "#3e2944" },
  ocean: { base: "#315f79", light: "#4e829b", dark: "#204457" },
}[look.value.hairColor]));
const outfit = computed(() => ({
  campus_blue: { base: "#4779d8", light: "#78a3f2", dark: "#2854a8", accent: "#f3d36a", legs: "#33496f" },
  mint_cardigan: { base: "#62af93", light: "#9ad3bd", dark: "#397c68", accent: "#fff2cf", legs: "#5a6680" },
  sunset_hoodie: { base: "#df724b", light: "#f39b72", dark: "#a74831", accent: "#ffe2ae", legs: "#384c70" },
  lavender_knit: { base: "#8064c8", light: "#aa93e4", dark: "#59419c", accent: "#f2d46f", legs: "#45516c" },
  sport_green: { base: "#3b9870", light: "#6fc19c", dark: "#246b50", accent: "#e8f4f0", legs: "#2d4663" },
  lab_coat: { base: "#e9f2f5", light: "#ffffff", dark: "#a9c3ce", accent: "#4f81d8", legs: "#3e5270" },
}[look.value.outfit]));
</script>

<template>
  <span class="mc-avatar" :class="[`mc-avatar--${size}`, { 'mc-avatar--animated': animated }]" :role="label ? 'img' : undefined" :aria-label="label || undefined" :aria-hidden="label ? undefined : 'true'">
    <svg viewBox="0 0 48 64" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
      <ellipse cx="24" cy="59" rx="15" ry="3" fill="#18304f" opacity=".2" />

      <g class="mc-avatar__person">
        <g v-if="look.hairStyle === 'bob' || look.hairStyle === 'waves'" :fill="hair.dark">
          <rect x="10" y="15" width="28" height="25" rx="6" />
          <rect v-if="look.hairStyle === 'waves'" x="8" y="25" width="6" height="15" /><rect v-if="look.hairStyle === 'waves'" x="34" y="25" width="6" height="15" />
        </g>
        <g v-if="look.hairStyle === 'bun'" :fill="hair.dark"><rect x="18" y="6" width="12" height="9" rx="4" /><rect x="15" y="8" width="18" height="7" rx="3" /></g>

        <rect x="15" y="47" width="7" height="10" :fill="outfit.legs" /><rect x="26" y="47" width="7" height="10" :fill="outfit.legs" />
        <rect x="13" y="55" width="10" height="4" rx="1" fill="#25344f" /><rect x="25" y="55" width="10" height="4" rx="1" fill="#25344f" />

        <rect x="10" y="34" width="7" height="13" rx="2" :fill="outfit.dark" /><rect x="31" y="34" width="7" height="13" rx="2" :fill="outfit.dark" />
        <rect x="11" y="44" width="6" height="5" rx="2" :fill="skin.base" /><rect x="31" y="44" width="6" height="5" rx="2" :fill="skin.base" />
        <path d="M15 32h18l3 17H12l3-17Z" :fill="outfit.base" />
        <rect x="17" y="32" width="14" height="4" :fill="outfit.light" opacity=".8" />

        <template v-if="look.outfit === 'campus_blue'"><path d="m20 33 4 4 4-4v7h-8v-7Z" :fill="outfit.accent" /><rect x="22" y="40" width="4" height="6" :fill="outfit.dark" /></template>
        <template v-else-if="look.outfit === 'mint_cardigan'"><rect x="23" y="34" width="2" height="15" :fill="outfit.accent" /><rect x="17" y="36" width="3" height="3" :fill="outfit.accent" /><rect x="28" y="36" width="3" height="3" :fill="outfit.accent" /></template>
        <template v-else-if="look.outfit === 'sunset_hoodie'"><path d="M18 34h12l-2 5h-8l-2-5Z" :fill="outfit.light" /><rect x="22" y="38" width="1" height="6" :fill="outfit.accent" /><rect x="26" y="38" width="1" height="6" :fill="outfit.accent" /></template>
        <template v-else-if="look.outfit === 'lavender_knit'"><path d="M15 39h18v3H15zM18 45h12v2H18z" :fill="outfit.light" /></template>
        <template v-else-if="look.outfit === 'sport_green'"><path d="M15 35h18v4H15z" :fill="outfit.accent" /><rect x="23" y="39" width="2" height="9" :fill="outfit.dark" /></template>
        <template v-else><path d="M18 33h12l-2 6h-8l-2-6Z" :fill="outfit.light" /><rect x="23" y="38" width="2" height="11" :fill="outfit.accent" /><rect x="28" y="42" width="4" height="3" :fill="outfit.accent" /></template>

        <rect x="21" y="29" width="6" height="5" :fill="skin.shadow" />
        <rect x="13" y="16" width="22" height="17" rx="5" :fill="skin.base" />
        <rect x="11" y="22" width="4" height="7" rx="2" :fill="skin.shadow" /><rect x="33" y="22" width="4" height="7" rx="2" :fill="skin.shadow" />
        <rect x="17" y="24" width="3" height="3" rx="1" fill="#24314a" /><rect x="28" y="24" width="3" height="3" rx="1" fill="#24314a" />
        <rect x="15" y="28" width="3" height="2" :fill="skin.blush" opacity=".72" /><rect x="30" y="28" width="3" height="2" :fill="skin.blush" opacity=".72" />
        <path d="M21 29h6v2h-6z" :fill="skin.shadow" />

        <g :fill="hair.base">
          <template v-if="look.hairStyle === 'crop'"><path d="M13 17V13h4v-3h17v3h3v9h-4v-4h-5v-3h-4v3H13z" /><rect x="16" y="11" width="16" height="4" :fill="hair.light" /></template>
          <template v-else-if="look.hairStyle === 'bob'"><path d="M11 20v-5h4v-4h18v3h4v9h-4v-5h-5v-3h-4v3h-7v5h-6z" /><rect x="15" y="12" width="16" height="3" :fill="hair.light" /></template>
          <template v-else-if="look.hairStyle === 'waves'"><path d="M10 21v-6h4v-4h20v4h4v8h-5v-5h-5v-3h-6v4h-6v4h-6z" /><rect x="15" y="12" width="18" height="3" :fill="hair.light" /></template>
          <template v-else-if="look.hairStyle === 'bun'"><path d="M12 20v-6h5v-3h14v3h5v7h-4v-4h-7v-3h-4v4h-5v3h-4z" /><rect x="18" y="11" width="12" height="3" :fill="hair.light" /></template>
          <template v-else-if="look.hairStyle === 'curly'"><rect x="12" y="12" width="24" height="9" rx="4" /><rect x="9" y="16" width="8" height="9" rx="3" /><rect x="31" y="16" width="8" height="9" rx="3" /><rect x="15" y="9" width="9" height="7" rx="3" /><rect x="24" y="10" width="10" height="7" rx="3" /><rect x="18" y="11" width="10" height="3" :fill="hair.light" /></template>
          <template v-else><path d="M12 20v-5h5v-3h17v4h3v6h-5v-4h-6v-3h-5v4h-5v3h-4z" /></template>
        </g>
        <g v-if="look.hairStyle === 'cap'"><path d="M12 14h24v6H12z" fill="#f0ca5e" /><path d="M16 10h16v6H16z" fill="#4779d8" /><path d="M31 17h9v3h-9z" fill="#2854a8" /></g>

        <g v-if="look.accessory === 'round_glasses'" fill="none" stroke="#334463" stroke-width="2"><rect x="14" y="22" width="8" height="7" rx="3" /><rect x="26" y="22" width="8" height="7" rx="3" /><path d="M22 25h4" /></g>
        <g v-else-if="look.accessory === 'headphones'"><path d="M10 23v-4c0-7 5-11 14-11s14 4 14 11v4h-3v-4c0-5-4-8-11-8s-11 3-11 8v4z" fill="#526b95" /><rect x="9" y="21" width="5" height="10" rx="2" fill="#f0ca5e" /><rect x="34" y="21" width="5" height="10" rx="2" fill="#f0ca5e" /></g>
        <g v-else-if="look.accessory === 'beret'"><path d="M12 13c2-6 20-8 24 0v4H12z" fill="#d65c70" /><rect x="23" y="6" width="3" height="4" fill="#a94055" /></g>
        <g v-else-if="look.accessory === 'hairclip'"><rect x="30" y="15" width="6" height="3" rx="1" fill="#f2cf5b" /><rect x="32" y="13" width="2" height="7" rx="1" fill="#f2cf5b" /></g>
      </g>
    </svg>
  </span>
</template>

<style scoped>
.mc-avatar{display:inline-grid;place-items:center;flex:0 0 auto;line-height:0}.mc-avatar svg{display:block;width:100%;height:100%;overflow:visible}.mc-avatar--map{width:42px;height:56px}.mc-avatar--tiny{width:36px;height:44px}.mc-avatar--small{width:48px;height:58px}.mc-avatar--large{width:82px;height:104px}.mc-avatar--hero{width:128px;height:160px}.mc-avatar--animated .mc-avatar__person{transform-origin:24px 58px;animation:mc-avatar-idle 2.8s ease-in-out infinite alternate}@keyframes mc-avatar-idle{from{transform:translateY(0)}to{transform:translateY(-1px)}}@media(prefers-reduced-motion:reduce){.mc-avatar--animated .mc-avatar__person{animation:none}}
</style>
