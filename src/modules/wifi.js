import { h, panel, button } from '../core/ui.js';
import { invoke } from '../core/bridge.js';

function level(sig) { return sig >= 70 ? 'ok' : sig >= 40 ? 'warn' : 'err'; }
function isOpen(n) { return /open|откры/i.test(n.auth) || (/none|нет/i.test(n.enc) && !n.auth); }

export default {
  id: 'wifi',
  title: 'Wi-Fi',
  icon: '≋',
  order: 45,
  desc: 'Сети вокруг: сигнал, канал, защита',
  platforms: ['win'],

  mount(root) {
    const body = h('tbody');
    const note = h('div', { class: 'small dim' }, 'Показывает Wi-Fi сети, которые видит ваш адаптер.');
    const btn = button('Сканировать', async () => {
      btn.disabled = true; note.textContent = 'Сканирую…';
      try {
        const nets = await invoke('net:wifi');
        note.textContent = nets.length ? 'Найдено сетей: ' + nets.length : 'Сетей не найдено (включён ли Wi-Fi адаптер и службы геолокации?)';
        body.replaceChildren(...nets.map((n) => h('tr', {},
          h('td', {}, n.ssid),
          h('td', { class: level(n.signal) }, n.signal + '%'),
          h('td', {}, n.channel || '—'),
          h('td', { class: isOpen(n) ? 'err' : '' }, isOpen(n) ? 'ОТКРЫТАЯ' : (n.auth || '—')),
          h('td', {}, String(n.bssids.length)))));
      } catch (e) { note.textContent = 'Ошибка: ' + (e.message || e); }
      btn.disabled = false;
    }, 'primary');

    root.append(panel('Сети вокруг',
      h('div', { class: 'row' }, btn), h('div', { class: 'mt' }, note),
      h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'table mt' },
        h('thead', {}, h('tr', {}, ['SSID', 'Сигнал', 'Канал', 'Защита', 'Точек'].map((t) => h('th', {}, t)))), body))));
    btn.click();
  },
};
