// ШАБЛОН МОДУЛЯ. Скопируйте этот файл, уберите «_» из начала имени — и модуль появится в меню сам.
// Менять другие файлы не нужно. Файлы, начинающиеся с «_», приложение игнорирует.
//
// ctx содержит:
//   ctx.platform  — 'win' | 'android' | 'web'
//   ctx.version   — версия приложения
//   ctx.go('id')  — перейти в другой модуль
//   ctx.bridge    — { invoke, on, http, httpJson } — доступ к системе (Windows) и сети
//   ctx.ui        — { h, panel, button, field, kv, toast, copy, fmtBytes, drawSpark }

import { h, panel, button, toast } from '../core/ui.js';

export default {
  id: 'example',            // уникальное имя (латиница), попадает в адрес #/example
  title: 'Пример',          // название в меню
  icon: '★',                // значок в меню
  order: 100,               // позиция в меню: меньше — выше
  desc: 'Что делает модуль', // подпись на плитке главной страницы
  // platforms: ['win'],    // если нужен только Windows. Варианты: 'win', 'android', 'web'. Без этой строки — везде.

  async mount(root, ctx) {
    const out = h('pre', { class: 'out' }, 'Пока пусто');

    root.append(
      panel('Привет',
        h('p', {}, 'Это пример модуля. Платформа: ' + ctx.platform),
        button('Нажми', () => { out.textContent = new Date().toString(); toast('Готово'); }, 'primary'),
        h('div', { class: 'mt' }, out)),
    );

    // Если нужно что-то убрать при уходе со страницы (таймеры и т.п.) — верните функцию:
    // const t = setInterval(...); return () => clearInterval(t);
  },
};
