/* Felvételi feladatbank – az érettségi feladatbank szűrő- és nézegetőrendszere a központi írásbeli felvételi feladatsorokhoz (4., 6., 8. osztály) */
(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  let RAW = null;
  try { RAW = JSON.parse($('#bankdata').textContent); } catch (e) { RAW = null; }
  if (!RAW || !window.pdfjsLib) { const s = $('#stat'); if (s) s.textContent = 'Az adatok nem töltődtek be. Töltsd újra az oldalt.'; return; }
  const PDF_DIR = '/feladatadatbazis/pdf/';
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/feladatadatbazis/pdfjs/pdf.worker.min.js';
  let pdfWorker = null;
  try { pdfWorker = new pdfjsLib.PDFWorker(); } catch (e) { pdfWorker = null; }
  let progressCb = null;

  /* ---------- témakörök: sorrend + rövid név a témasávhoz ---------- */
  const T8 = [
    ['Alapműveletek, számelmélet', 'Alapműveletek, számelmélet', 'alapmuveletek-szamelmelet'],
    ['Mértékegység átváltások', 'Mértékegység-váltás', 'mertekegyseg-atvaltasok'],
    ['Kombinatorika, logika', 'Kombinatorika, logika', 'kombinatorika-logika'],
    ['Feleletválasztós feladatok (karikázós, igaz-hamis)', 'Feleletválasztós (igaz-hamis)', 'feleletvalasztos-feladatok'],
    ['A bekövetkezés valószínűsége', 'Valószínűség', 'valoszinuseg'],
    ['Sorozatok', 'Sorozatok', 'sorozatok'],
    ['Grafikonok, diagramok, táblázatok', 'Grafikonok, diagramok', 'grafikonok-diagramok-tablazatok'],
    ['Függvények, koordináta-rendszer, kapcsolódó egyenletek', 'Függvények, koordináta-rendszer', 'fuggvenyek-koordinatarendszer'],
    ['Egyenletek', 'Egyenletek', 'egyenletek'],
    ['Síkgeometria', 'Síkgeometria', 'sikgeometria'],
    ['Térgeometria', 'Térgeometria', 'tergeometria'],
    ['Arány, százalék', 'Arány, százalék', 'arany-szazalek'],
    ['Átlag', 'Átlag', 'atlag'],
    ['Egyenlettel megoldható feladatok (egyenes arányosság, logika)', 'Szöveges: arányosság, logika', 'szoveges-egyenes-aranyossag'],
    ['Egyenlettel megoldható feladatok (hozzáad, elvesz, több, kevesebb stb.)', 'Szöveges: több–kevesebb', 'szoveges-egyenletek'],
    ['Egyéb egyenlettel megoldható feladatok', 'Egyéb szöveges egyenlet', 'egyeb-szoveges-egyenletek'],
  ];
  const T46 = [
    ['Alapműveletek, műveleti sorrend', 'Alapműveletek, műveleti sorrend', 'alapmuveletek'],
    ['Számelmélet, számjegyek, oszthatóság', 'Számelmélet, oszthatóság', 'szamelmelet'],
    ['Mértékegység-átváltások', 'Mértékegység-átváltások', 'mertekegyseg-atvaltasok'],
    ['Logikai feladatok', 'Logikai feladatok', 'logikai-feladatok'],
    ['Kombinatorika', 'Kombinatorika', 'kombinatorika'],
    ['Valószínűség', 'Valószínűség', 'valoszinuseg'],
    ['Sorozatok, szabályok, minták', 'Sorozatok, szabályok, minták', 'sorozatok-szabalyok'],
    ['Szöveges feladatok', 'Szöveges feladatok', 'szoveges-feladatok'],
    ['Arány, százalék', 'Arány, százalék', 'arany-szazalek'],
    ['Átlag, statisztika', 'Átlag, statisztika', 'atlag-statisztika'],
    ['Grafikonok, diagramok, táblázatok', 'Grafikonok, diagramok', 'grafikonok-diagramok'],
    ['Síkgeometria', 'Síkgeometria', 'sikgeometria'],
    ['Térgeometria', 'Térgeometria', 'tergeometria'],
  ];
  const GR = {
    '8': { nev: '8. osztály', hosszu: '8. osztály – középiskola (9. évfolyam)', temak: T8, seoBase: '', who: 'a 8. évfolyamos, <strong>9. évfolyamra</strong> jelentkező diákok számára', gkw: '8. osztály' },
    '6': { nev: '6. osztály', hosszu: '6. osztály – 6 évfolyamos gimnázium', temak: T46, seoBase: '/6-osztaly', who: 'a <strong>6. osztályos</strong>, 6 évfolyamos gimnáziumba jelentkező diákok számára', gkw: '6. osztály' },
    '4': { nev: '4. osztály', hosszu: '4. osztály – 8 évfolyamos gimnázium', temak: T46, seoBase: '/4-osztaly', who: 'a <strong>4. osztályos</strong>, 8 évfolyamos gimnáziumba jelentkező diákok számára', gkw: '4. osztály' },
  };

  /* ---------- adatok: feladatlapok (vizsgák) és feladatok osztályonként ---------- */
  const DB = {};
  for (const g of Object.keys(RAW.osztalyok)) {
    const vizsgak = [], feladatok = [];
    const evek = RAW.osztalyok[g].evek || {};
    Object.keys(evek).forEach((y) => (evek[y] || []).forEach((p) => {
      const m = /M(\d)_(\d+)_(\d+)_fl/.exec(p.fl || '');
      const sk = m ? `${m[1]}_${m[2]}_${m[3]}` : `${p.datum || ''}_${p.fordulo || ''}`;
      const v = { id: `${g}-${y}-${p.fordulo}`, g, ev: +y, ford: p.fordulo, datum: p.datum || `${y}.`, fl: PDF_DIR + p.fl, ut: p.ut ? PDF_DIR + p.ut : '', flNev: p.fl, utNev: p.ut, sk, n: (p.tasks || []).length };
      vizsgak.push(v);
      (p.tasks || []).forEach((t) => feladatok.push({
        id: `${v.id}-${t.n}`, v, n: t.n, tema: t.tema || '', fl: [t.flp, t.fly], ut: [t.utp, t.uty],
        _sort: v.ev * 100 + (10 - Math.min(9, v.ford)) * 0 + v.ford,
      }));
    }));
    DB[g] = { vizsgak, feladatok, evek: [...new Set(vizsgak.map((v) => v.ev))].sort((a, b) => a - b) };
  }
  const fordNev = (v) => `${v.ford}. feladatlap`;
  const vizsgaNev = (v) => `${v.ev}. – ${fordNev(v)}`;

  /* ---------- állapot ---------- */
  const st = { g: '8', mod: 'szures', temak: new Set(), lap: '', tol: null, ig: null, vEv: null, vFord: null, aktiv: null, doc: 'fl' };
  const D = () => DB[st.g];
  const temaRovid = (nev) => { const t = GR[st.g].temak.find((x) => x[0] === nev); return t ? t[1] : nev; };
  function resetEvek() { const e = D().evek; st.tol = e[0]; st.ig = e[e.length - 1]; }
  resetEvek();

  /* ---------- URL <-> állapot (a régi mélylinkek is működnek: ?osztaly, ?temakor, ?ev&ford&feladat) ---------- */
  function readUrl() {
    const q = new URLSearchParams(location.search);
    if (q.get('osztaly') && DB[q.get('osztaly')]) { st.g = q.get('osztaly'); resetEvek(); }
    const nevek = GR[st.g].temak.map((t) => t[0]);
    q.getAll('temakor').forEach((t) => { const hit = nevek.find((n) => n.toLowerCase() === String(t).toLowerCase()); if (hit) st.temak.add(hit); });
    if (q.get('lap')) st.lap = q.get('lap');
    if (q.get('tol')) st.tol = +q.get('tol');
    if (q.get('ig')) st.ig = +q.get('ig');
    if (q.get('doc') === 'ut') st.doc = 'ut';
    const ev = q.get('ev'), ford = q.get('ford'), fel = q.get('feladat');
    if (ev && ford) {
      const v = D().vizsgak.find((x) => String(x.ev) === ev && String(x.ford) === ford);
      if (v) {
        if (!fel || fel === 'full') { st.mod = 'vizsga'; st.vEv = v.ev; st.vFord = v.ford; return { full: v }; }
        if (q.get('mod') === 'sor') { st.mod = 'vizsga'; st.vEv = v.ev; st.vFord = v.ford; }
        return { f: D().feladatok.find((f) => f.v === v && String(f.n) === fel) };
      }
    }
    if (q.get('mod') === 'sor') st.mod = 'vizsga';
    return null;
  }
  function writeUrl() {
    const q = new URLSearchParams();
    if (st.g !== '8') q.set('osztaly', st.g);
    if (st.mod === 'szures') {
      st.temak.forEach((t) => q.append('temakor', t));
      if (st.lap) q.set('lap', st.lap);
      const e = D().evek;
      if (st.tol !== e[0]) q.set('tol', st.tol);
      if (st.ig !== e[e.length - 1]) q.set('ig', st.ig);
    } else q.set('mod', 'sor');
    const a = st.aktiv;
    if (a) { q.set('ev', a.v.ev); q.set('ford', a.v.ford); q.set('feladat', a._full ? 'full' : a.n); }
    else if (st.mod === 'vizsga') { const v = aktualisVizsga(); if (v) { q.set('ev', v.ev); q.set('ford', v.ford); q.set('feladat', 'full'); q.delete('mod'); } }
    if (st.doc === 'ut') q.set('doc', 'ut');
    const s = q.toString();
    history.replaceState(null, '', s ? '?' + s : location.pathname);
  }

  /* ---------- szűrés ---------- */
  function szurt({ temaNelkul = false, kiveve = null } = {}) {
    return D().feladatok.filter((f) => f.v.ev >= st.tol && f.v.ev <= st.ig
      && (temaNelkul || !st.temak.size || st.temak.has(f.tema))
      && (kiveve === 'lap' || !st.lap || String(f.v.ford) === st.lap));
  }
  function aktualisVizsga() { return D().vizsgak.find((v) => v.ev === st.vEv && v.ford === st.vFord); }
  const teljesCache = new Map();
  function teljes(v) {
    if (!teljesCache.has(v.id)) teljesCache.set(v.id, { id: `teljes-${v.id}`, _full: true, v, n: '', tema: '', fl: [1, 0], ut: [1, 0] });
    return teljesCache.get(v.id);
  }
  function lista() {
    if (st.mod === 'vizsga') { const v = aktualisVizsga(); return v ? D().feladatok.filter((f) => f.v === v).sort((a, b) => a.n - b.n) : []; }
    return szurt().sort((a, b) => b.v.ev - a.v.ev || a.v.ford - b.v.ford || a.n - b.n);
  }

  /* ---------- témasáv ---------- */
  function buildBand() {
    const band = $('#band'); band.innerHTML = '';
    GR[st.g].temak.forEach(([nev, rovid]) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'seg'; b.dataset.kod = nev; b.title = nev;
      b.innerHTML = `<span>${esc(rovid)}</span><span class="n"></span>`;
      b.addEventListener('click', () => { st.temak.has(nev) ? st.temak.delete(nev) : st.temak.add(nev); if (st.mod !== 'szures') setMod('szures'); else render(); });
      band.appendChild(b);
    });
  }
  function updateSegs() {
    const cnt = {}; szurt({ temaNelkul: true }).forEach((f) => { cnt[f.tema] = (cnt[f.tema] || 0) + 1; });
    document.querySelectorAll('#band .seg').forEach((b) => {
      const n = cnt[b.dataset.kod] || 0;
      b.querySelector('.n').textContent = `${n} feladat`;
      b.classList.toggle('off', n === 0);
      b.setAttribute('aria-pressed', st.temak.has(b.dataset.kod));
    });
  }

  /* ---------- vezérlők ---------- */
  function fillSelect(sel, items, val) { if (!sel) return; sel.innerHTML = items.map(([v, t]) => `<option value="${esc(v)}">${esc(t)}</option>`).join(''); if (val != null) sel.value = String(val); }
  function updateLapSelect() {
    const fordok = [...new Set(D().vizsgak.map((v) => v.ford))].sort((a, b) => a - b);
    if (st.lap && !fordok.some((x) => String(x) === st.lap)) st.lap = '';
    const c = {}; szurt({ kiveve: 'lap' }).forEach((f) => { c[f.v.ford] = (c[f.v.ford] || 0) + 1; });
    fillSelect($('#fLap'), [['', 'Mind'], ...fordok.map((x) => [String(x), `${x}. feladatlap (${c[x] || 0})`])], st.lap);
  }
  function initControls() {
    const e = D().evek;
    fillSelect($('#fTol'), e.map((x) => [x, x]), st.tol);
    fillSelect($('#fIg'), e.map((x) => [x, x]), st.ig);
    $('#fLap').onchange = (ev) => { st.lap = ev.target.value; render(); };
    $('#fTol').onchange = (ev) => { st.tol = +ev.target.value; if (st.ig < st.tol) { st.ig = st.tol; $('#fIg').value = st.ig; } render(); };
    $('#fIg').onchange = (ev) => { st.ig = +ev.target.value; if (st.tol > st.ig) { st.tol = st.ig; $('#fTol').value = st.tol; } render(); };
    $('#reset').onclick = () => { st.temak.clear(); st.lap = ''; resetEvek(); initControls(); render(); };
    document.querySelectorAll('.level button').forEach((b) => {
      b.setAttribute('aria-checked', b.dataset.g === st.g);
      b.onclick = () => setGrade(b.dataset.g);
    });
    $('#tabSzures').onclick = () => setMod('szures');
    $('#tabVizsga').onclick = () => setMod('vizsga');
    $('#vEv').onchange = (ev) => { st.vEv = +ev.target.value; syncVizsgaSelects(); render(); };
    $('#vFord').onchange = (ev) => { st.vFord = +ev.target.value; render(); };
  }
  function setGrade(g) {
    if (!DB[g] || g === st.g) return;
    st.g = g; st.temak.clear(); st.lap = ''; resetEvek();
    if (st.aktiv) { st.aktiv = null; shown.url = null; shown.token++; $('#vCim').textContent = 'Válassz egy feladatot'; $('#vMeta').textContent = ''; pagesEl.innerHTML = '<div class="empty"><p>Válassz egy feladatot a listából.</p></div>'; document.body.classList.remove('viewing'); }
    document.querySelectorAll('.level button').forEach((x) => x.setAttribute('aria-checked', x.dataset.g === g));
    buildBand(); initControls(); syncVizsgaSelects(); renderSeoInfo(); render();
  }
  function syncVizsgaSelects() {
    const vk = D().vizsgak;
    const ev = [...new Set(vk.map((v) => v.ev))].sort((a, b) => b - a);
    if (!ev.includes(st.vEv)) st.vEv = ev[0];
    fillSelect($('#vEv'), ev.map((x) => [x, x]), st.vEv);
    const fordok = vk.filter((v) => v.ev === st.vEv).sort((a, b) => a.ford - b.ford);
    if (!fordok.some((v) => v.ford === st.vFord)) st.vFord = fordok[0] && fordok[0].ford;
    fillSelect($('#vFord'), fordok.map((v) => [v.ford, fordNev(v)]), st.vFord);
  }
  function setMod(m) {
    st.mod = m;
    $('#tabSzures').setAttribute('aria-selected', m === 'szures');
    $('#tabVizsga').setAttribute('aria-selected', m === 'vizsga');
    $('#paneSzures').hidden = m !== 'szures';
    $('#paneVizsga').hidden = m !== 'vizsga';
    if (m === 'vizsga') syncVizsgaSelects();
    render();
  }

  /* ---------- lista ---------- */
  function render() {
    updateSegs(); updateLapSelect();
    const L = lista(); st.lista = L;
    const act = $('#activeTema'); act.innerHTML = '';
    [...st.temak].forEach((k) => {
      const b = document.createElement('button');
      b.className = 'chip'; b.type = 'button'; b.textContent = temaRovid(k); b.title = 'Szűrő eltávolítása';
      b.onclick = () => { st.temak.delete(k); render(); };
      act.appendChild(b);
    });
    $('#count').textContent = `${L.length} feladat`;
    const ol = $('#results'); ol.innerHTML = '';
    if (!L.length) ol.innerHTML = '<li class="none">Nincs a szűrésnek megfelelő feladat. Bővítsd az évek körét, vagy vegyél ki egy szűrőt.</li>';
    const frag = document.createDocumentFragment();
    const tv = st.mod === 'vizsga' && aktualisVizsga();
    if (tv) frag.appendChild(fullCard(tv, L.length));
    let last = null;
    L.forEach((f) => {
      const grp = st.mod === 'vizsga' ? '' : `${vizsgaNev(f.v)} · ${f.v.datum}`;
      if (grp && grp !== last) { const g = document.createElement('li'); g.className = 'groupname'; g.textContent = grp; frag.appendChild(g); last = grp; }
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.id = f.id;
      if (st.aktiv && st.aktiv.id === f.id) b.setAttribute('aria-current', 'true');
      b.innerHTML = `<span class="r-no">${f.n}.</span><span class="r-cim">${esc(f.tema || `${f.n}. feladat`)}</span>`;
      b.onclick = () => open(f);
      li.appendChild(pg.check(f)); li.appendChild(b); frag.appendChild(li);
    });
    ol.appendChild(frag);
    const all = D().feladatok, e = D().evek;
    $('#stat').textContent = `${GR[st.g].hosszu} · ${D().vizsgak.length} feladatlap, ${all.length} feladat, ${e[0]}–${e[e.length - 1]}`;
    pg.paint(); writeUrl();
  }
  function fullCard(v, n) {
    const F = teljes(v);
    const li = document.createElement('li'); li.className = 'fullexam';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'fe-open'; b.dataset.id = F.id;
    if (st.aktiv && st.aktiv.id === F.id) b.setAttribute('aria-current', 'true');
    b.innerHTML = `<span class="fe-t">Teljes feladatsor megnyitása</span><span class="fe-s">${esc(v.datum)} · ${esc(fordNev(v))} · ${n} feladat</span>`;
    b.onclick = () => open(F);
    const dl = document.createElement('div'); dl.className = 'fe-dl';
    dl.innerHTML = `<span>Letöltés:</span><a href="${esc(v.fl)}" download="${esc(v.flNev)}">Feladatlap (PDF)</a>${v.ut ? `<a href="${esc(v.ut)}" download="${esc(v.utNev)}">Javítási útmutató (PDF)</a>` : ''}`;
    li.appendChild(b); li.appendChild(pg.doneBtn(F)); li.appendChild(dl);
    return li;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* ---------- nézegető (azonos az érettségi feladatbankéval) ---------- */
  const docs = new Map();
  function getDoc(url) {
    if (!docs.has(url)) {
      const task = pdfjsLib.getDocument({ url, worker: pdfWorker || undefined, disableRange: true, isEvalSupported: false });
      task.onProgress = (p) => { if (progressCb) progressCb(p); };
      docs.set(url, task.promise.catch((e) => { docs.delete(url); throw e; }));
      if (docs.size > 12) { for (const [k, pr] of docs) { if (k !== shown.url && k !== url) { docs.delete(k); pr.then((d) => d.destroy()).catch(() => {}); break; } } }
    }
    return docs.get(url);
  }
  let shown = { url: null, width: 0, holders: [], scale: 1, token: 0, obs: null };
  const pagesEl = $('#pages');
  const lapSzel = () => Math.min(pagesEl.clientWidth - 24, document.body.classList.contains('panel-closed') ? 1400 : 980);
  async function buildDoc(url) {
    const token = ++shown.token;
    pagesEl.innerHTML = '<div class="loading">Feladat betöltése…</div>';
    progressCb = (p) => { const el = pagesEl.querySelector('.loading'); if (el && p.loaded) el.textContent = `Feladat betöltése… ${Math.round(p.loaded / 1024)} KB`; };
    const pdf = await getDoc(url);
    if (token !== shown.token) return false;
    const p1 = await pdf.getPage(1);
    const vp1 = p1.getViewport({ scale: 1 });
    const width = lapSzel();
    const scale = width / vp1.width;
    pagesEl.innerHTML = '';
    if (shown.obs) shown.obs.disconnect();
    const holders = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const h = document.createElement('div');
      h.className = 'pageholder'; h.style.width = `${width}px`; h.style.height = `${vp1.height * scale}px`; h.dataset.page = i;
      pagesEl.appendChild(h); holders.push(h);
    }
    pagesEl.style.paddingTop = '12px';
    const obs = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) renderPage(pdf, e.target, scale, token); }), { root: pagesEl, rootMargin: '800px 0px' });
    shown = { url, width, holders, scale, token, obs, pdf };
    return true;
  }
  async function renderPage(pdf, h, scale, token) {
    if (h.dataset.done) return;
    h.dataset.done = '1';
    const page = await pdf.getPage(+h.dataset.page);
    if (token !== shown.token) return;
    const vp = page.getViewport({ scale });
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3, Math.sqrt(16e6 / (vp.width * vp.height)));
    const c = document.createElement('canvas');
    c.width = Math.floor(vp.width * dpr); c.height = Math.floor(vp.height * dpr);
    h.style.height = `${vp.height}px`;
    h.appendChild(c);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null }).promise;
  }
  async function show(keep) {
    const f = st.aktiv; if (!f) return;
    const v = f.v;
    const url = v[st.doc];
    if (!url) { shown.url = null; pagesEl.innerHTML = '<div class="empty"><p>Ehhez a feladatlaphoz nincs javítási útmutató a gyűjteményben.</p></div>'; return; }
    const pos = f[st.doc] || [1, 0];
    if (shown.url !== url || Math.abs(shown.width - lapSzel()) > 2) {
      const ok = await buildDoc(url).catch((e) => { pagesEl.innerHTML = '<div class="empty"><p>A feladat nem tölthető be. Ha közben frissült az oldal, töltsd újra.</p><p><button type="button" class="linkbtn" onclick="location.reload()">Oldal újratöltése</button></p></div>'; console.error(e); return false; });
      if (!ok) return;
    }
    const h = shown.holders[(pos[0] || 1) - 1];
    if (!h) return;
    await renderPage(shown.pdf, h, shown.scale, shown.token);
    if (shown.holders[pos[0]]) renderPage(shown.pdf, shown.holders[pos[0]], shown.scale, shown.token);
    pagesEl.scrollTop = keep != null ? keep * shown.scale : h.offsetTop + (pos[1] || 0) * shown.scale - 10;
    if (!shown.observing) { shown.observing = true; requestAnimationFrame(() => shown.holders.forEach((x) => shown.obs.observe(x))); }
    $('#vOpen').href = `${url}#page=${pos[0] || 1}`;
    const pre = [st.doc === 'fl' ? v.ut : v.fl];
    const L = st.lista || []; const i = L.findIndex((x) => x.id === f.id);
    [L[i + 1], L[i - 1]].forEach((x) => { if (x) pre.push(x.v.fl); });
    setTimeout(() => pre.filter(Boolean).forEach((u) => getDoc(u).catch(() => {})), 300);
  }
  function open(f, keepDoc) {
    st.aktiv = f;
    if (!keepDoc) st.doc = 'fl';
    document.querySelectorAll('.doc button').forEach((b) => b.setAttribute('aria-selected', b.dataset.doc === st.doc));
    $('#vCim').textContent = f._full ? `${vizsgaNev(f.v)} – teljes feladatsor` : `${f.n}. feladat${f.tema ? ` – ${f.tema}` : ''}`;
    const parts = [f.v.datum, fordNev(f.v), GR[st.g].nev];
    if (f._full) parts.push(`${f.v.n} feladat`);
    $('#vMeta').innerHTML = `<b>${esc(parts[0])}</b>${parts.slice(1).map((p) => ` <i>·</i> ${esc(p)}`).join('')}`;
    document.querySelectorAll('.results button').forEach((b) => b.toggleAttribute('aria-current', b.dataset.id === f.id));
    document.body.classList.add('viewing');
    pg.paint(); writeUrl(); show();
  }
  document.querySelectorAll('.doc button').forEach((b) => {
    b.onclick = () => { st.doc = b.dataset.doc; document.querySelectorAll('.doc button').forEach((x) => x.setAttribute('aria-selected', x === b)); writeUrl(); show(); };
  });
  function step(d) {
    const L = st.lista || []; if (!st.aktiv) return;
    const i = L.findIndex((f) => f.id === st.aktiv.id);
    const n = L[i + d]; if (n) open(n, true);
  }
  $('#vPrev').onclick = () => step(-1);
  $('#vNext').onclick = () => step(1);
  $('#vBack').onclick = () => document.body.classList.remove('viewing');
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input,select')) return;
    if (e.key === 'ArrowRight' && e.altKey) step(1);
    if (e.key === 'ArrowLeft' && e.altKey) step(-1);
  });
  let rz; window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (st.aktiv && Math.abs(shown.width - lapSzel()) > 2) show(pagesEl.scrollTop / shown.scale); }, 250); });

  /* ---------- a bal oldali lista és szűrő ki-/becsukása (asztali nézet) ---------- */
  (function panelKapcsolo() {
    const bar = $('#viewer .vbar'); if (!bar) return;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'ptoggle'; btn.id = 'panelToggle';
    bar.insertBefore(btn, bar.firstChild);
    const set = (zart, menti) => {
      document.body.classList.toggle('panel-closed', zart);
      btn.setAttribute('aria-expanded', String(!zart));
      btn.innerHTML = zart ? '<span aria-hidden="true">☰</span> Lista' : '<span aria-hidden="true">‹</span> Lista elrejtése';
      btn.title = zart ? 'A feladatlista és a szűrők megjelenítése' : 'A feladatlista és a szűrők elrejtése – nagyobb feladatlap';
      if (menti) try { localStorage.setItem('pm_panel_zart', zart ? '1' : '0'); } catch (e) {}
    };
    let zart = false; try { zart = localStorage.getItem('pm_panel_zart') === '1'; } catch (e) {}
    set(zart, false);
    btn.onclick = () => {
      const keep = st.aktiv && shown.scale ? pagesEl.scrollTop / shown.scale : null;
      set(!document.body.classList.contains('panel-closed'), true);
      if (st.aktiv) requestAnimationFrame(() => show(keep));
    };
  })();

  /* ---------- haladás (a korábbi kulcsokkal: t:<o>_<év>_<lap>_<n>, s:<o>_<év>_<lap>) ---------- */
  const pg = (() => {
    const PM = window.PM;
    const rate = {};
    let user = null;
    const key = (f) => (f._full ? `s:${f.v.sk}` : `t:${f.v.sk}_${f.n}`);
    const rOf = (k) => (k in rate ? rate[k] : null);
    const nav = document.querySelector('.vbar .nav');
    const rateBox = PM && PM.rateInline ? PM.rateInline(null, (n) => { if (st.aktiv) setRate(st.aktiv, n); }) : null;
    if (rateBox) { rateBox.classList.add('er-rate'); rateBox.hidden = true; if (nav) nav.insertBefore(rateBox, nav.firstChild); }
    function setRate(f, n) {
      if (!PM) return;
      if (!user) { if (PM.openLogin) PM.openLogin(); return; }
      const k = key(f); if (n) rate[k] = n; else delete rate[k]; paint();
      PM.saveRate(k, n);
    }
    // teljes feladatlap kész: a feladatlap feladatai is késznek számítanak (a meglévő értékelések megmaradnak)
    function setDone(F, on) {
      if (!PM) return;
      if (!user) { if (PM.openLogin) PM.openLogin(); return; }
      const sk = key(F);
      if (on) rate[sk] = 0; else delete rate[sk];
      PM.saveProgress(sk, { status: on ? 'kesz' : '' });
      DB[F.v.g].feladatok.filter((f) => f.v === F.v).forEach((f) => {
        const tk = key(f);
        if (on) { if (rOf(tk) === null) { rate[tk] = 0; PM.saveProgress(tk, { status: 'kesz' }); } }
        else if (rOf(tk) !== null) { delete rate[tk]; PM.saveRate(tk, 0); }
      });
      paint();
    }
    function doneBtn(f) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'fe-done'; b.dataset.fkey = f.v.sk ? key(f) : '';
      b.onclick = (e) => { e.stopPropagation(); setDone(f, rOf(key(f)) === null); };
      if (!PM) b.hidden = true;
      return b;
    }
    const navDone = PM ? doneBtn({ _full: true, v: {} }) : null;
    if (navDone) { navDone.hidden = true; navDone.onclick = () => { if (st.aktiv && st.aktiv._full) setDone(st.aktiv, rOf(key(st.aktiv)) === null); }; if (nav) nav.insertBefore(navDone, nav.firstChild); }
    function check(f) {
      const c = document.createElement('button');
      c.type = 'button'; c.className = 'pm-rate-chip'; c.dataset.key = key(f); c.setAttribute('data-rate-anchor', '');
      c.onclick = (e) => { e.stopPropagation(); if (!PM) return; if (!user) { if (PM.openLogin) PM.openLogin(); return; } PM.ratePicker(c, rOf(key(f)), (n) => setRate(f, n)); };
      if (!PM || !PM.rateChip) c.hidden = true;
      return c;
    }
    function paint() {
      if (PM && PM.rateChip) document.querySelectorAll('.pm-rate-chip[data-key]').forEach((c) => PM.rateChip(c, rOf(c.dataset.key)));
      if (rateBox && st.aktiv) { rateBox.hidden = !!st.aktiv._full; if (!st.aktiv._full) rateBox.set(rOf(key(st.aktiv)) || null); }
      if (navDone) { navDone.hidden = !(st.aktiv && st.aktiv._full); if (!navDone.hidden) navDone.dataset.fkey = key(st.aktiv); }
      document.querySelectorAll('.fe-done[data-fkey]').forEach((b) => {
        const on = rOf(b.dataset.fkey) !== null;
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
        b.innerHTML = on ? '<i>✓</i> Feladatsor kész' : '<i></i> Késznek jelölöm';
        b.title = on ? 'Kattints a jelölés visszavonásához' : 'A teljes feladatsor megjelölése késznek (a Haladásom oldalon is látszik)';
      });
      const line = $('#progressLine');
      if (!line) return;
      if (PM && user) {
        const all = D().feladatok;
        const n = all.filter((f) => rOf(key(f)) !== null).length;
        const hard = all.filter((f) => { const r = rOf(key(f)); return r && r <= 2; }).length;
        line.className = 'progressline in';
        line.innerHTML = `<b>Megoldva: ${n} / ${all.length}</b> ${GR[st.g].nev}os feladat${hard ? ` · ${hard} nehezen ment` : ''} · <a href="/haladas-felveteli.html">Részletes haladás</a>`;
      } else if (PM) {
        line.className = 'progressline nudge';
        line.innerHTML = '<span><b>Kövesd a haladásod!</b> Lépj be, és értékeld 1–5-ig, hogy ment egy-egy feladat – a Haladásom oldalon témakörönként visszanézheted a nehezebbeket.</span><button type="button" class="nudge-btn">Belépés</button>';
        line.querySelector('button').onclick = () => { if (PM.openLogin) PM.openLogin(); };
      } else line.textContent = '';
    }
    function refresh() {
      PM.loadProgress().then((map) => {
        Object.keys(rate).forEach((k) => delete rate[k]);
        Object.keys(map || {}).forEach((k) => { if (/^[ts]:/.test(k)) { const r = PM.rateOf(map[k]); if (r !== null) rate[k] = r; } });
        paint();
      });
    }
    if (PM) {
      PM.onChange((u) => { user = u; if (u) refresh(); else { Object.keys(rate).forEach((k) => delete rate[k]); paint(); } });
      PM.getUser().then((u) => { user = u; if (u) refresh(); else paint(); });
    }
    return { check, paint, doneBtn };
  })();

  /* ---------- „A feladatbankról” – osztályfüggő SEO-tartalom ---------- */
  function renderSeoInfo() {
    const inf = GR[st.g];
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    set('si-intro', `Ebben az ingyenes feladatbankban a <strong>központi írásbeli felvételi</strong> matematika <strong>feladatsorok</strong> és a hozzájuk tartozó <strong>javítási-értékelési útmutatók (megoldókulcsok)</strong> érhetők el ${inf.who}, <strong>${D().evek[0]}-tól ${D().evek[D().evek.length - 1]}-ig</strong>. Szűrhetsz <strong>témakör, év és feladatlap</strong> szerint, vagy megnyithatod a <strong>teljes feladatsort</strong>. A feladatsorok és megoldókulcsok forrása az <strong>Oktatási Hivatal</strong> hivatalos, nyilvános dokumentumai.`);
    set('si-years', D().evek.map((y) => `<span>${y}</span>`).join(' '));
    set('si-seo', inf.temak.map((t) => `<a href="${inf.seoBase}/temakor/${t[2]}.html">${esc(t[1])}</a>`).join(' '));
    set('si-alllinks', `<a href="${inf.seoBase}/temakor/">Összes témakör →</a> · <a href="${inf.seoBase}/felveteli/">Összes felvételi év (${D().evek[0]}–${D().evek[D().evek.length - 1]}) →</a>`);
    set('si-related', `Kapcsolódó keresések: matek felvételi feladatok megoldással, központi felvételi matematika ${inf.gkw}, felvételi feladatsorok PDF, matematika felvételi megoldókulcs, felvételi gyakorló feladatok témakör szerint.`);
  }
  /* témakör-mélylink: saját cím, leírás és canonical (SEO) */
  function seoMelylink() {
    if (st.temak.size !== 1 || st.aktiv) return;
    const tv = [...st.temak][0];
    document.title = `${tv} – felvételi feladatok és megoldások | papaimatek.hu`;
    const m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute('content', `${tv} témakörű központi írásbeli felvételi matematika feladatok megoldással. Gyakorolj célzottan a papaimatek.hu ingyenes feladatbankjában.`);
    const l = document.querySelector('link[rel=canonical]'); if (l) l.setAttribute('href', `https://www.papaimatek.hu/feladatadatbazis.html?${st.g !== '8' ? `osztaly=${st.g}&` : ''}temakor=${encodeURIComponent(tv)}`);
  }

  /* ---------- indulás ---------- */
  const cel = readUrl();
  buildBand();
  initControls();
  renderSeoInfo();
  setMod(st.mod);
  seoMelylink();
  if (cel && cel.full) open(teljes(cel.full), true);
  else if (cel && cel.f) open(cel.f, true);
  if (!cel) document.body.classList.remove('viewing');
})();
