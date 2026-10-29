/* ============================================================================
   fx.js — motion. Springs, rolling numbers, the gavel moment and confetti.

   Rules this file lives by:
   - Only `transform` and `opacity` are animated (the compositor does the work),
     the one exception being a number rolling up, which is text.
   - Nothing here decides anything in the game and nothing blocks input: the
     engine has already settled the lot before the gavel moves, a tap skips to
     the end state, and with Reduce Motion on everything lands instantly.
   - For the gavel the stylesheet already holds the FINAL state; the
     animations run from the start state to it. So skipping is "cancel them all".
   ========================================================================== */
const FX = (() => {
  const mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let reduced = !!mq.matches;
  if (mq.addEventListener) mq.addEventListener('change', e => { reduced = e.matches; });
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  /* ---------- springs: a damped spring, sampled into keyframes ---------- */
  function springFrames(from, to, o) {
    o = Object.assign({ k: 190, c: 15, m: 1 }, o);
    let x = from, v = 0, t = 0; const dt = 1 / 120, out = [x];
    while (t < 2.2) {
      const a = (-o.k * (x - to) - o.c * v) / o.m; v += a * dt; x += v * dt; t += dt;
      if (Math.round(t / dt) % 2 === 0) out.push(x);
      if (Math.abs(x - to) < .0008 && Math.abs(v) < .004) break;
    }
    out.push(to);
    return { frames: out, ms: Math.max(160, Math.round(t * 1000)) };
  }
  /* animate `el` from `from` to `to`; map(v) turns the spring value into keyframe properties */
  function spring(el, from, to, map, o) {
    o = o || {};
    if (reduced) return el.animate([Object.assign({}, map(to), { opacity: 1 })], { duration: 1, fill: 'forwards' });
    const f = springFrames(from, to, o);
    const kfs = f.frames.map((v, i) => Object.assign({ offset: i / (f.frames.length - 1) }, map(v)));
    return el.animate(kfs, { duration: f.ms, delay: o.delay || 0, fill: 'backwards', easing: 'linear' });
  }
  function fade(el, from, to, ms, delay) {
    return el.animate([{ opacity: from }, { opacity: to }], { duration: reduced ? 1 : ms, delay: delay || 0, fill: 'both', easing: 'ease-out' });
  }
  /* a number rolling to its new value (text only; the one thing not on the compositor) */
  function roll(el, from, to, ms, fmt) {
    fmt = fmt || (v => String(Math.round(v)));
    if (el._roll) cancelAnimationFrame(el._roll);
    if (reduced || from === to) { el.textContent = fmt(to); el._roll = 0; return; }
    const t0 = performance.now(); ms = ms || 260;
    const step = now => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      el._roll = p < 1 ? requestAnimationFrame(step) : 0;
    };
    el._roll = requestAnimationFrame(step);
  }
  const bump = (el, scale) => { if (el && !reduced) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(' + (scale || 1.04) + ')', offset: .4 }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.3,1.4,.5,1)' }); };
  const shakeX = el => { if (el && !reduced) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 260 }); };

  /* ---------- the gavel: a block and a rotating swing layer, as two stacked SVGs ---------- */
  function gavelMarkup() {
    const id = 'g' + Math.random().toString(36).slice(2, 6), hand = { x: 286, y: 161 }, hl = { x: 0, y: 176 };
    const defs = `<defs>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C58A4A"/><stop offset=".45" stop-color="#8E5A2B"/><stop offset="1" stop-color="#4E2E14"/></linearGradient>
    <linearGradient id="${id}d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5A3519"/><stop offset=".5" stop-color="#9A6532"/><stop offset="1" stop-color="#5A3519"/></linearGradient>
    <linearGradient id="${id}t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9A566"/><stop offset="1" stop-color="#A9743A"/></linearGradient>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7B4B24"/><stop offset="1" stop-color="#40240F"/></linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0CF7C"/><stop offset=".5" stop-color="#C79A3C"/><stop offset="1" stop-color="#8A6620"/></linearGradient>
    <filter id="${id}s" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="7" flood-color="#000" flood-opacity=".35"/></filter></defs>`;
    const block = `<svg viewBox="-40 -60 520 370" aria-hidden="true" focusable="false">${defs}<g filter="url(#${id}s)">
      <path d="M24 238 L196 238 L214 218 L42 218 Z" fill="url(#${id}t)"/><rect x="24" y="238" width="172" height="34" rx="6" fill="url(#${id}f)"/><ellipse cx="110" cy="228" rx="46" ry="8" fill="#3B2411" opacity=".55"/><rect x="24" y="238" width="172" height="3" fill="#E7BC82" opacity=".35"/></g></svg>`;
    const head = `<svg viewBox="-40 -60 520 370" aria-hidden="true" focusable="false">${defs}<g transform="translate(${hand.x} ${hand.y}) rotate(-90) translate(${-hl.x} ${-hl.y})" filter="url(#${id}s)">
      <rect x="-9" y="22" width="18" height="150" rx="9" fill="url(#${id}d)"/><rect x="-9" y="150" width="18" height="30" rx="9" fill="url(#${id}b)" opacity=".95"/>
      <rect x="-65" y="-30" width="130" height="60" rx="12" fill="url(#${id}h)"/><rect x="-65" y="-30" width="130" height="14" rx="9" fill="#fff" opacity=".18"/>
      <rect x="-44" y="-30" width="11" height="60" fill="url(#${id}b)"/><rect x="33" y="-30" width="11" height="60" fill="url(#${id}b)"/>
      <ellipse cx="65" cy="0" rx="9" ry="30" fill="#6B4120"/><ellipse cx="-65" cy="0" rx="9" ry="30" fill="#B67C3F"/></g></svg>`;
    return `<div class="gv" aria-hidden="true"><div class="gvl gvb">${block}</div><div class="gvl gvs">${head}</div><div class="gvfx"></div></div>`;
  }
  /* the pad on the block and the pivot in the hand, as fractions of the gavel box */
  const PAD = { x: (110 + 40) / 520, y: (226 + 60) / 370 }, PIVOT = { x: (286 + 40) / 520, y: (161 + 60) / 370 };

  /* ---------- confetti: a few dozen pieces, compositor-only, in one contained layer ---------- */
  function confetti(root, n, cols) {
    if (reduced) return null;
    cols = cols || ['#EDC66F', '#C99A3F', '#F4DC9A', '#EDC66F', '#7FA9FF', '#FF8A96'];
    const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true'); root.appendChild(box);
    const h = Math.max(300, root.clientHeight || innerHeight);
    for (let i = 0; i < (n || 22); i++) {
      const e = document.createElement('i'); e.className = 'cf';
      e.style.left = (4 + Math.random() * 92) + '%'; e.style.background = cols[i % cols.length]; box.appendChild(e);
      e.animate([
        { transform: 'translate(0,-24px) rotate(0deg)', opacity: 1 },
        { transform: `translate(${(Math.random() - .5) * 140}px,${h * .9}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: .9, offset: .85 },
        { opacity: 0 }
      ], { duration: 1100 + Math.random() * 900, delay: Math.random() * 260, easing: 'cubic-bezier(.2,.5,.4,1)', fill: 'both' });
    }
    setTimeout(() => box.remove(), 2600);
    return box;
  }

  /* ---------- SOLD: the gavel moment (about 1.1 s, under 1.2) ----------
     wind-up 200 ms, swing 140 ms, impact at 420 ms (80 ms head start for the first frame).
     The knock is scheduled on the AUDIO clock for the exact impact time; the visual impact
     fires on the first animation frame at or after it, and the haptic with it, so sound,
     picture and tap land within one frame of each other.
     `o`: { quality:'bargain'|'fair'|'overpay', reveal: fn run when the player may continue, onNext: fn }
     Returns { skip(), done: Promise } — done resolves once the player has pressed Next. */
  function playSold(wrap, o) {
    const q = o.quality, power = q === 'bargain' ? 1 : q === 'overpay' ? .66 : .88;
    const sw = $('.gvs', wrap), blockEl = $('.gvb', wrap), fx = $('.gvfx', wrap), plate = $('.plate', wrap), line = $('.soldline', wrap),
      tray = $('.tray', wrap), fly = $('.fly', wrap), next = $('#n', wrap), flash = $('.flash', wrap), scrim = $('.scrim', wrap), hint = $('.skiphint', wrap),
      rays = $('.rays', wrap), slot = $('.mini.new', tray), root = document.getElementById('root');
    const anims = [], timers = []; let done = false, impacted = false, ready = false, resolveDone;
    const A = a => { anims.push(a); return a; }, T0 = performance.now();
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const GAP = 80, TWIND = 200, TSWING = 140, TIMP = GAP + TWIND + TSWING;
    const result = { skip: () => finalize(), done: new Promise(r => { resolveDone = r; }) };

    const leave = () => {
      if (wrap._gone) return; wrap._gone = true; Snd.ui();
      /* the fade-out is cosmetic: a page that is not being rendered (a background tab) must still move on */
      let over = false; const fin = () => { if (over) return; over = true; wrap.remove(); resolveDone(); };
      wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 1 : 180, fill: 'both' }).finished.then(fin, fin);
      setTimeout(fin, reduced ? 30 : 300);
    };
    if (next) next.onclick = e => { e.stopPropagation(); leave(); };
    wrap.addEventListener('pointerdown', () => { if (!done && !(ready && !reduced)) finalize(); });

    function finalize() {
      if (done) return; done = true;
      timers.forEach(clearTimeout);
      anims.forEach(a => { try { a.cancel(); } catch (e) {} });
      fx.innerHTML = ''; $$('.confetti', wrap).forEach(x => x.remove());
      if (fly) fly.style.visibility = 'hidden';
      if (slot) { slot.innerHTML = o.flag; slot.classList.remove('new'); }
      if (hint) hint.hidden = true;
      ready = true; wrap.classList.add('ready', 'final');
      if (next) { try { next.focus({ preventScroll: true }); } catch (e) {} }
    }

    if (reduced) {
      A(fade(wrap, 0, 1, 150)); Snd.knock(0, power); Haptics[q === 'overpay' ? 'light' : 'medium']();
      finalize(); return result;
    }

    const pivot = `${PIVOT.x * 100}% ${PIVOT.y * 100}%`; sw.style.transformOrigin = pivot;
    A(fade(scrim, 0, 1, 140)); A(fade(wrap, 0, 1, 90));
    A(sw.animate([{ transform: 'rotate(54deg)' }, { transform: 'rotate(68deg)' }], { duration: TWIND, delay: GAP, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }));
    A(sw.animate([{ transform: 'rotate(68deg)' }, { transform: 'rotate(0deg)' }], { duration: TSWING, delay: GAP + TWIND, easing: 'cubic-bezier(.6,0,1,.55)', fill: 'both' }));
    const hold = (el, ms) => { if (el) A(el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: ms, fill: 'both' })); };
    hold(plate, TIMP + 20); hold(line, TIMP + 180); hold(tray, TIMP + 120); hold(fly, TIMP + 440); hold(flash, TIMP); hold(rays, TIMP + 2);

    later(2600, () => { if (!ready) finalize(); });          // watchdog: whatever happens, the way on appears
    const lat = Math.min(.04, Snd.latency());
    Snd.whoosh((GAP + TWIND - 40) / 1000, (TSWING + 40) / 1000);
    Snd.knock(TIMP / 1000 - lat, power);
    const tick = t => { if (done) return; if (t - T0 >= TIMP) impact(); else requestAnimationFrame(tick); };
    requestAnimationFrame(tick);

    function impact() {
      if (impacted) return; impacted = true;
      Haptics[q === 'overpay' ? 'medium' : 'heavy']();
      A(blockEl.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.93)', offset: .4 }, { transform: 'scaleY(1)' }], { duration: 150, easing: 'ease-out' }));
      if (root) A(root.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(-1px,0)' }, { transform: 'translate(0,0)' }], { duration: 90 * power + 40 }));
      if (flash) A(flash.animate([{ opacity: .9 * power }, { opacity: 0 }], { duration: 220, fill: 'both' }));
      A(plate.animate([
        { opacity: 0, transform: 'translateY(-14px) rotate(-3deg) scale(1.9)' },
        { opacity: 1, transform: 'translateY(0) rotate(-3deg) scale(1)', offset: .42 },
        { transform: 'translateY(0) rotate(-3deg) scale(.96)', offset: .62 },
        { opacity: 1, transform: 'translateY(0) rotate(-3deg) scale(1)' }
      ], { duration: 360, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' }));
      if (rays) A(rays.animate([{ opacity: 0, transform: 'scale(.5) rotate(0deg)' }, { opacity: q === 'bargain' ? 1 : q === 'fair' ? .45 : 0, transform: 'scale(1) rotate(14deg)' }], { duration: 800, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' }));
      rings(power); sparks(q);
      if (q === 'bargain') { const c = confetti(wrap, 20); if (c) anims.push({ cancel() { c.remove(); } }); }
      later(130, () => {
        if (done) return;
        A(line.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' }));
        A(tray.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, fill: 'both', easing: 'ease-out' }));
      });
      later(380, flyCard);
    }
    function ringEl(delay, scale, ms, op) {
      const r = document.createElement('i'); r.className = 'ring'; r.style.left = PAD.x * 100 + '%'; r.style.top = PAD.y * 100 + '%'; fx.appendChild(r);
      A(r.animate([{ transform: 'translate(-50%,-50%) scale(.2)', opacity: op }, { transform: `translate(-50%,-50%) scale(${scale})`, opacity: 0 }], { duration: ms, delay, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'both' }));
    }
    function rings(p) { ringEl(0, 2.2 * p + .5, 420, .9); ringEl(60, 3.2 * p + .6, 520, .55); if (p > .8) ringEl(120, 4.4, 640, .3); }
    function sparks(qq) {
      const n = qq === 'bargain' ? 22 : qq === 'fair' ? 10 : 0;
      for (let i = 0; i < n; i++) {
        const s = document.createElement('i'); s.className = 'spark'; s.style.left = PAD.x * 100 + '%'; s.style.top = PAD.y * 100 + '%'; fx.appendChild(s);
        const ang = (-170 + Math.random() * 160) * Math.PI / 180, dist = 50 + Math.random() * (qq === 'bargain' ? 140 : 90);
        A(s.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist - 2}px,${Math.sin(ang) * dist * .8 + 30}px) scale(.2)`, opacity: 0 }], { duration: 420 + Math.random() * 300, easing: 'cubic-bezier(.1,.7,.3,1)', fill: 'both' }));
      }
      for (let i = 0; i < 4; i++) {
        const d = document.createElement('i'); d.className = 'dust'; d.style.left = (PAD.x * 100 + (i - 1.5) * 4) + '%'; d.style.top = PAD.y * 100 + '%'; fx.appendChild(d);
        A(d.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: .5 }, { transform: `translate(${(i - 1.5) * 22}px,-26px) scale(1.7)`, opacity: 0 }], { duration: 620, easing: 'ease-out', fill: 'both' }));
      }
    }
    /* the card flies from the plate to the winner's collection */
    function flyCard() {
      if (done || !fly || !slot) return;
      const fr = fly.getBoundingClientRect(), sr = slot.getBoundingClientRect(), pr = plate.getBoundingClientRect();
      const sx = pr.left + pr.width / 2 - (fr.left + fr.width / 2), sy = pr.top + pr.height / 2 - (fr.top + fr.height / 2);
      const ex = sr.left + sr.width / 2 - (fr.left + fr.width / 2), ey = sr.top + sr.height / 2 - (fr.top + fr.height / 2), sc = sr.width / fr.width;
      fly.style.visibility = 'visible';
      A(spring(fly, 0, 1, v => ({ opacity: Math.min(1, v * 3), transform: `translate(${sx + (ex - sx) * v}px,${sy + (ey - sy) * v - Math.sin(Math.min(1, v) * Math.PI) * 46}px) scale(${1.15 + (sc - 1.15) * v}) rotate(${(1 - v) * -14}deg)` }), { k: 150, c: 15 }));
      later(430, () => {
        if (done) return;
        fly.style.visibility = 'hidden'; slot.innerHTML = o.flag; slot.classList.remove('new');
        A(slot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)', offset: .4 }, { transform: 'scale(1)' }], { duration: 340, easing: 'cubic-bezier(.3,1.5,.5,1)' }));
        Snd.chime();
      });
      later(300, showNext);
    }
    /* Next is revealed by a class and a CSS transition, never by an animation that could leave it
       invisible: it is the one control the player cannot do without. */
    function showNext() {
      if (done) return;
      wrap.classList.add('ready'); if (hint) hint.hidden = true; ready = true;
    }
    return result;
  }

  return { get reduced() { return reduced; }, $, $$, springFrames, spring, fade, roll, bump, shakeX, gavelMarkup, confetti, playSold, PAD, PIVOT };
})();
