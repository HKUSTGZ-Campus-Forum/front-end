<script setup lang="ts">
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'
import type { SchedulerPopularityHistorySeries } from '~/utils/scheduler'

const props = defineProps<{
  series: SchedulerPopularityHistorySeries
  lookingLabel: string
  schedulingLabel: string
  locale: string
  reducedMotion: boolean
}>()

function formatShanghaiTime(timestamp: number): string {
  return new Intl.DateTimeFormat(props.locale === 'zh' ? 'zh-CN' : 'en-GB', {
    timeZone: 'Asia/Shanghai',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

const chartSeries = computed(() => [
  { name: props.lookingLabel, data: props.series.looking },
  { name: props.schedulingLabel, data: props.series.scheduling },
])

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: 'line',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: !props.reducedMotion },
    fontFamily: 'inherit',
  },
  colors: ['#2563eb', '#16a34a'],
  dataLabels: { enabled: false },
  stroke: {
    curve: 'stepline',
    width: [2, 2.5],
    dashArray: [7, 0],
  },
  markers: { size: 0, hover: { sizeOffset: 3 } },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    labels: { colors: 'var(--text-secondary)' },
  },
  xaxis: {
    type: 'datetime',
    labels: {
      datetimeUTC: false,
      formatter: (value, timestamp) => formatShanghaiTime(timestamp ?? Number(value)),
      style: { colors: 'var(--text-secondary)' },
    },
    axisBorder: { color: 'var(--border-primary)' },
    axisTicks: { color: 'var(--border-primary)' },
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    decimalsInFloat: 0,
    labels: {
      formatter: value => String(Math.max(0, Math.round(value))),
      style: { colors: 'var(--text-secondary)' },
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    x: { formatter: value => formatShanghaiTime(Number(value)) },
  },
  grid: {
    borderColor: 'var(--border-primary)',
    strokeDashArray: 4,
  },
  noData: { text: '' },
}))
</script>

<template>
  <VueApexCharts
    type="line"
    height="320"
    :options="chartOptions"
    :series="chartSeries"
  />
</template>
