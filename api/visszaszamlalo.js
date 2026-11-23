/*
 * GET /api/visszaszamlalo – élő visszaszámláló GIF e-mailekbe (a „8 hét – 8 felvételi feladatsor” jelentkezési határidejéig).
 * A kép megnyitáskor generálódik: 60 képkocka, másodpercenként egy, a megnyitás pillanatától. A határidő után 00:00:00:00.
 * Külső csomag nélkül: saját GIF/LZW kódoló, az előre renderelt háttér és számjegyek a _visszaszamlalo-adat.js-ben.
 */
const zlib = require('zlib');
const A = require('./_visszaszamlalo-adat');
const HATARIDO = Date.parse('2026-11-26T00:00:00+01:00'); // 2026. nov. 25., szerda éjfél (budapesti idő)

const W = A.w, H = A.h, DW = A.dw, DH = A.dh;
const HATTER = zlib.inflateSync(Buffer.from(A.bg, 'base64'));
const SZAMOK = zlib.inflateSync(Buffer.from(A.dig, 'base64'));
const DOBOZ_X = [16, 290, 564, 838], SZAM_Y = 38, SZAM_DX = 25;

function lzw(px, minKod) {
  const clear = 1 << minKod, eoi = clear + 1, out = [];
  let acc = 0, nb = 0, kodMeret = minKod + 1, kov = eoi + 1, dict = new Map();
  const ir = (k) => { acc |= k << nb; nb += kodMeret; while (nb >= 8) { out.push(acc & 255); acc >>>= 8; nb -= 8; } };
  ir(clear);
  let pre = px[0];
  for (let i = 1; i < px.length; i++) {
    const c = px[i], kulcs = pre * 4096 + c, van = dict.get(kulcs);
    if (van !== undefined) { pre = van; continue; }
    ir(pre);
    if (kov < 4096) { dict.set(kulcs, kov++); if (kov > (1 << kodMeret) && kodMeret < 12) kodMeret++; }
    else { ir(clear); dict = new Map(); kodMeret = minKod + 1; kov = eoi + 1; }
    pre = c;
  }
  ir(pre); ir(eoi);
  if (nb > 0) out.push(acc & 255);
  const blokk = [];
  for (let i = 0; i < out.length; i += 255) { const d = out.slice(i, i + 255); blokk.push(d.length, ...d); }
  blokk.push(0);
  return blokk;
}

function kocka(buf, ertekek) {
  ertekek.forEach((v, b) => {
    const s = String(Math.min(99, v)).padStart(2, '0');
    for (let j = 0; j < 2; j++) {
      const n = s.charCodeAt(j) - 48, x0 = DOBOZ_X[b] + SZAM_DX + j * DW, m = n * DW * DH;
      for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) buf[(SZAM_Y + y) * W + x0 + x] = 32 + SZAMOK[m + y * DW + x];
    }
  });
}

function gif(maradek) {
  const b = [];
  const u16 = (v) => b.push(v & 255, (v >> 8) & 255);
  b.push(...Buffer.from('GIF89a')); u16(W); u16(H); b.push(0xF5, 0, 0); // globális színtábla, 64 szín
  for (let i = 0; i < 64; i++) { const c = A.pal[i] || [0, 0, 0]; b.push(c[0], c[1], c[2]); }
  let elozo = null;
  for (let f = 0; f < 60; f++) {
    const r = Math.max(0, maradek - f);
    const buf = Buffer.from(HATTER);
    kocka(buf, [Math.floor(r / 86400), Math.floor(r / 3600) % 24, Math.floor(r / 60) % 60, r % 60]);
    let x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1;
    if (elozo) { // csak a megváltozott téglalap
      x0 = W; y0 = H; x1 = -1; y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (buf[y * W + x] !== elozo[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 0; }
    }
    b.push(0x21, 0xF9, 4, 0x04); u16(f === 59 ? 0 : 100); b.push(0, 0); // 1 mp késleltetés, nincs törlés
    b.push(0x2C); u16(x0); u16(y0); u16(x1 - x0 + 1); u16(y1 - y0 + 1); b.push(0);
    const px = new Array((x1 - x0 + 1) * (y1 - y0 + 1)); let k = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px[k++] = buf[y * W + x];
    b.push(6, ...lzw(px, 6));
    elozo = buf;
    if (r === 0) break; // a határidő után elég egy kocka
  }
  b.push(0x3B);
  return Buffer.from(b);
}

module.exports = function handler(req, res) {
  const maradek = Math.max(0, Math.floor((HATARIDO - Date.now()) / 1000));
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).send(gif(maradek));
};
