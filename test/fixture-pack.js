/* TEST FIXTURE ONLY — never shipped, never listed in packs.js META, not in sw.js.
   Ten FAKE "states" with obviously synthetic values. This is not US data: the
   names and numbers exist purely to exercise the pack format (no flags, some
   items without coordinates, a tag filter, a different budget and currency,
   a different number format). */
const pack = {
  id: 'fixture',
  title: { en: 'Fixture States' },
  noun: { en: 'state' },
  currency: { symbol: '$' },
  budgetPerLot: 7,
  lots: { options: [3, 5, 10], default: 5 },
  metric: {
    label: { en: 'Fixture score' },
    effUnit: '$/pt',
    format: v => v.toFixed(2) + ' pts'
  },
  bands: [
    { upTo: 0.3, ideal: 1.0, max: 2.0 },
    { upTo: 0.8, ideal: 0.6, max: 1.0 },
    { upTo: 1, ideal: 0.2, max: 0.3 }
  ],
  levels: [
    { id: 'tagged', label: { en: 'Tagged only' }, tag: 'west' },
    { id: 'big', label: { en: 'Value over 3' }, minValue: 3 },
    { id: 'all', label: { en: 'Everything' } }
  ],
  defaultLevel: 'all',
  taunts: {
    tiers: [{ id: 'big', min: 10 }, { id: 'small', min: 0 }],
    generic: {
      en: { big: ['{n} is big. FIXTURE LINE.'], small: ['{n} is small. FIXTURE LINE.', '{n} again. FIXTURE LINE.'] }
    }
  },
  items: [
    { id: 'FA', name: { en: 'Fixture Alpha' },   value: 0.5, lat: 40, lon: -100, tags: ['west'] },
    { id: 'FB', name: { en: 'Fixture Bravo' },   value: 1.25, tags: ['west'] },
    { id: 'FC', name: { en: 'Fixture Charlie' }, value: 2 },
    { id: 'FD', name: { en: 'Fixture Delta' },   value: 3, lat: 35, lon: -90 },
    { id: 'FE', name: { en: 'Fixture Echo' },    value: 4.5, tags: ['west'], lat: 30, lon: -95 },
    { id: 'FF', name: { en: 'Fixture Foxtrot' }, value: 6 },
    { id: 'FG', name: { en: 'Fixture Golf' },    value: 8, lat: 45, lon: -120, tags: ['west'] },
    { id: 'FH', name: { en: 'Fixture Hotel' },   value: 11, lat: 38, lon: -80 },
    { id: 'FI', name: { en: 'Fixture India' },   value: 15 },
    { id: 'FJ', name: { en: 'Fixture Juliet' },  value: 22, lat: 33, lon: -85, icon: { emoji: '📍' } }
  ]
};
if (typeof module === 'object' && module.exports) module.exports = pack;
else window.__fixturePack = pack;
