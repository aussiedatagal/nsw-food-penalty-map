import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Use base path for production builds (GitHub Pages)
  // Use root path for local development
  const base = command === 'build' ? '/nsw-food-penalty-map/' : '/'
  
  return {
    plugins: [react()],
    base,
  }
})
