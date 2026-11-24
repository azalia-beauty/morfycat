// Мост к «железу»: на Windows — через Electron (IPC), на Android — через плагины Capacitor.
import { Capacitor, CapacitorHttp, registerPlugin } from '@capacitor/core';

export function detectPlatform() {
  if (typeof window !== 'undefined' && window.ghost && window.ghost.platform === 'win') return 'win';
  if (Capacitor.isNativePlatform()) return 'android';
  return 'web';
}

export const platform = detectPlatform();

/** Нативный плагин установки APK (см. android-plugin/). Есть только на Android. */
export const ApkInstaller = registerPlugin('ApkInstaller');

/** Вызвать обработчик из electron/modules/*.cjs (только Windows). */
export function invoke(channel, args) {
  if (platform !== 'win') {
    return Promise.reject(new Error('Эта функция доступна только в Windows-версии'));
  }
  return window.ghost.invoke(channel, args);
}

/** Подписаться на событие из Electron. Возвращает функцию отписки. */
export function on(channel, cb) {
  if (platform !== 'win') return () => {};
  return window.ghost.on(channel, cb);
}

/** Выполнить команду в Windows: sh('ipconfig') → { code, stdout, stderr }. На других платформах — ошибка. */
export function sh(cmd, opts = {}) {
  return invoke('shell:exec', { cmd, ...opts });
}

/**
 * HTTPS-запрос без проблем с CORS:
 * Windows — через основной процесс Electron, Android — через нативный HTTP, браузер — fetch.
 * Возвращает { status, text }.
 */
export async function http(url, { method = 'GET', headers = {}, body, timeout = 10000 } = {}) {
  if (platform === 'win') {
    return invoke('net:fetch', { url, method, headers, body, timeout });
  }
  if (platform === 'android') {
    let r;
    if (method === 'GET') {
      r = await CapacitorHttp.get({ url, headers, connectTimeout: timeout, readTimeout: timeout, responseType: 'text' });
    } else {
      const ct = Object.entries(headers).find(([k]) => k.toLowerCase() === 'content-type');
      const isJson = !!ct && /json/i.test(ct[1]);
      r = await CapacitorHttp.request({
        url, method, headers,
        data: body == null ? undefined : (isJson ? JSON.parse(body) : body),
        connectTimeout: timeout, readTimeout: timeout, responseType: 'text',
      });
    }
    const text = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    return { status: r.status, text };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { method, headers, body: method === 'GET' ? undefined : body, signal: ctrl.signal });
    return { status: r.status, text: await r.text() };
  } finally {
    clearTimeout(t);
  }
}

export async function httpJson(url, opts) {
  const r = await http(url, opts);
  if (r.status >= 400) throw new Error('HTTP ' + r.status);
  return JSON.parse(r.text);
}
