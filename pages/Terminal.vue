<template>
  <div class="contenu">
    <div class="pannel terminal-pannel">
      <SshTerminal />
    </div>
  </div>
</template>

<script setup lang="ts">
import SshTerminal from '~/components/SshTerminal.vue'
</script>

<style scoped>
.terminal-pannel {
  width: 100%;
  max-width: 100%;

  min-height: 85vh;

  padding: 0;
  overflow: hidden;

  background-color: rgb(10, 10, 10);

  box-sizing: border-box;
}
</style>