/* The US results map: generated data, bundled files, and the label layout. No browser needed. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const M = require('../us-map.js'), View = require('../us-view.js');
const pack = require('../pack-states.js');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

test('us-map.js has exactly the 48 contiguous states plus Alaska and Hawaii insets', () => {
  const main = Object.keys(M.main.states).sort(), ids = pack.items.map(i => i.id).filter(i => i !== 'AK' && i !== 'HI').sort();
  assert.deepEqual(main, ids);
  assert.deepEqual(Object.keys(M.AK.states), ['AK']); assert.deepEqual(Object.keys(M.HI.states), ['HI']);
  for (const [k, s] of Object.entries(M.main.states)) {
    assert.ok(s.d.startsWith('M') && s.d.length > 40, k + ' has a path');
    assert.ok(s.c[0] > 0 && s.c[0] < M.main.w && s.c[1] > 0 && s.c[1] < M.main.h, k + ' label point is on the map');
  }
  assert.ok(M.main.outline.length > 1000, 'nation outline for the dimming mask');
  for (const k of ['AK', 'HI']) { const s = M[k].states[k]; assert.ok(s.c[0] > 0 && s.c[0] < M[k].w && s.c[1] > 0 && s.c[1] < M[k].h, k + ' label inside its inset'); }
});

test('the map files exist, are small, and are in the offline cache list', () => {
  let total = 0;
  for (const f of ['us-map.js', 'us-view.js', 'us-map.webp', 'us-ak.webp', 'us-hi.webp']) {
    const p = path.join(root, f); assert.ok(fs.existsSync(p), f + ' exists at the repo root (flat)'); total += fs.statSync(p).size;
    assert.ok(sw.includes("'./" + f + "'"), f + ' is in sw.js SHELL');
  }
  assert.ok(total < 450 * 1024, 'all map files together under 450 KB: ' + Math.round(total / 1024));
  assert.equal(M.main.image, 'us-map.webp'); assert.equal(M.AK.image, 'us-ak.webp'); assert.equal(M.HI.image, 'us-hi.webp');
});

test('the pack asks for the map; Countries does not', () => {
  assert.equal(pack.map, 'us');
  assert.equal(require('../pack-countries.js').map, undefined);
});

test('layout: labels never overlap and callouts stay inside the map, at phone and iPad scales', () => {
  const ids = pack.items.map(i => i.id);
  let seed = 7; const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
  for (const scale of [.22, .27, .4, .6]) for (let n = 0; n < 150; n++) {
    const pick = ids.filter(() => rnd() < [.06, .12, .3, .6][n % 4]);
    if (!pick.length) continue;
    const L = View.layout(M, pick, scale), pw = L.pw, ph = L.ph;
    const main = pick.filter(i => M.main.states[i]);
    assert.equal(L.pins.length, main.length); assert.ok(L.labels.length <= main.filter(i => !View.CROWDED.includes(i)).length);
    assert.equal(L.hasAK, pick.includes('AK')); assert.equal(L.hasHI, pick.includes('HI'));
    assert.equal(L.VH > L.H, L.hasAK || L.hasHI, 'the inset band exists only when needed');
    assert.equal(L.VW > L.W, main.some(i => View.CROWDED.includes(i)), 'the callout margin exists only when needed');
    for (let i = 0; i < L.labels.length; i++) for (let j = i + 1; j < L.labels.length; j++) {
      const a = L.labels[i], b = L.labels[j];
      assert.ok(!(Math.abs(a.x - b.x) < pw * .95 && Math.abs(a.y - b.y) < ph * .95), `scale ${scale}: ${a.id} / ${b.id} overlap`);
    }
    L.callouts.forEach((c, i) => {
      assert.ok(c.y >= 0 && c.y <= L.H, 'callout inside the map height');
      if (i) assert.ok(c.y - L.callouts[i - 1].y >= 15 / scale, 'callouts are spaced');
    });
    assert.equal(L.callouts.length, main.filter(i => View.CROWDED.includes(i)).length);
  }
});
