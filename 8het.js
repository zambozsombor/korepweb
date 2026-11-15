/* „8 hét – 8 felvételi feladatsor” jelentkezés – a beküldés a /api/8het végpontra megy */
(function () {
  var form = document.getElementById('jf');
  if (!form) return;
  var $ = function (s) { return document.querySelector(s); };
  var $all = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var btn = $('#jfBtn'), alertBox = $('#jfAlert'), start = Date.now();

  var SZABALY = {
    diak_nev: function (v) { return v.length >= 2; },
    diak_email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
    beleegyezes: function () { return form.elements.beleegyezes.checked; },
    szulo_nev: function (v) { return v.length >= 2; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); },
    telefon: function (v) { return v.replace(/\D/g, '').length >= 8; },
    felveteli_ev: function (v) { return v === '2027' || v === '2028'; }
  };
  function mezo(n) { var el = form.elements[n]; return el.type === 'checkbox' ? (el.checked ? '1' : '') : String(el.value || '').trim(); }
  function ellenoriz(f) { var k = f.dataset.req, ok = SZABALY[k](mezo(k)); f.classList.toggle('invalid', !ok); return ok; }
  $all('[data-req]').forEach(function (f) {
    var h = function () { if (f.classList.contains('invalid')) ellenoriz(f); };
    f.addEventListener('input', h); f.addEventListener('change', h);
  });

  /* mobilon lebegő gomb – eltűnik, amikor az űrlap látszik */
  var mcta = $('#mcta'), sec = $('#jelentkezes');
  if (mcta && sec && 'IntersectionObserver' in window) {
    /* elrejtjük, amíg a fenti ajánlat gombja vagy maga az űrlap látszik – ne legyen dupla gomb */
    var latszik = new Map(), cel = [sec, $('.offer .go')].filter(Boolean);
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { latszik.set(e.target, e.isIntersecting); });
      mcta.classList.toggle('hide', cel.some(function (t) { return latszik.get(t); }));
    }, { threshold: 0.05 });
    cel.forEach(function (t) { io.observe(t); });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-lk]');
    if (a && window.gtag) { try { gtag('event', 'program_cta', { program: '8het', hely: a.getAttribute('data-lk') }); } catch (x) {} }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    alertBox.classList.remove('on');
    var bad = $all('[data-req]').filter(function (f) { return !ellenoriz(f); });
    if (bad.length) { bad[0].querySelector('input,select').focus(); bad[0].scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    var data = {
      diak_nev: mezo('diak_nev'), diak_email: mezo('diak_email'), beleegyezes: !!mezo('beleegyezes'), szulo_nev: mezo('szulo_nev'), email: mezo('email'), telefon: mezo('telefon'),
      felveteli_ev: Number(mezo('felveteli_ev')), megjegyzes: mezo('megjegyzes'),
      weboldal: mezo('weboldal'), eltelt_ms: Date.now() - start,
      forras: document.referrer ? document.referrer.slice(0, 200) : ''
    };
    btn.disabled = true; btn.textContent = 'Átirányítás a fizetéshez…';
    fetch('/api/8het', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.ok || !res.j.url) throw new Error(res.j.hiba || 'hiba');
        try { if (window.gtag) gtag('event', 'begin_checkout', { program: '8het', value: 19990, currency: 'HUF' }); } catch (x) {}
        location.href = res.j.url;
      })
      .catch(function (err) {
        btn.disabled = false; btn.textContent = 'Tovább a fizetéshez – 19 990 Ft';
        var msg = err && err.message && err.message !== 'hiba' && err.message.length < 200 ? err.message : 'Valami hiba történt a küldés közben.';
        alertBox.innerHTML = msg + ' Próbáld újra pár perc múlva, vagy jelentkezz közvetlenül: <a href="tel:+36302165768">+36 30 216 5768</a> · <a href="mailto:papaimatek@gmail.com">papaimatek@gmail.com</a>';
        alertBox.classList.add('on'); alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
  });

  /* visszatérés a Stripe fizetőoldalról */
  try {
    var q = new URLSearchParams(location.search).get('fizetes');
    if (q === 'sikeres') {
      form.style.display = 'none';
      var ok = $('#jfOk'); ok.classList.add('on');
      setTimeout(function () { ok.scrollIntoView({ block: 'center' }); }, 60);
      try { if (window.gtag) gtag('event', 'purchase', { program: '8het', value: 19990, currency: 'HUF' }); } catch (x) {}
    } else if (q === 'megszakitva') {
      alertBox.innerHTML = 'A fizetés nem fejeződött be, így a jelentkezés nem érvényes. Ha szeretnél csatlakozni, töltsd ki újra az űrlapot – vagy hívj: <a href="tel:+36302165768">+36 30 216 5768</a>.';
      alertBox.classList.add('on');
      setTimeout(function () { $('#jelentkezes').scrollIntoView({ block: 'start' }); }, 60);
    }
    if (q) history.replaceState(null, '', location.pathname + '#jelentkezes');
  } catch (e) {}
})();
