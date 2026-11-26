/* Dev-only calibration search for one level of a pack (PACK=countries|capitals, default capitals): hill-climbs the bot parameters of that level (limitMul per lot count, noise,
   efficiency gamma/lo/hi/pick, decisive share, knockout kappa) so that (1) no strategy of test/exploit.js beats the bot above LIMIT - 5 points on a
   small scan, and (2) the creeper (A) and the fair-value players (B, Cs) land near the numbers Countries v39 settled on (CLAUDE.md "Reference results").
   Common random numbers (fixed seeds), so two parameter sets are compared on exactly the same games.
     PACK=countries node test/tune-bot.js <beginner|medium|expert> [evals=150] [gamesPerCell=250] [seed=1]     prints the best parameter set as JSON
   (test/tune-capitals.js is the same with PACK=capitals.) Per-lot-count tables are tuned per lot count (noise5, noise10, ...).
   Paste the result into the pack (Countries) or CAL.bot in test/make-pack-capitals.js and re-run the full harnesses (the scan is optimistic about its own seeds). */
/* `node --test` also runs every file in test/: this one is a dev tool and must not rewrite anything then */
if (process.env.NODE_TEST_CONTEXT) process.exit(0);   // generic version of tune-capitals.js: PACK=countries|capitals (v56 re-calibration of the blind bot)
const Engine = require('../engine.js'), pack = require('../pack-' + (process.env.PACK || 'capitals') + '.js'), X = require('./exploit.js'), E = require('./economy.js');
const level = process.argv[2], EVALS = +process.argv[3] || 150, G = +process.argv[4] || 250, SEED = +process.argv[5] || 1;
if (!['beginner', 'medium', 'expert'].includes(level)) { console.error('level?'); process.exit(1); }
const REF = {   // Countries v39: creeper A and fair-value B, per lot count 5/10/15/20/30
  beginner: { A: [27.3, 28.8, 25.8, 14.5, 5.8], B: [49.1, 52.8, 56.8, 56.2, 54.6] },
  medium: { A: [52.4, 26.7, 13.2, 8.6, 7.5], B: [61.4, 51.0, 39.9, 35.4, 29.2] },
  expert: { A: [36.6, 33.2, 24.9, 20.3, 10.3], B: [40.2, 35.6, 32.7, 32.0, 28.3] }
}[level];
const BAND = +(process.env.BAND || 12), LOTS = pack.lots.options, b = pack.bot;
/* A parameter may be one number for the level or a table per lot count ({ 5: 0.43, 15: 0.15 }, a count not listed uses the nearest one below: v60).
   Each is a "slot" here: a scalar is one slot, a table becomes one slot per lot option, written back as a full table. A value of 0 means "off"
   (knockout.kappa 0 at Countries Medium, v65) and is never mutated, so the search cannot switch a rule back on by accident. */
const near = (t, n) => { const ks = Object.keys(t).map(Number).sort((a, x) => a - x); let v = t[ks[0]]; for (const k of ks) if (k <= n) v = t[k]; return v; };
const PARAMS = [
  ['noise', () => b.noise, v => { b.noise = v; }, x => Math.min(0.9, x)],
  ['gamma', () => b.efficiency.gamma, v => { b.efficiency.gamma = v; }],
  ['lo', () => b.efficiency.lo, v => { b.efficiency.lo = v; }],
  ['hi', () => b.efficiency.hi, v => { b.efficiency.hi = v; }],
  ['pick', () => b.efficiency.pick, v => { b.efficiency.pick = v; }],
  ['decisive', () => b.decisive.share, v => { b.decisive.share = v; }, x => Math.min(1, x)],
  ['kappa', () => b.knockout.kappa, v => { b.knockout.kappa = v; }],
  ...(b.rollSpan ? [['rollSpan', () => b.rollSpan, v => { b.rollSpan = v; }, x => Math.min(1, x)]] : [])
];
const SLOTS = [];   // { key, lots|null, read(), write(x), clamp }
LOTS.forEach(n => SLOTS.push({ key: 'lm' + n, read: () => b.limitMul[level][n], write: x => { b.limitMul[level][n] = x; } }));
for (const [key, tab, put, clamp] of PARAMS) {
  const lv = () => { const t = tab(); return typeof t === 'object' && t[level] != null ? t[level] : t; };
  const setLv = v => { const t = tab(); if (typeof t === 'object' && t[level] != null) t[level] = v; else put(v); };
  const cur = lv();
  if (typeof cur === 'object') {   // per lot count: expand to one slot per lot option
    const full = Object.fromEntries(LOTS.map(n => [n, near(cur, n)])); setLv(full);
    LOTS.forEach(n => SLOTS.push({ key: key + n, read: () => lv()[n], write: x => { lv()[n] = x; }, clamp }));
  } else SLOTS.push({ key, read: () => lv(), write: x => setLv(x), clamp });
}
const KEYS = SLOTS.map(sl => sl.key);
const get = () => SLOTS.map(sl => sl.read());
const set = v => SLOTS.forEach((sl, i) => sl.write(sl.clamp ? sl.clamp(v[i]) : v[i]));
const strategies = X.strategies(pack, level).filter(s => !s.oracle);
function evaluate() {
  let loss = 0; const rows = [];
  LOTS.forEach((n, k) => {
    const lim = (X.LIMIT[n] || X.LIMIT.default) - 5;
    let ex = 0, name = '';
    for (const s of strategies) { const w = X.wins(pack, n, level, s, G, 100000); if (w > ex) { ex = w; name = s.name; } }
    const A = E.run(pack, n, level, 'A', G, 50000, null).win, B = E.run(pack, n, level, 'Cs', G, 50000, null).win;
    loss += 3 * Math.max(0, ex - lim) ** 2 + 0.3 * Math.max(0, A - REF.A[k] - 12) ** 2 + 0.3 * Math.max(0, Math.abs(B - REF.B[k]) - BAND) ** 2;
    rows.push({ n, ex: +ex.toFixed(1), name, A, B });
  });
  return { loss, rows };
}
let rng = Engine.seededRng(SEED * 7919);
const rnd = () => rng(1e6) / 1e6;
if (process.env.START) { const P = JSON.parse(require('fs').readFileSync(process.env.START, 'utf8')).params; set(KEYS.map((k, i) => P[k] != null ? P[k] : get()[i])); }   // continue from an earlier result
let best = get(), cur = evaluate(), bestLoss = cur.loss;
console.error(`start loss ${bestLoss.toFixed(1)}`);
for (let it = 0; it < EVALS && bestLoss > 0; it++) {
  const cand = best.slice(), k = 1 + (rnd() < 0.4 ? 1 : 0);
  for (let j = 0; j < k; j++) { const i = Math.floor(rnd() * cand.length); if (cand[i] === 0) continue; cand[i] = Math.max(0.05, cand[i] * (1 + (rnd() - 0.5) * 0.4)); }   // 0 = a rule switched off: left alone
  set(cand); const r = evaluate();
  if (r.loss < bestLoss) { best = cand; bestLoss = r.loss; cur = r; console.error(`it ${it} loss ${bestLoss.toFixed(1)}  ` + r.rows.map(x => `${x.n}:ex${x.ex}/A${x.A}/B${x.B}`).join(' ')); }
}
set(best);
console.log(JSON.stringify({ level, loss: +bestLoss.toFixed(2), params: Object.fromEntries(KEYS.map((k, i) => [k, +best[i].toFixed(3)])), rows: cur.rows }));
