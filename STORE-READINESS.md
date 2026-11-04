# Store readiness and audit notes (v60, 4 November 2026)

What was checked, what was fixed, and what is left for the owner. Everything here was verified on the real files and in headless Chromium;
**nothing was tested on a real iPhone, iPad or Android phone.** `test/store.test.js` keeps the checkable parts true.

## What the audit ran

- `node --test` (the whole suite), `test/fuzz.js` (120,000 hostile games, 0 failures), `test/ui-sim.js` (210 whole games through the UI, 0 failures).
- ESLint (undefined variables, unused code, duplicate keys) over every game script: no real finding.
- axe-core (accessibility) on the menu, setup, auction, settings, privacy and rules screens in the dark and the light theme.
- A scan of every screen in 5 languages x 3 packs for leaked placeholders (`{n}`, `undefined`, `NaN`): none.
- A network log of a whole game in all three packs through the results globe: **zero third-party requests** (the privacy promise holds).
- Data: 196 countries, 195 capitals, 50 states: no duplicate ids, every value > 0, every coordinate in range, every flag id is a valid ISO code.
- Text: 3,923 strings (UI in 5 languages, banter, taunts, fun facts) linted for doubled words, spacing, a/an, apostrophes: clean.
- Branches: 33 remote branches, **none has unmerged work** (the old ones were squash-merged, the newer ones merged). They can all be deleted.

## Bugs found and fixed in this audit

| Bug | Effect | Fix |
|---|---|---|
| "Reduce motion" rendered `aria-checked="reduce"` | After it was switched on, reopening Settings and tapping it set it *on again*: it could not be switched off (except with Reset settings). Screen readers read an invalid state. | Boolean `aria-checked`; test added |
| Globe cleanup only called `renderer.dispose()` | Each results screen kept a 6144x3072 earth texture (about 100 MB of GPU memory) and its WebGL context: repeated "Play again" piled memory up on phones | Textures, geometries and materials are freed and the context released |
| `<base href="/bidding-wars/">` in `index.html` | Inside a native shell (Capacitor serves from `capacitor://localhost/`) every file would 404: a blank app | `<base>` removed; every path was already relative; a test forbids it |
| No Back-button handling | Android Back (or a browser Back, the iOS edge swipe) left the game in the middle of an auction | Back closes a sheet, asks before leaving an auction, returns to the menu from other screens; on the menu it leaves |
| Double-tap filter in `platform.js` | Two quick taps (+1, +1) lost the second tap | It now ignores taps on controls (`touch-action: manipulation` already stops double-tap zoom) |
| Service worker install | A failed download of a core file (during the first visit) still "succeeded", so a half-filled cache could take over and break offline play | The install fails unless the core files are cached; a failed non-page request no longer returns the HTML page |
| Pack tiles were `<button role="listitem">` | Invalid ARIA (axe) | Roles removed, `aria-current` kept |
| 28 English taunts said "real money" | Reads as real-money gambling in an App Store review (Guideline 5.3) | Reworded ("serious euros"); README too |
| Voice said "Doctor Congo" | Speech engine reads the abbreviation | Full spoken names in 5 languages (earlier PR) |
| `privacy.html` date was stale | The policy changed (optional log) after the date | Dated 4 November 2026 |
| README out of date | Mentioned `<base>`, "four things stored", an old cache number | Updated |

## Open items (need a decision or an account, not code)

**Apple App Store**

1. **Contact (Guideline 1.5).** `support.html` offers only a GitHub issue link, and the privacy policy points to "the contact details on the support page". Add a real e-mail address (or a contact form) to both pages.
2. **Native wrapper.** The repo is a web app. For the store it has to be wrapped (Capacitor is already assumed in `platform.js`: Preferences, Haptics, Keyboard, StatusBar, SplashScreen). A bare website in a shell can be refused under 4.2 (minimum functionality); haptics, offline play, synthesised sound and the native storage are the arguments for approval.
3. **Privacy manifest.** The Xcode project needs `PrivacyInfo.xcprivacy`: Capacitor Preferences uses UserDefaults (required-reason category `NSPrivacyAccessedAPICategoryUserDefaults`, reason `CA92.1`). Tracking: none. Collected data types: none ("Data Not Collected").
4. **Export compliance.** Set `ITSAppUsesNonExemptEncryption` to `NO` (no encryption of its own).
5. **Age rating.** No objectionable content. Answer the simulated-gambling question honestly: it is an auction with play money, no betting, no purchases.
6. **Geopolitics / China storefront.** The Capitals and Countries packs list Taiwan (flag, Taipei) as an item and the globe draws Natural Earth borders. In China, a map needs a licence and the Taiwan flag emoji is hidden on iOS. Either exclude the China storefront or take Taiwan and the borders out for it.
7. `docs/APPSTORE.md`, mentioned in a comment in `platform.js`, does not exist (the repo is flat on purpose); the checklist is this file.

**Google Play**

1. **A Trusted Web Activity needs `/.well-known/assetlinks.json` at the domain root.** `biddingwars.github.io/bidding-wars/` is a *project* page, so that file cannot be served from this repo. Use a Capacitor Android app (assets bundled, the same code as iOS) or a custom domain.
2. Data safety form: no data collected, none shared; privacy policy URL as above. Content rating (IARC): same answers as the Apple age rating.
3. Not targeting children. No permissions are requested. Back button: handled since v59 (Play's pre-launch report checks it).
4. Edge-to-edge (Android 15): safe-area insets are already read with `env(safe-area-inset-*)`.

**Accessibility trade-off (left as it is, on purpose).** `viewport` has `maximum-scale=1, user-scalable=no` (axe: critical `meta-viewport`; Play's pre-launch report may flag it). The auction is a fixed one-screen layout that must not scroll or zoom; the Settings -> Text size step (Small / Normal / Large / Larger) is the in-app answer. Remove those two attributes if you prefer pinch-zoom over a locked layout.

**Smaller notes**

- GitHub Pages also publishes `test/`, the markdown notes and `.github/pr-screenshots` (7.4 MB). Nothing secret, but not needed on the site.
- No Content-Security-Policy (GitHub Pages cannot set headers; a `<meta>` CSP would need `'unsafe-inline'` for the inline scripts).
- `three.min.js` falls back to a CDN, and the globe has CDN fallbacks for the texture and borders, only if the bundled file is missing (never in normal play; the network log above shows none). Remove them if the privacy promise must hold even in that failure case.
- The four calibration tests listed in `CLAUDE.md` ("Known, not fixed") are still red.
