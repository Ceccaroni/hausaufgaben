// Datei: service-worker.js
// Robuster SW mit Versionierung, gezieltem Caching und sauberem Upgrade

const CACHE_NAME = 'hausaufgaben-v7';

// Nur die wirklich zentralen, stabilen Assets vorab cachen.
// (Fehlende Dateien brechen die Installation NICHT ab.)
const PRECACHE_ASSETS = [
  'index.html',
  'admin.html',
  'sus.html',
  'manifest.json',

  // App-Icons und Sounds
  'assets/logo-huttwil.svg',
  'assets/gear.svg',
  'assets/sounds/tap-tiny-wooden.mp3',
  'assets/favicon-32.png',
  'assets/apple-touch-icon.png',

  // Styles
  'public/fade.css',
  'public/style-index.css',
  'public/style-shared.css',
  'public/style-settings.css',
  'public/style-sus.css',
  'public/style-admin.css',

  // Scripts
  'public/admin.js',
  'public/sus.js',
  'public/style-settings-overlay.js'
];

// Hilfsfunktion: sicher in Cache ablegen (ohne Install zu brechen)
async function safeAddAll(cache, urls) {
  await Promise.all(urls.map(async (url) => {
    try {
      const res = await fetch(url, { cache: 'no-cache' });
      if (res && res.ok) {
        await cache.put(url, res.clone());
      } else {
        // stillschweigend überspringen, wenn 404/500 etc.
      }
    } catch (_) {
      // Netzwerkfehler: überspringen
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await safeAddAll(cache, PRECACHE_ASSETS);
    // Sofort aktiv werden
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Alte Caches wegräumen
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== CACHE_NAME)
        .map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// Strategien:
// - HTML/Navigations-Requests: network-first, Fallback Cache
// - Sonst: cache-first, Fallback Netz
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Non-GET nicht anfassen
  if (req.method !== 'GET') {
    return;
  }

  // Navigations-/HTML-Requests → network-first
  if (req.mode === 'navigate' || (req.destination === 'document')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, { cache: 'no-cache' });
        // Erfolgreiche Antwort cachen
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (_) {
        // Fallback: Cache
        const cached = await caches.match(req);
        if (cached) return cached;
        // Letzter Fallback: index.html
        return caches.match('index.html');
      }
    })());
    return;
  }

  // Für statische Assets → cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);
      // Erfolgreiches Ergebnis opportunistisch cachen
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, res.clone());
      return res;
    } catch (_) {
      // Netzfehler und nichts im Cache
      return new Response('Offline und Ressource nicht im Cache.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
