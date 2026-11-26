/* Közös segédek az admin és a diák API-hoz (az _ előtag miatt nem önálló végpont) */
const K = require('./_8het-kozos.js');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://duiskdduecldmkuylckb.supabase.co';
const ALAP_URL = 'https://www.papaimatek.hu';
const BUCKET = 'beadasok';

const kulcsFejlec = () => {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Object.assign({ apikey: key }, key && key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {});
};

async function felhasznalo(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!m) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${m[1]}` } });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}

// a diák fiókjához „tanítvány” jelölés (a menüben ettől jelenik meg a Feladataim)
async function tanitvanyJeloles(userId, ertek) {
  if (!userId) return;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, kulcsFejlec()),
    body: JSON.stringify({ app_metadata: { tanitvany: !!ertek } }),
  });
  if (!r.ok) console.error('[tanitvany] app_metadata', r.status, (await r.text()).slice(0, 200));
}

async function feltoltesiLink(utvonal) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${utvonal}`, {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, kulcsFejlec()), body: '{}',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Tárhely ${r.status}: ${j.message || j.error || ''}`);
  const token = j.token || (new URL('http://x' + j.url).searchParams.get('token'));
  return { token, utvonal };
}

async function letoltesiLink(utvonal, mp) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${utvonal}`, {
    method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, kulcsFejlec()), body: JSON.stringify({ expiresIn: mp || 3600 }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Tárhely ${r.status}: ${j.message || j.error || ''}`);
  return `${SUPABASE_URL}/storage/v1${j.signedURL || j.signedUrl}`;
}

async function fajlTorles(utvonalak) {
  if (!utvonalak.length) return;
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE', headers: Object.assign({ 'Content-Type': 'application/json' }, kulcsFejlec()), body: JSON.stringify({ prefixes: utvonalak }),
  }).catch(() => {});
}

// a diák értesítési címe: az összekötött fiók e-mailje, ha nincs, a diák e-mailje
async function diakEmail(t) {
  if (t.user_id) {
    const p = await K.supabase(`profiles?id=eq.${t.user_id}&select=email`, { method: 'GET' }).catch(() => []);
    if (p[0] && p[0].email) return p[0].email;
  }
  return t.diak_email || null;
}

// PápaiMatek e-mail sablon (ugyanaz a stílus, mint a hírlevélé)
const F_SANS = "'Alegreya Sans',Arial,sans-serif", F_SERIF = "'Alegreya',Georgia,serif";
const gomb = (url, szoveg) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px"><tr><td style="background:#FFC21A;border-radius:999px"><a href="${url}" style="display:inline-block;padding:15px 30px;font-family:${F_SANS};font-size:18px;font-weight:800;color:#0B2B27;text-decoration:none">${K.esc(szoveg)}</a></td></tr></table>`;
const doboz = (html, szin) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 4px"><tr><td style="background:#F6F5EF;border-left:4px solid ${szin || '#1F6F64'};border-radius:0 12px 12px 0;padding:14px 18px;font-family:${F_SANS};font-size:17px;line-height:1.5;color:#1D2733">${html}</td></tr></table>`;
function sablon({ elonezet, felirat, cim, belso, gombUrl, gombSzoveg, labjegyzet }) {
  return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@800&family=Alegreya+Sans:wght@500;700;800&display=swap" rel="stylesheet">
<style>@media (max-width:620px){.wrap{width:100%!important}.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:28px!important}}</style></head>
<body style="margin:0;padding:0;background:#F4F1EA">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${K.esc(elonezet || '')}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F1EA"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#FFFFFD;border-radius:20px;overflow:hidden;border:1px solid #E3DED3">
<tr><td style="background:#0F3F39;padding:22px 32px" class="px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px"><img src="${ALAP_URL}/icon-192.png" width="40" height="40" alt="" style="display:block;border-radius:10px"></td>
<td style="font-family:${F_SERIF};font-weight:800;font-size:26px;color:#FFFFFF">Pápai<span style="color:#9FE3D3">Matek</span></td></tr></table></td></tr>
<tr><td class="px" style="padding:32px 40px 30px;font-family:${F_SANS};color:#1D2733;font-size:17px;line-height:1.55">
${felirat ? `<p style="margin:0 0 6px;font-size:13px;font-weight:800;letter-spacing:.12em;color:#1F6F64">${K.esc(felirat)}</p>` : ''}
<h1 class="h1" style="margin:0 0 16px;font-family:${F_SERIF};font-weight:800;font-size:32px;line-height:1.15;color:#123631">${K.esc(cim)}</h1>
${belso}
${gombUrl ? gomb(gombUrl, gombSzoveg) : ''}
</td></tr>
<tr><td class="px" style="padding:18px 40px 24px;border-top:1px solid #ECE8DF;font-family:${F_SANS};font-size:13.5px;line-height:1.5;color:#6B7480">${labjegyzet || 'Zámbó Zsombor · papaimatek.hu'}</td></tr>
</table></td></tr></table></body></html>`;
}
const hatarSzoveg = (h) => (h ? new Date(h).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' }) : null);
const p = (html) => `<p style="margin:0 0 12px">${html}</p>`;

async function ertesitDiak(t, kiadas, tipus) {
  const cim = await diakEmail(t);
  if (!cim) return { kuldve: false, ok: 'nincs e-mail-cím' };
  const nevek = String(t.nev || '').trim().split(/\s+/);
  const keresztnev = nevek.length > 1 ? nevek.slice(1).join(' ') : nevek[0] || '';
  const h = hatarSzoveg(kiadas.hatarido);
  const fel = (kiadas.feladatok || []).map((f) => `<li style="margin:0 0 4px">${K.esc(String(f.cim || '').replace(/^\d+\. o\. · /, ''))}</li>`).join('');
  let html, targy;
  const tanari = kiadas._tanari ? doboz(`📎 Feltöltöttem a <b>javított megoldást</b> (${kiadas._tanari} fájl) – a Feladataim oldalon megnyithatod.`, '#1F6F64') : '';
  if (tipus === 'kesz') {
    targy = `Átnéztem: ${kiadas.cim}`;
    html = sablon({
      elonezet: 'Átnéztem a beadott megoldásodat.', felirat: 'ÁTNÉZETT FELADAT', cim: kiadas.cim,
      belso: p(`Szia ${K.esc(keresztnev)}!`) + p('Átnéztem a beadott megoldásodat. ✓')
        + (kiadas.visszajelzes ? doboz(`<b>Visszajelzés:</b><br>${K.esc(kiadas.visszajelzes).replace(/\n/g, '<br>')}`) : '') + tanari,
      gombUrl: `${ALAP_URL}/feladataim.html`, gombSzoveg: 'Megnézem',
    });
  } else if (tipus === 'javitando') {
    targy = `Javítandó: ${kiadas.cim}`;
    html = sablon({
      elonezet: 'Átnéztem a megoldásodat – van még rajta javítanivaló.', felirat: 'JAVÍTANDÓ FELADAT', cim: kiadas.cim,
      belso: p(`Szia ${K.esc(keresztnev)}!`) + p('Átnéztem a beadott megoldásodat, és van még rajta javítanivaló.')
        + (kiadas.visszajelzes ? doboz(`<b>Visszajelzés:</b><br>${K.esc(kiadas.visszajelzes).replace(/\n/g, '<br>')}`, '#C8432F') : '')
        + tanari + p('<br>A javított megoldást ugyanott töltheted fel, ahol az elsőt.'),
      gombUrl: `${ALAP_URL}/feladataim.html`, gombSzoveg: 'Javítás feltöltése',
    });
  } else {
    targy = `Új feladat: ${kiadas.cim}`;
    html = sablon({
      elonezet: h ? `Határidő: ${h}` : 'Új feladatot kaptál a papaimatek.hu-n.', felirat: 'ÚJ FELADAT', cim: kiadas.cim,
      belso: p(`Szia ${K.esc(keresztnev)}!`) + p('Új feladatot kaptál tőlem.')
        + (h ? doboz(`<b>Határidő:</b> ${K.esc(h)}`, '#FFC21A') : '')
        + (fel ? `<p style="margin:18px 0 6px;font-weight:800">Feladatok:</p><ul style="margin:0 0 8px;padding-left:22px">${fel}</ul>` : '')
        + (kiadas.leiras ? `<p style="margin:14px 0 0;white-space:pre-line">${K.esc(kiadas.leiras)}</p>` : '')
        + p('<br>A megoldásodat lefényképezve vagy PDF-ben töltheted fel a Feladataim oldalon.'),
      gombUrl: `${ALAP_URL}/feladataim.html`, gombSzoveg: 'Feladataim megnyitása',
    });
  }
  await K.level({ from: K.FELADO(), to: [cim], reply_to: K.CIMZETT(), subject: targy, html });
  return { kuldve: true, cim };
}

async function ertesitAdmin(t, k, fajlDb) {
  const kesve = k.hatarido && Date.parse(k.hatarido) < Date.now();
  const html = sablon({
    elonezet: `${t.nev} beadta: ${k.cim}`, felirat: 'BEADOTT FELADAT', cim: `${t.nev} beadta a feladatot`,
    belso: p(`<b>${K.esc(k.cim)}</b>`) + p(`${fajlDb} feltöltött fájl${kesve ? ' · <span style="color:#B53A27;font-weight:800">határidő után</span>' : ''}`),
    gombUrl: `${ALAP_URL}/admin/#/t/${t.id}`, gombSzoveg: 'Megnyitás az adminban', labjegyzet: 'Automatikus értesítő a papaimatek.hu admin felületéről.',
  });
  await K.level({ from: K.FELADO(), to: [K.CIMZETT()], subject: `Beadott feladat: ${t.nev} – ${k.cim}`, html });
}

