/* Service Worker TRACE_SCAN v1.1 */
const CACHE_NAME = 'trace-scan-cache-v1.1';

// Liste des ressources locales à mettre en cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './html5-qrcode.min.js' // La librairie est maintenant servie localement
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
