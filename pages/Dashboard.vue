<template>
  <div class="contenu dashboard">
    <section class="pannel dashboard-header">
      <div>
        <h1>Supervision du serveur</h1>
        <p>Mesures du serveur qui exécute Atlas Backend.</p>
        <NuxtLink to="/history" style="color: cyan">Consulter l’historique par jour →</NuxtLink>
        <p v-if="snapshot" class="server-info">{{ snapshot.server.hostname }} · {{ platformName }} {{ snapshot.server.release }} · {{ snapshot.server.arch }}</p>
      </div>
      <div class="update-info">
        <span :class="['state', { offline: !!error }]">{{ error ? 'Connexion interrompue' : pending ? 'Connexion…' : 'Actualisation toutes les 2 s' }}</span>
        <p v-if="snapshot">Dernière mesure : {{ lastUpdate }}</p>
      </div>
    </section>

    <p v-if="pending" class="pannel notice" role="status">Récupération des mesures du serveur…</p>
    <div v-else-if="error" class="pannel notice failure" role="alert">
      <p>{{ error }}</p>
      <p v-if="snapshot">Les informations ci-dessous correspondent à la dernière mesure reçue.</p>
      <button type="button" @click="refresh()">Réessayer maintenant</button>
    </div>

    <template v-if="snapshot">
      <section class="pannel processor-info">
        <h2>{{ snapshot.cpu.model || 'Processeur non identifié' }}</h2>
        <p>{{ snapshot.cpu.manufacturer || 'Constructeur non disponible' }} · {{ snapshot.cpu.physicalCores ?? '—' }} cœurs physiques · {{ snapshot.cpu.logicalCores }} processeurs logiques</p>
        <p>Serveur démarré depuis {{ uptime }}.</p>
      </section>

      <div class="cpu-summary">
        <section class="pannel metric">
          <h2>Charge CPU</h2>
          <strong data-testid="cpu-usage">{{ format(snapshot.cpu.usagePercent) }}<small v-if="snapshot.cpu.usagePercent !== null"> %</small></strong>
          <p>{{ snapshot.cpu.usagePercent === null ? 'En attente de deux relevés système.' : 'Ensemble des processeurs logiques.' }}</p>
        </section>
        <section class="pannel metric">
          <h2>Fréquence indiquée</h2>
          <strong data-testid="cpu-frequency">{{ snapshot.cpu.reportedFrequencyMhz === null ? '—' : format(snapshot.cpu.reportedFrequencyMhz / 1000, 2) }}<small v-if="snapshot.cpu.reportedFrequencyMhz !== null"> GHz</small></strong>
          <p>{{ snapshot.server.platform === 'win32' ? 'Fréquence nominale annoncée par Windows ; le turbo n’est pas mesuré.' : 'Moyenne des fréquences exposées par le système.' }}</p>
        </section>
        <section class="pannel metric">
          <h2>Température CPU</h2>
          <strong data-testid="cpu-temperature">{{ format(snapshot.cpu.temperature.celsius) }}<small v-if="snapshot.cpu.temperature.celsius !== null"> °C</small></strong>
          <p>{{ snapshot.cpu.temperature.status === 'pending' ? 'Recherche des capteurs…' : snapshot.cpu.temperature.celsius === null ? 'Capteur non disponible sur ce serveur.' : `Source : ${snapshot.cpu.temperature.source}` }}</p>
        </section>
      </div>

      <div class="cpu-charts">
        <section class="pannel">
          <h2>Utilisation du processeur</h2>
          <p class="chart-caption">60 dernières mesures de cette session.</p>
          <CPUChart :samples="history" />
        </section>
        <section class="pannel">
          <h2>Température du processeur</h2>
          <template v-if="hasTemperatureHistory">
            <p class="chart-caption">Sonde interrogée toutes les 10 secondes.</p>
            <TemperatureChart :samples="history" />
            <p v-if="snapshot.cpu.temperature.reason" class="sensor-message">{{ snapshot.cpu.temperature.reason }}</p>
          </template>
          <div v-else class="temperature-empty" role="status">
            <span class="material-icons" aria-hidden="true">thermostat</span>
            <p>{{ snapshot.cpu.temperature.status === 'pending' ? 'Recherche d’un capteur CPU…' : 'Température non disponible' }}</p>
            <p class="sensor-message">{{ snapshot.cpu.temperature.reason || 'La mesure apparaîtra dès qu’un capteur CPU sera accessible.' }}</p>
          </div>
        </section>
      </div>

      <section class="pannel cores-panel">
        <h2>Charge par processeur logique</h2>
        <div v-if="snapshot.cpu.cores.length" class="core-grid">
          <div v-for="core in snapshot.cpu.cores" :key="core.index" class="core-row">
            <label :for="`cpu-core-${core.index}`">CPU {{ core.index + 1 }}</label>
            <progress :id="`cpu-core-${core.index}`" max="100" :value="core.usagePercent ?? undefined" />
            <span>{{ format(core.usagePercent) }}{{ core.usagePercent === null ? '' : ' %' }}</span>
          </div>
        </div>
        <p v-else>Aucun compteur CPU exposé par ce système.</p>
      </section>
    </template>

    <div v-if="snapshot" class="resource-panels">
      <section class="pannel memory-panel">
        <h2>Mémoire RAM</h2>
        <template v-if="snapshot.memory.status === 'available'">
          <div class="memory-numbers">
            <div><span>Utilisée</span><strong data-testid="ram-used">{{ bytes(snapshot.memory.usedBytes) }}</strong></div>
            <div><span>Disponible</span><strong data-testid="ram-available">{{ bytes(snapshot.memory.availableBytes) }}</strong></div>
            <div><span>Total utilisable</span><strong data-testid="ram-total">{{ bytes(snapshot.memory.totalBytes) }}</strong></div>
          </div>
          <p class="chart-caption">{{ format(snapshot.memory.usedPercent) }} % utilisés. La mémoire disponible inclut le cache récupérable sous Linux.</p>
          <RamChart v-if="snapshot.memory.usedBytes !== null && snapshot.memory.availableBytes !== null" :used-bytes="snapshot.memory.usedBytes" :available-bytes="snapshot.memory.availableBytes" />
        </template>
        <p v-else role="status">{{ snapshot.memory.status === 'pending' ? 'Lecture de la mémoire…' : snapshot.memory.reason }}</p>
      </section>

      <section class="pannel network-panel">
        <h2>Trafic réseau du serveur</h2>
        <p v-if="snapshot.network.status !== 'available'" role="status">{{ snapshot.network.status === 'pending' ? 'Recherche des interfaces réseau…' : snapshot.network.reason }}</p>
        <template v-else-if="networkInterfaces.length">
          <label for="network-interface">Interface réseau</label>
          <select id="network-interface" v-model="selectedInterface">
            <option v-for="iface in networkInterfaces" :key="iface.id" :value="iface.id">{{ iface.name }}{{ iface.default ? ' — par défaut' : '' }}{{ iface.virtual ? ' — virtuelle' : '' }}{{ iface.state === 'down' ? ' — déconnectée' : '' }}</option>
          </select>
          <template v-if="activeInterface">
            <p class="interface-info"><span :class="['interface-state', { disconnected: activeInterface.state === 'down' }]">{{ activeInterface.state === 'up' ? 'Connectée' : activeInterface.state === 'down' ? 'Déconnectée' : 'État non exposé' }}</span> {{ activeInterface.ipv4.join(', ') || activeInterface.ipv6[0] || 'Aucune adresse IP exposée' }}</p>
            <div class="network-numbers">
              <div><span>↓ Réception</span><strong data-testid="network-receive">{{ rate(activeInterface.receiveBytesPerSecond) }}</strong></div>
              <div><span>↑ Envoi</span><strong data-testid="network-transmit">{{ rate(activeInterface.transmitBytesPerSecond) }}</strong></div>
            </div>
            <p v-if="activeInterface.state === 'down'" class="chart-caption">Cette interface est déconnectée. Choisissez une interface active pour suivre son trafic.</p>
            <p v-else-if="activeInterface.receiveBytesPerSecond === null || activeInterface.transmitBytesPerSecond === null" class="chart-caption">Débits en attente de deux compteurs valides, ou compteurs non exposés par cette interface.</p>
            <NetworkChart :samples="networkHistory" />
            <p class="chart-caption">Trafic de cette interface, sans additionner les interfaces virtuelles. {{ activeInterface.speedMbps === null ? '' : `Vitesse de liaison : ${format(activeInterface.speedMbps)} Mbit/s.` }}</p>
            <p class="chart-caption">Cumul des compteurs : {{ bytes(activeInterface.receivedBytes) }} reçus · {{ bytes(activeInterface.transmittedBytes) }} envoyés. Débits en Mbit/s, sans test de vitesse Internet.</p>
          </template>
        </template>
        <p v-else>Aucune interface réseau externe détectée.</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NetworkHistorySample } from '~/types/system'

