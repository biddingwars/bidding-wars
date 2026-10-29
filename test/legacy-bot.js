/* REFERENCE: the bot's decision logic copied verbatim from app.js aiTurn() as it
   stood at commit bdc6fbb (before the engine refactor), minus the DOM, the think
   delay, the taunt and the raise() call. It exists only so a test can prove the
   engine's botDecision() draws the same random numbers in the same order and
   reaches the same decision. Do not "improve" it. */
module.exports = function legacyDecision(S, rnd, priceOf) {
  const L = S.L, c = S.countries[S.i], me = S.players[L.turn];
  /* botCeiling(c) */
  if (!S._ceil || S._ceilLot !== S.i) {
    const { ideal, max } = priceOf(c);
    S._ceil = { ideal, max, walk: ideal + rnd(max - ideal + 1) };
    S._ceilLot = S.i;
  }
  const lotsAfter = S.countries.length - S.i - 1;
  const reserve = lotsAfter >= 3 ? lotsAfter : 0;
  const hardCap = Math.min(me.budget - reserve, S._ceil.walk);

  if (L.price < hardCap && me.budget > L.price) {
    const rivals = L.active.filter(i => i !== L.turn);
    const contested = rivals.some(i => S.players[i].budget > L.price + 1);
    const step = !contested ? 1
      : L.price < 5 ? 1
      : Math.max(1, Math.round(L.price * (0.12 + rnd(15) / 100)));
    const amount = Math.min(me.budget, hardCap, L.price + step);
    if (amount > L.price) return { type: 'raise', amount };
  }
  return { type: 'pass' };
};
