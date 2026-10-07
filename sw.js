const CACHE_VERSION = 'v1.0.1';
const CACHE_NAME = `collect-app-${CACHE_VERSION}`;
const RUNTIME_CACHE = `collect-runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  '/collection-app/',
  '/collection-app/index.html',
  '/collection-app/manifest.json',
  '/collection-app/gas-calculator.html',
  '/collection-app/icon-192.png',
  '/collection-app/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  if (url.hostname === 'cdnjs.cloudflare.com' ||
      url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(res => {
        const clone = res.clone();
        caches.open(RUNTIME_CACHE).then(c => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request).then(cached => {
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match('/collection-app/index.html');
        }
        return new Response('غير متصل بالإنترنت', {
          status: 503,
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      }))
  );
});