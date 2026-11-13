# Bidding Wars — iOS wrapper (Capacitor 8)

The game is the web app in the repository root. This folder only wraps it in a native iPhone / iPad app. It is the one place in the repository with sub-folders on purpose: the flat layout of the game (see `CLAUDE.md`) is untouched, and nothing here is cached by `sw.js` or loaded by the game.

| What | Where |
|---|---|
| Web bundle (generated, git-ignored) | `www/`, built by `build-www.js` |
| Capacitor settings | `capacitor.config.json` |
| Xcode project (Swift Package Manager, no CocoaPods) | `ios/App/App.xcodeproj` |
| Privacy manifest | `ios/App/App/PrivacyInfo.xcprivacy` |
| Launch screen, icon | `ios/App/App/Base.lproj/LaunchScreen.storyboard`, `ios/App/App/Assets.xcassets` |

## Build it (needs a Mac with Xcode 16 or later)

```
cd native
npm install
npm run sync        # copies the game into www/ and into the Xcode project
npm run open        # opens Xcode
```

In Xcode: select the **App** target → *Signing & Capabilities* → pick your team and change the **bundle identifier** (it is `io.github.biddingwars.app` for now: use one you own and register it in App Store Connect). Then run on a device, and *Product → Archive* for the store.

**Every time the game changes** (any web file, including a `CACHE` bump): run `npm run sync` again before building. `www/` is a copy; the app never reads the repository root.

## What `build-www.js` does

It reads the `SHELL` list in `../sw.js` (the files the web version caches for offline play), copies exactly those files (without `sw.js`) and refuses to continue if a file is missing or if any bundled file names a web address other than the two policy pages, GitHub issues and licence identifiers. So the app is always the same game as the offline web build and cannot quietly gain a remote request.

## Plugins used (all five are the ones `platform.js` already calls)

`Preferences` (storage, so the five stored values live in `UserDefaults`), `Haptics`, `Keyboard` (`resize: none`), `StatusBar` (follows the game's own dark / Daylight theme, never the phone's), `SplashScreen` (hidden by the game once the menu is painted). No other plugin is installed; each plugin you add can need a privacy-manifest entry or a usage-description string.

## Settings that matter for review

- **No `server.url`**: the app starts from its own files, in airplane mode, on first launch.
- **Privacy manifest**: no tracking, no tracking domains, no collected data; `UserDefaults` declared with reason `CA92.1` (the app's own preferences). Matches the "Data Not Collected" answer and `privacy.html`.
- `ITSAppUsesNonExemptEncryption` is `false` (no encryption of its own).
- Requires iOS 15. The silent-switch behaviour of the audio (`audioSession.type = 'ambient'`) needs iOS 16.4; on older versions the game's sounds play even with the switch on. Raise the deployment target to 16.4 if that matters to you.
- Orientation: iPhone portrait and both landscapes; iPad all four.
- Launch screen: the game's dark page colour with the menu's planet, so the start-up has no white flash. Icon: `icon-1024.png` (RGB, no alpha).
- Version 1.0 (build 1): raise the build number for every upload.

## What has and has not been tested

`test/native.test.js` runs the exact `www/` bundle in Chromium from the root of an origin with a stand-in `window.Capacitor`: it boots offline with no request to another host, plays a round, stores through `Preferences`, calls the status bar, keyboard and splash plugins, and registers no service worker. **Nothing here has been built or run in Xcode, in the simulator or on a device**: the project was generated on Linux. Expect to fix small things on the first build, and test on a real iPhone and iPad (airplane mode from a fresh install, a call during a lot, lock and unlock mid-auction, rotation, Split View, VoiceOver, the largest Dynamic Type).
