<template>
  <div class="contenu">
    <div class="pannel welcome-panel">
      <div>
        <h1>Atlas</h1>
        <p>Votre infrastructure domestique et votre réseau local, depuis une interface unique.</p>
        <p>Retrouvez ici les caméras activées dans vos profils.</p>
      </div>
      <NuxtLink to="/settings" class="manage-link">Gérer les caméras</NuxtLink>
    </div>
    <div v-if="status === 'pending'" class="pannel" role="status">Chargement des caméras…</div>
    <div v-else-if="error" class="pannel" role="alert">
      <p>Impossible de charger les caméras. Vérifie que le backend Atlas est démarré.</p>
      <button type="button" class="manage-link" @click="refresh()">Réessayer</button>
    </div>
    <div v-else-if="!activeCameras.length" class="pannel">
      <p>Aucune caméra activée pour le moment.</p>
      <NuxtLink to="/settings" class="manage-link">Ajouter une caméra</NuxtLink>
    </div>
    <div v-else class="video-panel">
      <CameraPlayer v-for="camera in activeCameras" :key="camera.id" :camera="camera" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CameraProfile } from '~/types/camera'

const { data: cameras, status, error, refresh } = await useFetch<CameraProfile[]>('/api/cameras')
const activeCameras = computed(() => (cameras.value || []).filter(camera => camera.enabled))
</script>

<style scoped>
.welcome-panel { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.manage-link { display: inline-block; padding: 12px 16px; border: 1px solid rgba(0,255,255,.3); border-radius: 10px; background: rgba(0,255,255,.08); color: white; text-decoration: none; font: inherit; cursor: pointer; }
.video-panel { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; margin-top: 24px; }
@media (max-width: 1400px) { .video-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 768px) { .video-panel { grid-template-columns: 1fr; } .welcome-panel { align-items: flex-start; flex-direction: column; } }
</style>
