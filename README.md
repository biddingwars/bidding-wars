# Bidding Wars

A country-auction game. Random countries come up as lots, players bid real
money against each other, and population = points (1 point = 1 million
people). Populations stay hidden behind redaction bars until the round ends,
then everything is revealed and scored — along with efficiency (euros per
million people).

Live: https://biddingwars.github.io/bidding-wars/

## Layout

Everything is flat at the repo root — no `js/`, `css/`, `img/`, or `data/`
folders. If you add a new file or reference a path anywhere (`index.html`,
`sw.js`, `manifest.json`, etc.), keep it flat. Nesting has cost real
debugging time before.

| File | What it is |
|---|---|
| `index.html` | Shell (`<base href="/bidding-wars/">` for GitHub Pages). |
| `app.js` | Game logic, auction engine, i18n, all screens. |
| `data.js` | Countries, translated names, bot taunts, coordinates. |
| `globe.js` | Results-screen 3D globe (three.js) + flat-canvas fallback. |
| `platform.js` | Storage, haptics, iOS gesture locks, `CONFIG` flags. |
| `app.css` / `fonts.css` | Design system. |
| `sw.js` | Service worker — offline caching. |
| `countries-110m.json` | Natural Earth borders. |

## Service worker cache

`sw.js` serves cache-first. Any change you push is invisible until `CACHE` is
bumped:

```js
const CACHE = 'bidding-wars-v9';   // increment this on every deploy
```

After bumping, the user must close *all* tabs and reopen — a reload isn't
enough, since the old service worker stays in control while any tab is open.

Also note: GitHub Pages deploys one run at a time, and a new commit cancels
the currently running deploy. Commit once, wait for the green check, then
commit again.

## House rules

- **No network at runtime** for anything essential. Fonts, three.js, borders —
  all must work bundled, since Apple tests in airplane mode.
- **No accounts, no analytics, no tracking.** Only two things are stored on
  device: chosen language, and record vs the bot.
- **No ad SDK.**
- Five languages: en, de, it, es, fr. Every user-facing string goes through
  `t('key')`; country names go through `cname(c)`.
- This repo has no open-source licence on purpose — default copyright
  applies. It's public only because free GitHub Pages requires it.

## Vendoring three.js

`three.min.js` is bundled at the repo root, never fetched from a CDN —
Apple tests apps in airplane mode.

```
npm install three@0.128.0
cp node_modules/three/build/three.min.js .
```

Version 0.128 is what `globe.js` was written against. Newer majors moved the
renderer API and will need `globe.js` updated.

If this file is missing the app still runs — `globe()` falls back to the flat
canvas map automatically.

three.js is MIT licensed. Keep the licence text in the About/legal screen.
