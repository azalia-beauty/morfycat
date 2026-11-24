// Тексты для ИИ. Здесь нет обращений к браузеру — файл можно импортировать и из Node (scripts/ai-pack.mjs).
// Если меняете формат плагинов — обновите API_DOC, и все промты (в приложении и в AI-PROMPT.txt) обновятся сами.

export const API_DOC = `ЭТО ПРИЛОЖЕНИЕ — КАК НАПИСАТЬ ФУНКЦИЮ (ПЛАГИН)
==============================================
Это приложение для Windows и Android (сделано Morphin) с тёмным «хакерским» HUD-интерфейсом. Каждая функция — отдельный плагин:
ОДИН файл чистого JavaScript (ES2020), который приложение подгружает прямо во время работы, без пересборки.

ФОРМАТ ФАЙЛА (строго):
- ровно один «export default { ... }», никаких других export;
- БЕЗ import и require — всё нужное приходит через аргумент ctx;
- без TypeScript, JSX, HTML-файлов и сборщиков; без внешних библиотек (только браузерные API: fetch, canvas, crypto, Intl и т.п.);

export default {
  id: 'my-tool',            // латиница в нижнем регистре, цифры, дефис; 2–32 символа; уникальный
  title: 'Название',        // подпись в меню
  icon: '★',                // один символ
  order: 100,               // позиция в меню (меньше — выше)
  desc: 'Что делает',       // подпись на плитке главной страницы
  platforms: ['win'],       // необязательно: ['win'] — только Windows, ['android'] — только Android; без поля — везде
  async mount(root, ctx) {  // root — пустой <div> страницы плагина
    // ...строим интерфейс и вешаем обработчики...
    // можно вернуть функцию очистки: return () => clearInterval(timer);
  },
};

ctx (второй аргумент mount):
- ctx.platform — 'win' | 'android' | 'web';  ctx.version — версия приложения;  ctx.go('id') — перейти на страницу другого модуля.
- ctx.ui — помощники интерфейса:
    h(tag, attrs, ...children)  создать элемент. Строки-потомки вставляются как ТЕКСТ. attrs: class, style (объект), onclick и другие on*, value, placeholder, type…
    panel(title, ...children)   рамка с заголовком
    button(label, onClick, cls) кнопка; cls: 'primary' | 'danger' | 'ghost' | ''
    field(label, control)       подпись + поле ввода
    kv([[ключ, значение], ...]) таблица «ключ — значение» (у результата есть метод .add(k, v))
    toast(text, kind)           всплывашка; kind: 'info' | 'bad'
    copy(text)                  скопировать в буфер обмена
    fmtBytes(n), fmtUptime(sec), drawSpark(canvas, массивЧисел, { max, color })
- ctx.store — постоянное хранилище ЭТОГО плагина: get(key, default), set(key, value), del(key). Значения — любые JSON-данные.
- ctx.bridge.http(url, { method, headers, body, timeout }) → Promise<{ status, text }> — сетевой запрос без проблем с CORS
  (https; method по умолчанию 'GET'; body — строка). ctx.bridge.httpJson(url, opts) → Promise<объект>.
- ctx.sh(cmd, { shell, cwd, timeout }) → Promise<{ code, stdout, stderr }> — выполнить команду в Windows
  (shell: 'powershell' по умолчанию или 'cmd'). ТОЛЬКО Windows: такой плагин обязан иметь platforms: ['win'].
- ctx.ai.ask(prompt, { system }) → Promise<строка> — спросить ИИ (работает, только если пользователь подключил ИИ в Студии, иначе бросает ошибку).
- ctx.profile.get() → { name, avatar, accent }.

СТИЛЬ. Используй готовые CSS-классы: panel, row (flex-ряд; дочерний элемент с классом grow растягивается), grid (адаптивная сетка),
btn, chips + chip, table (th/td), out (<pre> для вывода текста), bar (полоса прогресса: внутри <i> с style.width), dim (приглушённый текст),
ok / warn / err / acc (цвета текста), mt (отступ сверху), small. Поля input / select / textarea уже оформлены.
Свои цвета не задавай — используй var(--acc), var(--fg), var(--dim), var(--ok), var(--warn), var(--bad).

ПРАВИЛА:
1. Данные от пользователя и из сети вставляй только через h(...) / textContent, никогда через innerHTML.
2. Все операции, которые могут упасть (сеть, парсинг, ctx.sh), оборачивай в try/catch и показывай ошибку пользователю (toast или текст на странице).
3. Таймеры и слушатели снимай в функции очистки, которую возвращает mount.
4. Интерфейс должен нормально выглядеть на телефоне (узкий экран): без фиксированной ширины больше 100%.
5. Сканирование сети — только собственные устройства и локальные адреса. Не пиши код для атак, взлома чужих аккаунтов и сетей, вредоносов и слежки за людьми.
6. Пиши понятные комментарии на русском прямо в коде.`;

