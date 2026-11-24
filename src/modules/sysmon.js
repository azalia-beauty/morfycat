import { h, panel, kv, fmtBytes, fmtUptime, drawSpark } from '../core/ui.js';
import { invoke } from '../core/bridge.js';

const N = 60; // сколько секунд истории

export default {
  id: 'sysmon',
  title: 'Мониторинг',
  icon: '▤',
  order: 30,
  desc: 'CPU, память, процессы',
  platforms: ['win'],

  async mount(root) {
    const cpuH = [], memH = [];
    const cpuCv = h('canvas', { class: 'spark', width: 640, height: 90 });
    const memCv = h('canvas', { class: 'spark', width: 640, height: 90 });
    const cpuLbl = h('span', { class: 'acc' }, '—');
    const memLbl = h('span', { class: 'acc' }, '—');
    const sys = kv();
    const tbody = h('tbody');

    const info = await invoke('system:info');
    sys.add('Хост', info.hostname + ' (' + info.user + ')');
    sys.add('ОС', info.release + ' · ' + info.arch);
    sys.add('Процессор', info.cpu + ' ×' + info.cores);
    const upEl = h('span', {}, '—');
    sys.add('Аптайм', upEl);
    (info.ifaces || []).forEach((i) => sys.add(i.name, i.address + '  ' + i.mac));

    root.append(
      h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' } },
        panel('Процессор', h('div', { class: 'small dim' }, 'Загрузка: ', cpuLbl), cpuCv),
        panel('Память', h('div', { class: 'small dim' }, 'Занято: ', memLbl), memCv)),
      panel('Система', sys),
      panel('Топ процессов по памяти',
        h('div', { style: { overflowX: 'auto' } },
          h('table', { class: 'table' },
            h('thead', {}, h('tr', {}, ['Процесс', 'PID', 'Память'].map((t) => h('th', {}, t)))), tbody))));

    let alive = true;
    async function tick() {
      try {
        const s = await invoke('system:stats');
        if (!alive) return;
        const memPct = Math.round((1 - s.free / s.total) * 100);
        cpuH.push(s.cpu); memH.push(memPct);
        if (cpuH.length > N) { cpuH.shift(); memH.shift(); }
        cpuLbl.textContent = s.cpu + '%';
        memLbl.textContent = memPct + '%  (' + fmtBytes(s.total - s.free) + ' из ' + fmtBytes(s.total) + ')';
        upEl.textContent = fmtUptime(s.uptime);
        drawSpark(cpuCv, cpuH, { color: '#2ee6ff' });
        drawSpark(memCv, memH, { color: '#6dff8a' });
      } catch { /* пропускаем тик */ }
    }
    async function procs() {
      try {
        const list = await invoke('system:top');
        if (!alive) return;
        tbody.replaceChildren(...list.map((p) => h('tr', {}, h('td', {}, p.Name), h('td', {}, String(p.Id)), h('td', {}, fmtBytes(p.WorkingSet64)))));
      } catch { /* ignore */ }
    }

    await tick(); procs();
    const t1 = setInterval(tick, 1000);
    const t2 = setInterval(procs, 4000);
    return () => { alive = false; clearInterval(t1); clearInterval(t2); };
  },
};
