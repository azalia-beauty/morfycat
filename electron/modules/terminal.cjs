const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { makeDecoder } = require('../lib/oem.cjs');
const { POWERSHELL_ARGS } = require('../lib/run.cjs');

const procs = new Map();

module.exports = {
  handlers: {
    'terminal:home': async () => os.homedir(),

    'terminal:cd': async ({ cwd, target }) => {
      let t = String(target || '~').trim().replace(/^\/d\s+/i, '').replace(/^["']|["']$/g, '');
      if (t === '~' || t === '') t = os.homedir();
      const next = path.resolve(cwd || os.homedir(), t);
      if (!fs.existsSync(next) || !fs.statSync(next).isDirectory()) throw new Error('Папка не найдена: ' + next);
      return next;
    },

    'terminal:run': async ({ id, shell, cmd, cwd }, { send }) => {
      const dir = cwd && fs.existsSync(cwd) ? cwd : os.homedir();
      let file, args, verbatim = false;
      if (shell === 'cmd') {
        file = 'cmd.exe';
        args = ['/d', '/s', '/c', '"' + cmd + '"'];
        verbatim = true;
      } else {
        file = 'powershell.exe';
        args = [...POWERSHELL_ARGS, cmd];
      }
      const p = spawn(file, args, { cwd: dir, windowsHide: true, windowsVerbatimArguments: verbatim, stdio: ['ignore', 'pipe', 'pipe'] });
      procs.set(id, p);
      const outDec = makeDecoder(), errDec = makeDecoder();
      p.stdout.on('data', (d) => send('terminal:data', { id, text: outDec.decode(d, { stream: true }) }));
      p.stderr.on('data', (d) => send('terminal:data', { id, text: errDec.decode(d, { stream: true }), err: true }));
      p.on('error', (e) => { send('terminal:data', { id, text: String(e) + '\n', err: true }); });
      p.on('close', (code) => { procs.delete(id); send('terminal:exit', { id, code }); });
      return { started: true };
    },

    'terminal:kill': async ({ id }) => {
      const p = procs.get(id);
      if (p && p.pid) spawn('taskkill', ['/pid', String(p.pid), '/T', '/F'], { windowsHide: true });
      return { killed: !!p };
    },
  },
};
