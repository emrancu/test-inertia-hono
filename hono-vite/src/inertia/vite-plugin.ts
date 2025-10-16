import { Console } from 'node:console'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, UserConfig } from 'vite'

interface FlyingWorkerOptions {
  appPath: string
  outDir?: string
  assetsDir?: string
}

export default function flyingWorker(options: FlyingWorkerOptions): Plugin {
  const { appPath, outDir = 'dist', assetsDir = 'assets' } = options
  const appEntry = path.join(appPath, 'app.jsx')
  const pagesPath = path.join(appPath, 'Pages')

  return {
    name: 'flying-worker',
    config: (): UserConfig => {
      return {
        build: {
          outDir,
          assetsDir,
          manifest: true,
          rollupOptions: {
            input: appEntry,
            output: {
              assetFileNames: `${assetsDir}/[name]-[hash][extname]`,
              manualChunks(id: string) {
                if (id.includes(`/${pagesPath}/`)) {
                  const segments = id.split('/')
                  const fileName = segments[segments.length - 1]
                  const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "")
                  return `Pages_${fileNameWithoutExt}`
                }
              },
            },
          },
        },
      }
    },
    closeBundle: async () => {
      const candidates = [`${outDir}/client/.vite/manifest.json`, `${outDir}/manifest.json`]
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
        fs.writeFileSync(path.resolve(path.join(appPath, 'manifest.data.ts')), code, 'utf8')
        console.log('Wrote src/manifest.data.ts from', manifestPath)

    }
  }
}
