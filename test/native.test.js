// The iOS wrapper (native/): bundles exactly the offline game, never loads the website, and declares what Apple asks for.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const N = p => path.join(ROOT, 'native', p);
const read = p => fs.readFileSync(N(p), 'utf8');

test('native: Capacitor config bundles native/www and never points at a server', () => {
  const c = JSON.parse(read('capacitor.config.json'));
  assert.strictEqual(c.webDir, 'www');
  assert.ok(!c.server || !c.server.url, 'server.url would load the website: the app must start offline (2.5.2)');
  assert.match(c.appId, /^[a-z][a-z0-9]*(\.[a-z0-9]+)+$/);
  assert.strictEqual(c.appName, 'Bidding Wars');
  assert.strictEqual(c.plugins.Keyboard.resize, 'none', 'platform.js keeps the keyboard from resizing the auction');
});

test('native: the web folder is the offline cache list, flat and complete', async () => {
  const { shellFiles } = await import(path.join(ROOT, 'native', 'copy-web.mjs'));
  const files = shellFiles();
  for (const f of ['index.html', 'app.js', 'app.css', 'platform.js', 'engine.js', 'three.min.js', 'earth.jpg', 'privacy.html', 'support.html']) assert.ok(files.includes(f), f + ' must be bundled');
  assert.ok(!files.includes('sw.js'), 'the service worker is not used inside the app');
  for (const f of files) {
    assert.ok(!f.includes('/'), f + ': the game is flat');
    assert.ok(fs.existsSync(path.join(ROOT, f)), f + ' is listed in sw.js but missing');
  }
});

test('native: the package pins one Capacitor version for core, iOS and CLI', () => {
  const p = JSON.parse(read('package.json'));
  const v = p.dependencies['@capacitor/core'];
  assert.match(v, /^\d+\.\d+\.\d+$/, 'exact versions only');
  assert.strictEqual(p.dependencies['@capacitor/ios'], v);
  assert.strictEqual(p.devDependencies['@capacitor/cli'], v);
  for (const plug of ['preferences', 'haptics', 'keyboard', 'status-bar', 'splash-screen']) assert.ok(p.dependencies['@capacitor/' + plug], plug + ' is used by platform.js');
});

test('native: Info.plist and the privacy manifest say what APPSTORE.md promises', () => {
  const plist = read('ios/App/App/Info.plist');
  assert.match(plist, /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
  assert.doesNotMatch(plist, /UsageDescription/, 'the game asks for no permission');
  assert.doesNotMatch(plist, /armv7/);
  const langs = [...plist.match(/<key>CFBundleLocalizations<\/key>\s*<array>([\s\S]*?)<\/array>/)[1].matchAll(/<string>([^<]+)<\/string>/g)].map(m => m[1]);
  assert.deepStrictEqual(langs, ['en', 'de', 'it', 'es', 'fr', 'pt-BR', 'id', 'zh-Hans', 'hi', 'ja', 'ko', 'ar', 'th']);
  const pm = read('ios/App/App/PrivacyInfo.xcprivacy');
  assert.match(pm, /<key>NSPrivacyTracking<\/key>\s*<false\/>/);
  assert.match(pm, /<key>NSPrivacyCollectedDataTypes<\/key>\s*<array\/>/);
  assert.match(pm, /NSPrivacyAccessedAPICategoryUserDefaults[\s\S]*CA92\.1/);
  const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.ok((pbx.match(/PrivacyInfo\.xcprivacy in Resources/g) || []).length >= 2, 'the manifest must be in the app target\'s resources');
  assert.match(pbx, /PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/);
  assert.strictEqual(pbx.match(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/)[1], JSON.parse(read('capacitor.config.json')).appId, 'Xcode and Capacitor must agree on the bundle id');
});
