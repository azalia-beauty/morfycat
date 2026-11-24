import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
const RES = 'android/app/src/main/res';
if (!fs.existsSync(RES)) process.exit(0);
const T = new Uint32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c >>> 0; }
const crc = (b) => { let c = 0xffffffff; for (const x of b) c = T[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const b = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(b)); return Buffer.concat([l, b, c]); };
function png(size, draw) {
  const raw = Buffer.alloc((size * 4 + 1) * size); let p = 0;
  for (let y = 0; y < size; y++) { raw[p++] = 0; for (let x = 0; x < size; x++) { const [r, g, b, a] = draw(x, y); raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = a; } }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(size, 0); ih.writeUInt32BE(size, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const V = {
  launcher: { ring: [20, 255, 154], halo: [12, 120, 80], bg: [4, 18, 11], edge: [3, 20, 14], core: [6, 34, 24], hex: '#04120B' },
  blood: { ring: [255, 64, 84], halo: [140, 16, 32], bg: [20, 4, 8], edge: [26, 5, 10], core: [38, 8, 14], hex: '#14040A' },
  ice: { ring: [96, 214, 255], halo: [24, 96, 140], bg: [4, 14, 22], edge: [5, 18, 28], core: [8, 28, 42], hex: '#040E16' },
  amethyst: { ring: [186, 120, 255], halo: [88, 36, 150], bg: [14, 6, 24], edge: [18, 8, 30], core: [26, 12, 44], hex: '#0E0618' },
  sunset: { ring: [255, 150, 64], halo: [150, 64, 20], bg: [22, 10, 4], edge: [28, 13, 5], core: [42, 20, 8], hex: '#160A04' },
  mono: { ring: [235, 235, 235], halo: [120, 120, 120], bg: [12, 12, 12], edge: [18, 18, 18], core: [26, 26, 26], hex: '#0C0C0C' },
  ghost: { ring: [140, 150, 160], halo: [70, 78, 88], bg: [10, 12, 14], edge: [14, 17, 20], core: [20, 24, 28], hex: '#0A0C0E' }
};
function glyph(size, pad, v) {
  const c = size / 2, R = size / 2 - pad;
  return (x, y) => {
    const nx = (x - c) / R, ny = (y - c) / R, d = Math.hypot(nx, ny);
    const hx = Math.max(Math.abs(nx) * 0.866 + Math.abs(ny) * 0.5, Math.abs(ny));
    if ((Math.abs(hx - 0.74) < 0.055 && d < 1.02) || d < 0.17) return [...v.ring, 255];
    if (Math.abs(hx - 0.74) < 0.13 && d < 1.05) return [...v.halo, 120];
    if (hx < 0.68) return [...v.core, 210];
    return [0, 0, 0, 0];
  };
}
function tile(size, v) {
  const g = glyph(size, size * 0.1, v), c = size / 2, r = size / 2;
  return (x, y) => {
    const d = Math.hypot(x - c, y - c) / r;
    const bg = d > 1 ? [0, 0, 0, 0] : d > 0.94 ? [...v.edge, 255] : [...v.bg, 255];
    const f = g(x, y);
    if (f[3] > 200) return f;
    if (f[3] > 0) return [bg[0] + f[0], bg[1] + f[1], bg[2] + f[2], 255];
    return bg;
  };
}
const DENS = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [name, v] of Object.entries(V)) {
  for (const [d, s] of Object.entries(DENS)) {
    const dir = path.join(RES, 'mipmap-' + d); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'ic_' + name + '.png'), png(s, tile(s, v)));
    fs.writeFileSync(path.join(dir, 'ic_' + name + '_round.png'), png(s, tile(s, v)));
    const f2 = Math.round(s * 2.25);
    fs.writeFileSync(path.join(dir, 'ic_' + name + '_foreground.png'), png(f2, glyph(f2, f2 * 0.22, v)));
  }
  const any = path.join(RES, 'mipmap-anydpi-v26'); fs.mkdirSync(any, { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_${name}_bg"/>\n    <foreground android:drawable="@mipmap/ic_${name}_foreground"/>\n</adaptive-icon>\n`;
  fs.writeFileSync(path.join(any, 'ic_' + name + '.xml'), xml);
  fs.writeFileSync(path.join(any, 'ic_' + name + '_round.xml'), xml);
}
const val = path.join(RES, 'values'); fs.mkdirSync(val, { recursive: true });
const col = path.join(val, 'colors.xml');
const entries = Object.entries(V).map(([n, v]) => `    <color name="ic_${n}_bg">${v.hex}</color>`);
if (!fs.existsSync(col)) fs.writeFileSync(col, `<resources>\n${entries.join('\n')}\n</resources>\n`);
else {
  const cur = fs.readFileSync(col, 'utf8');
  const add = entries.filter(e => !cur.includes(e.trim()));
  if (add.length) fs.writeFileSync(col, cur.replace('</resources>', add.join('\n') + '\n</resources>'));
}
console.log('иконки записаны: ' + Object.keys(V).length + ' вариантов');
