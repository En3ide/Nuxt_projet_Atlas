import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async () => {
    const rootPath = process.cwd()
    const items = await readdir(rootPath)

    const files = await Promise.all(
        items.map(async (name) => {
            const fullPath = join(rootPath, name)
            const info = await stat(fullPath)

            return {
                name,
                type: info.isDirectory() ? 'Dossier' : 'Fichier',
                size: info.isDirectory() ? '-' : `${Math.round(info.size / 1024)} KB`,
                modified: info.mtime.toLocaleDateString('fr-FR'),
                icon: info.isDirectory() ? '📁' : '📄'
            }
        })
    )

    return files
})