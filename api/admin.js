/* PápaiMatek admin API – csak az ADMIN_EMAILS-ben megadott, bejelentkezett fiók érheti el.
   Minden kérés: POST /api/admin  { muvelet: '...', ...adatok }  + Authorization: Bearer <a bejelentkezett felhasználó tokenje> */
const K = require('./_8het-kozos.js');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://duiskdduecldmkuylckb.supabase.co';
const ALAP_URL = 'https://www.papaimatek.hu';

const kulcsFejlec = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Object.assign({ apikey: key }, key && key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {});
};

async function adminFelhasznalo(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${m[1]}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  const engedett = String(process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
  if (!u || !u.email || !engedett.includes(String(u.email).toLowerCase())) return null;
  return u;
}

/* ---------- segédek ---------- */
const sb = (ut, o) => K.supabase(ut, o || { method: 'GET' });
let HIBAK = [];
const puha = (ut) => sb(ut).catch((e) => { HIBAK.push(ut.split('?')[0] + ': ' + e.message.slice(0, 200)); return []; });
const enc = encodeURIComponent;
const uuid = (s) => (/^[0-9a-f-]{36}$/i.test(String(s || '')) ? String(s) : null);
const szoveg = (v, max) => { if (v == null) return null; const s = String(v).trim().slice(0, max || 500); return s || null; };
const egesz = (v) => { if (v === '' || v == null) return null; const n = Math.round(Number(v)); return Number.isFinite(n) ? n : null; };

function szur(b, mezok) {
  const o = {};
  for (const [k, t] of Object.entries(mezok)) {
    if (!(k in b)) continue;
    const v = b[k];
    if (t === 'int') o[k] = egesz(v);
    else if (t === 'bool') o[k] = !!v;
    else if (t === 'ts' || t === 'date') o[k] = v ? String(v) : null;
    else if (t === 'json') o[k] = v == null ? [] : v;
    else if (Array.isArray(t)) { if (t.includes(v)) o[k] = v; }
    else o[k] = szoveg(v, t);
  }
  return o;
}

const TANITVANY = {
  nev: 120, evfolyam: 40, iskola: 160, cel_iskola: 200, diak_email: 160, diak_telefon: 40,
  szulo_nev: 120, szulo_email: 160, szulo_telefon: 40, szamla_nev: 160, szamla_irsz: 10, szamla_varos: 80, szamla_cim: 200,
  szolgaltatas_id: 'int', egyedi_ar: 'int', helyszin: ['papa', 'online', null], statusz: ['aktiv', 'szunetel', 'befejezett'],
  csoport_jelentkezes_id: 'int', megjegyzes: 4000,
};
const ORA = { tanitvany_id: 40, kezdes: 'ts', perc: 'int', statusz: ['tervezett', 'megtartott', 'lemondott', 'elmaradt'], fizetos: 'bool', ar: 'int', tema: 300, jegyzet: 4000 };
const BEFIZETES = { tanitvany_id: 40, datum: 'date', osszeg: 'int', mod: ['keszpenz', 'atutalas', 'kartya', 'egyeb'], szamlazva: 'bool', szamlaszam: 60, megjegyzes: 1000 };
const SZOLGALTATAS = { nev: 120, perc: 'int', ar: 'int', aktiv: 'bool', sorrend: 'int' };
const KIADAS = { tanitvany_id: 40, cim: 200, leiras: 4000, feladatok: 'json', hatarido: 'ts', statusz: ['kiadva', 'beadva', 'javitando', 'kesz'], visszajelzes: 4000 };

// egy óra díja: ha lemondott/elmaradt és nem fizetős → 0
const oraDij = (o) => (o.statusz === 'megtartott' || ((o.statusz === 'lemondott' || o.statusz === 'elmaradt') && o.fizetos) ? (o.ar || 0) : 0);

function egyenlegek(orak, befizetesek) {
  const e = {};
  const t = (id) => (e[id] = e[id] || { dij: 0, fizetve: 0, orak_szama: 0, megtartott: 0, kovetkezo: null, utolso: null });
  const most = Date.now();
  for (const o of orak) {
    if (!o.tanitvany_id) continue;
    const x = t(o.tanitvany_id);
    x.dij += oraDij(o);
    if (o.statusz === 'megtartott') { x.megtartott++; x.orak_szama++; if (!x.utolso || o.kezdes > x.utolso) x.utolso = o.kezdes; }
    if (o.statusz === 'tervezett' && Date.parse(o.kezdes) >= most - 3600e3 && (!x.kovetkezo || o.kezdes < x.kovetkezo)) x.kovetkezo = o.kezdes;
  }
  for (const b of befizetesek) t(b.tanitvany_id).fizetve += b.osszeg || 0;
  for (const id in e) e[id].egyenleg = e[id].fizetve - e[id].dij; // negatív = tartozás
  return e;
}

async function oraAr(tanitvanyId) {
  const t = (await sb(`tanitvanyok?id=eq.${tanitvanyId}&select=egyedi_ar,szolgaltatas_id`))[0];
  if (!t) return { ar: null, perc: null };
  if (t.egyedi_ar != null) {
    let perc = null;
    if (t.szolgaltatas_id) { const s = (await sb(`szolgaltatasok?id=eq.${t.szolgaltatas_id}&select=perc`))[0]; perc = s && s.perc; }
    return { ar: t.egyedi_ar, perc };
  }
  if (!t.szolgaltatas_id) return { ar: null, perc: null };
  const s = (await sb(`szolgaltatasok?id=eq.${t.szolgaltatas_id}&select=ar,perc`))[0];
  return s ? { ar: s.ar, perc: s.perc } : { ar: null, perc: null };
}

/* ---------- műveletek ---------- */
const M = {
  async attekintes() {
    const [szolg, tan, orak, bef, cs, egy] = await Promise.all([
      sb('szolgaltatasok?select=*&order=sorrend,id'),
      sb('tanitvanyok?select=*&order=nev'),
      sb('orak?select=id,tanitvany_id,kezdes,perc,statusz,fizetos,ar,tema,gcal_cim&order=kezdes'),
      sb('befizetesek?select=tanitvany_id,osszeg'),
      puha('csoport_jelentkezesek?select=id,statusz,teszt&teszt=is.false'),
      puha('jelentkezesek?select=id'),
    ]);
    const e = egyenlegek(orak, bef);
    const most = Date.now();
    const het = most + 7 * 864e5;
    return {
      szolgaltatasok: szolg,
      tanitvanyok: tan.map((t) => Object.assign({}, t, { _e: e[t.id] || { dij: 0, fizetve: 0, egyenleg: 0, orak_szama: 0, megtartott: 0 } })),
      kovetkezo_orak: orak.filter((o) => o.statusz === 'tervezett' && Date.parse(o.kezdes) >= most - 3600e3 && Date.parse(o.kezdes) <= het),
      hozzarendelendo: orak.filter((o) => !o.tanitvany_id),
      lezaratlan: orak.filter((o) => o.tanitvany_id && o.statusz === 'tervezett' && Date.parse(o.kezdes) < most - 3600e3).length,
      jelentkezok: { csoport: cs.length, csoport_fizetve: cs.filter((x) => x.statusz === 'fizetve').length, egyeni: egy.length },
    };
  },

  async tanitvany(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    const [t, orak, bef, kiad] = await Promise.all([
      sb(`tanitvanyok?id=eq.${id}&select=*`),
      sb(`orak?tanitvany_id=eq.${id}&select=*&order=kezdes.desc`),
      sb(`befizetesek?tanitvany_id=eq.${id}&select=*&order=datum.desc,created_at.desc`),
      sb(`kiadasok?tanitvany_id=eq.${id}&select=*,beadas_fajlok(id,nev,meret,tipus,created_at)&order=created_at.desc`),
    ]);
    if (!t[0]) throw hiba('Nincs ilyen tanítvány.');
    let fiok = null;
    if (t[0].user_id) {
      const p = await puha(`profiles?id=eq.${t[0].user_id}&select=id,email,display_name,evfolyam,created_at`);
      fiok = p[0] || { id: t[0].user_id };
    }
    return { tanitvany: t[0], orak, befizetesek: bef, kiadasok: kiad, fiok, egyenleg: egyenlegek(orak, bef)[id] || { dij: 0, fizetve: 0, egyenleg: 0 } };
  },

  async tanitvany_mentes(b) {
    const d = szur(b, TANITVANY);
    if ('nev' in d && !d.nev) throw hiba('A név kötelező.');
    d.updated_at = new Date().toISOString();
    const id = uuid(b.id);
    if (id) return (await sb(`tanitvanyok?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(d) }))[0];
    if (!d.nev) throw hiba('A név kötelező.');
    return (await sb('tanitvanyok', { method: 'POST', body: JSON.stringify(d) }))[0];
  },

  async tanitvany_torles(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    await sb(`tanitvanyok?id=eq.${id}`, { method: 'DELETE' });
    return { ok: true };
  },

  async ora_mentes(b) {
    const d = szur(b, ORA);
    if ('tanitvany_id' in d) d.tanitvany_id = uuid(d.tanitvany_id);
    const id = uuid(b.id);
    if (!id) {
      if (!d.kezdes) throw hiba('Az óra időpontja kötelező.');
      if (d.tanitvany_id && (d.ar == null || d.perc == null)) {
        const a = await oraAr(d.tanitvany_id);
        if (d.ar == null) d.ar = a.ar;
        if (d.perc == null && a.perc) d.perc = a.perc;
      }
      if (d.statusz === 'lemondott' && !('fizetos' in b)) d.fizetos = false;
    } else if (d.tanitvany_id && b.ar_ujra) {
      const a = await oraAr(d.tanitvany_id); d.ar = a.ar; if (a.perc) d.perc = a.perc;
    }
    d.updated_at = new Date().toISOString();
    const ora = id
      ? (await sb(`orak?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(d) }))[0]
      : (await sb('orak', { method: 'POST', body: JSON.stringify(d) }))[0];
    return ora;
  },

  async ora_torles(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    await sb(`orak?id=eq.${id}`, { method: 'DELETE' });
    return { ok: true };
  },

  async orak(b) {
    const tol = b.tol ? `&kezdes=gte.${enc(b.tol)}` : '';
    const ig = b.ig ? `&kezdes=lt.${enc(b.ig)}` : '';
    return sb(`orak?select=*,tanitvanyok(nev)${tol}${ig}&order=kezdes`);
  },

  async befizetes_mentes(b) {
    const d = szur(b, BEFIZETES);
    if ('tanitvany_id' in d) d.tanitvany_id = uuid(d.tanitvany_id);
    const id = uuid(b.id);
    if (!id && (!d.tanitvany_id || !d.osszeg)) throw hiba('Tanítvány és összeg kötelező.');
    return id
      ? (await sb(`befizetesek?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(d) }))[0]
      : (await sb('befizetesek', { method: 'POST', body: JSON.stringify(d) }))[0];
  },

  async befizetes_torles(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    await sb(`befizetesek?id=eq.${id}`, { method: 'DELETE' });
    return { ok: true };
  },

  async szolgaltatas_mentes(b) {
    const d = szur(b, SZOLGALTATAS);
    const id = egesz(b.id);
    if (!id && (!d.nev || d.ar == null)) throw hiba('Név és ár kötelező.');
    return id
      ? (await sb(`szolgaltatasok?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(d) }))[0]
      : (await sb('szolgaltatasok', { method: 'POST', body: JSON.stringify(d) }))[0];
  },

  async jelentkezok() {
    const [cs, egy, tan] = await Promise.all([
      puha('csoport_jelentkezesek?select=*&order=created_at.desc'),
      puha('jelentkezesek?select=*&order=created_at.desc'),
      sb('tanitvanyok?select=id,nev,csoport_jelentkezes_id,diak_email,szulo_email'),
    ]);
    return { csoport: cs, egyeni: egy, tanitvanyok: tan };
  },

  // minden eddigi weboldali jelentkezőt felvesz tanítványnak (a teszt-jelentkezéseket és a már felvetteket kihagyja)
  async jelentkezok_import() {
    const [cs, egy, tan, szolg] = await Promise.all([
      puha('csoport_jelentkezesek?select=*&order=created_at'),
      puha('jelentkezesek?select=*&order=created_at'),
      sb('tanitvanyok?select=id,nev,csoport_jelentkezes_id,diak_email,szulo_email,megjegyzes'),
      sb('szolgaltatasok?select=id,nev'),
    ]);
    const kisb = (x) => String(x || '').trim().toLowerCase();
    const emailek = new Set(); const csIdk = new Set();
    tan.forEach((t) => { [t.diak_email, t.szulo_email].forEach((e) => e && emailek.add(kisb(e))); if (t.csoport_jelentkezes_id) csIdk.add(t.csoport_jelentkezes_id); });
    const szid = (re) => { const x = szolg.find((s) => re.test(s.nev)); return x ? x.id : null; };
    const SZ8 = szid(/^8\. osztályos/), SZ57 = szid(/^5–7/), SZKOZ = szid(/^Középiskolás/), SZ46 = szid(/^4\. \/ 6\./);
    const HELY = { papa: 'papa', online: 'online' };
    const uj = [];
    const datumHu = (x) => (x ? new Date(x).toLocaleDateString('hu-HU', { timeZone: 'Europe/Budapest' }) : '');
    let tesztDb = 0, marVolt = 0;
    for (const x of cs) {
      if (x.teszt === true) { tesztDb++; continue; }
      if (csIdk.has(x.id)) { marVolt++; continue; }
      const em = [kisb(x.diak_email), kisb(x.email)].filter(Boolean);
      if (em.some((e) => emailek.has(e))) { marVolt++; continue; }
      em.forEach((e) => emailek.add(e));
      uj.push({
        nev: szoveg(x.diak_nev, 120) || '(név nélkül)', evfolyam: '8.', diak_email: szoveg(x.diak_email, 160),
        szulo_nev: szoveg(x.szulo_nev, 120), szulo_email: szoveg(x.email, 160), szulo_telefon: szoveg(x.telefon, 40),
        szamla_nev: szoveg(x.szamla_nev, 160), szamla_irsz: szoveg(x.szamla_irsz, 10), szamla_varos: szoveg(x.szamla_varos, 80), szamla_cim: szoveg(x.szamla_cim, 200),
        helyszin: 'online', statusz: 'aktiv', csoport_jelentkezes_id: x.id,
        megjegyzes: `Weboldali jelentkezés: 8 hét – 8 felvételi feladatsor (${datumHu(x.created_at)}, ${x.statusz === 'fizetve' ? 'fizetve' : 'nem fizetett: ' + (x.statusz || '?')})${x.megjegyzes ? '\n' + x.megjegyzes : ''}`,
      });
    }
    for (const x of egy) {
      const e = kisb(x.email);
      if (e && emailek.has(e)) { marVolt++; continue; }
      if (e) emailek.add(e);
      const o = Number(x.osztaly);
      const sz = o === 8 ? SZ8 : (o >= 5 && o <= 7 ? SZ57 : (o >= 9 ? SZKOZ : (o === 4 || o === 3 ? SZ46 : null)));
      const szulo = x.ki === 'szulo';
      uj.push(Object.assign({
        nev: szulo ? `${szoveg(x.nev, 100) || 'Szülő'} gyermeke` : (szoveg(x.nev, 120) || '(név nélkül)'),
        evfolyam: x.osztaly ? `${x.osztaly}.` : null, szolgaltatas_id: sz, helyszin: HELY[x.helyszin] || null, statusz: 'aktiv',
        megjegyzes: `Weboldali jelentkezés egyéni órára (${datumHu(x.created_at)})${x.idopontok ? '\nAlkalmas időpontok: ' + (typeof x.idopontok === 'string' ? x.idopontok : JSON.stringify(x.idopontok)) : ''}${szulo ? '\nA gyermek nevét még ki kell tölteni.' : ''}`,
      }, szulo
        ? { szulo_nev: szoveg(x.nev, 120), szulo_email: szoveg(x.email, 160), szulo_telefon: szoveg(x.telefon, 40) }
        : { diak_email: szoveg(x.email, 160), diak_telefon: szoveg(x.telefon, 40) }));
    }
    if (uj.length) await sb('tanitvanyok', { method: 'POST', body: JSON.stringify(uj) });
    return { felveve: uj.length, osszes_8het: cs.length, osszes_egyeni: egy.length, teszt: tesztDb, mar_felvett: marVolt };
  },

  async szamlazando() {
    const [tan, orak, bef] = await Promise.all([
      sb('tanitvanyok?select=id,nev,szulo_nev,szulo_email,szamla_nev,szamla_irsz,szamla_varos,szamla_cim&order=nev'),
      sb('orak?select=tanitvany_id,statusz,fizetos,ar'),
      sb('befizetesek?select=*,tanitvanyok(nev,szamla_nev,szamla_irsz,szamla_varos,szamla_cim,szulo_email)&order=datum'),
    ]);
    const e = egyenlegek(orak, bef);
    return {
      szamlazatlan: bef.filter((x) => !x.szamlazva),
      tartozasok: tan.map((t) => Object.assign({}, t, { _e: e[t.id] })).filter((t) => t._e && t._e.egyenleg < 0),
    };
  },

  /* --- fiókok --- */
  async fiok_keres(b) {
    const email = szoveg(b.email, 160); if (!email) throw hiba('Adj meg e-mail-címet.');
    const p = await sb(`profiles?email=ilike.${enc(email)}&select=id,email,display_name,created_at`);
    return { fiok: p[0] || null };
  },

  async fiok_osszekapcs(b) {
    const id = uuid(b.id), uid = uuid(b.user_id);
    if (!id || !uid) throw hiba('Hiányzó azonosító.');
    const marVan = await sb(`tanitvanyok?user_id=eq.${uid}&id=neq.${id}&select=nev`);
    if (marVan[0]) throw hiba(`Ez a fiók már ${marVan[0].nev} adatlapjához van kötve.`);
    return (await sb(`tanitvanyok?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ user_id: uid, updated_at: new Date().toISOString() }) }))[0];
  },

  async fiok_levalaszt(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    return (await sb(`tanitvanyok?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ user_id: null }) }))[0];
  },

  async fiok_meghivo(b) {
    const id = uuid(b.id); const email = szoveg(b.email, 160);
    if (!id || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw hiba('Érvényes e-mail-cím kell.');
    const meglevo = await sb(`profiles?email=ilike.${enc(email)}&select=id`);
    if (meglevo[0]) return M.fiok_osszekapcs({ id, user_id: meglevo[0].id }).then((t) => ({ tanitvany: t, mar_volt: true }));
    const t = (await sb(`tanitvanyok?id=eq.${id}&select=nev`))[0];
    const r = await fetch(`${SUPABASE_URL}/auth/v1/invite?redirect_to=${enc(ALAP_URL + '/')}`, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, kulcsFejlec()),
      body: JSON.stringify({ email, data: { full_name: t ? t.nev : '', meghivta: 'admin' } }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw hiba(`A meghívó nem ment ki: ${j.msg || j.message || j.error_description || r.status}`);
    const uid = j.id || (j.user && j.user.id);
    if (!uid) throw hiba('A meghívó elment, de nem jött vissza fiókazonosító.');
    const tan = await M.fiok_osszekapcs({ id, user_id: uid });
    return { tanitvany: tan, meghivo: true };
  },

  async haladas(b) {
    const uid = uuid(b.user_id); if (!uid) throw hiba('Nincs összekötött fiók.');
    return sb(`progress?user_id=eq.${uid}&select=item_key,status,score,attempts,updated_at&order=updated_at.desc&limit=2000`);
  },

  /* --- feladatkiadás (a diák felülete a 4. lépésben jön) --- */
  async kiadas_mentes(b) {
    const d = szur(b, KIADAS);
    if ('tanitvany_id' in d) d.tanitvany_id = uuid(d.tanitvany_id);
    d.updated_at = new Date().toISOString();
    const id = uuid(b.id);
    if (!id && (!d.tanitvany_id || !d.cim)) throw hiba('Tanítvány és cím kötelező.');
    return id
      ? (await sb(`kiadasok?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(d) }))[0]
      : (await sb('kiadasok', { method: 'POST', body: JSON.stringify(d) }))[0];
  },

  async kiadas_torles(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    await sb(`kiadasok?id=eq.${id}`, { method: 'DELETE' });
    return { ok: true };
  },
};

function hiba(uzenet) { const e = new Error(uzenet); e.sajat = true; return e; }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, hiba: 'Csak POST.' }); }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, hiba: 'Hibás kérés.' });
  try {
    const u = await adminFelhasznalo(req);
    if (!u) return res.status(403).json({ ok: false, hiba: 'Nincs jogosultságod az admin felülethez.' });
    const fn = M[b.muvelet];
    if (!fn) return res.status(400).json({ ok: false, hiba: 'Ismeretlen művelet.' });
    HIBAK = [];
    const adat = await fn(b);
    return res.status(200).json({ ok: true, adat, hibak: HIBAK.length ? HIBAK : undefined });
  } catch (e) {
    console.error('[admin]', b.muvelet, e.message);
    return res.status(e.sajat ? 400 : 500).json({ ok: false, hiba: e.sajat ? e.message : 'Szerverhiba: ' + e.message.slice(0, 200) });
  }
};
