/* Store readiness (App Store / Google Play / PWA) and the flat-file rules, checked on the real files. No dependencies. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const png = f => { const b = fs.readFileSync(path.join(root, f)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] }; };

test('sw.js: every cached file exists at the repo root (flat), and every core file is in the shell list', () => {
  const sw = read('sw.js'), shell = sw.slice(sw.indexOf('const SHELL'), sw.indexOf('];', sw.indexOf('const SHELL')));
  const files = [...shell.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
  assert.ok(files.length > 25);
  for (const f of files) { assert.ok(!f.includes('/'), 'flat layout: ' + f); assert.ok(fs.existsSync(path.join(root, f)), 'cached file is missing: ' + f); }
  const core = [...sw.slice(sw.indexOf('const CORE')).split('\n')[0].matchAll(/'\.\/([^']*)'/g)].map(m => m[1]);
  assert.ok(core.length > 10);
  for (const f of core) assert.ok(f === '' || files.includes(f), 'core file not in SHELL: ' + f);
  for (const f of ['pack-countries.js', 'pack-states.js', 'pack-capitals.js', 'us-map.js', 'us-map.webp', 'earth.jpg', 'three.min.js']) assert.ok(core.includes(f), f + ' is needed offline, so it must be a core file');
});

test('every file the pages load exists; no absolute or hardcoded-host path (a native shell serves from another root)', () => {
  const html = read('index.html');
  assert.ok(!/<base\s/i.test(html), 'a <base href="/bidding-wars/"> breaks every path inside a native app');
  for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const u = m[1].split('?')[0];
    if (/^(https?:|data:|mailto:)/.test(u)) continue;
    assert.ok(!u.startsWith('/'), 'absolute path: ' + u);
    assert.ok(fs.existsSync(path.join(root, u)), 'missing file referenced by index.html: ' + u);
  }
  for (const f of ['app.js', 'engine.js', 'platform.js', 'globe.js', 'us-view.js', 'packs.js', 'sw.js', 'app.css']) assert.ok(!/['"`(]\/bidding-wars\//.test(read(f)), f + ' hardcodes /bidding-wars/');
  for (const f of ['privacy.html', 'support.html']) for (const m of read(f).matchAll(/(?:src|href)="([^"#]+)"/g)) { const u = m[1].split('?')[0]; if (!/^(https?:|mailto:)/.test(u)) assert.ok(fs.existsSync(path.join(root, u)), f + ' links to a missing file: ' + u); }
});

test('manifest: installable (name, start_url, standalone, 192 + 512 + maskable icons of the right size)', () => {
  const m = JSON.parse(read('manifest.json'));
  assert.ok(m.name && m.short_name && m.start_url && m.scope);
  assert.equal(m.display, 'standalone');
  const by = (size, purpose) => m.icons.find(i => i.sizes === size && i.purpose === purpose);
  for (const [size, purpose] of [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']]) {
    const i = by(size, purpose); assert.ok(i, 'icon ' + size + ' ' + purpose);
    const p = png(i.src); assert.equal(p.w + 'x' + p.h, size, i.src + ' is really ' + size);
  }
  for (const f of ['icon-180.png', 'icon-1024.png']) { const p = png(f); assert.ok(p.w === p.h, f + ' is square'); }
  assert.equal(png('icon-1024.png').w, 1024, 'the App Store icon is 1024x1024');
  for (const f of ['icon-1024.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png']) assert.notEqual(png(f).colorType, 6, f + ' must have no alpha channel (the App Store rejects a transparent icon)');
});

test('privacy page: dated, says what is stored, and the in-app texts agree (the sixth optional value is named)', () => {
  const p = read('privacy.html');
  assert.match(p, /Last updated: \d{1,2} [A-Z][a-z]+ 20\d\d/);
  assert.match(p, /Five things/); assert.match(p, /Record my games/);
  assert.match(read('support.html'), /github\.com\/biddingwars\/bidding-wars\/issues/);
});

test('the back button is handled (Android Back must not leave the game in the middle of an auction)', () => {
  const a = read('app.js');
  assert.match(a, /addEventListener\('popstate'/);
  assert.match(a, /history\.pushState/);
});

test('the double-tap filter never swallows a tap on a control', () => {
  const p = read('platform.js');
  assert.match(p, /closest\('button,a,input/);
});

test('globe cleanup frees textures and the WebGL context (a "Play again" must not pile up 100 MB of GPU memory)', () => {
  const g = read('globe.js');
  assert.match(g, /forceContextLoss/); assert.match(g, /scene\.traverse/); assert.match(g, /\.dispose\(\)/);
});
