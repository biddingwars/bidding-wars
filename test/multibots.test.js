/* Several bots at one table (v48): each bot plays its own style, the walk-away is per seat, the duel is exactly what it was, and the bots stay in a sane range against a human. */
const test = require('node:test'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const Engine = require('../engine.js');
const packs = { countries: require('../pack-countries.js'), states: require('../pack-states.js'), capitals: require('../pack-capitals.js') };
const go = (S, me, cap) => S.L.price + 1 <= Math.min(cap, me.budget) ? { type: 'raise', amount: S.L.price + 1 } : { type: 'pass' };
const ideal = S => Engine.priceOf(S.pack, S.items[S.i]).ideal;
const POL = { creeper: (S, me) => go(S, me, 1e9), fair: (S, me) => go(S, me, Math.floor(1.25 * ideal(S))) };

function play(pack, level, lots, seats, seed, pol, temper) {
  const S = Engine.newAuction({ pack, kind: 'multi', level, lots, players: seats.map((ai, i) => ai ? { name: 'Bot' + i, ai: true } : { name: 'P' + i }), rng: Engine.seededRng(seed), temper });
  const log = []; let r = Engine.startLot(S);
  while (r.state === 'lot') {
    let ended = S.L.turn === null;
    while (!ended) { const me = S.players[S.L.turn]; const a = me.ai ? Engine.botDecision(S) : POL[pol](S, me); log.push(a.type + (a.amount || '')); const res = a.type === 'raise' ? Engine.raise(S, a.amount) : Engine.pass(S); assert.ok(!res.error, 'every move is accepted'); ended = res.next === 'award'; }
    const w = Engine.award(S); log.push('W' + w.winner + ':' + w.price); r = Engine.advance(S);
  }
  return { S, log: log.join(',') };
}

test('a duel against one bot is exactly what it was before several bots existed (seeded games, hashed)', () => {
  const h = crypto.createHash('sha256');
  for (const [name, pack] of Object.entries(packs)) for (const level of pack.levels.map(l => l.id)) for (const lots of [5, pack.lots.options[1]]) for (let g = 0; g < 6; g++) for (const pol of ['creeper', 'fair']) {
    const { S, log } = play(pack, level, lots, [false, true], 4000 + g, pol); h.update(name + level + lots + g + pol + log + '|' + S.players.map(p => p.budget).join('/'));
  }
  assert.equal(h.digest('hex'), '6ed82fa1b058d4df91a01d3ca126d62ebe4af02c93786ba524fb03072884f3d6', 'the duel changed (digest = the engine of v47 before several bots existed)');
});

test('several bots: every bot has a style of its own (all different for 2 and 3 bots), never drawn twice, a forced style applies to all', () => {
  for (const pack of Object.values(packs)) {
    const seen = new Set();
    for (let g = 0; g < 300; g++) {
      const S2 = Engine.newAuction({ pack, kind: 'multi', level: pack.defaultLevel, lots: 5, players: [{ name: 'a' }, { name: 'b', ai: true }, { name: 'c', ai: true }], rng: Engine.seededRng(g) });
      const n2 = Object.values(S2.bot.byseat).map(t => t.name); assert.equal(n2.length, 2); assert.equal(new Set(n2).size, 2, '2 bots: different styles ' + n2);
      const S3 = Engine.newAuction({ pack, kind: 'multi', level: pack.defaultLevel, lots: 5, players: [{ name: 'a' }, { name: 'b', ai: true }, { name: 'c', ai: true }, { name: 'd', ai: true }], rng: Engine.seededRng(g) });
      const n3 = Object.values(S3.bot.byseat).map(t => t.name).sort(); assert.deepEqual(n3, ['aggressive', 'balanced', 'conservative'], '3 bots: all three styles');
      seen.add(Object.keys(S3.bot.byseat).map(k => S3.bot.byseat[k].name).join());
      assert.equal(S3.bot.temper, S3.bot.byseat[1], 'bot.temper is the first bot\'s');
    }
    assert.ok(seen.size >= 5, 'the styles are dealt to the seats in different orders: ' + seen.size);
    const F = Engine.newAuction({ pack, kind: 'multi', level: pack.defaultLevel, lots: 5, players: [{ name: 'a' }, { name: 'b', ai: true }, { name: 'c', ai: true }], rng: Engine.seededRng(1), temper: 'fierce' });
    assert.deepEqual(Object.values(F.bot.byseat).map(t => t.name), ['fierce', 'fierce'], 'a forced style (Settings) applies to every bot');
    const one = Engine.newAuction({ pack, kind: 'solo', level: pack.defaultLevel, lots: 5, players: [{ name: 'a' }, { name: 'b', ai: true }], rng: Engine.seededRng(1) });
    assert.equal(one.bot.byseat, undefined, 'one bot keeps the single temperament');
  }
});

test('every bot rolls its own walk-away for a lot, and the lot is the same for all', () => {
  const pack = packs.countries, S = Engine.newAuction({ pack, kind: 'multi', level: 'medium', lots: 10, players: [{ name: 'a' }, { name: 'b', ai: true }, { name: 'c', ai: true }, { name: 'd', ai: true }], rng: Engine.seededRng(11) });
  Engine.startLot(S); const walks = new Set(), seen = {};
  for (let guard = 0; guard < 200 && S.L.turn !== null; guard++) {
    const me = S.players[S.L.turn];
    if (me.ai) { const d = Engine.botDecision(S); seen[S.L.turn] = S._ceil.walk; const r = d.type === 'raise' ? Engine.raise(S, d.amount) : Engine.pass(S); if (r.next === 'award') break; }
    else { const r = Engine.raise(S, S.L.price + 1); if (r.next === 'award') break; }
  }
  assert.ok(Object.keys(seen).length >= 2, 'at least two bots took a turn'); Object.values(seen).forEach(w => walks.add(w));
  assert.ok(walks.size >= 2, 'the bots do not share one ceiling: ' + [...walks]);
});

test('2-3 bots at a table of 3-4 play whole games on every pack and level: money conserved, every lot sold once, nothing rejected', () => {
  for (const [name, pack] of Object.entries(packs)) for (const level of pack.levels.map(l => l.id)) for (const seats of [[false, true, true], [false, false, true, true], [false, true, true, true], [false, false, false, true]]) for (const pol of ['creeper', 'fair']) {
    const { S } = play(pack, level, pack.lots.options[0], seats, 77, pol);
    const money0 = S.players.length * Engine.budgetFor(pack, pack.lots.options[0], level), spent = S.players.reduce((a, p) => a + p.bought.reduce((x, b) => x + b.price, 0), 0);
    assert.equal(S.players.reduce((a, p) => a + p.budget, 0) + spent, money0, `${name} ${level} money conserved`);
    assert.equal(S.players.reduce((n, p) => n + p.bought.length, 0) + (S.unsold ? S.unsold.length : 0), S.items.length, 'every lot is sold exactly once');
  }
});

test('crowd: the bots are calibrated for full tables - a fair-value human against 3 bots wins a sane share, a +1 creeper does not run away with it', () => {
  const G = 120;
  for (const [name, pack, level] of [['states', packs.states, 'all'], ['countries medium', packs.countries, 'medium'], ['capitals medium', packs.capitals, 'medium']]) for (const k of [2, 3]) {
    const wins = { fair: 0, creeper: 0 };
    for (const pol of ['fair', 'creeper']) for (let g = 0; g < G; g++) {
      const { S } = play(pack, level, 10, [false].concat(Array(k).fill(true)), 31000 + g, pol), sb = Engine.scoreboard(S), top = Math.max(...sb.rows.map(r => r.pts)), w = sb.rows.filter(r => r.pts === top);
      if (w.some(r => !r.p.ai)) wins[pol] += 1 / w.length;
    }
    const share = 100 / (k + 1);
    assert.ok(wins.fair / G * 100 >= share * 0.4 && wins.fair / G * 100 <= share * 2.0, `${name} ${k} bots: a fair-value human wins ${(wins.fair / G * 100).toFixed(0)}% (share ${share.toFixed(0)}%)`);
    assert.ok(wins.creeper / G * 100 <= share * 1.9, `${name} ${k} bots: the creeper wins ${(wins.creeper / G * 100).toFixed(0)}% (share ${share.toFixed(0)}%)`);
  }
});

test('validatePack accepts the crowd parameter and refuses nonsense', () => {
  for (const pack of Object.values(packs)) assert.deepEqual(Engine.validatePack(pack), []);
  const bad = c => Engine.validatePack(Object.assign({}, packs.states, { bot: Object.assign({}, packs.states.bot, { crowd: c }) }));
  assert.ok(bad('x').some(m => /crowd/.test(m))); assert.ok(bad(5).some(m => /crowd/.test(m))); assert.deepEqual(bad(0.2), []);
});
