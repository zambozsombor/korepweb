/*
 * Vercel serverless függvény: POST /api/jelentkezes
 * A jelentkezést elmenti a Supabase `jelentkezesek` táblájába, és e-mailben elküldi (Resend).
 *
 * Környezeti változók (Vercel → Project → Settings → Environment Variables):
 *   SUPABASE_SERVICE_ROLE_KEY  – Supabase → Project Settings → API → service_role (TITKOS, csak itt szerepelhet)
 *   RESEND_API_KEY             – Resend → API Keys
 *   JELENTKEZES_FROM           – feladó, pl. "papaimatek.hu <jelentkezes@papaimatek.hu>" (Resendben hitelesített domainről)
 *   JELENTKEZES_TO             – címzett (alapértelmezés: papaimatek@gmail.com)
 *   JELENTKEZES_VISSZAIGAZOLAS – "1" esetén a jelentkező is kap egy visszaigazoló e-mailt
 *   SUPABASE_URL               – opcionális, alapértelmezés a papaimatek.hu projektje
 */
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://duiskdduecldmkuylckb.supabase.co';
const ENGEDETT = ['https://www.papaimatek.hu', 'https://papaimatek.hu'];
const NAPOK = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
const KI = { szulo: 'szülő (a gyermeke nevében)', diak: 'diák (a saját nevében)' };
const IDO = /^([01]\d|2[0-3]):[0-5]\d$/;

const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max) : '');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function ellenoriz(b) {
  const osztaly = Number(b.osztaly);
  const d = {
    ki: str(b.ki, 10),
    nev: str(b.nev, 120),
    telefon: str(b.telefon, 40),
    email: str(b.email, 160),
    osztaly: Number.isInteger(osztaly) ? osztaly : 0,
    idopontok: (Array.isArray(b.idopontok) ? b.idopontok : [])
      .map((x) => ({ nap: str(x && x.nap, 12), tol: str(x && x.tol, 5), ig: str(x && x.ig, 5) }))
      .filter((x) => NAPOK.includes(x.nap) && IDO.test(x.tol) && IDO.test(x.ig) && x.ig > x.tol)
      .filter((x, i, a) => a.findIndex((y) => y.nap === x.nap) === i)
      .sort((x, y) => NAPOK.indexOf(x.nap) - NAPOK.indexOf(y.nap)),
    forras: str(b.forras, 200),
  };
  const hibak = [];
  if (!KI[d.ki]) hibak.push('ki jelentkezik');
  if (d.nev.length < 2) hibak.push('név');
  if (d.telefon.replace(/\D/g, '').length < 8) hibak.push('telefonszám');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) hibak.push('e-mail-cím');
  if (d.osztaly < 4 || d.osztaly > 12) hibak.push('osztály');
  if (!d.idopontok.length) hibak.push('időpont');
  return { d, hibak };
}

const idoSzoveg = (d) => d.idopontok.map((x) => `${x.nap} ${x.tol}–${x.ig}`);
function sorok(d) {
  return [
    ['Jelentkező', KI[d.ki]],
    [d.ki === 'szulo' ? 'Szülő neve' : 'Diák neve', d.nev],
    ['Telefon', d.telefon],
    ['E-mail', d.email],
    [d.ki === 'szulo' ? 'A gyermek osztálya' : 'Osztály', `${d.osztaly}. osztály`],
    ['Alkalmas időpontok', idoSzoveg(d).join('\n')],
  ];
}

async function mentes(d) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY hiányzik');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/jelentkezesek`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ ki: d.ki, nev: d.nev, telefon: d.telefon, email: d.email, osztaly: d.osztaly, idopontok: d.idopontok, forras: d.forras || null }),
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

