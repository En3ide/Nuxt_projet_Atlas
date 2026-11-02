<template>
  <div class="chart-container">
    <Doughnut :data="chartData" :options="chartOptions" role="img" aria-label="Répartition de la RAM utilisée et disponible du serveur" />
  </div>
</template>

<script setup lang="ts">
import { Chart as ChartJS, Tooltip, Legend, ArcElement, type ChartOptions } from 'chart.js'
import { Doughnut } from 'vue-chartjs'
ChartJS.register(Tooltip, Legend, ArcElement)
const props = defineProps<{ usedBytes: number; availableBytes: number }>()
const chartData = computed(() => ({
  labels: ['Utilisée', 'Disponible'],
  datasets: [{ data: [props.usedBytes, props.availableBytes], backgroundColor: ['cyan', '#444'], borderWidth: 0 }],
}))
const chartOptions: ChartOptions<'doughnut'> = {
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: {
    legend: { labels: { color: 'white' } },
    tooltip: { callbacks: { label: context => `${context.label} : ${(Number(context.raw) / 1024 ** 3).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Gio` } },
  },
}
</script>

<style scoped>
.chart-container { position: relative; width: 100%; height: 270px; }
</style>
