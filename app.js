/* ============ THE BOT'S PRICE TABLE ============
   Countries are ranked 1 (smallest population) to 196 (largest). Each band sets what
   the bot is willing to pay per million people: an ideal rate and a hard maximum.
   Everything the bot does with money comes out of this table. */
const RANK={};
COUNTRIES.slice().sort((a,b)=>a.pop-b.pop).forEach((c,i)=>{ RANK[c.code]=i+1; });

const BANDS=[
  {from:1,   to:38,  ideal:1.00,  max:2.000},
  {from:39,  to:62,  ideal:1.00,  max:1.750},
  {from:63,  to:71,  ideal:1.00,  max:1.600},
  {from:72,  to:102, ideal:0.75,  max:1.400},
  {from:103, to:131, ideal:0.75,  max:1.100},
  {from:132, to:166, ideal:0.50,  max:0.750},
  {from:167, to:181, ideal:0.50,  max:0.600},
  {from:182, to:194, ideal:0.25,  max:0.275},
  {from:195, to:196, ideal:0.05,  max:0.067}
];
const bandOf = code => { const r=RANK[code]; return BANDS.find(b=>r>=b.from&&r<=b.to) || BANDS[BANDS.length-1]; };

function priceOf(c){
  const b=bandOf(c.code);
  const ideal=Math.max(1, Math.round(c.pop*b.ideal));
  return { ideal, max: Math.max(ideal, Math.round(c.pop*b.max)) };
}
const valueOf = c => priceOf(c).ideal;

/* Per lot the bot rolls a walk-away ceiling above its target price, so it does not
   always land a clean deal. Late in the auction it gets reckless, and on a top-five
   country it throws the whole wallet at the lot. */
/* One roll per lot, somewhere between the table's ideal price and its maximum.
   The maximum is absolute — no endgame surge, no favourites, no stepping over it. */
function botCeiling(c){
  const { ideal, max } = priceOf(c);
  return { ideal, max, walk: ideal + rnd(max-ideal+1) };
}

const pick = (arr, avoid) => {
  if(!arr || !arr.length) return '';
  if(arr.length===1) return arr[0];
  let v, tries=0; do { v = arr[rnd(arr.length)]; } while(v===avoid && ++tries<12);
  return v;
};

/* ---- difficulty: which countries can come up at all ---- */
const EUROPE=new Set(["AL","AD","AT","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","DE",
"GR","HU","IS","IE","IT","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT",
"RO","RU","SM","RS","SK","SI","ES","SE","CH","UA","GB","VA","TR"]);
const LEVELS={
  beginner:{ pool:()=>COUNTRIES.filter(c=>EUROPE.has(c.code)) },
  medium:  { pool:()=>COUNTRIES.filter(c=>c.pop>=15) },
  expert:  { pool:()=>COUNTRIES.slice() }
};

/* ---- true randomness, no bias toward tiny states ---- */
function rnd(n){ const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]%n; }
function draw(n, level){
  const pool=(LEVELS[level]||LEVELS.expert).pool();
  for(let i=pool.length-1;i>0;i--){const j=rnd(i+1);[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,Math.min(n,pool.length));
}

/* ---- very wide estimate handed to the AI. Never shown on screen. ---- */
function fuzzy(pop){
  const lo=pop*(0.18+rnd(22)/100);
  const hi=pop*(2.1+rnd(220)/100);
  const r=v=> v>=100?Math.round(v/10)*10 : v>=10?Math.round(v/5)*5 : v>=1?Math.round(v) : Math.max(0.01,Math.round(v*100)/100);
  return {lo:r(lo), hi:r(hi)};
}

/* ============ SOUND ============ */
let AC=null;
window.MUTED=false;
const mb=document.getElementById('mute');
mb.onclick=()=>{window.MUTED=!window.MUTED; Haptics.light(); mb.textContent=window.MUTED?'✕':'♪'; mb.style.opacity=window.MUTED?.5:1;
  if(window.MUTED){ try{speechSynthesis.cancel();}catch(e){} }};
document.getElementById('hb').addEventListener('click',()=>{
  knock();
  ask('Leave the auction?','This round will be lost and you go back to the main menu.','Leave',()=>{
    document.querySelectorAll('.veil,.toast').forEach(x=>x.remove());
    home();
  });
});
function actx(){ if(!AC){ try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } if(AC&&AC.state==='suspended')AC.resume(); return AC; }
function knock(){
  const c=actx(); if(!c||window.MUTED) return;
  const t=c.currentTime;
  // low wooden thud
  const o=c.createOscillator(), g=c.createGain();
  o.type='sine'; o.frequency.setValueAtTime(190,t); o.frequency.exponentialRampToValueAtTime(52,t+.16);
  g.gain.setValueAtTime(.9,t); g.gain.exponentialRampToValueAtTime(.001,t+.22);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t+.25);
  // crack
  const n=c.createBufferSource(), buf=c.createBuffer(1,2400,c.sampleRate), d=buf.getChannelData(0);
  for(let i=0;i<2400;i++) d[i]=(Math.random()*2-1)*Math.pow(1-i/2400,7);
  n.buffer=buf;
  const bp=c.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1750; bp.Q.value=.8;
  const g2=c.createGain(); g2.gain.value=.55;
  n.connect(bp).connect(g2).connect(c.destination); n.start(t);
}
function blip(f=680,v=.16){
  const c=actx(); if(!c||window.MUTED) return;
  const t=c.currentTime,o=c.createOscillator(),g=c.createGain();
  o.type='square'; o.frequency.value=f;
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.001,t+.09);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t+.1);
}
function note(freq, at, dur, vol=0.22, type='sawtooth'){
  const c=actx(); if(!c||window.MUTED) return;
  const t=c.currentTime+at, o=c.createOscillator(), g=c.createGain();
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(0.0001,t);
  g.gain.exponentialRampToValueAtTime(vol,t+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t+dur+0.05);
}
function fanfare(){
  const c=actx(); if(!c||window.MUTED) return;
  const G=392.00,B=493.88,D=587.33,Gh=783.99,Bh=987.77,Dh=1174.66;
  // rising call
  [[G,0,.16],[B,.14,.16],[D,.28,.16],[Gh,.42,.30]].forEach(([f,a,d])=>{
    note(f,a,d,.20); note(f*2,a,d,.07,'triangle');
  });
  // triumphant chord, held
  [[G,.80,1.5,.14],[B,.80,1.5,.12],[D,.80,1.5,.12],[Gh,.82,1.4,.13],[Bh,.86,1.3,.08],[Dh,.90,1.2,.06]]
    .forEach(([f,a,d,v])=>note(f,a,d,v));
  // little bell on top
  note(Gh*2,.86,1.1,.05,'sine');
}
function defeatSting(){
  const c=actx(); if(!c||window.MUTED) return;
  note(311.13,0,.35,.16); note(261.63,.28,.55,.15); note(196.00,.55,.9,.13);
}

function gavel(word='Sold'){
  knock(); Haptics.heavy();
  const el=document.createElement('div');
  el.className='gavel';
  el.innerHTML=`<div class="ring"></div><div class="word">${word}</div>`;
  document.body.appendChild(el);
  document.querySelector('.wrap').classList.add('shake');
  setTimeout(()=>document.querySelector('.wrap').classList.remove('shake'),320);
  setTimeout(()=>el.remove(),900);
}

/* ---- spoken lot announcement ---- */
function speak(text){
  if(window.MUTED || !('speechSynthesis' in window)) return;
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text);
    const tag={en:'en-US',de:'de-DE',it:'it-IT',es:'es-ES',fr:'fr-FR'}[LANG]||'en-US';
    u.lang=tag; u.rate=.92; u.pitch=1.05; u.volume=1;
    const want=tag.slice(0,2);
    const v=speechSynthesis.getVoices().find(x=>x.lang&&x.lang.toLowerCase().startsWith(want));
    if(v) u.voice=v;
    speechSynthesis.speak(u);
  }catch(e){}
}
if('speechSynthesis' in window){ speechSynthesis.onvoiceschanged=()=>{}; }

const isOnline = () => navigator.onLine !== false;

