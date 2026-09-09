import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    env: {
      // No path segment so mocked request paths equal the literal endpoint paths.
      VITE_API_BASE_URL: 'https://api.test',
      // Cloudinary logo/icon upload (src/settings/cloudinary.ts).
      VITE_CLOUDINARY_CLOUD_NAME: 'test-cloud',
      VITE_CLOUDINARY_UPLOAD_PRESET: 'test-preset',
      VITE_CLOUDINARY_FOLDER: '',
    },
  },
})