const { snapshot, history, pending, error, refresh } = useSystemMetrics()
const selectedInterface = ref('')
const networkInterfaces = computed(() => [...(snapshot.value?.network.interfaces || [])].sort((a, b) => Number(b.default) - Number(a.default) || Number(b.state === 'up') - Number(a.state === 'up') || Number(a.virtual) - Number(b.virtual) || a.name.localeCompare(b.name)))
watch(networkInterfaces, (interfaces) => {
  if (!interfaces.some(iface => iface.id === selectedInterface.value)) {
    selectedInterface.value = (interfaces.find(iface => iface.default && iface.state !== 'down') || interfaces.find(iface => iface.state === 'up' && !iface.virtual) || interfaces[0])?.id || ''
  }
}, { immediate: true })
const activeInterface = computed(() => networkInterfaces.value.find(iface => iface.id === selectedInterface.value))
const networkHistory = computed<NetworkHistorySample[]>(() => {
  const samples: NetworkHistorySample[] = []
  for (const sample of history.value) {
    const network = sample.network
    const timestamp = network?.sampledAt || sample.sampledAt
    if (samples.at(-1)?.sampledAt === timestamp) continue
    const iface = network?.status === 'available' ? network.interfaces.find(iface => iface.id === selectedInterface.value) : undefined
    samples.push({ sampledAt: timestamp, receiveBytesPerSecond: iface?.receiveBytesPerSecond ?? null, transmitBytesPerSecond: iface?.transmitBytesPerSecond ?? null })
  }
  return samples
})
const platformName = computed(() => ({ win32: 'Windows', linux: 'Linux', darwin: 'macOS' }[snapshot.value?.server.platform || ''] || snapshot.value?.server.platform))
const lastUpdate = computed(() => snapshot.value ? new Date(snapshot.value.sampledAt).toLocaleTimeString('fr-FR') : '')
const hasTemperatureHistory = computed(() => history.value.some(sample => sample.temperatureCelsius !== null))
const uptime = computed(() => {
  const seconds = snapshot.value?.server.uptimeSeconds || 0
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor(seconds % 86400 / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  return `${days ? `${days} j ` : ''}${hours} h ${minutes} min`
})
function format(value: number | null, digits = 1) {
  return value === null ? '—' : value.toLocaleString('fr-FR', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}
function bytes(value: number | null) {
  if (value === null) return '—'
  if (value >= 1024 ** 3) return `${format(value / 1024 ** 3, 2)} Gio`
  if (value >= 1024 ** 2) return `${format(value / 1024 ** 2, 2)} Mio`
  if (value >= 1024) return `${format(value / 1024, 2)} Kio`
  return `${value} o`
}
function rate(value: number | null) {
  return value === null ? '—' : `${format(value * 8 / 1_000_000, 3)} Mbit/s`
}
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 24px; }
.dashboard .pannel { margin: 0; min-width: 0; min-height: 0; }
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.dashboard-header h1 { margin-bottom: 10px; }
.dashboard-header p, .processor-info p { margin: 6px 0; }
.server-info { overflow-wrap: anywhere; font-family: monospace; }
.update-info { flex-shrink: 0; text-align: right; font-size: 12px; }
.state { display: inline-block; color: #70ffc5; padding: 8px 12px; border-radius: 10px; background: rgba(0,255,120,.08); }
.state.offline { color: #ffb9b4; background: rgba(255,95,86,.1); }
.notice.failure { border-color: #a9534e; }
button { padding: 10px 14px; border: 1px solid #555; border-radius: 10px; background: #252525; color: white; font: inherit; cursor: pointer; }
.cpu-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.metric h2 { font-size: 16px; color: #bbb; }
.metric strong { display: block; font-size: 36px; font-variant-numeric: tabular-nums; color: cyan; }
.metric small { font-size: 18px; font-weight: normal; }
.metric p, .chart-caption { font-size: 13px; }
.cpu-charts, .resource-panels { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
.chart-caption { margin-bottom: 16px; }
.temperature-empty { min-height: 280px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
.temperature-empty .material-icons { font-size: 42px; color: #888; }
.temperature-empty p { margin: 8px 0; }
.sensor-message { font-size: 13px; max-width: 540px; color: #bbb; }
.core-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 32px; }
.core-row { display: grid; grid-template-columns: 55px minmax(0, 1fr) 65px; align-items: center; gap: 12px; font-size: 13px; }
.core-row span { text-align: right; font-variant-numeric: tabular-nums; }
progress { width: 100%; height: 10px; accent-color: cyan; }
.memory-numbers, .network-numbers { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 20px 0; }
.network-numbers { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.memory-numbers span, .network-numbers span { display: block; font-size: 12px; color: #bbb; margin-bottom: 8px; }
.memory-numbers strong, .network-numbers strong { color: cyan; font-size: 19px; font-variant-numeric: tabular-nums; }
.network-panel label { display: block; font-size: 13px; margin-bottom: 8px; }
.network-panel select { width: 100%; padding: 10px; border: 1px solid #555; border-radius: 8px; background: #191919; color: white; font: inherit; }
.interface-info { overflow-wrap: anywhere; font-size: 13px; }
.interface-state { color: #70ffc5; margin-right: 8px; }
.interface-state.disconnected { color: #ffb9b4; }
@media (max-width: 1100px) { .cpu-charts, .resource-panels { grid-template-columns: 1fr; } .dashboard-header { flex-direction: column; } .update-info { text-align: left; } }
@media (max-width: 768px) { .cpu-summary, .core-grid { grid-template-columns: 1fr; } .processor-info h2 { font-size: 18px; overflow-wrap: anywhere; } .core-row { gap: 8px; } }
@media (max-width: 600px) { .memory-numbers, .network-numbers { grid-template-columns: 1fr; } }
</style>
