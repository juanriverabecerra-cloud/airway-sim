import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5199 },
  build: { rollupOptions: { input: 'harness.html' }, outDir: 'dist-harness' },
});
