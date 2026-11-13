# App Store release checklist

Checked against the App Review Guidelines as published on developer.apple.com on 13 November 2026.
"Done" means it is true of the code in this repository at v59. "You" means something only the
account holder can do (App Store Connect, the Xcode project, a real device). Nothing here has been
run on a real iPhone or iPad, and there is no native project in this repository yet.

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

## 3. The native wrapper (`native/`, added in v61)

A Capacitor 8 project: `native/ios/App/App.xcodeproj` (Swift Package Manager), the game packaged from the files named in `sw.js`'s `SHELL`. How to build it is in `native/README.md`.
It was generated on Linux and **has never been opened in Xcode, run in the simulator or put on a device**. Done in it:

1. **Files bundled, no `server.url`**: the app starts from its own files in airplane mode. `native/build-www.js` refuses a bundle that names another web address. (`test/native.test.js` runs the bundle with a stand-in Capacitor.)
2. **Privacy manifest** `PrivacyInfo.xcprivacy` is in the app target: no tracking, no collected data, `UserDefaults` with reason `CA92.1`. Check the manifests Xcode reports for each plugin if you add one.
3. **No usage-description strings** and no permission prompts: only Preferences, Haptics, Keyboard, StatusBar and SplashScreen are installed.
4. `ITSAppUsesNonExemptEncryption` = false; the stale `armv7` device capability is now `arm64`.
5. **iPad:** all four orientations are enabled; the launch screen is the game's own (dark, the menu's planet); the icon is `icon-1024.png` (no alpha).
6. **Status bar** follows the game's own theme (v61), not the phone's.
7. **Sound and the silent switch:** the game asks for an `ambient` audio session, which web views support from iOS 16.4. The project targets iOS 15, where the sounds ignore the silent switch. Raise the deployment target to 16.4 if that matters.

**You still have to:** open it on a Mac, set your team and **your own bundle identifier** (`io.github.biddingwars.app` is a guess based on the GitHub organisation), register that identifier in App Store Connect, build, fix whatever the first build shows, and test on a real iPhone and iPad:
airplane mode from a fresh install, a phone call during a lot, lock and unlock mid-auction, rotate, Split View on iPad, VoiceOver through one whole game, Dynamic Type at its largest, "Delete all data" then a restart, and the privacy / support links
(they open inside the app; the "Back to Bidding Wars" link returns to the game, and the GitHub link opens in Safari).

## 4. Game balance at release (none of this is a crash)

Measured with `node test/exploit.js <pack> all 500 4000` at v60: in every pack, level and round length the best strategy of the search family wins at most 59.8% (the project's own
limit is 60%, 65% at 5 lots). Details and costs are in `CLAUDE.md`, "Exploit retune (v60)".

- A "+1" creeper that passes on purpose now and then still does better than one that never passes (about 25-32% instead of 5% in Countries Medium long rounds). It loses most games.
- Two tests still fail, as they did before v59, on cells that were not touched: Countries knockout test (b) and the Countries repeat test (SD 14.3% against 15%).
- Long Medium rounds of Capitals are hard for a player who pays up to 1.25x the fair price for everything (about 20-29% wins at 20-30 lots); a tighter cap wins 42-50%.
