// Offline app-shell cache. Bump CACHE_VERSION whenever any cached file changes.
const CACHE_VERSION = "v1";
const CACHE_NAME = `exercise-tracker-${CACHE_VERSION}`;

const PRECACHE_PATHS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/styles.css",
  "js/app.js",
  "js/db.js",
  "js/util.js",
  "js/catalog.js",
  "js/progression.js",
  "js/stats.js",
  "js/charts.js",
  "js/data/exercises.js",
  "js/data/programs.js",
  "js/vendor/chart.umd.min.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      const urls = PRECACHE_PATHS.map((p) => new URL(p, self.registration.scope).toString());
      return cache.addAll(urls);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for app-shell assets; network-first fallback for anything else
// (there's no backend here, but this keeps the app resilient if that changes).
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match(new URL("index.html", self.registration.scope).toString());
          }
          return undefined;
        });
    })
  );
});
