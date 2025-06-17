const CACHE_NAME = "net-control-v4";  // Incrementa la versión para forzar actualización
const ASSETS = [
    "/",
    "/index.html",
    "/styles.css",
    "/script.js",
    "/manifest.json",
    "/img/icon-192.png",
    "/img/icon-512.png",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
];

const CACHEABLE_DOMAINS = [
    'cdn.jsdelivr.net',
    'cdnjs.cloudflare.com'
];

// Evento de instalación mejorado
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Cache abierto');
                // Intenta agregar todos los assets, pero continúa aunque falle alguno
                return Promise.all(
                    ASSETS.map(asset => {
                        return cache.add(asset).catch(err => {
                            console.warn(`[SW] No se pudo cachear ${asset}:`, err);
                        });
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Todos los recursos en caché');
                return self.skipWaiting();
            })
    );
});

// Evento de activación mejorado
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Borrando cache antigua:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => {
            console.log('[Service Worker] Listo para manejar fetch events');
            return self.clients.claim();
        })
    );
});

// Evento fetch optimizado
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Ignora solicitudes no GET y extensiones de navegador
    if (request.method !== 'GET' || request.url.startsWith('chrome-extension:')) {
        return;
    }

    // Estrategia: Cache First, con fallback a Network
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            // Si está en caché y es un recurso local, devuélvelo
            if (cachedResponse && !isExternalResource(request.url)) {
                return cachedResponse;
            }

            // Para recursos externos o no cacheados, haz la petición
            return fetch(request).then((response) => {
                // Solo cacheamos respuestas exitosas y del mismo origen/dominios permitidos
                if (response && response.status === 200 && shouldCache(request.url)) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(request, responseToCache);
                    });
                }
                return response;
            }).catch(() => {
                // Fallback para páginas HTML
                if (request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
                // Para otros recursos, devuelve la versión en caché si existe
                if (cachedResponse) return cachedResponse;
                // Podrías devolver una respuesta de fallback genérica aquí
            });
        })
    );
});

// Helper: ¿Es un recurso externo?
function isExternalResource(url) {
    try {
        const domain = new URL(url).hostname;
        return !domain.includes(window.location.hostname) &&
            !CACHEABLE_DOMAINS.includes(domain);
    } catch {
        return false;
    }
}

// Helper: ¿Debería cachear este recurso?
function shouldCache(url) {
    return url.startsWith('http') && (
        url.includes(window.location.hostname) ||
        CACHEABLE_DOMAINS.some(domain => url.includes(domain))
    );
}