/* ============ SHELL ============ */
const app=document.getElementById('app');
let S={}, T=null;
const esc=s=>String(s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
function go(h){ app.innerHTML=h; window.scrollTo({top:0,behavior:'instant'}); }
function on(id,fn){ const e=document.getElementById(id); if(e) e.onclick=fn; }
function val(id){ const e=document.getElementById(id); return e?e.value.trim():''; }
function clearTimer(){ if(T){ clearInterval(T); T=null; } }

let toastT=null, stopGlobe=null;
function toast(msg){
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const d=document.createElement('div'); d.className='toast'; d.textContent=msg;
  document.body.appendChild(d);
  clearTimeout(toastT); toastT=setTimeout(()=>d.remove(),2600);
}
function ask(title, body, yes, onYes){
  const v=document.createElement('div'); v.className='veil';
  v.innerHTML=`<div class="dlg"><h3>${esc(title)}</h3><p class="small" style="opacity:.8">${esc(body)}</p>
    <button class="btn hot" id="dy" style="margin-top:11px">${esc(yes)}</button>
    <button class="btn ghost sm" id="dn" style="margin-top:8px">${esc(t('stay'))}</button></div>`;
  document.body.appendChild(v);
  v.querySelector('#dy').onclick=()=>{ v.remove(); onYes(); };
  v.querySelector('#dn').onclick=()=>v.remove();
  v.onclick=e=>{ if(e.target===v) v.remove(); };
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
 tagline:'Use your knowledge to beat your rivals',
 solo:'Solo', soloDesc:'One rival, the bot. It has a price in mind for every country and walks away the moment you beat it. Works offline.',
 multi:'Multiplayer', multiDesc:'2 to 4 players sharing one phone. Two-player is the default. Works offline.',
 online:'Online 1 vs 1', onlineDesc:'Share a room code and bid against one other person.', onlineOff:'Needs a connection — currently unavailable.',
 before:'Before you start', how:'How to play', language:'Language',
 lots:'Lots', budget:'Budget each', budgetNote:'Scales with the auction — €10 per lot.',
 difficulty:'Difficulty', lvBeginner:'Beginner — Europe only', lvMedium:'Medium — over 15 million', lvExpert:'Expert — all 196 countries',
 seconds:'Seconds per decision', noClock:'No clock',
 nickOne:'Your nickname (optional, never saved)', nickMany:'Players — two is enough, up to four (nicknames optional, never saved)',
 open:'Open the auction', back:'Back', rival:'Your rival',
 rivalDesc:'The <b>bot</b> prices every country by population and rolls a fresh walk-away limit for each lot, so it is never quite predictable. Beat that limit by one euro and the lot is yours — it never chases past it.',
 you:'You', bot:'Bot', player:'Player',
 nowBidding:'Now bidding', standing:'Standing bid', topBid:'TOP BID', biddingNow:'BIDDING NOW',
 raiseOrDrop:'raise or drop out', dropOut:'Drop out', bid:'Bid', lot:'Lot', of:'of',
 noRaise:'Not enough money left to raise. You have to drop out.',
 dropHint:'Drop out and {name} buys it for €{price}.',
 deciding:'is deciding', sizing:'Sizing up the lot at €{price}.',
 nextLot:'Next lot', sold:'Sold', result:'Result',
 sealed:'The books are sealed', nobody:'Nobody knows yet',
 revealHint:'Every population is still blacked out. Tap a bar to lift it, or lift them all at once. The result stands once the last bar is gone.',
 liftAll:'Lift every bar', final:'Final', takesIt:'{name} takes it',
 pointsAgainst:'{a} points against {b}.', smartest:'<b>{name}</b> shopped smartest at {v} € per million.',
 nothing:'Walked away with nothing.', points:'Points', spentEff:'€{n} spent · efficiency',
 playAgain:'Play again', menu:'Menu', world:"{name}'s world · drag to spin and tilt · pinch to zoom",
 leaveTitle:'Leave the auction?', leaveBody:'This round will be lost and you go back to the main menu.',
 leave:'Leave', stay:'Stay here',
 twoMin:'Two players minimum.', tooMuch:'More than you have.', mustBeat:'Has to beat €{price}.',
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
 sealedBid:'Sealed bid — you have €{n}', submit:'Submit', bidIn:'Bid is in', waitOthers:'Waiting for your opponent…',
 fourChars:'Four characters, please.', noRoom:'No room with that code.', alreadyStarted:'That auction already started.',
 roomFull:'That room is full — this mode is 1 vs 1.', storageFail:'Storage is not reachable right now.',
 needsNet:'This mode needs an internet connection.', lotsWon:'lots',
 youTag:'you', hostTag:'HOST',
 privacy:'Privacy', soon:'Soon', soonBody:'Online play is not switched on yet. Everything else works without a connection.',
 privP1:'This game has no accounts, no sign-in and no analytics. Nothing you do here is sent anywhere.',
 privP2:'Two things are saved, and only on this device: the language you picked and your record against the bot. Deleting the app deletes both.',
 privP3:'Nicknames are optional. They are only used to label the players on screen during a round and are never stored.',
 privP4:'No advertising, no tracking, no third-party software development kits.',
 wipe:'Delete all data', wipeTitle:'Delete everything?', wipeBody:'Your record and your language choice will be removed from this device.', wiped:'Deleted.',
 loadingBorders:'loading borders…'
},
de:{
 tagline:'Nutze dein Wissen und schlag deine Rivalen',
 solo:'Solo', soloDesc:'Ein Gegner, der Bot. Er hat für jedes Land einen Preis im Kopf und steigt aus, sobald du ihn überbietest. Läuft offline.',
 multi:'Mehrspieler', multiDesc:'2 bis 4 Spieler an einem Handy. Zwei Spieler sind der Normalfall. Läuft offline.',
 online:'Online 1 gegen 1', onlineDesc:'Raum-Code teilen und gegen eine andere Person bieten.', onlineOff:'Braucht Internet — gerade nicht verfügbar.',
 before:'Vor dem Start', how:'Spielregeln', language:'Sprache',
 lots:'Lose', budget:'Budget pro Spieler', budgetNote:'Wächst mit der Auktion — 10 € pro Los.',
 difficulty:'Schwierigkeit', lvBeginner:'Anfänger — nur Europa', lvMedium:'Mittel — über 15 Millionen', lvExpert:'Experte — alle 196 Länder',
 seconds:'Sekunden pro Entscheidung', noClock:'Ohne Uhr',
 nickOne:'Dein Spitzname (optional, wird nie gespeichert)', nickMany:'Spieler — zwei reichen, bis zu vier (Spitznamen optional, nie gespeichert)',
 open:'Auktion eröffnen', back:'Zurück', rival:'Dein Gegner',
 rivalDesc:'Der <b>Bot</b> bewertet jedes Land nach Einwohnerzahl und würfelt pro Los eine neue Schmerzgrenze — er ist also nie ganz berechenbar. Überbiete diese Grenze um einen Euro und das Los gehört dir. Er geht nie darüber hinaus.',
 you:'Du', bot:'Bot', player:'Spieler',
 nowBidding:'Am Zug', standing:'Höchstgebot', topBid:'HÖCHSTGEBOT', biddingNow:'BIETET GERADE',
 raiseOrDrop:'erhöhen oder aussteigen', dropOut:'Aussteigen', bid:'Bieten', lot:'Los', of:'von',
 noRaise:'Nicht genug Geld zum Erhöhen. Du musst aussteigen.',
 dropHint:'Steigst du aus, kauft {name} es für {price} €.',
 deciding:'überlegt', sizing:'Schätzt das Los bei {price} € ein.',
 nextLot:'Nächstes Los', sold:'Verkauft', result:'Ergebnis',
 sealed:'Die Bücher sind versiegelt', nobody:'Noch weiß es niemand',
 revealHint:'Alle Einwohnerzahlen sind noch geschwärzt. Tippe einen Balken an oder deck alle auf einmal auf. Das Ergebnis steht erst, wenn der letzte Balken weg ist.',
 liftAll:'Alles aufdecken', final:'Endstand', takesIt:'{name} gewinnt',
 pointsAgainst:'{a} Punkte gegen {b}.', smartest:'<b>{name}</b> hat am klügsten eingekauft: {v} € pro Million.',
 nothing:'Ging leer aus.', points:'Punkte', spentEff:'{n} € ausgegeben · Effizienz',
 playAgain:'Nochmal', menu:'Menü', world:'{name}s Welt · ziehen zum Drehen und Kippen · zwei Finger zum Zoomen',
 leaveTitle:'Auktion verlassen?', leaveBody:'Diese Runde geht verloren und du landest im Hauptmenü.',
 leave:'Verlassen', stay:'Hierbleiben',
 twoMin:'Mindestens zwei Spieler.', tooMuch:'Mehr als du hast.', mustBeat:'Muss über {price} € liegen.',
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
 sealedBid:'Verdecktes Gebot — du hast {n} €', submit:'Abgeben', bidIn:'Gebot ist abgegeben', waitOthers:'Warte auf deinen Gegner…',
 fourChars:'Bitte vier Zeichen.', noRoom:'Kein Raum mit diesem Code.', alreadyStarted:'Diese Auktion läuft schon.',
 roomFull:'Der Raum ist voll — dieser Modus ist 1 gegen 1.', storageFail:'Der Speicher ist gerade nicht erreichbar.',
 needsNet:'Dieser Modus braucht eine Internetverbindung.', lotsWon:'Lose',
 youTag:'du', hostTag:'GASTGEBER',
 privacy:'Datenschutz', soon:'Bald', soonBody:'Online-Spiel ist noch nicht freigeschaltet. Alles andere läuft ohne Verbindung.',
 privP1:'Dieses Spiel hat keine Konten, keine Anmeldung und keine Analyse. Nichts, was du hier tust, wird irgendwohin gesendet.',
 privP2:'Zwei Dinge werden gespeichert, und nur auf diesem Gerät: deine Sprache und deine Bilanz gegen den Bot. Beim Löschen der App verschwinden beide.',
 privP3:'Spitznamen sind freiwillig. Sie dienen nur der Beschriftung während einer Runde und werden nie gespeichert.',
 privP4:'Keine Werbung, kein Tracking, keine Fremd-Bausteine.',
 wipe:'Alle Daten löschen', wipeTitle:'Alles löschen?', wipeBody:'Deine Bilanz und deine Sprachwahl werden von diesem Gerät entfernt.', wiped:'Gelöscht.',
 loadingBorders:'Grenzen werden geladen…'
},
it:{
 tagline:'Usa le tue conoscenze per battere i rivali',
 solo:'Solo', soloDesc:'Un rivale, il bot. Ha un prezzo in mente per ogni paese e si ritira appena lo superi. Funziona offline.',
 multi:'Multigiocatore', multiDesc:'Da 2 a 4 giocatori su un solo telefono. Due giocatori è il caso normale. Funziona offline.',
 online:'Online 1 contro 1', onlineDesc:'Condividi un codice stanza e fai offerte contro un altro giocatore.', onlineOff:'Serve una connessione — non disponibile ora.',
 before:'Prima di iniziare', how:'Come si gioca', language:'Lingua',
 lots:'Lotti', budget:'Budget a testa', budgetNote:"Cresce con l'asta — 10 € per lotto.",
 difficulty:'Difficoltà', lvBeginner:'Principiante — solo Europa', lvMedium:'Medio — oltre 15 milioni', lvExpert:'Esperto — tutti i 196 paesi',
 seconds:'Secondi per decidere', noClock:'Senza tempo',
 nickOne:'Il tuo soprannome (facoltativo, mai salvato)', nickMany:'Giocatori — due bastano, fino a quattro (soprannomi facoltativi, mai salvati)',
 open:"Apri l'asta", back:'Indietro', rival:'Il tuo rivale',
 rivalDesc:'Il <b>bot</b> valuta ogni paese in base alla popolazione e tira un nuovo limite per ogni lotto, quindi non è mai del tutto prevedibile. Supera quel limite di un euro e il lotto è tuo — non va mai oltre.',
 you:'Tu', bot:'Bot', player:'Giocatore',
 nowBidding:'Tocca a', standing:'Offerta attuale', topBid:'OFFERTA PIÙ ALTA', biddingNow:'STA OFFRENDO',
 raiseOrDrop:'rilancia o ritirati', dropOut:'Ritirati', bid:'Offri', lot:'Lotto', of:'di',
 noRaise:'Non hai abbastanza per rilanciare. Devi ritirarti.',
 dropHint:'Se ti ritiri, {name} lo compra per {price} €.',
 deciding:'sta decidendo', sizing:'Sta valutando il lotto a {price} €.',
 nextLot:'Prossimo lotto', sold:'Venduto', result:'Risultato',
 sealed:'I libri sono sigillati', nobody:'Ancora nessuno lo sa',
 revealHint:'Tutte le popolazioni sono ancora oscurate. Tocca una barra per scoprirla, o scoprile tutte insieme. Il risultato vale quando sparisce l’ultima barra.',
 liftAll:'Scopri tutto', final:'Finale', takesIt:'{name} vince',
 pointsAgainst:'{a} punti contro {b}.', smartest:'<b>{name}</b> ha comprato meglio: {v} € per milione.',
 nothing:'Se n’è andato a mani vuote.', points:'Punti', spentEff:'{n} € spesi · efficienza',
 playAgain:'Rigioca', menu:'Menu', world:'Il mondo di {name} · trascina per ruotare · pizzica per lo zoom',
 leaveTitle:"Uscire dall'asta?", leaveBody:'Questo turno andrà perso e tornerai al menu principale.',
 leave:'Esci', stay:'Resta qui',
 twoMin:'Minimo due giocatori.', tooMuch:'Più di quanto hai.', mustBeat:'Deve superare {price} €.',
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
 sealedBid:'Offerta segreta — hai {n} €', submit:'Invia', bidIn:'Offerta inviata', waitOthers:'In attesa del tuo avversario…',
 fourChars:'Quattro caratteri, per favore.', noRoom:'Nessuna stanza con quel codice.', alreadyStarted:'Quell’asta è già iniziata.',
 roomFull:'La stanza è piena — questa modalità è 1 contro 1.', storageFail:'L’archivio non è raggiungibile in questo momento.',
 needsNet:'Questa modalità richiede una connessione a internet.', lotsWon:'lotti',
 youTag:'tu', hostTag:'HOST',
 privacy:'Privacy', soon:'Presto', soonBody:'Il gioco online non è ancora attivo. Tutto il resto funziona senza connessione.',
 privP1:'Questo gioco non ha account, né accessi, né analisi. Nulla di ciò che fai qui viene inviato da qualche parte.',
 privP2:'Due cose vengono salvate, e solo su questo dispositivo: la lingua scelta e il tuo bilancio contro il bot. Disinstallando l’app spariscono entrambe.',
 privP3:'I soprannomi sono facoltativi. Servono solo a identificare i giocatori durante una partita e non vengono mai salvati.',
 privP4:'Nessuna pubblicità, nessun tracciamento, nessun componente di terze parti.',
 wipe:'Cancella tutti i dati', wipeTitle:'Cancellare tutto?', wipeBody:'Il tuo bilancio e la lingua scelta verranno rimossi da questo dispositivo.', wiped:'Cancellato.',
 loadingBorders:'caricamento confini…'
},
es:{
 tagline:'Usa tus conocimientos para vencer a tus rivales',
 solo:'Solo', soloDesc:'Un rival, el bot. Tiene un precio en mente para cada país y se retira en cuanto lo superas. Funciona sin conexión.',
 multi:'Multijugador', multiDesc:'De 2 a 4 jugadores en un mismo móvil. Dos jugadores es lo normal. Funciona sin conexión.',
 online:'Online 1 contra 1', onlineDesc:'Comparte un código de sala y puja contra otra persona.', onlineOff:'Necesita conexión — no disponible ahora.',
 before:'Antes de empezar', how:'Cómo se juega', language:'Idioma',
 lots:'Lotes', budget:'Presupuesto por jugador', budgetNote:'Crece con la subasta — 10 € por lote.',
 difficulty:'Dificultad', lvBeginner:'Principiante — solo Europa', lvMedium:'Medio — más de 15 millones', lvExpert:'Experto — los 196 países',
 seconds:'Segundos por decisión', noClock:'Sin reloj',
 nickOne:'Tu apodo (opcional, nunca se guarda)', nickMany:'Jugadores — con dos basta, hasta cuatro (apodos opcionales, nunca se guardan)',
 open:'Abrir la subasta', back:'Atrás', rival:'Tu rival',
 rivalDesc:'El <b>bot</b> valora cada país por su población y saca un límite nuevo en cada lote, así que nunca es del todo predecible. Supera ese límite por un euro y el lote es tuyo — nunca va más allá.',
 you:'Tú', bot:'Bot', player:'Jugador',
 nowBidding:'Le toca a', standing:'Puja actual', topBid:'PUJA MÁS ALTA', biddingNow:'ESTÁ PUJANDO',
 raiseOrDrop:'sube o retírate', dropOut:'Retirarse', bid:'Pujar', lot:'Lote', of:'de',
 noRaise:'No te queda dinero para subir. Tienes que retirarte.',
 dropHint:'Si te retiras, {name} lo compra por {price} €.',
 deciding:'está decidiendo', sizing:'Está valorando el lote a {price} €.',
 nextLot:'Siguiente lote', sold:'Vendido', result:'Resultado',
 sealed:'Los libros están sellados', nobody:'Todavía nadie lo sabe',
 revealHint:'Todas las poblaciones siguen tapadas. Toca una barra para levantarla, o levántalas todas. El resultado vale cuando desaparezca la última.',
 liftAll:'Levantar todo', final:'Final', takesIt:'{name} gana',
 pointsAgainst:'{a} puntos contra {b}.', smartest:'<b>{name}</b> compró mejor: {v} € por millón.',
 nothing:'Se fue con las manos vacías.', points:'Puntos', spentEff:'{n} € gastados · eficiencia',
 playAgain:'Otra vez', menu:'Menú', world:'El mundo de {name} · arrastra para girar · pellizca para acercar',
 leaveTitle:'¿Salir de la subasta?', leaveBody:'Perderás esta ronda y volverás al menú principal.',
 leave:'Salir', stay:'Quedarme',
 twoMin:'Mínimo dos jugadores.', tooMuch:'Más de lo que tienes.', mustBeat:'Tiene que superar {price} €.',
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
 sealedBid:'Puja secreta — tienes {n} €', submit:'Enviar', bidIn:'Puja enviada', waitOthers:'Esperando a tu rival…',
 fourChars:'Cuatro caracteres, por favor.', noRoom:'No hay ninguna sala con ese código.', alreadyStarted:'Esa subasta ya ha empezado.',
 roomFull:'La sala está llena — este modo es 1 contra 1.', storageFail:'El almacenamiento no está disponible ahora mismo.',
 needsNet:'Este modo necesita conexión a internet.', lotsWon:'lotes',
 youTag:'tú', hostTag:'ANFITRIÓN',
 privacy:'Privacidad', soon:'Pronto', soonBody:'El juego en línea aún no está activado. Todo lo demás funciona sin conexión.',
 privP1:'Este juego no tiene cuentas, ni inicio de sesión, ni analíticas. Nada de lo que haces aquí se envía a ningún sitio.',
 privP2:'Se guardan dos cosas, y solo en este dispositivo: el idioma que elegiste y tu balance contra el bot. Al borrar la app desaparecen las dos.',
 privP3:'Los apodos son opcionales. Solo sirven para identificar a los jugadores durante una partida y nunca se guardan.',
 privP4:'Sin publicidad, sin rastreo, sin componentes de terceros.',
 wipe:'Borrar todos los datos', wipeTitle:'¿Borrar todo?', wipeBody:'Tu balance y tu idioma se eliminarán de este dispositivo.', wiped:'Borrado.',
 loadingBorders:'cargando fronteras…'
},
fr:{
 tagline:'Utilise tes connaissances pour battre tes rivaux',
 solo:'Solo', soloDesc:'Un rival, le bot. Il a un prix en tête pour chaque pays et se retire dès que tu le dépasses. Fonctionne hors ligne.',
 multi:'Multijoueur', multiDesc:'2 à 4 joueurs sur un même téléphone. Deux joueurs, c’est le cas normal. Fonctionne hors ligne.',
 online:'En ligne 1 contre 1', onlineDesc:'Partage un code de salon et enchéris contre une autre personne.', onlineOff:'Nécessite une connexion — indisponible pour le moment.',
 before:'Avant de commencer', how:'Comment jouer', language:'Langue',
 lots:'Lots', budget:'Budget par joueur', budgetNote:'Augmente avec la vente — 10 € par lot.',
 difficulty:'Difficulté', lvBeginner:'Débutant — Europe seulement', lvMedium:'Moyen — plus de 15 millions', lvExpert:'Expert — les 196 pays',
 seconds:'Secondes par décision', noClock:'Sans chrono',
 nickOne:'Ton pseudo (facultatif, jamais enregistré)', nickMany:'Joueurs — deux suffisent, jusqu’à quatre (pseudos facultatifs, jamais enregistrés)',
 open:'Ouvrir la vente', back:'Retour', rival:'Ton rival',
 rivalDesc:'Le <b>bot</b> évalue chaque pays selon sa population et tire une nouvelle limite à chaque lot, il n’est donc jamais tout à fait prévisible. Dépasse cette limite d’un euro et le lot est à toi — il ne va jamais au-delà.',
 you:'Toi', bot:'Bot', player:'Joueur',
 nowBidding:'Au tour de', standing:'Enchère en cours', topBid:'MEILLEURE OFFRE', biddingNow:'ENCHÉRIT',
 raiseOrDrop:'monte ou passe', dropOut:'Passer', bid:'Enchérir', lot:'Lot', of:'sur',
 noRaise:'Plus assez d’argent pour monter. Tu dois passer.',
 dropHint:'Si tu passes, {name} l’achète pour {price} €.',
 deciding:'réfléchit', sizing:'Évalue le lot à {price} €.',
 nextLot:'Lot suivant', sold:'Adjugé', result:'Résultat',
 sealed:'Les registres sont scellés', nobody:'Personne ne sait encore',
 revealHint:'Toutes les populations sont encore masquées. Touche une barre pour la lever, ou lève-les toutes. Le résultat compte une fois la dernière barre partie.',
 liftAll:'Tout dévoiler', final:'Final', takesIt:'{name} l’emporte',
 pointsAgainst:'{a} points contre {b}.', smartest:'<b>{name}</b> a le mieux acheté : {v} € par million.',
 nothing:'Reparti les mains vides.', points:'Points', spentEff:'{n} € dépensés · efficacité',
 playAgain:'Rejouer', menu:'Menu', world:'Le monde de {name} · fais glisser pour tourner · pince pour zoomer',
 leaveTitle:'Quitter la vente ?', leaveBody:'Cette manche sera perdue et tu retourneras au menu principal.',
 leave:'Quitter', stay:'Rester',
 twoMin:'Deux joueurs minimum.', tooMuch:'Plus que ce que tu as.', mustBeat:'Doit dépasser {price} €.',
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
 sealedBid:'Offre secrète — tu as {n} €', submit:'Envoyer', bidIn:'Offre envoyée', waitOthers:'En attente de ton adversaire…',
 fourChars:'Quatre caractères, s’il te plaît.', noRoom:'Aucun salon avec ce code.', alreadyStarted:'Cette vente a déjà commencé.',
 roomFull:'Le salon est complet — ce mode est en 1 contre 1.', storageFail:'Le stockage est injoignable pour le moment.',
 needsNet:'Ce mode nécessite une connexion internet.', lotsWon:'lots',
 youTag:'toi', hostTag:'HÔTE',
 privacy:'Confidentialité', soon:'Bientôt', soonBody:'Le jeu en ligne n’est pas encore activé. Tout le reste fonctionne sans connexion.',
 privP1:'Ce jeu n’a ni compte, ni connexion, ni analyse. Rien de ce que tu fais ici n’est envoyé où que ce soit.',
 privP2:'Deux choses sont enregistrées, uniquement sur cet appareil : la langue choisie et ton bilan face au bot. Supprimer l’app supprime les deux.',
 privP3:'Les pseudos sont facultatifs. Ils servent seulement à identifier les joueurs pendant une partie et ne sont jamais enregistrés.',
 privP4:'Aucune publicité, aucun suivi, aucun composant tiers.',
 wipe:'Effacer toutes les données', wipeTitle:'Tout effacer ?', wipeBody:'Ton bilan et ta langue seront retirés de cet appareil.', wiped:'Effacé.',
 loadingBorders:'chargement des frontières…'
}
};

