/* ============================================================================
   packs.js — the content-pack registry and lazy loader.

   Only the tiny `META` list below is known at startup; a pack's real data (the
   items, names, taunts…) lives in its own pack-<id>.js file and is fetched the
   first time that pack is needed, then cached by the service worker like any
   other file. Each pack file calls Packs.register(pack) when it runs.

   The loader is injectable so the same registry runs in Node tests.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.Packs = factory(root.Engine, scriptLoader(root));

  function scriptLoader(r) {
    return function load(file) {
      return new Promise(function (resolve, reject) {
        const s = r.document.createElement('script');
        s.src = file; s.async = true;
        s.onload = resolve;
        s.onerror = function () { s.remove(); reject(new Error('Could not load ' + file)); };
        r.document.head.appendChild(s);
      });
    };
  }
})(typeof self !== 'undefined' ? self : this, function createRegistry(Engine, loadScript, meta) {
  'use strict';

  /* id → file, plus the few facts the menus need before the data is loaded.
     `count` is checked against the real pack by the tests so it cannot drift. */
  const META = meta || [
    { id: 'countries', file: 'pack-countries.js', count: 196 }
  ];

  const loaded = new Map(), pending = new Map();

  function register(pack) {
    const errs = Engine.validatePack(pack);
    if (errs.length) throw new Error('Invalid pack "' + (pack && pack.id) + '": ' + errs.join('; '));
    loaded.set(pack.id, pack);
    return pack;
  }

  /* Resolves with the pack, rejects (never hangs) if the file is missing or invalid.
     A failed load is not cached, so a later retry can succeed. */
  function load(id) {
    if (loaded.has(id)) return Promise.resolve(loaded.get(id));
    if (pending.has(id)) return pending.get(id);
    const m = META.find(x => x.id === id);
    if (!m) return Promise.reject(new Error('Unknown pack "' + id + '"'));
    const p = Promise.resolve()
      .then(() => loadScript(m.file))
      .then(() => {
        if (!loaded.has(id)) throw new Error(m.file + ' did not register pack "' + id + '"');
        return loaded.get(id);
      })
      .finally(() => pending.delete(id));
    pending.set(id, p);
    return p;
  }

  return {
    META,
    register, load,
    get: id => loaded.get(id) || null,
    isLoaded: id => loaded.has(id),
    meta: id => META.find(x => x.id === id) || null,
    ids: () => META.map(m => m.id)
  };
});
