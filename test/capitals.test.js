/* The Capital Cities pack: the UN data as committed, the 195 lots, the generator (no drift), smooth monotone prices pinned in a golden file,
   budgets per level and the top-5 cap, the random draw per level pool, the $1 walkover, and loose calibration bands per level on the real engine.
   The long reports are `node test/economy.js capitals`, `node test/exploit.js capitals`, `node test/tune-capitals.js`. Fixed seeds, loose bands. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const Engine = require('../engine.js');
const pack = require('../pack-capitals.js');
const W = require('./wup2018-f13-capitals.json'), C = require('./capitals-content.json'), golden = require('./golden-capitals.json');
const Eco = require('./economy.js');
const LV = ['beginner', 'medium', 'expert'];

test('Capitals: 195 lots = 193 UN members + Vatican City + Taipei, no Palestine, values are the UN numbers divided by 1,000', () => {
  assert.deepEqual(Engine.validatePack(pack), []);
  assert.equal(pack.items.length, 195); assert.equal(W.lots.length, 195);
  assert.equal(new Set(pack.items.map(i => i.id)).size, 195);
  const m49 = new Set(W.lots.map(r => r.m49));
  assert.equal(m49.size, 195, 'one lot per country');
  assert.ok(m49.has(336) && m49.has(158), 'Vatican City (Holy See) and Taiwan are lots');
  assert.ok(!m49.has(275), 'State of Palestine is not a lot (observer, not a member)');
  assert.equal([...m49].filter(c => c !== 336 && c !== 158).length, 193, 'the other 193 are the UN member states');
  for (const r of W.lots) {
    const it = pack.items.find(i => i.id === r.id);
    assert.ok(it, r.id); assert.ok(Math.abs(it.value - r.popThousands / 1000) < 1e-12, r.id + ' value = UN thousands / 1000, unchanged');
    assert.ok(r.popThousands > 0 && Number.isFinite(r.popThousands), r.id);
    assert.ok(Number.isFinite(r.lat) && Number.isFinite(r.lon), r.id + ' has the UN\'s own coordinates');
    assert.match(r.id, /^[A-Z]{2}$/);
  }
  assert.ok(W.license.includes('CC BY 3.0 IGO') && /^[0-9a-f]{64}$/.test(W.sha256_xls) && W.source.includes('2018 Revision'));
  /* spot checks against the UN file (File 13, 2018, thousands) */
  const v = id => pack.items.find(i => i.id === id).value;
  const near = (a, b) => Math.abs(a - b) < 1e-9; assert.ok(near(v('JP'), 37.468302) && near(v('VA'), 0.000801) && near(v('TW'), 2.705791) && near(v('IN'), 28.513682));
  assert.equal(pack.items.slice().sort((a, b) => b.value - a.value)[0].id, 'JP');
  assert.equal(pack.items.slice().sort((a, b) => a.value - b.value)[0].id, 'VA');
});

test('Capitals: the committed pack is exactly what the generator writes from the committed inputs (no hand edits)', () => {
  const { build } = require('./make-pack-capitals.js');
  assert.equal(fs.readFileSync(path.join(__dirname, '..', 'pack-capitals.js'), 'utf8'), build().pack);
});

test('Capitals: countries with several capitals use the seat of government (documented choices)', () => {
  const used = Object.fromEntries(W.lots.map(r => [r.id, r.unCity]));
  assert.match(used.NL, /Gravenhage/); assert.match(used.BJ, /Cotonou/); assert.match(used.BO, /La Paz/); assert.match(used.CI, /Abidjan/); assert.match(used.ZA, /Pretoria/); assert.match(used.LK, /Colombo/);
  const alt = new Set(W.alternates.map(a => a.id));
  assert.deepEqual([...alt].sort(), ['BJ', 'BO', 'CI', 'LK', 'NL', 'ZA'].sort(), 'every country with a second UN row is a documented choice');
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'CAPITALS-SOURCES.md'), 'utf8').includes('Seat of Government'));
});

test('Capitals names: every capital has a name; German, Italian, Spanish and French differ only where the local name differs; Europe tag matches Countries', () => {
  for (const it of pack.items) {
    assert.ok(it.name.en && it.name.en.length > 1, it.id);
    for (const l of ['de', 'it', 'es', 'fr']) if (it.name[l]) assert.notEqual(it.name[l], it.name.en, it.id + ' ' + l + ' only stored when different');
    assert.equal(Engine.itemName(it, 'de'), it.name.de || it.name.en);
  }
  const countries = require('../pack-countries.js');
  const europeC = new Set(countries.items.filter(i => (i.tags || []).includes('europe')).map(i => i.id));
  const europeK = new Set(pack.items.filter(i => (i.tags || []).includes('europe')).map(i => i.id));
  for (const id of europeK) assert.ok(europeC.has(id), id + ' is Europe in Countries too');
  for (const id of europeC) assert.ok(europeK.has(id) || !pack.items.some(i => i.id === id), id + ' (Europe in Countries) is Europe here');   // Kosovo is not a lot
  assert.equal(Engine.itemName(pack.items.find(i => i.id === 'NL'), 'en'), 'The Hague');
  assert.equal(Engine.itemName(pack.items.find(i => i.id === 'TW'), 'de'), 'Taipeh');
});

