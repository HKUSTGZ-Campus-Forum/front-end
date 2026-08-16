<script setup lang="ts">
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from "apexcharts";

type AreaSeries = {
  name: string
  data: number[]
};

const props = withDefaults(defineProps<{
  title: string
  description?: string
  categories: string[]
  series: AreaSeries[]
  height?: number
}>(), {
  description: "",
  height: 360,
});

const palette = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#ea580c", "#475569"];

const hasData = computed(() => props.series.some((item) => item.data.some((value) => value > 0)));

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: "area",
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: "inherit",
  },
  colors: palette,
  dataLabels: { enabled: false },
  stroke: { curve: "smooth", width: 2 },
  fill: {
    type: "gradient",
    gradient: {
      opacityFrom: 0.28,
      opacityTo: 0.06,
      stops: [0, 90, 100],
    },
  },
  legend: {
    position: "top",
    horizontalAlign: "left",
    labels: { colors: "var(--text-secondary)" },
  },
  xaxis: {
    categories: props.categories,
    labels: { style: { colors: "var(--text-muted)" } },
    axisBorder: { color: "var(--border-primary)" },
    axisTicks: { color: "var(--border-primary)" },
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    labels: { style: { colors: "var(--text-muted)" } },
  },
  tooltip: {
    theme: "light",
    x: { show: true },
  },
  grid: {
    borderColor: "var(--border-primary)",
    strokeDashArray: 4,
  },
}));
</script>

<template>
  <section class="admin-chart-card">
    <div class="admin-chart-card__head">
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
    </div>
    <ClientOnly>
      <VueApexCharts
        v-if="hasData"
        type="area"
        :height="height"
        :options="chartOptions"
        :series="series"
      />
      <AdminStateBlock
        v-else
        :title="$t('adminCharts.emptyTitle')"
        :message="$t('adminCharts.emptyDescription')"
      />
    </ClientOnly>
  </section>
</template>

<style scoped lang="scss">
.admin-chart-card {
  display: grid;
  gap: 0.85rem;
  min-width: 0;
  padding: 1rem;
  border: var(--card-border);
  border-radius: 8px;
  background: var(--surface-primary);
  box-shadow: var(--card-shadow);
}

.admin-chart-card__head {
  display: grid;
  gap: 0.25rem;

  h3 {
    margin: 0;
    color: var(--text-primary);
    font-size: 1rem;
  }

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 0.88rem;
    line-height: 1.5;
  }
}
</style>
