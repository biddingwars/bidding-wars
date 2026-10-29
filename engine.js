/* ============================================================================
   engine.js — the pure game engine. No DOM, no storage, no timers, no audio.
   It runs unchanged in the browser (global `Engine`) and in Node (require),
   which is what makes the whole game rules unit-testable.

   Everything the game *knows* comes in through a content pack (see packs.js and
   CLAUDE.md "Adding a pack"); everything it *shows* is the view's job (app.js).
   The view mutates nothing in here directly — it calls the functions below and
   renders the state they leave behind.

   Randomness is always injected (`rng(n)` → integer in [0, n)), so a seeded
   generator makes any game exactly reproducible in a test.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LANGS = ['en', 'de', 'it', 'es', 'fr'];

  /* ---------------------------------------------------------------- randomness */
  function cryptoRng() {
    const c = typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues ? globalThis.crypto : null;
    return function (n) {
      if (c) { const a = new Uint32Array(1); c.getRandomValues(a); return a[0] % n; }
      return Math.floor(Math.random() * n);
    };
  }
  function seededRng(seed) {           // mulberry32
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const r = n => Math.floor(next() * n);
    r.next = next;
    return r;
  }
  const defaultRng = cryptoRng();

  /* Pick one line, trying not to repeat `avoid`. */
  function pick(arr, avoid, rng) {
    rng = rng || defaultRng;
    if (!arr || !arr.length) return '';
    if (arr.length === 1) return arr[0];
    let v, tries = 0;
    do { v = arr[rng(arr.length)]; } while (v === avoid && ++tries < 12);
    return v;
  }

  /* ------------------------------------------------------------- item helpers */
  const itemName = (item, lang) =>
    (item.name && (item.name[lang] || item.name.en)) || String(item.id);

  /* Flags exist only for countries; everything else gets a text badge. */
  function itemIcon(pack, item) {
    if (item.icon) return item.icon;
    if (pack && pack.iconKind === 'flag') return { flag: item.flag || item.id };
    const en = itemName(item, 'en');
    const text = item.abbr || (String(item.id).length <= 3 ? String(item.id) :
      en.split(/\s+/).map(w => w[0]).join('').slice(0, 3)).toUpperCase();
    return { badge: text };
  }
  const hasCoords = item => Number.isFinite(item.lat) && Number.isFinite(item.lon);

  /* ----------------------------------------------------------- pack validation */
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const isLoc = v => isObj(v) && typeof v.en === 'string' && v.en.length > 0;
  const isPosInt = v => Number.isInteger(v) && v > 0;

  function validatePack(pack) {
    const errs = [];
    const e = m => errs.push(m);
    if (!isObj(pack)) return ['pack is not an object'];
    if (typeof pack.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(pack.id)) e('id must be a lowercase slug');
    if (!isLoc(pack.title)) e('title must be a localised object with an "en" entry');
    if (!isLoc(pack.noun)) e('noun must be a localised object with an "en" entry');

    if (!Array.isArray(pack.items) || !pack.items.length) e('items must be a non-empty array');
    else {
      const seen = new Set();
      pack.items.forEach((it, i) => {
        const w = 'items[' + i + ']';
        if (!isObj(it)) return e(w + ' is not an object');
        if (typeof it.id !== 'string' || !it.id) e(w + ' needs a string id');
        else if (seen.has(it.id)) e(w + ' duplicate id ' + it.id); else seen.add(it.id);
        if (!isLoc(it.name)) e(w + ' (' + it.id + ') name must be a localised object with "en"');
        if (!(typeof it.value === 'number' && Number.isFinite(it.value) && it.value > 0)) e(w + ' (' + it.id + ') value must be a finite number > 0');
        const hasLat = it.lat !== undefined, hasLon = it.lon !== undefined;
        if (hasLat !== hasLon) e(w + ' (' + it.id + ') lat and lon must be given together');
        else if (hasLat && !(Number.isFinite(it.lat) && it.lat >= -90 && it.lat <= 90 && Number.isFinite(it.lon) && it.lon >= -180 && it.lon <= 180)) e(w + ' (' + it.id + ') lat/lon out of range');
        if (it.tags !== undefined && !(Array.isArray(it.tags) && it.tags.every(t => typeof t === 'string'))) e(w + ' (' + it.id + ') tags must be an array of strings');
        if (it.icon !== undefined) {
          const k = isObj(it.icon) ? Object.keys(it.icon) : [];
          if (!(k.length === 1 && ['flag', 'badge', 'emoji'].includes(k[0]) && typeof it.icon[k[0]] === 'string')) e(w + ' (' + it.id + ') icon must be {flag}|{badge}|{emoji}');
        }
      });
    }

    const m = pack.metric;
    if (!isObj(m) || !isLoc(m.label) || typeof m.format !== 'function' || typeof m.effUnit !== 'string') e('metric needs { label (localised), format(value) function, effUnit string }');
    else if (Array.isArray(pack.items) && pack.items.length) {
      const s = m.format(pack.items[0].value);
      if (typeof s !== 'string' || !s) e('metric.format must return a non-empty string');
    }
    if (!isObj(pack.currency) || typeof pack.currency.symbol !== 'string' || !pack.currency.symbol) e('currency.symbol is required');
    if (!isPosInt(pack.budgetPerLot)) e('budgetPerLot must be a positive integer');
    if (!isObj(pack.lots) || !Array.isArray(pack.lots.options) || !pack.lots.options.length || !pack.lots.options.every(isPosInt) || !pack.lots.options.includes(pack.lots.default)) e('lots needs { options: [positive ints], default: one of them }');

    if (!Array.isArray(pack.bands) || !pack.bands.length) e('bands must be a non-empty array');
    else {
      let prev = 0;
      pack.bands.forEach((b, i) => {
        if (!(b.upTo > prev && b.upTo <= 1)) e('bands[' + i + '].upTo must be increasing and <= 1');
        if (!(b.ideal > 0 && b.max >= b.ideal)) e('bands[' + i + '] needs 0 < ideal <= max');
        prev = b.upTo;
      });
      if (pack.bands[pack.bands.length - 1].upTo !== 1) e('the last band must end at upTo: 1');
    }

    if (!Array.isArray(pack.levels) || !pack.levels.length) e('levels must be a non-empty array');
    else {
      const ids = new Set();
      pack.levels.forEach((l, i) => {
        if (typeof l.id !== 'string' || !l.id) e('levels[' + i + '] needs an id'); else if (ids.has(l.id)) e('duplicate level ' + l.id); else ids.add(l.id);
        if (!isLoc(l.label)) e('levels[' + i + '] label must be localised');
        if (Array.isArray(pack.items)) {
          let n = 0;
          try { n = levelPool(pack, l.id).length; } catch (x) { n = 0; }
          if (n < 2) e('level "' + l.id + '" leaves fewer than 2 items to auction');
        }
      });
      if (!ids.has(pack.defaultLevel)) e('defaultLevel must be one of the level ids');
    }

    const t = pack.taunts;
    if (!isObj(t) || !Array.isArray(t.tiers) || !t.tiers.length) e('taunts.tiers must be a non-empty array of { id, min } (descending min)');
    else {
      for (let i = 0; i < t.tiers.length; i++) {
        if (typeof t.tiers[i].id !== 'string' || typeof t.tiers[i].min !== 'number') e('taunts.tiers[' + i + '] needs { id, min }');
        if (i && !(t.tiers[i].min < t.tiers[i - 1].min)) e('taunts.tiers must be strictly descending by min');
      }
      if (Array.isArray(pack.items) && pack.items.length && t.tiers.length && Math.min(...pack.items.map(x => x.value)) < t.tiers[t.tiers.length - 1].min) e('the last taunt tier must catch the smallest value (min <= smallest item value)');
    }
    if (pack.globe !== undefined && !isObj(pack.globe)) e('globe must be an object when given');
    return errs;
  }

  /* -------------------------------------------------------------------- levels */
  function inLevel(level, item) {
    if (level.tag && !(item.tags && item.tags.includes(level.tag))) return false;
    if (level.minValue != null && !(item.value >= level.minValue)) return false;
    return true;
  }
  function levelPool(pack, levelId) {
    const level = pack.levels.find(l => l.id === levelId) || pack.levels.find(l => l.id === pack.defaultLevel) || pack.levels[0];
    return pack.items.filter(it => inLevel(level, it));
  }
  /* True randomness, no bias toward small items: Fisher-Yates over the level's pool. */
  function draw(pack, n, levelId, rng) {
    rng = rng || defaultRng;
    const pool = levelPool(pack, levelId);
    for (let i = pool.length - 1; i > 0; i--) { const j = rng(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return pool.slice(0, Math.min(n, pool.length));
  }

  /* ------------------------------------------------------------------- pricing
     Items are ranked 1 (smallest value) to N (largest). A band is chosen by the
     item's percentile, rank / N, and sets what the bot will pay per unit of
     value: an `ideal` rate and a hard `max`. Everything the bot does with money
     comes out of this table. Ties keep the pack's own item order. */
  const priceCache = new WeakMap();
  function priceTable(pack) {
    let t = priceCache.get(pack);
    if (t) return t;
    const n = pack.items.length;
    const order = pack.items.map((it, i) => i).sort((a, b) => pack.items[a].value - pack.items[b].value);
    t = new Map();
    order.forEach((idx, pos) => {
      const item = pack.items[idx], rank = pos + 1, pct = rank / n;
      const band = pack.bands.find(b => pct <= b.upTo) || pack.bands[pack.bands.length - 1];
      const ideal = Math.max(1, Math.round(item.value * band.ideal));
      t.set(item.id, { rank, pct, ideal, max: Math.max(ideal, Math.round(item.value * band.max)) });
    });
    priceCache.set(pack, t);
    return t;
  }
  const priceOf = (pack, item) => priceTable(pack).get(item.id);

  /* One roll per lot, somewhere between the table's ideal price and its maximum.
     The maximum is absolute — no endgame surge, no favourites, no stepping over it. */
  function botCeiling(pack, item, rng) {
    rng = rng || defaultRng;
    const { ideal, max } = priceOf(pack, item);
    return { ideal, max, walk: ideal + rng(max - ideal + 1) };
  }

  /* ------------------------------------------------------------------- taunts */
  function tierOf(pack, value) {
    const tiers = pack.taunts.tiers;
    return (tiers.find(t => value >= t.min) || tiers[tiers.length - 1]).id;
  }
  /* English keeps its hand-written per-item bank; every language also has generic
     lines by size tier with the localised item name slotted in. */
  function tauntFor(pack, item, lang, avoid, rng) {
    const bank = pack.taunts || {};
    if (lang === 'en' && bank.items && bank.items[item.id]) return pick(bank.items[item.id], avoid, rng);
    const g = bank.generic && (bank.generic[lang] || bank.generic.en);
    if (!g) return '';
    const line = pick(g[tierOf(pack, item.value)], null, rng);
    return line.split('{n}').join(itemName(item, lang));
  }
  const passLine = (banter, lang, avoid, rng) => pick(((banter[lang] || banter.en) || {}).pass, avoid, rng);
  const winLine = (banter, lang, avoid, rng) => pick(((banter[lang] || banter.en) || {}).win, avoid, rng);

  /* ------------------------------------------------------------------- auction */
  const budgetFor = (pack, lots) => lots * pack.budgetPerLot;

  /* players: [{ name, ai }]. Returns the single mutable state object the view
     renders. Field names are stable on purpose. */
  function newAuction(opts) {
    const pack = opts.pack, rng = opts.rng || defaultRng;
    const lots = opts.lots, budget = budgetFor(pack, lots);
    return {
      pack, rng,
      kind: opts.kind, mode: opts.kind === 'solo' ? 'bot' : 'table',
      i: 0, clock: opts.clock || 0, level: opts.level || pack.defaultLevel,
      items: draw(pack, lots, opts.level, rng),
      players: opts.players.map(p => ({ name: p.name, budget, bought: [], ai: !!p.ai })),
      L: null, _ceil: null, _ceilLot: -1
    };
  }

  function nextAfter(S, idx) {
    const a = S.L.active;
    const pos = a.indexOf(idx);
    for (let k = 1; k <= a.length; k++) { const cand = a[(pos + k) % a.length]; if (cand !== S.L.holder) return cand; }
    return null;
  }

  /* Opens the next lot. → { state:'lot' } or { state:'done', reason } */
  function startLot(S) {
    if (S.i >= S.items.length) return { state: 'done', reason: 'end' };
    const eligible = S.players.map((p, i) => i).filter(i => S.players[i].budget >= 1);
    if (eligible.length === 0) {                         // nobody can pay for anything anymore
      S.i = S.items.length;
      return { state: 'done', reason: 'broke' };
    }
    if (eligible.length === 1 && S.players.length > 1) { // walkover: the rest goes to the last solvent bidder
      const w = S.players[eligible[0]];
      while (S.i < S.items.length) {
        const it = S.items[S.i];
        if (w.budget >= 1) { w.budget -= 1; w.bought.push({ ...it, price: 1 }); }
        else w.bought.push({ ...it, price: 0, free: true });
        S.i++;
      }
      return { state: 'done', reason: 'walkover' };
    }
    /* The opening €1 bid rotates seat by seat: seat 1 opens the first lot, seat 2 the
       second, and so on. Seats with no money left are skipped. */
    const opener = eligible[S.i % eligible.length];
    S.L = { price: 1, holder: opener, active: eligible.slice(), turn: null };
    S.L.turn = nextAfter(S, opener);
    S._ceil = null;
    return { state: 'lot' };
  }

  /* A lot that has been awarded is closed: a late tap (a second Drop out during the
     sold animation, a timer firing as the hammer falls) must never act on it again. */
  const closed = S => !S.L || S.L.awarded === true || S.L.turn === null || !S.players[S.L.turn];

  /* → { ok:true, next:'turn'|'award' } or { error:'closed'|'mustBeat'|'tooMuch' } */
  function raise(S, amount) {
    if (closed(S)) return { error: 'closed' };
    const L = S.L, actor = S.players[L.turn];
    if (!Number.isInteger(amount) || !(amount > L.price)) return { error: 'mustBeat' };
    if (amount > actor.budget) return { error: 'tooMuch' };
    L.price = amount; L.holder = L.turn; L.turn = nextAfter(S, L.holder);
    return { ok: true, next: L.turn === null ? 'award' : 'turn' };
  }

  function pass(S) {
    if (closed(S)) return { error: 'closed' };
    const L = S.L;
    L.active = L.active.filter(i => i !== L.turn);
    if (L.active.length <= 1) return { ok: true, next: 'award' };
    L.turn = nextAfter(S, L.holder);
    return { ok: true, next: L.turn === null ? 'award' : 'turn' };
  }

  function award(S) {
    if (!S.L || S.L.awarded) return { error: 'closed' };
    const L = S.L, w = S.players[L.holder], item = S.items[S.i];
    L.awarded = true;
    w.budget -= L.price;
    w.bought.push({ ...item, price: L.price });
    return { winner: L.holder, item, price: L.price, ideal: priceOf(S.pack, item).ideal, ai: w.ai };
  }

  function advance(S) { S.i++; return startLot(S); }

  /* ----------------------------------------------------------------- the bot
     Reads the table and the room, never the screen. The random draws happen in a
     fixed order (walk-away roll once per lot, then the raise step), so a seeded
     rng reproduces a game exactly. */
  function botDecision(S) {
    const rng = S.rng, L = S.L, item = S.items[S.i], me = S.players[L.turn];
    if (!S._ceil || S._ceilLot !== S.i) { S._ceil = botCeiling(S.pack, item, rng); S._ceilLot = S.i; }
    /* Outside the closing three lots the bot keeps a euro in hand for every lot still
       to come, so it can never bid itself out of the auction early. */
    const lotsAfter = S.items.length - S.i - 1;
    const reserve = lotsAfter >= 3 ? lotsAfter : 0;
    const hardCap = Math.min(me.budget - reserve, S._ceil.walk);

    if (L.price < hardCap && me.budget > L.price) {
      /* If nobody left in the room can top the next bid, one euro settles it. Paying
         more than that is throwing money away, and the bot never does that. */
      const rivals = L.active.filter(i => i !== L.turn);
      const contested = rivals.some(i => S.players[i].budget > L.price + 1);
      const step = !contested ? 1
        : L.price < 5 ? 1
        : Math.max(1, Math.round(L.price * (0.12 + rng(15) / 100)));
      const amount = Math.min(me.budget, hardCap, L.price + step);
      if (amount > L.price) return { type: 'raise', amount };
    }
    return { type: 'pass' };
  }

  /* ------------------------------------------------------------------- results */
  function scoreboard(S) {
    const rows = S.players.map(p => {
      const pts = p.bought.reduce((a, b) => a + b.value, 0);
      const spent = p.bought.reduce((a, b) => a + b.price, 0);
      return { p, pts, spent, eff: pts > 0 ? spent / pts : Infinity };
    });
    const best = rows.slice().sort((a, b) => b.pts - a.pts)[0];
    const bestEff = rows.slice().sort((a, b) => a.eff - b.eff)[0];
    return { rows, best, bestEff };
  }

  /* ------------------------------------------------------------------- records
     Stored as ONE value under the existing `record:v1` key:
       { v:2, packs: { <packId>: { played, won, lost, ... byLevel } } }
     The first version was a single flat record (the countries pack); it migrates
     in place. Anything unreadable falls back to a blank record, never a crash. */
  const REC_KEY = 'record:v1';
  const blankPackRecord = () => ({
    played: 0, won: 0, lost: 0, drawn: 0, pts: 0, botPts: 0, spent: 0, streak: 0, best: 0,
    bestGame: null, byLevel: {}          // a level's counters appear the first time it is played
  });
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v)) ? v : d;
  const cnt = (v) => Math.max(0, Math.round(num(v, 0)));

  function sanitizePackRecord(raw) {
    const b = blankPackRecord();
    if (!isObj(raw)) return b;
    const r = {
      played: cnt(raw.played), won: cnt(raw.won), lost: cnt(raw.lost), drawn: cnt(raw.drawn),
      pts: Math.max(0, num(raw.pts, 0)), botPts: Math.max(0, num(raw.botPts, 0)), spent: Math.max(0, num(raw.spent, 0)),
      streak: Math.round(num(raw.streak, 0)), best: cnt(raw.best), bestGame: null, byLevel: b.byLevel
    };
    if (isObj(raw.bestGame) && Number.isFinite(raw.bestGame.pts)) {
      r.bestGame = { pts: raw.bestGame.pts, level: String(raw.bestGame.level || ''), lots: cnt(raw.bestGame.lots) };
    }
    if (isObj(raw.byLevel)) {
      Object.keys(raw.byLevel).forEach(k => {
        const l = raw.byLevel[k];
        if (isObj(l)) r.byLevel[k] = { played: cnt(l.played), won: cnt(l.won) };
      });
    }
    return r;
  }
  /* raw: the stored string (or null). ids: pack ids that must exist in the result
     (records of other packs pass through, sanitised). */
  function parseRecords(raw, ids) {
    let v = null;
    try { v = raw ? JSON.parse(raw) : null; } catch (e) { v = null; }
    const out = { v: 2, packs: {} };
    if (isObj(v) && isObj(v.packs)) Object.keys(v.packs).forEach(id => { out.packs[id] = v.packs[id]; });
    else if (isObj(v) && 'played' in v) out.packs.countries = v;           // v1 → v2
    (ids || []).forEach(id => { if (!(id in out.packs)) out.packs[id] = null; });
    Object.keys(out.packs).forEach(id => { out.packs[id] = sanitizePackRecord(out.packs[id]); });
    return out;
  }
  const stringifyRecords = recs => JSON.stringify({ v: 2, packs: recs.packs });

  /* you/bot: scoreboard rows. Mutates `rec` (one pack's record); returns what changed. */
  function applyGame(rec, you, bot, level) {
    const lvl = rec.byLevel[level] || (rec.byLevel[level] = { played: 0, won: 0 });
    const win = you.pts > bot.pts, draw = you.pts === bot.pts;
    rec.played++; lvl.played++;
    if (win) { rec.won++; lvl.won++; rec.streak = rec.streak >= 0 ? rec.streak + 1 : 1; }
    else if (draw) { rec.drawn++; rec.streak = 0; }
    else { rec.lost++; rec.streak = rec.streak <= 0 ? rec.streak - 1 : -1; }
    rec.best = Math.max(rec.best, rec.streak);
    rec.pts += you.pts; rec.botPts += bot.pts; rec.spent += you.spent;
    let record = false;
    if (!rec.bestGame || you.pts > rec.bestGame.pts) {
      rec.bestGame = { pts: Math.round(you.pts * 10) / 10, level, lots: you.p.bought.length };
      record = rec.played > 1;
    }
    return { win, draw, record };
  }

  return {
    LANGS, REC_KEY,
    cryptoRng, seededRng, defaultRng, pick,
    itemName, itemIcon, hasCoords,
    validatePack, levelPool, draw, priceTable, priceOf, botCeiling,
    tierOf, tauntFor, passLine, winLine,
    budgetFor, newAuction, startLot, raise, pass, award, advance, nextAfter, botDecision, scoreboard,
    blankPackRecord, parseRecords, stringifyRecords, applyGame
  };
});