async function level(payload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY hiányzik');
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

function ertesitoLevel(d) {
  const s = sorok(d);
  const td = 'border-bottom:1px solid #E6E9E2';
  return {
    from: process.env.JELENTKEZES_FROM || 'papaimatek.hu <onboarding@resend.dev>',
    to: [process.env.JELENTKEZES_TO || 'papaimatek@gmail.com'],
    reply_to: d.email,
    subject: `Új jelentkezés: ${d.nev} (${d.osztaly}. osztály, ${d.ki === 'szulo' ? 'szülő' : 'diák'})`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1D2733">
<h2 style="margin:0 0 12px;color:#1F6F64">Új jelentkezés – papaimatek.hu</h2>
<table cellpadding="7" style="border-collapse:collapse">${s.map(([k, v]) => `<tr><td style="vertical-align:top;color:#5B6672;white-space:nowrap;${td}"><b>${esc(k)}</b></td><td style="${td}">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>
<p style="margin-top:16px"><a href="tel:${esc(d.telefon.replace(/[^\d+]/g, ''))}">Hívás: ${esc(d.telefon)}</a> · Ha válaszolsz erre a levélre, a jelentkezőnek megy.</p></div>`,
    text: s.map(([k, v]) => `${k}: ${v.replace(/\n/g, ', ')}`).join('\n'),
  };
}

function visszaigazolas(d) {
  const meg = d.ki === 'szulo' ? 'Kedves' : 'Szia';
  const ido = idoSzoveg(d).join(', ');
  const t = d.ki === 'szulo'
    ? 'Köszönöm a jelentkezést, megkaptam. Hamarosan jelentkezem telefonon vagy e-mailben, és egyeztetjük az első, ingyenes óra időpontját.'
    : 'Köszönöm, hogy jelentkeztél, megkaptam. Hamarosan jelentkezem telefonon vagy e-mailben, és egyeztetjük az első, ingyenes óra időpontját.';
  return {
    from: process.env.JELENTKEZES_FROM,
    to: [d.email],
    reply_to: process.env.JELENTKEZES_TO || 'papaimatek@gmail.com',
    subject: 'Megkaptam a jelentkezést – papaimatek.hu',
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1D2733;line-height:1.55"><p>${meg} ${esc(d.nev)}!</p><p>${t}</p><p style="color:#5B6672;font-size:14px">Megadott időpontok: ${esc(ido)}</p><p>Üdvözlettel:<br>Zámbó Zsombor<br>+36 30 216 5768 · papaimatek.hu</p></div>`,
    text: `${meg} ${d.nev}!\n\n${t}\n\nMegadott időpontok: ${ido}\n\nÜdvözlettel:\nZámbó Zsombor\n+36 30 216 5768 · papaimatek.hu`,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, hiba: 'Csak POST kérés engedélyezett.' }); }
  const origin = req.headers.origin || '';
  if (origin && !ENGEDETT.includes(origin) && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return res.status(403).json({ ok: false, hiba: 'Nem engedélyezett forrás.' });
  }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b !== 'object') return res.status(400).json({ ok: false, hiba: 'Hibás kérés.' });

  // spamszűrés: rejtett mező kitöltve, vagy 4 mp-en belül beküldve → csendben „sikeres”
  if (str(b.weboldal, 200) || (Number(b.eltelt_ms) > 0 && Number(b.eltelt_ms) < 4000)) return res.status(200).json({ ok: true });

  const { d, hibak } = ellenoriz(b);
  if (hibak.length) return res.status(400).json({ ok: false, hiba: `Hiányzó vagy hibás adat: ${hibak.join(', ')}.` });

  const [m, l] = await Promise.allSettled([mentes(d), level(ertesitoLevel(d))]);
  if (m.status === 'rejected') console.error('[jelentkezes] mentés:', m.reason && m.reason.message);
  if (l.status === 'rejected') console.error('[jelentkezes] e-mail:', l.reason && l.reason.message);
  if (m.status === 'rejected' && l.status === 'rejected') {
    return res.status(502).json({ ok: false, hiba: 'A jelentkezést most nem sikerült elküldeni.' });
  }
  if (process.env.JELENTKEZES_VISSZAIGAZOLAS === '1' && process.env.JELENTKEZES_FROM) {
    try { await level(visszaigazolas(d)); } catch (e) { console.error('[jelentkezes] visszaigazolás:', e.message); }
  }
  return res.status(200).json({ ok: true });
};
