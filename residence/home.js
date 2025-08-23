// === Queen's Housing — Premium View (Complete Version with All Features) ===
// residence/home.js
(() => {
  if (window.__qhxInitialized) return;
  window.__qhxInitialized = true;

  // Only run on the real homepage
  const __QHX_ALLOWED_PATHS = new Set(['/', '/index.html', '/index.php']);
  const __QHX_IS_HOME =
    location.hostname === 'studentweb.housing.queensu.ca' &&
    __QHX_ALLOWED_PATHS.has((location.pathname || '/').replace(/\/+$/, '/'));
  if (!__QHX_IS_HOME) return;

  // storage helpers
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

  const STORE_KEYS = { newsletter: 'qhx_meal_newsletter' };

// simple JSONP helper for their endpoint (works with the page CSP)
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

async function saveNewsletterPreference(checked) {
  // 1) persist locally
  try { await store.set({ [STORE_KEYS.newsletter]: !!checked }); } catch {}

  // 2) mirror into the native checkbox
  const original = document.querySelector('#mealplan_newsletter');
  if (original) original.checked = !!checked;

  // 3) trigger the portal save
  if (typeof original?.onclick === 'function') {
    try { original.onclick(); return; } catch {}
  }

  // JSONP first (matches their typical pattern), then fetch fallback
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
  if (saved === null) return; // nothing saved yet
  // Set our UI + native, and push to server to keep them aligned
  const ui = document.getElementById('qhx-meal-newsletter');
  if (ui) ui.checked = !!saved;
  await saveNewsletterPreference(!!saved);
}


  let qhxEnabled = true;
  let refreshTimer = null;

  // -------------------------------
  //  Inline SVG icons (expanded set)
  // -------------------------------
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

  // --------------------------------
  //  Styles (enhanced with new components)
  // --------------------------------
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
        --bg-1:#0b1222;
        --bg-2:#101a2e;
        --card:#111b30f2;
        --text:#f7f9ff;
        --muted:#a9b4c8;
        --ring:rgba(31,106,230,.35);
        --soft:#1a2b4a;
      }
      body.qhx-overlay-active > *:not(#qhx-root):not(#qhx-loader):not(#chat-widget-container):not(style):not(link):not(script){display:none!important;}      
      #qhx-root, #qhx-root * { box-sizing:border-box; }
      #chat-widget-container { opacity:1 !important; visibility:visible !important; pointer-events:auto !important; }
      #qhx-root{
        min-height:100vh;color:var(--text);
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

      /* Header */
      .qhx-header{display:flex;align-items:center;justify-content:space-between;background:linear-gradient(180deg,rgba(31,106,230,.12),rgba(31,106,230,.06));border:1px solid rgba(255,255,255,.06);border-radius:20px;padding:18px 20px;margin-bottom:18px;backdrop-filter:blur(8px)}
      .qhx-brand{display:flex;gap:14px;align-items:center}
      .qhx-logo{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;overflow:hidden;background:#0f1730;border:1px solid rgba(255,255,255,.08);box-shadow:0 6px 18px rgba(31,106,230,.28), inset 0 0 12px rgba(255,255,255,.06)}
      .qhx-logo img{width:100%;height:100%;object-fit:cover;display:block}
      .qhx-title{line-height:1.1}
      .qhx-title h1{font-size:20px;font-weight:700;margin:0;background:linear-gradient(180deg,#fff,#e9f0ff 70%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
      .qhx-title p{margin-top:4px;color:var(--muted);font-size:13.5px}

      .qhx-actions{display:flex;gap:10px}
      .qhx-iconbtn{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#fff;transition:transform .15s ease, background .2s ease,border-color .2s ease;cursor:pointer}
      .qhx-iconbtn:hover{transform:translateY(-1px);background:rgba(31,106,230,.18);border-color:var(--ring)}
      .qhx-iconbtn svg{width:20px;height:20px}

      /* Stat row */
      .qhx-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin:14px 0 22px}
      .qhx-stat{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.07);background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.04));box-shadow:0 10px 24px rgba(0,0,0,.18), inset 0 0 0 9999px rgba(17,27,48,.08)}
      .qhx-stat h3{font-size:12px;color:var(--muted);font-weight:600;margin-bottom:6px;letter-spacing:.15px}
      .qhx-stat .val{font-size:18px;font-weight:700}
      .qhx-badge{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;color:#fff;box-shadow:0 8px 20px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.18)}
      .qhx-badge svg{width:22px;height:22px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.25))}
      .bg-home{background:linear-gradient(135deg,#2d77ff,#6ba0ff)}
      .bg-meal{background:linear-gradient(135deg,#17c964,#2de58f)}
      .bg-flex{background:linear-gradient(135deg,#7a5cff,#a386ff)}
      .bg-tri{background:linear-gradient(135deg,#f5bd1f,#ffd55a)}
      .bg-wallet{background:linear-gradient(135deg,#ff7b39,#ffb25c)}

      /* Grid */
      .qhx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:16px}
      .qhx-card{background:linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.04));border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:18px;box-shadow:0 14px 36px rgba(0,0,0,.22)}
      .qhx-card:hover{border-color:rgba(255,255,255,.12)}
      .qhx-cardhead{display:flex;align-items:center;gap:12px;margin-bottom:14px}
      .qhx-cardtitle{font-size:16px;font-weight:700}
      .qhx-cardicon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,rgba(31,106,230,.18),rgba(31,106,230,.10));border:1px solid rgba(31,106,230,.25)}
      .qhx-cardicon svg{width:20px;height:20px}

      .qhx-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px dashed rgba(255,255,255,.08)}
      .qhx-row:last-child{border-bottom:none}
      .qhx-label{font-size:13px;color:var(--muted)}
      .qhx-value{font-size:13px;font-weight:600}

      /* value + mini actions */
      .qhx-valuewrap{display:flex;align-items:center;gap:8px}
      .qhx-mini{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#fff;opacity:.65;cursor:pointer;transition:transform .12s ease, background .2s ease,border-color .2s ease, opacity .2s ease}
      .qhx-mini:hover{opacity:1;transform:translateY(-1px);background:rgba(31,106,230,.18);border-color:var(--ring)}
      .qhx-mini svg{width:14px;height:14px}
      .qhx-mini.done{background:linear-gradient(135deg,rgba(23,201,100,.22),rgba(45,229,143,.22));border-color:rgba(23,201,100,.65);opacity:1}

      .qhx-pill{border-radius:12px;padding:10px 12px;background:linear-gradient(180deg,rgba(31,106,230,.12),rgba(31,106,230,.06));border:1px solid rgba(31,106,230,.25);margin-bottom:10px}
      .qhx-pill .k{font-size:11px;color:var(--muted);display:block;margin-bottom:2px}
      .qhx-pill .v{font-size:15px;font-weight:700}

      /* Note box */
      .qhx-note{background:linear-gradient(180deg,rgba(31,106,230,.08),rgba(31,106,230,.04));border:1px solid rgba(31,106,230,.20);border-radius:12px;padding:12px;margin-top:14px;font-size:13px;color:var(--text);opacity:.9}
      .qhx-note strong{color:#4da3ff}

      /* Checkbox row */
      .qhx-checkbox-row{display:flex;align-items:center;gap:8px;padding:10px 12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:10px;margin-top:10px;cursor:pointer;transition:background .2s}
      .qhx-checkbox-row:hover{background:rgba(31,106,230,.10)}
      .qhx-checkbox{width:18px;height:18px;appearance:none;border:2px solid rgba(255,255,255,.3);border-radius:4px;cursor:pointer;transition:all .2s;position:relative}
      .qhx-checkbox:checked{background:linear-gradient(135deg,#1f6ae6,#3c80ff);border-color:#1f6ae6}
      .qhx-checkbox:checked::after{content:'✓';position:absolute;top:-2px;left:2px;color:#fff;font-size:12px;font-weight:bold}
      .qhx-checkbox-label{font-size:13px;flex:1;user-select:none}

      /* Map container */
      .qhx-map-container{height:200px;border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.08);margin-top:12px;position:relative;background:linear-gradient(180deg,#1a2544,#0f1730)}
      .qhx-map-placeholder{display:grid;place-items:center;height:100%;color:var(--muted)}

      /* Add funds form */
      .qhx-funds-form{margin-top:12px}
      .qhx-fund-selector{display:flex;gap:10px;margin-bottom:14px}
      .qhx-fund-option{flex:1;padding:10px;border-radius:10px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);cursor:pointer;text-align:center;font-size:13px;transition:all .2s}
      .qhx-fund-option:hover{background:rgba(31,106,230,.10)}
      .qhx-fund-option.active{background:linear-gradient(180deg,rgba(31,106,230,.15),rgba(31,106,230,.08));border-color:var(--queens-blue-500)}
      .qhx-amount-input{width:100%;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:var(--text);font-size:14px;transition:border-color .2s}
      .qhx-amount-input:focus{outline:none;border-color:var(--queens-blue-500)}
      .qhx-amount-label{font-size:12px;color:var(--muted);margin-bottom:6px;display:block}
      .qhx-fund-info{display:flex;justify-content:space-between;padding:8px 0;font-size:13px;border-bottom:1px dashed rgba(255,255,255,.08)}
      .qhx-fund-total{font-weight:700;color:#4da3ff;border-bottom:none;margin-top:8px}

      .qhx-actionsgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
      .qhx-action{display:flex;gap:10px;align-items:center;padding:12px;border-radius:14px;text-decoration:none;color:var(--text);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));border:1px solid rgba(255,255,255,.08);transition:transform .12s ease, background .2s}
      .qhx-action:hover{transform:translateY(-1px);background:linear-gradient(180deg,rgba(31,106,230,.14),rgba(31,106,230,.06));border-color:var(--ring)}
      .qhx-action .aicon{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff}
      .a-cal{background:linear-gradient(135deg,#1f6ae6,#6ba0ff)}
      .a-x{background:linear-gradient(135deg,#ff4757,#ff7b88)}
      .a-file{background:linear-gradient(135deg,#6b7cff,#9aa3ff)}
      .a-heart{background:linear-gradient(135deg,#ff5577,#ff88a1)}
      .a-alert{background:linear-gradient(135deg,#ffb020,#ffd267)}
      .a-sat{background:linear-gradient(135deg,#27d3ff,#6be7ff)}
      .a-badge{background:linear-gradient(135deg,#17c964,#35e685)}
      .qhx-action .alabel{font-weight:650;font-size:13px}
      .qhx-map-container iframe { pointer-events:auto; display:block; width:100%; height:100%; }
      .qhx-map-container { touch-action: pan-x pan-y; }


      .qhx-resources{display:flex;flex-direction:column;gap:8px}
      .qhx-resource{display:flex;align-items:center;justify-content:space-between;text-decoration:none;color:var(--text);background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px 12px;transition:transform .12s ease, background .2s}
      .qhx-resource:hover{transform:translateX(4px);background:rgba(31,106,230,.16);border-color:var(--ring)}
      .qhx-reslabel{font-weight:620;font-size:13.5px}
      .qhx-resarrow{color:#e8f0ff}

      .qhx-btn{display:inline-block;width:100%;padding:12px;border:none;border-radius:12px;color:#0d1424;font-weight:800;letter-spacing:.2px;background:linear-gradient(135deg,#ffd55a,#f5bd1f);box-shadow:0 10px 24px rgba(245,189,31,.28);cursor:pointer;margin-top:10px}
      .qhx-btn:hover{filter:brightness(1.03)}
      .qhx-btn{display:flex;align-items:center;justify-content:center;gap:8px}
      .qhx-btn svg{width:16px;height:16px}
      .qhx-btn-primary{background:linear-gradient(135deg,#1f6ae6,#3c80ff);color:#fff;box-shadow:0 10px 24px rgba(31,106,230,.35)}

      /* Footer */
      .qhx-footer{margin-top:48px;padding:32px 20px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02));border-top:1px solid rgba(255,255,255,.08)}
      .qhx-footer-content{max-width:1280px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:32px}
      .qhx-footer-left{display:flex;flex-direction:column;gap:16px}
      .qhx-footer-brand{display:flex;align-items:center;gap:12px}
      .qhx-footer-logo{width:140px;height:auto;opacity:.8}
      .qhx-footer-copyright{font-size:12px;color:var(--muted);line-height:1.5}
      .qhx-footer-right{text-align:right}
      .qhx-footer-title{font-size:18px;font-weight:700;margin-bottom:12px;background:linear-gradient(180deg,#fff,#e9f0ff);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
      .qhx-footer-info{font-size:13px;color:var(--text);line-height:1.7;opacity:.9}
      .qhx-footer-info a{color:#4da3ff;text-decoration:none}
      .qhx-footer-info a:hover{text-decoration:underline}
      .qhx-footer-social{display:flex;gap:10px;justify-content:flex-end;margin-top:16px}
      .qhx-social-btn{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#fff;transition:transform .15s ease, background .2s}
      .qhx-social-btn:hover{transform:translateY(-2px);background:rgba(31,106,230,.18);border-color:var(--ring)}

      /* Chat button */
      .qhx-chat-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,#1f6ae6,#3c80ff);box-shadow:0 10px 30px rgba(31,106,230,.4);cursor:pointer;transition:transform .2s ease,box-shadow .2s ease;z-index:1000}
      .qhx-chat-btn:hover{transform:translateY(-2px);box-shadow:0 14px 36px rgba(31,106,230,.5)}
      .qhx-chat-btn svg{width:28px;height:28px;color:#fff}

      /* Loader */
      .qhx-loader{position:fixed;inset:0;background:radial-gradient(1200px 400px at 20% -10%, rgba(31,106,230,.18), transparent 60%), #0b1326;display:grid;place-items:center;z-index:999999}
      .qhx-splash{display:flex;flex-direction:column;align-items:center;gap:14px}
      .qhx-sigil{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;color:white;background:conic-gradient(from 230deg,#1f6ae6,#3f88ff 40%,#6ba0ff 70%,#1f6ae6);box-shadow:0 10px 30px rgba(31,106,230,.45), inset 0 0 18px rgba(255,255,255,.2);font-weight:900;font-size:22px}
      .qhx-loading{color:#cbd6ee;font-size:13px;letter-spacing:.25px}
      .qhx-spinner{width:20px;height:20px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;animation:spin .9s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}

      /* accessibility / hover underline off */
      #qhx-root a, #qhx-root a:hover, #qhx-root a:focus { text-decoration:none !important; }
      @media (prefers-reduced-motion: reduce){
        .qhx-action,.qhx-iconbtn,.qhx-resource,.qhx-stat,.qhx-mini{transition:none}
        .qhx-orb,.qhx-spinner{animation:none}
      }
      @media (max-width:768px){
        .qhx-container{padding:20px 14px 56px}
        .qhx-grid{grid-template-columns:1fr}
        .qhx-stats{grid-template-columns:1fr}
        .qhx-footer-content{grid-template-columns:1fr;text-align:center}
        .qhx-footer-right{text-align:center}
        .qhx-footer-social{justify-content:center}
      }
    `;
    document.head.appendChild(s);
  }

  // --------------------------------
  //  DOM mount + render
  // --------------------------------
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
  function digitsOnly(s) { return (s || '').replace(/\D+/g, ''); }
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

    // update map only if coordinates changed
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

  // select the matching native radio + fire change so their code runs
  const radio = document.querySelector(isFlex ? '#btnFlex' : '#btnTriColour');
  if (radio) {
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // also call their preparer directly (populates hidden fields + shows form)
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

    // If we’re reusing an existing iframe, just ensure it’s in the slot’s place
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
    return ids
      .map(([label, id]) => {
        const img = document.getElementById(id);
        const href = img ? img.closest('a')?.href : null;
        return href ? { label, href } : null;
      })
      .filter(Boolean);
  }

  function extractMapData() {
    const lat = qs('#map-lat')?.value || '';
    const lon = qs('#map-lon')?.value || '';
    const zoom = qs('#map-zoom')?.value || '';
    return { lat, lon, zoom };
  }

  function extractAllData() {
    // Check meal plan newsletter checkbox state
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
        <div class="qhx-loading">Loading your Premium View…</div>
        <div class="qhx-spinner"></div>
      </div>`;
    document.body.appendChild(l);
  }
  function hideLoader() { document.getElementById('qhx-loader')?.remove(); }

  const LOGO_SRC = chrome.runtime?.getURL?.('icons/Logo.png') || '';

  // clipboard + share helpers
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

  // Handle meal plan checkbox
  // Handle meal plan checkbox
function handleMealCheckbox(e) {
  const checkbox = e.target;
  if (checkbox.id !== 'qhx-meal-newsletter') return;
  saveNewsletterPreference(checkbox.checked);
}


  // Handle fund selection and form
  function handleFundSelection(e) {
  const option = e.target.closest('.qhx-fund-option');
  if (!option) return;

  // UI active state
  document.querySelectorAll('.qhx-fund-option').forEach(opt => opt.classList.remove('active'));
  option.classList.add('active');

  const fundType = option.dataset.fundType; // 'flex' | 'tri'
  const infoEl = document.getElementById('qhx-fund-info');

  // Sync to native widget immediately
  syncFundToNative(fundType);

  // Update text in our UI
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

  // Recompute totals (bonus/promo) using their logic if amount is already filled
  if (typeof window.calculate_totals === 'function') window.calculate_totals();
}


  // Calculate bonus for Flex purchases
  function calculateBonus(amount, fundType) {
    if (fundType !== 'flex') return 0;
    // Simple bonus structure (you can adjust based on actual rules)
    if (amount >= 100) return amount * 0.10; // 10% bonus
    if (amount >= 50) return amount * 0.05;  // 5% bonus
    return 0;
  }

  // Handle amount input
  function handleAmountInput(e) {
  const input = e.target;
  if (input.id !== 'qhx-amount-input') return;

  const amount = Math.max(0, Math.min(999.99, parseFloat(input.value) || 0));
  const fundType = document.querySelector('.qhx-fund-option.active')?.dataset.fundType || 'flex';

  // our preview (can keep if you like)
  const bonus = calculateBonus(amount, fundType);
  const total = amount + bonus;
  document.getElementById('qhx-bonus-amount').textContent = `$${bonus.toFixed(2)}`;
  document.getElementById('qhx-total-amount').textContent = `$${total.toFixed(2)}`;

  // push amount into the native input and let the portal compute official totals
  const nativeAmt = document.getElementById('qusw-tuf-item-price');
  if (nativeAmt) nativeAmt.value = amount ? amount.toFixed(2) : '';
  if (typeof window.calculate_totals === 'function') window.calculate_totals();
}

function fmtMoney(n) { return `$${(Number(n) || 0).toFixed(2)}`; }

function confirmBeforePurchase({ amount, fundType }) {
  const fundLabel = fundType === 'tri' ? 'Tri-Colour $' : 'Flex $';
  const bonus = calculateBonus(amount, fundType);
  const total = amount + bonus;
  const msg = [
    'Confirm purchase',
    '',
    `You’re about to add ${fmtMoney(amount)} to ${fundLabel}.`,
    bonus ? `Bonus to be added: ${fmtMoney(bonus)}` : null,
    `Total credited: ${fmtMoney(total)}`,
    '',
    'This will charge your Student Account and redirect to the university confirmation page.',
    'Click OK to continue, or Cancel to go back.',
  ].filter(Boolean).join('\n');
  return window.confirm(msg);
}


  // Handle purchase button
  // Handle purchase button
function handlePurchase() {
  const amount = parseFloat(document.getElementById('qhx-amount-input')?.value) || 0;
  const fundType = document.querySelector('.qhx-fund-option.active')?.dataset.fundType || 'flex';

  if (amount < 1)       return alert('Please enter an amount of at least $1.00');
  if (amount > 999.99)  return alert('Maximum amount is $999.99');

  // NEW: confirmation
  if (!confirmBeforePurchase({ amount, fundType })) return;

  // prevent rapid double-clicks
  const btn = document.getElementById('qhx-purchase-btn');
  if (btn) { btn.disabled = true; btn.setAttribute('aria-busy', 'true'); }

  // 1) sync fund choice to native widget
  syncFundToNative(fundType);

  // 2) sync amount to native field + recompute totals
  const nativeAmt = document.getElementById('qusw-tuf-item-price');
  if (nativeAmt) nativeAmt.value = amount.toFixed(2);
  if (typeof window.calculate_totals === 'function') window.calculate_totals();

  // 3) hand off to portal checkout (handles modal/validation/submit)
  if (typeof window.checkout === 'function') {
    document.body.classList.remove('qhx-overlay-active');
    window.checkout('student');
    return;
  }

  // 4) Fallback: submit the form the same way their checkout() would
  const form = document.getElementById('purchase_funds_form');
  if (form) {
    document.getElementById('qusw-tuf-promo-code')?.removeAttribute('disabled');
    form.setAttribute('action', '/public/checkout/student_account.php');
    form.submit();
  } else {
    alert('Could not find the native checkout form on this page.');
    if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); } // re-enable if we didn’t navigate
  }
}



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
      const mailto = `mailto:${encodeURI(email)}`; // encodeURI keeps @ intact
      let shared = false;
      if (navigator.share) {
        try {
          // share text only; avoid non-http(s) URL in Web Share
          await navigator.share({ title: "Queen's email", text: email });
          shared = true;
        } catch (_) {
          // user canceled or unsupported; fall through
        }
      }
      if (!shared) {
        // Reliable fallback even after an awaited call
        const a = document.createElement('a');
        a.href = mailto;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    }
  }

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
        <!-- Header -->
        <header class="qhx-header">
          <div class="qhx-brand">
            <div class="qhx-logo"><img src="${LOGO_SRC}" alt="Queen's Enhancer logo"></div>
            <div class="qhx-title">
              <h1>Welcome back, ${esc(data.profile.preferredName || data.profile.name || 'Student')}</h1>
              <p>Queen's University Housing Portal — Premium View</p>
            </div>
          </div>
          <div class="qhx-actions">
            ${data.logoutUrl ? `<a class="qhx-iconbtn" href="${data.logoutUrl}" title="Logout" aria-label="Logout">${SVG.logout}</a>` : ''}
          </div>
        </header>

        <!-- Quick stats -->
        <section class="qhx-stats">
          <div class="qhx-stat"><div><h3>Room</h3><div class="val">${esc(data.room.type || 'Not Assigned')}</div></div><div class="qhx-badge bg-home">${SVG.home}</div></div>
          <div class="qhx-stat"><div><h3>Meal Plan</h3><div class="val">${esc(data.meal.planName || 'N/A')}</div></div><div class="qhx-badge bg-meal">${SVG.meal}</div></div>
          <div class="qhx-stat"><div><h3>Flex $</h3><div class="val" id="qhx-flex-balance">${esc(data.funds.flexBalance || '$0.00')}</div></div><div class="qhx-badge bg-flex">${SVG.flex}</div></div>
          <div class="qhx-stat"><div><h3>Tri-Colour</h3><div class="val" id="qhx-tri-balance">${esc(data.funds.triColourBalance || '$0.00')}</div></div><div class="qhx-badge bg-tri">${SVG.wallet}</div></div>
        </section>

        <!-- Main grid -->
        <section class="qhx-grid">

          <!-- Student Profile -->
          <article class="qhx-card">
            <div class="qhx-cardhead">
              <div class="qhx-cardicon">${SVG.user}</div>
              <div class="qhx-cardtitle">Student Profile</div>
            </div>
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

          <!-- Room Assignment -->
          <article class="qhx-card">
            <div class="qhx-cardhead">
              <div class="qhx-cardicon">${SVG.home}</div>
              <div class="qhx-cardtitle">Room Assignment</div>
            </div>
            <div class="qhx-content">
              ${data.room.address ? `
                <div class="qhx-pill"><span class="k">Address</span><span class="v">${esc(data.room.address)}</span></div>
              ` : `<div class="qhx-pill"><span class="v" style="opacity:.7">No room assigned yet</span></div>`}
              ${data.room.type ? `<div class="qhx-row"><span class="qhx-label">Room Type</span><span class="qhx-value">${esc(data.room.type)}</span></div>` : ''}
              ${data.room.rate ? `<div class="qhx-row"><span class="qhx-label">Rate</span><span class="qhx-value">${esc(data.room.rate)}</span></div>` : ''}
              
              ${data.room.mapData.lat && data.room.mapData.lon ? `
                <div class="qhx-map-container">
                  <div id="qhx-map-slot" class="qhx-map-placeholder">Loading map…</div>
                </div>
              ` : ''}

            </div>
          </article>

          <!-- Quick Actions -->
          <article class="qhx-card">
            <div class="qhx-cardhead">
              <div class="qhx-cardicon">${SVG.calendar}</div>
              <div class="qhx-cardtitle">Quick Actions</div>
            </div>
            <div class="qhx-actionsgrid">
              ${
                data.actions.map(a => {
                  const cls = ({ calendar:'a-cal', xcirc:'a-x', fileText:'a-file', heart:'a-heart', alert:'a-alert', satellite:'a-sat', badgeCheck:'a-badge' })[a.icon] || 'a-cal';
                  const icon = SVG[a.icon] || SVG.calendar;
                  return `
                    <a class="qhx-action" href="${esc(a.href)}">
                      <div class="aicon ${cls}">${icon}</div>
                      <div class="alabel">${esc(a.label)}</div>
                    </a>
                  `;
                }).join('')
              }
            </div>
          </article>

          <!-- Meal Plan -->
          <article class="qhx-card">
            <div class="qhx-cardhead">
              <div class="qhx-cardicon">${SVG.meal}</div>
              <div class="qhx-cardtitle">Meal Plan Information</div>
            </div>
            <div class="qhx-content">
              ${data.meal.planName ? `
                <div class="qhx-pill"><span class="k">Current Plan</span><span class="v" id="qhx-meal-plan">${esc(data.meal.planName)}</span></div>
              ` : `<div class="qhx-pill"><span class="v" style="opacity:.7">No meal plan selected</span></div>`}
              ${data.meal.usedThisWeek ? `<div class="qhx-row"><span class="qhx-label">Used This Week</span><span class="qhx-value">${esc(data.meal.usedThisWeek)}</span></div>` : ''}
              ${data.meal.usedToDate ? `<div class="qhx-row"><span class="qhx-label">Total Used</span><span class="qhx-value">${esc(data.meal.usedToDate)}</span></div>` : ''}
              ${data.meal.guestMeals ? `<div class="qhx-row"><span class="qhx-label">Guest Meals</span><span class="qhx-value">${esc(data.meal.guestMeals)}</span></div>` : ''}
              ${data.meal.lastUsed ? `<div class="qhx-row"><span class="qhx-label">Last Used</span><span class="qhx-value">${esc(data.meal.lastUsed)}</span></div>` : ''}
              
              <div class="qhx-checkbox-row">
                <input type="checkbox" class="qhx-checkbox" id="qhx-meal-newsletter" ${data.meal.newsletterChecked ? 'checked' : ''}>
                <label for="qhx-meal-newsletter" class="qhx-checkbox-label">
                  Check to receive email updates about your meal plan
                </label>
              </div>
              
              <div class="qhx-note">
                <strong>NOTE:</strong> TAMs are not additional weekly meals. Each TAM swipe counts as one of your weekly 19 dining hall swipes.
              </div>
            </div>
          </article>

          <!-- Available Funds -->
          <article class="qhx-card">
            <div class="qhx-cardhead">
              <div class="qhx-cardicon">${SVG.wallet}</div>
              <div class="qhx-cardtitle">Available Funds</div>
            </div>
            <div class="qhx-content">
              <div class="qhx-pill"><span class="k">Flex Dollars</span><span class="v">${esc(data.funds.flexBalance || '$0.00')}</span></div>
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
                  <div class="qhx-fund-info">
                    <span>Bonus Amount:</span>
                    <span id="qhx-bonus-amount">$0.00</span>
                  </div>
                  <div class="qhx-fund-info qhx-fund-total">
                    <span>Total Funds:</span>
                    <span id="qhx-total-amount">$0.00</span>
                  </div>
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

          <!-- Helpful Resources -->
          <article class="qhx-card">
            <div class="qhx-cardhead">
              <div class="qhx-cardicon">${SVG.book}</div>
              <div class="qhx-cardtitle">Helpful Resources</div>
            </div>
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

      <!-- Footer -->
      <footer class="qhx-footer">
        <div class="qhx-footer-content">
          <div class="qhx-footer-left">
            <div class="qhx-footer-brand">
              <img src="/public/images/queens_logo_white_164.png" alt="Queen's University" class="qhx-footer-logo">
            </div>
            <div class="qhx-footer-copyright">
              Copyright © Queen's University<br>
              Supported browsers include IE9+ and current Firefox, Chrome, Safari and Opera
            </div>
          </div>
          <div class="qhx-footer-right">
            <h3 class="qhx-footer-title">Residence Admissions</h3>
            <div class="qhx-footer-info">
              Victoria Hall, Queen's University<br>
              75 Bader Lane<br>
              Kingston, Ontario, Canada K7L 3N8<br>
              Phone: (613) 533-2550<br>
              Email: <a href="mailto:reshouse@queensu.ca">reshouse@queensu.ca</a>
            </div>
            <div class="qhx-footer-social">
              <a href="https://www.facebook.com/QueensUniversityResidences" target="_blank" class="qhx-social-btn" title="Facebook">
                ${SVG.facebook}
              </a>
              <a href="https://twitter.com/queensures" target="_blank" class="qhx-social-btn" title="Twitter">
                ${SVG.twitter}
              </a>
            </div>
          </div>
        </div>
      </footer>

      <!-- Chat button -->
      <div class="qhx-chat-btn" title="Chat with us">
        ${SVG.messageCircle}
      </div>
    `
      const mapSlot = root.querySelector('#qhx-map-slot');
    mountOrUpdateMap(mapSlot, data.room.mapData, existingMap);
    ;


    // Bind event handlers
    if (!root.__qhxEventsBound) {
      root.addEventListener('click', handleInlineAction, { passive: true });
      root.addEventListener('change', handleMealCheckbox, { passive: true });
      root.addEventListener('click', handleFundSelection, { passive: true });
      root.addEventListener('input', handleAmountInput, { passive: true });
      root.addEventListener('click', (e) => { if (e.target.closest('#qhx-purchase-btn')) handlePurchase();});
        // Prevent accidental Enter submits on the amount field
  root.addEventListener('keydown', (e) => {
    if (e.target?.id === 'qhx-amount-input' && e.key === 'Enter') {
      e.preventDefault();
      e.target.blur();
    }
  }, { passive: false });

      // Chat button handler
      // Chat button handler
root.addEventListener('click', (e) => {
  const btn = e.target.closest('.qhx-chat-btn');
  if (!btn) return;

  if (canEmbedLiveChat()) {
  ensureLiveChatWidget();
  setTimeout(() => window.LiveChatWidget?.call?.('maximize'), 600);
} else {
  window.open(LIVECHAT_POPUP_URL,'queens-livechat','width=420,height=640,noopener');
}

});


      
      root.__qhxEventsBound = true;
    }
  }

  function applyAvailabilityGuards() {
  // If the native Tri-Colour radio isn't on the page, disable our Tri-Colour option
  const triNativeMissing = !document.querySelector('#btnTriColour');
  if (triNativeMissing) {
    const triOpt = document.querySelector('.qhx-fund-option[data-fund-type="tri"]');
    if (triOpt) {
      triOpt.setAttribute('aria-disabled', 'true');
      triOpt.style.opacity = '0.5';
      triOpt.style.pointerEvents = 'none';
      // ensure Flex is selected if Tri was active
      const flexOpt = document.querySelector('.qhx-fund-option[data-fund-type="flex"]');
      if (triOpt.classList.contains('active') && flexOpt) {
        triOpt.classList.remove('active');
        flexOpt.classList.add('active');
        syncFundToNative('flex');
      }
    }
  }

  // If student-account purchase is unavailable, disable our purchase button
  const isStaff = (window.customer_type === 'staff') || !document.querySelector('#qusw-btnStudentAccount');
  const purchaseBtn = document.getElementById('qhx-purchase-btn');
  if (isStaff && purchaseBtn) {
    purchaseBtn.disabled = true;
    purchaseBtn.textContent = 'Student Account Purchase Unavailable';
  }
}

// Load LiveChat widget if it's not already on the page
function ensureLiveChatWidget() {
    if (!canEmbedLiveChat()) return;
  if (window.LiveChatWidget) return; // already loaded

  // Basic LiveChat boot config
  window.__lc = window.__lc || {};
  window.__lc.license = 11961210;     // your license_id
  window.__lc.group = 1;              // your group
  // (optional) tag source so support knows it's from Premium View
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

const LIVECHAT_POPUP_URL =
  'https://secure.livechatinc.com/customer/action/open_chat?license_id=11961210&group=1';

function canEmbedLiveChat() {
  // blocklist any hosts that forbid third-party scripts
  return !/^studentweb\.housing\.queensu\.ca$/i.test(location.hostname);
}


  async function enablePremium({ firstBoot = false } = {}) {
    qhxEnabled = true;
    await store.set({ qhxEnabled });
    document.body.classList.add('qhx-overlay-active');

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
    if (document.getElementById('chat-widget-container')) {
      document.querySelector('.qhx-chat-btn')?.style.setProperty('display', 'none', 'important');
    }


    // Live refresh
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => updateDynamicBits(extractAllData()), 15000);

    const elapsed = performance.now() - start;
    const minHold = firstBoot ? LOADER_MIN_MS : 300;
    setTimeout(hideLoader, Math.max(0, minHold - elapsed));
  }

  async function disablePremium() {
    qhxEnabled = false;
    await store.set({ qhxEnabled });
    document.getElementById('qhx-root')?.remove();
    document.getElementById('qhx-styles')?.remove();
    document.body.classList.remove('qhx-overlay-active');
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
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

  // -------- Boot --------
  async function init() {
    qhxEnabled = await store.get('qhxEnabled', true);
    document.addEventListener('keydown', handleHotkey, { passive: false });
    window.addEventListener('pageshow', () => {
      if (qhxEnabled && !document.getElementById('qhx-root')) enablePremium();
    });
    if (qhxEnabled) await enablePremium({ firstBoot: true }); 
    else await disablePremium();
  }

  init();
})();