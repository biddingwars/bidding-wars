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
  const ctx = await env.browser.newContext({ viewport: opts.viewport || { width: 402, height: 715 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
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

/* make the bot instant and play a whole auction through the real UI */
async function autoplay(page, { maxSteps = 400, prefer = 'random' } = {}) {
  await page.evaluate(() => { window.think = () => Promise.resolve(); });
  let steps = 0;
  while (steps++ < maxSteps) {
    const which = await page.waitForSelector('#pass, #n, #rev', { timeout: 6000 }).then(h => h.evaluate(e => e.id));
    if (which === 'rev') return steps;
    if (which === 'n') { await page.click('#n'); continue; }
    /* the human panel stays on screen for the ~0.5 s sold animation; a click that lands on the
       old panel is legitimately ignored by the engine, so a lost click here is not a failure */
    const raisable = await page.$$('[data-s]');
    try {
      if (raisable.length && (prefer === 'raise' || Math.random() < 0.5)) await raisable[Math.floor(Math.random() * raisable.length)].click({ timeout: 1500 });
      else await page.click('#pass', { timeout: 1500 });
    } catch (e) { /* panel was replaced mid-click */ }
  }
  throw new Error('auction did not finish in ' + maxSteps + ' steps');
}
const reveal = async page => { await page.click('#rev'); await page.waitForSelector('#verdict .card.amber', { timeout: 8000 }); };

test('boot: the 140 KB pack is not on the critical path, and loads on demand', { skip: SKIP }, async () => {
  // never let the idle warm-up fire, so we see exactly what the first load costs
  const { page, errors, requests, ctx } = await open({ init: () => { window.requestIdleCallback = () => 0; } });
  assert.ok(!requests.includes('pack-countries.js'), 'pack not requested at boot: ' + requests.join(','));
  assert.ok(!requests.includes('data.js'));
  assert.equal(await page.evaluate(() => Packs.isLoaded('countries')), false);
  assert.match(await page.textContent('.foot'), /196 COUNTRIES/, 'footer count comes from META');
  await page.click('#m1');                                // Solo
  await page.waitForSelector('#start');
  assert.ok(requests.includes('pack-countries.js'), 'pack fetched when Setup opens');
  assert.equal(await page.evaluate(() => document.getElementById('bud').textContent), '€100');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('solo game on the countries pack plays to the end, reveals, records, shows the globe', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open();
  await page.click('#m1'); await page.waitForSelector('#start');
  await page.selectOption('#n', '5'); await page.selectOption('#lv', 'expert'); await page.selectOption('#t', '0');
  await page.click('#start');
  await autoplay(page);
  await reveal(page);
  assert.ok(await page.$('.chip'), 'winner chips are shown');
  const rec = JSON.parse(await page.evaluate(() => localStorage.getItem('record:v1')));
  assert.equal(rec.v, 2); assert.equal(rec.packs.countries.played, 1);
  assert.deepEqual(Object.keys(rec), ['v', 'packs']);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('multiplayer, 4 players, every language, no errors', { skip: SKIP }, async () => {
  for (const lang of ['en', 'de', 'it', 'es', 'fr']) {
    const { page, errors, ctx } = await open({ init: l => localStorage.setItem('lang:v1', l), initArg: lang });
    await page.click('#m2'); await page.waitForSelector('#start');
    await page.selectOption('#n', '5'); await page.selectOption('#t', '0');
    for (const id of ['p1', 'p2', 'p3', 'p4']) await page.fill('#' + id, 'Player ' + id);
    await page.click('#start');
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
  assert.deepEqual(await page.$$eval('#n option', o => o.map(x => x.textContent)), ['3', '5', '10']);
  assert.equal(await page.inputValue('#n'), '5', 'pack default lot count');
  assert.deepEqual(await page.$$eval('#lv option', o => o.map(x => x.textContent)), ['Tagged only', 'Value over 3', 'Everything']);
  assert.equal(await page.inputValue('#lv'), 'all');
  assert.equal(await page.textContent('#bud'), '$35', '7 per lot × 5, in the pack currency');
  await page.selectOption('#t', '0');
  await page.click('#start');
  await page.waitForSelector('.stage .flag .ibadge, .stage .flag');
  assert.match(await page.textContent('.price .pv'), /^\$1$/, 'opens at 1 in the pack currency');
  assert.ok(await page.$('.stage .flag .ibadge') || await page.textContent('.stage .flag').then(t => t.includes('📍')), 'badge or emoji icon, never a flag');
  await autoplay(page);
  assert.match(await page.textContent('#app'), /\$\/pt/, 'efficiency unit from the pack');
  assert.match(await page.textContent('#app'), /pts/, 'values use the pack number format');
  await reveal(page);
  const owned = await page.evaluate(() => S.players.flatMap(p => p.bought).length);
  assert.ok(owned > 0);
  assert.deepEqual(errors, []);
  // records are per pack
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
  // and partial: one of two has coordinates → globe with just that one
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
  await page.waitForSelector('#m1');                       // back on the menu
  block = false;
  await page.click('#m1');
  await page.waitForSelector('#start');                    // second attempt succeeds
  assert.deepEqual(errors.filter(e => !/net::ERR_FAILED|Could not load/.test(e)), []);
  await ctx.close();
});

test('leaving Setup while the pack is still loading does not resurrect it', { skip: SKIP }, async () => {
  const { page, errors, ctx } = await open({ init: () => { window.requestIdleCallback = () => 0; } });
  await ctx.route('**/pack-countries.js', async r => { await new Promise(x => setTimeout(x, 600)); r.continue(); });
  await page.click('#m1');
  await page.waitForSelector('.spin');                     // Setup is waiting for the pack
  await page.evaluate(() => home());                       // player bails out immediately
  await page.waitForTimeout(1200);
  assert.ok(await page.$('#m1'), 'still on the menu');
  assert.equal(await page.$('#start'), null, 'setup did not pop up over the menu');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('corrupted storage never breaks the boot', { skip: SKIP }, async () => {
  for (const [rec, lang, name] of [['{{{', 'xx', 'x'.repeat(5000)], ['null', '', ''], ['[1,2,3]', '\u0000', '<img src=x onerror=alert(1)>'], ['{"played":"many","byLevel":7}', 'de', '"quoted"'],
    [JSON.stringify({ v: 2, packs: { countries: 'nope', mystery: { played: 5 } } }), 'fr', 'ok']]) {
    const { page, errors, ctx } = await open({ init: ([r, l, n]) => { localStorage.setItem('record:v1', r); localStorage.setItem('lang:v1', l); localStorage.setItem('name:v1', n); }, initArg: [rec, lang, name] });
    assert.ok(await page.$('#m1'), 'menu renders with: ' + rec.slice(0, 20));
    await page.click('#m1'); await page.waitForSelector('#start');
    const v = await page.inputValue('#p1');
    assert.ok(typeof v === 'string');
    await page.evaluate(() => { recordScreen(); }); await page.waitForTimeout(150);
    assert.ok(await page.textContent('#app'));
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
  for (const f of ['engine.js', 'packs.js', 'banter.js', 'pack-countries.js', 'app.js', 'globe.js']) assert.ok(cached.includes(f), f + ' is in the offline cache');
  assert.ok(!cached.includes('data.js'));
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => document.body.classList.contains('booted'));
  await page.click('#m1'); await page.waitForSelector('#start');          // the pack comes from the cache
  await page.selectOption('#n', '5'); await page.selectOption('#t', '0');
  await page.click('#start');
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
  await page.waitForSelector('.toast');                    // no backend → "storage not reachable", not a crash
  await page.fill('#cd', 'ABCD'); await page.click('#join');
  await page.waitForTimeout(200);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Delete all data wipes the record, the name and the language', { skip: SKIP }, async () => {
  const { page, ctx } = await open({ init: () => { localStorage.setItem('name:v1', 'Ana'); localStorage.setItem('lang:v1', 'de'); localStorage.setItem('record:v1', JSON.stringify({ played: 3, won: 2, lost: 1 })); } });
  await page.evaluate(() => privacy());
  await page.click('#wipe'); await page.click('#dy');
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => ({ name: localStorage.getItem('name:v1'), lang: localStorage.getItem('lang:v1'), rec: localStorage.getItem('record:v1') }));
  assert.equal(s.name, null); assert.equal(s.lang, null);
  assert.equal(JSON.parse(s.rec).packs.countries.played, 0);
  await ctx.close();
});
