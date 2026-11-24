// Консольные программы Windows пишут в «OEM»-кодировке (на русской Windows это cp866).
// Определяем её один раз и раскодируем вывод, чтобы вместо кириллицы не было «кракозябр».
const { execSync } = require('child_process');

let label = null;

function oemLabel() {
  if (label) return label;
  label = 'utf-8';
  if (process.platform === 'win32') {
    try {
      const out = execSync('chcp', { windowsHide: true }).toString('latin1');
      const cp = parseInt((out.match(/(\d{3,5})/) || [])[1], 10);
      const map = { 866: 'ibm866', 1251: 'windows-1251', 1252: 'windows-1252', 437: 'windows-1252', 850: 'windows-1252', 65001: 'utf-8' };
      label = map[cp] || 'utf-8';
    } catch { /* оставляем utf-8 */ }
  }
  return label;
}

const makeDecoder = () => new TextDecoder(oemLabel());
const decodeAll = (buf) => makeDecoder().decode(buf);

module.exports = { oemLabel, makeDecoder, decodeAll };
