/* Browser tests (headless Chromium via Playwright). Skipped when Playwright is not installed.
   Run:  node --test test/browser.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path'), fs = require('fs');
let chromium = null;
try { chromium = require('playwright').chromium; } catch (e) { /* skipped below */ }
const serve = require('./serve.js');
const fixtureSrc = fs.readFileSync(path.join(__dirname, 'fixture-pack.js'), 'utf8');

const SKIP = chromium ? false : 'playwright is not installed';
let env;
test.before(async () => {
  if (!chromium) return;
  const s = await serve();
  const exe = fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
  env = { s, url: s.url, browser: await chromium.launch(exe ? { executablePath: exe } : {}) };
});
test.after(async () => { if (env) { await env.browser.close(); env.s.srv.close(); } });

async function open(opts = {}) {
  const ctx = await env.browser.newContext({ viewport: opts.viewport || { width: 402, height: 715 }, serviceWorkers: 'block', reducedMotion: opts.motion || 'reduce', colorScheme: opts.scheme || 'dark' });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|TUNNEL/.test(m.text())) errors.push('console: ' + m.text()); });
  page.on('request', r => requests.push(r.url().replace(/^.*\/bidding-wars\//, '')));
  if (opts.init) await page.addInitScript(opts.init, opts.initArg);
  await page.goto(env.url);
  await page.waitForFunction(() => document.body.classList.contains('booted'), null, { timeout: 8000 });
  return { ctx, page, errors, requests };
}
const pick = (page, g, v) => page.click(`[data-g="${g}"] [data-v="${v}"]`);

/* make the bot instant and play a whole auction through the real UI */
async function autoplay(page, { maxSteps = 600, prefer = 'random' } = {}) {
  await page.evaluate(() => { window.think = () => Promise.resolve(); });
  let steps = 0;
  while (steps++ < maxSteps) {
    const which = await page.waitForSelector('#pass:not(:disabled), #n, #rev', { timeout: 6000 }).then(h => h.evaluate(e => e.id));
    if (which === 'rev') return steps;
    if (which === 'n') { await page.click('#n', { timeout: 1500 }).then(() => page.waitForSelector('#sold', { state: 'detached', timeout: 3000 })).catch(() => {}); continue; }
    /* a click that lands on a panel that was just replaced is legitimately ignored by the engine */
    const raisable = await page.$$('[data-s]:not(:disabled)');
    try {
      if (raisable.length && (prefer === 'raise' || Math.random() < 0.5)) await raisable[Math.floor(Math.random() * raisable.length)].click({ timeout: 1500 });
      else await page.click('#pass', { timeout: 1500 });
    } catch (e) { /* panel was replaced mid-click */ }
  }
  throw new Error('auction did not finish in ' + maxSteps + ' steps');
}
const reveal = async page => { await page.click('#rev'); await page.waitForSelector('#verdict.final', { timeout: 8000 }); };
const startSolo = async (page, lots = 5, clock = 0, level) => {
  await page.click('#m1'); await page.waitForSelector('#start');
  await pick(page, 'lots', lots); await pick(page, 'clock', clock); if (level) await pick(page, 'level', level);
  await page.click('#start'); await page.waitForSelector('#ctrl');
};

test('boot: the 140 KB pack is not on the critical path, and loads on demand', { skip: SKIP }, async () => {
  const { page, errors, requests, ctx } = await open({ init: () => { window.requestIdleCallback = () => 0; } });
  assert.ok(!requests.includes('pack-countries.js'), 'pack not requested at boot: ' + requests.join(','));
  assert.equal(await page.evaluate(() => Packs.isLoaded('countries')), false);
  assert.match(await page.textContent('.foot'), /196 countries/i, 'footer count comes from META');
  await page.click('#m1');                                // Solo
  await page.waitForSelector('#start');
  assert.ok(requests.includes('pack-countries.js'), 'pack fetched when Setup opens');
  assert.equal(await page.textContent('#bud'), '€100');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('no web fonts: the system stack only, nothing font-shaped is requested', { skip: SKIP }, async () => {
  const { page, errors, requests, ctx } = await open();
  await startSolo(page);
  assert.deepEqual(requests.filter(r => /\.(woff2?|ttf|otf)$|fonts\.css|fonts\.googleapis/.test(r)), []);
  assert.ok(!(await page.evaluate(() => [...document.fonts].length)), 'no @font-face registered');
  const fam = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  assert.match(fam, /-apple-system/); assert.doesNotMatch(fam, /Archivo|Space/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('solo game on the countries pack plays to the end, reveals, records, shows the globe', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await startSolo(page, 5, 0, 'expert');
  await autoplay(page);
  await reveal(page);
  await page.waitForSelector('.chip');
  const rec = JSON.parse(await page.evaluate(() => localStorage.getItem('record:v1')));
  assert.equal(rec.v, 2); assert.equal(rec.packs.countries.played, 1);
  assert.deepEqual(Object.keys(rec), ['v', 'packs']);
  await page.waitForSelector('#gl canvas', { timeout: 8000 });
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('multiplayer, 2 to 4 players, every language, no errors', { skip: SKIP }, async () => {
  for (const [lang, n] of [['en', 4], ['de', 3], ['it', 2], ['es', 4], ['fr', 3]]) {
    const { page, errors, ctx } = await open({ init: l => localStorage.setItem('lang:v1', l), initArg: lang });
    await page.click('#m2'); await page.waitForSelector('#start');
    await pick(page, 'lots', 5); await pick(page, 'clock', 0); await pick(page, 'players', n);
    for (let i = 1; i <= n; i++) await page.fill('#p' + i, 'Player ' + i + ' ' + 'x'.repeat(12));
    await page.click('#start'); await page.waitForSelector('#ctrl');
    assert.equal(await page.$$eval('.po', e => e.length), n);
    await autoplay(page);
    await reveal(page);
    assert.deepEqual(errors, [], lang);
    await ctx.close();
  }
});

test('FIXTURE pack (no flags, partial coordinates, $ economy) runs through the real UI', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await page.evaluate(src => { const module = { exports: null }; new Function('module', src)(module); Packs.register(window.__fixturePack || module.exports); }, fixtureSrc);
  await page.evaluate(() => setup('solo', 'fixture'));
  await page.waitForSelector('#start');
  assert.deepEqual(await page.$$eval('[data-g=lots] [role=radio]', o => o.map(x => x.textContent)), ['3', '5', '10']);
  assert.equal(await page.$eval('[data-g=lots] [aria-checked=true]', e => e.dataset.v), '5', 'pack default lot count');
  assert.deepEqual(await page.$$eval('[data-g=level] .lvl .tt', o => o.map(x => x.textContent)), ['Tagged only', 'Value over 3', 'Everything']);
  assert.equal(await page.$eval('[data-g=level] [aria-checked=true]', e => e.dataset.v), 'all');
  assert.equal(await page.textContent('#bud'), '$35', '7 per lot × 5, in the pack currency');
  await pick(page, 'clock', 0);
  await page.click('#start'); await page.waitForSelector('#ctrl');
  assert.equal(await page.textContent('#price'), '1', 'opens at 1');
  assert.equal(await page.textContent('.price sup'), '$', 'in the pack currency');
  assert.ok(await page.$('.head .orb .ibadge') || await page.textContent('.head .orb').then(t => t.includes('📍')), 'badge or emoji icon, never a flag');
  await autoplay(page);
  await reveal(page);
  assert.match(await page.textContent('#app'), /\$\/pt/, 'efficiency unit from the pack');
  assert.match(await page.textContent('#app'), /pts/, 'values use the pack number format');
  const owned = await page.evaluate(() => S.players.flatMap(p => p.bought).length);
  assert.ok(owned > 0);
  assert.deepEqual(errors, []);
  const rec = JSON.parse(await page.evaluate(() => localStorage.getItem('record:v1')));
  assert.equal(rec.packs.fixture.played, 1); assert.equal(rec.packs.countries.played, 0);
  await ctx.close();
});

test('globe degrades: a winner with no coordinates gets no globe, no crash', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await page.evaluate(src => { const module = { exports: null }; new Function('module', src)(module); Packs.register(window.__fixturePack || module.exports); }, fixtureSrc);
  await page.evaluate(() => {
    const pack = Packs.get('fixture');
    PACK = pack;
    S = Engine.newAuction({ pack, kind: 'multi', level: 'all', lots: 3, players: [{ name: 'A' }, { name: 'B' }], rng: rnd });
    S.packId = 'fixture';
    S.players[0].bought.push({ ...pack.items.find(i => i.id === 'FB'), price: 3 }, { ...pack.items.find(i => i.id === 'FC'), price: 4 });   // neither has lat/lon
    S.players[1].bought.push({ ...pack.items.find(i => i.id === 'FA'), price: 1 });
    finish();
  });
  await reveal(page);
  assert.equal(await page.$('#gl'), null, 'no globe when nothing has coordinates');
  assert.ok(await page.textContent('#verdict'), 'verdict still shown');
  await page.evaluate(() => {
    const pack = Packs.get('fixture'); PACK = pack;
    S = Engine.newAuction({ pack, kind: 'multi', level: 'all', lots: 3, players: [{ name: 'A' }, { name: 'B' }], rng: rnd }); S.packId = 'fixture';
    S.players[0].bought.push({ ...pack.items.find(i => i.id === 'FB'), price: 3 }, { ...pack.items.find(i => i.id === 'FD'), price: 4 });
    finish();
  });
  await reveal(page);
  assert.ok(await page.$('#gl'), 'globe shown for the item that has coordinates');
  assert.equal(await page.$$eval('.chip', c => c.length), 1);
  await page.waitForTimeout(600);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('missing pack file: friendly message, back at the menu, retry works', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open({ init: () => { window.requestIdleCallback = () => 0; } });
  let block = true;
  await ctx.route('**/pack-countries.js', r => block ? r.abort() : r.continue());
  await page.click('#m1');
  await page.waitForSelector('.toast');
  assert.match(await page.textContent('.toast'), /Could not load the game data/);
  assert.equal(await page.$('.sheetwrap'), null, 'the empty sheet is gone');
  await page.waitForSelector('#m1');
  block = false;
  await page.click('#m1');
  await page.waitForSelector('#start');
  assert.deepEqual(errors.filter(e => !/net::ERR_FAILED|Could not load/.test(e)), []);
  await ctx.close();
});

test('leaving Setup while the pack is still loading does not resurrect it', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open({ init: () => { window.requestIdleCallback = () => 0; } });
  await ctx.route('**/pack-countries.js', async r => { await new Promise(x => setTimeout(x, 600)); r.continue(); });
  await page.click('#m1');
  await page.waitForSelector('.spin');
  await page.evaluate(() => home());
  await page.waitForTimeout(1200);
  assert.ok(await page.$('#m1'), 'still on the menu');
  assert.equal(await page.$('#start'), null, 'setup did not pop up over the menu');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('corrupted storage never breaks the boot', { skip: SKIP }, async () => {
  for (const [rec, lang, name, theme] of [['{{{', 'xx', 'x'.repeat(5000), 'purple'], ['null', '', '', ''], ['[1,2,3]', '\u0000', '<img src=x onerror=alert(1)>', '{}'], ['{"played":"many","byLevel":7}', 'de', '"quoted"', 'dark'],
    [JSON.stringify({ v: 2, packs: { countries: 'nope', mystery: { played: 5 } } }), 'fr', 'ok', 'light']]) {
    const { page, errors, ctx } = await open({ init: ([r, l, n, th]) => { localStorage.setItem('record:v1', r); localStorage.setItem('lang:v1', l); localStorage.setItem('name:v1', n); localStorage.setItem('theme:v1', th); }, initArg: [rec, lang, name, theme] });
    assert.ok(await page.$('#m1'), 'menu renders with: ' + rec.slice(0, 20));
    await page.click('#m1'); await page.waitForSelector('#start');
    const v = await page.inputValue('#p1');
    assert.ok(v.length <= 16, 'a huge saved name is cut to fit');
    await page.click('#back');
    await page.evaluate(() => { recordScreen(); }); await page.waitForSelector('.sheetwrap');
    assert.ok(await page.textContent('.sheetbox'));
    assert.deepEqual(errors, [], rec);
    await ctx.close();
  }
});

test('offline: after one visit the whole game, including the lazy pack, works with no network', { skip: SKIP }, async () => {
  const ctx = await env.browser.newContext({ viewport: { width: 402, height: 715 }, serviceWorkers: 'allow', reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto(env.url);
  await page.waitForFunction(() => document.body.classList.contains('booted'));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(async () => (await caches.keys()).length > 0 && (await (await caches.open((await caches.keys())[0])).keys()).length >= 20, null, { timeout: 15000 });
  const cached = await page.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).map(r => r.url.replace(/^.*\/bidding-wars\//, '')));
  for (const f of ['engine.js', 'packs.js', 'banter.js', 'pack-countries.js', 'pack-states.js', 'app.js', 'globe.js', 'sound.js', 'fx.js', 'app.css', 'globe-hero.webp']) assert.ok(cached.includes(f), f + ' is in the offline cache');
  assert.ok(!cached.some(f => /fonts\.css|\.woff2/.test(f)), 'no font files are cached any more');
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => document.body.classList.contains('booted'));
  await startSolo(page);                                       // the pack comes from the cache
  await autoplay(page);
  await reveal(page);
  await page.click('#menu'); await page.waitForSelector('#m1');       // …and so does the States pack, offline
  await pickPack(page, 'states');
  await startSolo(page, 5, 0);
  await autoplay(page);
  await reveal(page);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the (switched-off) online screens still render and fail gracefully without a backend', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await page.evaluate(() => online());
  await page.waitForSelector('#new');
  await page.click('#new');
  await page.waitForSelector('.toast');
  await page.fill('#cd', 'ABCD'); await page.click('#join');
  await page.waitForTimeout(200);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Online 1 vs 1 shows "Soon" and opens nothing while CONFIG.online is false', { skip: SKIP }, async () => {
  const { page, ctx } = await open();
  await page.click('#m3', { force: true });
  await page.waitForSelector('.toast');
  assert.equal(await page.$('#new'), null);
  await ctx.close();
});

test('Delete all data wipes the record, the name, the language and the appearance', { skip: SKIP }, async () => {
  const { page, ctx } = await open({ init: () => { localStorage.setItem('name:v1', 'Ana'); localStorage.setItem('lang:v1', 'de'); localStorage.setItem('theme:v1', 'light'); localStorage.setItem('record:v1', JSON.stringify({ played: 3, won: 2, lost: 1 })); } });
  assert.equal(await page.getAttribute('html', 'data-theme'), 'light');
  await page.evaluate(() => privacy());
  await page.click('#wipe'); await page.click('#dy');
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => ({ name: localStorage.getItem('name:v1'), lang: localStorage.getItem('lang:v1'), theme: localStorage.getItem('theme:v1'), rec: localStorage.getItem('record:v1'), attr: document.documentElement.getAttribute('data-theme') }));
  assert.equal(s.name, null); assert.equal(s.lang, null); assert.equal(s.theme, null); assert.equal(s.attr, null);
  assert.equal(JSON.parse(s.rec).packs.countries.played, 0);
  await ctx.close();
});

test('only the four documented values are ever stored', { skip: SKIP }, async () => {
  const { page, ctx } = await open();
  await page.click('#theme'); await page.click('#mute');
  await startSolo(page, 5, 0);
  await page.fill('#cus', '1').catch(() => {});
  await autoplay(page); await reveal(page);
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  assert.deepEqual(keys, ['name:v1', 'record:v1', 'theme:v1'].filter(k => keys.includes(k)));
  assert.ok(keys.every(k => ['lang:v1', 'record:v1', 'name:v1', 'theme:v1'].includes(k)), keys.join());
  await ctx.close();
});

test('appearance: follows the phone, can be forced, and the choice is remembered', { skip: SKIP }, async () => {
  const { page, ctx } = await open({ scheme: 'light' });
  assert.equal(await page.getAttribute('html', 'data-theme'), null);
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg1').trim());
  assert.equal(await bg(), '#EEF0FF', 'system light → Daylight');
  await page.click('#theme');                              // auto → light
  await page.click('#theme');                              // light → dark
  assert.equal(await page.getAttribute('html', 'data-theme'), 'dark');
  assert.equal(await bg(), '#0A0A18', 'forced dark wins over a light phone');
  assert.equal(await page.evaluate(() => localStorage.getItem('theme:v1')), 'dark');
  await page.click('#theme');                              // dark → auto
  assert.equal(await page.getAttribute('html', 'data-theme'), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('theme:v1')), null);
  await ctx.close();
});

test('the auction never scrolls: worst-case state at every size, language and seat count', { skip: SKIP }, async () => {
  const sizes = [[402, 720], [375, 560], [393, 700], [375, 667], [430, 932], [834, 1194], [1194, 834], [507, 1024], [844, 390]];
  for (const [w, h] of sizes) for (const lang of ['de', 'fr']) for (const np of [2, 4]) {
    const { page, errors, ctx } = await open({ viewport: { width: w, height: h }, init: l => localStorage.setItem('lang:v1', l), initArg: lang });
    await page.evaluate(() => { window.think = () => new Promise(() => {}); });
    await page.evaluate(async np => {
      const pack = await Packs.load('countries'); PACK = pack;
      const names = ['Maximiliane-Sophie', 'Bartholomäus-Jan', 'Wolfeschlegelstein', 'Ägidius-Konstantin'];
      S = Engine.newAuction({ pack, kind: np === 2 ? 'solo' : 'multi', level: 'expert', lots: 30, clock: 30, players: np === 2 ? [{ name: names[0] }, { name: 'Bot', ai: true }] : names.map(n => ({ name: n })), rng: rnd });
      Engine.startLot(S);
      S.items[S.i] = pack.items.find(i => i.id === 'VC');
      S.players.forEach((p, i) => { p.budget = 300 - i; p.bought = new Array(12).fill({}); });
      S.L.price = 289; S.L.holder = np - 1; S.L.turn = 0;
      S._taunt = 'Empires are built on lots like this one. Yours is built on islands of regret and spreadsheets.';
      paintLot(); showTaunt(S._taunt); controls();
    }, np);
    const r = await page.evaluate(() => { const sc = document.querySelector('.screen'); return { y: sc.scrollHeight - sc.clientHeight, x: sc.scrollWidth - sc.clientWidth, page: document.documentElement.scrollHeight - innerHeight }; });
    assert.ok(r.y <= 1 && r.x <= 1 && r.page <= 1, `${w}x${h} ${lang} ${np}p scrolls: ${JSON.stringify(r)}`);
    const dockBottom = await page.$eval('#ctrl', e => e.getBoundingClientRect().bottom);
    assert.ok(dockBottom <= h + 0.5, `${w}x${h} dock fits (${dockBottom})`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('rotating or resizing mid-auction keeps the game going and the screen fitted', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open({ viewport: { width: 402, height: 874 } });
  await startSolo(page, 5, 0);
  for (const [w, h] of [[874, 402], [834, 1194], [507, 1024], [402, 874]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(80);
    const r = await page.evaluate(() => { const sc = document.querySelector('.screen'); return sc.scrollHeight - sc.clientHeight; });
    assert.ok(r <= 1, `${w}x${h} scrolls by ${r}`);
    assert.ok(await page.$('#ctrl'));
  }
  await autoplay(page); await reveal(page);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the decision clock waits while a sheet is open and ignores a stalled page', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await startSolo(page, 5, 30);
  await page.evaluate(() => { window.think = () => new Promise(() => {}); });
  await page.waitForSelector('#pass:not(:disabled)');
  const left = () => page.evaluate(() => +document.getElementById('timer').style.getPropertyValue('--p'));
  const p0 = await left();
  await page.click('#nb');                                // "Leave the auction?" sheet
  await page.waitForSelector('#dy');
  await page.waitForTimeout(1500);
  await page.click('#dn');
  await page.waitForTimeout(100);
  const p1 = await left();
  assert.ok(p0 - p1 < 0.02, `clock waited while the sheet was open (${p0} → ${p1})`);
  /* a 700 ms stall (a locked phone, a throttled tab) is not charged to the player */
  await page.evaluate(() => { const end = performance.now() + 700; while (performance.now() < end); });
  await page.waitForTimeout(100);
  const p2 = await left();
  assert.ok(p1 - p2 < 0.06, `stall not counted (${p1} → ${p2})`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('timeout is an automatic drop out; double-tapping Drop out sells the lot once', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await startSolo(page, 5, 10);
  await page.evaluate(() => { window.think = () => Promise.resolve(); });
  await page.waitForSelector('#pass:not(:disabled)');
  const before = await page.evaluate(() => S.players.map(p => p.budget));
  await page.evaluate(() => { document.getElementById('pass').click(); document.getElementById('pass').click(); document.getElementById('pass').click(); });
  await page.waitForSelector('#sold');
  const after = await page.evaluate(() => ({ b: S.players.map(p => p.budget), n: S.players.reduce((a, p) => a + p.bought.length, 0), price: S.L.price }));
  assert.equal(after.n, 1, 'one lot, one winner');
  assert.equal(before.reduce((a, b) => a + b) - after.b.reduce((a, b) => a + b), after.price, 'charged exactly once, at the final price');
  await page.evaluate(() => { S.clock = 1; });             // the next human turn times out after a second
  await page.click('#n');
  await page.waitForSelector('#ctrl');
  await page.waitForFunction(() => document.getElementById('sold') || document.getElementById('rev'), null, { timeout: 8000 });
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('sheets: focus moves in and is trapped, Escape closes, background is inert, role=dialog', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await page.click('#mr');
  await page.waitForSelector('.sheetbox');
  assert.equal(await page.getAttribute('.sheetbox', 'role'), 'dialog');
  assert.equal(await page.getAttribute('.sheetbox', 'aria-modal'), 'true');
  assert.equal(await page.$eval('#app', e => e.inert), true);
  for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
  assert.ok(await page.evaluate(() => document.querySelector('.sheetbox').contains(document.activeElement)), 'Tab stays inside the sheet');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  assert.equal(await page.$('.sheetwrap'), null);
  assert.equal(await page.$eval('#app', e => e.inert), false);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('every control has an accessible name, on every screen', { skip: SKIP }, async () => {
  const { page, ctx } = await open();
  const unnamed = () => page.evaluate(() => [...document.querySelectorAll('button,input,[role=button]')].filter(e => !e.hidden && e.offsetParent !== null).filter(e => {
    const n = (e.getAttribute('aria-label') || e.textContent || e.placeholder || '').trim();
    return !n;
  }).map(e => e.id || e.className));
  assert.deepEqual(await unnamed(), [], 'menu');
  await page.click('#m1'); await page.waitForSelector('#start');
  assert.deepEqual(await unnamed(), [], 'setup');
  await pick(page, 'lots', 5); await pick(page, 'clock', 0);
  await page.click('#start'); await page.waitForSelector('#ctrl');
  assert.deepEqual(await unnamed(), [], 'auction');
  await page.evaluate(() => { window.think = () => Promise.resolve(); });
  while (!(await page.$('#sold'))) { await page.click('#pass:not(:disabled)', { timeout: 3000 }).catch(() => {}); await page.waitForTimeout(80); }
  assert.deepEqual(await unnamed(), [], 'sold');
  await autoplay(page);
  assert.deepEqual(await unnamed(), [], 'sealed results');
  await reveal(page);
  assert.deepEqual(await unnamed(), [], 'results');
  await ctx.close();
});

test('the redacted values are not in the page until the bar is lifted', { skip: SKIP }, async () => {
  const { page, ctx } = await open();
  await startSolo(page, 5, 0);
  await autoplay(page);
  const bar = await page.$('.redact');
  assert.equal(await bar.textContent(), '', 'nothing readable under the bar');
  assert.ok(await bar.getAttribute('aria-label'));
  assert.equal(await page.$('#verdict.final'), null, 'no winner named yet');
  await bar.click();
  assert.notEqual(await bar.textContent(), '');
  assert.equal(await page.$('#verdict.final'), null, 'still sealed while bars remain');
  await ctx.close();
});

test('sold moment: skippable by tap, Next is reachable, reduce-motion lands instantly', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open({ motion: 'no-preference' });
  await startSolo(page, 5, 0);
  await page.evaluate(() => { window.think = () => Promise.resolve(); });
  await page.waitForSelector('#pass:not(:disabled)');
  await page.click('#pass');
  await page.waitForSelector('#sold');
  await page.waitForTimeout(250);                          // mid-animation
  assert.equal(await page.$eval('#sold', e => e.classList.contains('final')), false);
  await page.mouse.click(200, 300);                        // a tap anywhere skips to the end state
  await page.waitForSelector('#sold.final');
  await page.waitForFunction(() => +getComputedStyle(document.getElementById('n')).opacity === 1, null, { timeout: 2000 });
  await page.click('#n');
  await page.waitForSelector('#sold', { state: 'detached' });
  assert.deepEqual(errors, []);
  await ctx.close();
  const r = await open({ motion: 'reduce' });
  await startSolo(r.page, 5, 0);
  await r.page.evaluate(() => { window.think = () => Promise.resolve(); });
  await r.page.waitForSelector('#pass:not(:disabled)'); await r.page.click('#pass');
  await r.page.waitForSelector('#sold.final', { timeout: 1500 });
  assert.deepEqual(r.errors, []);
  await r.ctx.close();
});

test('sound: every voice renders cleanly offline — no clipping, no NaN, balanced loudness', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  const res = await page.evaluate(async () => {
    const out = {};
    const voices = { knock: () => Snd.knock(0, 1), whoosh: () => Snd.whoosh(0, .2), tick: () => Snd.tick(true), ui: () => Snd.ui(), raise: () => Snd.raise(3), bot: () => Snd.bot(), drop: () => Snd.drop(), chime: () => Snd.chime(), fanfare: () => Snd.fanfare(), sting: () => Snd.sting() };
    for (const [name, fn] of Object.entries(voices)) {
      const oc = new OfflineAudioContext(1, 44100 * 4, 44100);
      Snd._attach(oc); fn();
      const buf = await oc.startRendering(), d = buf.getChannelData(0);
      let peak = 0, sum = 0, nan = 0;
      for (let i = 0; i < d.length; i++) { const v = d[i]; if (!isFinite(v)) nan++; peak = Math.max(peak, Math.abs(v)); sum += v * v; }
      out[name] = { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), nan };
    }
    return out;
  });
  for (const [n, r] of Object.entries(res)) { assert.equal(r.nan, 0, n + ' has NaN'); assert.ok(r.peak > 0.005, n + ' is silent'); assert.ok(r.peak < 0.99, n + ' clips: ' + r.peak); }
  const peaks = Object.values(res).map(r => r.peak);
  assert.ok(Math.max(...peaks) / Math.min(...peaks) < 40, 'loudness spread: ' + JSON.stringify(res));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('mute silences sound and is reflected in the UI', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await page.click('#mute');
  assert.equal(await page.evaluate(() => Snd.muted && window.MUTED), true);
  assert.equal(await page.getAttribute('#mute', 'aria-pressed'), 'true');
  await startSolo(page, 5, 0);
  assert.equal(await page.getAttribute('#mute', 'aria-pressed'), 'true', 'mute survives screen changes');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the sold moment fits every screen: SOLD at the top, Next at the bottom, nothing clipped', { skip: SKIP }, async () => {
  for (const [w, h] of [[402, 720], [375, 560], [320, 568], [834, 1194], [1194, 834], [844, 390], [667, 375]]) {
    const { page, errors, ctx } = await open({ viewport: { width: w, height: h }, init: () => localStorage.setItem('lang:v1', 'de') });
    await startSolo(page, 5, 0);
    await page.evaluate(() => { window.think = () => Promise.resolve(); S.players[0].name = 'Wolfeschlegelstein'; });
    await page.waitForSelector('#pass:not(:disabled)'); await page.click('#pass');
    await page.waitForSelector('#sold.final');
    const r = await page.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(); const p = q('.plate'), n = q('#n'), t = q('.tray'), l = q('.soldline'); return { plateTop: p.top, nextBottom: n.bottom, nextRight: n.right, trayBottom: t.bottom, soldRight: l.right, vh: innerHeight, vw: innerWidth }; });
    assert.ok(r.plateTop >= 0, `${w}x${h} SOLD plate clipped at the top (${r.plateTop})`);
    assert.ok(r.nextBottom <= h + 0.5 && r.nextRight <= w + 0.5, `${w}x${h} Next lot clipped (${JSON.stringify(r)})`);
    assert.ok(r.trayBottom <= h && r.soldRight <= w + 0.5, `${w}x${h} collection/line clipped`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('missing optional assets (three.js, textures, borders, hero image) never break a game', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  for (const f of ['three.min.js', 'earth.jpg', 'countries-110m.json', 'globe-hero.webp']) await ctx.route('**/' + f, r => r.abort());
  await page.route('https://**', r => r.abort());
  await page.reload();
  await page.waitForFunction(() => document.body.classList.contains('booted'));
  await startSolo(page, 5, 0);
  await autoplay(page);
  await reveal(page);
  await page.waitForTimeout(3500);                         // the globe falls back to the flat map
  assert.ok(await page.textContent('#verdict'));
  assert.deepEqual(errors.filter(e => !/Failed to load|net::ERR|THREE|three/i.test(e)), []);
  await ctx.close();
});

test('sold moment: Next lot always appears by itself within 1.5 s, with full motion, and stays', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open({ motion: 'no-preference', viewport: { width: 1194, height: 834 } });
  await startSolo(page, 5, 0);
  await page.evaluate(() => { window.think = () => Promise.resolve(); });
  for (let round = 0; round < 3; round++) {
    await page.waitForSelector('#pass:not(:disabled)'); await page.click('#pass');
    await page.waitForSelector('#sold');
    await page.waitForSelector('#sold.ready', { timeout: 1500 });
    await page.waitForTimeout(1500);                       // it must not vanish again
    assert.equal(await page.$eval('#n', e => +getComputedStyle(e).opacity), 1, 'Next lot stays visible');
    assert.equal(await page.$eval('#n', e => getComputedStyle(e).pointerEvents), 'auto');
    await page.click('#n'); await page.waitForSelector('#sold', { state: 'detached' });
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('the page itself never moves: document is locked, no scrollbars, even with a long result', { skip: SKIP }, async () => {
  const { page, ctx } = await open({ viewport: { width: 1194, height: 834 } });
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).position), 'fixed');
  await startSolo(page, 5, 0);
  await page.mouse.wheel(0, 400);
  assert.equal(await page.evaluate(() => [scrollX, scrollY].join()), '0,0');
  await ctx.close();
});

test('results on iPad landscape: everything on one screen, globe labelled, a plain scroll is not stolen', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open({ viewport: { width: 1194, height: 834 } });
  await startSolo(page, 5, 0, 'expert');
  await autoplay(page); await reveal(page);
  await page.waitForSelector('#gl canvas', { timeout: 8000 });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => { const sc = document.querySelector('.screen'); const l = document.querySelector('.glabel'); return { over: sc.scrollHeight - sc.clientHeight, labelPos: l ? getComputedStyle(l).position : 'none-found', nav: document.querySelector('#nb').getBoundingClientRect().top >= 0 }; });
  assert.ok(r.over <= 1, 'results screen scrolls by ' + r.over);
  assert.equal(r.labelPos, 'absolute', 'country labels are positioned on the globe, not stacked in the page');
  assert.ok(r.nav, 'Menu button visible');
  const prevented = await page.evaluate(() => { const cv = document.querySelector('#gl canvas'); const e = new WheelEvent('wheel', { deltaY: 120, cancelable: true, bubbles: true }); cv.dispatchEvent(e); return e.defaultPrevented; });
  assert.equal(prevented, false, 'a plain wheel / two-finger scroll is left to the page');
  assert.deepEqual(errors, []);
  await ctx.close();
});

/* ---------------------------------------------------------------- US States pack */
/* the first lot may already be sold when the bot cannot beat the opening $1 on a tiny state: pass only if it is still open */
const toSold = async page => {
  await page.waitForSelector('#pass:not(:disabled), #sold.final', { timeout: 8000 });
  if (!(await page.$('#sold.final'))) await page.click('#pass').catch(() => {});
  await page.waitForSelector('#sold.final');
};
const pickPack = async (page, id) => { await page.click(`[data-pack="${id}"]`); await page.waitForSelector(`[data-pack="${id}"][aria-current="true"]`); };
const bodyText = page => page.evaluate(() => document.body.innerText);

test('US STATES: pick it on the menu, setup has All 50 and no difficulty, play, fun fact on SOLD, dollars only, own record', { skip: SKIP }, async () => {
  const { page, errors, ctx, requests } = await open();
  await pickPack(page, 'states');
  assert.ok(!/€/.test(await bodyText(page)), 'no euro sign on the States menu');
  await page.click('#m1'); await page.waitForSelector('#start');
  assert.deepEqual(await page.$$eval('[data-g="lots"] [data-v]', e => e.map(x => x.dataset.v)), ['5', '10', '15', '20', '30', '40', '50']);
  assert.match(await page.textContent('[data-g="lots"] [data-v="50"]'), /All 50/);
  assert.equal(await page.$('[data-g="level"]'), null, 'no difficulty filter for States');
  assert.equal((await page.textContent('#bud')).trim(), '$100');
  await pick(page, 'lots', 50); assert.equal((await page.textContent('#bud')).trim(), '$500');
  await pick(page, 'lots', 5); await pick(page, 'clock', 0);
  await page.click('#start'); await page.waitForSelector('#ctrl');
  assert.ok(requests.includes('pack-states.js'), 'pack file loaded lazily');
  assert.ok(!/€/.test(await bodyText(page)), 'no euro sign in the auction');
  await page.evaluate(() => { window.think = () => Promise.resolve(); });
  await toSold(page);
  const fact = await page.textContent('#sold .fact');
  assert.ok(fact && fact.length > 20 && fact.length <= 140, 'fun fact on the SOLD screen: ' + fact);
  assert.ok(!/€/.test(await bodyText(page)), 'no euro sign on SOLD');
  assert.match(await page.textContent('#sold .soldline .num'), /^\$[\d,]+$/);
  await autoplay(page); await reveal(page);
  const resText = await bodyText(page);
  assert.ok(!/€/.test(resText), 'no euro sign on results');
  assert.match(resText, /shopped smartest at \$\d+\.\d\d per million/, 'efficiency reads $0.00 per million');
  await page.waitForSelector('#facts'); await page.click('#facts'); await page.waitForSelector('.sheetbox .row');
  assert.equal(await page.$$eval('.sheetbox .row', e => e.length), 5, 'one fun fact per state of the round');
  const rec = JSON.parse(await page.evaluate(() => localStorage.getItem('record:v1')));
  assert.equal(rec.packs.states.played, 1); assert.ok(!rec.packs.countries || !rec.packs.countries.played);
  const keys = await page.evaluate(() => Object.keys(localStorage).sort());
  assert.ok(keys.every(k => ['lang:v1', 'theme:v1', 'record:v1', 'name:v1'].includes(k)), 'only the four documented keys: ' + keys);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('US STATES: all 50 states, each exactly once, through the real UI', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await pickPack(page, 'states');
  await startSolo(page, 50, 0);
  await autoplay(page, { maxSteps: 2500 });
  const r = await page.evaluate(() => ({ seen: S.items.map(i => i.id), bought: S.players.flatMap(p => p.bought.map(b => b.id)) }));
  assert.equal(r.seen.length, 50); assert.equal(new Set(r.seen).size, 50, 'every state once');
  assert.equal(r.bought.length, 50); assert.equal(new Set(r.bought).size, 50, 'sold exactly once');
  await reveal(page);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('US STATES: 2 to 4 players in every language, light and dark, never a euro sign', { skip: SKIP }, async () => {
  for (const [lang, n, scheme] of [['en', 4, 'dark'], ['de', 3, 'light'], ['it', 2, 'dark'], ['es', 4, 'light'], ['fr', 3, 'dark']]) {
    const { page, errors, ctx } = await open({ scheme, init: l => localStorage.setItem('lang:v1', l), initArg: lang });
    await pickPack(page, 'states');
    await page.click('#m2'); await page.waitForSelector('#start');
    await pick(page, 'lots', 5); await pick(page, 'clock', 0); await pick(page, 'players', n);
    await page.click('#start'); await page.waitForSelector('#ctrl');
    assert.ok(!/€/.test(await bodyText(page)), lang + ' auction has no €');
    await autoplay(page); await reveal(page);
    assert.ok(!/€/.test(await bodyText(page)), lang + ' results have no €');
    assert.deepEqual(errors, [], lang);
    await ctx.close();
  }
});

test('US STATES: the auction never scrolls with the longest names, 4 seats, a 3-digit price and a long taunt', { skip: SKIP }, async () => {
  const sizes = [[402, 720], [375, 560], [393, 700], [375, 667], [430, 932], [834, 1194], [1194, 834], [507, 1024], [844, 390]];
  for (const [w, h] of sizes) for (const lang of ['de', 'fr']) for (const np of [2, 4]) {
    const { page, errors, ctx } = await open({ viewport: { width: w, height: h }, init: l => localStorage.setItem('lang:v1', l), initArg: lang });
    await page.evaluate(() => { window.think = () => new Promise(() => {}); });
    await page.evaluate(async np => {
      const pack = await Packs.load('states'); PACK = pack;
      const names = ['Maximiliane-Sophie', 'Bartholomäus-Jan', 'Wolfeschlegelstein', 'Ägidius-Konstantin'];
      S = Engine.newAuction({ pack, kind: np === 2 ? 'solo' : 'multi', level: 'all', lots: 50, clock: 30, players: np === 2 ? [{ name: names[0] }, { name: 'Bot', ai: true }] : names.map(n => ({ name: n })), rng: rnd });
      Engine.startLot(S);
      S.items[S.i] = pack.items.find(i => i.id === 'NC');
      S.players.forEach((p, i) => { p.budget = 500 - i; p.bought = new Array(20).fill({}); });
      S.L.price = 289; S.L.holder = np - 1; S.L.turn = 0;
      S._taunt = 'Empires are built on lots like this one. Yours is built on islands of regret and spreadsheets.';
      paintLot(); showTaunt(S._taunt); controls();
    }, np);
    const r = await page.evaluate(() => { const sc = document.querySelector('.screen'); return { y: sc.scrollHeight - sc.clientHeight, x: sc.scrollWidth - sc.clientWidth, page: document.documentElement.scrollHeight - innerHeight }; });
    assert.ok(r.y <= 1 && r.x <= 1 && r.page <= 1, `${w}x${h} ${lang} ${np}p scrolls: ${JSON.stringify(r)}`);
    const dockBottom = await page.$eval('#ctrl', e => e.getBoundingClientRect().bottom);
    assert.ok(dockBottom <= h + 0.5, `${w}x${h} dock fits (${dockBottom})`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('US STATES: the sold moment fits every screen with the longest fun fact', { skip: SKIP }, async () => {
  for (const [w, h] of [[402, 720], [375, 560], [320, 568], [834, 1194], [1194, 834], [844, 390], [667, 375]]) for (const lang of ['de', 'en']) {
    const { page, errors, ctx } = await open({ viewport: { width: w, height: h }, init: l => localStorage.setItem('lang:v1', l), initArg: lang });
    await pickPack(page, 'states');
    await startSolo(page, 5, 0);
    await page.evaluate(() => {
      window.think = () => Promise.resolve(); S.players[0].name = 'Wolfeschlegelstein';
      const longest = Object.values(S.pack.facts).map(f => f.en).sort((a, b) => b.length - a.length)[0];
      S.pack.facts[S.items[S.i].id] = { en: longest };
    });
    await toSold(page);
    const r = await page.evaluate(() => { const q = s => document.querySelector(s).getBoundingClientRect(); const p = q('.plate'), n = q('#n'), t = q('.tray'), l = q('.soldline'), f = q('.fact'); return { plateTop: p.top, nextBottom: n.bottom, nextRight: n.right, trayBottom: t.bottom, soldRight: l.right, factBottom: f.bottom, factTop: f.top, trayTop: t.top, vh: innerHeight, vw: innerWidth }; });
    assert.ok(r.plateTop >= 0, `${w}x${h} SOLD plate clipped (${r.plateTop})`);
    assert.ok(r.nextBottom <= h + 0.5 && r.nextRight <= w + 0.5, `${w}x${h} Next lot clipped (${JSON.stringify(r)})`);
    assert.ok(r.trayBottom <= h && r.soldRight <= w + 0.5, `${w}x${h} collection/line clipped`);
    assert.ok(r.factBottom <= r.trayTop + 1 && r.factBottom <= h, `${w}x${h} fact overlaps the tray (${JSON.stringify(r)})`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

test('Countries is unchanged when States is picked and then Countries again', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await pickPack(page, 'states'); await pickPack(page, 'countries');
  await page.click('#m1'); await page.waitForSelector('#start');
  assert.equal((await page.textContent('#bud')).trim(), '€100');
  assert.ok(await page.$('[data-g="level"]'), 'Countries keeps its difficulty levels');
  assert.equal(await page.$('[data-g="lots"] [data-v="50"]'), null);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('US STATES: how to play, setup and record say states and dollars in every language — no countries, no euros', { skip: SKIP }, async () => {
  const bad = /€|\beuros?\b|\bcountr|\bLänder\b|\bLand\b|\bpaesi?\b|\bpaíses\b|\bpaís\b|\bpays\b|\bEuropa\b|\bEurope\b|\bEuropei?\b/i;
  for (const lang of ['en', 'de', 'it', 'es', 'fr']) {
    const { page, errors, ctx } = await open({ init: l => localStorage.setItem('lang:v1', l), initArg: lang });
    await pickPack(page, 'states');
    const menuTxt = await page.evaluate(() => { const c = document.body.cloneNode(true); c.querySelectorAll('.pack, script, style').forEach(e => e.remove()); return c.textContent; });
    assert.ok(!bad.test(menuTxt), `${lang} menu: ` + menuTxt.match(bad));
    await page.click('#mr');
    await page.waitForSelector('.sheetbox');
    const t1 = await page.textContent('.sheetbox');
    assert.ok(!bad.test(t1), `${lang} how-to-play: ` + t1.match(bad));
    assert.match(t1, /\$/, lang + ' how-to-play shows dollars');
    await page.keyboard.press('Escape');
    await page.click('#m1'); await page.waitForSelector('#start');
    const t2 = await page.textContent('.sheetbox');
    assert.ok(!bad.test(t2), `${lang} setup: ` + t2.match(bad));
    assert.deepEqual(errors, [], lang);
    await ctx.close();
  }
});
