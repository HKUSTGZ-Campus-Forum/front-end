<script setup lang="ts">
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AdminChartDatum } from "~/types/admin";

const props = withDefaults(defineProps<{
  title: string
  description?: string
  items: AdminChartDatum[]
  height?: number
  horizontal?: boolean
}>(), {
  description: "",
  height: 320,
  horizontal: false,
});

const palette = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#ea580c", "#64748b"];
const categories = computed(() => props.items.map((item) => item.label));
const values = computed(() => props.items.map((item) => item.value));
const hasData = computed(() => values.value.some((value) => value > 0));
const series = computed(() => [{ name: props.title, data: values.value }]);

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: "bar",
    toolbar: { show: false },
    fontFamily: "inherit",
  },
  colors: palette,
  plotOptions: {
    bar: {
      horizontal: props.horizontal,
      borderRadius: 5,
      distributed: true,
      columnWidth: "54%",
      barHeight: "68%",
    },
  },
  dataLabels: { enabled: false },
  legend: { show: false },
  xaxis: {
    categories: categories.value,
    labels: { style: { colors: "var(--text-tertiary)" } },
    axisBorder: { color: "var(--border-primary)" },
    axisTicks: { color: "var(--border-primary)" },
  },
  yaxis: {
    labels: { style: { colors: "var(--text-tertiary)" } },
  },
  tooltip: {
    theme: "light",
    y: {
      formatter: (value) => `${Number(value).toLocaleString()}`,
    },
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
        type="bar"
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
