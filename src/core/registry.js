// Автозагрузка модулей: любой файл src/modules/*.js подхватывается сам.
// Файлы, имя которых начинается с «_», игнорируются (шаблоны, черновики).
// Сверх этого подгружаются плагины, установленные в самом приложении (Студия).
// Сломанный модуль не валит приложение — он просто попадёт в список ошибок.

import { loadUserPlugins } from './plugins.js';

const loaders = import.meta.glob(['../modules/*.js', '!../modules/_*.js']);

export async function loadModules(platform, { safe = false } = {}) {
  const mods = [];
  const failed = [];
  const skipped = [];
  const builtinIds = new Set();

  for (const [path, load] of Object.entries(loaders)) {
    const file = path.split('/').pop();
    try {
      const m = (await load()).default;
      if (!m || !m.id || typeof m.mount !== 'function') {
        throw new Error('модуль должен делать export default { id, title, mount(root, ctx) }');
      }
      builtinIds.add(m.id);
      if (m.platforms && !m.platforms.includes(platform)) {
        skipped.push({ file, id: m.id, platforms: m.platforms });
        continue;
      }
      mods.push({ icon: '▣', order: 100, title: m.id, ...m, file });
    } catch (e) {
      failed.push({ file, error: String((e && e.message) || e) });
    }
  }

  if (!safe) {
    const u = await loadUserPlugins(platform, builtinIds);
    mods.push(...u.mods);
    failed.push(...u.failed);
    skipped.push(...u.skipped);
  }

  mods.sort((a, b) => a.order - b.order || String(a.title).localeCompare(String(b.title), 'ru'));
  return { mods, failed, skipped, builtinIds };
}
