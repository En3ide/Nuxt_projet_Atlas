<template>
  <div class="chart-container">
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'

import { Doughnut } from 'vue-chartjs'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const chartData = {
  labels: ['Used', 'Free'],

  datasets: [
    {
      data: [12, 20],

      backgroundColor: [
        'cyan',
        'rgba(255,255,255,0.08)'
      ],

      borderWidth: 0
    }
  ]
}

const chartOptions = {
  responsive: true,

  plugins: {
    legend: {
      labels: {
        color: 'white'
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