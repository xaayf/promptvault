// PromptVault service worker. Data user ada di localStorage/IndexedDB, bukan di cache ini.
// ID build dan daftar aset diisi otomatis saat build (lihat vite.config.js),
// supaya setiap rilis baru terdeteksi sebagai "update tersedia".
const BUILD_ID = '__BUILD_ID__';
const CACHE = 'promptvault-' + BUILD_ID;
const ASSETS = /*__PRECACHE__*/[];
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logo.svg', '/apple-touch-icon.png', '/icons/icon-192.png', '/icons/icon-512.png', ...ASSETS];

self.addEventListener('install', (e) => {
  // Tidak skipWaiting otomatis: versi baru menunggu sampai user menekan "Perbarui" di app.
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // jangan sentuh API eksternal (Gemini dll)

  // Halaman: network-first, fallback cache (offline)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Aset: cache dulu (sudah di-precache), lalu jaringan
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
