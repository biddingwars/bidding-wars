/* Settings (v44): the one stored value settings:v1, the currencies, and the five bot-aggression steps on every pack. No dependencies. */
const test = require('node:test'), assert = require('node:assert/strict');
const Engine = require('../engine.js');
const packs = { countries: require('../pack-countries.js'), states: require('../pack-states.js'), capitals: require('../pack-capitals.js') };

test('settings: defaults, junk and unknown values fall back to the defaults; only valid fields are taken', () => {
  assert.deepEqual(Engine.parseSettings(null), Engine.DEFAULT_SETTINGS);
  for (const bad of ['', 'x', '[]', '7', 'null', '{"cur":"XXX","aggr":9,"tz":-2,"motion":"x","shapes":"yes","fair":1}', { cur: 5 }]) assert.deepEqual(Engine.parseSettings(bad), Engine.DEFAULT_SETTINGS, JSON.stringify(bad));
  const s = Engine.parseSettings('{"cur":"SEK","aggr":4,"tz":2,"motion":"reduce","shapes":true,"fair":true,"confirm":true,"quiet":true,"evil":"<script>"}');
  assert.deepEqual(s, { cur: 'SEK', aggr: 4, tz: 2, motion: 'reduce', shapes: true, fair: true, confirm: true, quiet: true });
  assert.ok(!('evil' in s), 'unknown keys are dropped');
});

test('settings: only what differs from the defaults is stored; all defaults store nothing; round trip is exact', () => {
  assert.equal(Engine.stringifySettings(Engine.DEFAULT_SETTINGS), null);
  assert.equal(Engine.stringifySettings(Object.assign({}, Engine.DEFAULT_SETTINGS, { cur: 'GBP' })), '{"cur":"GBP"}');
  for (const o of [{ aggr: 0 }, { tz: 1, shapes: true }, { cur: 'KRW', fair: true, quiet: true, confirm: true, motion: 'reduce', aggr: 3, tz: 2 }]) {
    const st = Object.assign({}, Engine.DEFAULT_SETTINGS, o);
    assert.deepEqual(Engine.parseSettings(Engine.stringifySettings(st)), st);
  }
  assert.equal(Engine.SETTINGS_KEY, 'settings:v1');
});

test('practice: another bot style or the fair price on screen means the game does not count for the record', () => {
  const d = Engine.DEFAULT_SETTINGS;
  assert.equal(Engine.isPractice(d), false);
  for (const k of [0, 1, 3, 4]) assert.equal(Engine.isPractice(Object.assign({}, d, { aggr: k })), true, 'aggr ' + k);
  assert.equal(Engine.isPractice(Object.assign({}, d, { fair: true })), true);
  for (const k of ['confirm', 'quiet', 'shapes']) assert.equal(Engine.isPractice(Object.assign({}, d, { [k]: true })), false, k + ' is not a helper that changes the game');
  assert.equal(Engine.isPractice(Object.assign({}, d, { cur: 'JPY', tz: 2, motion: 'reduce' })), false, 'looks and money notation never make a practice game');
});

test('currencies: unique ids, a symbol each, written before or after the number; the numbers never change', () => {
  const ids = Engine.CURRENCIES.map(c => c.id); assert.equal(new Set(ids).size, ids.length); assert.ok(ids.length >= 15);
  for (const c of Engine.CURRENCIES) { assert.ok(c.sym && c.id.length === 3); assert.ok(Engine.currencyById(c.id) === c); }
  assert.equal(Engine.currencyById('nope'), null);
  const fm = (id, n) => Engine.formatMoney(null, n, id);
  assert.equal(fm('GBP', 70), '£70'); assert.equal(fm('SEK', 70), '70 kr'); assert.equal(fm('CHF', 1234), 'CHF 1,234'); assert.equal(fm('PLN', 5), '5 zł'); assert.equal(fm('ZAR', 9), 'R 9'); assert.equal(fm('BRL', 12), 'R$12');
  assert.equal(Engine.formatMoney(packs.states, 70), '$70', 'no currency picked: the pack writes it as before');
  assert.equal(Engine.formatMoney(packs.countries, 70), '€70');
  assert.equal(Engine.formatMoney(packs.states, 70, 'EUR'), '€70');
  for (const c of Engine.CURRENCIES) for (const n of [0, 1, 70, 300, 1234]) assert.ok(fm(c.id, n).replace(/[^0-9]/g, '') === String(n).replace(/[^0-9]/g, ''), c.id + ' keeps the number ' + n);
});