let LANG='en';
function t(key, vars){
  let v=(STR[LANG]&&STR[LANG][key]) || STR.en[key] || key;
  if(vars) Object.keys(vars).forEach(k=>{ v=v.split('{'+k+'}').join(vars[k]); });
  return v;
}
async function loadLang(){
  const v=await Store.get('lang:v1'); if(v&&STR[v]){ LANG=v; return; }
  const n=(navigator.language||'en').slice(0,2);
  if(STR[n]) LANG=n;
}
async function setLang(id){
  if(!STR[id]) return;
  LANG=id;
  await Store.set('lang:v1', id);
  const sub=document.querySelector('.mast .sub'); if(sub) sub.textContent=t('tagline');
  home();
}

/* ============ ALL-TIME RECORD — you against the bot, stored on this device ============
   Only solo games count. Nothing leaves the phone and no names are kept. */
const REC_KEY='record:v1';
const BLANK={played:0, won:0, lost:0, drawn:0, pts:0, botPts:0, spent:0, streak:0, best:0,
             bestGame:null, byLevel:{beginner:{played:0,won:0}, medium:{played:0,won:0}, expert:{played:0,won:0}}};
let REC={...BLANK};

async function loadRec(){
  try{
    const raw=await Store.get(REC_KEY);
    if(raw){ const v=JSON.parse(raw); REC={...BLANK, ...v, byLevel:{...BLANK.byLevel, ...(v.byLevel||{})}}; }
  }catch(e){}
}
async function saveRec(){ await Store.set(REC_KEY, JSON.stringify(REC)); }
async function clearRec(){ REC={...BLANK, byLevel:JSON.parse(JSON.stringify(BLANK.byLevel))}; await saveRec(); }

