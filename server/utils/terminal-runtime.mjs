import { randomBytes, createHash } from 'node:crypto'
import { hostname } from 'node:os'
import { access, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pty from 'node-pty'
import ssh2 from 'ssh2'

const MAX_SESSIONS = 4
const IDLE_MS = 30 * 60_000

export function isLocalAddress(address) {
  return address === '::1' || address === '127.0.0.1' || address === '::ffff:127.0.0.1'
}

export function isLocalOrigin(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && url.origin === value
  } catch { return false }
}

function dimensions(message) {
  if (!Number.isInteger(message.cols) || message.cols < 2 || message.cols > 500 || !Number.isInteger(message.rows) || message.rows < 2 || message.rows > 200) {
    throw new Error('Dimensions du terminal invalides.')
  }
  return { cols: message.cols, rows: message.rows }
}

export class TerminalRuntime {
  sessions = new Map()
  tickets = new Map()

  constructor(env = process.env) { this.env = env }

  target() {
    if (this.env.TERMINAL_ENABLED === 'false') throw new Error('Le terminal est désactivé sur ce serveur.')
    const mode = this.env.TERMINAL_MODE || 'local'
    if (mode === 'local') return { mode, label: `${process.platform === 'win32' ? 'PowerShell' : 'Shell'} · ${hostname()}` }
    if (mode !== 'ssh') throw new Error('TERMINAL_MODE doit être local ou ssh.')
    if (!this.env.SSH_HOST || !this.env.SSH_USERNAME || (!this.env.SSH_PASSWORD && !this.env.SSH_PRIVATE_KEY_PATH)) {
      throw new Error('Configurer SSH_HOST, SSH_USERNAME et SSH_PASSWORD ou SSH_PRIVATE_KEY_PATH sur le serveur.')
    }
    if (!/^SHA256:[A-Za-z0-9+/]{43}$/.test(this.env.SSH_HOST_FINGERPRINT || '')) {
      throw new Error('Configurer SSH_HOST_FINGERPRINT avec l’empreinte SHA256 du serveur SSH.')
    }
    const port = Number(this.env.SSH_PORT || 22)
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SSH_PORT invalide.')
    return { mode, label: `SSH · ${this.env.SSH_HOST}` }
  }

  ticket(origin) {
    if (!isLocalOrigin(origin)) throw new Error('Le terminal est accessible depuis localhost uniquement.')
    const target = this.target()
    for (const [token, value] of this.tickets) if (value.expiresAt <= Date.now()) this.tickets.delete(token)
    if (this.sessions.size >= MAX_SESSIONS || this.tickets.size >= 16) throw new Error('Trop de sessions ouvertes. Fermer un terminal puis réessayer.')
    const token = randomBytes(32).toString('base64url')
    this.tickets.set(token, { origin, expiresAt: Date.now() + 30_000 })
    return { ticket: token, ...target }
  }

  open(peer) {
    const localTransport = isLocalAddress(peer.remoteAddress) || (this.env.NODE_ENV === 'development' && peer.remoteAddress === undefined)
    if (!localTransport || !isLocalOrigin(peer.request.headers.get('origin')) || this.sessions.size >= MAX_SESSIONS) {
      peer.close(1008, 'Accès local uniquement ou limite de sessions atteinte.')
      return
    }
    const session = { peer, ready: false, starting: false, stop: () => {} }
    this.sessions.set(peer.id, session)
    session.timer = setTimeout(() => this.fail(session, 'La connexion au terminal a expiré.'), 5000)
    session.timer.unref()
  }

  send(session, payload) {
    if (!this.sessions.has(session.peer.id)) return
    // Interrompre un producteur trop rapide plutôt que remplir indéfiniment la RAM.
    if ((session.peer.websocket?.bufferedAmount || 0) > 1024 * 1024) {
      this.closeSession(session, 1008, 'Le terminal ne reçoit plus la sortie.')
      return
    }
    try { session.peer.send(JSON.stringify(payload)) } catch { this.closeSession(session) }
  }

  touch(session) {
    clearTimeout(session.timer)
    session.timer = setTimeout(() => this.fail(session, 'Session fermée après 30 minutes d’inactivité.'), IDLE_MS)
    session.timer.unref()
  }

  async message(peer, text) {
    const session = this.sessions.get(peer.id)
    if (!session) return
    try {
      if (typeof text !== 'string' || Buffer.byteLength(text) > 65_536) throw new Error('Message trop volumineux.')
      const message = JSON.parse(text)
      if (!message || typeof message !== 'object') throw new Error('Message invalide.')
      if (message.type === 'start' && !session.starting) {
        session.starting = true
        const ticket = this.tickets.get(message.ticket)
        this.tickets.delete(message.ticket)
        if (!ticket || ticket.expiresAt <= Date.now() || ticket.origin !== peer.request.headers.get('origin')) throw new Error('Connexion expirée ou refusée. Reconnecter le terminal.')
        const size = dimensions(message)
        const target = this.target()
        clearTimeout(session.timer)
        session.timer = setTimeout(() => this.fail(session, 'Délai de connexion dépassé.'), 15_000)
        session.timer.unref()
        if (target.mode === 'ssh') await this.startSsh(session, size)
        else await this.startLocal(session, size)
        if (!this.sessions.has(peer.id)) return
        session.ready = true
        this.touch(session)
        this.send(session, { type: 'ready', ...target })
      } else if (message.type === 'input' && session.ready && typeof message.data === 'string') {
        this.touch(session)
        session.write(message.data)
      } else if (message.type === 'resize' && session.ready) {
        session.resize(dimensions(message))
      } else if (message.type === 'ping') {
        this.send(session, { type: 'pong' })
      } else { throw new Error('Message inattendu pour cette session.') }
    } catch (error) { this.fail(session, error.message || 'Erreur du terminal.') }
  }

