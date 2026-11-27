/* Felső, becsukható ajánló sáv + a „8 hét – 8 felvételi feladatsor” ajánló – papaimatek.hu */
(function () {
  var p = location.pathname;
  /* „8 alkalmas online felvételi felkészítő”: 2027. jan. 22-ig a 8. osztályos oldalakon */
  var PROG_VEGE = Date.UTC(2027, 0, 22, 16, 0);
  var feladatoldal = /^\/(felveteli|temakor)\//.test(p);
  var bank = p === '/feladatadatbazis.html';
  var PROGRAM_AKTIV = false; // a 8 alkalmas program ajánlója kikapcsolva (újraindításkor: true + új PROG_VEGE)
  var program = PROGRAM_AKTIV && (feladatoldal || bank) && Date.now() < PROG_VEGE;
  function esemeny(hely) { try { if (window.gtag) gtag('event', 'program_cta', { program: '8het', hely: hely }); } catch (e) {} }
  function stilus(css, id) { if (document.getElementById(id)) return; var st = document.createElement('style'); st.id = id; st.textContent = css; document.head.appendChild(st); }

  /* feladatsor- és témakör-oldalak: egy visszafogott, oldalba illő ajánló a gombok alatt (felső sáv nélkül) */
  if (program && feladatoldal) {
    var kartya = function () {
      if (document.querySelector('.pm8c')) return;
      var main = document.querySelector('main'); if (!main) return;
      var utan = main.querySelector('.pdfrow') || main.querySelector('p.lead') || main.querySelector('h1');
      if (!utan) return;
      stilus(".pm8c{display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;background:#FFFFFD;border:1px solid #DCE0DA;border-left:4px solid #1F6F64;border-radius:12px;padding:12px 16px;margin:18px 0 22px;font-family:\"Alegreya Sans\",system-ui,sans-serif;color:#1D2733;line-height:1.4}.pm8c-tx{flex:1 1 320px;font-size:15.5px}.pm8c-tx b{font-weight:800}.pm8c-n{display:inline-block;background:#F3DE9A;color:#1D2733;font-size:11.5px;font-weight:800;letter-spacing:.08em;border-radius:6px;padding:1px 6px;margin-right:6px;vertical-align:1px}.pm8c-tx .pm8c-s{display:block;color:#5B6672;font-size:14.5px;margin-top:2px}.pm8c-go{flex:none;display:inline-flex;align-items:center;white-space:nowrap;border:1.5px solid #1F6F64;color:#1F6F64;font-weight:800;font-size:14.5px;text-decoration:none;border-radius:999px;padding:7px 14px}.pm8c-go:hover{background:#1F6F64;color:#fff}", 'pm8c-css');
      var w = document.createElement('div'); w.innerHTML = "<aside class=\"pm8c\" aria-label=\"8 alkalmas online felvételi felkészítő\"><div class=\"pm8c-tx\"><span class=\"pm8c-n\">ÚJ</span><b>8 alkalmas online felvételi felkészítő 8. osztályosoknak</b><span class=\"pm8c-s\">8 × 60 perc · minden órán egy teljes felvételi feladatsor · visszanézhető órák · 19 990 Ft (kevesebb mint 2 500 Ft / alkalom)</span></div><a class=\"pm8c-go\" href=\"/8het-8feladatsor\">Részletek →</a></aside>";
      var el = w.firstChild; el.querySelector('a').addEventListener('click', function () { esemeny('feladatoldal'); });
      utan.insertAdjacentElement('afterend', el);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', kartya); else kartya();
    return;
  }

  /* felső sáv */
  var KEY = program ? 'pm_promo8_closed_until' : 'pm_promo_closed_until', DAYS = program ? 7 : 14;
  try { if (Date.now() < +(localStorage.getItem(KEY) || 0)) return; } catch (e) {}
  var LINK = '/jelentkezes.html', GOMB = 'Ingyenes első óra →', txt;
  if (program) {
    txt = '<b>Új: 8 alkalmas online felvételi felkészítő 8. osztályosoknak</b> – minden órán egy teljes feladatsor, visszanézhető órák, 19 990 Ft.';
    LINK = '/8het-8feladatsor'; GOMB = 'Részletek →';
  } else if (/^\/erettsegi\//.test(p)) {
    var other = /(magyar|tori|angol|nemet)\.html$/.test(p);
    txt = other
      ? '<b>Matekból is segítség kell?</b> Egyéni matek korrepetálás középiskolásoknak, Pápán vagy online – az első óra ingyenes.'
      : '<b>Elakadtál a matekkal?</b> Egyéni korrepetálás középiskolásoknak, érettségire is – Pápán vagy online, az első óra ingyenes.';
  } else {
    txt = '<b>Felvételire készülsz?</b> Egyéni matek felkészítés 4., 6. és 8. osztályosoknak – Pápán vagy online, az első óra ingyenes.';
  }
  var css = '.pm-promo{background:#D5E6E1;border-bottom:1px solid #B9D3CB;font-family:"Alegreya Sans",system-ui,sans-serif;color:#1D2733}'
    + '.pm-promo-in{max-width:1100px;margin:0 auto;padding:9px 48px 9px 20px;display:flex;align-items:center;justify-content:center;gap:8px 16px;flex-wrap:wrap;position:relative;font-size:15.5px;line-height:1.35}'
    + '.pm-promo-in b{font-weight:700}'
    + '.pm-promo-go{display:inline-flex;align-items:center;white-space:nowrap;background:#1F6F64;color:#fff;font-weight:700;text-decoration:none;border-radius:999px;padding:6px 14px;font-size:14.5px}'
    + '.pm-promo-go:hover{background:#185A51}'
    + '.pm-promo-x{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;border-radius:50%;background:transparent;color:#1D2733;font-size:20px;line-height:1;cursor:pointer}'
    + '.pm-promo-x:hover{background:rgba(29,39,51,.08)}'
    + '@media(max-width:640px){.pm-promo-in{justify-content:flex-start;padding:8px 44px 9px 14px;font-size:14px}.pm-promo-go{padding:5px 12px;font-size:13.5px}}';
  function mount() {
    var head = document.querySelector('header'); if (!head || document.querySelector('.pm-promo')) return;
    stilus(css, 'pm-promo-css');
    var bar = document.createElement('div'); bar.className = 'pm-promo'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', program ? 'Online felvételi felkészítő' : 'Matek korrepetálás');
    bar.innerHTML = '<div class="pm-promo-in"><span>' + txt + '</span><a class="pm-promo-go" href="' + LINK + '"' + (program ? '' : ' target="_blank" rel="noopener"') + '>' + GOMB + '</a>'
      + '<button class="pm-promo-x" type="button" aria-label="Ajánló bezárása" title="Bezárás">×</button></div>';
    bar.querySelector('.pm-promo-x').onclick = function () {
      bar.remove(); try { localStorage.setItem(KEY, String(Date.now() + DAYS * 864e5)); } catch (e) {}
    };
    if (program) bar.querySelector('.pm-promo-go').addEventListener('click', function () { esemeny('felso-sav'); });
    head.insertAdjacentElement('afterend', bar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
