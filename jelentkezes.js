/* Jelentkezés 3 lépésben (papaimatek.hu/jelentkezes.html) – a beküldés a /api/jelentkezes végpontra megy */
(function () {
  var form = document.getElementById('jf');
  if (!form) return;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $all = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var steps = $all('.step', form), dots = $all('#steps li');
  var navRow = $('#navRow'), bBack = $('#bBack'), bNext = $('#bNext'), alertBox = $('#jfAlert');
  var start = Date.now(), lepes = 1, ki = '';

  var SZOVEG = {
    szulo: { cim: 'A szülő adatai', sub: 'Ezeken az elérhetőségeken kereslek majd.', nev: 'Az Ön neve', tel: 'Telefonszáma', email: 'E-mail-címe', osztaly: 'A gyermek osztálya' },
    diak: { cim: 'A te adataid', sub: 'Ezeken az elérhetőségeken kereslek majd.', nev: 'A neved', tel: 'Telefonszámod', email: 'E-mail-címed', osztaly: 'Hányadikos vagy?' }
  };
  var REQ = ' <span class="req">*</span>';

  /* időpont-választók: 7:00–21:00, félóránként */
  var IDOK = [];
  for (var h = 7; h <= 21; h++) { IDOK.push((h < 10 ? '0' : '') + h + ':00'); if (h < 21) IDOK.push((h < 10 ? '0' : '') + h + ':30'); }
  $all('.day').forEach(function (d) {
    var cb = $('input[type=checkbox]', d), tol = $('select[data-k=tol]', d), ig = $('select[data-k=ig]', d);
    IDOK.forEach(function (t) { tol.add(new Option(t, t)); ig.add(new Option(t, t)); });
    var hetvege = /Szombat|Vasárnap/.test(d.dataset.nap);
    tol.value = hetvege ? '09:00' : '16:00'; ig.value = hetvege ? '12:00' : '18:00';
    var upd = function () { d.classList.toggle('on', cb.checked); if (cb.checked) $('#idoErr').style.display = 'none'; ellenorizNap(d); };
    cb.addEventListener('change', upd); tol.addEventListener('change', upd); ig.addEventListener('change', upd);
  });
  function ellenorizNap(d) {
    var on = $('input[type=checkbox]', d).checked;
    var bad = on && $('select[data-k=ig]', d).value <= $('select[data-k=tol]', d).value;
    d.classList.toggle('badtime', bad);
    return !bad;
  }

  function mutat(n) {
    lepes = n;
    steps.forEach(function (s) { s.hidden = Number(s.dataset.step) !== n; });
    dots.forEach(function (li, i) { li.classList.toggle('on', i + 1 === n); li.classList.toggle('done', i + 1 < n); li.toggleAttribute('aria-current', i + 1 === n); });
    navRow.hidden = n === 1;
    bNext.textContent = n === 3 ? 'Jelentkezés elküldése' : 'Tovább';
    alertBox.classList.remove('on');
    var top = $('#steps').getBoundingClientRect().top + window.scrollY - 90;
    if (window.scrollY > top) window.scrollTo({ top: top, behavior: 'smooth' });
    var f = $('.step:not([hidden]) input:not([type=hidden]):not([tabindex="-1"]), .step:not([hidden]) select', form);
    if (n === 2 && f) setTimeout(function () { f.focus({ preventScroll: true }); }, 50);
  }

  /* 1. lépés: ki jelentkezik */
  $all('.who button').forEach(function (b) {
    b.addEventListener('click', function () {
      ki = b.dataset.ki;
      $all('.who button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      var t = SZOVEG[ki];
      $('#s2cim').textContent = t.cim; $('#s2sub').textContent = t.sub;
      $('#l_nev').innerHTML = t.nev + REQ; $('#l_tel').innerHTML = t.tel + REQ; $('#l_email').innerHTML = t.email + REQ; $('#l_osztaly').innerHTML = t.osztaly + REQ;
      mutat(2);
    });
  });

  /* 2. lépés: ellenőrzés */
  var SZABALY = {
    nev: function (v) { return v.length >= 2; },
    telefon: function (v) { return v.replace(/\D/g, '').length >= 8; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
    osztaly: function (v) { return !!v; }
  };
  function mezo(name) { return String(form.elements[name].value || '').trim(); }
  function ellenoriz(fld) { var k = fld.dataset.req, good = SZABALY[k](mezo(k)); fld.classList.toggle('invalid', !good); return good; }
  $all('[data-req]').forEach(function (fld) {
    var h = function () { if (fld.classList.contains('invalid')) ellenoriz(fld); };
    fld.addEventListener('input', h); fld.addEventListener('change', h);
  });
  form.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); bNext.click(); } });

  function idopontok() {
    return $all('.day').filter(function (d) { return $('input[type=checkbox]', d).checked; }).map(function (d) {
      return { nap: d.dataset.nap, tol: $('select[data-k=tol]', d).value, ig: $('select[data-k=ig]', d).value };
    });
  }

  bBack.addEventListener('click', function () { mutat(lepes - 1); });
  bNext.addEventListener('click', function () {
    if (lepes === 2) {
      var bad = $all('[data-req]').filter(function (f) { return !ellenoriz(f); });
      if (bad.length) { $('input,select', bad[0]).focus(); return; }
      return mutat(3);
    }
    if (lepes === 3) {
      var ido = idopontok(), nap = $all('.day').every(ellenorizNap);
      $('#idoErr').style.display = ido.length ? 'none' : 'block';
      if (!ido.length || !nap) return;
      kuld(ido);
    }
  });

  function kuld(ido) {
    var data = {
      ki: ki, nev: mezo('nev'), telefon: mezo('telefon'), email: mezo('email'), osztaly: Number(mezo('osztaly')),
      idopontok: ido, weboldal: mezo('weboldal'), eltelt_ms: Date.now() - start,
      forras: document.referrer ? document.referrer.slice(0, 200) : ''
    };
    bNext.disabled = true; bNext.textContent = 'Küldés…';
    fetch('/api/jelentkezes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok) throw new Error(res.j.hiba || 'hiba');
        form.style.display = 'none';
        dots.forEach(function (li) { li.classList.remove('on'); li.classList.add('done'); });
        var ok = $('#jfOk'); ok.classList.add('on'); ok.focus();
        try { if (window.gtag) gtag('event', 'generate_lead', { form: 'jelentkezes', ki: ki, osztaly: data.osztaly }); } catch (e) {}
      })
      .catch(function (err) {
        bNext.disabled = false; bNext.textContent = 'Jelentkezés elküldése';
        var msg = err && err.message && err.message !== 'hiba' && err.message.length < 200 ? err.message : 'Valami hiba történt a küldés közben.';
        alertBox.innerHTML = msg + ' Próbáld újra pár perc múlva, vagy jelentkezz közvetlenül: <a href="tel:+36302165768">+36 30 216 5768</a> · <a href="mailto:papaimatek@gmail.com">papaimatek@gmail.com</a>';
        alertBox.classList.add('on'); alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
  }

  /* ?ki=szulo | diak – közvetlen ugrás a 2. lépésre */
  try { var pre = new URLSearchParams(location.search).get('ki'); var b = pre && $('.who button[data-ki="' + pre.replace(/[^a-z]/g, '') + '"]'); if (b) b.click(); } catch (e) {}
})();
