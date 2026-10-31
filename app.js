/* ============ ENGINE + PACK BINDINGS ============
   The rules (pricing from percentile bands, the bot, the auction state machine,
   scoring, records) live in engine.js — pure and unit-tested. Content (items,
   names, taunts, difficulty filters, number format) lives in lazily loaded packs
   (packs.js, pack-*.js). Sound is sound.js, motion is fx.js. This file is the
   view: it renders what the engine returns and wires the controls. Nothing here
   decides a price or a winner. */
const rnd = Engine.defaultRng;
const DEFAULT_PACK = 'countries';
let PACK = null;                                    // pack of the auction / results on screen

const esc = s => String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const cname = it => Engine.itemName(it, LANG);
const flag = code => code.split('').map(ch => String.fromCodePoint(0x1F1E6 + ch.charCodeAt(0) - 65)).join('');
/* item icon: a flag where the pack has them, otherwise a text badge (or a given emoji) */
function icon(it) {
  const ic = Engine.itemIcon(PACK, it);
  return ic.flag ? flag(ic.flag) : ic.emoji ? esc(ic.emoji) : `<span class="ibadge">${esc(ic.badge)}</span>`;
}
const fmtVal = v => PACK.metric.format(v);
let SELPACK = DEFAULT_PACK;                         // the pack picked on the menu (memory only; nothing about it is stored)
const cur = () => (PACK ? PACK.currency.symbol : ((Packs.meta(SELPACK) || {}).sym || '€'));
const money = n => (PACK ? Engine.formatMoney(PACK, n) : cur() + n);   // "$1,234" for US States, "€12" for Countries
const ini = n => (Array.from(String(n || '?').trim())[0] || '?').toUpperCase();
const IC = (id, cls) => `<svg class="i ${cls || ''}" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;
const isOnline = () => navigator.onLine !== false;

/* ---- spoken lot announcement (respects the mute button) ---- */
function speak(text) {
  if (window.MUTED || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const tag = { en: 'en-US', de: 'de-DE', it: 'it-IT', es: 'es-ES', fr: 'fr-FR' }[LANG] || 'en-US';
    u.lang = tag; u.rate = .92; u.pitch = 1.05; u.volume = 1;
    const want = tag.slice(0, 2);
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(want));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}
if ('speechSynthesis' in window) { speechSynthesis.onvoiceschanged = () => {}; }

/* ============ SHELL ============ */
const app = document.getElementById('app');
const layer = document.getElementById('layer');
const rootEl = document.getElementById('root');
let S = {};
let navTok = 0;                                    // bumped on every screen change, so an async screen can tell it was left
let stopGlobe = null;

function on(id, fn) { const e = document.getElementById(id); if (e) e.onclick = fn; }
function val(id) { const e = document.getElementById(id); return e ? e.value.trim() : ''; }

/* ---- appearance: dark (Nocturne) by default, whatever the phone is set to; the toggle switches to Daylight and back ---- */
const THEMES = ['dark', 'light'];
let THEME = 'dark';
const THEME_COLOR = { dark: '#0E0D0B', light: '#EEF0FF' };
function applyTheme() {
  document.documentElement.setAttribute('data-theme', THEME);
  $$('meta[name=theme-color]').forEach(m => m.setAttribute('content', THEME_COLOR[THEME]));
}
async function loadTheme() { const v = await Store.get('theme:v1'); THEME = v === 'light' ? 'light' : 'dark'; applyTheme(); }
async function setTheme(v) {
  THEME = v === 'light' ? 'light' : 'dark'; applyTheme();
  if (THEME === 'dark') await Store.remove('theme:v1'); else await Store.set('theme:v1', 'light');     // only a forced Daylight is stored
}
const themeLabel = () => t(THEME === 'light' ? 'themeLight' : 'themeDark');

/* the buttons every screen carries in its top bar */
const navBtns = (withTheme = true) => `<span class="navr">${withTheme ? `<button class="ibtn" id="theme" aria-label="${esc(themeLabel())}">${IC('theme')}</button>` : ''}<button class="ibtn${Snd.muted ? ' off' : ''}" id="mute" aria-label="${esc(t('aSound'))}" aria-pressed="${Snd.muted}">${IC(Snd.muted ? 'mute' : 'note')}</button></span>`;
function bindNav(sec) {
  const th = $('#theme', sec);
  if (th) th.onclick = () => { setTheme(THEMES[(THEMES.indexOf(THEME) + 1) % THEMES.length]); th.setAttribute('aria-label', themeLabel()); Snd.ui(); Haptics.light(); toast(themeLabel()); };
  const mu = $('#mute', sec);
  if (mu) mu.onclick = () => {
    Snd.setMuted(!Snd.muted);
    if (Snd.muted) { try { speechSynthesis.cancel(); } catch (e) {} } else Snd.ui();
    mu.classList.toggle('off', Snd.muted); mu.setAttribute('aria-pressed', Snd.muted); mu.innerHTML = IC(Snd.muted ? 'mute' : 'note');
    Haptics.light();
  };
}

/* replace the screen. `name` marks it for the stylesheet; the auction is the one that never scrolls */
/* the US States pack gets its dimmed flag behind everything (CSS: body.pk-states); other packs stay plain */
/* In the US States theme English is shown with the American flag, not the Union Jack (the language is the same; the flag is only the badge) */
const langFlag = l => (l.id === 'en' && (PACK ? PACK.id : SELPACK) === 'states') ? 'US' : l.flag;
function syncPackTheme() { const us = (PACK ? PACK.id : SELPACK) === 'states'; document.body.classList.toggle('pk-states', us); if (us) document.documentElement.dataset.pack = 'states'; else delete document.documentElement.dataset.pack; }
function go(h, name) {
  navTok++; closeSheets(true); stopClock();
  if (stopGlobe) { stopGlobe(); stopGlobe = null; }
  const sec = document.createElement('section');
  sec.className = 'screen'; sec.dataset.screen = name || 'page'; sec.innerHTML = h;
  app.replaceChildren(sec);
  document.body.classList.toggle('playing', name === 'auction');
  syncPackTheme();
  bindNav(sec);
  if (!FX.reduced) FX.spring(sec, 0, 1, v => ({ opacity: Math.min(1, v * 1.4), transform: `translateY(${(1 - v) * 14}px) scale(${.985 + .015 * v})` }), { k: 220, c: 20 });
  return sec;
}

let toastT = null;
function toast(msg) {
  $$('.toast', layer).forEach(x => x.remove());
  const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = msg;
  layer.appendChild(d);
  if (!FX.reduced) FX.spring(d, 0, 1, v => ({ opacity: Math.min(1, v * 1.5), transform: `translate(-50%, ${(1 - v) * -16}px)` }), { k: 240, c: 18 });
  clearTimeout(toastT); toastT = setTimeout(() => d.remove(), 2600);
}

/* ---- sheets: every secondary screen is a sheet over the one underneath ---- */
let sheetH = null;
function sheet(o) {
  closeSheets(true);
  const wrap = document.createElement('div');
  wrap.className = 'sheetwrap' + (o.alert ? ' alertwrap' : '');
  wrap.innerHTML = `<div class="backdrop"></div><div class="sheetbox${o.alert ? ' alert' : ''}" role="${o.alert ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="shT" tabindex="-1">${o.alert ? '' : '<div class="grab"></div>'}<div class="sheetbody"><h2 class="sh-title" id="shT">${esc(o.title)}</h2><div class="sbc">${o.body || ''}</div></div><div class="sheetfoot">${o.foot || ''}</div></div>`;
  layer.appendChild(wrap);
  const box = $('.sheetbox', wrap), bd = $('.backdrop', wrap), opener = document.activeElement;
  const h = {
    wrap, box, onDismiss: o.onDismiss || null, alive: true,
    content: () => $('.sbc', wrap), foot: () => $('.sheetfoot', wrap),
    set(body, foot) { $('.sbc', wrap).innerHTML = body; $('.sheetfoot', wrap).innerHTML = foot || ''; },
    close(now) {
      if (!h.alive) return; h.alive = false; holdClock--;
      if (sheetH === h) { sheetH = null; if ('inert' in app) app.inert = false; }
      wrap.style.pointerEvents = 'none';
      if (opener && opener.focus && document.contains(opener)) { try { opener.focus({ preventScroll: true }); } catch (e) {} }
      if (now || FX.reduced) { wrap.remove(); return; }
      box.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(100%)' }], { duration: 200, easing: 'ease-in', fill: 'both' }).finished.then(() => wrap.remove(), () => wrap.remove());
      FX.fade(bd, 1, 0, 180);
    },
    dismiss() { h.close(); if (h.onDismiss) h.onDismiss(); }
  };
  holdClock++; sheetH = h;
  if ('inert' in app) app.inert = true;
  bd.onclick = () => h.dismiss();
  wrap.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); h.dismiss(); return; }
    if (e.key !== 'Tab') return;
    const f = $$('button:not(:disabled),input:not(:disabled),a[href]', box).filter(x => x.offsetParent !== null);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], lastEl = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); lastEl.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
  });
  FX.fade(bd, 0, 1, 200);
  if (o.alert) FX.spring(box, 0, 1, v => ({ opacity: Math.min(1, v * 1.6), transform: `scale(${.92 + .08 * v})` }), { k: 300, c: 24 });
  else FX.spring(box, 0, 1, v => ({ transform: `translateY(${(1 - v) * 100}%)` }), { k: 260, c: 26 });
  try { box.focus({ preventScroll: true }); } catch (e) {}
  return h;
}
function closeSheets(now) { if (sheetH) sheetH.close(now); }

/* a question with a destructive answer. #dy is "yes", #dn is "no". */
function ask(title, body, yes, onYes, onNo, noLabel) {
  const h = sheet({
    title, alert: true, body: `<p>${esc(body)}</p>`, onDismiss: onNo,
    foot: `<button class="btn drop" id="dy">${esc(yes)}</button><button class="btn ghost" id="dn">${esc(noLabel || t('stay'))}</button>`
  });
  $('#dy', h.wrap).onclick = () => { Snd.ui(); h.close(true); onYes(); };
  $('#dn', h.wrap).onclick = () => { Snd.ui(); h.dismiss(); };
  return h;
}


/* ============ LANGUAGES ============ */
const LANGS=[
  {id:'en', flag:'GB', label:'English'},
  {id:'de', flag:'DE', label:'Deutsch'},
  {id:'it', flag:'IT', label:'Italiano'},
  {id:'es', flag:'ES', label:'Español'},
  {id:'fr', flag:'FR', label:'Français'}
];

