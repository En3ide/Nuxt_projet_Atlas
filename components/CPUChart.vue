<template>
  <CpuMetricChart :samples="samples" metric="usage" />
</template>

<script setup lang="ts">
import type { CpuHistorySample } from '~/types/cpu'
defineProps<{ samples: CpuHistorySample[] }>()
</script>
