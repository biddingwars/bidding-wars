# App Store release checklist

Checked against the App Review Guidelines as published on developer.apple.com on 13 November 2026.
"Done" means it is true of the code in this repository (checked again at v66, 26 November 2026). "You" means something only the
account holder can do (App Store Connect, the Xcode project, a real device). Nothing here has been
run on a real iPhone or iPad, and there is no native project in this repository yet.

## 0. Before the Xcode step (28 November 2026): what only you can do

1. Add an **email address** to `support.html` (guideline 1.5; today the only contact is a GitHub issue).
2. Decide the **storefronts** (see 5 Legal below: Taiwan and Kosovo are listed as countries).
3. Build the wrapper as in section 3, then run the device checks in item 7 and the status-bar check in item 8.
4. **Languages:** the game is in 13 languages (English, German, Italian, Spanish, French, Portuguese (Brazil), Indonesian, Simplified Chinese, Hindi,
   Japanese, Korean, Arabic, Thai). In Xcode, list them as the app's localizations (`CFBundleLocalizations`, or add them in the project's Info tab)
   so the App Store shows them; the game picks the phone's language itself. The eight added in v64 have not been read by a native speaker
   (`TRANSLATIONS-REVIEW-ADDED.md` has every string next to the English); App Store Connect only needs a description in the languages you list there.
5. Screenshots from the build you submit (2.3).

## 1. What the guidelines ask for, and where the game stands

| Guideline | What it asks | Status |
|---|---|---|
| 1.1.1 Objectionable content | Nothing mean-spirited about national origin, religion etc. | Done, with a caveat. The rival's taunts are aimed at the player. v59 rewrote the lines that belittled a country itself ("a country the way a puddle is a lake", "a car park with a national anthem", the Tuvalu "sinking" line, the Vatican "divine intervention" line). The premise stays: countries are "bought" and the bot gloats about owning them. A reviewer could still dislike a line such as "Even {country} deserves a better owner than you" for a country at war. If that happens, Settings → Quiet bot shows the fix: ship with taunts off or generic. |
| 1.3 / 5.1.4 Kids | Kids Category apps: no links out, no third-party analytics | **You: do not pick the Kids Category.** The support page links to GitHub. The game is fine for all ages without being in that category. |
| 1.5 Developer information | The app and the Support URL must offer an easy way to contact you | **You: add an email address to `support.html`.** Today the only contact is "open a GitHub issue", which needs a GitHub account. The in-app privacy sheet now links to the support page (Privacy → Help & contact). |
| 2.1(a) Completeness | No placeholder or "coming soon" content, no crashes, tested on device | Done in code: the "Online 1 vs 1 · Soon" tile and the "World · Soon" pack tile are hidden (`CONFIG.teasers: false` in `platform.js`). **You: play it on a real iPhone and iPad, in airplane mode**, before submitting. |
| 2.3 Accurate metadata | Screenshots and description show the real app | **You.** Do not mention online play. Use screenshots from the build you submit. |
| 2.5.2 Self-contained | No downloaded or remote code | Done. v59 removed the last three remote fallbacks (three.js from cdnjs, borders from jsDelivr, a globe texture from jsDelivr / unpkg). Everything is bundled; if a bundled file is missing the game draws its flat fallback. **You: bundle the files into the app (see section 3). Do not point the wrapper at the GitHub Pages URL.** |
| 2.5.6 WebKit | Web content must use WebKit | Done by construction (WKWebView). |
| 3.1 Payments | In-app purchase rules | Not applicable: nothing is sold, no ads. The in-game budget is play money that exists only inside a round. |
| 4.2 Minimum functionality | More than a repackaged website | Risk, not a defect. The game is a full offline game with haptics, sound and its own UI, which is what reviewers look for. A wrapper that loads a remote URL, shows browser chrome or fails offline is what gets rejected. |
| 4.5.4 / notifications | No push, no misuse | Not applicable: none. |
| 5.1.1(i) Privacy policy | A link in App Store Connect and inside the app; says what is collected, retention and deletion | Done. `privacy.html` is new in v59; the in-app privacy sheet links to it (Privacy → Privacy policy) and the page is bundled, so it opens offline. **You: enter the policy URL in App Store Connect.** |
| 5.1.1(ii)/(v), 5.1.2 | Consent, accounts, tracking | Not applicable: nothing is collected, no accounts, no tracking, no SDKs. |
| 5.1.5 Location, 5.1.3 Health | — | Not applicable. |
| 5.2 Intellectual property | Only content you may use | Done as far as the repository shows: sources and licences are in `NOTICE.md` and in Privacy → Credits & licences (NASA imagery with credit and "no endorsement", UN data CC BY 3.0 IGO, Census public domain, Natural Earth public domain, three.js MIT). **Gap: the population figures of the Countries pack have no source recorded anywhere.** Add the source and vintage to `NOTICE.md` and `credits()`. |
| 5 Legal (local laws) | The app must be legal in every storefront you select | **You decide.** The Countries pack lists Taiwan and Kosovo as countries with their own flags, and the globe draws Natural Earth's borders. Mainland China does not accept Taiwan shown as a country; India and a few others regulate how their borders are drawn. Either leave those storefronts out or accept the risk of removal there. |

