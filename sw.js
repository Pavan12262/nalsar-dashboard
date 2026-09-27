/**
 * TARGET NALSAR - Service Worker
 * Caches all app assets so it works offline after first load.
 */

const CACHE_NAME = 'nalsar-v2';

// All files to cache on install
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/responsive.css',
  './js/storage.js',
  './js/app.js',
  './js/timer.js',
  './js/countdown.js',
  './js/fullscreenTimer.js',
  './js/study.js',
  './js/charts.js',
  './js/mocks.js',
  './js/errors.js',
  './js/streak.js',
  './js/weakness.js',
  './js/sectionals.js',
  './js/sectionalErrors.js',
  './js/sectionalWeakness.js',
  './js/mockSchedule.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/screenshot-desktop.png',
  './icons/screenshot-mobile.png'
];

// Install: cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET and cross-origin requests (like Google Fonts)
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      // Not in cache — fetch from network and cache it
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Offline and not cached — return the main page as fallback
        return caches.match('./index.html');
      });
    })
  );
});
