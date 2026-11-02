<template>
  <CpuMetricChart :samples="samples" metric="temperature" />
</template>

<script setup lang="ts">
import type { CpuHistorySample } from '~/types/cpu'
defineProps<{ samples: CpuHistorySample[] }>()
</script>
