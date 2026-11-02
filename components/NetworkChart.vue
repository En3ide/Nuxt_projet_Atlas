<template>
  <NetworkTrafficChart :samples="samples" />
</template>

<script setup lang="ts">
import type { NetworkHistorySample } from '~/types/system'
defineProps<{ samples: NetworkHistorySample[] }>()
</script>
