/* Felső, becsukható ajánló sáv (matek korrepetálás) – papaimatek.hu */
(function () {
  var KEY = 'pm_promo_closed_until', DAYS = 14;
  try { if (Date.now() < +(localStorage.getItem(KEY) || 0)) return; } catch (e) {}
  var FORM = 'https://forms.gle/BPX5QuBQwEtLPZpPA';
  var p = location.pathname, txt;
  if (/^\/erettsegi\//.test(p)) {
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
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var bar = document.createElement('div'); bar.className = 'pm-promo'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Matek korrepetálás');
    bar.innerHTML = '<div class="pm-promo-in"><span>' + txt + '</span><a class="pm-promo-go" href="' + FORM + '" target="_blank" rel="noopener">Ingyenes első óra →</a>'
      + '<button class="pm-promo-x" type="button" aria-label="Ajánló bezárása" title="Bezárás">×</button></div>';
    bar.querySelector('.pm-promo-x').onclick = function () {
      bar.remove(); try { localStorage.setItem(KEY, String(Date.now() + DAYS * 864e5)); } catch (e) {}
    };
    head.insertAdjacentElement('afterend', bar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
