import { h, panel, kv, fmtBytes, eyeIcon } from '../core/ui.js';
import { APP_NAME, AUTHOR } from '../core/config.js';
import { invoke } from '../core/bridge.js';

const PLATFORM_NAME = { win: 'Windows', android: 'Android', web: 'Браузер' };

export default {
  id: 'home',
  title: 'Главная',
  icon: '◈',
  order: 0,

  async mount(root, ctx) {
    const clock = h('div', { class: 'clock' });
    const tick = () => { clock.textContent = new Date().toLocaleTimeString('ru-RU'); };
    tick();
    const timer = setInterval(tick, 1000);

    const info = kv([
      ['Версия', ctx.version],
      ['Платформа', PLATFORM_NAME[ctx.platform] || ctx.platform],
      ['Модулей', String(ctx.modules.length)],
    ]);
    if (ctx.platform === 'win') {
      try {
        const s = await invoke('system:info');
        info.add('Хост', s.hostname);
        info.add('ОС', s.release + ' · ' + s.arch);
        info.add('Процессор', s.cpu + ' ×' + s.cores);
        info.add('Память', fmtBytes(s.totalmem));
      } catch { /* не критично */ }
    } else {
      info.add('Экран', screen.width + '×' + screen.height);
      info.add('Язык', navigator.language);
    }

    const tiles = h('div', { class: 'grid' },
      ctx.modules.filter((m) => m.id !== 'home').map((m, i) =>
        h('button', { class: 'tile', type: 'button', 'data-n': String(i + 1).padStart(2, '0'), onclick: () => ctx.go(m.id) },
          h('span', { class: 'tile__ico' }, m.icon),
          h('span', { class: 'tile__t' }, m.title),
          m.desc ? h('span', { class: 'tile__d' }, m.desc) : null)));

    root.append(
      h('div', { class: 'hero' },
        eyeIcon('hero__eye'),
        h('div', {},
          h('div', { class: 'hero__tag' }, 'система активна'),
          h('div', { class: 'hero__big glitch', 'data-text': APP_NAME }, APP_NAME),
          clock,
          h('div', { class: 'hero__sub' }, 'сделано ', h('b', {}, AUTHOR)))),
      panel('Система', info),
      panel('Модули', tiles));

    return () => clearInterval(timer);
  },
};
