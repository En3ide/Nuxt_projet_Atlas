<template>
  <div class="chart-container">
    <Line :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler
} from 'chart.js'

import { Line } from 'vue-chartjs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler
)

const chartData = {
  labels: [
    'Lun',
    'Mar',
    'Mer',
    'Jeu',
    'Ven',
    'Sam',
    'Dim'
  ],
  datasets: [
    {
      label: 'Température Salon',
      data: [20, 21, 22, 21, 23, 24, 22],

      borderColor: 'cyan',
      backgroundColor: 'rgba(0,255,255,0.15)',

      fill: true,

      tension: 0.4,

      pointRadius: 4,
      pointBackgroundColor: 'cyan'
    }
  ]
}

const chartOptions = {
  responsive: true,

  maintainAspectRatio: false,

  plugins: {
    legend: {
      labels: {
        color: 'white'
      }
    }
  },

  scales: {
    x: {
      ticks: {
        color: 'white'
      },
      grid: {
        color: 'rgba(255,255,255,0.05)'
      }
    },

    y: {
      ticks: {
        color: 'white'
      },
      grid: {
        color: 'rgba(255,255,255,0.05)'
      }
    }
  }
}
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 300px;
}
</style>