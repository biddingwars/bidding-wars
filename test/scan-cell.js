/* Dev-only: scan limitMul multipliers for ONE cell: node test/scan-cell.js <pack> <level|-> <lots> <f1,f2,...> [games=300] [exploitGames=120] */
if (process.env.NODE_TEST_CONTEXT) process.exit(0);
const X = require('./exploit.js'), E = require('./economy.js');
const [id, lv0, lotsS, fs, G0, GX0] = process.argv.slice(2), n = +lotsS, G = +G0 || 300, GX = +GX0 || 120, pack = X.PACKS[id], lv = lv0 === '-' ? pack.defaultLevel : lv0;
const T = id === 'states' ? pack.bot.limitMul : pack.bot.limitMul[lv], base = T[n];
for (const f of fs.split(',').map(Number)) {
  T[n] = base * f; let ex = 0, name = '';
  for (const s of X.strategies(pack, lv).filter(s => !s.oracle)) { const w = X.wins(pack, n, lv, s, GX, 100000); if (w > ex) { ex = w; name = s.name; } }
  console.log(id, lv, n, 'f', f, 'limitMul', +(base * f).toFixed(3), 'A', E.run(pack, n, lv, 'A', G, 50000, null).win, 'B', E.run(pack, n, lv, 'Cs', G, 50000, null).win, 'exploit', +ex.toFixed(1), name);
}
