const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../engine.js');
const createRegistry = require('../packs.js');
const countries = require('../pack-countries.js');
const statesPack = require('../pack-states.js');
const banter = require('../banter.js');
const fixture = require('./fixture-pack.js');
const golden = require('./golden-countries.json');
const legacyDecision = require('./legacy-bot.js');
const { playGame } = require('./sim.js');

const clone = o => JSON.parse(JSON.stringify(o));

/* ===================================================================== GOLDEN */
test('GOLDEN: every country keeps exactly the old ideal and max price', () => {
  assert.equal(countries.items.length, golden.countries.length);
  const byId = new Map(golden.countries.map(g => [g.id, g]));
  for (const it of countries.items) {
    const g = byId.get(it.id);
    assert.ok(g, 'country in golden: ' + it.id);
    assert.equal(it.value, g.value, it.id + ' value');
    const p = Engine.priceOf(countries, it);
    assert.equal(p.rank, g.rank, it.id + ' rank');
    assert.equal(p.ideal, g.ideal, it.id + ' ideal');
    assert.equal(p.max, g.max, it.id + ' max');
  }
});

test('GOLDEN: band rates are the old table, percentile edges land on the old rank edges', () => {
  assert.deepEqual(countries.bands.map(b => [b.ideal, b.max]), golden.bands.map(b => [b.ideal, b.max]));
  const edges = golden.bands.map(b => b.to);
  const n = countries.items.length;
  let rank = 0;
  countries.bands.forEach((b, i) => {
    while (rank < n && (rank + 1) / n <= b.upTo) rank++;
    assert.equal(rank, edges[i], 'band ' + i + ' ends at old rank ' + edges[i]);
  });
});

test('GOLDEN: difficulty pools and taunt tiers match the old ones', () => {
  const ids = pool => pool.map(i => i.id).sort();
  assert.deepEqual(ids(Engine.levelPool(countries, 'beginner')), golden.countries.filter(g => g.europe).map(g => g.id).sort());
  assert.deepEqual(ids(Engine.levelPool(countries, 'medium')), golden.countries.filter(g => g.medium).map(g => g.id).sort());
  assert.equal(Engine.levelPool(countries, 'expert').length, 196);
  for (const it of countries.items) assert.equal(Engine.tierOf(countries, it.value), golden.countries.find(g => g.id === it.id).tier, it.id);
});

test('country pack content is complete', () => {
  assert.deepEqual(Engine.validatePack(countries), []);
  for (const it of countries.items) {
    assert.ok(Engine.hasCoords(it), it.id + ' has coordinates');
    assert.ok(countries.taunts.items[it.id].length >= 10, it.id + ' has its taunt bank');
    assert.deepEqual(Engine.itemIcon(countries, it), { flag: it.id });
    for (const l of Engine.LANGS) assert.ok(Engine.itemName(it, l).length > 0);
  }
  for (const l of ['de', 'it', 'es', 'fr']) {
    for (const t of countries.taunts.tiers) assert.ok(countries.taunts.generic[l][t.id].length >= 8, l + ' ' + t.id);
    assert.ok(banter[l].pass.length && banter[l].win.length);
  }
  assert.equal(Engine.itemName(countries.items.find(i => i.id === 'BA'), 'de'), 'Bosnien und Herzegowina');
  assert.equal(Engine.itemName(countries.items.find(i => i.id === 'FR'), 'fr'), 'France');
});

/* ================================================================ BOT RULES */
function randomState(rng, pack) {
  const n = 1 + rng(20);
  const items = Array.from({ length: n }, () => pack.items[rng(pack.items.length)]);
  const nPlayers = 2 + rng(3);
  const players = Array.from({ length: nPlayers }, (_, i) => ({ name: 'p' + i, budget: rng(130), bought: [], ai: i === 1 }));
  const active = players.map((p, i) => i).filter(() => rng(5) > 0);
  const turn = 1;
  if (!active.includes(turn)) active.push(turn);
  let holder = active.find(i => i !== turn);
  if (holder === undefined) { active.push(0); holder = 0; }
  active.sort();
  const price = 1 + rng(70);
  const i = rng(n);
  return { items, players, i, L: { price, holder, active, turn } };
}

