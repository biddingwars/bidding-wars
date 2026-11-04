/* Service worker — the whole game is cached on first visit, then served from
   cache. After that it runs with no connection at all, which is the point. */

const CACHE = 'bidding-wars-v60';

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

/* The files the game cannot start without. If one of them cannot be cached (a flaky connection during the first visit), the install FAILS, so the half-filled cache never
   takes over and the next visit tries again; a missing optional file (an icon, the privacy page) is allowed to fail on its own. */
const CORE = ['./', './index.html', './app.css', './platform.js', './sound.js', './fx.js', './engine.js', './packs.js', './banter.js', './pack-countries.js', './pack-states.js', './pack-capitals.js', './us-map.js', './us-map.webp', './app.js', './globe.js', './us-view.js', './three.min.js', './countries-110m.json', './earth.jpg', './globe-hero.webp'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    const failed = [];
    await Promise.all(SHELL.map(u => c.add(u).catch(() => failed.push(u))));
    for (const u of failed.filter(u => CORE.includes(u))) await c.add(u);      // one more try; throws (the install fails) when a core file is still missing
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
      /* offline and not cached: a page navigation gets the game; anything else (a script, an image) must fail as itself, never come back as an HTML page */
      return req.mode === 'navigate' ? ((await caches.match('./index.html')) || Response.error()) : Response.error();
    }
  })());
});
