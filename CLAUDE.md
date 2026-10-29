# Bidding Wars — project rules

A country-auction game. Random countries come up as lots, players bid
against each other, and population = points (1 point = 1 million people).
Live: https://biddingwars.github.io/bidding-wars/

## Flat file layout — read this before adding any path

Everything lives flat at the repo root. No `js/`, `css/`, `data/`, `img/`,
`fonts/`, or `vendor/` subfolders — `index.html`, `app.css`, `app.js`,
`engine.js`, `packs.js`, `banter.js`, `pack-countries.js`, `globe.js`,
`platform.js`, `fonts.css`, `sw.js`, `manifest.json`, every icon, every font,
`three.min.js`, `earth.jpg`, `countries-110m.json`, `privacy.html`,
`support.html` all sit at the root, referenced by plain
relative paths (`"app.css"`, not `"css/app.css"`).

This has broken things more than once: `sw.js`, `manifest.json`, and
`fonts.css` have all separately shipped with `css/`/`js/`/`img/`/`fonts/`
prefixed paths copy-pasted from an unrelated iOS-project layout, silently
breaking caching/icons/fonts because the files were never actually there.
If you add a new asset or reference a path anywhere, keep it flat and
double-check it against the real file list at the repo root.

The one exception is `test/` — dev-only (unit tests, the fixture pack, a tiny
static server). The game never references it and `sw.js` never caches it.

## `sw.js` — bump `CACHE` on every deploy that touches a cached file

`sw.js` serves cache-first. Any change to `app.css`, `app.js`, `index.html`,
`globe.js`, `platform.js`, `engine.js`, `packs.js`, `banter.js`, any
`pack-*.js`, fonts, `three.min.js`, `earth.jpg`, or
`manifest.json` is **invisible** to anyone with the site already loaded
until `CACHE` is bumped:

```js
const CACHE = 'bidding-wars-v21';   // increment this, every time
```

Forgetting this is the single most common mistake in this repo's history —
it's easy to ship a real fix and have it silently not reach anyone. After
bumping, the user has to fully close every open tab and reopen (not just
reload) before the new service worker takes over.

Also: GitHub Pages deploys one run at a time, and a new commit cancels an
in-flight deploy. Commit once, wait for the green check, then commit again.

## No network at runtime for anything essential

