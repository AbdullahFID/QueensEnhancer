// residence/editprofile.js  — QUEEN'S ENHANCER: Edit Profile (Fixed Left Panel Layout)
(() => {
  if (window.__qeEditProfileBooted) return;
  window.__qeEditProfileBooted = true;

  if (location.hostname !== 'studentweb.housing.queensu.ca') return;

  // ---------- helpers ----------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const waitFor = (sel, t = 12000) => new Promise((res, rej) => {
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
    t.textContent = msg; t.style.opacity = '1'; clearTimeout(t._h); t._h = setTimeout(()=> t.style.opacity='0', 1100);
  };

  const copyText = async (text) => {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); toast('Copied'); }
      else {
        const ta = document.createElement('textarea'); ta.value = text;
        ta.style.position='fixed'; ta.style.inset='-9999px'; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); ta.remove(); toast('Copied');
      }
    } catch { /* no-op */ }
  };

  // ---------- detection ----------
  const isEditProfile = () => {
    const rmsNeeded =
      $('[rmsmodel="Screen_Name"]') &&
      $('[rmsmodel="Phone_Cell"]') &&
      $('[rmsmodel="PerCustFldParcelSMS"]');
    const labelHit = $$('.panel-heading, #qusw-panel-title').some(el =>
      /\bedit profile\b/i.test(el?.textContent || el?.value || '')
    );
    return !!rmsNeeded && (labelHit || true);
  };

  const inEPContext = () =>
    document.documentElement.classList.contains('qe-ep-on') || isEditProfile();

  // ---------- icons ----------
  const ICON = {
    logout:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>`,
    back:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`,
    home:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    pencil:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0  0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>`,
    phone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>`,
    save:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>`,
    cancel:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><path d="M4.929 4.929 19.07 19.071"/><circle cx="12" cy="12" r="10"/></svg>`,
    copy:  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    copyAll:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 1 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="lucide"><path d="M20 6 9 17l-5-5"/></svg>`,
    bell: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`
  };

  // ---------- CSS ----------
  const injectCSS = () => {
    if ($('#qe-ep-css')) return;
    const css = document.createElement('style');
    css.id = 'qe-ep-css';
    css.textContent = `
      :root{
        --bg: radial-gradient(1600px 900px at -10% -15%, #13366f88 0%, transparent 60%),
              radial-gradient(1400px 800px at 120% -10%, #0a1c3aa0 0%, transparent 65%),
              linear-gradient(180deg, #0d1a36 0%, #0a1530 45%, #08122a 100%);
        --glass: rgba(255,255,255,0.06);
        --glass2: rgba(255,255,255,0.10);
        --stroke: rgba(255,255,255,0.16);
        --ink: #f5f8ff;
        --muted: #cdd5f0;
        --accent: #FFD34D;
        --accent-ink: #102049;
        --danger: #ff6e66;
        --radius: 20px;
        --shadow: 0 24px 60px rgba(6,12,28,0.55);
        --ring: 0 0 0 5px rgba(255,211,77,0.20);
        --maxw: min(1350px, 96vw);
      }

      .qe-ep-on #qusw-banner,
      .qe-ep-on #qusw-page-container > #qusw-body,
      .qe-ep-on #qusw-buttons-wrapper,
      .qe-ep-on #qusw-footer,
      .qe-ep-on #qusw-loader,
      .qe-ep-on [data-qe="mode-banner"]{ display:none !important; }
      #qusw-widget-room-assignment{ display:none !important; }

      html, body { background:#08122a !important; }
      #qe-ep{
        min-height:100vh; color:var(--ink); background:var(--bg);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Inter, Roboto, "Helvetica Neue", Arial;
      }
      #qe-ep .wrap{ max-width:var(--maxw); margin:0 auto; padding: clamp(20px, 4vw, 40px); }

      .lucide{ width:1em; height:1em; stroke:currentColor; fill:none; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

      /* top bar */
      .qe-topbar{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom: clamp(18px, 3vw, 28px); }
      .qe-brand{ display:flex; align-items:center; gap:14px; }
      .qe-title{ font-weight:900; font-size: clamp(28px, 4vw, 44px); letter-spacing:.2px; text-shadow:0 1px 0 #0004; }
      .qe-chip{
        display:inline-flex; align-items:center; gap:10px; padding:10px 14px; border-radius:999px;
        border:1px solid var(--stroke); background:var(--glass); color:var(--ink); text-decoration:none;
        backdrop-filter: blur(14px) saturate(160%); box-shadow: var(--shadow);
        transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease;
      }
      .qe-chip:hover{ transform:translateY(-1px); border-color:#ffffff33; background:var(--glass2); box-shadow:0 18px 44px rgba(0,0,0,.35); }

      /* grid */
      .qe-grid{ display:grid; grid-template-columns: 360px 1fr; gap: clamp(20px, 2.8vw, 32px); align-items:start; }
      @media (max-width: 1100px){ .qe-grid{ grid-template-columns:1fr; } }

      /* cards */
      .card{
        border-radius: var(--radius); border: 1px solid var(--stroke);
        background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
        box-shadow: var(--shadow); backdrop-filter: blur(18px) saturate(160%);
      }
      .card .pad{ padding: clamp(18px, 2vw, 28px); }

      /* shared */
      .rows { display:flex; flex-direction:column; gap:20px; }
      .summary .rows { margin-top:14px; }
      .form .rows { margin: 24px 0; }

      .term{ display:flex; align-items:center; gap:10px; color:var(--accent); font-weight:900; font-size:15px; }
      .term svg { width:16px; height:16px; }

      .value{
        color:var(--ink); font-weight:600; line-height:1.35;
        white-space: nowrap;
        word-break: keep-all;
        overflow-wrap: normal;
        min-width: 0;
      }

      .cpy{ display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:12px;
            border:1px solid var(--stroke); background:var(--glass); cursor:pointer; transition:transform .12s ease, background .12s ease, border-color .12s ease; }
      .cpy:hover{ transform:translateY(-1px); border-color:#ffffff3a; background:var(--glass2); }

      /* ---------- FIXED LEFT SUMMARY PANEL ---------- */
      #qe-summary .row {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      #qe-summary .row-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }
      
      #qe-summary .term {
        font-size: 13px;
        color: var(--muted);
        opacity: 0.85;
      }
      
      #qe-summary .value {
        font-size: 16px;
        font-weight: 700;
        color: var(--ink);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      #qe-summary .cpy {
        flex-shrink: 0;
      }

      /* LEFT pane title + copy all */
      .summary .name{ font-size: clamp(22px, 2.4vw, 28px); font-weight:900; margin:0 0 10px; }
      .summary .copy-all{ position:absolute; top:14px; right:14px; }

      /* ---------- RIGHT Edit Form ---------- */
      .form h2{ display:flex; align-items:center; gap:12px; margin:0 0 8px; font-size: clamp(22px, 2.2vw, 28px); font-weight:900; }
      .form h2 svg{ width:22px; height:22px; }
      .note{ margin: 0 0 16px; color:#ffb3ad; font-size:13px; line-height:1.45; }

      .input{
        width:100%; padding: 14px 18px; border-radius:14px;
        border:1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.07); color: var(--ink); outline:none; font-size:16px; font-weight:600;
        transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
      }
      .input::placeholder{ color:#cbd4ee88; }
      .input:focus{ border-color:#ffe081; background: rgba(255,255,255,.10); box-shadow: var(--ring); }
      .help{ margin-top: 8px; font-size: 13px; color: #b9c5ee; opacity: 0.8; }

      .form-row { display: grid; grid-template-columns: 160px 1fr; align-items:center; gap: 16px; }
      @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; gap: 8px; align-items:start; } }

      .switchcard{
        display:flex; gap:14px; align-items:center; user-select:none; cursor:pointer;
        padding:12px 16px; border-radius:14px;
        border:1px solid transparent; background: transparent;
      }
      .switchcard input{ width:22px; height:22px; accent-color: var(--accent); cursor:pointer; }
      .switchcard strong { font-weight:700; color:var(--ink); }

      .actions{
        display:flex; gap:14px; justify-content:flex-end; margin-top: 10px; flex-wrap:wrap;
        background: transparent; border:none; padding:0;
      }
      .btn{
        display:inline-flex; align-items:center; gap:10px;
        padding: 14px 20px; border-radius:16px; font-weight:900; letter-spacing:.2px;
        border:1px solid var(--stroke); cursor:pointer; background: var(--glass); color: var(--ink);
        transition: transform .15s ease, background .15s ease, border-color .15s ease, box-shadow .15s ease;
      }
      .btn svg{ width:18px; height:18px; }
      .btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.12); border-color:#ffffff33; box-shadow: 0 14px 30px rgba(0,0,0,.25); }
      .btn.primary{ background: linear-gradient(180deg, var(--accent), #FFC533); color:#0b1430; border-color: transparent; text-shadow: 0 1px 0 #fff4; }
      .btn.danger { background: linear-gradient(180deg, #ff7b72, #ed5a4f); color:#fff; border-color: transparent; }

      .saving{ pointer-events:none; opacity:.85; position: relative; }
      .saving::after{
        content:""; position:absolute; inset:0; border-radius: 16px;
        background: repeating-linear-gradient(135deg, #fff5, #fff5 12px, #fff0 12px, #fff0 24px);
        animation: qe-wipe 1.1s linear infinite; mix-blend-mode: overlay;
      }
      @keyframes qe-wipe { to { background-position: 48px 0; } }

      .qe-chip:focus-visible, .btn:focus-visible, .cpy:focus-visible, .input:focus-visible { outline:none; box-shadow: var(--ring); }
    `;
    document.documentElement.appendChild(css);
  };

  // ---------- UI build ----------
  const buildUI = () => {
    if ($('#qe-ep')) return;

    const logoutHref =
      ($$('#qusw-banner a').find(a => /logout/i.test(a.textContent||a.title||''))?.href) ||
      '/logout.php';

    // RMS refs (declare once)
    const rmsPref = $('[rmsmodel="Screen_Name"]');
    const rmsCell = $('[rmsmodel="Phone_Cell"]');
    const rmsSMS  = $('[rmsmodel="PerCustFldParcelSMS"]');

    const fullName =
      $('#profile-full-name')?.textContent?.trim() ||
      document.title?.replace(/\s*-\s*.*/,'').trim() ||
      'Student Profile';

    const studentId =
      ($('#profile-student-id')?.textContent || '').replace(/[^\d]/g,'') ||
      ($('[data-student-id]')?.getAttribute('data-student-id') || '').replace(/[^\d]/g,'');

    const shell = document.createElement('div');
    shell.id = 'qe-ep';
    shell.innerHTML = `
      <div class="wrap">
        <header class="qe-topbar" role="banner">
          <div class="qe-brand">
            <div class="qe-title">Student Gateway</div>
            <button class="qe-chip" id="qe-back" aria-label="Back">${ICON.back}<span>Back</span></button>
            <a class="qe-chip" id="qe-home" href="https://studentweb.housing.queensu.ca/" aria-label="Student Web Housing">${ICON.home}<span>Student Web Housing</span></a>
          </div>
          <a class="qe-chip" id="qe-logout" href="${logoutHref}" aria-label="Logout">${ICON.logout}<span>Logout</span></a>
        </header>

        <main class="qe-grid">
          <!-- LEFT: Summary Pane -->
          <section class="card summary" id="qe-summary">
            <div class="pad" style="position:relative">
              <button class="qe-chip copy-all" id="qe-copy-all" title="Copy all">${ICON.copyAll}<span>Copy All</span></button>
              <h3 class="name">${fullName}</h3>
              <div class="rows">
                <div class="row">
                  <div class="row-content">
                    <div class="term">Preferred Name</div>
                    <div class="value" id="sum-pref"></div>
                  </div>
                  <button class="cpy" data-copy="#sum-pref" title="Copy">${ICON.copy}</button>
                </div>
                <div class="row">
                  <div class="row-content">
                    <div class="term">Student ID</div>
                    <div class="value" id="sum-sid">${studentId || '—'}</div>
                  </div>
                  <button class="cpy" data-copy="#sum-sid" title="Copy">${ICON.copy}</button>
                </div>
                <div class="row">
                  <div class="row-content">
                    <div class="term">Cell Phone</div>
                    <div class="value" id="sum-cell"></div>
                  </div>
                  <button class="cpy" data-copy="#sum-cell" title="Copy">${ICON.copy}</button>
                </div>
                <div class="row">
                  <div class="row-content">
                    <div class="term">SMS Subscribed</div>
                    <div class="value" id="sum-sms"></div>
                  </div>
                  <button class="cpy" data-copy="#sum-sms" title="Copy">${ICON.copy}</button>
                </div>
              </div>
            </div>
          </section>

          <!-- RIGHT: Edit Form Pane -->
          <section class="card form" id="qe-form" aria-labelledby="qe-form-heading">
            <div class="pad">
              <h2 id="qe-form-heading">${ICON.pencil}<span>Edit Profile</span></h2>
              <p class="note">To change your legal name, email
                <a href="mailto:reshouse@queensu.ca">reshouse@queensu.ca</a> or call (613) 533-2550.
              </p>

              <div class="rows">
                <div class="form-row">
                  <div class="term">${ICON.pencil} Preferred Name</div>
                  <div class="value">
                    <input id="qe-pref" class="input" type="text" placeholder="Enter your preferred name" />
                    <div class="help">Shown on mail and parcel notices.</div>
                  </div>
                </div>

                <div class="form-row">
                  <div class="term">${ICON.phone} Cell Phone</div>
                  <div class="value">
                    <input id="qe-cell" class="input" type="tel" inputmode="tel" placeholder="(###) ###-####" />
                    <div class="help" id="qe-cell-help">Use a Canadian number for SMS delivery.</div>
                  </div>
                </div>
                
                <div class="form-row">
                    <div class="term">${ICON.bell} Notifications</div>
                    <div class="value">
                        <label class="switchcard" for="qe-sms">
                            <input id="qe-sms" type="checkbox" />
                            <strong>Receive SMS for parcel pick-up</strong>
                        </label>
                    </div>
                </div>
              </div>

              <div class="actions">
                <button class="btn danger"  id="qe-cancel">${ICON.cancel}<span>Cancel</span></button>
                <button class="btn primary" id="qe-save">${ICON.save}<span>Save & Exit</span></button>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;
    const hook = $('#qusw-footer') || document.body;
    hook.parentElement.insertBefore(shell, hook);
    document.documentElement.classList.add('qe-ep-on');

    // ------- live bindings (RMS <-> UI) -------
    const uiPref = $('#qe-pref');
    const uiCell = $('#qe-cell');
    const uiSMS  = $('#qe-sms');
    const helpCell = $('#qe-cell-help');

    // seed from RMS
    const seedPhone = (raw) => {
      const d = (raw||'').replace(/\D+/g,'');
      if (d.length > 6) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
      if (d.length > 3) return `(${d.slice(0,3)}) ${d.slice(3)}`;
      return d;
    };
    uiPref.value = rmsPref?.value || '';
    uiCell.value = seedPhone(rmsCell?.value || '');
    uiSMS.checked = !!rmsSMS?.checked;

    const sumPref = $('#sum-pref');
    const sumCell = $('#sum-cell');
    const sumSMS  = $('#sum-sms');

    const prettyCell = (v) => {
      const d = (v||'').replace(/\D+/g,'');
      if (!d) return '—';
      if (d.length > 6) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
      if (d.length > 3) return `(${d.slice(0,3)}) ${d.slice(3)}`;
      return d;
    };

    const reflect = () => {
      sumPref.textContent = uiPref.value?.trim() || '—';
      sumCell.textContent = prettyCell(uiCell.value);
      sumSMS.textContent  = uiSMS.checked ? 'Yes' : 'No';
    };

    const flagCellValidity = () => {
      const digits = uiCell.value.replace(/\D+/g,'');
      const valid = digits.length >= 10 && digits.length <= 15;
      uiCell.classList.toggle('is-invalid', !valid && digits.length > 0);
      if (helpCell) helpCell.classList.toggle('error', !valid && digits.length > 0);
    };

    reflect();
    flagCellValidity();

    const poke = (el, types = ['input','change','keyup']) => { if (!el) return; types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true }))); };

    uiPref.addEventListener('input', () => {
      if (rmsPref) rmsPref.value = uiPref.value;
      reflect(); poke(rmsPref);
    }, { passive:true });

    uiCell.addEventListener('input', () => {
      const digits = uiCell.value.replace(/\D+/g,'').slice(0, 15);
      let fmt = digits;
      if (digits.length > 6) fmt = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
      else if (digits.length > 3) fmt = `(${digits.slice(0,3)}) ${digits.slice(3)}`;
      uiCell.value = fmt;
      if (rmsCell) rmsCell.value = digits;
      reflect(); flagCellValidity(); poke(rmsCell);
    }, { passive:true });

    uiSMS.addEventListener('change', () => {
      if (rmsSMS) rmsSMS.checked = uiSMS.checked;
      reflect(); poke(rmsSMS, ['change']);
    }, { passive:true });

    // copy helpers
    const flashCheck = (btn) => {
      const original = btn.innerHTML;
      btn.innerHTML = ICON.check;
      btn.style.background = 'rgba(76, 175, 80, .18)';
      btn.style.borderColor = '#a3e6b3';
      setTimeout(() => { btn.innerHTML = original; btn.style.background=''; btn.style.borderColor=''; }, 900);
    };
    $('#qe-copy-all')?.addEventListener('click', () => {
      const payload = [
        `Preferred Name: ${$('#sum-pref').textContent}`,
        `Student ID: ${$('#sum-sid').textContent}`,
        `Cell Phone: ${$('#sum-cell').textContent}`,
        `SMS Subscribed: ${$('#sum-sms').textContent}`
      ].join('\n');
      copyText(payload); flashCheck($('#qe-copy-all'));
    }, { passive:true });
    $$('#qe-summary .cpy').forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = btn.getAttribute('data-copy');
        if (sel) copyText($(sel)?.textContent?.trim() || ''); flashCheck(btn);
      }, { passive:true });
    });

    // actions
    const rmsCancel = $('#NavButtonCancel');
    const rmsSave   = $('#NavButtonFinish');

    $('#qe-back')?.addEventListener('click', (e) => { e.preventDefault(); history.back(); }, { passive:false });

    $('#qe-cancel')?.addEventListener('click', (e) => {
      e.preventDefault(); rmsCancel?.click();
    }, { passive:false });

    $('#qe-save')?.addEventListener('click', (e) => {
      e.preventDefault();
      const wrap = $('#qe-form .pad'); wrap?.classList.add('saving');
      poke(rmsPref); poke(rmsCell); poke(rmsSMS, ['change']);
      setTimeout(() => wrap?.classList.remove('saving'), 6500);
      rmsSave?.click();
    }, { passive:false });
  };

  // ---------- observe SPA swaps ----------
  const observeForRerender = () => {
    const t = $('#qusw-page-container') || document.body;
    const mo = new MutationObserver(() => {
      if (getMode() !== 'enhanced') return;
      if (!inEPContext()) return;
      if (!$('#qe-ep')) { injectCSS(); buildUI(); }
      hideLoaderHard();
    });
    mo.observe(t, { childList:true, subtree:true });
  };

  // ---------- mode toggle ----------
  const MODE_KEY = 'qe_mode_ep';
  const getMode = () => localStorage.getItem(MODE_KEY) || 'enhanced';
  const setMode = (m) => localStorage.setItem(MODE_KEY, m);
  const applyMode = (mode) => {
    if (!inEPContext()) return;
    if (mode === 'native') {
      $('#qe-ep')?.remove(); document.documentElement.classList.remove('qe-ep-on'); hideLoaderHard(); return;
    }
    injectCSS(); if (!$('#qe-ep')) buildUI(); hideLoaderHard();
  };
  const toggleMode = () => { const next = getMode() === 'enhanced' ? 'native' : 'enhanced'; setMode(next); applyMode(next); };
  window.qeToggleEP = toggleMode;
  const keyHandler = (e) => {
    const k = (e.key || '').toLowerCase();
    const combo1 = (e.ctrlKey || e.metaKey) && e.shiftKey && k === 'q';
    const combo2 = e.altKey && e.shiftKey && k === 'q';
    if ((combo1 || combo2) && inEPContext()) { e.preventDefault(); e.stopPropagation(); toggleMode(); }
  };
  document.addEventListener('keydown', keyHandler, true);
  window.addEventListener('keydown', keyHandler, true);

  // ---------- boot ----------
  (async () => {
    try {
      hideLoaderHard();
      await waitFor('#qusw-body');
      await waitFor('[rmsmodel="Screen_Name"], [rmsmodel="Phone_Cell"], [rmsmodel="PerCustFldParcelSMS"]', 9000).catch(()=>{});
      if (!isEditProfile()) return;
      const mode = getMode();
      document.documentElement.classList.add('qe-ep-on');
      applyMode(mode);
      if (mode === 'enhanced') observeForRerender();
    } catch { /* no-op */ }
  })();
})();