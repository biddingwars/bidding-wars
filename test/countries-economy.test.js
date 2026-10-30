/* The Countries economy and bot on the real engine: smooth prices, per-level budgets, systematic sampling per level pool, the house-price
   endgame, knockout, temperaments, and "the bot is never predictable" (repeat test, parity, wallet-bound giants, the Learner).
   The long report is `node test/economy.js countries|learner|unpredictable`; these are the guards. Statistical checks use fixed seeds and
   deliberately loose bands. The frozen August numbers live in test/baseline-august.json. */
const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../engine.js');
const countries = require('../pack-countries.js'), august = require('./pack-countries-august.js'), states = require('../pack-states.js');
const Eco = require('./economy.js');
const baseline = require('./baseline-august.json');
const LV = ['beginner', 'medium', 'expert'];

test('Countries: the pack validates, budgets are per level in multiples of 5, Medium keeps EUR 10 per lot, the top-5 cap holds', () => {
  assert.deepEqual(Engine.validatePack(countries), []);
  for (const lv of LV) {
    let prev = 0;
    for (const n of countries.lots.options) {
      const b = Engine.budgetFor(countries, n, lv);
      assert.equal(b % 5, 0, `${lv} ${n} lots: ${b} is a multiple of 5`);
      assert.ok(b > prev, `${lv}: budgets grow with the lot count`); prev = b;
    }
  }
  for (const n of countries.lots.options) assert.equal(Engine.budgetFor(countries, n, 'medium'), 10 * n, 'Medium: EUR 10 per lot, as in August');
  assert.equal(Engine.budgetFor(countries, 10), 100, 'no level given = the default level (Medium)');
  assert.deepEqual(countries.lots.options.map(n => Engine.budgetFor(countries, n, 'beginner')), [25, 50, 55, 65, 100]);
  assert.deepEqual(countries.lots.options.map(n => Engine.budgetFor(countries, n, 'expert')), [35, 70, 75, 90, 140]);
  /* money is scarce at the top: the biggest budget of each level is at most 80% of the expected price of that level's five biggest items (premium included) */
  const t = Engine.priceTable(countries);
  for (const lv of LV) {
    const top = Engine.levelPool(countries, lv).sort((a, b) => b.value - a.value).slice(0, countries.bot.premium.top);
    const exp = top.reduce((a, it) => a + (t.get(it.id).ideal + t.get(it.id).max) / 2 * (1 + countries.bot.premium.pct), 0);
    assert.ok(Engine.budgetFor(countries, 30, lv) <= 0.8 * exp, `${lv}: the 30-lot budget is within 80% of the top-5 price (${Math.round(0.8 * exp)})`);
    const avg = Engine.avgIdeal(countries, lv);
    assert.ok(Engine.budgetFor(countries, 30, lv) / (30 * avg) < 0.45, `${lv}: a full budget is well under half the expected value of the round`);
  }
});

test('Countries prices: smooth and monotone (no bigger country is cheaper), EUR 1 floor, level averages within 10% of August, at most 12 countries move more than 25%', () => {
  const t = Engine.priceTable(countries), ta = Engine.priceTable(august);
  const rows = countries.items.slice().sort((a, b) => a.value - b.value).map(i => ({ v: i.value, id: i.id, ...t.get(i.id) }));
  for (let i = 1; i < rows.length; i++) { assert.ok(rows[i].ideal >= rows[i - 1].ideal, 'ideal is monotone at ' + rows[i].id); assert.ok(rows[i].max >= rows[i - 1].max, 'max is monotone at ' + rows[i].id); }
  rows.forEach(r => { assert.ok(r.ideal >= 1 && r.max >= r.ideal, r.id); });
  for (const lv of LV) {
    const n = Engine.avgIdeal(countries, lv), o = Engine.avgIdeal(august, lv);
    assert.ok(Math.abs(n / o - 1) < 0.1, `${lv}: expected price per lot ${o.toFixed(1)} -> ${n.toFixed(1)}`);
  }
  assert.ok(Engine.avgIdeal(countries, 'medium') >= Engine.avgIdeal(august, 'medium') * 0.98, 'Medium is not cheaper, so not easier');
  const moved = countries.items.filter(i => Math.abs(t.get(i.id).ideal / ta.get(i.id).ideal - 1) > 0.25).map(i => i.id);
  assert.ok(moved.length <= 12, 'moved by more than 25%: ' + moved.join(' '));
  for (const id of ['IN', 'CN']) assert.ok(t.get('IN').ideal >= t.get('US').ideal && t.get(id).ideal > t.get('ID').ideal, 'India and China cost more than the USA and Indonesia');
  const sd = t.get('DE'); assert.ok(sd.max / sd.ideal >= 1.4, 'a giant keeps a wide walk-away range (needed for an unpredictable bot)');
});

