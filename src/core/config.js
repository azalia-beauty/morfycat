import raw from '../../ghost.config.json';

export const config = raw;
export const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const APP_NAME = (raw.appName || 'Ghost').trim();
export const AUTHOR = (raw.author || 'Morphin').trim();

/** Базовый адрес, откуда берутся version.json (Android) и latest.yml (Windows). */
export function updateBase() {
  if (raw.updateBaseUrl) return raw.updateBaseUrl.replace(/\/+$/, '');
  if (raw.repo && !/^YOUR_/i.test(raw.repo)) {
    return `https://github.com/${raw.repo}/releases/latest/download`;
  }
  return '';
}
