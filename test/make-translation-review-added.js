/* Writes TRANSLATIONS-REVIEW-ADDED.md: English next to each of the eight added languages (i18n-<id>.js, the pack text and the
   rival's one-liners), so a native speaker can check them. Dev-only.   node test/make-translation-review-added.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(src.slice(src.indexOf('const LANGS='), src.indexOf("let LANG='en';")) + '\nthis.out={STR,STRP};', ctx);
const { STR, STRP } = ctx.out;
global.window = global; global.Packs = { register() {} };
const banter = require(path.join(ROOT, 'banter.js'));
const packs = ['countries', 'states', 'capitals'].map(id => require(path.join(ROOT, 'pack-' + id + '.js')));
const NAMES = { pt: 'Português (Brasil)', id: 'Bahasa Indonesia', zh: '中文（简体）', hi: 'हिन्दी', ja: '日本語', ko: '한국어', ar: 'العربية', th: 'ไทย' };
const cell = s => String(s == null ? '' : s).replace(/<\/?b>/g, '**').replace(/\|/g, '\\|').replace(/\n/g, ' ');
let md = '# Translation review: the eight added languages\n\nEnglish is the source. None of this has been read by a native speaker yet. Please check correctness, natural wording and the game terms (lot, bid, drop out, bot, fair price, budget). `{n}`, `{name}`, `{price}` … are filled in by the game; `**bold**` marks bold text. Money is always a symbol (€, $), never a word, so the currency setting can rewrite it. Every UI string lives in `i18n-<id>.js`; names, titles and taunts in the packs; the rival\'s one-liners in `banter.js`.\n\n'
  + Object.keys(NAMES).map(l => `- [${NAMES[l]}](#${l})`).join('\n') + '\n';
for (const l of Object.keys(NAMES)) {
  const L = require(path.join(ROOT, 'i18n-' + l + '.js'));
  md += `\n<a id="${l}"></a>\n## ${NAMES[l]} (\`${l}\`)\n\n### Screens\n\n| key | English | ${l} |\n|---|---|---|\n`;
  md += Object.keys(STR.en).map(k => `| \`${k}\` | ${cell(STR.en[k])} | ${cell(L.str[k])} |`).join('\n') + '\n';
  for (const p of Object.keys(STRP)) {
    md += `\n### ${p}: the lines that differ for this pack\n\n| key | English | ${l} |\n|---|---|---|\n`;
    md += Object.keys(STRP[p].en).map(k => `| \`${k}\` | ${cell(STRP[p].en[k])} | ${cell((L.strp[p] || {})[k])} |`).join('\n') + '\n';
  }
  md += `\n### Pack titles and labels\n\n| | English | ${l} |\n|---|---|---|\n`;
  for (const p of packs) {
    md += `| ${p.id} title | ${cell(p.title.en)} | ${cell(p.title[l])} |\n| ${p.id} noun | ${cell(p.noun.en)} | ${cell(p.noun[l])} |\n`;
    p.levels.forEach(v => { md += `| ${p.id} level ${v.id} | ${cell(v.label.en)} | ${cell(v.label[l])} |\n`; });
  }
  md += `\n### The rival's one-liners (\`banter.js\`)\n\n| | ${l} |\n|---|---|\n| drops out | ${banter[l].pass.map(cell).join('<br>')} |\n| wins a lot | ${banter[l].win.map(cell).join('<br>')} |\n`;
  for (const p of packs.filter(p => p.taunts.generic[l])) {
    md += `\n### ${p.id}: taunts by size of the lot (\`{n}\` is its name)\n\n| tier | ${l} |\n|---|---|\n`;
    md += p.taunts.tiers.map(t => `| ${t.id} | ${p.taunts.generic[l][t.id].map(cell).join('<br>')} |`).join('\n') + '\n';
  }
  md += `\n### Capital names that differ from English\n\n| id | English | ${l} |\n|---|---|---|\n` + packs[2].items.filter(i => i.name[l]).map(i => `| ${i.id} | ${cell(i.name.en)} | ${cell(i.name[l])} |`).join('\n') + '\n';
}
fs.writeFileSync(path.join(ROOT, 'TRANSLATIONS-REVIEW-ADDED.md'), md);
console.log('wrote TRANSLATIONS-REVIEW-ADDED.md', md.length, 'bytes');
