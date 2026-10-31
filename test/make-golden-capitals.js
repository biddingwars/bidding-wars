/* Dev-only: regenerates test/golden-capitals.json, the pinned ideal and max price of every capital (the smooth curve in pack-capitals.js,
   which test/make-pack-capitals.js writes from CAL.anchors / CAL.ratio). Run it only on purpose, after changing the anchors, the ratio or the rounding;
   the diff is the review.      node test/make-golden-capitals.js */
/* `node --test` also runs every file in test/: this one is a dev tool and must not rewrite anything then */
if (process.env.NODE_TEST_CONTEXT) process.exit(0);
const fs = require('fs'), path = require('path');
const Engine = require('../engine.js'), pack = require('../pack-capitals.js');
const out = {
  generatedFrom: 'pack-capitals.js priceTable (monotone cubic through log-log anchors, whole euros, minimum 1; max/ideal 2.0 -> 1.45)',
  capitals: pack.items.map(it => { const p = Engine.priceOf(pack, it); return { id: it.id, value: it.value, ideal: p.ideal, max: p.max, tier: Engine.tierOf(pack, it.value) }; })
};
fs.writeFileSync(path.join(__dirname, 'golden-capitals.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote golden-capitals.json (' + out.capitals.length + ' capitals)');