const STR={
en:{
 credits:'Credits & licences', creditsIntro:'Everything in this game is bundled on your device. Thank you to:', creditsPop:'<b>US population</b> — U.S. Census Bureau, Vintage 2025 estimates (NST-EST2025-POP). Public domain.', creditsCap:'<b>Capital-city population</b> — United Nations, DESA Population Division, World Urbanization Prospects: The 2018 Revision, File 13 (urban agglomeration, 2018). CC BY 3.0 IGO. Data unchanged; this is not an endorsement by the United Nations.', creditsMap:'<b>US state outlines</b> — U.S. Census Bureau cartographic boundary files, packaged by us-atlas. Public domain data.', creditsImg:'<b>US map imagery</b> — Natural Earth shaded relief (naturalearthdata.com). Public domain.', creditsWorld:'<b>World borders</b> — Natural Earth. Public domain.', creditsGlobe:'<b>Globe texture</b> — NASA-derived satellite imagery. Public domain.', creditsThree:'<b>three.js</b> — © 2010–2021 three.js authors. MIT licence.', creditsSound:'<b>Sound</b> — every sound is synthesised on your device; there are no recordings. The eagle-style win cry is synthesised too. In films that cry is really a red-tailed hawk, because a bald eagle’s own voice is a thin chirp.', creditsFacts:'<b>US States fun facts</b> — written for this game. They have not been independently verified yet.',
 lotsAll:'All {n}', funFacts:'Fun facts', factsIntro:'Every state in this round.',
 tagline:'Use your knowledge to beat your rivals',
 solo:'Solo', soloDesc:'One rival, the bot. It has a price in mind for every country and walks away the moment you beat it. Works offline.',
 multi:'Multiplayer', multiDesc:'2 to 4 players sharing one phone. Two-player is the default. Works offline.',
 online:'Online 1 vs 1', onlineDesc:'Share a room code and bid against one other person.', onlineOff:'Needs a connection — currently unavailable.',
 before:'Before you start', how:'How to play', language:'Language',
 lots:'Lots', shortHint:"A 5-lot round is mostly luck: one big lot can decide it. Play 10 or more lots for a game of skill.", budget:'Budget each', budgetNote:'Scales with the auction — €10 per lot.',
 difficulty:'Difficulty', lvBeginner:'Beginner — Europe only', lvMedium:'Medium — over 15 million', lvExpert:'Expert — all 196 countries',
 seconds:'Seconds per decision', noClock:'No clock',
 nickOne:'Your nickname (optional)', nickMany:'Nicknames (optional)', playersN:'Players',
 open:'Open the auction', back:'Back', rival:'Your rival',
 rivalDesc:'The <b>bot</b> prices every country by population and rolls a fresh walk-away limit for each lot, so it is never quite predictable. Beat that limit by one euro and the lot is yours — it never chases past it.',
 you:'You', bot:'Bot', player:'Player',
 nowBidding:'Now bidding', standing:'Standing bid', topBid:'TOP BID', biddingNow:'BIDDING NOW',
 raiseOrDrop:'raise or drop out', dropOut:'Drop out', bid:'Bid', lot:'Lot', of:'of',
 noRaise:'Not enough money left to raise. You have to drop out.',
 dropHint:'Drop out and {name} buys it for €{price}.',
 deciding:'is deciding', sizing:'Sizing up the lot at {cur}{price}.',
 nextLot:'Next lot', sold:'Sold', result:'Result',
 sealed:'The books are sealed', nobody:'Nobody knows yet',
 revealHint:'Every population is still blacked out. Tap a bar to lift it, or lift them all at once. The result stands once the last bar is gone.',
 liftAll:'Lift every bar', final:'Final', takesIt:'{name} takes it',
 pointsAgainst:'{a} points against {b}.', smartest:'<b>{name}</b> shopped smartest at {v} € per million.',
 nothing:'Walked away with nothing.', points:'Points', spentEff:'{cur}{n} spent · efficiency',
 playAgain:'Play again', menu:'Menu', world:"{name}'s world · drag to spin and tilt · pinch to zoom",
 leaveTitle:'Leave the auction?', leaveBody:'This round will be lost and you go back to the main menu.',
 leave:'Leave', stay:'Stay here',
 twoMin:'Two players minimum.', tooMuch:'More than you have.', mustBeat:'Has to beat {cur}{price}.',
 record:'Record vs the bot', wins:'Wins', losses:'Losses', draws:'Draws',
 games:'Games', streak:'Streak', bestStreak:'Best streak', winRate:'Win rate', avgPts:'Average points',
 bestGame:'Best game', noGames:'No solo games yet. Beat the bot and it starts counting.',
 reset:'Reset record', resetTitle:'Reset the record?', resetBody:'Every solo result on this device is deleted. This cannot be undone.',
 newRecord:'New personal best', recordNote:'Solo games only. Stored on this device, never uploaded.',
 rulesP1:'Random countries come up one at a time. <b>1 point = 1 million people</b>, and the population stays blacked out until the very end.',
 rulesP2:'<b>Bidding opens at €1.</b> On your turn you either raise or drop out. Drop out and whoever holds the top bid buys it at that price — so raising is a weapon: push a rival up and they get stuck with a terrible deal. Push too far and you are the one stuck.',
 rulesP3:'You get <b>10 seconds</b> per decision by default. Run out of time and you drop out automatically.',
 rulesP4:'Your budget scales with the auction: <b>10 lots gives everyone €100</b>, 20 lots gives €200, and so on.',
 rulesP5:'The bot values every country by population and rolls a fresh walk-away limit for each lot, so you can never quite read it. That limit is absolute: beat it by a single euro and the lot is yours.',
 rulesP6:'<b>Difficulty</b> decides which countries can come up: Beginner draws from Europe only, Medium from every country above 15 million, Expert from all 196.',
 rulesP7:'Efficiency is scored too: euros per million people. Lower is better.',
 onlineTitle:'Play online', onlineIntro:'One person opens a room and shares the code. Everyone submits one sealed bid per lot and the highest bid wins it. Bidding starts at €1, so a bid of 0 means you sit the lot out.',
 appearAs:'You will appear as', handleNote:'Random handle. No name, no account, nothing about you leaves this device.',
 openRoom:'Open a room', joinRoom:'Join', roomCode:'Room code', shareCode:'Share this with the others.',
 inRoom:'In the room', waitHost:'Waiting for the host…', waitJoin:'Waiting for your opponent to join…',
 bothIn:'Both bidders are in.', startAuction:'Start the auction', leaveRoom:'Leave',
 sealedBid:'Sealed bid — you have {cur}{n}', submit:'Submit', bidIn:'Bid is in', waitOthers:'Waiting for your opponent…',
 fourChars:'Four characters, please.', noRoom:'No room with that code.', alreadyStarted:'That auction already started.',
 roomFull:'That room is full — this mode is 1 vs 1.', storageFail:'Storage is not reachable right now.',
 needsNet:'This mode needs an internet connection.', lotsWon:'lots',
 youTag:'you', hostTag:'HOST',
 privacy:'Privacy', soon:'Soon', soonBody:'Online play is not switched on yet. Everything else works without a connection.',
 privP1:'This game has no accounts, no sign-in and no analytics. Nothing you do here is sent anywhere.',
 privP2:'Four things are saved, and only on this device: the language you picked, the appearance you chose, your record against the bot (with the game you last picked), and the name you last entered. Deleting the app deletes all four.',
 privP3:'Nicknames are optional. They label the players on screen during a round; only your own is remembered on this device, so you do not have to type it again.',
 privP4:'No advertising, no tracking, no third-party software development kits.',
 wipe:'Delete all data', wipeTitle:'Delete everything?', wipeBody:'Your record, your saved name, your language and your appearance choice will be removed from this device.', wiped:'Deleted.',
 packFail:'Could not load the game data. Check your connection and try again.',
 loadingBorders:'loading borders…',
 packCountries:'Countries',
 packStates:'US States',
 packCapitals:'Capitals',
 packWorld:'World',
 popLabel:'Population',
 packSoonBody:'More packs are on the way.',
 footer:'No accounts · No tracking · {n} countries',
 appearance:'Appearance',
 themeLight:'Appearance: light',
 themeDark:'Appearance: dark',
 holds:'Top bid · {name}',
 thinking:'Deciding',
 tagOut:'Out',
 aRaise:'Raise by {n}',
 aBid:'Your own bid',
 aTimer:'Time left',
 aSeconds:'{n} seconds left',
 aSound:'Sound on or off',
 aRecord:'Record against the bot',
 qBargain:'Bargain',
 qFair:'Fair deal',
 qOver:'Overpaid',
 dealBargain:'Under the ideal price of {cur}{n}',
 dealFair:'Right around the ideal {cur}{n}',
 dealOver:'Over the ideal price of {cur}{n}',
 collectionYours:'Your collection',
 collectionOf:'{name}’s collection',
 tapSkip:'Tap to skip',
 seeResult:'See the result',
 done:'Done',
 revealShort:'Every population is blacked out. Tap a bar to lift it, or lift them all.',
 worldTitle:'The world',
 worldCap:'Drag to spin and tilt · pinch to zoom',
 hiddenValue:'Hidden. Tap to reveal.',
 cancel:'Cancel',
 freeLot:'free',
 soldTo:'{item} sold to {name} for {cur}{n}.',
 soloShort:'One rival, the bot. Works offline.', multiShort:'2 to 4 players, one device.', onlineShort:'Share a room code and bid.',
 smartestU:'<b>{name}</b> shopped smartest at {v} {unit}.'
},
de:{
 credits:'Quellen & Lizenzen', creditsIntro:'Alles in diesem Spiel liegt auf deinem Gerät. Danke an:', creditsPop:'<b>US-Einwohnerzahlen</b> — U.S. Census Bureau, Schätzung Vintage 2025 (NST-EST2025-POP). Gemeinfrei.', creditsCap:'<b>Einwohnerzahlen der Hauptstädte</b> — Vereinte Nationen, DESA, Abteilung Bevölkerung, World Urbanization Prospects: The 2018 Revision, Datei 13 (städtische Agglomeration, 2018). CC BY 3.0 IGO. Daten unverändert; keine Billigung durch die Vereinten Nationen.', creditsMap:'<b>Umrisse der US-Bundesstaaten</b> — Kartografische Grenzdateien des U.S. Census Bureau, aufbereitet von us-atlas. Gemeinfreie Daten.', creditsImg:'<b>Bilder der US-Karte</b> — Natural Earth, Reliefkarte (naturalearthdata.com). Gemeinfrei.', creditsWorld:'<b>Weltgrenzen</b> — Natural Earth. Gemeinfrei.', creditsGlobe:'<b>Globus-Textur</b> — Satellitenbilder auf NASA-Basis. Gemeinfrei.', creditsThree:'<b>three.js</b> — © 2010–2021 three.js authors. MIT-Lizenz.', creditsSound:'<b>Klang</b> — alle Töne werden auf deinem Gerät erzeugt, es gibt keine Aufnahmen. Auch der adlerartige Siegesruf ist erzeugt. In Filmen ist dieser Ruf in Wirklichkeit ein Rotschwanzbussard, denn die Stimme eines Weißkopfseeadlers ist ein dünnes Zwitschern.', creditsFacts:'<b>Wissenswertes zu den US-Staaten</b> — für dieses Spiel geschrieben und noch nicht unabhängig überprüft.',
 lotsAll:'Alle {n}', funFacts:'Wissenswertes', factsIntro:'Alle Bundesstaaten dieser Runde.',
 tagline:'Nutze dein Wissen und schlag deine Rivalen',
 solo:'Solo', soloDesc:'Ein Gegner, der Bot. Er hat für jedes Land einen Preis im Kopf und steigt aus, sobald du ihn überbietest. Läuft offline.',
 multi:'Mehrspieler', multiDesc:'2 bis 4 Spieler an einem Handy. Zwei Spieler sind der Normalfall. Läuft offline.',
 online:'Online 1 gegen 1', onlineDesc:'Raum-Code teilen und gegen eine andere Person bieten.', onlineOff:'Braucht Internet — gerade nicht verfügbar.',
 before:'Vor dem Start', how:'Spielregeln', language:'Sprache',
 lots:'Lose', shortHint:"Eine Runde mit 5 Losen hängt meist vom Glück ab: ein einziges großes Los kann alles entscheiden. Ab 10 Losen zählt das Können.", budget:'Budget pro Spieler', budgetNote:'Wächst mit der Auktion — 10 € pro Los.',
 difficulty:'Schwierigkeit', lvBeginner:'Anfänger — nur Europa', lvMedium:'Mittel — über 15 Millionen', lvExpert:'Experte — alle 196 Länder',
 seconds:'Sekunden pro Entscheidung', noClock:'Ohne Uhr',
 nickOne:'Dein Spitzname (optional)', nickMany:'Spitznamen (optional)', playersN:'Spieler',
 open:'Auktion eröffnen', back:'Zurück', rival:'Dein Gegner',
 rivalDesc:'Der <b>Bot</b> bewertet jedes Land nach Einwohnerzahl und würfelt pro Los eine neue Schmerzgrenze — er ist also nie ganz berechenbar. Überbiete diese Grenze um einen Euro und das Los gehört dir. Er geht nie darüber hinaus.',
 you:'Du', bot:'Bot', player:'Spieler',
 nowBidding:'Am Zug', standing:'Höchstgebot', topBid:'HÖCHSTGEBOT', biddingNow:'BIETET GERADE',
 raiseOrDrop:'erhöhen oder aussteigen', dropOut:'Aussteigen', bid:'Bieten', lot:'Los', of:'von',
 noRaise:'Nicht genug Geld zum Erhöhen. Du musst aussteigen.',
 dropHint:'Steigst du aus, kauft {name} es für {price} €.',
 deciding:'überlegt', sizing:'Schätzt das Los bei {price} {cur} ein.',
 nextLot:'Nächstes Los', sold:'Verkauft', result:'Ergebnis',
 sealed:'Die Bücher sind versiegelt', nobody:'Noch weiß es niemand',
 revealHint:'Alle Einwohnerzahlen sind noch geschwärzt. Tippe einen Balken an oder deck alle auf einmal auf. Das Ergebnis steht erst, wenn der letzte Balken weg ist.',
 liftAll:'Alles aufdecken', final:'Endstand', takesIt:'{name} gewinnt',
 pointsAgainst:'{a} Punkte gegen {b}.', smartest:'<b>{name}</b> hat am klügsten eingekauft: {v} € pro Million.',
 nothing:'Ging leer aus.', points:'Punkte', spentEff:'{n} {cur} ausgegeben · Effizienz',
 playAgain:'Nochmal', menu:'Menü', world:'{name}s Welt · ziehen zum Drehen und Kippen · zwei Finger zum Zoomen',
 leaveTitle:'Auktion verlassen?', leaveBody:'Diese Runde geht verloren und du landest im Hauptmenü.',
 leave:'Verlassen', stay:'Hierbleiben',
 twoMin:'Mindestens zwei Spieler.', tooMuch:'Mehr als du hast.', mustBeat:'Muss über {price} {cur} liegen.',
 record:'Bilanz gegen den Bot', wins:'Siege', losses:'Niederlagen', draws:'Unentschieden',
 games:'Spiele', streak:'Serie', bestStreak:'Beste Serie', winRate:'Siegquote', avgPts:'Punkte im Schnitt',
 bestGame:'Bestes Spiel', noGames:'Noch keine Solo-Spiele. Schlag den Bot, dann fängt die Zählung an.',
 reset:'Bilanz zurücksetzen', resetTitle:'Bilanz zurücksetzen?', resetBody:'Alle Solo-Ergebnisse auf diesem Gerät werden gelöscht. Das lässt sich nicht rückgängig machen.',
 newRecord:'Neue Bestleistung', recordNote:'Nur Solo-Spiele. Bleibt auf diesem Gerät, wird nie hochgeladen.',
 rulesP1:'Nacheinander kommen zufällige Länder auf den Tisch. <b>1 Punkt = 1 Million Einwohner</b>, und die Einwohnerzahl bleibt bis ganz zum Schluss geschwärzt.',
 rulesP2:'<b>Die Auktion startet bei 1 €.</b> Wenn du dran bist, erhöhst du oder steigst aus. Steigst du aus, kauft der aktuelle Höchstbietende zu diesem Preis — Erhöhen ist also eine Waffe: Treib den Gegner hoch, dann bleibt er auf einem miesen Deal sitzen. Übertreib es, und du bist derjenige.',
 rulesP3:'Du hast standardmäßig <b>10 Sekunden</b> pro Entscheidung. Läuft die Zeit ab, steigst du automatisch aus.',
 rulesP4:'Das Budget wächst mit der Auktion: <b>10 Lose bedeuten 100 € für jeden</b>, 20 Lose 200 € und so weiter.',
 rulesP5:'Der Bot bewertet jedes Land nach Einwohnerzahl und würfelt pro Los eine neue Schmerzgrenze — du kannst ihn also nie ganz durchschauen. Diese Grenze ist absolut: Überbiete sie um einen Euro und das Los gehört dir.',
 rulesP6:'Die <b>Schwierigkeit</b> bestimmt, welche Länder überhaupt vorkommen: Anfänger nur Europa, Mittel alle Länder über 15 Millionen, Experte alle 196.',
 rulesP7:'Auch die Effizienz wird gewertet: Euro pro Million Einwohner. Weniger ist besser.',
 onlineTitle:'Online spielen', onlineIntro:'Einer eröffnet einen Raum und teilt den Code. Alle geben pro Los ein verdecktes Gebot ab, das höchste gewinnt. Es startet bei 1 €, ein Gebot von 0 heißt also, du setzt dieses Los aus.',
 appearAs:'Du erscheinst als', handleNote:'Zufälliges Kürzel. Kein Name, kein Konto, nichts über dich verlässt dieses Gerät.',
 openRoom:'Raum eröffnen', joinRoom:'Beitreten', roomCode:'Raum-Code', shareCode:'Gib den Code an die anderen weiter.',
 inRoom:'Im Raum', waitHost:'Warte auf den Gastgeber…', waitJoin:'Warte darauf, dass dein Gegner beitritt…',
 bothIn:'Beide Bieter sind da.', startAuction:'Auktion starten', leaveRoom:'Verlassen',
 sealedBid:'Verdecktes Gebot — du hast {n} {cur}', submit:'Abgeben', bidIn:'Gebot ist abgegeben', waitOthers:'Warte auf deinen Gegner…',
 fourChars:'Bitte vier Zeichen.', noRoom:'Kein Raum mit diesem Code.', alreadyStarted:'Diese Auktion läuft schon.',
 roomFull:'Der Raum ist voll — dieser Modus ist 1 gegen 1.', storageFail:'Der Speicher ist gerade nicht erreichbar.',
 needsNet:'Dieser Modus braucht eine Internetverbindung.', lotsWon:'Lose',
 youTag:'du', hostTag:'GASTGEBER',
 privacy:'Datenschutz', soon:'Bald', soonBody:'Online-Spiel ist noch nicht freigeschaltet. Alles andere läuft ohne Verbindung.',
 privP1:'Dieses Spiel hat keine Konten, keine Anmeldung und keine Analyse. Nichts, was du hier tust, wird irgendwohin gesendet.',
 privP2:'Vier Dinge werden gespeichert, und nur auf diesem Gerät: deine Sprache, die gewählte Darstellung, deine Bilanz gegen den Bot (samt dem zuletzt gewählten Spiel) und der zuletzt eingegebene Name. Beim Löschen der App verschwinden alle vier.',
 privP3:'Spitznamen sind freiwillig. Sie beschriften die Spieler während einer Runde; nur dein eigener wird auf diesem Gerät gemerkt, damit du ihn nicht neu eintippen musst.',
 privP4:'Keine Werbung, kein Tracking, keine Fremd-Bausteine.',
 wipe:'Alle Daten löschen', wipeTitle:'Alles löschen?', wipeBody:'Deine Bilanz, dein gespeicherter Name, deine Sprache und deine Darstellung werden von diesem Gerät entfernt.', wiped:'Gelöscht.',
 packFail:'Die Spieldaten konnten nicht geladen werden. Prüfe deine Verbindung und versuch es noch einmal.',
 loadingBorders:'Grenzen werden geladen…',
 packCountries:'Länder',
 packStates:'US-Staaten',
 packCapitals:'Hauptstädte',
 packWorld:'Welt',
 popLabel:'Einwohner',
 packSoonBody:'Weitere Pakete sind unterwegs.',
 footer:'Keine Konten · Kein Tracking · {n} Länder',
 appearance:'Darstellung',
 themeLight:'Darstellung: hell',
 themeDark:'Darstellung: dunkel',
 holds:'Höchstgebot · {name}',
 thinking:'Überlegt',
 tagOut:'Raus',
 aRaise:'Um {n} erhöhen',
 aBid:'Dein eigenes Gebot',
 aTimer:'Verbleibende Zeit',
 aSeconds:'Noch {n} Sekunden',
 aSound:'Ton an oder aus',
 aRecord:'Bilanz gegen den Bot',
 qBargain:'Schnäppchen',
 qFair:'Fairer Preis',
 qOver:'Zu teuer',
 dealBargain:'Unter dem Idealpreis von {n} {cur}',
 dealFair:'Rund um den Idealpreis von {n} {cur}',
 dealOver:'Über dem Idealpreis von {n} {cur}',
 collectionYours:'Deine Sammlung',
 collectionOf:'Sammlung von {name}',
 tapSkip:'Tippen zum Überspringen',
 seeResult:'Ergebnis ansehen',
 done:'Fertig',
 revealShort:'Alle Einwohnerzahlen sind geschwärzt. Tippe einen Balken an oder deck alle auf.',
 worldTitle:'Die Welt',
 worldCap:'Ziehen zum Drehen und Kippen · zwei Finger zum Zoomen',
 hiddenValue:'Verdeckt. Tippen zum Aufdecken.',
 cancel:'Abbrechen',
 freeLot:'gratis',
 soldTo:'{item} verkauft an {name} für {n} {cur}.',
 soloShort:'Ein Gegner, der Bot. Läuft offline.', multiShort:'2 bis 4 Spieler, ein Gerät.', onlineShort:'Raum-Code teilen und bieten.',
 smartestU:'<b>{name}</b> hat am klügsten eingekauft: {v} {unit}.'
},
it:{
 credits:'Crediti e licenze', creditsIntro:'Tutto in questo gioco è sul tuo dispositivo. Grazie a:', creditsPop:'<b>Popolazione USA</b> — U.S. Census Bureau, stime Vintage 2025 (NST-EST2025-POP). Pubblico dominio.', creditsCap:'<b>Popolazione delle capitali</b> — Nazioni Unite, DESA, Divisione Popolazione, World Urbanization Prospects: The 2018 Revision, File 13 (agglomerato urbano, 2018). CC BY 3.0 IGO. Dati non modificati; nessun avallo da parte delle Nazioni Unite.', creditsMap:'<b>Contorni degli stati USA</b> — file cartografici di confine del U.S. Census Bureau, a cura di us-atlas. Dati di pubblico dominio.', creditsImg:'<b>Immagini della mappa USA</b> — Natural Earth, rilievo ombreggiato (naturalearthdata.com). Pubblico dominio.', creditsWorld:'<b>Confini del mondo</b> — Natural Earth. Pubblico dominio.', creditsGlobe:'<b>Texture del globo</b> — immagini satellitari derivate dalla NASA. Pubblico dominio.', creditsThree:'<b>three.js</b> — © 2010–2021 three.js authors. Licenza MIT.', creditsSound:'<b>Suono</b> — ogni suono è sintetizzato sul tuo dispositivo, senza registrazioni. Anche il grido di vittoria da aquila è sintetizzato. Nei film quel grido è in realtà di una poiana codarossa, perché la voce dell’aquila di mare testabianca è un sottile cinguettio.', creditsFacts:'<b>Curiosità sugli stati USA</b> — scritte per questo gioco e non ancora verificate in modo indipendente.',
 lotsAll:'Tutti {n}', funFacts:'Curiosità', factsIntro:'Tutti gli stati di questa partita.',
 tagline:'Usa le tue conoscenze per battere i rivali',
 solo:'Solo', soloDesc:'Un rivale, il bot. Ha un prezzo in mente per ogni paese e si ritira appena lo superi. Funziona offline.',
 multi:'Multigiocatore', multiDesc:'Da 2 a 4 giocatori su un solo telefono. Due giocatori è il caso normale. Funziona offline.',
 online:'Online 1 contro 1', onlineDesc:'Condividi un codice stanza e fai offerte contro un altro giocatore.', onlineOff:'Serve una connessione — non disponibile ora.',
 before:'Prima di iniziare', how:'Come si gioca', language:'Lingua',
 lots:'Lotti', shortHint:"Con 5 lotti conta soprattutto la fortuna: un solo lotto grande può decidere tutto. Da 10 lotti in su conta l'abilità.", budget:'Budget a testa', budgetNote:"Cresce con l'asta — 10 € per lotto.",
 difficulty:'Difficoltà', lvBeginner:'Principiante — solo Europa', lvMedium:'Medio — oltre 15 milioni', lvExpert:'Esperto — tutti i 196 paesi',
 seconds:'Secondi per decidere', noClock:'Senza tempo',
 nickOne:'Il tuo soprannome (facoltativo)', nickMany:'Soprannomi (facoltativi)', playersN:'Giocatori',
 open:"Apri l'asta", back:'Indietro', rival:'Il tuo rivale',
 rivalDesc:'Il <b>bot</b> valuta ogni paese in base alla popolazione e tira un nuovo limite per ogni lotto, quindi non è mai del tutto prevedibile. Supera quel limite di un euro e il lotto è tuo — non va mai oltre.',
 you:'Tu', bot:'Bot', player:'Giocatore',
 nowBidding:'Tocca a', standing:'Offerta attuale', topBid:'OFFERTA PIÙ ALTA', biddingNow:'STA OFFRENDO',
 raiseOrDrop:'rilancia o ritirati', dropOut:'Ritirati', bid:'Offri', lot:'Lotto', of:'di',
 noRaise:'Non hai abbastanza per rilanciare. Devi ritirarti.',
 dropHint:'Se ti ritiri, {name} lo compra per {price} €.',
 deciding:'sta decidendo', sizing:'Sta valutando il lotto a {price} {cur}.',
 nextLot:'Prossimo lotto', sold:'Venduto', result:'Risultato',
 sealed:'I libri sono sigillati', nobody:'Ancora nessuno lo sa',
 revealHint:'Tutte le popolazioni sono ancora oscurate. Tocca una barra per scoprirla, o scoprile tutte insieme. Il risultato vale quando sparisce l’ultima barra.',
 liftAll:'Scopri tutto', final:'Finale', takesIt:'{name} vince',
 pointsAgainst:'{a} punti contro {b}.', smartest:'<b>{name}</b> ha comprato meglio: {v} € per milione.',
 nothing:'Se n’è andato a mani vuote.', points:'Punti', spentEff:'{n} {cur} spesi · efficienza',
 playAgain:'Rigioca', menu:'Menu', world:'Il mondo di {name} · trascina per ruotare · pizzica per lo zoom',
 leaveTitle:"Uscire dall'asta?", leaveBody:'Questo turno andrà perso e tornerai al menu principale.',
 leave:'Esci', stay:'Resta qui',
 twoMin:'Minimo due giocatori.', tooMuch:'Più di quanto hai.', mustBeat:'Deve superare {price} {cur}.',
 record:'Bilancio contro il bot', wins:'Vittorie', losses:'Sconfitte', draws:'Pareggi',
 games:'Partite', streak:'Serie', bestStreak:'Serie migliore', winRate:'Percentuale di vittorie', avgPts:'Punti medi',
 bestGame:'Partita migliore', noGames:'Ancora nessuna partita in solo. Batti il bot e il conteggio parte.',
 reset:'Azzera il bilancio', resetTitle:'Azzerare il bilancio?', resetBody:'Tutti i risultati in solo su questo dispositivo verranno cancellati. Non si può annullare.',
 newRecord:'Nuovo primato personale', recordNote:'Solo partite in singolo. Resta su questo dispositivo, mai caricato.',
 rulesP1:'I paesi arrivano uno alla volta, a caso. <b>1 punto = 1 milione di abitanti</b>, e la popolazione resta oscurata fino alla fine.',
 rulesP2:'<b>Si parte da 1 €.</b> Quando tocca a te, rilanci o ti ritiri. Se ti ritiri, chi ha l’offerta più alta compra a quel prezzo — quindi rilanciare è un’arma: spingi su il rivale e resterà con un pessimo affare. Esagera e ci resti tu.',
 rulesP3:'Hai <b>10 secondi</b> per decidere, di base. Se il tempo scade, ti ritiri automaticamente.',
 rulesP4:'Il budget cresce con l’asta: <b>10 lotti danno 100 € a testa</b>, 20 lotti 200 € e così via.',
 rulesP5:'Il bot valuta ogni paese in base alla popolazione e tira un nuovo limite per ogni lotto, quindi non lo leggi mai del tutto. Quel limite è assoluto: superalo di un euro e il lotto è tuo.',
 rulesP6:'La <b>difficoltà</b> decide quali paesi possono uscire: Principiante solo Europa, Medio tutti i paesi sopra i 15 milioni, Esperto tutti e 196.',
 rulesP7:'Si valuta anche l’efficienza: euro per milione di abitanti. Meno è meglio.',
 onlineTitle:'Gioca online', onlineIntro:'Una persona apre una stanza e condivide il codice. Ognuno fa un’offerta segreta per lotto e vince la più alta. Si parte da 1 €, quindi offrire 0 significa saltare il lotto.',
 appearAs:'Apparirai come', handleNote:'Sigla casuale. Nessun nome, nessun account, niente su di te lascia questo dispositivo.',
 openRoom:'Apri una stanza', joinRoom:'Entra', roomCode:'Codice stanza', shareCode:'Condividilo con gli altri.',
 inRoom:'Nella stanza', waitHost:'In attesa dell’host…', waitJoin:'In attesa che entri il tuo avversario…',
 bothIn:'Ci sono entrambi.', startAuction:'Avvia l’asta', leaveRoom:'Esci',
 sealedBid:'Offerta segreta — hai {n} {cur}', submit:'Invia', bidIn:'Offerta inviata', waitOthers:'In attesa del tuo avversario…',
 fourChars:'Quattro caratteri, per favore.', noRoom:'Nessuna stanza con quel codice.', alreadyStarted:'Quell’asta è già iniziata.',
 roomFull:'La stanza è piena — questa modalità è 1 contro 1.', storageFail:'L’archivio non è raggiungibile in questo momento.',
 needsNet:'Questa modalità richiede una connessione a internet.', lotsWon:'lotti',
 youTag:'tu', hostTag:'HOST',
 privacy:'Privacy', soon:'Presto', soonBody:'Il gioco online non è ancora attivo. Tutto il resto funziona senza connessione.',
 privP1:'Questo gioco non ha account, né accessi, né analisi. Nulla di ciò che fai qui viene inviato da qualche parte.',
 privP2:'Vengono salvate quattro cose, e solo su questo dispositivo: la lingua scelta, l’aspetto scelto, il tuo bilancio contro il bot (con l’ultimo gioco scelto) e l’ultimo nome inserito. Disinstallando l’app spariscono tutte e quattro.',
 privP3:'I soprannomi sono facoltativi. Servono a identificare i giocatori durante una partita; solo il tuo viene ricordato su questo dispositivo, così non devi riscriverlo.',
 privP4:'Nessuna pubblicità, nessun tracciamento, nessun componente di terze parti.',
 wipe:'Cancella tutti i dati', wipeTitle:'Cancellare tutto?', wipeBody:'Il tuo bilancio, il nome salvato, la lingua e l’aspetto scelti verranno rimossi da questo dispositivo.', wiped:'Cancellato.',
 packFail:'Impossibile caricare i dati di gioco. Controlla la connessione e riprova.',
 loadingBorders:'caricamento confini…',
 packCountries:'Paesi',
 packStates:'Stati USA',
 packCapitals:'Capitali',
 packWorld:'Mondo',
 popLabel:'Popolazione',
 packSoonBody:'Altri pacchetti stanno arrivando.',
 footer:'Nessun account · Nessun tracciamento · {n} paesi',
 appearance:'Aspetto',
 themeLight:'Aspetto: chiaro',
 themeDark:'Aspetto: scuro',
 holds:'Offerta più alta · {name}',
 thinking:'Sta pensando',
 tagOut:'Fuori',
 aRaise:'Rilancia di {n}',
 aBid:'La tua offerta',
 aTimer:'Tempo rimasto',
 aSeconds:'{n} secondi rimasti',
 aSound:'Audio acceso o spento',
 aRecord:'Bilancio contro il bot',
 qBargain:'Affare',
 qFair:'Prezzo giusto',
 qOver:'Pagato troppo',
 dealBargain:'Sotto il prezzo ideale di {cur}{n}',
 dealFair:'Vicino al prezzo ideale di {cur}{n}',
 dealOver:'Sopra il prezzo ideale di {cur}{n}',
 collectionYours:'La tua collezione',
 collectionOf:'Collezione di {name}',
 tapSkip:'Tocca per saltare',
 seeResult:'Vedi il risultato',
 done:'Fatto',
 revealShort:'Ogni popolazione è oscurata. Tocca una barra per scoprirla, o scoprile tutte.',
 worldTitle:'Il mondo',
 worldCap:'Trascina per ruotare e inclinare · pizzica per zoomare',
 hiddenValue:'Nascosto. Tocca per scoprire.',
 cancel:'Annulla',
 freeLot:'gratis',
 soldTo:'{item} venduto a {name} per {cur}{n}.',
 soloShort:'Un rivale, il bot. Funziona offline.', multiShort:'Da 2 a 4 giocatori, un dispositivo.', onlineShort:'Condividi un codice stanza e fai le tue offerte.',
 smartestU:'<b>{name}</b> ha comprato nel modo più furbo: {v} {unit}.'
},
es:{
 credits:'Créditos y licencias', creditsIntro:'Todo en este juego está en tu dispositivo. Gracias a:', creditsPop:'<b>Población de EE. UU.</b> — U.S. Census Bureau, estimaciones Vintage 2025 (NST-EST2025-POP). Dominio público.', creditsCap:'<b>Población de las capitales</b> — Naciones Unidas, DAES, División de Población, World Urbanization Prospects: The 2018 Revision, archivo 13 (aglomeración urbana, 2018). CC BY 3.0 IGO. Datos sin modificar; no implica respaldo de las Naciones Unidas.', creditsMap:'<b>Contornos de los estados</b> — archivos cartográficos de límites del U.S. Census Bureau, empaquetados por us-atlas. Datos de dominio público.', creditsImg:'<b>Imágenes del mapa de EE. UU.</b> — Natural Earth, relieve sombreado (naturalearthdata.com). Dominio público.', creditsWorld:'<b>Fronteras del mundo</b> — Natural Earth. Dominio público.', creditsGlobe:'<b>Textura del globo</b> — imágenes de satélite derivadas de la NASA. Dominio público.', creditsThree:'<b>three.js</b> — © 2010–2021 three.js authors. Licencia MIT.', creditsSound:'<b>Sonido</b> — todos los sonidos se sintetizan en tu dispositivo; no hay grabaciones. El grito de victoria de águila también es sintético. En las películas ese grito es en realidad de un ratonero de cola roja, porque la voz del águila calva es un trino fino.', creditsFacts:'<b>Curiosidades de los estados</b> — escritas para este juego y aún sin verificar de forma independiente.',
 lotsAll:'Todos {n}', funFacts:'Curiosidades', factsIntro:'Todos los estados de esta partida.',
 tagline:'Usa tus conocimientos para vencer a tus rivales',
 solo:'Solo', soloDesc:'Un rival, el bot. Tiene un precio en mente para cada país y se retira en cuanto lo superas. Funciona sin conexión.',
 multi:'Multijugador', multiDesc:'De 2 a 4 jugadores en un mismo móvil. Dos jugadores es lo normal. Funciona sin conexión.',
 online:'Online 1 contra 1', onlineDesc:'Comparte un código de sala y puja contra otra persona.', onlineOff:'Necesita conexión — no disponible ahora.',
 before:'Antes de empezar', how:'Cómo se juega', language:'Idioma',
 lots:'Lotes', shortHint:"Con 5 lotes manda sobre todo la suerte: un solo lote grande puede decidirlo todo. Desde 10 lotes cuenta la habilidad.", budget:'Presupuesto por jugador', budgetNote:'Crece con la subasta — 10 € por lote.',
 difficulty:'Dificultad', lvBeginner:'Principiante — solo Europa', lvMedium:'Medio — más de 15 millones', lvExpert:'Experto — los 196 países',
 seconds:'Segundos por decisión', noClock:'Sin reloj',
 nickOne:'Tu apodo (opcional)', nickMany:'Apodos (opcionales)', playersN:'Jugadores',
 open:'Abrir la subasta', back:'Atrás', rival:'Tu rival',
 rivalDesc:'El <b>bot</b> valora cada país por su población y saca un límite nuevo en cada lote, así que nunca es del todo predecible. Supera ese límite por un euro y el lote es tuyo — nunca va más allá.',
 you:'Tú', bot:'Bot', player:'Jugador',
 nowBidding:'Le toca a', standing:'Puja actual', topBid:'PUJA MÁS ALTA', biddingNow:'ESTÁ PUJANDO',
 raiseOrDrop:'sube o retírate', dropOut:'Retirarse', bid:'Pujar', lot:'Lote', of:'de',
 noRaise:'No te queda dinero para subir. Tienes que retirarte.',
 dropHint:'Si te retiras, {name} lo compra por {price} €.',
 deciding:'está decidiendo', sizing:'Está valorando el lote a {price} {cur}.',
 nextLot:'Siguiente lote', sold:'Vendido', result:'Resultado',
 sealed:'Los libros están sellados', nobody:'Todavía nadie lo sabe',
 revealHint:'Todas las poblaciones siguen tapadas. Toca una barra para levantarla, o levántalas todas. El resultado vale cuando desaparezca la última.',
 liftAll:'Levantar todo', final:'Final', takesIt:'{name} gana',
 pointsAgainst:'{a} puntos contra {b}.', smartest:'<b>{name}</b> compró mejor: {v} € por millón.',
 nothing:'Se fue con las manos vacías.', points:'Puntos', spentEff:'{n} {cur} gastados · eficiencia',
 playAgain:'Otra vez', menu:'Menú', world:'El mundo de {name} · arrastra para girar · pellizca para acercar',
 leaveTitle:'¿Salir de la subasta?', leaveBody:'Perderás esta ronda y volverás al menú principal.',
 leave:'Salir', stay:'Quedarme',
 twoMin:'Mínimo dos jugadores.', tooMuch:'Más de lo que tienes.', mustBeat:'Tiene que superar {price} {cur}.',
 record:'Balance contra el bot', wins:'Victorias', losses:'Derrotas', draws:'Empates',
 games:'Partidas', streak:'Racha', bestStreak:'Mejor racha', winRate:'Porcentaje de victorias', avgPts:'Puntos de media',
 bestGame:'Mejor partida', noGames:'Todavía no hay partidas en solitario. Gana al bot y empieza el recuento.',
 reset:'Borrar balance', resetTitle:'¿Borrar el balance?', resetBody:'Se borrarán todos los resultados en solitario de este dispositivo. No se puede deshacer.',
 newRecord:'Nuevo récord personal', recordNote:'Solo partidas en solitario. Se queda en este dispositivo, nunca se sube.',
 rulesP1:'Van saliendo países al azar, uno a uno. <b>1 punto = 1 millón de habitantes</b>, y la población sigue tapada hasta el final.',
 rulesP2:'<b>La puja empieza en 1 €.</b> En tu turno subes o te retiras. Si te retiras, quien tenga la puja más alta se lo lleva a ese precio — así que subir es un arma: empuja al rival y se quedará con un mal negocio. Pásate y el que se queda eres tú.',
 rulesP3:'Tienes <b>10 segundos</b> por decisión de forma predeterminada. Si se acaba el tiempo, te retiras automáticamente.',
 rulesP4:'El presupuesto crece con la subasta: <b>10 lotes dan 100 € a cada uno</b>, 20 lotes 200 €, y así.',
 rulesP5:'El bot valora cada país por su población y saca un límite nuevo en cada lote, así que nunca lo lees del todo. Ese límite es absoluto: supéralo por un euro y el lote es tuyo.',
 rulesP6:'La <b>dificultad</b> decide qué países pueden salir: Principiante solo Europa, Medio todos los países por encima de 15 millones, Experto los 196.',
 rulesP7:'También se puntúa la eficiencia: euros por millón de habitantes. Cuanto menos, mejor.',
 onlineTitle:'Jugar online', onlineIntro:'Una persona abre una sala y comparte el código. Cada uno hace una puja secreta por lote y gana la más alta. Se empieza en 1 €, así que pujar 0 significa saltarse el lote.',
 appearAs:'Aparecerás como', handleNote:'Alias aleatorio. Sin nombre, sin cuenta, nada tuyo sale de este dispositivo.',
 openRoom:'Abrir una sala', joinRoom:'Entrar', roomCode:'Código de sala', shareCode:'Compártelo con los demás.',
 inRoom:'En la sala', waitHost:'Esperando al anfitrión…', waitJoin:'Esperando a que entre tu rival…',
 bothIn:'Ya están los dos.', startAuction:'Empezar la subasta', leaveRoom:'Salir',
 sealedBid:'Puja secreta — tienes {n} {cur}', submit:'Enviar', bidIn:'Puja enviada', waitOthers:'Esperando a tu rival…',
 fourChars:'Cuatro caracteres, por favor.', noRoom:'No hay ninguna sala con ese código.', alreadyStarted:'Esa subasta ya ha empezado.',
 roomFull:'La sala está llena — este modo es 1 contra 1.', storageFail:'El almacenamiento no está disponible ahora mismo.',
 needsNet:'Este modo necesita conexión a internet.', lotsWon:'lotes',
 youTag:'tú', hostTag:'ANFITRIÓN',
 privacy:'Privacidad', soon:'Pronto', soonBody:'El juego en línea aún no está activado. Todo lo demás funciona sin conexión.',
 privP1:'Este juego no tiene cuentas, ni inicio de sesión, ni analíticas. Nada de lo que haces aquí se envía a ningún sitio.',
 privP2:'Se guardan cuatro cosas, y solo en este dispositivo: el idioma que elegiste, la apariencia elegida, tu balance contra el bot (con el último juego elegido) y el último nombre introducido. Al borrar la app desaparecen las cuatro.',
 privP3:'Los apodos son opcionales. Sirven para identificar a los jugadores durante una partida; solo el tuyo se recuerda en este dispositivo, para que no tengas que escribirlo otra vez.',
 privP4:'Sin publicidad, sin rastreo, sin componentes de terceros.',
 wipe:'Borrar todos los datos', wipeTitle:'¿Borrar todo?', wipeBody:'Tu balance, tu nombre guardado, tu idioma y tu apariencia se eliminarán de este dispositivo.', wiped:'Borrado.',
 packFail:'No se pudieron cargar los datos del juego. Comprueba tu conexión e inténtalo de nuevo.',
 loadingBorders:'cargando fronteras…',
 packCountries:'Países',
 packStates:'Estados EE. UU.',
 packCapitals:'Capitales',
 packWorld:'Mundo',
 popLabel:'Población',
 packSoonBody:'Vienen más paquetes en camino.',
 footer:'Sin cuentas · Sin rastreo · {n} países',
 appearance:'Apariencia',
 themeLight:'Apariencia: clara',
 themeDark:'Apariencia: oscura',
 holds:'Puja más alta · {name}',
 thinking:'Pensando',
 tagOut:'Fuera',
 aRaise:'Subir {n}',
 aBid:'Tu propia puja',
 aTimer:'Tiempo restante',
 aSeconds:'Quedan {n} segundos',
 aSound:'Sonido activado o desactivado',
 aRecord:'Balance contra el bot',
 qBargain:'Ganga',
 qFair:'Precio justo',
 qOver:'Pagado de más',
 dealBargain:'Por debajo del precio ideal de {cur}{n}',
 dealFair:'Justo en torno al ideal de {cur}{n}',
 dealOver:'Por encima del precio ideal de {cur}{n}',
 collectionYours:'Tu colección',
 collectionOf:'Colección de {name}',
 tapSkip:'Toca para saltar',
 seeResult:'Ver el resultado',
 done:'Listo',
 revealShort:'Todas las poblaciones están tachadas. Toca una barra para quitarla, o quítalas todas.',
 worldTitle:'El mundo',
 worldCap:'Arrastra para girar e inclinar · pellizca para hacer zoom',
 hiddenValue:'Oculto. Toca para descubrir.',
 cancel:'Cancelar',
 freeLot:'gratis',
 soldTo:'{item} vendido a {name} por {cur}{n}.',
 soloShort:'Un rival, el bot. Funciona sin conexión.', multiShort:'De 2 a 4 jugadores, un dispositivo.', onlineShort:'Comparte un código de sala y puja.',
 smartestU:'<b>{name}</b> compró de la forma más lista: {v} {unit}.'
},
fr:{
 credits:'Crédits et licences', creditsIntro:'Tout dans ce jeu est sur ton appareil. Merci à :', creditsPop:'<b>Population des États-Unis</b> — U.S. Census Bureau, estimations Vintage 2025 (NST-EST2025-POP). Domaine public.', creditsCap:'<b>Population des capitales</b> — Nations unies, DAES, Division de la population, World Urbanization Prospects: The 2018 Revision, fichier 13 (agglomération urbaine, 2018). CC BY 3.0 IGO. Données non modifiées ; aucune approbation des Nations unies.', creditsMap:'<b>Contours des États</b> — fichiers cartographiques de limites du U.S. Census Bureau, mis en forme par us-atlas. Données du domaine public.', creditsImg:'<b>Images de la carte des États-Unis</b> — Natural Earth, relief ombré (naturalearthdata.com). Domaine public.', creditsWorld:'<b>Frontières du monde</b> — Natural Earth. Domaine public.', creditsGlobe:'<b>Texture du globe</b> — imagerie satellite dérivée de la NASA. Domaine public.', creditsThree:'<b>three.js</b> — © 2010–2021 three.js authors. Licence MIT.', creditsSound:'<b>Son</b> — tous les sons sont synthétisés sur ton appareil, sans enregistrement. Le cri de victoire d’aigle est lui aussi synthétisé. Au cinéma ce cri est en réalité celui d’une buse à queue rousse, car la voix du pygargue à tête blanche est un mince pépiement.', creditsFacts:'<b>Le saviez-vous sur les États</b> — écrits pour ce jeu et pas encore vérifiés de façon indépendante.',
 lotsAll:'Tous {n}', funFacts:'Le saviez-vous ?', factsIntro:'Tous les États de cette partie.',
 tagline:'Utilise tes connaissances pour battre tes rivaux',
 solo:'Solo', soloDesc:'Un rival, le bot. Il a un prix en tête pour chaque pays et se retire dès que tu le dépasses. Fonctionne hors ligne.',
 multi:'Multijoueur', multiDesc:'2 à 4 joueurs sur un même téléphone. Deux joueurs, c’est le cas normal. Fonctionne hors ligne.',
 online:'En ligne 1 contre 1', onlineDesc:'Partage un code de salon et enchéris contre une autre personne.', onlineOff:'Nécessite une connexion — indisponible pour le moment.',
 before:'Avant de commencer', how:'Comment jouer', language:'Langue',
 lots:'Lots', shortHint:"À 5 lots, la chance compte surtout : un seul gros lot peut tout décider. À partir de 10 lots, l'adresse l'emporte.", budget:'Budget par joueur', budgetNote:'Augmente avec la vente — 10 € par lot.',
 difficulty:'Difficulté', lvBeginner:'Débutant — Europe seulement', lvMedium:'Moyen — plus de 15 millions', lvExpert:'Expert — les 196 pays',
 seconds:'Secondes par décision', noClock:'Sans chrono',
 nickOne:'Ton pseudo (facultatif)', nickMany:'Pseudos (facultatifs)', playersN:'Joueurs',
 open:'Ouvrir la vente', back:'Retour', rival:'Ton rival',
 rivalDesc:'Le <b>bot</b> évalue chaque pays selon sa population et tire une nouvelle limite à chaque lot, il n’est donc jamais tout à fait prévisible. Dépasse cette limite d’un euro et le lot est à toi — il ne va jamais au-delà.',
 you:'Toi', bot:'Bot', player:'Joueur',
 nowBidding:'Au tour de', standing:'Enchère en cours', topBid:'MEILLEURE OFFRE', biddingNow:'ENCHÉRIT',
 raiseOrDrop:'monte ou passe', dropOut:'Passer', bid:'Enchérir', lot:'Lot', of:'sur',
 noRaise:'Plus assez d’argent pour monter. Tu dois passer.',
 dropHint:'Si tu passes, {name} l’achète pour {price} €.',
 deciding:'réfléchit', sizing:'Évalue le lot à {price} {cur}.',
 nextLot:'Lot suivant', sold:'Adjugé', result:'Résultat',
 sealed:'Les registres sont scellés', nobody:'Personne ne sait encore',
 revealHint:'Toutes les populations sont encore masquées. Touche une barre pour la lever, ou lève-les toutes. Le résultat compte une fois la dernière barre partie.',
 liftAll:'Tout dévoiler', final:'Final', takesIt:'{name} l’emporte',
 pointsAgainst:'{a} points contre {b}.', smartest:'<b>{name}</b> a le mieux acheté : {v} € par million.',
 nothing:'Reparti les mains vides.', points:'Points', spentEff:'{n} {cur} dépensés · efficacité',
 playAgain:'Rejouer', menu:'Menu', world:'Le monde de {name} · fais glisser pour tourner · pince pour zoomer',
 leaveTitle:'Quitter la vente ?', leaveBody:'Cette manche sera perdue et tu retourneras au menu principal.',
 leave:'Quitter', stay:'Rester',
 twoMin:'Deux joueurs minimum.', tooMuch:'Plus que ce que tu as.', mustBeat:'Doit dépasser {price} {cur}.',
 record:'Bilan face au bot', wins:'Victoires', losses:'Défaites', draws:'Matchs nuls',
 games:'Parties', streak:'Série', bestStreak:'Meilleure série', winRate:'Taux de victoire', avgPts:'Points en moyenne',
 bestGame:'Meilleure partie', noGames:'Aucune partie en solo pour le moment. Bats le bot et le compteur démarre.',
 reset:'Réinitialiser le bilan', resetTitle:'Réinitialiser le bilan ?', resetBody:'Tous les résultats en solo de cet appareil seront effacés. Action irréversible.',
 newRecord:'Nouveau record personnel', recordNote:'Parties en solo uniquement. Reste sur cet appareil, jamais envoyé.',
 rulesP1:'Des pays tirés au hasard arrivent un par un. <b>1 point = 1 million d’habitants</b>, et la population reste masquée jusqu’à la toute fin.',
 rulesP2:'<b>Les enchères démarrent à 1 €.</b> À ton tour, tu montes ou tu passes. Si tu passes, celui qui a la meilleure offre l’achète à ce prix — monter est donc une arme : pousse ton rival et il se retrouve avec une mauvaise affaire. Va trop loin et c’est toi qui restes coincé.',
 rulesP3:'Tu as <b>10 secondes</b> par décision par défaut. Si le temps s’écoule, tu passes automatiquement.',
 rulesP4:'Le budget suit la vente : <b>10 lots donnent 100 € à chacun</b>, 20 lots 200 €, et ainsi de suite.',
 rulesP5:'Le bot évalue chaque pays selon sa population et tire une nouvelle limite à chaque lot, tu ne le cernes donc jamais tout à fait. Cette limite est absolue : dépasse-la d’un euro et le lot est à toi.',
 rulesP6:'La <b>difficulté</b> décide quels pays peuvent sortir : Débutant uniquement l’Europe, Moyen tous les pays au-dessus de 15 millions, Expert les 196.',
 rulesP7:'L’efficacité compte aussi : euros par million d’habitants. Moins, c’est mieux.',
 onlineTitle:'Jouer en ligne', onlineIntro:'Une personne ouvre un salon et partage le code. Chacun fait une offre secrète par lot et la plus haute l’emporte. On démarre à 1 €, donc une offre de 0 revient à passer le lot.',
 appearAs:'Tu apparaîtras comme', handleNote:'Pseudo aléatoire. Aucun nom, aucun compte, rien te concernant ne quitte cet appareil.',
 openRoom:'Ouvrir un salon', joinRoom:'Rejoindre', roomCode:'Code du salon', shareCode:'Partage-le avec les autres.',
 inRoom:'Dans le salon', waitHost:'En attente de l’hôte…', waitJoin:'En attente de ton adversaire…',
 bothIn:'Les deux enchérisseurs sont là.', startAuction:'Lancer la vente', leaveRoom:'Quitter',
 sealedBid:'Offre secrète — tu as {n} {cur}', submit:'Envoyer', bidIn:'Offre envoyée', waitOthers:'En attente de ton adversaire…',
 fourChars:'Quatre caractères, s’il te plaît.', noRoom:'Aucun salon avec ce code.', alreadyStarted:'Cette vente a déjà commencé.',
 roomFull:'Le salon est complet — ce mode est en 1 contre 1.', storageFail:'Le stockage est injoignable pour le moment.',
 needsNet:'Ce mode nécessite une connexion internet.', lotsWon:'lots',
 youTag:'toi', hostTag:'HÔTE',
 privacy:'Confidentialité', soon:'Bientôt', soonBody:'Le jeu en ligne n’est pas encore activé. Tout le reste fonctionne sans connexion.',
 privP1:'Ce jeu n’a ni compte, ni connexion, ni analyse. Rien de ce que tu fais ici n’est envoyé où que ce soit.',
 privP2:'Quatre choses sont enregistrées, uniquement sur cet appareil : la langue choisie, l’apparence choisie, ton bilan face au bot (avec le dernier jeu choisi) et le dernier prénom saisi. Supprimer l’app supprime les quatre.',
 privP3:'Les pseudos sont facultatifs. Ils servent à identifier les joueurs pendant une partie ; seul le tien est mémorisé sur cet appareil, pour que tu n’aies pas à le retaper.',
 privP4:'Aucune publicité, aucun suivi, aucun composant tiers.',
 wipe:'Effacer toutes les données', wipeTitle:'Tout effacer ?', wipeBody:'Ton bilan, ton prénom enregistré, ta langue et ton apparence seront retirés de cet appareil.', wiped:'Effacé.',
 packFail:'Impossible de charger les données du jeu. Vérifie ta connexion et réessaie.',
 loadingBorders:'chargement des frontières…',
 packCountries:'Pays',
 packStates:'États américains',
 packCapitals:'Capitales',
 packWorld:'Monde',
 popLabel:'Population',
 packSoonBody:'D’autres packs arrivent.',
 footer:'Aucun compte · Aucun suivi · {n} pays',
 appearance:'Apparence',
 themeLight:'Apparence : clair',
 themeDark:'Apparence : sombre',
 holds:'Meilleure enchère · {name}',
 thinking:'Réfléchit',
 tagOut:'Sorti',
 aRaise:'Surenchérir de {n}',
 aBid:'Ta propre enchère',
 aTimer:'Temps restant',
 aSeconds:'{n} secondes restantes',
 aSound:'Son activé ou coupé',
 aRecord:'Bilan face au bot',
 qBargain:'Bonne affaire',
 qFair:'Prix correct',
 qOver:'Trop payé',
 dealBargain:'Sous le prix idéal de {cur}{n}',
 dealFair:'Tout près du prix idéal de {cur}{n}',
 dealOver:'Au-dessus du prix idéal de {cur}{n}',
 collectionYours:'Ta collection',
 collectionOf:'Collection de {name}',
 tapSkip:'Touche pour passer',
 seeResult:'Voir le résultat',
 done:'Terminé',
 revealShort:'Chaque population est masquée. Touche une barre pour la lever, ou lève-les toutes.',
 worldTitle:'Le monde',
 worldCap:'Glisse pour faire tourner et incliner · pince pour zoomer',
 hiddenValue:'Masqué. Touche pour révéler.',
 cancel:'Annuler',
 freeLot:'gratuit',
 soldTo:'{item} adjugé à {name} pour {cur}{n}.',
 soloShort:'Un rival, le bot. Fonctionne hors ligne.', multiShort:'2 à 4 joueurs, un seul appareil.', onlineShort:'Partage un code de salon et enchéris.',
 smartestU:'<b>{name}</b> a acheté le plus malin : {v} {unit}.'
}
};

