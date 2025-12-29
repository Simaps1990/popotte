const CACHE_NAME = 'popotte-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Mise en cache des ressources');
        return Promise.all(
          urlsToCache.map(url => 
            cache.add(url).catch(err => 
              console.warn(`[Service Worker] Échec de la mise en cache de ${url}:`, err)
            )
          )
        );
      })
  );
  // Force le service worker à s'activer immédiatement
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // Ne pas mettre en cache les requêtes vers l'API
  if (event.request.url.includes('/rest/v1/')) {
    return fetch(event.request);
  }

  const destination = event.request.destination;
  const isNavigation = event.request.mode === 'navigate';
  const isCritical = isNavigation || destination === 'document' || destination === 'script' || destination === 'style';

  if (isCritical) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache))
            .catch(() => undefined);
          return response;
        })
        .catch(() =>
          caches.match(event.request, { ignoreSearch: true })
            .then(response => response || fetch(event.request))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(response => {
        // Retourner la réponse en cache si elle existe
        if (response) {
          return response;
        }

        // Sinon, récupérer depuis le réseau
        return fetch(event.request)
          .then(response => {
            // Vérifier si la réponse est valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Mettre en cache la réponse
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache)
                  .catch(err => console.warn('Erreur lors de la mise en cache:', err));
              });

            return response;
          })
          .catch(err => {
            console.warn('Échec de la requête réseau:', err);
            // Retourner une réponse de secours si nécessaire
            return new Response(JSON.stringify({ error: 'Hors ligne' }), {
              status: 408,
              headers: { 'Content-Type': 'application/json' }
            });
          });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  self.clients.claim();
});
