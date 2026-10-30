# Bidding Wars — project rules

A country-auction game. Random countries come up as lots, players bid
against each other, and population = points (1 point = 1 million people).
Live: https://biddingwars.github.io/bidding-wars/

## Flat file layout — read this before adding any path

Everything lives flat at the repo root. No `js/`, `css/`, `data/`, `img/`,
`fonts/`, or `vendor/` subfolders — `index.html`, `app.css`, `app.js`,
`engine.js`, `packs.js`, `banter.js`, `pack-countries.js`, `globe.js`, `us-view.js`, `us-map.js`, `us-map.webp`, `us-ak.webp`, `us-hi.webp`, `NOTICE.md`,
`platform.js`, `sound.js`, `fx.js`, `sw.js`, `manifest.json`, every icon,
`globe-hero.webp`, `three.min.js`, `earth.jpg`, `countries-110m.json`,
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
const CACHE = 'bidding-wars-v31';   // increment this, every time
```

Forgetting this is the single most common mistake in this repo's history —
it's easy to ship a real fix and have it silently not reach anyone. After
bumping, the user has to fully close every open tab and reopen (not just
reload) before the new service worker takes over.

**The menu shows the release number** (small `v31` after the footer line) so the player can check they have the
latest build. It comes from `CONFIG.version` in `platform.js` and **must be bumped together with `CACHE`** (same
number); `test/version.test.js` fails if they differ. It is a constant, not stored data (privacy: still four keys).

Also: GitHub Pages deploys one run at a time, and a new commit cancels an
in-flight deploy. Commit once, wait for the green check, then commit again.

## No network at runtime for anything essential

Apple (and this project's own house rule) tests in airplane mode. Every
asset the game needs to actually play is bundled locally:

- `three.min.js` (vendored, matches the version `globe.js` was written against)
- every content pack (`pack-*.js`) — they load lazily, but must be in `sw.js`'s `SHELL` so they are cached for offline
- `earth.jpg` (the globe's satellite texture — same file whether online or offline)
- `countries-110m.json` (map borders)
- `globe-hero.webp` (the menu's planet, also the results card's placeholder)
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
third-party SDKs of any kind. Exactly four things are stored, locally on
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

All four are described in `privacy.html`, `support.html`, and the in-app
privacy screen (`privacy()` in `app.js`, `privP1`–`privP4` strings, in all
5 languages) — these must always agree with each other and with what
the code actually stores. The "Delete all data" button (also in
`privacy()`) must clear all four; this has drifted out of sync before
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
the few lines that talk about countries/euros for that pack (`rivalDesc`,
`rulesP1/P5/P6/P7`, `footer`). Money on screen goes through `money()` →
`Engine.formatMoney` (US States: `$1,234`, Intl grouping). `test/browser.test.js`
fails if the States screens contain `€`, "euro" or "country" in any language.

## How the game works

- Bidding opens at €1 on every lot. Players alternate: raise, or drop out.
- Drop out and whoever holds the top bid buys it at that price.
- Budget scales at €10 per lot (10 lots = €100 each). US States: a budget *table* by lot
  count ($85 / $165 / $180 / $210 / $315 / $420 / $525 for 5 / 10 / 15 / 20 / 30 / 40 / 50 lots),
  deliberately scarce — see "US States economy".
- Default 10 seconds per decision; timeout = automatic drop out.
- The opening €1 bid rotates seat by seat each lot.
- Seat colours are fixed for the whole auction: seat 1 red, 2 black, 3 blue,
  4 green.
- Population reveal: no winner is named until every redaction bar is
  lifted (`finish()` in `app.js`) — don't short-circuit this.
- Efficiency (€ per million people) is scored alongside raw points.

## How the bot works

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

Dark glass with brass gold is the default; "Daylight" is the light twin. The
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
  `tabular-nums`. Text sizes are rem-based so the browser's text-size setting
  scales them; auction geometry is not.
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
  chance n/50. Lot options 5/10/15/20/30/40 and 50 ("All 50 states", `lots.all`), where every
  state comes up exactly once, shuffled. No difficulty levels (`levels` has one
  entry and the setup hides the section when there is only one).
- **Pricing.** Prices run at **3× the original scale** (`economy.priceScale`; an average
  lot is $30, CA $173, TX $139, WY $3, the smallest states $3–6 instead of $1–2).
  Ideal = the state's share of the 50-state total × (10 × priceScale × 50), in whole dollars
  (floor $1); a scale factor `k` makes the whole-dollar ideals sum to 50 average lots.
  `max` = ideal × a multiplier that eases from about 2.0 (smallest) to 1.35 (largest). Both
  are non-decreasing in population. `test/golden-states.json` pins all 50;
  `test/states.test.js` checks the targets (×3 of CA 45–60, TX 35–48, FL 26–35, NY 22–30).
- **Currency.** USD in every language (see "Five languages").
- **Economy.** See the next section.
- **Fun facts.** `pack.facts[id] = { en }`, one per state, shown on the SOLD screen
  and in the results "Fun facts" sheet; must not hint at population or rank;
  other languages fall back to English. `FACTS-SOURCES.md` lists every fact with
  where to verify it — **the facts are currently marked unverified**; do not
  remove that label until they have been checked.
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
    it takes any equirectangular world image — the imagery in the repo is a Natural Earth stand-in, to be
    replaced by NASA Blue Marble (see `NOTICE.md`).
  - *Win sound*: `Snd.eagle()` (synthesised raptor cry) replaces the fanfare on a States win; a loss
    keeps the sting. It is not a recording — in films the "eagle" cry is a red-tailed hawk.
  - *Credits*: Privacy → "Credits & licences" (`credits()`, 5 languages) and `NOTICE.md`. Add every
    new asset to both.
- **Selection.** The pack picked on the menu is `SELPACK`; it is remembered as `last` inside
  the one `record:v1` value (privacy: still exactly four keys, and the copy says so). The record is per pack inside
  `record:v1`.

### US States economy (`pack.economy`, `pack.bot`; Countries has neither and is untouched)

Why: with budget = value of the pool, "+1 over the bot until it drops out" took 78% of the points,
won 100% of 30–50-lot games and left the bot 93% unspent; cutting the budget alone flipped it to a
knife-edge (50 lots: creeper 2% at 60% budget, 99% at 70%). Measured on the real engine with
`node test/economy.js`.

- **Budget = f × lots × average ideal price** (`economy.budgets` is the resulting table in dollars).
  f = 0.57 (5 lots) and 0.55 (10 lots) — so few lots that one state decides the round — then 0.40 (15),
  and **0.35 from 20 lots up** (all 50: $525). `validatePack` refuses a budget for all 50 above 80% of the
  expected price of the four biggest states (midpoint of ideal and max, plus the bot's 15% premium): $525 vs a cap of $545.
- **End-of-round rule** (`economy.endgame`, `startLot`): when only one player has money left the rest is
  offered to them at **80% of the ideal price, while their money lasts**; lots they cannot pay for stay
  unsold (`S.unsold`, shown on the results). Nobody sweeps the rest for $1. (Countries keeps the old walkover.)
- **Bid buttons** (`economy.bidSteps`, `Engine.bidSteps(pack, price)`): the five raise buttons follow the
  *current price* (never the item's fair price, which would leak its size): price < 12: +1 +2 +5 +10 +25;
  < 40: +2 +5 +10 +25 +50; < 100: +5 +10 +25 +50 +100; else +10 +25 +50 +100 +200. They are relabelled when
  it becomes the human's turn, so they never change under a thumb mid-turn. **Typing grace**
  (`economy.typingBonus`, 4 s): focusing the custom-amount field adds seconds to the decision clock once per turn.
- **The extended bot** (`pack.bot`, `botDecisionExt` in `engine.js`; every random choice goes through `S.rng`, so a seed
  reproduces a game; Countries keeps the original `botDecision` path byte for byte). Parameters:
  - `limitMul[lots]` — calibration multiplier on every walk-away roll (1.0, 0.925, 0.9, 0.975, 1.075, 1.125, 1.135 for 5…50 lots).
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
- **Calibration targets** (Countries *Medium*, 10 lots, is the benchmark: creeper A 9.5%, fair B 37%, smart C 39.6%, each ±10):
  the balanced bot alone is inside the band for B and C at every lot count and for A from 10 lots; each temperament keeps B and C
  between 15% and 75%; the 25/50/25 mix stays inside the band; the creeper takes at most 60% of the points against each
  temperament (it gets 44–49%); ±10% budget moves no reference player by more than 15 points. **5-lot rounds cannot meet the creeper
  target** (one state is 25–40% of the points; A ≈ 35%) — the rules text says short rounds are luck-heavy.
- **Re-running the harness**: `node test/economy.js [games] [seed]` prints Countries' three levels and the full US States table
  (A creeper, B fair-value, C smart with a $1.50 reserve = 5% of an average lot, D rationer, and C with $1 / $2 / $3), per
  temperament and mixed. Change `limitMul`/`spread`/`budgets` in `test/make-pack-states.js`, regenerate, re-run, keep the targets.
  `node --test test/economy.test.js` is the loose regression version. The calibration numbers in `limitMul`/`spread` were found with a
  scratch copy of the loop and then re-measured on the real engine (largest difference 2.1 points).
- **Follow-up (not fixed here, on purpose):** Countries' *Beginner* and *Expert* levels are creeper-exploitable (A wins 85% and 65% of
  10-lot games; Medium resists: 9.5%). Only the default level was used as the benchmark.

### What a Capitals pack would need (not built — do not guess its valuation)

A capital's score is not a population the same way a state's is, so before
building it decide, with the owner: (1) what `value` is — metro or city
proper population, and which official source/vintage (cities have two
incompatible definitions); (2) whether lots are drawn with or without
replacement and what the "all" option is; (3) a `priceTable` or `bands`
calibrated against the game's feel and pinned in a golden file, with the
bot-vs-human comparability numbers shown first (see the States PR for the
method); (4) `lat`/`lon` for every capital with `globe.claimBorders:false`;
(5) which countries/territories count (196? only capitals with a seat of
government?); (6) localised capital names in 5 languages. Then follow
"Adding a pack" below.

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
  (100k draws, no duplicates, 50 = each once, smaller swings), the house-price endgame, temperaments (seeded, 25/50/25, symmetric),
  knockout (a)/(b)/(c) incl. a property test, the creeper ≤ 60% per temperament, calibration bands, no knife-edge, bid steps, rules text.
  `node test/economy.js` is the full report (not part of `node --test`).
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