// óralemondás / időpontmódosítás-kérés a diák felületéről → e-mail neked
async function ertesitAdminOra(t, ora, tipus, uzenet, javaslat) {
  const mikor = new Date(ora.kezdes).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' });
  const lem = tipus === 'lemondas';
  const html = sablon({
    elonezet: `${t.nev} ${lem ? 'lemondta' : 'módosítást kér'}: ${mikor}`,
    felirat: lem ? 'ÓRALEMONDÁS' : 'IDŐPONTMÓDOSÍTÁS',
    cim: lem ? `${t.nev} lemondta az órát` : `${t.nev} időpontmódosítást kér`,
    belso: p(`<b>Óra:</b> ${K.esc(mikor)}`) + (javaslat ? doboz(`<b>Javasolt időpont:</b><br>${K.esc(javaslat).replace(/\n/g, '<br>')}`, '#C9A227') : '') + (uzenet ? doboz(`<b>Üzenet:</b><br>${K.esc(uzenet).replace(/\n/g, '<br>')}`) : '')
      + p(lem ? 'Az óra az adminban automatikusan „lemondott” lett (díjmentes), és kikerült a naptárból. Ha mégis fizetős, jelöld az óránál.' : 'Az óra időpontját az adminban módosíthatod – a kérés ezzel automatikusan lezárul.'),
    gombUrl: `${ALAP_URL}/admin/#/orak`, gombSzoveg: 'Megnyitás az adminban', labjegyzet: 'Automatikus értesítő a papaimatek.hu admin felületéről.',
  });
  await K.level({ from: K.FELADO(), to: [K.CIMZETT()], subject: `${lem ? 'Óralemondás' : 'Időpontmódosítás'}: ${t.nev} – ${mikor}`, html });
}

