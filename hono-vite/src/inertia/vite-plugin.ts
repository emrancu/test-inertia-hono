import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

export default function flyingWorker(): Plugin {
  return {
    name: 'flying-worker',
    closeBundle: async () => {
      const candidates = ['dist/client/.vite/manifest.json', 'dist/manifest.json']
      const manifestPath = candidates.map(p => path.resolve(p)).find(p => fs.existsSync(p))
      
      if (!manifestPath) {
        console.log('Vite manifest not found yet. Skipping manifest.data.ts generation.')
        return
      }

      const json = fs.readFileSync(manifestPath, 'utf8')
      const code = `// auto-generated
export const viteManifest = ${json};

export type ViteManifest = Record<string, { file: string; css?: string[]; imports?: string[] }>;
        `
        fs.writeFileSync(path.resolve('resources/js/manifest.data.ts'), code, 'utf8')

    }
  }
}
