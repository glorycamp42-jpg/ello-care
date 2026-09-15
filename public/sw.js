/* Ello Care service worker — installability + resilient static caching.
   Never caches /api or auth routes; pages are network-first with cache fallback. */
const VERSION = "ello-v3-20260915"; // bump on every deploy that changes pages: old caches are purged on activate
const STATIC = ["/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png",
  "/characters/grandchild.png", "/characters/friend.png", "/characters/church.png", "/characters/secretary.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(STATIC)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    // earlier versions cached HTML pages under the same name — drop any navigation responses that slipped in
    const c = await caches.open(VERSION);
    for (const req of await c.keys()) {
      if (!/\.(png|svg|ico|woff2?|css|js|json)$/.test(new URL(req.url).pathname) && !new URL(req.url).pathname.startsWith("/_next/static/")) await c.delete(req);
    }
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Static assets: cache-first
  if (/\.(png|svg|ico|woff2?|css|js)$/.test(url.pathname) || url.pathname.startsWith("/_next/static/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    })));
    return;
  }

  // Pages/other: always network (never serve a stale page after a deploy)
});
