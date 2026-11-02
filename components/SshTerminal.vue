<template>
  <section class="terminal-shell">
    <header class="terminal-header">
      <div><h1>Terminal</h1><p>{{ target || 'Console du serveur Atlas' }}</p><span :class="['status', state]" role="status">{{ statusText }}</span></div>
      <div class="actions">
        <button type="button" :disabled="state === 'connecting' || state === 'connected' || !initialized" @click="connect">{{ state === 'disconnected' || state === 'error' ? 'Reconnecter' : 'Connecter' }}</button>
        <button type="button" :disabled="state !== 'connected' && state !== 'connecting'" @click="disconnect">Déconnecter</button>
        <button type="button" :disabled="!initialized" @click="clear">Effacer l’écran</button>
      </div>
    </header>
    <p v-if="error" class="terminal-error" role="alert">{{ error }}</p>
    <div ref="terminalRef" class="ssh-terminal" aria-label="Console interactive du serveur" />
    <p class="terminal-help">Entrée : exécuter · ↑/↓ : historique · Tab : compléter · Ctrl+C : interrompre · exit : fermer la session</p>
  </section>
</template>

<script setup lang="ts">
import type { Terminal } from '@xterm/xterm'
import type { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

type State = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'
const terminalRef = ref<HTMLDivElement | null>(null)
const initialized = ref(false)
const state = ref<State>('idle')
const target = ref('')
const error = ref('')
const statusText = computed(() => ({ idle: 'Initialisation…', connecting: 'Connexion…', connected: 'Connecté', disconnected: 'Déconnecté', error: 'Connexion impossible' }[state.value]))
let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let socket: WebSocket | null = null
let observer: ResizeObserver | null = null
let heartbeat: ReturnType<typeof setInterval> | undefined
let connectionTimeout: ReturnType<typeof setTimeout> | undefined
let generation = 0
let destroyed = false
let resizeFrame = 0

function send(payload: unknown) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload)) }
function fit() {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(() => {
    if (!destroyed && terminalRef.value?.clientWidth && terminalRef.value.clientHeight) fitAddon?.fit()
  })
}
function stopTimers() { clearInterval(heartbeat); clearTimeout(connectionTimeout) }

async function connect() {
  if (!term || destroyed || state.value === 'connecting' || state.value === 'connected') return
  const current = ++generation
  socket?.close(); socket = null; stopTimers()
  state.value = 'connecting'; error.value = ''; term.options.disableStdin = true
  term.reset()
  try {
    const session = await $fetch<{ ticket: string; label: string }>('/api/terminal/session', {
      method: 'POST', headers: { 'x-atlas-terminal': '1' }, body: {}, timeout: 10_000,
    })
    if (destroyed || current !== generation) return
    target.value = session.label
    const url = new URL('/api/terminal/socket', window.location.href)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    const connection = new WebSocket(url)
    socket = connection
    connectionTimeout = setTimeout(() => {
      if (current !== generation) return
      error.value = 'Le serveur ne répond pas. Réessaie la connexion.'; state.value = 'error'; connection.close()
    }, 20_000)
    connection.onopen = () => {
      if (destroyed || current !== generation) { connection.close(); return }
      fitAddon?.fit()
      send({ type: 'start', ticket: session.ticket, cols: Math.min(500, Math.max(2, term!.cols)), rows: Math.min(200, Math.max(2, term!.rows)) })
    }
    connection.onmessage = event => {
      if (destroyed || current !== generation || !term) return
      let message
      try { message = JSON.parse(event.data) } catch { return }
      if (message.type === 'output' && typeof message.data === 'string') term.write(message.data)
      else if (message.type === 'ready') {
        clearTimeout(connectionTimeout); state.value = 'connected'; term.options.disableStdin = false
        term.focus(); fit()
        heartbeat = setInterval(() => send({ type: 'ping' }), 30_000)
      } else if (message.type === 'error') { error.value = message.message; state.value = 'error'; term.options.disableStdin = true }
      else if (message.type === 'exit') term.writeln(`\r\nSession terminée${message.exitCode === null ? '' : ` (code ${message.exitCode})`}.`)
    }
    connection.onerror = () => {
      if (destroyed || current !== generation) return
      error.value = 'Connexion au terminal impossible. Vérifie que le site est ouvert sur localhost et que le serveur est démarré.'
      state.value = 'error'
    }
    connection.onclose = () => {
      if (destroyed || current !== generation) return
      stopTimers()
      if (state.value === 'connecting') { error.value = 'La connexion a été refusée ou a expiré. Réessaie.'; state.value = 'error' }
      else if (state.value !== 'error') state.value = 'disconnected'
      if (term) term.options.disableStdin = true
      socket = null
    }
  } catch (cause: unknown) {
    if (destroyed || current !== generation) return
    const failure = cause as { data?: { message?: string } }
    error.value = failure.data?.message || 'Impossible d’ouvrir une session sur le serveur.'
    state.value = 'error'
  }
}

