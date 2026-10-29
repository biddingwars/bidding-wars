# Manual test — PR 1 (engine and content-pack refactor)

Nothing should look or sound different in this PR. These are the things a
headless browser cannot prove. Use a real iPhone and a real iPad, Safari and
(if you use it) the installed home-screen app.

## 0. Get the new version (every time)

1. Merge, wait for the green GitHub Pages check.
2. **Fully close every tab** of the site (not reload), reopen.
3. To be sure the new service worker is in charge: Settings → Safari → Advanced
   → Website Data → remove `biddingwars.github.io`, then load the site once.
   (If you skip this and still see the old behaviour, that is the cache — see
   CLAUDE.md "sw.js".)

## 1. Your existing record survives (the migration)

Do this **before** clearing website data, on a device that already has games
recorded.

- [ ] Open the site: the "Record vs the bot" card on the menu still shows your
      old wins–losses and game count.
- [ ] Record screen: wins, losses, streak, best streak, average points, best
      game, and the per-difficulty lines are all as before.
- [ ] Finish one solo game: the numbers go up by exactly one game.

## 2. Offline (airplane mode)

- [ ] Load the site once online, wait ~10 seconds on the menu, then turn on
      airplane mode and **force-quit** Safari.
- [ ] Reopen the site: menu appears. Tap Solo: Setup opens (the country data is
      now a separate file loaded from the cache — this is the new thing).
- [ ] Play a full solo game offline, reveal the result. The globe may look
      plainer offline only if the bundled texture is missing — it should look
      the same as online.
- [ ] Brand-new install in airplane mode is expected to fail (nothing cached
      yet) — that is normal and unchanged.

## 3. Slow network

- [ ] On a throttled connection (or Low Data Mode), first visit: the menu should
      appear quickly. Tapping Solo before the country data arrives shows a small
      spinner, then Setup. It must never hang forever or show a blank screen.
- [ ] If you can, cut the connection exactly when tapping Solo on a **first**
      visit: you should see "Could not load the game data…" and land back on
      the menu; tapping Solo again after reconnecting works.

## 4. Gameplay is unchanged

- [ ] Solo, Medium, 10 lots: opening bid €1, raise buttons, custom bid, drop
      out, 10-second timer and its tick sounds, the "Sold" gavel, rival taunts.
- [ ] Multiplayer with 3 and 4 players: opening bid rotates seat by seat.
- [ ] Beginner shows only European countries; Expert includes tiny countries.
- [ ] Double-tap **Drop out** as fast as you can: the lot is sold **once** and
      the winner is charged **once** (this was a bug before; it is fixed here).
- [ ] Lift all redaction bars: result, record update, globe, fanfare/sting.
- [ ] Each of the 5 languages: menu, setup (difficulty names), an auction, a
      result screen. German and French are the longest — look for clipping.

## 5. Sound and haptics (unchanged in this PR)

- [ ] Knock on menu taps, blips on raise, softer tone for the bot, tick sounds in
      the last 5 seconds, fanfare/sting at the end. Mute button silences all.
- [ ] Haptics on raise / drop out / last 3 seconds / result, as before.

## 6. Quick regression sweep

- [ ] iPhone portrait and iPad portrait + landscape: the auction fits on one
      screen with no scrolling; menus look as in PR #4.
- [ ] Privacy → Delete all data: record, saved name and language all reset.
- [ ] Rotate / background and return mid-auction: no stuck or blank screen.
