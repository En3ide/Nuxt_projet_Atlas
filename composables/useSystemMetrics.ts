import type { SystemHistorySample, SystemSnapshot } from '~/types/system'

export function useSystemMetrics() {
  const snapshot = ref<SystemSnapshot | null>(null)
  const history = ref<SystemHistorySample[]>([])
  const pending = ref(true)
  const error = ref('')
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  let disposed = false
  let inFlight = false
  let lastSample = ''
  let lastAdvancedAt = 0

  function append(sample: SystemHistorySample) {
    history.value = [...history.value.slice(-59), sample]
  }

  async function refresh() {
    if (disposed || inFlight) return
    clearTimeout(timer)
    inFlight = true
    controller = new AbortController()
    try {
      const data = await $fetch<SystemSnapshot>('/api/system/metrics', { signal: controller.signal, timeout: 8000, retry: 0 })
      if (disposed) return
      if (!Number.isFinite(Date.parse(data.sampledAt))) throw new Error('Horodatage invalide')
      if (data.sampledAt !== lastSample) lastAdvancedAt = Date.now()
      if (Date.now() - lastAdvancedAt > 10_000) throw new Error('Les mesures ne sont plus actualisées')
      snapshot.value = data
      error.value = ''
      if (data.sampledAt !== lastSample) {
        append({ sampledAt: data.sampledAt, usagePercent: data.cpu.usagePercent, temperatureCelsius: data.cpu.temperature.celsius, network: data.network })
        lastSample = data.sampledAt
      }
    } catch {
      if (disposed) return
      if (!error.value && history.value.length) {
        append({ sampledAt: new Date().toISOString(), usagePercent: null, temperatureCelsius: null, network: null })
      }
      error.value = 'Les mesures du serveur sont indisponibles. Nouvelle tentative automatique dans quelques secondes.'
    } finally {
      inFlight = false
      pending.value = false
      if (!disposed) timer = setTimeout(tick, 2000)
    }
  }

  function tick() {
    if (disposed) return
    if (!document.hidden) void refresh()
    else timer = setTimeout(tick, 2000)
  }

  function onVisibilityChange() {
    if (!document.hidden) void refresh()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    void refresh()
  })
  onBeforeUnmount(() => {
    disposed = true
    clearTimeout(timer)
    controller?.abort()
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return { snapshot, history, pending, error, refresh }
}
