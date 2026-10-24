import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(<App />);

// ---- PWA: deteksi versi baru, tampilkan "Update tersedia", terapkan atas klik user ----
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  let applying = false;

  const announce = (worker) => {
    window.__pvWaiting = worker;
    window.dispatchEvent(new CustomEvent('pv-update-available'));
  };

  // Dipanggil dari banner "Perbarui"
  window.__pvApplyUpdate = () => {
    applying = true;
    if (window.__pvWaiting) window.__pvWaiting.postMessage({ type: 'SKIP_WAITING' });
    else window.location.reload();
  };

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (applying) window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) announce(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) announce(nw);
        });
      });

      // Cek manual (tombol di Pengaturan): true kalau ada versi baru
      window.__pvCheckUpdate = async () => {
        await reg.update();
        await new Promise((r) => setTimeout(r, 1500));
        return !!(reg.waiting && navigator.serviceWorker.controller);
      };

      // iOS jarang cek sendiri: cek tiap app dibuka kembali & tiap 30 menit
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      setInterval(check, 30 * 60 * 1000);
    }).catch(() => {});
  });
}
