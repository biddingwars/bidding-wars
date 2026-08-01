/* ============================================================================
   platform.js — everything that differs between the browser and a real iOS app.
   Nothing in here touches the network. The game must run in airplane mode.
   ========================================================================== */

const CONFIG = {
  /* Online 1 vs 1 needs a real backend (Firebase, Supabase, PartyKit, …).
     Leave this false until one is wired up in Net.* below — shipping a mode
     that shows an error is an App Store rejection under Guideline 2.1. */
  online: false,

  /* Set once you host these. Both are required by App Store Connect. */
  privacyUrl: 'https://example.com/bidding-wars/privacy',
  supportUrl: 'https://example.com/bidding-wars/support',

  /* No ad SDK is bundled. See docs/APPSTORE.md before adding one — an ad SDK
     changes the privacy label, the age rating and the COPPA obligations. */
  ads: false
};

const Native = (() => {
  const cap = window.Capacitor;
  return {
    is: !!(cap && cap.isNativePlatform && cap.isNativePlatform()),
    plugin: n => (cap && cap.Plugins && cap.Plugins[n]) || null
  };
})();

/* ---------------------------------------------------------------------------
   Store — Capacitor Preferences on device, localStorage in a browser,
   memory as a last resort. Always resolves; never throws.
   ------------------------------------------------------------------------- */
const Store = (() => {
  const mem = new Map();
  const prefs = () => Native.plugin('Preferences');

  return {
    async get(key) {
      try {
        const p = prefs();
        if (p) { const r = await p.get({ key }); return r && r.value != null ? r.value : null; }
        const v = localStorage.getItem(key);
        return v == null ? (mem.has(key) ? mem.get(key) : null) : v;
      } catch (e) { return mem.has(key) ? mem.get(key) : null; }
    },
    async set(key, value) {
      mem.set(key, value);
      try {
        const p = prefs();
        if (p) { await p.set({ key, value }); return true; }
        localStorage.setItem(key, value);
        return true;
      } catch (e) { return false; }
    },
    async remove(key) {
      mem.delete(key);
      try {
        const p = prefs();
        if (p) { await p.remove({ key }); return true; }
        localStorage.removeItem(key);
        return true;
      } catch (e) { return false; }
    }
  };
})();

/* ---------------------------------------------------------------------------
   Net — the only place the app is allowed to talk to a server.
   Unconfigured on purpose: every call fails closed so nothing hangs.
   ------------------------------------------------------------------------- */
const Net = {
  get available() { return CONFIG.online === true; },
  async get() { return null; },
  async set() { return false; }
};

/* ---------------------------------------------------------------------------
   Haptics — real Taptic Engine on device, vibration on Android web, silent
   everywhere else. Respects the in-app sound toggle.
   ------------------------------------------------------------------------- */
const Haptics = (() => {
  const plug = () => Native.plugin('Haptics');
  const fire = (style, ms) => {
    if (window.MUTED) return;
    try {
      const h = plug();
      if (h) {
        if (style === 'success' || style === 'warning' || style === 'error') h.notification({ type: style.toUpperCase() });
        else h.impact({ style: style.toUpperCase() });
        return;
      }
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  };
  return {
    light:  () => fire('light', 10),
    medium: () => fire('medium', 20),
    heavy:  () => fire('heavy', 35),
    success:() => fire('success', [18, 40, 18]),
    warning:() => fire('warning', [30, 60, 30])
  };
})();

/* ---------------------------------------------------------------------------
   iOS housekeeping
   ------------------------------------------------------------------------- */
const Shell = {
  async ready() {
    /* keyboard must not resize the layout mid-auction */
    try {
      const kb = Native.plugin('Keyboard');
      if (kb && kb.setResizeMode) await kb.setResizeMode({ mode: 'none' });
    } catch (e) {}

    /* light content on the dark red chrome */
    try {
      const sb = Native.plugin('StatusBar');
      if (sb) { await sb.setStyle({ style: 'LIGHT' }); if (sb.setBackgroundColor) await sb.setBackgroundColor({ color: '#D6161F' }); }
    } catch (e) {}

    /* hand-off from the launch screen only once the UI has painted */
    requestAnimationFrame(() => setTimeout(async () => {
      document.body.classList.add('booted');
      try { const sp = Native.plugin('SplashScreen'); if (sp) await sp.hide(); } catch (e) {}
    }, 60));
  }
};

/* Web Audio and speech both need one real user gesture on iOS before they
   will ever produce sound. Arm them on the first touch, then get out of the way. */
(function unlockAudio() {
  const once = () => {
    try { if (typeof actx === 'function') actx(); } catch (e) {}
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0; speechSynthesis.speak(u);
      }
    } catch (e) {}
    document.removeEventListener('touchend', once);
    document.removeEventListener('click', once);
  };
  document.addEventListener('touchend', once, { passive: true });
  document.addEventListener('click', once);
})();

/* Kill the double-tap zoom and the rubber-band bounce without killing scrolling
   inside cards. Inputs keep their normal behaviour. */
(function lockGestures() {
  let last = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - last < 320) e.preventDefault();
    last = now;
  }, { passive: false });

  document.addEventListener('gesturestart', e => e.preventDefault());
})();

/* Pause the clock when the app goes to the background — an auction timer that
   keeps running while the phone is locked feels broken and loses lots. */
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    try { if (typeof clearTimer === 'function') clearTimer(); } catch (e) {}
    try { speechSynthesis.cancel(); } catch (e) {}
  }
});
