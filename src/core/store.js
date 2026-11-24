// Безопасная обёртка над localStorage: не падает, если хранилище недоступно или переполнено.
const P = 'ghost.';

export function lsGet(key, def) {
  try {
    const v = localStorage.getItem(P + key);
    return v == null ? def : JSON.parse(v);
  } catch { return def; }
}

export function lsSet(key, val) {
  try { localStorage.setItem(P + key, JSON.stringify(val)); return true; } catch { return false; }
}

export function lsDel(key) {
  try { localStorage.removeItem(P + key); } catch { /* ignore */ }
}

/** Отдельное хранилище для плагина: ctx.store.get/set/del. Ключи не пересекаются между плагинами. */
export function storeFor(ns) {
  const k = (x) => 'plug.' + ns + '.' + x;
  return { get: (x, d) => lsGet(k(x), d), set: (x, v) => lsSet(k(x), v), del: (x) => lsDel(k(x)) };
}
