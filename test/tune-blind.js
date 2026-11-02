/* Dev-only (v56): re-find the bot's limitMul after it lost its view of the lots to come (it plans from the pool of unseen lots now).
   For every level and lot count: scan a multiplier f on the old limitMul, pick the f whose fair-value player (Cs) lands on the reference number, then run the exploit family there.
     node test/tune-blind.js <countries|capitals|states> [games=400] [exploitGames=150]     prints a JSON table of limitMul, the numbers and the strongest exploit
   Paste the table into pack-countries.js / test/make-pack-capitals.js / test/make-pack-states.js. */
if (process.env.NODE_TEST_CONTEXT) process.exit(0);
const Engine = require('../engine.js'), X = require('./exploit.js'), E = require('./economy.js');
const id = process.argv[2], G = +process.argv[3] || 400, GX = +process.argv[4] || 150, pack = X.PACKS[id];
const REFB = {
  countries: { beginner: [49.1, 52.8, 56.8, 56.2, 54.6], medium: [61.4, 51.0, 39.9, 35.4, 29.2], expert: [40.2, 35.6, 32.7, 32.0, 28.3] },
  capitals: { beginner: [39.4, 46.4, 50.9, 53.5, 51.0], medium: [47.5, 46.3, 37.0, 39.8, 37.9], expert: [32.3, 35.8, 35.3, 37.9, 37.7] },
  states: { _: [42, 38, 24, 30] }
}[id];
const levels = id === 'states' ? [pack.defaultLevel] : pack.levels.map(l => l.id), LOTS = pack.lots.options.slice();
const tbl = (lv) => id === 'states' ? pack.bot.limitMul : pack.bot.limitMul[lv];
const out = {};
for (const lv of levels) {
  out[lv] = {};
  const T = tbl(lv), base = {}; LOTS.forEach(n => { base[n] = T[n]; });
  const refs = id === 'states' ? REFB._ : REFB[lv];
  LOTS.forEach((n, k) => {
    const ref = refs[k]; if (ref == null) return;
    const cs = f => { T[n] = base[n] * f; return E.run(pack, n, lv, 'Cs', G, 50000, null).win; };
    /* the response is NOT monotone (a bot that overbids runs dry and hands the round over), so scan a grid instead of bisecting */
    const grid = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.45, 1.6, 1.8].map(f => ({ f, w: cs(f) }));
    const cands = grid.slice().sort((x, y) => Math.abs(x.w - ref) - Math.abs(y.w - ref)).slice(0, 3);
    let best = null;
    for (const c of cands) {
      T[n] = base[n] * c.f; let ex = 0, name = '';
      for (const s of X.strategies(pack, lv).filter(s => !s.oracle)) { const w = X.wins(pack, n, lv, s, GX, 100000); if (w > ex) { ex = w; name = s.name; } }
      c.ex = ex; c.by = name; if (!best || ex < best.ex) best = c;
    }
    const f = best.f; T[n] = base[n] * f;
    const A = E.run(pack, n, lv, 'A', G, 50000, null).win, B = E.run(pack, n, lv, 'Cs', G, 70000, null).win, ex = best.ex, name = best.by;
    console.error('  grid', lv, n, grid.map(g => g.f + ':' + g.w).join(' '), '| cands', cands.map(c => c.f + '/ex' + c.ex.toFixed(0)).join(' '));
    out[lv][n] = { limitMul: +T[n].toFixed(3), was: base[n], f: +f.toFixed(2), A, B, ref, exploit: +ex.toFixed(1), by: name, limit: X.LIMIT[n] || X.LIMIT.default };
    console.error(lv, n, JSON.stringify(out[lv][n]));
  });
}
console.log(JSON.stringify(out));
