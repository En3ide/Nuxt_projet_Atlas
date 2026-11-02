import { terminalRuntime, isLocalAddress, isLocalOrigin } from '../../utils/terminal-runtime.mjs'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const origin = getHeader(event, 'origin') || ''
  const requestOrigin = getRequestURL(event, { xForwardedHost: false, xForwardedProto: false }).origin
  const address = event.node.req.socket.remoteAddress
  // Nuxt dev relaie les requêtes au worker par un pipe local sans adresse IP.
  const localTransport = isLocalAddress(address) || (import.meta.dev && address === undefined)
  if (!localTransport || !isLocalOrigin(origin) || origin !== requestOrigin || getHeader(event, 'x-atlas-terminal') !== '1') {
    throw createError({ statusCode: 403, message: 'Le terminal est accessible depuis le site ouvert sur localhost uniquement.' })
  }
  try { return terminalRuntime.ticket(origin) }
  catch (error) { throw createError({ statusCode: 503, message: (error as Error).message }) }
})
