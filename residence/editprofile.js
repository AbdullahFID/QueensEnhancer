// residence/editprofile.js
(() => {
  if (window.__qeEditProfileBooted) return;
  window.__qeEditProfileBooted = true;

  if (location.hostname !== 'studentweb.housing.queensu.ca') return;

  // ---------- helpers ----------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const waitFor = (sel, t = 10000) => new Promise((res, rej) => {
    const first = $(sel); if (first) return res(first);
    const mo = new MutationObserver(() => { const hit = $(sel); if (hit) { mo.disconnect(); res(hit); }});
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => { mo.disconnect(); rej(new Error('timeout ' + sel)); }, t);
  });

  const isEditProfile = () => {
    const headingHit = $$('.panel-heading').some(h =>
      /\bedit profile\b/i.test(h.textContent || '')
    ) || /\bedit profile\b/i.test($('#qusw-panel-title')?.value || '');

    // must see at least one of the RMS inputs unique to Edit Profile
    const hasRMS =
      !!document.querySelector('[rmsmodel="Screen_Name"]') ||
      !!document.querySelector('[rmsmodel="Phone_Cell"]') ||
      !!document.querySelector('[rmsmodel="PerCustFldParcelSMS"]');

    return headingHit && hasRMS;
  };

  // consider us "on EP" if our shell is on OR native EP bits are detectable
  const inEPContext = () =>
    document.documentElement.classList.contains('qe-ep-on') || isEditProfile();

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
    t.textContent = msg; t.style.opacity = '1'; clearTimeout(t._h); t._h = setTimeout(()=> t.style.opacity='0', 900);
  };
  const copyText = async (text) => {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); toast('Copied'); }
      else {
        const ta = document.createElement('textarea'); ta.value = text;
        ta.style.position='fixed'; ta.style.inset='-9999px'; document.body.appendChild(ta);
        ta.select(); document.execCommand('copy'); ta.remove(); toast('Copied');
      }
    } catch { toast('Copy failed'); }
  };

  // ---------- icons ----------
  const ICON = {
    logout: `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-log-out" viewBox="0 0 24 24"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>`,
    back:   `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-undo-2" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>`,
    home:   `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-house" viewBox="0 0 24 24"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    pencil: `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-pencil-line" viewBox="0 0 24 24"><path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/></svg>`,
    phone:  `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-phone" viewBox="0 0 24 24"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/></svg>`,
    save:   `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-save" viewBox="0 0 24 24"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>`,
    cancel: `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-ban" viewBox="0 0 24 24"><path d="M4.929 4.929 19.07 19.071"/><circle cx="12" cy="12" r="10"/></svg>`,
    copy:   `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-copy" viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
    copyAll:`<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-clipboard-copy" viewBox="0 0 24 24"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 1 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>`,
    check:  `<svg xmlns="http://www.w3.org/2000/svg" class="lucide lucide-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`
  };

  // ---------- CSS (full navy gradient, larger details, white copy icons) ----------
  const injectCSS = () => {
    if ($('#qe-ep-css')) return;
    const css = document.createElement('style');
    css.id = 'qe-ep-css';
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
        --maxw: min(1500px, 96vw);
      }

      /* hide native chrome + ALL footers/banners when enhanced is on */
      .qe-ep-on #qusw-banner,
      .qe-ep-on #qusw-page-container > #qusw-body,
      .qe-ep-on #qusw-buttons-wrapper,
      .qe-ep-on #qusw-footer,
      .qe-ep-on #qe-premium-banner,
      .qe-ep-on #qe-premium-footer,
      .qe-ep-on [id^="qe-mode"],
      .qe-ep-on [data-qe="mode-banner"] { display: none !important; }
      .qe-ep-on #qusw-loader { display: none !important; }
      #qusw-widget-room-assignment { display: none !important; }

      /* fill the whole page */
      html, body { background: #08122a !important; }
      #qe-ep {
        background: var(--qe-bg);
        min-height: 100vh;
        position: relative;
        color: var(--ink);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, "Helvetica Neue", Arial;
      }
      #qe-ep .wrap { max-width: var(--maxw); margin: 0 auto; padding: clamp(22px, 4vw, 40px); }

      /* header actions */
      .qe-topbar { display:flex; align-items:center; justify-content:space-between; margin-bottom: clamp(18px, 2.6vw, 28px); }
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
      }
      .qe-chip svg { width:18px; height:18px; }
      .qe-chip:hover { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(0,0,0,.35); border-color:#ffffff33; background: rgba(255,255,255,.12); }

      /* main columns */
      .qe-main { display:grid; grid-template-columns: 1.1fr 2fr; gap: clamp(18px, 2.2vw, 34px); }
      @media (max-width: 1180px){ .qe-main { grid-template-columns: 1fr; } }

      /* cards */
      .qe-card {
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

      /* profile (bigger labels/values so nothing crunches) */
      .qe-profile h3 { margin:0 0 16px; font-weight:900; font-size: clamp(22px, 2.4vw, 30px); }
      .qe-profile .copy-all{
        position:absolute; top:16px; right:16px;
        display:inline-flex; align-items:center; gap:10px;
        background: rgba(255,255,255,.14); border:1px solid #ffffff33; color:#fff;
        padding:10px 12px; border-radius:14px; cursor:pointer; transition: transform .15s ease, background .15s ease;
      }
      .qe-profile .copy-all:hover{ transform: translateY(-1px); background: rgba(255,255,255,.18); }
      .qe-profile .copy-all svg{ width:18px; height:18px; color:#fff; }

      .qe-list { list-style:none; padding:0; margin: 6px 0 0; }
      .qe-row {
        display:grid; grid-template-columns: 300px 1fr auto;
        align-items:center; gap:16px; padding:18px 0;
        border-bottom:1px dashed #ffffff22;
        font-size: clamp(18px, 2vw, 20px);
      }
      .qe-row:last-child{ border-bottom:none; }
      .qe-term { color: var(--accent); font-weight: 900; }
      .qe-value { color: var(--ink); font-weight: 600; line-height: 1.4; }
      @media (max-width: 820px){
        .qe-row{ grid-template-columns: 1fr auto; }
        .qe-term{ grid-column: 1 / -1; }
      }
      .qe-row .copy{
        color:#fff;
        border:1px solid #ffffff33; background: rgba(255,255,255,.12);
        border-radius:12px; padding:8px; cursor:pointer;
        transition: transform .12s ease, background .12s ease, border-color .12s ease;
      }
      .qe-row .copy:hover{ transform: translateY(-1px); background: rgba(255,255,255,.18); border-color:#ffffff66; }
      .qe-row .copy svg{ width:20px; height:20px; color:#fff; }

      /* form */
      .qe-form h3 { margin:0 0 8px; display:flex; align-items:center; gap:10px; font-weight:900; font-size: clamp(22px, 2.2vw, 28px); }
      .qe-form h3 svg { width:20px; height:20px; }
      .qe-form .qe-sub { margin: 0 0 16px; color: #ffb3ad; font-size: 13px; }

      .qe-field { margin: 18px 0; }
      .qe-label { display:flex; align-items:center; gap:10px; color: var(--accent); font-weight: 900; margin-bottom: 8px; font-size: 18px; }
      .qe-label svg { width:18px; height:18px; }
      .qe-input{
        width:100%; padding: 16px 18px; border-radius:16px;
        border:1px solid rgba(255,255,255,0.18);
        background: rgba(255,255,255,0.07); color: var(--ink); outline:none; font-size: 16px; font-weight:600;
      }
      .qe-input::placeholder{ color:#cbd4ee88; }
      .qe-input:focus{ border-color:#ffe081; box-shadow: var(--ring); }

      .qe-check{ display:flex; gap:12px; align-items:center; margin-top: 12px; }
      .qe-check input{ width:20px; height:20px; accent-color: var(--accent); }

      .qe-actions{ display:flex; gap:14px; justify-content:flex-end; margin-top: 24px; flex-wrap:wrap; }
      .qe-btn{
        display:inline-flex; align-items:center; gap:10px;
        padding: 14px 20px; border-radius:16px; font-weight:900; letter-spacing:.2px;
        border:1px solid var(--stroke); cursor:pointer; background: var(--glass); color: var(--ink);
        transition: transform .15s ease, background .15s ease, border-color .15s ease, box-shadow .15s ease;
      }
      .qe-btn svg{ width:18px; height:18px; }
      .qe-btn:hover{ transform: translateY(-1px); background: rgba(255,255,255,.12); border-color:#ffffff33; box-shadow: 0 14px 30px rgba(0,0,0,.25); }
      .qe-btn.primary{ background: linear-gradient(180deg, var(--accent), #FFC533); color:#0b1430; border-color: transparent; text-shadow: 0 1px 0 #fff4; }
      .qe-btn.danger { background: linear-gradient(180deg, #ff7b72, #ed5a4f); color:#fff; border-color: transparent; }

      .qe-saving { pointer-events:none; opacity:.85; position: relative; }
      .qe-saving::after{
        content:""; position:absolute; inset:0; border-radius: inherit;
        background: repeating-linear-gradient(135deg, #fff5, #fff5 12px, #fff0 12px, #fff0 24px);
        animation: qe-wipe 1.1s linear infinite; mix-blend-mode: overlay;
      }
      @keyframes qe-wipe { to { background-position: 48px 0; } }

      .lucide { width: 1em; height: 1em; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    `;
    document.documentElement.appendChild(css);
  };

  // ---------- UI build (no mode toggle / no banner) ----------
  const buildUI = () => {
    if ($('#qe-ep')) return;

    const logoutHref =
      ($$('#qusw-banner a').find(a => /logout/i.test(a.textContent||a.title||''))?.href) ||
      '/logout.php';

    const fullName   = $('#profile-full-name')?.textContent?.trim() || 'Student Profile';
    const prefLine   = $('#profile-preferred-name')?.textContent?.replace(/^\s*Preferred Name:\s*/i,'').trim() || '';
    const sidLine    = $('#profile-student-id')?.textContent?.replace(/^\s*Student ID:\s*/i,'').trim() || '';
    const cellLine   = $('#profile-cell-phone')?.textContent?.replace(/^\s*Cell Phone:\s*/i,'').trim() || '';
    const emailLine  = $('#profile-queens-email')?.textContent?.replace(/^\s*Queen\'?s Email:\s*/i,'').trim() || '';
    const smsLine    = $('#profile-sms-subscribed')?.textContent?.replace(/^\s*SMS Subscribed:\s*/i,'').trim() || '';

    const shell = document.createElement('div');
    shell.id = 'qe-ep';
    shell.innerHTML = `
      <div class="wrap">
        <div class="qe-topbar">
          <div class="qe-left">
            <div class="qe-title">Student Gateway</div>
            <button class="qe-chip" id="qe-back">${ICON.back}<span>Back</span></button>
            <a class="qe-chip" id="qe-home" href="https://studentweb.housing.queensu.ca/">${ICON.home}<span>Student Web Housing</span></a>
          </div>
          <div class="qe-actions-bar">
            <a class="qe-chip" id="qe-logout" href="${logoutHref}">${ICON.logout}<span>Logout</span></a>
          </div>
        </div>

        <div class="qe-main">
          <section class="qe-card qe-profile" id="qe-profile-card">
            <button class="copy-all" id="qe-copy-all">${ICON.copyAll}<span>Copy</span></button>
            <h3>${fullName}</h3>
            <ul class="qe-list">
              <li class="qe-row">
                <div class="qe-term">Preferred Name</div>
                <div class="qe-value" id="qe-sum-pref">${prefLine}</div>
                <button class="copy" data-copy="#qe-sum-pref" title="Copy">${ICON.copy}</button>
              </li>
              <li class="qe-row">
                <div class="qe-term">Student ID</div>
                <div class="qe-value">${sidLine}</div>
                <button class="copy" data-text="${sidLine}" title="Copy">${ICON.copy}</button>
              </li>
              <li class="qe-row">
                <div class="qe-term">Cell Phone</div>
                <div class="qe-value" id="qe-sum-cell">${cellLine}</div>
                <button class="copy" data-copy="#qe-sum-cell" title="Copy">${ICON.copy}</button>
              </li>
              <li class="qe-row">
                <div class="qe-term">Queen’s Email</div>
                <div class="qe-value">${emailLine}</div>
                <button class="copy" data-text="${emailLine}" title="Copy">${ICON.copy}</button>
              </li>
              <li class="qe-row">
                <div class="qe-term">SMS Subscribed</div>
                <div class="qe-value" id="qe-sum-sms">${smsLine}</div>
                <button class="copy" data-copy="#qe-sum-sms" title="Copy">${ICON.copy}</button>
              </li>
            </ul>
          </section>

          <section class="qe-card qe-form">
            <h3>${ICON.pencil}<span>Edit Profile</span></h3>
            <p class="qe-sub">If you need to change your name, please email Residence Admissions at
              <a href="mailto:reshouse@queensu.ca">reshouse@queensu.ca</a> or call (613) 533-2550.</p>

            <div class="qe-field">
              <label class="qe-label" for="qe-pref">${ICON.pencil}<span>Preferred Name</span></label>
              <input id="qe-pref" class="qe-input" type="text" autocomplete="name" placeholder="Your preferred name">
            </div>

            <div class="qe-field">
              <label class="qe-label" for="qe-cell">${ICON.phone}<span>Cell Phone</span></label>
              <input id="qe-cell" class="qe-input" type="tel" inputmode="tel" placeholder="(###) ###-####">
            </div>

            <div class="qe-field qe-check">
              <input id="qe-sms" type="checkbox">
              <label for="qe-sms"><strong>Receive SMS notifications for parcel pick up</strong></label>
            </div>

            <div class="qe-actions">
              <button class="qe-btn danger"  id="qe-cancel">${ICON.cancel}<span>Cancel</span></button>
              <button class="qe-btn primary" id="qe-save">${ICON.save}<span>Save & Exit</span></button>
            </div>
          </section>
        </div>
      </div>
    `;
    const footer = $('#qusw-footer') || document.body;
    footer.parentElement.insertBefore(shell, footer);
    document.documentElement.classList.add('qe-ep-on');

    // Copy handlers (rows + whole card) with white -> checkmark success state
    const flashCheck = (btn) => {
      const original = btn.innerHTML;
      btn.innerHTML = ICON.check;
      btn.style.background = 'rgba(76, 175, 80, .18)';
      btn.style.borderColor = '#a3e6b3';
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.background = '';
        btn.style.borderColor = '';
      }, 900);
    };

    $('#qe-copy-all')?.addEventListener('click', () => {
      const lines = $$('#qe-profile-card .qe-row').map(row => {
        const k = row.querySelector('.qe-term')?.textContent?.trim();
        const v = row.querySelector('.qe-value')?.textContent?.trim();
        return `${k}: ${v}`;
      }).join('\n');
      copyText(lines);
      flashCheck($('#qe-copy-all'));
    }, { passive: true });

    $$('#qe-profile-card .copy').forEach(btn => {
      btn.addEventListener('click', () => {
        const sel = btn.getAttribute('data-copy');
        const txt = btn.getAttribute('data-text');
        if (sel) copyText($(sel)?.textContent?.trim() || '');
        else copyText(txt || '');
        flashCheck(btn);
      }, { passive: true });
    });

    // Back button
    $('#qe-back')?.addEventListener('click', (e) => { e.preventDefault(); history.back(); }, { passive: true });
  };

  // ---------- bind UI <-> RMS inputs so Save works ----------
  const bindMirrors = () => {
    const inpPref = $('[rmsmodel="Screen_Name"]');
    const inpCell = $('[rmsmodel="Phone_Cell"]');
    const inpSMS  = $('[rmsmodel="PerCustFldParcelSMS"]');
    if (!inpPref || !inpCell || !inpSMS) return;

    const uiPref = $('#qe-pref');
    const uiCell = $('#qe-cell');
    const uiSMS  = $('#qe-sms');

    // seed RMS → UI
    uiPref.value = inpPref.value || '';
    uiCell.value = inpCell.value || '';
    uiSMS.checked = !!inpSMS.checked;

    const sumPref = $('#qe-sum-pref');
    const sumCell = $('#qe-sum-cell');
    const sumSMS  = $('#qe-sum-sms');

    const prettyCell = v => {
      const d = (v||'').replace(/\D+/g,'');
      if (d.length >= 10) return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`;
      if (d.length >= 7)  return `(${d.slice(0,3)}) ${d.slice(3)}`;
      return v || '';
    };
    sumPref.textContent = uiPref.value || '';
    sumCell.textContent = prettyCell(uiCell.value);
    sumSMS.textContent  = uiSMS.checked ? 'Yes' : 'No';

    const poke = (el, types = ['input','change','keyup']) => {
      types.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
    };

    uiPref.addEventListener('input', () => {
      inpPref.value = uiPref.value;
      sumPref.textContent = uiPref.value.trim();
      poke(inpPref);
    }, { passive:true });

    uiCell.addEventListener('input', () => {
      inpCell.value = uiCell.value;
      sumCell.textContent = prettyCell(uiCell.value);
      poke(inpCell);
    }, { passive:true });

    uiSMS.addEventListener('change', () => {
      inpSMS.checked = uiSMS.checked;
      sumSMS.textContent = uiSMS.checked ? 'Yes' : 'No';
      poke(inpSMS, ['change']);
    }, { passive:true });

    // Buttons proxy native handlers (so server flow stays intact)
    const btnCancel = $('#qe-cancel');
    const btnSave   = $('#qe-save');
    const rmsCancel = $('#NavButtonCancel');
    const rmsSave   = $('#NavButtonFinish');

    btnCancel.onclick = (e) => { e.preventDefault(); rmsCancel?.click(); };
    btnSave.onclick = (e) => {
      e.preventDefault();
      const form = $('#qe-ep .qe-form'); form?.classList.add('qe-saving');
      poke(inpPref); poke(inpCell); poke(inpSMS, ['change']);
      setTimeout(() => form?.classList.remove('qe-saving'), 6500);
      rmsSave?.click();
    };
  };

  // ---------- reapply on dynamic swaps (only when Enhanced is active) ----------
  const observeForRerender = () => {
    const t = $('#qusw-page-container') || document.body;
    const mo = new MutationObserver(() => {
      if (getMode() !== 'enhanced') return; // don't rebuild while in Native
      if (!inEPContext()) return;
      if (!$('#qe-ep')) { injectCSS(); buildUI(); bindMirrors(); }
      hideLoaderHard();
    });
    mo.observe(t, { childList: true, subtree: true });
  };

  /* ---- View toggle (Ctrl/Cmd+Shift+Q; Alt+Shift+Q fallback) ---- */
  const MODE_KEY = 'qe_mode_ep';
  const getMode = () => localStorage.getItem(MODE_KEY) || 'enhanced';
  const setMode = (m) => localStorage.setItem(MODE_KEY, m);

  const applyMode = (mode) => {
    if (!inEPContext()) return; // softer gate

    if (mode === 'native') {
      $('#qe-ep')?.remove();
      document.documentElement.classList.remove('qe-ep-on');
      hideLoaderHard();
      return;
    }

    injectCSS();
    if (!$('#qe-ep')) buildUI();

    // schedule binding without rIC options
    const idle = window.requestIdleCallback
      ? (cb) => window.requestIdleCallback(cb)
      : (cb) => setTimeout(cb, 0);

    idle(() => {
      const el = document.querySelector('[rmsmodel="Screen_Name"]');
      if (el) bindMirrors();
      else waitFor('[rmsmodel="Screen_Name"]').then(bindMirrors).catch(()=>{});
    });

    hideLoaderHard();
  };

  const toggleMode = () => {
    const next = getMode() === 'enhanced' ? 'native' : 'enhanced';
    setMode(next);
    applyMode(next);
  };

  // expose a console helper in case shortcuts are intercepted
  window.qeToggleEP = toggleMode;

  const keyHandler = (e) => {
    const k = (e.key || '').toLowerCase();
    const combo1 = (e.ctrlKey || e.metaKey) && e.shiftKey && k === 'q';
    const combo2 = e.altKey && e.shiftKey && k === 'q'; // extra fallback
    if ((combo1 || combo2) && inEPContext()) {
      e.preventDefault(); e.stopPropagation();
      toggleMode();
    }
  };
  document.addEventListener('keydown', keyHandler, true);
  window.addEventListener('keydown', keyHandler, true);

  // ---------- boot ----------
  (async () => {
    try {
      hideLoaderHard();
      await waitFor('#qusw-body');
      // wait for RMS controls to exist; if they never appear, we abandon quietly
      await waitFor('[rmsmodel="Screen_Name"], [rmsmodel="Phone_Cell"], [rmsmodel="PerCustFldParcelSMS"]', 8000).catch(()=>{});
      if (!isEditProfile()) return;

      const mode = getMode();
      applyMode(mode);
      if (mode === 'enhanced') observeForRerender(); // only observe in Enhanced
    } catch (_) {}
  })();
})();
