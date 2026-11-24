import fs from 'node:fs';

export const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/** 0.2.5 → 205, 1.4.0 → 10400. Растёт вместе с версией, Android требует увеличивать versionCode. */
export function versionCode(version) {
  const [a = 0, b = 0, c = 0] = String(version).split('.').map((x) => parseInt(x, 10) || 0);
  return Math.max(1, a * 10000 + b * 100 + c);
}
