import { defineConfig } from 'vite';

const port = Number(process.env.PORT || 3000);
const configuredHosts = (process.env.ALLOWED_HOSTS || '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);
const allowedHosts = configuredHosts.length ? configuredHosts : true;

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port,
    allowedHosts,
  },
  preview: {
    host: '0.0.0.0',
    port,
    allowedHosts,
  },
});