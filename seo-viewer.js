/* papaimatek.hu – beágyazott feladat-nézegető az SEO oldalakhoz.
   Elfogja a feladat- és PDF-linkeket, és az oldalon belül, egy
   PDF-nézegető modálban nyitja meg őket (pdf.js). Bal oldalon a
   feladatsor többi feladata legördülő listában + kattintható listában. */
(function(){
  'use strict';

  var PDF_DIR = '/feladatadatbazis/pdf/';
  var PDFJS = window['pdfjsLib'] || null;
  if (PDFJS){ try{ PDFJS.GlobalWorkerOptions.workerSrc = '/feladatadatbazis/pdfjs/pdf.worker.min.js'; }catch(e){ PDFJS = null; } }

  var DATA = null, dataPromise = null;
  function loadData(){
    if (DATA) return Promise.resolve(DATA);
    if (dataPromise) return dataPromise;
    dataPromise = fetch('/bankdata.json').then(function(r){ return r.json(); }).then(function(d){ DATA = d; return d; });
    return dataPromise;
  }
  // kezdjük el betölteni azonnal
  loadData().catch(function(){});

  function findPaper(ev, ford){
    var yrs = DATA && DATA.evek && DATA.evek[ev];
    if (!yrs) return null;
    for (var i=0;i<yrs.length;i++){ if (String(yrs[i].fordulo) === String(ford)) return yrs[i]; }
    return null;
  }
  function fordLabel(p){ return p && p.fordulo ? (p.fordulo + '. feladatlap') : ''; }

  /* ---------- Modál felépítése (egyszer) ---------- */
  var built = false, dom = {};
  var STYLE = ''
    + '.pmv-overlay{position:fixed;inset:0;z-index:9999;background:rgba(18,8,45,.72);backdrop-filter:blur(6px);'
    + 'display:none;align-items:center;justify-content:center;padding:18px;font-family:"Baloo 2",system-ui,sans-serif;}'
    + '.pmv-overlay.open{display:flex;}'
    + '.pmv-dialog{width:min(1160px,100%);height:min(92vh,100%);background:#241150;border:1px solid rgba(255,255,255,.12);'
    + 'border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.55);display:flex;overflow:hidden;position:relative;}'
    + '.pmv-side{flex:0 0 268px;background:#2f1866;border-right:1px solid rgba(255,255,255,.09);display:flex;flex-direction:column;min-height:0;}'
    + '.pmv-side-head{padding:18px 18px 12px;border-bottom:1px solid rgba(255,255,255,.08);}'
    + '.pmv-side-kicker{font-size:11.5px;letter-spacing:.08em;text-transform:uppercase;color:#c7f3ec;font-weight:700;margin-bottom:5px;}'
    + '.pmv-side-title{font-size:18px;font-weight:800;color:#f5f1ff;line-height:1.15;}'
    + '.pmv-side-date{font-size:12.5px;color:#c9bdea;margin-top:3px;}'
    + '.pmv-jump{margin:12px 18px 6px;}'
    + '.pmv-jump label{display:block;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;color:#c9bdea;font-weight:700;margin-bottom:6px;}'
    + '.pmv-jump select{width:100%;background:#3a1f80;color:#f5f1ff;border:1px solid rgba(255,255,255,.16);border-radius:12px;'
    + 'padding:10px 12px;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;}'
    + '.pmv-list{flex:1 1 auto;overflow:auto;padding:8px 10px 14px;min-height:0;}'
    + '.pmv-item{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:transparent;border:none;'
    + 'color:#f5f1ff;font-family:inherit;font-weight:600;font-size:14px;cursor:pointer;padding:10px 11px;border-radius:11px;transition:background .13s;}'
    + '.pmv-item:hover{background:#4a2aa0;}'
    + '.pmv-item.active{background:#4a2aa0;}'
    + '.pmv-item .pmv-badge{flex:none;width:26px;height:26px;border-radius:8px;background:rgba(199,243,236,.14);color:#c7f3ec;'
    + 'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;}'
    + '.pmv-item.active .pmv-badge{background:#f5e463;color:#2f1866;}'
    + '.pmv-item .pmv-it-main{min-width:0;}'
    + '.pmv-item .pmv-it-tema{display:block;font-weight:400;font-size:11.5px;color:#c9bdea;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
    + '.pmv-item.full{font-weight:800;}'
    + '.pmv-main{flex:1 1 auto;display:flex;flex-direction:column;min-width:0;min-height:0;}'
    + '.pmv-bar{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#2f1866;border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap;}'
    + '.pmv-tabs{display:flex;gap:6px;}'
    + '.pmv-tab{font-family:inherit;font-weight:700;font-size:13.5px;cursor:pointer;border:1px solid rgba(255,255,255,.18);'
    + 'background:transparent;color:#f5f1ff;border-radius:999px;padding:7px 15px;}'
    + '.pmv-tab.active{background:#c7f3ec;color:#123b34;border-color:transparent;}'
    + '.pmv-tab.ut.active{background:#f5e463;color:#2f1866;}'
    + '.pmv-meta{flex:1 1 180px;min-width:0;font-size:12.5px;color:#c9bdea;line-height:1.35;}'
    + '.pmv-meta b{color:#f5f1ff;}'
    + '.pmv-acts{display:flex;align-items:center;gap:8px;}'
    + '.pmv-mini{font-family:inherit;font-weight:700;font-size:12.5px;text-decoration:none;color:#f5f1ff;'
    + 'border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:6px 12px;cursor:pointer;background:transparent;}'
    + '.pmv-mini:hover{border-color:#f5e463;color:#f5e463;}'
    + '.pmv-close{flex:none;width:36px;height:36px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:transparent;'
    + 'color:#f5f1ff;font-size:20px;line-height:1;cursor:pointer;}'
    + '.pmv-close:hover{background:#4a2aa0;border-color:transparent;}'
    + '.pmv-framewrap{position:relative;flex:1 1 auto;background:#e9e6f2;min-height:0;}'
    + '.pmv-scroll{position:absolute;inset:0;overflow:auto;display:flex;align-items:center;justify-content:center;padding:12px;}'
    + '.pmv-pagewrap{position:relative;margin:0 auto;box-shadow:0 6px 18px rgba(0,0,0,.28);border-radius:2px;}'
    + '.pmv-scroll canvas{display:block;border-radius:2px;max-width:100%;max-height:100%;}'
    + '.pmv-marker{position:absolute;left:8px;width:4px;height:42px;pointer-events:none;background:#f5e463;border-radius:999px;'
    + 'box-shadow:0 0 10px rgba(245,228,99,.6);animation:pmvMk .35s cubic-bezier(.16,.84,.44,1);}'
    + '@keyframes pmvMk{0%{opacity:0;transform:translateX(-7px) scaleY(.55);}100%{opacity:1;transform:translateX(0) scaleY(1);}}'
    + '.pmv-iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#e9e6f2;}'
    + '.pmv-loading{position:absolute;top:14px;left:50%;transform:translateX(-50%);background:#241150;color:#f5f1ff;'
    + 'font-size:13px;font-weight:600;padding:8px 18px;border-radius:999px;box-shadow:0 8px 20px rgba(0,0,0,.3);z-index:5;}'
    + '.pmv-pager{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;'
    + 'background:rgba(36,17,80,.92);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:5px 8px;box-shadow:0 8px 22px rgba(0,0,0,.32);z-index:6;}'
    + '.pmv-pg{width:34px;height:34px;border:none;border-radius:50%;cursor:pointer;background:#4a2aa0;color:#f5f1ff;font-size:18px;'
    + 'font-weight:700;display:flex;align-items:center;justify-content:center;font-family:inherit;}'
    + '.pmv-pg:hover{background:#f5e463;color:#2f1866;}'
    + '.pmv-pg.disabled{opacity:.35;pointer-events:none;}'
    + '.pmv-pginfo{color:#f5f1ff;font-size:13px;font-weight:700;min-width:52px;text-align:center;}'
    + '.pmv-sidetoggle{display:none;}'
    + '@media(max-width:780px){'
    + '.pmv-overlay{padding:0;}'
    + '.pmv-dialog{flex-direction:column;height:100%;width:100%;border-radius:0;}'
    + '.pmv-side{flex:none;max-height:40vh;border-right:none;border-bottom:1px solid rgba(255,255,255,.09);}'
    + '}';

  function build(){
    if (built) return;
    var st = document.createElement('style'); st.textContent = STYLE; document.head.appendChild(st);
    var ov = document.createElement('div'); ov.className = 'pmv-overlay'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
    ov.innerHTML = ''
      + '<div class="pmv-dialog">'
      +   '<aside class="pmv-side">'
      +     '<div class="pmv-side-head"><div class="pmv-side-kicker">Feladatsor</div>'
      +       '<div class="pmv-side-title" id="pmvSideTitle"></div><div class="pmv-side-date" id="pmvSideDate"></div></div>'
      +     '<div class="pmv-jump"><label for="pmvJump">Ugrás feladatra</label><select id="pmvJump"></select></div>'
      +     '<div class="pmv-list" id="pmvList"></div>'
      +   '</aside>'
      +   '<div class="pmv-main">'
      +     '<div class="pmv-bar">'
      +       '<div class="pmv-tabs"><button class="pmv-tab active" id="pmvTabFl" type="button">Feladat</button>'
      +         '<button class="pmv-tab ut" id="pmvTabUt" type="button">Javítási útmutató</button></div>'
      +       '<div class="pmv-meta" id="pmvMeta"></div>'
      +       '<div class="pmv-acts">'
      +         '<a class="pmv-mini" id="pmvOpenNew" target="_blank" rel="noopener">Új lapon</a>'
      +         '<a class="pmv-mini" id="pmvDl" download>Letöltés</a>'
      +         '<button class="pmv-close" id="pmvClose" type="button" aria-label="Bezárás">&times;</button>'
      +       '</div>'
      +     '</div>'
      +     '<div class="pmv-framewrap">'
      +       '<div class="pmv-scroll" id="pmvScroll"></div>'
      +       '<iframe class="pmv-iframe" id="pmvIframe" title="Feladatsor PDF" hidden></iframe>'
      +       '<div class="pmv-loading" id="pmvLoading" hidden>PDF betöltése…</div>'
      +       '<div class="pmv-pager" id="pmvPager" hidden>'
      +         '<button class="pmv-pg" id="pmvPrev" type="button" aria-label="Előző oldal">‹</button>'
      +         '<span class="pmv-pginfo" id="pmvPageInfo">1 / 1</span>'
      +         '<button class="pmv-pg" id="pmvNext" type="button" aria-label="Következő oldal">›</button>'
      +       '</div>'
      +     '</div>'
      +   '</div>'
      + '</div>';
    document.body.appendChild(ov);
    dom.ov = ov;
    dom.dialog = ov.querySelector('.pmv-dialog');
    dom.sideTitle = ov.querySelector('#pmvSideTitle');
    dom.sideDate = ov.querySelector('#pmvSideDate');
    dom.jump = ov.querySelector('#pmvJump');
    dom.list = ov.querySelector('#pmvList');
    dom.tabFl = ov.querySelector('#pmvTabFl');
    dom.tabUt = ov.querySelector('#pmvTabUt');
    dom.meta = ov.querySelector('#pmvMeta');
    dom.openNew = ov.querySelector('#pmvOpenNew');
    dom.dl = ov.querySelector('#pmvDl');
    dom.close = ov.querySelector('#pmvClose');
    dom.scroll = ov.querySelector('#pmvScroll');
    dom.iframe = ov.querySelector('#pmvIframe');
    dom.loading = ov.querySelector('#pmvLoading');
    dom.pager = ov.querySelector('#pmvPager');
    dom.pageInfo = ov.querySelector('#pmvPageInfo');
    dom.prev = ov.querySelector('#pmvPrev');
    dom.next = ov.querySelector('#pmvNext');

    dom.close.addEventListener('click', closeModal);
    ov.addEventListener('click', function(e){ if (e.target === ov) closeModal(); });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && ov.classList.contains('open')) closeModal(); });
    dom.tabFl.addEventListener('click', function(){ setTab('fl'); });
    dom.tabUt.addEventListener('click', function(){ setTab('ut'); });
    dom.jump.addEventListener('change', function(){ openTask(dom.jump.value); });
    dom.prev.addEventListener('click', function(){ if (view.page > 1) showPage(view.page - 1); });
    dom.next.addEventListener('click', function(){ if (view.page < view.npages) showPage(view.page + 1); });
    var rzT = null;
    window.addEventListener('resize', function(){ if (!ov.classList.contains('open') || !view.url || !PDFJS) return; clearTimeout(rzT); rzT = setTimeout(function(){ showPage(view.page); }, 250); });
    built = true;
  }

  /* ---------- Állapot ---------- */
  var state = { paper:null, tab:'fl', taskVal:'full' };
  var view = { url:null, page:1, npages:1, taskPage:0, taskY:null };
  var docCache = {}, docPromise = {}, docOrder = [], pageToken = 0;

  function openModal(paper, tab, taskVal){
    build();
    state.paper = paper; state.tab = tab || 'fl'; state.taskVal = taskVal || 'full';
    dom.sideTitle.textContent = paper.datum.split(/[.\s]/)[0] + '. — ' + fordLabel(paper);
    dom.sideDate.textContent = paper.datum;
    buildSidebar();
    dom.tabFl.classList.toggle('active', state.tab === 'fl');
    dom.tabUt.classList.toggle('active', state.tab === 'ut');
    dom.ov.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
    render();
  }
  function closeModal(){
    dom.ov.classList.remove('open');
    document.documentElement.style.overflow = '';
    pageToken++;
    Object.keys(docCache).forEach(function(u){ try{ docCache[u].destroy(); }catch(e){} });
    docCache = {}; docPromise = {}; docOrder = [];
    view = { url:null, page:1, npages:1, taskPage:0, taskY:null };
    dom.scroll.innerHTML = ''; dom.iframe.removeAttribute('src');
  }

  function buildSidebar(){
    var p = state.paper;
    // dropdown
    dom.jump.innerHTML = '';
    var optFull = document.createElement('option'); optFull.value = 'full'; optFull.textContent = 'Teljes feladatsor'; dom.jump.appendChild(optFull);
    p.tasks.forEach(function(t){
      var o = document.createElement('option'); o.value = String(t.n);
      o.textContent = t.n + '. feladat' + (t.tema ? ('  (' + t.tema + ')') : ''); dom.jump.appendChild(o);
    });
    dom.jump.value = state.taskVal;
    // visible list
    dom.list.innerHTML = '';
    dom.list.appendChild(makeItem('full', '∑', 'Teljes feladatsor', '', true));
    p.tasks.forEach(function(t){ dom.list.appendChild(makeItem(String(t.n), t.n + '.', t.n + '. feladat', t.tema || '', false)); });
    markActiveItem();
  }
  function makeItem(val, badge, title, tema, isFull){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pmv-item' + (isFull ? ' full' : ''); b.dataset.val = val;
    b.innerHTML = '<span class="pmv-badge">' + badge + '</span><span class="pmv-it-main">' + title +
      (tema ? '<span class="pmv-it-tema">' + tema + '</span>' : '') + '</span>';
    b.addEventListener('click', function(){ openTask(val); });
    return b;
  }
  function markActiveItem(){
    var items = dom.list.querySelectorAll('.pmv-item');
    for (var i=0;i<items.length;i++){ items[i].classList.toggle('active', items[i].dataset.val === String(state.taskVal)); }
    dom.jump.value = String(state.taskVal);
  }

  function openTask(val){ state.taskVal = String(val); markActiveItem(); render(); }
  function setTab(tab){ state.tab = tab; dom.tabFl.classList.toggle('active', tab === 'fl'); dom.tabUt.classList.toggle('active', tab === 'ut'); render(); }

  function currentTarget(){
    var p = state.paper; if (!p) return null;
    var isFull = (state.taskVal === 'full');
    var task = isFull ? null : p.tasks[parseInt(state.taskVal, 10) - 1];
    var isFl = (state.tab === 'fl');
    return { pdf: isFl ? p.fl : p.ut, page: isFull ? 1 : (isFl ? task.flp : task.utp),
             y: isFull ? null : (isFl ? task.fly : task.uty), isFull: isFull, task: task, paper: p, isFl: isFl };
  }

  function render(){
    var tg = currentTarget(); if (!tg) return;
    var base = PDF_DIR + encodeURIComponent(tg.pdf);
    var hash = '#page=' + tg.page + '&view=Fit';
    var taskTxt = tg.isFull ? 'Teljes feladatsor' : (tg.task.n + '. feladat' + (tg.task.tema ? (' — ' + tg.task.tema) : ''));
    dom.meta.innerHTML = '<b>' + tg.paper.datum + '</b> · ' + fordLabel(tg.paper) + '<br>' + taskTxt + (tg.isFl ? '' : ' · Javítási útmutató');
    dom.openNew.href = base + hash;
    dom.dl.href = base; dom.dl.setAttribute('download', tg.pdf);
    if (PDFJS) { renderPdfjs(base, tg); } else { renderIframe(base + hash); }
  }
  function renderIframe(src){ dom.scroll.style.display = 'none'; dom.pager.hidden = true; dom.iframe.hidden = false; dom.iframe.src = src; }

  function renderPdfjs(base, tg){
    dom.iframe.hidden = true; dom.scroll.style.display = 'flex';
    view.url = base; view.taskPage = tg.isFull ? 0 : tg.page; view.taskY = tg.isFull ? null : tg.y;
    showPage(tg.page);
  }
  function getDoc(url){
    if (docCache[url]) return Promise.resolve(docCache[url]);
    if (docPromise[url]) return docPromise[url];
    var p = PDFJS.getDocument(url).promise.then(function(doc){
      docCache[url] = doc; docOrder.push(url);
      while (docOrder.length > 4){ var ev = docOrder.shift(); if (docCache[ev]){ try{ docCache[ev].destroy(); }catch(e){} delete docCache[ev]; delete docPromise[ev]; } }
      return doc;
    });
    docPromise[url] = p; return p;
  }
  function showPage(pageNum){
    if (!view.url) return;
    var my = ++pageToken; dom.loading.hidden = false;
    getDoc(view.url).then(function(doc){
      if (my !== pageToken) return;
      view.npages = doc.numPages; pageNum = Math.max(1, Math.min(pageNum, doc.numPages)); view.page = pageNum;
      return doc.getPage(pageNum).then(function(page){
        if (my !== pageToken) return;
        var availW = dom.scroll.clientWidth - 24; if (availW < 260) availW = 260;
        var availH = dom.scroll.clientHeight - 24; if (availH < 320) availH = 320;
        var vp1 = page.getViewport({ scale:1 });
        var scale = Math.min(availW / vp1.width, availH / vp1.height);
        var vp = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        var os = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(vp.width * os); canvas.height = Math.floor(vp.height * os);
        canvas.style.width = Math.floor(vp.width) + 'px'; canvas.style.height = Math.floor(vp.height) + 'px';
        var ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        return page.render({ canvasContext: ctx, viewport: vp, transform: os !== 1 ? [os,0,0,os,0,0] : null }).promise.then(function(){
          if (my !== pageToken) return;
          var wrap = document.createElement('div'); wrap.className = 'pmv-pagewrap';
          wrap.style.width = Math.floor(vp.width) + 'px'; wrap.style.height = Math.floor(vp.height) + 'px';
          wrap.appendChild(canvas);
          if (view.taskY != null && view.page === view.taskPage){
            var mk = document.createElement('div'); mk.className = 'pmv-marker';
            mk.style.top = Math.max(0, (view.taskY * scale) - 6) + 'px'; wrap.appendChild(mk);
          }
          dom.scroll.innerHTML = ''; dom.scroll.appendChild(wrap);
          dom.loading.hidden = true; updatePager();
        });
      });
    }).catch(function(){ dom.loading.hidden = true; renderIframe(view.url + '#page=' + pageNum + '&view=Fit'); });
  }
  function updatePager(){
    dom.pager.hidden = false; dom.pageInfo.textContent = view.page + ' / ' + view.npages;
    dom.prev.classList.toggle('disabled', view.page <= 1); dom.next.classList.toggle('disabled', view.page >= view.npages);
  }

  /* ---------- Linkek elfogása ---------- */
  function parseBankLink(href){
    var qi = href.indexOf('?'); if (qi < 0) return null;
    var qs; try{ qs = new URLSearchParams(href.slice(qi + 1)); }catch(e){ return null; }
    var ev = qs.get('ev'), ford = qs.get('ford'), fel = qs.get('feladat');
    if (ev && ford) return { ev: ev, ford: ford, tab: 'fl', feladat: fel || 'full' };
    return null;
  }
  function parsePdfLink(href){
    var m = /M8_(\d+)_(\d+)_(fl|ut)\.pdf/.exec(href);
    if (!m) return null;
    return { ev: m[1], ford: m[2], tab: m[3], feladat: 'full' };
  }

  function handleClick(e){
    var a = e.target.closest ? e.target.closest('a') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    // csak a feladatbank-/PDF-linkeket fogjuk el; a témakör-szűrőt és az oldalnavigációt nem
    var info = null;
    if (/\/feladatadatbazis\.html\?/.test(href) && /[?&]ev=/.test(href)) info = parseBankLink(href);
    else if (/_fl\.pdf|_ut\.pdf/.test(href)) info = parsePdfLink(href);
    if (!info) return;
    e.preventDefault();
    loadData().then(function(){
      var paper = findPaper(info.ev, info.ford);
      if (!paper){ window.location.href = href; return; } // tartalék: eredeti link
      openModal(paper, info.tab, info.feladat);
    }).catch(function(){ window.location.href = href; });
  }
  document.addEventListener('click', handleClick);
})();
