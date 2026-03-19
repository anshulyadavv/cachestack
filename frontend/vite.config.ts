import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy /api and /health to the Go backend during development.
      // This avoids CORS issues and matches the production layout.
      '/api':    { target: 'http://127.0.0.1:6380', changeOrigin: true },
      '/health': { target: 'http://127.0.0.1:6380', changeOrigin: true },
    },
  },
})
