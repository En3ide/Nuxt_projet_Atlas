<template>
  <div class="contenu">
    <section class="pannel settings-header">
      <h1>Configuration des caméras</h1>
      <p>Enregistrez vos profils et choisissez les caméras affichées sur l’accueil.</p>
      <NuxtLink to="/">Voir les caméras</NuxtLink>
    </section>
    <div class="camera-settings">
      <section class="pannel camera-form-panel">
        <h2>{{ editingId ? 'Modifier la caméra' : 'Ajouter une caméra' }}</h2>
        <form @submit.prevent="saveCamera">
          <label for="camera-label">Nom</label>
          <input id="camera-label" v-model="form.label" required maxlength="120" placeholder="Caméra du jardin">
          <label for="camera-location">Emplacement <span>(facultatif)</span></label>
          <input id="camera-location" v-model="form.location" maxlength="160" placeholder="Jardin, entrée…">
          <label for="camera-protocol">Protocole</label>
          <select id="camera-protocol" v-model="form.protocol">
            <option value="hls">HLS — vidéo HTTP(S)</option>
            <option value="mjpeg">MJPEG — images HTTP(S)</option>
            <option value="rtsp">RTSP — profil uniquement</option>
          </select>
          <label for="camera-url">URL du flux</label>
          <input id="camera-url" v-model="form.streamUrl" type="url" required maxlength="2048" :placeholder="form.protocol === 'rtsp' ? 'rtsp://192.168.1.30/stream' : 'https://camera.example/live.m3u8'" aria-describedby="stream-help">
          <p id="stream-help" class="field-help">{{ form.protocol === 'rtsp' ? 'La lecture RTSP nécessitera un relais HLS. Le profil peut déjà être enregistré.' : 'Le flux doit autoriser la lecture depuis votre navigateur. Sur un site HTTPS, utilisez un flux HTTPS.' }} Les URL contenant un identifiant ou un mot de passe ne sont pas prises en charge.</p>
          <label class="checkbox-label"><input v-model="form.enabled" type="checkbox"> Afficher sur l’accueil</label>
          <div class="actions">
            <button type="submit" :disabled="busy">{{ busy ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter la caméra' }}</button>
            <button v-if="editingId" type="button" class="secondary" :disabled="busy" @click="resetForm">Annuler</button>
          </div>
        </form>
      </section>
      <section class="pannel camera-list-panel">
        <div class="list-heading">
          <h2>Profils enregistrés <span>({{ cameras?.length || 0 }})</span></h2>
          <button type="button" class="secondary" :disabled="busy || status === 'pending'" @click="refresh()">Actualiser</button>
        </div>
        <p v-if="status === 'pending'" role="status">Chargement…</p>
        <div v-else-if="error" role="alert">
          <p>Impossible de charger les profils. Vérifie que le backend Atlas est démarré.</p>
          <button type="button" class="secondary" @click="refresh()">Réessayer</button>
        </div>
        <p v-else-if="!cameras?.length">Aucun profil. Ajoutez votre première caméra avec le formulaire.</p>
        <ul v-else class="camera-list">
          <li v-for="camera in cameras" :key="camera.id">
            <div class="profile-heading">
              <strong>{{ camera.label }}</strong>
              <span :class="['badge', { inactive: !camera.enabled }]">{{ camera.enabled ? 'Activée' : 'Désactivée' }}</span>
            </div>
            <p v-if="camera.location">{{ camera.location }}</p>
            <p class="profile-url"><span>{{ camera.protocol.toUpperCase() }}</span> · {{ camera.streamUrl }}</p>
            <div v-if="deletingId === camera.id" class="delete-confirm">
              <p>Supprimer le profil « {{ camera.label }} » ?</p>
              <div class="actions">
                <button type="button" class="danger" :disabled="busy" @click="deleteCamera(camera)">Confirmer la suppression</button>
                <button type="button" class="secondary" :disabled="busy" @click="deletingId = null">Annuler</button>
              </div>
            </div>
            <div v-else class="actions">
              <button type="button" class="secondary" :disabled="busy" @click="editCamera(camera)">Modifier</button>
              <button type="button" class="secondary" :disabled="busy" @click="toggleCamera(camera)">{{ camera.enabled ? 'Désactiver' : 'Activer' }}</button>
              <button type="button" class="danger" :disabled="busy" @click="deletingId = camera.id">Supprimer</button>
            </div>
          </li>
        </ul>
      </section>
    </div>
    <p v-if="actionError" class="feedback error" role="alert">{{ actionError }}</p>
    <p v-if="success" class="feedback success" role="status">{{ success }}</p>
  </div>
</template>

<script setup lang="ts">
import type { CameraInput, CameraProfile } from '~/types/camera'

const { data: cameras, status, error, refresh } = await useFetch<CameraProfile[]>('/api/cameras')
const emptyForm = (): CameraInput => ({ label: '', location: '', streamUrl: '', protocol: 'hls', enabled: true })
const form = reactive<CameraInput>(emptyForm())
const editingId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const busy = ref(false)
const actionError = ref('')
const success = ref('')

function resetForm() {
  editingId.value = null
  Object.assign(form, emptyForm())
}
function editCamera(camera: CameraProfile) {
  editingId.value = camera.id
  deletingId.value = null
  actionError.value = ''
  success.value = ''
  Object.assign(form, { label: camera.label, location: camera.location, streamUrl: camera.streamUrl, protocol: camera.protocol, enabled: camera.enabled })
  document.getElementById('camera-label')?.focus()
}
async function performAction(action: () => Promise<unknown>, message: string) {
  busy.value = true
  actionError.value = ''
  success.value = ''
  try {
    await action()
    await refresh()
    success.value = message
    if (error.value) actionError.value = 'La modification est enregistrée, mais la liste n’a pas pu être actualisée.'
  } catch (caught: unknown) {
    const failure = caught as { data?: { message?: string; statusMessage?: string } }
    actionError.value = failure.data?.message || failure.data?.statusMessage || 'Impossible d’enregistrer la modification. Réessaie dans un instant.'
  } finally {
    busy.value = false
  }
}
async function saveCamera() {
  const id = editingId.value
  await performAction(async () => {
    await $fetch(id ? `/api/cameras/${id}` : '/api/cameras', { method: id ? 'PATCH' : 'POST', body: { ...form } })
    resetForm()
  }, id ? 'Profil caméra mis à jour.' : 'Caméra ajoutée.')
}
async function toggleCamera(camera: CameraProfile) {
  await performAction(async () => {
    const updated = await $fetch<CameraProfile>(`/api/cameras/${camera.id}`, { method: 'PATCH', body: { enabled: !camera.enabled } })
    if (editingId.value === camera.id) form.enabled = updated.enabled
  }, camera.enabled ? 'Caméra désactivée.' : 'Caméra activée.')
}
async function deleteCamera(camera: CameraProfile) {
  await performAction(async () => {
    await $fetch(`/api/cameras/${camera.id}`, { method: 'DELETE' })
    deletingId.value = null
    if (editingId.value === camera.id) resetForm()
  }, 'Profil caméra supprimé.')
}
</script>

<style scoped>
.settings-header { min-height: 0; }
.settings-header a { color: cyan; }
.camera-settings { display: grid; grid-template-columns: minmax(280px, 380px) minmax(0, 1fr); gap: 24px; margin-top: 24px; align-items: start; }
.camera-settings .pannel { margin: 0; min-width: 0; }
form { display: flex; flex-direction: column; gap: 10px; }
label { margin-top: 12px; font-size: 14px; }
label span, .field-help { color: #aaa; }
input:not([type=checkbox]), select { width: 100%; padding: 12px; border: 1px solid #555; border-radius: 10px; background: #191919; color: white; font: inherit; }
input:focus, select:focus, button:focus-visible, a:focus-visible { outline: 2px solid cyan; outline-offset: 3px; }
.field-help { margin: 0; font-size: 12px; line-height: 1.6; }
.checkbox-label { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.checkbox-label input { accent-color: cyan; width: 18px; height: 18px; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
button { border: 1px solid rgba(0,255,255,.35); border-radius: 10px; background: rgba(0,255,255,.12); color: white; padding: 10px 14px; font: inherit; cursor: pointer; }
button.secondary { background: #252525; border-color: #555; }
button.danger { background: rgba(255,95,86,.1); border-color: #a9534e; color: #ffb9b4; }
button:disabled { opacity: .5; cursor: wait; }
.list-heading, .profile-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.list-heading { margin-bottom: 20px; }
.list-heading h2 { margin: 0; }
.list-heading h2 span { color: #aaa; font-weight: normal; }
.camera-list { list-style: none; padding: 0; margin: 0; }
.camera-list li { border-top: 1px solid #333; padding: 20px 0; margin: 0; }
.camera-list p { margin: 8px 0; }
.profile-url { overflow-wrap: anywhere; font-size: 12px; }
.badge { padding: 4px 10px; border-radius: 8px; font-size: 12px; color: #70ffc5; background: rgba(0,255,120,.1); }
.badge.inactive { color: #bbb; background: #333; }
.delete-confirm { border-left: 2px solid #a9534e; padding-left: 12px; }
.feedback { position: sticky; bottom: 16px; padding: 16px; border: 1px solid; border-radius: 10px; background: #151515; }
.feedback.error { color: #ffb9b4; border-color: #a9534e; }
.feedback.success { color: #70ffc5; border-color: #357b5c; }
@media (max-width: 1100px) { .camera-settings { grid-template-columns: 1fr; } }
</style>
