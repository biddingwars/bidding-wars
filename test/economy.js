/* The economy harness: plays whole solo auctions on the REAL engine (real botDecision, real packs) against four
   reference players and prints win rate / points share / bot leftover per lot count.

     node test/economy.js [games=2000] [seed=50000]      the full report (a few minutes at 2,000 games)
     node test/economy.js 400                             a quick look

   Reference players (seat 0, the bot is seat 1):
     A  Creeper     always +1 over the rival, never drops out until it cannot afford it
     B  Fair-value  bids up to 1.25 x the ideal price, otherwise drops out
     C  Smart       like B, and keeps a reserve per remaining lot: $1 in Countries, 5% of an average lot ($1.50 in US States)
     C1/C2/C3       the same with a $1 / $2 / $3 reserve (reported next to C for the US States pack)
     D  Rationer    only bids up to 0.6 x the ideal price (cheap lots only)
   The benchmark is Countries on its default level (Medium), 10 lots: win A 9.5, B 37, C 39.6 (+-10 is the target band).
   `test/economy.test.js` runs a small, loose version of this under `node --test`. */
const Engine = require('../engine.js');
const countries = require('../pack-countries.js'), states = require('../pack-states.js');

const POL = {
  A: () => (S, me) => me.budget >= S.L.price + 1 ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' },
  B: () => (S, me) => { const cap = Math.floor(1.25 * Engine.priceOf(S.pack, S.items[S.i]).ideal); return S.L.price + 1 <= cap && S.L.price + 1 <= me.budget ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' }; },
  D: () => (S, me) => { const cap = Math.floor(0.6 * Engine.priceOf(S.pack, S.items[S.i]).ideal); return S.L.price + 1 <= cap && S.L.price + 1 <= me.budget ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' }; }
};
const smart = per => pack => (S, me) => {
  const cap = Math.min(Math.floor(1.25 * Engine.priceOf(S.pack, S.items[S.i]).ideal), me.budget - per(pack) * (S.items.length - S.i - 1));
  return S.L.price + 1 <= cap ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' };
};
POL.C = smart(pack => pack.economy ? 0.05 * Engine.avgIdeal(pack) : 1);
POL.C1 = smart(() => 1); POL.C2 = smart(() => 2); POL.C3 = smart(() => 3);
const REF = ['A', 'B', 'C', 'D', 'C1', 'C2', 'C3'];

/* one game → { a, b (points), pool, botLeft, unsold, temper } */
function play(pack, lots, level, who, seed, temper) {
  const rng = Engine.seededRng(seed);
  const S = Engine.newAuction({ pack, kind: 'solo', level, lots, players: [{ name: 'You' }, { name: 'Bot', ai: true }], rng, temper });
  const act = POL[who](pack), start = S.players[1].budget;
  let r = Engine.startLot(S);
  while (r.state === 'lot') {
    let ended = S.L.turn === null;
    while (!ended) {
      const me = S.players[S.L.turn], a = me.ai ? Engine.botDecision(S) : act(S, me);
      let res = a.type === 'raise' ? Engine.raise(S, a.amount) : Engine.pass(S);
      if (res.error) res = Engine.pass(S);
      ended = res.next === 'award';
    }
    Engine.award(S); r = Engine.advance(S);
  }
  const sb = Engine.scoreboard(S), pool = S.items.reduce((x, i) => x + i.value, 0);
  const unsold = (S.unsold || []).reduce((x, i) => x + i.value, 0);
  return { a: sb.rows[0].pts, b: sb.rows[1].pts, pool, botLeft: S.players[1].budget / start, unsold, temper: S.bot && S.bot.temper && S.bot.temper.name };
}
function run(pack, lots, level, who, games, seed0, temper) {
  const o = { win: 0, A: 0, bot: 0, left: 0, unsold: 0 };
  for (let g = 0; g < games; g++) {
    const x = play(pack, lots, level, who, seed0 + g, temper);
    o.win += x.a > x.b ? 1 : x.a === x.b ? 0.5 : 0; o.A += x.a / x.pool; o.bot += x.b / x.pool; o.left += x.botLeft; o.unsold += x.unsold / x.pool;
  }
  const f = v => +(100 * v / games).toFixed(1);
  return { win: f(o.win), share: f(o.A), botShare: f(o.bot), botLeft: f(o.left), unsold: f(o.unsold) };
}
module.exports = { play, run, POL, REF };

if (require.main === module && !process.env.NODE_TEST_CONTEXT) {   // `node --test` must not start the long report
  const games = +process.argv[2] || 2000, seed = +process.argv[3] || 50000;
  const pad = (v, n = 6) => String(v).padStart(n);
  console.log(`US States / Countries economy report — real engine, ${games} games per cell, seeds from ${seed}\n`);
  console.log('COUNTRIES (10 lots, EUR 100) benchmark: win % / A share % / bot leftover %');
  for (const lv of ['beginner', 'medium', 'expert']) {
    const r = ['A', 'B', 'C'].map(p => run(countries, 10, lv, p, games, seed));
    console.log(lv.padEnd(9) + r.map((x, i) => `${'ABC'[i]} ${pad(x.win)} ${pad(x.share)} ${pad(x.botLeft)}`).join(' | '));
  }
  console.log('\nUS STATES — win % / creeper-share-of-pool % / bot leftover %  (columns: A creeper, B fair, C smart, D rationer; then C with a $1 / $2 / $3 reserve)');
  console.log('lots mode  | A: win share left | B win | C win | D win | C1 win | C2 win | C3 win | unsold%');
  for (const n of states.lots.options) {
    for (const mode of [null, 'conservative', 'balanced', 'aggressive']) {
      const r = {}; for (const p of REF) r[p] = run(states, n, 'all', p, games, seed, mode);
      console.log(`${pad(n, 4)} ${(mode || 'mix').slice(0, 5).padEnd(5)} | ${pad(r.A.win)} ${pad(r.A.share)} ${pad(r.A.botLeft)} | ${pad(r.B.win)} | ${pad(r.C.win)} | ${pad(r.D.win)} | ${pad(r.C1.win)} | ${pad(r.C2.win)} | ${pad(r.C3.win)} | ${r.A.unsold}`);
    }
  }
}
