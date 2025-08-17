import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cesium from 'vite-plugin-cesium'
import path from 'path'

// 현재 빌드할 페이지 (환경변수로 지정)
const pageName = process.env.VITE_PAGE
if (!pageName) {
  throw new Error('VITE_PAGE environment variable is required')
}

export default defineConfig({
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
    }
  },
  base: './'
})
