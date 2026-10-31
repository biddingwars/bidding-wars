/* The economy harness: plays whole solo auctions on the REAL engine (real botDecision, real packs) against reference players and
   prints win rate / points share / bot leftover per level and lot count. Dev-only; `node --test` never starts the long report.

     node test/economy.js [games=2000] [seed=50000]          States + Countries tables (a few minutes at 2,000 games)
     node test/economy.js countries [games] [seed]           only the three Countries levels, per temperament, vs the frozen August numbers
     node test/economy.js states [games] [seed]              only US States
     node test/economy.js learner [games-per-run=200] [runs=15]   the Learner E against C, per level (is the bot predictable?)
     node test/economy.js unpredictable [N=500]              repeat test, parity, drop-out regression, wallet-bound giants
     node test/economy.js baseline [games=3000]              re-derive the August numbers from test/pack-countries-august.js and compare with test/baseline-august.json

   Reference players (seat 0, the bot is seat 1):
     A  Creeper     always +1 over the rival, never drops out until it cannot afford it
     B  Fair-value  bids up to 1.25 x the ideal price, otherwise drops out
     C  Smart       like B, and keeps a reserve per remaining lot: EUR 1 in Countries (the frozen August definition), 5% of an average lot in US States
     Cs             like C with a reserve scaled to the level: 3.8% of the level's average lot (= EUR 1 at Medium); Beginner/Expert targets use this one
     C1/C2/C3       like C with a $1 / $2 / $3 reserve (US States)
     D  Rationer    only bids up to 0.6 x the ideal price (cheap lots only)
     E  Learner     remembers where the bot dropped out on each item earlier in the run and bids just above the median
                    (E1: median + 1; E2: median + 1 but never above the fair cap)
   The US States benchmark is the frozen August Countries Medium (test/baseline-august.json), not today's Countries. */
const Engine = require('../engine.js');
const countries = require('../pack-countries.js'), capitals = require('../pack-capitals.js'), states = require('../pack-states.js'), august = require('./pack-countries-august.js');
const baseline = require('./baseline-august.json');

const fairCap = S => Math.floor(1.25 * Engine.priceOf(S.pack, S.items[S.i]).ideal);
const raiseOne = (S, ok) => ok ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' };
const POL = {
  A: () => (S, me) => raiseOne(S, me.budget >= S.L.price + 1),
  B: () => (S, me) => raiseOne(S, S.L.price + 1 <= Math.min(fairCap(S), me.budget)),
  D: () => (S, me) => raiseOne(S, S.L.price + 1 <= Math.min(Math.floor(0.6 * Engine.priceOf(S.pack, S.items[S.i]).ideal), me.budget))
};
const smart = per => () => (S, me) => raiseOne(S, S.L.price + 1 <= Math.min(fairCap(S), me.budget - per(S) * (S.items.length - S.i - 1)));
POL.C = smart(S => S.pack.id === 'states' ? 0.05 * Engine.avgIdeal(S.pack, S.level) : 1);
POL.Cs = smart(S => 0.038 * Engine.avgIdeal(S.pack, S.level));
POL.C1 = smart(() => 1); POL.C2 = smart(() => 2); POL.C3 = smart(() => 3);
const REF = ['A', 'B', 'C', 'D', 'C1', 'C2', 'C3'];

