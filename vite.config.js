import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  // Headless physics tests (golden master, oracle-vs-physics, fuzz) run hundreds of full ticks
  // (78 engines/tick), which legitimately exceeds the 5s default under parallel load.
  test: {
    testTimeout: 30000,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
      interval: 100,
      ignored: ['**/node_modules/**', '**/.git/**']
    },
  },
})