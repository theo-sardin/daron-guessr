import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const SERVER_PORT = Number(process.env.SERVER_PORT ?? 3001);
const target = `http://localhost:${SERVER_PORT}`;

export default defineConfig({
  root: 'src/client',
  publicDir: '../../public',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/socket.io': { target, ws: true },
      '/photos': { target },
      '/api': { target },
    },
  },
});
