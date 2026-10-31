/* Bug hunt for the engine and the bot: plays whole auctions with hostile and random players and checks invariants after every move.
   Dev-only (`node --test` never starts it; test/fuzz.test.js runs a small slice).

     node test/fuzz.js [games=20000] [seed=1] [pack=countries|states|capitals|august|all]

   A "failure" is any of: an exception, a non-terminating auction, NaN or a non-integer in a budget/price, a negative budget, money that is
   not conserved, a lot sold twice, a lot neither bought nor unsold, a bot move the engine rejects (the bot must never propose an invalid raise),
   a bot raise above its own budget, an invalid human move that changes the state, a non-reproducible game (same seed, different result). */
const Engine = require('../engine.js');
const countries = require('../pack-countries.js'), states = require('../pack-states.js'), capitals = require('../pack-capitals.js'), august = require('./pack-countries-august.js');

const PACKS = { countries, states, capitals, august };
const clone = o => JSON.parse(JSON.stringify(o, (k, v) => (v instanceof Map ? undefined : v)));

/* hostile / random human policies: they may send anything */
function junkAmount(rng, S, me) {
  const k = rng(14), p = S.L.price;
  return [p + 1, p + 2, p + 1 + rng(30), me.budget, me.budget + 1, p, p - 1, 0, -5, 1.5, NaN, Infinity, '12', null][k];
}
const POLICY = {
  junk: rng => (S, me) => rng(5) === 0 ? { type: 'pass' } : { type: 'raise', amount: junkAmount(rng, S, me) },
  random: rng => (S, me) => rng(3) === 0 ? { type: 'pass' } : { type: 'raise', amount: Math.min(me.budget, S.L.price + 1 + rng(40)) },
  creeper: () => (S, me) => me.budget >= S.L.price + 1 ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' },
  passer: () => () => ({ type: 'pass' }),
  allin: () => (S, me) => me.budget > S.L.price ? { type: 'raise', amount: me.budget } : { type: 'pass' },
  fair: () => (S, me) => { const c = Math.floor(1.25 * Engine.priceOf(S.pack, S.items[S.i]).ideal); return S.L.price + 1 <= Math.min(c, me.budget) ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' }; }
};

function check(cond, msg, ctx, fails) { if (!cond) fails.push(msg + ' ' + JSON.stringify(ctx)); }

function oneGame(packName, seed) {
  const fails = [], rng = Engine.seededRng(seed * 7919 + 13), pack = PACKS[packName];
  const level = [pack.levels[rng(pack.levels.length)].id, pack.levels[rng(pack.levels.length)].id, 'bogus', undefined, null][rng(8) < 6 ? 0 : rng(5)];
  const lotsPool = pack.lots.options.concat([1, 2, 3, 4, 6, 7, 11, 33, 47, 60, 500]);
  const lots = lotsPool[rng(lotsPool.length)];
  const nPl = rng(10) === 0 ? 3 + rng(2) : 2;
  const temper = rng(4) === 0 ? ['conservative', 'balanced', 'aggressive', 'cautious', 'fierce', 'bogus'][rng(6)] : undefined;
  const pol = ['junk', 'random', 'creeper', 'passer', 'allin', 'fair'][rng(6)];
  const ctx = { packName, seed, level, lots, nPl, temper, pol };
  const gameRng = Engine.seededRng(seed);
  let S;
  try {
    S = Engine.newAuction({ pack, kind: 'solo', level, lots, players: Array.from({ length: nPl }, (_, i) => i === 1 ? { name: 'Bot', ai: true } : { name: 'P' + i }), rng: gameRng, temper });
  } catch (e) { return ['newAuction threw ' + e.message + ' ' + JSON.stringify(ctx)]; }
  const start = S.players.map(p => p.budget);
  check(S.players.every(p => Number.isInteger(p.budget) && p.budget > 0), 'bad starting budget', { ctx, start }, fails);
  const act = POLICY[pol](Engine.seededRng(seed + 99));
  let steps = 0, r;
  const spent = S.players.map(() => 0), soldIds = new Set();
  try {
    r = Engine.startLot(S);
    while (r.state === 'lot') {
      let ended = S.L.turn === null;
      const lotItem = S.items[S.i];
      while (!ended) {
        if (++steps > 200000) { fails.push('non-terminating ' + JSON.stringify(ctx)); return fails; }
        const me = S.players[S.L.turn]; let a;
        if (me.ai) {
          const before = me.budget;
          a = Engine.botDecision(S);
          check(a && (a.type === 'pass' || (a.type === 'raise' && Number.isInteger(a.amount) && a.amount > S.L.price && a.amount <= before)), 'bad bot move ' + JSON.stringify(a), { ctx, price: S.L.price, budget: before }, fails);
          check(!S._ceil || Number.isFinite(S._ceil.walk), 'bot ceiling is not finite', { ctx, ceil: S._ceil }, fails);
        } else a = act(S, me);
        let res;
        if (a.type === 'raise') {
          const snap = JSON.stringify(clone({ L: S.L, b: S.players.map(p => p.budget) }));
          res = Engine.raise(S, a.amount);
          if (res.error) {
            check(!me.ai, 'the engine rejected a BOT raise: ' + res.error, { ctx, a, price: S.L.price }, fails);
            check(snap === JSON.stringify(clone({ L: S.L, b: S.players.map(p => p.budget) })), 'a rejected raise changed the state', { ctx, a }, fails);
            res = Engine.pass(S);
          }
        } else res = Engine.pass(S);
        ended = res.next === 'award';
        check(S.players.every(p => Number.isInteger(p.budget) && p.budget >= 0), 'bad budget', { ctx, b: S.players.map(p => p.budget) }, fails);
      }
      const holder = S.L.holder, price = S.L.price, bBefore = S.players[holder].budget;
      check(Number.isInteger(price) && price >= 1 && price <= bBefore, 'bad price at award', { ctx, price, bBefore }, fails);
      const aw = Engine.award(S);
      check(!soldIds.has(lotItem.id + '#' + S.i), 'lot sold twice', { ctx }, fails); soldIds.add(lotItem.id + '#' + S.i);
      spent[aw.winner] += aw.price;
      check(Engine.award(S).error === 'closed', 'a second award was not refused', { ctx }, fails);
      r = Engine.advance(S);
    }
  } catch (e) { fails.push('threw ' + e.message + ' ' + JSON.stringify(ctx) + (e.stack || '').split('\n')[1]); return fails; }
  /* house-price / walkover endgame buys are not in `spent`: recompute from the bought lists */
  S.players.forEach((p, i) => {
    const paid = p.bought.reduce((a, b) => a + b.price, 0);
    check(start[i] - paid === p.budget, 'money not conserved', { ctx, i, start: start[i], paid, budget: p.budget }, fails);
    check(p.bought.every(b => Number.isFinite(b.price) && b.price >= 0), 'bad bought price', { ctx, i }, fails);
  });
  const boughtN = S.players.reduce((a, p) => a + p.bought.length, 0), unsoldN = (S.unsold || []).length;
  if (pack.economy) check(boughtN + unsoldN === S.items.length, 'lots lost: bought ' + boughtN + ' + unsold ' + unsoldN + ' of ' + S.items.length, { ctx }, fails);
  else check(boughtN === S.items.length, 'lots lost (no economy)', { ctx, boughtN, n: S.items.length }, fails);
  const sb = Engine.scoreboard(S); check(sb && sb.rows.every(x => Number.isFinite(x.pts)), 'scoreboard not finite', { ctx }, fails);
  /* reproducibility: replay the same seed and compare the fingerprint */
  return fails.length ? fails : { fp: S.players.map(p => p.bought.map(b => b.id + ':' + b.price).join(',')).join('|') + '#' + S.players.map(p => p.budget).join(','), ctx };
}

module.exports = { oneGame, PACKS };

if (require.main === module && !process.env.NODE_TEST_CONTEXT) {
  const games = +process.argv[2] || 20000, seed0 = +process.argv[3] || 1, which = process.argv[4] || 'all';
  const names = which === 'all' ? ['countries', 'states', 'capitals', 'august'] : [which];
  let total = 0, failed = 0; const samples = [];
  const t0 = Date.now();
  for (let g = 0; g < games; g++) {
    const name = names[g % names.length], seed = seed0 + g;
    const a = oneGame(name, seed);
    total++;
    if (Array.isArray(a)) { failed++; if (samples.length < 15) samples.push(a[0]); continue; }
    if (g % 5 === 0) { const b = oneGame(name, seed); if (Array.isArray(b) || b.fp !== a.fp) { failed++; if (samples.length < 15) samples.push('not reproducible ' + JSON.stringify(a.ctx)); } }
  }
  console.log(`fuzz: ${total} games in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${failed} failed (${(100 * failed / total).toFixed(3)}%)`);
  samples.forEach(s => console.log('  ' + s.slice(0, 400)));
  process.exitCode = failed ? 1 : 0;
}
