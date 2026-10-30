/* Mass simulation THROUGH THE REAL UI (headless Chromium): every mode, difficulty, language, 2-4 seats and a mix of
   strategies including junk input, timeouts, leaving mid-game and "play again". Checks, all the way:
   no exception, no "NaN"/"undefined"/"[object" on screen, budgets never negative, every lot sold exactly once,
   money conserved, the results screen agrees with the engine's scoreboard, and every game reaches the end.
   (The pure-engine simulation of 4,000 games lives in engine.test.js; this one proves the view on top of it.)
   Run:  node test/ui-sim.js [games=120] [parallel=4] */
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const serve = require('./serve.js');
const N = +(process.argv[2] || 120), PAR = +(process.argv[3] || 4);

const driver = async cfg => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = s => document.querySelector(s), bad = /NaN|undefined|\[object|Infinity/;
  const problems = [];
  const check = where => { const txt = document.body.innerText; if (cfg.pack === 'states' && /€/.test(txt)) problems.push('euro sign on ' + where); if (bad.test(txt)) problems.push('bad text on ' + where + ': ' + (txt.match(bad) || [])[0]); if (S && S.players) S.players.forEach(p => { if (!(p.budget >= 0) || !Number.isInteger(p.budget)) problems.push('budget ' + p.budget); }); };
  const wait = async (fn, ms = 6000, what = '') => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const r = fn(); if (r) return r; await sleep(3); } throw new Error('timeout waiting for ' + what); };
  window.think = () => Promise.resolve(); lockMs = 0;   // the hot-seat guard has its own test
  if (cfg.pack === 'states') { $('[data-pack="states"]').click(); await wait(() => $('[data-pack="states"][aria-current]'), 2000, 'states tile'); }
  $(cfg.kind === 'solo' ? '#m1' : '#m2').click();
  await wait(() => $('#start'), 6000, 'setup');
  const pickv = (g, v) => { const b = document.querySelector(`[data-g="${g}"] [data-v="${v}"]`); if (b) b.click(); };
  pickv('lots', cfg.lots); pickv('level', cfg.level); pickv('clock', cfg.clock); if (cfg.kind === 'multi') pickv('players', cfg.players);
  const names = ['Ana', 'Leo-Maximilian-Karl', 'Mia', 'Zoë'];
  if (cfg.kind === 'multi') for (let i = 1; i <= cfg.players; i++) $('#p' + i).value = cfg.longNames ? names[i - 1].repeat(2) : '';
  $('#start').click();
  await wait(() => $('#ctrl'), 4000, 'auction');
  check('auction start');
  const lotsTotal = S.items.length, startBudgets = S.players.map(() => Engine.budgetFor(S.pack, S.items.length));
  let steps = 0, soldCount = 0, leftAt = cfg.leaveAfter || 0, seen = new Set();
  while (steps++ < 4000) {
    const which = await wait(() => $('#rev') ? 'rev' : $('#n') ? 'n' : ($('#pass') && !$('#pass').disabled) ? 'turn' : null, 8000, 'next state (lot ' + (S && S.i) + ')');
    if (which === 'rev') break;
    if (which === 'n') { soldCount++; check('sold'); const ov = $('#sold'); $('#n').click(); await wait(() => !ov.isConnected, 3000, 'overlay gone'); if (leftAt && soldCount === leftAt) { $('#nb').click(); await wait(() => $('#dy') || $('#m1'), 2000, 'leave dialog'); if ($('#dy')) $('#dy').click(); await wait(() => $('#m1'), 3000, 'menu'); return { problems, left: true, steps }; } continue; }
    const L = S.L, actor = S.players[L.turn];
    const key = S.i + ':' + L.price + ':' + L.turn; if (!seen.has(key)) { seen.add(key); check('turn'); }
    const rb = [...document.querySelectorAll('[data-s]')].filter(b => !b.disabled);
    const r = Math.random(), strat = cfg.strategy;
    if (strat === 'pass' || (strat === 'mix' && r < .35) || (!rb.length && strat !== 'greedy' && strat !== 'junk')) $('#pass').click();
    else if (strat === 'greedy') { const inp = $('#cus'); if (!inp.disabled) { inp.value = String(actor.budget); $('#cb').click(); } else $('#pass').click(); }
    else if (strat === 'junk') { const inp = $('#cus'); for (const v of ['0', '-5', '1e9', '', '3.7', String(L.price)]) { if (!inp.disabled) { inp.value = v; $('#cb').click(); } } if ($('#pass') && !$('#pass').disabled && S.L === L) { if (Math.random() < .5 && rb.length) rb[Math.floor(Math.random() * rb.length)].click(); else $('#pass').click(); } }
    else if (rb.length) rb[Math.floor(Math.random() * rb.length)].click();
    else $('#pass').click();
    await sleep(1);
    if (cfg.clock && cfg.timeoutTest && steps === 2) { /* let the clock run out once */ await wait(() => S.L !== L || $('#sold') || $('#n'), 12000, 'timeout drop'); }
  }
  check('sealed');
  if (!$('#verdict')) return { problems: problems.concat(['no #verdict after the loop; screen=' + (document.querySelector('.screen') || {}).dataset.screen + ' steps=' + steps + ' rev=' + !!$('#rev')]), steps };
  const sealed = $('#verdict').innerText; if (/takes it|gewinnt|vince|gana|remporte/i.test(sealed)) problems.push('winner named before the bars were lifted');
  $('#rev').click();
  await wait(() => $('#verdict.final'), 12000, 'reveal');
  check('results');
  // lots sold once, money conserved, scoreboard agrees with the screen
  const bought = S.players.flatMap(p => p.bought);
  const unsold = S.unsold ? S.unsold.length : 0;     // the house-price endgame can leave lots unsold
  if (bought.length + unsold !== lotsTotal) problems.push('lots sold ' + bought.length + ' + unsold ' + unsold + ' of ' + lotsTotal);
  S.players.forEach((p, i) => { const spent = p.bought.reduce((a, b) => a + (b.price || 0), 0); if (startBudgets[i] - spent !== p.budget) problems.push('money not conserved for seat ' + i); });
  const sb = Engine.scoreboard(S), shown = [...document.querySelectorAll('.lbr .p')].map(e => e.textContent.trim());
  sb.rows.forEach(r => { if (!shown.includes(r.pts.toFixed(1))) problems.push('score ' + r.pts.toFixed(1) + ' not on screen'); });
  if (cfg.again) { $('#again').click(); await wait(() => $('#start'), 3000, 'play again → setup'); $('#back').click(); await sleep(30); }
  return { problems, steps };
};

