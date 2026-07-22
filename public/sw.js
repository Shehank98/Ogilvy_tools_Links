// Minimal service worker: enables installability and caches only static
// build assets (cache-first). Pages and API stay network-only so the app's
// dynamic content and 10s auto-refresh always show fresh data.
const CACHE = "toolshub-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/apple-touch-icon.png";

  if (!isStatic) return; // let the network handle everything dynamic

  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    })()
  );
});
