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

  /* The fun fact for an item in a language; other languages fall back to English; '' when a pack has none. */
  function factFor(pack, item, lang) {
    const f = pack && pack.facts && pack.facts[item.id];
    return f ? (f[lang] || f.en || '') : '';
  }
  /* "$1,234" for packs that give a currency locale (US States), plain "€12" for the rest (Countries). */
  const numFmt = new Map();
  /* The currencies a player can pick in Settings. This only changes how the game's money is WRITTEN (symbol and where it goes): the numbers do not change,
     a $70 budget is simply shown as 70 kr or CHF 70. There are no exchange rates. `post` puts the symbol after the number ("70 kr"), `sp` adds a space after a letter symbol ("CHF 70"). */
  const CURRENCIES = [
    { id: 'EUR', sym: '€' }, { id: 'USD', sym: '$' }, { id: 'GBP', sym: '£' }, { id: 'CHF', sym: 'CHF', sp: true }, { id: 'JPY', sym: '¥' }, { id: 'CNY', sym: 'CN¥' },
    { id: 'INR', sym: '₹' }, { id: 'KRW', sym: '₩' }, { id: 'BRL', sym: 'R$' }, { id: 'CAD', sym: 'C$' }, { id: 'AUD', sym: 'A$' }, { id: 'MXN', sym: 'MX$' },
    { id: 'TRY', sym: '₺' }, { id: 'ZAR', sym: 'R', sp: true }, { id: 'SEK', sym: 'kr', post: true }, { id: 'NOK', sym: 'kr', post: true }, { id: 'DKK', sym: 'kr', post: true },
    { id: 'PLN', sym: 'zł', post: true }, { id: 'CZK', sym: 'Kč', post: true }, { id: 'HUF', sym: 'Ft', post: true }
  ];
  const currencyById = id => CURRENCIES.find(c => c.id === id) || null;
  /* the written form of an amount in a chosen currency: money("GBP", 70) = "£70", ("SEK", 70) = "70 kr", ("CHF", 1234) = "CHF 1,234" */
  function currencyText(cur, text) { return cur.post ? text + ' ' + cur.sym : cur.sym + (cur.sp ? ' ' : '') + text; }
  function formatMoney(pack, n, curId) {
    const own = curId && currencyById(curId);
    if (own) { let f = numFmt.get('en-US'); if (!f) numFmt.set('en-US', f = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })); return currencyText(own, f.format(n)); }
    const c = pack ? pack.currency : { symbol: '€' };
    if (c.locale) {
      let f = numFmt.get(c.locale); if (!f) numFmt.set(c.locale, f = new Intl.NumberFormat(c.locale, { maximumFractionDigits: 0 }));
      return c.symbol + f.format(n);
    }
    return c.symbol + n;
  }

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
    if (pack.metric && pack.metric.effLabel !== undefined && !isLoc(pack.metric.effLabel)) e('metric.effLabel must be a localised object with "en"');
    if (pack.facts !== undefined) {
      if (!isObj(pack.facts)) e('facts must be an object keyed by item id');
      else if (Array.isArray(pack.items)) pack.items.forEach(it => { const f = pack.facts[it.id]; if (!isLoc(f) || f.en.length > 160) e('facts needs a localised fact (en, up to 160 characters) for ' + it.id); });
    }
    if (!isPosInt(pack.budgetPerLot)) e('budgetPerLot must be a positive integer');
    if (!isObj(pack.lots) || !Array.isArray(pack.lots.options) || !pack.lots.options.length || !pack.lots.options.every(isPosInt) || !pack.lots.options.includes(pack.lots.default)) e('lots needs { options: [positive ints], default: one of them }');

    if (pack.lots && pack.lots.all !== undefined && !(isObj(pack.lots) && Array.isArray(pack.lots.options) && pack.lots.options.includes(pack.lots.all))) e('lots.all must be one of lots.options');
    if (typeof pack.priceTable === 'function') {
      if (pack.bands !== undefined) e('give either bands or priceTable, not both');
      else if (Array.isArray(pack.items) && pack.items.length) {
        let tbl = null;
        try { tbl = pack.priceTable(pack.items); } catch (err) { e('priceTable threw: ' + err.message); }
        if (tbl && typeof tbl.get === 'function') {
          const rows = [];
          pack.items.forEach(it => {
            const c = tbl.get(it.id);
            if (!c || !isPosInt(c.ideal) || !isPosInt(c.max) || c.max < c.ideal) e('priceTable needs positive whole-number { ideal, max } with max >= ideal for ' + it.id);
            else rows.push({ v: it.value, ideal: c.ideal, max: c.max });
          });
          rows.sort((a, b) => a.v - b.v);
          for (let i = 1; i < rows.length; i++) if (rows[i].ideal < rows[i - 1].ideal || rows[i].max < rows[i - 1].max) { e('priceTable must never get cheaper as value grows'); break; }
        } else e('priceTable must return a Map keyed by item id');
      }
    } else if (!Array.isArray(pack.bands) || !pack.bands.length) e('bands must be a non-empty array (or give a priceTable function)');
    else {
      let prev = 0;
      pack.bands.forEach((b, i) => {
        if (!(b.upTo > prev && b.upTo <= 1)) e('bands[' + i + '].upTo must be increasing and <= 1');
        if (!(b.ideal > 0 && b.max >= b.ideal)) e('bands[' + i + '] needs 0 < ideal <= max');
        prev = b.upTo;
      });
      if (pack.bands[pack.bands.length - 1].upTo !== 1) e('the last band must end at upTo: 1');
    }

    if (pack.economy !== undefined) {
      const ec = pack.economy, opts = pack.lots && Array.isArray(pack.lots.options) ? pack.lots.options : [];
      if (!isObj(ec)) e('economy must be an object');
      else {
        const lvIds = Array.isArray(pack.levels) ? pack.levels.map(l => l.id) : [];
        const perLevel = isObj(ec.budgets) && lvIds.length > 0 && lvIds.every(id => isObj(ec.budgets[id]));
        if (!isObj(ec.budgets) || !(perLevel ? lvIds.every(id => opts.every(n => isPosInt(ec.budgets[id][n]))) : opts.every(n => isPosInt(ec.budgets[n])))) e('economy.budgets needs a positive whole-number budget for every lots option (or per level: { levelId: { lots: budget } })');
        if (ec.endgame !== undefined && !(isObj(ec.endgame) && ec.endgame.rule === 'house' && ec.endgame.price > 0 && ec.endgame.price <= 1)) e('economy.endgame must be { rule: "house", price: 0 < share <= 1 }');
        if (ec.sampling !== undefined && ec.sampling !== 'systematic' && ec.sampling !== 'random') e('economy.sampling must be "systematic" or "random" when given');
        if (ec.bidSteps !== undefined && !(Array.isArray(ec.bidSteps) && ec.bidSteps.length && ec.bidSteps.every((r, i) => Array.isArray(r) && Array.isArray(r[1]) && r[1].length === 5 && r[1].every(isPosInt) && r[1].every((v, k) => !k || v > r[1][k - 1]) && (i === ec.bidSteps.length - 1 ? r[0] == null : isPosInt(r[0]) && (!i || r[0] > ec.bidSteps[i - 1][0])))))
          e('economy.bidSteps must be [[upTo, [5 ascending steps]], …, [null, [5 ascending steps]]] with increasing upTo');
        if (ec.typingBonus !== undefined && !(ec.typingBonus >= 0 && ec.typingBonus <= 10)) e('economy.typingBonus must be 0..10 seconds');
        if (isObj(ec.budgets) && pack.bot && pack.bot.premium && Array.isArray(pack.items) && pack.items.length && typeof pack.priceTable === 'function') {
          /* the money must stay scarce at the top: the biggest budget (the "all items" option, or the largest lot count) of every level is at
             most 80% of the expected price of that level's biggest items, counting the bot's average walk-away (midpoint of ideal and max)
             including its premium */
          const t = priceTable(pack), big = pack.lots && isPosInt(pack.lots.all) ? pack.lots.all : Math.max(...opts);
          (perLevel ? lvIds : [null]).forEach(id => {
            const b = perLevel ? ec.budgets[id][big] : ec.budgets[big]; if (!isPosInt(b)) return;
            const pool = id ? levelPool(pack, id) : pack.items, top = pool.slice().sort((a, b2) => b2.value - a.value).slice(0, pack.bot.premium.top);
            const expected = top.reduce((a, it) => { const p = t.get(it.id); return a + (p.ideal + p.max) / 2 * (1 + (typeof pack.bot.premium.pct === 'number' ? pack.bot.premium.pct : pack.bot.premium.pct[id])); }, 0);
            if (b > 0.8 * expected) e('economy.budgets' + (id ? '.' + id : '') + '[' + big + '] must be at most 80% of the expected price of the ' + pack.bot.premium.top + ' biggest items (' + Math.round(0.8 * expected) + ')');
          });
        }
      }
    }
    if (pack.bot !== undefined) {
      const b = pack.bot, opts = pack.lots && Array.isArray(pack.lots.options) ? pack.lots.options : [];
      if (!isObj(b)) e('bot must be an object');
      else {
        const lvIds = Array.isArray(pack.levels) ? pack.levels.map(l => l.id) : [], tblOk = (tb, f) => isObj(tb) && (lvIds.length > 0 && lvIds.every(id => isObj(tb[id])) ? lvIds.every(id => opts.every(n => f(tb[id][n]))) : opts.every(n => f(tb[n])));
        if (b.limitMul !== undefined && !tblOk(b.limitMul, v => v > 0)) e('bot.limitMul needs a positive multiplier for every lots option (or per level)');
        const flat = v => typeof v === 'number' ? [v] : (isObj(v) ? Object.values(v).flatMap(flat) : [NaN]), numOk = (v, f) => v !== undefined && flat(v).length > 0 && flat(v).every(f);   // a number, or per level / per lots numbers
        if (b.wallet !== undefined && !(b.wallet.lo > 0 && b.wallet.lo <= 1)) e('bot.wallet needs { lo: 0 < share <= 1 }');
        if (b.efficiency !== undefined && !(isObj(b.efficiency) && numOk(b.efficiency.gamma, v => v >= 0) && numOk(b.efficiency.lo, v => v > 0) && numOk(b.efficiency.hi, v => v > 0) && (b.efficiency.pick === undefined || numOk(b.efficiency.pick, v => v > 0)))) e('bot.efficiency needs { gamma >= 0, lo > 0, hi > 0, pick > 0 } (numbers, or per level)');
        if (b.creeperGuard !== undefined && !(b.creeperGuard.raises >= 1)) e('bot.creeperGuard needs { raises >= 1 }');
        if (b.decisive !== undefined && !(isObj(b.decisive) && numOk(b.decisive.share, v => v > 0 && v <= 1))) e('bot.decisive needs { share: 0 < share <= 1 } (a number, or per level)');
        if (b.decisive && b.decisive.minPrice !== undefined && !numOk(b.decisive.minPrice, v => v > 0 && v <= 2)) e('bot.decisive.minPrice must be 0 < x <= 2 (a share of the current budget of the bot, a number or per level)');
        if (b.rollSpan !== undefined && !numOk(b.rollSpan, v => v >= 0 && v <= 1)) e('bot.rollSpan must be 0..1 (a number, or per level / per lots)');
        if (b.noise !== undefined && !numOk(b.noise, v => v >= 0 && v < 1)) e('bot.noise must be 0 <= noise < 1 (a number, or per level)');
        if (b.premium !== undefined && !(isPosInt(b.premium.top) && numOk(b.premium.pct, v => v >= 0))) e('bot.premium needs { top: positive int, pct >= 0 (a number, or per level) }');
        if (b.pacing !== undefined && !(b.pacing.gamma >= 0 && b.pacing.lo > 0 && b.pacing.hi >= b.pacing.lo)) e('bot.pacing needs { gamma >= 0, 0 < lo <= hi }');
        if (b.knockout !== undefined && !(isObj(b.knockout) && numOk(b.knockout.kappa, v => v > 0))) e('bot.knockout needs { kappa > 0 } (a number, or per level)');
        if (b.mood !== undefined && !(b.mood.k >= 0 && b.mood.up >= 0 && b.mood.down >= 0)) e('bot.mood needs { k, up, down } >= 0');
        if (b.temperaments !== undefined) {
          const t = b.temperaments;
          if (!(isObj(t) && Array.isArray(t.weights) && t.weights.length === 3 && t.weights.every(isPosInt) && tblOk(t.spread, v => v >= 0 && v < 0.5) && isPosInt(t.bigRank))) e('bot.temperaments needs { weights: [3 positive ints], spread: by lots option (0..0.5), bigRank }');
        }
      }
      if (!pack.economy) e('bot needs the economy block (budget table) — it paces against the opening budget ratio');
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
  function shuffle(a, rng) { for (let i = a.length - 1; i > 0; i--) { const j = rng(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  /* Systematic sampling (packs with economy.sampling 'systematic'): sort the pool by value, take a random start inside the
     first interval and then every (N / n)-th item, and shuffle the presentation order. Every item still has exactly the
     chance n / N, but a round can no longer be all giants or all dwarfs, so its total value swings far less. */
  function drawSystematic(pool, n, rng) {
    const N = pool.length;
    if (n >= N) return shuffle(pool, rng);
    pool.sort((a, b) => a.value - b.value);
    const step = N / n, u = rng(1000000) / 1000000 * step, out = [];
    for (let k = 0; k < n; k++) out.push(pool[Math.min(N - 1, Math.floor(u + k * step))]);
    return shuffle(out, rng);
  }
  /* economy.sampling: 'random' (or absent) = every lot uniformly from the items not yet used, so every item, every pair and every position is equally likely;
     'systematic' = the variance-reduced draw above (equal chance per item, but items of similar value never share a round). One word in the pack switches between them. */
  function draw(pack, n, levelId, rng) {
    rng = rng || defaultRng;
    const pool = levelPool(pack, levelId);
    if (pack.economy && pack.economy.sampling === 'systematic') return drawSystematic(pool, n, rng);
    shuffle(pool, rng);
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
    /* A pack prices either by percentile `bands` (Countries) or with its own smooth
       `priceTable(items) → Map(id → { ideal, max })` (US States). Same output either way. */
    const custom = typeof pack.priceTable === 'function' ? pack.priceTable(pack.items) : null;
    order.forEach((idx, pos) => {
      const item = pack.items[idx], rank = pos + 1, pct = rank / n;
      if (custom) { const c = custom.get(item.id); t.set(item.id, { rank, pct, ideal: c.ideal, max: c.max }); return; }
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
  /* A per-lot-count table ({5:…, 10:…}) or a plain number; a count that is not listed uses the nearest listed one below it. */
  function byLots(tbl, n, level) {
    if (typeof tbl === 'number') return tbl;
    if (level != null && tbl[level] != null && typeof tbl[level] === 'object') tbl = tbl[level];   // a table may be per level: { beginner: {5:…}, medium: {5:…} }
    if (tbl[n] != null) return tbl[n];
    const ks = Object.keys(tbl).map(Number).sort((a, b) => a - b);
    let k = ks[0]; ks.forEach(x => { if (x <= n) k = x; });
    return tbl[k];
  }
  /* US States: the budget is a table by lot count (economy.budgets, in dollars); Countries: lots x budgetPerLot. */
  /* an unknown, missing or corrupted level id falls back to the pack's default level, everywhere a level is looked up */
  const validLevel = (pack, level) => (pack.levels && pack.levels.some(l => l.id === level)) ? level : pack.defaultLevel;
  const budgetFor = (pack, lots, level) => (pack.economy && pack.economy.budgets) ? byLots(pack.economy.budgets, lots, validLevel(pack, level)) : lots * pack.budgetPerLot;
  /* The five raise buttons. Countries: always +1 +2 +5 +10 +25. A pack with economy.bidSteps scales them with the CURRENT PRICE
     (never with the item's fair price, which would leak its size): [[upTo, [5 steps]], …, [null, [5 steps]]]. */
  const DEFAULT_STEPS = [1, 2, 5, 10, 25];
  function bidSteps(pack, price) {
    const t = pack && pack.economy && pack.economy.bidSteps;
    if (!t) return DEFAULT_STEPS;
    for (const row of t) if (row[0] == null || price < row[0]) return row[1];
    return t[t.length - 1][1];
  }
  /* the average fair price of a lot in the level's pool (the whole pack when no level is given) */
  const avgIdeal = (pack, level) => {
    const t = priceTable(pack), pool = level ? levelPool(pack, level) : pack.items;
    return pool.reduce((a, it) => a + t.get(it.id).ideal, 0) / pool.length;
  };

  /* players: [{ name, ai }]. Returns the single mutable state object the view
     renders. Field names are stable on purpose. */
  function newAuction(opts) {
    const pack = opts.pack, rng = opts.rng || defaultRng;
    const lots = opts.lots, level = validLevel(pack, opts.level), budget = budgetFor(pack, lots, level);
    const S = {
      pack, rng,
      kind: opts.kind, mode: opts.kind === 'solo' ? 'bot' : 'table',
      i: 0, clock: opts.clock || 0, level,
      items: draw(pack, lots, level, rng),
      players: opts.players.map(p => ({ name: p.name, budget, bought: [], ai: !!p.ai })),
      L: null, _ceil: null, _ceilLot: -1
    };
    if (pack.bot && pack.bot.creeperGuard) S.watch = { raises: 0, vol: 0 };   // what the human has done so far: raises, and passes made while it could still afford the next euro
    if (pack.economy) S.unsold = [];                              // lots nobody could pay for (house-price endgame)
    if (pack.bot) {                                               // the bot rolls its temperament once, from the injected rng; never shown
      /* "the biggest items" (premium, bigRank) are the biggest of THIS level's pool, so Beginner's giants are Europe's, not the world's */
      const pool = levelPool(pack, level).slice().sort((a, b) => priceOf(pack, b).rank - priceOf(pack, a).rank);
      S.bot = { temper: pickTemper(pack.bot, lots, opts.temper || null, rng, level), paceTarget: budget / (S.items.length * avgIdeal(pack, level)), rank: new Map(pool.map((it, i) => [it.id, i + 1])) };
    }
    return S;
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
      if (S.unsold) S.items.slice(S.i).forEach(it => S.unsold.push(it));
      S.i = S.items.length;
      return { state: 'done', reason: 'broke' };
    }
    if (eligible.length === 1 && S.players.length > 1 && S.pack.economy && S.pack.economy.endgame && S.pack.economy.endgame.rule === 'house') {
      /* House price: the last player with money may buy each remaining lot at a fixed share of its fair price while
         the money lasts; lots they cannot pay for stay unsold. Nobody gets a free sweep for $1. */
      const w = S.players[eligible[0]], share = S.pack.economy.endgame.price;
      while (S.i < S.items.length) {
        const it = S.items[S.i], price = Math.max(1, Math.round(share * priceOf(S.pack, it).ideal));
        if (w.budget >= price) { w.budget -= price; w.bought.push({ ...it, price }); } else S.unsold.push(it);
        S.i++;
      }
      return { state: 'done', reason: 'house' };
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
    if (S.watch && !actor.ai) S.watch.raises++;
    L.price = amount; L.holder = L.turn; L.turn = nextAfter(S, L.holder);
    return { ok: true, next: L.turn === null ? 'award' : 'turn' };
  }

  function pass(S) {
    if (closed(S)) return { error: 'closed' };
    const L = S.L;
    if (S.watch && !S.players[L.turn].ai && S.players[L.turn].budget >= L.price + 1) S.watch.vol++;
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
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ----------------------------------------------------- the bot, pack-configured (US States)
     A pack with a `bot` block gets the extended bot below; Countries has none and keeps the original bot byte for byte.
       limitMul      calibration by lot count, scales every walk-away roll
       premium       { top, pct }: the `top` biggest items get `pct` more on the walk-away roll
       pacing        { gamma, lo, hi }: walk-away x (budget / value left ÷ the opening ratio)^gamma, clamped, so the
                     bot spends its budget evenly across the round
       knockout      { kappa }: K = the rival's remaining budget (the price it can no longer top); the bot jumps to K
                     (sweep: it can pay K on every lot left; otherwise on the most valuable lots it can afford, or on a
                     decisive lot whose K is at most kappa x its max price)
       mood          { up, down, k }: late in the round up to +up% when behind and -down% when well ahead
       temperaments  weights [conservative, balanced, aggressive] and per-temperament step / big-item / reserve tweaks;
                     the walk-away spread comes from `spread` by lot count (symmetric around the balanced bot)
     Every random choice goes through S.rng, so a seed reproduces a game exactly. */
  function pickTemper(B, lots, forced, rng, level) {
    const T = B.temperaments;
    if (!T) return null;
    const names = ['conservative', 'balanced', 'aggressive'];
    let name = forced;
    if (!name) {
      const w = T.weights, total = w[0] + w[1] + w[2], r = rng(total);
      name = r < w[0] ? names[0] : r < w[0] + w[1] ? names[1] : names[2];
    }
    /* Settings offers five steps; the two outer ones ("cautious", "fierce") are the calibrated conservative / aggressive temperaments pushed twice as far
       (the walk-away spread doubled, the raise-step and big-item factors squared). They only exist when the player picks them: the random draw above never returns them. */
    const outer = name === 'cautious' || name === 'fierce', base = name === 'cautious' ? 'conservative' : name === 'fierce' ? 'aggressive' : name, k = outer ? 2 : 1;
    const t = T[base] || {}, sign = base === 'conservative' ? -1 : base === 'aggressive' ? 1 : 0;
    const pw = (x, d) => x == null ? d : Math.pow(x, k);
    return { name, limit: 1 + sign * k * byLots(T.spread, lots, level), step: pw(t.step, 1), big: pw(t.big, 1), cushion: t.cushion || 0, reserveCap: t.reserveCap == null ? null : (outer ? Math.max(1, Math.floor(t.reserveCap / 2)) : t.reserveCap) };
  }
  /* a bot parameter may be a plain number or per level ({ beginner: 0.8, medium: 1.2 }, or per level and lot count) */
  const lvVal = (v, S) => { if (typeof v === 'number') return v; const t = v && v[S.level] != null ? v[S.level] : v; return typeof t === 'number' ? t : byLots(t, S.items.length); };
  const sumFrom = (S, from, f) => { let a = 0; for (let k = from; k < S.items.length; k++) a += f(S.items[k]); return a; };
  const ptsOf = p => p.bought.reduce((a, b) => a + b.value, 0);

  function botWalk(S, item, idx, roll, me, rival) {
    const B = S.pack.bot, T = S.bot.temper, n = S.items.length, rankDesc = S.bot.rank.get(item.id);
    let w = roll * (B.limitMul ? byLots(B.limitMul, n, S.level) : 1);
    if (B.premium && rankDesc <= B.premium.top) w *= 1 + lvVal(B.premium.pct, S);   // pct may be per level: Beginner's bot pays more for its biggest countries
    if (T) { w *= T.limit; if (rankDesc <= B.temperaments.bigRank) w *= T.big; }
    if (B.efficiency) {
      /* Points per euro differ hugely between lots (a giant gives 10-15x the points per euro of a small country at fair price). The bot plans like a
         knapsack: with the money it can spend on the lots still to come, the marginal lot it could afford sets a shadow price (points per euro); a lot
         that beats it is worth more than its fair price, a lot that does not is worth less. This is what a disciplined human does by hand. */
      const E = { gamma: lvVal(B.efficiency.gamma, S), lo: lvVal(B.efficiency.lo, S), hi: lvVal(B.efficiency.hi, S), pick: B.efficiency.pick == null ? 1 : lvVal(B.efficiency.pick, S) }, money = Math.max(1, me.budget - (n - idx - 1 >= 3 ? n - idx - 1 : 0)), rest = [];
      for (let k = idx; k < n; k++) { const it = S.items[k], id = priceOf(S.pack, it).ideal; rest.push({ e: it.value / id, id }); }
      rest.sort((a, b) => b.e - a.e);
      let used = 0, eStar = 0;
      for (const r of rest) { if (used + r.id > money) { eStar = r.e; break; } used += r.id; }
      /* a rival who has raised again and again and never once walked away while it could still pay (the "+1 until broke" creeper) is best made to pay
         full price on every lot, so the efficiency factor may only raise the walk-away for it, never lower it */
      const creeper = !!(B.creeperGuard && S.watch && S.watch.raises >= B.creeperGuard.raises && S.watch.vol === 0);
      if (eStar > 0) w *= clamp(Math.pow(item.value / (eStar * E.pick) / priceOf(S.pack, item).ideal, E.gamma), creeper ? 1 : E.lo, E.hi);   // pick > 1: pickier than the fair-price plan, because real prices run above fair when the rival pushes
    }
    if (B.pacing) w *= clamp(Math.pow(me.budget / Math.max(1, sumFrom(S, idx, i => priceOf(S.pack, i).ideal)) / S.bot.paceTarget, B.pacing.gamma), B.pacing.lo, B.pacing.hi);
    if (B.mood && rival) {
      const wgt = clamp((idx / n - .5) / .5, 0, 1), d = (ptsOf(rival) - ptsOf(me)) / Math.max(1e-9, sumFrom(S, idx, i => i.value));
      w *= 1 + wgt * clamp(B.mood.k * d, -B.mood.down, B.mood.up);
    }
    if (B.noise) w *= 1 + lvVal(B.noise, S) * (S.rng(1001) + S.rng(1001) - 1000) / 1000;      // optional per-lot jitter (triangular, +-noise), drawn only when the pack asks for it
    return Math.round(w);
  }

  function botDecisionExt(S) {
    const rng = S.rng, L = S.L, item = S.items[S.i], me = S.players[L.turn], B = S.pack.bot, T = S.bot.temper;
    const rivalIdx = S.players.findIndex((p, i) => i !== L.turn), rival = S.players[rivalIdx];
    const pr = priceOf(S.pack, item);
    if (!S._ceil || S._ceilLot !== S.i) {
      /* rollSpan < 1 narrows the walk-away roll to the first share of [ideal, max]: a bot whose limit swings widely from lot to lot wins the lots on which it pays the rival's constant limit and
         lets the rival have the rest at its own low draws, so a player with one fixed limit out-earns it. Same draw as botCeiling when absent. */
      const roll = pr.ideal + rng(Math.floor((pr.max - pr.ideal) * (B.rollSpan == null ? 1 : lvVal(B.rollSpan, S))) + 1);
      S._ceil = { ideal: pr.ideal, max: pr.max, walk: botWalk(S, item, S.i, roll, me, rival) }; S._ceilLot = S.i;
      if (B.wallet) S._ceil.wf = B.wallet.lo + (1 - B.wallet.lo) * rng(1001) / 1000;   // one roll per lot, only drawn when the pack asks for it
    }
    const lotsAfter = S.items.length - S.i - 1;
    let reserve = lotsAfter >= 3 ? lotsAfter : 0;
    /* A lot worth a big slice of what is left AND (when the pack sets decisive.minPrice) one whose fair price is a real share of the bot's CURRENT purse: the biggest lot of a
       round of small capitals is "decisive" in points but not worth the whole purse (Washington D.C., about EUR 26, at the start of a 5-lot round with EUR 50), whereas Delhi (about EUR 95) is; late in a round, with little money left, a pivotal lot still is. */
    const decisiveLot = !!B.decisive && item.value >= lvVal(B.decisive.share, S) * sumFrom(S, S.i, i => i.value)
      && (B.decisive.minPrice == null || pr.ideal >= lvVal(B.decisive.minPrice, S) * me.budget);
    if (decisiveLot) reserve = 0;                                                                           // no euro is kept back for it
    if (T && T.cushion && lotsAfter >= 3) reserve += Math.round(T.cushion * (me.budget + me.bought.reduce((a, b) => a + b.price, 0)));
    if (T && T.reserveCap != null) reserve = Math.min(reserve, T.reserveCap);
    let lim = S._ceil.walk, jump = null;
    /* Wallet-bound lots (a giant that costs about as much as the bot's whole purse): the bot's own money is visible on screen, so
       spending "everything but the reserve" would give the price away. When the walk-away reaches into the top of the purse,
       the ceiling becomes a random 70-100% of what it can spend (bot.wallet.lo) instead of all of it. */
    if (B.wallet && lim > (me.budget - reserve) * B.wallet.lo) lim = Math.min(lim, Math.floor((me.budget - reserve) * S._ceil.wf));
    if (B.knockout && rival) {
      const K = rival.budget, afford = me.budget - reserve;
      if (K >= 1 && afford >= K) {
        const sweep = afford >= K * (lotsAfter + 1);
        const lead = ptsOf(me) - ptsOf(rival), after = lead + item.value, restPts = sumFrom(S, S.i, i => i.value) - item.value;
        const decisive = (lead <= 0 && after > 0) || after > restPts;
        const m = Math.floor(afford / K);
        let rankV = 1; for (let q = S.i + 1; q < S.items.length; q++) if (S.items[q].value > item.value) rankV++;
        if (sweep || rankV <= m || (decisive && K <= lvVal(B.knockout.kappa, S) * pr.max)) {
          if (L.holder === rivalIdx && L.price >= Math.min(me.budget - reserve, lim)) {
            const target = L.price < K ? K : K + 1;
            if (target <= afford) { lim = Math.max(lim, target); jump = target; }
          }
        }
      }
    }
    /* On a lot that decides the game, a bot that holds at least as much money as its rival takes it at once: raising to the rival's whole purse can
       not be topped. (Waiting only lets a rival who moves first jump to the whole purse and win every tie.) */
    if (decisiveLot && rival && B.decisive.jump !== false && rival.budget >= 1 && me.budget >= rival.budget && L.holder !== L.turn) {
      const K = rival.budget, target = L.price < K ? K : (me.budget >= K + 1 ? K + 1 : null);
      if (target != null && target > L.price) { jump = target; lim = Math.max(lim, target); }
    }
    if (decisiveLot) lim = Math.max(lim, me.budget);     // and no random ceiling either: against a rival who goes all-in on the lot that decides the game, a bot that stops at a random 70-100% of its purse simply loses it
    const hardCap = Math.min(me.budget - reserve, lim);
    if (L.price < hardCap && me.budget > L.price) {
      const rivals = L.active.filter(i => i !== L.turn);
      const contested = rivals.some(i => S.players[i].budget > L.price + 1);
      const stepMul = T ? T.step : 1;
      let step = !contested ? 1
        : L.price < 3 ? 1
        : Math.max(1, Math.round(L.price * (0.12 + rng(15) / 100) * stepMul));
      /* At small prices a +1 bot and a +1 rival alternate, which pins the parity of the price where the bot stops (it would always be odd, or always even).
         A random +2 now and then breaks that, so even and odd drop-out prices stay equally likely. */
      if (contested && step === 1 && L.price >= 3 && L.price < 12 && B.parity !== false && rng(100) < 40) step = 2;
      let amount = Math.min(me.budget, hardCap, L.price + step);
      if (jump != null && jump <= hardCap && jump > L.price) amount = jump;
      if (amount > L.price) return { type: 'raise', amount };
    }
    return { type: 'pass' };
  }

  function botDecision(S) {
    if (S.bot) return botDecisionExt(S);
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
  /* ---- SETTINGS: the one extra value stored on the device (settings:v1), only the choices that differ from the defaults.
     aggr is the bot-aggression step 0..4 (2 = the default mix, the only one that counts for your record). */
  const SETTINGS_KEY = 'settings:v1';
  const DEFAULT_SETTINGS = { cur: null, aggr: 2, tz: 0, motion: 'auto', shapes: false, fair: false, confirm: false, quiet: false };
  const AGGR_TEMPER = ['cautious', 'conservative', null, 'aggressive', 'fierce'];     // step -> forced temperament (null = the usual hidden 25/50/25 draw)
  function parseSettings(raw) {
    const out = Object.assign({}, DEFAULT_SETTINGS); let o = null;
    try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { o = null; }
    if (!o || typeof o !== 'object' || Array.isArray(o)) return out;
    if (typeof o.cur === 'string' && currencyById(o.cur)) out.cur = o.cur;
    if (Number.isInteger(o.aggr) && o.aggr >= 0 && o.aggr <= 4) out.aggr = o.aggr;
    if (Number.isInteger(o.tz) && o.tz >= -1 && o.tz <= 2) out.tz = o.tz;   // -1 = Small (v48), 0 = Normal (default), 1 Large, 2 Larger
    if (o.motion === 'reduce') out.motion = 'reduce';
    ['shapes', 'fair', 'confirm', 'quiet'].forEach(k => { if (o[k] === true) out[k] = true; });
    return out;
  }
  /* only what differs from the defaults is stored; all defaults = nothing stored (null: the caller removes the key) */
  function stringifySettings(st) {
    const o = {}; Object.keys(DEFAULT_SETTINGS).forEach(k => { if (st[k] !== DEFAULT_SETTINGS[k]) o[k] = st[k]; });
    return Object.keys(o).length ? JSON.stringify(o) : null;
  }
  /* a game that does not count for the record: not the default bot, or the fair price on screen */
  const isPractice = st => st.aggr !== DEFAULT_SETTINGS.aggr || st.fair === true;
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
    const out = { v: 2, packs: {}, last: null };
    if (isObj(v) && isObj(v.packs)) Object.keys(v.packs).forEach(id => { out.packs[id] = v.packs[id]; });
    else if (isObj(v) && 'played' in v) out.packs.countries = v;           // v1 → v2
    (ids || []).forEach(id => { if (!(id in out.packs)) out.packs[id] = null; });
    if (isObj(v) && typeof v.last === 'string' && (ids || []).includes(v.last)) out.last = v.last;   // the pack picked last, so the menu reopens on it
    Object.keys(out.packs).forEach(id => { out.packs[id] = sanitizePackRecord(out.packs[id]); });
    return out;
  }
  const stringifyRecords = recs => JSON.stringify(recs.last ? { v: 2, packs: recs.packs, last: recs.last } : { v: 2, packs: recs.packs });

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
    LANGS, REC_KEY, SETTINGS_KEY, DEFAULT_SETTINGS, AGGR_TEMPER, CURRENCIES, currencyById, currencyText, parseSettings, stringifySettings, isPractice,
    cryptoRng, seededRng, defaultRng, pick,
    itemName, itemIcon, hasCoords, factFor, formatMoney,
    validatePack, levelPool, draw, priceTable, priceOf, botCeiling,
    tierOf, tauntFor, passLine, winLine,
    budgetFor, byLots, avgIdeal, bidSteps, drawSystematic, pickTemper, newAuction, startLot, raise, pass, award, advance, nextAfter, botDecision, scoreboard,
    blankPackRecord, parseRecords, stringifyRecords, applyGame
  };
});