/* Pack-specific wording: only the lines that talk about countries are replaced for US States
   (every other string is shared). t() looks here first for the pack on screen. */
const STRP={ countries:{
 en:{ budgetNote:'Set by the difficulty and the round length — scarce on purpose.',
  rivalDesc:'The <b>bot</b> prices every country by population, spends its money evenly across the round and rolls a fresh walk-away limit for each lot. Each game it is in a different mood — cautious, balanced or bold — and you are not told which. If you run low on money it may go all-in to knock you out.',
  rulesP4:'Everyone starts with the same budget, set by the difficulty and the round length. <b>Medium and Expert: €50 for 5 countries, €100 for 10, €150 for 15, €200 for 20, €300 for 30</b>. Beginner gets half: €25, €50, €75, €100, €150. Money is scarce on purpose: even the biggest budget cannot buy the five biggest countries.',
  rulesP5:'The bot values every country by population and rolls a fresh walk-away limit for each lot, so you can never quite read it. It spends evenly, pays a little extra for the biggest countries, and each game it is cautious, balanced or bold. If it has far more money than you, it bids the amount you can no longer top. Beat its limit by one euro and the lot is yours — unless it can knock you out.',
  rulesP6:'<b>Difficulty</b> decides which countries can come up: Beginner draws from Europe only, Medium from every country above 15 million, Expert from all 196. Every country is equally likely and none comes up twice in a round. Short rounds are luck-heavy: with 5 or 10 countries one big draw can decide the game, most of all in Expert. The longer the round, the more skill counts.',
  rulesP8:'<b>Out of money?</b> When only one player still has money, that player takes every remaining country for €1 each. Going all in is a real risk: it hands the rest of the round to your rival.',
  unsoldNote:'{n} countries went unsold — nobody could afford them.' },
 de:{ budgetNote:'Hängt von Schwierigkeit und Rundenlänge ab – mit Absicht knapp.',
  rivalDesc:'Der <b>Bot</b> bewertet jedes Land nach Einwohnerzahl, verteilt sein Geld gleichmäßig über die Runde und würfelt pro Los eine neue Schmerzgrenze. In jedem Spiel hat er eine andere Laune – vorsichtig, ausgewogen oder mutig – und du erfährst nicht, welche. Wird dein Geld knapp, geht er womöglich aufs Ganze, um dich auszustechen.',
  rulesP4:'Alle starten mit demselben Budget, das von der Schwierigkeit und der Rundenlänge abhängt. <b>Mittel und Experte: 50 € für 5 Länder, 100 € für 10, 150 € für 15, 200 € für 20, 300 € für 30</b>. Anfänger bekommen die Hälfte: 25 €, 50 €, 75 €, 100 €, 150 €. Das Geld ist absichtlich knapp: Selbst das größte Budget reicht nicht für die fünf größten Länder.',
  rulesP5:'Der Bot bewertet jedes Land nach Einwohnerzahl und würfelt pro Los eine neue Schmerzgrenze, du kannst ihn also nie ganz durchschauen. Er verteilt sein Geld gleichmäßig, zahlt für die größten Länder etwas mehr und ist in jedem Spiel vorsichtig, ausgewogen oder mutig. Hat er viel mehr Geld als du, bietet er den Betrag, den du nicht mehr überbieten kannst. Überbiete seine Grenze um einen Euro und das Los gehört dir – es sei denn, er kann dich ausstechen.',
  rulesP6:'Die <b>Schwierigkeit</b> bestimmt, welche Länder vorkommen: Anfänger nur aus Europa, Mittel aus allen Ländern über 15 Millionen, Experte aus allen 196. Jedes Land kommt mit der gleichen Wahrscheinlichkeit dran und keines zweimal in derselben Runde. Kurze Runden sind glückslastig: Bei 5 oder 10 Ländern kann ein großer Treffer das Spiel entscheiden, im Expertenmodus am meisten. Je länger die Runde, desto mehr zählt Können.',
  rulesP8:'<b>Kein Geld mehr?</b> Hat nur noch ein Spieler Geld, bekommt er alle übrigen Länder für je 1 €. Alles auf eine Karte zu setzen ist ein echtes Risiko: Es schenkt deinem Gegner den Rest der Runde.',
  unsoldNote:'{n} Länder blieben unverkauft – niemand konnte sie bezahlen.' },
 it:{ budgetNote:'Dipende dalla difficoltà e dalla lunghezza della partita — scarso di proposito.',
  rivalDesc:'Il <b>bot</b> valuta ogni paese in base alla popolazione, distribuisce i soldi in modo uniforme lungo la partita e tira un nuovo limite per ogni lotto. Ogni partita ha un umore diverso — prudente, equilibrato o audace — e non ti viene detto quale. Se i tuoi soldi scarseggiano, può giocare il tutto per tutto per metterti fuori gioco.',
  rulesP4:'Tutti partono con lo stesso budget, deciso dalla difficoltà e dalla lunghezza della partita. <b>Medio ed Esperto: 50 € per 5 paesi, 100 € per 10, 150 € per 15, 200 € per 20, 300 € per 30</b>. I principianti hanno la metà: 25 €, 50 €, 75 €, 100 €, 150 €. Il denaro è scarso di proposito: nemmeno il budget più alto basta per i cinque paesi più grandi.',
  rulesP5:'Il bot valuta ogni paese in base alla popolazione e tira un nuovo limite di rinuncia per ogni lotto, quindi non riesci mai a leggerlo. Spende in modo uniforme, paga un po’ di più per i paesi più grandi ed è, partita per partita, prudente, equilibrato o audace. Se ha molti più soldi di te, offre la cifra che non puoi più superare. Supera il suo limite di un euro e il lotto è tuo — a meno che non riesca a metterti fuori gioco.',
  rulesP6:'La <b>difficoltà</b> decide quali paesi possono uscire: Principiante solo l’Europa, Medio ogni paese sopra i 15 milioni, Esperto tutti i 196. Ogni paese ha la stessa probabilità di uscire e nessuno esce due volte nella stessa partita. Le partite corte dipendono molto dalla fortuna: con 5 o 10 paesi una sola estrazione può decidere tutto, soprattutto in Esperto. Più la partita è lunga, più conta l’abilità.',
  rulesP8:'<b>Senza soldi?</b> Quando solo un giocatore ha ancora denaro, si prende tutti i paesi rimasti a 1 € ciascuno. Puntare tutto è un vero rischio: regala il resto della partita al rivale.',
  unsoldNote:'{n} paesi sono rimasti invenduti: nessuno poteva permetterseli.' },
 es:{ budgetNote:'Depende de la dificultad y de la duración de la partida — escaso a propósito.',
  rivalDesc:'El <b>bot</b> valora cada país por su población, reparte su dinero de forma pareja a lo largo de la partida y saca un límite nuevo en cada lote. En cada partida tiene un humor distinto — prudente, equilibrado o audaz — y no se te dice cuál. Si te quedas corto de dinero, puede jugárselo todo para dejarte fuera.',
  rulesP4:'Todos empiezan con el mismo presupuesto, que depende de la dificultad y de la duración de la partida. <b>Medio y Experto: 50 € para 5 países, 100 € para 10, 150 € para 15, 200 € para 20, 300 € para 30</b>. Principiante recibe la mitad: 25 €, 50 €, 75 €, 100 €, 150 €. El dinero escasea a propósito: ni el presupuesto más grande alcanza para los cinco países más grandes.',
  rulesP5:'El bot valora cada país por su población y saca un nuevo límite de retirada para cada lote, así que nunca puedes leerlo del todo. Gasta de forma pareja, paga algo más por los países más grandes y en cada partida es prudente, equilibrado o audaz. Si tiene mucho más dinero que tú, ofrece la cantidad que ya no puedes superar. Supera su límite por un euro y el lote es tuyo — a menos que pueda dejarte fuera.',
  rulesP6:'La <b>dificultad</b> decide qué países pueden salir: Principiante solo Europa, Medio todos los de más de 15 millones, Experto los 196. Todos los países tienen la misma probabilidad de salir y ninguno sale dos veces en la misma partida. Las partidas cortas dependen mucho de la suerte: con 5 o 10 países, un solo sorteo puede decidirlo todo, sobre todo en Experto. Cuanto más larga es la partida, más cuenta la habilidad.',
  rulesP8:'<b>¿Sin dinero?</b> Cuando solo un jugador conserva dinero, se lleva todos los países restantes por 1 € cada uno. Jugárselo todo es un riesgo real: le regala el resto de la ronda a tu rival.',
  unsoldNote:'{n} países quedaron sin vender: nadie podía pagarlos.' },
 fr:{ budgetNote:'Dépend de la difficulté et de la longueur de la partie — rare exprès.',
  rivalDesc:'Le <b>bot</b> évalue chaque pays selon sa population, répartit son argent régulièrement sur la partie et tire une nouvelle limite à chaque lot. À chaque partie il est d’humeur différente — prudent, équilibré ou audacieux — et on ne te dit pas laquelle. Si ton argent s’épuise, il peut jouer le tout pour le tout pour t’éliminer.',
  rulesP4:'Tout le monde commence avec le même budget, fixé par la difficulté et la longueur de la partie. <b>Moyen et Expert : 50 € pour 5 pays, 100 € pour 10, 150 € pour 15, 200 € pour 20, 300 € pour 30</b>. Débutant reçoit la moitié : 25 €, 50 €, 75 €, 100 €, 150 €. L’argent est rare exprès : même le plus gros budget ne suffit pas pour les cinq plus grands pays.',
  rulesP5:'Le bot évalue chaque pays selon sa population et tire une nouvelle limite d’abandon à chaque lot, impossible donc de le lire complètement. Il dépense régulièrement, paye un peu plus pour les plus grands pays et, à chaque partie, est prudent, équilibré ou audacieux. S’il a bien plus d’argent que toi, il offre le montant que tu ne peux plus surenchérir. Dépasse sa limite d’un euro et le lot est à toi — sauf s’il peut t’éliminer.',
  rulesP6:'La <b>difficulté</b> décide quels pays peuvent sortir : Débutant seulement l’Europe, Moyen tous les pays de plus de 15 millions, Expert les 196. Chaque pays a autant de chances de sortir et aucun ne sort deux fois dans la même partie. Les parties courtes dépendent beaucoup de la chance : avec 5 ou 10 pays, un seul tirage peut tout décider, surtout en Expert. Plus la partie est longue, plus l’habileté compte.',
  rulesP8:'<b>Plus d’argent ?</b> Quand un seul joueur a encore de l’argent, il rafle tous les pays restants pour 1 € chacun. Tout miser est un vrai risque : cela offre le reste de la manche à votre rival.',
  unsoldNote:'{n} pays sont restés invendus : personne ne pouvait les payer.' }
}, states:{
 en:{ budgetNote:'Set by the round length — scarce on purpose.',
  rivalDesc:'The <b>bot</b> prices every state by population, spends its money evenly across the round and rolls a fresh walk-away limit for each lot. Each game it is in a different mood — cautious, balanced or bold — and you are not told which. If you run low on money it may go all-in to knock you out.',
  rulesP1:'Random states come up one at a time, each one at most once per round. <b>1 point = 1 million people</b>, and the population stays blacked out until the very end.',
  rulesP4:'Everyone starts with the same budget, set by the round length: <b>$85 for 5 states, $165 for 10, $180 for 15, $210 for 20, $315 for 30, $420 for 40 and $525 for all 50</b>. Money is scarce on purpose: even the biggest budget cannot buy the four biggest states.',
  rulesP5:'The bot values every state by population and rolls a fresh walk-away limit for each lot, so you can never quite read it. It spends evenly, pays a little extra for the biggest states, and each game it is cautious, balanced or bold. If it has far more money than you, it bids the amount you can no longer top. Beat its limit by one dollar and the lot is yours — unless it can knock you out.',
  rulesP6:'Every state is equally likely to come up, and a state never comes up twice in the same round. Pick 5 to 40 states, or play all 50. Short rounds are luck-heavy: with 5 or 10 states one big draw can decide the game. The longer the round, the more skill counts.',
  rulesP8:'<b>Out of money?</b> When only one player still has money, that player takes every remaining state for $1 each. Going all in is a real risk: it hands the rest of the round to your rival.',
  unsoldNote:'{n} states went unsold — nobody could afford them.',
  rulesP7:'Efficiency is scored too: dollars per million people. Lower is better.',
  footer:'No accounts · No tracking · {n} states', worldTitle:'The map', world:'{name}’s states, lit in gold' },
 de:{ budgetNote:'Hängt von der Rundenlänge ab – mit Absicht knapp.',
  rivalDesc:'Der <b>Bot</b> bewertet jeden Bundesstaat nach Einwohnerzahl, verteilt sein Geld gleichmäßig über die Runde und würfelt pro Los eine neue Schmerzgrenze. In jedem Spiel hat er eine andere Laune – vorsichtig, ausgewogen oder mutig – und du erfährst nicht, welche. Wird dein Geld knapp, geht er womöglich aufs Ganze, um dich auszustechen.',
  rulesP1:'Nacheinander kommen zufällige Bundesstaaten auf den Tisch, jeder höchstens einmal pro Runde. <b>1 Punkt = 1 Million Einwohner</b>, und die Einwohnerzahl bleibt bis ganz zum Schluss geschwärzt.',
  rulesP4:'Alle starten mit demselben Budget, das von der Rundenlänge abhängt: <b>$85 für 5 Bundesstaaten, $165 für 10, $180 für 15, $210 für 20, $315 für 30, $420 für 40 und $525 für alle 50</b>. Das Geld ist absichtlich knapp: Selbst das größte Budget reicht nicht für die vier größten Bundesstaaten.',
  rulesP5:'Der Bot bewertet jeden Bundesstaat nach Einwohnerzahl und würfelt pro Los eine neue Schmerzgrenze, du kannst ihn also nie ganz durchschauen. Er verteilt sein Geld gleichmäßig, zahlt für die größten Staaten etwas mehr und ist in jedem Spiel vorsichtig, ausgewogen oder mutig. Hat er viel mehr Geld als du, bietet er den Betrag, den du nicht mehr überbieten kannst. Überbiete seine Grenze um einen Dollar und das Los gehört dir – es sei denn, er kann dich ausstechen.',
  rulesP6:'Jeder Bundesstaat kommt mit der gleichen Wahrscheinlichkeit dran, und keiner kommt in derselben Runde zweimal vor. Wähle 5 bis 40 Bundesstaaten oder spiel alle 50. Kurze Runden sind glückslastig: Bei 5 oder 10 Bundesstaaten kann ein großer Treffer das Spiel entscheiden. Je länger die Runde, desto mehr zählt Können.',
  rulesP8:'<b>Kein Geld mehr?</b> Hat nur noch ein Spieler Geld, bekommt er alle übrigen Bundesstaaten für je $1. Alles auf eine Karte zu setzen ist ein echtes Risiko: Es schenkt deinem Gegner den Rest der Runde.',
  unsoldNote:'{n} Bundesstaaten blieben unverkauft – niemand konnte sie bezahlen.',
  rulesP7:'Auch die Effizienz wird gewertet: Dollar pro Million Einwohner. Weniger ist besser.',
  footer:'Keine Konten · Kein Tracking · {n} Bundesstaaten', worldTitle:'Die Karte', world:'Die Staaten von {name}, golden markiert' },
 it:{ budgetNote:'Dipende dalla lunghezza della partita — scarso di proposito.',
  rivalDesc:'Il <b>bot</b> valuta ogni stato in base alla popolazione, distribuisce i soldi in modo uniforme lungo la partita e tira un nuovo limite di rinuncia per ogni lotto. Ogni partita ha un umore diverso – prudente, equilibrato o audace – e non ti dice quale. Se i tuoi soldi scarseggiano, può giocare il tutto per tutto per metterti fuori gioco.',
  rulesP1:'Escono stati a caso, uno alla volta e al massimo una volta per partita. <b>1 punto = 1 milione di abitanti</b>, e la popolazione resta oscurata fino alla fine.',
  rulesP4:'Tutti partono con lo stesso budget, deciso dalla lunghezza della partita: <b>$85 per 5 stati, $165 per 10, $180 per 15, $210 per 20, $315 per 30, $420 per 40 e $525 per tutti i 50</b>. Il denaro è scarso di proposito: nemmeno il budget più alto basta per i quattro stati più grandi.',
  rulesP5:'Il bot valuta ogni stato in base alla popolazione e tira un nuovo limite di rinuncia per ogni lotto, quindi non riesci mai a leggerlo. Spende in modo uniforme, paga un po’ di più per gli stati più grandi ed è, partita per partita, prudente, equilibrato o audace. Se ha molti più soldi di te, offre la cifra che non puoi più superare. Supera il suo limite di un dollaro e il lotto è tuo, a meno che non possa metterti fuori gioco.',
  rulesP6:'Ogni stato ha la stessa probabilità di uscire e nessuno esce due volte nella stessa partita. Scegli da 5 a 40 stati oppure gioca tutti i 50. Le partite corte dipendono molto dalla fortuna: con 5 o 10 stati una sola estrazione può decidere tutto. Più la partita è lunga, più conta l’abilità.',
  rulesP8:'<b>Senza soldi?</b> Quando solo un giocatore ha ancora denaro, si prende tutti gli stati rimasti a $1 ciascuno. Puntare tutto è un vero rischio: regala il resto della partita al rivale.',
  unsoldNote:'{n} stati sono rimasti invenduti: nessuno poteva permetterseli.',
  rulesP7:'Si valuta anche l’efficienza: dollari per milione di abitanti. Meno è meglio.',
  footer:'Nessun account · Nessun tracciamento · {n} stati', worldTitle:'La mappa', world:'Gli stati di {name}, evidenziati in oro' },
 es:{ budgetNote:'Depende de la duración de la partida — escaso a propósito.',
  rivalDesc:'El <b>bot</b> valora cada estado por su población, reparte su dinero de forma pareja a lo largo de la partida y saca un nuevo límite de retirada para cada lote. Cada partida tiene otro humor —prudente, equilibrado o audaz— y no te dice cuál. Si te quedas sin dinero, puede jugárselo todo para dejarte fuera.',
  rulesP1:'Salen estados al azar, uno a uno y como máximo una vez por partida. <b>1 punto = 1 millón de habitantes</b>, y la población permanece tachada hasta el final.',
  rulesP4:'Todos empiezan con el mismo presupuesto, que depende de la duración de la partida: <b>$85 para 5 estados, $165 para 10, $180 para 15, $210 para 20, $315 para 30, $420 para 40 y $525 para los 50</b>. El dinero escasea a propósito: ni el presupuesto más grande alcanza para los cuatro estados más grandes.',
  rulesP5:'El bot valora cada estado por su población y saca un nuevo límite de retirada para cada lote, así que nunca puedes leerlo del todo. Gasta de forma pareja, paga algo más por los estados más grandes y en cada partida es prudente, equilibrado o audaz. Si tiene mucho más dinero que tú, ofrece la cantidad que ya no puedes superar. Supera su límite por un dólar y el lote es tuyo, salvo que pueda dejarte fuera.',
  rulesP6:'Todos los estados tienen la misma probabilidad de salir y ninguno sale dos veces en la misma partida. Elige de 5 a 40 estados o juega los 50. Las partidas cortas dependen mucho de la suerte: con 5 o 10 estados, un solo sorteo puede decidirlo todo. Cuanto más larga es la partida, más cuenta la habilidad.',
  rulesP8:'<b>¿Sin dinero?</b> Cuando solo un jugador conserva dinero, se lleva todos los estados restantes por $1 cada uno. Jugárselo todo es un riesgo real: le regala el resto de la ronda a tu rival.',
  unsoldNote:'{n} estados quedaron sin vender: nadie podía pagarlos.',
  rulesP7:'También se puntúa la eficiencia: dólares por millón de habitantes. Cuanto menos, mejor.',
  footer:'Sin cuentas · Sin rastreo · {n} estados', worldTitle:'El mapa', world:'Los estados de {name}, en dorado' },
 fr:{ budgetNote:'Dépend de la longueur de la partie — rare exprès.',
  rivalDesc:'Le <b>bot</b> évalue chaque État selon sa population, répartit son argent régulièrement sur la partie et tire une nouvelle limite d’abandon à chaque lot. À chaque partie il est d’une humeur différente — prudent, équilibré ou audacieux — sans te dire laquelle. Si ton argent s’épuise, il peut tout jouer pour t’éliminer.',
  rulesP1:'Des États tombent au hasard, un par un et au plus une fois par partie. <b>1 point = 1 million d’habitants</b>, et la population reste masquée jusqu’à la fin.',
  rulesP4:'Tout le monde commence avec le même budget, fixé par la longueur de la partie : <b>$85 pour 5 États, $165 pour 10, $180 pour 15, $210 pour 20, $315 pour 30, $420 pour 40 et $525 pour les 50</b>. L’argent est rare exprès : même le plus gros budget ne suffit pas pour les quatre plus grands États.',
  rulesP5:'Le bot évalue chaque État selon sa population et tire une nouvelle limite d’abandon à chaque lot, impossible donc de le lire complètement. Il dépense régulièrement, paye un peu plus pour les plus grands États et, à chaque partie, est prudent, équilibré ou audacieux. S’il a bien plus d’argent que toi, il mise la somme que tu ne peux plus dépasser. Dépasse sa limite d’un dollar et le lot est à toi, sauf s’il peut t’éliminer.',
  rulesP6:'Chaque État a autant de chances de sortir, et aucun ne sort deux fois dans la même partie. Choisis de 5 à 40 États ou joue les 50. Les parties courtes dépendent beaucoup de la chance : avec 5 ou 10 États, un seul tirage peut tout décider. Plus la partie est longue, plus l’habileté compte.',
  rulesP8:'<b>Plus d’argent ?</b> Quand un seul joueur a encore de l’argent, il rafle tous les États restants pour $1 chacun. Tout miser est un vrai risque : cela offre le reste de la manche à votre rival.',
  unsoldNote:'{n} États sont restés invendus : personne ne pouvait les payer.',
  rulesP7:'L’efficacité compte aussi : dollars par million d’habitants. Moins, c’est mieux.',
  footer:'Aucun compte · Aucun suivi · {n} États', worldTitle:'La carte', world:'Les États de {name}, en or' }
}, capitals:{
 en:{ budgetNote:'Set by the difficulty and the round length — scarce on purpose.',
  rivalDesc:'The <b>bot</b> prices every capital by the size of its city, spends its money evenly across the round and rolls a fresh walk-away limit for each lot. Each game it is in a different mood — cautious, balanced or bold — and you are not told which. If you run low on money it may go all-in to knock you out.',
  rulesP1:'Random capital cities come up one at a time, each at most once per round. <b>1 point = 1 million people</b> living in the capital’s urban area, and the population stays blacked out until the very end.',
  rulesP4:'Everyone starts with the same budget, set by the difficulty and the round length. <b>Medium and Expert: €50 for 5 capitals, €100 for 10, €150 for 15, €200 for 20, €300 for 30</b>. Beginner gets half: €25, €50, €75, €100, €150. Money is scarce on purpose: even the biggest budget cannot buy the five biggest cities.',
  rulesP5:'The bot values every capital by its population and rolls a fresh walk-away limit for each lot, so you can never quite read it. It spends evenly, pays a little extra for the biggest cities, and each game it is cautious, balanced or bold. If it has far more money than you, it bids the amount you can no longer top. Beat its limit by one euro and the lot is yours — unless it can knock you out.',
  rulesP6:'<b>Difficulty</b> decides which capitals can come up: Beginner draws from Europe only, Medium from every capital with more than 2 million people, Expert from all 195 (the 193 UN member states plus Vatican City and Taipei). Where a country has several capitals, its seat of government is used. Every capital is equally likely and none comes up twice in a round. Short rounds are luck-heavy: with 5 or 10 capitals one big draw can decide the game. The longer the round, the more skill counts.',
  rulesP8:'<b>Out of money?</b> When only one player still has money, that player takes every remaining capital for €1 each. Going all in is a real risk: it hands the rest of the round to your rival.',
  unsoldNote:'{n} capitals went unsold — nobody could afford them.',
  footer:'No accounts · No tracking · {n} capitals' },
 de:{ budgetNote:'Hängt von Schwierigkeit und Rundenlänge ab – mit Absicht knapp.',
  rivalDesc:'Der <b>Bot</b> bewertet jede Hauptstadt nach der Größe ihrer Stadt, verteilt sein Geld gleichmäßig über die Runde und würfelt pro Los eine neue Schmerzgrenze. In jedem Spiel hat er eine andere Laune – vorsichtig, ausgewogen oder mutig – und du erfährst nicht, welche. Wird dein Geld knapp, geht er womöglich aufs Ganze, um dich auszustechen.',
  rulesP1:'Zufällige Hauptstädte kommen nacheinander auf den Tisch, jede höchstens einmal pro Runde. <b>1 Punkt = 1 Million Einwohner</b> des Stadtgebiets der Hauptstadt, und die Einwohnerzahl bleibt bis ganz zum Schluss geschwärzt.',
  rulesP4:'Alle starten mit demselben Budget, das von der Schwierigkeit und der Rundenlänge abhängt. <b>Mittel und Experte: 50 € für 5 Hauptstädte, 100 € für 10, 150 € für 15, 200 € für 20, 300 € für 30</b>. Anfänger bekommen die Hälfte: 25 €, 50 €, 75 €, 100 €, 150 €. Das Geld ist absichtlich knapp: Selbst das größte Budget reicht nicht für die fünf größten Städte.',
  rulesP5:'Der Bot bewertet jede Hauptstadt nach Einwohnerzahl und würfelt pro Los eine neue Schmerzgrenze, du kannst ihn also nie ganz durchschauen. Er verteilt sein Geld gleichmäßig, zahlt für die größten Städte etwas mehr und ist in jedem Spiel vorsichtig, ausgewogen oder mutig. Hat er viel mehr Geld als du, bietet er den Betrag, den du nicht mehr überbieten kannst. Überbiete seine Grenze um einen Euro und das Los gehört dir – es sei denn, er kann dich ausstechen.',
  rulesP6:'Die <b>Schwierigkeit</b> bestimmt, welche Hauptstädte vorkommen: Anfänger nur aus Europa, Mittel aus allen Hauptstädten mit mehr als 2 Millionen Einwohnern, Experte aus allen 195 (die 193 UN-Mitgliedstaaten plus Vatikanstadt und Taipeh). Hat ein Land mehrere Hauptstädte, zählt der Regierungssitz. Jede Hauptstadt kommt mit der gleichen Wahrscheinlichkeit dran und keine zweimal in derselben Runde. Kurze Runden sind glückslastig: Bei 5 oder 10 Hauptstädten kann ein großer Treffer das Spiel entscheiden. Je länger die Runde, desto mehr zählt Können.',
  rulesP8:'<b>Kein Geld mehr?</b> Hat nur noch ein Spieler Geld, bekommt er alle übrigen Hauptstädte für je 1 €. Alles auf eine Karte zu setzen ist ein echtes Risiko: Es schenkt deinem Gegner den Rest der Runde.',
  unsoldNote:'{n} Hauptstädte blieben unverkauft – niemand konnte sie bezahlen.',
  footer:'Keine Konten · Kein Tracking · {n} Hauptstädte' },
 it:{ budgetNote:'Dipende dalla difficoltà e dalla lunghezza della partita — scarso di proposito.',
  rivalDesc:'Il <b>bot</b> valuta ogni capitale in base alle dimensioni della città, distribuisce i soldi in modo uniforme lungo la partita e tira un nuovo limite per ogni lotto. Ogni partita ha un umore diverso — prudente, equilibrato o audace — e non ti viene detto quale. Se i tuoi soldi scarseggiano, può giocare il tutto per tutto per metterti fuori gioco.',
  rulesP1:'Escono capitali a caso, una alla volta e al massimo una volta per partita. <b>1 punto = 1 milione di abitanti</b> dell’area urbana della capitale, e la popolazione resta oscurata fino alla fine.',
  rulesP4:'Tutti partono con lo stesso budget, deciso dalla difficoltà e dalla lunghezza della partita. <b>Medio ed Esperto: 50 € per 5 capitali, 100 € per 10, 150 € per 15, 200 € per 20, 300 € per 30</b>. I principianti hanno la metà: 25 €, 50 €, 75 €, 100 €, 150 €. Il denaro è scarso di proposito: nemmeno il budget più alto basta per le cinque città più grandi.',
  rulesP5:'Il bot valuta ogni capitale in base alla popolazione e tira un nuovo limite di rinuncia per ogni lotto, quindi non riesci mai a leggerlo. Spende in modo uniforme, paga un po’ di più per le città più grandi ed è, partita per partita, prudente, equilibrato o audace. Se ha molti più soldi di te, offre la cifra che non puoi più superare. Supera il suo limite di un euro e il lotto è tuo — a meno che non riesca a metterti fuori gioco.',
  rulesP6:'La <b>difficoltà</b> decide quali capitali possono uscire: Principiante solo l’Europa, Medio ogni capitale con più di 2 milioni di abitanti, Esperto tutte le 195 (i 193 Stati membri dell’ONU più Città del Vaticano e Taipei). Se un paese ha più capitali, conta la sede del governo. Ogni capitale ha la stessa probabilità di uscire e nessuna esce due volte nella stessa partita. Le partite corte dipendono molto dalla fortuna: con 5 o 10 capitali una sola estrazione può decidere tutto. Più la partita è lunga, più conta l’abilità.',
  rulesP8:'<b>Senza soldi?</b> Quando solo un giocatore ha ancora denaro, si prende tutte le capitali rimaste a 1 € ciascuna. Puntare tutto è un vero rischio: regala il resto della partita al rivale.',
  unsoldNote:'{n} capitali sono rimaste invendute: nessuno poteva permettersele.',
  footer:'Nessun account · Nessun tracciamento · {n} capitali' },
 es:{ budgetNote:'Depende de la dificultad y de la duración de la partida — escaso a propósito.',
  rivalDesc:'El <b>bot</b> valora cada capital por el tamaño de su ciudad, reparte su dinero de forma pareja a lo largo de la partida y saca un límite nuevo en cada lote. En cada partida tiene un humor distinto — prudente, equilibrado o audaz — y no se te dice cuál. Si te quedas corto de dinero, puede jugárselo todo para dejarte fuera.',
  rulesP1:'Salen capitales al azar, una a una y como máximo una vez por partida. <b>1 punto = 1 millón de habitantes</b> del área urbana de la capital, y la población permanece tachada hasta el final.',
  rulesP4:'Todos empiezan con el mismo presupuesto, que depende de la dificultad y de la duración de la partida. <b>Medio y Experto: 50 € para 5 capitales, 100 € para 10, 150 € para 15, 200 € para 20, 300 € para 30</b>. Principiante recibe la mitad: 25 €, 50 €, 75 €, 100 €, 150 €. El dinero escasea a propósito: ni el presupuesto más grande alcanza para las cinco ciudades más grandes.',
  rulesP5:'El bot valora cada capital por su población y saca un nuevo límite de retirada para cada lote, así que nunca puedes leerlo del todo. Gasta de forma pareja, paga algo más por las ciudades más grandes y en cada partida es prudente, equilibrado o audaz. Si tiene mucho más dinero que tú, ofrece la cantidad que ya no puedes superar. Supera su límite por un euro y el lote es tuyo — a menos que pueda dejarte fuera.',
  rulesP6:'La <b>dificultad</b> decide qué capitales pueden salir: Principiante solo Europa, Medio todas las de más de 2 millones de habitantes, Experto las 195 (los 193 Estados miembros de la ONU más la Ciudad del Vaticano y Taipéi). Si un país tiene varias capitales, cuenta la sede del gobierno. Todas las capitales tienen la misma probabilidad de salir y ninguna sale dos veces en la misma partida. Las partidas cortas dependen mucho de la suerte: con 5 o 10 capitales, un solo sorteo puede decidirlo todo. Cuanto más larga es la partida, más cuenta la habilidad.',
  rulesP8:'<b>¿Sin dinero?</b> Cuando solo un jugador conserva dinero, se lleva todas las capitales restantes por 1 € cada una. Jugárselo todo es un riesgo real: le regala el resto de la ronda a tu rival.',
  unsoldNote:'{n} capitales quedaron sin vender: nadie podía pagarlas.',
  footer:'Sin cuentas · Sin rastreo · {n} capitales' },
 fr:{ budgetNote:'Dépend de la difficulté et de la longueur de la partie — rare exprès.',
  rivalDesc:'Le <b>bot</b> évalue chaque capitale selon la taille de sa ville, répartit son argent régulièrement sur la partie et tire une nouvelle limite à chaque lot. À chaque partie il est d’humeur différente — prudent, équilibré ou audacieux — et on ne te dit pas laquelle. Si ton argent s’épuise, il peut jouer le tout pour le tout pour t’éliminer.',
  rulesP1:'Des capitales tombent au hasard, une par une et au plus une fois par partie. <b>1 point = 1 million d’habitants</b> de l’agglomération de la capitale, et la population reste masquée jusqu’à la fin.',
  rulesP4:'Tout le monde commence avec le même budget, fixé par la difficulté et la longueur de la partie. <b>Moyen et Expert : 50 € pour 5 capitales, 100 € pour 10, 150 € pour 15, 200 € pour 20, 300 € pour 30</b>. Débutant reçoit la moitié : 25 €, 50 €, 75 €, 100 €, 150 €. L’argent est rare exprès : même le plus gros budget ne suffit pas pour les cinq plus grandes villes.',
  rulesP5:'Le bot évalue chaque capitale selon sa population et tire une nouvelle limite d’abandon à chaque lot, impossible donc de le lire complètement. Il dépense régulièrement, paye un peu plus pour les plus grandes villes et, à chaque partie, est prudent, équilibré ou audacieux. S’il a bien plus d’argent que toi, il offre le montant que tu ne peux plus surenchérir. Dépasse sa limite d’un euro et le lot est à toi — sauf s’il peut t’éliminer.',
  rulesP6:'La <b>difficulté</b> décide quelles capitales peuvent sortir : Débutant seulement l’Europe, Moyen toutes celles de plus de 2 millions d’habitants, Expert les 195 (les 193 États membres de l’ONU plus la Cité du Vatican et Taipei). Quand un pays a plusieurs capitales, c’est le siège du gouvernement qui compte. Chaque capitale a autant de chances de sortir et aucune ne sort deux fois dans la même partie. Les parties courtes dépendent beaucoup de la chance : avec 5 ou 10 capitales, un seul tirage peut tout décider. Plus la partie est longue, plus l’habileté compte.',
  rulesP8:'<b>Plus d’argent ?</b> Quand un seul joueur a encore de l’argent, il rafle toutes les capitales restantes pour 1 € chacune. Tout miser est un vrai risque : cela offre le reste de la manche à ton rival.',
  unsoldNote:'{n} capitales sont restées invendues : personne ne pouvait les payer.',
  footer:'Aucun compte · Aucun suivi · {n} capitales' }
}};

