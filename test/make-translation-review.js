/* Writes TRANSLATIONS-REVIEW.md: the strings written for the packs (STRP in app.js) and the setup hint, side by side in the five languages,
   so a native speaker can check them. Dev-only.   node test/make-translation-review.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').split('\n');
const start = src.findIndex(l => l.startsWith('const STRP='));
let end = start; while (!/^\}\s*;?\s*$/.test(src[end]) && !/^\s*\}\s*\}\s*;?\s*$/.test(src[end])) end++;
const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(start, end + 1).join('\n').replace('const STRP=', 'STRP='), ctx);
const STRP = ctx.STRP, L = ['en', 'de', 'it', 'es', 'fr'], strip = s => String(s).replace(/<\/?b>/g, '**').replace(/\|/g, '\\|');
const hint = {}; for (const l of L) { const m = new RegExp("^ lots:'[^']*', shortHint:\"([^\"]+)\"", 'm'); const i = src.findIndex((line, k) => k > 0 && line.includes('shortHint:') && src.slice(0, k).reverse().find(x => /^\s*(en|de|it|es|fr):\{/.test(x))?.trim().startsWith(l + ':')); hint[l] = i >= 0 ? (src[i].match(/shortHint:"([^"]+)"/) || [])[1] : ''; }
let md = '# Translation review\n\nEnglish is the source. Please check de / it / es / fr for correctness, natural wording and the game terms (lot = Los / lotto / lote / lot, bot, fair price, budget). `{n}` is a number filled in by the game; `**bold**` marks bold text. Tell me what to change; every string lives in `app.js`.\n\n';
md += '## Setup hint (shown under the lot picker at 5 lots)\n\n| | text |\n|---|---|\n' + L.map(l => `| ${l} | ${strip(hint[l] || '')} |`).join('\n') + '\n';
for (const pack of ['countries', 'states', 'capitals']) {
  md += `\n## ${{ countries: 'Countries', states: 'US States', capitals: 'Capital Cities' }[pack]} wording (${{ countries: 'euros, "country"', states: 'dollars, "state"', capitals: 'euros, "capital"' }[pack]})\n`;
  const keys = Object.keys(STRP[pack].en);
  for (const k of keys) { md += `\n### \`${k}\`\n\n| | text |\n|---|---|\n` + L.map(l => `| ${l} | ${strip((STRP[pack][l] || {})[k] || '')} |`).join('\n') + '\n'; }
}
/* Capital Cities: the capital names (only the languages that differ from English are stored; the others show the English name), the credits line and the taunts */
const cap = require('./capitals-content.json'), credits = {};
for (const l of L) credits[l] = '';
src.forEach(line => { if (line.includes("creditsCap:'")) { const m = line.match(/creditsCap:'((?:[^'\\]|\\.)*)'/); const k = Object.keys(credits).find(l => !credits[l]); if (m && k) credits[k] = m[1].replace(/\\'/g, "'"); } });
md += '\n## Capital Cities: credits line (Privacy -> Credits & licences)\n\n| | text |\n|---|---|\n' + L.map(l => `| ${l} | ${strip(credits[l] || '')} |`).join('\n') + '\n';
md += '\n## Capital Cities: the 195 capital names (blank = same as English)\n\n| id | en | de | it | es | fr |\n|---|---|---|---|---|---|\n' + Object.keys(cap.names).sort().map(id => `| ${id} | ${cap.names[id].en} | ${L.slice(1).map(l => cap.names[id][l] || '').join(' | ')} |`).join('\n') + '\n';
md += '\n## Capital Cities: taunts (generic, by size of the capital; `{n}` is the capital\'s name)\n';
for (const tier of Object.keys(cap.taunts.en)) md += `\n### tier \`${tier}\`\n\n| | lines |\n|---|---|\n` + L.map(l => `| ${l} | ${cap.taunts[l][tier].map(strip).join('<br>')} |`).join('\n') + '\n';
/* several bots at one table (v49): the menu, setup and results strings, taken in file order (en, de, it, es, fr) */
const grab = key => { const out = []; for (const line of src) { const m = line.match(new RegExp(key + ":'((?:[^'\\\\]|\\\\.)*)'")) || line.match(new RegExp('"' + key + '": "((?:[^"\\\\]|\\\\.)*)"')); if (m) out.push(m[1].replace(/\\'/g, "'")); } return out; };
md += '\n## Several bots at one table (menu, setup, results)\n';
for (const k of ['soloShort', 'multiShort', 'multiDesc', 'peopleN', 'botsN', 'botsHint', 'noRecordBots']) { const v = grab(k); md += `\n### \`${k}\`\n\n| | text |\n|---|---|\n` + L.map((l, i) => `| ${l} | ${strip(v[i] || '')} |`).join('\n') + '\n'; }
fs.writeFileSync(path.join(__dirname, '..', 'TRANSLATIONS-REVIEW.md'), md);
console.log('wrote TRANSLATIONS-REVIEW.md', md.length, 'bytes,', (md.match(/^### /gm) || []).length, 'strings');
