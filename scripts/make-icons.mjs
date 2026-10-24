// Generate logo SVGs + PNG icons + iOS splash screens.
// Run: npm run icons  (needs playwright + chromium)
import { writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const OUT = new URL('../public/', import.meta.url).pathname;
mkdirSync(OUT + 'icons', { recursive: true });
mkdirSync(OUT + 'splash', { recursive: true });

const GRAD = `
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#6366f1"/>
    <stop offset="0.55" stop-color="#a855f7"/>
    <stop offset="1" stop-color="#ec4899"/>
  </linearGradient>
  <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fff" stop-opacity="0.28"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>`;

// Glyph: shield (vault) + prompt chevron + cursor. Drawn on 512 grid.
const GLYPH = `
  <path d="M256 92 L398 146 V268 C398 348 337 406 256 436 C175 406 114 348 114 268 V146 Z"
        fill="#fff" fill-opacity="0.14" stroke="#fff" stroke-width="22" stroke-linejoin="round"/>
  <polyline points="206,212 258,258 206,304" fill="none" stroke="#fff" stroke-width="26"
            stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="282" y1="306" x2="326" y2="306" stroke="#fff" stroke-width="26" stroke-linecap="round"/>`;

// Rounded logo (favicon / in-app)
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${GRAD}</defs>
  <rect width="512" height="512" rx="116" fill="url(#bg)"/>
  <rect width="512" height="256" rx="116" fill="url(#shine)"/>
  ${GLYPH}
</svg>`;

// Full-bleed square (iOS rounds corners itself; glyph kept inside safe zone)
const bleedSvg = (glyphScale = 0.8) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>${GRAD}</defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <rect width="512" height="256" fill="url(#shine)"/>
  <g transform="translate(256 256) scale(${glyphScale}) translate(-256 -264)">${GLYPH}</g>
</svg>`;

writeFileSync(OUT + 'logo.svg', logoSvg);
writeFileSync(OUT + 'favicon.svg', logoSvg);

const browser = await chromium.launch();
const page = await browser.newPage();

async function renderSvg(svg, size, file) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`
  );
  await page.screenshot({ path: OUT + file, omitBackground: true });
}

await renderSvg(bleedSvg(0.86), 180, 'apple-touch-icon.png');
await renderSvg(logoSvg, 192, 'icons/icon-192.png');
await renderSvg(logoSvg, 512, 'icons/icon-512.png');
await renderSvg(bleedSvg(0.7), 512, 'icons/icon-maskable-512.png');
await renderSvg(logoSvg, 32, 'favicon-32.png');

// iOS splash screens (portrait): [w, h, dpr-width, dpr-height, ratio]
const SPLASH = [
  [1290, 2796, 430, 932, 3], // 14/15/16 Pro Max, 15/16 Plus
  [1179, 2556, 393, 852, 3], // 14/15/16 Pro
  [1170, 2532, 390, 844, 3], // 12/13/14
  [1284, 2778, 428, 926, 3], // 12/13 Pro Max
  [1125, 2436, 375, 812, 3], // X/XS/11 Pro
  [1242, 2688, 414, 896, 3], // XS Max / 11 Pro Max
  [828, 1792, 414, 896, 2],  // XR / 11
  [750, 1334, 375, 667, 2],  // SE / 8
  [1320, 2868, 440, 956, 3], // 16 Pro Max
  [1206, 2622, 402, 874, 3], // 16 Pro
];

const splashHtml = (w, h) => {
  const s = Math.round(Math.min(w, h) * 0.3);
  return `<html><body style="margin:0;width:${w}px;height:${h}px;background:#020617;position:relative;overflow:hidden;font-family:-apple-system,system-ui,Helvetica,Arial,sans-serif">
  <div style="position:absolute;left:50%;top:44%;width:${s * 2.6}px;height:${s * 2.6}px;transform:translate(-50%,-50%);
    background:radial-gradient(circle,rgba(139,92,246,.35),rgba(99,102,241,.12) 45%,transparent 70%)"></div>
  <div style="position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);width:${s}px;height:${s}px">
    ${logoSvg.replace('<svg ', `<svg width="${s}" height="${s}" `)}
  </div>
  <div style="position:absolute;left:0;right:0;top:calc(44% + ${s * 0.82}px);text-align:center;color:#e2e8f0;font-weight:700;
    font-size:${Math.round(s * 0.2)}px;letter-spacing:-0.01em">PromptVault
    <span style="font-size:${Math.round(s * 0.08)}px;margin-left:${Math.round(s * 0.04)}px;padding:${Math.round(s * 0.012)}px ${Math.round(s * 0.04)}px;border:2px solid rgba(129,140,248,.5);border-radius:99px;color:#818cf8;vertical-align:middle;font-family:ui-monospace,Menlo,monospace">PRO</span></div>
  </body></html>`;
};

const links = [];
for (const [w, h, cw, ch, r] of SPLASH) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(splashHtml(w, h));
  await page.screenshot({ path: `${OUT}splash/${w}x${h}.png` });
  links.push(
    `    <link rel="apple-touch-startup-image" href="/splash/${w}x${h}.png" media="(device-width: ${cw}px) and (device-height: ${ch}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)" />`
  );
}
writeFileSync(new URL('./splash-links.txt', import.meta.url).pathname, links.join('\n'));

await browser.close();
console.log('icons ok');
