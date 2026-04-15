import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'target: "https://ai-career-backend-k3ql.onrender.com"',
        changeOrigin: true
      }
    },
    host: true
  }
})