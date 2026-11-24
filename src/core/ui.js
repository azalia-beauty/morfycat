// Маленькие помощники для построения интерфейса без фреймворка.
// Всё, что передаётся как строка, вставляется как ТЕКСТ (не HTML) — так безопасно показывать чужие данные.

/** h('div', {class:'x', onclick:fn}, 'текст', h('b', {}, 'жирный')) */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);

const EYE_SVG = '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M50 5 89 27.500V72.500L50 95 11 72.500V27.500Z"/>'
  + '<path d="M20 50Q50 26 80 50Q50 74 20 50Z"/>'
  + '<circle cx="50" cy="50" r="9"/><circle cx="50" cy="50" r="3.500" fill="currentColor" stroke="none"/>'
  + '<path d="M50 35.500V39.500M50 60.500V64.500M35.500 50H39.500M60.500 50H64.500" stroke-width="2.500"/></svg>';

/** Логотип-«глаз» (статичная строка, безопасно). */
export function eyeIcon(cls = '') {
  const el = document.createElement('span');
  el.className = cls;
  el.innerHTML = EYE_SVG;
  return el;
}

/** Блок с рамкой и заголовком в стиле HUD. */
export function panel(title, ...body) {
  return h('section', { class: 'panel' },
    title ? h('header', { class: 'panel__title' }, title) : null,
    h('div', { class: 'panel__body' }, body));
}

export function button(label, onClick, cls = '') {
  return h('button', { class: ('btn ' + cls).trim(), type: 'button', onclick: onClick }, label);
}

export function field(label, control) {
  return h('label', { class: 'field' }, h('span', { class: 'field__l' }, label), control);
}

/** Таблица «ключ — значение». Возвращает элемент с методом .add(k, v). */
export function kv(rows = []) {
  const el = h('div', { class: 'kv' });
  el.add = (k, v) => el.append(h('div', { class: 'k' }, k), h('div', { class: 'v' }, v ?? '—'));
  rows.forEach(([k, v]) => el.add(k, v));
  return el;
}

export function toast(msg, kind = 'info') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = h('div', { id: 'toasts', class: 'toasts' });
    document.body.append(box);
  }
  const t = h('div', { class: 'toast toast--' + kind }, msg);
  box.append(t);
  setTimeout(() => t.classList.add('toast--out'), 3200);
  setTimeout(() => t.remove(), 3700);
}

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Скопировано');
  } catch {
    toast('Не удалось скопировать', 'bad');
  }
}

export function fmtBytes(n) {
  if (!Number.isFinite(n)) return '—';
  const u = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return n.toFixed(i ? 1 : 0) + ' ' + u[i];
}

export function fmtUptime(sec) {
  const d = Math.floor(sec / 86400), hh = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return (d ? d + 'д ' : '') + hh + 'ч ' + m + 'м';
}

/** Рисует линию-«спарклайн» на canvas. data — массив чисел 0..max. */
export function drawSpark(canvas, data, { max = 100, color = '#2ee6ff' } = {}) {
  const c = canvas.getContext('2d');
  const w = canvas.width, hgt = canvas.height;
  c.clearRect(0, 0, w, hgt);
  c.strokeStyle = 'rgba(255,255,255,.06)';
  c.lineWidth = 1;
  for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(0, (hgt / 4) * i); c.lineTo(w, (hgt / 4) * i); c.stroke(); }
  if (data.length < 2) return;
  const step = w / (data.length - 1);
  c.beginPath();
  data.forEach((v, i) => {
    const x = i * step, y = hgt - (Math.min(v, max) / max) * (hgt - 4) - 2;
    i ? c.lineTo(x, y) : c.moveTo(x, y);
  });
  c.strokeStyle = color; c.lineWidth = 2; c.stroke();
  c.lineTo(w, hgt); c.lineTo(0, hgt); c.closePath();
  c.fillStyle = color + '22'; c.fill();
}
