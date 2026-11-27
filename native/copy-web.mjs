// Copies the game into native/www, the folder Capacitor bundles into the iOS app.
//
// The list of files is the offline cache list in ../sw.js (SHELL): that list is already what the game needs to run
// in airplane mode, and test/browser.test.js keeps it complete. Left out on purpose: sw.js itself (the service worker
// is not registered inside the app, Native.is), test/, native/, .github/, the *.md files.
// Run from native/: `node copy-web.mjs` (or `npm run sync`, which also runs `npx cap sync ios`).
import { readFileSync, rmSync, mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(here, 'www');

export function shellFiles() {
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  const m = sw.match(/SHELL\s*=\s*\[([\s\S]*?)\]/);
  if (!m) throw new Error('sw.js: no SHELL list found');
  const files = [...m[1].matchAll(/'\.\/([^']*)'/g)].map(x => x[1]).filter(Boolean);
  return [...new Set(files)];
}

function main() {
  const files = shellFiles();
  const missing = files.filter(f => !existsSync(join(root, f)) || !statSync(join(root, f)).isFile());
  if (missing.length) throw new Error('listed in sw.js but missing: ' + missing.join(', '));
  if (files.some(f => f.includes('/'))) throw new Error('the game is flat: no subfolders (see CLAUDE.md)');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  let bytes = 0;
  for (const f of files) { copyFileSync(join(root, f), join(out, f)); bytes += statSync(join(out, f)).size; }
  console.log(`native/www: ${files.length} files, ${(bytes / 1048576).toFixed(1)} MB`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
