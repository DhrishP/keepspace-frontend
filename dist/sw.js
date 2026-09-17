const CACHE_NAME = 'keepspace-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Helper to save shared payload into IndexedDB
function saveShareToIndexedDB(payload) {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('keepspace_share_db', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('shares')) {
          db.createObjectStore('shares', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => {
        try {
          const db = e.target.result;
          const tx = db.transaction('shares', 'readwrite');
          const store = tx.objectStore('shares');
          store.put(payload);
          tx.oncomplete = () => {
            db.close();
            resolve(true);
          };
          tx.onerror = () => {
            db.close();
            resolve(false);
          };
        } catch (txErr) {
          resolve(false);
        }
      };
      req.onerror = () => resolve(false);
    } catch (err) {
      resolve(false);
    }
  });
}

function isFileObject(val) {
  if (!val || typeof val !== 'object') return false;
  if (typeof File !== 'undefined' && val instanceof File) return true;
  if (typeof Blob !== 'undefined' && val instanceof Blob) return true;
  if (typeof val.arrayBuffer === 'function') return true;
  if (typeof val.size === 'number' && val.size > 0 && typeof val.name === 'string') return true;
  return false;
}

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
  if (event.request.method === 'POST' && url.pathname.includes('share-target')) {
    event.respondWith((async () => {
      try {
        let formData;
        try {
          const clonedReq = event.request.clone();
          formData = await clonedReq.formData();
        } catch (formErr) {
          formData = await event.request.formData();
        }
        
        // Universally collect all files across all form keys
        const incomingFiles = [];
        try {
          for (const [key, val] of formData.entries()) {
            if (isFileObject(val)) {
              incomingFiles.push(val);
            }
          }
        } catch (entryErr) {
          console.warn('[SW] formData.entries() iteration failed:', entryErr);
        }

        // Fallback check for common field names if entries iteration missed anything
        if (incomingFiles.length === 0) {
          const possibleKeys = ['files', 'files[]', 'file', 'media', 'image', 'images', 'photo', 'photos', 'document', 'documents'];
          for (const k of possibleKeys) {
            try {
              const vals = formData.getAll(k);
              for (const val of vals) {
                if (isFileObject(val)) {
                  incomingFiles.push(val);
                }
              }
            } catch (_) {}
          }
        }

        const title = formData.get('title') || formData.get('name') || '';
        const text = formData.get('text') || formData.get('description') || '';
        const sharedUrl = formData.get('url') || formData.get('link') || '';

        // 1. Primary storage: IndexedDB (stores raw binary Blobs cleanly without URL serialization quirks)
        const fileRecords = [];
        for (let i = 0; i < incomingFiles.length; i++) {
          const f = incomingFiles[i];
          const ext = (f.type && f.type.includes('png')) ? '.png' : (f.type && f.type.includes('pdf')) ? '.pdf' : '.jpg';
          const name = f.name || `shared_photo_${i + 1}_${Date.now()}${ext}`;
          fileRecords.push({
            name,
            type: f.type || 'image/jpeg',
            blob: f
          });
        }

        await saveShareToIndexedDB({
          id: 'pending_share',
          timestamp: Date.now(),
          title: String(title),
          text: String(text),
          url: String(sharedUrl),
          files: fileRecords
        });

        // 2. Secondary fallback: CacheStorage
        try {
          const cache = await caches.open('keepspace-shared-payload');
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
        } catch (cacheErr) {
          console.warn('[SW] CacheStorage write warning:', cacheErr);
        }

        // Broadcast to all open window clients if app is already active
        try {
          const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of clients) {
            client.postMessage({ type: 'KEEP_SPACE_SHARED_FILES', count: incomingFiles.length });
          }
        } catch (_) {}

        // Redirect user to the app root with a unique timestamp query param
        return Response.redirect(`/?shared=${Date.now()}`, 303);
      } catch (err) {
        console.error('[SW] Share target processing error:', err);
        return Response.redirect(`/?shared_err=${encodeURIComponent(err.message || 'unknown')}`, 303);
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