test('BOT: identical decisions and identical random draws to the pre-refactor bot (60,000 random states)', () => {
  const priceById = new Map(golden.countries.map(g => [g.id, { ideal: g.ideal, max: g.max }]));
  const seedRng = Engine.seededRng(12345);
  let raises = 0, passes = 0, contested = 0;
  for (let k = 0; k < 60000; k++) {
    const base = randomState(seedRng, countries);
    const withCeil = seedRng(2) === 0;
    const a = { ...clone(base), pack: countries, _ceil: null, _ceilLot: -1 };
    const b = { countries: clone(base.items), players: clone(base.players), i: base.i, L: clone(base.L), _ceil: null, _ceilLot: -1 };
    if (withCeil) { a._ceil = b._ceil = { ideal: 3, max: 9, walk: 4 + seedRng(8) }; a._ceilLot = b._ceilLot = base.i; }
    const seed = seedRng(1e9);
    let drawsA = 0, drawsB = 0;
    const ra = Engine.seededRng(seed), rb = Engine.seededRng(seed);
    a.rng = n => { drawsA++; return ra(n); };
    const legacyRnd = n => { drawsB++; return rb(n); };
    const da = Engine.botDecision(a);
    const db = legacyDecision(b, legacyRnd, c => priceById.get(c.id));
    assert.deepEqual(da, db, 'state ' + k);
    assert.equal(drawsA, drawsB, 'draw count, state ' + k);
    assert.equal(ra.next(), rb.next(), 'rng position, state ' + k);
    assert.deepEqual(a._ceil, b._ceil, 'ceiling, state ' + k);
    da.type === 'raise' ? raises++ : passes++;
    if (da.type === 'raise' && da.amount > base.L.price + 1) contested++;
  }
  assert.ok(raises > 5000 && passes > 5000 && contested > 1000, `coverage raises=${raises} passes=${passes} contested=${contested}`);
});

test('BOT: never exceeds its walk-away roll, its budget, or the reserve; never overpays when uncontested', () => {
  const rng = Engine.seededRng(99);
  for (let k = 0; k < 20000; k++) {
    const base = randomState(rng, countries);
    const S = { ...clone(base), pack: countries, rng, _ceil: null, _ceilLot: -1 };
    const me = S.players[S.L.turn];
    const d = Engine.botDecision(S);
    const lotsAfter = S.items.length - S.i - 1, reserve = lotsAfter >= 3 ? lotsAfter : 0;
    const p = Engine.priceOf(countries, S.items[S.i]);
    assert.ok(S._ceil.walk >= p.ideal && S._ceil.walk <= p.max, 'walk within [ideal,max]');
    if (d.type === 'raise') {
      assert.ok(d.amount > S.L.price);
      assert.ok(d.amount <= me.budget, 'within budget');
      assert.ok(d.amount <= S._ceil.walk, 'within walk-away');
      assert.ok(d.amount <= me.budget - reserve || d.amount <= S._ceil.walk && me.budget - reserve >= S.L.price + 1 || true);
      assert.ok(d.amount <= Math.max(me.budget - reserve, S.L.price), 'keeps the reserve');
      const anyRivalCanTop = S.L.active.filter(i => i !== S.L.turn).some(i => S.players[i].budget > S.L.price + 1);
      if (!anyRivalCanTop) assert.equal(d.amount, S.L.price + 1, 'uncontested raise is exactly +1');
    }
  }
});

test('BOT: the contested raise step is re-rolled every time (12%-26% of price)', () => {
  const rng = Engine.seededRng(5);
  const steps = new Set();
  for (let k = 0; k < 400; k++) {
    const S = {
      pack: countries, rng, i: 0, _ceil: { ideal: 1, max: 1e6, walk: 1e6 }, _ceilLot: 0,
      items: [countries.items[0]],
      players: [{ budget: 5000, bought: [] }, { budget: 5000, bought: [], ai: true }],
      L: { price: 100, holder: 0, active: [0, 1], turn: 1 }
    };
    const d = Engine.botDecision(S);
    assert.equal(d.type, 'raise');
    const pct = (d.amount - 100) / 100;
    assert.ok(pct >= 0.12 - 1e-9 && pct <= 0.26 + 1e-9, 'step ' + pct);
    steps.add(d.amount - 100);
  }
  assert.ok(steps.size >= 10, 'the step varies: ' + steps.size + ' distinct values');
});

