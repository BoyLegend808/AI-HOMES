// Service Worker - Version 3 (Complete Reset)
const CACHE_NAME = "studenthome-v3";
const STATIC_ASSETS = [
  "/js/nav.css",
  "/js/enhancements.css",
  "/js/enhancements.js",
  "/assets/logo.png",
];

// Install: cache core static assets
self.addEventListener("install", (event) => {
  console.log('[SW] Installing new service worker v3');
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
  console.log('[SW] Activating service worker v3');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
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

// Fetch: network-first for HTML/API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and API calls
  if (event.request.method !== "GET") return;
  if (!url.protocol.startsWith("http")) return;
  if (url.pathname.startsWith("/api/")) return;

  // Cache-first for static assets (CSS, JS, images, fonts)
  if (
    url.pathname.match(/\.(css|js|png|jpg|jpeg|webp|svg|woff2?|ttf)$/) ||
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) {
          console.log('[SW] Serving from cache:', url.pathname);
          return cached;
        }
        return fetch(event.request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch((err) => {
          console.error('[SW] Fetch failed:', url.pathname, err);
          // Return a basic fallback if both cache and network fail
          return new Response('Resource not available', { 
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      }).catch((err) => {
        console.error('[SW] Cache match failed:', err);
        return fetch(event.request).catch(() => {
          return new Response('Resource not available', { 
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
    );
    return;
  }

  // Network-first for HTML pages (always try fresh, fall back to cache)
  if (event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            console.log('[SW] Caching HTML page:', url.pathname);
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          console.log('[SW] Network failed, trying cache for:', url.pathname);
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            return new Response('Page not available offline', { 
              status: 503,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        })
    );
    return;
  }
});
