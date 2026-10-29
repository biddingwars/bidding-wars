/* ============================================================================
   sound.js — the whole soundscape, generated in code with Web Audio.
   No audio files, no network. Every voice goes through one master gain and a
   compressor, so nothing clips and the loudness stays balanced.

   Browsers (iOS above all) only let audio start from a real touch, so the
   context is created and resumed on the first gesture; a context that iOS
   interrupts (a call, the lock screen) resumes on the next touch. The in-app
   mute button silences everything and also gates the haptics (platform.js).
   ========================================================================== */
const Snd = (() => {
  let ctx = null, master = null, noiseBuf = null, muted = false, last = null;

  function wire(c) {
    ctx = c;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 5; comp.attack.value = .003; comp.release.value = .18;
    master = ctx.createGain(); master.gain.value = .85;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function ensure() {
    if (!ctx) {
      try {
        wire(new (window.AudioContext || window.webkitAudioContext)());
        /* 'ambient' keeps the player's own music playing and obeys the silent switch */
        try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
        ctx.onstatechange = () => { last = ctx.state; };
      } catch (e) { ctx = null; }
    }
    if (ctx && !muted && (ctx.state === 'suspended' || ctx.state === 'interrupted')) ctx.resume().catch(() => {});
    return ctx;
  }
  const ok = () => !muted && !!ensure();
  const now = delay => ctx.currentTime + Math.max(0, delay || 0);

  function env(g, t, a, peak, d) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f0, f1, t, dur, peak, a) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 != null) o.frequency.exponentialRampToValueAtTime(f1, t + dur * .75);
    env(g, t, a || .004, peak, dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .06);
  }
  function noise(t, dur, type, f, q, peak, a, f1) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = type; bp.frequency.setValueAtTime(f, t);
    if (f1) bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    bp.Q.value = q;
    const g = ctx.createGain(); env(g, t, a || .002, peak, dur);
    s.connect(bp).connect(g).connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .06);
  }

  const API = {
    unlock() { ensure(); },
    get state() { return ctx ? ctx.state : 'none'; },
    get muted() { return muted; },
    setMuted(m) {
      muted = !!m; window.MUTED = muted;
      if (ctx && muted) ctx.suspend().catch(() => {}); else ensure();
    },
    /* seconds of output latency, so a visual can be lined up with what is heard */
    latency() { return ctx ? (ctx.outputLatency || ctx.baseLatency || 0) : 0; },
    resume() { if (ctx && !muted && (ctx.state === 'suspended' || ctx.state === 'interrupted')) ctx.resume().catch(() => {}); },
    /* tests render the voices into an OfflineAudioContext */
    _attach(c) { muted = false; wire(c); },

    /* wooden knock: body thump, two resonant modes, a crack and a short tail */
    knock(delay, power) {
      if (!ok()) return;
      const t = now(delay), p = power == null ? 1 : power;
      osc('sine', 215, 56, t, .26, .8 * p, .003);
      noise(t, .22, 'bandpass', 430, 11, .6 * p, .001);
      noise(t, .16, 'bandpass', 1060, 13, .34 * p, .001);
      noise(t, .05, 'highpass', 1700, .7, .4 * p, .0008);
      noise(t + .01, .34, 'lowpass', 520, .6, .08 * p, .01);
    },
    /* the gavel swinging through the air */
    whoosh(delay, dur) {
      if (!ok()) return;
      const t = now(delay), s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(260, t); bp.frequency.exponentialRampToValueAtTime(2600, t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.18, t + dur * .8); g.gain.linearRampToValueAtTime(.0001, t + dur);
      s.connect(bp).connect(g).connect(master); s.start(t, 0); s.stop(t + dur + .05);
    },
    tick(strong) { if (!ok()) return; osc('sine', strong ? 1900 : 1450, null, now(), .045, strong ? .18 : .1, .001); },
    ui() { if (!ok()) return; osc('sine', 980, 1320, now(), .05, .06, .002); },
    /* a raise climbs a whole tone for every raise in the lot, so a bidding war sounds like one */
    raise(n) {
      if (!ok()) return;
      const t = now(), f = 523.25 * Math.pow(2, Math.min(n || 0, 7) * 2 / 12);
      osc('triangle', f, null, t, .16, .12, .004); osc('sine', f * 1.5, null, t + .07, .22, .1, .004);
    },
    /* the rival's raise: quieter and softer, so a bot bidding repeatedly never grates */
    bot() { if (!ok()) return; osc('sine', 600, 640, now(), .1, .06, .004); },
    drop() { if (!ok()) return; const t = now(); osc('sine', 150, 64, t, .22, .45, .003); noise(t, .12, 'lowpass', 380, .7, .1, .002); },
    chime() { if (!ok()) return; const t = now(); [880, 1320, 1760].forEach((f, i) => osc('sine', f, null, t + i * .05, .5, .08 / (i + 1), .004)); },
    fanfare() {
      if (!ok()) return;
      const t = now(), n = (f, at, d, v) => { osc('triangle', f, null, t + at, d, v, .015); osc('sine', f * 2, null, t + at, d, v * .35, .015); };
      [[392, 0, .16], [494, .14, .16], [587, .28, .16], [784, .42, .34]].forEach(([f, a, d]) => n(f, a, d, .14));
      [[392, .8, 1.3, .09], [494, .8, 1.3, .08], [587, .8, 1.3, .08], [784, .82, 1.2, .09], [988, .86, 1.1, .05]].forEach(([f, a, d, v]) => n(f, a, d, v));
      [1568, 1976, 2349, 2637].forEach((f, i) => osc('sine', f, null, t + 1 + i * .09, .6, .04, .004));
    },
    /* The win call of the US States pack: a raptor's scream, synthesised (no recording, so nothing to license).
       It is the call film makers dub over eagles — in real life that is a red-tailed hawk; a bald eagle's own
       voice is a thin chirp. A rasping saw through a formant sweep, glide up then down, a second shorter cry. */
    eagle() {
      if (!ok()) return;
      const t = now();
      const cry = (at, dur, f0, f1, f2, peak) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter(), tr = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0, t + at);
        o.frequency.exponentialRampToValueAtTime(f1, t + at + dur * .16);   // the cry leaps up…
        o.frequency.exponentialRampToValueAtTime(f2, t + at + dur);         // …and slides down
        lfo.frequency.value = 31; lg.gain.value = .22; lfo.connect(lg).connect(tr.gain); tr.gain.value = .78;   // the rasp
        bp.type = 'bandpass'; bp.Q.value = 1.1; bp.frequency.setValueAtTime(f0 * 1.5, t + at); bp.frequency.exponentialRampToValueAtTime(f2 * 1.9, t + at + dur);
        lp.type = 'lowpass'; lp.frequency.value = 6200;
        const hold = (gn, pk) => {                                        // quick attack, held, then a fall (env() alone dies too fast for a scream)
          gn.gain.cancelScheduledValues(t + at); gn.gain.setValueAtTime(.0001, t + at);
          gn.gain.exponentialRampToValueAtTime(pk, t + at + .035);
          gn.gain.linearRampToValueAtTime(pk * .8, t + at + dur * .68);
          gn.gain.exponentialRampToValueAtTime(.0001, t + at + dur);
        };
        hold(g, peak);
        o.connect(bp).connect(lp).connect(tr).connect(g).connect(master);
        o.start(t + at); lfo.start(t + at); o.stop(t + at + dur + .08); lfo.stop(t + at + dur + .08);
        const ns = ctx.createBufferSource(), nb = ctx.createBiquadFilter(), ng = ctx.createGain();
        ns.buffer = noiseBuf; ns.loop = true; nb.type = 'bandpass'; nb.Q.value = 1.4;
        nb.frequency.setValueAtTime(f1 * 1.6, t + at); nb.frequency.exponentialRampToValueAtTime(f2 * 1.6, t + at + dur);
        hold(ng, peak * .5);
        ns.connect(nb).connect(ng).connect(master); ns.start(t + at, Math.random() * .5); ns.stop(t + at + dur + .06);
      };
      cry(0, 1.25, 1700, 2650, 1250, .16);
      cry(1.45, .7, 1850, 2400, 1500, .1);
    },
    sting() {
      if (!ok()) return;
      const t = now();
      [[311, 0, .35], [262, .28, .5], [196, .55, .9]].forEach(([f, a, d]) => osc('triangle', f, null, t + a, d, .12, .02));
    }
  };
  return API;
})();

['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, () => Snd.unlock(), { passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) Snd.resume(); });
addEventListener('pageshow', () => Snd.resume());
