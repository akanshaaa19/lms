import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Django runs on :8000. Proxying keeps the browser on one origin, so the
// session cookie and CSRF token work without any CORS setup.
// changeOrigin stays false: Django's CSRF check compares the Origin header
// with the Host header, and both must say localhost:5173.
const django = { target: 'http://127.0.0.1:8000', changeOrigin: false }

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': django,
      '/admin': django,
      '/static': django,
    },
  },
})
