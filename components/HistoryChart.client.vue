<template>
  <div class="chart"><Line :data="data" :options="options" role="img" :aria-label="label" /></div>
</template>

<script setup lang="ts">
import { Chart as ChartJS, Tooltip, Legend, LineElement, LinearScale, PointElement, type ChartOptions } from 'chart.js'
import { Line } from 'vue-chartjs'
ChartJS.register(Tooltip, Legend, LineElement, LinearScale, PointElement)
const props = defineProps<{
  label: string; unit: string; from: string; to: string; max?: number
  series: { label: string; color: string; points: { x: number; y: number | null }[] }[]
}>()
const time = (value: number) => new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const data = computed(() => ({ datasets: props.series.map(series => ({
  label: series.label, data: series.points, borderColor: series.color, borderWidth: 1.5,
  pointRadius: series.points.length === 1 ? 3 : 0, spanGaps: false, tension: 0,
})) }))
const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
  plugins: { legend: { labels: { color: '#ddd' } }, tooltip: { callbacks: { title: items => items[0] ? new Date(items[0].parsed.x).toLocaleString('fr-FR') : '' } } },
  scales: {
    x: { type: 'linear', min: Date.parse(props.from), max: Date.parse(props.to), ticks: { color: '#bbb', maxTicksLimit: 7, callback: value => time(Number(value)) }, grid: { color: '#ffffff0d' } },
    y: { min: 0, ...(props.max ? { max: props.max } : {}), title: { display: true, text: props.unit, color: '#bbb' }, ticks: { color: '#bbb' }, grid: { color: '#ffffff0d' } },
  },
}))
</script>

<style scoped>
.chart { height: 280px; position: relative; min-width: 0; }
</style>
