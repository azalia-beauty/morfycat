// Сетевые функции Windows-версии: поиск устройств в LAN, сканер портов, список Wi-Fi.
// ВАЖНО: сканер портов принимает ТОЛЬКО локальные адреса (ваша сеть / ваши устройства).
const dgram = require('dgram');
const dns = require('dns').promises;
const net = require('net');
const os = require('os');
const { run } = require('../lib/run.cjs');

/* ───────── ограничение на локальные адреса ───────── */
function isPrivateIPv4(ip) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
}

function parsePorts(spec) {
  const set = new Set();
  for (const part of String(spec || '').split(',')) {
    const t = part.trim();
    if (!t) continue;
    const r = /^(\d+)(?:-(\d+))?$/.exec(t);
    if (!r) throw new Error('Не понял порты: ' + t);
    const from = +r[1], to = r[2] ? +r[2] : from;
    if (from < 1 || to > 65535 || from > to) throw new Error('Порты должны быть в диапазоне 1–65535: ' + t);
    for (let p = from; p <= to; p++) set.add(p);
    if (set.size > 10000) throw new Error('Слишком много портов (максимум 10000 за раз)');
  }
  if (!set.size) throw new Error('Не указаны порты');
  return [...set];
}

function probe(host, port, timeout) {
  return new Promise((resolve) => {
    const s = new net.Socket();
    let done = false;
    const end = (ok) => { if (!done) { done = true; s.destroy(); resolve(ok); } };
    s.setTimeout(timeout);
    s.once('connect', () => end(true));
    s.once('timeout', () => end(false));
    s.once('error', () => end(false));
    s.connect(port, host);
  });
}

/* ───────── устройства в сети ───────── */
function localSubnet() {
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal && isPrivateIPv4(a.address) && !a.address.startsWith('169.254.')) {
        return { ip: a.address, base: a.address.split('.').slice(0, 3).join('.') };
      }
    }
  }
  return null;
}

/** «Будим» соседей UDP-пакетами, чтобы они попали в ARP-таблицу. */
function wake(base) {
  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4');
    sock.on('error', () => {});
    let sent = 0;
    for (let i = 1; i < 255; i++) {
      sock.send(Buffer.from([0]), 9, base + '.' + i, () => { if (++sent >= 254) setTimeout(() => { try { sock.close(); } catch { /* */ } resolve(); }, 1200); });
    }
  });
}

function parseArp(text) {
  const devices = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f]{2}(?:-[0-9a-f]{2}){5})\s+(\S+)/i.exec(line);
    if (!m) continue;
    const [, ip, macRaw] = m;
    const mac = macRaw.toLowerCase();
    if (mac === 'ff-ff-ff-ff-ff-ff' || mac.startsWith('01-00-5e') || mac.startsWith('33-33')) continue;
    if (!isPrivateIPv4(ip) || ip.endsWith('.255')) continue;
    devices.push({ ip, mac: mac.replace(/-/g, ':') });
  }
  return devices;
}

async function reverseName(ip) {
  try {
    const names = await Promise.race([dns.reverse(ip), new Promise((_, rej) => setTimeout(() => rej(new Error('t')), 800))]);
    return names && names[0] ? names[0] : '';
  } catch { return ''; }
}

/* ───────── Wi-Fi ───────── */
function parseWifi(text) {
  const nets = [];
  let cur = null, bss = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    let m;
    if ((m = /^SSID\s+\d+\s*:\s*(.*)$/i.exec(line))) {
      cur = { ssid: m[1] || '(скрытая)', auth: '', enc: '', bssids: [] };
      nets.push(cur); bss = null; continue;
    }
    if (!cur) continue;
    if ((m = /^BSSID\s+\d+\s*:\s*(.*)$/i.exec(line))) {
      bss = { mac: m[1], signal: 0, channel: '' };
      cur.bssids.push(bss); continue;
    }
    const kv = /^([^:]+?)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1].toLowerCase(), val = kv[2];
    if (!bss) {
      if (/authentication|проверка подлинности/.test(key)) cur.auth = val;
      else if (/encryption|шифрование/.test(key)) cur.enc = val;
    } else if (/signal|сигнал/.test(key)) bss.signal = parseInt(val, 10) || 0;
    else if (/channel|канал/.test(key) && !bss.channel) bss.channel = val;
  }
  return nets
    .map((n) => ({ ...n, signal: Math.max(0, ...n.bssids.map((b) => b.signal)), channel: (n.bssids[0] || {}).channel || '' }))
    .sort((a, b) => b.signal - a.signal);
}

module.exports = {
  parseWifi, parseArp, parsePorts, isPrivateIPv4, // экспортируем для проверок
  handlers: {
    'net:lan': async () => {
      const sub = localSubnet();
      if (sub) await wake(sub.base);
      const r = await run('arp', ['-a']);
      const devices = parseArp(r.stdout);
      await Promise.all(devices.map(async (d) => { d.name = await reverseName(d.ip); }));
      devices.sort((a, b) => a.ip.split('.').map(Number).reduce((x, y) => x * 256 + y) - b.ip.split('.').map(Number).reduce((x, y) => x * 256 + y));
      return { subnet: sub ? sub.base + '.0/24' : '', devices };
    },

    'net:portscan': async ({ host, ports, timeout = 700 }, { send }) => {
      const target = String(host || '').trim().toLowerCase() === 'localhost' ? '127.0.0.1' : String(host || '').trim();
      if (!isPrivateIPv4(target)) {
        throw new Error('Разрешено сканировать только локальные адреса: 192.168.x.x, 10.x.x.x, 172.16–31.x.x, 127.0.0.1');
      }
      const list = parsePorts(ports);
      const open = [];
      let done = 0, idx = 0;
      const t0 = Date.now();
      const worker = async () => {
        while (idx < list.length) {
          const port = list[idx++];
          if (await probe(target, port, Math.min(Math.max(+timeout || 700, 200), 3000))) open.push(port);
          done++;
          if (done % 100 === 0 || done === list.length) send('net:progress', { done, total: list.length, open: open.length });
        }
      };
      await Promise.all(Array.from({ length: 200 }, worker));
      return { open: open.sort((a, b) => a - b), total: list.length, ms: Date.now() - t0 };
    },

    'net:wifi': async () => {
      const r = await run('netsh', ['wlan', 'show', 'networks', 'mode=bssid'], { timeout: 20000 });
      return parseWifi(r.stdout);
    },
  },
};
