/* A small slice of the bug hunt (test/fuzz.js): hostile and random players, odd inputs (unknown level, lot counts that are not options,
   absurd lot counts, junk amounts), every invariant checked after every move, and seeded reproducibility. The big runs are `node test/fuzz.js`. */
const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../engine.js');
const { oneGame } = require('./fuzz.js');

test('fuzz: 8,000 hostile games across Countries, US States, Capitals and the August pack: no failure of any invariant', () => {
  const failed = [];
  for (let g = 0; g < 8000; g++) {
    const name = ['countries', 'states', 'capitals', 'august'][g % 4], a = oneGame(name, 424242 + g);
    if (Array.isArray(a)) { failed.push(a[0].slice(0, 300)); continue; }
    if (g % 7 === 0) { const b = oneGame(name, 424242 + g); assert.ok(!Array.isArray(b) && b.fp === a.fp, 'not reproducible: ' + JSON.stringify(a.ctx)); }
  }
  assert.deepEqual(failed, []);
});

test('an unknown, missing or corrupted level falls back to the default level (budget, pool, bot)', () => {
  const countries = require('../pack-countries.js');
  for (const level of ['bogus', undefined, null, '', 'Medium', 7]) {
    const S = Engine.newAuction({ pack: countries, kind: 'solo', level, lots: 10, players: [{ name: 'a' }, { name: 'b', ai: true }], rng: Engine.seededRng(1) });
    assert.equal(S.level, 'medium'); assert.equal(S.players[0].budget, 100); assert.ok(S.items.every(i => i.value >= 15), 'the default level pool');
    assert.equal(Engine.budgetFor(countries, 10, level), 100);
  }
});
