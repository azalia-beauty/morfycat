// Задаёт название приложения (как оно будет подписано на рабочем столе Android и в Windows).
//   node scripts/name-app.mjs "Моё приложение"        — первый запуск: имя + идентификатор приложения
//   node scripts/name-app.mjs --rename "Новое имя"    — только поменять подпись (идентификатор не трогаем,
//                                                        иначе Android перестанет ставить обновления поверх)
import fs from 'node:fs';
import { readJson } from './lib.mjs';

const args = process.argv.slice(2);
const rename = args.includes('--rename');
const raw = args.filter((a) => a !== '--rename').join(' ');

const fail = (m) => { console.error('\n✗ ' + m + '\n'); process.exit(1); };

const name = raw.replace(/[\u0000-\u001f<>"&\\/]/g, '').replace(/\s+/g, ' ').trim();
if (!name) fail('Название не может быть пустым.');
if (name.length > 30) fail('Название слишком длинное (до 30 знаков).');

const TR = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const latin = [...name.toLowerCase()].map((ch) => (TR[ch] !== undefined ? TR[ch] : ch)).join('');
let words = latin.split(/[^a-z0-9]+/).filter(Boolean);
let slug = words.map((w) => w[0].toUpperCase() + w.slice(1)).join('');
if (!slug) slug = 'Morphin';
if (/^\d/.test(slug)) slug = 'App' + slug;
slug = slug.slice(0, 24);

const cfg = readJson('ghost.config.json');
const cap = readJson('capacitor.config.json');
const pkg = readJson('package.json');

const first = !cfg.setupDone && !rename;
if (first) {
  cfg.slug = slug;
  cap.appId = 'com.morphin.' + slug.toLowerCase();
  cfg.appId = cap.appId;
  cfg.setupDone = true;
  // имя репозитория по умолчанию
  if (/^YOUR_/i.test(cfg.repo || '')) cfg.repoName = slug.toLowerCase();
} else if (!cfg.appId) {
  cfg.appId = cap.appId;
}
cfg.appName = name;
cap.appName = name;
pkg.productName = name;
if (first) pkg.name = slug.toLowerCase() + '-app';

fs.writeFileSync('ghost.config.json', JSON.stringify(cfg, null, 2) + '\n');
fs.writeFileSync('capacitor.config.json', JSON.stringify(cap, null, 2) + '\n');
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// заголовок страницы
let html = fs.readFileSync('index.html', 'utf8');
const esc = name.replace(/&/g, '&amp;').replace(/</g, '&lt;');
html = html.replace(/<title>[\s\S]*?<\/title>/, '<title>' + esc + '</title>');
fs.writeFileSync('index.html', html);

console.log('✓ Название: «' + name + '»  (файлы: ' + cfg.slug + '-…, id: ' + cap.appId + ')');