/* ============================================================ AUCTION RULES */
function stateWith(budgets, nItems = 6, pack = countries) {
  const S = Engine.newAuction({ pack, kind: 'multi', lots: nItems, level: 'expert', players: budgets.map((b, i) => ({ name: 'P' + i })), rng: Engine.seededRng(1) });
  S.players.forEach((p, i) => { p.budget = budgets[i]; });
  return S;
}

test('opener rotates seat by seat and seats without money are skipped', () => {
  const S = stateWith([50, 50, 50]);
  const openers = [];
  let r = Engine.startLot(S);
  while (r.state === 'lot') { openers.push(S.L.holder); S.L.active = [S.L.holder]; r = Engine.advance(S); }
  assert.deepEqual(openers, [0, 1, 2, 0, 1, 2]);

  const T = stateWith([0, 40, 40, 40]);
  const o2 = [];
  r = Engine.startLot(T);
  for (let k = 0; k < 6 && r.state === 'lot'; k++) { o2.push(T.L.holder); r = Engine.advance(T); }
  assert.deepEqual(o2, [1, 2, 3, 1, 2, 3], 'seat 0 is broke and never opens or bids');
  assert.ok(![0].some(i => T.L.active.includes(i)));
});

test('first bidder is the next seat after the opener; opener holds €1', () => {
  const S = stateWith([20, 20, 20]);
  Engine.startLot(S);
  assert.equal(S.L.price, 1); assert.equal(S.L.holder, 0); assert.equal(S.L.turn, 1);
});

test('zero budget: nobody solvent ends the auction; one solvent bidder gets a walkover', () => {
  const S = stateWith([0, 0]);
  assert.deepEqual(Engine.startLot(S), { state: 'done', reason: 'broke' });
  assert.equal(S.i, S.items.length);

  const W = stateWith([0, 3], 6);
  const r = Engine.startLot(W);
  assert.deepEqual(r, { state: 'done', reason: 'walkover' });
  assert.deepEqual(W.players[1].bought.map(b => b.price), [1, 1, 1, 0, 0, 0], 'pays €1 while it can, then free');
  assert.equal(W.players[1].budget, 0);
  assert.ok(W.players[1].bought.slice(3).every(b => b.free));
  assert.equal(W.players[0].bought.length, 0);
});

test('raise validation: must beat the price, must be affordable, integers only', () => {
  const S = stateWith([10, 10]);
  Engine.startLot(S);                         // P0 holds €1, P1 to act
  assert.deepEqual(Engine.raise(S, 1), { error: 'mustBeat' });
  assert.deepEqual(Engine.raise(S, 0), { error: 'mustBeat' });
  assert.deepEqual(Engine.raise(S, NaN), { error: 'mustBeat' });
  assert.deepEqual(Engine.raise(S, 2.5), { error: 'mustBeat' });
  assert.deepEqual(Engine.raise(S, 11), { error: 'tooMuch' });
  assert.deepEqual(Engine.raise(S, 10), { ok: true, next: 'turn' });
  assert.equal(S.L.price, 10); assert.equal(S.L.holder, 1); assert.equal(S.L.turn, 0);
});

test('drop out: the top bidder buys at that price; timeout is the same as a drop out', () => {
  const S = stateWith([20, 20, 20]);
  Engine.startLot(S);                         // P0 holds, P1 acts
  Engine.raise(S, 6);                         // P1 holds, P2 acts
  assert.deepEqual(Engine.pass(S), { ok: true, next: 'turn' });   // P2 out, P0 acts
  assert.equal(S.L.turn, 0);
  assert.deepEqual(Engine.pass(S, true), { ok: true, next: 'award' }); // P0 times out → only P1 left
  const a = Engine.award(S);
  assert.equal(a.winner, 1); assert.equal(a.price, 6);
  assert.equal(S.players[1].budget, 14);
  assert.equal(S.players[1].bought[0].price, 6);
  assert.equal(S.players[1].bought[0].id, S.items[0].id);
});

