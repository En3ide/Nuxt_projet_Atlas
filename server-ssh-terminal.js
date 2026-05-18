import 'dotenv/config'
import { WebSocketServer } from 'ws'
import { Client } from 'ssh2'

const wss = new WebSocketServer({
  port: Number(process.env.WS_PORT || 3001)
})

wss.on('connection', (ws) => {
  const ssh = new Client()

  ssh.on('ready', () => {
    ws.send('\r\nSSH connecté à ' + process.env.SSH_HOST + '\r\n\r\n')

    ssh.shell((err, stream) => {
      if (err) {
        ws.send('\r\nErreur shell SSH: ' + err.message + '\r\n')
        ws.close()
        return
      }

      stream.on('data', (data) => {
        ws.send(data.toString())
      })

      stream.on('close', () => {
        ws.send('\r\nConnexion SSH fermée\r\n')
        ws.close()
        ssh.end()
      })

      ws.on('message', (message) => {
        stream.write(message.toString())
      })

      ws.on('close', () => {
        stream.close()
        ssh.end()
      })
    })
  })

  ssh.on('error', (err) => {
    ws.send('\r\nErreur SSH: ' + err.message + '\r\n')
    ws.close()
  })

  ssh.connect({
    host: process.env.SSH_HOST,
    port: Number(process.env.SSH_PORT || 22),
    username: process.env.SSH_USERNAME,
    password: process.env.SSH_PASSWORD
  })
})

console.log(`Serveur terminal SSH lancé sur ws://localhost:${process.env.WS_PORT || 3001}`)