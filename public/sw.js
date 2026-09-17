const CACHE_NAME = 'keepspace-v4';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png'
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
  if (event.request.method === 'POST' && (url.pathname === '/share-target' || url.pathname === '/share-target/')) {
    event.respondWith((async () => {
      try {
        const formData = await event.request.formData();
        
        // Universally collect all files across all form keys
        const incomingFiles = [];
        for (const [key, val] of formData.entries()) {
          if (val && typeof val === 'object' && (val instanceof File || val instanceof Blob || typeof val.arrayBuffer === 'function' || val.size > 0)) {
            incomingFiles.push(val);
          }
        }

        // Fallback check for common field names if entries iteration missed anything
        if (incomingFiles.length === 0) {
          const possibleKeys = ['files', 'media', 'file', 'image', 'images', 'photo', 'photos', 'document', 'documents'];
          for (const k of possibleKeys) {
            const vals = formData.getAll(k);
            for (const val of vals) {
              if (val && typeof val === 'object') {
                incomingFiles.push(val);
              }
            }
          }
        }

        const title = formData.get('title') || formData.get('name') || '';
        const text = formData.get('text') || formData.get('description') || '';
        const sharedUrl = formData.get('url') || formData.get('link') || '';

        const cache = await caches.open('keepspace-shared-payload');
        // Clear any previous stale payloads
        const existingKeys = await cache.keys();
        for (const req of existingKeys) {
          await cache.delete(req);
        }

        if (incomingFiles.length > 0) {
          for (let i = 0; i < incomingFiles.length; i++) {
            const file = incomingFiles[i];
            const ext = (file.type && file.type.includes('png')) ? '.png' : (file.type && file.type.includes('pdf')) ? '.pdf' : '.jpg';
            const fileName = file.name || `shared_photo_${i + 1}_${Date.now()}${ext}`;
            const response = new Response(file, {
              headers: {
                'content-type': file.type || 'image/jpeg',
                'x-filename': encodeURIComponent(fileName)
              }
            });
            await cache.put(`/shared-file-${i}`, response);
          }
          await cache.put('/shared-meta', new Response(JSON.stringify({
            count: incomingFiles.length,
            title,
            text,
            sharedUrl,
            timestamp: Date.now()
          }), {
            headers: { 'content-type': 'application/json' }
          }));
        } else if (text || sharedUrl) {
          await cache.put('/shared-meta', new Response(JSON.stringify({
            count: 0,
            title,
            text,
            sharedUrl,
            timestamp: Date.now()
          }), {
            headers: { 'content-type': 'application/json' }
          }));
        }

        // Broadcast to all open window clients
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clients) {
          client.postMessage({ type: 'KEEP_SPACE_SHARED_FILES', count: incomingFiles.length });
        }

        // Redirect user to the app root with a unique timestamp query param
        return Response.redirect(`/?shared=${Date.now()}`, 303);
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
