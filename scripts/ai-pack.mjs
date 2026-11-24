// Делает текстовые файлы для ИИ — их можно вставить в ЛЮБОЙ чат (файлы/архивы/APK ИИ принимать не обязан).
//   AI-PROMPT.txt     — короткая инструкция: как писать плагины (хватает для 95% задач)
//   AI-PACK-FULL.txt  — инструкция + исходный код всего проекта (для крупных переделок)
//   AI-PACK-PART-N.txt — то же самое, нарезанное на куски по ~45 000 знаков для ИИ с маленьким лимитом
import fs from 'node:fs';
import path from 'node:path';
import { buildPluginPrompt } from '../src/core/aiprompt.js';

const root = process.cwd();
const outDir = path.join(root, 'ai');
fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'AI-PROMPT.txt'), buildPluginPrompt({ task: '' }) + '\n');

const SKIP_DIR = new Set(['node_modules', 'dist', 'release', 'android', '.git', '.ghost-backup', 'ai', 'build']);
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP_DIR.has(e.name)) return [];
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}
const files = ['src', 'electron', 'scripts', 'android-plugin'].filter((d) => fs.existsSync(path.join(root, d)))
  .flatMap((d) => walk(path.join(root, d)))
  .concat(['package.json', 'vite.config.js', 'ghost.config.json', 'capacitor.config.json'].map((f) => path.join(root, f)).filter(fs.existsSync))
  .filter((f) => /\.(js|cjs|mjs|css|json|tpl|xml|sh|ps1)$/.test(f))
  .map((f) => path.relative(root, f).replace(/\\/g, '/'))
  .sort();

const header = `ПОЛНЫЙ КОНТЕКСТ ПРОЕКТА
=============================
Ниже — инструкция и исходный код этого приложения (Windows + Android, сделано Morphin). Прочитай всё и жди задачу.

КАК ОТВЕЧАТЬ НА КРУПНЫЕ ЗАДАЧИ:
- верни каждый изменённый или новый файл ПОЛНОСТЬЮ отдельным блоком кода;
- ПЕРВОЙ строкой каждого блока пиши комментарий  // FILE: путь/к/файлу  (например  // FILE: src/modules/weather.js);
- никаких «остальное без изменений» — файлы целиком;
- новые функции интерфейса — отдельные файлы в src/modules/ (подхватываются сами), функции для Windows — в electron/modules/*.cjs;
- package.json, .github и скрипты сборки не трогай без крайней необходимости (скажи об этом отдельной строкой вне блоков).
Ответ потом применяется командой  ./ghost.sh add  (она раскладывает блоки по путям).

${buildPluginPrompt({ task: '(задача будет ниже)', compact: true })}

ИСХОДНЫЙ КОД ПРОЕКТА:
`;

const parts = files.map((f) => '\n===== ' + f + ' =====\n' + fs.readFileSync(path.join(root, f), 'utf8'));
fs.writeFileSync(path.join(outDir, 'AI-PACK-FULL.txt'), header + parts.join('') + '\n===== КОНЕЦ КОНТЕКСТА. Жди задачу. =====\n');

// нарезка на куски
for (const old of fs.readdirSync(outDir)) if (/^AI-PACK-PART-\d+\.txt$/.test(old)) fs.unlinkSync(path.join(outDir, old));
const LIMIT = 45000;
const chunks = [];
let cur = '';
for (const piece of [header, ...parts]) {
  if (cur.length + piece.length > LIMIT && cur) { chunks.push(cur); cur = ''; }
  if (piece.length > LIMIT) { for (let i = 0; i < piece.length; i += LIMIT) chunks.push(piece.slice(i, i + LIMIT)); } else cur += piece;
}
if (cur) chunks.push(cur);
chunks.forEach((c, i) => fs.writeFileSync(path.join(outDir, 'AI-PACK-PART-' + (i + 1) + '.txt'),
  'ЧАСТЬ ' + (i + 1) + ' ИЗ ' + chunks.length + '. ' + (i + 1 < chunks.length ? 'Это не весь контекст: просто отвечай «принято», жди следующую часть.' : 'Это последняя часть: ответь «принято» и жди задачу.') + '\n\n' + c));

const kb = (f) => Math.round(fs.statSync(path.join(outDir, f)).size / 1024) + ' КБ';
console.log('✓ Готово, папка ai/:');
console.log('  AI-PROMPT.txt        ' + kb('AI-PROMPT.txt') + '   ← для обычных задач (вставить + описать задачу)');
console.log('  AI-PACK-FULL.txt     ' + kb('AI-PACK-FULL.txt') + '  ← весь код целиком (для ИИ с большим окном)');
console.log('  AI-PACK-PART-1…' + chunks.length + '.txt   ← то же, кусками (для ИИ с маленьким лимитом)');