// válasz a diák időpontmódosítás-kérésére
async function ertesitDiakKerelem(t, ker, ora) {
  const cim = await diakEmail(t);
  if (!cim) return { kuldve: false, ok: 'nincs e-mail-cím' };
  const nevek = String(t.nev || '').trim().split(/\s+/);
  const keresztnev = nevek.length > 1 ? nevek.slice(1).join(' ') : nevek[0] || '';
  const fmt = (x) => new Date(x).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest', month: 'long', day: 'numeric', weekday: 'long', hour: '2-digit', minute: '2-digit' });
  const atrakva = ora && ker.eredeti_kezdes && Date.parse(ora.kezdes) !== Date.parse(ker.eredeti_kezdes);
  const ok = ker.statusz === 'kesz';
  const html = sablon({
    elonezet: atrakva ? `Az órád új időpontja: ${fmt(ora.kezdes)}` : 'Válaszoltam az időpontmódosítás-kérésedre.',
    felirat: 'ÓRAIDŐPONT', cim: atrakva ? 'Új időpont' : (ok ? 'Válasz a kérésedre' : 'Most nem tudom áttenni az órát'),
    belso: p(`Szia ${K.esc(keresztnev)}!`)
      + (atrakva ? doboz(`<b>Új időpont:</b> ${K.esc(fmt(ora.kezdes))}<br><span style="color:#5b6670">Korábban: ${K.esc(fmt(ker.eredeti_kezdes))}</span>`, '#FFC21A') : '')
      + (ker.valasz ? doboz(`${K.esc(ker.valasz).replace(/\n/g, '<br>')}`, ok ? '#1F6F64' : '#C8432F') : ''),
    gombUrl: `${ALAP_URL}/feladataim.html#orak`, gombSzoveg: 'Óráim megnyitása',
  });
  await K.level({ from: K.FELADO(), to: [cim], reply_to: K.CIMZETT(), subject: atrakva ? `Új időpont: ${fmt(ora.kezdes)}` : 'Válasz az időpontmódosítás-kérésedre', html });
  return { kuldve: true, cim };
}

module.exports = { SUPABASE_URL, ALAP_URL, BUCKET, kulcsFejlec, felhasznalo, tanitvanyJeloles, feltoltesiLink, letoltesiLink, fajlTorles, diakEmail, ertesitDiak, ertesitAdmin, ertesitAdminOra, ertesitDiakKerelem, sablon, gomb, hatarSzoveg };
