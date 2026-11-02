import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Les modules natifs et leurs workers doivent rester de vrais fichiers Node.
const projectRoot = fileURLToPath(new URL('.', import.meta.url))
function nativeFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? nativeFiles(path) : /\.(?:node|dll|exe)$/.test(entry.name) ? [path] : []
  })
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  nitro: {
    experimental: { websocket: true },
    rollupConfig: { external: [/(?:^|[/\\])(?:node-pty|ssh2)(?:[/\\]|$)/] },
    externals: {
      traceInclude: [
        resolve(projectRoot, 'node_modules/node-pty/lib/index.js'),
        resolve(projectRoot, 'node_modules/node-pty/lib/worker/conoutSocketWorker.js'),
        resolve(projectRoot, 'node_modules/node-pty/lib/conpty_console_list_agent.js'),
        resolve(projectRoot, 'node_modules/ssh2/lib/index.js'),
        ...nativeFiles(resolve(projectRoot, `node_modules/node-pty/prebuilds/${process.platform}-${process.arch}`)),
        ...nativeFiles(resolve(projectRoot, 'node_modules/node-pty/build/Release')),
      ],
    },
  },
  runtimeConfig: {
    atlasApiBase: 'http://127.0.0.1:3002/api',
    atlasApiKey: '',
  },
  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/icon?family=Material+Icons'
        }
      ]
    }
  }
})
