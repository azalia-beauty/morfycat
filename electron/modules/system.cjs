const os = require('os');
const { ps } = require('../lib/run.cjs');

let prev = null;

function cpuPercent() {
  const cur = os.cpus().reduce((acc, c) => {
    const t = c.times;
    acc.idle += t.idle;
    acc.total += t.user + t.nice + t.sys + t.idle + t.irq;
    return acc;
  }, { idle: 0, total: 0 });
  let pct = 0;
  if (prev) {
    const di = cur.idle - prev.idle, dt = cur.total - prev.total;
    pct = dt > 0 ? Math.round((1 - di / dt) * 100) : 0;
  }
  prev = cur;
  return pct;
}

function ifaces() {
  const list = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) list.push({ name, address: a.address, mac: a.mac, netmask: a.netmask });
    }
  }
  return list;
}

module.exports = {
  handlers: {
    'system:info': async () => ({
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.version ? os.version() : os.release(),
      arch: os.arch(),
      cpu: (os.cpus()[0] && os.cpus()[0].model.trim()) || 'CPU',
      cores: os.cpus().length,
      totalmem: os.totalmem(),
      user: os.userInfo().username,
      ifaces: ifaces(),
    }),
    'system:stats': async () => ({ cpu: cpuPercent(), total: os.totalmem(), free: os.freemem(), uptime: os.uptime() }),
    'system:top': async () => {
      const r = await ps('Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 12 Name,Id,WorkingSet64 | ConvertTo-Json -Compress');
      try {
        const j = JSON.parse(r.stdout);
        return Array.isArray(j) ? j : [j];
      } catch { return []; }
    },
  },
};