test('Capitals pools: Beginner = Europe (46), Medium = over 2 million (70), Expert = all 195, every lot option fits every level', () => {
  assert.equal(Engine.levelPool(pack, 'beginner').length, 46);
  assert.equal(Engine.levelPool(pack, 'medium').length, 70);
  assert.equal(Engine.levelPool(pack, 'expert').length, 195);
  assert.ok(Engine.levelPool(pack, 'medium').every(i => i.value >= 2));
  for (const lv of LV) assert.ok(Engine.levelPool(pack, lv).length >= Math.max(...pack.lots.options), lv);
});

test('Capitals prices: smooth, monotone (no bigger capital is cheaper), EUR 1 floor, pinned in golden-capitals.json, level averages near Countries (9 / 31 / 14)', () => {
  const t = Engine.priceTable(pack);
  const rows = pack.items.slice().sort((a, b) => a.value - b.value).map(i => ({ v: i.value, id: i.id, ...t.get(i.id) }));
  for (let i = 1; i < rows.length; i++) { assert.ok(rows[i].ideal >= rows[i - 1].ideal, 'ideal monotone at ' + rows[i].id); assert.ok(rows[i].max >= rows[i - 1].max, 'max monotone at ' + rows[i].id); }
  rows.forEach(r => assert.ok(r.ideal >= 1 && r.max >= r.ideal, r.id));
  assert.equal(golden.capitals.length, 195);
  for (const g of golden.capitals) { const p = t.get(g.id); assert.deepEqual({ ideal: p.ideal, max: p.max }, { ideal: g.ideal, max: g.max }, 'golden price of ' + g.id); assert.equal(Engine.tierOf(pack, pack.items.find(i => i.id === g.id).value), g.tier); }
  const avg = lv => Engine.avgIdeal(pack, lv);
  assert.ok(avg('beginner') > 8 && avg('beginner') < 12, 'Beginner average ' + avg('beginner'));
  assert.ok(avg('medium') > 27 && avg('medium') < 34, 'Medium average ' + avg('medium'));
  assert.ok(avg('expert') > 12 && avg('expert') < 16, 'Expert average ' + avg('expert'));
  assert.ok(t.get('JP').ideal >= 100 && t.get('JP').ideal <= 125 && t.get('VA').ideal === 1 && t.get('VA').max >= 2, 'Tokyo is the dearest (about a whole 10-lot budget), Vatican City costs EUR 1');
});

test('Capitals budgets: the clean table (Medium and Expert 50/100/150/200/300, Beginner half) and the top-5 cap per level', () => {
  const b = lv => pack.lots.options.map(n => Engine.budgetFor(pack, n, lv));
  assert.deepEqual(b('beginner'), [25, 50, 75, 100, 150]); assert.deepEqual(b('medium'), [50, 100, 150, 200, 300]); assert.deepEqual(b('expert'), [50, 100, 150, 200, 300]);
  assert.equal(Engine.budgetFor(pack, 10), 100, 'no level = Medium');
  const t = Engine.priceTable(pack);
  for (const lv of LV) {
    const top = Engine.levelPool(pack, lv).sort((a, c) => c.value - a.value).slice(0, pack.bot.premium.top);
    const exp = top.reduce((a, it) => a + (t.get(it.id).ideal + t.get(it.id).max) / 2 * (1 + pack.bot.premium.pct[lv]), 0);
    assert.ok(Engine.budgetFor(pack, 30, lv) <= 0.8 * exp, `${lv}: 30-lot budget within 80% of the top-5 price (${Math.round(0.8 * exp)})`);
  }
});

test('Capitals draw: random, no duplicates, every capital of the level pool equally likely (chi-square), All lot options work', () => {
  for (const lv of LV) {
    const pool = Engine.levelPool(pack, lv), n = 10, G = 20000, count = new Map(pool.map(i => [i.id, 0])), rng = Engine.seededRng(77);
    for (let g = 0; g < G; g++) {
      const d = Engine.draw(pack, n, lv, rng); assert.equal(d.length, n); assert.equal(new Set(d.map(i => i.id)).size, n, 'no duplicates');
      d.forEach(i => { assert.ok(count.has(i.id), 'inside the level pool'); count.set(i.id, count.get(i.id) + 1); });
    }
    const e = G * n / pool.length; let chi = 0; count.forEach(c => { chi += (c - e) ** 2 / e; });
    const df = pool.length - 1, crit = df + 4.5 * Math.sqrt(2 * df);   // 4.5 sigma
    assert.ok(chi < crit, `${lv}: chi-square ${chi.toFixed(1)} < ${crit.toFixed(1)}`);
  }
});

