/*
 * POST /api/8het – „8 hét – 8 felvételi feladatsor” jelentkezés
 * 1. ellenőrzi az adatokat, 2. elmenti a Supabase `csoport_jelentkezesek` táblába (statusz: fizetesre_var),
 * 3. létrehoz egy Stripe Checkout fizetési munkamenetet, és visszaadja a fizetőoldal URL-jét.
 * A fizetés eredményét (fizetve / félbehagyva) a /api/stripe-webhook dolgozza fel, és az küldi az e-maileket.
 *
 * Környezeti változók: STRIPE_SECRET_KEY – korlátozott kulcs (rk_test_… a próbához, rk_live_… élesben; sk_… is működik),
 *   STRIPE_WEBHOOK_SECRET (whsec_…, a webhook aláírásához),
 *   SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, JELENTKEZES_FROM, (JELENTKEZES_TO)
 */
const K = require('./_8het-kozos');
const ENGEDETT = ['https://www.papaimatek.hu', 'https://papaimatek.hu'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ').trim().slice(0, max) : '');

function ellenoriz(b) {
  const d = {
    diak_nev: str(b.diak_nev, 120),
    diak_email: str(b.diak_email, 160).toLowerCase(),
    szulo_nev: str(b.szulo_nev, 120),
    email: str(b.email, 160),
    telefon: str(b.telefon, 40),
    felveteli_ev: 2027, // a program a 2027. januári írásbelire készít
    szamla_nev: str(b.szamla_nev, 120),
    szamla_irsz: str(b.szamla_irsz, 10),
    szamla_varos: str(b.szamla_varos, 80),
    szamla_cim: str(b.szamla_cim, 160),
    megjegyzes: str(b.megjegyzes, 1000),
    forras: str(b.forras, 200),
  };
  const hibak = [];
  if (d.diak_nev.length < 2) hibak.push('diák neve');
  if (!EMAIL.test(d.diak_email)) hibak.push('a diák e-mail-címe');
  if (d.szulo_nev.length < 2) hibak.push('szülő neve');
  if (!EMAIL.test(d.email)) hibak.push('a szülő e-mail-címe');
  if (d.telefon.replace(/\D/g, '').length < 8) hibak.push('telefonszám');
  if (d.szamla_nev.length < 2) hibak.push('számlázási név');
  if (!/^\d{4}$/.test(d.szamla_irsz)) hibak.push('irányítószám');
  if (d.szamla_varos.length < 2) hibak.push('település');
  if (d.szamla_cim.length < 3) hibak.push('utca, házszám');
  if (b.beleegyezes !== true) hibak.push('a feltételek elfogadása');
  return { d, hibak };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, hiba: 'Csak POST kérés engedélyezett.' }); }
  if (!K.JELENTKEZES_NYITVA) return res.status(410).json({ ok: false, hiba: 'A jelentkezés erre a programra lezárult.' });
  const origin = req.headers.origin || '';
  const elonezet = /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin);
  if (origin && !ENGEDETT.includes(origin) && !elonezet) return res.status(403).json({ ok: false, hiba: 'Nem engedélyezett forrás.' });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, hiba: 'Hibás kérés.' });

  // spamszűrés: rejtett mező kitöltve, vagy 4 mp-en belül beküldve
  if (str(b.weboldal, 200) || (Number(b.eltelt_ms) > 0 && Number(b.eltelt_ms) < 4000)) return res.status(400).json({ ok: false, hiba: 'Kérlek, próbáld újra.' });

  const { d, hibak } = ellenoriz(b);
  if (hibak.length) return res.status(400).json({ ok: false, hiba: `Hiányzó vagy hibás adat: ${hibak.join(', ')}.` });

  const alap = elonezet ? origin : 'https://www.papaimatek.hu';
  try {
    const alapSor = {
      program: K.PROGRAM, diak_nev: d.diak_nev, diak_email: d.diak_email, szulo_nev: d.szulo_nev, email: d.email,
      telefon: d.telefon, felveteli_ev: d.felveteli_ev, megjegyzes: d.megjegyzes || null, forras: d.forras || null,
      statusz: 'fizetesre_var', teszt: K.tesztMod(), osszeg: K.AR_FT, elallas_beleegyezes_at: new Date().toISOString(),
    };
    const szamla = { szamla_nev: d.szamla_nev, szamla_irsz: d.szamla_irsz, szamla_varos: d.szamla_varos, szamla_cim: d.szamla_cim };
    let sor;
    try {
      sor = await K.supabase('csoport_jelentkezesek', { method: 'POST', body: JSON.stringify(Object.assign({}, alapSor, szamla)) });
    } catch (e) {
      // ha a számlázási oszlopok még nincsenek létrehozva, a jelentkezés ne vesszen el: a megjegyzésbe kerülnek
      if (!/szamla_/.test(e.message)) throw e;
      console.error('[8het] számlázási oszlopok hiányoznak, megjegyzésbe mentve');
      const sz = `Számlázás: ${d.szamla_nev}, ${d.szamla_irsz} ${d.szamla_varos}, ${d.szamla_cim}`;
      sor = await K.supabase('csoport_jelentkezesek', { method: 'POST', body: JSON.stringify(Object.assign({}, alapSor, { megjegyzes: d.megjegyzes ? `${d.megjegyzes}\n${sz}` : sz })) });
    }
    const id = sor && sor[0] && sor[0].id;
    if (!id) throw new Error('Supabase: nem jött vissza azonosító');

    const sess = await K.stripe('checkout/sessions', {
      mode: 'payment',
      locale: 'hu',
      customer_email: d.email,
      client_reference_id: String(id),
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'huf',
      'line_items[0][price_data][unit_amount]': String(K.AR_FT * 100), // a Stripe a HUF-ot két tizedessel kéri
      'line_items[0][price_data][product_data][name]': K.PROGRAM_NEV,
      'line_items[0][price_data][product_data][description]': `8 élő online alkalom, egyenként 60 perc, 17:00–18:00 (2026. nov. 27. – 2027. jan. 22.), visszanézhető felvételekkel. Diák: ${d.diak_nev}`,
      'metadata[jelentkezes_id]': String(id),
      'metadata[program]': K.PROGRAM,
      'metadata[szamla_nev]': d.szamla_nev,
      'metadata[szamla_cim]': `${d.szamla_irsz} ${d.szamla_varos}, ${d.szamla_cim}`.slice(0, 500),
      'payment_intent_data[description]': `${K.PROGRAM_NEV} – ${d.diak_nev}`,
      'payment_intent_data[metadata][jelentkezes_id]': String(id),
      expires_at: String(Math.floor(Date.now() / 1000) + 60 * 60), // 1 óra után lejár → „félbehagyott” értesítés
      success_url: `${alap}/8het-8feladatsor?fizetes=sikeres`,
      cancel_url: `${alap}/8het-8feladatsor?fizetes=megszakitva`,
    });
    await K.supabase(`csoport_jelentkezesek?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ stripe_session_id: sess.id }) })
      .catch((e) => console.error('[8het] session mentése:', e.message));
    return res.status(200).json({ ok: true, url: sess.url });
  } catch (e) {
    console.error('[8het]', e.message);
    return res.status(502).json({ ok: false, hiba: 'A fizetőoldalt most nem sikerült megnyitni.' });
  }
};
