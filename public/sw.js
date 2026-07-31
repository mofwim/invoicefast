/* ScanFast service worker.
 *
 * Three jobs:
 *  1. Offline shell — the scanner is pure client-side, so once cached it works
 *     with no connection at all.
 *  2. Persist the OCR engine and language data (several MB from a CDN) so the
 *     second OCR run is instant and works offline.
 *  3. Handle Android's share target: receive images shared from other apps.
 */

const VERSION = 'v1';
const SHELL = `scanfast-shell-${VERSION}`;
const RUNTIME = `scanfast-runtime-${VERSION}`;
const VENDOR = `scanfast-vendor-${VERSION}`;
const SHARE = 'scanfast-share';

const PRECACHE = [
  '/scan',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // Individually, so one 404 can't fail the whole install.
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('scanfast-') && ![SHELL, RUNTIME, VENDOR, SHARE].includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ------------------------------------------------------------------ */
/* share target                                                         */
/* ------------------------------------------------------------------ */

async function handleShare(request) {
  try {
    const form = await request.formData();
    const files = form.getAll('images').filter((f) => f && f.size);
    const cache = await caches.open(SHARE);
    // Clear anything left over from a previous share.
    for (const key of await cache.keys()) await cache.delete(key);
    for (let i = 0; i < files.length; i++) {
      await cache.put(
        new Request(`/__share/${i}`),
        new Response(files[i], {
          headers: {
            'content-type': files[i].type || 'image/jpeg',
            'x-filename': encodeURIComponent(files[i].name || `shared-${i}.jpg`),
          },
        })
      );
    }
    return Response.redirect(`/scan?shared=${files.length}`, 303);
  } catch {
    return Response.redirect('/scan', 303);
  }
}

/* ------------------------------------------------------------------ */
/* strategies                                                           */
/* ------------------------------------------------------------------ */

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res && (res.ok || res.type === 'opaque')) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res && res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const hit = (await cache.match(request)) || (fallbackUrl && (await caches.match(fallbackUrl)));
    if (hit) return hit;
    throw err;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res && res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || network.then((r) => r || Promise.reject(new Error('offline')));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/scan') {
    event.respondWith(handleShare(request));
    return;
  }
  if (request.method !== 'GET') return;

  // Language data and the OCR wasm come from a CDN — keep them for good.
  if (url.origin !== self.location.origin) {
    if (/tesseract|traineddata|unpkg|jsdelivr/i.test(url.href)) {
      event.respondWith(cacheFirst(request, VENDOR).catch(() => fetch(request)));
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, RUNTIME, '/scan'));
    return;
  }

  // Hashed build output and icons never change under the same URL.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, SHELL));
    return;
  }

  // A self-hosted OCR engine (see scripts/vendor-ocr.mjs) is tens of megabytes
  // and never changes between deploys — keep it alongside the CDN copies.
  if (url.pathname.startsWith('/tesseract/')) {
    event.respondWith(cacheFirst(request, VENDOR).catch(() => fetch(request)));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME).catch(() => fetch(request)));
});
