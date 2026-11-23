/*
 * GET /api/marketing-sync – a marketing-hozzájárulást adók listájának szinkronja a Resend egyik szegmensével.
 * LEVELET NEM KÜLD: csak a listát tartja naprakészen. A kiküldés a Resend felületén (Broadcasts) kézzel indul.
 *
 * Forrás: a Supabase `marketing_lista` nézet (marketing_consent = true, 16 év alatt megerősített szülői hozzájárulással).
 * 1. Aki a Resendben leiratkozott (unsubscribed), annál a profilban is kikapcsolja a marketing_consent-et, és kiveszi a szegmensből.
 * 2. Aki a nézetben szerepel, de a szegmensben nem → felveszi a szegmensbe.
 * 3. Aki a szegmensben van, de már nincs a nézetben (visszavonta) → kiveszi a szegmensből.
 *
 * Indítás: naponta a Vercel Cron (vercel.json), vagy kézzel: /api/marketing-sync?proba=1 (csak kiírja, mit tenne).
 * Környezeti változók: CRON_SECRET, RESEND_SEGMENT_ID, RESEND_MARKETING_KEY (teljes hozzáférésű kulcs; ha nincs, RESEND_API_KEY),
 *   SUPABASE_SERVICE_ROLE_KEY
 */
const K = require('./_8het-kozos');
const varj = (ms) => new Promise((r) => setTimeout(r, ms));

async function resend(utvonal, opciok = {}) {
  const key = process.env.RESEND_MARKETING_KEY || process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_MARKETING_KEY hiányzik');
  await varj(550); // a Resend alapból másodpercenként 2 kérést enged
  const r = await fetch(`https://api.resend.com/${utvonal}`, Object.assign({}, opciok, {
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  }));
  const t = await r.text();
  const j = t ? (() => { try { return JSON.parse(t); } catch (e) { return {}; } })() : {};
  if (!r.ok) { const e = new Error(`Resend ${r.status}: ${(j.message || t).slice(0, 200)}`); e.status = r.status; throw e; }
  return j;
}

async function szegmensTagjai(seg) {
  const ki = []; let after = '';
  for (;;) {
    const j = await resend(`segments/${seg}/contacts?limit=100${after ? `&after=${after}` : ''}`);
    ki.push(...(j.data || []));
    if (!j.has_more || !j.data || !j.data.length) return ki;
    after = j.data[j.data.length - 1].id;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const titok = process.env.CRON_SECRET;
  if (!titok || req.headers.authorization !== `Bearer ${titok}`) return res.status(401).json({ ok: false, hiba: 'Nincs jogosultság.' });
  const seg = process.env.RESEND_SEGMENT_ID;
  if (!seg) return res.status(500).json({ ok: false, hiba: 'RESEND_SEGMENT_ID hiányzik.' });
  const proba = req.query && (req.query.proba === '1' || req.query.proba === 'true');

  try {
    const lista = (await K.supabase('marketing_lista?select=*', { method: 'GET' })) || [];
    const nezet = new Map();
    lista.forEach((s) => { if (s.email) nezet.set(String(s.email).trim().toLowerCase(), s); });
    const tagok = await szegmensTagjai(seg);
    const tagMap = new Map(tagok.map((c) => [String(c.email).toLowerCase(), c]));

    // 1. Resendben leiratkozott → a profilban is kikapcsoljuk
    const leiratkozott = tagok.filter((c) => c.unsubscribed && nezet.has(String(c.email).toLowerCase()));
    for (const c of leiratkozott) {
      const eredeti = nezet.get(String(c.email).toLowerCase()).email;
      if (!proba) {
        await K.supabase(`profiles?email=eq.${encodeURIComponent(eredeti)}`, { method: 'PATCH', body: JSON.stringify({ marketing_consent: false }) });
        await resend(`contacts/${c.id}/segments/${seg}`, { method: 'DELETE' }); // ha később újra feliratkozik, új hozzájárulásként kerül vissza
      }
      nezet.delete(String(c.email).toLowerCase());
    }
    // 2. új hozzájárulók felvétele
    const uj = [...nezet.keys()].filter((e) => !tagMap.has(e));
    for (const e of uj) {
      if (proba) continue;
      const s = nezet.get(e), nev = String(s.display_name || s.full_name || s.name || '').trim().slice(0, 100);
      try {
        await resend('contacts', { method: 'POST', body: JSON.stringify({ email: e, first_name: nev || undefined, segments: [{ id: seg }] }) });
      } catch (err) {
        if (!(err.status && err.status < 500)) throw err;
        // már létező kapcsolat: a friss hozzájárulás alapján újra feliratkoztatjuk, és felvesszük a szegmensbe
        await resend(`contacts/${encodeURIComponent(e)}`, { method: 'PATCH', body: JSON.stringify({ unsubscribed: false }) });
        await resend(`contacts/${encodeURIComponent(e)}/segments/${seg}`, { method: 'POST' });
      }
    }
    // 3. visszavont hozzájárulás → ki a szegmensből
    const ki = tagok.filter((c) => !c.unsubscribed && !nezet.has(String(c.email).toLowerCase()));
    for (const c of ki) if (!proba) await resend(`contacts/${c.id}/segments/${seg}`, { method: 'DELETE' });

    const osszegzes = { ok: true, proba, hozzajarulo: lista.length, szegmensben_volt: tagok.length, felveve: uj.length, kiveve: ki.length, leiratkozott_profilban_kikapcsolva: leiratkozott.length };
    console.log('[marketing-sync]', JSON.stringify(osszegzes));
    return res.status(200).json(osszegzes);
  } catch (e) {
    console.error('[marketing-sync]', e.message);
    return res.status(502).json({ ok: false, hiba: e.message.slice(0, 300) });
  }
};
