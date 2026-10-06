/* =========================================================
   Service Worker - تطبيق تحصيل مديونية العملاء
   ========================================================= */
const CACHE_NAME = 'collect-app-v1.0.0';
const RUNTIME_CACHE = 'collect-runtime-v1.0.0';

/* الملفات الأساسية التي يجب تخزينها عند التثبيت */
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,300&family=Tajawal:wght@400;500;700;800&display=swap'
];

/* ============= Install ============= */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Precaching app shell');
        // نستخدم addAll مع تجاوز الأخطاء (بعض الموارد قد لا تكون متاحة أوفلاين لأول مرة)
        return Promise.allSettled(
          PRECACHE_URLS.map(url => 
            cache.add(url).catch(err => console.warn('⚠️ فشل تخزين:', url, err.message))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ============= Activate ============= */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE)
          .map(key => {
            console.log('🗑️ حذف الكاش القديم:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

/* ============= Fetch ============= */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // تجاهل الطلبات غير GET
  if (request.method !== 'GET') return;

  // تجاهل طلبات chrome-extension
  if (url.protocol === 'chrome-extension:') return;

  // استراتيجية خاصة: Cache First للموارد الثابتة
  if (url.hostname === 'cdnjs.cloudflare.com' || 
      url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          // خزّن نسخة
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
          return response;
        }).catch(() => cached);
      })
    );
    return;
  }

  // الاستراتيجية الافتراضية: Network First مع fallback للكاش
  // (مناسب للصفحة الرئيسية والملفات المحلية)
  event.respondWith(
    fetch(request)
      .then(response => {
        // خزّن نسخة محدثة في الكاش
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // إذا فشل الاتصال، ارجع للكاش
        return caches.match(request).then(cached => {
          if (cached) return cached;
          // إذا لم يوجد الكاش، وأصبح الطلب للصفحة الرئيسية، أرجعها من الكاش
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
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
});