/* one game → { a, b (points), pool, botLeft, unsold }. `hook(S, price)` is called whenever the bot drops out; `policy` may be a function instead of a name */
function play(pack, lots, level, who, seed, temper, hook) {
  const rng = Engine.seededRng(seed);
  const S = Engine.newAuction({ pack, kind: 'solo', level, lots, players: [{ name: 'You' }, { name: 'Bot', ai: true }], rng, temper });
  const act = typeof who === 'function' ? who : POL[who](pack), start = S.players[1].budget;
  let r = Engine.startLot(S);
  while (r.state === 'lot') {
    let ended = S.L.turn === null;
    while (!ended) {
      const me = S.players[S.L.turn], a = me.ai ? Engine.botDecision(S) : act(S, me);
      if (me.ai && a.type === 'pass' && hook) hook(S, S.L.price);
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

/* ------------------------------------------------------------ the Learner (is the bot predictable?)
   One run = `gamesPerRun` games with a memory of where the bot dropped out on each item. Returns E's win % over the whole run and over the
   second half, next to C's win % on the same seeds. */
function runLearner(pack, lots, level, runs, gamesPerRun, seed0, variant, temper) {
  let wins = 0, n = 0, late = 0, nLate = 0, cLate = 0;
  const polC = POL.Cs(pack);
  for (let r = 0; r < runs; r++) {
    const mem = new Map();
    const hook = (S, price) => { if (S.L.holder === 0) { const id = S.items[S.i].id; (mem.get(id) || mem.set(id, []).get(id)).push(price); } };
    const polE = (S, me) => {
      const m = mem.get(S.items[S.i].id); let c = fairCap(S);
      if (m && m.length >= 2) { const s = m.slice().sort((a, b) => a - b), med = s[s.length >> 1]; c = variant === 1 ? med + 1 : Math.min(c, med + 1); }
      return raiseOne(S, S.L.price + 1 <= Math.min(c, me.budget - 0.038 * Engine.avgIdeal(S.pack, S.level) * (S.items.length - S.i - 1)));
    };
    for (let g = 0; g < gamesPerRun; g++) {
      const seed = seed0 + r * 100000 + g, x = play(pack, lots, level, polE, seed, temper, hook), w = x.a > x.b ? 1 : x.a === x.b ? 0.5 : 0;
      wins += w; n++;
      if (g >= gamesPerRun / 2) { late += w; nLate++; const y = play(pack, lots, level, polC, seed, temper); cLate += y.a > y.b ? 1 : y.a === y.b ? 0.5 : 0; }
    }
  }
  const f = v => +(100 * v / n).toFixed(1);
  return { E: f(wins), Elate: +(100 * late / nLate).toFixed(1), Clate: +(100 * cLate / nLate).toFixed(1) };
}

/* ------------------------------------------------------------ unpredictability
   probe: the bot's drop-out price d on ONE item, same game state, fresh seed every time, the human is the creeper with a full wallet.
   With a creeper d = the bot's ceiling + 1 (the price it refused to top). */
function probe(pack, level, id, N, lots, seed0, temper) {
  const ds = [], act = POL.A(pack), it = pack.items.find(x => x.id === id); let avail = 0;
  for (let g = 0; g < N; g++) {
    const S = Engine.newAuction({ pack, kind: 'solo', level, lots, players: [{ name: 'You' }, { name: 'Bot', ai: true }], rng: Engine.seededRng(seed0 + g), temper });
    const k = S.items.findIndex(x => x.id === id); if (k >= 0) S.items.splice(k, 1); S.items[0] = it;
    Engine.startLot(S);
    const la = S.items.length - 1; avail = S.players[1].budget - (la >= 3 ? la : 0);
    let ended = S.L.turn === null, d = null;
    while (!ended) {
      const me = S.players[S.L.turn], a = me.ai ? Engine.botDecision(S) : act(S, me);
      if (me.ai && a.type === 'pass' && S.L.holder === 0) d = S.L.price;
      const res = a.type === 'raise' ? Engine.raise(S, a.amount) : Engine.pass(S); ended = res.next === 'award';
    }
    ds.push(d == null ? S.L.price : d);
  }
  return { ds, avail };
}
function dropStats(ds, ideal, avail) {
  const n = ds.length, m = ds.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(ds.reduce((a, b) => a + (b - m) ** 2, 0) / n);
  const cnt = {}; ds.forEach(d => { cnt[d] = (cnt[d] || 0) + 1; });
  const s = ds.slice().sort((a, b) => a - b), med = s[n >> 1], big = ds.filter(d => d > 5);
  const out = { sdPct: 100 * sd / ideal, topShare: 100 * Math.max(...Object.values(cnt)) / n, within1: 100 * ds.filter(d => Math.abs(d - med) <= 1).length / n, even: 100 * big.filter(d => d % 2 === 0).length / Math.max(1, big.length) };
  if (avail != null) { out.sdPctWallet = 100 * sd / avail; out.atWallet = 100 * ds.filter(d => d - 1 === avail || d === avail).length / n; out.withinWallet1 = 100 * ds.filter(d => Math.abs(d - 1 - avail) <= 1).length / n; }
  return out;
}
/* how often does a giant (one of the level's 5 biggest) end within +-1 of the bot's wallet minus reserve, in whole games? */
function giantsAtWallet(pack, lots, level, who, games, seed0) {
  const pool = Engine.levelPool(pack, level).slice().sort((a, b) => b.value - a.value).slice(0, 5).map(i => i.id), top = new Set(pool), act = POL[who](pack);
  let n = 0, near = 0;
  for (let g = 0; g < games; g++) {
    const S = Engine.newAuction({ pack, kind: 'solo', level, lots, players: [{ name: 'You' }, { name: 'Bot', ai: true }], rng: Engine.seededRng(seed0 + g) });
    let r = Engine.startLot(S);
    while (r.state === 'lot') {
      const isTop = top.has(S.items[S.i].id), la = S.items.length - S.i - 1, avail = S.players[1].budget - (la >= 3 ? la : 0);
      let ended = S.L.turn === null;
      while (!ended) { const me = S.players[S.L.turn], a = me.ai ? Engine.botDecision(S) : act(S, me); let res = a.type === 'raise' ? Engine.raise(S, a.amount) : Engine.pass(S); if (res.error) res = Engine.pass(S); ended = res.next === 'award'; }
      if (isTop) { n++; const d = S.L.holder === 0 ? S.L.price - 1 : S.L.price; if (Math.abs(d - avail) <= 1) near++; }
      Engine.award(S); r = Engine.advance(S);
    }
  }
  return { giants: n, nearWallet: +(100 * near / Math.max(1, n)).toFixed(1) };
}
module.exports = { capitals, play, run, POL, REF, runLearner, probe, dropStats, giantsAtWallet, august };

/* ================================================================================================ the report (CLI only) */
if (require.main === module && !process.env.NODE_TEST_CONTEXT) {   // `node --test` must not start the long report
  const args = process.argv.slice(2), cmd = ['countries', 'capitals', 'states', 'learner', 'unpredictable', 'baseline'].includes(args[0]) ? args.shift() : 'all';
  const num = (v, d) => (v !== undefined && !Number.isNaN(+v) ? +v : d);
  const pad = (v, n = 6) => String(v).padStart(n);
  const LV = ['beginner', 'medium', 'expert'];
  const reportBaseline = games => {
    console.log(`AUGUST BASELINE re-derived from test/pack-countries-august.js (${games} games) vs test/baseline-august.json (win % A / B / C)`);
    let worst = 0;
    for (const lv of LV) for (const n of [5, 10, 15, 20, 30, 40]) {
      const r = ['A', 'B', 'C'].map(p => run(august, n, lv, p, games, baseline.seed).win), f = ['A', 'B', 'C'].map(p => baseline.levels[lv][n][p].win);
      worst = Math.max(worst, ...r.map((v, i) => Math.abs(v - f[i])));
      console.log(`${lv.padEnd(9)}${pad(n, 3)} lots   now ${r.map(v => pad(v, 5)).join(' ')}   frozen ${f.map(v => pad(v, 5)).join(' ')}`);
    }
    console.log('largest difference: ' + worst.toFixed(1) + ' points');
  };
  const reportStates = games => {
    console.log(`US STATES — win % / creeper-share-of-pool % / bot leftover %  (A creeper, B fair, C smart, D rationer; C with a $1 / $2 / $3 reserve)  ${games} games per cell`);
    console.log('lots mode  | A: win share left | B win | C win | D win | C1 win | C2 win | C3 win | unsold%');
    for (const n of states.lots.options) for (const mode of [null, 'conservative', 'balanced', 'aggressive']) {
      const r = {}; for (const p of REF) r[p] = run(states, n, 'all', p, games, num(args[1], 50000), mode);
      console.log(`${pad(n, 4)} ${(mode || 'mix').slice(0, 5).padEnd(5)} | ${pad(r.A.win)} ${pad(r.A.share)} ${pad(r.A.botLeft)} | ${pad(r.B.win)} | ${pad(r.C.win)} | ${pad(r.D.win)} | ${pad(r.C1.win)} | ${pad(r.C2.win)} | ${pad(r.C3.win)} | ${r.A.unsold}`);
    }
  };
  const reportCountries = (games, pk = countries) => {
    const seed = num(args[1], 50000);
    console.log(`${pk.id.toUpperCase()} — win % (A creeper / B fair / C smart-EUR1 / Cs smart-scaled / D rationer), A's share of the pool %, bot money left vs A %, unsold %  ${games} games per cell`);
    console.log('target: Medium within +-10 of the frozen August numbers; Beginner A <= 35 and B, Cs 45-65; Expert within +-10 of Medium; every temperament keeps B, C 15-75; A <= 60% of the points');
    for (const lv of LV) {
      console.log(`\n${lv}`);
      console.log('lots mode  |  A win share left |  B  |  C  | Cs  |  D  | vs frozen August Medium (A/B/C)');
      for (const n of pk.lots.options) for (const mode of [null, 'conservative', 'balanced', 'aggressive']) {
        const r = {}; for (const p of ['A', 'B', 'C', 'Cs', 'D']) r[p] = run(pk, n, lv, p, games, seed, mode);
        const ref = baseline.levels.medium[n], d = ['A', 'B', 'C'].map(k => (r[k].win - ref[k].win).toFixed(0)).join('/');
        console.log(`${pad(n, 4)} ${(mode || 'mix').slice(0, 5).padEnd(5)} | ${pad(r.A.win)} ${pad(r.A.share)} ${pad(r.A.botLeft)} | ${pad(r.B.win)} | ${pad(r.C.win)} | ${pad(r.Cs.win)} | ${pad(r.D.win)} | ${d}   (unsold ${r.A.unsold}%)`);
      }
    }
  };
  const reportLearner = () => {
    const per = num(args[0], 200), runs = num(args[1], 15);
    console.log(`LEARNER E vs smart C on the second half of ${runs} runs x ${per} games (E1 median+1, E2 median+1 capped at the fair price)`);
    for (const lv of LV) for (const n of [10, 20, 30]) {
      const a = runLearner(countries, n, lv, runs, per, 90000, 1), b = runLearner(countries, n, lv, runs, per, 90000, 2);
      console.log(`${lv.padEnd(9)}${pad(n, 3)} lots   E1 ${pad(a.Elate, 5)}  E2 ${pad(b.Elate, 5)}  Cs ${pad(b.Clate, 5)}   E2-Cs ${(b.Elate - b.Clate).toFixed(1)}`);
    }
  };
  const reportUnpredictable = () => {
    const N = num(args[0], 500);
    console.log(`UNPREDICTABILITY (${N} games per row): bot drop-out price d on one lot, creeper rival, full wallets`);
    console.log('sd% of ideal (>=15 for ideal>=10) | top price share % (<=20) | within +-1 of the median % | even % (50 +- 3) | giants: final price == wallet-reserve %, sd % of wallet (>=8)');
    for (const [lv, ids] of [['medium', ['ZW', 'ES', 'IT', 'DE', 'NG', 'IN', 'CN', 'US']], ['expert', ['ES', 'DE', 'IN']], ['beginner', ['PL', 'FR', 'DE', 'TR', 'RU']]]) for (const id of ids) {
      const it = countries.items.find(x => x.id === id), pr = Engine.priceOf(countries, it), { ds, avail } = probe(countries, lv, id, N, 10, 1000), s = dropStats(ds, pr.ideal, avail);
      console.log(`${lv.padEnd(9)}${id} ideal ${pad(pr.ideal, 3)} max ${pad(pr.max, 3)} wallet ${pad(avail, 3)}   sd ${s.sdPct.toFixed(1)}  top ${s.topShare.toFixed(1)}  pm1 ${s.within1.toFixed(1)}  even ${s.even.toFixed(1)}   atWallet ${s.atWallet.toFixed(1)}  sdW ${s.sdPctWallet.toFixed(1)}`);
    }
    console.log('\nwhole games: how often a giant ends within +-1 of the bot wallet - reserve (vs A / vs C)');
    for (const lv of LV) console.log(lv.padEnd(9) + countries.lots.options.map(n => `${n}: ${giantsAtWallet(countries, n, lv, 'A', 1000, 40000).nearWallet}/${giantsAtWallet(countries, n, lv, 'C', 1000, 40000).nearWallet}`).join('   '));
  };
  const games = num(args[0], cmd === 'baseline' ? 3000 : 2000);
  if (cmd === 'baseline') reportBaseline(games);
  else if (cmd === 'learner') reportLearner();
  else if (cmd === 'unpredictable') reportUnpredictable();
  else if (cmd === 'capitals') reportCountries(games, capitals);
  else { if (cmd !== 'states') reportCountries(games); if (cmd !== 'countries') { if (cmd === 'all') console.log(''); reportStates(games); } }
}
