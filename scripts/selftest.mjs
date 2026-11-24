// Самопроверка чистых функций и скриптов. Запуск: npm run selftest
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { extractCode, adaptCode, lintCode } from '../src/core/plugins.js';
import { buildPluginPrompt, EXAMPLE } from '../src/core/aiprompt.js';
import { sanitizeSvg } from '../src/core/profile.js';

let n = 0;
const t = (name, fn) => { try { fn(); n++; console.log('  ✓', name); } catch (e) { console.error('  ✗', name, '\n   ', e.message); process.exitCode = 1; } };

const GOOD = "export default {\n  id: 'demo', title: 'Демо', mount(root, ctx) { root.append('hi'); },\n};";

t('extractCode: блок из ответа с пояснениями', () => assert.equal(extractCode('Вот код:\n```js\n' + GOOD + '\n```\nГотово!'), GOOD));
t('extractCode: выбирает блок с export default', () => assert.equal(extractCode('```bash\nnpm i\n```\n```js\n' + GOOD + '\n```'), GOOD));
t('extractCode: оборванный ответ без закрывающих ```', () => assert.equal(extractCode('Держи\n```js\n' + GOOD), GOOD));
t('extractCode: чистый код без блоков', () => assert.equal(extractCode(GOOD), GOOD));
t('extractCode: код из примера в промте валиден', () => { const c = extractCode(EXAMPLE); lintCode(c); assert.match(c, /id: 'notes'/); });

t('adaptCode: import из ядра → globalThis.__ghost', () => {
  const a = adaptCode("import { h, panel as p } from '../core/ui.js';\nimport { invoke } from '../core/bridge.js';\nx");
  assert.match(a, /const \{ h, panel: p \} = globalThis\.__ghost\.ui;/);
  assert.match(a, /const \{ invoke \} = globalThis\.__ghost\.bridge;/);
});
t('lintCode: require запрещён', () => assert.throws(() => lintCode("const fs = require('fs');\nexport default { id: 'aa', mount() {} };"), /require/));
t('lintCode: чужой import запрещён, из ядра — можно', () => {
  assert.throws(() => lintCode("import x from 'lodash';\nexport default { id: 'aa', mount() {} };  // ........."), /import/);
  lintCode("import { h } from '../core/ui.js';\nexport default { id: 'aa', mount() {} };  // ok ok ok ok");
});
t('lintCode: нет export default', () => assert.throws(() => lintCode('function a() { return 1 }  // ............................'), /export default/));
t('lintCode: «остальное без изменений»', () => assert.throws(() => lintCode(GOOD + '\n// ... остальное без изменений'), /сократил/));
t('lintCode: слишком короткий', () => assert.throws(() => lintCode('x'), /короткий/));

t('sanitizeSvg: вырезает script, on*, внешние href', () => {
  const s = sanitizeSvg('текст <svg viewBox="0 0 9 9"><script>alert(1)</script><rect onclick="x()" width="1"/><image href="https://evil/x.png"/><use href="#a"/></svg> конец');
  assert.ok(!/script|onclick|evil/.test(s)); assert.match(s, /href="#a"/); assert.match(s, /xmlns/);
});
t('sanitizeSvg: нет svg → ошибка', () => assert.throws(() => sanitizeSvg('просто текст'), /SVG/));

t('buildPluginPrompt: содержит задачу, API и правила ответа', () => {
  const p = buildPluginPrompt({ task: 'курс валют', platform: 'win', existingIds: ['home'] });
  assert.match(p, /курс валют/); assert.match(p, /ctx\.sh/); assert.match(p, /ФОРМАТ ОТВЕТА/); assert.match(p, /только Windows/); assert.match(p, /home/);
  assert.ok(buildPluginPrompt({ task: 'x', compact: true }).length < p.length);
  assert.match(buildPluginPrompt({ task: 'x', currentCode: GOOD }), /ТЕКУЩИЙ КОД/);
});

// — add-module.mjs в песочнице
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ghost-selftest-'));
const script = path.resolve('scripts/add-module.mjs');
const add = (input, extra = []) => {
  fs.writeFileSync(path.join(sandbox, 'in.txt'), input);
  return spawnSync(process.execPath, [script, 'in.txt', ...extra], { cwd: sandbox, encoding: 'utf8' });
};
t('add-module: один модуль → src/modules/<id>.js', () => {
  const r = add('Вот:\n```js\n' + GOOD + '\n```');
  assert.equal(r.status, 0, r.stderr); assert.ok(fs.existsSync(path.join(sandbox, 'src/modules/demo.js')));
});
t('add-module: повтор делает резервную копию', () => {
  const r = add('```js\n' + GOOD + '\n```');
  assert.equal(r.status, 0, r.stderr); assert.ok(fs.existsSync(path.join(sandbox, '.ghost-backup')));
});
t('add-module: несколько файлов по // FILE:', () => {
  const r = add('```js\n// FILE: src/modules/a1.js\nexport default { id: \'a1\', mount() {} };\n```\n```js\n// FILE: electron/modules/b1.cjs\nmodule.exports = { handlers: { \'b1:x\': async () => 1 } };\n```');
  assert.equal(r.status, 0, r.stderr); assert.ok(fs.existsSync(path.join(sandbox, 'src/modules/a1.js')) && fs.existsSync(path.join(sandbox, 'electron/modules/b1.cjs')));
});
t('add-module: native-модуль без FILE → electron/modules/<канал>.cjs', () => {
  const r = add('```js\nmodule.exports = { handlers: { \'zz:ping\': async () => 1 } };\n```');
  assert.equal(r.status, 0, r.stderr); assert.ok(fs.existsSync(path.join(sandbox, 'electron/modules/zz.cjs')));
});
t('add-module: синтаксическая ошибка — ничего не пишет', () => {
  const r = add('```js\nexport default { id: \'bad1\', mount( { }\n```');
  assert.notEqual(r.status, 0); assert.ok(!fs.existsSync(path.join(sandbox, 'src/modules/bad1.js')));
});
t('add-module: запрещённые пути (package.json, ..) не пишутся', () => {
  const r = add('```js\n// FILE: ../evil.js\nexport default { id: \'ev\', mount() {} };\n```\n```js\n// FILE: package.json\n{}\n```');
  assert.notEqual(r.status, 0); assert.ok(!fs.existsSync(path.join(sandbox, '..', 'evil.js')) && !fs.existsSync(path.join(sandbox, 'package.json')));
});
t('add-module: «остальное без изменений» отклоняется', () => {
  const r = add('```js\nexport default { id: \'cut1\', mount() {} };\n// ... остальное без изменений\n```');
  assert.notEqual(r.status, 0);
});
fs.rmSync(sandbox, { recursive: true, force: true });

console.log(process.exitCode ? '\nЕсть ошибки' : '\n✓ Самопроверка пройдена: ' + n + ' проверок');
