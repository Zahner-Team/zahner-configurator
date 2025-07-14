import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: "/zahner-configurator/",   // ← add this
  plugins: [react()],
})
