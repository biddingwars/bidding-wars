# Bidding Wars — project rules

A country-auction game. Random countries come up as lots, players bid
against each other, and population = points (1 point = 1 million people).
Live: https://biddingwars.github.io/bidding-wars/

## Flat file layout — read this before adding any path

Everything lives flat at the repo root. No `js/`, `css/`, `data/`, `img/`,
`fonts/`, or `vendor/` subfolders — `index.html`, `app.css`, `app.js`,
`engine.js`, `packs.js`, `banter.js`, `pack-countries.js`, `pack-capitals.js`, `CAPITALS-SOURCES.md`, `globe.js`, `us-view.js`, `us-map.js`, `us-map.webp`, `us-ak.webp`, `us-hi.webp`, `NOTICE.md`,
`platform.js`, `sound.js`, `fx.js`, `sw.js`, `manifest.json`, every icon,
`globe-hero.webp`, `logo.svg`, `three.min.js`, `earth.jpg`, `countries-110m.json`,
`privacy.html`, `support.html` all sit at the root, referenced by plain
relative paths (`"app.css"`, not `"css/app.css"`).

This has broken things more than once: `sw.js`, `manifest.json`, and a font
stylesheet have all separately shipped with `css/`/`js/`/`img/`/`fonts/`
prefixed paths copy-pasted from an unrelated iOS-project layout, silently
breaking caching/icons because the files were never actually there.
If you add a new asset or reference a path anywhere, keep it flat and
double-check it against the real file list at the repo root.

The one exception is `test/` — dev-only (unit tests, the fixture pack, a tiny
static server, the contrast and UI-simulation scripts). The game never
references it and `sw.js` never caches it.

## `sw.js` — bump `CACHE` on every deploy that touches a cached file

`sw.js` serves cache-first. Any change to `app.css`, `app.js`, `index.html`,
`globe.js`, `us-view.js`, `us-map.js`, `us-*.webp`, `platform.js`, `sound.js`, `fx.js`, `engine.js`, `packs.js`,
`banter.js`, any `pack-*.js`, `globe-hero.webp`, `three.min.js`, `earth.jpg`, or
`manifest.json` is **invisible** to anyone with the site already loaded
until `CACHE` is bumped:

```js
const CACHE = 'bidding-wars-v49';   // increment this, every time
```

Forgetting this is the single most common mistake in this repo's history —
it's easy to ship a real fix and have it silently not reach anyone. After
bumping, the user has to fully close every open tab and reopen (not just
reload) before the new service worker takes over.

**The menu shows the release number** (small `v49` after the footer line) so the player can check they have the
latest build. It comes from `CONFIG.version` in `platform.js` and **must be bumped together with `CACHE`** (same
number); `test/version.test.js` fails if they differ. It is a constant, not stored data (privacy: still four keys).

Also: GitHub Pages deploys one run at a time, and a new commit cancels an
in-flight deploy. Commit once, wait for the green check, then commit again.

## No network at runtime for anything essential

