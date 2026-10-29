/* Headless game driver: plays whole auctions through the pure engine, the way
   the view does, and checks the rules' invariants after every single step. */
const Engine = require('../engine.js');

const POLICIES = {
  random: (S, rng) => {
    const L = S.L, me = S.players[L.turn], room = me.budget - L.price;
    const roll = rng(10);
    if (room < 1 || roll < 3) return { type: 'pass', timedOut: rng(4) === 0 };
    const step = roll < 8 ? [1, 2, 5, 10, 25][rng(5)] : 1 + rng(room);
    return { type: 'raise', amount: Math.min(me.budget, L.price + step) };
  },
  alwaysPass: () => ({ type: 'pass', timedOut: true }),
  minRaise: (S) => ({ type: 'raise', amount: S.L.price + 1 }),
  allIn: (S) => ({ type: 'raise', amount: S.players[S.L.turn].budget })
};

function check(S, total, where, awarding) {
  const fail = m => { throw new Error('INVARIANT ' + where + ': ' + m + '\n' + JSON.stringify({ i: S.i, L: S.L, budgets: S.players.map(p => p.budget) })); };
  for (const p of S.players) {
    if (!Number.isInteger(p.budget) || p.budget < 0) fail('budget ' + p.budget);
    for (const b of p.bought) if (!Number.isInteger(b.price) || b.price < 0 || !Number.isFinite(b.value)) fail('bought entry ' + JSON.stringify(b));
  }
  const spent = S.players.reduce((a, p) => a + p.bought.reduce((x, b) => x + b.price, 0), 0);
  const held = S.players.reduce((a, p) => a + p.budget, 0);
  if (held + spent !== total) fail('money not conserved: ' + held + ' + ' + spent + ' != ' + total);
  const L = S.L;
  if (L && L.turn !== null && !awarding) {   // after the closing drop-out the turn is stale by design: the lot is about to be awarded
    if (!L.active.includes(L.turn)) fail('turn not active');
    if (L.turn === L.holder) fail('holder to act against themself');
    if (!L.active.includes(L.holder)) fail('holder not active');
    if (!Number.isInteger(L.price) || L.price < 1) fail('price ' + L.price);
    if (S.players[L.holder].budget < L.price) fail('holder cannot afford price');
  }
}

/* opts: { pack, kind:'solo'|'multi', n (players), level, lots, rng, policy, banter? } */
function playGame(opts) {
  const { pack, rng } = opts;
  const solo = opts.kind === 'solo';
  const players = solo ? [{ name: 'You' }, { name: 'Bot', ai: true }]
    : Array.from({ length: opts.n }, (_, i) => ({ name: 'P' + (i + 1) }));
  const S = Engine.newAuction({ pack, kind: opts.kind, level: opts.level, lots: opts.lots, players, clock: 10, rng });
  const total = S.players.length * Engine.budgetFor(pack, opts.lots);
  const policy = POLICIES[opts.policy] || POLICIES.random;
  const log = { lots: 0, awards: 0, walkover: false, openers: [], steps: 0 };
  let r = Engine.startLot(S);
  while (r.state === 'lot') {
    log.lots++; log.openers.push(S.L.holder);
    check(S, total, 'startLot');
    let ended = S.L.turn === null;
    while (!ended) {
      if (++log.steps > 20000) throw new Error('STUCK: step cap hit');
      const actor = S.players[S.L.turn];
      const act = actor.ai ? Engine.botDecision(S) : policy(S, rng);
      let res;
      if (act.type === 'raise') {
        res = Engine.raise(S, act.amount);
        if (res.error) { /* a rejected raise is a legal no-op; the human then drops out */ res = Engine.pass(S); }
      } else res = Engine.pass(S, act.timedOut);
      ended = res.next === 'award';
      check(S, total, 'after ' + act.type, ended);
    }
    const a = Engine.award(S);
    log.awards++;
    if (!(a.price >= 1) || a.price > a.item.value * 1e9) throw new Error('bad award price ' + a.price);
    check(S, total, 'award', true);
    r = Engine.advance(S);
  }
  check(S, total, 'end', true);
  if (r.reason === 'walkover') log.walkover = true;
  const sb = Engine.scoreboard(S);
  for (const row of sb.rows) {
    if (!Number.isFinite(row.pts) || !Number.isFinite(row.spent) || Number.isNaN(row.eff)) throw new Error('NaN in scoreboard');
  }
  if (S.i !== S.items.length) throw new Error('auction ended with lots unplayed: ' + S.i + '/' + S.items.length);
  return { S, log, sb, reason: r.reason };
}

module.exports = { playGame, POLICIES, check };
