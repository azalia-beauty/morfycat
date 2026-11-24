// «Выпустить обновление с компа»: поднимает версию, коммитит, ставит тег и пушит.
// GitHub Actions сам соберёт Windows-установщик и APK и опубликует релиз — приложения увидят обновление.
//
//   npm run release                       → 0.1.0 → 0.1.1
//   npm run release -- minor              → 0.1.1 → 0.2.0
//   npm run release -- major              → 0.2.0 → 1.0.0
//   npm run release -- 0.5.0 "Что нового" → точная версия и описание
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { readJson } from './lib.mjs';

const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });
const gitOut = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const fail = (msg) => { console.error('\n✗ ' + msg + '\n'); process.exit(1); };

const pkg = readJson('package.json');
const cfg = readJson('ghost.config.json');

// — проверки до любых изменений
try { gitOut('rev-parse', '--is-inside-work-tree'); }
catch { fail('Папка не является git-репозиторием. Запустите ghost.bat → «ПОЛНЫЙ АВТОМАТ» — он всё настроит сам.'); }
try { gitOut('remote', 'get-url', 'origin'); }
catch { fail('Не подключён GitHub. Запустите ghost.bat → «ПОЛНЫЙ АВТОМАТ» — он всё настроит сам.'); }
if (/^YOUR_/i.test(cfg.repo || '')) fail('В ghost.config.json впишите свой репозиторий в поле "repo" (например "kkkuss/ghost"), закоммитьте и повторите.');

try { execFileSync(process.execPath, ['scripts/check.mjs'], { stdio: 'inherit' }); }
catch { fail('Проверка кода не прошла — исправьте ошибки выше, выпуск отменён.'); }

// — новая версия
const arg = process.argv[2] || 'patch';
const [a, b, c] = pkg.version.split('.').map(Number);
let next;
if (/^\d+\.\d+\.\d+$/.test(arg)) next = arg;
else if (arg === 'major') next = `${a + 1}.0.0`;
else if (arg === 'minor') next = b >= 99 ? `${a + 1}.0.0` : `${a}.${b + 1}.0`;
else if (arg === 'patch') next = c >= 99 ? (b >= 99 ? `${a + 1}.0.0` : `${a}.${b + 1}.0`) : `${a}.${b}.${c + 1}`;
else fail('Не понял аргумент «' + arg + '». Используйте patch, minor, major или номер вида 1.2.3');

const note = process.argv.slice(3).join(' ').trim();
const tag = 'v' + next;
try { if (gitOut('tag', '-l', tag)) fail('Тег ' + tag + ' уже существует.'); } catch { /* нет тегов */ }

pkg.version = next;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

console.log(`\nВыпускаю ${tag}…\n`);
git('add', '-A');
git('commit', '--allow-empty', '-m', note ? `${tag}: ${note}` : `Release ${tag}`);
git('tag', tag);
git('push', 'origin', 'HEAD');
git('push', 'origin', tag);

console.log(`\n✓ Версия ${next} отправлена. Сборка идёт на GitHub: https://github.com/${cfg.repo}/actions`);
console.log('  Через 10–15 минут телефон и ПК покажут «Доступно обновление ' + next + '» — даже если этот компьютер будет выключен.');