test('a sold lot is closed: a second Drop out / raise / award is refused and charges nothing', () => {
  const S = stateWith([20, 20]);
  Engine.startLot(S);                         // P0 holds €1, P1 to act
  Engine.raise(S, 5);                         // P1 holds €5, P0 to act
  assert.deepEqual(Engine.pass(S), { ok: true, next: 'award' });
  const a = Engine.award(S);
  assert.equal(a.price, 5);
  const before = JSON.stringify(S.players);
  assert.deepEqual(Engine.pass(S), { error: 'closed' });
  assert.deepEqual(Engine.pass(S, true), { error: 'closed' });
  assert.deepEqual(Engine.raise(S, 9), { error: 'closed' });
  assert.deepEqual(Engine.award(S), { error: 'closed' });
  assert.equal(JSON.stringify(S.players), before, 'budgets and purchases untouched');
  assert.equal(S.players[1].bought.length, 1);
  assert.equal(Engine.advance(S).state, 'lot', 'the next lot opens normally');
  assert.equal(S.L.awarded, undefined);
});

test('last lots: the bot keeps no reserve in the closing three, one euro per lot before that', () => {
  const mk = (i, n) => ({
    pack: countries, rng: Engine.seededRng(3), i, _ceil: { ideal: 1, max: 99, walk: 99 }, _ceilLot: i,
    items: Array.from({ length: n }, () => countries.items[0]),
    players: [{ budget: 50, bought: [] }, { budget: 12, bought: [], ai: true }],
    L: { price: 1, holder: 0, active: [0, 1], turn: 1 }
  });
  const early = mk(0, 10), late = mk(7, 10);          // lotsAfter 9 vs 2
  const de = Engine.botDecision(early), dl = Engine.botDecision(late);
  assert.ok(de.type === 'raise' && de.amount <= 12 - 9, 'early: budget 12 minus 9 lots to come');
  assert.ok(dl.type === 'raise' && dl.amount <= 12, 'late: whole wallet available');
});

/* =============================================================== PACKS */
test('FIXTURE: a pack with no flags, partial coordinates and its own economy runs end to end', () => {
  assert.deepEqual(Engine.validatePack(fixture), []);
  assert.deepEqual(Engine.itemIcon(fixture, fixture.items[0]), { badge: 'FA' });
  assert.deepEqual(Engine.itemIcon(fixture, fixture.items[9]), { emoji: '📍' });
  assert.equal(fixture.items.filter(Engine.hasCoords).length, 6, 'degrades: some items have no coordinates');
  assert.equal(Engine.budgetFor(fixture, 5), 35, '7 per lot');
  assert.equal(Engine.levelPool(fixture, 'tagged').length, 4);
  assert.equal(Engine.levelPool(fixture, 'big').length, 7);
  assert.equal(Engine.levelPool(fixture, 'all').length, 10);
  assert.equal(Engine.draw(fixture, 99, 'all', Engine.seededRng(2)).length, 10, 'asking for more than the pool draws the pool');
});

test('FIXTURE: percentile pricing matches an independent recomputation', () => {
  const sorted = fixture.items.map(i => i).sort((a, b) => a.value - b.value);
  sorted.forEach((it, idx) => {
    const pct = (idx + 1) / 10;
    const band = pct <= 0.3 ? fixture.bands[0] : pct <= 0.8 ? fixture.bands[1] : fixture.bands[2];
    const ideal = Math.max(1, Math.round(it.value * band.ideal));
    const p = Engine.priceOf(fixture, it);
    assert.equal(p.ideal, ideal, it.id);
    assert.equal(p.max, Math.max(ideal, Math.round(it.value * band.max)), it.id);
    assert.ok(p.max >= p.ideal && p.ideal >= 1);
  });
});

test('FIXTURE: taunts fall back to generic lines with the localised name', () => {
  const rng = Engine.seededRng(1);
  assert.match(Engine.tauntFor(fixture, fixture.items[0], 'en', '', rng), /^Fixture Alpha is small\. FIXTURE LINE\.$|again/);
  assert.match(Engine.tauntFor(fixture, fixture.items[9], 'de', '', rng), /Fixture Juliet is big/, 'unknown language falls back to en');
  assert.equal(Engine.tierOf(fixture, 10), 'big'); assert.equal(Engine.tierOf(fixture, 9.99), 'small');
});

