import { h, panel, button } from '../core/ui.js';
import { invoke, on } from '../core/bridge.js';

const QUICK = ['ipconfig /all', 'netstat -ano', 'tasklist', 'systeminfo', 'whoami /all', 'arp -a'];

export default {
  id: 'terminal',
  title: 'Терминал',
  icon: '>_',
  order: 20,
  desc: 'PowerShell и cmd',
  platforms: ['win'],

  async mount(root) {
    let cwd = await invoke('terminal:home');
    let shell = 'powershell';
    let running = null;
    const history = [];
    let hi = 0;

    const out = h('pre', { class: 'term__out' });
    const prompt = h('span', { class: 'term__prompt' });
    const input = h('input', { class: 'term__in', spellcheck: 'false', autocomplete: 'off', placeholder: 'введите команду и Enter…' });
    const stop = button('Стоп', () => running && invoke('terminal:kill', { id: running }), 'danger');
    stop.hidden = true;

    const setPrompt = () => { prompt.textContent = (shell === 'cmd' ? '' : 'PS ') + cwd + '>'; };
    const print = (text, cls = '') => {
      out.append(h('span', { class: cls }, text));
      while (out.childNodes.length > 3000) out.firstChild.remove();
      out.scrollTop = out.scrollHeight;
    };
    const finish = (note) => {
      running = null;
      input.disabled = false;
      stop.hidden = true;
      if (note) print(note, 'dim');
      input.focus();
    };

    const offData = on('terminal:data', ({ id, text, err }) => { if (id === running) print(text, err ? 'err' : ''); });
    const offExit = on('terminal:exit', ({ id, code }) => { if (id === running) finish('\n[код выхода: ' + code + ']\n'); });

    async function run(raw) {
      const cmd = raw.trim();
      if (!cmd || running) return;
      history.push(cmd);
      hi = history.length;
      print(prompt.textContent + ' ' + cmd + '\n', 'cmdline');

      if (/^(cls|clear)$/i.test(cmd)) { out.replaceChildren(); return; }
      const cd = cmd.match(/^cd(?:\s+(.*))?$/i);
      if (cd) {
        try { cwd = await invoke('terminal:cd', { cwd, target: cd[1] || '~' }); setPrompt(); }
        catch (e) { print((e.message || e) + '\n', 'err'); }
        return;
      }

      const id = 'r' + Date.now();
      running = id;
      input.disabled = true;
      stop.hidden = false;
      try { await invoke('terminal:run', { id, shell, cmd, cwd }); }
      catch (e) { finish('\n' + (e.message || e) + '\n'); }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const v = input.value; input.value = ''; run(v); }
      else if (e.key === 'ArrowUp') { if (hi > 0) input.value = history[--hi]; e.preventDefault(); }
      else if (e.key === 'ArrowDown') { hi = Math.min(hi + 1, history.length); input.value = history[hi] || ''; e.preventDefault(); }
    });

    const sel = h('select', { style: { width: 'auto' }, onchange: (e) => { shell = e.target.value; setPrompt(); } },
      h('option', { value: 'powershell' }, 'PowerShell'), h('option', { value: 'cmd' }, 'cmd'));

    const chips = h('div', { class: 'chips' }, QUICK.map((c) =>
      h('button', { class: 'chip', type: 'button', onclick: () => run(c) }, c)));

    root.append(panel('Консоль',
      h('div', { class: 'row' }, sel, h('div', { class: 'grow' }, chips), stop, button('Очистить', () => out.replaceChildren(), 'ghost')),
      h('div', { class: 'term mt' }, out, h('div', { class: 'term__bar' }, prompt, input))));

    setPrompt();
    print('Терминал. Каждая команда выполняется отдельно; cd, cls и стрелки ↑↓ работают.\n', 'dim');
    input.focus();

    return () => { offData(); offExit(); if (running) invoke('terminal:kill', { id: running }); };
  },
};
