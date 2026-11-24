// Плагины, которые ставятся ПРЯМО В ПРИЛОЖЕНИИ (без пересборки): код хранится в памяти приложения
// и подгружается при запуске. Обычно такой код пишет ИИ по промту из «Студии».
//
// Формат плагина — тот же, что у файлов в src/modules/: export default { id, title, mount(root, ctx) }.
// Отличие: внутри нельзя import — всё нужное приходит через ctx (ctx.ui, ctx.bridge, ctx.store …).
// Если ИИ всё же написал `import { h } from '../core/ui.js'`, такая строка автоматически переписывается.

import { lsGet, lsSet } from './store.js';

const KEY = 'plugins';
export const ID_RE = /^[a-z][a-z0-9-]{1,31}$/;

export const listPlugins = () => lsGet(KEY, []);

function saveAll(list) {
  if (!lsSet(KEY, list)) throw new Error('Не удалось сохранить: память приложения переполнена или недоступна');
}

/** Достаёт код из ответа ИИ: берёт блок ```js … ``` (лучший по содержимому) или весь текст, если блоков нет. */
export function extractCode(text) {
  const t = String(text || '').replace(/^﻿/, '');
  const blocks = [...t.matchAll(/```[\w+-]*[ \t]*\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
  if (!blocks.length) {
    const open = /```[\w+-]*[ \t]*\r?\n([\s\S]*)$/.exec(t); // ответ оборван — закрывающих ``` нет
    return (open ? open[1] : t).trim();
  }
  const withDefault = blocks.filter((b) => /export\s+default/.test(b));
  return (withDefault.length ? withDefault : blocks).sort((a, b) => b.length - a.length)[0].trim();
}

/** import из ядра приложения → доступ через globalThis.__ghost (так же работают файлы из src/modules). */
export function adaptCode(code) {
  return String(code).replace(
    /^[ \t]*import\s*\{([^}]*)\}\s*from\s*['"]\.{1,2}\/(?:core\/)?(ui|bridge|config|updater|store)\.js['"];?[ \t]*$/gm,
    (_, names, mod) => {
      const n = names.split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.replace(/\s+as\s+/, ': ')).join(', ');
      return 'const { ' + n + ' } = globalThis.__ghost.' + mod + ';';
    });
}

/** Быстрые проверки до запуска кода — с понятными сообщениями. */
export function lintCode(code) {
  const c = String(code || '');
  if (c.trim().length < 30) throw new Error('Код пустой или слишком короткий. Вставьте ответ ИИ целиком.');
  if (/\brequire\s*\(/.test(c)) throw new Error('require() не поддерживается: плагин — это ES-модуль. Попросите ИИ переписать без require.');
  if (/^[ \t]*import\s[^\n]*['"]/m.test(adaptCode(c).replace(/from\s*['"]https:\/\/[^'"]+['"]/g, ''))) {
    throw new Error('import не поддерживается: всё нужное приходит через ctx (ctx.ui, ctx.bridge …). Попросите ИИ убрать import.');
  }
  if (!/export\s+default/.test(c)) throw new Error('Не найден «export default { id, title, mount(root, ctx) { … } }».');
  if (/\/\/\s*\.\.\.\s*(остальн|rest|existing|без изменений|unchanged|same as)/i.test(c)) {
    throw new Error('ИИ сократил код («остальное без изменений»). Попросите прислать файл ПОЛНОСТЬЮ.');
  }
}

async function evaluate(code) {
  const url = URL.createObjectURL(new Blob([adaptCode(code)], { type: 'text/javascript' }));
  try {
    const m = await import(/* @vite-ignore */ url);
    return m.default;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Полная проверка: код загружается, имеет id и mount, id не занят встроенным модулем. Возвращает объект модуля. */
export async function validate(code, { builtinIds = new Set() } = {}) {
  lintCode(code);
  let m;
  try { m = await evaluate(code); } catch (e) { throw new Error('Код не загрузился: ' + ((e && e.message) || e)); }
  if (!m || typeof m !== 'object') throw new Error('export default должен быть объектом { id, title, mount }.');
  if (!ID_RE.test(m.id || '')) throw new Error('id должен быть латиницей: маленькие буквы, цифры и дефис, 2–32 символа. Сейчас: «' + m.id + '».');
  if (typeof m.mount !== 'function') throw new Error('Нет метода mount(root, ctx).');
  if (builtinIds.has(m.id)) throw new Error('id «' + m.id + '» занят встроенным модулем — выберите другой.');
  return m;
}

export async function installPlugin(code, builtinIds) {
  const m = await validate(code, { builtinIds });
  const list = listPlugins();
  const now = Date.now();
  const i = list.findIndex((p) => p.id === m.id);
  const rec = { id: m.id, title: m.title || m.id, code, enabled: i >= 0 ? list[i].enabled : true, created: i >= 0 ? list[i].created : now, updated: now };
  if (i >= 0) list[i] = rec; else list.push(rec);
  saveAll(list);
  return rec;
}

export function removePlugin(id) { saveAll(listPlugins().filter((p) => p.id !== id)); }

export function setEnabled(id, on) {
  saveAll(listPlugins().map((p) => (p.id === id ? { ...p, enabled: !!on } : p)));
}

/** Загрузка всех включённых плагинов при старте. Сломанный плагин попадает в failed, остальные работают. */
export async function loadUserPlugins(platform, builtinIds = new Set()) {
  const mods = [], failed = [], skipped = [];
  for (const p of listPlugins()) {
    if (!p.enabled) continue;
    const file = 'плагин «' + p.id + '»';
    try {
      const m = await validate(p.code, { builtinIds });
      if (m.platforms && !m.platforms.includes(platform)) { skipped.push({ file, id: m.id, platforms: m.platforms }); continue; }
      mods.push({ icon: '✦', order: 100, title: m.id, ...m, file, user: true });
    } catch (e) {
      failed.push({ file, error: String((e && e.message) || e) });
    }
  }
  return { mods, failed, skipped };
}