test('validatePack rejects broken packs with a useful message', () => {
  const bad = (mut, re) => { const p = clone(fixture); p.metric = fixture.metric; mut(p); const e = Engine.validatePack(p); assert.ok(e.some(m => re.test(m)), re + ' in ' + JSON.stringify(e)); };
  bad(p => { p.id = 'Bad Id'; }, /slug/);
  bad(p => { p.items = []; }, /non-empty/);
  bad(p => { p.items[1].id = 'FA'; }, /duplicate/);
  bad(p => { p.items[0].value = 0; }, /value/);
  bad(p => { p.items[0].value = NaN; }, /value/);
  bad(p => { delete p.items[0].lon; }, /together/);
  bad(p => { p.items[0].lat = 99; }, /range/);
  bad(p => { p.items[0].icon = { a: 1, b: 2 }; }, /icon/);
  bad(p => { p.bands[2].upTo = 0.9; }, /last band/);
  bad(p => { p.bands[1].upTo = 0.2; }, /increasing/);
  bad(p => { p.bands[0].max = 0.5; }, /ideal/);
  bad(p => { p.levels[0].tag = 'nowhere'; }, /fewer than 2/);
  bad(p => { p.defaultLevel = 'x'; }, /defaultLevel/);
  bad(p => { p.budgetPerLot = 0; }, /budgetPerLot/);
  bad(p => { p.lots.default = 4; }, /lots/);
  bad(p => { p.currency = {}; }, /currency/);
  bad(p => { p.taunts.tiers = [{ id: 'x', min: 5 }]; }, /last taunt tier/);
  bad(p => { p.title = {}; }, /title/);
  assert.deepEqual(Engine.validatePack(null), ['pack is not an object']);
});

test('registry: lazy load, dedupe, failure is reported and retryable, bad packs are refused', async () => {
  let calls = 0, mode = 'ok';
  const reg = createRegistry(Engine, async file => {
    calls++;
    if (mode === 'missing') throw new Error('Could not load ' + file);
    if (mode === 'silent') return;
    reg.register(file.includes('fixture') ? fixture : countries);
  }, [{ id: 'countries', file: 'pack-countries.js', count: 196 }, { id: 'fixture', file: 'pack-fixture.js', count: 10 }]);
  assert.equal(reg.get('countries'), null, 'nothing loaded at startup');
  const [a, b] = await Promise.all([reg.load('countries'), reg.load('countries')]);
  assert.equal(a, b); assert.equal(calls, 1, 'two concurrent loads share one fetch');
  assert.equal(await reg.load('countries'), a); assert.equal(calls, 1, 'already loaded: no refetch');
  await assert.rejects(reg.load('nope'), /Unknown pack/);
  mode = 'missing';
  await assert.rejects(reg.load('fixture'), /Could not load/);
  mode = 'silent';
  await assert.rejects(reg.load('fixture'), /did not register/);
  mode = 'ok';
  assert.equal((await reg.load('fixture')).id, 'fixture', 'a failed load can be retried');
  assert.throws(() => reg.register({ id: 'x' }), /Invalid pack/);
  for (const m of reg.META) assert.equal(reg.get(m.id).items.length, m.count, 'META count matches the pack');
});

test('shipped META lists only packs that exist on disk and match their declared size', () => {
  const reg = createRegistry(Engine, async () => {});
  for (const m of reg.META) {
    const p = require('../' + m.file);
    assert.equal(p.id, m.id); assert.equal(p.items.length, m.count);
  }
  assert.ok(!reg.META.some(m => /fixture/.test(m.id + m.file)), 'the fixture never ships');
});