test('Capitals: when only one player has money left they take every remaining lot for EUR 1 each (the walkover)', () => {
  const S = Engine.newAuction({ pack, kind: 'solo', level: 'expert', lots: 10, players: [{ name: 'You' }, { name: 'Bot', ai: true }], rng: Engine.seededRng(3) });
  S.players[0].budget = 0; S.players[1].budget = 60;
  const r = Engine.startLot(S);
  assert.equal(r.state, 'done'); assert.equal(r.reason, 'walkover');
  assert.equal(S.players[1].bought.length, 10); assert.equal(S.players[1].bought.filter(b => b.price === 1).length, 10); assert.equal(S.players[1].budget, 50);
});

/* ---- calibration guards on the real engine (loose; the numbers are in the PR description) ---- */
test('Capitals economy: the creeper never takes more than 60% of the points and fair players stay in 15-75% win, every level and lot count', () => {
  const G = 500;
  for (const lv of LV) for (const n of pack.lots.options) {
    const A = Eco.run(pack, n, lv, 'A', G, 50000, null), Cs = Eco.run(pack, n, lv, 'Cs', G, 50000, null);
    assert.ok(A.share <= 60, `${lv} ${n}: creeper share ${A.share}%`);
    assert.ok(Cs.win >= 15 && Cs.win <= 75, `${lv} ${n}: fair-value player wins ${Cs.win}%`);
    assert.ok(A.win <= (n === 5 ? 65 : 60), `${lv} ${n}: creeper wins ${A.win}%`);
  }
});

test('Capitals economy: the long-round creeper is beaten (Medium and Expert 30 lots under 20%, Beginner under 15%) - money is scarce on purpose', () => {
  for (const lv of LV) { const A = Eco.run(pack, 30, lv, 'A', 500, 50000, null); assert.ok(A.win < (lv === 'beginner' ? 15 : 20), `${lv} 30 lots: creeper wins ${A.win}%`); }
});

test('Capitals exploit search (small): no strategy of the family beats the bot above the limit', () => {
  const X = require('./exploit.js');
  for (const lv of LV) for (const n of [10, 30]) {
    let best = 0, who = '';
    for (const s of X.strategies(pack, lv).filter(s => !s.oracle)) { const w = X.wins(pack, n, lv, s, 150, 777000); if (w > best) { best = w; who = s.name; } }
    assert.ok(best <= 68, `${lv} ${n}: ${who} wins ${best}% on a small scan (the full confirmed search is node test/exploit.js capitals)`);
  }
});

test('Capitals: the bot goes all-in only for a lot that costs a real share of its purse (Delhi yes, Washington D.C. at the start of a 5-lot round no)', () => {
  const near = (id, lv) => { const { ds, avail } = Eco.probe(pack, lv, id, 400, 5, 1000); return { atWallet: ds.filter(d => d >= avail).length / ds.length, median: ds.slice().sort((a, b) => a - b)[ds.length >> 1], avail }; };
  for (const lv of ['medium', 'expert']) {
    const dc = near('US', lv), delhi = near('IN', lv);
    assert.ok(dc.atWallet < 0.1, `${lv}: Washington D.C. ends at the whole purse in ${Math.round(dc.atWallet * 100)}% of games`);
    assert.ok(dc.median < 0.8 * dc.avail, `${lv}: Washington D.C. median drop-out ${dc.median} against a purse of ${dc.avail}`);
    assert.ok(delhi.atWallet > 0.8, `${lv}: Delhi is worth the whole purse (${Math.round(delhi.atWallet * 100)}%)`);
  }
  assert.ok(pack.bot.decisive.minPrice > 0, 'the capitals pack sets decisive.minPrice');
});

test('Engine: bot.decisive.minPrice must be a positive share (validatePack)', () => {
  const bad = Object.assign({}, pack, { bot: Object.assign({}, pack.bot, { decisive: Object.assign({}, pack.bot.decisive, { minPrice: -1 }) }) });
  assert.ok(Engine.validatePack(bad).some(m => /minPrice/.test(m)));
  assert.deepEqual(Engine.validatePack(pack), []);
});

test('The globe texture is NASA Blue Marble (credited in NOTICE.md and in all five languages), 4096x2048, under 1.5 MB', () => {
  const buf = fs.readFileSync(path.join(__dirname, '..', 'earth.jpg'));
  let i = 2, w = 0, h = 0;
  while (i < buf.length) { if (buf[i] !== 0xFF) { i++; continue; } const m = buf[i + 1]; if (m >= 0xC0 && m <= 0xC3) { h = buf.readUInt16BE(i + 5); w = buf.readUInt16BE(i + 7); break; } i += 2 + buf.readUInt16BE(i + 2); }
  assert.deepEqual([w, h], [4096, 2048]); assert.ok(buf.length < 1.5 * 1024 * 1024, 'size ' + buf.length);
  assert.ok(/Globe texture[^\n]*Blue Marble/.test(fs.readFileSync(path.join(__dirname, '..', 'NOTICE.md'), 'utf8')));
  assert.equal((fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').match(/creditsGlobe:'[^']*NASA Earth Observatory/g) || []).length, 5);
});
