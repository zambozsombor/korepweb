/*
 * POST /api/stripe-webhook – a Stripe értesítései a fizetés eredményéről
 * Stripe → Developers → Webhooks → végpont: https://www.papaimatek.hu/api/stripe-webhook
 * Események: checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired
 *
 * Biztonság: 1) ha be van állítva a STRIPE_WEBHOOK_SECRET (whsec_…), ellenőrizzük a Stripe-Signature aláírást;
 * 2) az eseményt ezen felül a kulccsal közvetlenül a Stripe-tól kérjük le újra, így hamisított kérés
 * semmiképp sem tud „fizetett” állapotot előidézni.
 * Ismétlődő értesítésnél nem megy ki újra e-mail (az állapotváltás csak egyszer sikerül).
 */
const crypto = require('crypto');
const K = require('./_8het-kozos');

/* nyers kérés-törzs (az aláírás-ellenőrzéshez); ha a futtatókörnyezet már beolvasta, null */
function nyersTorzs(req) {
  return new Promise((ok) => {
    if (typeof req.on !== 'function' || req.readableEnded || req.complete) return ok(null);
    const d = []; let kesz = false;
    const vege = (v) => { if (!kesz) { kesz = true; ok(v); } };
    req.on('data', (c) => d.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => vege(d.length ? Buffer.concat(d) : null));
    req.on('error', () => vege(null));
    setTimeout(() => vege(d.length ? Buffer.concat(d) : null), 3000);
  });
}
function alairasRendben(nyers, fejlec, titok) {
  if (!nyers || !fejlec) return false;
  const reszek = {}; String(fejlec).split(',').forEach((p) => { const [k, v] = p.split('='); (reszek[k] = reszek[k] || []).push(v); });
  const t = Number(reszek.t && reszek.t[0]);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false; // 5 perces tűrés (visszajátszás ellen)
  const vart = crypto.createHmac('sha256', titok).update(`${t}.${nyers.toString('utf8')}`).digest('hex');
  return (reszek.v1 || []).some((v) => v && v.length === vart.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(vart)));
}

async function fizetve(sess) {
  const id = Number(sess.client_reference_id || (sess.metadata && sess.metadata.jelentkezes_id));
  if (!id) return;
  const sorok = await K.supabase(`csoport_jelentkezesek?id=eq.${id}&statusz=neq.fizetve`, {
    method: 'PATCH',
    body: JSON.stringify({
      statusz: 'fizetve', fizetve_at: new Date().toISOString(), stripe_session_id: sess.id,
      stripe_payment_intent: typeof sess.payment_intent === 'string' ? sess.payment_intent : null,
      osszeg: Math.round((sess.amount_total || 0) / 100),
    }),
  });
  const d = sorok && sorok[0];
  if (!d) return; // már feldolgozva
  const elo = d.teszt ? '[TESZT] ' : '';
  const s = K.sorok(d);
  const ki = [
    K.level({
      from: K.FELADO(), to: [K.CIMZETT()], reply_to: d.email,
      subject: `${elo}✅ Fizetett jelentkezés: ${d.diak_nev} – 8 hét`,
      html: K.keret(`${elo}Új fizetett jelentkező – ${K.PROGRAM_NEV}`, `${K.tabla(s.concat([['Fizetve', `${d.osszeg} Ft`]]))}<p style="margin-top:14px"><b>Teendő:</b> hívd meg a diákot a Classroomba: <b>${K.esc(d.diak_email)}</b></p>`),
      text: `${s.map(([k, v]) => `${k}: ${v}`).join('\n')}\nFizetve: ${d.osszeg} Ft\n\nTeendő: Classroom-meghívó a ${d.diak_email} címre.`,
    }),
  ];
  if (process.env.JELENTKEZES_FROM) {
    const t1 = `Köszönöm, hogy ${d.diak_nev} nevében jelentkezett a „${K.PROGRAM_NEV}” online felkészítőre. A ${d.osszeg} Ft-os befizetés sikeresen megérkezett.`;
    const t2 = `Az első óra előtt meghívót küldök a csoport Google Classroomjába a ${d.diak_email} címre. Ott lesznek az órák Google Meet-linkjei és a felvételek is.`;
    ki.push(K.level({
      from: process.env.JELENTKEZES_FROM, to: [d.email], reply_to: K.CIMZETT(),
      subject: `${elo}Sikeres jelentkezés – ${K.PROGRAM_NEV}`,
      html: K.keret('Sikeres jelentkezés', `<p>Kedves ${K.esc(d.szulo_nev)}!</p><p>${K.esc(t1)}</p><p>${K.esc(t2)}</p>
<p style="margin:16px 0 6px"><b>Időpontok</b></p><p style="margin:0">${K.esc(K.IDOPONTOK)}</p>
<p style="margin:16px 0 6px"><b>A megadott adatok</b></p>${K.tabla(s)}
<p style="margin-top:16px">A program feltételei (ÁSZF), a lemondás és az elállás módja: <a href="https://www.papaimatek.hu/aszf-8het.html">papaimatek.hu/aszf-8het.html</a></p><p style="margin-top:16px">Ha kérdése van, válaszoljon erre a levélre, vagy hívjon: +36 30 216 5768.</p><p>Üdvözlettel:<br>Zámbó Zsombor<br>papaimatek.hu</p>`),
      text: `Kedves ${d.szulo_nev}!\n\n${t1}\n\n${t2}\n\nIdőpontok: ${K.IDOPONTOK}\n\n${s.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nA program feltételei (ÁSZF), a lemondás és az elállás módja: https://www.papaimatek.hu/aszf-8het.html\n\nHa kérdése van, válaszoljon erre a levélre, vagy hívjon: +36 30 216 5768.\n\nÜdvözlettel:\nZámbó Zsombor\npapaimatek.hu`,
    }));
  }
  const r = await Promise.allSettled(ki);
  r.forEach((x) => { if (x.status === 'rejected') console.error('[stripe-webhook] e-mail:', x.reason && x.reason.message); });
}

