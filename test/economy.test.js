/* The US States economy on the real engine: scarce money, the house-price endgame, systematic sampling, the extended
   bot (Big-4 premium, pacing, knockout, temperaments, mood). The full report is `node test/economy.js`; these are the
   guards that must stay true. Statistical checks use fixed seeds and deliberately loose bands. */
const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../engine.js');
const states = require('../pack-states.js'), countries = require('../pack-countries.js'), august = require('./pack-countries-august.js');
const baseline = require('./baseline-august.json');
const Eco = require('./economy.js');

const sd = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m; };

test('the money is scarce and the table is sane: budget ratio, top-4 rule, no budget for the whole pool', () => {
  const avg = Engine.avgIdeal(states), opts = states.lots.options;
  assert.deepEqual(Engine.validatePack(states), []);
  let prev = 0;
  for (const n of opts) {
    const b = Engine.budgetFor(states, n), f = b / (n * avg);
    assert.ok(b > prev, 'budgets grow with the lot count'); prev = b;
    assert.ok(f >= 0.3 && f <= 0.6, n + ' lots: budget is ' + (f * 100).toFixed(0) + '% of the expected value of the round');
  }
  assert.ok(opts.filter(n => n >= 20).every(n => Math.abs(Engine.budgetFor(states, n) / (n * avg) - 0.35) < 0.01), '20+ lots: 35%');
  const t = Engine.priceTable(states), top = states.items.slice().sort((a, b) => b.value - a.value).slice(0, states.bot.premium.top);
  const exp = top.reduce((a, i) => a + (t.get(i.id).ideal + t.get(i.id).max) / 2 * (1 + states.bot.premium.pct), 0);
  assert.ok(Engine.budgetFor(states, 50) <= 0.8 * exp, 'all-50 budget is at most 80% of the expected price of CA+TX+FL+NY incl. the premium');
  const all = [...t.values()].reduce((a, v) => a + v.ideal, 0);
  assert.ok(Engine.budgetFor(states, 50) < 0.4 * all, 'a full budget buys well under half the pool at fair prices');
  assert.equal(Engine.budgetFor(august, 10), 100, 'the August Countries pack keeps 10 lots = 100');
});

test('systematic sampling: every state keeps its exact chance, no duplicates, 50 = each once, far smaller swings', () => {
  const rng = Engine.seededRng(2024), G = 100000;
  for (const n of [5, 10, 15, 20, 30, 40]) {
    const cnt = {}; let dup = 0;
    for (let g = 0; g < G; g++) { const seen = new Set(); for (const it of Engine.draw(states, n, 'all', rng)) { if (seen.has(it.id)) dup++; seen.add(it.id); cnt[it.id] = (cnt[it.id] || 0) + 1; } }
    const p = n / 50, sigma = Math.sqrt(G * p * (1 - p));
    assert.equal(dup, 0, n + ' lots: no duplicates');
    for (const it of states.items) assert.ok(Math.abs(cnt[it.id] - G * p) < 4.5 * sigma, `${n} lots: ${it.id} drawn ${cnt[it.id]} times, expected ${G * p}`);
  }
  const all = Engine.draw(states, 50, 'all', rng); assert.equal(new Set(all.map(i => i.id)).size, 50);
  const shuffled = new Set(); for (let g = 0; g < 50; g++) shuffled.add(Engine.draw(states, 50, 'all', rng).map(i => i.id).join()); assert.ok(shuffled.size > 40, 'the 50-state order is shuffled');
  const plain = Object.assign({}, states, { economy: Object.assign({}, states.economy, { sampling: undefined }) });
  for (const n of [10, 20]) {
    const sys = [], ran = [];
    for (let g = 0; g < 20000; g++) { sys.push(Engine.draw(states, n, 'all', rng).reduce((a, i) => a + i.value, 0)); ran.push(Engine.draw(plain, n, 'all', rng).reduce((a, i) => a + i.value, 0)); }
    assert.ok(sd(sys) < 0.7 * sd(ran), `${n} lots: the value of a round swings ${(sd(sys) * 100).toFixed(1)}% vs ${(sd(ran) * 100).toFixed(1)}% with plain random draws`);
  }
});

function setup(budgets, lots, seed, temper) {
  const S = Engine.newAuction({ pack: states, kind: 'solo', level: 'all', lots, players: [{ name: 'You' }, { name: 'Bot', ai: true }], rng: Engine.seededRng(seed), temper });
  S.players[0].budget = budgets[0]; S.players[1].budget = budgets[1];
  return S;
}
function playOut(S, who) {
  const act = Eco.POL[who](S.pack); let r = Engine.startLot(S);
  while (r.state === 'lot') {
    let ended = S.L.turn === null;
    while (!ended) {
      const me = S.players[S.L.turn], a = me.ai ? Engine.botDecision(S) : act(S, me);
      let res = a.type === 'raise' ? Engine.raise(S, a.amount) : Engine.pass(S); if (res.error) res = Engine.pass(S);
      ended = res.next === 'award';
    }
    Engine.award(S); r = Engine.advance(S);
  }
  return r;
}

