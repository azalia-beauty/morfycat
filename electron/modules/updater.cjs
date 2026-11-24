// Автообновление Windows-версии через electron-updater.
// Источник: ghost.config.json → updateBaseUrl или GitHub Releases (repo). Файл latest.yml лежит в релизе.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(app.getAppPath(), 'ghost.config.json'), 'utf8')); }
  catch { return {}; }
}

function baseUrl() {
  const c = readConfig();
  if (c.updateBaseUrl) return String(c.updateBaseUrl).replace(/\/+$/, '');
  if (c.repo && !/^YOUR_/i.test(c.repo)) return 'https://github.com/' + c.repo + '/releases/latest/download';
  return null;
}

let updater = null;

function getUpdater(send) {
  if (updater) return updater;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on('download-progress', (p) => send('update:progress', { percent: Math.round(p.percent), speed: p.bytesPerSecond }));
  updater = autoUpdater;
  return updater;
}

module.exports = {
  handlers: {
    'update:check': async (_args, { send }) => {
      const current = app.getVersion();
      if (!app.isPackaged) return { status: 'dev', current };
      const url = baseUrl();
      if (!url) return { status: 'unconfigured', current };
      const u = getUpdater(send);
      u.setFeedURL({ provider: 'generic', url });
      const r = await u.checkForUpdates();
      const info = r && r.updateInfo;
      if (r && r.isUpdateAvailable) {
        return {
          status: 'available', current, latest: info.version,
          notes: typeof info.releaseNotes === 'string' ? info.releaseNotes : '',
        };
      }
      return { status: 'latest', current, latest: info ? info.version : current };
    },

    'update:download': async (_args, { send }) => {
      await getUpdater(send).downloadUpdate();
      return { status: 'downloaded' };
    },

    'update:install': async (_args, { send }) => {
      // (isSilent, isForceRunAfter): ставим тихо и сразу запускаем новую версию
      setTimeout(() => getUpdater(send).quitAndInstall(true, true), 300);
      return { status: 'installing' };
    },
  },
};
