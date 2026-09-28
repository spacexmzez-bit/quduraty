const CACHE_NAME = 'quduraty-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './settings.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Precache local core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-first with cache fallback (intercepts HTML, CDNs, and fonts)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass Google Gemini AI API requests - AI cannot run offline
  if (requestUrl.hostname.includes('googleapis.com') && requestUrl.pathname.includes('/models/')) {
    return;
  }

  // Handle GET requests: Try network first, cache on success, fallback to cache on offline
  if (event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If valid response, clone and update the cache (including CDNs like Tailwind & Google Fonts)
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed (offline) -> serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
        })
    );
  }
});
