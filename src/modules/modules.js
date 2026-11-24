import { h, panel } from '../core/ui.js';

const SNIPPET = `// src/modules/мой-модуль.js — просто положите файл, больше ничего менять не нужно
import { h, panel, button } from '../core/ui.js';

export default {
  id: 'my',
  title: 'Мой модуль',
  icon: '★',
  order: 100,
  mount(root, ctx) {
    root.append(panel('Привет', button('Нажми', () => alert('ok'))));
  },
};`;

export default {
  id: 'modules',
  title: 'Модули',
  icon: '⧉',
  order: 95,
  desc: 'Что загружено и как добавить своё',

  mount(root, ctx) {
    const { mods, failed, skipped } = ctx.registry;

    const rows = mods.map((m) => h('tr', {},
      h('td', {}, m.icon + ' ' + m.title), h('td', {}, m.file), h('td', {}, (m.platforms || ['все']).join(', '))));

    root.append(
      panel('Загружено: ' + mods.length,
        h('div', { style: { overflowX: 'auto' } }, h('table', { class: 'table' },
          h('thead', {}, h('tr', {}, ['Модуль', 'Файл', 'Платформы'].map((t) => h('th', {}, t)))), h('tbody', {}, rows)))),
      failed.length ? h('div', { class: 'panel panel--bad' },
        h('div', { class: 'panel__title' }, 'Ошибки загрузки: ' + failed.length),
        h('div', { class: 'panel__body' }, failed.map((f) => h('div', {}, h('b', {}, f.file), ' — ', f.error)))) : null,
      skipped.length ? panel('Пропущено на этой платформе: ' + skipped.length,
        skipped.map((s) => h('div', { class: 'dim' }, s.file + ' (нужно: ' + s.platforms.join(', ') + ')'))) : null,
      panel('Как добавить модуль',
        h('p', { class: 'dim small' }, 'Создайте файл в папке src/modules/ — он появится в меню автоматически. Шаблон: _template.js. Для Windows-функций (доступ к системе) добавьте такой же файл в electron/modules/*.cjs.'),
        h('pre', { class: 'out' }, SNIPPET)));
  },
};
