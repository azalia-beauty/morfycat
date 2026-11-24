// Быстрая проверка проекта перед выпуском: синтаксис всех файлов + правильная форма модулей.
// Запуск: npm run check
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const exts = new Set(['.js', '.cjs', '.mjs']);
const dirs = ['src', 'electron', 'scripts'];
let bad = 0;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
}

const files = [...dirs.filter(fs.existsSync).flatMap(walk), 'vite.config.js', 'electron-builder.config.cjs'].filter((f) => exts.has(path.extname(f)));

for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
  } catch (e) {
    bad++;
    console.error('✗ Синтаксическая ошибка в ' + f + '\n' + String(e.stderr || e.message).split('\n').slice(0, 6).join('\n'));
  }
}

// Каждый файл в src/modules (кроме «_...») должен экспортировать модуль с id и mount.
const modDir = 'src/modules';
const ids = new Map();
for (const f of fs.readdirSync(modDir).filter((n) => n.endsWith('.js') && !n.startsWith('_'))) {
  const text = fs.readFileSync(path.join(modDir, f), 'utf8');
  if (!/export\s+default/.test(text)) { bad++; console.error('✗ ' + f + ': нет export default'); continue; }
  const id = (/\bid:\s*['"]([\w-]+)['"]/.exec(text) || [])[1];
  if (!id) { bad++; console.error('✗ ' + f + ': не найден id модуля'); continue; }
  if (!/\bmount\s*\(/.test(text)) { bad++; console.error('✗ ' + f + ': нет метода mount'); }
  if (ids.has(id)) { bad++; console.error('✗ id «' + id + '» повторяется в ' + f + ' и ' + ids.get(id)); }
  ids.set(id, f);
}

if (bad) { console.error('\nНайдено проблем: ' + bad); process.exit(1); }
console.log('✓ Проверено файлов: ' + files.length + ', модулей: ' + ids.size + ' — всё в порядке');