let LANG='en';
function t(key, vars){
  const po=STRP[PACK ? PACK.id : SELPACK];
  let v=(po&&((po[LANG]&&po[LANG][key])||(po.en&&po.en[key]))) || (STR[LANG]&&STR[LANG][key]) || STR.en[key] || key;
  vars=Object.assign({cur:cur()}, vars);
  Object.keys(vars).forEach(k=>{ v=v.split('{'+k+'}').join(vars[k]); });
  /* a pack in dollars (US States) says "$" in every language: "€10", "10 €" and "100 €" all become "$10", "$100" */
  if(cur()!=='€') v=v.replace(/€\s?(\d[\d.,]*)/g,(m,n)=>cur()+n).replace(/(\d[\d.,]*)\s?€/g,(m,n)=>cur()+n);
  return v;
}
async function loadLang(){
  const v=await Store.get('lang:v1'); if(v&&STR[v]){ LANG=v; document.documentElement.lang=LANG; return; }
  const n=(navigator.language||'en').slice(0,2);
  if(STR[n]) LANG=n;
  document.documentElement.lang=LANG;
}
async function setLang(id){
  if(!STR[id]) return;
  LANG=id; document.documentElement.lang=LANG;
  await Store.set('lang:v1', id);
  home();
}

/* ============ ALL-TIME RECORD — you against the bot, stored on this device ============
   One value under `record:v1`, one record per pack (engine.js documents the shape and
   migrates the original flat record). Only solo games count. Nothing leaves the phone
   and no names are kept. */
