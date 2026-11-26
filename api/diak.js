/* Diák API – a bejelentkezett diák csak a saját tanítványi adatlapjához tartozó feladatokat és fájlokat éri el.
   POST /api/diak { muvelet, ... } + Authorization: Bearer <token> */
const K = require('./_8het-kozos.js');
const T = require('./_tanitvany-kozos.js');
const G = require('./_gcal.js');

const sb = (ut, o) => K.supabase(ut, o || { method: 'GET' });
const uuid = (s) => (/^[0-9a-f-]{36}$/i.test(String(s || '')) ? String(s) : null);
const TIPUSOK = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif', 'application/pdf': 'pdf' };
const MAX_MERET = 10 * 1024 * 1024;
const MAX_FAJL = 15;
function hiba(u) { const e = new Error(u); e.sajat = true; return e; }

async function sajatKiadas(t, id) {
  const k = uuid(id); if (!k) throw hiba('Hiányzó azonosító.');
  const x = (await sb(`kiadasok?id=eq.${k}&tanitvany_id=eq.${t.id}&select=*,beadas_fajlok(*)`))[0];
  if (!x) throw hiba('Nincs ilyen feladat.');
  return x;
}

async function sajatOra(t, id) {
  const k = uuid(id); if (!k) throw hiba('Hiányzó azonosító.');
  const o = (await sb(`orak?id=eq.${k}&tanitvany_id=eq.${t.id}&select=*`))[0];
  if (!o) throw hiba('Nincs ilyen óra.');
  if (o.statusz !== 'tervezett') throw hiba('Ez az óra már nem módosítható.');
  if (Date.parse(o.kezdes) <= Date.now()) throw hiba('Ez az óra már elkezdődött.');
  return o;
}