export const EXAMPLE = `\`\`\`js
// Пример плагина: заметки, которые сохраняются между запусками.
export default {
  id: 'notes',
  title: 'Заметки',
  icon: '✎',
  order: 120,
  desc: 'Быстрые заметки',
  mount(root, ctx) {
    const { h, panel, button, toast, copy } = ctx.ui;
    const area = h('textarea', { placeholder: 'Пишите здесь…' });
    area.value = ctx.store.get('text', '');
    let t = null;
    area.addEventListener('input', () => {            // сохраняем через полсекунды после последней буквы
      clearTimeout(t);
      t = setTimeout(() => ctx.store.set('text', area.value), 500);
    });
    root.append(panel('Заметки', area,
      h('div', { class: 'row mt' },
        button('Копировать', () => copy(area.value)),
        button('Очистить', () => { area.value = ''; ctx.store.set('text', ''); toast('Очищено'); }, 'danger'))));
    return () => clearTimeout(t);
  },
};
\`\`\``;

const PLATFORM_TEXT = {
  both: "и Windows, и Android (ctx.sh недоступен на Android: либо не используй его, либо проверяй ctx.platform === 'win')",
  win: "только Windows (поставь platforms: ['win'], можно использовать ctx.sh)",
  android: "только Android (поставь platforms: ['android'], ctx.sh недоступен)",
};

const ANSWER_RULES = `ФОРМАТ ОТВЕТА:
- верни ОДИН блок кода \`\`\`js … \`\`\` с полным файлом плагина; пояснения — только комментариями внутри кода;
- файл должен быть ПОЛНЫМ: не сокращай, не пиши «остальное без изменений»;
- один export default, без import и require; проверь код на синтаксические ошибки перед ответом.`;

/**
 * Промт для любого чат-ИИ (ChatGPT, Gemini, Claude, DeepSeek, Алиса …): обычный текст, файлы и вложения не нужны.
 * currentCode — если задан, ИИ дорабатывает существующий плагин.
 */
export function buildPluginPrompt({ task = '', platform = 'both', existingIds = [], currentCode = '', compact = false } = {}) {
  const parts = [];
  parts.push(currentCode
    ? 'Ты — разработчик этого приложения. Доработай существующий плагин по моему описанию.'
    : 'Ты — разработчик этого приложения. Напиши новый плагин по моему описанию.');
  parts.push('ЗАДАЧА:\n' + (task.trim() || '<<ОПИШИТЕ СЮДА, ЧТО ДОЛЖНА ДЕЛАТЬ ФУНКЦИЯ>>'));
  parts.push('ПЛАТФОРМА: ' + (PLATFORM_TEXT[platform] || PLATFORM_TEXT.both));
  if (existingIds.length) parts.push('Занятые id (не использовать): ' + existingIds.join(', '));
  parts.push(API_DOC);
  if (!compact) parts.push('ПРИМЕР ПЛАГИНА:\n' + EXAMPLE);
  if (currentCode) parts.push('ТЕКУЩИЙ КОД ПЛАГИНА (сохрани id, если не просили менять):\n```js\n' + currentCode.trim() + '\n```');
  parts.push(ANSWER_RULES);
  return parts.join('\n\n');
}

/** Системная инструкция для встроенного вызова ИИ (когда ключ подключён в приложении). */
export const PLUGIN_SYSTEM = 'Ты — разработчик плагинов этого приложения. Отвечаешь только одним блоком кода ```js с полным файлом плагина, без текста вне блока.';

export function buildAvatarImagePrompt({ desc = '', accent = '#2ee6ff' } = {}) {
  return [
    'Square 1:1 avatar illustration, centered subject, dark near-black background.',
    'Style: urban hacker / vigilante, cyber HUD, subtle glitch and scanline effects, neon accent color ' + accent + ', high contrast, clean shapes.',
    desc.trim() ? 'Subject: ' + desc.trim() : 'Subject: a hooded figure or a mask silhouette lit by a screen glow.',
    'No text, no logos, no watermarks, no existing characters or brands. Keep important details away from the edges (the picture is cropped to a circle/hexagon).',
  ].join('\n');
}

export function buildAvatarSvgPrompt({ desc = '', accent = '#2ee6ff' } = {}) {
  return [
    'Нарисуй аватар в виде SVG-кода.',
    'Требования: один блок ```svg```; корневой <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">; квадрат, тёмный фон; акцентный цвет ' + accent + '.',
    'Стиль: городской хакер, неоновый HUD, лёгкий глитч (сдвинутые полосы красного и циана), простые векторные формы.',
    'Без <script>, без внешних ссылок и картинок, без текста и шрифтов, без обработчиков on*.',
    'Важные детали держи подальше от краёв (аватар обрезается кругом или шестиугольником).',
    desc.trim() ? 'Что нарисовать: ' + desc.trim() : 'Что нарисовать: силуэт в капюшоне с мерцающим экраном вместо лица.',
  ].join('\n');
}

export const AVATAR_SYSTEM = 'Ты рисуешь аватары. Отвечаешь только одним блоком ```svg с корректным SVG (viewBox 0 0 256 256), без пояснений.';
