// Service Worker - Version 4 (JS = Network-First)
const CACHE_NAME = "studenthome-v4";
const STATIC_ASSETS = [
  "/js/nav.css",
  "/js/enhancements.css",
  "/assets/logo.png",
];

// Install: cache ONLY truly static assets (no JS — they change with every deploy)
self.addEventListener("install", (event) => {
  console.log('[SW] Installing new service worker v4');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.error('[SW] Cache installation failed:', err);
    })
  );
  self.skipWaiting();
});

// Activate: clean up ALL old caches
self.addEventListener("activate", (event) => {
  console.log('[SW] Activating service worker v4');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map((key) => {
          console.log('[SW] Deleting old cache:', key);
          return caches.delete(key);
        })
      )
    ).then(() => {
      console.log('[SW] All old caches cleared');
    })
  );
  self.clients.claim();
});

// Fetch handler
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and API calls
  if (event.request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;
  if (url.pathname.startsWith("/api/")) return;

  // CACHE-FIRST: images and fonts only (safe since they are content-addressed)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|woff2?|ttf)$/) ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('Resource not available', { status: 404, headers: { 'Content-Type': 'text/plain' } }));
      })
    );
    return;
  }

  // NETWORK-FIRST: JS, CSS, and HTML — always try fresh, fall back to cache offline
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => {
      return caches.match(event.request).then(cached => {
        if (cached) return cached;
        return new Response('Page not available offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
