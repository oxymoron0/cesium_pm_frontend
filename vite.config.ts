import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import path from 'path'
import fs from 'fs'

// 빌드할 페이지 (환경변수로 지정)
const pageName = process.env.VITE_PAGE

/**
 * Simulation files serving plugin
 * Serves files from local filesystem path (e.g., /mnt/nfs) during development
 */
function simulationFilesPlugin(localPath: string, urlPrefix: string): Plugin {
  return {
    name: 'simulation-files-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(urlPrefix)) {
          return next()
        }

        // Remove URL prefix and decode
        const relativePath = decodeURIComponent(req.url.slice(urlPrefix.length))
        const filePath = path.join(localPath, relativePath)

        // Security: ensure path is within localPath
        const resolvedPath = path.resolve(filePath)
        if (!resolvedPath.startsWith(path.resolve(localPath))) {
          res.statusCode = 403
          res.end('Forbidden')
          return
        }

        // Check if file exists
        if (!fs.existsSync(resolvedPath)) {
          res.statusCode = 404
          res.end(`Not found: ${relativePath}`)
          return
        }

        // Serve the file
        const stat = fs.statSync(resolvedPath)
        if (stat.isDirectory()) {
          res.statusCode = 403
          res.end('Cannot serve directory')
          return
        }

        // Set content type for JSON
        if (resolvedPath.endsWith('.json')) {
          res.setHeader('Content-Type', 'application/json')
        }
        res.setHeader('Access-Control-Allow-Origin', '*')

        const stream = fs.createReadStream(resolvedPath)
        stream.pipe(res)
      })
    }
  }
}

export default defineConfig(({ command, mode }) => {
  const isDev = command === 'serve'

  // 개발 환경: SPA 방식 (src/main.tsx 진입점)
  if (isDev) {
    // 개발환경에서만 BASE_PATH 적용
    const env = loadEnv(mode, process.cwd(), '')
    const basePath = env.VITE_BASE_PATH || './'
    const simLocalPath = env.SIM_LOCAL_PATH || '/mnt/nfs'
    const simUrlPrefix = `${basePath}${env.VITE_SIM_PATH || 'sim'}`

    return {
      plugins: [
        react(),
        cesium(),
        simulationFilesPlugin(simLocalPath, simUrlPrefix)
      ],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src')
        }
      },
      define: {
        'process.env.NODE_ENV': JSON.stringify('development'),
        'import.meta.env.VITE_APP_ENV': JSON.stringify('development')
      },
      server: {
        host: '0.0.0.0',
        port: 17071,
        cors: true,
        headers: {
          'Access-Control-Allow-Origin': '*'
        },
        // 페이지 라우팅을 위한 히스토리 API 폴백
        historyApiFallback: {
          rewrites: [
            { from: /\/SamplePage\.html/, to: '/index.html' },
            { from: /\/\w+Page\.html/, to: '/index.html' }
          ]
        },
        allowedHosts: ['pm.astbusan.site']
      },
      css: {
        postcss: './postcss.config.js'
      },
      base: basePath
    }
  }

  // 빌드 환경: 개별 페이지 UMD 빌드
  if (!pageName) {
    throw new Error('VITE_PAGE environment variable is required for production builds')
  }

  const env = loadEnv(mode, process.cwd(), '')
  const basePath = env.VITE_BASE_PATH || './'

  return {
    plugins: [react(), cesium()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      'import.meta.env.VITE_APP_ENV': JSON.stringify('production')
    },
    server: {
      host: '0.0.0.0',
      port: 8080,
      strictPort: true,
      cors: true,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, `./src/pages/${pageName}/index.tsx`),
        formats: ['umd'],
        name: pageName,
        fileName: () => `${pageName}.umd.js`
      },
      rollupOptions: {
        output: {
          globals: {}
        }
      },
      cssCodeSplit: false
    },
    css: {
      postcss: './postcss.config.js'
    },
    base: basePath
  }
})