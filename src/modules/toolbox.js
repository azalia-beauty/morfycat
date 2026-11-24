// Набор оффлайн-инструментов: кодирование, хэши, JWT, генераторы. Работает везде, интернет не нужен.
// Чтобы добавить свой инструмент — допишите объект в массив TOOLS (id, name, run).
// run(текст) может вернуть строку или Promise со строкой.

import { h, panel, button, field, copy, toast } from '../core/ui.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const digest = (alg) => async (s) => toHex(await crypto.subtle.digest(alg, enc.encode(s)));

const b64e = (s) => { let bin = ''; enc.encode(s).forEach((b) => { bin += String.fromCharCode(b); }); return btoa(bin); };
const b64d = (s) => {
  const bin = atob(s.trim().replace(/-/g, '+').replace(/_/g, '/'));
  return dec.decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

const TOOLS = [
  { id: 'b64e', name: 'Base64 ▶', run: b64e },
  { id: 'b64d', name: '◀ Base64', run: b64d },
  { id: 'hexe', name: 'Текст ▶ HEX', run: (s) => [...enc.encode(s)].map((b) => b.toString(16).padStart(2, '0')).join(' ') },
  { id: 'hexd', name: 'HEX ▶ текст', run: (s) => dec.decode(Uint8Array.from((s.replace(/[^0-9a-f]/gi, '').match(/../g) || []), (x) => parseInt(x, 16))) },
  { id: 'bin', name: 'Текст ▶ BIN', run: (s) => [...enc.encode(s)].map((b) => b.toString(2).padStart(8, '0')).join(' ') },
  { id: 'urle', name: 'URL encode', run: (s) => encodeURIComponent(s) },
  { id: 'urld', name: 'URL decode', run: (s) => decodeURIComponent(s) },
  { id: 'sha1', name: 'SHA-1', run: digest('SHA-1') },
  { id: 'sha256', name: 'SHA-256', run: digest('SHA-256') },
  { id: 'sha512', name: 'SHA-512', run: digest('SHA-512') },
  { id: 'rot13', name: 'ROT13', run: (s) => s.replace(/[a-z]/gi, (c) => String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)) },
  {
    id: 'jwt', name: 'JWT ▶ JSON',
    run: (s) => {
      const [hd, pl] = s.trim().split('.');
      return JSON.stringify({ header: JSON.parse(b64d(hd)), payload: JSON.parse(b64d(pl)) }, null, 2);
    },
  },
];

function randomPassword(len, sets) {
  const pools = {
    lower: 'abcdefghijkmnopqrstuvwxyz', upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ', digits: '23456789', symbols: '!@#$%^&*-_=+?',
  };
  const chars = Object.keys(sets).filter((k) => sets[k]).map((k) => pools[k]).join('') || pools.lower;
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return [...buf].map((n) => chars[n % chars.length]).join('');
}

export default {
  id: 'toolbox',
  title: 'Тулбокс',
  icon: '⚒',
  order: 60,
  desc: 'Кодеки, хэши, JWT, пароли',

  mount(root) {
    const input = h('textarea', { placeholder: 'Вставьте текст…', spellcheck: 'false' });
    const output = h('pre', { class: 'out' }, '');
    const chips = h('div', { class: 'chips' }, TOOLS.map((t) =>
      h('button', {
        class: 'chip', type: 'button',
        onclick: async () => {
          try { output.textContent = await t.run(input.value); output.className = 'out'; }
          catch (e) { output.textContent = 'Ошибка: ' + ((e && e.message) || e); output.className = 'out err'; }
        },
      }, t.name)));

    // — генератор паролей
    const len = h('input', { type: 'number', min: 6, max: 128, value: 20, style: { width: '90px' } });
    const sets = { lower: true, upper: true, digits: true, symbols: true };
    const checks = Object.keys(sets).map((k) => h('label', { class: 'chip is-on', style: { cursor: 'pointer' } },
      h('input', { type: 'checkbox', checked: true, style: { width: 'auto', marginRight: '6px' }, onchange: (e) => { sets[k] = e.target.checked; } }),
      { lower: 'a–z', upper: 'A–Z', digits: '0–9', symbols: '#$%' }[k]));
    const pass = h('pre', { class: 'out' }, '');
    const gen = () => { pass.textContent = randomPassword(Math.min(128, Math.max(6, +len.value || 20)), sets); };

    root.append(
      panel('Преобразования', field('Вход', input), h('div', { class: 'mt' }, chips),
        h('div', { class: 'mt' }, output), h('div', { class: 'row mt' }, button('Копировать результат', () => copy(output.textContent)))),
      panel('Генераторы',
        h('div', { class: 'row' }, field('Длина', len), h('div', { class: 'chips' }, checks), button('Пароль', gen, 'primary'),
          button('UUID', () => { pass.textContent = crypto.randomUUID(); }), button('32 байта HEX', () => { pass.textContent = toHex(crypto.getRandomValues(new Uint8Array(32))); })),
        h('div', { class: 'mt' }, pass), h('div', { class: 'row mt' }, button('Копировать', () => { copy(pass.textContent); toast('Скопировано'); }, 'ghost'))));
    gen();
  },
};
