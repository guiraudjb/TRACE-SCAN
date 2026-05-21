/* Service Worker TRACE_SCAN v2.1 */
const CACHE_NAME = 'trace-scan-cache-v2.5';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './storage.js',
  './manifest.json',
  './html5-qrcode.min.js',
  './dsfr-v1.14.3/dist/dsfr/dsfr.main.min.css',
  './dsfr-v1.14.3/dist/utility/utility.main.min.css',
  './dsfr-v1.14.3/dist/dsfr/dsfr.module.min.js',
  './dsfr-v1.14.3/dist/dsfr/dsfr.nomodule.min.js'
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
