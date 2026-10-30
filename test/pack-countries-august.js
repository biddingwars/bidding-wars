/* TEST ONLY. The Countries pack as it played until the economy upgrade: the same 196 items with the August percentile bands, the flat
   EUR 10 per lot and the original bot (no `economy`, no `bot`, no `priceTable`). It exists so the engine's legacy bot path stays
   tested byte for byte (test/engine.test.js, test/legacy-bot.js) and so the frozen numbers in test/baseline-august.json can be
   re-derived (node test/economy.js baseline). Never listed in packs.js or sw.js. */
const current = require('../pack-countries.js'), golden = require('./golden-countries-august.json');
const pack = Object.assign({}, current, {
  bands: [0.196, 0.319, 0.365, 0.523, 0.671, 0.849, 0.926, 0.992, 1].map((upTo, i) => ({ upTo, ideal: golden.bands[i].ideal, max: golden.bands[i].max }))   // upTo edges as in pack-countries.js at c3c1408
});
delete pack.priceTable; delete pack.economy; delete pack.bot;
module.exports = pack;
