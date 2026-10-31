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
   (`CACHE` is `bidding-wars-v25`.)

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

- [ ] The app opens **dark** even if the phone is set to Light. Tap the half-circle
      button on the menu: Dark ↔ Light. Quit and reopen: Light is remembered; going
      back to Dark is the default again.
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
- [ ] The "Soon" tiles (Capitals, World) and Online 1 vs 1 show a
      friendly message and open nothing.
- [ ] Each of the 5 languages: menu, setup, auction, sold, results.
- [ ] VoiceOver: menu buttons, the setup choices, "Raise by 5", Drop out, the
      price and top bid being announced as the auction moves, the sealed
      results (values must **not** be read before you lift a bar).

## 7. US States pack (PR A: data, engine, pricing, currency)

Fun facts are **unverified** (see `FACTS-SOURCES.md`) — read a handful on the
SOLD screen and tell me any that look wrong.

- [ ] Menu: tap **US States** (it highlights, the footer says "50 states", the
      record pill shows States' own record). Tap **Countries** again: nothing
      about Countries changed (levels, €, 196).
- [ ] Setup for States: lots 5 / 10 / 15 / 20 (no 30 / 40 / All 50 since v40), no
      difficulty section, budget **$165** at 10 lots and **$210** at 20.
- [ ] Play a **20-state** game (clock off): every state comes up once, none twice.
- [ ] Every screen is in **dollars** (`$1,234`) in all five languages — no `€`,
      no "euro", no "countries" anywhere (menu, setup, How to play, auction,
      SOLD, results, Record).
- [ ] SOLD screen: a short fun fact under the price chip; nothing overlaps the
      collection tray, on iPhone SE, a Pro Max and iPad; the Next lot button is
      always reachable.
- [ ] Results: "shopped smartest at $0.00 per million", the **Fun facts** button
      opens a sheet with one fact per state of the round, the globe shows the
      winner's states.
- [ ] Bot feel: it should feel like the Countries bot — beatable by a patient
      player, not a pushover. The big states (CA, TX, FL, NY) are the expensive
      lots (roughly $45–60, $35–48, $26–35, $22–30 ideal), the smallest about $1–2.
- [ ] Privacy → Delete all data still resets everything; only four values are ever
      stored (picking States stores nothing).
- [ ] Offline: after one visit, States works in airplane mode (the pack is cached).

## 8. US States pack — look, map, sound (PR B)

Assumed, not verified on a device: GPU smoothness of the flag layer on an older
iPhone/iPad; how the synthesised eagle cry actually *sounds*. The map imagery is NASA Blue Marble
(July, v41): check on a device that the gold states, pins and labels read well over it, in Dark and Light.

- [ ] Menu: the **US States** tile shows a US flag when selected (no map on the menu; the globe stays).
- [ ] A dimmed, stylised US flag sits behind the menu, setup, auction and results while States
      is selected; Countries stays plain. Dark and Light: all text easy to read.
- [ ] Results (States): the map shows your/the winner's states in gold with markers and short
      labels; the crowded Northeast uses callouts on the right. Win a game with **Alaska** and
      **Hawaii** — each appears as an inset only when owned; mainland-only shows neither.
- [ ] Results fit without scrolling on iPad landscape; on iPhone the map card sits below the score.
- [ ] Win a solo game vs the bot: you hear the eagle-style cry (not the Countries fanfare). Lose:
      the short sting. Mute silences it. Tell me how it sounds — it can be re-tuned, or swapped
      for a properly licensed recording (see `NOTICE.md`).
- [ ] Privacy → **Credits & licences** opens in all five languages and names Census, Natural
      Earth, NASA, three.js (MIT) and the hawk note.
- [ ] Offline (airplane mode): the results map and the flag work after one visit.

## 9. Menu follow-ups (flag, record)

- [ ] Pick **US States**, play a game, switch to another app for a while, come back: the menu
      reopens on **US States** with its record (it used to fall back to Countries and look empty).
- [ ] With States selected the menu shows only the straight (untilted) flag backdrop — no globe, no map.
- [ ] Privacy → Delete all data: back to Countries, all records cleared.

## 10. US States economy (scarce money, house price, new bot)

I could not play these on a device. The harness covers the numbers; these are the feel checks.

- [ ] **20 states, $210 each**: bid +1 over the bot every time. You should lose most games (the creeper wins ~20-30%), the bot should
      not sit on a pile of money, and you cannot afford California ($173 fair price) *and* Texas *and* Florida.
- [ ] Run out of money early: the remaining states are no longer yours for $1 — the bot buys them at 80% of their price
      (the results say "N states went unsold" when nobody could pay).
- [ ] The **raise buttons grow with the price**: +1 +2 +5 +10 +25 at the start of a lot, +10 … +200 above $100 (Countries uses the same scheme, see section 11).
- [ ] Tap the **custom amount** field with the 10-second clock on: the clock gains a few seconds (once per turn).
- [ ] Play 3–4 games in a row: the bot should feel different (cautious / balanced / bold) without ever being obviously broken.
- [ ] 5- and 10-state rounds feel luck-heavy; 30–50-state rounds feel like skill. The rules text says so (all five languages).
- [ ] Setup shows the right budget for each lot count ($85 / $165 / $180 / $210).
- [ ] No scrolling on the auction at 402×720 and 834×1194 with the big buttons (+100 / +200).

## 11. Countries economy (smooth prices, per-level budgets, the upgraded bot)

I could not play these on a device. The harness covers the numbers (`node test/economy.js countries`, `learner`, `unpredictable`); these are the feel checks.

- [ ] **Medium, 10 lots, EUR 100**: it should feel like before. Bid +1 over the bot every time: you lose almost every game (about 10% wins).
- [ ] **Beginner** (Europe only) and **Expert** (all 196) now have their own budgets: setup shows EUR 25 / 50 / 55 / 65 / 100 for 5 / 10 / 15 / 20 / 30 lots in Beginner and EUR 35 / 70 / 75 / 90 / 140 in Expert, and the figure changes when you change the level.
      The +1 creeper no longer wins them (long rounds: about 5% or less).
- [ ] The **biggest countries** (India, China, USA) cost about EUR 70-92: a bigger country is never cheaper than a smaller one (Vietnam is cheaper than DR Congo no more).
- [ ] Bid on India or China with the bot holding a full purse: the price it stops at is **not** always its wallet minus the reserve; across a few games it varies.
- [ ] Play the same country in several games: the bot's drop-out point should differ every time (no price you can learn).
- [ ] Run out of money early: the rest is no longer yours for EUR 1; the bot buys it at 80% of the price and the results say "N countries went unsold" when nobody could pay.
- [ ] The **raise buttons grow with the price** (+1 +2 +5 +10 +25 at the start, up to +10 ... +200 above EUR 100) and typing in the custom field adds a few seconds once per turn.
- [ ] The rules text (how to play) lists the budgets of all three levels and says short rounds are luck-heavy, in all five languages.
- [ ] No scrolling on the auction at 402x720 and 834x1194 with the big buttons.
- [ ] Bug-test round: on a giant (India, China, USA) with the bot holding more money than you, an all-in does not win it any more; on a lot worth very little (Zimbabwe, Tuvalu) the bot stops at a few euros instead of chasing you.
- [ ] Playing "+1 until the bot gives up" still loses (Medium 10 lots: about 14% wins).
- [ ] Menu shows `v35`; after a full close and reopen the new build is the one running.
- [ ] Draw is fully random: play 20 Expert rounds of 10 lots; countries repeat across rounds with no pattern, and similar-sized countries (e.g. Spain and Italy) can appear in the same round. (Revert: `sampling: 'systematic'` in `pack-countries.js`.)
- [ ] Setup sheet: choosing 5 lots shows a one-line note that 5-lot rounds are mostly luck (all five languages); choosing 10 or more hides it.
- [ ] States fun facts: the SOLD screen shows the reworded Missouri, New Jersey, North Carolina and Rhode Island facts.
- [ ] States, 30 or 50 lots: bidding "+1 up to about 80% of what you think a state is worth" and otherwise passing should be a fair fight now (about 50/50), no longer an easy win.
- [ ] US States theme: with States selected the main buttons (Open the auction, Done, Menu, Raise) are red, the second kind (Back, Drop out, Play again) dark blue, English shows the American flag in the language chip and sheet; with Countries selected everything is brass gold and English shows the Union Jack again.
- [ ] Run out of money in a 1v1 (go all in on India or China): the other player takes every remaining country for 1 each, and the how-to-play text says so in all five languages.
- [ ] India and China cost about a whole budget (about 158); USA, Brazil, Pakistan, Indonesia, Nigeria cost about 40% more than before.
- [ ] US States SOLD moment and results: the SOLD plate is red with white lettering, the burst rays and sparks are red / white, the confetti is red, white and blue; Countries keeps the brass plate and gold confetti.
- [ ] Setup budgets (Countries): Medium and Expert show 50 / 100 / 150 / 200 / 300 euros for 5 / 10 / 15 / 20 / 30 lots, Beginner 25 / 50 / 75 / 100 / 150; the how-to-play text says so in five languages. Beginner feels easier than before and its bot fights for Russia, Turkey, Germany, the UK and France.

## 12. Capital Cities pack (v40) — nothing here has been played on a real device

The numbers are covered by `node --test`, `node test/economy.js capitals`, `node test/exploit.js capitals`, `node test/fuzz.js 20000 1 capitals` and `node test/ui-sim.js`; these are the feel checks.

- [ ] Menu: the **Capitals** tile (🏛️, "195 · Population") is a real tile; the old "Soon" tile is gone and only **World** is still "Soon". Tap Capitals: it highlights, the footer says "195 capitals", the record pill is Capitals' own; Countries and US States keep their own records.
- [ ] Setup: three levels — **Beginner — Europe only**, **Medium — over 2 million**, **Expert — all 195 capitals**; budgets EUR 50 / 100 / 150 / 200 / 300 for 5 / 10 / 15 / 20 / 30 lots (Medium and Expert), half of that at Beginner. How to play: the Capitals text (euros, "195", seat of government), in all five languages.
- [ ] Play a round at each level: the lot card shows the country's flag and the capital's name (Beijing / Peking / Pechino / Pekín / Pékin by language); the population stays blacked out until the reveal; Vatican City, if it comes up, prints "801" (people), small capitals "213K", big ones "37.5M".
- [ ] Choices you may not expect (they follow the seat of government, see `CAPITALS-SOURCES.md`): The **Hague** (not Amsterdam), **Cotonou** (not Porto-Novo), **La Paz**, **Abidjan**, **Pretoria**, **Colombo**; **Nauru** shows as Yaren. Tell me if any of these should change.
- [ ] Results: the globe shows a pin per capital you bought (no border is lit, because a capital is a point). Credits (Privacy -> Credits & licences) name the UN World Urbanization Prospects 2018, CC BY 3.0 IGO, "not an endorsement".
- [ ] Bot feel: Beginner should be easiest (the bot fights for the big European capitals), Medium the most demanding, Expert in between; a +1 creeper should lose most 15+ lot rounds; with only 5 lots one big city decides it (that is said in the rules).
- [ ] Offline (airplane mode, after one online visit and a full close/reopen): Capitals plays; privacy still lists exactly four stored values; Privacy -> Delete all data clears the Capitals record too.

