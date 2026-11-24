// Студия: добавляйте и меняйте функции прямо в приложении.
// Путь 1: описать задачу → скопировать промт → вставить в ЛЮБОЙ ИИ → вставить ответ сюда → «Установить».
// Путь 2: подключить ключ ИИ → нажать «Сгенерировать здесь» → «Установить».
// Установка не требует пересборки: плагин сохраняется в приложении и подгружается при запуске.

import { h, panel, button, field, toast, copy } from '../core/ui.js';
import { buildPluginPrompt, PLUGIN_SYSTEM } from '../core/aiprompt.js';
import { listPlugins, extractCode, validate, installPlugin, removePlugin, setEnabled } from '../core/plugins.js';
import { ask, PRESETS, getLlm, saveLlm, isConfigured } from '../core/llm.js';
import { lsSet } from '../core/store.js';

const TABS = [['create', 'Создать'], ['mine', 'Мои функции'], ['ai', 'ИИ-подключение']];

function download(name, text) {
  const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/javascript' })), download: name });
  document.body.append(a); a.click(); a.remove();
}

async function readFile(input) {
  const f = input.files && input.files[0];
  input.value = '';
  return f ? f.text() : '';
}

export default {
  id: 'studio',
  title: 'Студия',
  icon: '✦',
  order: 8,
  desc: 'Добавлять функции через ИИ — без пересборки',

  mount(root, ctx) {
    const builtinIds = ctx.registry.builtinIds;
    const body = h('div');
    let tab = 'create';
    const tabs = h('div', { class: 'tabs' });

    const paintTabs = () => tabs.replaceChildren(...TABS.map(([id, label]) =>
      h('button', { class: 'tab' + (tab === id ? ' is-on' : ''), type: 'button', onclick: () => { tab = id; paint(); } }, label)));

    /* ───────── установка из текста ───────── */
    async function installFrom(text, onDone) {
      try {
        const code = extractCode(text);
        const m = await validate(code, { builtinIds });
        const desc = [
          'Установить функцию «' + (m.title || m.id) + '» (id: ' + m.id + ')?',
          m.platforms ? 'Платформы: ' + m.platforms.join(', ') : 'Платформы: все',
          /ctx\.sh\s*\(/.test(code) ? '⚠ Код выполняет команды на вашем компьютере (ctx.sh).' : '',
          /ctx\.ai\.|bridge\.http|\bfetch\s*\(/.test(code) ? '⚠ Код обращается к сети.' : '',
          '',
          'Плагин получает те же права, что и приложение. Ставьте только код, который вы заказали сами.',
        ].filter((x) => x !== '' || true).join('\n');
        if (!confirm(desc)) return;
        const rec = await installPlugin(code, builtinIds);
        toast('Установлено: ' + rec.title + '. Перезагружаю…');
        setTimeout(() => { location.hash = '#/' + rec.id; location.reload(); }, 700);
        if (onDone) onDone(rec);
      } catch (e) {
        toast(String((e && e.message) || e).slice(0, 300), 'bad');
        throw e;
      }
    }

    /* ───────── вкладка «Создать» ───────── */
    function paintCreate() {
      const task = h('textarea', { placeholder: 'Например: «показывать курс доллара и евро с обновлением раз в минуту» или «кнопка, которая очищает временные файлы Windows»', style: { minHeight: '110px' } });
      const platform = h('select', {},
        h('option', { value: 'both' }, 'Windows и Android'), h('option', { value: 'win' }, 'Только Windows'), h('option', { value: 'android' }, 'Только Android'));
      const status = h('div', { class: 'small dim mt' });
      const paste = h('textarea', { class: 'code', placeholder: 'Вставьте сюда ответ ИИ целиком (можно с пояснениями — код найдётся сам) или загрузите файл .js / .txt / .md', spellcheck: 'false' });
      const file = h('input', { type: 'file', accept: '.js,.mjs,.txt,.md,text/*' });
      file.addEventListener('change', async () => { paste.value = await readFile(file); });

      const prompt = (compact) => buildPluginPrompt({ task: task.value, platform: platform.value, existingIds: [...builtinIds], compact });

      const gen = button('Сгенерировать здесь', async () => {
        if (!task.value.trim()) { toast('Сначала опишите задачу', 'bad'); return; }
        gen.disabled = true; status.className = 'small dim mt'; status.textContent = 'ИИ пишет код… (до пары минут)';
        try {
          paste.value = await ask([{ role: 'user', content: prompt(false) }], { system: PLUGIN_SYSTEM });
          status.className = 'small ok mt'; status.textContent = 'Готово. Проверьте код ниже и нажмите «Проверить и установить».';
        } catch (e) { status.className = 'small err mt'; status.textContent = 'Ошибка: ' + ((e && e.message) || e); }
        gen.disabled = false;
      }, 'primary');
      gen.hidden = !isConfigured();

      body.replaceChildren(
        panel('1. Что должна делать функция?',
          field('Описание', task),
          h('div', { class: 'row mt' }, field('Платформа', platform)),
          h('div', { class: 'row mt' },
            button('Скопировать промт для ИИ', () => {
              if (!task.value.trim()) { toast('Сначала опишите задачу', 'bad'); return; }
              copy(prompt(false));
            }, 'primary'),
            button('Короткий промт', () => { if (!task.value.trim()) { toast('Сначала опишите задачу', 'bad'); return; } copy(prompt(true)); }),
            gen),
          h('div', { class: 'small dim mt' }, 'Промт — обычный текст: вставьте его в любой чат с ИИ (ChatGPT, Gemini, Claude, DeepSeek, Алиса и т.д.). Файлы и вложения не нужны. Если ИИ ответил слишком длинно или оборвал код — напишите ему «пришли файл полностью одним блоком кода».'),
          status),
        panel('2. Ответ ИИ',
          paste,
          h('div', { class: 'row mt' }, h('div', { class: 'grow' }, field('…или файл с ответом', file)),
            button('Проверить и установить', async () => {
              if (!paste.value.trim()) { toast('Вставьте ответ ИИ', 'bad'); return; }
              try { await installFrom(paste.value); } catch { /* сообщение уже показано */ }
            }, 'primary')),
          h('div', { class: 'small dim mt' }, 'Перед установкой код проверяется: загружается ли он, есть ли id и mount. Если что-то не так — понятное сообщение и ничего не ломается.')));
    }

    /* ───────── вкладка «Мои функции» ───────── */
    function paintMine() {
      const list = listPlugins();
      const rows = list.length ? list.map((p) => {
        const editor = h('div', { hidden: true });
        const toggleEditor = (mode) => {
          editor.hidden = false;
          const code = h('textarea', { class: 'code', spellcheck: 'false' }); code.value = p.code;
          const req = h('textarea', { placeholder: 'Что изменить? Например: «добавь кнопку экспорта» или «исправь ошибку: …»', style: { minHeight: '70px' } });
          const st = h('div', { class: 'small dim mt' });
          const improve = () => buildPluginPrompt({ task: req.value, platform: 'both', currentCode: code.value, existingIds: [...builtinIds], compact: true });
          const gen = button('Улучшить здесь', async () => {
            if (!req.value.trim()) { toast('Опишите, что изменить', 'bad'); return; }
            gen.disabled = true; st.className = 'small dim mt'; st.textContent = 'ИИ дорабатывает…';
            try { code.value = extractCode(await ask([{ role: 'user', content: improve() }], { system: PLUGIN_SYSTEM })); st.className = 'small ok mt'; st.textContent = 'Готово — проверьте и сохраните.'; }
            catch (e) { st.className = 'small err mt'; st.textContent = 'Ошибка: ' + ((e && e.message) || e); }
            gen.disabled = false;
          });
          gen.hidden = !isConfigured();
          editor.replaceChildren(
            h('div', { class: 'mt' }, field('Доработать через ИИ', req)),
            h('div', { class: 'row mt' },
              button('Промт для ИИ (с текущим кодом)', () => { if (!req.value.trim()) { toast('Опишите, что изменить', 'bad'); return; } copy(improve()); }), gen),
            h('div', { class: 'mt' }, field('Код (можно править вручную или вставить новый ответ ИИ)', code)),
            h('div', { class: 'row mt' },
              button('Сохранить', async () => { try { await installFrom(code.value); } catch { /* показано */ } }, 'primary'),
              button('Закрыть', () => { editor.hidden = true; }, 'ghost')),
            st);
        };
        return h('div', { class: 'plug' + (p.enabled ? '' : ' plug--off') },
          h('div', { class: 'plug__head' },
            h('span', { class: 'plug__name' }, p.title), h('span', { class: 'dim small' }, p.id + ' · ' + new Date(p.updated).toLocaleDateString('ru-RU')),
            h('span', { class: 'sp' }),
            button(p.enabled ? 'Выключить' : 'Включить', () => { setEnabled(p.id, !p.enabled); location.reload(); }, 'ghost'),
            button('Изменить / доработать', () => toggleEditor()),
            button('Скачать .js', () => download(p.id + '.js', p.code), 'ghost'),
            button('Удалить', () => { if (confirm('Удалить функцию «' + p.title + '»? Её данные тоже пропадут.')) { removePlugin(p.id); location.hash = '#/studio'; location.reload(); } }, 'danger')),
          editor);
      }) : [h('div', { class: 'dim' }, 'Пока нет своих функций. Создайте первую на вкладке «Создать».')];

      const failed = ctx.registry.failed.filter((f) => f.file.startsWith('плагин'));
      body.replaceChildren(
        panel('Установленные функции: ' + list.length, rows),
        failed.length ? h('div', { class: 'panel panel--bad' },
          h('div', { class: 'panel__title' }, 'Не загрузились'),
          h('div', { class: 'panel__body' }, failed.map((f) => h('div', {}, h('b', {}, f.file), ' — ', f.error)))) : null,
        panel('Безопасность',
          h('div', { class: 'small dim' }, 'Если плагин что-то сломал и приложение не стартует, оно само запустится в безопасном режиме (свои функции отключены) — здесь их можно удалить.'),
          h('div', { class: 'row mt' }, button('Включить безопасный режим', () => { lsSet('safe', true); location.reload(); }, 'ghost'))));
    }

    /* ───────── вкладка «ИИ-подключение» ───────── */
    function paintAi() {
      const s = getLlm();
      const preset = h('select', {}, Object.entries(PRESETS).map(([k, p]) => h('option', { value: k, selected: s.preset === k }, p.label)));
      const base = h('input', { value: s.base, spellcheck: 'false' });
      const model = h('input', { value: s.model, spellcheck: 'false', placeholder: 'название модели' });
      const key = h('input', { type: 'password', value: s.key, placeholder: 'ключ API', autocomplete: 'off' });
      const hint = h('div', { class: 'small dim' });
      const out = h('div', { class: 'small mt' });
      const sync = () => { const p = PRESETS[preset.value]; hint.textContent = p.hint; };
      preset.addEventListener('change', () => { const p = PRESETS[preset.value]; base.value = p.base; model.value = p.model; sync(); });
      sync();
      const save = () => saveLlm({ preset: preset.value, base: base.value.trim(), model: model.value.trim(), key: key.value.trim() });
      body.replaceChildren(
        panel('Подключить ИИ (необязательно)',
          h('div', { class: 'small dim' }, 'Без этого всё работает через «Скопировать промт → вставить ответ». С ключом приложение пишет код и рисует авы само. Ключ хранится только на этом устройстве и отправляется только выбранному сервису.'),
          h('div', { class: 'row mt' }, h('div', { class: 'grow' }, field('Сервис', preset)), h('div', { class: 'grow' }, field('Модель', model))),
          h('div', { class: 'mt' }, field('Адрес API', base)),
          h('div', { class: 'mt' }, field('Ключ', key)), h('div', { class: 'mt' }, hint),
          h('div', { class: 'row mt' },
            button('Сохранить', () => { save(); toast('Сохранено'); paintTabsAndKeep(); }, 'primary'),
            button('Проверить связь', async () => {
              save(); out.className = 'small dim mt'; out.textContent = 'Спрашиваю…';
              try { const t = await ask([{ role: 'user', content: 'Ответь одним словом: готов' }], { maxTokens: 30 }); out.className = 'small ok mt'; out.textContent = 'Связь есть. Ответ: ' + t.slice(0, 80); }
              catch (e) { out.className = 'small err mt'; out.textContent = String((e && e.message) || e); }
            })),
          out));
    }

    const paintTabsAndKeep = () => { /* кнопки «Сгенерировать здесь» читают isConfigured при открытии вкладки */ };

    function paint() {
      paintTabs();
      if (tab === 'create') paintCreate(); else if (tab === 'mine') paintMine(); else paintAi();
    }

    root.append(tabs, body);
    paint();
  },
};