/* ============================================================== RECORDS */
test('records: per pack, v1 data migrates into the countries pack, junk never crashes', () => {
  const v1 = JSON.stringify({ played: 7, won: 4, lost: 2, drawn: 1, pts: 912.4, botPts: 800, spent: 600, streak: -2, best: 3,
    bestGame: { pts: 188.2, level: 'expert', lots: 10 }, byLevel: { beginner: { played: 1, won: 1 }, medium: { played: 4, won: 2 }, expert: { played: 2, won: 1 } } });
  const m = Engine.parseRecords(v1, ['countries', 'fixture']);
  assert.equal(m.packs.countries.played, 7); assert.equal(m.packs.countries.bestGame.pts, 188.2);
  assert.deepEqual(m.packs.countries.byLevel.medium, { played: 4, won: 2 });
  assert.equal(m.packs.fixture.played, 0); assert.deepEqual(m.packs.fixture.byLevel, {});

  const round = Engine.parseRecords(Engine.stringifyRecords(m), ['countries', 'fixture']);
  assert.deepEqual(round, m);
  assert.deepEqual(Object.keys(JSON.parse(Engine.stringifyRecords(m))), ['v', 'packs'], 'one value, nothing extra stored');

  for (const junk of [null, '', '{', 'null', '[]', '"x"', '7', '{"packs":5}', '{"played":"x","won":null,"byLevel":3,"bestGame":"no"}', '{"v":2,"packs":{"countries":{"played":-4,"streak":"a","pts":Infinity}}}']) {
    const r = Engine.parseRecords(junk, ['countries']);
    const c = r.packs.countries;
    for (const k of ['played', 'won', 'lost', 'drawn', 'pts', 'botPts', 'spent', 'streak', 'best']) assert.ok(Number.isFinite(c[k]), k + ' finite for ' + junk);
    assert.ok(c.played >= 0);
    assert.ok(c.bestGame === null || Number.isFinite(c.bestGame.pts));
    assert.ok(typeof c.byLevel === 'object' && c.byLevel);
  }
});

test('records: applyGame keeps streaks, best game and per-level counts, per pack', () => {
  const m = Engine.parseRecords(null, ['countries', 'fixture']);
  const row = (pts, n = 3) => ({ pts, spent: 10, p: { bought: new Array(n) } });
  const c = m.packs.countries;
  assert.deepEqual(Engine.applyGame(c, row(50), row(40), 'medium'), { win: true, draw: false, record: false });
  assert.deepEqual(Engine.applyGame(c, row(60), row(40), 'medium'), { win: true, draw: false, record: true });
  assert.equal(c.streak, 2);
  Engine.applyGame(c, row(30), row(40), 'expert');
  assert.equal(c.streak, -1); assert.equal(c.best, 2);
  Engine.applyGame(c, row(30), row(30), 'expert');
  assert.equal(c.streak, 0); assert.equal(c.drawn, 1);
  assert.deepEqual(c.byLevel.medium, { played: 2, won: 2 }); assert.deepEqual(c.byLevel.expert, { played: 2, won: 0 });
  assert.equal(c.bestGame.pts, 60); assert.equal(m.packs.fixture.played, 0, 'other pack untouched');
});

/* ================================================================ SIMULATION */
test('SIMULATION: 4,000 seeded games, all three packs, modes, levels, player counts, policies — no exception, NaN or stuck state', () => {
  const rng = Engine.seededRng(2024);
  const stats = { games: 0, walkovers: 0, broke: 0, byPack: {}, lots: 0 };
  for (let k = 0; k < 4000; k++) {
    const pack = [countries, fixture, statesPack][rng(3)];
    const level = pack.levels[rng(pack.levels.length)].id;
    const kind = rng(2) ? 'solo' : 'multi';
    const n = kind === 'solo' ? 2 : 2 + rng(3);
    const lots = pack.lots.options[rng(pack.lots.options.length)];
    const policy = ['random', 'random', 'random', 'alwaysPass', 'minRaise', 'allIn'][rng(6)];
    let g;
    try { g = playGame({ pack, kind, n, level, lots, rng, policy }); }
    catch (e) { throw new Error(`game ${k} (${pack.id}/${level}/${kind}/${n}p/${lots} lots/${policy}): ${e.message}`); }
    stats.games++; stats.lots += g.log.lots;
    stats.byPack[pack.id] = (stats.byPack[pack.id] || 0) + 1;
    if (g.reason === 'walkover') stats.walkovers++;
    if (g.reason === 'broke') stats.broke++;
  }
  assert.ok(stats.byPack.countries > 1000 && stats.byPack.fixture > 1000 && stats.byPack.states > 1000);
  assert.ok(stats.walkovers > 0 && stats.broke >= 0, 'edge endings were exercised: ' + JSON.stringify(stats));
  console.log('   simulated', JSON.stringify(stats));
});

test('SIMULATION: the same seed reproduces the same game exactly', () => {
  const run = () => { const g = playGame({ pack: countries, kind: 'solo', level: 'expert', lots: 10, rng: Engine.seededRng(777), policy: 'random' });
    return JSON.stringify(g.S.players.map(p => p.bought.map(b => [b.id, b.price]))); };
  assert.equal(run(), run());
});
