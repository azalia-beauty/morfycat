// Главный процесс Windows-версии. Логику функций сюда не пишем:
// любой файл electron/modules/*.cjs подхватывается автоматически (см. loadModules ниже).

const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const fs = require('fs');
const path = require('path');

let APP_TITLE = 'Ghost';
try { APP_TITLE = require('../ghost.config.json').appName || APP_TITLE; } catch { /* нет конфига — оставляем имя по умолчанию */ }

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;
const getWin = () => (win && !win.isDestroyed() ? win : null);
const send = (channel, payload) => { const w = getWin(); if (w) w.webContents.send(channel, payload); };

function createWindow() {
  const devUrl = process.env.GHOST_DEV_URL;
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 820,
    minHeight: 560,
    show: false,
    title: APP_TITLE,
    backgroundColor: '#06080b',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#06080b', symbolColor: '#2ee6ff', height: 44 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged || process.env.GHOST_DEVTOOLS === '1',
    },
  });

  win.once('ready-to-show', () => win.show());
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // Внешние ссылки — в браузер; внутри окна никуда уходить нельзя.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !(devUrl && url.startsWith(devUrl))) e.preventDefault();
  });
  win.on('closed', () => { win = null; });
}

/** Подгружает electron/modules/*.cjs. Файл вида: module.exports = { handlers: { 'имя:действие': async (args, ctx) => ... } } */
function loadModules() {
  const dir = path.join(__dirname, 'modules');
  const ctx = { app, getWin, send };
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.cjs') || file.startsWith('_')) continue;
    try {
      const mod = require(path.join(dir, file));
      for (const [channel, fn] of Object.entries(mod.handlers || {})) {
        ipcMain.handle(channel, (event, args) => fn(args || {}, ctx));
      }
      if (typeof mod.init === 'function') mod.init(ctx);
    } catch (err) {
      console.error('[ghost] модуль ' + file + ' не загрузился:', err);
    }
  }
}

app.on('second-instance', () => {
  const w = getWin();
  if (w) { if (w.isMinimized()) w.restore(); w.focus(); }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  loadModules();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => app.quit());
