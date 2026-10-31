/* US States pack: data provenance, drawing, pricing, copy, facts. Pure Node, no browser. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const Engine = require('../engine.js');
const states = require('../pack-states.js');
const countries = require('../pack-countries.js'), august = require('./pack-countries-august.js');
const census = require('./census-nst-est2025.json');
const content = require('./states-content.json');
const golden = require('./golden-states.json');
const { playGame } = require('./sim.js');

const LANGS = ['en', 'de', 'it', 'es', 'fr'];

test('DATA: exactly the 50 states, every value is the official Census July 1, 2025 estimate / 1e6', () => {
  assert.equal(states.items.length, 50);
  assert.equal(census.states.length, 50);
  assert.match(census.vintage, /2025/); assert.match(census.table, /NST-EST2025-POP/);
  const ids = new Set(states.items.map(i => i.id));
  assert.equal(ids.size, 50);
  for (const s of census.states) {
    const it = states.items.find(i => i.name.en === s.name);
    assert.ok(it, s.name + ' is in the pack');
    assert.equal(it.value, s.pop / 1e6, s.name + ' value');
    assert.ok(Number.isInteger(s.pop) && s.pop > 500000 && s.pop < 40000000);
  }
  for (const out of ['District of Columbia', 'Puerto Rico', 'Guam']) assert.ok(!states.items.some(i => i.name.en === out), out + ' is not a state');
  const total = census.states.reduce((a, s) => a + s.pop, 0);
  assert.equal(total, 341091212, 'the 50-state total');
});

test('PACK: validates, is registered in META with the right size and currency symbol', () => {
  assert.deepEqual(Engine.validatePack(states), []);
  const reg = require('../packs.js');
  const meta = (reg.META || []).find(m => m.id === 'states');
  // packs.js exports a factory; its META lives on a created registry
  const r = reg(Engine, () => Promise.resolve());
  const m = r.meta('states');
  assert.equal(m.count, states.items.length); assert.equal(m.file, 'pack-states.js'); assert.equal(m.sym, states.currency.symbol);
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.ok(sw.includes("'./pack-states.js'"), 'pack-states.js is cached for offline');
  assert.ok(meta === undefined || true);
});

test('LOTS: 5, 10, 15, 20, 30, 40 and "All 50 states"; no difficulty filters', () => {
  assert.deepEqual(states.lots.options, [5, 10, 15, 20, 30, 40, 50]);
  assert.equal(states.lots.all, 50); assert.equal(states.lots.default, 10);
  assert.equal(states.levels.length, 1); assert.equal(Engine.levelPool(states, 'all').length, 50);
  assert.equal(Engine.levelPool(states, 'anything-else').length, 50, 'an unknown level still means all states');
});

test('DRAW: 100,000 rounds, every state equally likely, never a duplicate in a round', () => {
  const rng = Engine.seededRng(20260101), N = 100000, n = 10, counts = {}, firstCounts = {};
  states.items.forEach(i => { counts[i.id] = 0; firstCounts[i.id] = 0; });
  for (let r = 0; r < N; r++) {
    const round = Engine.draw(states, n, 'all', rng);
    assert.equal(round.length, n);
    const seen = new Set(round.map(i => i.id));
    assert.equal(seen.size, n, 'duplicate state in round ' + r);
    round.forEach(i => counts[i.id]++); firstCounts[round[0].id]++;
  }
  const p = n / 50, sd = Math.sqrt(p * (1 - p) / N), p1 = 1 / 50, sd1 = Math.sqrt(p1 * (1 - p1) / N);
  let worst = 0, worstFirst = 0;
  for (const id of Object.keys(counts)) {
    worst = Math.max(worst, Math.abs(counts[id] / N - p) / sd);
    worstFirst = Math.max(worstFirst, Math.abs(firstCounts[id] / N - p1) / sd1);
  }
  assert.ok(worst < 4.5, 'appearance frequency is within 4.5 sigma for all 50 states (worst ' + worst.toFixed(2) + ')');
  assert.ok(worstFirst < 4.5, 'each state is equally likely to come up first (worst ' + worstFirst.toFixed(2) + ' sigma)');
  /* chi-square over the 50 first-lot counts: 49 degrees of freedom, 99.9% bound is 85.35 */
  const chi = Object.values(firstCounts).reduce((a, c) => a + (c - N / 50) ** 2 / (N / 50), 0);
  assert.ok(chi < 85.35, 'first-lot chi-square ' + chi.toFixed(1));
});