## 2. App Store Connect answers

- **App Privacy ("nutrition label"):** *Data Not Collected.* True as of v59: the app makes no network request at all.
- **Privacy Policy URL:** `https://biddingwars.github.io/bidding-wars/privacy.html`
- **Support URL:** `https://biddingwars.github.io/bidding-wars/support.html`
- **Age rating questionnaire:** every content question "None". Gambling and contests: No (an auction with play money, no chance-based wagering, nothing to win). Unrestricted web access: No. User-generated content, messaging, advertising: No.
- **Kids Category:** no (see 1.3 above).
- **Export compliance:** the app uses no encryption of its own. Set `ITSAppUsesNonExemptEncryption` to `NO` in Info.plist.
- **Sign-in / demo account:** none needed. Say so in the review notes, and say the game is fully offline.
- **Content rights:** "contains third-party content, and I have the rights" (NASA, UN, Census, Natural Earth, three.js; all credited in the app).
- **Category:** Games (Trivia or Strategy); secondary Education is defensible.

## 3. The native wrapper (not in this repository)

`platform.js` already speaks to Capacitor when it is present (`Preferences`, `Haptics`, `Keyboard`,
`StatusBar`, `SplashScreen`). What the wrapper has to get right:

1. **Bundle the files.** Copy the repository root (without `test/`, `.github/`, the `*.md` files and `sw.js`) into the web directory. Never set `server.url` to the website: the app must start in airplane mode on first launch. v59 removed `<base href="/bidding-wars/">` from `index.html`; with it, every relative path would have pointed at a folder that does not exist inside an app bundle.
2. **Privacy manifest (`PrivacyInfo.xcprivacy`).** Required since May 2024. `NSPrivacyTracking` false, no tracking domains, no collected data types. The Preferences plugin stores values in `UserDefaults`, which is a required-reason API: declare `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1`. Check the manifest Xcode generates for each plugin you add.
3. **No usage-description strings** are needed: the game asks for no permission. Do not add plugins that pull one in.
4. **iPad:** the game supports every orientation; enable all four and supply a launch screen, or opt out of multitasking.
5. **Sound and the silent switch:** `sound.js` asks for the `ambient` audio session where the web view offers it (iOS 16.4 and later). Check on the oldest iOS you support that the game stays quiet when the switch is on.
6. **Service worker:** not registered inside the native app (`Native.is`), which is right; the files are already local.
7. **Test on device:** airplane mode from a fresh install, a phone call during a lot, lock and unlock mid-auction, rotate, Split View on iPad, VoiceOver through one whole game, Dynamic Type at its largest, and "Delete all data" followed by a restart.
8. **The top buttons clear the status bar (iPad and iPhone, both orientations).** On the auction screen the Menu, pause and sound buttons must be fully visible, not dimmed or cut by the status bar.
   As a home-screen web app on iPadOS the status bar's dark band reached lower than the reported safe area and cut the top half of the buttons; v62 fixed that with extra room, but only under `@media (display-mode: standalone)` in `app.css`, which does **not** match inside the native app.
   The app relies on `env(safe-area-inset-top)` (`--top` in `app.css`). If the buttons are clipped there too, apply the same rule when `Native.is` (for example a class on `<html>` set in `platform.js`).

## 4. Game balance at release (none of this is a crash)

Measured with `node test/exploit.js <pack> all 500 4000` at v60: in every pack, level and round length the best strategy of the search family wins at most 59.8% (the project's own
limit is 60%, 65% at 5 lots). Details and costs are in `CLAUDE.md`, "Exploit retune (v60)".

- A "+1" creeper that passes on purpose now and then still does better than one that never passes (about 25-32% instead of 5% in Countries Medium long rounds). It loses most games.
- Every test passes since v65 (the Countries knockout test (b) was a real bot bug, fixed; the repeat test measured the wrong thing, fixed). v66 played real rounds on every device size and fixed six text and layout issues (see `CLAUDE.md`, "Playtest round (v66)").
- Long Medium rounds of Capitals are hard for a player who pays up to 1.25x the fair price for everything (about 20-29% wins at 20-30 lots); a tighter cap wins 42-50%.
