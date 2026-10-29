# Bidding Wars — project rules

A country-auction game. Random countries come up as lots, players bid
against each other, and population = points (1 point = 1 million people).
Live: https://biddingwars.github.io/bidding-wars/

## Flat file layout — read this before adding any path

Everything lives flat at the repo root. No `js/`, `css/`, `data/`, `img/`,
`fonts/`, or `vendor/` subfolders — `index.html`, `app.css`, `app.js`,
`data.js`, `globe.js`, `platform.js`, `fonts.css`, `sw.js`, `manifest.json`,
every icon, every font, `three.min.js`, `earth.jpg`, `countries-110m.json`,
`privacy.html`, `support.html` all sit at the root, referenced by plain
relative paths (`"app.css"`, not `"css/app.css"`).

This has broken things more than once: `sw.js`, `manifest.json`, and
`fonts.css` have all separately shipped with `css/`/`js/`/`img/`/`fonts/`
prefixed paths copy-pasted from an unrelated iOS-project layout, silently
breaking caching/icons/fonts because the files were never actually there.
If you add a new asset or reference a path anywhere, keep it flat and
double-check it against the real file list at the repo root.

## `sw.js` — bump `CACHE` on every deploy that touches a cached file

`sw.js` serves cache-first. Any change to `app.css`, `app.js`, `index.html`,
`globe.js`, `platform.js`, `data.js`, fonts, `three.min.js`, `earth.jpg`, or
`manifest.json` is **invisible** to anyone with the site already loaded
until `CACHE` is bumped:

```js
const CACHE = 'bidding-wars-v14';   // increment this, every time
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
- `record:v1` — record vs the bot (`REC_KEY` in `app.js`)
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
not the raw English name, since `data.js` carries translated names per
language.

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

- Prices each country from the rank-based `BANDS` table in `app.js`
  (`app.js:8`). Countries are ranked 1 (smallest population) to 196
  (largest); each band sets an `ideal` and a `max` €/million.
- `botCeiling(c)` rolls a random walk-away limit (`walk`) between `ideal`
  and `max` for that lot — absolute; beat it by €1 and the lot is yours.
- Outside the closing three lots it keeps €1 in reserve per remaining lot,
  so it can't bankrupt itself early (`aiTurn()`).
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
adaptations (player-strip columns, the results-screen 2-column split, the
auction screen's own split below) use `@container page (min-width:...)`
against those same two breakpoints, not separate ones. Pick new breakpoints
the same way: by real content widths (checked against actual device
logical-point sizes), never by sniffing device/user-agent.

The live-auction screen must fit on one screen with no scrolling, on every
target device, portrait and landscape — a hard product requirement, not a
nice-to-have. `paint()`/`award()` wrap their content in
`.lot-wrap > .lot-main + .lot-side`. Below the wide tier, all three carry
`display:contents` — they generate no boxes at all, so the markup behaves
exactly as if those wrapper divs didn't exist, which is what keeps
phone/medium layout pixel-identical despite them being there. At `≥980px`
(iPad landscape) `.lot-wrap` becomes a real 2-column grid: lot/price/taunt/
timer on one side, players and bid controls on the other. `#act`/the "Next
lot" button carry `.dock`, which gets `margin-top:auto` inside a
`body.playing #app{display:flex;flex-direction:column}` wrapper, pinning
bid controls to the bottom of the screen — and degrading gracefully if
content ever does overflow (the auto margin just resolves to 0 and falls
back to `.wrap`'s existing `overflow-y:auto` scroll-lock fallback). Keep
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
auction screen keeps the full width for its landscape split.
