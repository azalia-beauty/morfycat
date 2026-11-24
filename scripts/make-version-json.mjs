// Создаёт version.json рядом с APK — его читает приложение на Android, чтобы узнать о новой версии.
// Запуск: node scripts/make-version-json.mjs out/Ghost-0.2.0.apk
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readJson, versionCode } from './lib.mjs';

const apk = process.argv[2];
if (!apk || !fs.existsSync(apk)) {
  console.error('Укажите путь к APK: node scripts/make-version-json.mjs путь/к/файлу.apk');
  process.exit(1);
}

const pkg = readJson('package.json');
const cfg = readJson('ghost.config.json');
const repo = process.env.GITHUB_REPOSITORY || cfg.repo;
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(apk)).digest('hex');

const info = {
  version: pkg.version,
  versionCode: versionCode(pkg.version),
  apk: `https://github.com/${repo}/releases/download/v${pkg.version}/${path.basename(apk)}`,
  sha256,
  notes: process.env.NOTES || '',
  date: new Date().toISOString(),
};

const out = path.join(path.dirname(apk), 'version.json');
fs.writeFileSync(out, JSON.stringify(info, null, 2));
console.log('Записан ' + out);
console.log(info);