  async startLocal(session, size) {
    const cwd = resolve(this.env.TERMINAL_CWD || process.cwd())
    await access(cwd)
    if (!this.sessions.has(session.peer.id)) return
    const shell = this.env.TERMINAL_SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/bash')
    const args = process.platform === 'win32' ? ['-NoLogo', '-NoProfile'] : ['--login']
    const env = Object.fromEntries(Object.entries(process.env).filter(([name, value]) => value !== undefined && !/^(NUXT_|DATABASE_|SSH_|ATLAS_|TERMINAL_)/i.test(name)))
    const terminal = pty.spawn(shell, args, { ...size, cwd, env: { ...env, TERM: 'xterm-256color', COLORTERM: 'truecolor' }, name: 'xterm-256color' })
    session.write = data => terminal.write(data)
    session.resize = size => terminal.resize(size.cols, size.rows)
    const output = terminal.onData(data => this.send(session, { type: 'output', data }))
    const exit = terminal.onExit(event => {
      this.send(session, { type: 'exit', exitCode: event.exitCode })
      this.closeSession(session, 1000, 'Shell fermé.')
    })
    session.stop = () => { output.dispose(); exit.dispose(); try { terminal.kill() } catch {} }
  }

  async startSsh(session, size) {
    const connection = new ssh2.Client()
    let channel
    session.stop = () => { channel?.close(); connection.end(); connection.destroy() }
    const privateKey = this.env.SSH_PRIVATE_KEY_PATH ? await readFile(resolve(this.env.SSH_PRIVATE_KEY_PATH)) : undefined
    if (!this.sessions.has(session.peer.id)) return
    await new Promise((resolvePromise, reject) => {
      connection.on('error', error => {
        const message = error.level === 'client-authentication' ? 'Authentification SSH refusée. Vérifier les identifiants du serveur.' : 'Connexion SSH impossible. Vérifier l’adresse, le port et l’empreinte du serveur.'
        reject(new Error(message))
        if (session.ready) this.fail(session, message)
      })
      connection.on('close', () => {
        reject(new Error('Connexion SSH fermée.'))
        this.closeSession(session, 1000, 'Connexion SSH fermée.')
      })
      connection.on('ready', () => connection.shell({ term: 'xterm-256color', ...size }, (error, stream) => {
        if (error) { reject(new Error('Impossible d’ouvrir le shell SSH.')); return }
        if (!this.sessions.has(session.peer.id)) { stream.close(); return }
        channel = stream
        session.write = data => stream.write(data)
        session.resize = size => stream.setWindow(size.rows, size.cols, 0, 0)
        stream.setEncoding('utf8')
        stream.stderr.setEncoding('utf8')
        stream.on('data', data => this.send(session, { type: 'output', data }))
        stream.stderr.on('data', data => this.send(session, { type: 'output', data }))
        stream.on('error', () => this.fail(session, 'Le shell SSH a rencontré une erreur.'))
        stream.on('close', () => { this.send(session, { type: 'exit', exitCode: null }); this.closeSession(session, 1000, 'Shell SSH fermé.') })
        resolvePromise()
      }))
      connection.connect({
        host: this.env.SSH_HOST, port: Number(this.env.SSH_PORT || 22), username: this.env.SSH_USERNAME,
        ...(privateKey ? { privateKey, passphrase: this.env.SSH_KEY_PASSPHRASE } : { password: this.env.SSH_PASSWORD }),
        hostVerifier: key => `SHA256:${createHash('sha256').update(key).digest('base64').replace(/=+$/, '')}` === this.env.SSH_HOST_FINGERPRINT,
        readyTimeout: 10_000, keepaliveInterval: 15_000, keepaliveCountMax: 3,
      })
    })
  }

  fail(session, message) {
    this.send(session, { type: 'error', message })
    this.closeSession(session, 1011, 'Session interrompue.')
  }

  closeSession(session, code = 1000, reason = 'Session fermée.') {
    if (!this.sessions.delete(session.peer.id)) return
    clearTimeout(session.timer)
    try { session.stop() } catch {}
    try { session.peer.close(code, reason) } catch {}
  }

  closed(peer) {
    const session = this.sessions.get(peer.id)
    if (session) this.closeSession(session)
  }

  close() {
    for (const session of this.sessions.values()) this.closeSession(session, 1001, 'Arrêt du serveur.')
    this.tickets.clear()
  }
}

export const terminalRuntime = new TerminalRuntime()
