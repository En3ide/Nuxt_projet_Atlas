<template>
  <div class="contenu">
    <!----<div class="pannel-1 pannel">
      <p>{{ cpuTemp }}</p>
    </div>--->

    <div class="pannel-2 pannel">
      <h2>Température</h2>

        <TemperatureChart />
    </div>

    <div class="grid-pannels">
      <div class="pannel">
        <h2>CPU</h2>

        <CPUChart />
      </div>
      <div class="pannel">
        <h2>CPU</h2>

        <RamChart />
      </div>
      <div class="pannel">
        <h2>Network</h2>

        <NetworkChart />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import TemperatureChart from '~/components/TemperatureChart.vue'
import CPUChart from '~/components/CPUChart.vue'
import RamChart from '~/components/RamChart.vue'
import NetworkChart from '~/components/NetworkChart.vue'

export default defineComponent({
  name: 'Dashboard',
  data() {
    return {
      cpuTemp: 'Chargement...'
    }
  },
  methods: {
    async getCurrentTemp_local(): Promise<void> {
      try {
        const response = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=48.8566&longitude=2.3522&current_weather=true'
        )
        const data = await response.json()
        this.cpuTemp = data.current_weather.temperature
      } catch (error) {
        console.error(error)
        this.cpuTemp = 'Erreur'
      }
      setTimeout(this.getCurrentTemp_local, 2000)
    }
  },
  mounted() {
    this.getCurrentTemp_local()
  }
})
</script>