async function felbehagyva(sess, uj) {
  const id = Number(sess.client_reference_id || (sess.metadata && sess.metadata.jelentkezes_id));
  if (!id) return;
  const sorok = await K.supabase(`csoport_jelentkezesek?id=eq.${id}&statusz=eq.fizetesre_var`, {
    method: 'PATCH', body: JSON.stringify({ statusz: uj }),
  });
  const d = sorok && sorok[0];
  if (!d) return;
  const elo = d.teszt ? '[TESZT] ' : '';
  const s = K.sorok(d);
  await K.level({
    from: K.FELADO(), to: [K.CIMZETT()], reply_to: d.email,
    subject: `${elo}⚠️ Félbehagyott jelentkezés (nem fizetett): ${d.diak_nev} – 8 hét`,
    html: K.keret(`${elo}Félbehagyott jelentkezés – ${K.PROGRAM_NEV}`, `<p>Kitöltötte az űrlapot és eljutott a fizetőoldalig, de egy órán belül nem fizetett.</p>${K.tabla(s)}<p style="margin-top:14px"><a href="tel:${K.esc(String(d.telefon).replace(/[^\d+]/g, ''))}">Hívás: ${K.esc(d.telefon)}</a></p>`),
    text: `Félbehagyott jelentkezés (nem fizetett):\n${s.map(([k, v]) => `${k}: ${v}`).join('\n')}`,
  }).catch((e) => console.error('[stripe-webhook] e-mail:', e.message));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).end(); }
  const titok = process.env.STRIPE_WEBHOOK_SECRET;
  const nyers = await nyersTorzs(req);
  if (titok && nyers && !alairasRendben(nyers, req.headers['stripe-signature'], titok)) {
    console.error('[stripe-webhook] érvénytelen aláírás');
    return res.status(400).json({ ok: false });
  }
  let b = null;
  if (nyers) { try { b = JSON.parse(nyers.toString('utf8')); } catch (e) { b = null; } }
  else { b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } } }
  const eventId = b && typeof b.id === 'string' && /^evt_[A-Za-z0-9]+$/.test(b.id) ? b.id : null;
  if (!eventId) return res.status(400).json({ ok: false });

  let ev;
  try { ev = await K.stripe(`events/${eventId}`); } catch (e) {
    // pl. teszt-esemény élő kulccsal (vagy fordítva): nincs mit tenni, ne próbálkozzon újra a Stripe
    console.error('[stripe-webhook] esemény lekérése:', e.message);
    return res.status(200).json({ ok: true, figyelmen_kivul: true });
  }
  const sess = ev.data && ev.data.object;
  if (!sess || sess.object !== 'checkout.session' || !sess.metadata || sess.metadata.program !== K.PROGRAM) return res.status(200).json({ ok: true });

  try {
    if ((ev.type === 'checkout.session.completed' && sess.payment_status === 'paid') || ev.type === 'checkout.session.async_payment_succeeded') await fizetve(sess);
    else if (ev.type === 'checkout.session.expired') await felbehagyva(sess, 'nem_fizetett');
    else if (ev.type === 'checkout.session.async_payment_failed') await felbehagyva(sess, 'fizetes_sikertelen');
  } catch (e) {
    console.error('[stripe-webhook]', e.message);
    return res.status(500).json({ ok: false }); // a Stripe később újrapróbálja
  }
  return res.status(200).json({ ok: true });
};