test('Countries sampling: every country keeps its exact chance n/N inside each level, no duplicates, far smaller swings than plain random draws', () => {
  const rng = Engine.seededRng(2025), G = 30000, plain = Object.assign({}, countries, { economy: Object.assign({}, countries.economy, { sampling: undefined }) });
  const sd = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length) / m; };
  for (const lv of LV) {
    const pool = Engine.levelPool(countries, lv), N = pool.length;
    for (const n of [5, 10, 20, 30]) {
      const cnt = {}; let dup = 0;
      for (let g = 0; g < G; g++) { const seen = new Set(); for (const it of Engine.draw(countries, n, lv, rng)) { if (seen.has(it.id)) dup++; seen.add(it.id); cnt[it.id] = (cnt[it.id] || 0) + 1; } }
      const p = n / N, sigma = Math.sqrt(G * p * (1 - p));
      assert.equal(dup, 0, `${lv} ${n} lots: no duplicates`);
      for (const it of pool) assert.ok(Math.abs((cnt[it.id] || 0) - G * p) < 4.8 * sigma, `${lv} ${n} lots: ${it.id} drawn ${cnt[it.id] || 0}, expected ${(G * p).toFixed(0)}`);
    }
    const sys = [], ran = [];
    for (let g = 0; g < 8000; g++) { sys.push(Engine.draw(countries, 10, lv, rng).reduce((a, i) => a + i.value, 0)); ran.push(Engine.draw(plain, 10, lv, rng).reduce((a, i) => a + i.value, 0)); }
    /* the pools have a very heavy tail (India and China are 1,450 million; the median is 9 to 40), so one giant in a round still moves the total: the swing falls, but less than in US States */
    assert.ok(sd(sys) < 0.92 * sd(ran), `${lv}: the value of a 10-lot round swings ${(sd(sys) * 100).toFixed(0)}% vs ${(sd(ran) * 100).toFixed(0)}% with plain draws`);
  }
});

