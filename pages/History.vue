<template>
  <main class="contenu history">
    <section class="pannel heading">
      <div><h1>Historique du serveur</h1><p>CPU, mémoire, température et réseau enregistrés toutes les 10 secondes.</p><NuxtLink to="/dashboard">← Supervision en direct</NuxtLink></div>
      <form @submit.prevent="load">
        <label for="history-date">Journée à consulter</label>
        <div class="controls"><button type="button" aria-label="Jour précédent" @click="moveDay(-1)">←</button><input id="history-date" v-model="date" type="date" required :max="today" @change="load"><button type="button" aria-label="Jour suivant" :disabled="date >= today" @click="moveDay(1)">→</button><button :disabled="loading">{{ loading ? 'Chargement…' : 'Actualiser' }}</button></div>
        <p>Heures locales : {{ timezone }}. Aucun relevé lorsque le backend est arrêté.</p>
      </form>
    </section>
    <p v-if="error" class="pannel error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">Chargement de la journée…</p>
    <template v-if="day && !loading">
      <section class="pannel overview">
        <h2>{{ displayDate }}</h2>
        <p>{{ day.samples.length.toLocaleString('fr-FR') }} relevés conservés<span v-if="day.samples.length"> · de {{ time(day.samples[0]!.recordedAt) }} à {{ time(day.samples[day.samples.length - 1]!.recordedAt) }}</span>.</p>
        <p>Les courbes s’interrompent lors des coupures et des mesures indisponibles. Moyennes calculées sur les relevés disponibles.</p>
        <button :disabled="!day.samples.length" @click="download">Exporter les relevés affichés (JSON)</button>
      </section>
      <section v-if="!day.samples.length" class="pannel" role="status"><h2>Aucune mesure pour cette journée</h2><p>L’enregistrement commence avec cette fonctionnalité et continue tant que le backend fonctionne, même si le site est fermé. Aucun historique antérieur ne peut être reconstitué.</p></section>
      <template v-else>
        <div class="summaries">
          <section v-for="metric in summaries" :key="metric.label" class="pannel"><h2>{{ metric.label }}</h2><strong>{{ format(metric.average) }} {{ metric.unit }}</strong><p>Moyenne · maximum {{ format(metric.max) }} {{ metric.unit }}</p><p v-if="metric.average === null">Aucune mesure disponible.</p></section>
        </div>
        <div class="charts">
          <section class="pannel"><h2>Charge CPU</h2><HistoryChart label="Charge CPU sur la journée" unit="%" :max="100" :from="day.from" :to="day.to" :series="cpuSeries" /></section>
          <section class="pannel"><h2>Mémoire RAM utilisée</h2><HistoryChart label="Mémoire utilisée sur la journée" unit="%" :max="100" :from="day.from" :to="day.to" :series="memorySeries" /></section>
          <section class="pannel"><h2>Température CPU</h2><HistoryChart v-if="hasTemperature" label="Température CPU sur la journée" unit="°C" :from="day.from" :to="day.to" :series="temperatureSeries" /><p v-else>Aucune température enregistrée : aucun capteur CPU accessible sur cette période.</p></section>
          <section class="pannel"><h2>Trafic réseau</h2><label for="history-interface">Interface</label><select id="history-interface" v-model="interfaceId"><option v-for="iface in interfaces" :key="iface.id" :value="iface.id">{{ iface.name }}</option></select><HistoryChart v-if="interfaceId" label="Débits réseau sur la journée" unit="Mbit/s" :from="day.from" :to="day.to" :series="networkSeries" /><p v-else>Aucune interface enregistrée.</p><p>Débits de l’interface sélectionnée, sans addition des interfaces virtuelles.</p></section>
        </div>
        <section class="pannel">
          <h2>Détail des relevés</h2><p>Ouvrir un relevé pour consulter les cœurs CPU, la fréquence, la mémoire, les sondes et les interfaces réseau.</p>
          <div class="table-wrap"><table><thead><tr><th>Heure</th><th>CPU</th><th>RAM utilisée</th><th>Température</th><th>Fréquence</th><th></th></tr></thead><tbody><tr v-for="sample in visibleSamples" :key="sample.id"><td>{{ time(sample.recordedAt) }}</td><td>{{ format(sample.cpu.usagePercent) }} %</td><td>{{ format(sample.memory.usedPercent) }} %</td><td>{{ format(sample.cpu.temperatureCelsius) }} °C</td><td>{{ format(sample.cpu.reportedFrequencyMhz, 0) }} MHz</td><td><button @click="showDetail(sample.id)">Détails</button></td></tr></tbody></table></div>
          <div class="controls pagination"><button :disabled="page === 0" @click="page--">Précédent</button><span>Page {{ page + 1 }} / {{ pageCount }}</span><button :disabled="page + 1 >= pageCount" @click="page++">Suivant</button></div>
          <p v-if="detailLoading" role="status">Chargement du relevé…</p><p v-if="detailError" role="alert">{{ detailError }}</p>
          <div v-if="detail" class="detail">
            <h3>Relevé du {{ new Date(detail.recordedAt).toLocaleString('fr-FR') }}</h3>
            <p>{{ detail.snapshot.server.hostname }} · {{ detail.snapshot.cpu.model }} · {{ detail.snapshot.server.platform }}</p>
            <p>{{ detail.snapshot.cpu.physicalCores ?? '—' }} cœurs physiques · {{ detail.snapshot.cpu.logicalCores }} processeurs logiques · {{ format(detail.snapshot.cpu.reportedFrequencyMhz, 0) }} MHz</p>
            <p>Température : {{ format(detail.snapshot.cpu.temperature.celsius) }} °C · {{ detail.snapshot.cpu.temperature.source || 'Sonde indisponible' }}</p>
            <p v-if="detail.snapshot.cpu.temperature.reason">{{ detail.snapshot.cpu.temperature.reason }}</p>
            <h4>Mémoire</h4>
            <p>Utilisée : {{ bytes(detail.snapshot.memory.usedBytes) }} · disponible : {{ bytes(detail.snapshot.memory.availableBytes) }} · libre : {{ bytes(detail.snapshot.memory.freeBytes) }} · total : {{ bytes(detail.snapshot.memory.totalBytes) }}</p>
            <p v-if="detail.snapshot.memory.reason">{{ detail.snapshot.memory.reason }}</p>
            <h4>Charge par processeur logique</h4>
            <div class="core-grid"><span v-for="core in detail.snapshot.cpu.cores" :key="core.index">CPU {{ core.index + 1 }} : {{ format(core.usagePercent) }} %</span></div>
            <h4>Interfaces réseau</h4>
            <p v-if="detail.snapshot.network.reason">{{ detail.snapshot.network.reason }}</p>
            <div v-for="iface in detail.snapshot.network.interfaces" :key="iface.id" class="interface-detail">
              <strong>{{ iface.name }} · {{ iface.state === 'up' ? 'Connectée' : iface.state === 'down' ? 'Déconnectée' : 'État inconnu' }}</strong>
              <p>{{ [...iface.ipv4, ...iface.ipv6].join(' · ') || 'Aucune adresse exposée' }}</p>
              <p>↓ {{ format(iface.receiveBytesPerSecond === null ? null : iface.receiveBytesPerSecond * 8 / 1_000_000, 3) }} Mbit/s · ↑ {{ format(iface.transmitBytesPerSecond === null ? null : iface.transmitBytesPerSecond * 8 / 1_000_000, 3) }} Mbit/s</p>
              <p>Compteurs : {{ bytes(iface.receivedBytes) }} reçus · {{ bytes(iface.transmittedBytes) }} envoyés · liaison {{ format(iface.speedMbps, 0) }} Mbit/s</p>
            </div>
            <details><summary>Toutes les mesures du relevé (JSON)</summary><pre>{{ JSON.stringify(detail.snapshot, null, 2) }}</pre></details>
            <button @click="detail = null">Fermer le détail</button>
          </div>
        </section>
      </template>
    </template>
  </main>
