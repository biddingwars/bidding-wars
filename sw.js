/* Service worker — the whole game is cached on first visit, then served from
   cache. After that it runs with no connection at all, which is the point. */

const CACHE = 'bidding-wars-v67';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './app.css',
  './platform.js',
  './sound.js',
  './fx.js',
  './engine.js',
  './packs.js',
  './banter.js',
  './i18n-pt.js',
  './i18n-id.js',
  './i18n-zh.js',
  './i18n-hi.js',
  './i18n-ja.js',
  './i18n-ko.js',
  './i18n-ar.js',
  './i18n-th.js',
  './pack-countries.js',
  './pack-states.js',
  './pack-capitals.js',
  './app.js',
  './globe.js',
  './us-view.js',
  './us-map.js',
  './us-map.webp',
  './us-ak.webp',
  './us-hi.webp',
  './three.min.js',
  './countries-110m.json',
  './earth.jpg',
  './globe-hero.webp',
  './logo.svg',
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  './icon-180.png',
  './privacy.html',
  './support.html'
];

/* A missing optional file must not abort the whole install, so each one is cached on its own and allowed to fail. */
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    /* cache: 'reload' skips the browser's HTTP cache (GitHub Pages lets it keep files 10 minutes): without it a new version
       deployed soon after the last one was saved with the OLD files and the menu still showed the old number (v62 on an iPad). */
    await Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => null)));
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
      /* offline and not cached: a page navigation gets the game's page; anything else (an image, a script, a language file) gets a real network error,
         so its own fallback runs (the drawn globe texture, the English strings) instead of being handed HTML */
      if (req.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
