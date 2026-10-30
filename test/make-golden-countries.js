/* Dev-only: regenerates test/golden-countries.json, the pinned ideal and max price of every country (smooth curve, see pack-countries.js).
   Run it only on purpose, after changing the anchors, the ratio or the rounding; the diff is the review.
     node test/make-golden-countries.js
   The August prices live on in test/golden-countries-august.json (bands) for the legacy-bot tests. */
const fs = require('fs'), path = require('path');
const Engine = require('../engine.js'), pack = require('../pack-countries.js');
const europe = new Set(Engine.levelPool(pack, 'beginner').map(i => i.id)), medium = new Set(Engine.levelPool(pack, 'medium').map(i => i.id));
const out = {
  generatedFrom: 'pack-countries.js priceTable (smooth monotone curve, ratio 2.0 -> 1.45); the August bands are in golden-countries-august.json',
  countries: pack.items.map(it => { const p = Engine.priceOf(pack, it); return { id: it.id, value: it.value, rank: p.rank, ideal: p.ideal, max: p.max, tier: Engine.tierOf(pack, it.value), europe: europe.has(it.id), medium: medium.has(it.id) }; })
};
fs.writeFileSync(path.join(__dirname, 'golden-countries.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote golden-countries.json (' + out.countries.length + ' countries)');