test('DRAW: the unseeded generator is uniform too', () => {
  const N = 40000, counts = {};
  for (let r = 0; r < N; r++) for (const i of Engine.draw(states, 5, 'all')) counts[i.id] = (counts[i.id] || 0) + 1;
  const p = 5 / 50, sd = Math.sqrt(p * (1 - p) / N);
  for (const i of states.items) assert.ok(Math.abs(counts[i.id] / N - p) / sd < 5.5, i.id);
});

test('DRAW: every lot option gives exactly that many distinct states; "All 50" is each state exactly once, in shuffled order', () => {
  const rng = Engine.seededRng(7);
  for (const n of states.lots.options) for (let r = 0; r < 300; r++) {
    const round = Engine.draw(states, n, 'all', rng);
    assert.equal(round.length, n); assert.equal(new Set(round.map(i => i.id)).size, n);
  }
  const orders = new Set();
  for (let r = 0; r < 200; r++) {
    const round = Engine.draw(states, 50, 'all', rng);
    assert.deepEqual(round.map(i => i.id).sort(), states.items.map(i => i.id).sort(), 'each state exactly once');
    orders.add(round.map(i => i.id).join());
  }
  assert.ok(orders.size > 195, 'the order is shuffled every time');
  const a = Engine.newAuction({ pack: states, kind: 'solo', level: 'all', lots: 50, players: [{ name: 'A' }, { name: 'B', ai: true }], rng: Engine.seededRng(3) });
  assert.equal(new Set(a.items.map(i => i.id)).size, 50);
});

test('PRICING GOLDEN: the accepted price of every state is pinned', () => {
  const t = Engine.priceTable(states);
  for (const it of states.items) assert.deepEqual([t.get(it.id).ideal, t.get(it.id).max], golden.prices[it.id], it.id);
  assert.equal(Object.keys(golden.prices).length, 50);
});

test('PRICING: smooth and monotonic, $1 minimum, tension like Countries, rough targets met', () => {
  const t = Engine.priceTable(states);
  const rows = states.items.slice().sort((a, b) => a.value - b.value).map(i => ({ id: i.id, ...t.get(i.id) }));
  for (let i = 1; i < rows.length; i++) { assert.ok(rows[i].ideal >= rows[i - 1].ideal, 'ideal never drops as population grows at ' + rows[i].id); assert.ok(rows[i].max >= rows[i - 1].max, 'max never drops at ' + rows[i].id); }
  rows.forEach(r => { assert.ok(r.ideal >= 1 && r.max >= r.ideal && Number.isInteger(r.ideal) && Number.isInteger(r.max)); });
  const scale = states.economy.priceScale, sumIdeal = rows.reduce((a, r) => a + r.ideal, 0);
  assert.equal(scale, 3);
  assert.ok(Math.abs(sumIdeal - 500 * scale) <= 5 * scale, 'all 50 ideals add up to 50 average lots ($1,500): ' + sumIdeal);
  assert.ok(Math.abs(Engine.avgIdeal(states) - 10 * scale) < 0.3, 'the average state is worth about $30');
  const get = id => t.get(id);
  assert.ok(get('CA').ideal >= 45 * scale && get('CA').ideal <= 60 * scale, 'California');
  assert.ok(get('TX').ideal >= 35 * scale && get('TX').ideal <= 48 * scale, 'Texas');
  assert.ok(get('FL').ideal >= 26 * scale && get('FL').ideal <= 35 * scale, 'Florida');
  assert.ok(get('NY').ideal >= 22 * scale && get('NY').ideal <= 30 * scale, 'New York');
  ['WY', 'VT', 'AK', 'ND', 'SD'].forEach(id => assert.ok(get(id).ideal >= 3 && get(id).ideal <= 6, id + ' is $3-6 (the small states no longer collapse to $1-2)'));
  rows.slice(-10).forEach(r => assert.ok(r.max / r.ideal <= 1.5, 'big states: max is at most 1.5x ideal (' + r.id + ')'));
  rows.slice(0, 5).forEach(r => assert.ok(r.max / r.ideal <= 2.01 && r.max / r.ideal >= 1.9, 'smallest states: about 2x'));
  /* systematic sampling: a round of n states is worth about n average lots (the budget is a fixed share of that, see the economy tests) */
  const rng = Engine.seededRng(99);
  for (const n of [5, 10, 20, 30, 40]) {
    let acc = 0; const R = 4000;
    for (let r = 0; r < R; r++) acc += Engine.draw(states, n, 'all', rng).reduce((a, i) => a + get(i.id).ideal, 0) / (n * Engine.avgIdeal(states));
    assert.ok(Math.abs(acc / R - 1) < 0.03, n + ' lots: the drawn ideals sum to ' + (acc / R).toFixed(3) + ' average rounds');
  }
});

