const CACHE_NAME = 'arzankala-v4';
const STATIC_ASSETS = [
  './index.html',
  './category.html',
  './product.html',
  './advisor.html',
  './buy.html',
  './choose.html',
  './compare.html',
  './register.html',
  './css/bootstrap.rtl.min.css',
  './css/style.css',
  './js/api.js',
  './js/products-data.js',
  './js/shop-cart.js',
  './js/bootstrap.bundle.js',
  './js/all.min.js',
  './manifest.json',
  './img/logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('SW cache addAll warning:', err.message);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              try { cache.put(event.request, clone); } catch (e) {}
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
