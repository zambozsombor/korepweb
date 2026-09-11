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
      + '.pm-btn{font-family:"Baloo 2",sans-serif;font-weight:700;border-radius:999px;cursor:pointer;border:none;line-height:1;transition:filter .15s ease,background .15s ease;}'
      + '.pm-btn:hover{filter:brightness(1.05);}'
      + '.pm-login{background:var(--mint,#7fe3c4);color:var(--mint-ink,#0c3b2c);padding:10px 18px;font-size:14.5px;}'
      + '.pm-user{display:flex;align-items:center;gap:9px;}'
      + '.pm-hi{color:var(--cream,#f6efdd);font-weight:700;font-size:14px;white-space:nowrap;}'
      + '.pm-logout{background:transparent;border:1.5px solid rgba(255,255,255,.28);color:var(--cream,#f6efdd);padding:7px 13px;font-size:13px;}'
      + '.pm-overlay{position:fixed;inset:0;background:rgba(10,4,28,.68);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;z-index:1000;opacity:0;pointer-events:none;transition:opacity .2s ease;}'
      + '.pm-overlay.open{opacity:1;pointer-events:auto;}'
      + '.pm-card{background:var(--purple-800,#2f1a63);color:var(--cream,#f6efdd);border:1px solid rgba(255,255,255,.10);border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,.45);max-width:420px;width:100%;max-height:88vh;overflow:auto;padding:30px 26px;position:relative;transform:translateY(8px);transition:transform .2s ease;}'
      + '.pm-acc-label select{display:block;width:100%;margin-top:6px;padding:11px 14px;border-radius:12px;border:1.5px solid rgba(255,255,255,.18);background:var(--purple-950,#241150);color:var(--cream,#f6efdd);font-family:"Baloo 2",sans-serif;font-size:15px;box-sizing:border-box;}'
      + '.pm-overlay.open .pm-card{transform:translateY(0);}'
      + '.pm-card h3{font-family:"Baloo 2",sans-serif;margin:0 0 8px;font-size:23px;color:var(--cream,#f6efdd);}'
      + '.pm-card p{margin:0 0 18px;font-size:14.5px;line-height:1.55;color:var(--cream-dim,#cdc3e6);}'
      + '.pm-x{position:absolute;top:14px;right:16px;background:transparent;border:none;color:var(--cream-dim,#cdc3e6);font-size:22px;cursor:pointer;line-height:1;}'
      + '.pm-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#1f1f1f;font-family:"Baloo 2",sans-serif;font-weight:700;font-size:15.5px;border:none;border-radius:999px;padding:13px 18px;cursor:pointer;}'
      + '.pm-google:hover{filter:brightness(.97);}'
      + '.pm-gicon{width:20px;height:20px;display:inline-block;object-fit:contain;vertical-align:middle;}'
      + '.pm-note{margin-top:16px;font-size:12px;color:var(--cream-dim,#cdc3e6);line-height:1.5;}'
      + '.pm-consent label{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--cream,#f6efdd);cursor:pointer;margin:6px 0 16px;}'
      + '.pm-consent input[type=checkbox]{margin-top:3px;width:18px;height:18px;flex:none;accent-color:var(--yellow,#f5e463);}'
      + '.pm-primary{width:100%;background:var(--coral,#ff7a66);color:var(--purple-950,#160a34);font-family:"Baloo 2",sans-serif;font-weight:700;font-size:15.5px;border:none;border-radius:999px;padding:13px 18px;cursor:pointer;}'
      + '.pm-primary:disabled{opacity:.5;cursor:not-allowed;}'
      + '.pm-linkbtn{display:inline-block;background:none;border:none;color:var(--cream-dim,#cdc3e6);font-size:12.5px;text-decoration:underline;cursor:pointer;margin-top:12px;padding:0;}'
      + '.pm-user{position:relative;display:flex;align-items:center;}'
      + '.pm-avatar{width:40px;height:40px;border-radius:50%;border:2px solid rgba(255,255,255,.28);background:var(--yellow,#f5e463);color:var(--yellow-ink,#2f1866);font-family:"Baloo 2",sans-serif;font-weight:800;font-size:17px;cursor:pointer;overflow:hidden;padding:0;display:flex;align-items:center;justify-content:center;}'
      + '.pm-avatar img{width:100%;height:100%;object-fit:cover;display:block;}'
      + '.pm-avatar:hover{filter:brightness(1.05);}'
      + '.pm-menu-backdrop{position:fixed;inset:0;z-index:290;background:transparent;}'
      + '.pm-menu{position:absolute;top:calc(100% + 10px);right:0;background:var(--purple-800,#3a1f80);border:1px solid rgba(255,255,255,.10);border-radius:16px;box-shadow:0 18px 40px rgba(0,0,0,.4);padding:8px;min-width:210px;display:flex;flex-direction:column;gap:2px;z-index:300;}'
      + '.pm-menu[hidden]{display:none!important;}'
      + '.pm-menu-name{font-family:"Baloo 2",sans-serif;font-weight:700;font-size:14px;color:var(--cream,#f6efdd);padding:8px 12px 8px;border-bottom:1px solid rgba(255,255,255,.10);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
      + '.pm-menu-item{display:block;text-align:left;background:transparent;border:none;color:var(--cream,#f6efdd);font-family:"Baloo 2",sans-serif;font-weight:600;font-size:14.5px;padding:11px 12px;border-radius:10px;cursor:pointer;text-decoration:none;}'
      + '.pm-menu-item:hover{background:var(--purple-700,#4a2aa0);}'
      + '.pm-menu-item.pm-danger{color:#ff9a86;}'
      + '.pm-acc-av{display:flex;align-items:center;gap:16px;margin:6px 0 18px;}'
      + '.pm-acc-avpic{width:72px;height:72px;border-radius:50%;overflow:hidden;background:var(--yellow,#f5e463);color:var(--yellow-ink,#2f1866);display:flex;align-items:center;justify-content:center;font-family:"Baloo 2",sans-serif;font-weight:800;font-size:30px;flex:none;}'
      + '.pm-acc-avpic img{width:100%;height:100%;object-fit:cover;}'
      + '.pm-acc-upload{background:transparent;border:1.5px solid rgba(255,255,255,.28);color:var(--cream,#f6efdd);font-family:"Baloo 2",sans-serif;font-weight:700;font-size:13.5px;padding:9px 14px;border-radius:999px;cursor:pointer;display:inline-block;}'
      + '.pm-acc-label{display:block;font-size:13px;color:var(--cream-dim,#cdc3e6);margin-bottom:16px;font-weight:600;}'
      + '.pm-acc-label input{display:block;width:100%;margin-top:6px;padding:11px 14px;border-radius:12px;border:1.5px solid rgba(255,255,255,.18);background:var(--purple-950,#241150);color:var(--cream,#f6efdd);font-family:"Baloo 2",sans-serif;font-size:15px;box-sizing:border-box;}'
      + '.pm-login-cta{display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;background:linear-gradient(135deg,var(--purple-800,#3a1f80),var(--purple-700,#4a2aa0));border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:14px 20px;margin:0 auto 18px;max-width:680px;text-align:center;}'
      + '.pm-login-cta .cta-txt{font-family:"Baloo 2",sans-serif;font-weight:700;font-size:15px;color:var(--cream,#f6efdd);}'
      + '.pm-cta-login{background:var(--mint,#c7f3ec);color:var(--mint-ink,#123b34);font-family:"Baloo 2",sans-serif;font-weight:700;font-size:14px;border:none;border-radius:999px;padding:9px 18px;cursor:pointer;white-space:nowrap;}'
      + '.pm-cta-login:hover{filter:brightness(1.05);}'
      + '@media(max-width:760px){.header-right{gap:8px;}.pm-login{padding:7px 12px;font-size:12px;}.header-cta{font-size:11.5px;padding:7px 11px;}}';
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

  /* ---------- belépés modal ---------- */
  function openLoginModal() {
    var ov = makeOverlay(
      '<button class="pm-x" type="button" aria-label="Bezárás">&times;</button>'
      + '<h3>Belépés / Regisztráció</h3>'
      + '<p>Lépj be a Google-fiókoddal, hogy később kövesd a haladásodat. Első belépéskor automatikusan létrejön a fiókod.</p>'
      + '<button class="pm-google" type="button"><img class="pm-gicon" alt="" src="'+GICON+'">Bejelentkezés Google-fiókkal</button>'
      + '<div class="pm-note">A belépéssel elfogadod, hogy a neved és e-mail-címed a fiókodhoz tároljuk a haladás mentéséhez. 16 év alatt szülői hozzájárulás szükséges — erről a következő lépésben kérdezünk.</div>'
    );
    ov.querySelector('.pm-x').addEventListener('click', function () { close(ov); });
    ov.querySelector('.pm-google').addEventListener('click', loginGoogle);
    open(ov);
  }

  PM.openLogin = openLoginModal;

  function loginGoogle() {
    sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname + window.location.search }
    }).then(function (res) {
      if (res && res.error) alert('Hiba a belépésnél: ' + res.error.message);
    });
  }

  /* ---------- szülői hozzájárulás (egyszer) ---------- */
  function openConsentModal(user) {
    var ov = makeOverlay(
      '<h3>Még egy lépés</h3>'
      + '<p>Mielőtt elkezded: erősítsd meg az alábbit. Ha még nem múltál el 16 éves, a használathoz szülő vagy gondviselő hozzájárulása szükséges.</p>'
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
        area.innerHTML = '<button class="pm-btn pm-login" type="button">Belépés</button>';
        area.querySelector('.pm-login').addEventListener('click', openLoginModal);
      }
    }
  }

  function loadProfileThenRender(user) {
    sb.from('profiles').select('*').eq('id', user.id).single().then(function (res) {
      curProfile = (res && res.data) || {};
      renderAvatar(user);
      if (curProfile.parental_consent === false) openConsentModal(user);
    }).catch(function () { curProfile = {}; renderAvatar(user); });
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
      +     '<a class="pm-menu-item" href="haladas.html">Haladásom</a>'
      +     '<button class="pm-menu-item" id="pmAccount" type="button">Saját fiók</button>'
      +     '<button class="pm-menu-item pm-danger" id="pmLogout" type="button">Kijelentkezés</button>'
      +   '</div>'
      + '</div>';
    var avBtn = area.querySelector('#pmAvatar');
    var menu = area.querySelector('#pmMenu');
    var backdrop = null;
    function closeMenu() { menu.hidden = true; avBtn.setAttribute('aria-expanded', 'false'); if (backdrop) { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); backdrop = null; } }
    function openMenu() {
      menu.hidden = false; avBtn.setAttribute('aria-expanded', 'true');
      backdrop = document.createElement('div'); backdrop.className = 'pm-menu-backdrop';
      backdrop.addEventListener('click', closeMenu);
      document.body.appendChild(backdrop);
    }
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
    var pending = { avatar: av, changed: false };
    var pr = curProfile || {};
    function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (String(sel) === String(v) && v !== '' ? ' selected' : '') + '>' + esc(label) + '</option>'; }
    var evfSel = (pr.evfolyam != null ? String(pr.evfolyam) : '');
    var evfOpts = '<option value="">Válassz…</option>';
    [5, 6, 7, 8, 9].forEach(function (g) { evfOpts += opt(String(g), g + '. osztály', evfSel); });
    var topicOpts = '<option value="">Válassz…</option>';
    TOPICS.forEach(function (t) { topicOpts += opt(t, t, pr.kedvenc_temakor || ''); });
    var ov = makeOverlay(
      '<button class="pm-x" type="button" aria-label="Bezárás">&times;</button>'
      + '<h3>Saját fiók</h3>'
      + '<div class="pm-acc-av"><div class="pm-acc-avpic" id="accPic">' + (av ? '<img src="' + esc(av) + '" alt="">' : esc((name || 'D').charAt(0).toUpperCase())) + '</div>'
      +   '<label class="pm-acc-upload">Kép módosítása<input type="file" accept="image/*" id="accFile" hidden></label></div>'
      + '<label class="pm-acc-label">Megjelenített név<input type="text" id="accName" maxlength="40" value="' + esc(name) + '"></label>'
      + '<label class="pm-acc-label">Évfolyam<select id="accEvf">' + evfOpts + '</select></label>'
      + '<label class="pm-acc-label">Iskola<input type="text" id="accIskola" maxlength="80" value="' + esc(pr.iskola || '') + '" placeholder="pl. Petőfi Sándor Általános Iskola"></label>'
      + '<label class="pm-acc-label">Kedvenc témakör<select id="accTopic">' + topicOpts + '</select></label>'
      + '<label class="pm-acc-label">Kitűzött cél<input type="text" id="accCel" maxlength="120" value="' + esc(pr.cel || '') + '" placeholder="pl. 40+ pont a felvételin, jobb matekjegy"></label>'
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
      var payload = {
        display_name: newName,
        evfolyam: evfRaw ? parseInt(evfRaw, 10) : null,
        iskola: (ov.querySelector('#accIskola').value || '').trim() || null,
        kedvenc_temakor: ov.querySelector('#accTopic').value || null,
        cel: (ov.querySelector('#accCel').value || '').trim() || null
      };
      if (pending.changed) payload.avatar = pending.avatar;
      btn.disabled = true; accNote.textContent = 'Mentés…';
      sb.from('profiles').update(payload).eq('id', user.id).then(function (res) {
        if (res && res.error) {
          // Hiányzó oszlop(ok): mentsük legalább a biztosan létező mezőket (név, évfolyam)
          sb.from('profiles').update({ display_name: newName, evfolyam: payload.evfolyam }).eq('id', user.id).then(function () {
            curProfile.display_name = newName; curProfile.evfolyam = payload.evfolyam;
            renderAvatar(user); close(ov);
            showBanner('A név és évfolyam mentve. A profilkép, iskola, kedvenc témakör és cél tárolásához a Supabase SQL Editorban futtasd le egyszer: alter table profiles add column if not exists avatar text, add column if not exists iskola text, add column if not exists kedvenc_temakor text, add column if not exists cel text;');
          }).catch(function () { btn.disabled = false; accNote.textContent = 'Hiba: ' + res.error.message; });
          return;
        }
        curProfile.display_name = newName;
        curProfile.evfolyam = payload.evfolyam;
        curProfile.iskola = payload.iskola;
        curProfile.kedvenc_temakor = payload.kedvenc_temakor;
        curProfile.cel = payload.cel;
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
      if (!u) return { error: 'not-logged-in' };
      var row = Object.assign({ user_id: u.id, item_key: itemKey, updated_at: new Date().toISOString() }, fields || {});
      return sb.from('progress').upsert(row, { onConflict: 'user_id,item_key' });
    });
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
      + 'font-family:"Baloo 2",sans-serif;font-weight:700;font-size:14px;text-align:center;'
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
    if (err) { showBanner('Bejelentkezés sikertelen: ' + decodeURIComponent(err)); cleanUrl(); return; }
    var at = hp.get('access_token'), rt = hp.get('refresh_token');
    if (at && rt) {
      sb.auth.setSession({ access_token: at, refresh_token: rt }).then(function (res) {
        cleanUrl();
        if (res && res.error) { showBanner('Munkamenet hiba: ' + res.error.message); return; }
        var u = res && res.data && res.data.user;
        render(u ? { user: u } : null);
        listeners.forEach(function (cb) { try { cb(u || null); } catch (e) {} });
      });
    }
  }
  function cleanUrl() {
    try { history.replaceState(null, document.title, location.pathname + location.search); } catch (e) {}
  }

  /* ---------- indítás ---------- */
  // Profil menü bezárása külső kattintásra
  document.addEventListener('click', function (e) {
    var menu = document.getElementById('pmMenu'); if (!menu || menu.hidden) return;
    var area = document.getElementById('authArea');
    if (area && !area.contains(e.target)) menu.hidden = true;
  });
  // Felhívó üzenet "Belépés" gombjai
  var ctaBtns = document.querySelectorAll('.pm-cta-login');
  for (var ci = 0; ci < ctaBtns.length; ci++) ctaBtns[ci].addEventListener('click', openLoginModal);

  handleAuthReturn();
  sb.auth.getSession().then(function (r) { render(r.data.session); });
  sb.auth.onAuthStateChange(function (_e, session) {
    render(session);
    listeners.forEach(function (cb) { try { cb(session && session.user || null); } catch (e) {} });
  });
})();
