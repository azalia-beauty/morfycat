// Настройки упаковки Windows-версии (NSIS-установщик, ставится без прав администратора).
const cfg = require('./ghost.config.json');

function updateBase() {
  if (cfg.updateBaseUrl) return cfg.updateBaseUrl.replace(/\/+$/, '');
  if (cfg.repo && !/^YOUR_/i.test(cfg.repo)) return `https://github.com/${cfg.repo}/releases/latest/download`;
  return 'https://example.invalid/updates'; // заглушка, пока репозиторий не указан
}

module.exports = {
  appId: cfg.appId || 'com.morphin.ghost',
  productName: cfg.appName || 'Ghost',
  directories: { output: 'release', buildResources: 'build' },
  files: ['dist/**/*', 'electron/**/*', 'ghost.config.json', 'package.json'],
  asar: true,
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'build/icon.png',
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: false,
    shortcutName: cfg.appName || 'Ghost',
    artifactName: (cfg.slug || 'Ghost') + '-Setup-${version}.${ext}',
  },
  // generic-провайдер: electron-updater ищет latest.yml по этому адресу
  publish: [{ provider: 'generic', url: updateBase() }],
};
