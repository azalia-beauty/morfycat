// «Докинуть код»: берёт ответ ИИ (из файла, буфера обмена или stdin), находит в нём файлы и кладёт куда нужно.
//
//   node scripts/add-module.mjs ответ.txt        из файла
//   node scripts/add-module.mjs --clip           из буфера обмена
//   node scripts/add-module.mjs -                из stdin
//
// Что понимает:
//  • один блок кода с export default { id, … }  → src/modules/<id>.js
//  • один блок кода с module.exports { handlers } → electron/modules/<имя>.cjs
//  • несколько блоков, у каждого первой строкой «// FILE: путь/к/файлу» → кладёт по указанным путям
// Перед записью проверяет синтаксис; существующие файлы сохраняет в .ghost-backup/.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.cwd();
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const src = args.find((a) => !a.startsWith('--') || a === '-');
const clip = args.includes('--clip');

const fail = (m) => { console.error('\n✗ ' + m + '\n'); process.exit(1); };

function readClipboard() {
  const tries = process.platform === 'win32'
    ? [['powershell', ['-NoProfile', '-Command', '[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-Clipboard -Raw']]]
    : process.platform === 'darwin' ? [['pbpaste', []]] : [['wl-paste', []], ['xclip', ['-selection', 'clipboard', '-o']], ['xsel', ['-b']]];
  for (const [cmd, a] of tries) {
    const r = spawnSync(cmd, a, { encoding: 'utf8' });
    if (r.status === 0 && r.stdout) return r.stdout;
  }
  return '';
}

function readInput() {
  if (clip) return readClipboard();
  if (src === '-') return fs.readFileSync(0, 'utf8');
  if (src) { if (!fs.existsSync(src)) fail('Файл не найден: ' + src); return fs.readFileSync(src, 'utf8'); }
  fail('Укажите файл с ответом ИИ, или --clip (буфер обмена), или - (stdin).');
}

const text = readInput().replace(/^﻿/, '');
if (!text.trim()) fail('Пусто: нечего добавлять. Скопируйте ответ ИИ и повторите.');

// — блоки кода
let blocks = [...text.matchAll(/```[\w+-]*[ \t]*\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
if (!blocks.length) {
  const open = /```[\w+-]*[ \t]*\r?\n([\s\S]*)$/.exec(text);
  blocks = [open ? open[1] : text];
}

const ALLOWED = [/^src\/[\w./-]+\.(js|css)$/, /^electron\/[\w./-]+\.cjs$/, /^scripts\/[\w./-]+\.(mjs|sh|ps1)$/, /^android-plugin\/[\w./-]+$/];
const FILE_RE = /^\s*(?:\/\/|#|\/\*|<!--)\s*FILE:\s*(\S+)/i;

const plan = [];
for (const raw of blocks) {
  const code = raw.replace(/\r\n/g, '\n').trim() + '\n';
  const m = FILE_RE.exec(code.split('\n')[0]);
  let rel = m && m[1].replace(/\\/g, '/').replace(/^\.?\//, '');
  if (!rel) {
    if (/module\.exports/.test(code)) {
      const first = /['"]([a-z]+):[\w-]+['"]\s*:/.exec(code);
      rel = 'electron/modules/' + (first ? first[1] : 'custom' + Date.now()) + '.cjs';
    } else if (/export\s+default/.test(code)) {
      const id = (/\bid:\s*['"]([a-z][a-z0-9-]*)['"]/.exec(code) || [])[1];
      if (!id) fail('В коде нет id модуля (id: \'имя\').');
      rel = 'src/modules/' + id + '.js';
    } else { console.warn('• пропускаю блок без FILE и без export default / module.exports'); continue; }
  }
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(root + path.sep) || rel.includes('..') || !ALLOWED.some((re) => re.test(rel))) {
    console.warn('• пропускаю «' + rel + '»: сюда автоматически писать нельзя (package.json, .github и т.п. правьте вручную)');
    continue;
  }
  plan.push({ rel, abs, code });
}
if (!plan.length) fail('Не нашёл, что добавлять.');

// — проверка синтаксиса и формы модуля до записи
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-add-'));
for (const f of plan) {
  const ext = f.rel.endsWith('.cjs') ? '.cjs' : f.rel.endsWith('.js') || f.rel.endsWith('.mjs') ? '.mjs' : null;
  if (ext) {
    const t = path.join(tmp, 'check' + ext);
    fs.writeFileSync(t, f.code);
    try { execFileSync(process.execPath, ['--check', t], { stdio: 'pipe' }); }
    catch (e) { fail('Синтаксическая ошибка в ' + f.rel + ':\n' + String(e.stderr || e.message).split('\n').slice(0, 6).join('\n') + '\nПопросите ИИ исправить и пришлите файл полностью.'); }
  }
  if (/^src\/modules\/[^_][\w-]*\.js$/.test(f.rel)) {
    if (/^[ \t]*import\s[^\n]*['"]https?:/m.test(f.code)) fail(f.rel + ': внешние import не допускаются.');
    if (!/export\s+default/.test(f.code) || !/\bid:\s*['"][\w-]+['"]/.test(f.code) || !/\bmount\s*\(/.test(f.code)) fail(f.rel + ': не похоже на модуль (нужны export default, id, mount).');
  }
  if (/\/\/\s*\.\.\.\s*(остальн|rest|existing|без изменений|unchanged)/i.test(f.code)) fail(f.rel + ': ИИ сократил код («остальное без изменений»). Попросите прислать файл ПОЛНОСТЬЮ.');
}
fs.rmSync(tmp, { recursive: true, force: true });

// — запись
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
for (const f of plan) {
  const exists = fs.existsSync(f.abs);
  console.log((dry ? '[пробный запуск] ' : '') + (exists ? '↻ заменяю ' : '＋ создаю  ') + f.rel);
  if (dry) continue;
  if (exists) {
    const b = path.join(root, '.ghost-backup', stamp, f.rel);
    fs.mkdirSync(path.dirname(b), { recursive: true });
    fs.copyFileSync(f.abs, b);
  }
  fs.mkdirSync(path.dirname(f.abs), { recursive: true });
  fs.writeFileSync(f.abs, f.code);
}
console.log('\n✓ Готово: файлов — ' + plan.length + (plan.some((f) => fs.existsSync(path.join(root, '.ghost-backup', stamp))) ? '  (старые версии: .ghost-backup/' + stamp + ')' : ''));
console.log('  Проверить: RUN.bat  |  Выпустить для всех: ./ghost.sh release');
