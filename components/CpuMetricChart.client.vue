<template>
  <div class="chart-container">
    <Line :data="chartData" :options="chartOptions" role="img" :aria-label="metric === 'usage' ? 'Historique de la charge CPU du serveur' : 'Historique de la température CPU du serveur'" />
  </div>
</template>

<script setup lang="ts">
import { Chart as ChartJS, Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler, type ChartOptions } from 'chart.js'
import { Line } from 'vue-chartjs'
import type { CpuHistorySample } from '~/types/cpu'

ChartJS.register(Title, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, Filler)
const props = defineProps<{ samples: CpuHistorySample[]; metric: 'usage' | 'temperature' }>()
const chartData = computed(() => ({
  labels: props.samples.map(sample => new Date(sample.sampledAt).toLocaleTimeString('fr-FR')),
  datasets: [{
    label: props.metric === 'usage' ? 'Charge CPU (%)' : 'Température CPU (°C)',
    data: props.samples.map(sample => props.metric === 'usage' ? sample.usagePercent : sample.temperatureCelsius),
    borderColor: 'cyan',
    backgroundColor: 'rgba(0,255,255,0.12)',
    fill: true,
    tension: 0.2,
    pointRadius: props.samples.length < 2 ? 3 : 0,
    spanGaps: false,
  }],
}))
const chartOptions = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: { legend: { labels: { color: 'white' } } },
  scales: {
    x: { ticks: { color: '#bbb', maxTicksLimit: 6, maxRotation: 0 }, grid: { color: 'rgba(255,255,255,.05)' } },
    y: { min: 0, ...(props.metric === 'usage' ? { max: 100 } : { suggestedMax: 100 }), ticks: { color: '#bbb' }, grid: { color: 'rgba(255,255,255,.05)' } },
  },
}))
</script>

<style scoped>
.chart-container { position: relative; width: 100%; height: 280px; min-width: 0; }
</style>
