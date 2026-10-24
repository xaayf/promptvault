# PromptVault Pro (PWA iPhone)

Deploy ke Cloudflare Workers (sama seperti PixelVault / Creative Studio):
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Config ada di `wrangler.jsonc` (static assets dari `dist`)

Pasang di iPhone: buka URL di Safari > Bagikan > Tambah ke Layar Utama.

Data tersimpan di perangkat (localStorage). Backup lewat Pengaturan > Ekspor.
Ganti logo: edit `scripts/make-icons.mjs` lalu `npm run icons` (butuh playwright).
