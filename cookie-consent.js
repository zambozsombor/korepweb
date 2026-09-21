/* papaimatek.hu — süti-hozzájárulás (Google Consent Mode v2)
   A gtag inline snippet már 'denied' alapértelmezett hozzájárulást állít be,
   és 'granted'-re vált, ha korábban elfogadták (localStorage: pm_cookie_consent).
   Ez a script csak a sávot jeleníti meg, ha még nincs döntés. */
(function () {
  var KEY = 'pm_cookie_consent';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored === 'granted' || stored === 'denied') return; // már döntött

  function apply(granted) {
    try { localStorage.setItem(KEY, granted ? 'granted' : 'denied'); } catch (e) {}
    if (typeof window.gtag === 'function') {
      gtag('consent', 'update', { 'analytics_storage': granted ? 'granted' : 'denied' });
    }
    hide();
  }
  var bar = null;
  function hide() { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); }

  function show() {
    if (!document.body) { return; }
    bar = document.createElement('div');
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Süti-hozzájárulás');
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:780px;margin:0 auto;background:#2f1866;color:#f5f1ff;border:1px solid rgba(255,255,255,.14);border-radius:16px;box-shadow:0 18px 50px rgba(0,0,0,.45);padding:16px 18px;font-family:Inter,system-ui,Arial,sans-serif;font-size:14px;line-height:1.5;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;';
    bar.innerHTML =
      '<div style="flex:1 1 320px;min-width:240px;">Sütiket használunk a látogatottság méréséhez (Google Analytics). Ehhez a hozzájárulásodat kérjük — enélkül nem tárolunk analitikai sütit. Részletek az <a href="/adatkezeles.html" style="color:#c7f3ec;">adatkezelési tájékoztatóban</a>.</div>' +
      '<div style="display:flex;gap:8px;flex:0 0 auto;">' +
      '<button type="button" id="pmCkDecline" style="font-family:\'Baloo 2\',Inter,sans-serif;font-weight:700;cursor:pointer;border:1.5px solid rgba(255,255,255,.3);background:transparent;color:#f5f1ff;padding:10px 16px;border-radius:999px;font-size:14px;">Elutasítom</button>' +
      '<button type="button" id="pmCkAccept" style="font-family:\'Baloo 2\',Inter,sans-serif;font-weight:700;cursor:pointer;border:none;background:#f5e463;color:#2f1866;padding:10px 18px;border-radius:999px;font-size:14px;">Elfogadom</button>' +
      '</div>';
    document.body.appendChild(bar);
    document.getElementById('pmCkAccept').addEventListener('click', function () { apply(true); });
    document.getElementById('pmCkDecline').addEventListener('click', function () { apply(false); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', show);
  } else {
    show();
  }
})();
