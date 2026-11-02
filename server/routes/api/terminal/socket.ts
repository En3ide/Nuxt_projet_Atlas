import { terminalRuntime, isLocalOrigin } from '../../../utils/terminal-runtime.mjs'

export default defineWebSocketHandler({
  upgrade(request) {
    const origin = request.headers.get('origin') || ''
    if (!isLocalOrigin(origin) || origin !== new URL(request.url).origin) return new Response('Accès refusé.', { status: 403 })
  },
  open(peer) { terminalRuntime.open(peer) },
  message(peer, message) { return terminalRuntime.message(peer, message.text()) },
  close(peer) { terminalRuntime.closed(peer) },
  error(peer) { terminalRuntime.closed(peer) },
})
