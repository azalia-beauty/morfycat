// Создаёт СВОЙ ключ подписи Android (один раз) и кладёт его в ANDROID-KEY-SECRETS.txt.
// Каждое обновление APK должно быть подписано этим же ключом. Копия ключа сохраняется в C:\Morphin\keys (или ~/.morphin/keys).
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJson } from './lib.mjs';

const OUT = 'ANDROID-KEY-SECRETS.txt';
const cfg = readJson('ghost.config.json');
const keyHome = process.platform === 'win32' && fs.existsSync('C:\\') ? 'C:\\Morphin\\keys' : path.join(os.homedir(), '.morphin', 'keys');
const backup = path.join(keyHome, (cfg.slug || 'app') + '-' + (cfg.appId || 'id') + '.txt');

if (fs.existsSync(OUT)) { console.log('✓ Ключ подписи уже есть'); process.exit(0); }
if (fs.existsSync(backup)) {
  fs.copyFileSync(backup, OUT);
  console.log('✓ Ключ подписи восстановлен из ' + backup);
  process.exit(0);
}

function findOpenssl() {
  const cands = ['openssl'];
  if (process.platform === 'win32') {
    for (const base of [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')]) {
      if (!base) continue;
      cands.push(path.join(base, 'Git', 'usr', 'bin', 'openssl.exe'), path.join(base, 'Git', 'mingw64', 'bin', 'openssl.exe'));
    }
  }
  for (const c of cands) {
    const r = spawnSync(c, ['version'], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return null;
}

const ssl = findOpenssl();
if (!ssl) { console.error('✗ Не нашёл openssl (он идёт вместе с Git for Windows). Установите Git и повторите.'); process.exit(1); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ks-'));
const key = path.join(tmp, 'key.pem'), crt = path.join(tmp, 'crt.pem'), p12 = path.join(tmp, 'app.keystore');
const pass = crypto.randomBytes(12).toString('hex'); // 24 знака, только 0-9a-f — безопасно для любых оболочек
const run = (args) => spawnSync(ssl, args, { encoding: 'utf8', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });

let r = run(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', crt, '-days', '10000', '-subj', '/CN=Morphin/O=Morphin']);
if (r.status !== 0) { console.error('✗ openssl (req): ' + r.stderr); process.exit(1); }

const base = ['pkcs12', '-export', '-inkey', key, '-in', crt, '-name', 'ghost', '-out', p12, '-passout', 'pass:' + pass];
// Старые алгоритмы шифрования понимает любая версия Java; если openssl их не знает — пробуем без них.
r = run([...base, '-keypbe', 'PBE-SHA1-3DES', '-certpbe', 'PBE-SHA1-3DES', '-macalg', 'sha1']);
if (r.status !== 0) r = run(base);
if (r.status !== 0 || !fs.existsSync(p12)) { console.error('✗ openssl (pkcs12): ' + r.stderr); process.exit(1); }

const b64 = fs.readFileSync(p12).toString('base64').replace(/\s+/g, '');
fs.rmSync(tmp, { recursive: true, force: true });

const text = `КЛЮЧ ПОДПИСИ ANDROID — ХРАНИТЕ В ТАЙНЕ, НЕ ПУБЛИКУЙТЕ И НЕ КОММИТЬТЕ.
Все обновления APK должны быть подписаны ЭТИМ ЖЕ ключом, иначе Android откажется ставить их поверх.
Копия лежит в: ${backup}
Сохраните файл ещё и в облако/на флешку: потеряете — придётся удалять приложение и ставить заново.

(Секреты в GitHub записываются автоматически скриптом, вручную ничего делать не нужно.)

─────────────────────────────────────────
Имя:      ANDROID_KEYSTORE_PASSWORD
Значение: ${pass}

─────────────────────────────────────────
Имя:      ANDROID_KEYSTORE_BASE64
Значение: ${b64}
─────────────────────────────────────────

Алиас ключа внутри хранилища: ghost
`;
fs.writeFileSync(OUT, text);
fs.mkdirSync(keyHome, { recursive: true });
fs.writeFileSync(backup, text);
console.log('✓ Создан ключ подписи (копия: ' + backup + ')');