let RECS = Engine.parseRecords(null, Packs.ids());
const recFor = id => RECS.packs[id] || (RECS.packs[id] = Engine.blankPackRecord());

async function loadRec(){ RECS = Engine.parseRecords(await Store.get(Engine.REC_KEY), Packs.ids()); if (RECS.last) SELPACK = RECS.last; }   // reopen on the pack you last picked
async function saveRec(){ await Store.set(Engine.REC_KEY, Engine.stringifyRecords(RECS)); }
async function clearRec(){ RECS = Engine.parseRecords(null, Packs.ids()); await saveRec(); }

/* returns what changed, so the results screen can show it */
async function recordGame(you, bot, level){
  const out = Engine.applyGame(recFor(S.pack.id), you, bot, level);
  await saveRec();
  return out;
}

/* ============ HOME ============ */
function home() {
  stopPoll(); S = {}; PACK = null;
  $$('.overlay', layer).forEach(o => o.remove()); rootEl.classList.remove('soldOpen', 'celebrating');
  try { speechSynthesis.cancel(); } catch (e) {}
  const REC = recFor(SELPACK), net = isOnline(), count = Packs.meta(SELPACK).count;
  const lang = LANGS.find(l => l.id === LANG) || LANGS[0], has = REC.played > 0;
  const sec = go(`
    <div class="nav"><span></span>${navBtns()}</div>
    <div class="menu-grid">
      <div class="m-l">
        <div class="hero" data-pk="${SELPACK}"><img class="globe" src="globe-hero.webp" alt="" width="280" height="280" decoding="async">
          <h1 class="title"><span>Bidding</span><span class="goldtext">Wars</span></h1>
          <p class="tag">${esc(t('tagline'))}</p></div>
        <button class="glass recpill" id="mrec" aria-label="${esc(t('aRecord'))}">
          <span class="big num">${REC.won}<i>–</i>${REC.lost}${REC.drawn ? `<i>–</i>${REC.drawn}` : ''}</span>
          <span class="m"><b>${esc(t('record'))}</b><br>${has ? `${REC.played} ${esc(t('games'))} · ${Math.round(REC.won / REC.played * 100)}% ${esc(t('winRate'))}` : esc(t('noGames'))}</span>
          ${has && REC.streak > 1 ? `<span class="streak">+${REC.streak}</span>` : ''}
        </button>
      </div>
      <div class="m-r">
        <div class="packs" role="list">
          ${[['countries', 'packCountries'], ['states', 'packStates'], ['capitals', 'packCapitals']].map(([id, k]) => { const pm = Packs.meta(id), sel = id === SELPACK; return `<button class="pack ${sel ? 'on glass2' : 'off'}" data-pack="${id}" role="listitem" ${sel ? 'aria-current="true"' : ''}><b>${esc(t(k))}</b><span class="s">${pm.count} · ${esc(t('popLabel'))}</span></button>`; }).join('')}
          ${['packWorld'].map(k => `<button class="pack off" data-soon="1" role="listitem" aria-disabled="true"><i>${esc(t('soon'))}</i><b>${esc(t(k))}</b><span class="s">${esc(t('popLabel'))}</span></button>`).join('')}
        </div>
        <div class="modes">
          <button class="glass mode" id="m1"><span class="ic">${IC('person')}</span><span class="t"><b>${esc(t('solo'))}</b><span class="d">${esc(t('soloShort'))}</span></span><span class="go">${IC('chev', 'sm')}</span></button>
          <button class="glass mode" id="m2"><span class="ic b">${IC('people')}</span><span class="t"><b>${esc(t('multi'))}</b><span class="d">${esc(t('multiShort'))}</span></span><span class="go">${IC('chev', 'sm')}</span></button>
          <button class="glass mode dim" id="m3" ${Net.available ? '' : 'aria-disabled="true"'}><span class="ic c">${IC('globe')}</span><span class="t"><b>${esc(t('online'))}<span class="soon">${Net.available ? 'Beta' : esc(t('soon'))}</span></b><span class="d">${esc(!Net.available ? t('onlineShort') : net ? t('onlineDesc') : t('onlineOff'))}</span></span></button>
        </div>
        <div class="dockbar">
          <button class="glass chipbtn" id="mr">${IC('book', 'sm')}${esc(t('how'))}</button>
          <button class="glass chipbtn" id="ml" aria-label="${esc(t('language'))}: ${esc(lang.label)}"><span aria-hidden="true">${flag(langFlag(lang))}</span> ${esc(lang.label)}</button>
          <button class="glass chipbtn sq" id="mp" aria-label="${esc(t('privacy'))}">${IC('lock', 'sm')}</button>
        </div>
        <p class="foot">${esc(t('footer', { n: count }))} · <span class="ver" aria-label="Version ${CONFIG.version}">v${CONFIG.version}</span></p>
      </div>
    </div>`, 'menu');
  const tap = (id, fn) => on(id, () => { Snd.ui(); Haptics.light(); fn(); });
  tap('m1', () => setup('solo'));
  tap('m2', () => setup('multi'));
  tap('m3', () => { if (!Net.available) return toast(t('soonBody')); if (!isOnline()) return toast(t('needsNet')); online(); });
  tap('mr', rules); tap('mp', privacy); tap('mrec', recordScreen); tap('ml', langSheet);
  $$('[data-soon]', sec).forEach(b => b.onclick = () => { Snd.ui(); toast(t('packSoonBody')); });
  $$('[data-pack]', sec).forEach(b => b.onclick = () => {
    if (b.dataset.pack === SELPACK) return;
    Snd.ui(); Haptics.light(); SELPACK = b.dataset.pack; RECS.last = SELPACK; saveRec(); home();
    (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => Packs.load(SELPACK).catch(() => {}));   // warm it up so Setup opens instantly
  });
}

