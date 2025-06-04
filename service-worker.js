const CACHE = 'hausaufgaben-v2';
const assets = [
  'index.html',
  'admin.html',
  'sus.html',
  'manifest.json',
  'service-worker.js',
  'assets/logo-huttwil.svg',
  'public/fade.css',
  'public/style-index.css',
  'public/style-shared.css',
  'public/style-sus.css',
  'public/admin.js',
  'public/sus.js'
];
self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(assets)))
);
self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
);
