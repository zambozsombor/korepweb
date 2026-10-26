/* papaimatek.hu — Supabase auth + haladás (közös modul)
   Betöltés: a @supabase/supabase-js UMD SDK UTÁN, mindkét oldalon.
   Publikus kulcs — szánt szándékkal a kliensben. A service_role/secret SOHA nem ide való. */
(function () {
  'use strict';

  var SUPABASE_URL = 'https://duiskdduecldmkuylckb.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1aXNrZGR1ZWNsZG1rdXlsY2tiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkxMTYyNTEsImV4cCI6MjEwNDY5MjI1MX0.Z2pFeQhNQwQtvRQyRSB69NzpKzCYJ0Kg3s-scXyetYY';

  var GICON = 'data:image/png;base64,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';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[auth] A Supabase SDK nem töltődött be (ellenőrizd a <script> sorrendet).');
    return;
  }

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { flowType: 'implicit', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true }
  });
  var PM = window.PM = window.PM || {};
  PM.sb = sb;
  var curProfile = null;

  var listeners = [];
  PM.onChange = function (cb) { if (typeof cb === 'function') listeners.push(cb); };

  /* ---------- segédfüggvények ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }
  function firstName(user) {
    var m = user && user.user_metadata || {};
    var n = m.given_name || m.full_name || m.name;
    if (n) return String(n).trim().split(/\s+/)[0];
    if (user && user.email) return user.email.split('@')[0];
    return 'Diák';
  }
  var TOPICS = ['Alapműveletek, számelmélet', 'Mértékegység átváltások', 'Kombinatorika, logika', 'Feleletválasztós feladatok (karikázós, igaz-hamis)', 'A bekövetkezés valószínűsége', 'Sorozatok', 'Grafikonok, diagramok, táblázatok', 'Függvények, koordináta-rendszer, kapcsolódó egyenletek', 'Egyenletek', 'Síkgeometria', 'Térgeometria', 'Arány, százalék', 'Átlag', 'Egyenlettel megoldható feladatok (egyenes arányosság, logika)', 'Egyenlettel megoldható feladatok (hozzáad, elvesz, több, kevesebb stb.)', 'Egyéb egyenlettel megoldható feladatok'];

  /* ---------- stílus (téma-illesztéssel) ---------- */
  (function injectStyles() {
    var css = ''
      + '.header-right{display:flex;align-items:center;gap:10px;}'
      + '.auth-area{display:flex;align-items:center;}'
      + '.pm-btn{font-family:"Alegreya Sans",sans-serif;font-weight:700;border-radius:999px;cursor:pointer;border:none;line-height:1;transition:filter .15s ease,background .15s ease;}'
      + '.pm-btn:hover{filter:brightness(1.05);}'
      + '.pm-login{background:var(--patina-soft);color:#164F47;padding:10px 18px;font-size:15.5px;}'
      + '.pm-user{display:flex;align-items:center;gap:9px;}'
      + '.pm-hi{color:var(--ink);font-weight:700;font-size:15px;white-space:nowrap;}'
      + '.pm-logout{background:transparent;border:1.5px solid #DCE0DA;color:var(--ink);padding:7px 13px;font-size:14px;}'
      + '.pm-overlay{position:fixed;inset:0;background:rgba(29,39,51,0.45);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;z-index:1000;opacity:0;pointer-events:none;transition:opacity .2s ease;}'
      + '.pm-overlay.open{opacity:1;pointer-events:auto;}'
      + '.pm-card{background:var(--paper);color:var(--ink);border:1px solid #DCE0DA;border-radius:24px;box-shadow:0 24px 60px rgba(29,39,51,0.14);max-width:420px;width:100%;max-height:88vh;overflow:auto;padding:30px 26px;position:relative;transform:translateY(8px);transition:transform .2s ease;}'
      + '.pm-acc-label select{display:block;width:100%;margin-top:6px;padding:11px 14px;border-radius:12px;border:1.5px solid #DCE0DA;background:var(--bg);color:var(--ink);font-family:"Alegreya Sans",sans-serif;font-size:16px;box-sizing:border-box;}'
      + '.pm-overlay.open .pm-card{transform:translateY(0);}'
      + '.pm-card h3{font-family:"Alegreya Sans",sans-serif;margin:0 0 8px;font-size:23px;color:var(--ink);}'
      + '.pm-card p{margin:0 0 18px;font-size:15.5px;line-height:1.55;color:var(--muted);}'
      + '.pm-x{position:absolute;top:14px;right:16px;background:transparent;border:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1;}'
      + '.pm-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;font-family:"Alegreya Sans",sans-serif;font-weight:700;font-size:16.5px;border:none;border-radius:999px;padding:13px 18px;cursor:pointer;}'
      + '.pm-google:hover{filter:brightness(.97);}'
      + '.pm-gicon{width:20px;height:20px;display:inline-block;object-fit:contain;vertical-align:middle;}'
      + '.pm-note{margin-top:16px;font-size:13px;color:var(--muted);line-height:1.5;}'
      + '.pm-consent label{display:flex;gap:10px;align-items:flex-start;font-size:15px;color:var(--ink);cursor:pointer;margin:6px 0 16px;}'
      + '.pm-consent input[type=checkbox]{margin-top:3px;width:18px;height:18px;flex:none;accent-color:var(--patina);}'
      + '.pm-consent2{display:flex;flex-direction:column;gap:12px;margin:4px 0 18px;text-align:left;}'
      + '.pm-consent2 label{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--ink);cursor:pointer;line-height:1.5;}'
      + '.pm-consent2 input[type=checkbox]{margin-top:2px;width:18px;height:18px;flex:none;accent-color:var(--patina);}'
      + '.pm-consent2 a{color:var(--patina);}'
      + '.pm-primary{width:100%;background:var(--patina);color:#fff;font-family:"Alegreya Sans",sans-serif;font-weight:700;font-size:16.5px;border:none;border-radius:999px;padding:13px 18px;cursor:pointer;}'
      + '.pm-primary:disabled{opacity:.5;cursor:not-allowed;}'
      + '.pm-linkbtn{display:inline-block;background:none;border:none;color:var(--muted);font-size:13.5px;text-decoration:underline;cursor:pointer;margin-top:12px;padding:0;}'
      + '.pm-user{position:relative;display:flex;align-items:center;}'
      + '.pm-avatar{width:40px;height:40px;border-radius:50%;border:2px solid #DCE0DA;background:var(--patina);color:#fff;font-family:"Alegreya Sans",sans-serif;font-weight:800;font-size:18.5px;cursor:pointer;overflow:hidden;padding:0;display:flex;align-items:center;justify-content:center;}'
      + '.pm-avatar img{width:100%;height:100%;object-fit:cover;display:block;}'
      + '.pm-avatar:hover{filter:brightness(1.05);}'
      + '.pm-menu{position:absolute;top:calc(100% + 10px);right:0;background:var(--paper);border:1px solid #DCE0DA;border-radius:16px;box-shadow:0 18px 40px rgba(29,39,51,0.14);padding:8px;min-width:210px;display:flex;flex-direction:column;gap:2px;z-index:300;}'
      + '.pm-menu[hidden]{display:none!important;}'
      + '.pm-menu-name{font-family:"Alegreya Sans",sans-serif;font-weight:700;font-size:15px;color:var(--ink);padding:8px 12px 8px;border-bottom:1px solid #DCE0DA;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
      + '.pm-menu-item{display:block;text-align:left;background:transparent;border:none;color:var(--ink);font-family:"Alegreya Sans",sans-serif;font-weight:600;font-size:15.5px;padding:11px 12px;border-radius:10px;cursor:pointer;text-decoration:none;}'
      + '.pm-menu-item:hover{background:var(--hover);}'
      + '.pm-menu-item.pm-danger{color:#b3261e;}'
      + '.pm-acc-av{display:flex;align-items:center;gap:16px;margin:6px 0 18px;}'
      + '.pm-acc-avpic{width:72px;height:72px;border-radius:50%;overflow:hidden;background:var(--patina);color:#fff;display:flex;align-items:center;justify-content:center;font-family:"Alegreya Sans",sans-serif;font-weight:800;font-size:30px;flex:none;}'
      + '.pm-acc-avpic img{width:100%;height:100%;object-fit:cover;}'
      + '.pm-acc-upload{background:transparent;border:1.5px solid #DCE0DA;color:var(--ink);font-family:"Alegreya Sans",sans-serif;font-weight:700;font-size:14.5px;padding:9px 14px;border-radius:999px;cursor:pointer;display:inline-block;}'
      + '.pm-acc-label{display:block;font-size:14px;color:var(--muted);margin-bottom:16px;font-weight:600;}'
      + '.pm-acc-label input{display:block;width:100%;margin-top:6px;padding:11px 14px;border-radius:12px;border:1.5px solid #DCE0DA;background:var(--bg);color:var(--ink);font-family:"Alegreya Sans",sans-serif;font-size:16px;box-sizing:border-box;}'
      + '.pm-acc-check{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;color:var(--ink);cursor:pointer;line-height:1.5;margin:2px 0 18px;}'
      + '.pm-acc-check input[type=checkbox]{margin-top:2px;width:18px;height:18px;flex:none;accent-color:var(--patina);}'
      + '.pm-login-cta{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;background:var(--paper);border:1px solid #DCE0DA;border-radius:18px;padding:14px 20px;margin:0 auto 18px;max-width:680px;text-align:center;}'
      + '.pm-login-cta .cta-txt{font-family:"Alegreya Sans",sans-serif;font-weight:700;font-size:16px;color:var(--ink);}'
      + '.pm-cta-login{background:var(--patina-soft);color:#164F47;font-family:"Alegreya Sans",sans-serif;font-weight:700;font-size:15px;border:none;border-radius:999px;padding:9px 18px;cursor:pointer;white-space:nowrap;}'
      + '.pm-cta-login:hover{filter:brightness(1.05);}'
      + '.pm-reg{background:transparent;border:1.5px solid #DCE0DA;color:var(--ink);padding:8.5px 16px;font-size:15px;margin-right:8px;}'
      + '.pm-tabs{display:flex;gap:4px;background:rgba(29,39,51,0.072);border-radius:999px;padding:4px;margin:0 30px 18px 0;}'
      + '.pm-tabs button{flex:1;border:none;background:transparent;color:var(--muted);font-family:"Alegreya Sans",sans-serif;font-weight:700;font-size:16px;padding:9px 12px;border-radius:999px;cursor:pointer;}'
      + '.pm-tabs button[aria-selected="true"]{background:var(--patina);color:#fff;}'
      + '.pm-or{display:flex;align-items:center;gap:10px;margin:16px 0 12px;color:var(--muted);font-size:13.5px;}'
      + '.pm-or::before,.pm-or::after{content:"";flex:1;height:1px;background:rgba(29,39,51,0.08);}'
      + '.pm-form .pm-acc-label{margin-bottom:12px;}'
      + '.pm-msg{min-height:1.2em;font-size:14.5px;color:#b3261e;margin:2px 0 10px;}'
      + '.pm-msg.ok{color:var(--patina);}'
      + '.pm-switch{margin-top:14px;font-size:14.5px;color:var(--muted);}'
      + '.pm-switch .pm-linkbtn{margin:0;font-size:14.5px;color:var(--patina);}'
      + '.pm-google:disabled{opacity:.5;cursor:not-allowed;}'
      + '.pm-tabs[hidden],.pm-pane[hidden]{display:none!important;}'
      + '.pm-login{background:#1F6F64;color:#fff;border-radius:8px;}.pm-login:hover{background:#185A51;filter:none;}.pm-reg{border-radius:8px;}.pm-card{font-family:"Alegreya Sans",system-ui,sans-serif;border-radius:18px;}.pm-linkbtn,.pm-tabs button,.pm-menu-item,.pm-primary,.pm-google{font-family:inherit;}.pm-primary{border-radius:10px;}.pm-google{border:1px solid #DCE0DA;border-radius:10px;}.pm-cta-login{background:#1F6F64;color:#fff;border-radius:8px;}.pm-login-cta{background:#FFFFFD;border:1px solid #DCE0DA;}'
      + '.pm-rate-pop{position:fixed;z-index:3000;background:#FFFFFD;border:1px solid #DCE0DA;border-radius:14px;box-shadow:0 18px 40px rgba(29,39,51,.16);padding:12px;font-family:"Alegreya Sans",system-ui,sans-serif;color:#1D2733;width:248px;}'
      + '.pm-rate-pop .pr-t{font-weight:700;font-size:15px;margin:0 0 8px;}'
      + '.pm-rate-row{display:flex;gap:6px;}'
      + '.pm-rate-b{flex:1;height:38px;border-radius:9px;border:1.5px solid #DCE0DA;background:#F6F5EF;color:#1D2733;font:800 16px "Alegreya Sans",sans-serif;cursor:pointer;padding:0;transition:transform .1s;}'
      + '.pm-rate-b:hover{transform:translateY(-1px);border-color:var(--rc);}'
      + '.pm-rate-b.on{background:var(--rc);border-color:var(--rc);color:#fff;}'
      + '.pm-rate-lbl{display:flex;justify-content:space-between;font-size:12.5px;color:#5B6672;margin-top:5px;}'
      + '.pm-rate-x{margin-top:10px;background:none;border:0;color:#5B6672;text-decoration:underline;font:500 13.5px "Alegreya Sans",sans-serif;cursor:pointer;padding:0;}'
      + '.pm-rate-chip{display:inline-flex;align-items:center;justify-content:center;min-width:26px;height:26px;padding:0 5px;border-radius:8px;border:2px solid #DCE0DA;background:#FFFFFD;color:transparent;font:800 14.5px "Alegreya Sans",sans-serif;cursor:pointer;flex:none;line-height:1;}'
      + '.pm-rate-chip:hover{border-color:#1F6F64;}'
      + '.pm-rate-chip.on{border-color:var(--rc,#1F6F64);background:var(--rc,#1F6F64);color:#fff;}'
      + '.pm-rate-inline{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;}'
      + '.pm-rate-inline .pri-t{font-weight:700;font-size:14.5px;margin-right:2px;color:#1D2733;}'
      + '.pm-rate-inline .pm-rate-b{flex:none;width:34px;height:34px;font-size:15px;}'
      + '.pm-rate-badge{display:inline-flex;align-items:center;gap:5px;font:700 12.5px "Alegreya Sans",sans-serif;color:#fff;background:var(--rc);border-radius:999px;padding:2px 9px;white-space:nowrap;}'
      + '@media(max-width:760px){.header-right{gap:8px;}.pm-login,.pm-reg{padding:7px 11px;font-size:13px;}.pm-reg{margin-right:4px;}.header-cta{font-size:12.5px;padding:7px 11px;}}';
    var st = document.createElement('style');
    st.id = 'pm-auth-style';
    st.textContent = css;
    document.head.appendChild(st);
  })();

  /* ---------- overlay építő ---------- */
  function makeOverlay(innerHTML) {
    var ov = document.createElement('div');
    ov.className = 'pm-overlay';
    ov.innerHTML = '<div class="pm-card">' + innerHTML + '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(ov); });
    return ov;
  }
  function open(ov) { requestAnimationFrame(function () { ov.classList.add('open'); }); }
  function close(ov) { ov.classList.remove('open'); setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 220); }

  /* ---------- belépés / regisztráció modal ---------- */
  var CONSENT_HTML = ''
    + '<div class="pm-consent2">'
    +   '<label><input type="checkbox" class="pmTerms"><span>Elolvastam és elfogadom az <a href="/adatkezeles.html" target="_blank" rel="noopener">adatkezelési tájékoztatót</a>, és hozzájárulok, hogy a nevem és e-mail-címem a fiókomhoz tárolják a haladás mentéséhez — <b>visszavonásig</b>.</span></label>'
    +   '<label><input type="checkbox" class="pmMkt"><span>Szeretnék később <b>marketing célú</b> megkereséseket (pl. új feladatok, hírek) kapni e-mailben. Ez nem feltétele a regisztrációnak, és bármikor visszavonható.</span></label>'
    + '</div>';
  function savePending(mkt) {
    try { localStorage.setItem('pm_pending_consent', JSON.stringify({ terms:true, marketing: !!mkt, at: new Date().toISOString()})); } catch (e) {}
  }
  function authErr(e) {
    var m = (e && (e.message || e.error_description)) || String(e || '');
    if (/Invalid login credentials/i.test(m)) return 'Hibás e-mail-cím vagy jelszó.';
    if (/Email not confirmed/i.test(m)) return 'Az e-mail-címed még nincs megerősítve. Nézd meg a postafiókodat (a spam mappát is).';
    if (/already registered|already exists/i.test(m)) return 'Ezzel az e-mail-címmel már van fiók. Lépj be, vagy kérj új jelszót.';
    if (/Password should be at least/i.test(m)) return 'A jelszó legalább 8 karakter legyen.';
    if (/rate limit|too many/i.test(m)) return 'Túl sok próbálkozás, kérlek várj egy kicsit, és próbáld újra.';
    if (/not authorized|Error sending/i.test(m)) return 'Most nem tudtunk e-mailt küldeni. Próbáld később, vagy használd a Google-belépést.';
    if (/valid email|invalid format/i.test(m)) return 'Érvénytelen e-mail-cím.';
    return 'Hiba: ' + m;
  }
  function backUrl() { return window.location.origin + window.location.pathname + window.location.search; }

  function openAuthModal(mode) {
    mode = mode === 'register' ? 'register' : 'login';
    var ov = makeOverlay(
      '<button class="pm-x" type="button" aria-label="Bezárás">&times;</button>'
      + '<div class="pm-tabs" role="tablist">'
      +   '<button type="button" role="tab" data-m="login">Belépés</button>'
      +   '<button type="button" role="tab" data-m="register">Regisztráció</button>'
      + '</div>'
      // --- belépés
      + '<div class="pm-pane" data-pane="login">'
      +   '<p>Lépj be a fiókodba, és folytasd ott, ahol abbahagytad.</p>'
      +   '<button class="pm-google" type="button" data-act="g-login"><img class="pm-gicon" alt="" src="'+GICON+'">Belépés Google-fiókkal</button>'
      +   '<div class="pm-or"><span>vagy e-maillel</span></div>'
      +   '<form class="pm-form" data-form="login" novalidate>'
      +     '<label class="pm-acc-label">E-mail-cím<input type="email" name="email" autocomplete="email" required></label>'
      +     '<label class="pm-acc-label">Jelszó<input type="password" name="pw" autocomplete="current-password" required></label>'
      +     '<div class="pm-msg" role="alert"></div>'
      +     '<button class="pm-primary" type="submit">Belépés</button>'
      +   '</form>'
      +   '<button class="pm-linkbtn" type="button" data-act="forgot">Elfelejtetted a jelszavad?</button>'
      +   '<div class="pm-switch">Még nincs fiókod? <button type="button" class="pm-linkbtn" data-go="register">Regisztrálj</button></div>'
      + '</div>'
      // --- regisztráció
      + '<div class="pm-pane" data-pane="register" hidden>'
      +   '<p>Hozz létre ingyenes fiókot: a kipipált feladataid és a haladásod minden eszközön megmaradnak.</p>'
      +   CONSENT_HTML
      +   '<button class="pm-google" type="button" data-act="g-reg" disabled><img class="pm-gicon" alt="" src="'+GICON+'">Regisztráció Google-fiókkal</button>'
      +   '<div class="pm-or"><span>vagy e-maillel</span></div>'
      +   '<form class="pm-form" data-form="register" novalidate>'
      +     '<label class="pm-acc-label">Név (ahogy szólíthatunk)<input type="text" name="name" autocomplete="name" maxlength="40"></label>'
      +     '<label class="pm-acc-label">E-mail-cím<input type="email" name="email" autocomplete="email" required></label>'
      +     '<label class="pm-acc-label">Jelszó (legalább 8 karakter)<input type="password" name="pw" autocomplete="new-password" minlength="8" required></label>'
      +     '<label class="pm-acc-label">Jelszó még egyszer<input type="password" name="pw2" autocomplete="new-password" minlength="8" required></label>'
      +     '<div class="pm-msg" role="alert"></div>'
      +     '<button class="pm-primary" type="submit" disabled>Regisztráció e-maillel</button>'
      +   '</form>'
      +   '<div class="pm-note">Az adatkezelési tájékoztató elfogadása kötelező a regisztrációhoz. 16 év alatt a használathoz és a marketinghez szülői/gondviselői hozzájárulás szükséges — erről a következő lépésben kérdezünk.</div>'
      +   '<div class="pm-switch">Van már fiókod? <button type="button" class="pm-linkbtn" data-go="login">Lépj be</button></div>'
      + '</div>'
      // --- visszajelzés
      + '<div class="pm-pane" data-pane="done" hidden><h3>Nézd meg a postafiókodat</h3><p class="pm-done-txt"></p>'
      +   '<button class="pm-primary" type="button" data-act="close">Rendben</button></div>'
    );
    var card = ov.querySelector('.pm-card');
    function setMode(m) {
      card.querySelectorAll('.pm-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.m === m); });
      card.querySelectorAll('.pm-pane').forEach(function (p) { p.hidden = p.dataset.pane !== m; });
      card.querySelector('.pm-tabs').hidden = m === 'done';
      var f = card.querySelector('.pm-pane[data-pane="' + m + '"] input:not([type=checkbox])'); if (f && m !== 'done') setTimeout(function () { try { f.focus(); } catch (e) {} }, 60);
    }
    function msg(form, t, ok) { var el = form.querySelector('.pm-msg'); el.textContent = t || ''; el.classList.toggle('ok', !!ok); }
    function done(text) { card.querySelector('.pm-done-txt').textContent = text; setMode('done'); }
    card.querySelectorAll('.pm-tabs button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.m); }); });
    card.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.go); }); });
    card.querySelector('.pm-x').addEventListener('click', function () { close(ov); });
    card.querySelector('[data-act="close"]').addEventListener('click', function () { close(ov); });

    // regisztráció: hozzájárulás nélkül nem indítható
    var regPane = card.querySelector('[data-pane="register"]');
    var terms = regPane.querySelector('.pmTerms'), mkt = regPane.querySelector('.pmMkt');
    var gReg = regPane.querySelector('[data-act="g-reg"]'), eReg = regPane.querySelector('form button[type=submit]');
    terms.addEventListener('change', function () { gReg.disabled = eReg.disabled = !terms.checked; });

    card.querySelector('[data-act="g-login"]').addEventListener('click', function () { loginGoogle(); });
    gReg.addEventListener('click', function () { if (!terms.checked) return; savePending(mkt.checked); loginGoogle(); });

    // e-mailes belépés
    var lf = card.querySelector('form[data-form="login"]');
    lf.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = lf.email.value.trim(), pw = lf.pw.value;
      if (!email || !pw) { msg(lf, 'Add meg az e-mail-címed és a jelszavad.'); return; }
      var btn = lf.querySelector('button[type=submit]'); btn.disabled = true; msg(lf, 'Belépés…', true);
      sb.auth.signInWithPassword({ email:email, password: pw}).then(function (res) {
        btn.disabled = false;
        if (res.error) { msg(lf, authErr(res.error)); return; }
        close(ov);
      });
    });
    // elfelejtett jelszó
    card.querySelector('[data-act="forgot"]').addEventListener('click', function () {
      var email = lf.email.value.trim();
      if (!email) { msg(lf, 'Írd be fent az e-mail-címed, és utána kattints ide újra.'); lf.email.focus(); return; }
      msg(lf, 'Küldés…', true);
      sb.auth.resetPasswordForEmail(email, { redirectTo: backUrl() }).then(function (res) {
        if (res.error) { msg(lf, authErr(res.error)); return; }
        done('Ha a(z) ' + email + ' címmel van fiók, küldtünk rá egy linket, amellyel új jelszót adhatsz meg. (Nézd meg a spam mappát is.)');
      });
    });
    // e-mailes regisztráció
    var rf = card.querySelector('form[data-form="register"]');
    rf.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!terms.checked) { msg(rf, 'Az adatkezelési tájékoztató elfogadása kötelező.'); return; }
      var name = rf.name.value.trim(), email = rf.email.value.trim(), pw = rf.pw.value, pw2 = rf.pw2.value;
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg(rf, 'Érvénytelen e-mail-cím.'); return; }
      if (pw.length < 8) { msg(rf, 'A jelszó legalább 8 karakter legyen.'); return; }
      if (pw !== pw2) { msg(rf, 'A két jelszó nem egyezik.'); return; }
      var when = new Date().toISOString();
      savePending(mkt.checked);
      eReg.disabled = true; msg(rf, 'Regisztráció…', true);
      sb.auth.signUp({ email: email, password: pw, options: {
        emailRedirectTo: backUrl(),
        data: { source:'papaimatek-web', full_name: name || undefined, name: name || undefined, terms_accepted_at: when, marketing_consent: !!mkt.checked}
      } }).then(function (res) {
        eReg.disabled = false;
        if (res.error) { msg(rf, authErr(res.error)); return; }
        // ha már létezik a cím, a Supabase üres identitáslistát ad vissza
        var u = res.data && res.data.user;
        if (u && Array.isArray(u.identities) && u.identities.length === 0) { msg(rf, 'Ezzel az e-mail-címmel már van fiók. Lépj be, vagy kérj új jelszót.'); return; }
        if (res.data && res.data.session) { if (name) pendingName = name; close(ov); return; }
        if (name) { try { localStorage.setItem('pm_pending_name', name); } catch (x) {} }
        done('Küldtünk egy megerősítő e-mailt a(z) ' + email + ' címre. Kattints a benne lévő linkre, és a fiókod aktiválódik. (Ha nem találod, nézd meg a spam mappát is.)');
      });
    });
    setMode(mode);
    open(ov);
  }
  var pendingName = null;
  function openLoginModal() { openAuthModal('login'); }
  function openRegisterModal() { openAuthModal('register'); }

  PM.openLogin = openLoginModal;
  PM.openRegister = openRegisterModal;

  function loginGoogle() {
    sb.auth.signInWithOAuth({
      provider:'google',
      options: { redirectTo: backUrl() }
    }).then(function (res) {
      if (res && res.error) alert('Hiba a belépésnél: ' + res.error.message);
    });
  }

  /* ---------- új jelszó (jelszó-visszaállító link után) ---------- */
  function openNewPasswordModal() {
    var ov = makeOverlay(
      '<h3>Új jelszó megadása</h3><p>Add meg az új jelszavadat (legalább 8 karakter).</p>'
      + '<form class="pm-form" novalidate>'
      +   '<label class="pm-acc-label">Új jelszó<input type="password" name="pw" autocomplete="new-password" minlength="8" required></label>'
      +   '<label class="pm-acc-label">Új jelszó még egyszer<input type="password" name="pw2" autocomplete="new-password" minlength="8" required></label>'
      +   '<div class="pm-msg" role="alert"></div>'
      +   '<button class="pm-primary" type="submit">Jelszó mentése</button>'
      + '</form>'
    );
    var f = ov.querySelector('form'), m = ov.querySelector('.pm-msg');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (f.pw.value.length < 8) { m.textContent = 'A jelszó legalább 8 karakter legyen.'; return; }
      if (f.pw.value !== f.pw2.value) { m.textContent = 'A két jelszó nem egyezik.'; return; }
      sb.auth.updateUser({ password:f.pw.value}).then(function (res) {
        if (res.error) { m.textContent = authErr(res.error); return; }
        close(ov); showBanner('Az új jelszavad elmentve.', true);
      });
    });
    open(ov);
  }

  /* ---------- adatkezelési hozzájárulás pótlása (pl. Google-belépés a „Belépés” fülön, új fiókkal) ---------- */
  function openTermsModal(user) {
    var ov = makeOverlay(
      '<h3>Üdv a papaimatek.hu-n!</h3>'
      + '<p>Mielőtt használni kezded a fiókodat, kérjük, fogadd el az adatkezelési tájékoztatót.</p>'
      + CONSENT_HTML
      + '<button class="pm-primary" type="button" id="pm-terms-ok" disabled>Elfogadom</button>'
      + '<button class="pm-linkbtn" type="button" id="pm-terms-out">Mégsem, kijelentkezem</button>'
    );
    var t = ov.querySelector('.pmTerms'), mk = ov.querySelector('.pmMkt'), ok = ov.querySelector('#pm-terms-ok');
    t.addEventListener('change', function () { ok.disabled = !t.checked; });
    ok.addEventListener('click', function () {
      ok.disabled = true;
      var when = new Date().toISOString(), payload = { terms_accepted_at: when };
      if (mk.checked) { payload.marketing_consent = true; payload.marketing_consent_at = when; }
      sb.from('profiles').update(payload).eq('id', user.id).then(function () {
        if (curProfile) { curProfile.terms_accepted_at = when; }
        close(ov);
        if (curProfile && curProfile.parental_consent === false) openConsentModal(user);
      });
    });
    ov.querySelector('#pm-terms-out').addEventListener('click', function () { close(ov); sb.auth.signOut(); });
    open(ov);
  }

  // A belépési modalban tett hozzájárulások mentése (az OAuth-visszatérés után)
  function applyPendingConsent(user) {
    var raw = null;
    try { raw = localStorage.getItem('pm_pending_consent'); } catch (e) {}
    if (!raw) return;
    try { localStorage.removeItem('pm_pending_consent'); } catch (e) {}
    var c = null;
    try { c = JSON.parse(raw); } catch (e) {}
    if (!c) return;
    var when = c.at || new Date().toISOString();
    var payload = { terms_accepted_at: when };
    if (c.marketing) { payload.marketing_consent = true; payload.marketing_consent_at = when; }
    sb.from('profiles').update(payload).eq('id', user.id).then(function () {
      if (curProfile) {
        curProfile.terms_accepted_at = when;
        if (c.marketing) { curProfile.marketing_consent = true; curProfile.marketing_consent_at = when; }
      }
    }).catch(function () {});
  }

  /* ---------- szülői hozzájárulás (egyszer) ---------- */
  function openConsentModal(user) {
    var ov = makeOverlay(
      '<h3>Még egy lépés</h3>'
      + '<p>Mielőtt elkezded:erősítsd meg az alábbit. Ha még nem múltál el 16 éves, a használathoz szülő vagy gondviselő hozzájárulása szükséges.</p>'
      + '<div class="pm-consent"><label><input type="checkbox" id="pm-consent-cb"> Elmúltam 16 éves, <b>vagy</b> szülői/gondviselői hozzájárulással használom az oldalt.</label></div>'
      + '<button class="pm-primary" type="button" id="pm-consent-ok" disabled>Rendben, kezdjük</button>'
      + '<button class="pm-linkbtn" type="button" id="pm-consent-out">Mégsem, kijelentkezem</button>'
    );
    var cb = ov.querySelector('#pm-consent-cb');
    var ok = ov.querySelector('#pm-consent-ok');
    cb.addEventListener('change', function () { ok.disabled = !cb.checked; });
    ok.addEventListener('click', function () {
      ok.disabled = true;
      sb.from('profiles').update({ parental_consent: true, consent_at: new Date().toISOString() })
        .eq('id', user.id)
        .then(function () { close(ov); });
    });
    ov.querySelector('#pm-consent-out').addEventListener('click', function () {
      close(ov); sb.auth.signOut();
    });
    open(ov);
  }

  function maybeConsent(user) {
    sb.from('profiles').select('parental_consent').eq('id', user.id).single()
      .then(function (res) {
        if (res && res.data && res.data.parental_consent === false) openConsentModal(user);
      })
      .catch(function () {});
  }

  /* ---------- fejléc UI ---------- */
  function toggleWhen(loggedIn) {
    var outs = document.querySelectorAll('.pm-when-out');
    for (var i = 0; i < outs.length; i++) outs[i].hidden = loggedIn;
    var ins = document.querySelectorAll('.pm-when-in');
    for (var j = 0; j < ins.length; j++) ins[j].hidden = !loggedIn;
  }

  function render(session) {
    var user = session && session.user;
    toggleWhen(!!user);
    var area = document.getElementById('authArea');
    if (user) {
      if (area) loadProfileThenRender(user);
    } else {
      curProfile = null;
      if (area) {
        area.innerHTML = '<button class="pm-btn pm-reg" type="button">Regisztráció</button><button class="pm-btn pm-login" type="button">Belépés</button>';
        area.querySelector('.pm-login').addEventListener('click', openLoginModal);
        area.querySelector('.pm-reg').addEventListener('click', openRegisterModal);
      }
    }
  }

  function loadProfileThenRender(user) {
    sb.from('profiles').select('*').eq('id', user.id).single().then(function (res) {
      curProfile = (res && res.data) || {};
      renderAvatar(user);
      ensureEmailSaved(user);
      var hadPending = false; try { hadPending = !!localStorage.getItem('pm_pending_consent'); } catch (x) {}
      applyPendingConsent(user);
      applyPendingName(user);
      var metaTerms = user.user_metadata && user.user_metadata.terms_accepted_at;
      if (!curProfile.terms_accepted_at && !hadPending && metaTerms) {
        // e-mailes regisztráció másik eszközön megerősítve: a hozzájárulás a fiók adataiból jön
        var p = { terms_accepted_at: metaTerms };
        if (user.user_metadata.marketing_consent) { p.marketing_consent = true; p.marketing_consent_at = metaTerms; }
        sb.from('profiles').update(p).eq('id', user.id).then(function () {}).catch(function () {});
        curProfile.terms_accepted_at = metaTerms;
      }
      if (!curProfile.terms_accepted_at && !hadPending && !metaTerms) openTermsModal(user);
      else if (curProfile.parental_consent === false) openConsentModal(user);
    }).catch(function () { curProfile = {}; renderAvatar(user); ensureEmailSaved(user); applyPendingConsent(user); });
  }

  function applyPendingName(user) {
    var n = pendingName; try { n = n || localStorage.getItem('pm_pending_name'); localStorage.removeItem('pm_pending_name'); } catch (x) {}
    pendingName = null;
    if (!n || (curProfile && curProfile.display_name)) return;
    sb.from('profiles').update({ display_name: n }).eq('id', user.id).then(function () { if (curProfile) { curProfile.display_name = n; renderAvatar(user); } }).catch(function () {});
  }

  // Az e-mail cím mentése a profiles táblába (ha még nincs ott, vagy megváltozott)
  function ensureEmailSaved(user) {
    if (!user || !user.email) return;
    if (curProfile && curProfile.email === user.email) return;
    sb.from('profiles').update({ email:user.email}).eq('id', user.id).then(function () {
      if (curProfile) curProfile.email = user.email;
    }).catch(function () {});
  }

  function displayName(user) { return (curProfile && curProfile.display_name) || firstName(user); }
  function avatarInner(user) {
    var av = curProfile && curProfile.avatar;
    if (av) return '<img src="' + esc(av) + '" alt="">';
    return esc((displayName(user) || 'D').trim().charAt(0).toUpperCase());
  }

  function renderAvatar(user) {
    var area = document.getElementById('authArea'); if (!area) return;
    var name = displayName(user);
    area.innerHTML = ''
      + '<div class="pm-user">'
      +   '<button class="pm-avatar" id="pmAvatar" aria-haspopup="true" aria-expanded="false" title="' + esc(name) + '">' + avatarInner(user) + '</button>'
      +   '<div class="pm-menu" id="pmMenu" hidden>'
      +     '<div class="pm-menu-name">' + esc(name) + '</div>'
      +     '<a class="pm-menu-item" href="' + esc(window.PM_HALADAS_URL || '/haladas.html') + '">Haladásom</a>'
      +     '<button class="pm-menu-item" id="pmAccount" type="button">Saját fiók</button>'
      +     '<button class="pm-menu-item pm-danger" id="pmLogout" type="button">Kijelentkezés</button>'
      +   '</div>'
      + '</div>';
    var avBtn = area.querySelector('#pmAvatar');
    var menu = area.querySelector('#pmMenu');
    function closeMenu() { menu.hidden = true; avBtn.setAttribute('aria-expanded', 'false'); }
    function openMenu() { menu.hidden = false; avBtn.setAttribute('aria-expanded', 'true'); }
    avBtn.addEventListener('click', function (e) { e.stopPropagation(); if (menu.hidden) openMenu(); else closeMenu(); });
    area.querySelector('#pmLogout').addEventListener('click', function () { closeMenu(); sb.auth.signOut(); });
    area.querySelector('#pmAccount').addEventListener('click', function () { closeMenu(); openAccountModal(user); });
    var hl = area.querySelector('a.pm-menu-item'); if (hl) hl.addEventListener('click', closeMenu);
  }

  /* ---------- Saját fiók (név + profilkép) ---------- */
  function resizeToDataUrl(file, cb) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        var size = 160, c = document.createElement('canvas'); c.width = size; c.height = size;
        var ctx = c.getContext('2d');
        var s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2;
        ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
        cb(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = function () { cb(null); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function openAccountModal(user) {
    var name = displayName(user);
    var av = (curProfile && curProfile.avatar) || '';
    var pending = { avatar:av, changed: false};
    var pr = curProfile || {};
    function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (String(sel) === String(v) && v !== '' ? ' selected' : '') + '>' + esc(label) + '</option>'; }
    var evfSel = (pr.evfolyam != null ? String(pr.evfolyam) : '');
    var evfOpts = '<option value="">Válassz…</option>';
    var ER = window.PM_CONTEXT === 'erettsegi';
    (ER ? [9, 10, 11, 12, 13] : [5, 6, 7, 8, 9]).forEach(function (g) { evfOpts += opt(String(g), g + '. osztály', evfSel); });
    if (evfSel && (ER ? [9, 10, 11, 12, 13] : [5, 6, 7, 8, 9]).indexOf(parseInt(evfSel, 10)) < 0) evfOpts += opt(evfSel, evfSel + '. osztály', evfSel);
    var topicOpts = '<option value="">Válassz…</option>';
    (ER ? ['Matematika', 'Magyar nyelv és irodalom', 'Történelem'] : TOPICS).forEach(function (t) { topicOpts += opt(t, t, pr.kedvenc_temakor || ''); });
    if (pr.kedvenc_temakor && (ER ? ['Matematika', 'Magyar nyelv és irodalom', 'Történelem'] : TOPICS).indexOf(pr.kedvenc_temakor) < 0) topicOpts += opt(pr.kedvenc_temakor, pr.kedvenc_temakor, pr.kedvenc_temakor);
    var ov = makeOverlay(
      '<button class="pm-x" type="button" aria-label="Bezárás">&times;</button>'
      + '<h3>Saját fiók</h3>'
      + '<div class="pm-acc-av"><div class="pm-acc-avpic" id="accPic">' + (av ? '<img src="' + esc(av) + '" alt="">' : esc((name || 'D').charAt(0).toUpperCase())) + '</div>'
      +   '<label class="pm-acc-upload">Kép módosítása<input type="file" accept="image/*" id="accFile" hidden></label></div>'
      + '<label class="pm-acc-label">Megjelenített név<input type="text" id="accName" maxlength="40" value="' + esc(name) + '"></label>'
      + '<label class="pm-acc-label">Évfolyam<select id="accEvf">' + evfOpts + '</select></label>'
      + '<label class="pm-acc-label">Iskola<input type="text" id="accIskola" maxlength="80" value="' + esc(pr.iskola || '') + '" placeholder="' + (ER ? 'pl. Petőfi Sándor Gimnázium' : 'pl. Petőfi Sándor Általános Iskola') + '"></label>'
      + '<label class="pm-acc-label">' + (ER ? 'Kedvenc tantárgy' : 'Kedvenc témakör') + '<select id="accTopic">' + topicOpts + '</select></label>'
      + '<label class="pm-acc-label">Kitűzött cél<input type="text" id="accCel" maxlength="120" value="' + esc(pr.cel || '') + '" placeholder="' + (ER ? 'pl. 80% feletti emelt matek érettségi' : 'pl. 40+ pont a felvételin, jobb matekjegy') + '"></label>'
      + '<label class="pm-acc-check"><input type="checkbox" id="accMkt"' + (pr.marketing_consent ? ' checked' : '') + '> Kérek marketing célú megkereséseket e-mailben (új feladatok, hírek). Bármikor kikapcsolható.</label>'
      + '<button class="pm-primary" type="button" id="accSave">Mentés</button>'
      + '<div class="pm-note" id="accNote"></div>'
    );
    ov.querySelector('.pm-x').addEventListener('click', function () { close(ov); });
    var accPic = ov.querySelector('#accPic'), accNote = ov.querySelector('#accNote');
    ov.querySelector('#accFile').addEventListener('change', function () {
      var f = this.files && this.files[0]; if (!f) return;
      accNote.textContent = 'Kép feldolgozása…';
      resizeToDataUrl(f, function (dataUrl) {
        if (!dataUrl) { accNote.textContent = 'Nem sikerült a képet betölteni.'; return; }
        pending.avatar = dataUrl; pending.changed = true;
        accPic.innerHTML = '<img src="' + dataUrl + '" alt="">'; accNote.textContent = '';
      });
    });
    ov.querySelector('#accSave').addEventListener('click', function () {
      var btn = this;
      var newName = (ov.querySelector('#accName').value || '').trim() || name;
      var evfRaw = ov.querySelector('#accEvf').value;
      var mktOn = ov.querySelector('#accMkt').checked;
      var payload = {
        display_name: newName,
        evfolyam:evfRaw ? parseInt(evfRaw, 10) : null,
        iskola:(ov.querySelector('#accIskola').value || '').trim() || null,
        kedvenc_temakor: ov.querySelector('#accTopic').value || null,
        cel:(ov.querySelector('#accCel').value || '').trim() || null,
        marketing_consent: mktOn
      };
      if (mktOn && !pr.marketing_consent) payload.marketing_consent_at = new Date().toISOString();
      if (pending.changed) payload.avatar = pending.avatar;
      btn.disabled = true; accNote.textContent = 'Mentés…';
      sb.from('profiles').update(payload).eq('id', user.id).then(function (res) {
        if (res && res.error) {
          // Hiányzó oszlop(ok): mentsük legalább a biztosan létező mezőket (név, évfolyam)
          sb.from('profiles').update({ display_name: newName, evfolyam:payload.evfolyam}).eq('id', user.id).then(function () {
            curProfile.display_name = newName; curProfile.evfolyam = payload.evfolyam;
            renderAvatar(user); close(ov);
            showBanner('A név és évfolyam mentve. A többi mező (profilkép, iskola, kedvenc témakör, cél, e-mail, marketing) tárolásához a Supabase SQL Editorban futtasd le egyszer:alter table profiles add column if not exists avatar text, add column if not exists iskola text, add column if not exists kedvenc_temakor text, add column if not exists cel text, add column if not exists email text, add column if not exists marketing_consent boolean default false, add column if not exists marketing_consent_at timestamptz, add column if not exists terms_accepted_at timestamptz;');
          }).catch(function () { btn.disabled = false; accNote.textContent = 'Hiba: ' + res.error.message; });
          return;
        }
        curProfile.display_name = newName;
        curProfile.evfolyam = payload.evfolyam;
        curProfile.iskola = payload.iskola;
        curProfile.kedvenc_temakor = payload.kedvenc_temakor;
        curProfile.cel = payload.cel;
        curProfile.marketing_consent = payload.marketing_consent;
        if (payload.marketing_consent_at) curProfile.marketing_consent_at = payload.marketing_consent_at;
        if (payload.avatar !== undefined) curProfile.avatar = payload.avatar;
        renderAvatar(user); close(ov);
      });
    });
    open(ov);
  }

  /* ---------- haladás API (interaktív feladatokhoz) ---------- */
  PM.getUser = function () { return sb.auth.getUser().then(function (r) { return r.data.user; }); };

  PM.saveProgress = function (itemKey, fields) {
    return sb.auth.getUser().then(function (r) {
      var u = r.data.user;
      if (!u) return { error:'not-logged-in'};
      var row = Object.assign({ user_id: u.id, item_key: itemKey, updated_at: new Date().toISOString() }, fields || {});
      return sb.from('progress').upsert(row, { onConflict: 'user_id,item_key' });
    });
  };

  /* ---------- 1–5 értékelés (feladatbankok, haladás) ---------- */
  PM.RATE = {
    colors: { 1: '#B3261E', 2: '#C25E1F', 3: '#9A6E1C', 4: '#3E8C7D', 5: '#1F6F64' },
    labels: { 1: 'Nagyon nehezen ment', 2: 'Nehezen ment', 3: 'Közepesen ment', 4: 'Jól ment', 5: 'Nagyon jól ment' },
    short: { 1: 'nagyon nehéz', 2: 'nehéz', 3: 'közepes', 4: 'jól ment', 5: 'nagyon jól' }
  };
  /* rate: a progress sorból 1–5 vagy 0 (kész, de nincs értékelve) vagy null (nincs kész) */
  PM.rateOf = function (row) {
    if (!row || row.status !== 'kesz') return null;
    var n = parseInt(row.score, 10); return n >= 1 && n <= 5 ? n : 0;
  };
  PM.rateChip = function (el, rate) {
    var on = rate !== null && rate !== undefined;
    el.classList.toggle('on', on);
    el.style.setProperty('--rc', rate ? PM.RATE.colors[rate] : '#1F6F64');
    el.textContent = on ? (rate ? String(rate) : '\u2713') : '';
    el.title = on ? (rate ? PM.RATE.labels[rate] + ' (' + rate + '/5)' : 'Kész – kattints az értékeléshez') : 'Értékeld 1–5-ig, hogy ment';
    el.setAttribute('aria-label', el.title);
  };
  PM.rateBadge = function (rate) {
    if (!rate) return '';
    return '<span class="pm-rate-badge" style="--rc:' + PM.RATE.colors[rate] + '">' + rate + '/5 · ' + PM.RATE.short[rate] + '</span>';
  };
  function rateButtons(cur) {
    var h = '';
    for (var i = 1; i <= 5; i++) h += '<button type="button" class="pm-rate-b' + (cur === i ? ' on' : '') + '" data-r="' + i + '" style="--rc:' + PM.RATE.colors[i] + '" title="' + PM.RATE.labels[i] + '">' + i + '</button>';
    return h;
  }
  var ratePop = null;
  function closeRatePop() { if (ratePop) { ratePop.remove(); ratePop = null; } }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeRatePop(); });
  document.addEventListener('click', function (e) { if (ratePop && !ratePop.contains(e.target) && !e.target.closest('[data-rate-anchor]')) closeRatePop(); });
  window.addEventListener('scroll', closeRatePop, true);
  /* lebegő választó egy elem mellett; onPick(1–5) vagy onPick(0) = törlés */
  PM.ratePicker = function (anchor, cur, onPick) {
    closeRatePop();
    var pop = document.createElement('div'); pop.className = 'pm-rate-pop'; pop.setAttribute('role', 'dialog');
    pop.innerHTML = '<p class="pr-t">Hogy ment ez a feladat?</p><div class="pm-rate-row">' + rateButtons(cur) + '</div>'
      + '<div class="pm-rate-lbl"><span>1 = nagyon nehezen</span><span>5 = nagyon jól</span></div>'
      + (cur !== null && cur !== undefined ? '<button type="button" class="pm-rate-x">Jelölés törlése (nincs kész)</button>' : '');
    document.body.appendChild(pop); ratePop = pop;
    var r = anchor.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    var top = r.bottom + 8; if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 8);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
    pop.addEventListener('click', function (e) {
      var b = e.target.closest('.pm-rate-b'); if (b) { closeRatePop(); onPick(parseInt(b.dataset.r, 10)); return; }
      if (e.target.closest('.pm-rate-x')) { closeRatePop(); onPick(0); }
    });
  };
  /* beágyazott 1–5 sor (nézegető sávjába) */
  PM.rateInline = function (cur, onPick) {
    var box = document.createElement('div'); box.className = 'pm-rate-inline';
    function draw(c) { box.innerHTML = '<span class="pri-t">Hogy ment?</span>' + rateButtons(c); }
    draw(cur);
    box.addEventListener('click', function (e) { var b = e.target.closest('.pm-rate-b'); if (!b) return; var n = parseInt(b.dataset.r, 10); onPick(b.classList.contains('on') ? 0 : n); });
    box.set = draw; return box;
  };
  PM.saveRate = function (key, n) {
    return PM.saveProgress(key, n ? { status: 'kesz', score: n } : { status: '', score: null });
  };

  PM.loadProgress = function () {
    return sb.auth.getUser().then(function (r) {
      if (!r.data.user) return {};
      return sb.from('progress').select('item_key,status,score,attempts').then(function (res) {
        var map = {}; (res.data || []).forEach(function (x) { map[x.item_key] = x; }); return map;
      });
    });
  };

  /* ---------- bejelentkezés utáni visszatérés kezelése ---------- */
  function showBanner(msg, ok) {
    var b = document.createElement('div');
    b.setAttribute('role', 'alert');
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2000;padding:12px 44px 12px 16px;'
      + 'font-family:"Alegreya Sans",sans-serif;font-weight:700;font-size:15px;text-align:center;'
      + (ok ? 'background:#1f7a5a;color:#eafff6;' : 'background:#b3261e;color:#fff;');
    b.textContent = msg;
    var x = document.createElement('button');
    x.textContent = '×';
    x.style.cssText = 'position:absolute;top:8px;right:14px;background:transparent;border:none;color:inherit;font-size:20px;cursor:pointer;';
    x.addEventListener('click', function () { if (b.parentNode) b.parentNode.removeChild(b); });
    b.appendChild(x);
    document.body.appendChild(b);
  }

  function handleAuthReturn() {
    var hp = new URLSearchParams((location.hash || '').replace(/^#/, ''));
    var qp = new URLSearchParams(location.search || '');
    var err = hp.get('error_description') || hp.get('error') || qp.get('error_description') || qp.get('error');
    if (err) { showBanner('Bejelentkezés sikertelen:' + decodeURIComponent(err)); cleanUrl(); return; }
    var at = hp.get('access_token'), rt = hp.get('refresh_token');
    if (at && rt) {
      sb.auth.setSession({ access_token: at, refresh_token: rt }).then(function (res) {
        cleanUrl();
        if (res && res.error) { showBanner('Munkamenet hiba:' + res.error.message); return; }
        var u = res && res.data && res.data.user;
        render(u ? { user:u} : null);
        if (hp.get('type') === 'recovery') openNewPasswordModal();
        else if (hp.get('type') === 'signup') showBanner('Sikeres megerősítés – üdv a papaimatek.hu-n!', true);
        listeners.forEach(function (cb) { try { cb(u || null); } catch (e) {} });
      });
    }
  }
  function cleanUrl() {
    try { history.replaceState(null, document.title, location.pathname + location.search); } catch (e) {}
  }

  /* ---------- indítás ---------- */
  // Profil menü bezárása külső kattintásra / koppintásra (pointerdown = mobilon is megbízható)
  function pmCloseOutside(e) {
    var menu = document.getElementById('pmMenu'); if (!menu || menu.hidden) return;
    var area = document.getElementById('authArea');
    if (area && !area.contains(e.target)) {
      menu.hidden = true;
      var a = document.getElementById('pmAvatar'); if (a) a.setAttribute('aria-expanded', 'false');
    }
  }
  document.addEventListener('pointerdown', pmCloseOutside);
  document.addEventListener('click', pmCloseOutside);
  // Felhívó üzenet "Belépés" gombjai
  var ctaBtns = document.querySelectorAll('.pm-cta-login');
  for (var ci = 0; ci < ctaBtns.length; ci++) ctaBtns[ci].addEventListener('click', openLoginModal);

  handleAuthReturn();
  sb.auth.getSession().then(function (r) { render(r.data.session); });
  sb.auth.onAuthStateChange(function (_e, session) {
    render(session);
    listeners.forEach(function (cb) { try { cb(session && session.user || null); } catch (e) {} });
  });
  /* lapok közötti szinkron */
  // Ha egy másik lapon (pl. a főoldalon) be- vagy kijelentkezel, ez a lap is frissül.
  window.addEventListener('storage', function (e) {
    if (!e.key || !/^sb-.*-auth-token$/.test(e.key)) return;
    if ((!!e.oldValue) !== (!!e.newValue)) { location.reload(); return; }
    sb.auth.getSession().then(function (r) { render(r.data.session); listeners.forEach(function (cb) { try { cb(r.data.session && r.data.session.user || null); } catch (x) {} }); });
  });
})();
