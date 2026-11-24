// Безопасный мост между страницей и системой. Страница видит только window.ghost.
const { contextBridge, ipcRenderer } = require('electron');

const OK = /^[a-z]+:[\w-]+$/; // каналы вида "terminal:run"

contextBridge.exposeInMainWorld('ghost', {
  platform: 'win',
  invoke: (channel, args) => {
    if (!OK.test(channel)) return Promise.reject(new Error('Канал запрещён: ' + channel));
    return ipcRenderer.invoke(channel, args);
  },
  on: (channel, cb) => {
    if (!OK.test(channel)) return () => {};
    const fn = (_event, payload) => cb(payload);
    ipcRenderer.on(channel, fn);
    return () => ipcRenderer.removeListener(channel, fn);
  },
});
