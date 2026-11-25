/* PápaiMatek admin API – csak az ADMIN_EMAILS-ben megadott, bejelentkezett fiók érheti el.
   Minden kérés: POST /api/admin  { muvelet: '...', ...adatok }  + Authorization: Bearer <a bejelentkezett felhasználó tokenje> */
const K = require('./_8het-kozos.js');
const T = require('./_tanitvany-kozos.js');
const G = require('./_gcal.js');
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
  szolgaltatas_id: 'int', egyedi_ar: 'int', helyszin: ['papa', 'ugod', 'online', null], statusz: ['aktiv', 'szunetel', 'befejezett'],
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
    const [beadott, lejart, latott, csMax, egyMax] = await Promise.all([
      sb('kiadasok?statusz=eq.beadva&select=id,cim,beadva_at,hatarido,tanitvany_id,tanitvanyok(nev)&order=beadva_at'),
      sb(`kiadasok?statusz=in.(kiadva,javitando)&hatarido=lt.${new Date().toISOString()}&select=id,cim,hatarido,tanitvany_id,tanitvanyok(nev)&order=hatarido`),
      sb('admin_beallitasok?kulcs=eq.latott_jelentkezes&select=ertek'),
      puha('csoport_jelentkezesek?select=id,diak_nev,teszt,statusz&order=id.desc&limit=200'),
      puha('jelentkezesek?select=id,nev&order=id.desc&limit=200'),
    ]);
    const lat = (latott[0] && latott[0].ertek) || { cs: 0, egy: 0 };
    const ujCs = csMax.filter((x) => x.teszt !== true && x.id > (lat.cs || 0));
    const ujEgy = egyMax.filter((x) => x.id > (lat.egy || 0));
    const e = egyenlegek(orak, bef);
    const most = Date.now();
    const het = most + 7 * 864e5;
    return {
      szolgaltatasok: szolg,
      tanitvanyok: tan.map((t) => Object.assign({}, t, { _e: e[t.id] || { dij: 0, fizetve: 0, egyenleg: 0, orak_szama: 0, megtartott: 0 } })),
      kovetkezo_orak: orak.filter((o) => o.statusz === 'tervezett' && Date.parse(o.kezdes) >= most - 3600e3 && Date.parse(o.kezdes) <= het),
      hozzarendelendo: orak.filter((o) => !o.tanitvany_id),
      beadott, lejart, uj_jelentkezok: { csoport: ujCs, egyeni: ujEgy },
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
      const p = await puha(`profiles?id=eq.${t[0].user_id}&select=*`);
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
    const t = (await sb(`tanitvanyok?id=eq.${id}&select=user_id`))[0];
    const kiad = await sb(`kiadasok?tanitvany_id=eq.${id}&select=beadas_fajlok(utvonal)`);
    await T.fajlTorles(kiad.flatMap((k) => (k.beadas_fajlok || []).map((f) => f.utvonal)));
    if (t && t.user_id) await T.tanitvanyJeloles(t.user_id, false);
    await naptarbolTorol(`orak?tanitvany_id=eq.${id}&naptar_id=not.is.null&kezdes=gte.${enc(new Date().toISOString())}&select=naptar_id`);
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
      const ism = b.ismetles || {};
      const lepes = ism.gyakorisag === 'het' ? 7 : (ism.gyakorisag === '2het' ? 14 : 0);
      if (lepes) {
        const kezd = new Date(d.kezdes);
        const igDatum = ism.ig ? Date.parse(ism.ig + 'T23:59:59') : null;
        const db = Math.min(Number(ism.db) || 0, 60);
        if (!igDatum && !db) throw hiba('Ismétlésnél add meg az utolsó alkalom dátumát vagy az alkalmak számát.');
        const sorozat = require('crypto').randomUUID();
        const sorok = [];
        for (let i = 0; i < 60; i++) {
          // a helyi (budapesti) időpont maradjon, téli/nyári időszámítás-váltáskor is
          const t = new Date(kezd.getTime() + i * lepes * 864e5);
          const eltolas = (budapestOffset(kezd) - budapestOffset(t)) * 60e3;
          const k = new Date(t.getTime() + eltolas);
          if (db && i >= db) break;
          if (igDatum && k.getTime() > igDatum) break;
          sorok.push(Object.assign({}, d, { kezdes: k.toISOString(), sorozat_id: sorozat, updated_at: new Date().toISOString() }));
        }
        if (!sorok.length) throw hiba('Az ismétlési beállítással egy alkalom sem jön ki.');
        const ki = await sb('orak', { method: 'POST', body: JSON.stringify(sorok) });
        const nap = await naptarba(ki.map((o) => o.id));
        return Object.assign({}, ki[0], { _db: ki.length, _naptar: nap });
      }
    } else if (d.tanitvany_id && b.ar_ujra) {
      const a = await oraAr(d.tanitvany_id); d.ar = a.ar; if (a.perc) d.perc = a.perc;
    }
    d.updated_at = new Date().toISOString();
    const ora = id
      ? (await sb(`orak?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(d) }))[0]
      : (await sb('orak', { method: 'POST', body: JSON.stringify(d) }))[0];
    const nap = ora ? await naptarba([ora.id]) : null;
    return Object.assign({}, ora, { _naptar: nap });
  },

  async ora_torles(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    if (b.kovetkezok) {
      const o = (await sb(`orak?id=eq.${id}&select=sorozat_id,kezdes`))[0];
      if (o && o.sorozat_id) {
        await naptarbolTorol(`orak?or=(id.eq.${id},and(sorozat_id.eq.${o.sorozat_id},kezdes.gte.${enc(o.kezdes)},statusz.eq.tervezett))&naptar_id=not.is.null&select=naptar_id`);
        const torolt = await sb(`orak?sorozat_id=eq.${o.sorozat_id}&kezdes=gte.${enc(o.kezdes)}&statusz=eq.tervezett`, { method: 'DELETE' });
        await sb(`orak?id=eq.${id}`, { method: 'DELETE' });
        return { ok: true, db: (torolt || []).length };
      }
    }
    await naptarbolTorol(`orak?id=eq.${id}&naptar_id=not.is.null&select=naptar_id`);
    await sb(`orak?id=eq.${id}`, { method: 'DELETE' });
    return { ok: true };
  },

  async naptar_proba() {
    return G.proba();
  },

  // a mai naptól (vagy megadott dátumtól) minden tervezett óra feltöltése a „PápaiMatek órák” naptárba (az importáltak is)
  async naptar_feltoltes(b) {
    const tol = b.tol ? new Date(b.tol).toISOString() : new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const l = await sb(`orak?kezdes=gte.${enc(tol)}&statusz=eq.tervezett&tanitvany_id=not.is.null&naptar_id=is.null&select=id&order=kezdes&limit=1000`);
    const hatar = Date.now() + 45e3; let ok = 0; const hibak = [];
    for (let i = 0; i < l.length && Date.now() < hatar; i += 10) {
      const r = await naptarba(l.slice(i, i + 10).map((x) => x.id), true);
      ok += r.ok || 0; (r.hibak || []).forEach((h) => hibak.push(h));
      if (hibak.length > 5) break;
    }
    const maradt = (await sb(`orak?kezdes=gte.${enc(tol)}&statusz=eq.tervezett&tanitvany_id=not.is.null&naptar_id=is.null&select=id&limit=1000`)).length;
    return { ok, maradt, hibak: hibak.length ? [...new Set(hibak)] : undefined };
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
      puha('csoport_jelentkezesek?select=*&order=id.desc'),
      puha('jelentkezesek?select=*&order=id.desc'),
      sb('tanitvanyok?select=id,nev,csoport_jelentkezes_id,diak_email,szulo_email'),
    ]);
    return { csoport: cs, egyeni: egy, tanitvanyok: tan };
  },

  // minden eddigi weboldali jelentkezőt felvesz tanítványnak (a teszt-jelentkezéseket és a már felvetteket kihagyja)
  async jelentkezok_import() {
    const [cs, egy, tan, szolg] = await Promise.all([
      puha('csoport_jelentkezesek?select=*&order=id'),
      puha('jelentkezesek?select=*&order=id'),
      sb('tanitvanyok?select=id,nev,csoport_jelentkezes_id,diak_email,szulo_email,megjegyzes'),
      sb('szolgaltatasok?select=id,nev'),
    ]);
    const kisb = (x) => String(x || '').trim().toLowerCase();
    const emailek = new Set(); const csIdk = new Set();
    tan.forEach((t) => { [t.diak_email, t.szulo_email].forEach((e) => e && emailek.add(kisb(e))); if (t.csoport_jelentkezes_id) csIdk.add(t.csoport_jelentkezes_id); });
    const szid = (re) => { const x = szolg.find((s) => re.test(s.nev)); return x ? x.id : null; };
    const SZ8 = szid(/^8\. osztályos/), SZ57 = szid(/^5–7/), SZKOZ = szid(/^Középiskolás/), SZ46 = szid(/^4\. \/ 6\./);
    const HELY = { papa: 'papa', ugod: 'ugod', online: 'online' };
    const uj = [];
    const mikor = (r) => { for (const k of ['created_at', 'letrehozva', 'inserted_at', 'datum', 'idopont', 'fizetve_at', 'elallas_beleegyezes_at']) if (r[k]) return r[k]; return null; };
    const datumHu = (r) => { const x = mikor(r); return x ? new Date(x).toLocaleDateString('hu-HU', { timeZone: 'Europe/Budapest' }) : 'ismeretlen dátum'; };
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
        megjegyzes: `Weboldali jelentkezés: 8 hét – 8 felvételi feladatsor (${datumHu(x)}, ${x.statusz === 'fizetve' ? 'fizetve' : 'nem fizetett: ' + (x.statusz || '?')})${x.megjegyzes ? '\n' + x.megjegyzes : ''}`,
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
        megjegyzes: `Weboldali jelentkezés egyéni órára (${datumHu(x)})${x.idopontok ? '\nAlkalmas időpontok: ' + (typeof x.idopontok === 'string' ? x.idopontok : JSON.stringify(x.idopontok)) : ''}${szulo ? '\nA gyermek nevét még ki kell tölteni.' : ''}`,
      }, szulo
        ? { szulo_nev: szoveg(x.nev, 120), szulo_email: szoveg(x.email, 160), szulo_telefon: szoveg(x.telefon, 40) }
        : { diak_email: szoveg(x.email, 160), diak_telefon: szoveg(x.telefon, 40) }));
    }
    // tömeges beszúrásnál minden sornak ugyanazok a mezői kellenek
    const mezok = [...new Set(uj.flatMap((r) => Object.keys(r)))];
    const sorok = uj.map((r) => Object.fromEntries(mezok.map((k) => [k, r[k] === undefined ? null : r[k]])));
    sorok.forEach((r) => { if (!r.statusz) r.statusz = 'aktiv'; });
    if (sorok.length) await sb('tanitvanyok', { method: 'POST', body: JSON.stringify(sorok) });
    return { felveve: uj.length, osszes_8het: cs.length, osszes_egyeni: egy.length, teszt: tesztDb, mar_felvett: marVolt };
  },

  async jelentkezok_latta() {
    const [cs, egy] = await Promise.all([puha('csoport_jelentkezesek?select=id&order=id.desc&limit=1'), puha('jelentkezesek?select=id&order=id.desc&limit=1')]);
    const ertek = { cs: (cs[0] && cs[0].id) || 0, egy: (egy[0] && egy[0].id) || 0 };
    await sb('admin_beallitasok?kulcs=eq.latott_jelentkezes', { method: 'DELETE' });
    await sb('admin_beallitasok', { method: 'POST', body: JSON.stringify({ kulcs: 'latott_jelentkezes', ertek, updated_at: new Date().toISOString() }) });
    return ertek;
  },

  async jelentkezes_torles(b) {
    const id = egesz(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    const tabla = b.tabla === 'csoport' ? 'csoport_jelentkezesek' : (b.tabla === 'egyeni' ? 'jelentkezesek' : null);
    if (!tabla) throw hiba('Ismeretlen jelentkezéstípus.');
    await sb(`${tabla}?id=eq.${id}`, { method: 'DELETE' });
    return { ok: true };
  },

  async feladatok() {
    return sb('kiadasok?select=id,cim,statusz,hatarido,beadva_at,created_at,tanitvany_id,tanitvanyok(nev),beadas_fajlok(id,tanartol)&order=created_at.desc&limit=500');
  },

  async fajlok_linkek(b) {
    const id = uuid(b.kiadas_id); if (!id) throw hiba('Hiányzó azonosító.');
    const f = await sb(`beadas_fajlok?kiadas_id=eq.${id}&tanartol=is.false&select=id,nev,utvonal&order=created_at`);
    const out = [];
    for (const x of f) out.push({ nev: x.nev, url: await T.letoltesiLink(x.utvonal, 900) });
    return out;
  },

  async tanar_feltoltes_link(b) {
    const id = uuid(b.kiadas_id); if (!id) throw hiba('Hiányzó azonosító.');
    const k = (await sb(`kiadasok?id=eq.${id}&select=id,tanitvany_id`))[0]; if (!k) throw hiba('Nincs ilyen feladat.');
    const tip = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }[String(b.tipus || '').toLowerCase()];
    if (!tip) throw hiba('Csak PDF vagy kép tölthető fel.');
    if (!(Number(b.meret) > 0) || Number(b.meret) > 10 * 1024 * 1024) throw hiba('Egy fájl legfeljebb 10 MB lehet.');
    return T.feltoltesiLink(`${k.tanitvany_id}/${k.id}/tanar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${tip}`);
  },

  async tanar_fajl_mentes(b) {
    const id = uuid(b.kiadas_id); if (!id) throw hiba('Hiányzó azonosító.');
    const k = (await sb(`kiadasok?id=eq.${id}&select=id,tanitvany_id`))[0]; if (!k) throw hiba('Nincs ilyen feladat.');
    const ut = String(b.utvonal || '');
    if (!ut.startsWith(`${k.tanitvany_id}/${k.id}/tanar-`) || ut.includes('..')) throw hiba('Hibás fájl.');
    return (await sb('beadas_fajlok', { method: 'POST', body: JSON.stringify({ kiadas_id: k.id, utvonal: ut, nev: szoveg(b.nev, 160) || 'javítás', meret: egesz(b.meret), tipus: szoveg(b.tipus, 60), tanartol: true }) }))[0];
  },

  async fajl_torles(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    const f = (await sb(`beadas_fajlok?id=eq.${id}&select=utvonal`))[0]; if (!f) throw hiba('Nincs ilyen fájl.');
    await sb(`beadas_fajlok?id=eq.${id}`, { method: 'DELETE' });
    await T.fajlTorles([f.utvonal]);
    return { ok: true };
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
    const p = await sb(`profiles?email=ilike.${enc(email)}&select=*`);
    return { fiok: p[0] || null };
  },

  async fiok_osszekapcs(b) {
    const id = uuid(b.id), uid = uuid(b.user_id);
    if (!id || !uid) throw hiba('Hiányzó azonosító.');
    const marVan = await sb(`tanitvanyok?user_id=eq.${uid}&id=neq.${id}&select=nev`);
    if (marVan[0]) throw hiba(`Ez a fiók már ${marVan[0].nev} adatlapjához van kötve.`);
    const t = (await sb(`tanitvanyok?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ user_id: uid, updated_at: new Date().toISOString() }) }))[0];
    await T.tanitvanyJeloles(uid, true);
    return t;
  },

  async fiok_levalaszt(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    const regi = (await sb(`tanitvanyok?id=eq.${id}&select=user_id`))[0];
    const t = (await sb(`tanitvanyok?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ user_id: null }) }))[0];
    if (regi && regi.user_id) await T.tanitvanyJeloles(regi.user_id, false);
    return t;
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
    const regi = id ? (await sb(`kiadasok?id=eq.${id}&select=statusz`))[0] : null;
    const k = id
      ? (await sb(`kiadasok?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(d) }))[0]
      : (await sb('kiadasok', { method: 'POST', body: JSON.stringify(d) }))[0];
    // értesítő a diáknak: új feladatnál és ha javítandóra állítod
    const tipus = !id ? 'uj' : (k.statusz === 'javitando' && regi && regi.statusz !== 'javitando' ? 'javitando' : (k.statusz === 'kesz' && regi && regi.statusz !== 'kesz' && b.ertesit ? 'kesz' : null));
    let ertesites = null;
    if (tipus && b.ertesit !== false) {
      const t = (await sb(`tanitvanyok?id=eq.${k.tanitvany_id}&select=nev,user_id,diak_email`))[0];
      const tanariFajl = (await sb(`beadas_fajlok?kiadas_id=eq.${k.id}&tanartol=is.true&select=id`)).length;
      try { ertesites = await T.ertesitDiak(t, Object.assign({}, k, { _tanari: tanariFajl }), tipus); } catch (e) { ertesites = { kuldve: false, ok: e.message.slice(0, 120) }; }
    }
    return Object.assign({}, k, { _ertesites: ertesites });
  },

  async fajl_link(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    const f = (await sb(`beadas_fajlok?id=eq.${id}&select=utvonal`))[0];
    if (!f) throw hiba('Nincs ilyen fájl.');
    return { url: await T.letoltesiLink(f.utvonal, 3600) };
  },

  async kiadas_torles(b) {
    const id = uuid(b.id); if (!id) throw hiba('Hiányzó azonosító.');
    const fajlok = await sb(`beadas_fajlok?kiadas_id=eq.${id}&select=utvonal`);
    await T.fajlTorles(fajlok.map((f) => f.utvonal));
    await sb(`kiadasok?id=eq.${id}`, { method: 'DELETE' });
    return { ok: true };
  },
};

