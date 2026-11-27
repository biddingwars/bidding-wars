# Bidding Wars for iOS (Capacitor)

This folder is the iOS app. It is dev-only: the game never references it, and the website does not need it.
The Xcode project is already generated (`ios/`). Everything Apple asks for in the project itself is filled in.
What is left needs a Mac, your Apple account and a real device.

## On the Mac: from this repository to TestFlight

You need: macOS with the current Xcode (Capacitor 8 builds for iOS 15 and later), Node.js 22 or later, and an
Apple Developer Program membership.

```sh
cd native
npm install          # Capacitor 8.6.3 and the five plugins platform.js uses
npm run sync         # copies the game into www/ and into the Xcode project, then `cap sync ios`
npm run open         # opens ios/App/App.xcodeproj in Xcode
```

**Run `npm run sync` after every change to the game.** The app carries its own copy of the files; it never loads the
website. The copy is the offline cache list in `../sw.js` (`SHELL`), so a file the game needs offline is in the app as well.

In Xcode:

1. **Signing:** select the *App* target → *Signing & Capabilities* → tick *Automatically manage signing* and pick your team.
2. **Bundle identifier:** `io.github.biddingwars.biddingwars` is set in both `capacitor.config.json` and the project.
   It cannot change after the first upload. If you want another one, change it in **both** places before you create
   the app in App Store Connect (`test/native.test.js` checks they agree).
3. **Version:** *General* → *Version* `1.0`, *Build* `1`. Raise *Build* on every upload.
4. **Run it** on a simulator, then on your iPhone (connect it, pick it as the run destination, ▶).
   The first build downloads Capacitor through Swift Package Manager; this needs the internet once.
5. **Upload:** *Product* → *Archive* → *Distribute App* → *App Store Connect*. The build appears in TestFlight after processing.

## What is already set

| Item | Where | Value |
|---|---|---|
| Web content | `capacitor.config.json` | `webDir: www`, no `server.url`, so it starts in airplane mode (guideline 2.5.2) |
| Privacy manifest | `ios/App/App/PrivacyInfo.xcprivacy` | no tracking, no collected data; UserDefaults (Preferences plugin) with reason `CA92.1` |
| Encryption | `Info.plist` | `ITSAppUsesNonExemptEncryption` = NO (no export compliance questions) |
| Languages | `Info.plist` | `CFBundleLocalizations`: the 13 languages of the game |
| Devices | project | iPhone and iPad, iOS 15+, arm64; iPad in all four orientations (multitasking works) |
| Permissions | `Info.plist` | none: the game asks for no permission, so no usage-description strings |
| Icon | `Assets.xcassets/AppIcon` | `icon-1024.png` (opaque, 1024 × 1024; Xcode makes every size) |
| Launch screen | `Assets.xcassets/Splash` | the logo's pin on the game's dark background (`#0E0D0B`) |
| Keyboard | config + `platform.js` | the auction is not resized by the keyboard |
| Status bar | `platform.js` + `app.css` | inside the app `<html class="native">` gives the nav the same room below the status bar as the home-screen app (v70) |

## Check on the device

See `../APPSTORE.md`, section 3, item 7 (airplane mode from a fresh install, a call during a lot, lock and unlock,
rotate, Split View, VoiceOver, the largest Dynamic Type, Delete all data) and item 8 (the top buttons clear the
status bar). Also check that the launch screen hands over to the menu without a white flash.

## Updating Capacitor

Keep `@capacitor/core`, `@capacitor/ios` and `@capacitor/cli` on the same version (`test/native.test.js`).
After `npm install` of a new version, run `npm run sync`.
