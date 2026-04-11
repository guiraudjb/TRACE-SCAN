/* Service Worker pour TRACE_SCAN v1.0 */

// Nom du cache - à changer pour forcer une mise à jour chez les utilisateurs
const CACHE_NAME = 'trace-scan-cache-v1';

// Liste des ressources critiques à mettre en cache pour le mode offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  // On met en cache la librairie de scan pour éviter la dépendance au CDN en mode nomade
  'https://unpkg.com/html5-qrcode'
];

// 1. Installation : Mise en cache des ressources 
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('TRACE_SCAN : Mise en cache des ressources statiques');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activation : Nettoyage des anciens caches si nécessaire
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('TRACE_SCAN : Nettoyage de l\'ancien cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Stratégie de Fetch : "Cache First"
// On sert d'abord le cache pour permettre le fonctionnement sans réseau 
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourne la ressource du cache si elle existe, sinon fait une requête réseau
        return response || fetch(event.request).catch(() => {
          // Fallback optionnel si le réseau échoue et que la ressource n'est pas en cache
          console.log('TRACE_SCAN : Ressource non trouvée en cache et réseau indisponible.');
        });
      })
  );
});
