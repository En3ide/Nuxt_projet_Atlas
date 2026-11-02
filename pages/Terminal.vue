<template>
  <div class="contenu">
    <div class="pannel terminal-pannel">
      <ClientOnly><SshTerminal /><template #fallback><p class="loading">Chargement du terminal…</p></template></ClientOnly>
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

  min-height: 0;
  margin: 0;

  padding: 0;
  overflow: hidden;

  background-color: rgb(10, 10, 10);

  box-sizing: border-box;
}
.loading { padding: 24px; }
</style>
