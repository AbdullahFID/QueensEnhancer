// residence/poa.js
(() => {
  if (window.__qePOABooted) return;
  window.__qePOABooted = true;

  if (location.hostname !== 'studentweb.housing.queensu.ca') return;

  /* ---------------- helpers ---------------- */
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

  const waitFor = (sel, t = 10000) => new Promise((res, rej) => {
    const first = $(sel); if (first) return res(first);
    const mo = new MutationObserver(() => { const hit = $(sel); if (hit) { mo.disconnect(); res(hit); }});
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { mo.disconnect(); rej(new Error('timeout ' + sel)); }, t);
  });

  const hideLoaderHard = () => {
    ['#qusw-loader','#waitMessageOverlay','#waitMessageDialog'].forEach(sel => {
      const el = $(sel); if (el) el.style.setProperty('display','none','important');
    });
  };

  /* ---------------- page detection ---------------- */
  const isLetterPage = () => {
    // Check for enhanced mode already active
    if (document.documentElement.classList.contains('qe-poa-on') || $('#qe-poa')) return true;

    // Check for the panel heading with "Letter of Confirmation of Residence"
    const headingHit = $$('.panel-heading').some(h => 
      /letter of confirmation of residence/i.test(h.textContent || '')
    );

    // Check for specific letter elements that only exist on this page
    const hasLetterElements = !!(
      $('#att-full-name') || 
      $('#att-student-id') || 
      $('#att-building-address') ||
      $('#att-move-in-date') ||
      $('#att-move-out-date')
    );

    // Check if "TO WHOM IT MAY CONCERN" exists in the content
    const hasLetterContent = $$('#qusw-content-wrapper-en p, #qusw-body p').some(p =>
      /to whom it may concern/i.test(p.textContent || '')
    );

    return !!(headingHit || hasLetterElements || hasLetterContent);
  };

  const inPOAContext = () =>
    document.documentElement.classList.contains('qe-poa-on') || isLetterPage();

  /* ---------------- toast notifications ---------------- */
  const toast = (msg) => {
    let t = $('#qe-toast'); if (!t) {
      t = document.createElement('div'); t.id='qe-toast';
      t.style.cssText = `
        position:fixed; z-index:2147483647; left:50%; bottom:24px; transform:translateX(-50%);
        padding:10px 14px; border-radius:12px; background:#0b1430cc; color:#fff; border:1px solid #ffffff22;
        backdrop-filter: blur(10px); box-shadow: 0 10px 30px rgba(0,0,0,.35); font-weight:700; opacity:0; transition:opacity .2s;
      `;
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = '1'; clearTimeout(t._h); t._h = setTimeout(()=> t.style.opacity='0', 900);
  };

  /* ---------------- icons ---------------- */
  const ICON = {
    back:    `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-undo-2" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`,
    home:    `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-house" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    logout:  `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-log-out" viewBox="0 0 24 24"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>`,
    print:   `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-printer" viewBox="0 0 24 24"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>`,
    download:`<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-download" viewBox="0 0 24 24"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>`
  };

  /* ---------------- CSS (matching editprofile.js theme) ---------------- */
  const injectCSS = () => {
    if ($('#qe-poa-css')) return;
    const css = document.createElement('style');
    css.id = 'qe-poa-css';
    css.textContent = `
      :root{
        --qe-bg: radial-gradient(1600px 900px at -10% -15%, #13366f88 0%, transparent 60%),
                 radial-gradient(1400px 800px at 120% -10%, #0a1c3aa0 0%, transparent 65%),
                 linear-gradient(180deg, #0d1a36 0%, #0a1530 45%, #08122a 100%);
        --glass: rgba(255,255,255,0.08);
        --stroke: rgba(255,255,255,0.14);
        --ink: #f4f7ff;
        --ink-sub: #d6e0ff;
        --accent: #FFD34D;
        --danger: #ff6e66;
        --radius: 22px;
        --shadow: 0 22px 60px rgba(6,12,28,0.6);
        --ring: 0 0 0 5px rgba(255,211,77,0.18);
        --maxw: min(1100px, 96vw);
      }

      /* IMPORTANT: hide ALL native elements when enhanced is on */
      .qe-poa-on #qusw-banner,
      .qe-poa-on #qusw-body,
      .qe-poa-on #qusw-body-left-column,
      .qe-poa-on #qusw-body-center-column,
      .qe-poa-on #qusw-page-container > page,
      .qe-poa-on #qusw-footer,
      .qe-poa-on #qusw-widget-profile,
      .qe-poa-on #qusw-widget-room-assignment,
      .qe-poa-on #qusw-button-wrapper,
      .qe-poa-on #qusw-loader,
      .qe-poa-on .panel.panel-primary { display: none !important; }

      /* fill the whole page */
      html, body { background: #08122a !important; }
      #qe-poa {
        background: var(--qe-bg);
        min-height: 100vh;
        position: relative;
        color: var(--ink);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial;
      }
      #qe-poa .wrap { max-width: var(--maxw); margin: 0 auto; padding: clamp(22px, 4vw, 40px); }

      /* header */
      .qe-topbar { display:flex; align-items:center; justify-content:space-between; margin-bottom: clamp(18px, 2.6vw, 28px); flex-wrap: wrap; gap: 14px; }
      .qe-left { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
      .qe-title {
        font-weight: 900; letter-spacing:.2px; line-height:1;
        font-size: clamp(28px, 4vw, 44px);
        text-shadow: 0 1px 0 #0004;
      }
      .qe-actions-bar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
      .qe-chip {
        display:inline-flex; align-items:center; gap:10px;
        padding:12px 14px; border-radius: 999px; border:1px solid var(--stroke);
        background: var(--glass); color: var(--ink); text-decoration:none;
        backdrop-filter: blur(14px) saturate(160%); box-shadow: var(--shadow);
        transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease, background .2s ease;
        cursor: pointer;
      }
      .qe-chip svg { width:18px; height:18px; }
      .qe-chip:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(0,0,0,.35); border-color:#ffffff33; background: rgba(255,255,255,.12); }

      /* letter card */
      .qe-letter-card {
        position: relative;
        border-radius: var(--radius);
        padding: clamp(22px, 2.2vw, 30px);
        color: var(--ink);
        background:
          linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)) padding-box,
          linear-gradient(135deg, rgba(255,255,255,0.32), rgba(255,255,255,0.06)) border-box;
        border: 1px solid transparent;
        box-shadow: var(--shadow);
        backdrop-filter: blur(20px) saturate(160%);
      }

      /* paper inside card */
      .qe-paper { 
        background:#fff; 
        color:#111; 
        border-radius: 16px; 
        padding: clamp(24px, 3vw, 40px); 
        position: relative;
      }
      .qe-paper p { margin: 0 0 14px; line-height: 1.6; color: #111; }
      .qe-paper a { color: #0066cc; }

      /* Letter specific styling */
      #qe-paper #att-logo,
      #qe-paper .pull-right { 
        float: right; 
        margin-left: 20px;
      }
      #qe-paper .clearfix { clear: both; }
      #qe-paper strong { font-weight: 700; }
      #qe-paper .pshrink { margin: 8px 0; }
      #qe-paper .text-center { text-align: center; }
      #qe-paper .text-left { text-align: left; }

      /* Action buttons in letter mode */
      .qe-letter-actions {
        display:flex; gap:12px; justify-content:center; margin-top: 20px; flex-wrap:wrap;
      }
      .qe-btn {
        display:inline-flex; align-items:center; gap:10px;
        padding: 14px 20px; border-radius:16px; font-weight:900; letter-spacing:.2px;
        border:1px solid var(--stroke); cursor:pointer; background: var(--glass); color: var(--ink);
        transition: transform .15s ease, background .15s ease, border-color .15s ease, box-shadow .15s ease;
      }
      .qe-btn svg{ width:18px; height:18px; }
      .qe-btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.12); border-color:#ffffff33; box-shadow: 0 14px 30px rgba(0,0,0,.25); }
      .qe-btn.primary{ background: linear-gradient(180deg, var(--accent), #FFC533); color:#0b1430; border-color: transparent; text-shadow: 0 1px 0 #fff4; }

      .lucide { width: 1em; height: 1em; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

      @media print {
        #qe-poa .qe-topbar { display:none !important; }
        #qe-poa .qe-letter-actions { display:none !important; }
        body, html, #qe-poa { background:#fff !important; }
        .qe-letter-card { padding:0; box-shadow:none; border:0; background:none !important; }
        .qe-paper { border-radius:0; padding:20px; }
      }
    `;
    document.documentElement.appendChild(css);
  };

  /* ---------------- UI build ---------------- */
  const buildUI = () => {
    if ($('#qe-poa')) return;

    const logoutHref =
      ($$('#qusw-banner a').find(a => /logout/i.test(a.textContent||a.title||''))?.href) || '/logout.php';

    // Find the letter content (just the inner content, not the panel wrapper)
    const letterContent = $('#qusw-content-wrapper-en');
    if (!letterContent) return;

    const shell = document.createElement('div');
    shell.id = 'qe-poa';
    shell.innerHTML = `
      <div class="wrap">
        <div class="qe-topbar">
          <div class="qe-left">
            <div class="qe-title">Letter of Confirmation</div>
            <button class="qe-chip" id="qe-back">${ICON.back}<span>Back</span></button>
            <a class="qe-chip" id="qe-home" href="https://studentweb.housing.queensu.ca/">${ICON.home}<span>Student Web Housing</span></a>
          </div>
          <div class="qe-actions-bar">
            <a class="qe-chip" id="qe-logout" href="${logoutHref}">${ICON.logout}<span>Logout</span></a>
          </div>
        </div>

        <div class="qe-letter-card">
          <div class="qe-paper" id="qe-paper"></div>
          <div class="qe-letter-actions">
            <button class="qe-btn" id="qe-print">${ICON.print}<span>Print Letter</span></button>
            <button class="qe-btn primary" id="qe-download">${ICON.download}<span>Download PDF</span></button>
          </div>
        </div>
      </div>
    `;
    
    // Insert at the very beginning of body to ensure it appears first
    document.body.insertBefore(shell, document.body.firstChild);
    document.documentElement.classList.add('qe-poa-on');

    // Move letter content into our paper (clone to avoid any reference issues)
    const paperEl = $('#qe-paper');
    if (paperEl && letterContent) {
      paperEl.innerHTML = letterContent.innerHTML;
      
      // Clean up any native buttons that got copied
      $$('#qe-paper #NavButtonCancel, #qe-paper #NavButtonFinish, #qe-paper #btnPrint').forEach(b => b.remove());
      $$('#qe-paper #qusw-button-wrapper').forEach(w => w.remove());
    }

    // Bind actions
    $('#qe-back')?.addEventListener('click', (e) => { e.preventDefault(); history.back(); }, {passive:true});
    $('#qe-print')?.addEventListener('click', () => window.print(), {passive:true});
    $('#qe-download')?.addEventListener('click', async () => {
      toast('Download feature coming soon');
      // Could implement PDF download here
    }, {passive:true});
  };

  /* ---------------- mode toggle ---------------- */
  const MODE_KEY = 'qe_mode_poa';
  const getMode = () => localStorage.getItem(MODE_KEY) || 'enhanced';
  const setMode = (m) => localStorage.setItem(MODE_KEY, m);

  const applyMode = (mode) => {
    if (!inPOAContext()) return;

    if (mode === 'native') {
      $('#qe-poa')?.remove();
      document.documentElement.classList.remove('qe-poa-on');
      hideLoaderHard();
      return;
    }

    injectCSS();
    if (!$('#qe-poa')) buildUI();
    hideLoaderHard();
  };

  const toggleMode = () => {
    const next = getMode() === 'enhanced' ? 'native' : 'enhanced';
    setMode(next);
    applyMode(next);
    toast(`View: ${next === 'enhanced' ? 'Enhanced' : 'Native'}`);
  };

  // expose console helper
  window.qeTogglePOA = toggleMode;

  const keyHandler = (e) => {
    const k = (e.key || '').toLowerCase();
    const combo1 = (e.ctrlKey || e.metaKey) && e.shiftKey && k === 'q';
    const combo2 = e.altKey && e.shiftKey && k === 'q';
    if ((combo1 || combo2) && inPOAContext()) {
      e.preventDefault(); e.stopPropagation();
      toggleMode();
    }
  };
  document.addEventListener('keydown', keyHandler, true);
  window.addEventListener('keydown', keyHandler, true);

  /* ---------------- observe for dynamic changes ---------------- */
  const observeForRerender = () => {
    const t = $('#qusw-page-container') || document.body;
    const mo = new MutationObserver(() => {
      if (getMode() !== 'enhanced') return;
      if (!inPOAContext()) return;
      if (!$('#qe-poa')) { injectCSS(); buildUI(); }
      hideLoaderHard();
    });
    mo.observe(t, { childList: true, subtree: true });
  };

  /* ---------------- boot ---------------- */
  (async () => {
    try {
      hideLoaderHard();
      await waitFor('#qusw-body, #qusw-page-container');
      
      // Wait a bit for the content to fully load
      await new Promise(r => setTimeout(r, 100));
      
      if (!isLetterPage()) return;

      const mode = getMode();
      applyMode(mode);
      if (mode === 'enhanced') observeForRerender();
    } catch (_) {}
  })();
})();