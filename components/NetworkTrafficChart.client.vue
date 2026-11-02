<template>
  <div class="chart-container">
    <Line :data="chartData" :options="chartOptions" role="img" aria-label="Historique des débits réseau entrants et sortants du serveur" />
  </div>
</template>

<script setup lang="ts">
import { Chart as ChartJS, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement, type ChartOptions } from 'chart.js'
import { Line } from 'vue-chartjs'
import type { NetworkHistorySample } from '~/types/system'
ChartJS.register(Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement)
const props = defineProps<{ samples: NetworkHistorySample[] }>()
const chartData = computed(() => ({
  labels: props.samples.map(sample => new Date(sample.sampledAt).toLocaleTimeString('fr-FR')),
  datasets: [
    { label: 'Réception (Mbit/s)', data: props.samples.map(sample => sample.receiveBytesPerSecond === null ? null : sample.receiveBytesPerSecond * 8 / 1_000_000), borderColor: '#70ffc5', pointRadius: props.samples.length < 2 ? 3 : 0, spanGaps: false, tension: .2 },
    { label: 'Envoi (Mbit/s)', data: props.samples.map(sample => sample.transmitBytesPerSecond === null ? null : sample.transmitBytesPerSecond * 8 / 1_000_000), borderColor: 'orange', pointRadius: props.samples.length < 2 ? 3 : 0, spanGaps: false, tension: .2 },
  ],
}))
const chartOptions: ChartOptions<'line'> = {
  responsive: true, maintainAspectRatio: false, animation: false,
  plugins: { legend: { labels: { color: 'white' } } },
  scales: {
    x: { ticks: { color: '#bbb', maxTicksLimit: 5, maxRotation: 0 }, grid: { color: 'rgba(255,255,255,.05)' } },
    y: { min: 0, ticks: { color: '#bbb' }, title: { display: true, text: 'Mbit/s', color: '#bbb' }, grid: { color: 'rgba(255,255,255,.05)' } },
  },
}
</script>

<style scoped>
.chart-container { position: relative; width: 100%; height: 270px; min-width: 0; }
</style>
