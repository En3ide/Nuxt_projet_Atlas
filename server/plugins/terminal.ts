import { terminalRuntime } from '../utils/terminal-runtime.mjs'

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('close', () => terminalRuntime.close())
})
