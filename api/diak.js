/* Diák API – a bejelentkezett diák csak a saját tanítványi adatlapjához tartozó feladatokat és fájlokat éri el.
   POST /api/diak { muvelet, ... } + Authorization: Bearer <token> */
const K = require('./_8het-kozos.js');
const T = require('./_tanitvany-kozos.js');

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

const M = {
  async lista(b, t) {
    const [kiad, orak] = await Promise.all([
      sb(`kiadasok?tanitvany_id=eq.${t.id}&select=*,beadas_fajlok(id,nev,meret,tipus,created_at,tanartol)&order=created_at.desc`),
      sb(`orak?tanitvany_id=eq.${t.id}&select=kezdes,perc,statusz,tema&statusz=in.(tervezett,megtartott)&order=kezdes.desc&limit=40`),
    ]);
    const kulcsok = [...new Set(kiad.flatMap((k) => (k.feladatok || []).map((f) => f.kulcs)).filter(Boolean))];
    let kesz = [];
    if (kulcsok.length && t.user_id) {
      kesz = await sb(`progress?user_id=eq.${t.user_id}&item_key=in.(${kulcsok.map((k) => `"${k}"`).join(',')})&select=item_key,status,score`).catch(() => []);
    }
    return { nev: t.nev, kiadasok: kiad, orak, kesz: kesz.filter((p) => p.status === 'kesz' || p.status === 'done' || p.score).map((p) => p.item_key) };
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
    const t = (await sb(`tanitvanyok?user_id=eq.${u.id}&select=id,nev,user_id`))[0];
    if (!t) return res.status(200).json({ ok: true, adat: { nincs: true } });
    const fn = M[b.muvelet];
    if (!fn) return res.status(400).json({ ok: false, hiba: 'Ismeretlen művelet.' });
    return res.status(200).json({ ok: true, adat: await fn(b, t) });
  } catch (e) {
    console.error('[diak]', b.muvelet, e.message);
    return res.status(e.sajat ? 400 : 500).json({ ok: false, hiba: e.sajat ? e.message : 'Szerverhiba, próbáld újra.' });
  }
};