/* returns what changed, so the results screen can show it */
async function recordGame(you, bot, level){
  const lvl=REC.byLevel[level] || (REC.byLevel[level]={played:0,won:0});
  const win = you.pts > bot.pts, draw = you.pts === bot.pts;
  REC.played++; lvl.played++;
  if(win){ REC.won++; lvl.won++; REC.streak = REC.streak>=0 ? REC.streak+1 : 1; }
  else if(draw){ REC.drawn++; REC.streak=0; }
  else { REC.lost++; REC.streak = REC.streak<=0 ? REC.streak-1 : -1; }
  REC.best=Math.max(REC.best, REC.streak);
  REC.pts+=you.pts; REC.botPts+=bot.pts; REC.spent+=you.spent;
  let record=false;
  if(!REC.bestGame || you.pts > REC.bestGame.pts){
    REC.bestGame={pts:Math.round(you.pts*10)/10, level, lots:you.p.bought.length};
    record = REC.played>1;
  }
  await saveRec();
  return {win, draw, record};
}

/* ============ HOME ============ */
function home(){
  clearTimer(); stopPoll(); S={};
  if(stopGlobe){ stopGlobe(); stopGlobe=null; }
  document.body.classList.remove('playing');
  try{ speechSynthesis.cancel(); }catch(e){}
  const net=isOnline();
  go(`
    <button class="mode" id="m1"><span class="num">1</span>
      <span class="tt">${t('solo')}</span>
      <span class="dd">${t('soloDesc')}</span></button>
    <button class="mode" id="m2"><span class="num">2</span>
      <span class="tt">${t('multi')}</span>
      <span class="dd">${t('multiDesc')}</span></button>
    <button class="mode" id="m3"><span class="num">3</span>
      <span class="tt">${t('online')}<span class="tag">${Net.available?'Beta':t('soon')}</span></span>
      <span class="dd">${!Net.available?t('soonBody'):net?t('onlineDesc'):t('onlineOff')}</span></button>
    ${REC.played?`<div class="card">
      <span class="label">${t('record')}</span>
      <div class="bigrec"><span class="v">${REC.won}</span><span class="sep">–</span><span class="v">${REC.lost}</span>${REC.drawn?`<span class="sep">–</span><span class="v">${REC.drawn}</span>`:''}</div>
      <p class="small" style="text-align:center;margin:7px 0 0">${REC.played} ${t('games')} · ${Math.round(REC.won/REC.played*100)}% ${t('winRate')}${REC.streak?` · ${t('streak')} ${REC.streak>0?'+':''}${REC.streak}`:''}</p>
      <button class="btn ghost sm" id="mrec" style="margin-top:10px">${t('record')}</button>
    </div>`:''}
    <div class="card ink">
      <span class="label">${t('before')}</span>
      <div class="row">
        <button class="btn ghost sm" id="mr">${t('how')}</button>
        ${REC.played?'':`<button class="btn ghost sm" id="mrec2">${t('record')}</button>`}
      </div>
      <button class="btn ghost sm" id="mp" style="margin-top:8px">${t('privacy')}</button>
    </div>
    <div class="card">
      <span class="label">${t('language')}</span>
      <div class="langs">${LANGS.map(l=>`
        <button class="lang ${l.id===LANG?'on':''}" data-l="${l.id}">
          <span class="fl">${flag(l.flag)}</span><span class="lb">${l.label}</span>
        </button>`).join('')}</div>
    </div>
  `);
  const tap=fn=>()=>{ knock(); setTimeout(fn,90); };
  on('m1',tap(()=>setup('solo')));
  on('m2',tap(()=>setup('multi')));
  on('m3',tap(()=>{ if(!Net.available) return toast(t('soonBody')); if(!isOnline()) return toast(t('needsNet')); online(); }));
  on('mr',tap(rules));
  on('mp',tap(privacy));
  on('mrec',tap(recordScreen));
  on('mrec2',tap(recordScreen));
  app.querySelectorAll('.lang').forEach(b=>b.onclick=()=>{ knock(); setLang(b.dataset.l); });
}

