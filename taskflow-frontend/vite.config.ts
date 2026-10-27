import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Los reportes y capturas de las pruebas no deben provocar recargas de la app
    watch: {
      ignored: ['**/cypress/results/**', '**/cypress/reports/**', '**/cypress/screenshots/**', '**/cypress/videos/**'],
    },
  },
})
