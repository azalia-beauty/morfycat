// Общая «дверь в систему» для плагинов, написанных ИИ: ctx.sh('команда') → { code, stdout, stderr }.
// Работает только в Windows-версии. Плагины ставит сам владелец приложения (Студия просит подтверждение).
const { run, ps } = require('../lib/run.cjs');

module.exports = {
  handlers: {
    'shell:exec': async ({ cmd, shell = 'powershell', cwd, timeout = 30000 }) => {
      if (typeof cmd !== 'string' || !cmd.trim()) throw new Error('Пустая команда');
      const t = Math.min(Math.max(+timeout || 30000, 1000), 600000);
      const opts = { timeout: t, cwd: cwd || undefined };
      const r = shell === 'cmd'
        ? await run('cmd.exe', ['/d', '/s', '/c', '"' + cmd + '"'], { ...opts, verbatim: true })
        : await ps(cmd, opts);
      return { code: r.code, stdout: r.stdout.slice(0, 1_000_000), stderr: r.stderr.slice(0, 1_000_000) };
    },
  },
};
