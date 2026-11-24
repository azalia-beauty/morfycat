import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const RES = 'android/app/src/main/res';
if (!fs.existsSync(RES)) process.exit(0);

const T = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => {
  const l = Buffer.alloc(4); l.writeUInt32BE(d.length);
  const b = Buffer.concat([Buffer.from(t), d]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(b));
  return Buffer.concat([l, b, c]);
};
function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0;
    for (let x = 0; x < size; x++) { const [r, g, b, a] = draw(x, y); raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a; }
  }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(size, 0); ih.writeUInt32BE(size, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function glyph(size, pad) {
  const c = size / 2, R = (size / 2 - pad);
  return (x, y) => {
    const nx = (x - c) / R, ny = (y - c) / R;
    const d = Math.hypot(nx, ny);
    const hex = Math.max(Math.abs(nx) * 0.866 + Math.abs(ny) * 0.5, Math.abs(ny));
    const ring = Math.abs(hex - 0.74) < 0.055 && d < 1.02;
    const eye = d < 0.17;
    const halo = Math.abs(hex - 0.74) < 0.13 && d < 1.05;
    if (ring || eye) return [20, 255, 154, 255];
    if (halo) return [12, 120, 80, 120];
    if (hex < 0.68) return [6, 34, 24, 210];
    return [0, 0, 0, 0];
  };
}
function tile(size) {
  const g = glyph(size, size * 0.10);
  const c = size / 2, r = size / 2;
  return (x, y) => {
    const d = Math.hypot(x - c, y - c) / r;
    const bg = d > 1 ? [0, 0, 0, 0] : d > 0.94 ? [3, 20, 14, 255] : [4, 18, 11, 255];
    const fg = g(x, y);
    if (fg[3] > 200) return fg;
    if (fg[3] > 0) return [bg[0] + fg[0], bg[1] + fg[1], bg[2] + fg[2], 255];
    return bg;
  };
}
const DENS = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, s] of Object.entries(DENS)) {
  const dir = path.join(RES, 'mipmap-' + d);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), png(s, tile(s)));
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), png(s, tile(s)));
  const fs2 = Math.round(s * 2.25);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), png(fs2, glyph(fs2, fs2 * 0.22)));
}
const any = path.join(RES, 'mipmap-anydpi-v26');
fs.mkdirSync(any, { recursive: true });
const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
fs.writeFileSync(path.join(any, 'ic_launcher.xml'), xml);
fs.writeFileSync(path.join(any, 'ic_launcher_round.xml'), xml);
const val = path.join(RES, 'values');
fs.mkdirSync(val, { recursive: true });
const col = path.join(val, 'colors.xml');
const entry = '<color name="ic_launcher_background">#04120B</color>';
if (!fs.existsSync(col)) fs.writeFileSync(col, `<resources>\n    ${entry}\n</resources>\n`);
else {
  const cur = fs.readFileSync(col, 'utf8');
  if (!cur.includes('ic_launcher_background')) fs.writeFileSync(col, cur.replace('</resources>', `    ${entry}\n</resources>`));
}
console.log('иконки записаны');
