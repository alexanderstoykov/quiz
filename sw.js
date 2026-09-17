const CACHE_VERSION = 'v6';
const CACHE_NAME = 'quiz-40bt-' + CACHE_VERSION;

const CORE_ASSETS = [
  './',
  './index.html',
  './questions.js',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CORE_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// App shell must never go stale, so it is fetched from the network first and
// only falls back to the cache when offline. Everything else stays cache-first.
const APP_SHELL = ['/', '/index.html', '/questions.js'];

function isAppShell(request) {
  if (request.mode === 'navigate') {
    return true;
  }
  var path = new URL(request.url).pathname;
  return APP_SHELL.some(function(name) {
    return path === name || path.endsWith(name);
  });
}

function putInCache(request, response) {
  if (response && response.status === 200 && response.type === 'basic') {
    var clone = response.clone();
    caches.open(CACHE_NAME).then(function(cache) {
      cache.put(request, clone);
    });
  }
  return response;
}

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') {
    return;
  }

  if (isAppShell(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) { return putInCache(event.request, response); })
        .catch(function() {
          return caches.match(event.request).then(function(cached) {
            return cached || caches.match('./index.html');
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) {
        return cached;
      }
      return fetch(event.request).then(function(response) {
        return putInCache(event.request, response);
      });
    })
  );
});