Apple (and this project's own house rule) tests in airplane mode. Every
asset the game needs to actually play is bundled locally:

- `three.min.js` (vendored, matches the version `globe.js` was written against)
- every content pack (`pack-*.js`) — they load lazily, but must be in `sw.js`'s `SHELL` so they are cached for offline
- `earth.jpg` (the globe's satellite texture, NASA Blue Marble July at 4096×2048 since v44, see `NOTICE.md` — same file whether online or offline)
- `countries-110m.json` (map borders)
- `globe-hero.webp` (the menu's planet, also the results card's placeholder)
- `logo.svg` (the logo: a brass map pin holding a globe, a ripple beneath; the favicon, and the source the `icon-*.png` app icons are rendered from — v46, original artwork; the maskable icon is the same art scaled into the safe zone)
- sound is synthesised in `sound.js` with Web Audio — there are no audio files
- **no web fonts**: the UI uses the system stack only (see "Look and feel")

CDN URLs still exist in a few places (`globe.js`'s `BORDER_FALLBACK`,
`EARTH_TEXTURES`, `index.html`'s `loadThreeFallback()`) but only as a
last-resort fallback if the bundled file is ever missing — never required
for normal play. Online 1v1 is gated behind `CONFIG.online` in
`platform.js` (currently `false`) and shows a "Soon" toast instead of a
broken flow — don't flip it on without a real backend; a mode that opens
and fails is an App Store rejection under Guideline 2.1.

## Privacy

No accounts, no sign-in, no analytics, no tracking, no ad SDK, no
third-party SDKs of any kind. Exactly five things are stored, locally on
device only, via the `Store` helper in `platform.js`:

- `lang:v1` — chosen language
- `theme:v1` — appearance: only `light` is ever stored. The app is **dark by default,
  whatever the phone is set to**; absent means dark. Removed again when set back to dark.
- `record:v1` — record vs the bot. One value, one record per pack:
  `{ v:2, packs:{ countries:{…}, … }, last:'states' }` (`Engine.REC_KEY`; the original flat
  record migrates into `packs.countries` on first read). `last` is the pack picked last, so the
  menu reopens on it (iOS discards the page when you switch apps; without this the menu fell back
  to Countries and looked as if the States record had vanished). It is absent until a pack is picked. Adding a pack adds
  nothing to what is stored beyond its own counters inside this one value.
- `name:v1` — the last-entered player name
- `settings:v1` (v45) — the Settings page: a small JSON of only the choices that differ from the defaults (`Engine.stringifySettings`; all defaults = the key is absent): `cur` (currency id), `aggr` (bot style 0-4, default 2),
  `tz` (text step), `motion` (`reduce`), `shapes`, `fair`, `confirm`, `quiet`. Nothing else, no history. `Engine.parseSettings` drops anything unknown.

- `log:v1` (**v49, optional, owner request "for the time being"**) — the game log: only exists if the player switched on Settings → "Record my games" (off by default; `settings:v1.log`). A JSON array of the last 100 finished **solo** games (`Engine.gameLog` / `addToLog` / `parseLog`, capped at 1.5 M characters): per game the pack, level, lots, budget, the bot's hidden temperament and style step,
  and per lot every raise / pass `[seat, 'r'|'p', amount]`, the winner and price, the bot's secret walk-away limit (`walk`), whether the lot was a decisive (all-in) one (`dec`), the money left; no names, no network. The engine only notes this when the app sets `S.trace = []`, and a test proves a traced game plays exactly like an untraced one.
  Export = Settings → Export (a sheet with the text to copy), Clear log, and Delete all data removes it. It is a **sixth value, but never present by default**, so the "five values" statement in `privacy.html` and the privacy screen carries the sentence about it in all five languages. Meant to be removed when no longer needed.

All five (plus the optional log) are described in `privacy.html` and the in-app
privacy screen (`privacy()` in `app.js`, `privP1`–`privP4` strings, in all
5 languages) — these must always agree with each other and with what
the code actually stores. The "Delete all data" button (also in
`privacy()`) must clear all of them (`settings:v1` and `log:v1` included, and `SET` reset in memory); this has drifted out of sync before
(name persistence shipped without updating the wipe flow or the copy — fixed,
but watch for it happening again with any future locally-stored value).

## Five languages

`en`, `de`, `it`, `es`, `fr`. Every user-facing string goes through
`t('key')` against the per-language objects in `app.js` (search `en:{`,
`de:{`, etc.) — never hardcode UI text. Country names go through `cname(c)`,
not the raw English name, since each pack item carries a localised `name`
object (`Engine.itemName`).

A pack with a non-euro currency (US States: `$`) says so in **every** language:
`t()` rewrites `€` amounts to the pack's symbol and `STRP` in `app.js` overrides
the lines that differ for that pack (`rivalDesc`, `budgetNote`, `rulesP1/P4/P5/P6/P7/P8`, `unsoldNote`, `footer`). All three packs have an entry (Capitals: euros and its own wording, like Countries): Countries
keeps euros but has its own budget list (per level) and the same $1-walkover and luck-heavy wording as States. Money on screen goes through `money()` →
`Engine.formatMoney` (US States: `$1,234`, Intl grouping). `test/browser.test.js`
fails if the States screens contain `€`, "euro" or "country" in any language.

## How the game works

- Bidding opens at €1 on every lot. Players alternate: raise, or drop out.
- Drop out and whoever holds the top bid buys it at that price.
- Budget. Countries: a table per level and lot count — Medium and Expert €10 per lot (€50 / 100 / 150 / 200 / 300 for 5 / 10 / 15 / 20 / 30 lots),
  Beginner half of that (€25 / 50 / 75 / 100 / 150; see "Countries"). US States: a budget *table* by lot
  count ($20 / $35 / $50 / $70 for 5 / 10 / 15 / 20 lots since v43 — about $170 for all 50 states, one dollar per million people for the two players together; **States stops at 20 lots since v40**, see "The stingy-player exploit"). Money is deliberately scarce in both —
  see "Economy and bot".
- Default 10 seconds per decision; timeout = automatic drop out.
- The opening €1 bid rotates seat by seat each lot.
- Seat colours are fixed for the whole auction: seat 1 red, 2 black, 3 blue,
  4 green.
- Population reveal: no winner is named until every redaction bar is
  lifted (`finish()` in `app.js`) — don't short-circuit this.
- Efficiency (€ per million people) is scored alongside raw points.

## How the bot works

This is the *original* bot (engine `botDecision` for a pack without a `bot` block: the test-only August Countries pack and the fixture pack).
US States and Countries run the extended bot in "Economy and bot" below, which keeps the walk-away roll, the randomised step, the +1 rule and rank-based valuation described here.

- A pack may replace the bands with its own smooth curve by defining
  `priceTable(items) → Map(id → {ideal, max})` (US States does; see below).
  Everything after pricing — `botCeiling`, the reserve, the +1 rule, the random
  raise step — is identical for every pack.
- Otherwise it prices each item from the pack's percentile `bands` (`pack-countries.js`;
  logic in `engine.js` `priceTable`). Items are ranked 1 (smallest value) to N
  (largest); the band is chosen by `rank / N`, and each band sets an `ideal`
  and a `max` rate per unit of value (€/million people for countries).
  `test/golden-countries.json` pins every country's ideal and max price to the
  original values — a change to the bands or the percentile maths fails
  `node --test` until the golden file is deliberately regenerated.
- `botCeiling(c)` rolls a random walk-away limit (`walk`) between `ideal`
  and `max` for that lot — absolute; beat it by €1 and the lot is yours.
- Outside the closing three lots it keeps €1 in reserve per remaining lot,
  so it can't bankrupt itself early (`Engine.botDecision`).
- If no rival can afford the next bid, it raises by exactly +1 — it never
  overpays when uncontested.
- When contested, its raise step is `price × (0.12 + rnd(15)/100)` —
  re-rolled on every single raise (12%–26% of price). This used to be a
  fixed `price × 0.18`, which made its drop-out point learnable after
  enough games — keep it randomized if you touch this again.

## Look and feel — "Nocturne"

Dark glass with brass gold is the default; its colours are design direction A's warm near-black (page `#0E0D0B`, cards `#1C1B17`/`#242320`, ivory ink `#F6F2E9`, brass `#E3B35A`) — **no blue in the dark theme** (the earlier blue-violet felt arcade-like). `ink2`/`ink3`/`danger` are a touch lighter than direction A's own so the contrast test passes; "Daylight" is the light twin. The
whole look is **design tokens** at the top of `app.css` (`:root` = dark,
`:root[data-theme=light]` = light; `<html data-theme="dark">` is set in `index.html` so the first paint is already dark).
Every theme difference is a token — never write a rule for one theme only, and
never hardcode a colour in a component. The theme does **not** follow the phone: it is dark unless the
toggle (`#theme`, dark ↔ light) chose Daylight, which is stored in `theme:v1`.

- **Brass gold** is the one accent: `--gold1`/`--gold2` (gradient), `--goldink`
  (gold *text*, darker in light mode), `--on-gold` (text on gold buttons).
  Seats: 1 red, 2 black (drawn as dark slate so it reads on dark), 3 blue,
  4 green (`--seat0..3`, white initials on all of them).
- **Readable text is enforced**: `test/contrast.test.js` reads the real tokens
  from `app.css` and fails if any text token drops below 4.5:1 on any surface it
  can sit on (page, its blobs, glass, bright glass, tints, sheets). Change a
  colour → run `node --test test/contrast.test.js`.
- **System fonts only.** `--font` is `-apple-system … system-ui …`; titles and
  numerals use `--round` (`ui-rounded` first). Do not bundle or hotlink fonts
  (SF is not redistributable) and do not add a `fonts.css`. Numerals use
  `tabular-nums`. Most text sizes are px (only the base is rem), so the optional larger text step uses `zoom` on the menu, results and sheets (see "Settings"); auction geometry is not scaled.
- **Secondary screens are sheets** (`sheet()` in `app.js`: record, privacy, how
  to play, language, setup, confirmations via `ask()`). A sheet traps focus,
  closes on Escape/backdrop, makes `#app` `inert`, and pauses the decision clock
  (`holdClock`).
- **Layouts.** Phone portrait is the base; `@media (min-width:760px) and
  (min-height:520px)` is the iPad layout (two columns on menu/auction/results);
  `@media (orientation:landscape) and (max-height:519px)` is a phone on its
  side. Pick new breakpoints by real content size, never by sniffing devices.
  The structure is `.menu-grid`, `.aud > .aud-l + .aud-r`, `.res2 > .r-l + .r-r`;
  they are `display:contents` on phones, so a second *layout option* (the
  proposal's "Galerie") can be added by restyling the same DOM instead of
  rewriting `app.js`.

**The auction fits one screen, no scrolling, on every device, portrait and
landscape.** This is a hard product requirement. On phones `.stage` is a size
container (`container-type:size`) that takes whatever height the nav, players and
dock leave, and the ring sizes itself from `cqh`/`cqw` — there is no magic
"minus 520px" number. Short screens (`max-height:640px`) get a compact tier.
Country names are clamped to two lines and scaled by length (`.n1/.n2/.n3`); the
taunt is a one-line ellipsis caption. Keep new content inside that budget and
re-run the fit check: `test/browser.test.js` ("the auction never scrolls") sets
the worst case (long names, 4 seats, 3-digit price, long taunt) at nine sizes.

**Motion** lives in `fx.js`: springs sampled into WAAPI keyframes, only
`transform`/`opacity`, `Reduce Motion` makes everything land instantly, and a tap
skips the gavel moment. The gavel timeline is ~1.1 s: wind-up 200 ms, swing
140 ms, impact at 420 ms (sound scheduled on the audio clock, picture on the
first frame at/after it, haptic with it), SOLD plate, rings/sparks/dust, the card
flies to the winner's collection, Next appears. Deal quality scales it:
below the bot's ideal price = gold burst, fair = lighter, overpaid = subdued.
**The results reveal is staged on purpose** (`reveal()` in `app.js`): verdict
spring → points count-up → sound + confetti → globe card → the live globe is
built last, after the confetti, because doing all of it in the same frames made
the old end screen stutter. Blur on glass is dropped while confetti falls
(`.celebrating`). Don't merge those beats back together.

**Sound** is `sound.js`: a layered Web Audio synth (knock, whoosh, ticks, raise
that climbs a whole tone per raise, drop thud, chime, fanfare, sting) through one
master gain + compressor. `test/browser.test.js` renders every voice offline and
fails on clipping, NaN, silence or a loudness spread over 40x. Audio starts on the
first touch and resumes after an iOS interruption; mute (`Snd.setMuted`) also
gates haptics. iPhone Safari has no web haptics API — `Haptics` fires only on
Android web or a native shell.

The decision clock (`startClock`) is a smooth ring that waits while a sheet is
open and ignores a frame gap over 250 ms (a locked phone) so a background never
costs a lot. Hot-seat games ignore taps for 260 ms after a turn passes so a
double tap can't land on the next player.

Lessons from the first iPad test (keep them): the document is locked
(`html,body{position:fixed}`; iOS Safari ignores `overflow:hidden` on body);
the sold overlay has no full-screen blur (it stalled iPad GPUs) and **Next lot
is revealed by a class and a CSS transition, never by an animation that could
leave it invisible**, with a 2.6 s watchdog that finalises the moment; the
globe's `.glabel`/`.gload` rules live in `app.css` (they were lost once, which
stacked the country names down the page); a plain wheel/scroll over the globe
belongs to the page (only ctrl+wheel/pinch zooms); the results screen must fit
iPad landscape without scrolling.

## Settings (v45)

The gear on the menu opens one sheet (`settingsSheet()` in `app.js`; choices live in `SET`, stored as `settings:v1`, parsed and written by `Engine.parseSettings` / `stringifySettings`, so they are unit-tested in `test/settings.test.js`).

- **Currency** (`SET.cur`, 20 currencies in `Engine.CURRENCIES`, Automatic = the pack's own): changes only how money is *written*. Numbers never change and there are no exchange rates (a $70 budget is shown as 70 kr or CHF 70).
  `money()`, `cur()`, `Engine.formatMoney(pack, n, curId)` do the numbers; `writeIn()` in `app.js` rewrites the amounts inside texts ("€50", "50 €", "$20") and the words euro / dollar ("one euro" -> "£1", "euros per million" -> "£ per million")
  in all five languages. Money already formatted must never go through `t()` again (a symbol like `C$` would be rewritten twice): fill such values in after `t()` with `.replace('{p}', …)`. Picking the pack's own currency changes nothing.
- **Bot style** (`SET.aggr`, 0-4: Cautious, Careful, **Balanced** = default, Bold, Fierce): the slider forces a temperament (`Engine.AGGR_TEMPER`); Balanced is the usual hidden 25/50/25 draw. Careful and Bold are the calibrated `conservative` / `aggressive`;
  Cautious and Fierce are those two pushed twice as far (`pickTemper`: spread doubled, raise-step and big-item factors squared, reserve cap halved) and are never drawn at random. **Only Balanced counts for the record**: any other step, or the fair price on screen, makes
  the solo game a practice game (`S.practice`, `Engine.isPractice`): it plays normally, `recordGame` is skipped and the results show "Practice game". Measured on the real engine (300 games a cell, creeper / fair-value / best fixed cap): States 10 lots
  Cautious 51 / 54 / 54, Careful 37 / 40 / 40, mix 35 / 39 / 44, Bold 37 / 39 / 47, Fierce 41 / 42 / 57; States 20 lots Cautious 46 / 51 / 55 … Fierce 28 / 30 / 59; Countries Medium 10 lots 29 / 52 / 60 … 25 / 55 / 59; Capitals Medium 10 lots 16 / 44 / 61 … 17 / 43 / 50. The outer steps are
  a style, not a difficulty ladder: a cautious bot is easier for a creeper, a fierce bot overpays but its limit is easier for a fixed-cap player; none of it touches the calibrated default.
- **Accessibility**: *Reduce motion* (`FX.forceReduced` plus `html[data-motion=reduce]` in the stylesheet, on top of the phone's own setting), *Seat shapes* (`html[data-shapes="1"]`: a circle, square, diamond or triangle next to each seat colour, orbs and the "top bid" dot),
  *Text size* (`html[data-tz]`: `zoom` 1.12 / 1.25 on the menu, results and sheets; **never on the auction screen**, which keeps its fitted pixel sizes — most text sizes in `app.css` are px, not rem). **Small (`tz: -1`, v48, owner: "an SE user could play without scrolling")**: `zoom` 0.70 plus a smaller globe on the results (`html[data-tz="-1"] .gl .globe`); measured with `node`-driven Chromium, menu, game setup and results of an iPhone SE 2/3 (375×667) need no scrolling in all three packs (`test/browser.test.js`), the 1st-generation SE (320×568) still scrolls a little in setup (about 120 px inside the sheet) and results (about 50 px). The auction fits every size by itself. At 0.70 tap targets are about 31 px: it is opt-in.
- **Game log** (v49): *Record my games* switch, Export (copyable text) and Clear log; see "Privacy" for what is stored. Tests: `test/gamelog.test.js`, `GAME LOG:` in `test/browser.test.js`.
- **Practice helpers**: *Confirm before dropping out* (an `ask()` sheet), *Quiet bot* (`showTaunt` returns early), *Show the fair price* (a `.fairp` line under the holder; reveals the lot's value, so it makes the game a practice game).
- Language and the Light/Dark switch appear on the page too (their own stored keys are unchanged).
- Tests: `test/settings.test.js` (parse / stringify / practice / currencies / five steps on every pack / whole games per step), the `SETTINGS:` tests in `test/browser.test.js` (all five languages for the currency, practice flow, helpers, the auction fit with every helper on at four sizes,
  privacy text, wipe). Not done on purpose: converting amounts at exchange rates, a free (continuous) aggression slider (the bot's limits sit in a narrow calibrated valley), Sound/haptics and game-default settings (not asked for).

## US States pack

`pack-states.js` is **generated** by `test/make-pack-states.js` from two committed
inputs — edit those, never the pack: `test/census-nst-est2025.json` (official
Census Bureau Vintage 2025 resident population, 50 states only, no DC/territories;
source/vintage/release/licence are fields in the file and in the pack header) and
`test/states-content.json` (names incl. de/it/es/fr exonyms, USPS codes,
Census-boundary centroids, taunts, fun facts).

- **Drawing.** Lots are drawn *without replacement*, every state equally likely, by
  **systematic sampling** (`economy.sampling`, `Engine.drawSystematic`: sort by population,
  random start, fixed interval, then shuffle the order) so the total value of a round
  swings far less (10 lots: SD 18.6% instead of 31.8%); every state keeps exactly the
  chance n/50. **Lot options are 5/10/15/20 only since v40** (30/40/50 and "All 50 states" were removed: a fixed-cap player beats the bot there, see below; the engine, `economy.sampling` and the tests can still draw any count). In the old "All 50" option every
  state comes up exactly once, shuffled. (Measured: every state keeps the chance n/50, but two states of similar size — KY and LA — never share a round, 0.000% against 3.7% for independent draws;
  a fully random draw would widen the swing of a 10-lot round's total value from SD 18.6% to 31.5%. Countries switched to `'random'`; States stays systematic until the bot is re-tuned for the wider swing — set `economy.sampling` in `test/make-pack-states.js` to try it.) No difficulty levels (`levels` has one
  entry and the setup hides the section when there is only one).
- **Pricing.** Since v43 (owner: "the prices are way too high for way too little population") prices run at the **original scale** (`economy.priceScale: 1`; an average
  lot is $10, about $1.5 per million at the fair price: CA $57, TX $46, FL $34, NY $29, the smallest states $1–2; it was 3×: lot $30, CA $173).
  Ideal = the state's share of the 50-state total × (10 × priceScale × 50), in whole dollars
  (floor $1); a scale factor `k` makes the whole-dollar ideals sum to 50 average lots.
  `max` = ideal × a multiplier that eases from about 2.0 (smallest) to 1.35 (largest). Both
  are non-decreasing in population. `test/golden-states.json` pins all 50;
  `test/states.test.js` checks the targets (×3 of CA 45–60, TX 35–48, FL 26–35, NY 22–30).
- **Currency.** USD in every language (see "Five languages").
- **Economy.** See the next section.
- **Fun facts.** `pack.facts[id] = { en }`, one per state, shown on the SOLD screen,
  in the results "Fun facts" sheet and (since v43, `pack.captionFacts`, owner: "put the fun facts there instead") as the caption under the lot while it is on the block — in US States the rival's taunts and its drop-out / win one-liners are not shown at all (`showTaunt` returns early; the caption wraps to at most three lines, `.taunt.fact`; Countries and Capitals keep their taunts); must not hint at population or rank;
  other languages fall back to English. `FACTS-SOURCES.md` lists every fact with
  where it was checked — **all 50 were checked online (Oct 2026)**; four were reworded after the first pass.
  Keep each row's status honest (`test/states.test.js` enforces the two allowed wordings and that the header's count matches the rows); a fact added later starts as "general knowledge only" until looked up.
- **Look (only while States is the pack on screen).**
  - *Flag backdrop*: `body.pk-states` (set by `syncPackTheme()` in `go()`) turns on two
    fixed pseudo-element layers in `app.css` — stripes + canton, and the stars as a mask; straight (never tilted), sized from `--fw` so it covers the screen width —
    tokens `--flag-red/-white/-blue/-star` and `--flag-op`. `test/contrast.test.js` checks all text
    tokens at full flag strength in both themes; retune the flag → run it.
  - *Results map* (`us-view.js`, data in `us-map.js`): the contiguous US on satellite-style
    imagery registered to Census outlines (Albers equal-area conic), the winner's states in gold with
    pins and abbreviation pills, the crowded Northeast as callouts in a right margin, and Alaska /
    Hawaii insets **only when the winner owns them**. (On the menu the world globe is shown only for Countries; with States selected the flag backdrop stands alone, and a US flag emoji marks the tile.) Labels that cannot fit without overlapping are
    dropped (the pin stays). The pack opts in with `map: 'us'`; other packs keep the globe.
    **Regenerate** with `test/build-us-map.js` (dev-only, needs `us-atlas topojson-client d3-geo sharp`);
    it takes any equirectangular world image — the imagery in the repo is NASA Blue Marble Next Generation (July, 21600×10800;
    exact file, checksum and credit text in `NOTICE.md`; July because December's snow hides the gold highlight).
  - *Celebration colours*: the red accent, the second (dark blue) button, the SOLD slab (white lettering on a red gradient), the burst rays and sparks and the confetti (red, white and blue) are tokens on `html[data-pack=states]`
    (`--gold1/2`, `--btn2a/b`, `--slab1..3`, `--rays`, `--spark`, `--conf`), all contrast-tested; the results map keeps the winner's states in gold (`--map-edge`) for contrast on the imagery.
  - *Win sound*: `Snd.eagle()` (synthesised raptor cry) replaces the fanfare on a States win; a loss
    keeps the sting. It is not a recording — in films the "eagle" cry is a red-tailed hawk.
  - *Credits*: Privacy → "Credits & licences" (`credits()`, 5 languages) and `NOTICE.md`. Add every
    new asset to both.
- **Selection.** The pack picked on the menu is `SELPACK`; it is remembered as `last` inside
  the one `record:v1` value (privacy: still exactly four keys, and the copy says so). The record is per pack inside
  `record:v1`.

- **The stingy-player exploit (found and mostly closed in v36).** `node test/exploit.js states all` showed that a player who bids "+1 up to 0.8× the fair price" and otherwise passes beat
  the old States bot in long rounds (best blind 76 / 99 / 100 / 100% at 15 / 20 / 30 / 40 / 50 lots; 46% at the default 10). Why: the bot's walk-away swings from lot to lot (a roll between ideal and max),
  so it wins the lots on which it pays the rival's constant limit and hands the rest to the rival at its own low draws; it also spends first and the stingy player then takes the big states for a
  broke rival's last few dollars. Every state costs the same per million people, so the Countries "efficiency" block has nothing to rank here.
  **Fix: a narrower roll and lower limits for 15+ lots** — `bot.rollSpan: 0.4` (the roll uses the first 40% of [ideal, max]), `bot.noise: 0.15`, `limitMul` 0.72 / 0.62 / 0.6 / 0.63 / 0.68 for 15 / 20 / 30 / 40 / 50 lots
  (5 and 10 lots keep 1.0 / 0.925). Result on the *coarse* ratio grid (0.6 / 0.8 / 1 …): best blind strategy 42 / 37 / 59 / 55 / 53 / 53 / 53% at 5 / 10 / 15 / 20 / 30 / 40 / 50 lots.
  **v43 (owner: $20 / $35 / $50 / $70, prices about a third of what they were) — the ≤ 20-lot rounds are now clean on the fine grid.** With `priceScale: 1` the budget is about 0.35 of a round's fair value at 10-20 lots, which puts
  the bot's walk-away limit (`limitMul`) where a fixed cap no longer has a window: `node test/exploit.js states all 400 4000` (fine ratio grid, 56 strategies) gives best blind **49.3 / 41.1 / 46.9 / 47.3%** at 5 / 10 / 15 / 20 lots (v42: 44 / 39 / 59 / 64) and the scan
  of `limitMul` shows why (20 lots: 0.45 → 70%, 0.5 → 55%, **0.55 → 50%**, 0.6 → 57%, 0.7 → 76%: a narrow valley, found per lot count with a scratch scan, then re-measured). Creeper (+1 over the bot) wins 43 / 35 / 21 / 27% (mix), fair-value B 42 / 38 / 24 / 30%, smart C 39 / 33 / 20 / 24%,
  every temperament inside 18-46%; 150,000 fuzz games, 0 failures. The long-round warning below still holds for 30-50 lots, which are not offered; at the new scale the same valley may exist there, but it has not been measured.
  **v40 decision (owner): States is limited to 20 lots; "if people want more we will have to find a solution". Even at 20 lots the 0.70× cap wins 64% (limit 60), accepted for now. CORRECTION (found after v39, not fixed): that "no cell above the limit" was an artefact of the coarse grid.** `test/exploit.js` now sweeps the fixed-cap player in steps of 0.05, and "+1 up to 0.70× the fair price" wins
  **64 / 73 / 82 / 99%** of the 20 / 30 / 40 / 50-lot States rounds (0.75× is nearly as good: 61 / 70 / 78 / 89%; 15 lots peak at 0.85× with 59%; 5 and 10 lots are fine, 42 / 39%). The fix above only moved the peak from 0.8× to 0.70-0.75×.
  Why it cannot be tuned away (measured, scratch harness): the winner of a lot pays the *loser's* limit, so a player whose constant cap sits just under the bot's mean walk-away (about 0.65-0.73× the fair price, falling through the round
  because of pacing) wins the lots where the bot's limit is lower at the bot's lower price and makes the bot pay the cap on the rest (50 lots: the cap player pays 0.57× fair per lot, the bot 0.73×). Over 40-50 lots that 5-10% discount is
  decisive, because "All 50" is the same 50 states every time and a long round has almost no luck. A completely constant bot (no roll, no noise, no pacing, no mood) is still beaten 91% at 50 lots by a cap just above its limit: there is always a
  window of width ≥ the bot's overhead. More noise makes it worse (`noise` 0.3 / 0.45: 100% at 50 lots, 87-92% at 30), less roll helps only at 15-30 lots (`rollSpan` 0: 49 / 58 / 97% at 15 / 30 / 50), smaller raise steps (stepMul 0.25-0.5) do nothing,
  removing pacing makes it worse (100% at 50), a "deny floor" (the bot never lets a lot go for less than the learned cap) is much worse (92% at 30, 100% at 50: the bot pays the cap on every lot and runs dry first), and a learned best-response
  (win by buying when the bot's money exceeds half of cap × value to come, otherwise push the rival up to its cap) still lost 96% at 50 lots (the cap estimate is biased by the bot's own raise steps). Countries does not have the problem
  (fine grid, 500 games per cell: worst Beginner 15 lots 58%, Medium 5 lots 62% against its 65% limit at 5 lots, Expert at most 40%), so what is needed is not another parameter pass on `pack-states.js` but either a different design for 30+ lots
  (e.g. a random draw so long rounds are not the same 50 states, which adds luck like Countries, or a rule change) or a bot that learns the rival's cap well enough to answer it.
  Costs (measured): the creeper wins 28 / 31 / 28 / 22 / 17% at 15 / 20 / 30 / 40 / 50 lots (was 15 / 11 / 7 / 5 / 4%; its share of the points stays under 51%), 42% at 5 lots and 26% at 10 (was 35 / 19);
  B and C win 16-35% from 10 lots; a ±10% budget now moves a reference player by 14-16 points at 30 lots (a slope, no cliff).
  Less random: the drop-out price of a mid-size state in a 30-lot round has SD 8-9% of the fair price (was 17%) and the most common price shows up in about 20% of games. A learner that remembers
  the bot's drop-outs still loses to the smart player by 18-29 points, so this is not exploitable the way the fixed-limit player was.
  Tried first and rejected (each measured): the Countries efficiency / decisive / creeperGuard blocks with parameter searches of 150+ steps, stronger pacing, a rival-learning cap (and, after the correction above, a learned floor and a learned best-response), a per-lot house price when a rival
  cannot really bid, a minimum sale price, bidding by money lead, a reserve for the biggest state to come, matching the rival's raise size. None closed it.

### Economy and bot (`pack.economy`, `pack.bot`: US States and Countries)

Why: with budget = value of the pool, "+1 over the bot until it drops out" took 78% of the points,
won 100% of 30–50-lot games and left the bot 93% unspent; cutting the budget alone flipped it to a
knife-edge (50 lots: creeper 2% at 60% budget, 99% at 70%). Measured on the real engine with
`node test/economy.js`.

- **Budget = f × lots × average ideal price** (`economy.budgets` is the resulting table in dollars).
  f = 0.57 (5 lots) and 0.55 (10 lots) — so few lots that one state decides the round — then 0.40 (15),
  and **0.35 at 20 lots** — **replaced in v43** (owner: "for 50 lots everyone should have 170 USD, that is 1 USD per million population; adjust the other rounds", then "for cleanliness: 20, 35, 50, 70") by **$20 / $35 / $50 / $70 for 5 / 10 / 15 / 20 lots**
  (f = 0.40 / 0.35 / 0.33 / 0.35 of the round's fair value, since the price scale dropped to 1; before v43 $85 / $165 / $180 / $210). `validatePack` refuses a budget for the biggest lot option above 80% of the
  expected price of the four biggest states (midpoint of ideal and max, plus the bot's 15% premium): $70 against a cap of about $200.
- **End-of-round rule** (the walkover in `startLot`; both packs, since v37): when only one player has money left, that player takes **every remaining lot for $1 each** (free once their money is gone).
  Going all in is a deliberate risk: it hands the rest of the round to the rival. v36 and earlier sold the rest at 80% of the fair price ("house price", `economy.endgame { rule: 'house', price }`, which the
  engine still supports and `test/economy.js` can still use on a scratch pack); the owner asked for the $1 sweep back. Measured effect of the switch: almost none on the exploit search or the win-rate
  tables, because the bot keeps a $1 reserve per remaining lot and so never goes broke first; the "+1 over the bot" creeper now bankrupts itself into the sweep, so the knockout jump is worth about the same
  as no knockout (`knockout (b)` allows 3.5 points of difference).
- **Bid buttons** (`economy.bidSteps`, `Engine.bidSteps(pack, price)`): the five raise buttons follow the
  *current price* (never the item's fair price, which would leak its size): price < 12: +1 +2 +5 +10 +25;
  < 40: +2 +5 +10 +25 +50; < 100: +5 +10 +25 +50 +100; else +10 +25 +50 +100 +200. They are relabelled when
  it becomes the human's turn, so they never change under a thumb mid-turn. **Typing grace**
  (`economy.typingBonus`, 4 s): focusing the custom-amount field adds seconds to the decision clock once per turn.
- **The extended bot** (`pack.bot`, `botDecisionExt` in `engine.js`; every random choice goes through `S.rng`, so a seed
  reproduces a game; a pack without a `bot` block keeps the original `botDecision` path byte for byte). Tables such as `economy.budgets`,
  `limitMul` and `temperaments.spread` may be per level: `{ beginner: {5:…}, medium: {…} }` (`Engine.byLots(table, lots, level)`); "the biggest items"
  (`premium`, `bigRank`) and the average price used for pacing (`Engine.avgIdeal(pack, level)`) are those of the level's own pool. Parameters:
  - `limitMul[lots]` — calibration multiplier on every walk-away roll (States: 0.8 / 0.55 / 0.55 / 0.55 for 5 / 10 / 15 / 20 lots since v43; 1.0, 0.925, 0.72, 0.62 for 5…20 lots in v40-v42, with 0.6, 0.63, 0.68 for 30-50; before that 1.0, 0.925, 0.9, 0.975, 1.075, 1.125, 1.135).
  - `premium { top: 4, pct: 0.15 }` — the four biggest items get +15% on the roll.
  - `pacing { gamma: 0.5, lo: 0.7, hi: 1.5 }` — walk-away × (budget ÷ value left ÷ the opening budget ratio)^gamma, clamped: the bot spends evenly.
  - `knockout { kappa: 1.5 }` — K = the rival's budget, the price it can no longer top. At its own limit, with the rival holding
    the bid and K affordable after the reserve, the bot jumps to K (K+1 if the rival holds K) when (sweep) it can pay K on every lot left,
    or it can afford m = ⌊budget/K⌋ knockouts and this lot is among the m most valuable left, or the lot is decisive
    (puts it ahead / the lead out of reach) and K ≤ kappa × the lot's max. A rival who folds early costs nothing extra.
  - `mood { k: 0.25, up: 0.2, down: 0.15 }` — after half the round up to +20% when behind, −15% when well ahead.
  - `temperaments { weights: [25, 50, 25], bigRank: 10, spread[lots], conservative, aggressive }` — drawn once per game from the seeded
    rng and never shown. The walk-away spread is symmetric around the balanced bot: ±6% (5–10 lots), ±5% (15), ±4% (20–40), ±3.5% (50).
    Conservative: raise steps ×0.75, ×0.95 on the 10 biggest. Aggressive: steps ×1.25, ×1.05 on the 10 biggest, reserve capped at $3 (spends deep).
    `Engine.newAuction({ …, temper })` can force one (the harness does).
  - `reserve` is the original one ($1 per remaining lot outside the last three).
  - `rollSpan` (States) — the walk-away roll uses only the first share of [ideal, max] (0.4); see "The stingy-player exploit" above. Absent = the full range, as for Countries.
  - `wallet { lo: 0.7 }` (Countries) — when the walk-away reaches into the top of the bot's purse (above `lo` × what it can spend), the ceiling is
    a random 70–100% of what it can spend (one roll per lot), so a giant that costs about its whole purse never ends at "wallet minus reserve" to the euro.
  - `noise: 0.45` (Countries) — a per-lot triangular jitter of ±45% on the walk-away (SD about 18%); it is what keeps the Learner from reading the bot.
  - Countries uses `knockout.kappa: 0.8` (States 1.5): with Countries' wider price range a larger kappa made the bot pay a rival's whole wallet for lots
    that were not worth it, which the creeper then exploited (A 24% instead of 11% at Medium, 10 lots).
- **Calibration targets** (the frozen August Countries *Medium*, in `test/baseline-august.json` — 10 lots: creeper A 9.5%, fair B 37%, smart C 39.6%, each ±10):
  the balanced bot alone is inside the band for B and C at every lot count and for A from 10 lots; each temperament keeps B and C
  between 15% and 75%; the 25/50/25 mix stays inside the band; the creeper takes at most 60% of the points against each
  temperament (it gets 44–49%); ±10% budget moves no reference player by more than 15 points. **5-lot rounds cannot meet the creeper
  target** (one state is 25–40% of the points; A ≈ 35%) — the rules text says short rounds are luck-heavy.
- **Re-running the harness**: `node test/economy.js [games] [seed]` prints Countries' three levels (per temperament, against the frozen August numbers) and the full US States table
  (A creeper, B fair-value, C smart with a $1.50 reserve = 5% of an average lot, D rationer, and C with $1 / $2 / $3), per
  temperament and mixed. Change `limitMul`/`spread`/`budgets` in `test/make-pack-states.js`, regenerate, re-run, keep the targets.
  `node --test test/economy.test.js` is the loose regression version. The calibration numbers in `limitMul`/`spread` were found with a
  scratch copy of the loop and then re-measured on the real engine (largest difference 2.1 points).

### Countries (`pack-countries.js`: smooth prices, per-level budgets, the extended bot)

Why: only Medium resisted the "+1 over the bot" creeper (August, 10 lots, 3,000 games, frozen in `test/baseline-august.json`): creeper wins Beginner 85%,
Medium 9.5%, Expert 65%. The reason is the ratio budget ÷ (lots × average fair price): 1.05 (Beginner), 0.38 (Medium), 0.81 (Expert). The August
bands also had hard edges (185 pairs where a bigger country was cheaper; Vietnam 51 vs DR Congo 27, USA 86 vs China 71).

- **Giants (v37, on purpose)**: the owner found USA, Brazil and India too cheap (a player who went all in early on the giants beat the bot). USA, Indonesia, Pakistan, Nigeria and Brazil now cost about 40% more
  (USA 102, Indonesia 94, Pakistan 88, Nigeria 84, Brazil 78) and **India and China are "all in"**: about 158 (max 229), more than a whole budget at 10 lots (Medium 100), so whoever gets one of them has practically won
  and pays about the rival's whole wallet. Average price per lot vs August: Medium +17%, Expert +13%, Beginner unchanged; budgets were not changed. Measured: Medium creeper 53 / 27 / 13 / 9 / 8% at 5-30 lots,
  B/C 61 / 51 / 40 / 35 / 29%; no exploit-search cell above its limit (worst Medium 5 lots 64.4 against 65).
- **Prices**: one smooth monotone curve (`priceTable` in the pack: monotone cubic through log-log anchors, whole euros, minimum €1); the bot's ceiling is
  ideal × a ratio easing from 2.0 (tiny) to 1.45 (giants), forced non-decreasing. 0 inversions. Expected price per lot vs August: Beginner −2%, Medium +17%,
  Expert +13% (the v37 giants included). Fifteen countries move by more than 25% (DR Congo, Philippines, Egypt, Japan, Mexico, Ethiopia, Russia, Bangladesh, Brazil, Nigeria, Pakistan, Indonesia, China, India up; Trinidad and Tobago €2→€1);
  the full old-vs-new table is `test/countries-prices-old-vs-new.md`, every price is pinned in `test/golden-countries.json` (regenerate on purpose with
  `node test/make-golden-countries.js`). The August prices live on in `test/golden-countries-august.json`.
- **Budgets** (`economy.budgets`, per level, since v39): the clean table **€50 / 100 / 150 / 200 / 300** for 5 / 10 / 15 / 20 / 30 lots at Medium *and* Expert, and **half of it (€25 / 50 / 75 / 100 / 150) at Beginner**,
  whose European countries are cheap (average €9 per lot against €31 at Medium and €14 at Expert). Before v39 Beginner and Expert had their own non-round tables (f × lots × the level's average price, e.g. 25 / 50 / 55 / 65 / 100).
  The owner asked for the clean numbers; measured consequences: a flat 300 at Beginner buys the whole pool (the "+1 over the bot" player won 88% of 30-lot rounds and the best exploit 94%), a stronger bot only moved that into
  "a fair-price player wins 0-1%", so Beginner got half; Expert needed a stronger bot (limits ×1.5-2.2 of the v38 values). Budget as a share of the round's fair value at 30 lots: Beginner 54%, Expert 71%, Medium 32%.
  `validatePack` still enforces the top-5 rule per level (budget ≤ 80% of the expected price of the level's five biggest, midpoint of ideal and max plus that level's premium: 675 / 210 / 675 against 300 / 150 / 300).
  Lot options stay 5 / 10 / 15 / 20 / 30 (no 40).
- **Bot** (`pack.bot`): `premium { top: 5, pct: { beginner: 0.5, medium: 0.15, expert: 0.15 } }` (Beginner's bot pays 50% more for its five biggest countries, as the owner asked, so it fights for them), per-level `limitMul`, `knockout.kappa`, `noise`, `wallet`, the States pacing / mood / temperaments (25/50/25,
  ±6% / 6 / 5 / 4 / 4% by lot count), plus three blocks added by the bug-test round (all per level, see `lvVal` in `engine.js`):
  - `efficiency { gamma, lo, hi, pick }` — a knapsack shadow price: the walk-away is scaled by (the lot's points per euro ÷ the best points per euro the bot can still buy)^gamma,
    clamped to lo…hi. Before this the bot priced lots by a curve, under-bid giants and over-paid junk, and a human who simply went all-in on the efficient lot won 70–99%.
  - `decisive { share }` — a lot worth at least `share` of the value still to come is decisive: no reserve, ceiling = the whole purse, and when the bot holds at least the
    rival's money it jumps straight to the rival's whole purse (K or K+1). Consequence (accepted trade-off): on a decisive lot the price *is* a wallet, so it is not random.
  - `creeperGuard { raises: 3 }` — a rival who raised ≥ 3 times and never passed while able to pay is a +1 creeper; the efficiency factor is then floored at 1 so the creeper keeps losing.
  - Small prices: when contested at €3–11 the +1 step becomes +2 in 40% of raises (`bot.parity: false` turns it off); without it a +1 bot against a +1 rival always stops on the same parity.
  End of round, bid buttons and typing grace are the States ones. An unknown level id falls back to the pack's default (`validLevel`; it used to give NaN budgets).
- **Drawing** (`economy.sampling`): Countries uses **`'random'`** — every lot is drawn uniformly from the countries of the level's pool not yet used in the round, so every country,
  every *pair* of countries and every lot position is equally likely (Expert: 1/196 = 0.51% for lot 1, 1/186 = 0.53% for lot 11). `'systematic'` (the sorted, fixed-interval
  draw States still uses) gave every country the same *single* chance, but two countries of similar size never shared a round (0.000% against 0.235% for independent draws).
  **To revert, change `sampling: 'random'` to `'systematic'` in `pack-countries.js` and bump `CACHE`/`CONFIG.version`; nothing else depends on it** (the sampling test runs both modes).
  Cost of the random draw, measured at v35 (before the v37 giants and sweep): round value swings more (Beginner 10 lots SD 47%), so luck rises and every result moves toward 50%: Medium creeper 44 / 24 / 14 / 8 / 6% (was 28 / 15 / 11 / 8 / 5),
  fair-value players 49–54% at 5–10 lots (was 37–39), Expert creeper 40 / 33 / 25 / 16 / 14% at 5–30 lots. The exploit search is cleaner (no cell above the limit); `limitMul` was raised for
  Beginner 15/20 and Expert 10/15/20 (it cannot remove the short-round luck: ×1.45 on every limit moved the Medium 5-lot creeper by only 2 points).
- **Reference results** (real engine, v39: clean budgets, v37 prices and $1 sweep, `node test/economy.js countries 3000`, mix 25/50/25; win % of A creeper / B fair / C smart-€1, random draw), for 5 / 10 / 15 / 20 / 30 lots:
  Medium A 52.4 / 26.7 / 13.2 / 8.6 / 7.5, B 61.4 / 51.0 / 39.9 / 35.4 / 29.2, C 61.1 / 50.9 / 39.8 / 34.6 / 29.0.
  Beginner (easier on purpose, B/C above 50% from 10 lots) A 27.3 / 28.8 / 25.8 / 14.5 / 5.8, B 49.1 / 52.8 / 56.8 / 56.2 / 54.6. Expert A 36.6 / 33.2 / 24.9 / 20.3 / 10.3, B 40.2 / 35.6 / 32.7 / 32.0 / 28.3. The bot ends with 4-37% unspent against the creeper (Beginner 30 lots: 0.4%).
  The loose calibration test allows, against the frozen August Medium numbers, +17 (creeper +24 at 10 lots, +38 at 5; B/C +22 at 5): short rounds are mostly luck (the rules text says so), and at 5 lots a €50 Medium budget cannot buy a giant.
- **Accepted misses** (agreed): short rounds are luck-heavy; the creeper wins 27–52% of 5–10-lot rounds at every level and fair-value players win about 61% of 5-lot Medium rounds; Expert's pool is extremely skewed (median 9 M, India 1,451 M),
  so one lot decides a round — and with the random draw a mid-size country sits in a round without any giant about a third of the time, where it is decisive.
- **Bug-test round** (dev scripts, none part of `node --test` except the small slices):
  - `node test/fuzz.js [games] [seed] [pack]` — whole auctions with junk / random / creeper / passer / all-in / fair humans, bogus levels and lot counts, 3–4 seats, forced
    temperaments; checks exceptions, termination, NaN / non-integer / negative money, money conservation, lots sold twice or lost, a bot move the engine rejects, a rejected
    human move that changes state, reproducibility of a seed. `test/fuzz.test.js` runs a 600-game slice. Final runs: **150,000 games with the systematic draw, 100,000 with the random draw and 100,000 more after v37 (both packs), 0 failures** (≈1,050,000 in all).
    It found one real bug: an unknown level id gave NaN budgets (fixed by `validLevel`).
  - `node test/exploit.js [pack] [level|all] [games] [confirm]` — a family of ~40 human strategies (ratio, efficiency hunter, saver, hoarder, reader, all-in jumper, sniper, oracle,
    temperament reader); the best five are re-played on fresh seeds. Limit 60% (65% at 5 lots). August bot, same family: 70–99% for the best strategy in most cells.
    Final confirmed best blind strategy (v39: clean budgets, random draw, giants repriced, $1 sweep), Beginner 5/10/15/20/30: 49.9 / 53.9 / 57.4 / 58.0 / 57.3; Medium 64.4 / 58.3 / 51.1 / 46.1 / 49.7; Expert 46.3 / 47.0 / 45.5 / 47.1 / 45.0
    — **no cell above the limit**. (With the systematic draw three cells sat 0.3–2.3 points over it; the random draw's extra luck pulls every strategy toward 50%, so that is partly an effect of luck,
    not of a stronger bot.) The oracle (sees the lots to come, not available to a player) reaches up to 62%.
  - `node test/ui-sim.js 300 4` — 300 games through the real UI, 0 failures.
- **Unpredictability** (`node test/economy.js unpredictable`, `learner`; guarded in `test/countries-economy.test.js`): on one lot, same state, fresh seed, creeper rival: SD ≥ 15% of
  the ideal, no price in more than 20% of games, within ±1 of the median in at most 25% (ideal ≥ 25) / 40% (10–24), even/odd 50 ± 3 above €5 — measured on ordinary mid-size lots
  (ES, IT, DE, FR, TH, AR: 49.8–50.8% even). **Known exceptions, by design:** (1) decisive giants (e.g. Nigeria at Medium: the price is the rival's whole purse in ≈ 75% of games;
  Expert Germany ≈ 64%) — predictable, but the only way to win it is to hold more money than the bot, so reading it gives nothing; (2) inefficient small lots (Zimbabwe at Medium:
  the bot will not pay more than €3–8; 65% of drop-outs are even) — a player who learns this saves a few euros on a lot worth little. Wallet-bound non-decisive lots keep the 70–100%
  roll (≤ 30% at wallet-minus-reserve). The Learner E (remembers the bot's drop-outs per country over 200 games) must not beat the smart player C by more than ~8–12 points.
- **Frozen reference**: `test/pack-countries-august.js` (test only: the same items with the August bands, flat budget and the original bot) re-derives the frozen
  numbers (`node test/economy.js baseline`, within 2 points); the States benchmark refers to the fixture, not to today's Countries.

### Capital Cities pack (`pack-capitals.js`, v40; bot all-in rule v44)

`pack-capitals.js` is **generated** by `test/make-pack-capitals.js` from two committed inputs — edit those, never the pack: `test/wup2018-f13-capitals.json` (the UN numbers, copied
unchanged, with licence and the SHA-256 of the downloaded xls) and `test/capitals-content.json` (names in five languages, the Europe list, taunts, level labels). The calibration
(`CAL`: price anchors, ratio, budgets, the whole `bot` block) lives in the generator. `CAPITALS-SOURCES.md` has the source, every choice and every caveat, plus all 195 rows.

- **Score (decided with the owner).** The population of the capital's *urban agglomeration*, in millions, from ONE UN source and vintage: *World Urbanization Prospects: The 2018 Revision*, File 13,
  *Population of Capital Cities in 2018 (thousands)*, CC BY 3.0 IGO. 1 point = 1 million. The WUP **2025** capital table (`F20`) was looked at and **not** used: it counts functional "cities" by
  Degree of Urbanisation, which gives Vatican City 2,376 thousand (that is Rome) — the 2018 file is the one that matches "agglomeration" and has a real Vatican row (801 people).
  Switching vintage means a new input JSON and re-running the calibration; the owner has not yet confirmed 2018.
- **Lots: 195** = the 193 UN member states + Vatican City ("Holy See" in the file) + Taiwan (Taipei, type "Others"); not Palestine. Every one has a value in the file. Ids are ISO 3166-1 alpha-2, so the
  country's flag (`iconKind: 'flag'`) marks the lot. A country with several capitals uses the **seat of government**: The Hague (not Amsterdam), Cotonou, La Paz, Abidjan, Pretoria, Colombo.
  Where the UN row is not (or no longer) the seat — Malaysia (Kuala Lumpur, not Putrajaya), Palau (Koror, not Ngerulmud), Burundi (Bujumbura, not Gitega), Nauru (the UN row is the whole island, shown as Yaren) — the UN row is
  used and the caveat is in `CAPITALS-SOURCES.md`. Do not invent a number for a seat without a row.
- **Levels** (filters chosen like Countries'): Beginner = Europe (46 capitals, the same Europe list as Countries plus Vatican City, no Kosovo), Medium = agglomeration over 2 million (70), Expert = all 195.
- **Prices**: one smooth monotone curve (`priceTable` in the pack, log-log anchors, whole euros, minimum EUR 1; max/ideal 2.0 → 1.45), pinned in `test/golden-capitals.json` (`node test/make-golden-capitals.js`
  only on purpose). Tokyo 111 (max 161), Delhi 95, Mexico City 80 … Vatican City EUR 1. Average price per lot 10.2 / 30.0 / 13.5 at Beginner / Medium / Expert (Countries: 9 / 31 / 14), so the same budgets
  (EUR 50 / 100 / 150 / 200 / 300 at Medium and Expert, Beginner half) leave the same scarcity. `validatePack`'s top-5 rule holds per level.
- **Draw**: `sampling: 'random'` (every capital of the level's pool, every pair, every position equally likely); walkover: EUR 1 each, as in Countries.
- **Bot**: the Countries machinery (efficiency, decisive, creeperGuard, wallet, knockout, temperaments 25/50/25, premium top 5 with Beginner +50%), parameters found per level by
  `node test/tune-capitals.js <level> [evals] [games] [seed]` (a hill-climb that keeps the exploit family under the limit and the creeper / fair players near the Countries v39 numbers; `BAND=6` tightens the fair-player band) and then
  re-measured on fresh seeds. Starting from the Countries values unchanged, Medium was exploitable (a "bid up to 0.8 x the fair price" player won 68-77% at 10-30 lots) and Beginner failed at 30 lots (64.8%): the capitals pool is far less skewed than the countries pool, so Countries' numbers do not carry over.
- **All-in rule (v44, tightened v47; owner feedback twice)**: the Countries `decisive` block sends the bot to the rival's whole purse on a lot worth a big share of the points still to come. In a round of small capitals that made
  Washington D.C. (5.2 M, fair price EUR 26) "decisive" at EUR 50 and the bot went all-in on it (v44: `bot.decisive.minPrice`, a new optional per-level engine parameter, validated; Countries does not set it: a lot is decisive only if its **fair price is at least that share of the bot's current purse**).
  v44 used 0.8 and the owner still saw rounds end at once (Seoul, 10 M, fair price 45, took the whole EUR 50 purse, then the walkover gave the other four lots away for EUR 1). **v47: 1.2 for Medium and Expert** (all-in only for a lot the bot cannot really afford: Delhi, Tokyo, Mexico City at 5 lots; Seoul and Washington are not), **0.8 for Beginner** (1.0 and 1.2 pushed the best exploit at 30 lots to 61-63%: a narrow valley, like States').
  Rounds ended early by the walkover against a fair-value player (600 games): Medium 5 lots 17% -> 11.5%, 10+ lots 2-4% -> about 2%; Expert 5 lots 12% -> 3.8%, 10+ lots about 0.5%; Beginner unchanged (20% at 5 lots, 13% at 10: its giants are Moscow, Paris, London against a EUR 25 purse). Late in a round, with little money left, a pivotal lot is decisive again.
  (Measuring against the *opening* purse instead made 30-lot rounds exploitable.)
- **Measured** (real engine, `node test/economy.js capitals 2000 777`, mix 25/50/25; win % creeper A / fair B, for 5 / 10 / 15 / 20 / 30 lots): Beginner A 30.6 / 34.0 / 25.5 / 14.1 / 5.5, B 39.4 / 46.4 / 50.9 / 53.5 / 51.0;
  Medium A 32.2 / 17.1 / 8.3 / 5.7 / 3.9, B 47.5 / 46.3 / 37.0 / 39.8 / 37.9; Expert A 27.5 / 23.4 / 21.4 / 13.3 / 5.8, B 32.3 / 35.8 / 35.3 / 37.9 / 37.7 (v47). The creeper takes at most 47% of the points everywhere; every temperament keeps
  fair players between 28% and 60% (v44 numbers; v47 Medium and Expert as above). **Exploit search** (`node test/exploit.js capitals all 500 4000`, best confirmed blind strategy, limit 60% / 65% at 5 lots): Beginner 40.3 / 48.1 / 48.1 / 53.1 / 57.0,
  Medium 52.0 / 57.6 / 50.0 / 55.3 / 57.9, Expert 39.2 / 42.0 / 43.8 / 46.4 / 52.8 (v47) — **no cell above the limit** (the oracle, which sees the lots to come, reaches 52%). Expert 5 lots is the hardest on fair players (32%, Countries 40%): one big city decides a 5-lot round. The Learner (memorises the bot's drop-outs per capital) loses to the fair player by 15-52 points (measured before v44).
  Fuzz: 200,000 hostile games, 0 failures (before v44; 30,000 again after). `node test/ui-sim.js`: 0 failures.
- **Accepted / known**: short rounds are luck-heavy (5 lots: one big city decides); Medium 30 lots is the tightest cell (best blind 57.6%); the fair-value player wins only 34-38% of Medium 30-lot rounds (Countries: 29%, so it is not harder); capitals under 0.1 million are worth almost nothing
  (Vatican City 0.0008 points, the metric prints "801"); there are no per-capital fun facts (taunts are generic, by size tier, in all five languages); names and wording in German, Italian, Spanish and French have not been read by a native speaker.
- **Look**: the existing globe with a pin per capital (`globe: { borders: true, claimBorders: false }`), the normal brass-gold theme, tile icon 🏛️ (`.pack[data-pack=capitals]::before`). Euros, no new theme, nothing new stored (still four keys).
- **Wording**: `STRP.capitals` in `app.js` (all 5 languages) + `creditsCap` (UN, CC BY 3.0 IGO, "not an endorsement"). `test/browser.test.js` fails if the menu, setup, auction or results of Capitals say "country" in any language.

## Engine, packs and tests

**Layering.** `engine.js` is the pure game engine — no DOM, storage, timers or
audio; it runs in the browser (`Engine`) and in Node (`require`). It owns
pricing, the bot (`botDecision`), the auction state machine (`newAuction`,
`startLot`, `raise`, `pass`, `award`, `advance`), scoring (`scoreboard`) and
records. `app.js` is the view: it calls the engine, renders what is left in the
state object, and plays sounds. Never put a game rule in `app.js`; never touch
the DOM from `engine.js`. All randomness is injected (`rng(n)`), so a seeded
generator reproduces any game exactly. A lot that has been awarded is *closed*
(`L.awarded`): late taps return `{error:'closed'}` and change nothing.

**Packs.** Content lives in `pack-<id>.js`, loaded lazily by `packs.js` the
first time it is needed (the menu warms the default pack up when idle) and
registered with `Packs.register(pack)`, which validates it
(`Engine.validatePack`) and refuses a broken pack with a message naming the
problem. Only the small `META` list in `packs.js` (id, file, item count) is
known at startup.

### Adding a pack

1. Create `pack-<id>.js` modelled on `pack-countries.js`. It must end with
   `if (typeof module === 'object' && module.exports) module.exports = pack; else root.Packs.register(pack);`
2. Fill in the pack (every field is checked by `Engine.validatePack`):
   - `id` (lowercase slug), `title` and `noun` (localised: an object with at
     least `en`, ideally `en de it es fr`).
   - `items`: `[{ id, name:{en,…}, value, lat?, lon?, tags?, icon?, abbr? }]`.
     `value` is the score and what is priced (population in millions by
     default); it must be a real, sourced number > 0 — never invent data.
     `lat`/`lon` come together or not at all (items without them are simply
     left off the globe; with none, no globe is shown). `tags` feed difficulty
     filters. Icons: set `iconKind: 'flag'` on the pack only for ISO country
     codes; otherwise an item gets a text badge (`abbr`, or its id/initials), or
     give `icon:{emoji:'📍'}` / `{badge:'TX'}` explicitly.
   - `metric`: `{ label:{en,…}, format(value) → string, effUnit }` — how a value
     is shown and the "efficiency" unit (`'€/M'`).
   - `currency: { symbol }`, `budgetPerLot` (budget = lots × this; 10 for
     countries), `lots: { options:[…], default }`.
   - `bands`: percentile bands, ascending `upTo` from the first to `1`, each
     `{ upTo, ideal, max }` (rates per unit of value; `0 < ideal <= max`). An
     item whose `rank / N` is `<= upTo` falls in the band; rank 1 is the
     smallest value. Calibrate against the game's feel, then lock the resulting
     prices in a golden test like the countries one.
   - `levels`: difficulty filters `[{ id, label:{…}, tag? , minValue? }]` plus
     `defaultLevel`. Each level must leave at least 2 items.
   - `taunts`: `tiers:[{id,min}]` strictly descending by `min`, the last one
     catching the smallest value; optional `items:{ <id>:[en lines] }`;
     `generic:{ <lang>:{ <tierId>:[lines with {n} for the item name] } }`.
     Languages without an entry fall back to `en`. Rival drop-out/win lines are
     shared (`banter.js`).
   - Optional: `priceTable(items) → Map(id → {ideal, max})` instead of `bands`
     (`Engine.validatePack` checks it is non-decreasing in `value`);
     `currency: { symbol, code, locale }` (anything but `€` renames the money
     everywhere); `lots.all` (the option that means "every item once");
     `metric.effLabel`; `facts: { <id>: { en, … } }` for the SOLD screen and
     results.
   - `globe: { borders, claimBorders }` — `claimBorders` is for country-shaped
     items only (it lights up the nearest border outline); leave it `false` for
     points such as capitals.
3. Register it: add `{ id, file, count }` to `META` in `packs.js` and
   `'./pack-<id>.js'` to `SHELL` in `sw.js`, then **bump `CACHE`**.
4. Tests: `node --test` must stay green. Copy the countries golden idea
   for your pack (pin the prices you accepted), and add the pack to the
   simulation in `test/engine.test.js`. `test/fixture-pack.js` shows the
   minimum a pack with no flags/coordinates needs; it is test-only and never
   listed in `META` or `sw.js`.
5. If the pack needs its own wording, add it to `STRP` in `app.js` (all 5 languages).
   Strings that are specific to countries in the UI copy ("196 countries", the
   rules text, "Random countries come up…") are not generated from the pack yet
   — check every language when the menu offers a second pack.

Records are automatic: the first finished solo game of a pack creates its own
counters inside the single `record:v1` value.

### Running the tests

- `node --test test/engine.test.js` — engine, golden prices, bot equivalence
  against a verbatim copy of the pre-refactor bot, pack validation, registry,
  records, 4,000 seeded simulated games. No dependencies.
- `node --test test/states.test.js` — the US States pack: Census data (50
  states, no DC), 100,000 draws uniform within 4.5σ and chi-square, zero
  duplicates in a round, "All 50" exactly once and shuffled, golden prices, price
  targets, round-sum ≈ one budget, USD/US-spelling, taunts, facts, a 1,200-game
  simulation.
- `node --test test/economy.test.js` — the US States economy on the real engine: budget table and the top-4 rule, systematic sampling
  (100k draws, no duplicates, 50 = each once, smaller swings), the $1 walkover, temperaments (seeded, 25/50/25, symmetric),
  knockout (a)/(b)/(c) incl. a property test, the creeper ≤ 60% per temperament, calibration bands, no knife-edge, bid steps, rules text.
  `node test/economy.js [countries|states|learner|unpredictable|baseline]` is the full report (not part of `node --test`).
- `node --test test/countries-economy.test.js` — the Countries economy on the real engine: per-level budgets and the top-5 rule, smooth monotone prices and the
  level averages, the draw per level pool (random and systematic: equal chance per country, per position and per pair, no duplicates), $1 walkover, knockout (a)/(b)/(c), calibration bands per level and
  temperament, the frozen baseline, the unpredictability tests (repeat test, parity, wallet-bound giants, the Learner), the rules text in five languages.
- `node --test test/capitals.test.js` — the Capitals pack: UN data as committed (195 lots, values = thousands / 1000, no Palestine), the generator writes exactly the committed pack, the documented seat-of-government choices, pools (46 / 70 / 195), monotone golden prices, budgets and the top-5 cap, random draw (chi-square) per level, the $1 walkover, loose calibration bands per level, a small exploit scan. `node test/economy.js capitals`, `node test/exploit.js capitals`, `node test/tune-capitals.js` are the long ones.
- `node --test test/fuzz.test.js` — a 600-game slice of `node test/fuzz.js` (hostile and random humans against both bots; invariants after every move). `node test/exploit.js [pack] [level|all]` is the strategy search (dev-only, minutes).
- `node test/make-translation-review.js` — writes `TRANSLATIONS-REVIEW.md`, the pack wording (Countries, US States, Capitals incl. all 195 capital names, the taunts and the UN credits line) and the 5-lot hint side by side in five languages for a native speaker (dev-only; the strings stay in `app.js`).
- `node --test test/usmap.test.js` — the generated US map data (48 + AK + HI), the files being in
  the offline cache, and the label layout (no overlaps, callouts inside the map).
- `node --test test/contrast.test.js` — WCAG contrast of the real design tokens
  in both themes. No dependencies.
- `node --test test/browser.test.js` — headless Chromium (Playwright; skipped
  if not installed): lazy loading, load-failure recovery, whole games through the
  real UI, the fixture pack, corrupted storage, offline, no web fonts, theme,
  the zero-scroll check at nine sizes, rotate/resize mid-auction, clock pause,
  double-tap safety, sheet focus/inert, accessible names, redaction not in the
  DOM, the skippable gavel, offline audio rendering.
- `node test/ui-sim.js [games] [parallel]` — not part of `node --test` (it takes
  minutes): plays hundreds of games *through the UI* across every mode,
  difficulty, language, 2–4 seats, junk input, leaving and "play again", and
  checks for exceptions, `NaN` on screen, negative budgets, double-sold lots,
  money conservation, and that results match the engine's scoreboard.