Apple (and this project's own house rule) tests in airplane mode. Every
asset the game needs to actually play is bundled locally:

- `three.min.js` (vendored, matches the version `globe.js` was written against)
- every content pack (`pack-*.js`) — they load lazily, but must be in `sw.js`'s `SHELL` so they are cached for offline
- `earth.jpg` (the globe's satellite texture — same file whether online or offline)
- `countries-110m.json` (map borders)
- The 4 fonts in `fonts.css` (Archivo Black, Space Grotesk Regular/Bold, Space Mono Bold)

CDN URLs still exist in a few places (`globe.js`'s `BORDER_FALLBACK`,
`EARTH_TEXTURES`, `index.html`'s `loadThreeFallback()`) but only as a
last-resort fallback if the bundled file is ever missing — never required
for normal play. Online 1v1 is gated behind `CONFIG.online` in
`platform.js` (currently `false`) and shows a "Soon" toast instead of a
broken flow — don't flip it on without a real backend; a mode that opens
and fails is an App Store rejection under Guideline 2.1.

## Privacy

No accounts, no sign-in, no analytics, no tracking, no ad SDK, no
third-party SDKs of any kind. Exactly three things are stored, locally on
device only, via the `Store` helper in `platform.js`:

- `lang:v1` — chosen language
- `record:v1` — record vs the bot. One value, one record per pack:
  `{ v:2, packs:{ countries:{…}, … } }` (`Engine.REC_KEY`; the original flat
  record migrates into `packs.countries` on first read). Adding a pack adds
  nothing to what is stored beyond its own counters inside this one value.
- `name:v1` — the last-entered player name

All three are described in `privacy.html`, `support.html`, and the in-app
privacy screen (`privacy()` in `app.js`, `privP1`–`privP4` strings, in all
5 languages) — these three must always agree with each other and with what
the code actually stores. The "Delete all data" button (also in
`privacy()`) must clear all three; this has drifted out of sync before
(name persistence shipped without updating the wipe flow or the copy — fixed,
but watch for it happening again with any future locally-stored value).

## Five languages

`en`, `de`, `it`, `es`, `fr`. Every user-facing string goes through
`t('key')` against the per-language objects in `app.js` (search `en:{`,
`de:{`, etc.) — never hardcode UI text. Country names go through `cname(c)`,
not the raw English name, since each pack item carries a localised `name`
object (`Engine.itemName`).

## How the game works

- Bidding opens at €1 on every lot. Players alternate: raise, or drop out.
- Drop out and whoever holds the top bid buys it at that price.
- Budget scales at €10 per lot (10 lots = €100 each).
- Default 10 seconds per decision; timeout = automatic drop out.
- The opening €1 bid rotates seat by seat each lot.
- Seat colours are fixed for the whole auction: seat 1 red, 2 black, 3 blue,
  4 green.
- Population reveal: no winner is named until every redaction bar is
  lifted (`finish()` in `app.js`) — don't short-circuit this.
- Efficiency (€ per million people) is scored alongside raw points.

## How the bot works

- Prices each item from the pack's percentile `bands` (`pack-countries.js`;
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

## Responsive layout

`.wrap` (the centered content column in `app.css`) is a CSS query
container (`container-type:inline-size;container-name:page`) with three
width tiers set via `@media`: base (`<640px`, unchanged 620px cap), medium
(`≥640px`, 760px — covers iPhone Duo's inner screen and phone landscape),
wide (`≥980px`, 1040px — iPad landscape and up). Component-level
adaptations (player-strip columns, the results-screen 2-column split) use `@container page (min-width:...)`
against those same two breakpoints, not separate ones. Pick new breakpoints
the same way: by real content widths (checked against actual device
logical-point sizes), never by sniffing device/user-agent.

The live-auction screen must fit on one screen with no scrolling, on every
target device, portrait and landscape — a hard product requirement, not a
nice-to-have. `paint()`/`award()` wrap their content in
`.lot-wrap > .lot-main + .lot-side`, which carry `display:contents` at every
width — they generate no boxes, so everything inside is a direct flex child of
`#app`. There is deliberately NO iPad-landscape split: an earlier one left a
huge empty middle; the compact single column fits in well under 600pt, so
iPad (≥640px) simply centres that one column (auto margins on the first
`.stage` and last `.dock`, which never go negative, so a too-short screen
degrades to the top-aligned scroll-lock fallback) and scales every auction size with `dvh` when
`min-height:741px` (floors = the compact phone values; 11" iPad landscape and
iPad mini stay compact). On phones `#act`/the "Next lot" button carry `.dock`,
which gets `margin-top:auto` inside a
`body.playing #app{display:flex;flex-direction:column}` wrapper, pinning
bid controls to the bottom of the screen within thumb reach. Keep
new auction-screen content inside this budget: the `.turnbar` "Now bidding"
bar was removed entirely (the `.pl2.turn` active-tile highlight already
says whose turn it is) and the taunt bubble is a fixed-height, single-line,
ellipsis-truncated caption (`.taunt`, 29px, always, never more) specifically
so it can never push the layout — don't reintroduce an unbounded block
there.

Menu, setup, how-to and results pages (everything that is not `body.playing`)
cap `#app` — not `.wrap` — at 622px (medium tier) / 860px (wide tier), about
15% narrower than the tier caps, so a 13" iPad isn't filled edge to edge. It
has to be `#app`: the `@container page` breakpoints above measure `.wrap`, and
shrinking `.wrap` itself would silently switch the wide-tier rules off. The
auction screen is capped the same way: `body.playing #app` at `clamp(586px,80dvh,680px)` for
every width ≥640px.

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
5. Strings that are specific to countries in the UI copy ("196 countries", the
   rules text, "Random countries come up…") are not generated from the pack yet
   — check every language when the menu offers a second pack.

Records are automatic: the first finished solo game of a pack creates its own
counters inside the single `record:v1` value.

### Running the tests

- `node --test test/engine.test.js` — engine, golden prices, bot equivalence
  against a verbatim copy of the pre-refactor bot, pack validation, registry,
  records, 4,000 seeded simulated games. No dependencies.
- `node --test test/browser.test.js` — headless Chromium (Playwright; skipped
  if not installed): lazy loading, load-failure recovery, a whole game through
  the real UI, the fixture pack in the real UI, corrupted storage.

