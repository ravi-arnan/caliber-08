import { defineConfig } from 'vite';

const port = Number(process.env.PORT || 3000);

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port,
    allowedHosts: [
      'blog-552.preview.emergentagent.com',
      'blog-552.cluster-1.preview.emergentcf.cloud',
    ],
  },
  preview: {
    host: '0.0.0.0',
    port,
    allowedHosts: [
      'blog-552.preview.emergentagent.com',
      'blog-552.cluster-1.preview.emergentcf.cloud',
    ],
  },
});