function recordScreen(){
  const pct = REC.played ? Math.round(REC.won/REC.played*100) : 0;
  const avg = REC.played ? (REC.pts/REC.played) : 0;
  const avgBot = REC.played ? (REC.botPts/REC.played) : 0;
  const lvlName = {beginner:t('lvBeginner'), medium:t('lvMedium'), expert:t('lvExpert')};
  go(`<div class="card">
    <h2>${t('record')}</h2>
    ${REC.played?`
      <div class="rec">
        <div class="w"><div class="rn">${REC.won}</div><div class="rl">${t('wins')}</div></div>
        <div class="l"><div class="rn">${REC.lost}</div><div class="rl">${t('losses')}</div></div>
        ${REC.drawn?`<div><div class="rn">${REC.drawn}</div><div class="rl">${t('draws')}</div></div>`:''}
      </div>
      <div class="line"><span class="l"><b>${t('games')}</b></span><span class="r">${REC.played}</span></div>
      <div class="line"><span class="l"><b>${t('winRate')}</b></span><span class="r">${pct}%</span></div>
      <div class="line"><span class="l"><b>${t('streak')}</b></span><span class="r streak">${REC.streak>0?'+'+REC.streak:REC.streak}</span></div>
      <div class="line"><span class="l"><b>${t('bestStreak')}</b></span><span class="r">+${REC.best}</span></div>
      <div class="line"><span class="l"><b>${t('avgPts')}</b></span><span class="r">${avg.toFixed(1)} — ${avgBot.toFixed(1)}</span></div>
      ${REC.bestGame?`<div class="line"><span class="l"><b>${t('bestGame')}</b></span><span class="r">${REC.bestGame.pts}</span></div>`:''}
      <div style="margin-top:12px">
        ${Object.keys(REC.byLevel).filter(k=>REC.byLevel[k].played).map(k=>`
          <div class="line"><span class="l"><b>${lvlName[k]||k}</b></span><span class="r">${REC.byLevel[k].won}/${REC.byLevel[k].played}</span></div>`).join('')}
      </div>
      <p class="small" style="margin-top:11px">${t('recordNote')}</p>
      <button class="btn ghost sm" id="rs" style="margin-top:10px">${t('reset')}</button>
    `:`<p class="small">${t('noGames')}</p>`}
    <button class="btn" id="b" style="margin-top:10px">${t('back')}</button>
  </div>`);
  on('rs',()=>{ knock(); ask(t('resetTitle'), t('resetBody'), t('reset'), async()=>{ await clearRec(); recordScreen(); }); });
  on('b',()=>{knock();home();});
}

function privacy(){
  go(`<div class="card">
    <h2>${t('privacy')}</h2>
    <p>${t('privP1')}</p>
    <p>${t('privP2')}</p>
    <p>${t('privP3')}</p>
    <p class="small">${t('privP4')}</p>
    <button class="btn ghost sm" id="wipe" style="margin-top:8px">${t('wipe')}</button>
    <button class="btn" id="b" style="margin-top:8px">${t('back')}</button>
  </div>`);
  on('wipe',()=>{ knock(); ask(t('wipeTitle'), t('wipeBody'), t('wipe'), async()=>{
    await clearRec(); await Store.remove('lang:v1'); toast(t('wiped')); home();
  }); });
  on('b',()=>{knock();home();});
}

function rules(){
  go(`<div class="card">
    <h2>${t('how')}</h2>
    <p>${t('rulesP1')}</p>
    <p>${t('rulesP2')}</p>
    <p>${t('rulesP3')}</p>
    <p>${t('rulesP4')}</p>
    <p>${t('rulesP5')}</p>
    <p>${t('rulesP6')}</p>
    <p class="small">${t('rulesP7')}</p>
  </div><button class="btn" id="b">${t('back')}</button>`);
  on('b',()=>{knock();home();});
}

/* ============ SETUP ============ */
const KIND={
  solo:{title:'Solo'},
  multi:{title:'Multiplayer'}
};
const budgetFor = lots => lots*10;   // calibrated against the price table: 10 lots = 100

