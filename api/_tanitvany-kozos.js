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

const gomb = (url, szoveg) => `<p style="margin:22px 0"><a href="${url}" style="background:#1F6F64;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">${K.esc(szoveg)}</a></p>`;
const hatarSzoveg = (h) => (h ? new Date(h).toLocaleString('hu-HU', { timeZone: 'Europe/Budapest', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : null);

async function ertesitDiak(t, kiadas, tipus) {
  const cim = await diakEmail(t);
  if (!cim) return { kuldve: false, ok: 'nincs e-mail-cím' };
  const keresztnev = String(t.nev || '').trim().split(/\s+/).slice(-1)[0] || '';
  const h = hatarSzoveg(kiadas.hatarido);
  const targy = tipus === 'javitando' ? `Javítandó feladat: ${kiadas.cim}` : `Új feladat: ${kiadas.cim}`;
  const belso = tipus === 'javitando'
    ? `<p>Szia ${K.esc(keresztnev)}!</p><p>Átnéztem a beadott megoldásodat (<b>${K.esc(kiadas.cim)}</b>), és van még rajta javítanivaló.</p>${kiadas.visszajelzes ? `<p style="background:#F6F5EF;border-left:4px solid #1F6F64;padding:10px 14px;white-space:pre-line">${K.esc(kiadas.visszajelzes)}</p>` : ''}`
    : `<p>Szia ${K.esc(keresztnev)}!</p><p>Új feladatot kaptál: <b>${K.esc(kiadas.cim)}</b>${h ? `<br>Határidő: <b>${K.esc(h)}</b>` : ''}</p>${kiadas.leiras ? `<p style="white-space:pre-line">${K.esc(kiadas.leiras)}</p>` : ''}`;
  await K.level({
    from: K.FELADO(), to: [cim], reply_to: K.CIMZETT(), subject: targy,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1D2733;line-height:1.55;max-width:560px">${belso}${gomb(ALAP_URL + '/feladataim.html', 'Feladataim megnyitása')}<p style="color:#5B6672;font-size:13px">A megoldásodat lefényképezve vagy PDF-ben töltheted fel ugyanott. – Zámbó Zsombor, papaimatek.hu</p></div>`,
  });
  return { kuldve: true, cim };
}

module.exports = { SUPABASE_URL, ALAP_URL, BUCKET, kulcsFejlec, felhasznalo, tanitvanyJeloles, feltoltesiLink, letoltesiLink, fajlTorles, diakEmail, ertesitDiak, gomb, hatarSzoveg };
