import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    //https: true
    host: true,
    port: 5173,
         },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