function setup(kind){
  if(stopGlobe){ stopGlobe(); stopGlobe=null; }
  const info = KIND[kind];
  go(`<div class="card">
    <h2>${kind==='solo'?t('solo'):t('multi')}</h2>
    ${kind==='solo'?`<div class="card amber" style="box-shadow:none;margin:0 0 12px;padding:11px">
        <span class="label">${t('rival')}</span>
        <p class="small" style="margin:0;opacity:.85">${t('rivalDesc')}</p>
      </div>`:''}
    <span class="label">${t('lots')}</span>
    <select id="n"><option>5</option><option selected>10</option><option>15</option><option>20</option><option>30</option></select>
    <div class="card ink" style="box-shadow:none;margin:11px 0;padding:11px">
      <span class="label">${t('budget')}</span>
      <div style="font-family:'Archivo Black',sans-serif;font-size:30px;line-height:1" id="bud">€100</div>
      <p class="small" style="margin:4px 0 0">${t('budgetNote')}</p>
    </div>
    <span class="label">${t('difficulty')}</span>
    <select id="lv">
      <option value="beginner">${t('lvBeginner')}</option>
      <option value="medium" selected>${t('lvMedium')}</option>
      <option value="expert">${t('lvExpert')}</option>
    </select>
    <span class="label" style="margin-top:11px">${t('seconds')}</span>
    <select id="t"><option value="10" selected>10</option><option value="15">15</option><option value="20">20</option><option value="30">30</option><option value="0">${t('noClock')}</option></select>
    ${kind==='multi'?`<span class="label" style="margin-top:11px">${t('nickMany')}</span>
      <input id="p1" placeholder="${t('player')} 1" style="margin-bottom:6px">
      <input id="p2" placeholder="${t('player')} 2" style="margin-bottom:6px">
      <input id="p3" placeholder="${t('player')} 3" style="margin-bottom:6px">
      <input id="p4" placeholder="${t('player')} 4">`
    :`<span class="label" style="margin-top:11px">${t('nickOne')}</span><input id="p1" placeholder="${t('player')} 1">`}
    <button class="btn hot" id="start" style="margin-top:15px">${t('open')}</button>
    <button class="btn ghost sm" id="back" style="margin-top:8px">${t('back')}</button>
  </div>`);
  const sync=()=>{ document.getElementById('bud').textContent='€'+budgetFor(parseInt(val('n'))||5); };
  document.getElementById('n').onchange=sync; sync();
  on('back',()=>{knock();home();});
  on('start',()=>{
    knock(); actx();
    let names, engine;
    if(kind==='solo'){
      engine='bot';
      names=[val('p1')||t('you'), t('bot')];
    }else{
      engine='table';
      const ids = ['p1','p2','p3','p4'];
      names = ids.map((id,i)=>val(id)||(i<2?`${t('player')} ${i+1}`:'')).filter(Boolean);
      if(names.length<2) return toast(t('twoMin'));
    }
    const lots=parseInt(val('n'))||5;
    const budget=budgetFor(lots);
    S={ kind, mode:engine, i:0, clock:parseInt(val('t')), level:val('lv')||'expert',
        countries:draw(lots, val('lv')||'expert'),
        players:names.map((n,idx)=>({name:n,budget,bought:[],ai:(kind==='solo'&&idx===1)})) };
    document.body.classList.add('playing');
    lot();
  });
}

/* ============ THE LOT — ascending auction from €1 ============ */
function lot(){
  clearTimer(); S._taunt='';
  if(S.i>=S.countries.length) return finish();
  const c=S.countries[S.i];
  const eligible=S.players.map((p,i)=>i).filter(i=>S.players[i].budget>=1);

  if(eligible.length===0){ // nobody can pay for anything anymore
    while(S.i<S.countries.length){ S.i++; }
    return finish();
  }
  if(eligible.length===1 && S.players.length>1){ // walkover: everything left goes to the last solvent bidder
    const w=S.players[eligible[0]];
    while(S.i<S.countries.length){
      const cc=S.countries[S.i];
      if(w.budget>=1){ w.budget-=1; w.bought.push({...cc,price:1}); }
      else w.bought.push({...cc,price:0,free:true});
      S.i++;
    }
    return finish();
  }

  /* The opening €1 bid rotates seat by seat: seat 1 opens the first lot, seat 2 the
     second, and so on. Seats with no money left are skipped. */
  const opener = eligible[S.i % eligible.length];
  S.L={ price:1, holder:opener, active:eligible.slice(), turn:null };
  S.L.turn=nextAfter(opener);
  paint(true);
}

function nextAfter(idx){
  const a=S.L.active;
  const pos=a.indexOf(idx);
  for(let k=1;k<=a.length;k++){ const cand=a[(pos+k)%a.length]; if(cand!==S.L.holder) return cand; }
  return null;
}

function paint(fresh){
  clearTimer();
  const c=S.countries[S.i], L=S.L;
  if(L.turn===null || !S.players[L.turn]) return award();
  const actor=S.players[L.turn], holder=S.players[L.holder];
  const isAI=actor&&actor.ai;

  go(`<div class="stage ${fresh?'in':''}">
      <div class="flag">${flag(c.code)}</div>
      <div class="cname">${esc(cname(c))}</div>
      <div class="lot">${t('lot')} ${S.i+1} <span class="of">${t('of')} ${S.countries.length}</span></div>
    </div>
    <div class="price" id="pb">
      <div class="pl">${t('standing')}</div>
      <div class="pv">€${L.price}</div>
      <div><span class="hold seat${L.holder}">${t('topBid')} · ${esc(holder.name)}</span></div>
    </div>
    ${S._taunt?`<div class="card ink" style="padding:10px 12px;margin-bottom:12px"><p class="small" style="margin:0;opacity:.9;font-style:italic">&ldquo;${esc(S._taunt)}&rdquo;</p></div>`:''}
    ${S.clock&&!isAI?'<div class="timer" id="tb"><i></i></div>':''}
    <div class="strip">${S.players.map((p,i)=>`
      <div class="pl2 seat${i} ${i===L.turn?'turn':''} ${L.active.includes(i)?'':'out'}">
        <div class="n">${esc(p.name)}</div>
        <div class="b">€${p.budget}</div>
        <div class="role">${i===L.holder?t('topBid')+' · €'+L.price : i===L.turn?t('biddingNow') : L.active.includes(i)?p.bought.length+' ×':'—'}</div>
      </div>`).join('')}</div>
    <div class="turnbar seat${L.turn}">
      <div class="k">${t('nowBidding')}</div>
      <div class="w">${esc(actor.name)}</div>
    </div>
    <div id="act"></div>`);

  if(fresh) speak(cname(c));
  if(isAI) return aiTurn();
  humanTurn();
}

function humanTurn(){
  const L=S.L, actor=S.players[L.turn];
  const room=actor.budget-L.price;
  const steps=[1,2,5,10,25].filter(s=>L.price+s<=actor.budget);
  document.getElementById('act').innerHTML=`
    <div class="card">
      <span class="label">${esc(actor.name)} — ${t('raiseOrDrop')}</span>
      ${steps.length?`<div class="grid5" style="margin-bottom:9px">
        ${steps.map(s=>`<button class="btn sm go" data-s="${s}">+${s}</button>`).join('')}
      </div>
      <div class="row" style="margin-bottom:9px">
        <input id="cus" type="number" inputmode="numeric" min="${L.price+1}" max="${actor.budget}" placeholder="€${L.price+1}+">
        <button class="btn sm" id="cb" style="flex:0 0 40%">Bid</button>
      </div>`
      :`<p class="small" style="margin-bottom:9px">${t('noRaise')}</p>`}
      <button class="btn hot" id="pass">${t('dropOut')}</button>
      ${room>0&&steps.length?`<p class="small" style="margin-top:8px">${t('dropHint',{name:esc(S.players[L.holder].name), price:L.price})}</p>`:''}
    </div>`;
  document.getElementById('act').querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>raise(L.price+parseInt(b.dataset.s)));
  on('cb',()=>{ const v=parseInt(val('cus')); if(!v||v<=L.price) return toast(t('mustBeat',{price:L.price})); raise(v); });
  on('pass',()=>pass());
  if(S.clock) startClock(()=>pass(true));
}

function tock(last){
  const c=actx(); if(!c||window.MUTED) return;
  const t=c.currentTime,o=c.createOscillator(),g=c.createGain();
  o.type='square'; o.frequency.value=last?1350:900;
  g.gain.setValueAtTime(last?.3:.18,t); g.gain.exponentialRampToValueAtTime(.001,t+(last?.16:.07));
  o.connect(g).connect(c.destination); o.start(t); o.stop(t+.18);
}