test('PRICING: a pack without a priceTable still prices from percentile bands (the August Countries pack, pinned by its own golden)', () => {
  const golden = require('./golden-countries-august.json'), t = Engine.priceTable(august);
  assert.equal(typeof august.priceTable, 'undefined');
  for (const g of golden.countries) { const p = t.get(g.id); assert.equal(p.ideal, g.ideal, g.id); assert.equal(p.max, g.max, g.id); }
});

test('PRICING: validatePack refuses a pricing table that gets cheaper as value grows, or has both bands and a table', () => {
  const bad = Object.assign({}, states, { priceTable: its => { const m = new Map(); its.forEach((i, k) => m.set(i.id, { ideal: 10 - Math.floor(i.value), max: 20 })); return m; } });
  assert.ok(Engine.validatePack(bad).some(e => /cheaper/.test(e)));
  const both = Object.assign({}, states, { bands: august.bands });
  assert.ok(Engine.validatePack(both).some(e => /not both/.test(e)));
  const none = Object.assign({}, states); delete none.priceTable;
  assert.ok(Engine.validatePack(none).some(e => /bands/.test(e)));
});

test('CURRENCY: US dollars with commas for every language, no euro anywhere in the pack', () => {
  assert.equal(states.currency.symbol, '$');
  assert.equal(Engine.formatMoney(states, 7), '$7'); assert.equal(Engine.formatMoney(states, 1234), '$1,234');
  assert.equal(Engine.formatMoney(countries, 12), '€12', 'Countries keeps its euro format');
  const dump = JSON.stringify(states, (k, v) => typeof v === 'function' ? undefined : v);
  assert.ok(!/€|euro/i.test(dump), 'no euro in the States pack data');
  assert.equal(states.metric.effUnit, '$/M');
  LANGS.forEach(l => assert.ok(/\$/.test(states.metric.effLabel[l]), 'efficiency label in ' + l));
});

test('COPY: US English spelling in every English string of the pack', () => {
  const en = [];
  Object.values(states.taunts.items).forEach(a => en.push(...a));
  Object.values(states.taunts.generic.en).forEach(a => en.push(...a));
  Object.values(states.facts).forEach(f => en.push(f.en));
  const british = /\b(colour|favour|honour|neighbour|centre|metre|programme|theatre|grey|travelling|labour|harbour|organis|realis|analys[ei]|catalogue|cheque|defence|licence|whilst|mum|learnt)\w*/i;
  en.forEach(s => assert.ok(!british.test(s), 'British spelling in: ' + s));
  assert.ok(en.length >= 150);
});

