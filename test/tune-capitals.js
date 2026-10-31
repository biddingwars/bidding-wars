/* Dev-only calibration search for one level of the Capitals pack: hill-climbs the bot parameters of that level (limitMul per lot count, noise,
   efficiency gamma/lo/hi/pick, decisive share, knockout kappa) so that (1) no strategy of test/exploit.js beats the bot above LIMIT - 5 points on a
   small scan, and (2) the creeper (A) and the fair-value players (B, Cs) land near the numbers Countries v39 settled on (CLAUDE.md "Reference results").
   Common random numbers (fixed seeds), so two parameter sets are compared on exactly the same games.
     node test/tune-capitals.js <beginner|medium|expert> [evals=150] [gamesPerCell=250] [seed=1]     prints the best parameter set as JSON
   Paste the result into CAL.bot in test/make-pack-capitals.js and re-run the full harnesses (the scan is optimistic about its own seeds). */
/* `node --test` also runs every file in test/: this one is a dev tool and must not rewrite anything then */
if (process.env.NODE_TEST_CONTEXT) process.exit(0);
const Engine = require('../engine.js'), pack = require('../pack-capitals.js'), X = require('./exploit.js'), E = require('./economy.js');
const level = process.argv[2], EVALS = +process.argv[3] || 150, G = +process.argv[4] || 250, SEED = +process.argv[5] || 1;
if (!['beginner', 'medium', 'expert'].includes(level)) { console.error('level?'); process.exit(1); }
const REF = {   // Countries v39: creeper A and fair-value B, per lot count 5/10/15/20/30
  beginner: { A: [27.3, 28.8, 25.8, 14.5, 5.8], B: [49.1, 52.8, 56.8, 56.2, 54.6] },
  medium: { A: [52.4, 26.7, 13.2, 8.6, 7.5], B: [61.4, 51.0, 39.9, 35.4, 29.2] },
  expert: { A: [36.6, 33.2, 24.9, 20.3, 10.3], B: [40.2, 35.6, 32.7, 32.0, 28.3] }
}[level];
const BAND = +(process.env.BAND || 12), LOTS = pack.lots.options, b = pack.bot;
const KEYS = ['lm5', 'lm10', 'lm15', 'lm20', 'lm30', 'noise', 'gamma', 'lo', 'hi', 'pick', 'decisive', 'kappa'];
const get = () => [...LOTS.map(n => b.limitMul[level][n]), b.noise[level], b.efficiency.gamma[level], b.efficiency.lo[level], b.efficiency.hi[level], b.efficiency.pick[level], b.decisive.share[level], b.knockout.kappa[level]];
const set = v => {
  LOTS.forEach((n, i) => { b.limitMul[level][n] = v[i]; });
  b.noise[level] = Math.min(0.9, v[5]); b.efficiency.gamma[level] = v[6]; b.efficiency.lo[level] = v[7]; b.efficiency.hi[level] = v[8]; b.efficiency.pick[level] = v[9];
  b.decisive.share[level] = Math.min(1, v[10]); b.knockout.kappa[level] = v[11];
};
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
let best = get(), cur = evaluate(), bestLoss = cur.loss;
console.error(`start loss ${bestLoss.toFixed(1)}`);
for (let it = 0; it < EVALS && bestLoss > 0; it++) {
  const cand = best.slice(), k = 1 + (rnd() < 0.4 ? 1 : 0);
  for (let j = 0; j < k; j++) { const i = Math.floor(rnd() * cand.length); cand[i] = Math.max(0.05, cand[i] * (1 + (rnd() - 0.5) * 0.4)); }
  if (cand[10] > 1) cand[10] = 1;
  set(cand); const r = evaluate();
  if (r.loss < bestLoss) { best = cand; bestLoss = r.loss; cur = r; console.error(`it ${it} loss ${bestLoss.toFixed(1)}  ` + r.rows.map(x => `${x.n}:ex${x.ex}/A${x.A}/B${x.B}`).join(' ')); }
}
set(best);
console.log(JSON.stringify({ level, loss: +bestLoss.toFixed(2), params: Object.fromEntries(KEYS.map((k, i) => [k, +best[i].toFixed(3)])), rows: cur.rows }));
