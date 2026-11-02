// Ancien point d’entrée conservé pour les habitudes de lancement.
// Le terminal est désormais servi par Nuxt, sur la même origine que le site.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

console.log('Le terminal est intégré au site Nuxt : ouvrir /terminal après le démarrage.')
const child = spawn(process.execPath, [fileURLToPath(new URL('./node_modules/@nuxt/cli/bin/nuxi.mjs', import.meta.url)), 'dev'], { stdio: 'inherit', windowsHide: true })
child.on('error', error => { console.error(error.message); process.exitCode = 1 })
child.on('exit', code => { process.exitCode = code || 0 })
