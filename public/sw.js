/**
 * Service worker for Mijn Afspraken.
 *
 * Deliberately small. Pages are fetched from the network first and only fall
 * back to a cached copy when there is no connection — so an installed app never
 * shows a stale build. Hashed build assets are safe to serve from cache
 * straight away. The calendar proxy is never cached.
 */

const CACHE = "mijn-afspraken-v1";
const SHELL = ["/afspraken", "/afspraken-icon.svg", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const isStaticAsset = (pathname) =>
  pathname.startsWith("/_next/static/") || /\.(css|js|svg|png|jpe?g|webp|woff2?)$/i.test(pathname);

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match("/afspraken") || Response.error())
        )
    );
    return;
  }

  if (!isStaticAsset(url.pathname)) return;

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
    )
  );
});
