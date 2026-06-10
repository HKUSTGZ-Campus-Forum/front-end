<script setup lang="ts">
import VueApexCharts from "vue3-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AdminChartDatum } from "~/types/admin";

const props = withDefaults(defineProps<{
  title: string
  description?: string
  items: AdminChartDatum[]
  height?: number
}>(), {
  description: "",
  height: 300,
});

const palette = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#ea580c", "#64748b"];
const labels = computed(() => props.items.map((item) => item.label));
const series = computed(() => props.items.map((item) => item.value));
const hasData = computed(() => series.value.some((value) => value > 0));

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: "donut",
    toolbar: { show: false },
    fontFamily: "inherit",
  },
  colors: palette,
  labels: labels.value,
  dataLabels: {
    enabled: true,
    dropShadow: { enabled: false },
  },
  legend: {
    position: "bottom",
    labels: { colors: "var(--text-secondary)" },
  },
  stroke: {
    colors: ["var(--surface-primary)"],
    width: 2,
  },
  tooltip: {
    theme: "light",
    y: {
      formatter: (value) => `${Number(value).toLocaleString()}`,
    },
  },
  plotOptions: {
    pie: {
      donut: {
        size: "68%",
        labels: {
          show: true,
          total: {
            show: true,
            color: "var(--text-primary)",
            formatter: () => series.value.reduce((sum, value) => sum + value, 0).toLocaleString(),
          },
          value: { color: "var(--text-primary)" },
          name: { color: "var(--text-secondary)" },
        },
      },
    },
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
        type="donut"
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