function startClock(onOut){
  const bar=document.getElementById('tb'); if(!bar) return;
  const fill=bar.querySelector('i');
  const total=S.clock*1000; let left=total; const t0=Date.now();
  let lastSec=Math.ceil(total/1000);
  clearTimer();
  T=setInterval(()=>{
    left=total-(Date.now()-t0);
    const pct=Math.max(0,left/total*100);
    fill.style.width=pct+'%';
    if(pct<33) bar.classList.add('warn');
    const sec=Math.ceil(left/1000);
    if(sec!==lastSec){ lastSec=sec; if(sec<=5&&sec>0){ tock(sec<=3); if(sec<=3) Haptics.warning(); } }
    if(left<=0){ clearTimer(); onOut(); }
  },90);
}

function raise(amount){
  const L=S.L, actor=S.players[L.turn];
  if(amount>actor.budget) return toast(t('tooMuch'));
  blip(760,.14); Haptics.light();
  L.price=amount; L.holder=L.turn; L.turn=nextAfter(L.holder);
  if(L.turn===null) return award();
  paint(false);
  const pb=document.getElementById('pb'); if(pb){ pb.classList.add('bump'); setTimeout(()=>pb.classList.remove('bump'),260); }
}

function pass(timedOut){
  const L=S.L;
  blip(220,.12); Haptics.medium();
  L.active=L.active.filter(i=>i!==L.turn);
  if(L.active.length<=1) return award(timedOut);
  L.turn=nextAfter(L.holder);
  if(L.turn===null) return award(timedOut);
  paint(false);
}

function award(){
  clearTimer();
  const c=S.countries[S.i], L=S.L, w=S.players[L.holder];
  w.budget-=L.price;
  w.bought.push({...c, price:L.price});
  if(w.ai) S._taunt = winLine(S._taunt);
  gavel(t('sold'));
  setTimeout(()=>{
    go(`<div class="stage">
        <div class="flag">${flag(c.code)}</div>
        <div class="cname">${esc(cname(c))}</div>
        <div style="margin-top:11px"><span class="stamp">${esc(w.name)} · €${L.price}</span></div>
        <div class="lot" style="margin-top:13px">Lot ${S.i+1} <span class="of">of ${S.countries.length}</span></div>
      </div>
      ${S._taunt?`<div class="card ink" style="padding:11px 13px"><span class="label">${esc((S.players.find(p=>p.ai)||{}).name||'Rival')}</span><p style="margin:0;font-style:italic;font-size:14.5px">&ldquo;${esc(S._taunt)}&rdquo;</p></div>`:''}
      <div class="strip">${S.players.map((p,i)=>`<div class="pl2 seat${i}"><div class="n">${esc(p.name)}</div><div class="b">€${p.budget}</div><div class="c">${p.bought.length} ×</div></div>`).join('')}</div>
      <button class="btn go" id="n">${t('nextLot')}</button>`);
    on('n',()=>{S.i++;lot();});
  },520);
}

/* ============ THE BOT'S TURN — all local, no network, no cost ============ */
function think(ms){
  const bar=document.getElementById('think');
  if(bar){ const f=bar.querySelector('i'); f.style.transition=`width ${ms}ms linear`; requestAnimationFrame(()=>f.style.width='100%'); }
  return new Promise(r=>setTimeout(r,ms));
}

async function aiTurn(){
  const L=S.L, c=S.countries[S.i], me=S.players[L.turn];
  document.getElementById('act').innerHTML=`<div class="card">
      <h2>${esc(me.name)} ${t('deciding')}</h2>
      <p class="small" style="margin:0">${t('sizing',{price:L.price})}</p>
      <div class="thinkbar" id="think"><i></i></div>
    </div>`;

  await think(3000 + rnd(1200));   // 3.0 - 4.2 s, so the table can follow along

  if(!S._ceil || S._ceilLot!==S.i){ S._ceil=botCeiling(c); S._ceilLot=S.i; }
  /* Outside the closing three lots the bot keeps a euro in hand for every lot still
     to come, so it can never bid itself out of the auction early. */
  const lotsAfter = S.countries.length - S.i - 1;
  const reserve = lotsAfter >= 3 ? lotsAfter : 0;
  const hardCap = Math.min(me.budget - reserve, S._ceil.walk);

  if(L.price < hardCap && me.budget > L.price){
    /* If nobody left in the room can top the next bid, one euro settles it. Paying
       more than that is throwing money away, and the bot never does that. */
    const rivals = L.active.filter(i=>i!==L.turn);
    const contested = rivals.some(i=>S.players[i].budget > L.price + 1);
    const step = !contested ? 1
               : L.price<5 ? 1
               : Math.max(1, Math.round(L.price*0.18));
    const amount = Math.min(me.budget, hardCap, L.price + step);
    if(amount > L.price){
      S._taunt = tauntFor(c, S._taunt);
      return raise(amount);
    }
  }
  S._taunt = passLine(S._taunt);
  pass();
}

/* ============ REVEAL — no winner named until every bar is off ============ */
function finish(){
  clearTimer(); S._taunt='';
  document.body.classList.remove('playing');
  try{ speechSynthesis.cancel(); }catch(e){}
  const rows=S.players.map(p=>{
    const pts=p.bought.reduce((a,b)=>a+b.pop,0);
    const spent=p.bought.reduce((a,b)=>a+b.price,0);
    return {p,pts,spent,eff:pts>0?spent/pts:Infinity};
  });
  const best=rows.slice().sort((a,b)=>b.pts-a.pts)[0];
  const bestEff=rows.slice().sort((a,b)=>a.eff-b.eff)[0];

  go(`<div class="card ink">
      <span class="label">${t('sealed')}</span>
      <h2>${t('nobody')}</h2>
      <p class="small">${t('revealHint')}</p>
      <button class="btn go sm" id="rev" style="margin-top:9px">${t('liftAll')}</button>
    </div>
    <div id="verdict"></div>
    ${rows.map((s,ri)=>`
    <div class="card">
      <h2 style="margin-bottom:8px">${esc(s.p.name)}</h2>
      ${s.p.bought.length? s.p.bought.map(b=>`
        <div class="line">
          <span class="l"><span style="font-size:16px">${flag(b.code)}</span><b>${esc(cname(b))}</b></span>
          <span class="r">${b.free?'free':'€'+b.price} · <span class="redact"><span class="v">${fmtPop(b.pop)}</span></span></span>
        </div>`).join('') : `<p class="small">${t('nothing')}</p>`}
      <div class="total"><span>${t('points')}</span><span class="redact"><span class="v">${s.pts.toFixed(1)}</span></span></div>
      <div class="total" style="border:0;padding-top:3px;font-size:12.5px;opacity:.7">
        <span>${t('spentEff',{n:s.spent})}</span>
        <span class="redact"><span class="v">${s.eff===Infinity?'—':s.eff.toFixed(2)+' €/M'}</span></span>
      </div>
    </div>`).join('')}
    <div class="row">
      <button class="btn ghost" id="again">${t('playAgain')}</button>
      <button class="btn" id="menu">${t('menu')}</button>
    </div>`);

  const bars=[...app.querySelectorAll('.redact')];
  let opened=0, booked=false;
  const check=()=>{
    if(opened<bars.length) return;
    setTimeout(async ()=>{
      let outcome=null;
      if(!booked && S.kind==='solo' && rows.length===2){
        booked=true;
        const you=rows.find(r=>!r.p.ai), bot=rows.find(r=>r.p.ai);
        if(you&&bot) outcome=await recordGame(you, bot, S.level||'expert');
      }
      gavel(t('result'));
      const v=document.getElementById('verdict');
      const lots=best.p.bought.filter(b=>GEO[b.code]);
      v.innerHTML=`<div class="card amber">
        <span class="label">${t('final')}</span>
        <h2 style="font-size:31px">${t('takesIt',{name:esc(best.p.name)})}</h2>
        <p class="small" style="opacity:.85">${t('pointsAgainst',{a:best.pts.toFixed(1), b:rows.filter(r=>r!==best).map(r=>r.pts.toFixed(1)).join(' / ')})}</p>
        ${bestEff.eff!==Infinity?`<p class="small" style="opacity:.85">${t('smartest',{name:esc(bestEff.p.name), v:bestEff.eff.toFixed(2)})}</p>`:''}
      </div>
      ${outcome?`<div class="card">
        <span class="label">${t('record')}</span>
        <div class="bigrec"><span class="v">${REC.won}</span><span class="sep">–</span><span class="v">${REC.lost}</span>${REC.drawn?`<span class="sep">–</span><span class="v">${REC.drawn}</span>`:''}</div>
        <p class="small" style="text-align:center;margin:7px 0 0">${REC.played} ${t('games')}${REC.streak?` · ${t('streak')} ${REC.streak>0?'+':''}${REC.streak}`:''}</p>
        ${outcome.record?`<p class="small" style="text-align:center;margin:8px 0 0"><b>${t('newRecord')}</b></p>`:''}
      </div>`:''}
      ${lots.length?`<div class="card" style="padding:0;border:0;box-shadow:none;margin-bottom:16px">
        <div class="globe" id="gl"></div><div class="gcap">${t('world',{name:esc(best.p.name)})}</div>
        <div class="chips">${lots.map(b=>`<span class="chip">${flag(b.code)} ${esc(cname(b))}</span>`).join('')}</div>
      </div>`:''}`;
      const host=document.getElementById('gl');
      if(host){ if(stopGlobe) stopGlobe(); stopGlobe = globe(host, lots); }
      best.p.ai ? defeatSting() : (fanfare(), Haptics.success());
      v.scrollIntoView({behavior:'smooth',block:'start'});
    },420);
  };
  bars.forEach(b=>b.onclick=()=>{ if(b.classList.contains('open'))return; b.classList.add('open'); blip(520,.1); opened++; check(); });
  on('rev',()=>{ let d=0; bars.forEach(b=>{ if(b.classList.contains('open'))return;
    setTimeout(()=>{ b.classList.add('open'); blip(520,.08); opened++; check(); },(d+=70)); }); });
  on('again',()=>{knock(); S.kind==='net'?online():setup(S.kind||'multi');});
  on('menu',()=>{knock();home();});
}

