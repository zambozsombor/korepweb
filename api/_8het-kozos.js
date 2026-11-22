/* Közös segédfüggvények a „8 hét – 8 felvételi feladatsor” végpontokhoz (az _ előtag miatt nem önálló végpont) */
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://duiskdduecldmkuylckb.supabase.co';
const PROGRAM = '8het-2027';
const PROGRAM_NEV = '8 hét – 8 felvételi feladatsor';
const AR_FT = 19990;
const IDOPONTOK = 'Minden alkalom 60 perces, 17:00–18:00: 2026. nov. 27. (P), dec. 4. (P), dec. 11. (P), dec. 18. (P), 2027. jan. 8. (P), jan. 15. (P), jan. 19. (K), jan. 22. (P)';

const tesztMod = () => /^(sk|rk)_test_/.test(String(process.env.STRIPE_SECRET_KEY || ''));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function supabase(utvonal, opciok) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY hiányzik');
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${utvonal}`, Object.assign({}, opciok, {
    headers: Object.assign(
      { apikey: key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}
    ),
  }));
  const t = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

async function stripe(utvonal, parameterek) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY hiányzik');
  const r = await fetch(`https://api.stripe.com/v1/${utvonal}`, {
    method: parameterek ? 'POST' : 'GET',
    headers: Object.assign({ Authorization: `Bearer ${key}` }, parameterek ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    body: parameterek ? new URLSearchParams(parameterek).toString() : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Stripe ${r.status}: ${(j.error && j.error.message) || ''}`.slice(0, 300));
  return j;
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

const FELADO = () => process.env.JELENTKEZES_FROM || 'papaimatek.hu <onboarding@resend.dev>';
const CIMZETT = () => process.env.JELENTKEZES_TO || 'papaimatek@gmail.com';

function sorok(d) {
  const s = [
    ['Diák neve', d.diak_nev],
    ['Diák Gmail-címe (Classroom)', d.diak_email],
    ['Szülő neve', d.szulo_nev],
    ['Szülő e-mail-címe', d.email],
    ['Telefon', d.telefon],
  ];
  if (d.szamla_nev) s.push(['Számlázási név', d.szamla_nev], ['Számlázási cím', `${d.szamla_irsz || ''} ${d.szamla_varos || ''}, ${d.szamla_cim || ''}`.trim()]);
  if (d.megjegyzes) s.push(['Megjegyzés', d.megjegyzes]);
  return s;
}
const td = 'border-bottom:1px solid #E6E9E2';
const tabla = (s) => `<table cellpadding="7" style="border-collapse:collapse">${s.map(([k, v]) => `<tr><td style="vertical-align:top;color:#5B6672;white-space:nowrap;${td}"><b>${esc(k)}</b></td><td style="${td}">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
const keret = (cim, belso) => `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1D2733;line-height:1.5"><h2 style="margin:0 0 12px;color:#1F6F64">${esc(cim)}</h2>${belso}</div>`;

module.exports = { PROGRAM, PROGRAM_NEV, AR_FT, IDOPONTOK, tesztMod, esc, supabase, stripe, level, FELADO, CIMZETT, sorok, tabla, keret };
