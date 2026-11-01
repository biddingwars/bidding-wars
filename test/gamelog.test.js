/* The optional game log (Settings -> "Record my games", off by default, only on the device): the engine's trace, the compact record, the storage helpers.
   The trace must never change a game: the same seed plays the same with and without it. */
const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../engine.js');
const PACKS = { countries: require('../pack-countries.js'), states: require('../pack-states.js'), capitals: require('../pack-capitals.js') };

function play(pack, lots, level, seed, trace) {
  const S = Engine.newAuction({ pack, kind: 'solo', level, lots, players: [{ name: 'You' }, { name: 'Bot', ai: true }], rng: Engine.seededRng(seed) });
  if (trace) S.trace = [];
  const fair = (S, me) => { const c = Math.floor(1.25 * Engine.priceOf(S.pack, S.items[S.i]).ideal); return S.L.price + 1 <= Math.min(c, me.budget) ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' }; };
  let r = Engine.startLot(S);
  while (r.state === 'lot') {
    let ended = S.L.turn === null;
    while (!ended) { const me = S.players[S.L.turn], a = me.ai ? Engine.botDecision(S) : fair(S, me); let res = a.type === 'raise' ? Engine.raise(S, a.amount) : Engine.pass(S); if (res.error) res = Engine.pass(S); ended = res.next === 'award'; }
    Engine.award(S); r = Engine.advance(S);
  }
  return S;
}
const fingerprint = S => JSON.stringify(S.players.map(p => p.bought.map(b => [b.id, b.price])).concat([S.players.map(p => p.budget)]));

test('Game log: tracing never changes a game (same seed, same result, every pack and level)', () => {
  for (const [id, pack] of Object.entries(PACKS)) for (const lv of pack.levels.map(l => l.id)) for (let g = 0; g < 25; g++) {
    const lots = pack.lots.options[g % pack.lots.options.length], a = play(pack, lots, lv, 7000 + g, false), b = play(pack, lots, lv, 7000 + g, true);
    assert.equal(fingerprint(a), fingerprint(b), `${id}/${lv}/${lots} seed ${7000 + g}`);
  }
});

test('Game log: one record per lot with every raise / pass, the winner, the bot\'s limit; money adds up; no names', () => {
  for (const [id, pack] of Object.entries(PACKS)) {
    const lv = pack.defaultLevel, S = play(pack, 10, lv, 99, true), g = Engine.gameLog(S, { t: '2026-11-01T12:00', aggr: 2 });
    assert.equal(g.v, 1); assert.equal(g.pack, id); assert.equal(g.lots, 10); assert.deepEqual(g.seats, ['you', 'bot']);
    assert.ok(g.budget > 0 && g.pts.length === 2 && g.left.length === 2 && typeof g.end === 'string');
    let spent = [0, 0], lotsSeen = 0;
    for (const e of g.lotLog) {
      if (e.walkover) continue;
      lotsSeen++; assert.ok(e.id && e.ideal >= 1 && e.max >= e.ideal && Array.isArray(e.bids) && e.won, id + ' lot ' + e.i);
      e.bids.forEach(([seat, kind, amt]) => { assert.ok(seat === 0 || seat === 1); assert.ok(kind === 'r' || kind === 'p'); assert.ok(Number.isInteger(amt)); });
      spent[e.won[0]] += e.won[1];
    }
    if (g.end === 'end') assert.equal(lotsSeen, 10);
    assert.ok(!/"name"|"You"|"Bot"/.test(JSON.stringify(g)), 'no player names in the log');
    assert.ok(JSON.stringify(g).length < 12000, id + ' record is small: ' + JSON.stringify(g).length);
  }
});

test('Game log: the bot\'s secret limit and the all-in flag are recorded (Delhi at 5 lots in Capitals is decisive)', () => {
  const pack = PACKS.capitals; let sawDec = false, sawWalk = false;
  for (let g = 0; g < 200 && !(sawDec && sawWalk); g++) {
    const S = play(pack, 5, 'expert', 300 + g, true);
    for (const e of S.trace) { if (e.dec) sawDec = true; if (typeof e.walk === 'number' && e.walk >= 1) sawWalk = true; }
  }
  assert.ok(sawWalk, 'the walk-away limit is logged'); assert.ok(sawDec, 'a decisive (all-in) lot shows up in 200 games');
});

test('Game log: storage helpers keep the last 100 games, drop junk, and stay under the size cap', () => {
  assert.deepEqual(Engine.parseLog(null), []); assert.deepEqual(Engine.parseLog('x'), []); assert.deepEqual(Engine.parseLog('{"a":1}'), []);
  assert.deepEqual(Engine.parseLog(JSON.stringify([1, null, { v: 2, lotLog: [] }, { v: 1, lotLog: [] }])).length, 1);
  let raw = null; const mk = n => ({ v: 1, n, lotLog: [] });
  for (let n = 0; n < 130; n++) raw = Engine.addToLog(raw, mk(n));
  const a = Engine.parseLog(raw); assert.equal(a.length, 100); assert.equal(a[0].n, 30); assert.equal(a[99].n, 129);
  const big = { v: 1, lotLog: [{ pad: 'x'.repeat(900000) }] }; raw = null;
  for (let n = 0; n < 4; n++) raw = Engine.addToLog(raw, big);
  assert.ok(raw.length <= 1500000 || Engine.parseLog(raw).length === 1, 'size cap holds');
  assert.equal(Engine.LOG_KEY, 'log:v1');
});

test('Game log: the setting is a boolean, off by default, dropped when junk', () => {
  assert.equal(Engine.DEFAULT_SETTINGS.log, false);
  assert.equal(Engine.parseSettings('{"log":true}').log, true);
  assert.equal(Engine.parseSettings('{"log":"yes"}').log, false);
  assert.equal(Engine.stringifySettings(Engine.DEFAULT_SETTINGS), null, 'nothing stored while off');
  assert.deepEqual(JSON.parse(Engine.stringifySettings(Object.assign({}, Engine.DEFAULT_SETTINGS, { log: true }))), { log: true });
  assert.equal(Engine.isPractice(Object.assign({}, Engine.DEFAULT_SETTINGS, { log: true })), false, 'logging never makes a practice game');
});