function disconnect() {
  ++generation; stopTimers(); socket?.close(); socket = null
  state.value = 'disconnected'; error.value = ''
  if (term) { term.options.disableStdin = true; term.writeln('\r\nSession déconnectée.') }
}
function clear() { term?.clear(); term?.focus() }

onMounted(async () => {
  try {
    const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')])
    if (destroyed || !terminalRef.value) return
    term = new Terminal({
      cursorBlink: true, disableStdin: true, fontSize: 14, fontFamily: 'Consolas, monospace', scrollback: 5000,
      theme: { background: '#0a0a0a', foreground: '#eeeeee', cursor: '#70ffc5', selectionBackground: '#36534a' },
    })
    fitAddon = new FitAddon(); term.loadAddon(fitAddon); term.open(terminalRef.value); fitAddon.fit()
    term.onData(data => {
      if (state.value !== 'connected') return
      for (let offset = 0; offset < data.length; offset += 8192) send({ type: 'input', data: data.slice(offset, offset + 8192) })
    })
    term.onResize(({ cols, rows }) => { if (state.value === 'connected') send({ type: 'resize', cols: Math.min(500, Math.max(2, cols)), rows: Math.min(200, Math.max(2, rows)) }) })
    observer = new ResizeObserver(fit); observer.observe(terminalRef.value)
    initialized.value = true
    await connect()
  } catch { if (!destroyed) { error.value = 'Impossible d’initialiser le terminal.'; state.value = 'error' } }
})

onBeforeUnmount(() => {
  destroyed = true; ++generation; stopTimers(); cancelAnimationFrame(resizeFrame)
  observer?.disconnect(); socket?.close(); socket = null; term?.dispose(); term = null
})
</script>

<style scoped>
.terminal-shell { background: #0a0a0a; color: white; }
.terminal-header { padding: 24px; display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }
.terminal-header h1 { margin: 0 0 8px; font-size: 24px; }
.terminal-header p { margin: 0 0 12px; color: #bbb; overflow-wrap: anywhere; }
.status { font-size: 13px; color: #bbb; } .status.connected { color: #70ffc5; } .status.error { color: #ffb9b4; }
.actions { display: flex; gap: 10px; flex-wrap: wrap; }
button { font: inherit; border: 1px solid #555; border-radius: 8px; padding: 10px 14px; background: #222; color: white; cursor: pointer; }
button:disabled { opacity: .4; cursor: default; }
.terminal-error { padding: 12px 24px; color: #ffb9b4 !important; background: #ff5f5614; overflow-wrap: anywhere; }
.ssh-terminal { width: 100%; height: 65vh; min-height: 320px; padding: 12px; box-sizing: border-box; overflow: hidden; }
.terminal-help { margin: 0; padding: 16px 24px; font-size: 12px; color: #aaa !important; border-top: 1px solid #252525; }
</style>
