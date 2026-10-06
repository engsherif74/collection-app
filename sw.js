/* =========================================================
   Service Worker - تطبيق تحصيل مديونية العملاء
   الإصدار: 1.0.0
   ========================================================= */
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `collect-app-${CACHE_VERSION}`;
const RUNTIME_CACHE = `collect-runtime-${CACHE_VERSION}`;

/* الملفات الأساسية */
const PRECACHE_URLS = [
  '/collection-app/',
  '/collection-app/index.html',
  '/collection-app/manifest.json',
  '/collection-app/icon-192.png',
  '/collection-app/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

/* ============= Install ============= */
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.allSettled(
          PRECACHE_URLS.map(url =>
            cache.add(url).catch(err =>
              console.warn('⚠️ فشل تخزين:', url, err.message)
            )
          )
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Installed');
        return self.skipWaiting();
      })
  );
});

/* ============= Activate ============= */
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map(key => {
            console.log('🗑️ حذف كاش قديم:', key);
            return caches.delete(key);
          })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

/* ============= Fetch ============= */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات غير GET
  if (request.method !== 'GET') return;

  // تجاهل chrome-extension
  if (url.protocol === 'chrome-extension:') return;

  // تجاهل طلبات Google Analytics وما شابه
  if (url.hostname.includes('google-analytics')) return;

  // ===== موارد CDN: Cache First =====
  if (
    url.hostname === 'cdnjs.cloudflare.com' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // ===== موارد التطبيق: Network First مع fallback =====
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then(cached => {
          if (cached) return cached;

          // إذا كان تنقل (فتح صفحة) — أرجع index.html
          if (request.mode === 'navigate') {
            return caches.match('/collection-app/index.html');
          }

          return new Response('غير متصل بالإنترنت', {
            status: 503,
            statusText: 'Offline',
            headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
          });
        });
      })
  );
});

/* ============= رسائل من الصفحة ============= */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }
});