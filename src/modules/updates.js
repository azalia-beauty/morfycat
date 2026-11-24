import { h, panel, button, kv } from '../core/ui.js';
import { checkUpdate, installUpdate } from '../core/updater.js';
import { updateBase } from '../core/config.js';

export default {
  id: 'updates',
  title: 'Обновления',
  icon: '⇪',
  order: 90,
  desc: 'Проверка и установка новых версий',
  platforms: ['win', 'android'],

  mount(root, ctx) {
    let info = null;
    const status = h('div', {}, '—');
    const notes = h('pre', { class: 'out', hidden: true });
    const bar = h('div', { class: 'bar', hidden: true }, h('i'));
    const hint = h('div', { class: 'small dim mt' });

    const btnCheck = button('Проверить обновления', check, 'primary');
    const btnInstall = button('Скачать и установить', install, 'primary');
    btnInstall.hidden = true;

    const set = (text, cls = '') => { status.className = cls; status.textContent = text; };

    async function check() {
      btnCheck.disabled = true; btnInstall.hidden = true; notes.hidden = true; hint.textContent = '';
      set('Проверяю…', 'dim');
      try {
        const r = await checkUpdate();
        info = r;
        if (r.status === 'available') {
          set('Доступна версия ' + r.latest + ' (у вас ' + r.current + ')', 'warn');
          if (r.notes) { notes.textContent = r.notes; notes.hidden = false; }
          btnInstall.hidden = false;
        } else if (r.status === 'latest') set('У вас последняя версия: ' + (r.current || ctx.version), 'ok');
        else if (r.status === 'dev') set('Режим разработки: автообновление работает только в установленной версии.', 'dim');
        else if (r.status === 'unconfigured') set('Адрес обновлений не настроен.', 'warn'), hint.textContent = 'Откройте ghost.config.json и впишите свой GitHub-репозиторий в поле "repo".';
        else set('Обновления на этой платформе недоступны.', 'dim');
      } catch (e) { set('Не удалось проверить: ' + ((e && e.message) || e), 'err'); }
      btnCheck.disabled = false;
    }

    async function install() {
      btnInstall.disabled = true; btnCheck.disabled = true; bar.hidden = false;
      set('Скачиваю…', 'dim');
      try {
        const r = await installUpdate(info, ({ percent }) => {
          bar.firstChild.style.width = (percent || 0) + '%';
          set('Скачиваю… ' + (percent || 0) + '%', 'dim');
        });
        if (r && r.status === 'need_permission') {
          set('Разрешите установку из этого источника.', 'warn');
          hint.textContent = 'Открылись настройки Android: включите переключатель для этого приложения, вернитесь в приложение и нажмите «Скачать и установить» ещё раз.';
        } else if (ctx.platform === 'android') {
          set('Загружено. Подтвердите установку в окне Android.', 'ok');
        } else {
          set('Устанавливаю и перезапускаю приложение…', 'ok');
        }
      } catch (e) { set('Ошибка: ' + ((e && e.message) || e), 'err'); }
      btnInstall.disabled = false; btnCheck.disabled = false;
    }

    root.append(
      panel('Статус',
        kv([['Текущая версия', ctx.version], ['Источник', updateBase() || 'не настроен']]),
        h('div', { class: 'mt' }, status), h('div', { class: 'mt' }, bar), notes, hint,
        h('div', { class: 'row mt' }, btnCheck, btnInstall)));

    check();
  },
};
