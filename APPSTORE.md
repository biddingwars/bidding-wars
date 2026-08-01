# Shipping Bidding Wars on the App Store

Read this before you touch Xcode. The code is ready; most of what stands between
you and a live app is paperwork and two hard blockers.

---

## The two blockers

**1. You need an Apple Developer account, and it needs an adult.**
99 USD a year, and the Apple Developer Program Licence Agreement requires the
account holder to be the legal age of majority — 18 in Germany. A minor cannot
hold one. The account has to be in a parent's name, or in a company's name (a
`UG` or `GmbH` works and is what you want anyway once ad money is involved,
because it separates the money from a personal bank account). Whoever holds the
account is legally the publisher of the app.

**2. You need a Mac.** Xcode only runs on macOS, and you cannot upload a build
without it. A borrowed Mac for an afternoon is enough for the first submission;
after that you will want one regularly.

---

## Why the single HTML file could never be submitted

Guideline **4.2 Minimum Functionality** rejects apps that are a web page in a
wrapper. That is exactly what a lone `.html` file in a WebView is. The project is
now a Capacitor app instead, which gives it the native things reviewers look for:

- native storage (Preferences), not browser storage that iOS can evict
- the Taptic Engine on every bid, raise, gavel and countdown tick
- a real launch screen, app icon and status-bar treatment
- full offline operation, including the 3D globe
- no remote code and no remote assets

That last point matters more than it sounds. **Reviewers test in airplane mode.**
The old build pulled three.js, the border data and three fonts from CDNs — offline
it would have shown a broken globe and the wrong typeface. Everything is bundled
now, and `www/vendor/README.md`, `www/data/README.md` and `www/fonts/README.md`
tell you which files to drop in before the first build.

---

## Build it

```bash
cd bidding-wars
npm install

# bundle the three assets that are not in the repo
cp node_modules/three/build/three.min.js www/vendor/
curl -o www/data/countries-110m.json \
  https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json
# fonts: see www/fonts/README.md

npx cap add ios
npm run ios          # syncs and opens Xcode
```

In Xcode: set the Team, set the bundle ID to `com.v1rotate.biddingwars`, drag
`PrivacyInfo.xcprivacy` into the App target, then Product → Archive.

Test on a real device before archiving. The simulator lies about haptics,
audio unlock and safe areas.

---

## Assets you still have to make

| What | Size | Notes |
|---|---|---|
| App icon | 1024×1024 PNG | No transparency, no alpha channel, no rounded corners — Apple rounds it |
| Launch screen | storyboard | Solid `#D6161F` with the wordmark. Must not look like an ad |
| iPhone screenshots | 6.9" and 6.5" | At least three. The auction screen, the reveal, the globe |
| iPad screenshots | 13" | Only if you tick iPad support. Leave it off for v1 |

Put the icon at `resources/icon.png` and run `npx capacitor-assets generate` to
produce every size.

---

## App Store Connect

- **Age rating**: 4+ as the app stands. No ads, no user content, no external links.
- **Privacy label**: "Data Not Collected". The in-app privacy screen and
  `PrivacyInfo.xcprivacy` already say the same thing — keep all three in sync or
  review will bounce it.
- **Privacy policy URL**: mandatory even when you collect nothing. Host a page
  saying what the in-app screen says and put the URL in `CONFIG.privacyUrl`.
- **Support URL**: mandatory. A page with a working email address is enough.
- **Export compliance**: no encryption beyond HTTPS → answer "No" to the
  encryption question, or add `ITSAppUsesNonExemptEncryption = false` to Info.plist
  to stop it asking every build.
- **Category**: Games → Trivia, secondary Education.

---

## Before you add ads

`CONFIG.ads` is `false` and no ad SDK is bundled. That was deliberate. The moment
you add one, four things change at once:

1. The privacy label stops being "Data Not Collected".
2. You need an **App Tracking Transparency** prompt for personalised ads, and most
   people say no — expect the non-personalised rate.
3. A geography quiz attracts children. If the app is rated for kids or lands in
   the Kids Category, personalised ads are **not allowed at all**, and COPPA and
   the GDPR's rules on minors apply on top.
4. You need a consent management platform for the EU. This is not optional.

Ship v1 with no ads. Get real players first, then decide.

---

## Online 1 vs 1

`CONFIG.online` is `false` and the mode is labelled "Soon" in the menu. The old
online play ran on Anthropic's artifact storage, which does not exist inside an
app. Do not flip the flag until `Net.get` / `Net.set` in `www/js/platform.js`
point at a real backend — Firebase Realtime Database or PartyKit are the two
easiest. A mode that opens and then fails is Guideline 2.1 (App Completeness) and
is one of the most common rejections there is.

When you do turn it on, two review requirements come with it: multiplayer means
you need a way to report abuse, and if handles are ever user-chosen you need a
blocking mechanism. Random `BIDDER-4KQ` handles and no chat keep you out of that
entirely — worth keeping.

---

## Data to keep fresh

Population figures sit in `www/js/data.js` and age. Refresh them yearly from the
UN World Population Prospects or the World Bank. The bot's whole price table is
derived from them, so stale numbers quietly unbalance the game.