function setup(budgets, lots, seed, temper, level = 'medium') {
  const S = Engine.newAuction({ pack: countries, kind: 'solo', level, lots, players: [{ name: 'You' }, { name: 'Bot', ai: true }], rng: Engine.seededRng(seed), temper });
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

test('Countries endgame: a broke player no longer hands over the rest for EUR 1; the rest sells at 80% of fair price while money lasts', () => {
  const S = setup([0, 60], 10, 5), r = Engine.startLot(S);
  assert.equal(r.reason, 'house');
  const bought = S.players[1].bought, spent = bought.reduce((a, b) => a + b.price, 0);
  assert.equal(S.players[1].budget, 60 - spent, 'money is conserved');
  for (const b of bought) assert.equal(b.price, Math.max(1, Math.round(0.8 * Engine.priceOf(countries, b).ideal)), '80% of the ideal');
  assert.equal(bought.length + S.unsold.length, 10); assert.ok(S.unsold.length > 0);
  const rich = setup([0, 100000], 10, 5); Engine.startLot(rich); assert.equal(rich.unsold.length, 0);
});

test('Countries knockout (a): rival EUR 10, bot EUR 110, 10 lots: the bot takes at least 9 of the 10 lots against the creeper and the rationer', () => {
  for (const who of ['A', 'D']) {
    let won = 0; const G = 150;
    for (let g = 0; g < G; g++) { const S = setup([10, 110], 10, 900 + g, 'balanced'); playOut(S, who); won += S.players[1].bought.length; }
    assert.ok(won / G >= 9, `vs ${who}: the bot wins ${(won / G).toFixed(2)} of 10 lots`);
  }
});

test('Countries knockout (b): rival EUR 30, bot EUR 110: it spends knockouts on the lots that matter and does not overpay a rival who folds', () => {
  const plain = Object.assign({}, countries, { bot: Object.assign({}, countries.bot, { knockout: undefined }) });
  const play = (pack, who) => { let pts = 0, spent = 0; const G = 200; for (let g = 0; g < G; g++) { const S = Engine.newAuction({ pack, kind: 'solo', level: 'medium', lots: 10, players: [{ name: 'a' }, { name: 'b', ai: true }], rng: Engine.seededRng(2000 + g), temper: 'balanced' }); S.players[0].budget = 30; S.players[1].budget = 110; playOut(S, who); pts += S.players[1].bought.reduce((a, b) => a + b.value, 0); spent += 110 - S.players[1].budget; } return { pts: pts / 200, spent: spent / 200 }; };
  const ko = play(countries, 'A'), no = play(plain, 'A');
  assert.ok(ko.pts >= no.pts * 0.97, `with knockout ${ko.pts.toFixed(0)} points vs ${no.pts.toFixed(0)} without`);
  assert.ok(ko.spent > no.spent, 'it pays for the knockouts');
  const koD = play(countries, 'D'), noD = play(plain, 'D');
  assert.ok(koD.spent <= noD.spent * 1.05 + 1, `vs a rival who folds early it does not overpay: ${koD.spent.toFixed(0)} vs ${noD.spent.toFixed(0)}`);
});

test('Countries knockout (c): the bot never passes while it can afford to sweep (property test over random wallets, lot counts, levels, players, temperaments)', () => {
  let seed = 777001; const rnd = n => { seed = (seed * 48271) % 2147483647; return seed % n; };
  let checked = 0; const bad = [];
  for (let g = 0; g < 500; g++) {
    const lv = LV[rnd(3)], lots = 3 + rnd(25), S = setup([5 + rnd(300), 20 + rnd(600)], lots, 7000 + g, ['conservative', 'balanced', 'aggressive'][rnd(3)], lv);
    const act = Eco.POL[['A', 'B', 'C', 'D'][rnd(4)]](S.pack); let r = Engine.startLot(S);
    while (r.state === 'lot') {
      let ended = S.L.turn === null;
      while (!ended) {
        const me = S.players[S.L.turn]; let a;
        if (me.ai) {
          const K = S.players[0].budget, lotsAfter = S.items.length - S.i - 1;
          a = Engine.botDecision(S);
          if (S.L.holder === 0 && K >= 1 && me.budget >= (K + 1) * (lotsAfter + 1) + lotsAfter && S.L.price >= Math.min(me.budget - lotsAfter, S._ceil.walk)) { checked++; if (a.type === 'pass') bad.push({ g, K, budget: me.budget, price: S.L.price }); }
        } else a = act(S, me);
        let res = a.type === 'raise' ? Engine.raise(S, a.amount) : Engine.pass(S); if (res.error) res = Engine.pass(S);
        ended = res.next === 'award';
      }
      Engine.award(S); r = Engine.advance(S);
    }
  }
  assert.ok(checked > 30, 'the property was exercised: ' + checked);
  assert.deepEqual(bad, [], 'passes while a sweep was affordable');
});

test('Countries calibration (loose): Medium within +-14 of the frozen August numbers; Beginner A <= 40 and B/C 40-70; every temperament keeps B and C between 12% and 78%; the creeper takes at most 60% of the points', () => {
  const G = 350, seed = 50000, win = (lv, n, who, mode) => Eco.run(countries, n, lv, who, G, seed, mode);
  for (const n of [5, 10, 20, 30]) {
    const ref = baseline.levels.medium[n];
    for (const who of ['A', 'B', 'C']) assert.ok(Math.abs(win('medium', n, who, 'balanced').win - ref[who].win) <= 14, `medium ${n} lots ${who} vs August ${ref[who].win}`);
  }
  for (const n of [5, 10, 30]) {
    assert.ok(win('beginner', n, 'A', 'balanced').win <= 40, `beginner ${n} lots: the creeper`);
    for (const who of ['B', 'Cs']) { const w = win('beginner', n, who, 'balanced').win; assert.ok(w >= 40 && w <= 70, `beginner ${n} lots ${who} wins ${w}`); }
  }
  for (const lv of LV) for (const n of [10, 30]) for (const mode of ['conservative', 'aggressive']) {
    for (const who of ['B', 'C']) { const w = win(lv, n, who, mode).win; assert.ok(w >= 12 && w <= 78, `${lv} ${n} lots ${mode} ${who} wins ${w}%`); }
    const a = win(lv, n, 'A', mode); assert.ok(a.share <= 60, `${lv} ${n} lots ${mode}: the creeper takes ${a.share}%`);
  }
  for (const lv of LV) assert.ok(win(lv, 30, 'A', null).win <= 15, `${lv}: the creeper loses long rounds`);
});

test('the frozen August baseline is honest: the test-only August pack on the legacy bot reproduces it', () => {
  for (const [lv, n] of [['medium', 10], ['beginner', 10], ['expert', 10]]) for (const who of ['A', 'B', 'C']) {
    const w = Eco.run(august, n, lv, who, 500, baseline.seed).win;
    assert.ok(Math.abs(w - baseline.levels[lv][n][who].win) <= 7, `${lv} ${n} lots ${who}: ${w} vs frozen ${baseline.levels[lv][n][who].win}`);
  }
});

test('the bot is never predictable: repeat test on one lot (spread, no favourite price, parity, no read-off from the price alone)', () => {
  const N = 400;
  for (const [lv, id] of [['medium', 'ES'], ['medium', 'IT'], ['medium', 'DE'], ['expert', 'ES']]) {
    const it = countries.items.find(x => x.id === id), pr = Engine.priceOf(countries, it);
    const { ds } = Eco.probe(countries, lv, id, N, 10, 1000), s = Eco.dropStats(ds, pr.ideal);
    assert.ok(pr.ideal >= 10);
    assert.ok(s.sdPct >= 15, `${lv} ${id}: the drop-out price has SD ${s.sdPct.toFixed(1)}% of the ideal (needs >= 15)`);
    assert.ok(s.topShare <= 20, `${lv} ${id}: one price in ${s.topShare.toFixed(1)}% of games (needs <= 20)`);
    assert.ok(s.within1 <= (pr.ideal >= 25 ? 25 : 40), `${lv} ${id}: ${s.within1.toFixed(1)}% of games within +-1 of the median`);
  }
  /* parity: above EUR 5 the drop-out price is even or odd with equal chance (pooled over several countries) */
  const all = []; for (const id of ['ES', 'IT', 'DE', 'NG', 'ZW', 'TH', 'AR']) all.push(...Eco.probe(countries, 'medium', id, 300, 10, 4000).ds);
  const big = all.filter(d => d > 5), even = 100 * big.filter(d => d % 2 === 0).length / big.length;
  assert.ok(Math.abs(even - 50) <= 3, `parity: ${even.toFixed(1)}% even over ${big.length} drop-outs`);
});

test('wallet-bound giants: when its purse is the limit, the bot does not spend "wallet minus reserve" to the euro (at most 30% of games, SD at least 8% of the wallet)', () => {
  for (const [lv, id] of [['medium', 'IN'], ['medium', 'CN'], ['beginner', 'RU'], ['expert', 'IN']]) {
    const { ds, avail } = Eco.probe(countries, lv, id, 400, 10, 2000), s = Eco.dropStats(ds, Engine.priceOf(countries, countries.items.find(x => x.id === id)).ideal, avail);
    assert.ok(avail <= Engine.priceOf(countries, countries.items.find(x => x.id === id)).max, lv + ' ' + id + ': the wallet really is the binding limit');
    assert.ok(s.atWallet <= 30, `${lv} ${id}: the final price equals wallet-reserve in ${s.atWallet.toFixed(1)}% of games`);
    assert.ok(s.sdPctWallet >= 8, `${lv} ${id}: the price has SD ${s.sdPctWallet.toFixed(1)}% of the wallet`);
  }
  for (const lv of LV) for (const who of ['A', 'C']) { const r = Eco.giantsAtWallet(countries, 10, lv, who, 400, 40000); assert.ok(r.nearWallet <= 20, `${lv} vs ${who}: ${r.nearWallet}% of giants end within +-1 of the wallet`); }
  const noRoll = Object.assign({}, countries, { bot: Object.assign({}, countries.bot, { wallet: undefined }) });
  assert.ok(Eco.giantsAtWallet(noRoll, 10, 'medium', 'C', 400, 40000).nearWallet > Eco.giantsAtWallet(countries, 10, 'medium', 'C', 400, 40000).nearWallet, 'the wallet roll is what removes it');
});

test('the Learner (remembers where the bot dropped out) does not beat the smart player by more than about 8 points', () => {
  for (const [lv, n] of [['medium', 10], ['expert', 10], ['beginner', 10]]) {
    const r = Eco.runLearner(countries, n, lv, 6, 200, 90000, 2);
    assert.ok(r.Elate - r.Clate <= 12, `${lv} ${n} lots: E ${r.Elate} vs C ${r.Clate}`);
  }
});

test('Countries: seeded reproducibility, States scheme for bid buttons, typing grace, and the per-level lookups', () => {
  assert.deepEqual(Eco.play(countries, 20, 'expert', 'B', 31337), Eco.play(countries, 20, 'expert', 'B', 31337), 'a whole game is reproducible from its seed');
  assert.deepEqual(Engine.bidSteps(countries, 150), Engine.bidSteps(states, 150));
  assert.deepEqual(Engine.bidSteps(countries, 1), [1, 2, 5, 10, 25]);
  assert.equal(countries.economy.typingBonus, 4);
  const S = Engine.newAuction({ pack: countries, kind: 'solo', level: 'beginner', lots: 10, players: [{ name: 'a' }, { name: 'b', ai: true }], rng: Engine.seededRng(3) });
  assert.equal(S.players[0].budget, 50, 'Beginner 10 lots = EUR 50');
  const top = [...S.bot.rank.entries()].filter(([, r]) => r <= 5).map(([id]) => id).sort();
  assert.deepEqual(top, Engine.levelPool(countries, 'beginner').sort((a, b) => b.value - a.value).slice(0, 5).map(i => i.id).sort(), "the premium goes to the level's own five biggest (Europe's, not the world's)");
  assert.ok(Engine.avgIdeal(countries, 'beginner') < Engine.avgIdeal(countries, 'medium'), 'pacing uses the level pool average');
  const bad = lm => Engine.validatePack(Object.assign({}, countries, { bot: Object.assign({}, countries.bot, { limitMul: lm }) }));
  assert.ok(bad({ beginner: { 5: 1 }, medium: countries.bot.limitMul.medium, expert: countries.bot.limitMul.expert }).some(m => /limitMul/.test(m)), 'an incomplete per-level table is refused');
  assert.ok(Engine.validatePack(Object.assign({}, countries, { economy: Object.assign({}, countries.economy, { budgets: Object.assign({}, countries.economy.budgets, { beginner: { 5: 25, 10: 50, 15: 55, 20: 65, 30: 900 } }) }) })).some(m => /80%/.test(m)), 'a Beginner budget above the top-5 cap is refused');
});

test('Countries rules text: the real budgets per level and the luck-heavy line, in all five languages', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'app.js'), 'utf8');
  const block = src.match(/const STRP=[\s\S]*?\n\}\};/)[0];
  const STRP = eval('(' + block.replace('const STRP=', '').replace(/;$/, '') + ')').countries;
  const tbl = lv => countries.lots.options.map(n => Engine.budgetFor(countries, n, lv));
  for (const lang of ['en', 'de', 'it', 'es', 'fr']) {
    const nums = (STRP[lang].rulesP4.match(/\d+(?= ?€|(?=[,.]| for| per| pour| para| für| per ))/g) || []);
    const text = STRP[lang].rulesP4;
    for (const lv of LV) for (const b of tbl(lv)) assert.ok(new RegExp('(^|[^\\d])' + b + '(?!\\d)').test(text), `${lang}: rulesP4 mentions ${b}`);
    assert.ok(nums.length >= 10, lang + ' lists the budgets');
    assert.ok(STRP[lang].budgetNote && STRP[lang].rivalDesc && STRP[lang].rulesP5 && STRP[lang].rulesP6 && STRP[lang].rulesP8 && STRP[lang].unsoldNote, lang + ' has the economy strings');
    assert.match(STRP[lang].rulesP8, /80 ?%/, lang + ': the house price is stated');
    assert.ok(!/\$/.test(Object.values(STRP[lang]).join(' ')), lang + ': Countries talks euros');
  }
  assert.match(STRP.en.rulesP6, /luck/i); assert.match(STRP.de.rulesP6, /glückslastig/); assert.match(STRP.it.rulesP6, /fortuna/); assert.match(STRP.es.rulesP6, /suerte/); assert.match(STRP.fr.rulesP6, /chance/);
});
