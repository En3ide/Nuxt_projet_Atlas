import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { randomUUID, generateKeyPairSync, createHash } from 'node:crypto'
import ssh2 from 'ssh2'
import { TerminalRuntime, isLocalAddress, isLocalOrigin } from '../server/utils/terminal-runtime.mjs'

const origin = 'http://localhost:3000'
function peer(address = '127.0.0.1', source = origin) {
  const events = new EventEmitter()
  return {
    id: randomUUID(), remoteAddress: address, request: { url: origin + '/api/terminal/socket', headers: new Headers({ origin: source }) },
    messages: [], websocket: { bufferedAmount: 0 },
    send(text) { this.messages.push(JSON.parse(text)); events.emit('update') },
    close(code, reason) { this.closed = { code, reason }; events.emit('update') },
    output() { return this.messages.filter(message => message.type === 'output').map(message => message.data).join('').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '') },
    waitFor(check, timeout = 15_000) {
      if (check()) return Promise.resolve()
      return new Promise((resolve, reject) => {
        const finish = () => { clearTimeout(timer); events.off('update', update) }
        const update = () => { if (check()) { finish(); resolve() } }
        const timer = setTimeout(() => { finish(); reject(new Error('Attente expirée : ' + JSON.stringify(this.messages.filter(message => message.type !== 'output')) + '\n' + this.output().slice(-1200))) }, timeout)
        events.on('update', update)
      })
    },
  }
}
async function start(runtime, client) {
  const { ticket } = runtime.ticket(origin)
  runtime.open(client)
  await runtime.message(client, JSON.stringify({ type: 'start', ticket, cols: 90, rows: 24 }))
}
const input = (runtime, client, data) => runtime.message(client, JSON.stringify({ type: 'input', data }))