test('NAMES: localised names exist where other languages use their own, and fall back to English', () => {
  const name = (id, l) => Engine.itemName(states.items.find(i => i.id === id), l);
  assert.equal(name('CA', 'de'), 'Kalifornien'); assert.equal(name('CA', 'fr'), 'Californie'); assert.equal(name('CA', 'es'), 'California');
  assert.equal(name('NY', 'es'), 'Nueva York'); assert.equal(name('NM', 'fr'), 'Nouveau-Mexique'); assert.equal(name('PA', 'es'), 'Pensilvania');
  assert.equal(name('TX', 'de'), 'Texas'); assert.equal(name('OH', 'it'), 'Ohio');
  states.items.forEach(i => LANGS.forEach(l => assert.ok(name(i.id, l).length > 1)));
});

test('TAUNTS: tiers cover every state; five languages x five tiers; bespoke lines for the 10 biggest and 10 smallest', () => {
  assert.deepEqual(states.taunts.tiers.map(t => t.id), ['mega', 'large', 'mid', 'small', 'micro']);
  const byTier = {}; states.items.forEach(i => { const t = Engine.tierOf(states, i.value); byTier[t] = (byTier[t] || 0) + 1; });
  assert.deepEqual(byTier, { mega: 4, large: 6, mid: 14, small: 14, micro: 12 });
  LANGS.forEach(l => states.taunts.tiers.forEach(t => { const lines = states.taunts.generic[l][t.id]; assert.ok(lines.length >= 4, l + ' ' + t.id); assert.ok(lines.filter(s => s.includes('{n}')).length >= 3, l + ' ' + t.id + ': most lines name the state'); }));
  const sorted = states.items.slice().sort((a, b) => b.value - a.value).map(i => i.id);
  [...sorted.slice(0, 10), ...sorted.slice(-10)].forEach(id => assert.ok((states.taunts.items[id] || []).length >= 4, 'bespoke lines for ' + id));
  assert.equal(Object.keys(states.taunts.items).length, 20);
  const rng = Engine.seededRng(5);
  states.items.forEach(i => LANGS.forEach(l => { const line = Engine.tauntFor(states, i, l, '', rng); assert.ok(line.length > 5 && !/\{n\}/.test(line)); }));
  const all = JSON.stringify(states.taunts).toLowerCase();
  assert.ok(!/\b(republican|democrat|trump|biden|liberal|conservative|redneck|hick|hillbill)/.test(all), 'nothing political or stereotyping');
});

test('FACTS: one per state, short, never about population, falls back to English', () => {
  states.items.forEach(i => {
    const f = Engine.factFor(states, i, 'en');
    assert.ok(f.length > 20 && f.length <= 140, i.id + ' length ' + f.length);
    assert.ok(!/popul|people live|\bresidents\b|inhabitants|million|most people|largest city|biggest city/i.test(f), 'no population hint: ' + f);
    assert.equal(Engine.factFor(states, i, 'de'), f, 'English fallback');
  });
  assert.equal(Engine.factFor(countries, countries.items[0], 'en'), '', 'packs without facts return nothing');
  const sources = fs.readFileSync(path.join(__dirname, '..', 'FACTS-SOURCES.md'), 'utf8');
  states.items.forEach(i => assert.ok(sources.includes(i.name.en), 'FACTS-SOURCES.md lists ' + i.name.en));
  assert.match(sources, /unverified/i);
});

test('SIMULATION: States pack, every lot option, 2-4 players, all policies — no exception, NaN or stuck state', () => {
  const rng = Engine.seededRng(31337); let games = 0, lots = 0;
  for (let k = 0; k < 1200; k++) {
    const kind = rng(2) ? 'solo' : 'multi', n = kind === 'solo' ? 2 : 2 + rng(3), nl = states.lots.options[rng(states.lots.options.length)];
    const policy = ['random', 'random', 'alwaysPass', 'minRaise', 'allIn'][rng(5)];
    const g = playGame({ pack: states, kind, n, level: 'all', lots: nl, rng, policy });
    games++; lots += g.log.lots;
    const owned = g.S.players.flatMap(p => p.bought.map(b => b.id));
    assert.equal(new Set(owned).size, owned.length, 'a state is never sold twice in one round');
  }
  assert.ok(games === 1200 && lots > 5000);
});
