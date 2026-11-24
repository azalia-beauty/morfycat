// Дорабатывает свежесозданный Android-проект (npx cap add android):
//  • плагин установки APK, фоновая проверка обновлений (уведомление «Доступно обновление»), свой FileProvider,
//  • разрешения (установка APK, уведомления), зависимость WorkManager,
//  • значок приложения, цвета системных панелей, название на рабочем столе,
//  • versionName/versionCode из package.json.
// Безопасно запускать повторно.
import fs from 'node:fs';
import path from 'node:path';
import { readJson, versionCode } from './lib.mjs';

const root = process.cwd();
const cap = readJson(path.join(root, 'capacitor.config.json'));
const pkg = readJson(path.join(root, 'package.json'));
const cfg = readJson(path.join(root, 'ghost.config.json'));
const appId = cap.appId;
const androidDir = path.join(root, 'android');
const res = path.join(androidDir, 'app/src/main/res');

if (!fs.existsSync(androidDir)) {
  console.error('Нет папки android. Сначала выполните: npx cap add android');
  process.exit(1);
}

const xmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, "\\'").replace(/"/g, '\\"');

// адрес файла version.json (тот же, что использует само приложение)
function updateUrl() {
  const base = cfg.updateBaseUrl
    ? String(cfg.updateBaseUrl).replace(/\/+$/, '')
    : (cfg.repo && !/^YOUR_/i.test(cfg.repo) ? `https://github.com/${cfg.repo}/releases/latest/download` : '');
  return base ? base + '/version.json' : '';
}

// 1. Java-файлы
const javaDir = path.join(androidDir, 'app/src/main/java', ...appId.split('.'));
fs.mkdirSync(javaDir, { recursive: true });
for (const name of ['ApkInstallerPlugin', 'GhostFileProvider', 'UpdateWorker', 'MainActivity']) {
  const tpl = fs.readFileSync(path.join(root, 'android-plugin', name + '.java.tpl'), 'utf8').replaceAll('__APP_PACKAGE__', appId);
  fs.writeFileSync(path.join(javaDir, name + '.java'), tpl);
}

// 2. ресурсы: xml FileProvider, значок уведомления, значок приложения, адрес обновлений, цвета
fs.mkdirSync(path.join(res, 'xml'), { recursive: true });
fs.copyFileSync(path.join(root, 'android-plugin/ghost_update_paths.xml'), path.join(res, 'xml/ghost_update_paths.xml'));
fs.mkdirSync(path.join(res, 'drawable'), { recursive: true });
fs.copyFileSync(path.join(root, 'android-plugin/ic_stat_update.xml'), path.join(res, 'drawable/ic_stat_update.xml'));

const iconSrc = path.join(root, 'android-plugin/res');
if (fs.existsSync(iconSrc)) {
  const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const e of fs.readdirSync(from, { withFileTypes: true })) {
      const a = path.join(from, e.name), b = path.join(to, e.name);
      if (e.isDirectory()) copyDir(a, b); else fs.copyFileSync(a, b);
    }
  };
  copyDir(iconSrc, res);
}

fs.mkdirSync(path.join(res, 'values'), { recursive: true });
fs.writeFileSync(path.join(res, 'values/ghost_config.xml'),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <string name="ghost_update_url" translatable="false">${updateUrl()}</string>\n</resources>\n`);

// название приложения на рабочем столе (cap add уже подставил appName из capacitor.config.json — дублируем на всякий случай)
const stringsPath = path.join(res, 'values/strings.xml');
if (fs.existsSync(stringsPath)) {
  let s = fs.readFileSync(stringsPath, 'utf8');
  const name = xmlEsc(cap.appName || cfg.appName || 'Ghost');
  s = s.replace(/(<string name="app_name">)[\s\S]*?(<\/string>)/, (_m, a, b) => a + name + b)
       .replace(/(<string name="title_activity_main">)[\s\S]*?(<\/string>)/, (_m, a, b) => a + name + b);
  fs.writeFileSync(stringsPath, s);
}

// тёмные системные панели в стиле приложения
const stylesPath = path.join(res, 'values/styles.xml');
if (fs.existsSync(stylesPath)) {
  let s = fs.readFileSync(stylesPath, 'utf8');
  if (!s.includes('ghost_bars')) {
    s = s.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, (m) =>
      m + '\n        <!-- ghost_bars -->\n        <item name="android:statusBarColor">#06090D</item>\n        <item name="android:navigationBarColor">#06090D</item>\n        <item name="android:windowBackground">#06090D</item>');
    fs.writeFileSync(stylesPath, s);
  }
}

// 3. AndroidManifest.xml
const mfPath = path.join(androidDir, 'app/src/main/AndroidManifest.xml');
let mf = fs.readFileSync(mfPath, 'utf8');
const perms = ['android.permission.REQUEST_INSTALL_PACKAGES', 'android.permission.POST_NOTIFICATIONS'];
for (const p of perms) {
  if (!mf.includes(p)) mf = mf.replace('<application', `<uses-permission android:name="${p}" />\n\n    <application`);
}
if (!mf.includes('GhostFileProvider')) {
  const provider = `
        <provider
            android:name="${appId}.GhostFileProvider"
            android:authorities="\${applicationId}.ghostupdate"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/ghost_update_paths" />
        </provider>
    </application>`;
  mf = mf.replace('</application>', provider);
}
fs.writeFileSync(mfPath, mf);

// 4. версия приложения и зависимость WorkManager
const gradlePath = path.join(androidDir, 'app/build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
gradle = gradle
  .replace(/versionCode\s+\d+/, 'versionCode ' + versionCode(pkg.version))
  .replace(/versionName\s+"[^"]*"/, 'versionName "' + pkg.version + '"');
if (!gradle.includes('androidx.work:work-runtime')) {
  gradle = gradle.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.work:work-runtime:2.9.1"');
}
fs.writeFileSync(gradlePath, gradle);

console.log('Android-проект подготовлен: «' + (cap.appName || '') + '», версия ' + pkg.version + ' (versionCode ' + versionCode(pkg.version) + '), обновления: ' + (updateUrl() || 'адрес не задан'));

import './make-icons.mjs';
