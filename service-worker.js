const CACHE = 'hausaufgaben-v2';
const assets = [
  'index.html',
  'admin.html',
  'sus.html',
  'manifest.json',
  'service-worker.js',

  // App-Icons und Sounds
  'assets/logo-huttwil.svg',
  'assets/gear.svg',
  'assets/tap-tiny-wooden.mp3',

  // Styles
  'public/fade.css',
  'public/style-index.css',
  'public/style-shared.css',
  'public/style-sus.css',
  'public/style-settings.css',
  'public/style-settings-overlay.js',

  // Scripts
  'public/admin.js',
  'public/sus.js'
];

self.addEventListener('install', e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(assets)))
);

self.addEventListener('fetch', e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
);
