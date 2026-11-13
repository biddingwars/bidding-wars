/* The version shown on the menu (CONFIG.version in platform.js) must be the number in sw.js's CACHE,
   so "what the menu says" is always "which build the service worker serves". */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('menu version equals the sw.js CACHE number', () => {
  const cache = /const CACHE = 'bidding-wars-v(\d+)'/.exec(read('sw.js')), ver = /^\s*version:\s*(\d+),/m.exec(read('platform.js'));
  assert.ok(cache, 'sw.js CACHE not found'); assert.ok(ver, 'CONFIG.version not found in platform.js');
  assert.equal(+ver[1], +cache[1], 'bump CONFIG.version in platform.js together with CACHE in sw.js');
});

test('the menu renders the version and no new storage key is added', () => {
  assert.match(read('app.js'), /class="ver"[^>]*>v\$\{CONFIG\.version\}/);
  assert.doesNotMatch(read('platform.js').split('const Store')[1] || '', /version/i);
});

/* App Store 2.5.2 (no remote code) and the privacy policy ("nothing is sent anywhere"): the game files may not name another server at all,
   not even as a fallback. The only web addresses allowed are the two policy pages in CONFIG and licence / namespace identifiers that are never fetched. */
test('no shipped game file can reach another server (no CDN, no remote script, no base tag)', () => {
  const files = fs.readdirSync(path.join(__dirname, '..')).filter(f => /\.(js|html|css|json)$/.test(f) && !['three.min.js', 'privacy.html', 'support.html'].includes(f));
  const allowed = [/^https:\/\/biddingwars\.github\.io\/bidding-wars\/(privacy|support)\.html$/, /^http:\/\/www\.w3\.org\//, /^http:\/\/creativecommons\.org\/licenses\//];
  files.forEach(f => (read(f).match(/https?:\/\/[^"'\s)<>`]+/g) || []).forEach(u => assert.ok(allowed.some(r => r.test(u)), f + ' names ' + u)));
  const html = read('index.html');
  assert.doesNotMatch(html, /<base\b/i, 'no <base>: every path is relative, so the files also run from inside an app bundle');
  assert.doesNotMatch(html, /<script[^>]+src="(?:https?:)?\/\//i, 'no script from another host');
  assert.doesNotMatch(html, /<link[^>]+href="(?:https?:)?\/\//i, 'no stylesheet or font from another host');
});

test('the privacy sheet links to the full policy and to support, both bundled for offline use; no "Soon" teaser ships', () => {
  const app = read('app.js'), sw = read('sw.js');
  assert.match(app, /id="ppol" href="privacy\.html"/); assert.match(app, /id="psup" href="support\.html"/);
  assert.match(sw, /'\.\/privacy\.html'/); assert.match(sw, /'\.\/support\.html'/);
  assert.match(read('platform.js'), /teasers:\s*false/, 'CONFIG.teasers must be false for a store release (Guideline 2.1(a))');
  ['en', 'de', 'it', 'es', 'fr'].forEach(l => assert.match(app, new RegExp('"' + l + '": \\{\\n  "privPolicy": "[^"]+",\\n  "supportLink": "[^"]+"'), l + ' has the two link labels'));
});

/* v61: the native shell. The wrapper (native/) packages the files named in sw.js's SHELL; the status bar follows the game's own theme. */
test('native wrapper: the privacy manifest declares no tracking and no collected data, the web bundle list comes from sw.js, and the status bar follows the theme', () => {
  const root = path.join(__dirname, '..'), man = fs.readFileSync(path.join(root, 'native/ios/App/App/PrivacyInfo.xcprivacy'), 'utf8');
  assert.match(man, /<key>NSPrivacyTracking<\/key>\s*<false\/>/); assert.match(man, /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/); assert.match(man, /<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/);
  assert.match(fs.readFileSync(path.join(root, 'native/ios/App/App.xcodeproj/project.pbxproj'), 'utf8'), /PrivacyInfo\.xcprivacy in Resources/, 'the manifest is part of the app target');
  assert.match(fs.readFileSync(path.join(root, 'native/build-www.js'), 'utf8'), /const SHELL = /);
  assert.match(read('platform.js'), /style: theme === 'light' \? 'LIGHT' : 'DARK'/); assert.match(read('app.js'), /Shell\.statusBar\(THEME\)/);
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'native/capacitor.config.json'), 'utf8'));
  assert.equal(cfg.webDir, 'www'); assert.ok(!cfg.server, 'no server.url: the app must start offline from its own files');
});
