/* Service worker — the whole game is cached on first visit, then served from
   cache. After that it runs with no connection at all, which is the point. */

const CACHE = 'bidding-wars-v4';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './css/fonts.css',
  './js/platform.js',
  './js/data.js',
  './js/app.js',
  './js/globe.js',
  './vendor/three.min.js',
  './data/countries-110m.json',
  './fonts/ArchivoBlack-Regular.woff2',
  './fonts/SpaceGrotesk-Regular.woff2',
  './fonts/SpaceGrotesk-Bold.woff2',
  './fonts/SpaceMono-Bold.woff2',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/icon-180.png'
];

/* Missing optional files (fonts you have not dropped in yet) must not abort the
   whole install, so each one is cached on its own and allowed to fail. */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(u => c.add(u).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Cache first: the game never needs fresher data than it shipped with.
   A new version arrives by bumping CACHE above. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch (err) {
      return (await caches.match('./index.html')) || Response.error();
    }
  })());
});
