import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Single source of truth for the dev server. The frontend calls the API
// with the relative base `/api` (see .env → VITE_API_BASE_URL=/api/v1);
// this proxy forwards that to the Laravel backend, so the backend port
// lives in exactly one place.
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: false,
        configure: (proxy) =>
          proxy.on('proxyReq', (req) => {
            req.removeHeader('origin')
            req.removeHeader('referer')
            req.removeHeader('cookie')
          }),
      },
    },
  },
})
