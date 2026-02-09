const CACHE_NAME = 'elp-offline-v2';
const DYNAMIC_CACHE = 'elp-dynamic-v2';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/login',
    '/static/css/style.css',
    '/static/css/mobile.css',
    '/static/css/mobile-accessibility.css',
    '/static/js/main.js',
    '/static/js/offline.js',
    '/static/icons/icon-192x192.png',
    '/static/icons/icon-512x512.png',
    '/static/manifest.json',
    // External CDNs (will be opaque)
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
                    console.log('[SW] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// Network First, fallback to Cache strategy for HTML
// Cache First, fallback to Network for Assets
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // API calls: Network Only (handled by offline.js queue)
    if (url.pathname.startsWith('/api/') || event.request.method !== 'GET') {
        return;
    }

    // Static Assets: Cache First
    if (url.pathname.startsWith('/static/') || STATIC_ASSETS.includes(event.request.url)) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(fetchRes => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request.url, fetchRes.clone());
                        return fetchRes;
                    });
                });
            })
        );
        return;
    }

    // Navigations (HTML): Network First, Fallback to Cache, Fallback to Offline Page
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    return caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request.url, response.clone()); // Cache visited pages
                        return response;
                    });
                })
                .catch(() => {
                    return caches.match(event.request).then(response => {
                        if (response) return response;
                        // Opcional: retornar página offline.html se existir
                        if (caches.match('/offline')) return caches.match('/offline');
                        return caches.match('/'); // Fallback to home/dashboard if cached
                    });
                })
        );
        return;
    }
});
