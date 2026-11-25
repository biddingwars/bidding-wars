/* The thirteen languages: every word on screen exists in each of them, with the same placeholders and markup as English.
   The first five live in app.js (STR, STRP); the other eight in i18n-<id>.js, loaded when picked.
   Run: node --test test/languages.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* the string tables of app.js, evaluated on their own (they are plain data) */
function appStrings() {
  const src = read('app.js');
  const a = src.indexOf('const LANGS='), b = src.indexOf("let LANG='en';");
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(src.slice(a, b) + '\nthis.out={LANGS,STR,STRP};', ctx);
  return ctx.out;
}
const { LANGS, STR, STRP } = appStrings();
const BUILT_IN = ['en', 'de', 'it', 'es', 'fr'];
const ADDED = ['pt', 'id', 'zh', 'hi', 'ja', 'ko', 'ar', 'th'];
const NON_LATIN = ['zh', 'hi', 'ja', 'ko', 'ar', 'th'];
const ALL = BUILT_IN.concat(ADDED);
const added = Object.fromEntries(ADDED.map(l => [l, require(path.join(ROOT, 'i18n-' + l + '.js'))]));
global.window = global; global.Packs = { register() {} };
const packs = ['pack-countries.js', 'pack-states.js', 'pack-capitals.js'].map(f => require(path.join(ROOT, f)));

const holes = s => (String(s).match(/\{[a-z]+\}/g) || []).sort().join(',');
const tags = s => (String(s).match(/<\/?[a-z]+>/g) || []).sort().join(',');

test('LANGS lists the thirteen languages, Arabic right to left', () => {
  assert.equal(LANGS.map(l => l.id).join(), ALL.join());
  assert.equal(LANGS.filter(l => l.rtl).map(l => l.id).join(), 'ar');
  LANGS.forEach(l => assert.match(l.flag, /^[A-Z]{2}$/));
});

test('every added language has every UI word, with the same placeholders and markup as English', () => {
  const keys = Object.keys(STR.en);
  for (const l of ADDED) {
    const s = added[l].str;
    const miss = keys.filter(k => typeof s[k] !== 'string' || !s[k].trim());
    assert.deepEqual(miss, [], l + ' is missing ' + miss.join(', '));
    for (const k of keys) {
      assert.equal(holes(s[k]), holes(STR.en[k]), `${l}.${k}: placeholders`);
      assert.equal(tags(s[k]), tags(STR.en[k]), `${l}.${k}: markup`);
    }
    assert.deepEqual(Object.keys(s).filter(k => !(k in STR.en)), [], l + ': keys English does not have');
  }
});

test('every pack-specific line exists in every added language', () => {
  for (const p of Object.keys(STRP)) for (const l of ADDED) {
    const o = (added[l].strp || {})[p] || {};
    for (const k of Object.keys(STRP[p].en)) {
      assert.ok(typeof o[k] === 'string' && o[k].trim(), `${l} STRP.${p}.${k}`);
      assert.equal(holes(o[k]), holes(STRP[p].en[k]), `${l} STRP.${p}.${k}: placeholders`);
      assert.equal(tags(o[k]), tags(STRP[p].en[k]), `${l} STRP.${p}.${k}: markup`);
    }
  }
});

test('money is written as a symbol, never as a word, so the currency setting can rewrite it', () => {
  const WORD = /\b(?:euros?|dollars?|dólar(?:es)?|dolar)\b|यूरो(?!प)|डॉलर|ユーロ|ドル|欧元|美元|유로|달러|يورو|دولار|ยูโร|ดอลลาร์/i;   // "Europa" is a continent, not money
  for (const l of ADDED) {
    const texts = Object.values(added[l].str).concat(...Object.values(added[l].strp).map(Object.values));
    const bad = texts.filter(t => WORD.test(t));
    assert.deepEqual(bad, [], l);
  }
  for (const p of packs) for (const l of ADDED) {
    const g = p.taunts && p.taunts.generic && p.taunts.generic[l];
    if (g) assert.deepEqual(Object.values(g).flat().filter(t => WORD.test(t)), [], p.id + ' taunts ' + l);
  }
});

test('the packs carry their names, titles and labels in all thirteen languages', () => {
  for (const p of packs) {
    for (const l of ALL) {
      assert.ok(p.title[l], p.id + ' title ' + l);
      assert.ok(p.noun[l], p.id + ' noun ' + l);
      assert.ok(p.metric.label[l], p.id + ' metric ' + l);
      if (p.metric.effLabel) assert.ok(p.metric.effLabel[l], p.id + ' effLabel ' + l);
      p.levels.forEach(v => assert.ok(v.label[l], p.id + ' level ' + v.id + ' ' + l));
    }
    /* a Latin-script language may share the English name ("Canada"); every other script must have its own */
    for (const l of NON_LATIN) {
      const miss = p.items.filter(it => !it.name[l]).map(it => it.id);
      assert.deepEqual(miss, [], `${p.id}: no ${l} name for ${miss.join(', ')}`);
    }
  }
});

test('the rival taunts and one-liners exist in every added language', () => {
  const banter = require(path.join(ROOT, 'banter.js'));
  for (const l of ALL) { assert.ok(banter[l].pass.length >= 6, 'pass ' + l); assert.ok(banter[l].win.length >= 6, 'win ' + l); }
  for (const p of packs) {
    if (p.captionFacts) continue;                                   // US States shows its fun facts there instead of taunts
    for (const l of ADDED) {
      const g = p.taunts.generic[l];
      p.taunts.tiers.forEach(t => assert.ok(g && g[t.id] && g[t.id].length && g[t.id].every(x => x.includes('{n}')), `${p.id} taunts ${l}.${t.id}`));
    }
  }
});

test('each added language file is cached for offline play and registers itself', () => {
  const sw = read('sw.js');
  for (const l of ADDED) {
    assert.ok(sw.includes(`'./i18n-${l}.js'`), 'sw.js SHELL caches i18n-' + l + '.js');
    assert.match(read('i18n-' + l + '.js'), new RegExp(`root\\.addLang\\("${l}", L\\)`));
  }
  assert.ok(!fs.existsSync(path.join(ROOT, 'i18n-en.js')), 'the first five stay in app.js');
});
