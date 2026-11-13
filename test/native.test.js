/* The native wrapper's web bundle (native/www, built by native/build-www.js) as the app will run it: served from the ROOT of an origin (capacitor://localhost has no
   /bidding-wars/ prefix), with a stand-in `window.Capacitor` that records every native plugin call. Proves: the bundle is complete, the game boots and plays offline with no
   request to another host, storage goes to the Preferences plugin, the status bar follows the theme, the splash is hidden, and no service worker is registered.
   It cannot prove anything about Xcode, signing or a real device. Skipped when Playwright is not installed. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process');
let chromium = null; try { chromium = require('playwright').chromium; } catch (e) {}
const SKIP = chromium ? false : 'Playwright is not installed';
const native = path.join(__dirname, '..', 'native'), www = path.join(native, 'www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function serveRoot() {
  const srv = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html', f = path.join(www, p);
    if (!f.startsWith(www) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f));
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, url: 'http://127.0.0.1:' + srv.address().port + '/' })));
}

test('native bundle: build-www.js packages exactly the files sw.js caches (minus sw.js) and refuses remote addresses', () => {
  cp.execFileSync(process.execPath, [path.join(native, 'build-www.js')], { stdio: 'pipe' });
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), shell = [...(/const SHELL = \[([\s\S]*?)\];/.exec(sw)[1]).matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(f => f && f !== 'sw.js');
  shell.forEach(f => assert.ok(fs.existsSync(path.join(www, f)), f + ' is in the bundle'));
  assert.ok(!fs.existsSync(path.join(www, 'sw.js')), 'no service worker file in the app');
  assert.ok(!fs.existsSync(path.join(www, 'test')), 'no test folder in the app');
});

test('native bundle: boots from the root of an origin with a stand-in Capacitor, offline, no outside request; storage, status bar and splash go through the plugins', { skip: SKIP }, async () => {
  cp.execFileSync(process.execPath, [path.join(native, 'build-www.js')], { stdio: 'pipe' });
  const { srv, url } = await serveRoot(), b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 402, height: 874 } });
  const page = await ctx.newPage(), errors = [], outside = [];
  page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith(url) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) outside.push(r.url()); });
  await page.addInitScript(() => {
    const kv = {}, calls = [];
    const plug = n => new Proxy({}, { get: (_, m) => async a => { calls.push([n, m, a]); if (n === 'Preferences') { if (m === 'get') return { value: kv[a.key] == null ? null : kv[a.key] }; if (m === 'set') kv[a.key] = a.value; if (m === 'remove') delete kv[a.key]; } return {}; } });
    window.__native = { kv, calls };
    window.Capacitor = { isNativePlatform: () => true, Plugins: { Preferences: plug('Preferences'), Haptics: plug('Haptics'), Keyboard: plug('Keyboard'), StatusBar: plug('StatusBar'), SplashScreen: plug('SplashScreen') } };
  });
  await page.goto(url); await page.waitForSelector('#m1'); await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => location.pathname), '/', 'served from the root, like capacitor://localhost');
  assert.equal(await page.evaluate(() => navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(r => r.length) : 0), 0, 'no service worker inside the app');
  let calls = await page.evaluate(() => window.__native.calls.map(c => c[0] + '.' + c[1] + ':' + JSON.stringify(c[2] || null)));
  assert.ok(calls.includes('Keyboard.setResizeMode:{"mode":"none"}'), 'keyboard does not resize the layout: ' + calls.join(' | '));
  assert.ok(calls.includes('StatusBar.setStyle:{"style":"DARK"}'), 'light clock for the dark page: ' + calls.join(' | '));
  assert.ok(calls.some(c => c.startsWith('SplashScreen.hide')), 'splash hidden once the menu is painted');
  assert.ok(calls.some(c => c.startsWith('Preferences.get')), 'reads go to Preferences');
  /* a choice is stored through Preferences (not localStorage) and the status bar follows Daylight */
  await page.click('#theme'); await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.__native.kv['theme:v1']), 'light', 'theme stored by the Preferences plugin');
  assert.equal(await page.evaluate(() => Object.keys(localStorage).length), 0, 'nothing in localStorage while a native store exists');
  calls = await page.evaluate(() => window.__native.calls.map(c => c[0] + '.' + c[1] + ':' + JSON.stringify(c[2] || null)));
  assert.ok(calls.includes('StatusBar.setStyle:{"style":"LIGHT"}'), 'dark clock for Daylight');
  await page.click('#theme'); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => 'theme:v1' in window.__native.kv), false, 'dark is the default and stores nothing');
  /* a whole 5-lot round plays through the bundled files (pack, engine, sounds, results) */
  await page.click('#m1'); await page.waitForSelector('[data-g="lots"]'); await page.click('[data-g="lots"] [data-v="5"]'); await page.click('#start');
  for (let g = 0; g < 400 && !(await page.$('#rev')); g++) {
    if (await page.$('#n:not([disabled])')) { await page.click('#n', { force: true }).catch(() => {}); }
    else if (await page.$('#pass:not([disabled])')) await page.click('#pass', { force: true }).catch(() => {});
    await page.waitForTimeout(120);
  }
  await page.waitForSelector('#rev', { timeout: 5000 }); await page.click('#rev'); await page.waitForSelector('#again', { timeout: 15000 });
  assert.ok(await page.evaluate(() => window.__native.kv['record:v1']), 'the record is stored through Preferences');
  assert.deepEqual(outside, [], 'no request to another host');
  assert.deepEqual(errors, [], 'no console or page errors');
  await b.close(); srv.close();
});
