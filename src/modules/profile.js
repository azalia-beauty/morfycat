// Профиль: имя, аватар (из файла, буфера, генератора или от ИИ) и цвет оформления.
import { h, panel, button, field, toast, copy } from '../core/ui.js';
import { getProfile, setProfile, fileToAvatar, svgToAvatar, generatedAvatar } from '../core/profile.js';
import { buildAvatarImagePrompt, buildAvatarSvgPrompt, AVATAR_SYSTEM } from '../core/aiprompt.js';
import { ask, isConfigured } from '../core/llm.js';

const COLORS = ['#2ee6ff', '#6dff8a', '#ff3b5c', '#ffb020', '#b58cff', '#ff6bd6', '#ffffff'];

export default {
  id: 'profile',
  title: 'Профиль',
  icon: '☻',
  order: 5,
  desc: 'Имя, ава и цвет оформления',

  mount(root) {
    const p = getProfile();
    const preview = h('img', { class: 'ava', alt: 'ава' });
    const empty = h('div', { class: 'ava ava--empty' }, 'нет авы');
    const paint = () => { const a = getProfile().avatar; preview.hidden = !a; empty.hidden = !!a; if (a) preview.src = a; };
    paint();

    const apply = async (make, okText) => {
      try { setProfile({ avatar: await make() }); paint(); toast(okText || 'Ава обновлена'); }
      catch (e) { toast(String((e && e.message) || e).slice(0, 200), 'bad'); }
    };

    // — имя и цвет
    const name = h('input', { value: p.name, maxlength: 24, spellcheck: 'false' });
    const color = h('input', { type: 'color', value: p.accent });
    color.addEventListener('input', () => setProfile({ accent: color.value }));
    const chips = h('div', { class: 'chips' }, COLORS.map((c) => h('button', {
      class: 'chip', type: 'button', style: { color: c, borderColor: c }, onclick: () => { color.value = c; setProfile({ accent: c }); },
    }, c)));

    // — источники авы
    const file = h('input', { type: 'file', accept: 'image/*' });
    file.addEventListener('change', () => { const f = file.files[0]; file.value = ''; if (f) apply(() => fileToAvatar(f)); });

    const seed = h('input', { placeholder: 'слово или пусто — случайная', spellcheck: 'false' });
    const desc = h('textarea', { placeholder: 'Что нарисовать? Например: «лис-хакер в капюшоне, глитч, неон». Можно оставить пустым.', style: { minHeight: '70px' } });
    const svgIn = h('textarea', { class: 'code', placeholder: 'Вставьте сюда SVG-код, который прислал ИИ (целиком ответ — нужный кусок найдётся сам)', style: { minHeight: '110px' }, spellcheck: 'false' });
    const st = h('div', { class: 'small dim mt' });
    const aiGen = button('Нарисовать здесь (SVG)', async () => {
      aiGen.disabled = true; st.className = 'small dim mt'; st.textContent = 'ИИ рисует…';
      try {
        const svg = await ask([{ role: 'user', content: buildAvatarSvgPrompt({ desc: desc.value, accent: getProfile().accent }) }], { system: AVATAR_SYSTEM, maxTokens: 6000 });
        svgIn.value = svg;
        await apply(() => svgToAvatar(svg), 'Ава от ИИ готова');
        st.textContent = '';
      } catch (e) { st.className = 'small err mt'; st.textContent = 'Ошибка: ' + ((e && e.message) || e); }
      aiGen.disabled = false;
    }, 'primary');
    aiGen.hidden = !isConfigured();

    // вставка картинки из буфера и перетаскивание
    const onPaste = (e) => {
      const it = [...(e.clipboardData ? e.clipboardData.items : [])].find((i) => i.type.startsWith('image/'));
      if (it) { e.preventDefault(); apply(() => fileToAvatar(it.getAsFile()), 'Ава вставлена из буфера'); }
    };
    document.addEventListener('paste', onPaste);
    root.addEventListener('dragover', (e) => e.preventDefault());
    root.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files[0];
      if (f) { e.preventDefault(); apply(() => fileToAvatar(f), 'Ава загружена'); }
    });

    root.append(
      panel('Профиль',
        h('div', { class: 'row', style: { alignItems: 'center' } },
          preview, empty,
          h('div', { class: 'grow' },
            field('Имя', name),
            h('div', { class: 'row mt' }, button('Сохранить имя', () => { setProfile({ name: name.value.trim() || 'Оператор' }); toast('Сохранено'); }, 'primary'),
              button('Убрать аву', () => { setProfile({ avatar: '' }); paint(); }, 'ghost')))),
        h('div', { class: 'mt' }, field('Цвет оформления', h('div', { class: 'row' }, color, h('div', { class: 'grow' }, chips))))),
      panel('Аватар: свой файл',
        h('div', { class: 'small dim' }, 'Выберите картинку, перетащите её в окно или нажмите Ctrl+V с картинкой в буфере — она обрежется в квадрат автоматически.'),
        h('div', { class: 'mt' }, file)),
      panel('Аватар: генератор (без ИИ и интернета)',
        h('div', { class: 'row' },
          h('div', { class: 'grow' }, field('Слово-зерно', seed)),
          button('Сгенерировать', () => apply(async () => generatedAvatar(seed.value.trim() || Math.random(), getProfile().accent), 'Новая ава'), 'primary'))),
      panel('Аватар: через ИИ',
        h('div', { class: 'small dim' }, 'Вариант А: любой ИИ, умеющий рисовать картинки — скопируйте промт, получите картинку и загрузите её файлом выше. Вариант Б: любой текстовый ИИ рисует SVG-кодом — скопируйте SVG-промт, вставьте ответ в поле ниже.'),
        h('div', { class: 'mt' }, field('Описание (по желанию)', desc)),
        h('div', { class: 'row mt' },
          button('Промт для картинки', () => copy(buildAvatarImagePrompt({ desc: desc.value, accent: getProfile().accent }))),
          button('Промт для SVG', () => copy(buildAvatarSvgPrompt({ desc: desc.value, accent: getProfile().accent }))),
          aiGen),
        h('div', { class: 'mt' }, field('SVG от ИИ', svgIn)),
        h('div', { class: 'row mt' }, button('Применить SVG', () => { if (!svgIn.value.trim()) { toast('Вставьте SVG', 'bad'); return; } apply(() => svgToAvatar(svgIn.value), 'Ава из SVG готова'); }, 'primary')),
        st));

    return () => document.removeEventListener('paste', onPaste);
  },
};
