import fs from 'node:fs'
import path from 'node:path'

export default function flyingWorker() {
  return {
    name: 'flying-worker',
    closeBundle: async () => {
      const candidates = ['dist/.vite/manifest.json', 'dist/manifest.json']
      const manifestPath = candidates.map(p => path.resolve(p)).find(p => fs.existsSync(p))
      
      if (!manifestPath) {
        throw new Error('Vite manifest not found. Run `vite build` first.')
      }

      const json = fs.readFileSync(manifestPath, 'utf8')
      const code = `// auto-generated
        export const viteManifest = ${json};
        export type ViteManifest = Record<string, { file: string; css?: string[]; imports?: string[] }>;
        `
        fs.writeFileSync(path.resolve('src/manifest.data.ts'), code, 'utf8')

      console.log('Wrote src/manifest.data.ts from', manifestPath)
    }
  }
}
