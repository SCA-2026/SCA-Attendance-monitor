import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',                // use relative paths when building for Netlify or sub‑directories
  plugins: [react()],
})
