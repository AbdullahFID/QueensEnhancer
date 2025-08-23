// === Queen's Housing — Premium View (Safe Handoff Edition, patched) ===
// residence/home.js
(() => {
  if (window.__qhxInitialized) return;
  window.__qhxInitialized = true;

  // ------------------------------------------------------------
  // Page gate — only run on their homepage.
  // ------------------------------------------------------------
  const __QHX_ALLOWED_PATHS = new Set(['/', '/index.html', '/index.php']);
  const __QHX_IS_HOME =
    location.hostname === 'studentweb.housing.queensu.ca' &&
    __QHX_ALLOWED_PATHS.has((location.pathname || '/').replace(/\/+$/, '/'));
  if (!__QHX_IS_HOME) return;

  // ------------------------------------------------------------
  // Debug toggle
  // ------------------------------------------------------------
  const DEBUG = false;
  const log = (...a) => DEBUG && console.log('[QHX]', ...a);

  // ------------------------------------------------------------
  // Storage helpers
  // ------------------------------------------------------------
  const store = {
    get: (key, fallback) => new Promise((res) => {
      if (chrome?.storage?.local?.get) chrome.storage.local.get(key, v => res((v||{})[key] ?? fallback));
      else res(fallback);
    }),
    set: (obj) => new Promise((res) => {
      if (chrome?.storage?.local?.set) chrome.storage.local.set(obj, res);
      else res();
    })
  };

  const STORE_KEYS = {
    newsletter: 'qhx_meal_newsletter',
    enabled: 'qhxEnabled',
    handoffUntil: 'qhxHandoffUntil',
  };

  // ------------------------------------------------------------
  // JSONP helper (for page CSP)
  // ------------------------------------------------------------
  function jsonp(url, params = {}) {
    return new Promise((resolve, reject) => {
      const cb = `qhx_jsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const u = new URL(url, location.origin);
      Object.entries(params).forEach(([k,v]) => u.searchParams.set(k, String(v)));
      u.searchParams.set('callback', cb);

      const s = document.createElement('script');
      s.src = u.toString();
      s.onerror = () => { cleanup(); reject(new Error('JSONP failed')); };
      window[cb] = (payload) => { cleanup(); resolve(payload); };

      function cleanup(){ try{ delete window[cb]; }catch{} s.remove(); }
      document.head.appendChild(s);
    });
  }

  // ------------------------------------------------------------
  // Newsletter checkbox sync
  // ------------------------------------------------------------
  async function saveNewsletterPreference(checked) {
    try { await store.set({ [STORE_KEYS.newsletter]: !!checked }); } catch {}
    const original = document.querySelector('#mealplan_newsletter');
    if (original) original.checked = !!checked;

    if (typeof original?.onclick === 'function') {
      try { original.onclick(); return; } catch {}
    }

    try {
      await jsonp('/qusw/json/save_mealplan_newsletter.php', { choice: checked ? 1 : 0 });
    } catch {
      try {
        const url = new URL('/qusw/json/save_mealplan_newsletter.php', location.origin);
        url.searchParams.set('choice', checked ? 1 : 0);
        await fetch(url.toString(), { method: 'GET', credentials: 'include', cache: 'no-cache' });
      } catch {}
    }
  }

  async function restoreNewsletterPreference() {
    const saved = await store.get(STORE_KEYS.newsletter, null);
    if (saved === null) return;
    const ui = document.getElementById('qhx-meal-newsletter');
    if (ui) ui.checked = !!saved;
    await saveNewsletterPreference(!!saved);
  }

  // ------------------------------------------------------------
  // Globals
  // ------------------------------------------------------------
  let qhxEnabled = true;
  let refreshTimer = null;
  let handoffInProgress = false;

  // ------------------------------------------------------------
  // Icons
  // ------------------------------------------------------------
  const SVG = {
    flex: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
    home: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    meal: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    wallet: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`,
    user: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M16 2v2"/><path d="M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M8 2v2"/><circle cx="12" cy="11" r="3"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>`,
    book: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>`,
    logout: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>`,
    calendar: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M11 14h1v4"/><path d="M16 2v4"/><path d="M3 10h18"/><path d="M8 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/></svg>`,
    xcirc: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
    fileText: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
    heart: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    satellite: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="m13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5"/><path d="M16.5 7.5 19 5"/><path d="m17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5"/><path d="M9 21a6 6 0 0 0-6-6"/><path d="M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z"/></svg>`,
    badgeCheck: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/></svg>`,
    arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide"><path d="m15 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg>`,
    copy: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    share: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
    mail: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="m22 7-10 5L2 7"/></svg>`,
    mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
    plus: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
    facebook: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
    twitter: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>`,
    messageCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>`,
  };

  // ------------------------------------------------------------
  // Styles (SAFE: no global hide of page)
  // ------------------------------------------------------------
  function injectStyles() {
    if (document.getElementById('qhx-styles')) return;
    const s = document.createElement('style');
    s.id = 'qhx-styles';
    s.textContent = `
      :root{
        --queens-blue:#003087;
        --queens-blue-600:#0a4db3;
        --queens-blue-500:#1f6ae6;
        --queens-gold:#F5BD1F;
        --queens-red:#B90E31;
        --bg-1:#0b1222; --bg-2:#101a2e; --card:#111b30f2;
        --text:#f7f9ff; --muted:#a9b4c8; --ring:rgba(31,106,230,.35); --soft:#1a2b4a;
      }

      /* IMPORTANT: no global display:none rules */
      #qhx-root, #qhx-root * { box-sizing:border-box; }
      #qhx-root{
        position:fixed; inset:0; z-index:2147482000; overflow:auto;
        color:var(--text);
        background:
          radial-gradient(1400px 500px at -5% -10%, rgba(31,106,230,.25), transparent 65%),
          radial-gradient(1100px 400px at 110% 10%, rgba(245,189,31,.20), transparent 65%),
          linear-gradient(180deg, #0c1427 0%, #0a1222 50%, #0a1326 100%);
      }

      .qhx-orb{position:fixed;inset:auto;filter:blur(70px);opacity:.28;pointer-events:none;animation:float 22s ease-in-out infinite;}
      .qhx-orb--blue{width:340px;height:340px;left:-120px;top:-120px;background:radial-gradient(circle,#1f6ae6,#003087 60%,transparent);}
      .qhx-orb--gold{width:280px;height:280px;right:-80px;top:120px;background:radial-gradient(circle,#ffd55a,#f5bd1f 55%,transparent);animation-delay:8s;}
      .qhx-orb--violet{width:320px;height:320px;left:45%;bottom:-140px;background:radial-gradient(circle,#6b7cff,#3c47ff 60%,transparent);animation-delay:14s;opacity:.22;}
      @keyframes float{0%,100%{transform:translate(0,0)}25%{transform:translate(20px,-16px)}50%{transform:translate(-18px,12px)}75%{transform:translate(10px,-10px)}}

      .qhx-container{max-width:1280px;margin:0 auto;padding:28px 20px 64px;}
      .qhx-logo{position:relative;z-index:1;background:#0f1730;}.qhx-logo>img{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;opacity:1!important;visibility:visible!important;mix-blend-mode:normal!important;filter:none!important;transform:none!important;}
      /* Header / cards / grid */
      .qhx-header{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(180deg,rgba(31,106,230,.12),rgba(31,106,230,.06));border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:18px 20px;margin-bottom:18px;backdrop-filter:blur(8px)}
      .qhx-brand{display:flex;gap:14px;align-items:center}
      .qhx-logo{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;overflow:hidden;background:#0f1730;border:1px solid rgba(255,255,255,.08);box-shadow:0 6px 18px rgba(31,106,230,.28), inset 0 0 12px rgba(255,255,255,.06)}
      .qhx-logo-fallback{width:100%;height:100%;display:grid;place-items:center;color:#fff;font-weight:900;font-size:20px;background:conic-gradient(from 230deg,#1f6ae6,#3f88ff 40%,#6ba0ff 70%,#1f6ae6)}
      .qhx-title h1{font-size:20px;font-weight:700;margin:0;background:linear-gradient(180deg,#fff,#e9f0ff 70%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
      .qhx-title p{margin-top:4px;color:var(--muted);font-size:13.5px}
      .qhx-actions{display:flex;gap:10px}
      .qhx-iconbtn{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#fff;transition:transform .15s ease, background .2s ease,border-color .2s ease;cursor:pointer}
      .qhx-iconbtn:hover{transform:translateY(-1px);background:rgba(31,106,230,.18);border-color:var(--ring)}

      .qhx-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin:14px 0 22px}
      .qhx-stat{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.04));box-shadow:0 10px 24px rgba(0,0,0,.18), inset 0 0 0 9999px rgba(17,27,48,.08)}
      .qhx-stat h3{font-size:12px;color:var(--muted);font-weight:600;margin-bottom:6px;letter-spacing:.15px}
      .qhx-stat .val{font-size:18px;font-weight:700}
      .qhx-badge{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.18)}
      .bg-home{background:linear-gradient(135deg,#2d77ff,#6ba0ff)}
      .bg-meal{background:linear-gradient(135deg,#17c964,#2de58f)}
      .bg-flex{background:linear-gradient(135deg,#7a5cff,#a386ff)}
      .bg-tri{background:linear-gradient(135deg,#f5bd1f,#ffd55a)}
      .bg-wallet{background:linear-gradient(135deg,#ff7b39,#ffb25c)}

      .qhx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px}
      .qhx-card{background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px;box-shadow:0 14px 36px rgba(0,0,0,.22)}
      .qhx-card:hover{border-color:rgba(255,255,255,.12)}
      .qhx-cardhead{display:flex;align-items:center;gap:12px;margin-bottom:14px}
      .qhx-cardtitle{font-size:16px;font-weight:700}
      .qhx-cardicon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(31,106,230,.18),rgba(31,106,230,.10));border:1px solid rgba(31,106,230,.25)}
      .qhx-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px dashed rgba(255,255,255,.08)}
      .qhx-row:last-child{border-bottom:none}
      .qhx-label{font-size:13px;color:var(--muted)}
      .qhx-value{font-size:13px;font-weight:600}

      .qhx-valuewrap{display:flex;align-items:center;gap:8px}
      .qhx-mini{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#fff;opacity:.65;cursor:pointer;transition:transform .12s ease, background .2s ease,border-color .2s ease, opacity .2s ease}
      .qhx-mini:hover{opacity:1;transform:translateY(-1px);background:rgba(31,106,230,.18);border-color:var(--ring)}
      .qhx-mini.done{background:linear-gradient(135deg,rgba(23,201,100,.22),rgba(45,229,143,.22));border-color:rgba(23,201,100,.65);opacity:1}

      .qhx-pill{border-radius:12px;padding:10px 12px;background:linear-gradient(180deg,rgba(31,106,230,.12),rgba(31,106,230,.06));border:1px solid rgba(31,106,230,.25);margin-bottom:10px}
      .qhx-pill .k{font-size:11px;color:var(--muted);display:block;margin-bottom:2px}
      .qhx-pill .v{font-size:15px;font-weight:700}

      .qhx-note{background:linear-gradient(180deg,rgba(31,106,230,.08),rgba(31,106,230,.04));border:1px solid rgba(31,106,230,.20);border-radius:12px;padding:12px;margin-top:14px;font-size:13px;color:var(--text);opacity:.9}

      /* Checkbox row — fixed layout */
      .qhx-checkline{
        display:flex; align-items:center; gap:10px;
        padding:10px 12px; margin-top:10px;
        background:rgba(255,255,255,.04);
        border:1px solid rgba(255,255,255,.06); border-radius:10px;
        cursor:pointer;
      }
      .qhx-checkline input{
        width:18px; height:18px; flex:0 0 auto; appearance:none;
        border:2px solid rgba(255,255,255,.3); border-radius:4px;
        position:relative; transition:all .2s;
      }
      .qhx-checkline input:checked{
        background:linear-gradient(135deg,#1f6ae6,#3c80ff); border-color:#1f6ae6;
      }
      .qhx-checkline input:checked::after{
        content:'✓'; position:absolute; top:-2px; left:2px;
        color:#fff; font-size:12px; font-weight:bold;
      }
      .qhx-checkline span{min-width:0; line-height:1.35;}

      .qhx-map-container{height:200px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.08);margin-top:12px;position:relative;background:linear-gradient(180deg,#1a2544,#0f1730)}
      .qhx-map-container iframe { pointer-events:auto; display:block; width:100%; height:100%; }

      .qhx-funds-form{margin-top:12px}
      .qhx-fund-selector{display:flex;gap:10px;margin-bottom:14px}
      .qhx-fund-option{flex:1;padding:10px;border-radius:10px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);cursor:pointer;text-align:center;font-size:13px;transition:all .2s}
      .qhx-fund-option:hover{background:rgba(31,106,230,.10)}
      .qhx-fund-option.active{background:linear-gradient(180deg,rgba(31,106,230,.15),rgba(31,106,230,.08));border-color:var(--queens-blue-500)}
      .qhx-amount-input{width:100%;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:var(--text);font-size:14px}
      .qhx-amount-label{font-size:12px;color:var(--muted);margin-bottom:6px;display:block}
      .qhx-fund-info{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px dashed rgba(255,255,255,.08)}
      .qhx-fund-total{font-weight:700;color:#4da3ff;border-bottom:none;margin-top:8px}

      .qhx-actionsgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
      .qhx-action{display:flex;gap:10px;align-items:center;padding:12px;border-radius:14px;text-decoration:none;color:var(--text);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08)}
      .qhx-action:hover{transform:translateY(-1px);background:linear-gradient(180deg,rgba(31,106,230,.14),rgba(31,106,230,.06));border-color:var(--ring)}
      .qhx-action .aicon{
        width:44px;height:44px;border-radius:12px;display:grid;place-items:center;color:#fff;
        box-shadow:0 6px 18px rgba(0,0,0,.28), inset 0 0 0 1px rgba(255,255,255,.18);
      }
      .a-cal{background:linear-gradient(135deg,#1f6ae6,#6ba0ff)}
      .a-x{background:linear-gradient(135deg,#ff4757,#ff7b88)}
      .a-file{background:linear-gradient(135deg,#6b7cff,#9aa3ff)}
      .a-heart{background:linear-gradient(135deg,#ff5577,#ff88a1)}
      .a-alert{background:linear-gradient(135deg,#ffb020,#ffd267)}
      .a-sat{background:linear-gradient(135deg,#27d3ff,#6be7ff)}
      .a-badge{background:linear-gradient(135deg,#17c964,#35e685)}

      .qhx-resources{display:flex;flex-direction:column;gap:8px}
      .qhx-resource{display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:var(--text);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px}

      .qhx-btn{display:inline-block;width:100%;padding:12px;border:none;border-radius:12px;color:#0d1424;font-weight:800;letter-spacing:.2px;background:linear-gradient(135deg,#ffd55a,#f5bd1f);box-shadow:0 10px 24px rgba(245,189,31,.28);cursor:pointer;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px}
      .qhx-btn-primary{background:linear-gradient(135deg,#1f6ae6,#3c80ff);color:#fff;box-shadow:0 10px 24px rgba(31,106,230,.35)}

      .qhx-footer{margin-top:48px;padding:32px 20px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border-top:1px solid rgba(255,255,255,.08)}
      .qhx-footer-content{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:32px}

      /* Loader (independent overlay) */
      .qhx-loader{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(1200px 400px at 20% -10%, rgba(31,106,230,.18), transparent 60%), #0b1326;display:grid;place-items:center}
      .qhx-splash{display:flex;flex-direction:column;align-items:center;gap:14px}
      .qhx-sigil{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;color:white;background:conic-gradient(from 230deg,#1f6ae6,#3f88ff 40%,#6ba0ff 70%,#1f6ae6);box-shadow:0 10px 30px rgba(31,106,230,.45), inset 0 0 18px rgba(255,255,255,.2);font-weight:900;font-size:22px}
      .qhx-spinner{width:20px;height:20px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;animation:spin .9s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}

      /* Confirm Modal */
      .qhx-modal{position:fixed;inset:0;z-index:2147483500;background:rgba(4,8,18,.55);backdrop-filter:saturate(140%) blur(8px);display:grid;place-items:center;padding:16px}
      .qhx-modal-card{width:min(560px,96vw);border-radius:18px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.04));box-shadow:0 24px 80px rgba(0,0,0,.45);color:#f7f9ff}
      .qhx-modal-head{display:flex;gap:12px;align-items:center;padding:18px 18px 8px}
      .qhx-modal-title{font-weight:800;font-size:18px}
      .qhx-modal-body{padding:6px 18px 0;font-size:14px;color:#d8e1f8}
      .qhx-modal-kv{display:grid;grid-template-columns:auto 1fr;gap:8px 12px;margin-top:10px;padding:12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
      .qhx-modal-foot{display:flex;gap:10px;justify-content:flex-end;padding:14px 18px 18px}
      .qhx-btn-ghost,.qhx-btn-solid{min-width:120px;padding:10px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);color:#fff;font-weight:800;cursor:pointer}
      .qhx-btn-solid{background:linear-gradient(135deg,#ffd55a,#f5bd1f);color:#0d1424;border-color:transparent}
    `;
    document.head.appendChild(s);
  }

  // ------------------------------------------------------------
  // DOM utils
  // ------------------------------------------------------------
  const LOADER_MIN_MS = 1200;
  const waitForPageLoad = () =>
    new Promise((resolve) => {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });

  const qs = (sel) => document.querySelector(sel);
  const getText = (sel) => (qs(sel)?.textContent || '').trim();
  const getHref = (sel) => qs(sel)?.href || null;
  const __QHX_ESC_MAP = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' };
  const esc = (s) => String(s).replace(/[&<>"']/g, m => __QHX_ESC_MAP[m]);

  // Phone helpers
  const digitsOnly = (s) => (s || '').replace(/\D+/g, '');
  function canonicalPhone(raw) {
    const d = digitsOnly(raw);
    if (!d) return '';
    if (d.length === 11 && d.startsWith('1')) return `+${d}`;
    if (d.length === 10) return `+1${d}`;
    return `+${d}`;
  }
  function formatPhoneDisplay(raw) {
    const d = digitsOnly(raw);
    let core = d;
    if (d.length === 11 && d.startsWith('1')) core = d.slice(1);
    if (core.length === 10) return `+1 (${core.slice(0,3)}) ${core.slice(3,6)}-${core.slice(6)}`;
    return raw || '';
  }

  function extractActions() {
    const actionIds = [
      ['Move-In Time Selection', 'move-in-reservation-ius', 'calendar'],
      ['Cancel Application', 'cancel-application-ius', 'xcirc'],
      ['Non-Health Accommodation', 'non-health-accommodation-form', 'fileText'],
      ['Health Accommodation', 'health-accommodation-form', 'heart'],
      ['Allergy & Dietary Needs', 'dietary-needs', 'alert'],
      ['ResNet Support', 'resnet-problem', 'satellite'],
      ['Proof of Address', 'proof-of-address-letter', 'badgeCheck'],
    ];
    return actionIds
      .map(([label, id, icon]) => {
        const img = document.getElementById(id);
        const href = img ? img.closest('a')?.href : null;
        return href ? { label, href, icon } : null;
      })
      .filter(Boolean);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && el.textContent !== value) el.textContent = value;
  }

  function updateDynamicBits(d) {
    setText('qhx-flex-balance', d.funds.flexBalance || '$0.00');
    setText('qhx-tri-balance', d.funds.triColourBalance || '$0.00');
    setText('qhx-meal-plan', d.meal.planName || 'N/A');

    const iframe = document.getElementById('qhx-embed-map');
    const m = d.room?.mapData || {};
    if (iframe && m.lat && m.lon) {
      const src = `https://www.google.com/maps?q=${encodeURIComponent(`${m.lat},${m.lon}`)}&z=${Number(m.zoom)||17}&output=embed`;
      if (iframe.dataset.src !== src) {
        iframe.src = src;
        iframe.dataset.src = src;
      }
    }
  }

  function syncFundToNative(fundType /* 'flex' | 'tri' */) {
    const isFlex = fundType === 'flex';
    const nativeValue = isFlex ? 'Flex' : 'TriColour';

    const radio = document.querySelector(isFlex ? '#btnFlex' : '#btnTriColour');
    if (radio) {
      radio.checked = true;
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (typeof window.prep_purchase_form === 'function') {
      window.prep_purchase_form(nativeValue);
    }
  }

  function mountOrUpdateMap(slotEl, mapData, existingMap) {
    if (!slotEl || !mapData?.lat || !mapData?.lon) return;

    const src = `https://www.google.com/maps?q=${encodeURIComponent(`${mapData.lat},${mapData.lon}`)}&z=${Number(mapData.zoom)||17}&output=embed`;

    const iframe = existingMap || document.createElement('iframe');
    iframe.id = 'qhx-embed-map';
    iframe.style.cssText = 'border:0;width:100%;height:100%';
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

    if (iframe.dataset.src !== src) {
      iframe.src = src;
      iframe.dataset.src = src;
    }

    if (!iframe.isConnected && slotEl?.parentNode) {
      slotEl.replaceWith(iframe);
    }
  }

  function extractResources() {
    const ids = [
      ["Queen's Webmail", 'queens-webmail'],
      ['onQ Website', 'onq-web'],
      ['Residences Website', 'residences-web'],
      ['My QueensU', 'my-queensu-web'],
      ['Dining Website', 'dining-web'],
      ['Off-Campus Living', 'ocla-web'],
    ];
    const fromPage = ids
      .map(([label, id]) => {
        const img = document.getElementById(id);
        const href = img ? img.closest('a')?.href : null;
        return href ? { label, href } : null;
      })
      .filter(Boolean);

    if (fromPage.length) return fromPage;
    // Fallbacks if the page doesn't expose them:
    return [
      { label:"Queen's Webmail", href:'https://outlook.office.com/mail' },
      { label:'onQ Website', href:'https://onq.queensu.ca' },
      { label:'Residences Website', href:'https://residences.housing.queensu.ca' },
      { label:'My QueensU', href:'https://my.queensu.ca' },
      { label:'Dining Website', href:'https://dining.queensu.ca' },
      { label:'Off-Campus Living', href:'https://community.housing.queensu.ca' },
    ];
  }

  function extractMapData() {
    const lat = qs('#map-lat')?.value || '';
    const lon = qs('#map-lon')?.value || '';
    const zoom = qs('#map-zoom')?.value || '';
    return { lat, lon, zoom };
  }

  function extractAllData() {
    const mealNewsletterChecked = qs('#mealplan_newsletter')?.checked || false;

    return {
      profile: {
        name: getText('#profile-full-name'),
        preferredName: getText('#profile-preferred-name').replace(/preferred name:/i, '').trim(),
        studentId: getText('#profile-student-id').replace(/student id:/i, '').trim(),
        cellPhone: getText('#profile-cell-phone').replace(/cell phone:/i, '').trim(),
        email: getText('#profile-queens-email').replace(/queen'?s email:/i, '').trim(),
        sms: getText('#profile-sms-subscribed').replace(/sms subscribed:/i, '').trim(),
      },
      room: {
        address: [getText('#address1'), getText('#address2'), getText('#address3')].filter(Boolean).join(', '),
        type: getText('#room-type'),
        rate: getText('#room-rate'),
        mapData: extractMapData(),
      },
      meal: {
        planName: getText('#mealplan_name'),
        lastUsed: getText('#mealplan_last_used'),
        usedThisWeek: getText('#mealplan_used_this_week'),
        usedToDate: getText('#mealplan_used_this_year'),
        guestMeals: getText('#mealplan_used_guest_meals'),
        newsletterChecked: mealNewsletterChecked,
      },
      funds: {
        triColourBalance: getText('#tricolour_balance'),
        triColourLastTopup: getText('#tricolour_last_topup'),
        flexBalance: getText('#flex_balance'),
        flexLastTopup: getText('#flex_last_topup'),
      },
      actions: extractActions(),
      resources: extractResources(),
      editProfileUrl: getHref('#qusw-preferences'),
      logoutUrl: getHref('a[href*="/logout.php"]'),
    };
  }

  // ------------------------------------------------------------
  // Mount / loader
  // ------------------------------------------------------------
  function ensureRoot() {
    if (document.getElementById('qhx-root')) return;
    const mount = document.createElement('div');
    mount.id = 'qhx-root';
    document.body.appendChild(mount);
  }

  function showLoader() {
    if (document.getElementById('qhx-loader')) return;
    const l = document.createElement('div');
    l.className = 'qhx-loader';
    l.id = 'qhx-loader';
    l.innerHTML = `
      <div class="qhx-splash">
        <div class="qhx-sigil">Q</div>
        <div class="qhx-spinner"></div>
      </div>`;
    document.body.appendChild(l);
  }
  function hideLoader() { document.getElementById('qhx-loader')?.remove(); }

  const LOGO_SRC = (() => { try { return chrome?.runtime?.getURL?.('icons/Logo.png') || ''; } catch { return ''; }})();
  const logoMarkup = LOGO_SRC
    ? `<img src="${LOGO_SRC}" alt="Queen's Enhancer logo"
         onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'qhx-logo-fallback',textContent:'Q'}))">`
    : `<div class="qhx-logo-fallback">Q</div>`;

  // ------------------------------------------------------------
  // Clipboard / share / toast
  // ------------------------------------------------------------
  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      return true;
    } catch { return false; }
  }
  async function flashDone(btn) {
    const original = btn.innerHTML;
    btn.classList.add('done');
    btn.innerHTML = SVG.check;
    setTimeout(() => { btn.classList.remove('done'); btn.innerHTML = original; }, 1100);
  }
  function toastOnce(msg, ms=1400){
    let t = document.getElementById('qhx-toast');
    if (!t) {
      t = document.createElement('div'); t.id='qhx-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483600;padding:10px 14px;border-radius:12px;background:#0b1430cc;color:#fff;border:1px solid #ffffff22;backdrop-filter:blur(10px);box-shadow:0 10px 30px rgba(0,0,0,.35);font-weight:800;opacity:0;transition:opacity .18s;';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = '1'; clearTimeout(t._h); t._h = setTimeout(()=> t.style.opacity='0', ms);
  }

  // ------------------------------------------------------------
  // Meal checkbox handler
  // ------------------------------------------------------------
  function handleMealCheckbox(e) {
    const checkbox = e.target;
    if (checkbox.id !== 'qhx-meal-newsletter') return;
    saveNewsletterPreference(checkbox.checked);
  }

  // ------------------------------------------------------------
  // Fund selector + amount input
  // ------------------------------------------------------------
  function handleFundSelection(e) {
    const option = e.target.closest('.qhx-fund-option');
    if (!option) return;

    document.querySelectorAll('.qhx-fund-option').forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');

    const fundType = option.dataset.fundType; // 'flex' | 'tri'
    const infoEl = document.getElementById('qhx-fund-info');

    syncFundToNative(fundType);

    if (fundType === 'flex') {
      infoEl.innerHTML = `
        <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
          <strong style="color:#4da3ff">Flex $</strong> can be used at any retail food outlets. These funds are <strong>NOT FOR PRINTING</strong> and do not expire until graduation.
        </div>`;
    } else {
      infoEl.innerHTML = `
        <div style="font-size:12px; color:var(--muted); margin-bottom:10px;">
          <strong style="color:#ffd55a">Tri-Colour $</strong> can be used for printing through Library services. These funds do not expire until graduation.
        </div>`;
    }

    if (typeof window.calculate_totals === 'function') window.calculate_totals();
  }

  function calculateBonus(amount, fundType) {
    if (fundType !== 'flex') return 0;
    if (amount >= 100) return amount * 0.10;
    if (amount >= 50)  return amount * 0.05;
    return 0;
  }

  function handleAmountInput(e) {
    const input = e.target;
    if (input.id !== 'qhx-amount-input') return;

    const amount = Math.max(0, Math.min(999.99, parseFloat(input.value) || 0));
    const fundType = document.querySelector('.qhx-fund-option.active')?.dataset.fundType || 'flex';

    const bonus = calculateBonus(amount, fundType);
    const total = amount + bonus;
    document.getElementById('qhx-bonus-amount').textContent = `$${bonus.toFixed(2)}`;
    document.getElementById('qhx-total-amount').textContent = `$${total.toFixed(2)}`;

    const nativeAmt = document.getElementById('qusw-tuf-item-price');
    if (nativeAmt) nativeAmt.value = amount ? amount.toFixed(2) : '';
    if (typeof window.calculate_totals === 'function') window.calculate_totals();
  }

  function fmtMoney(n) { return `$${(Number(n) || 0).toFixed(2)}`; }

  // ------------------------------------------------------------
  // Confirm modal
  // ------------------------------------------------------------
  function uiConfirmPurchase({ amount, fundType }) {
    return new Promise((resolve) => {
      const fundLabel = fundType === 'tri' ? 'Tri-Colour $' : 'Flex $';
      const bonus = calculateBonus(amount, fundType);
      const total = amount + bonus;

      const wrap = document.createElement('div');
      wrap.className = 'qhx-modal';
      wrap.innerHTML = `
        <div class="qhx-modal-card" role="dialog" aria-modal="true" aria-labelledby="qhx-confirm-title">
          <div class="qhx-modal-head">
            <span class="aicon a-alert" aria-hidden="true">${SVG.alert}</span>
            <div id="qhx-confirm-title" class="qhx-modal-title">Confirm purchase</div>
          </div>
          <div class="qhx-modal-body">
            <p>You’re about to add funds to your <strong>${fundLabel}</strong>.</p>
            <div class="qhx-modal-kv" aria-live="polite">
              <div class="qhx-modal-k">Amount</div><div class="qhx-modal-v">${fmtMoney(amount)}</div>
              ${ bonus ? `<div class="qhx-modal-k">Bonus</div><div class="qhx-modal-v">${fmtMoney(bonus)}</div>` : '' }
              <div class="qhx-modal-k">Total credited</div><div class="qhx-modal-v">${fmtMoney(total)}</div>
            </div>
            <p style="margin-top:12px;">This will charge your Student Account and <strong>redirect to the university confirmation page</strong> once completed.</p>
            <p>Press <strong>Confirm Purchase</strong> to continue, or <strong>Cancel</strong> to go back.</p>
          </div>
          <div class="qhx-modal-foot">
            <button type="button" class="qhx-btn-ghost" id="qhx-cancel">Cancel</button>
            <button type="button" class="qhx-btn-solid" id="qhx-ok">Confirm Purchase</button>
          </div>
        </div>
      `;

      document.body.appendChild(wrap);

      const btnCancel = wrap.querySelector('#qhx-cancel');
      const btnOk = wrap.querySelector('#qhx-ok');
      btnOk.focus();

      const close = (ok) => { try { wrap.remove(); } catch {} resolve(!!ok); };

      btnCancel.addEventListener('click', () => close(false));
      btnOk.addEventListener('click', () => close(true));
      wrap.addEventListener('click', (e) => { if (e.target === wrap) close(false); });
      wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(false); });
    });
  }

  // ------------------------------------------------------------
  // Handoff (critical): remove overlay/styles/modals, then trigger native
  // ------------------------------------------------------------
  async function beginHandoff() {
    handoffInProgress = true;
    const until = Date.now() + 5 * 60 * 1000; // 5 minutes
    await store.set({ [STORE_KEYS.handoffUntil]: until, [STORE_KEYS.enabled]: false });
    await disablePremium(); // full teardown (styles, root, modals, loader, timers, toasts)
  }

  // Absolute kill switch (Esc Esc quickly)
  let __lastEsc = 0;
  function hardKillPremium() {
    try { document.getElementById('qhx-root')?.remove(); } catch {}
    try { document.getElementById('qhx-styles')?.remove(); } catch {}
    try { document.getElementById('qhx-loader')?.remove(); } catch {}
    try { document.querySelectorAll('.qhx-modal').forEach(n => n.remove()); } catch {}
    try { document.getElementById('qhx-toast')?.remove(); } catch {}
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    qhxEnabled = false;
    store.set({ [STORE_KEYS.enabled]: false });
    toastOnce('Premium view disabled');
  }

  // ------------------------------------------------------------
  // Purchase flow
  // ------------------------------------------------------------
  async function handlePurchase() {
    const amount = parseFloat(document.getElementById('qhx-amount-input')?.value) || 0;
    const fundType = document.querySelector('.qhx-fund-option.active')?.dataset.fundType || 'flex';

    if (amount < 1)      return alert('Please enter an amount of at least $1.00');
    if (amount > 999.99) return alert('Maximum amount is $999.99');

    const ok = await uiConfirmPurchase({ amount, fundType });
    if (!ok) return;

    toastOnce('Processing purchase…');

    const btn = document.getElementById('qhx-purchase-btn');
    if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }

    // Sync to native UI
    syncFundToNative(fundType);
    const nativeAmt = document.getElementById('qusw-tuf-item-price');
    if (nativeAmt) nativeAmt.value = amount.toFixed(2);
    if (typeof window.calculate_totals === 'function') window.calculate_totals();

    // *** HARD HANDOFF ***
    await beginHandoff();

    // Prefer the real native button (includes their validation/side effects)
    const nativeBtn = document.querySelector('#qusw-btnStudentAccount');

    if (nativeBtn) {
      log('click native student account button');
      nativeBtn.click();
    } else if (typeof window.checkout === 'function') {
      log('invoke window.checkout("student")');
      window.checkout('student');
    } else {
      const form = document.getElementById('purchase_funds_form');
      if (form) {
        document.getElementById('qusw-tuf-promo-code')?.removeAttribute('disabled');
        form.setAttribute('action', '/public/checkout/student_account.php');
        form.submit();
      } else {
        alert('Could not find the native checkout form on this page.');
        if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); }
        return;
      }
    }

    // Failsafe: if nothing navigates/changes page, re-enable button
    let navigated = false;
    const onPageHide = () => { navigated = true; };
    window.addEventListener('pagehide', onPageHide, { once: true });
    setTimeout(() => {
      window.removeEventListener('pagehide', onPageHide);
      if (!navigated && btn && document.body) {
        btn.disabled = false; btn.removeAttribute('aria-busy');
        toastOnce('Checkout didn’t open. Please try again.');
      }
    }, 5000);
  }

  // ------------------------------------------------------------
  // Inline actions (copy/share)
  // ------------------------------------------------------------
  async function handleInlineAction(e) {
    const btn = e.target.closest('[data-qhx-action]');
    if (!btn) return;
    const action = btn.dataset.qhxAction;
    const value = btn.dataset.qhxValue || '';
    if (action === 'copy') {
      const ok = await copyText(value);
      if (ok) flashDone(btn);
    } else if (action === 'share-email') {
      const email = value.trim();
      const mailto = `mailto:${encodeURI(email)}`;
      let shared = false;
      if (navigator.share) {
        try { await navigator.share({ title: "Queen's email", text: email }); shared = true; } catch {}
      }
      if (!shared) {
        const a = document.createElement('a');
        a.href = mailto; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
      }
    }
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  function render(data) {
    const root = document.getElementById('qhx-root');
    if (!root) return;

    const existingMap = root.querySelector('#qhx-embed-map') || null;
    const phoneDisplay = formatPhoneDisplay(data.profile.cellPhone);
    const phoneCanonical = canonicalPhone(data.profile.cellPhone);
    const studentId = data.profile.studentId;
    const email = data.profile.email;

    root.innerHTML = `
      <div class="qhx-orb qhx-orb--blue"></div>
      <div class="qhx-orb qhx-orb--gold"></div>
      <div class="qhx-orb qhx-orb--violet"></div>

      <div class="qhx-container">
        <header class="qhx-header">
          <div class="qhx-brand">
            <div class="qhx-logo">${logoMarkup}</div>
            <div class="qhx-title">
              <h1>Welcome back, ${esc(data.profile.preferredName || data.profile.name || 'Student')}</h1>
              <p>Queen's University Housing Portal — Premium View</p>
            </div>
          </div>
          <div class="qhx-actions">
            ${data.logoutUrl ? `<a class="qhx-iconbtn" href="${data.logoutUrl}" title="Logout" aria-label="Logout">${SVG.logout}</a>` : ''}
          </div>
        </header>

        <section class="qhx-stats">
          <div class="qhx-stat"><div><h3>Room</h3><div class="val">${esc(data.room.type || 'Not Assigned')}</div></div><div class="qhx-badge bg-home">${SVG.home}</div></div>
          <div class="qhx-stat"><div><h3>Meal Plan</h3><div class="val" id="qhx-meal-plan">${esc(data.meal.planName || 'N/A')}</div></div><div class="qhx-badge bg-meal">${SVG.meal}</div></div>
          <div class="qhx-stat"><div><h3>Flex $</h3><div class="val" id="qhx-flex-balance">${esc(data.funds.flexBalance || '$0.00')}</div></div><div class="qhx-badge bg-flex">${SVG.flex}</div></div>
          <div class="qhx-stat"><div><h3>Tri-Colour</h3><div class="val" id="qhx-tri-balance">${esc(data.funds.triColourBalance || '$0.00')}</div></div><div class="qhx-badge bg-tri">${SVG.wallet}</div></div>
        </section>

        <section class="qhx-grid">
          <article class="qhx-card">
            <div class="qhx-cardhead"><div class="qhx-cardicon">${SVG.user}</div><div class="qhx-cardtitle">Student Profile</div></div>
            <div class="qhx-content">
              ${data.profile.name ? `<div class="qhx-row"><span class="qhx-label">Full Name</span><span class="qhx-value">${esc(data.profile.name)}</span></div>` : ''}
              ${data.profile.preferredName ? `<div class="qhx-row"><span class="qhx-label">Preferred Name</span><span class="qhx-value">${esc(data.profile.preferredName)}</span></div>` : ''}

              ${studentId ? `
                <div class="qhx-row">
                  <span class="qhx-label">Student ID</span>
                  <span class="qhx-valuewrap">
                    <span class="qhx-value">${esc(studentId)}</span>
                    <button type="button" class="qhx-mini" title="Copy Student ID" aria-label="Copy Student ID" data-qhx-action="copy" data-qhx-value="${esc(studentId)}">${SVG.copy}</button>
                  </span>
                </div>` : ''}

              ${email ? `
                <div class="qhx-row">
                  <span class="qhx-label">Email</span>
                  <span class="qhx-valuewrap">
                    <span class="qhx-value">${esc(email)}</span>
                    <button type="button" class="qhx-mini" title="Copy Email" aria-label="Copy Email" data-qhx-action="copy" data-qhx-value="${esc(email)}">${SVG.copy}</button>
                    <button type="button" class="qhx-mini" title="Share Email" aria-label="Share Email" data-qhx-action="share-email" data-qhx-value="${esc(email)}">${SVG.share}</button>
                  </span>
                </div>` : ''}

              ${data.profile.cellPhone ? `
                <div class="qhx-row">
                  <span class="qhx-label">Phone</span>
                  <span class="qhx-valuewrap">
                    <span class="qhx-value">${esc(phoneDisplay)}</span>
                    <button type="button" class="qhx-mini" title="Copy Phone" aria-label="Copy Phone" data-qhx-action="copy" data-qhx-value="${esc(phoneCanonical)}">${SVG.copy}</button>
                  </span>
                </div>` : ''}

              ${data.editProfileUrl ? `<a class="qhx-btn qhx-btn--settings" href="${data.editProfileUrl}">${SVG.badgeCheck}<span>Edit Profile</span></a>` : ''}
            </div>
          </article>

          <article class="qhx-card">
            <div class="qhx-cardhead"><div class="qhx-cardicon">${SVG.home}</div><div class="qhx-cardtitle">Room Assignment</div></div>
            <div class="qhx-content">
              ${data.room.address ? `<div class="qhx-pill"><span class="k">Address</span><span class="v">${esc(data.room.address)}</span></div>` : `<div class="qhx-pill"><span class="v" style="opacity:.7">No room assigned yet</span></div>`}
              ${data.room.type ? `<div class="qhx-row"><span class="qhx-label">Room Type</span><span class="qhx-value">${esc(data.room.type)}</span></div>` : ''}
              ${data.room.rate ? `<div class="qhx-row"><span class="qhx-label">Rate</span><span class="qhx-value">${esc(data.room.rate)}</span></div>` : ''}

              ${data.room.mapData.lat && data.room.mapData.lon ? `
                <div class="qhx-map-container">
                  <div id="qhx-map-slot" class="qhx-map-placeholder">Loading map…</div>
                </div>` : ''}
            </div>
          </article>

          <article class="qhx-card">
            <div class="qhx-cardhead"><div class="qhx-cardicon">${SVG.calendar}</div><div class="qhx-cardtitle">Quick Actions</div></div>
            <div class="qhx-actionsgrid">
              ${data.actions.map(a => {
                const cls = ({ calendar:'a-cal', xcirc:'a-x', fileText:'a-file', heart:'a-heart', alert:'a-alert', satellite:'a-sat', badgeCheck:'a-badge' })[a.icon] || 'a-cal';
                const icon = SVG[a.icon] || SVG.calendar;
                return `
                  <a class="qhx-action" href="${esc(a.href)}">
                    <div class="aicon ${cls}">${icon}</div>
                    <div class="alabel">${esc(a.label)}</div>
                  </a>`;
              }).join('')}
            </div>
          </article>

          <article class="qhx-card">
            <div class="qhx-cardhead"><div class="qhx-cardicon">${SVG.meal}</div><div class="qhx-cardtitle">Meal Plan Information</div></div>
            <div class="qhx-content">
              ${data.meal.planName ? `<div class="qhx-pill"><span class="k">Current Plan</span><span class="v" id="qhx-meal-plan">${esc(data.meal.planName)}</span></div>` : `<div class="qhx-pill"><span class="v" style="opacity:.7">No meal plan selected</span></div>`}
              ${data.meal.usedThisWeek ? `<div class="qhx-row"><span class="qhx-label">Used This Week</span><span class="qhx-value">${esc(data.meal.usedThisWeek)}</span></div>` : ''}
              ${data.meal.usedToDate ? `<div class="qhx-row"><span class="qhx-label">Total Used</span><span class="qhx-value">${esc(data.meal.usedToDate)}</span></div>` : ''}
              ${data.meal.guestMeals ? `<div class="qhx-row"><span class="qhx-label">Guest Meals</span><span class="qhx-value">${esc(data.meal.guestMeals)}</span></div>` : ''}
              ${data.meal.lastUsed ? `<div class="qhx-row"><span class="qhx-label">Last Used</span><span class="qhx-value">${esc(data.meal.lastUsed)}</span></div>` : ''}

              <label class="qhx-checkline">
                <input type="checkbox" id="qhx-meal-newsletter" ${data.meal.newsletterChecked ? 'checked' : ''}>
                <span>Check to receive email updates about your meal plan</span>
              </label>

              <div class="qhx-note"><strong>NOTE:</strong> TAMs are not additional weekly meals. Each TAM swipe counts as one of your weekly 19 dining hall swipes.</div>
            </div>
          </article>

          <article class="qhx-card">
            <div class="qhx-cardhead"><div class="qhx-cardicon">${SVG.wallet}</div><div class="qhx-cardtitle">Available Funds</div></div>
            <div class="qhx-content">
              <div class="qhx-pill"><span class="k">Flex Dollars</span><span class="v" id="qhx-flex-balance-2">${esc(data.funds.flexBalance || '$0.00')}</span></div>
              ${data.funds.flexLastTopup && data.funds.flexLastTopup !== 'N/A' ? `<div class="qhx-row"><span class="qhx-label">Flex Last Top-up</span><span class="qhx-value">${esc(data.funds.flexLastTopup)}</span></div>` : ''}
              <div class="qhx-pill"><span class="k">Tri-Colour Balance</span><span class="v">${esc(data.funds.triColourBalance || '$0.00')}</span></div>
              ${data.funds.triColourLastTopup && data.funds.triColourLastTopup !== 'N/A' ? `<div class="qhx-row"><span class="qhx-label">Tri-Colour Last Top-up</span><span class="qhx-value">${esc(data.funds.triColourLastTopup)}</span></div>` : ''}

              <div class="qhx-funds-form">
                <div class="qhx-fund-selector">
                  <div class="qhx-fund-option active" data-fund-type="flex">Flex $</div>
                  <div class="qhx-fund-option" data-fund-type="tri">Tri-Colour $</div>
                </div>

                <div id="qhx-fund-info" style="margin-bottom:10px;">
                  <div style="font-size:12px; color:var(--muted);">
                    <strong style="color:#4da3ff">Flex $</strong> can be used at any retail food outlets. These funds are <strong>NOT FOR PRINTING</strong> and do not expire until graduation.
                  </div>
                </div>

                <label class="qhx-amount-label">Add Amount (Max $999.99)</label>
                <input type="number" inputmode="decimal" class="qhx-amount-input" id="qhx-amount-input" placeholder="0.00" min="1" max="999.99" step="0.01">

                <div style="margin-top:10px;">
                  <div class="qhx-fund-info"><span>Bonus Amount:</span><span id="qhx-bonus-amount">$0.00</span></div>
                  <div class="qhx-fund-info qhx-fund-total"><span>Total Funds:</span><span id="qhx-total-amount">$0.00</span></div>
                </div>

                <button id="qhx-purchase-btn" class="qhx-btn qhx-btn-primary">
                  ${SVG.plus}<span>Purchase on Student Account</span>
                </button>

                <div style="margin-top:10px; text-align:center;">
                  <small style="color:#ff7b88">Alternative: Visit <a href="https://queens-university-dining.myshopify.com/collections/flex-dollars" target="_blank" style="color:#4da3ff;text-decoration:underline">Campus Market</a> to purchase with credit card</small>
                </div>
              </div>
            </div>
          </article>

          <!-- Helpful Resources (restored) -->
          <article class="qhx-card">
            <div class="qhx-cardhead"><div class="qhx-cardicon">${SVG.book}</div><div class="qhx-cardtitle">Helpful Resources</div></div>
            <div class="qhx-resources">
              ${data.resources.map(r => `
                <a class="qhx-resource" href="${esc(r.href)}" target="_blank" rel="noopener">
                  <span class="qhx-reslabel">${esc(r.label)}</span>
                  <span class="qhx-resarrow">${SVG.arrowRight}</span>
                </a>
              `).join('')}
            </div>
          </article>
        </section>
      </div>

      <footer class="qhx-footer">
        <div class="qhx-footer-content">
          <div>
            <img src="/public/images/queens_logo_white_164.png" alt="Queen's University" class="qhx-footer-logo" style="opacity:.8;width:140px;height:auto;">
            <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:8px">
              Copyright © Queen's University<br>
              Supported browsers include IE9+ and current Firefox, Chrome, Safari and Opera
            </div>
          </div>
          <div style="text-align:right">
            <h3 style="font-size:18px;font-weight:700;margin:0 0 12px;background:linear-gradient(180deg,#fff,#e9f0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">Residence Admissions</h3>
            <div style="font-size:13px;color:var(--text);line-height:1.7;opacity:.9">
              Victoria Hall, Queen's University<br>
              75 Bader Lane<br>
              Kingston, Ontario, Canada K7L 3N8<br>
              Phone: (613) 533-2550<br>
              Email: <a href="mailto:reshouse@queensu.ca" style="color:#4da3ff">reshouse@queensu.ca</a>
            </div>
          </div>
        </div>
      </footer>
    `;

    const mapSlot = root.querySelector('#qhx-map-slot');
    mountOrUpdateMap(mapSlot, data.room.mapData, existingMap);

    // Bind once
    if (!root.__qhxEventsBound) {
      root.addEventListener('click', handleInlineAction, { passive: true });
      root.addEventListener('change', handleMealCheckbox, { passive: true });
      root.addEventListener('click', handleFundSelection, { passive: true });
      root.addEventListener('input', handleAmountInput, { passive: true });
      root.addEventListener('click', (e) => { if (e.target.closest('#qhx-purchase-btn')) handlePurchase(); });

      // Prevent Enter from accidental submit + Esc Esc kill
      root.addEventListener('keydown', (e) => {
        if (e.target?.id === 'qhx-amount-input' && e.key === 'Enter') {
          e.preventDefault();
          e.target.blur();
        }
        if (e.key === 'Escape') {
          const t = Date.now();
          if (t - __lastEsc < 500) hardKillPremium();
          __lastEsc = t;
        }
      }, { passive: false });

      root.__qhxEventsBound = true;
    }
  }

  // ------------------------------------------------------------
  // Availability guards
  // ------------------------------------------------------------
  function applyAvailabilityGuards() {
    const triNativeMissing = !document.querySelector('#btnTriColour');
    if (triNativeMissing) {
      const triOpt = document.querySelector('.qhx-fund-option[data-fund-type="tri"]');
      if (triOpt) {
        triOpt.setAttribute('aria-disabled', 'true');
        triOpt.style.opacity = '0.5';
        triOpt.style.pointerEvents = 'none';
        const flexOpt = document.querySelector('.qhx-fund-option[data-fund-type="flex"]');
        if (triOpt.classList.contains('active') && flexOpt) {
          triOpt.classList.remove('active');
          flexOpt.classList.add('active');
          syncFundToNative('flex');
        }
      }
    }

    const isStaff = (window.customer_type === 'staff') || !document.querySelector('#qusw-btnStudentAccount');
    const purchaseBtn = document.getElementById('qhx-purchase-btn');
    if (isStaff && purchaseBtn) {
      purchaseBtn.disabled = true;
      purchaseBtn.textContent = 'Student Account Purchase Unavailable';
    }
  }

  // ------------------------------------------------------------
  // LiveChat helpers (kept but not shown on this host)
  // ------------------------------------------------------------
  const LIVECHAT_POPUP_URL =
    'https://secure.livechatinc.com/customer/action/open_chat?license_id=11961210&group=1';

  function canEmbedLiveChat() { return !/^studentweb\.housing\.queensu\.ca$/i.test(location.hostname); }

  function ensureLiveChatWidget() {
    if (!canEmbedLiveChat()) return;
    if (window.LiveChatWidget) return;
    window.__lc = window.__lc || {};
    window.__lc.license = 11961210;
    window.__lc.group = 1;
    window.__lc.params = [{ name: 'qhx_view', value: 'premium' }];
    if (!document.getElementById('lc-tracking-script')) {
      const s = document.createElement('script');
      s.id = 'lc-tracking-script';
      s.async = true;
      s.src = 'https://cdn.livechatinc.com/tracking.js';
      document.head.appendChild(s);
    }
  }

  function syncInitialSelection() {
    const isTri = document.querySelector('#btnTriColour')?.checked;
    const want = isTri ? 'tri' : 'flex';
    document.querySelectorAll('.qhx-fund-option').forEach(el => el.classList.remove('active'));
    document.querySelector(`.qhx-fund-option[data-fund-type="${want}"]`)?.classList.add('active');
    syncFundToNative(want);
  }

  // ------------------------------------------------------------
  // Enable / disable
  // ------------------------------------------------------------
  function cleanupTimersAndUI() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  async function enablePremium({ firstBoot = false } = {}) {
    qhxEnabled = true;
    await store.set({ [STORE_KEYS.enabled]: true });
    const start = performance.now();

    showLoader();
    await waitForPageLoad();
    injectStyles();
    ensureRoot();
    if (canEmbedLiveChat()) ensureLiveChatWidget();
    await new Promise((r) => setTimeout(r, 150));

    render(extractAllData());
    applyAvailabilityGuards();
    syncInitialSelection();
    await restoreNewsletterPreference();

    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => updateDynamicBits(extractAllData()), 15000);

    const elapsed = performance.now() - start;
    const minHold = firstBoot ? LOADER_MIN_MS : 300;
    setTimeout(hideLoader, Math.max(0, minHold - elapsed));

    log('Premium enabled');
  }

  async function disablePremium() {
    qhxEnabled = false;
    await store.set({ [STORE_KEYS.enabled]: false });
    cleanupTimersAndUI();

    try { document.querySelectorAll('.qhx-modal').forEach(n => n.remove()); } catch {}
    try { document.getElementById('qhx-toast')?.remove(); } catch {}
    try { document.getElementById('qhx-root')?.remove(); } catch {}
    try { document.getElementById('qhx-styles')?.remove(); } catch {}
    try { document.getElementById('qhx-loader')?.remove(); } catch {}

    document.documentElement.style.overflow = '';
    document.body.style.pointerEvents = '';
    log('Premium disabled');
  }

  async function togglePremium() {
    if (qhxEnabled) await disablePremium();
    else await enablePremium();
  }

  // Hotkey: Ctrl/⌘ + Shift + Q
  function handleHotkey(e) {
    const isQ = (e.key || '').toLowerCase() === 'q';
    if (isQ && e.shiftKey && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      togglePremium();
    }
  }

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  async function init() {
    const now = Date.now();
    const savedEnabled = await store.get(STORE_KEYS.enabled, true);
    const handoffUntil = await store.get(STORE_KEYS.handoffUntil, 0);
    const allowedToShow = savedEnabled && now > handoffUntil;

    qhxEnabled = !!allowedToShow;

    document.addEventListener('keydown', handleHotkey, { passive: false });
    window.addEventListener('pageshow', () => {
      // Never auto-mount during a handoff window
      if (!handoffInProgress && qhxEnabled && !document.getElementById('qhx-root')) enablePremium();
    });

    if (qhxEnabled) await enablePremium({ firstBoot: true });
    else await disablePremium();
  }

  init();
})();