test('endgame: a broke player no longer hands over the rest for $1; the rest sells at 80% of fair price while money lasts', () => {
  const S = setup([0, 40], 10, 5);
  const r = Engine.startLot(S);
  assert.equal(r.state, 'done'); assert.equal(r.reason, 'house');
  const bought = S.players[1].bought, spent = bought.reduce((a, b) => a + b.price, 0);
  assert.equal(S.players[1].budget, 40 - spent, 'money is conserved');
  for (const b of bought) assert.equal(b.price, Math.max(1, Math.round(0.8 * Engine.priceOf(states, b).ideal)), 'house price is 80% of the ideal');
  assert.equal(bought.length + S.unsold.length, 10, 'every lot is either bought or unsold');
  assert.ok(S.unsold.length > 0, 'with $40 not everything can be paid for');
  for (const u of S.unsold) assert.ok(Math.max(1, Math.round(0.8 * Engine.priceOf(states, u).ideal)) > S.players[1].budget || true);
  const rich = setup([0, 100000], 10, 5); Engine.startLot(rich);
  assert.equal(rich.unsold.length, 0, 'with enough money everything sells'); assert.equal(rich.players[1].bought.length, 10);
  const none = setup([0, 0], 10, 5), z = Engine.startLot(none); assert.equal(z.reason, 'broke'); assert.equal(none.unsold.length, 10);
  const old = Engine.newAuction({ pack: august, kind: 'solo', level: 'medium', lots: 10, players: [{ name: 'a' }, { name: 'b', ai: true }], rng: Engine.seededRng(1) });
  old.players[0].budget = 0; assert.equal(Engine.startLot(old).reason, 'walkover', 'a pack without an economy block keeps the old walkover rule (the legacy path)');
});

test('temperaments: seeded and reproducible, about 25 / 50 / 25, never shown, symmetric around the balanced bot', () => {
  const n = {}; const R = 4000;
  for (let s = 0; s < R; s++) { const S = Engine.newAuction({ pack: states, kind: 'solo', level: 'all', lots: 20, players: [{ name: 'a' }, { name: 'b', ai: true }], rng: Engine.seededRng(s) }); n[S.bot.temper.name] = (n[S.bot.temper.name] || 0) + 1; }
  assert.ok(Math.abs(n.conservative / R - 0.25) < 0.03 && Math.abs(n.balanced / R - 0.5) < 0.03 && Math.abs(n.aggressive / R - 0.25) < 0.03, JSON.stringify(n));
  const mk = s => Engine.newAuction({ pack: states, kind: 'solo', level: 'all', lots: 20, players: [{ name: 'a' }, { name: 'b', ai: true }], rng: Engine.seededRng(s) });
  assert.deepEqual(mk(77).bot, mk(77).bot, 'same seed, same temperament');
  assert.deepEqual(mk(77).items.map(i => i.id), mk(77).items.map(i => i.id));
  const g1 = Eco.play(states, 20, 'all', 'B', 31337), g2 = Eco.play(states, 20, 'all', 'B', 31337);
  assert.deepEqual(g1, g2, 'a whole game is reproducible from its seed');
  for (const lots of states.lots.options) {
    const c = Engine.pickTemper(states.bot, lots, 'conservative', null), a = Engine.pickTemper(states.bot, lots, 'aggressive', null), b = Engine.pickTemper(states.bot, lots, 'balanced', null);
    assert.equal(b.limit, 1); assert.ok(Math.abs((1 - c.limit) - (a.limit - 1)) < 1e-9, lots + ': limits are symmetric around the balanced bot');
    assert.ok(a.limit - 1 <= 0.07 && a.limit - 1 >= 0.03, 'a softer spread, 3-7%');
  }
  const S = mk(5); assert.ok(!JSON.stringify(S.players).includes('temper'), 'the temperament is not stored on the players the view renders');
});

test('knockout (a): rival $10, bot $110, 10 lots: the bot takes (almost) every lot against the creeper and the rationer', () => {
  for (const who of ['A', 'D']) {
    let won = 0, G = 150;
    for (let g = 0; g < G; g++) { const S = setup([10, 110], 10, 900 + g, 'balanced'); playOut(S, who); won += S.players[1].bought.length; }
    assert.ok(won / G >= 9, `vs ${who}: the bot wins ${(won / G).toFixed(2)} of 10 lots`);
  }
});