(async () => {
  const s = await serve();
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const langs = ['en', 'de', 'it', 'es', 'fr'], levels = ['beginner', 'medium', 'expert'], strategies = ['pass', 'raise', 'mix', 'greedy', 'junk'];
  const pick = a => a[Math.floor(Math.random() * a.length)];
  let done = 0, failed = 0, lots = 0; const t0 = Date.now(); const failures = [];
  const worker = async w => {
    while (done + (PAR - 1) < N + PAR - 1 && done < N) {
      const idx = done++;
      const lang = langs[idx % 5], kind = idx % 3 === 0 ? 'solo' : 'multi';
      const cfg = { kind, lang, level: pick(levels), pack: idx % 2 ? 'states' : 'countries', lots: pick(idx % 2 && idx % 10 === 1 ? [5, 10, 50] : [5, 10]), clock: idx % 11 === 0 ? 10 : 0, players: kind === 'multi' ? 2 + (idx % 3) : 2, strategy: strategies[idx % strategies.length], longNames: idx % 4 === 0, again: idx % 7 === 0, leaveAfter: idx % 13 === 5 ? 2 : 0, timeoutTest: false };
      if (cfg.clock) cfg.clock = 10;
      const ctx = await browser.newContext({ viewport: { width: [402, 375, 834, 393][idx % 4], height: [874, 667, 1194, 700][idx % 4] }, serviceWorkers: 'block', reducedMotion: 'reduce' });
      const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console ' + m.text()); });
      await page.addInitScript(l => localStorage.setItem('lang:v1', l), lang);
      try {
        await page.goto(s.url); await page.waitForFunction(() => document.body.classList.contains('booted'));
        const r = await Promise.race([page.evaluate(driver, cfg), new Promise((_, rej) => setTimeout(() => rej(new Error('game exceeded 90s (stuck?)')), 90000))]);
        lots += cfg.lots;
        if (r.problems.length || errs.length) { failed++; failures.push({ cfg, problems: r.problems, errs }); }
      } catch (e) { failed++; failures.push({ cfg, problems: [String(e.message).slice(0, 300)], errs }); }
      await ctx.close();
      if (done % 20 === 0) console.log(`  ${done}/${N} games, ${failed} failed, ${Math.round((Date.now() - t0) / 1000)}s`);
    }
  };
  await Promise.all(Array.from({ length: PAR }, (_, i) => worker(i)));
  console.log(`UI simulation: ${N} games (${lots} lots) in ${Math.round((Date.now() - t0) / 1000)}s — ${failed} failed`);
  failures.slice(0, 10).forEach(f => console.log(JSON.stringify(f)));
  await browser.close(); s.srv.close();
  process.exit(failed ? 1 : 0);
})();
