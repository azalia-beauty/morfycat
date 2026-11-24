// Профиль: имя, аватар и акцентный цвет. Хранится на устройстве, применяется на лету.
import { lsGet, lsSet } from './store.js';

const DEFAULT = { name: 'Оператор', avatar: '', accent: '#2ee6ff' };
let state = { ...DEFAULT, ...lsGet('profile', {}) };
const subs = new Set();

export const getProfile = () => ({ ...state });
export const onProfile = (fn) => { subs.add(fn); return () => subs.delete(fn); };

export function setProfile(patch) {
  state = { ...state, ...patch };
  if (!lsSet('profile', state)) throw new Error('Не удалось сохранить профиль (память переполнена)');
  applyAccent();
  subs.forEach((f) => { try { f(state); } catch { /* ignore */ } });
}

export function applyAccent() {
  const m = /^#([0-9a-f]{6})$/i.exec(state.accent || '');
  if (!m || typeof document === 'undefined') return;
  const n = parseInt(m[1], 16);
  const root = document.documentElement.style;
  root.setProperty('--acc', state.accent);
  root.setProperty('--acc-rgb', [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(','));
}

/* ───────── обработка картинок → квадрат 256×256 ───────── */
const SIZE = 256;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось открыть картинку (поддерживаются PNG, JPG, WebP, GIF, SVG)'));
    img.src = src;
  });
}

function toDataUrl(canvas) {
  const webp = canvas.toDataURL('image/webp', 0.9);
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
}

function cropSquare(img) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  const w = img.naturalWidth || img.width || SIZE, h = img.naturalHeight || img.height || SIZE;
  const s = Math.min(w, h);
  ctx.fillStyle = '#06080b';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, SIZE, SIZE);
  return toDataUrl(c);
}

export async function fileToAvatar(file) {
  if (!file || !/^image\//.test(file.type || '')) throw new Error('Нужен файл-картинка');
  const url = URL.createObjectURL(file);
  try { return cropSquare(await loadImage(url)); } finally { URL.revokeObjectURL(url); }
}

/** Убирает из SVG всё исполняемое и внешнее. Рисуется через <img>, где скрипты и так не работают — это второй рубеж. */
export function sanitizeSvg(text) {
  const m = /<svg[\s\S]*?<\/svg>/i.exec(String(text || ''));
  if (!m) throw new Error('В ответе нет SVG-кода (<svg …>…</svg>)');
  let s = m[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/(xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '');
  if (!/xmlns=/.test(s)) s = s.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!/viewBox=/i.test(s) && !/\swidth=/i.test(s)) s = s.replace(/<svg/i, '<svg viewBox="0 0 256 256"');
  return s;
}

export async function svgToAvatar(text) {
  const svg = sanitizeSvg(text);
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = await loadImage(url);
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#06080b';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  return toDataUrl(c);
}

/* ───────── генератор «аватар из ничего» — работает офлайн ───────── */
function rng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (let i = 0; i < String(seed).length; i++) { h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function generatedAvatar(seed, accent = '#2ee6ff') {
  const r = rng(seed || Math.random());
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const x = c.getContext('2d');
  x.fillStyle = '#06080b'; x.fillRect(0, 0, SIZE, SIZE);
  x.strokeStyle = 'rgba(255,255,255,.05)';
  for (let i = 0; i <= SIZE; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, SIZE); x.moveTo(0, i); x.lineTo(SIZE, i); x.stroke(); }

  // симметричный «ID-узор» 5×5
  const N = 5, cell = 30, off = (SIZE - N * cell) / 2;
  const cells = [];
  for (let row = 0; row < N; row++) for (let col = 0; col < 3; col++) if (r() > 0.45) { cells.push([col, row]); if (col < 2) cells.push([N - 1 - col, row]); }
  const paint = (dx, color, alpha) => {
    x.fillStyle = color; x.globalAlpha = alpha;
    cells.forEach(([col, row]) => x.fillRect(off + col * cell + dx, off + row * cell, cell - 4, cell - 4));
    x.globalAlpha = 1;
  };
  paint(-5, '#ff3b5c', 0.7);
  paint(5, accent, 0.75);
  paint(0, '#ffffff', 0.95);

  // шестиугольная рамка
  x.strokeStyle = accent; x.lineWidth = 6; x.beginPath();
  for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; const px = SIZE / 2 + 118 * Math.cos(a), py = SIZE / 2 + 118 * Math.sin(a); k ? x.lineTo(px, py) : x.moveTo(px, py); }
  x.closePath(); x.stroke();

  // глитч-полосы
  for (let i = 0; i < 4; i++) {
    const y = Math.floor(r() * 220) + 10, hh = 6 + Math.floor(r() * 14), dx = (r() > 0.5 ? 1 : -1) * (10 + Math.floor(r() * 22));
    x.drawImage(c, 0, y, SIZE, hh, dx, y, SIZE, hh);
  }
  x.fillStyle = 'rgba(0,0,0,.18)';
  for (let y = 0; y < SIZE; y += 3) x.fillRect(0, y, SIZE, 1);
  return toDataUrl(c);
}