function langSheet() {
  const h = sheet({ title: t('language'), foot: `<button class="btn gold" id="ld">${esc(t('done'))}</button>`,
    body: `<div class="group" role="radiogroup" aria-label="${esc(t('language'))}">${LANGS.map(l => `<button class="row" role="radio" aria-checked="${l.id === LANG}" data-l="${l.id}"><span class="t"><span aria-hidden="true">${flag(langFlag(l))}</span> ${esc(l.label)}</span>${l.id === LANG ? `<span class="val" aria-hidden="true">✓</span>` : ''}</button>`).join('')}</div>` });
  $$('[data-l]', h.wrap).forEach(b => b.onclick = () => { Snd.ui(); setLang(b.dataset.l); });
  on('ld', () => { Snd.ui(); h.close(); });
}

async function recordScreen() {
  const REC = recFor(SELPACK);
  let pack = Packs.get(SELPACK);
  if (!pack) { try { pack = await Packs.load(SELPACK); } catch (e) {} }   // only needed for the level names
  const pct = REC.played ? Math.round(REC.won / REC.played * 100) : 0;
  const avg = REC.played ? (REC.pts / REC.played) : 0, avgBot = REC.played ? (REC.botPts / REC.played) : 0;
  const lvlName = k => { const l = pack && pack.levels.find(x => x.id === k); return l ? (l.label[LANG] || l.label.en).split(' — ')[0] : k; };
  const row = (l, v) => `<div class="row"><span class="t">${esc(l)}</span><span class="val num">${v}</span></div>`;
  const h = sheet({ title: t('record'), foot: `${REC.played ? `<button class="btn ghost" id="rs">${esc(t('reset'))}</button>` : ''}<button class="btn gold" id="rd">${esc(t('done'))}</button>`,
    body: `<p class="label">${esc(pack ? (pack.title[LANG] || pack.title.en) : '')}</p>` + (REC.played ? `
      <div class="rec3"><div class="w"><div class="rn num">${REC.won}</div><div class="rl">${esc(t('wins'))}</div></div><div><div class="rn num">${REC.lost}</div><div class="rl">${esc(t('losses'))}</div></div><div><div class="rn num">${REC.drawn}</div><div class="rl">${esc(t('draws'))}</div></div></div>
      <div class="group">${row(t('games'), REC.played)}${row(t('winRate'), pct + '%')}${row(t('streak'), REC.streak > 0 ? '+' + REC.streak : REC.streak)}${row(t('bestStreak'), '+' + REC.best)}${row(t('avgPts'), avg.toFixed(1) + ' — ' + avgBot.toFixed(1))}${REC.bestGame ? row(t('bestGame'), REC.bestGame.pts) : ''}</div>
      ${(pack && pack.levels.length > 1) && Object.keys(REC.byLevel).filter(k => REC.byLevel[k].played).length ? `<div class="group">${Object.keys(REC.byLevel).filter(k => REC.byLevel[k].played).map(k => row(lvlName(k), REC.byLevel[k].won + '/' + REC.byLevel[k].played)).join('')}</div>` : ''}
      <p class="sm">${esc(t('recordNote'))}</p>` : `<p>${esc(t('noGames'))}</p>`) });
  on('rd', () => { Snd.ui(); h.close(); });
  on('rs', () => { Snd.ui(); ask(t('resetTitle'), t('resetBody'), t('reset'), async () => { await clearRec(); home(); }, null, t('cancel')); });
}

function privacy() {
  const h = sheet({ title: t('privacy'), foot: `<button class="btn ghost" id="wipe">${esc(t('wipe'))}</button><button class="btn gold" id="pd">${esc(t('done'))}</button>`,
    body: `<p>${esc(t('privP1'))}</p><p>${esc(t('privP2'))}</p><p>${esc(t('privP3'))}</p><p class="sm">${esc(t('privP4'))}</p><button class="btn glassb wide" id="cr">${esc(t('credits'))}</button>` });
  on('pd', () => { Snd.ui(); h.close(); });
  on('cr', () => { Snd.ui(); credits(); });
  on('wipe', () => { Snd.ui(); ask(t('wipeTitle'), t('wipeBody'), t('wipe'), async () => {
    await clearRec(); await Store.remove('lang:v1'); await Store.remove('name:v1'); await Store.remove('theme:v1');
    THEME = 'dark'; applyTheme(); toast(t('wiped')); home();
  }, null, t('cancel')); });
}

/* sources and licences for everything bundled (the full text lives in NOTICE.md) */
function credits() {
  const h = sheet({ title: t('credits'), foot: `<button class="btn gold" id="cd">${esc(t('done'))}</button>`,
    body: `<p>${esc(t('creditsIntro'))}</p>` + ['creditsPop', 'creditsCap', 'creditsMap', 'creditsImg', 'creditsWorld', 'creditsGlobe', 'creditsThree', 'creditsSound', 'creditsFacts'].map(k => `<p class="sm">${t(k)}</p>`).join('') });
  on('cd', () => { Snd.ui(); h.close(); });
}

function rules() {
  const h = sheet({ title: t('how'), foot: `<button class="btn gold" id="rd">${esc(t('done'))}</button>`,
    body: ['rulesP1', 'rulesP2', 'rulesP3', 'rulesP4', 'rulesP5', 'rulesP6'].concat(STRP[SELPACK] ? ['rulesP8'] : []).map(k => `<p>${t(k)}</p>`).join('') + `<p class="sm">${esc(t('rulesP7'))}</p>` });
  on('rd', () => { Snd.ui(); h.close(); });
}

/* ============ SETUP (a sheet over the menu, or over the results for "Play again") ============ */
let LASTCFG = null;                                  // this session only: "Play again" opens the sheet as you left it
const seg = (g, label, items, def) => `<div class="sg" role="radiogroup" aria-label="${esc(label)}" data-g="${g}">${items.map(([v, l]) => `<button type="button" role="radio" data-v="${v}" aria-checked="${String(v) === String(def)}">${esc(l)}</button>`).join('')}</div>`;