/* ============ ONLINE ROOMS — random handles, no personal data ============ */
const HANDLE='BIDDER-'+Array.from({length:3},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[rnd(32)]).join('');
const RID='p'+Math.random().toString(36).slice(2,9);
let poll=null;
const stopPoll=()=>{ if(poll){clearInterval(poll);poll=null;} };
async function rget(k){ const v=await Net.get(k); return v?JSON.parse(v):null; }
async function rset(k,v){ return Net.set(k, JSON.stringify(v)); }

function online(){
  stopPoll(); actx(); S={kind:'net'};
  document.body.classList.remove('playing');
  go(`<div class="card">
    <h2>${t('onlineTitle')}</h2>
    <p class="small">${t('onlineIntro')}</p>
    <div class="card amber" style="box-shadow:none;margin:12px 0">
      <span class="label">${t('appearAs')}</span>
      <div style="font-family:'Space Mono',monospace;font-weight:700;font-size:19px">${HANDLE}</div>
      <p class="small" style="margin:6px 0 0;opacity:.8">${t('handleNote')}</p>
    </div>
    <button class="btn hot" id="new">${t('openRoom')}</button>
    <div class="row" style="margin-top:10px">
      <input id="cd" placeholder="${t('roomCode').toUpperCase()}" maxlength="4" style="text-transform:uppercase;text-align:center;letter-spacing:.18em">
      <button class="btn sm" id="join" style="flex:0 0 40%">${t('joinRoom')}</button>
    </div>
    <button class="btn ghost sm" id="back" style="margin-top:10px">${t('back')}</button>
  </div>`);
  on('back',home);
  on('new',async()=>{
    const code=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[rnd(32)]).join('');
    const room={code,host:RID,phase:'lobby',round:0,
      countries:draw(10,'expert').map(c=>({code:c.code,name:c.name,pop:c.pop})),
      players:[{id:RID,name:HANDLE,budget:budgetFor(10),bought:[]}]};
    if(!await rset('room:'+code,room)) return toast(t('storageFail'));
    lobby(code);
  });
  on('join',async()=>{
    const code=val('cd').toUpperCase();
    if(code.length!==4) return toast(t('fourChars'));
    const room=await rget('room:'+code);
    if(!room) return toast(t('noRoom'));
    if(room.phase!=='lobby') return toast(t('alreadyStarted'));
    if(!room.players.find(p=>p.id===RID)){
      if(room.players.length>=2) return toast(t('roomFull'));
      room.players.push({id:RID,name:HANDLE,budget:budgetFor(10),bought:[]});
      await rset('room:'+code,room);
    }
    lobby(code);
  });
}

function lobby(code){
  stopPoll();
  const tick=async()=>{
    const room=await rget('room:'+code); if(!room) return;
    if(room.phase!=='lobby'){ stopPoll(); return onlineLot(code); }
    const host=room.host===RID;
    go(`<div class="card ink"><span class="label">${t('roomCode')}</span><div class="code">${code}</div>
        <p class="small" style="text-align:center">${t('shareCode')}</p></div>
      <div class="card">
        <span class="label">${t('inRoom')} (${room.players.length})</span>
        ${room.players.map(p=>`<div class="line"><span class="l"><b>${esc(p.name)}${p.id===RID?' · '+t('youTag'):''}</b></span><span class="r">${p.id===room.host?t('hostTag'):''}</span></div>`).join('')}
        ${host?`<button class="btn hot" id="go" style="margin-top:12px" ${room.players.length!==2?'disabled':''}>${t('startAuction')}</button>
                <p class="small" style="margin-top:7px">${room.players.length<2?t('waitJoin'):t('bothIn')}</p>`
              :`<p class="small" style="margin-top:12px"><span class="spin"></span> ${t('waitHost')}</p>`}
        <button class="btn ghost sm" id="lv" style="margin-top:8px">${t('leaveRoom')}</button>
      </div>`);
    on('lv',()=>{knock();stopPoll();home();});
    on('go',async()=>{ knock(); room.phase='bid'; await rset('room:'+code,room); stopPoll(); onlineLot(code); });
  };
  tick(); poll=setInterval(tick,3000);
}

function onlineLot(code){
  stopPoll();
  let sent=false, shown=-1;
  const tick=async()=>{
    const room=await rget('room:'+code); if(!room) return;
    if(room.phase==='done'){
      stopPoll(); clearTimer();
      S={kind:'net',mode:'online',players:room.players.map(p=>({name:p.name+(p.id===RID?' · '+t('youTag'):''),budget:p.budget,bought:p.bought}))};
      return finish();
    }
    const me=room.players.find(p=>p.id===RID); if(!me) return;
    const c=room.countries[room.round];
    if(!c){ if(room.host===RID){ room.phase='done'; await rset('room:'+code,room);} return; }

    if(room.host===RID){
      const bids={};
      for(const p of room.players){ const b=await rget(`room:${code}:r${room.round}:${p.id}`); if(b) bids[p.id]=b.bid; }
      if(Object.keys(bids).length===room.players.length){
        let top=null;
        for(const p of room.players){ const b=Math.min(bids[p.id],p.budget); if(b>0&&(!top||b>top.b)) top={p,b}; }
        if(top){ top.p.budget-=top.b; top.p.bought.push({...c,price:top.b}); }
        room.round++;
        if(room.round>=room.countries.length) room.phase='done';
        await rset('room:'+code,room);
        sent=false; return;
      }
    }
    if(sent){ if(shown!==-2){ shown=-2; go(`<div class="card"><h2>${t('bidIn')}</h2><p class="small"><span class="spin"></span> ${t('waitOthers')}</p></div>`); } return; }
    if(shown===room.round) return;   // already on screen, leave the input alone
    shown=room.round;

    clearTimer();
    document.body.classList.add('playing');
    speak(cname(c));
    go(`<div class="stage in"><div class="flag">${flag(c.code)}</div><div class="cname">${esc(cname(c))}</div>
        <div class="lot">Lot ${room.round+1} <span class="of">of ${room.countries.length}</span></div>
        <div style="font-family:'Space Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.2em;opacity:.6;margin-top:7px">ROOM ${code}</div></div>
      <div class="card">
        <span class="label">${t('sealedBid',{n:me.budget})}</span>
        <input id="bid" type="number" min="0" max="${me.budget}" value="1" inputmode="numeric">
        <button class="btn hot" id="ok" style="margin-top:11px">${t('submit')}</button>
      </div>
      <div class="card ink">${room.players.map(p=>`<div class="line"><span class="l"><b>${esc(p.name)}${p.id===RID?' · '+t('youTag'):''}</b></span><span class="r">€${p.budget} · ${p.bought.length} ${t('lotsWon')}</span></div>`).join('')}</div>`);
    on('ok',async()=>{
      const b=Math.max(0,Math.min(me.budget,parseInt(val('bid'))||0));
      await rset(`room:${code}:r${room.round}:${RID}`,{bid:b});
      sent=true; shown=-2; blip(760,.14);
      go(`<div class="card"><h2>${t('bidIn')}</h2><p class="small"><span class="spin"></span> ${t('waitOthers')}</p></div>`);
    });
  };
  tick(); poll=setInterval(tick,3000);
}
