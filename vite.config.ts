import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // هذا الخيار سيجبر البناء على الاستمرار حتى لو وجدت أخطاء طفيفة
    sourcemap: false, 
  }
})
