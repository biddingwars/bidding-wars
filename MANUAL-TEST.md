# Manual test — PR 2 (the Nocturne interface)

A headless browser cannot prove these. Use a real iPhone and a real iPad, in
Safari and (if you use it) the installed home-screen app. Everything else —
layout fit, contrast, game rules, offline cache, audio levels, 1,000+ simulated
games — is covered by tests, listed in the PR description.

## 0. Get the new version (every time)

1. Merge, wait for the green GitHub Pages check.
2. **Fully close every tab** of the site (not reload), reopen.
3. To be sure the new service worker is in charge: Settings → Safari → Advanced
   → Website Data → remove `biddingwars.github.io`, then load the site once.
   (`CACHE` is `bidding-wars-v23`; the fonts are gone from the cache list.)

## 1. System fonts (the biggest "assumed" item)

I could not render San Francisco in my environment (Linux). The stack is
`-apple-system, system-ui` with `ui-rounded` for titles and numbers.

- [ ] Titles ("Bidding Wars", lot names, the big price, SOLD) are **rounded**
      San Francisco, numbers line up (tabular). If `ui-rounded` does not apply
      you will see plain SF — fine, tell me.
- [ ] No text is clipped or overlapping in **German and French** (longest) on
      the menu, setup sheet, auction (4 players, long nicknames) and results.
- [ ] Settings → Display & Brightness → Text Size / Larger Text: menu and sheets
      grow with it. (The auction's geometry deliberately does not scale, so
      the screen never scrolls — check it still looks right at the largest
      setting and tell me if text overflows.)

## 2. The auction fits one screen, no scrolling

- [ ] iPhone SE / 12 mini / 12–15 / Pro Max, portrait: never scrolls, the dock
      is within thumb reach, "Now bidding" above the active player.
- [ ] Rotate to landscape mid-auction: still one screen, still playable.
- [ ] iPad portrait and landscape, and Split View at 1/3, 1/2, 2/3.
- [ ] Safari's address bar showing/hiding (scroll the menu first, then start a
      game): the auction still fits and the dock stays at the bottom.
- [ ] Open the custom-bid field: the keyboard covers the dock but the ring and
      players stay visible; nothing jumps.

## 3. The gavel moment — sound, haptics, timing

- [ ] SOLD: the knock is heard **exactly** as the gavel hits the block (not
      before/after). I scheduled it on the audio clock; AirPods add Bluetooth
      latency that no web page can see — compare wired/speaker vs AirPods.
- [ ] Bargain (paid under the "ideal" price): gold burst, rays, confetti.
      Fair: lighter. Overpaid: grey-ish and quiet.
- [ ] Tap during the swing: skips to the end state, you are never stuck.
- [ ] Settings → Accessibility → Motion → Reduce Motion ON: no swing, no
      confetti, no screen-shake; SOLD just appears. Nothing is blocked.
- [ ] Sound levels feel balanced (knock vs raise chime vs fanfare), no clipping.
- [ ] Silent switch ON: the game is silent (expected: it respects it). Mute
      button silences everything too.
- [ ] Haptics: **iPhone Safari has no web haptics API, so expect none.** Only a
      native wrapper (Capacitor) or Android web will vibrate. If you ship a
      wrapper, check: raise (light), drop out (medium), SOLD (heavy, at impact),
      last 3 seconds (warning), win (success).
- [ ] Take a phone call / lock the screen mid-auction, come back: sound works
      again after your next tap; the decision clock did not run out meanwhile.

## 4. The end screen (the stutter you reported)

- [ ] Lift every bar → the winner card springs in, points count up, confetti
      falls, **no stutter**. The globe card fades in about 2.5 s later.
      On an older iPhone this is the place to look. (In my test the
      celebration held 60 fps at 4× CPU throttle; the globe I could only
      test with a software renderer, so the GPU path is **assumed**.)
- [ ] Drag/spin and pinch the globe: smooth. If it is slow it steps its
      resolution down by itself — tell me if you ever see that.
- [ ] A game where you win, a game where the bot wins: different sounds.

## 5. Appearance

- [ ] Phone set to Dark: Nocturne. Set to Light: Daylight. Tap the half-circle
      button on the menu: Automatic → Light → Dark. Quit and reopen: the forced
      choice is remembered; "Automatic" follows the phone again.
- [ ] Both themes: every word readable, gold labels, grey hints, the red
      Drop out, the black seat (shown dark slate) vs the others.
- [ ] Safari's status bar / the home-screen app's status bar looks right in both.
- [ ] Privacy → Delete all data: language, name, record **and appearance** reset.

## 6. Everything else from PR 1 still works

- [ ] Offline (airplane mode, force-quit, reopen): menu, Solo, a whole game,
      the reveal and the globe all work.
- [ ] Your old record is still on the menu pill and in the Record sheet.
- [ ] Double-tap **Drop out** very fast: sold once, charged once.
- [ ] Multiplayer, 3 and 4 players: the opening bid rotates seat by seat; a
      double tap after your turn does not act for the next player.
- [ ] The "Soon" tiles (States, Capitals, World) and Online 1 vs 1 show a
      friendly message and open nothing.
- [ ] Each of the 5 languages: menu, setup, auction, sold, results.
- [ ] VoiceOver: menu buttons, the setup choices, "Raise by 5", Drop out, the
      price and top bid being announced as the auction moves, the sealed
      results (values must **not** be read before you lift a bar).
