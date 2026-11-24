// Сетевые инструменты: свой IP, информация об IP, DNS (через DoH), WHOIS (через RDAP).
// Работают на всех платформах — запросы идут через ctx.bridge.http (без проблем с CORS).

import { h, panel, button, field, kv, copy } from '../core/ui.js';
import { httpJson } from '../core/bridge.js';

const DNS_TYPES = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 33: 'SRV', 257: 'CAA' };

function busy(btn, on) { btn.disabled = on; btn.dataset.l = btn.dataset.l || btn.textContent; btn.textContent = on ? '…' : btn.dataset.l; }

async function withBusy(btn, box, fn) {
  busy(btn, true);
  box.replaceChildren(h('span', { class: 'dim' }, 'Запрос…'));
  try { box.replaceChildren(await fn()); }
  catch (e) { box.replaceChildren(h('span', { class: 'err' }, 'Ошибка: ' + ((e && e.message) || e))); }
  finally { busy(btn, false); }
}

function renderIp(j) {
  if (j.success === false) throw new Error(j.message || 'не удалось определить');
  const el = kv([
    ['IP', j.ip], ['Тип', j.type],
    ['Страна', [j.flag && j.flag.emoji, j.country].filter(Boolean).join(' ')],
    ['Регион / город', [j.region, j.city].filter(Boolean).join(', ')],
    ['Координаты', j.latitude != null ? j.latitude + ', ' + j.longitude : '—'],
    ['Провайдер', j.connection ? j.connection.isp : '—'],
    ['Организация', j.connection ? j.connection.org : '—'],
    ['ASN', j.connection ? 'AS' + j.connection.asn : '—'],
    ['Часовой пояс', j.timezone ? j.timezone.id : '—'],
  ]);
  return el;
}

function renderDns(j, name) {
  if (!j.Answer || !j.Answer.length) return h('span', { class: 'dim' }, 'Записей нет (код ответа ' + j.Status + ')');
  return h('table', { class: 'table' },
    h('thead', {}, h('tr', {}, ['Имя', 'Тип', 'TTL', 'Значение'].map((t) => h('th', {}, t)))),
    h('tbody', {}, j.Answer.map((a) => h('tr', {},
      h('td', {}, a.name || name), h('td', {}, DNS_TYPES[a.type] || a.type), h('td', {}, String(a.TTL)), h('td', {}, a.data)))));
}

function renderRdap(j) {
  const ev = (name) => { const e = (j.events || []).find((x) => x.eventAction === name); return e ? new Date(e.eventDate).toLocaleString('ru-RU') : '—'; };
  const reg = (j.entities || []).find((e) => (e.roles || []).includes('registrar'));
  let regName = '—';
  if (reg && reg.vcardArray) { const fn = reg.vcardArray[1].find((r) => r[0] === 'fn'); if (fn) regName = fn[3]; }
  return kv([
    ['Домен', j.ldhName],
    ['Статус', (j.status || []).join(', ')],
    ['Зарегистрирован', ev('registration')],
    ['Истекает', ev('expiration')],
    ['Обновлён', ev('last changed')],
    ['Регистратор', regName],
    ['NS', (j.nameservers || []).map((n) => n.ldhName).join(', ')],
  ]);
}

export default {
  id: 'netinfo',
  title: 'Сеть и DNS',
  icon: '◎',
  order: 40,
  desc: 'IP, DNS, WHOIS',

  mount(root) {
    // — Мой IP / любой IP
    const ipIn = h('input', { placeholder: 'пусто = мой IP; или 8.8.8.8', spellcheck: 'false' });
    const ipOut = h('div', { class: 'mt' });
    const ipBtn = button('Узнать', () => withBusy(ipBtn, ipOut, async () => renderIp(await httpJson('https://ipwho.is/' + encodeURIComponent(ipIn.value.trim())))), 'primary');
    ipIn.addEventListener('keydown', (e) => e.key === 'Enter' && ipBtn.click());

    // — DNS
    const dnsIn = h('input', { placeholder: 'example.com', spellcheck: 'false' });
    const dnsType = h('select', {}, ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'CAA'].map((t) => h('option', { value: t }, t)));
    const dnsOut = h('div', { class: 'mt', style: { overflowX: 'auto' } });
    const dnsBtn = button('Запросить', () => {
      const name = dnsIn.value.trim();
      if (!name) return;
      withBusy(dnsBtn, dnsOut, async () => renderDns(await httpJson(
        'https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(name) + '&type=' + dnsType.value,
        { headers: { accept: 'application/dns-json' } }), name));
    }, 'primary');
    dnsIn.addEventListener('keydown', (e) => e.key === 'Enter' && dnsBtn.click());

    // — WHOIS / RDAP
    const whIn = h('input', { placeholder: 'example.com', spellcheck: 'false' });
    const whOut = h('div', { class: 'mt' });
    const whBtn = button('Найти', () => {
      const d = whIn.value.trim().toLowerCase();
      if (!d) return;
      withBusy(whBtn, whOut, async () => renderRdap(await httpJson('https://rdap.org/domain/' + encodeURIComponent(d), { headers: { accept: 'application/rdap+json' } })));
    }, 'primary');
    whIn.addEventListener('keydown', (e) => e.key === 'Enter' && whBtn.click());

    root.append(
      panel('IP-адрес', h('div', { class: 'row' }, h('div', { class: 'grow' }, field('IP', ipIn)), ipBtn), ipOut),
      panel('DNS (через DNS-over-HTTPS)', h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Домен', dnsIn)), field('Тип', dnsType), dnsBtn), dnsOut),
      panel('WHOIS (RDAP)', h('div', { class: 'row' }, h('div', { class: 'grow' }, field('Домен', whIn)), whBtn), whOut),
    );
    ipBtn.click(); // сразу показываем «мой IP»
  },
};
