const CACHE = 'hausaufgaben-v1';
const assets = [
  'sus.html',
  'manifest.json',
  'service-worker.js',
  'assets/logo-huttwil.svg'
];
self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(assets)))
);
self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
);