</template>

<script setup lang="ts">
import type { HistoryDay, HistoryDetail, HistorySample } from '~/types/history'

const localDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
const date = ref('')
const today = ref('')
const timezone = ref('')
const day = shallowRef<HistoryDay | null>(null)
const loading = ref(false)
const error = ref('')
const page = ref(0)
const interfaceId = ref('')
const detail = shallowRef<HistoryDetail | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
let requestId = 0
let detailRequestId = 0
const displayDate = computed(() => new Date(`${date.value}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
const samples = computed(() => day.value?.samples || [])
const pageCount = computed(() => Math.max(1, Math.ceil(samples.value.length / 100)))
const visibleSamples = computed(() => samples.value.slice(page.value * 100, (page.value + 1) * 100))
const interfaces = computed(() => {
  const found = new Map<string, { id: string; name: string; default: boolean }>()
  for (const sample of samples.value) for (const iface of sample.network.interfaces) found.set(iface.id, iface)
  return [...found.values()].sort((a, b) => Number(b.default) - Number(a.default) || a.name.localeCompare(b.name))
})
const hasTemperature = computed(() => samples.value.some(sample => sample.cpu.temperatureCelsius !== null))
function format(value: number | null, digits = 1) { return value === null ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: digits }) }
function time(value: string) { return new Date(value).toLocaleTimeString('fr-FR') }
function bytes(value: number | null) { return value === null ? '—' : `${format(value / 1024 ** 3, 2)} Gio` }
function stats(get: (sample: HistorySample) => number | null) {
  const values = samples.value.map(get).filter((value): value is number => value !== null && Number.isFinite(value))
  return { average: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null, max: values.length ? Math.max(...values) : null }
}
const summaries = computed(() => [
  { label: 'Charge CPU', unit: '%', ...stats(sample => sample.cpu.usagePercent) },
  { label: 'RAM utilisée', unit: '%', ...stats(sample => sample.memory.usedPercent) },
  { label: 'Température CPU', unit: '°C', ...stats(sample => sample.cpu.temperatureCelsius) },
])
// Des points nuls interrompent la courbe au lieu de relier deux périodes séparées par un arrêt.
function points(get: (sample: HistorySample) => number | null) {
  const result: { x: number; y: number | null }[] = []
  for (const sample of samples.value) {
    const x = Date.parse(sample.recordedAt)
    const previous = result.at(-1)
    if (previous && x - previous.x > (day.value?.intervalMs || 10000) * 2.5) result.push({ x: previous.x + 1, y: null })
    result.push({ x, y: get(sample) })
  }
  return result
}
const cpuSeries = computed(() => [{ label: 'CPU (%)', color: 'cyan', points: points(sample => sample.cpu.usagePercent) }])
const memorySeries = computed(() => [{ label: 'RAM (%)', color: '#b596ff', points: points(sample => sample.memory.usedPercent) }])
const temperatureSeries = computed(() => [{ label: 'CPU (°C)', color: '#ffc078', points: points(sample => sample.cpu.temperatureCelsius) }])
const networkSeries = computed(() => (['receiveBytesPerSecond', 'transmitBytesPerSecond'] as const).map((key, index) => ({
  label: index ? 'Envoi' : 'Réception', color: index ? 'orange' : '#70ffc5',
  points: points(sample => {
    const iface = sample.network.status === 'available' ? sample.network.interfaces.find(value => value.id === interfaceId.value) : undefined
    const rate = iface?.state !== 'down' ? iface?.[key] : null
    return rate == null ? null : rate * 8 / 1_000_000
  }),
})))
async function load() {
  const current = ++requestId
  ++detailRequestId
  loading.value = true; error.value = ''; day.value = null; detail.value = null; detailError.value = ''; detailLoading.value = false; page.value = 0
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value)) throw new Error('Date invalide')
    const start = new Date(`${date.value}T00:00:00`)
    const end = new Date(start); end.setDate(end.getDate() + 1)
    const result = await $fetch<HistoryDay>('/api/system/history', { query: { from: start.toISOString(), to: end.toISOString() } })
    if (current !== requestId) return
    day.value = result
    if (!interfaces.value.some(iface => iface.id === interfaceId.value)) interfaceId.value = interfaces.value[0]?.id || ''
  } catch { if (current === requestId) error.value = 'Impossible de charger l’historique. Vérifie la date et la disponibilité du backend, puis réessaie.' }
  finally { if (current === requestId) loading.value = false }
}
function moveDay(offset: number) {
  const next = new Date(`${date.value}T12:00:00`); next.setDate(next.getDate() + offset)
  date.value = localDate(next); void load()
}
async function showDetail(id: string) {
  const current = ++detailRequestId
  detailLoading.value = true; detailError.value = ''; detail.value = null
  try { const value = await $fetch<HistoryDetail>(`/api/system/history/${id}`); if (current === detailRequestId) detail.value = value }
  catch { if (current === detailRequestId) detailError.value = 'Impossible de charger ce relevé.' }
  finally { if (current === detailRequestId) detailLoading.value = false }
}
function download() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(day.value, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = url; link.download = `atlas-historique-${date.value}.json`; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
onMounted(() => { today.value = localDate(new Date()); date.value = today.value; timezone.value = Intl.DateTimeFormat().resolvedOptions().timeZone; void load() })
onBeforeUnmount(() => { ++requestId; ++detailRequestId })
</script>

<style scoped>
.history { display: flex; flex-direction: column; gap: 24px; }
.history .pannel { margin: 0; min-height: 0; min-width: 0; }
.heading { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
a { color: cyan; } label { display: block; margin-bottom: 10px; }
.controls { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
button, input, select { color: white; background: #222; border: 1px solid #555; border-radius: 8px; padding: 10px; font: inherit; color-scheme: dark; }
button { cursor: pointer; } button:disabled { opacity: .45; cursor: default; }
.summaries { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.summaries strong { color: cyan; font-size: 30px; }
.charts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.error { border-color: #bd6666; } .table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap; }
th, td { padding: 12px; border-bottom: 1px solid #333; font-variant-numeric: tabular-nums; }
.pagination { margin-top: 20px; } .detail { margin-top: 24px; border-top: 1px solid #444; padding-top: 16px; }
pre { max-height: 500px; overflow: auto; padding: 16px; background: #151515; font-size: 12px; }
.core-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; }
.interface-detail { border-bottom: 1px solid #333; padding: 12px 0; overflow-wrap: anywhere; }
details { margin: 20px 0; } summary { cursor: pointer; }
select { width: 100%; margin-bottom: 16px; }
@media (max-width: 1100px) { .charts { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .summaries { grid-template-columns: 1fr; } .history { padding: 20px; } }
</style>