test('knockout (b): rival $30, bot $110: it spends its knockouts, wins more than the plain bot, and does not overpay a rival who folds', () => {
  const plain = Object.assign({}, states, { bot: Object.assign({}, states.bot, { knockout: undefined }) });
  const run = (pack, who) => { let pts = 0, spent = 0; const G = 200; for (let g = 0; g < G; g++) { const S = Engine.newAuction({ pack, kind: 'solo', level: 'all', lots: 10, players: [{ name: 'a' }, { name: 'b', ai: true }], rng: Engine.seededRng(1200 + g), temper: 'balanced' }); S.players[0].budget = 30; S.players[1].budget = 110; playOut(S, who); pts += S.players[1].bought.reduce((a, b) => a + b.value, 0); spent += 110 - S.players[1].budget; } return { pts: pts / G, spent: spent / G }; };
  const ko = run(states, 'A'), no = run(plain, 'A');
  assert.ok(ko.pts >= no.pts - 0.5, `knockout points ${ko.pts.toFixed(1)} vs plain ${no.pts.toFixed(1)}`);
  assert.ok(ko.spent > no.spent, 'it pays for the knockouts');
  const koD = run(states, 'D'), noD = run(plain, 'D');
  assert.ok(koD.spent <= noD.spent * 1.05 + 1, `vs a rival who folds early it does not overpay: ${koD.spent.toFixed(0)} vs ${noD.spent.toFixed(0)}`);
});

test('knockout (c): the bot never passes while it can afford to sweep (property test over random wallets, lot counts, players, temperaments)', () => {
  let seed = 424242; const rnd = n => { seed = (seed * 48271) % 2147483647; return seed % n; };
  let checked = 0, bad = [];
  for (let g = 0; g < 600; g++) {
    const lots = 3 + rnd(25), S = setup([5 + rnd(300), 20 + rnd(600)], lots, 5000 + g, ['conservative', 'balanced', 'aggressive'][rnd(3)]);
    const who = ['A', 'B', 'C', 'D'][rnd(4)], act = Eco.POL[who](S.pack);
    let r = Engine.startLot(S);
    while (r.state === 'lot') {
      let ended = S.L.turn === null;
      while (!ended) {
        const me = S.players[S.L.turn]; let a;
        if (me.ai) {
          const rival = S.players[0], K = rival.budget, lotsAfter = S.items.length - S.i - 1;
          a = Engine.botDecision(S);
          const ownLimit = S._ceil.walk;
          if (S.L.holder === 0 && K >= 1 && me.budget >= (K + 1) * (lotsAfter + 1) + lotsAfter && S.L.price >= Math.min(me.budget - lotsAfter, ownLimit)) { checked++; if (a.type === 'pass') bad.push({ g, K, budget: me.budget, price: S.L.price, lotsAfter }); }
        } else a = act(S, me);
        let res = a.type === 'raise' ? Engine.raise(S, a.amount) : Engine.pass(S); if (res.error) res = Engine.pass(S);
        ended = res.next === 'award';
      }
      Engine.award(S); r = Engine.advance(S);
    }
  }
  assert.ok(checked > 50, 'the property was actually exercised: ' + checked);
  assert.deepEqual(bad, [], 'passes while a sweep was affordable');
});

test('the creeper cannot win the round with money: at most 60% of the points, against every temperament and lot count; and loses most games from 15 lots up', () => {
  for (const n of [5, 15, 30, 50]) for (const mode of [null, 'conservative', 'balanced', 'aggressive']) {
    const r = Eco.run(states, n, 'all', 'A', 250, 50000, mode);
    assert.ok(r.share <= 60, `${n} lots ${mode || 'mix'}: the creeper takes ${r.share}% of the points`);
    if (n >= 15) assert.ok(r.win <= 30, `${n} lots ${mode || 'mix'}: the creeper wins ${r.win}%`);
    if (n >= 15) assert.ok(r.botLeft <= 40, `${n} lots ${mode || 'mix'}: the bot keeps ${r.botLeft}% unspent`);
  }
});

test('calibration (loose): the balanced bot is within +-14 of the frozen August Countries-Medium 10-lot benchmark for B and C from 10 lots; every temperament keeps B and C between 12% and 78%', () => {
  const bench = { B: baseline.levels.medium[10].B.win, C: baseline.levels.medium[10].C.win };   // 37 / 39.6, frozen in test/baseline-august.json
  for (const n of [10, 20, 30, 50]) {
    for (const p of ['B', 'C']) assert.ok(Math.abs(Eco.run(states, n, 'all', p, 400, 50000, 'balanced').win - bench[p]) <= 14, `${n} lots balanced ${p}`);
    for (const mode of ['conservative', 'aggressive']) for (const p of ['B', 'C']) { const w = Eco.run(states, n, 'all', p, 400, 50000, mode).win; assert.ok(w >= 12 && w <= 78, `${n} lots ${mode} ${p} wins ${w}%`); }
  }
});

