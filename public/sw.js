const CACHE_NAME = 'keepspace-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== 'keepspace-shared-payload') {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Request Interception
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle Web Share Target POST request from system share sheet (Photos, Gallery, etc.)
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        const files = formData.getAll('files');
        const title = formData.get('title') || '';
        const text = formData.get('text') || '';
        const sharedUrl = formData.get('url') || '';

        const cache = await caches.open('keepspace-shared-payload');

        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const response = new Response(file, {
              headers: {
                'content-type': file.type || 'application/octet-stream',
                'x-filename': encodeURIComponent(file.name || `shared_photo_${Date.now()}.jpg`)
              }
            });
            await cache.put(`/shared-file-${i}`, response);
          }
          await cache.put('/shared-meta', new Response(JSON.stringify({
            count: files.length,
            title,
            text,
            sharedUrl,
            timestamp: Date.now()
          })));
        } else if (text || sharedUrl) {
          await cache.put('/shared-meta', new Response(JSON.stringify({
            count: 0,
            title,
            text,
            sharedUrl,
            timestamp: Date.now()
          })));
        }

        // Redirect user to the app root with #shared hash
        return Response.redirect('/#shared', 303);
      } catch (err) {
        console.error('[SW] Share target processing error:', err);
        return Response.redirect('/', 303);
      }
    })());
    return;
  }

  // Skip caching API requests or external links
  if (url.pathname.startsWith('/api') || !url.origin.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch new version in background (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Ignore network errors offline */});
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});
