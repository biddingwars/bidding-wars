/* Copies the game's runtime files from the repository root into native/www, the folder Capacitor packages into the app.
   The list is read from SHELL in ../sw.js, so it cannot drift from what the web build caches for offline play; sw.js itself is
   left out (the app has no service worker: the files are already on the device). Run with: npm run sync-web
   Nothing is changed in the repository root and www/ is generated (git-ignored). */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), out = path.join(__dirname, 'www');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const shell = /const SHELL = \[([\s\S]*?)\];/.exec(sw);
if (!shell) throw new Error('SHELL not found in sw.js');
const files = [...shell[1].matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(f => f && f !== 'sw.js');
if (!files.includes('index.html')) files.push('index.html');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const missing = [];
for (const f of files) {
  const src = path.join(root, f);
  if (!fs.existsSync(src)) { missing.push(f); continue; }
  fs.copyFileSync(src, path.join(out, f));
}
if (missing.length) { console.error('missing from the repository root: ' + missing.join(', ')); process.exit(1); }
/* the game must not reach any other server (App Store 2.5.2, privacy policy): refuse to package a build that names one */
const allowed = [/^https:\/\/biddingwars\.github\.io\/bidding-wars\/(privacy|support)\.html$/, /^http:\/\/www\.w3\.org\//, /^http:\/\/creativecommons\.org\/licenses\//, /^https:\/\/github\.com\/biddingwars\/bidding-wars\/issues$/, /^https:\/\/docs\.github\.com\//];
const bad = [];
for (const f of files.filter(f => /\.(js|html|css|json)$/.test(f) && f !== 'three.min.js')) for (const u of fs.readFileSync(path.join(out, f), 'utf8').match(/https?:\/\/[^"'\s)<>`]+/g) || []) if (!allowed.some(r => r.test(u))) bad.push(f + ' -> ' + u);
if (bad.length) { console.error('web addresses in the bundle:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('www/: ' + files.length + ' files, ' + (fs.readdirSync(out).length) + ' entries, no remote addresses');
