const CACHE_NAME = "net-control-v3";
const ASSETS = [
    "/",
    "/index.html",
    "/styles.css",
    "/script.js",
    "/manifest.json",
    "/img/icon-192.png",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
];

// Evento de instalación
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Cache abierto');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Evento de activación
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Borrando cache antigua:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Evento fetch
self.addEventListener('fetch', (event) => {
    // Ignora solicitudes de chrome-extension
    if (event.request.url.includes('chrome-extension')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Devuelve la respuesta en caché o realiza la petición
                return response || fetch(event.request)
                    .then((fetchResponse) => {
                        // Si es una petición GET, guarda en caché
                        if (event.request.method === 'GET') {
                            const responseToCache = fetchResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => cache.put(event.request, responseToCache));
                        }
                        return fetchResponse;
                    });
            }).catch(() => {
                // Fallback para cuando no hay conexión y no está en caché
                if (event.request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
            })
    );
});