const M = {
  async lista(b, t) {
    const [kiad, orak, ker] = await Promise.all([
      sb(`kiadasok?tanitvany_id=eq.${t.id}&select=*,beadas_fajlok(id,nev,meret,tipus,created_at,tanartol)&order=created_at.desc`),
      sb(`orak?tanitvany_id=eq.${t.id}&select=id,kezdes,perc,statusz,tema,meet_link,diak_megjegyzes&order=kezdes.desc&limit=300`),
      sb(`ora_kerelmek?tanitvany_id=eq.${t.id}&select=id,ora_id,tipus,javaslat,uzenet,statusz,valasz,created_at&order=created_at.desc&limit=100`).catch(() => []),
    ]);
    // óránként a legutóbbi módosítás-kérés (nyitott vagy lezárt, válasszal)
    const kerelem = {};
    for (const k of ker) if (k.tipus === 'modositas' && k.ora_id && !kerelem[k.ora_id]) kerelem[k.ora_id] = k;
    const kulcsok = [...new Set(kiad.flatMap((k) => (k.feladatok || []).map((f) => f.kulcs)).filter(Boolean))];
    let kesz = [];
    if (kulcsok.length && t.user_id) {
      kesz = await sb(`progress?user_id=eq.${t.user_id}&item_key=in.(${kulcsok.map((k) => `"${k}"`).join(',')})&select=item_key,status,score`).catch(() => []);
    }
    const most = Date.now();
    const HELY = { papa: 'Pápa', ugod: 'Ugod', online: 'Online' };
    const ora = (o) => {
      const link = o.meet_link || null; // minden órához külön link (az adminban adod meg)
      const vege = Date.parse(o.kezdes) + (o.perc || 60) * 60e3;
      return {
        id: o.id, kezdes: o.kezdes, perc: o.perc || 60, statusz: o.statusz, tema: o.tema, uzenet: o.diak_megjegyzes,
        online: !!link || t.helyszin === 'online',
        hely: link ? 'Online' : (HELY[t.helyszin] || null),
        // az óralinket csak a még le nem zárult, tervezett óráknál adjuk ki
        link: o.statusz === 'tervezett' && vege > most ? link : null,
        mult: vege <= most,
        // lemondani / módosítást kérni csak a még el nem kezdődött, tervezett óránál lehet
        kezelheto: o.statusz === 'tervezett' && Date.parse(o.kezdes) > most,
        kerelem: kerelem[o.id] ? { statusz: kerelem[o.id].statusz, javaslat: kerelem[o.id].javaslat, valasz: kerelem[o.id].valasz } : null,
      };
    };
    const lista = orak.filter((o) => o.statusz !== 'elmaradt').map(ora);
    return {
      nev: t.nev, evfolyam: t.evfolyam,
      hely: HELY[t.helyszin] || null,
      kiadasok: kiad,
      jovobeli: lista.filter((o) => !o.mult && o.statusz !== 'megtartott').reverse(),
      korabbi: lista.filter((o) => o.mult && (o.statusz === 'megtartott' || o.statusz === 'tervezett')),
      megtartott_db: orak.filter((o) => o.statusz === 'megtartott' || (o.statusz === 'tervezett' && Date.parse(o.kezdes) < most)).length,
      kesz: kesz.filter((p) => p.status === 'kesz' || p.status === 'done' || p.score).map((p) => p.item_key),
    };
  },

  async feltoltes_link(b, t) {
    const k = await sajatKiadas(t, b.kiadas_id);
    if (k.statusz === 'kesz') throw hiba('Ez a feladat már le van zárva.');
    if ((k.beadas_fajlok || []).filter((x) => !x.tanartol).length >= MAX_FAJL) throw hiba(`Legfeljebb ${MAX_FAJL} fájlt tölthetsz fel egy feladathoz.`);
    const tipus = String(b.tipus || '').toLowerCase();
    if (!TIPUSOK[tipus]) throw hiba('Csak képet (JPG, PNG, WEBP, HEIC) vagy PDF-et tölthetsz fel.');
    if (!(Number(b.meret) > 0) || Number(b.meret) > MAX_MERET) throw hiba('Egy fájl legfeljebb 10 MB lehet.');
    const utvonal = `${t.id}/${k.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${TIPUSOK[tipus]}`;
    return T.feltoltesiLink(utvonal);
  },

  async fajl_mentes(b, t) {
    const k = await sajatKiadas(t, b.kiadas_id);
    const ut = String(b.utvonal || '');
    if (!ut.startsWith(`${t.id}/${k.id}/`) || ut.includes('..')) throw hiba('Hibás fájl.');
    const tipus = String(b.tipus || '').toLowerCase();
    const sor = { kiadas_id: k.id, utvonal: ut, nev: String(b.nev || 'fájl').slice(0, 160), meret: Math.min(Number(b.meret) || 0, MAX_MERET), tipus: TIPUSOK[tipus] ? tipus : null };
    return (await sb('beadas_fajlok', { method: 'POST', body: JSON.stringify(sor) }))[0];
  },

  async fajl_torles(b, t) {
    const k = await sajatKiadas(t, b.kiadas_id);
    if (k.statusz === 'beadva' || k.statusz === 'kesz') throw hiba('Beadás után már nem törölhetsz fájlt.');
    const f = (k.beadas_fajlok || []).find((x) => x.id === b.id && !x.tanartol);
    if (!f) throw hiba('Nincs ilyen fájl.');
    await sb(`beadas_fajlok?id=eq.${f.id}`, { method: 'DELETE' });
    await T.fajlTorles([f.utvonal]);
    return { ok: true };
  },

  async fajl_link(b, t) {
    const k = await sajatKiadas(t, b.kiadas_id);
    const f = (k.beadas_fajlok || []).find((x) => x.id === b.id);
    if (!f) throw hiba('Nincs ilyen fájl.');
    return { url: await T.letoltesiLink(f.utvonal, 600) };
  },

  async beadas(b, t) {
    const k = await sajatKiadas(t, b.kiadas_id);
    if (k.statusz === 'kesz') throw hiba('Ez a feladat már le van zárva.');
    if (!(k.beadas_fajlok || []).filter((x) => !x.tanartol).length) throw hiba('Előbb tölts fel legalább egy képet vagy PDF-et.');
    const most = new Date().toISOString();
    const u = (await sb(`kiadasok?id=eq.${k.id}`, { method: 'PATCH', body: JSON.stringify({ statusz: 'beadva', beadva_at: most, updated_at: most }) }))[0];
    try {
      await T.ertesitAdmin(t, k, k.beadas_fajlok.filter((x) => !x.tanartol).length);
    } catch (e) { console.error('[diak] értesítő', e.message); }
    return u;
  },

  async ora_lemondas(b, t) {
    const o = await sajatOra(t, b.ora_id);
    const uzenet = String(b.uzenet || '').trim().slice(0, 1000);
    if (!uzenet) throw hiba('Írd meg röviden, miért mondod le az órát.');
    const most = new Date().toISOString();
    const u = (await sb(`orak?id=eq.${o.id}`, { method: 'PATCH', body: JSON.stringify({ statusz: 'lemondott', fizetos: false, updated_at: most }) }))[0];
    // nyitott módosítás-kérés erre az órára: okafogyott
    await sb(`ora_kerelmek?ora_id=eq.${o.id}&statusz=eq.uj&tipus=eq.modositas`, { method: 'PATCH', body: JSON.stringify({ statusz: 'kesz', valasz: 'Az órát lemondtad.', lezarva_at: most }) }).catch(() => []);
    await sb('ora_kerelmek', { method: 'POST', body: JSON.stringify({ ora_id: o.id, tanitvany_id: t.id, tipus: 'lemondas', uzenet, eredeti_kezdes: o.kezdes }) });
    if (o.naptar_id) {
      try { await G.szinkronOra(u, t); await sb(`orak?id=eq.${o.id}`, { method: 'PATCH', body: JSON.stringify({ naptar_id: null }) }); } catch (e) { console.error('[diak] naptár', e.message); }
    }
    try { await T.ertesitAdminOra(t, o, 'lemondas', uzenet); } catch (e) { console.error('[diak] értesítő', e.message); }
    return { ok: true };
  },

  async ora_modositas(b, t) {
    const o = await sajatOra(t, b.ora_id);
    const javaslat = String(b.javaslat || '').trim().slice(0, 500);
    const uzenet = String(b.uzenet || '').trim().slice(0, 1000);
    if (!javaslat) throw hiba('Írd meg, mikor lenne jó helyette (akár több időpontot is).');
    const nyitott = await sb(`ora_kerelmek?ora_id=eq.${o.id}&statusz=eq.uj&tipus=eq.modositas&select=id`);
    if (nyitott.length) throw hiba('Ehhez az órához már kértél módosítást – még válaszra vár.');
    await sb('ora_kerelmek', { method: 'POST', body: JSON.stringify({ ora_id: o.id, tanitvany_id: t.id, tipus: 'modositas', uzenet: uzenet || null, javaslat, eredeti_kezdes: o.kezdes }) });
    try { await T.ertesitAdminOra(t, o, 'modositas', uzenet, javaslat); } catch (e) { console.error('[diak] értesítő', e.message); }
    return { ok: true };
  },
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, hiba: 'Csak POST.' }); }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, hiba: 'Hibás kérés.' });
  try {
    const u = await T.felhasznalo(req);
    if (!u) return res.status(401).json({ ok: false, hiba: 'Lépj be a fiókodba.' });
    const t = (await sb(`tanitvanyok?user_id=eq.${u.id}&select=id,nev,user_id,evfolyam,helyszin,meet_link`))[0];
    if (!t) return res.status(200).json({ ok: true, adat: { nincs: true } });
    const fn = M[b.muvelet];
    if (!fn) return res.status(400).json({ ok: false, hiba: 'Ismeretlen művelet.' });
    return res.status(200).json({ ok: true, adat: await fn(b, t) });
  } catch (e) {
    console.error('[diak]', b.muvelet, e.message);
    return res.status(e.sajat ? 400 : 500).json({ ok: false, hiba: e.sajat ? e.message : 'Szerverhiba, próbáld újra.' });
  }
};
