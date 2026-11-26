/* Google Naptár – egyirányú szinkron (admin → „PápaiMatek órák” naptár), szolgáltatásfiókkal.
   Környezeti változók: GCAL_SA_JSON (a szolgáltatásfiók JSON-kulcsa egyben), GCAL_CALENDAR_ID */
const crypto = require('crypto');

let tokenCache = null;
const b64u = (x) => Buffer.from(x).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function beallitva() { return !!(process.env.GCAL_SA_JSON && process.env.GCAL_CALENDAR_ID); }

async function token() {
  if (tokenCache && tokenCache.lejar > Date.now() + 60e3) return tokenCache.t;
  const sa = JSON.parse(process.env.GCAL_SA_JSON);
  const most = Math.floor(Date.now() / 1000);
  const fej = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const test = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar.events', aud: 'https://oauth2.googleapis.com/token', iat: most, exp: most + 3600 }));
  const alairas = crypto.createSign('RSA-SHA256').update(`${fej}.${test}`).sign(sa.private_key).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${fej}.${test}.${alairas}` }).toString(),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(`Google-belépés sikertelen: ${j.error_description || j.error || r.status}`);
  tokenCache = { t: j.access_token, lejar: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.t;
}

async function api(ut, opciok) {
  const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GCAL_CALENDAR_ID)}/events${ut}`, Object.assign({}, opciok, {
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
  }));
  if (r.status === 204 || r.status === 410) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`Google Naptár ${r.status}: ${(j.error && j.error.message) || ''}`); e.status = r.status; throw e; }
  return j;
}

const HELY = { papa: 'Pápa', ugod: 'Ugod', online: 'Online' };

function esemeny(ora, t, szolgNev) {
  const kezd = new Date(ora.kezdes);
  const veg = new Date(kezd.getTime() + (ora.perc || 60) * 60e3);
  const sor = [];
  if (szolgNev) sor.push(szolgNev);
  if (ora.tema) sor.push(`Téma: ${ora.tema}`);
  if (t && t.szulo_nev) sor.push(`Szülő: ${t.szulo_nev}${t.szulo_telefon ? ', ' + t.szulo_telefon : ''}`);
  const link = ora.meet_link || (t && t.helyszin === 'online' ? t.meet_link : null);
  if (link) sor.push(`Óralink: ${link}`);
  if (t && t.id) sor.push(`Adatlap: https://www.papaimatek.hu/admin/#/t/${t.id}`);
  return {
    summary: `${(t && t.nev) || 'Óra'}${t && t.evfolyam ? ' · ' + t.evfolyam + ' o.' : ''}${t && t.helyszin === 'online' ? ' · online' : ''}`,
    location: (ora.meet_link || (t && t.helyszin === 'online' && t.meet_link)) || (t && HELY[t.helyszin]) || undefined,
    description: sor.join('\n'),
    start: { dateTime: kezd.toISOString(), timeZone: 'Europe/Budapest' },
    end: { dateTime: veg.toISOString(), timeZone: 'Europe/Budapest' },
    extendedProperties: { private: { papaimatek_ora: ora.id } },
    reminders: { useDefault: true },
  };
}

// Visszaadja az esemény azonosítóját (új vagy meglévő), vagy null-t, ha az órának nem kell a naptárban lennie.
async function szinkronOra(ora, t, szolgNev) {
  if (!beallitva()) return { kihagyva: 'nincs beállítva' };
  const kell = ora.tanitvany_id && (ora.statusz === 'tervezett' || ora.statusz === 'megtartott');
  if (!kell) {
    if (ora.naptar_id) await api(`/${encodeURIComponent(ora.naptar_id)}`, { method: 'DELETE' }).catch((e) => { if (e.status !== 404) throw e; });
    return { naptar_id: null };
  }
  const test = JSON.stringify(esemeny(ora, t, szolgNev));
  if (ora.naptar_id) {
    try { const e = await api(`/${encodeURIComponent(ora.naptar_id)}`, { method: 'PUT', body: test }); return { naptar_id: e.id }; }
    catch (e) { if (e.status !== 404) throw e; }
  }
  const e = await api('', { method: 'POST', body: test });
  return { naptar_id: e.id };
}

async function torles(naptarId) {
  if (!beallitva() || !naptarId) return;
  await api(`/${encodeURIComponent(naptarId)}`, { method: 'DELETE' }).catch((e) => { if (e.status !== 404) throw e; });
}

async function proba() {
  if (!beallitva()) return { ok: false, hiba: 'A GCAL_SA_JSON és a GCAL_CALENDAR_ID környezeti változó nincs beállítva a Vercelen.' };
  const sa = JSON.parse(process.env.GCAL_SA_JSON);
  await api(`?maxResults=1&timeMin=${encodeURIComponent(new Date().toISOString())}`, { method: 'GET' });
  return { ok: true, fiok: sa.client_email };
}

module.exports = { beallitva, szinkronOra, torles, proba };
