<script setup lang="ts">
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { ApexOptions } from 'apexcharts'
import {
  formatPopularityHistoryTooltipValue,
  type SchedulerPopularityHistorySeries,
} from '~/utils/scheduler'

const props = defineProps<{
  series: SchedulerPopularityHistorySeries
  lookingLabel: string
  schedulingLabel: string
  locale: string
  reducedMotion: boolean
  accountsLabel: string
  scheduledTimeLabel: string
  observedTimeLabel: string
  partialLabel: string
  missingLabel: string
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

const partialMarkers = computed(() => [props.series.looking, props.series.scheduling].flatMap(
  (series, seriesIndex) => series.flatMap((point, dataPointIndex) => point.partial && point.y !== null
    ? [{
        seriesIndex,
        dataPointIndex,
        fillColor: '#ffffff',
        strokeColor: '#92400e',
        size: 5,
      }]
    : []),
))

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
  markers: {
    size: 0,
    discrete: partialMarkers.value,
    hover: { sizeOffset: 3 },
  },
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
    title: {
      text: props.accountsLabel,
      style: { color: 'var(--text-secondary)' },
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    x: {
      formatter: value => `${props.scheduledTimeLabel}: ${formatShanghaiTime(Number(value))}`,
    },
    y: {
      formatter: (value, context) => {
        const point = context?.w?.config?.series?.[context.seriesIndex]?.data?.[context.dataPointIndex]
        const pointValue = point && typeof point === 'object' && 'y' in point ? point.y : value
        const formattedValue = formatPopularityHistoryTooltipValue(pointValue, props.missingLabel)
        if (formattedValue === props.missingLabel) return formattedValue
        const details = [formattedValue]
        if (Number.isFinite(point?.observedAt)) {
          details.push(`${props.observedTimeLabel}: ${formatShanghaiTime(point.observedAt)}`)
        }
        if (point?.partial) details.push(props.partialLabel)
        return details.join(' · ')
      },
    },
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
