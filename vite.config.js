import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

// Isi sw.js dengan ID build (hash isi build) + daftar aset untuk precache.
// ID hanya berubah kalau isi build berubah, jadi deploy ulang tanpa perubahan tidak memunculkan "update".
function stampServiceWorker() {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const swPath = 'dist/sw.js';
      if (!existsSync(swPath)) return;
      const assets = existsSync('dist/assets') ? readdirSync('dist/assets').sort().map((f) => `/assets/${f}`) : [];
      const hash = createHash('sha1')
        .update(readFileSync('dist/index.html'))
        .update(assets.join('|'))
        .update(readFileSync('dist/manifest.webmanifest'))
        .digest('hex')
        .slice(0, 10);
      let sw = readFileSync(swPath, 'utf8');
      sw = sw.replace("'__BUILD_ID__'", `'${hash}'`).replace('/*__PRECACHE__*/[]', JSON.stringify(assets));
      writeFileSync(swPath, sw);
      console.log(`[sw] build id ${hash}, ${assets.length} aset di-precache`);
    },
  };
}

export default defineConfig({
  plugins: [react(), stampServiceWorker()],
  build: { outDir: 'dist', sourcemap: false },
});
