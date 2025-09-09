/* Datei: service-worker.js – Netzwerk-first für HTML/JS, SW-safe Caching */

const CACHE_NAME = 'hausaufgaben-v7'; // <— bei Änderungen hochzählen!

self.addEventListener('install', (event) => {
  // sofort aktiv werden
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // alte Caches löschen & Clients übernehmen
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => k === CACHE_NAME ? null : caches.delete(k)));
    await self.clients.claim();
  })());
});

/**
 * Routing-Regeln:
 * - HTML-Navigation & .html & .js  => network-first (immer neu, Cache nur Fallback)
 * - CSS/Fonts/Images/Audio         => stale-while-revalidate (schnell + im Hintergrund aktualisieren)
 * - Rest                            => passthrough (direkt aus dem Netz)
 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isHTML = req.mode === 'navigate' || url.pathname.endsWith('.html');
  const isJS   = url.pathname.endsWith('.js') || url.searchParams.has('v'); // Versionierte Module
  const isAsset= /\.(css|png|jpg|jpeg|gif|svg|ico|webp|mp3|wav|woff2?|ttf|eot)$/i.test(url.pathname);

  if (isHTML || isJS) {
    // network-first
    event.respondWith((async () => {
      try {
        const net = await fetch(req, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req, { ignoreSearch: false });
        return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  if (isAsset) {
    // stale-while-revalidate
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const fetchPromise = fetch(req).then((net) => {
        cache.put(req, net.clone());
        return net;
      }).catch(() => null);
      return cached || fetchPromise || fetch(req);
    })());
    return;
  }

  // default: passthrough
});

self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_SW') {
    (async () => {
      const regs = await self.registration.unregister();
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    })();
  }
});