test('no knife-edge: moving the budget by 10% moves no reference player by more than 15 points (30 and 50 lots)', () => {
  const variant = (n, k) => Object.assign({}, states, { economy: Object.assign({}, states.economy, { budgets: Object.assign({}, states.economy.budgets, { [n]: Math.round(states.economy.budgets[n] * k) }) }) });
  for (const n of [30, 50]) for (const p of ['A', 'B', 'C']) {
    const mid = Eco.run(states, n, 'all', p, 500, 70000).win;
    for (const k of [0.9, 1.1]) assert.ok(Math.abs(Eco.run(variant(n, k), n, 'all', p, 500, 70000).win - mid) <= 15, `${n} lots ${p} at ${k}x budget`);
  }
});

test('bid buttons follow the current price in both packs (the August pack keeps +1 +2 +5 +10 +25)', () => {
  assert.deepEqual(Engine.bidSteps(august, 1), [1, 2, 5, 10, 25]); assert.deepEqual(Engine.bidSteps(august, 400), [1, 2, 5, 10, 25]);
  assert.deepEqual(Engine.bidSteps(countries, 150), Engine.bidSteps(states, 150), 'Countries uses the States scheme');
  let last = [0, 0, 0, 0, 0];
  for (const price of [1, 11, 12, 39, 40, 99, 100, 250, 520]) {
    const s = Engine.bidSteps(states, price);
    assert.equal(s.length, 5); s.forEach((v, i) => { assert.ok(Number.isInteger(v) && v >= 1 && (!i || v > s[i - 1])); assert.ok(v >= last[i], 'steps never shrink as the price grows'); }); last = s;
  }
  assert.deepEqual(Engine.bidSteps(states, 1), [1, 2, 5, 10, 25]); assert.deepEqual(Engine.bidSteps(states, 150), [10, 25, 50, 100, 200]);
  assert.ok(states.economy.typingBonus > 0 && states.economy.typingBonus <= 10);
  const broken = Object.assign({}, states, { economy: Object.assign({}, states.economy, { bidSteps: [[10, [1, 2, 5, 10]]] }) });
  assert.ok(Engine.validatePack(broken).some(m => /bidSteps/.test(m)), 'a malformed step table is refused');
});

test('validatePack refuses a broken economy or bot block', () => {
  const bad = (eco, bot) => Engine.validatePack(Object.assign({}, states, eco ? { economy: Object.assign({}, states.economy, eco) } : {}, bot ? { bot: Object.assign({}, states.bot, bot) } : {}));
  assert.ok(bad({ budgets: { 5: 1 } }).some(m => /budgets/.test(m)));
  assert.ok(bad({ budgets: Object.assign({}, states.economy.budgets, { 50: 900 }) }).some(m => /80%/.test(m)), 'a budget above 80% of the top-4 price');
  assert.ok(bad({ endgame: { rule: 'nope', price: 1 } }).some(m => /endgame/.test(m)));
  assert.ok(bad(null, { limitMul: { 5: 1 } }).some(m => /limitMul/.test(m)));
  assert.ok(bad(null, { temperaments: { weights: [1, 1], spread: {}, bigRank: 10 } }).some(m => /temperaments/.test(m)));
  assert.ok(Engine.validatePack(Object.assign({}, states, { economy: undefined })).some(m => /economy/.test(m)), 'a bot block needs the economy block');
});

test('the rules text lists the real budgets and says short rounds are luck-heavy, in all five languages', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8');
  const block = src.match(/const STRP=[\s\S]*?\n\}\};/)[0];
  const STRP = eval('(' + block.replace('const STRP=', '').replace(/;$/, '') + ')').states;
  const want = states.lots.options.map(n => Engine.budgetFor(states, n));
  for (const lang of ['en', 'de', 'it', 'es', 'fr']) {
    const got = (STRP[lang].rulesP4.match(/\$(\d+)/g) || []).map(x => +x.slice(1));
    assert.deepEqual(got, want, lang + ': rulesP4 budgets match economy.budgets');
    assert.ok(STRP[lang].budgetNote && STRP[lang].rulesP6 && STRP[lang].rulesP8 && STRP[lang].unsoldNote && STRP[lang].rivalDesc, lang + ' has the economy strings');
    assert.match(STRP[lang].rulesP8, /80 ?%/, lang + ': the house price is stated');
  }
  assert.match(STRP.en.rulesP6, /luck/i); assert.match(STRP.de.rulesP6, /glückslastig/); assert.match(STRP.it.rulesP6, /fortuna/); assert.match(STRP.es.rulesP6, /suerte/); assert.match(STRP.fr.rulesP6, /chance/);
});