async function setup(kind, packId = SELPACK) {
  const tok = navTok;
  const h = sheet({ title: kind === 'solo' ? t('solo') : t('multi'), body: `<p style="text-align:center"><span class="spin"></span></p>`, foot: '' });
  let pack = Packs.get(packId);
  if (!pack) {
    try { pack = await Packs.load(packId); }
    catch (e) { if (tok === navTok && h.alive) { h.close(true); toast(t('packFail')); } return; }
    if (tok !== navTok || !h.alive) return;          // the player already went elsewhere
  }
  PACK = pack;
  const c0 = LASTCFG && LASTCFG.packId === pack.id && LASTCFG.kind === kind ? LASTCFG : {};
  const lots = pack.lots.options.includes(c0.lots) ? c0.lots : pack.lots.default;
  const level = pack.levels.some(l => l.id === c0.level) ? c0.level : pack.defaultLevel;
  const clock = [10, 15, 20, 30, 0].includes(c0.clock) ? c0.clock : 10;
  const nPl = [2, 3, 4].includes(c0.players) ? c0.players : 2;
  const lvl = l => (l.label[LANG] || l.label.en), lvlParts = l => { const p = lvl(l).split(' — '); return [p[0], p[1] || '']; };
  h.set(`
    ${kind === 'solo' ? `<p class="sm">${t('rivalDesc')}</p>` : `<p class="sm">${esc(t('multiDesc'))}</p>`}
    <div class="fld"><span class="label">${esc(t('lots'))}</span>${seg('lots', t('lots'), pack.lots.options.map(n => [n, n === pack.lots.all ? t('lotsAll', { n }) : n]), lots)}<p class="sm" id="lotHint" role="note"${lots <= 5 ? '' : ' hidden'}>${esc(t('shortHint'))}</p></div>
    <div class="budget"><span><span class="label">${esc(t('budget'))}</span><small>${esc(t('budgetNote'))}</small></span><b class="num" id="bud">${Engine.formatMoney(pack, Engine.budgetFor(pack, lots, level))}</b></div>
    ${pack.levels.length > 1 ? `<div class="fld"><span class="label">${esc(t('difficulty'))}</span><div class="lvls" role="radiogroup" aria-label="${esc(t('difficulty'))}" data-g="level">${pack.levels.map(l => { const [a, b] = lvlParts(l); return `<button type="button" class="lvl" role="radio" data-v="${l.id}" aria-checked="${l.id === level}"><span class="tt">${esc(a)}${b ? `<small>${esc(b)}</small>` : ''}</span><span class="ck" aria-hidden="true"></span></button>`; }).join('')}</div></div>` : ''}
    <div class="fld"><span class="label">${esc(t('seconds'))}</span>${seg('clock', t('seconds'), [[10, '10'], [15, '15'], [20, '20'], [30, '30'], [0, t('noClock')]], clock)}</div>
    ${kind === 'multi' ? `<div class="fld"><span class="label">${esc(t('playersN'))}</span>${seg('players', t('playersN'), [[2, '2'], [3, '3'], [4, '4']], nPl)}</div>` : ''}
    <div class="fld"><span class="label">${esc(kind === 'solo' ? t('nickOne') : t('nickMany'))}</span>
      <div class="names">${(kind === 'solo' ? [1] : [1, 2, 3, 4]).map(i => `<input class="field" id="p${i}" maxlength="16" autocomplete="off" autocapitalize="words" aria-label="${esc(t('player'))} ${i}" placeholder="${esc(t('player'))} ${i}" ${kind === 'multi' && i > nPl ? 'hidden' : ''}>`).join('')}</div></div>`,
    `<button class="btn gold big" id="start">${esc(t('open'))}</button><button class="btn ghost" id="back">${esc(t('back'))}</button>`);
  const box = h.wrap;
  const pick = g => { const b = $(`[data-g="${g}"] [aria-checked="true"]`, box); return b ? b.dataset.v : null; };
  const sync = () => { $('#bud', box).textContent = Engine.formatMoney(pack, Engine.budgetFor(pack, +pick('lots') || pack.lots.default, pick('level') || level)); };   // the budget depends on the lot count and the level
  $$('[data-g]', box).forEach(grp => $$('[role=radio]', grp).forEach(b => b.onclick = () => {
    $$('[role=radio]', grp).forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true');
    Snd.ui(); Haptics.light();
    if (grp.dataset.g === 'lots' || grp.dataset.g === 'level') sync();
    if (grp.dataset.g === 'lots') $('#lotHint', box).hidden = +b.dataset.v > 5;
    if (grp.dataset.g === 'players') [2, 3, 4].forEach(i => { const el = $('#p' + (i + 0), box); if (el) el.hidden = false; }), [3, 4].forEach(i => { const el = $('#p' + i, box); if (el) el.hidden = i > +b.dataset.v; });
  }));
  sync();
  Store.get('name:v1').then(n => { const el = $('#p1', box); if (n && el && !el.value) el.value = String(n).slice(0, 16); });
  on('back', () => { Snd.ui(); h.close(); });
  on('start', () => {
    Snd.unlock(); Snd.ui(); Haptics.medium();
    const p1val = val('p1').slice(0, 16); if (p1val) Store.set('name:v1', p1val);
    const count = kind === 'solo' ? 1 : +pick('players') || 2;
    let players;
    if (kind === 'solo') players = [{ name: p1val || t('you') }, { name: t('bot'), ai: true }];
    else players = [1, 2, 3, 4].slice(0, count).map(i => ({ name: val('p' + i).slice(0, 16) || `${t('player')} ${i}` }));
    LASTCFG = { packId: pack.id, kind, lots: +pick('lots'), level: pick('level'), clock: +pick('clock'), players: count };
    h.close(true);
    S = Engine.newAuction({ pack, kind, level: pick('level') || pack.defaultLevel, lots: +pick('lots') || pack.lots.default, clock: +pick('clock'), players, rng: rnd });
    S.packId = pack.id;
    lot();
  });
}

/* ============ THE LOT — ascending auction from €1 ============ */
let holdClock = 0;                                   // >0 while a sheet is open: the decision clock waits
let lockUntil = 0;                                   // hot-seat: the previous player's second tap must not land on the next player
let lockMs = 260;

function lot() {
  S._taunt = ''; S._raises = 0;
  const r = Engine.startLot(S);                      // opener rotation, walkover and broke endings live in the engine
  if (r.state === 'done') return finish();
  paintLot();
  speak(cname(S.items[S.i]));
  turn();
}

function tileHtml(p, i) {
  return `<div class="po" data-i="${i}" role="group"><span class="now"></span><span class="crown" aria-hidden="true">👑</span><div class="o s${i % 4}" aria-hidden="true">${esc(ini(p.name))}</div><div class="nm">${esc(p.name)}</div><div class="bd num">${money(p.budget)}</div><div class="rl"></div></div>`;
}

function paintLot() {
  PACK = S.pack;
  const c = S.items[S.i], L = S.L;
  const sec = go(`
    <p class="sr" id="live" role="status" aria-live="polite"></p>
    <div class="nav"><button class="ibtn pill" id="nb">${IC('menu')}${esc(t('menu'))}</button><span class="lotpill num">${esc(t('lot'))} ${S.i + 1} ${esc(t('of'))} ${S.items.length}</span>${navBtns(false)}</div>
    <div class="aud">
      <div class="aud-l"><div class="stage" id="stage">
        <div class="head"><div class="orb" aria-hidden="true">${icon(c)}</div><h2 class="cname ${cname(c).length <= 13 ? 'n1' : cname(c).length <= 20 ? 'n2' : 'n3'}" id="lotName">${esc(cname(c))}</h2></div>
        <div class="ringwrap idle" id="timer" role="progressbar" aria-label="${esc(t('aTimer'))}" aria-valuemin="0" aria-valuemax="${S.clock || 0}" aria-valuenow="${S.clock || 0}" style="--p:1">
          <svg viewBox="0 0 200 200" aria-hidden="true"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--gold1)"/><stop offset="1" style="stop-color:var(--gold2)"/></linearGradient></defs>
            <circle cx="100" cy="100" r="92" fill="none" stroke="var(--track)" stroke-width="9"/><circle class="prog" cx="100" cy="100" r="92" fill="none" stroke="url(#rg)" stroke-width="9" stroke-linecap="round"/></svg>
          <div class="in" id="bump"><div class="lbl">${esc(t('standing'))}</div><div class="price"><sup>${esc(cur())}</sup><span id="price">${L.price}</span></div></div><span class="secs num" id="secs" aria-hidden="true"></span></div>
        <div class="holder"><span class="dot s${L.holder % 4}" id="hd"></span><span id="hn"></span></div>
        <div class="taunt" id="taunt" aria-hidden="true">&nbsp;</div>
      </div></div>
      <div class="aud-r">
        <div class="orbs" id="players" style="--n:${S.players.length}">${S.players.map(tileHtml).join('')}</div>
        <div class="glass dock" id="ctrl"><div class="rnd num">${[1, 2, 5, 10, 25].map(n => `<button class="rb" data-s="${n}" aria-label="${esc(t('aRaise', { n }))}"><span aria-hidden="true">+</span>${n}</button>`).join('')}</div>
          <div class="custom"><input class="in" id="cus" type="number" inputmode="numeric" aria-label="${esc(t('aBid'))}"><button class="btn gold" id="cb">${esc(t('bid'))}</button></div>
          <button class="btn drop" id="pass">${esc(t('dropOut'))}</button></div>
      </div>
    </div>`, 'auction');
  $$('[data-s]', sec).forEach(b => b.onclick = () => { if (humanCan()) raise(S.L.price + parseInt(b.dataset.s)); });
  on('cb', () => { if (!humanCan()) return; const v = parseInt(val('cus')); if (!v || v <= S.L.price) { FX.shakeX($('#cus')); return toast(t('mustBeat', { price: S.L.price })); } raise(v); });
  $('#cus', sec).onkeydown = e => { if (e.key === 'Enter') $('#cb').click(); };
  $('#cus', sec).onfocus = () => extendClock(((S.pack.economy && S.pack.economy.typingBonus) || 0) * 1000);   // typing a 3-digit price takes longer than a tap
  on('pass', () => { if (humanCan()) pass(); });
  on('nb', () => {
    Snd.ui(); Haptics.light();
    ask(t('leaveTitle'), t('leaveBody'), t('leave'), () => home(), null);
  });
  const stage = $('#stage', sec);
  if (stage && !FX.reduced) FX.spring(stage, 0, 1, v => ({ opacity: Math.min(1, v * 1.5), transform: `translateY(${(1 - v) * -26}px) scale(${1.05 - .05 * v})` }), { k: 200, c: 15 });
  setRing(1, S.clock, false);
  refresh();
}

/* a human may act only while it is a human's turn on a lot that is still open */
function humanCan() {
  const L = S.L; if (!L || L.awarded || L.turn === null || !S.players[L.turn] || S.players[L.turn].ai) return false;
  return performance.now() >= lockUntil;
}

const live = msg => { const el = $('#live'); if (el) el.textContent = msg; };

/* repaint everything that changes while a lot is on the table, in place */
function refresh() {
  const L = S.L; if (!L || !$('#players')) return;
  const holder = S.players[L.holder];
  $$('.po').forEach(tile => {
    const i = +tile.dataset.i, p = S.players[i], turnNow = L.turn === i && !L.awarded, isTop = L.holder === i, out = !L.active.includes(i);
    tile.classList.toggle('active', turnNow); tile.classList.toggle('top', isTop); tile.classList.toggle('out', out);
    const bd = $('.bd', tile), prev = +(bd.dataset.v == null ? p.budget : bd.dataset.v);
    if (prev !== p.budget) FX.roll(bd, prev, p.budget, 320, v => money(Math.round(v))); else bd.textContent = money(p.budget);
    bd.dataset.v = p.budget;
    $('.now', tile).textContent = p.ai ? t('thinking') : t('nowBidding');
    const status = isTop ? money(L.price) : out ? t('tagOut') : p.bought.length + ' ×';
    $('.rl', tile).textContent = status;
    tile.setAttribute('aria-label', `${p.name}, ${money(p.budget)}, ${isTop ? t('topBid') + ' ' : ''}${status}${turnNow ? ', ' + (p.ai ? t('thinking') : t('nowBidding')) : ''}`);
  });
  $('#hn').textContent = t('holds', { name: holder.name });
  $('#hd').className = 'dot s' + (L.holder % 4);
}

function controls() {
  const L = S.L, actor = S.players[L.turn], human = !actor.ai, ctrl = $('#ctrl'); if (!ctrl) return;
  ctrl.classList.toggle('bot', !human);
  const budget = actor.budget;
  const steps = Engine.bidSteps(S.pack, L.price);                    // US States: the buttons follow the current price
  $$('[data-s]', ctrl).forEach((b, i) => {
    const n = steps[i];
    if (+b.dataset.s !== n) { b.dataset.s = n; b.innerHTML = `<span aria-hidden="true">+</span>${n}`; b.setAttribute('aria-label', t('aRaise', { n })); }
    b.disabled = !human || L.price + n > budget;
  });
  const inp = $('#cus'), cb = $('#cb'), pass = $('#pass');
  inp.disabled = !human || budget <= L.price; inp.min = L.price + 1; inp.max = budget; inp.value = '';
  inp.placeholder = money(L.price + 1) + '+';
  cb.disabled = inp.disabled; pass.disabled = !human;
  const tm = $('#timer'); if (tm) tm.classList.toggle('idle', !human || !S.clock);
  setRing(1, S.clock, false);
  live(human ? `${actor.name}: ${t('raiseOrDrop')}` : `${actor.name} ${t('deciding')}`);
}

function setRing(frac, sec, liveNow) {
  const tm = $('#timer'); if (!tm) return;
  tm.style.setProperty('--p', Math.max(0, Math.min(1, frac)).toFixed(4));
  tm.classList.toggle('warn', !!liveNow && frac < .34 && frac > 0);
  const el = $('#secs');
  if (el) el.textContent = liveNow && S.clock ? '0:' + String(Math.max(0, sec)).padStart(2, '0') : '';
  if (liveNow && sec != null && tm.getAttribute('aria-valuenow') !== String(sec)) tm.setAttribute('aria-valuenow', String(Math.max(0, sec)));
}

/* the decision clock: a smooth ring, one tick a second at the end, paused while a sheet is open */
let clk = null;
function startClock(onOut) {
  stopClock();
  const c = clk = { t0: performance.now(), last: performance.now(), total: S.clock * 1000, ext: false, lastSec: S.clock, raf: 0 };
  setRing(1, S.clock, true);
  const loop = now => {
    if (clk !== c) return;
    const dt = now - c.last; c.last = now;
    if (holdClock > 0 || dt > 250) c.t0 += dt;       // a sheet is open, or the page was in the background: the clock waits
    const left = c.total - (now - c.t0), frac = Math.min(1, Math.max(0, left / (S.clock * 1000))), sec = Math.ceil(left / 1000);
    setRing(frac, sec, true);
    if (sec !== c.lastSec) { c.lastSec = sec; if (sec <= 5 && sec > 0) { Snd.tick(sec <= 3); if (sec <= 3) Haptics.warning(); } }
    if (left <= 0) { stopClock(); return onOut(); }
    c.raf = requestAnimationFrame(loop);
  };
  c.raf = requestAnimationFrame(loop);
}
/* once per turn: add time when the player starts typing a custom amount (the ring stays full, the seconds grow) */
function extendClock(ms) { if (clk && !clk.ext && ms > 0) { clk.ext = true; clk.total += ms; } }
function stopClock() { if (clk) { cancelAnimationFrame(clk.raf); clk = null; } }
function clearTimer() { stopClock(); }              // platform.js and older callers

function turn() {
  stopClock();
  const L = S.L;
  if (L.turn === null || !S.players[L.turn]) return award();
  const actor = S.players[L.turn];
  refresh(); controls();
  if (actor.ai) return aiTurn();
  if (actor.budget <= L.price) toast(t('noRaise'));
  if (S.clock) startClock(() => pass(true));
}

function showPrice(prev) {
  const L = S.L, p = $('#price'); if (!p) return;
  FX.roll(p, prev, L.price, 280);
  FX.bump($('#bump'), 1.04);
  live(`${t('standing')} ${money(L.price)}. ${t('holds', { name: S.players[L.holder].name })}`);
}

function showTaunt(text) {
  const el = $('#taunt'); if (!el) return;
  el.textContent = text ? '“' + text + '”' : ' ';
  if (text && !FX.reduced) el.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
  if (text) live(text);
}

function raise(amount) {
  const L = S.L; if (!L || L.turn === null) return;
  const actor = S.players[L.turn], prev = L.price;
  const r = Engine.raise(S, amount);
  if (r.error === 'closed') return;                  // a late tap on a lot that was already sold
  if (r.error) { FX.shakeX($('#cus')); Haptics.warning(); return toast(r.error === 'tooMuch' ? t('tooMuch') : t('mustBeat', { price: L.price })); }
  stopClock();
  /* the bot bids on its own, unprompted, several times a lot: a quieter, softer tone keeps that from grating */
  S._raises = (S._raises || 0) + 1;
  if (actor.ai) Snd.bot(); else { Snd.raise(S._raises); Haptics.light(); }
  if (S.players.filter(p => !p.ai).length > 1) lockUntil = performance.now() + lockMs;
  refresh(); showPrice(prev); if (actor.ai) showTaunt(S._taunt);
  if (r.next === 'award') return award();
  turn();
}

function pass(timedOut) {
  const L = S.L; if (!L || L.turn === null) return;
  const actor = S.players[L.turn];
  const r = Engine.pass(S, timedOut);
  if (r.error) return;
  stopClock();
  Snd.drop(); Haptics.medium();
  if (S.players.filter(p => !p.ai).length > 1) lockUntil = performance.now() + lockMs;
  refresh();
  if (actor.ai) showTaunt(S._taunt); else live(`${actor.name}: ${t('dropOut')}`);
  if (r.next === 'award') return award();
  turn();
}

/* ============ THE BOT'S TURN — all local, no network, no cost ============ */
function think(ms) { return new Promise(r => setTimeout(r, ms)); }

async function aiTurn() {
  const S0 = S, L = S.L, c = S.items[S.i], me = S.players[L.turn];
  await think(1900 + rnd(1100));
  if (S !== S0 || S.L !== L || L.turn === null || S.players[L.turn] !== me || !$('#ctrl')) return;   // the player left or the lot moved on while it was thinking
  const d = Engine.botDecision(S);                   // walk-away roll, reserve, uncontested +1 and the random step: all in the engine
  if (d.type === 'raise') {
    S._taunt = Engine.tauntFor(S.pack, c, LANG, S._taunt, rnd);
    return raise(d.amount);
  }
  S._taunt = Engine.passLine(Banter, LANG, S._taunt, rnd);
  pass();
}

/* ============ SOLD — the gavel moment ============ */
function dealQuality(a) {
  const I = Math.max(1, Math.round(a.ideal));        // what the screen says the ideal is
  return { I, q: a.price < I ? 'bargain' : a.price <= Math.ceil(I * 1.3) ? 'fair' : 'overpay' };
}

async function award() {
  stopClock();
  const a = Engine.award(S);
  if (a.error) return;                               // already sold — never charge the winner twice
  const c = a.item, L = S.L, w = S.players[a.winner], mine = !w.ai, tok = navTok;
  if (w.ai) S._taunt = Engine.winLine(Banter, LANG, S._taunt, rnd);
  controls0(); refresh();
  const { I, q } = dealQuality(a), last = S.i >= S.items.length - 1;
  const prior = w.bought.slice(0, -1).slice(-3);
  const fact = Engine.factFor(S.pack, c, LANG);
  const dealTxt = t(q === 'bargain' ? 'dealBargain' : q === 'fair' ? 'dealFair' : 'dealOver', { n: I });
  const wrap = document.createElement('div');
  wrap.className = 'overlay'; wrap.id = 'sold'; wrap.dataset.q = q; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-label', t('sold'));
  wrap.innerHTML = `<p class="sr" role="status">${esc(t('soldTo', { item: cname(c), name: w.name, n: L.price }))} ${esc(fact)}</p>
    <div class="scrim"></div><div class="rays"></div><div class="flash"></div>
    <div class="plate slab"><b>${esc(t('sold'))}</b><small>${esc(t(q === 'bargain' ? 'qBargain' : q === 'fair' ? 'qFair' : 'qOver'))}</small></div>
    <div class="gvwrap">${FX.gavelMarkup()}</div>
    <div class="soldline"><div class="who"><span class="orb" aria-hidden="true">${icon(c)}</span><span>${esc(cname(c))} · <span class="num">${money(L.price)}</span> · ${esc(mine && S.players.filter(p => !p.ai).length === 1 ? t('you') : w.name)}</span></div>
      <div class="deal q-${q}">${esc(dealTxt)}</div>${fact ? `<p class="fact">${esc(fact)}</p>` : ''}</div>
    <div class="glass tray"><span class="lbl">${esc(mine && S.players.filter(p => !p.ai).length === 1 ? t('collectionYours') : t('collectionOf', { name: w.name }))}</span>${prior.map(b => `<span class="mini" aria-hidden="true">${icon(b)}</span>`).join('')}<span class="mini new" aria-hidden="true"></span></div>
    <div class="fly" aria-hidden="true">${icon(c)}</div>
    <button class="btn gold nextbtn" id="n">${esc(last ? t('seeResult') : t('nextLot'))}</button><p class="skiphint" aria-hidden="true">${esc(t('tapSkip'))}</p>`;
  layer.appendChild(wrap); rootEl.classList.add('soldOpen');
  const res = FX.playSold(wrap, { quality: q, flag: icon(c) });
  await res.done;
  rootEl.classList.remove('soldOpen');
  if (tok !== navTok) return;                        // left the auction during the moment
  S.i++; lot();
}
/* once a lot is sold the controls behind the moment are inert */
function controls0() { const ctrl = $('#ctrl'); if (ctrl) { ctrl.classList.add('bot'); $$('button,input', ctrl).forEach(x => x.disabled = true); } const tm = $('#timer'); if (tm) tm.classList.add('idle'); }

