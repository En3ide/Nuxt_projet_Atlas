<template>
  <article class="pannel camera-card">
    <div class="camera-header">
      <div>
        <h2>{{ camera.label }}</h2>
        <p v-if="camera.location">{{ camera.location }}</p>
      </div>
      <span class="camera-status" :class="{ failed: hasError }" role="status">{{ playbackStatus }}</span>
    </div>
    <div v-if="camera.protocol === 'rtsp'" class="stream-notice">
      Ce profil RTSP est enregistré. Un relais vidéo vers HLS sera nécessaire pour le lire dans le navigateur.
    </div>
    <template v-else>
      <img v-if="camera.protocol === 'mjpeg'" :src="camera.streamUrl" :alt="camera.label" class="camera-video" @load="setStatus('Flux reçu')" @error="failPlayback">
      <video v-else ref="videoRef" class="camera-video" controls autoplay muted playsinline :aria-label="camera.label" @playing="setStatus('Lecture')" @pause="setStatus('En pause')" @waiting="setStatus('Chargement…')" @ended="setStatus('Terminé')" @error="failPlayback" />
      <p v-if="hasError" class="stream-error" role="alert">Le flux est inaccessible ou incompatible avec ce navigateur.</p>
    </template>
  </article>
</template>

<script setup lang="ts">
import Hls from 'hls.js'
import type { CameraProfile } from '~/types/camera'

const props = defineProps<{ camera: CameraProfile }>()
const videoRef = ref<HTMLVideoElement | null>(null)
const playbackStatus = ref('Connexion…')
const hasError = ref(false)
let hls: Hls | null = null

function setStatus(value: string) {
  if (!hasError.value) playbackStatus.value = value
}
function failPlayback() {
  hasError.value = true
  playbackStatus.value = 'Indisponible'
}
function initPlayer() {
  hls?.destroy()
  hls = null
  hasError.value = false
  playbackStatus.value = props.camera.protocol === 'rtsp' ? 'Relais requis' : 'Connexion…'
  const video = videoRef.value
  if (props.camera.protocol !== 'hls' || !video) return
  if (Hls.isSupported()) {
    hls = new Hls()
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) {
        failPlayback()
        hls?.destroy()
        hls = null
      }
    })
    hls.loadSource(props.camera.streamUrl)
    hls.attachMedia(video)
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = props.camera.streamUrl
  } else {
    failPlayback()
  }
}
onMounted(initPlayer)
watch(() => [props.camera.streamUrl, props.camera.protocol], initPlayer, { flush: 'post' })
onBeforeUnmount(() => hls?.destroy())
</script>

<style scoped>
.camera-card { padding: 0; margin: 0; min-width: 0; min-height: 0; }
.camera-header { min-height: 75px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-bottom: 1px solid rgba(255,255,255,.05); }
.camera-header h2 { margin: 0; font-size: 17px; overflow-wrap: anywhere; }
.camera-header p { margin: 6px 0 0; font-size: 13px; }
.camera-status { flex-shrink: 0; color: cyan; background: rgba(0,255,255,.08); padding: 6px 10px; border-radius: 8px; font-size: 12px; }
.camera-status.failed { color: #ffaba5; background: rgba(255,95,86,.1); }
.camera-video { width: 100%; height: 300px; display: block; object-fit: contain; background: black; }
.stream-notice { min-height: 260px; padding: 32px; display: flex; align-items: center; color: #bbb; line-height: 1.6; }
.stream-error { padding: 0 20px; font-size: 13px; }
@media (max-width: 768px) { .camera-video { height: 240px; } }
</style>
