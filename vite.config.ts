import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    // Env files are stored in ./services (.env / .env.local)
    envDir: 'services',
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Allow all hosts (useful for LAN / mobile testing like *.nip.io, ngrok, etc.)
      // Note: keep this for development only.
      allowedHosts: true as const,
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});