test('aggression: five steps in order of limit and raise size, on every pack; the random draw never gives the two outer ones', () => {
  for (const [name, pack] of Object.entries(packs)) {
    const level = pack.defaultLevel, lots = pack.lots.options.includes(10) ? 10 : pack.lots.options[1];
    const T = Engine.AGGR_TEMPER.map(n => Engine.pickTemper(pack.bot, lots, n || 'balanced', () => 0, level));
    for (let i = 1; i < 5; i++) { assert.ok(T[i].limit > T[i - 1].limit - 1e-12, name + ' limit rises with the step'); assert.ok(T[i].step >= T[i - 1].step - 1e-12, name + ' raise size rises with the step'); }
    assert.equal(T[2].limit, 1); assert.equal(T[2].step, 1);
    assert.ok(T[0].limit < T[1].limit && T[4].limit > T[3].limit, name + ' the outer steps go further than the calibrated ones');
    assert.ok(Math.abs((1 - T[0].limit) - 2 * (1 - T[1].limit)) < 1e-9 && Math.abs((T[4].limit - 1) - 2 * (T[3].limit - 1)) < 1e-9, name + ' the outer spread is double');
    const seen = new Set(); let k = 0; const rng = Engine.seededRng(5);
    for (let g = 0; g < 4000; g++) seen.add(Engine.pickTemper(pack.bot, lots, null, rng, level).name);
    assert.deepEqual([...seen].sort(), ['aggressive', 'balanced', 'conservative'], name + ' the hidden draw is unchanged');
  }
  assert.deepEqual(Engine.AGGR_TEMPER, ['cautious', 'conservative', null, 'aggressive', 'fierce']);
});

test('every aggression step plays whole games to the end on every pack (money conserved, nothing sold twice)', () => {
  const go = (S, me, cap) => S.L.price + 1 <= Math.min(cap, me.budget) ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' };
  for (const [name, pack] of Object.entries(packs)) for (const temper of Engine.AGGR_TEMPER) for (let g = 0; g < 12; g++) {
    const lots = pack.lots.options[g % pack.lots.options.length], level = pack.levels[g % pack.levels.length].id;
    const S = Engine.newAuction({ pack, kind: 'solo', level, lots, players: [{ name: 'You' }, { name: 'Bot', ai: true }], rng: Engine.seededRng(900 + g), temper: temper || undefined });
    const money0 = S.players[0].budget + S.players[1].budget; let r = Engine.startLot(S);
    while (r.state === 'lot') {
      let ended = S.L.turn === null;
      while (!ended) { const me = S.players[S.L.turn]; const a = me.ai ? Engine.botDecision(S) : (g % 2 ? go(S, me, 1e9) : go(S, me, Math.floor(1.25 * Engine.priceOf(S.pack, S.items[S.i]).ideal))); const res = a.type === 'raise' ? Engine.raise(S, a.amount) : Engine.pass(S); assert.ok(!res.error, name + ' ' + temper + ' bot/human move accepted'); ended = res.next === 'award'; }
      Engine.award(S); r = Engine.advance(S);
    }
    assert.equal(S.players.reduce((n, p) => n + p.bought.length, 0) + (S.unsold ? S.unsold.length : 0), S.items.length, name + ' ' + temper + ': every lot is sold exactly once (the walkover sells the rest at once)');
    const spent = S.players.reduce((a, p) => a + p.bought.reduce((x, b) => x + b.price, 0), 0);
    assert.equal(S.players[0].budget + S.players[1].budget + spent, money0, name + ' ' + temper + ' money is conserved');
    assert.ok(S.players.every(p => Number.isInteger(p.budget) && p.budget >= 0));
  }
});

test('Text size Small (tz -1): accepted, stored only when chosen, never a practice game; -2 and 3 are dropped', () => {
  assert.equal(Engine.parseSettings('{"tz":-1}').tz, -1);
  assert.equal(Engine.parseSettings('{"tz":-2}').tz, 0); assert.equal(Engine.parseSettings('{"tz":3}').tz, 0);
  const d = Engine.DEFAULT_SETTINGS;
  assert.deepEqual(JSON.parse(Engine.stringifySettings(Object.assign({}, d, { tz: -1 }))), { tz: -1 });
  assert.equal(Engine.stringifySettings(d), null, 'the default (Normal) stores nothing');
  assert.equal(Engine.parseSettings(Engine.stringifySettings(Object.assign({}, d, { tz: -1, shapes: true }))).tz, -1);
  assert.equal(Engine.isPractice(Object.assign({}, d, { tz: -1 })), false);
});
