// Сканер локальной сети: найти устройства (ARP) и проверить открытые порты на СВОИХ устройствах.
// Порт-сканер намеренно работает только с локальными адресами (192.168.x.x, 10.x.x.x, 172.16–31.x.x, 127.x.x.x) —
// это жёсткое ограничение в electron/modules/netscan.cjs, а не только здесь.

import { h, panel, button, field, toast } from '../core/ui.js';
import { invoke, on } from '../core/bridge.js';

const SERVICES = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 80: 'HTTP', 110: 'POP3', 135: 'RPC', 139: 'NetBIOS',
  143: 'IMAP', 443: 'HTTPS', 445: 'SMB', 554: 'RTSP', 631: 'IPP', 1883: 'MQTT', 3306: 'MySQL', 3389: 'RDP',
  5000: 'UPnP/Flask', 5353: 'mDNS', 5432: 'PostgreSQL', 5555: 'ADB', 5900: 'VNC', 8000: 'HTTP-alt',
  8080: 'HTTP-proxy', 8443: 'HTTPS-alt', 9100: 'Printer', 62078: 'iPhone-sync',
};

const PRESETS = {
  'Популярные': '21,22,23,25,53,80,110,135,139,143,443,445,554,631,1883,3306,3389,5000,5432,5555,5900,8000,8080,8443,9100',
  '1–1024': '1-1024',
  '1–10000': '1-10000',
};

export default {
  id: 'portscan',
  title: 'LAN-сканер',
  icon: '⌖',
  order: 50,
  desc: 'Устройства и порты в вашей сети',
  platforms: ['win'],

  mount(root) {
    const hostIn = h('input', { placeholder: '192.168.0.10', spellcheck: 'false' });
    const portsIn = h('input', { value: PRESETS['Популярные'], spellcheck: 'false' });
    const devBody = h('tbody');
    const devNote = h('div', { class: 'small dim' }, 'Нажмите «Найти устройства», чтобы увидеть, кто есть в сети.');
    const resBody = h('tbody');
    const bar = h('div', { class: 'bar' }, h('i'));
    const status = h('div', { class: 'small dim mt' }, '');

    const offProg = on('net:progress', ({ done, total, open }) => {
      bar.firstChild.style.width = Math.round((done / total) * 100) + '%';
      status.textContent = 'Проверено ' + done + ' из ' + total + ', открытых: ' + open;
    });

    const findBtn = button('Найти устройства', async () => {
      findBtn.disabled = true; devNote.textContent = 'Опрашиваю сеть…';
      try {
        const r = await invoke('net:lan');
        devNote.textContent = r.subnet ? 'Подсеть ' + r.subnet + ' · найдено: ' + r.devices.length : 'Найдено: ' + r.devices.length;
        devBody.replaceChildren(...r.devices.map((d) => h('tr', { class: 'click', onclick: () => { hostIn.value = d.ip; scrollTo(0, 0); } },
          h('td', {}, d.ip), h('td', {}, d.mac), h('td', {}, d.name || '—'))));
      } catch (e) { devNote.textContent = 'Ошибка: ' + (e.message || e); }
      findBtn.disabled = false;
    }, 'primary');

    const scanBtn = button('Сканировать порты', async () => {
      const host = hostIn.value.trim();
      if (!host) { toast('Укажите адрес устройства', 'bad'); return; }
      scanBtn.disabled = true; resBody.replaceChildren(); bar.firstChild.style.width = '0';
      status.textContent = 'Старт…';
      try {
        const r = await invoke('net:portscan', { host, ports: portsIn.value });
        status.textContent = 'Готово за ' + (r.ms / 1000).toFixed(1) + ' с · проверено ' + r.total + ' · открыто ' + r.open.length;
        resBody.replaceChildren(...(r.open.length ? r.open.map((p) => h('tr', {},
          h('td', { class: 'ok' }, String(p)), h('td', {}, SERVICES[p] || '—')))
          : [h('tr', {}, h('td', { colspan: 2, class: 'dim' }, 'Открытых портов не найдено'))]));
      } catch (e) { status.textContent = 'Ошибка: ' + (e.message || e); status.className = 'small err mt'; }
      scanBtn.disabled = false;
    }, 'primary');

    const chips = h('div', { class: 'chips' }, Object.entries(PRESETS).map(([name, v]) =>
      h('button', { class: 'chip', type: 'button', onclick: () => { portsIn.value = v; } }, name)));

    root.append(
      panel('Устройства в сети',
        h('div', { class: 'row' }, findBtn), h('div', { class: 'mt' }, devNote),
        h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'table' },
          h('thead', {}, h('tr', {}, ['IP', 'MAC', 'Имя'].map((t) => h('th', {}, t)))), devBody))),
      panel('Порты',
        h('div', { class: 'small dim' }, 'Только локальные адреса: ваши устройства и ваша сеть.'),
        h('div', { class: 'row mt' }, h('div', { class: 'grow' }, field('Адрес', hostIn)), h('div', { class: 'grow' }, field('Порты (22,80,8000-8100)', portsIn)), scanBtn),
        h('div', { class: 'mt' }, chips), h('div', { class: 'mt' }, bar), status,
        h('table', { class: 'table mt' }, h('thead', {}, h('tr', {}, ['Порт', 'Служба'].map((t) => h('th', {}, t)))), resBody)));

    return () => offProg();
  },
};
