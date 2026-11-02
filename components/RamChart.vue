<template>
  <RamUsageChart :used-bytes="usedBytes" :available-bytes="availableBytes" />
</template>

<script setup lang="ts">
defineProps<{ usedBytes: number; availableBytes: number }>()
</script>
