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
