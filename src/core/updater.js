// Единый интерфейс обновлений для Windows и Android.
//
// Windows: electron-updater (electron/modules/updater.cjs) берёт latest.yml и сам ставит новый установщик.
// Android: приложение читает version.json, скачивает APK и открывает системный установщик
//          (нужно разрешение «установка из этого источника» — Android спросит один раз).

import { platform, invoke, on, ApkInstaller, http } from './bridge.js';
import { updateBase } from './config.js';

/** Сравнение версий: 1 если a новее b, -1 если старее, 0 если равны. */
export function cmpVersions(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const pb = String(b).replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/**
 * Проверка обновлений. Возвращает объект со status:
 * 'available' | 'latest' | 'dev' | 'unconfigured' | 'unsupported'
 */
export async function checkUpdate() {
  if (platform === 'win') return invoke('update:check');

  if (platform === 'android') {
    const base = updateBase();
    if (!base) return { status: 'unconfigured' };
    const cur = (await ApkInstaller.getVersion()).versionName;
    const r = await http(base + '/version.json', { headers: { 'Cache-Control': 'no-cache' } });
    if (r.status !== 200) throw new Error('version.json: HTTP ' + r.status);
    const info = JSON.parse(r.text);
    if (cmpVersions(info.version, cur) > 0) {
      return {
        status: 'available', current: cur, latest: info.version,
        notes: info.notes || '', apk: info.apk, sha256: info.sha256 || '',
      };
    }
    return { status: 'latest', current: cur, latest: info.version };
  }

  return { status: 'unsupported' };
}

/**
 * Скачать и установить. onProgress({percent}) вызывается по ходу загрузки.
 * Возвращает { status: 'installing' | 'need_permission' }.
 */
export async function installUpdate(info, onProgress = () => {}) {
  if (platform === 'win') {
    const off = on('update:progress', onProgress);
    try { await invoke('update:download'); } finally { off(); }
    onProgress({ percent: 100 });
    return invoke('update:install');
  }

  if (platform === 'android') {
    const sub = await ApkInstaller.addListener('progress', onProgress);
    try {
      return await ApkInstaller.downloadAndInstall({ url: info.apk, sha256: info.sha256 || '' });
    } finally {
      sub.remove();
    }
  }

  throw new Error('Обновления не поддерживаются на этой платформе');
}
