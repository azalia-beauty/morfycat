// Запуск консольных команд с правильной кодировкой вывода.
const { spawn } = require('child_process');
const { decodeAll } = require('./oem.cjs');

// opts: { timeout (мс), cwd, verbatim (для cmd.exe — передать аргументы как есть) }
function run(file, args, { timeout = 15000, cwd, verbatim = false } = {}) {
  return new Promise((resolve) => {
    let p;
    try {
      p = spawn(file, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], cwd: cwd || undefined, windowsVerbatimArguments: verbatim });
    } catch (e) { resolve({ code: -1, stdout: '', stderr: String(e) }); return; }
    const out = [], err = [];
    const timer = setTimeout(() => p.kill(), timeout);
    p.stdout.on('data', (d) => out.push(d));
    p.stderr.on('data', (d) => err.push(d));
    p.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout: '', stderr: String(e) }); });
    p.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: decodeAll(Buffer.concat(out)), stderr: decodeAll(Buffer.concat(err)) });
    });
  });
}

const POWERSHELL_ARGS = ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command'];
const ps = (script, opts) => run('powershell.exe', [...POWERSHELL_ARGS, script], opts);

module.exports = { run, ps, POWERSHELL_ARGS };
