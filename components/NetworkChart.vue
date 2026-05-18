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
  labels: ['12:00', '12:05', '12:10', '12:15', '12:20'],

  datasets: [
    {
      label: 'Download',

      data: [25, 40, 35, 60, 80],

      borderColor: 'lime',

      backgroundColor: 'rgba(0,255,0,0.12)',

      fill: true,

      tension: 0.4
    },

    {
      label: 'Upload',

      data: [10, 12, 20, 15, 30],

      borderColor: 'orange',

      backgroundColor: 'rgba(255,165,0,0.12)',

      fill: true,

      tension: 0.4
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
  width: 100%;
  height: 300px;
}
</style>