import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['sql.js']
  },
  build: {
    commonjsOptions: {
      include: [/sql.js/, /node_modules/]
    }
  },
  resolve: {
    alias: {
      // Force sql.js to use the WASM file directly
      'sql.js': 'sql.js/dist/sql-wasm.js'
    }
  }
})