function budapestOffset(d) {
  // percben: mennyivel jár előrébb Budapest az UTC-nél az adott pillanatban
  const s = d.toLocaleString('en-US', { timeZone: 'Europe/Budapest', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const m = /(\d+)\/(\d+)\/(\d+),\s*(\d+):(\d+)/.exec(s);
  const helyi = Date.UTC(+m[3], +m[1] - 1, +m[2], +m[4] % 24, +m[5]);
  return Math.round((helyi - Math.floor(d.getTime() / 60e3) * 60e3) / 60e3);
}

/* ---------- Google Naptár (egyirányú: admin → naptár) ----------
   Csak az adminban felvett órák kerülnek a naptárba (a régi naptárból importáltak – gcal_event_id – nem). */
async function naptarba(idk, mind) {
  if (!G.beallitva()) return { ok: 0, hibak: ['A Google Naptár nincs beállítva a Vercelen.'] };
  if (!idk.length) return { ok: 0 };
  let orak;
  try {
    // alapból csak az adminban felvett (vagy már a naptárban lévő) órák; „mind” esetén az importáltak is
    const szuro = mind ? '' : '&or=(gcal_event_id.is.null,naptar_id.not.is.null)';
    orak = await sb(`orak?id=in.(${idk.join(',')})${szuro}&select=*,tanitvanyok(id,nev,evfolyam,helyszin,szulo_nev,szulo_telefon,szolgaltatasok(nev))`);
  } catch (e) { return { ok: 0, hibak: ['Adatbázis: ' + e.message.slice(0, 200)] }; }
  let ok = 0; const hibak = [];
  for (const o of orak) {
    try {
      const t = o.tanitvanyok;
      const r = await G.szinkronOra(o, t, t && t.szolgaltatasok && t.szolgaltatasok.nev);
      if (r && 'naptar_id' in r && r.naptar_id !== o.naptar_id) await sb(`orak?id=eq.${o.id}`, { method: 'PATCH', body: JSON.stringify({ naptar_id: r.naptar_id }) });
      ok++;
    } catch (e) { hibak.push(e.message.slice(0, 160)); }
  }
  return { ok, hibak: hibak.length ? [...new Set(hibak)] : undefined };
}
async function naptarbolTorol(lekerdezes) {
  if (!G.beallitva()) return;
  const l = await sb(lekerdezes).catch(() => []);
  for (const o of l) await G.torles(o.naptar_id).catch((e) => console.error('[naptar] törlés', e.message));
}

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