/* ============ REVEAL — no winner named until every bar is off ============ */
function finish() {
  stopClock(); S._taunt = '';
  try { speechSynthesis.cancel(); } catch (e) {}
  PACK = S.pack;
  const REC = recFor(S.pack.id);
  const { rows, best, bestEff } = Engine.scoreboard(S);
  const red = (v, label) => `<button type="button" class="redact" data-v="${esc(v)}" aria-label="${esc(label || t('hiddenValue'))}"></button>`;
  const seatOf = p => Math.max(0, S.players.indexOf(p)) % 4;
  const sec = go(`
    <div class="nav"><button class="ibtn pill" id="nb">${IC('menu')}${esc(t('menu'))}</button><span></span>${navBtns(false)}</div>
    <div class="res2">
      <div class="r-l">
        <div class="glass win" id="verdict"><div class="crown" aria-hidden="true">🔒</div><h2>${esc(t('sealed'))}</h2><p>${esc(t('revealShort'))}</p></div>
        <div class="glass lb" id="lb">${rows.map(r => `
          <div class="lbr"><div class="o s${seatOf(r.p)}" aria-hidden="true">${esc(ini(r.p.name))}</div><div class="n">${esc(r.p.name)}</div><div class="p">${red(r.pts.toFixed(1), t('points') + ' · ' + r.p.name)}</div></div>
          <div class="fl">${r.p.bought.length ? r.p.bought.map(b => `<span class="f1"><em aria-hidden="true">${icon(b)}</em><span class="sr">${esc(cname(b))}</span><span>${b.free ? esc(t('freeLot')) : money(b.price)}</span><s>${red(fmtVal(b.value), cname(b))}</s></span>`).join('') : `<span class="sm">${esc(t('nothing'))}</span>`}</div>`).join('')}
          ${S.unsold && S.unsold.length ? `<p class="sm unsold">${esc(t('unsoldNote', { n: S.unsold.length }))}</p>` : ''}
        </div>
      </div>
      <div class="r-r"><div id="extra" hidden></div>
        <div class="acts" id="acts"><button class="btn gold wide" id="rev">${esc(t('liftAll'))}</button></div></div>
    </div>`, 'results');
  on('nb', () => { Snd.ui(); home(); });

  const bars = $$('.redact', sec);
  let opened = 0, revealed = false;
  const lift = b => {
    if (b.classList.contains('open')) return;
    b.classList.add('open'); b.textContent = b.dataset.v; b.removeAttribute('aria-label'); b.tabIndex = -1;
    Snd.ui(); Haptics.light();
    if (!FX.reduced) b.animate([{ transform: 'scale(.85)', opacity: .3 }, { transform: 'scale(1.08)', opacity: 1, offset: .6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'ease-out' });
    opened++;
    if (opened === bars.length && !revealed) { revealed = true; setTimeout(() => reveal(sec, rows, best, bestEff, REC), 420); }
  };
  bars.forEach(b => b.onclick = () => lift(b));
  on('rev', () => { let d = 0; bars.forEach(b => { if (!b.classList.contains('open')) setTimeout(() => lift(b), d += 70); }); $('#rev').disabled = true; });
  if (!bars.length) { revealed = true; setTimeout(() => reveal(sec, rows, best, bestEff, REC), 200); }
}

/* The reveal is staged on purpose. Doing the confetti, the count-up, the card spring and the globe in
   the same frames made the old end screen stutter on a phone, so each gets its own beat:
   0 ms verdict springs in · 120 ms points count up · 260 ms sound + confetti · 520 ms globe card
   fades in · 2.4 s the live globe is built (its WebGL set-up is the one heavy job, so it waits until
   the celebration has finished). Blur on the glass panels is dropped while the confetti falls. */
async function reveal(sec, rows, best, bestEff, REC) {
  if (!sec.isConnected) return;
  const tok = navTok, win = !best.p.ai;
  let outcome = null;
  if (S.kind === 'solo' && rows.length === 2) {
    const you = rows.find(r => !r.p.ai), bot = rows.find(r => r.p.ai);
    if (you && bot) outcome = await recordGame(you, bot, S.level || 'expert');
    if (tok !== navTok) return;
  }
  rootEl.classList.add('celebrating');
  const lots = best.p.bought.filter(Engine.hasCoords);
  const single = S.players.filter(p => !p.ai).length === 1;
  const v = $('#verdict', sec);
  v.classList.add('final');
  v.innerHTML = `<div class="crown" aria-hidden="true">${best.p.ai ? '🤖' : '👑'}</div>
    <h2>${t('takesIt', { name: esc(best.p.name) })}</h2>
    <div class="pts goldtext num" aria-hidden="true"><span class="v" data-n="${best.pts}">${FX.reduced ? best.pts.toFixed(1) : '0.0'}</span><small>${esc(t('points'))}</small></div>
    <p class="sr">${best.pts.toFixed(1)} ${esc(t('points'))}</p>
    <p>${rows.filter(r => r !== best).map(r => `<b>${esc(r.p.name)}</b> ${r.pts.toFixed(1)}`).join(' · ')}</p>
    ${bestEff.eff !== Infinity ? `<p>${PACK.metric.effUnit === cur() + '/M' ? t('smartest', { name: esc(bestEff.p.name), v: bestEff.eff.toFixed(2) }) : t('smartestU', { name: esc(bestEff.p.name), v: bestEff.eff.toFixed(2), unit: esc((PACK.metric.effLabel && (PACK.metric.effLabel[LANG] || PACK.metric.effLabel.en)) || PACK.metric.effUnit) })}</p>` : ''}`;
  if (!FX.reduced) FX.spring(v, 0, 1, x => ({ transform: `scale(${.96 + .04 * x})`, opacity: Math.min(1, x * 1.6) }), { k: 220, c: 14 });
  $('#acts', sec).innerHTML = `<button class="btn glassb" id="again">${esc(t('playAgain'))}</button><button class="btn gold" id="menu">${esc(t('menu'))}</button>${PACK.facts ? `<button class="btn glassb wide" id="facts">${esc(t('funFacts'))}</button>` : ''}`;
  on('again', () => { Snd.ui(); S.kind === 'net' ? online() : setup(S.kind || 'multi', S.pack.id); });
  on('facts', () => { Snd.ui(); factsSheet(); });
  on('menu', () => { Snd.ui(); home(); });
  live(`${t('takesIt', { name: best.p.name })} — ${best.pts.toFixed(1)} ${t('points')}`);

  const step = (ms, fn) => setTimeout(() => { if (tok === navTok) fn(); }, FX.reduced ? 0 : ms);
  step(120, () => {
    const n = $('.pts .v', v); if (n) FX.roll(n, 0, +n.dataset.n, 700, x => x.toFixed(1));
  });
  step(260, () => {
    if (win) { S.pack.map === 'us' ? Snd.eagle() : Snd.fanfare(); Haptics.success(); if (single || !best.p.ai) FX.confetti(sec, 22); } else { Snd.sting(); Haptics.warning(); }
  });
  /* the card with the world and the record */
  const ex = $('#extra', sec);
  const recHtml = outcome ? `<div class="glass recpill" style="padding:8px 14px;order:0"><div class="big num" style="font-size:24px">${REC.won}<i>–</i>${REC.lost}${REC.drawn ? `<i>–</i>${REC.drawn}` : ''}</div><div class="m"><b>${esc(outcome.record ? t('newRecord') : t('record'))}</b><br>${REC.played} ${esc(t('games'))}${REC.streak ? ` · ${esc(t('streak'))} ${REC.streak > 0 ? '+' : ''}${REC.streak}` : ''}</div></div>` : '';
  const usMode = S.pack.map === 'us' && window.USView;                  // States: the map of the US instead of the globe
  ex.innerHTML = `${lots.length ? `<div class="glass gl${usMode ? ' gl-us' : ''}">${usMode ? `<div class="usm" id="gl"><img class="gph" src="us-map.webp" alt="" decoding="async"></div>` : `<div class="globe" id="gl"><img class="gph" src="globe-hero.webp" alt="" decoding="async"></div>`}
      <div class="cap"><b>${esc(t('worldTitle'))}</b>${t('world', { name: esc(best.p.name) })}</div>
      <div class="chips">${lots.map(b => `<span class="chip"><span aria-hidden="true">${icon(b)}</span> ${esc(cname(b))}</span>`).join('')}</div></div>` : ''}${recHtml}`;
  step(520, () => {
    ex.hidden = false;
    if (!FX.reduced) FX.spring(ex, 0, 1, x => ({ transform: `translateY(${(1 - x) * 18}px)`, opacity: Math.min(1, x * 1.6) }), { k: 200, c: 18 });
  });
  step(2400, () => {
    rootEl.classList.remove('celebrating');
    const host = $('#gl', sec); if (!host) return;
    if (usMode) {
      USView.render(host, lots, { reduced: FX.reduced, label: b => b.abbr || b.id, value: b => fmtVal(b.value), aria: t('worldTitle') + ': ' + lots.map(cname).join(', ') })
        .then(() => { if (tok !== navTok) return; if (!FX.reduced) host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' }); })
        .catch(() => {});                                                // the placeholder map stays if the outlines are missing
      return;
    }
    const mount = () => {
      if (tok !== navTok) return;
      const ph = $('.gph', host); if (ph) ph.remove();
      if (stopGlobe) stopGlobe();
      stopGlobe = globe(host, lots, S.pack);
      const cv = $('canvas', host); if (cv && !FX.reduced) cv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' });
    };
    (window.requestIdleCallback || (f => setTimeout(f, 60)))(mount, { timeout: 700 });
  });
  if (FX.reduced) rootEl.classList.remove('celebrating');
}

/* every state of the round with its fun fact (shown after the reveal, so no population is given away early) */
function factsSheet() {
  const seen = new Set(), list = [];
  S.players.forEach(p => p.bought.forEach(b => { if (!seen.has(b.id)) { seen.add(b.id); list.push(b); } }));
  const h = sheet({ title: t('funFacts'), foot: `<button class="btn gold" id="fd">${esc(t('done'))}</button>`,
    body: `<p class="sm">${esc(t('factsIntro'))}</p><div class="group">${list.map(b => `<div class="row"><span class="orb" style="--orb:34px" aria-hidden="true">${icon(b)}</span><span class="t"><b>${esc(cname(b))}</b><br><span class="sm">${esc(Engine.factFor(PACK, b, LANG))}</span></span></div>`).join('')}</div>` });
  on('fd', () => { Snd.ui(); h.close(); });
}

/* ============ ONLINE ROOMS — random handles, no personal data ============ */
const HANDLE = 'BIDDER-' + Array.from({ length: 3 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[rnd(32)]).join('');
const RID = 'p' + Math.random().toString(36).slice(2, 9);
let poll = null;
const stopPoll = () => { if (poll) { clearInterval(poll); poll = null; } };
async function rget(k) { const v = await Net.get(k); return v ? JSON.parse(v) : null; }
async function rset(k, v) { return Net.set(k, JSON.stringify(v)); }
const spinner = () => `<div class="glass panel"><p><span class="spin"></span></p></div>`;
const navBack = () => `<div class="nav"><button class="ibtn pill" id="nb">${IC('menu')}${esc(t('menu'))}</button><span></span>${navBtns(false)}</div>`;

async function online() {
  stopPoll(); Snd.unlock(); S = { kind: 'net' };
  let pack = Packs.get(DEFAULT_PACK);
  if (!pack) {
    go(navBack() + spinner(), 'online'); on('nb', () => { Snd.ui(); home(); });
    const tok = navTok;
    try { pack = await Packs.load(DEFAULT_PACK); }
    catch (e) { if (tok === navTok) { toast(t('packFail')); home(); } return; }
    if (tok !== navTok) return;
  }
  PACK = pack; S.pack = pack; S.packId = pack.id;
  go(`${navBack()}
    <div class="glass panel">
      <h2>${esc(t('onlineTitle'))}</h2>
      <p>${esc(t('onlineIntro'))}</p>
      <div><span class="label">${esc(t('appearAs'))}</span><div class="handle">${HANDLE}</div><p class="sm">${esc(t('handleNote'))}</p></div>
      <button class="btn gold" id="new">${esc(t('openRoom'))}</button>
      <div class="custom"><input class="field mid" id="cd" placeholder="${esc(t('roomCode').toUpperCase())}" maxlength="4" autocapitalize="characters" aria-label="${esc(t('roomCode'))}" style="text-transform:uppercase;letter-spacing:.18em"><button class="btn glassb" id="join">${esc(t('joinRoom'))}</button></div>
    </div>`, 'online');
  on('nb', () => { Snd.ui(); home(); });
  on('new', async () => {
    const code = Array.from({ length: 4 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[rnd(32)]).join('');
    const room = { code, host: RID, phase: 'lobby', round: 0,
      items: Engine.draw(pack, 10, 'expert', rnd).map(c => ({ id: c.id, name: c.name, value: c.value, lat: c.lat, lon: c.lon })),
      players: [{ id: RID, name: HANDLE, budget: Engine.budgetFor(pack, 10), bought: [] }] };
    if (!await rset('room:' + code, room)) return toast(t('storageFail'));
    lobby(code);
  });
  on('join', async () => {
    const code = val('cd').toUpperCase();
    if (code.length !== 4) return toast(t('fourChars'));
    const room = await rget('room:' + code);
    if (!room) return toast(t('noRoom'));
    if (room.phase !== 'lobby') return toast(t('alreadyStarted'));
    if (!room.players.find(p => p.id === RID)) {
      if (room.players.length >= 2) return toast(t('roomFull'));
      room.players.push({ id: RID, name: HANDLE, budget: Engine.budgetFor(pack, 10), bought: [] });
      await rset('room:' + code, room);
    }
    lobby(code);
  });
}

function lobby(code) {
  stopPoll();
  const tick = async () => {
    const room = await rget('room:' + code); if (!room) return;
    if (room.phase !== 'lobby') { stopPoll(); return onlineLot(code); }
    const host = room.host === RID;
    go(`${navBack()}
      <div class="glass panel"><span class="label">${esc(t('roomCode'))}</span><div class="code">${code}</div><p style="text-align:center">${esc(t('shareCode'))}</p></div>
      <div class="glass panel">
        <span class="label">${esc(t('inRoom'))} (${room.players.length})</span>
        ${room.players.map(p => `<div class="line"><b>${esc(p.name)}${p.id === RID ? ' · ' + esc(t('youTag')) : ''}</b><span>${p.id === room.host ? esc(t('hostTag')) : ''}</span></div>`).join('')}
        ${host ? `<button class="btn gold" id="go" ${room.players.length !== 2 ? 'disabled' : ''}>${esc(t('startAuction'))}</button><p>${esc(room.players.length < 2 ? t('waitJoin') : t('bothIn'))}</p>`
          : `<p><span class="spin"></span> ${esc(t('waitHost'))}</p>`}
        <button class="btn ghost" id="lv">${esc(t('leaveRoom'))}</button>
      </div>`, 'online');
    on('nb', () => { Snd.ui(); stopPoll(); home(); });
    on('lv', () => { Snd.ui(); stopPoll(); home(); });
    on('go', async () => { Snd.ui(); room.phase = 'bid'; await rset('room:' + code, room); stopPoll(); onlineLot(code); });
  };
  tick(); poll = setInterval(tick, 3000);
}

function onlineLot(code) {
  stopPoll();
  let sent = false, shown = -1;
  const waiting = () => go(`${navBack()}<div class="glass panel"><h2>${esc(t('bidIn'))}</h2><p><span class="spin"></span> ${esc(t('waitOthers'))}</p></div>`, 'online');
  const tick = async () => {
    const room = await rget('room:' + code); if (!room) return;
    if (room.phase === 'done') {
      stopPoll();
      S = { kind: 'net', mode: 'online', pack: Packs.get(DEFAULT_PACK), packId: DEFAULT_PACK, players: room.players.map(p => ({ name: p.name + (p.id === RID ? ' · ' + t('youTag') : ''), budget: p.budget, bought: p.bought })) };
      return finish();
    }
    const me = room.players.find(p => p.id === RID); if (!me) return;
    const c = room.items[room.round];
    if (!c) { if (room.host === RID) { room.phase = 'done'; await rset('room:' + code, room); } return; }

    if (room.host === RID) {
      const bids = {};
      for (const p of room.players) { const b = await rget(`room:${code}:r${room.round}:${p.id}`); if (b) bids[p.id] = b.bid; }
      if (Object.keys(bids).length === room.players.length) {
        let top = null;
        for (const p of room.players) { const b = Math.min(bids[p.id], p.budget); if (b > 0 && (!top || b > top.b)) top = { p, b }; }
        if (top) { top.p.budget -= top.b; top.p.bought.push({ ...c, price: top.b }); }
        room.round++;
        if (room.round >= room.items.length) room.phase = 'done';
        await rset('room:' + code, room);
        sent = false; return;
      }
    }
    if (sent) { if (shown !== -2) { shown = -2; waiting(); on('nb', () => { stopPoll(); home(); }); } return; }
    if (shown === room.round) return;                // already on screen, leave the input alone
    shown = room.round;

    PACK = Packs.get(DEFAULT_PACK);
    speak(cname(c));
    go(`${navBack()}
      <div class="glass panel" style="align-items:center;text-align:center"><div class="orb" style="--orb:64px" aria-hidden="true">${icon(c)}</div><h2>${esc(cname(c))}</h2>
        <span class="label">${esc(t('lot'))} ${room.round + 1} ${esc(t('of'))} ${room.items.length} · ${code}</span></div>
      <div class="glass panel"><span class="label">${esc(t('sealedBid', { n: me.budget }))}</span>
        <input class="field" id="bid" type="number" min="0" max="${me.budget}" value="1" inputmode="numeric" aria-label="${esc(t('sealedBid', { n: me.budget }))}">
        <button class="btn gold" id="ok">${esc(t('submit'))}</button></div>
      <div class="glass panel">${room.players.map(p => `<div class="line"><b>${esc(p.name)}${p.id === RID ? ' · ' + esc(t('youTag')) : ''}</b><span>${money(p.budget)} · ${p.bought.length} ${esc(t('lotsWon'))}</span></div>`).join('')}</div>`, 'online');
    on('nb', () => { Snd.ui(); stopPoll(); home(); });
    on('ok', async () => {
      const b = Math.max(0, Math.min(me.budget, parseInt(val('bid')) || 0));
      await rset(`room:${code}:r${room.round}:${RID}`, { bid: b });
      sent = true; shown = -2; Snd.raise(0);
      waiting(); on('nb', () => { stopPoll(); home(); });
    });
  };
  tick(); poll = setInterval(tick, 3000);
}