test('le vrai shell conserve son état, exécute les commandes, se redimensionne et accepte Ctrl+C', { timeout: 30_000 }, async t => {
  const runtime = new TerminalRuntime({ TERMINAL_MODE: 'local' })
  t.after(() => runtime.close())
  const client = peer()
  await start(runtime, client)
  assert.ok(client.messages.some(message => message.type === 'ready'))
  const command = process.platform === 'win32' ? "Write-Output ('BOOT_' + 'OK')\r" : "printf 'BOOT_%s\\n' OK\r"
  await input(runtime, client, command)
  await client.waitFor(() => client.output().includes('BOOT_OK'))
  const setVariable = process.platform === 'win32' ? "$atlasTest = 'PERSIST_' + 'OK'\r" : "atlasTest=PERSIST_$(printf OK)\r"
  await input(runtime, client, setVariable)
  await input(runtime, client, process.platform === 'win32' ? 'Write-Output $atlasTest\r' : 'echo "$atlasTest"\r')
  await client.waitFor(() => client.output().includes('PERSIST_OK'))
  await runtime.message(client, JSON.stringify({ type: 'resize', cols: 106, rows: 32 }))
  await input(runtime, client, process.platform === 'win32' ? "Write-Output ('COLS_' + $Host.UI.RawUI.WindowSize.Width)\r" : "printf 'COLS_%s\\n' $(tput cols)\r")
  await client.waitFor(() => client.output().includes('COLS_106'))
  await input(runtime, client, process.platform === 'win32' ? "Write-Output ('SLEEP_' + 'START'); Start-Sleep -Seconds 30\r" : "printf 'SLEEP_%s\\n' START; sleep 30\r")
  await client.waitFor(() => client.output().includes('SLEEP_START'))
  const beforeInterrupt = client.output().length
  await input(runtime, client, '\x03')
  await client.waitFor(() => /PS |[$#] /.test(client.output().slice(beforeInterrupt)))
  await input(runtime, client, process.platform === 'win32' ? "Write-Output ('INTERRUPT_' + 'OK')\r" : "printf 'INTERRUPT_%s\\n' OK\r")
  await client.waitFor(() => client.output().includes('INTERRUPT_OK'))
  await input(runtime, client, 'exit\r')
  await client.waitFor(() => !!client.closed)
  assert.equal(runtime.sessions.size, 0)
  assert.ok(client.messages.some(message => message.type === 'exit'))
})

test('refuse origines externes, clients distants et tickets expirés ou réutilisés', async t => {
  assert.equal(isLocalAddress('192.168.1.10'), false)
  assert.equal(isLocalAddress('::ffff:127.0.0.1'), true)
  for (const value of ['http://localhost.evil.test:3000', 'http://192.168.1.2:3000', 'null', 'file://']) assert.equal(isLocalOrigin(value), false)
  const runtime = new TerminalRuntime()
  t.after(() => runtime.close())
  assert.throws(() => runtime.ticket('https://evil.test'))
  const remote = peer('192.168.1.10'); runtime.open(remote); assert.equal(remote.closed.code, 1008)
  const wrongOrigin = peer('127.0.0.1', 'https://evil.test'); runtime.open(wrongOrigin); assert.equal(wrongOrigin.closed.code, 1008)
  const { ticket } = runtime.ticket(origin)
  runtime.tickets.get(ticket).expiresAt = 0
  const expired = peer(); runtime.open(expired)
  await runtime.message(expired, JSON.stringify({ type: 'start', ticket, cols: 80, rows: 24 }))
  assert.equal(expired.closed.code, 1011)
  const reused = peer(); runtime.open(reused)
  await runtime.message(reused, JSON.stringify({ type: 'start', ticket, cols: 80, rows: 24 }))
  assert.ok(reused.messages.some(message => message.type === 'error'))
  assert.equal(runtime.sessions.size, 0)
})

test('nettoie les shells à la déconnexion et à l’arrêt, rejette les messages malformés', async t => {
  const runtime = new TerminalRuntime()
  t.after(() => runtime.close())
  const client = peer(); await start(runtime, client)
  runtime.closed(client)
  assert.equal(runtime.sessions.size, 0)
  const broken = peer(); runtime.open(broken)
  await runtime.message(broken, '{')
  assert.ok(broken.closed)
  const invalid = peer(); const { ticket } = runtime.ticket(origin); runtime.open(invalid)
  await runtime.message(invalid, JSON.stringify({ type: 'start', ticket, cols: 100000, rows: 24 }))
  assert.ok(invalid.closed)
  const active = peer(); await start(runtime, active)
  runtime.close()
  assert.equal(runtime.sessions.size, 0)
  assert.equal(runtime.tickets.size, 0)
  assert.equal(active.closed.code, 1001)
})

test('isole les sessions et refuse la désactivation ou la saturation', async t => {
  assert.throws(() => new TerminalRuntime({ TERMINAL_ENABLED: 'false' }).ticket(origin), /désactivé/)
  const runtime = new TerminalRuntime()
  t.after(() => runtime.close())
  for (let count = 0; count < 4; count++) runtime.open(peer())
  assert.throws(() => runtime.ticket(origin), /Trop de sessions/)
  const extra = peer(); runtime.open(extra); assert.equal(extra.closed.code, 1008)
})

test('le SSH vérifie la clé hôte et relaie le shell, les entrées et le redimensionnement', { timeout: 20_000 }, async t => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs1', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
  const publicKey = ssh2.utils.parseKey(privateKey).getPublicSSH()
  const fingerprint = 'SHA256:' + createHash('sha256').update(publicKey).digest('base64').replace(/=+$/, '')
  let size
  const clients = new Set()
  const server = new ssh2.Server({ hostKeys: [privateKey] }, connection => {
    clients.add(connection)
    connection.on('error', () => {})
    connection.on('close', () => clients.delete(connection))
    connection.on('authentication', context => context.method === 'password' && context.username === 'atlas-test' && context.password === 'test-only' ? context.accept() : context.reject())
    connection.on('ready', () => connection.on('session', accept => {
      const session = accept()
      session.on('pty', (accept, reject, info) => { size = info; accept() })
      session.on('window-change', (accept, reject, info) => { size = info; accept?.() })
      session.on('shell', accept => {
        const stream = accept()
        stream.write('SSH_READY\r\n')
        stream.on('data', data => stream.write('SSH_INPUT:' + data.toString()))
      })
    }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => { for (const client of clients) client.end(); server.close() })
  const config = { TERMINAL_MODE: 'ssh', SSH_HOST: '127.0.0.1', SSH_PORT: String(server.address().port), SSH_USERNAME: 'atlas-test', SSH_PASSWORD: 'test-only', SSH_HOST_FINGERPRINT: fingerprint }
  const runtime = new TerminalRuntime(config)
  t.after(() => runtime.close())
  const client = peer(); await start(runtime, client)
  await client.waitFor(() => client.output().includes('SSH_READY'))
  assert.equal(size.cols, 90)
  await input(runtime, client, 'test-command\r')
  await client.waitFor(() => client.output().includes('SSH_INPUT:test-command'))
  await runtime.message(client, JSON.stringify({ type: 'resize', cols: 110, rows: 40 }))
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(size.cols, 110)
  runtime.close()
  const invalid = new TerminalRuntime({ ...config, SSH_HOST_FINGERPRINT: 'SHA256:' + 'A'.repeat(43) })
  t.after(() => invalid.close())
  const refused = peer(); await start(invalid, refused)
  assert.ok(refused.messages.some(message => message.type === 'error'))
  assert.ok(!refused.messages.some(message => message.type === 'ready'))
  assert.equal(invalid.sessions.size, 0)
})
