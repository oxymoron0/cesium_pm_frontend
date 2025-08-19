import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import path from 'path'

// 빌드할 페이지 (환경변수로 지정)
const pageName = process.env.VITE_PAGE

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'

  // 개발 환경: SPA 방식 (src/main.tsx 진입점)
  if (isDev) {
    return {
      plugins: [react(), cesium()],
      define: {
        'process.env.NODE_ENV': JSON.stringify('development'),
        'import.meta.env.VITE_ION_TOKEN': JSON.stringify(process.env.VITE_ION_TOKEN || ''),
        'import.meta.env.VITE_APP_ENV': JSON.stringify('development')
      },
      server: {
        host: '0.0.0.0',
        port: 5173,
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
        allowedHosts: ['services.leorca.org']
      },
      css: {
        postcss: './postcss.config.js'
      },
      base: './'
    }
  }

  // 빌드 환경: 개별 페이지 UMD 빌드
  if (!pageName) {
    throw new Error('VITE_PAGE environment variable is required for production builds')
  }

  return {
    plugins: [react(), cesium()],
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
      'process.env': JSON.stringify(process.env),
      'import.meta.env.VITE_ION_TOKEN': JSON.stringify(process.env.VITE_ION_TOKEN || ''),
      'import.meta.env.VITE_APP_ENV': JSON.stringify(process.env.VITE_APP_ENV || 'production')
    },
    server: {
      host: '0.0.0.0',
      port: 3333,
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
    base: './'
  }
})