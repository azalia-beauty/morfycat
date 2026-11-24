import './styles/theme.css';
import { h, button, toast, eyeIcon } from './core/ui.js';
import * as ui from './core/ui.js';
import * as bridge from './core/bridge.js';
import { platform } from './core/bridge.js';
import { config, VERSION, APP_NAME, AUTHOR } from './core/config.js';
import * as updater from './core/updater.js';
import * as store from './core/store.js';
import * as llm from './core/llm.js';
import { lsGet, lsSet, storeFor } from './core/store.js';
import { getProfile, setProfile, onProfile, applyAccent } from './core/profile.js';
import { loadModules } from './core/registry.js';

// Плагины, написанные ИИ, берут помощников отсюда (см. adaptCode в core/plugins.js).
globalThis.__ghost = { ui, bridge, config, updater, store };

const app = document.getElementById('app');
document.title = APP_NAME;
document.body.classList.add('plat-' + platform);
applyAccent();

// Защита от «убийственного» плагина: если прошлый запуск не дожил до конца старта — включаем безопасный режим.
const crashed = lsGet('booting', 0) === 1;
const safe = crashed || lsGet('safe', false) === true;
lsSet('booting', 1);
const clearBoot = () => lsSet('booting', 0);
setTimeout(clearBoot, 5000);
addEventListener('pagehide', clearBoot);

function bootOverlay(lines) {
  const box = h('pre', { class: 'boot__log' });
  const fill = h('i');
  const el = h('div', { class: 'boot' },
    eyeIcon('boot__eye'),
    h('div', { class: 'boot__logo glitch', 'data-text': APP_NAME }, APP_NAME),
    box,
    h('div', { class: 'boot__bar' }, fill),
    h('div', { class: 'boot__by' }, 'сделано ', h('b', {}, AUTHOR)));
  document.body.append(el);
  let i = 0;
  const timer = setInterval(() => {
    if (i < lines.length) {
      box.textContent += lines[i++] + '\n';
      fill.style.width = Math.round((i / lines.length) * 100) + '%';
    } else {
      clearInterval(timer);
      el.classList.add('boot--out');
      setTimeout(() => el.remove(), 550);
    }
  }, 110);
}

async function start() {
  const registry = await loadModules(platform, { safe });
  const { mods } = registry;
  const userCount = mods.filter((m) => m.user).length;

  bootOverlay([
    '[ OK ] ' + APP_NAME + ' // ядро ' + VERSION,
    '[ OK ] платформа: ' + platform,
    '[ OK ] модулей: ' + mods.length + (userCount ? ' (своих: ' + userCount + ')' : '') + (registry.failed.length ? '  ошибок: ' + registry.failed.length : ''),
    safe ? '[WARN] безопасный режим: свои плагины отключены' : '[ OK ] канал связи готов',
  ]);

  const baseCtx = {
    platform, version: VERSION, config, bridge, ui,
    modules: mods, registry, safe,
    go: (id) => { location.hash = '#/' + id; },
    sh: (cmd, opts) => bridge.sh(cmd, opts),
    ai: {
      ask: (prompt, opts) => llm.ask([{ role: 'user', content: prompt }], opts),
      configured: llm.isConfigured,
    },
    profile: { get: getProfile, set: setProfile, onChange: onProfile },
  };

  const view = h('main', { class: 'view' });
  const nav = h('nav', { class: 'nav' });
  const banner = h('div', { class: 'banner', hidden: true });

  const navItems = new Map();
  for (const m of mods) {
    const item = h('a', { class: 'nav__item', href: '#/' + m.id, title: m.desc || m.title },
      h('span', { class: 'nav__ico' }, m.icon), h('span', { class: 'nav__lbl' }, m.title));
    navItems.set(m.id, item);
    nav.append(item);
  }
  nav.append(h('div', { class: 'nav__foot' }, 'v' + VERSION, h('br'), 'сделано ', h('b', {}, AUTHOR)));

  // Аватар и имя в шапке
  const ava = h('img', { class: 'head__ava', alt: '' });
  const nameEl = h('span', { class: 'head__name' });
  const paintProfile = () => {
    const p = getProfile();
    nameEl.textContent = p.name;
    ava.hidden = !p.avatar;
    if (p.avatar) ava.src = p.avatar;
  };
  paintProfile();
  onProfile(paintProfile);

  app.replaceChildren(
    h('header', { class: 'head' },
      h('div', { class: 'head__brand' },
        eyeIcon('head__mark'),
        h('div', { class: 'head__logo glitch', 'data-text': APP_NAME }, APP_NAME)),
      h('div', { class: 'head__meta' }, 'v' + VERSION + ' · by ' + AUTHOR),
      h('div', { class: 'head__sp' }),
      h('a', { class: 'who', href: '#/profile', title: 'Профиль' }, ava, nameEl),
      h('div', { class: 'pill pill--ok' }, h('i'), 'ONLINE')),
    nav,
    h('div', { class: 'stage' }, banner, view),
  );

  function showBanner(text, actions, kind) {
    banner.hidden = false;
    banner.className = 'banner' + (kind ? ' banner--' + kind : '');
    banner.replaceChildren(h('span', {}, text), ...actions);
  }

  if (safe) {
    showBanner(
      crashed ? 'Прошлый запуск не завершился — свои плагины временно отключены.' : 'Безопасный режим: свои плагины отключены.',
      [button('Включить плагины', () => { lsSet('safe', false); lsSet('booting', 0); location.reload(); }, 'primary')],
      'bad');
  }

  let current = null;
  async function show() {
    const id = location.hash.replace(/^#\//, '') || (mods[0] && mods[0].id);
    const m = mods.find((x) => x.id === id) || mods[0];
    if (!m) { view.textContent = 'Нет ни одного модуля. Добавьте файл в src/modules/'; return; }

    if (current && current.cleanup) { try { current.cleanup(); } catch { /* ignore */ } }
    current = null;
    navItems.forEach((el, key) => el.classList.toggle('is-active', key === m.id));

    const root = h('div', { class: 'module module--' + m.id });
    view.replaceChildren(
      h('h1', { class: 'view__title' }, h('span', { class: 'view__ico' }, m.icon), m.title),
      root);
    view.scrollTop = 0;

    try {
      const cleanup = await m.mount(root, { ...baseCtx, store: storeFor(m.id) });
      current = { cleanup: typeof cleanup === 'function' ? cleanup : null };
    } catch (e) {
      console.error(e);
      root.append(h('div', { class: 'panel panel--bad' },
        h('div', { class: 'panel__title' }, 'Ошибка модуля «' + m.id + '»'),
        h('pre', { class: 'panel__body' }, String((e && e.stack) || e))));
    }
  }

  window.addEventListener('hashchange', show);
  await show();

  // Фоновая проверка обновлений: если вышла новая версия — показываем плашку «Обновить».
  setTimeout(async () => {
    if (!banner.hidden) return;
    try {
      const r = await updater.checkUpdate();
      if (r && r.status === 'available' && mods.some((m) => m.id === 'updates')) {
        showBanner('Доступна новая версия ' + r.latest + ' (сейчас ' + r.current + ')', [
          button('Обновить', () => { baseCtx.go('updates'); banner.hidden = true; }, 'primary'),
          button('✕', () => { banner.hidden = true; }, 'ghost')]);
        toast('Доступно обновление ' + r.latest);
      }
    } catch { /* нет сети или не настроено — молча */ }
  }, 2500);
}

start().catch((e) => {
  console.error(e);
  app.textContent = 'Ошибка запуска: ' + ((e && e.message) || e);
});
