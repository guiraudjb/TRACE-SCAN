const CACHE_NAME = 'trace-scan-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Mise en cache du CDN pour garantir le fonctionnement offline
  'https://unpkg.com/html5-qrcode'
];

// Installation : on met en cache les ressources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activation : on nettoie les anciens caches si on change de version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// Interception des requêtes : on sert le cache si hors-ligne
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }).catch(() => {
      // Si la requête échoue (offline) et que ce n'est pas dans le cache
      return new Response('Application hors ligne');
    })
  );
});
