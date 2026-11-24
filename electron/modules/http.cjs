// HTTP(S)-запросы из основного процесса: так у страницы нет проблем с CORS.
// Разрешён HTTPS, а обычный http — только для localhost (например, локальный ИИ Ollama).
module.exports = {
  handlers: {
    'net:fetch': async ({ url, method = 'GET', headers = {}, body, timeout = 10000 }) => {
      const u = new URL(url);
      const local = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
      if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) throw new Error('Разрешён только HTTPS (http — только для localhost)');
      const m = String(method).toUpperCase();
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].includes(m)) throw new Error('Метод не поддерживается: ' + m);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), Math.min(Math.max(+timeout || 10000, 1000), 600000));
      try {
        const r = await fetch(url, { method: m, headers, body: m === 'GET' || m === 'HEAD' ? undefined : body, signal: ctrl.signal, redirect: 'follow' });
        const text = await r.text();
        return { status: r.status, text: text.slice(0, 4_000_000) };
      } finally {
        clearTimeout(timer);
      }
    },
  },
};
