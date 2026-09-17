/* ============ Windows 11 Web — core apps ============ */
'use strict';

const HOME = 'C:/Users/Seefood';
const TOUCH = matchMedia('(pointer: coarse)').matches;

/* open a VFS file with the right app */
function openFile(path) {
  const node = FS.get(path);
  if (!node) return;
  if (node.type === 'folder') { Apps.launch('explorer', { path }); return; }
  const ext = (path.split('.').pop() || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp'].includes(ext)) Apps.launch('photos', { path });
  else if (['doc', 'docx'].includes(ext)) Apps.launch('word', { path });
  else if (['xls', 'xlsx'].includes(ext)) Apps.launch('excel', { path });
  else if (['ppt', 'pptx'].includes(ext)) Apps.launch('powerpoint', { path });
  else if (['mp3', 'wav', 'ogg', 'm4a', 'mp4', 'webm', 'synth'].includes(ext)) Apps.launch('mediaplayer', { path });
  else Apps.launch('notepad', { path });
}

/* ---------- File Explorer ---------- */
Apps.register({
  id: 'explorer', name: 'File Explorer', icon: '📁', color: 'linear-gradient(135deg,#ffd76e,#ffb02e)',
  category: 'System', width: 900, height: 580,
  mount(win, args) {
    let cwd = args.path || HOME;
    let history = [cwd], hIdx = 0, selected = null;
    win.body.innerHTML = `
      <div class="fx-root">
        <div class="app-toolbar">
          <button class="fx-back" title="Back">←</button>
          <button class="fx-fwd" title="Forward">→</button>
          <button class="fx-up" title="Up">↑</button>
          <div class="fx-breadcrumb"></div>
          <button class="fx-newfolder">➕ New folder</button>
          <button class="fx-newfile">📄 New file</button>
        </div>
        <div class="fx-main">
          <div class="fx-side"></div>
          <div class="fx-files"></div>
        </div>
        <div class="fx-status"></div>
      </div>`;
    const $ = s => win.body.querySelector(s);
    const sideDirs = [
      ['🏠', 'Home', HOME], ['🖥️', 'Desktop', HOME + '/Desktop'], ['📄', 'Documents', HOME + '/Documents'],
      ['🖼️', 'Pictures', HOME + '/Pictures'], ['🎵', 'Music', HOME + '/Music'], ['🎬', 'Videos', HOME + '/Videos'],
      ['⬇️', 'Downloads', HOME + '/Downloads'], ['💽', 'Local Disk (C:)', 'C:'],
      ['🗑️', 'Recycle Bin', FS.binPath]
    ];
    $('.fx-side').innerHTML = sideDirs.map(([i, n, p]) =>
      `<div class="fx-side-item" data-p="${p}"><span>${i}</span><span>${n}</span></div>`).join('');
    $('.fx-side').addEventListener('click', e => {
      const it = e.target.closest('.fx-side-item');
      if (it) nav(it.dataset.p);
    });

    function nav(path, skipHistory) {
      if (!FS.get(path)) return;
      cwd = path;
      if (!skipHistory) { history = history.slice(0, hIdx + 1); history.push(path); hIdx = history.length - 1; }
      selected = null;
      render();
    }
    function render() {
      win.setTitle((cwd.split('/').pop() || 'C:') + ' - File Explorer');
      win.body.querySelectorAll('.fx-side-item').forEach(it => it.classList.toggle('sel', it.dataset.p === cwd));
      const crumbs = ['C:', ...cwd.replace(/\\/g, '/').split('/').filter(p => p && p !== 'C:')];
      let acc = '';
      $('.fx-breadcrumb').innerHTML = crumbs.map((c, i) => {
        acc = i === 0 ? 'C:' : acc + '/' + c;
        return `<span class="fx-crumb" data-p="${acc}">${Utils.esc(c)}</span>` + (i < crumbs.length - 1 ? '<span> › </span>' : '');
      }).join('');
      const items = FS.list(cwd);
      $('.fx-files').innerHTML = items.map(it =>
        `<div class="fx-item" data-n="${Utils.esc(it.name)}"><div class="fx-ico">${fileIcon(it.name, it.node)}</div><div class="fx-name">${Utils.esc(it.name)}</div></div>`
      ).join('') || '<div style="grid-column:1/-1;text-align:center;color:var(--text-2);padding:40px">This folder is empty.</div>';
      $('.fx-status').textContent = items.length + ' item' + (items.length === 1 ? '' : 's');
    }
    $('.fx-breadcrumb').addEventListener('click', e => {
      const c = e.target.closest('.fx-crumb');
      if (c) nav(c.dataset.p);
    });
    $('.fx-back').addEventListener('click', () => { if (hIdx > 0) { hIdx--; cwd = history[hIdx]; render(); } });
    $('.fx-fwd').addEventListener('click', () => { if (hIdx < history.length - 1) { hIdx++; cwd = history[hIdx]; render(); } });
    $('.fx-up').addEventListener('click', () => {
      const parts = cwd.split('/'); parts.pop();
      nav(parts.join('/') || 'C:');
    });
    $('.fx-newfolder').addEventListener('click', () => {
      FS.mkdir(cwd + '/' + FS.uniqueName(cwd, 'New folder', ''));
    });
    $('.fx-newfile').addEventListener('click', () => {
      FS.write(cwd + '/' + FS.uniqueName(cwd, 'New Text Document', '.txt'), '', 'text/plain');
    });
    const files = $('.fx-files');
    const inBin = () => cwd === FS.binPath || cwd.startsWith(FS.binPath + '/');
    files.addEventListener('click', e => {
      const it = e.target.closest('.fx-item');
      files.querySelectorAll('.fx-item').forEach(x => x.classList.remove('sel'));
      selected = it ? it.dataset.n : null;
      if (it) {
        it.classList.add('sel');
        if (TOUCH && !inBin()) openFile(cwd + '/' + it.dataset.n);
      }
    });
    files.addEventListener('dblclick', e => {
      const it = e.target.closest('.fx-item');
      if (it && !inBin()) openFile(cwd + '/' + it.dataset.n);
    });
    files.addEventListener('contextmenu', e => {
      e.preventDefault();
      const it = e.target.closest('.fx-item');
      if (it && inBin()) {
        Shell.contextMenu(e.clientX, e.clientY, [
          { label: 'Restore', icon: '↩️', fn: () => FS.restoreFromBin(it.dataset.n) },
          { sep: true },
          { label: 'Delete permanently', icon: '❌', fn: () => { if (confirm('Permanently delete "' + it.dataset.n + '"?')) FS.remove(cwd + '/' + it.dataset.n); } }
        ]);
      } else if (it) {
        const p = cwd + '/' + it.dataset.n;
        const items = [
          { label: 'Open', icon: '📂', fn: () => openFile(p) }
        ];
        if (/\.(png|jpe?g|svg|gif|bmp|webp)$/i.test(it.dataset.n)) {
          items.push({ label: 'Edit in Paint', icon: '🎨', fn: () => Apps.launch('paint', { path: p }) });
        }
        items.push(
          { label: 'Rename', icon: '✏️', fn: () => {
            const n = prompt('Rename to:', it.dataset.n);
            if (n) FS.rename(p, n);
          } },
          { sep: true },
          { label: 'Delete', icon: '🗑️', fn: () => FS.recycle(p) }
        );
        Shell.contextMenu(e.clientX, e.clientY, items);
      } else if (inBin()) {
        Shell.contextMenu(e.clientX, e.clientY, [
          { label: 'Empty Recycle Bin', icon: '🗑️', fn: () => { if (!FS.binCount() || confirm('Permanently delete all items in the Recycle Bin?')) FS.emptyBin(); } },
          { label: 'Refresh', icon: '🔄', fn: render }
        ]);
      } else {
        Shell.contextMenu(e.clientX, e.clientY, [
          { label: 'New folder', icon: '📁', fn: () => FS.mkdir(cwd + '/' + FS.uniqueName(cwd, 'New folder', '')) },
          { label: 'New text file', icon: '📄', fn: () => FS.write(cwd + '/' + FS.uniqueName(cwd, 'New Text Document', '.txt'), '', 'text/plain') },
          { label: 'Refresh', icon: '🔄', fn: render }
        ]);
      }
    });
    const onFs = () => { if (FS.get(cwd)) render(); else nav(HOME); };
    Bus.on('fs:changed', onFs);
    render();
  }
});

/* ---------- Notepad ---------- */
Apps.register({
  id: 'notepad', name: 'Notepad', icon: '📝', color: 'linear-gradient(135deg,#6ec6ff,#2286c3)',
  category: 'Productivity', width: 700, height: 500,
  mount(win, args) {
    let path = args.path || null;
    win.body.innerHTML = `
      <div class="app-toolbar">
        <button class="np-new">New</button>
        <button class="np-save">Save</button>
        <button class="np-saveas">Save As…</button>
        <span style="margin-left:auto;font-size:12px;color:var(--text-2)" class="np-status"></span>
      </div>
      <textarea class="notepad-area" spellcheck="false" placeholder="Start typing…"></textarea>`;
    const area = win.body.querySelector('.notepad-area');
    const status = win.body.querySelector('.np-status');
    function loadFile() {
      if (path) {
        const n = FS.get(path);
        area.value = n ? String(n.content) : '';
        win.setTitle((path.split('/').pop()) + ' - Notepad');
      } else win.setTitle('Untitled - Notepad');
    }
    function save(as) {
      if (!path || as) {
        const name = prompt('Save as (in Documents):', path ? path.split('/').pop() : 'note.txt');
        if (!name) return;
        path = HOME + '/Documents/' + name;
      }
      FS.write(path, area.value, 'text/plain');
      win.setTitle(path.split('/').pop() + ' - Notepad');
      status.textContent = 'Saved ✓';
      setTimeout(() => status.textContent = '', 1600);
    }
    win.body.querySelector('.np-new').addEventListener('click', () => { path = null; area.value = ''; loadFile(); });
    win.body.querySelector('.np-save').addEventListener('click', () => save(false));
    win.body.querySelector('.np-saveas').addEventListener('click', () => save(true));
    area.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(false); }
    });
    loadFile();
  }
});

/* ---------- Calculator ---------- */
Apps.register({
  id: 'calculator', name: 'Calculator', icon: '🧮', color: 'linear-gradient(135deg,#7ee8a2,#28a745)',
  category: 'Utilities', width: 340, height: 500,
  mount(win) {
    win.body.innerHTML = `
      <div class="calc-root">
        <div class="calc-display"><div class="calc-expr"></div><div class="calc-value">0</div></div>
        <div class="calc-grid"></div>
      </div>`;
    const exprEl = win.body.querySelector('.calc-expr');
    const valEl = win.body.querySelector('.calc-value');
    const grid = win.body.querySelector('.calc-grid');
    const keys = ['%', 'CE', 'C', '⌫', '1/x', 'x²', '√x', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '±', '0', '.', '='];
    grid.innerHTML = keys.map(k => {
      const cls = k === '=' ? 'eq' : ('÷×−+%'.includes(k) || ['CE', 'C', '⌫', '1/x', 'x²', '√x', '±'].includes(k)) ? 'op' : '';
      return `<button class="${cls}" data-k="${k}">${k}</button>`;
    }).join('');
    let cur = '0', prev = null, op = null, fresh = true;
    const fmt = n => {
      if (!isFinite(n)) return 'Cannot divide by zero';
      return String(Math.round(n * 1e10) / 1e10);
    };
    function calc() {
      const a = parseFloat(prev), b = parseFloat(cur);
      switch (op) {
        case '+': return a + b; case '−': return a - b;
        case '×': return a * b; case '÷': return a / b;
        case '%': return a % b;
      }
      return b;
    }
    function press(k) {
      if (/^[0-9]$/.test(k)) { cur = (fresh || cur === '0') ? k : cur + k; fresh = false; }
      else if (k === '.') { if (fresh) { cur = '0.'; fresh = false; } else if (!cur.includes('.')) cur += '.'; }
      else if (k === 'C') { cur = '0'; prev = null; op = null; fresh = true; exprEl.textContent = ''; }
      else if (k === 'CE') { cur = '0'; fresh = true; }
      else if (k === '⌫') { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; }
      else if (k === '±') { cur = fmt(-parseFloat(cur)); }
      else if (k === 'x²') { exprEl.textContent = `sqr(${cur})`; cur = fmt(Math.pow(parseFloat(cur), 2)); fresh = true; }
      else if (k === '√x') { exprEl.textContent = `√(${cur})`; cur = fmt(Math.sqrt(parseFloat(cur))); fresh = true; }
      else if (k === '1/x') { exprEl.textContent = `1/(${cur})`; cur = fmt(1 / parseFloat(cur)); fresh = true; }
      else if (k === '=') {
        if (op !== null && prev !== null) {
          exprEl.textContent = `${prev} ${op} ${cur} =`;
          cur = fmt(calc()); prev = null; op = null; fresh = true;
        }
      } else { // binary op
        if (op !== null && prev !== null && !fresh) cur = fmt(calc());
        prev = cur; op = k; fresh = true;
        exprEl.textContent = `${prev} ${op}`;
      }
      valEl.textContent = cur;
      valEl.style.fontSize = cur.length > 12 ? '24px' : '40px';
    }
    grid.addEventListener('click', e => {
      const b = e.target.closest('button[data-k]');
      if (b) press(b.dataset.k);
    });
    // keyboard input
    win.body.tabIndex = 0;
    win.body.addEventListener('keydown', e => {
      const map = {
        '/': '÷', '*': '×', '-': '−', '+': '+', '%': '%',
        Enter: '=', '=': '=', Backspace: '⌫', Delete: 'CE', Escape: 'C', '.': '.'
      };
      const k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
      if (k !== undefined) { e.preventDefault(); press(k); }
    });
    setTimeout(() => win.body.focus(), 100);
  }
});

/* ---------- Terminal ---------- */
Apps.register({
  id: 'terminal', name: 'Terminal', icon: '⬛', color: 'linear-gradient(135deg,#3a3a3a,#111)',
  category: 'System', width: 760, height: 460,
  mount(win) {
    win.body.innerHTML = `<div class="term-root"></div>`;
    const root = win.body.querySelector('.term-root');
    let cwd = HOME;
    const println = (s, color) => {
      const l = Utils.el('div', 't-line');
      l.textContent = s;
      if (color) l.style.color = color;
      root.insertBefore(l, root.lastElementChild);
    };
    function promptLine() {
      const row = Utils.el('div', 't-line term-in');
      row.innerHTML = `<span>${Utils.esc(cwd.replace(/\//g, '\\'))}&gt;&nbsp;</span><input spellcheck="false" autocomplete="off">`;
      root.appendChild(row);
      const input = row.querySelector('input');
      input.focus();
      input.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        const cmd = input.value;
        row.innerHTML = `<span>${Utils.esc(cwd.replace(/\//g, '\\'))}&gt; ${Utils.esc(cmd)}</span>`;
        run(cmd);
        promptLine();
        root.scrollTop = root.scrollHeight;
      });
    }
    function resolve(p) {
      if (!p) return cwd;
      p = p.replace(/\\/g, '/');
      if (/^c:/i.test(p)) return 'C:' + p.slice(2);
      if (p === '..') { const a = cwd.split('/'); a.pop(); return a.join('/') || 'C:'; }
      if (p === '.') return cwd;
      return cwd + '/' + p;
    }
    function run(line) {
      const [cmd, ...rest] = line.trim().split(/\s+/);
      const arg = rest.join(' ');
      const out = s => s.split('\n').forEach(x => print(x));
      const print = s => { const l = Utils.el('div', 't-line'); l.textContent = s; root.appendChild(l); };
      if (!cmd) return;
      switch (cmd.toLowerCase()) {
        case 'help':
          out('Available commands:\n  dir / ls        list directory\n  cd <dir>        change directory\n  type / cat <f>  print a file\n  echo <t> > <f>  write text to a file\n  mkdir <dir>     create directory\n  del / rm <f>    delete file or folder\n  tree            directory tree\n  start <app>     launch an app (e.g. start notepad)\n  apps            list app ids\n  cls / clear     clear screen\n  ver, whoami, date\n\nFun stuff:\n  cowsay, fortune, neofetch, sl, clippy, screensaver [style],\n  party, bsod, achievements, hiscores, taskmgr, lock'); break;
        case 'dir': case 'ls': {
          const items = FS.list(resolve(arg));
          if (!FS.get(resolve(arg))) { print('The system cannot find the path specified.'); break; }
          items.forEach(i => print((i.node.type === 'folder' ? '<DIR>   ' : '        ') + i.name));
          print(items.length + ' item(s)'); break;
        }
        case 'cd': {
          if (!arg) { print(cwd.replace(/\//g, '\\')); break; }
          const t = resolve(arg), n = FS.get(t);
          if (n && n.type === 'folder') cwd = t;
          else print('The system cannot find the path specified.');
          break;
        }
        case 'type': case 'cat': {
          const n = FS.get(resolve(arg));
          if (n && n.type === 'file') out(String(n.content).slice(0, 4000));
          else print('File not found.');
          break;
        }
        case 'echo': {
          const m = arg.match(/^(.*?)\s*>\s*(\S+)$/);
          if (m) { FS.write(resolve(m[2]), m[1], 'text/plain'); }
          else print(arg);
          break;
        }
        case 'mkdir': case 'md': FS.mkdir(resolve(arg)) ? null : print('Unable to create directory.'); break;
        case 'del': case 'rm': FS.remove(resolve(arg)) ? print('Deleted.') : print('Could not find ' + arg); break;
        case 'tree': {
          const walk = (path, prefix) => {
            FS.list(path).forEach(i => {
              print(prefix + '├── ' + i.name);
              if (i.node.type === 'folder') walk(path + '/' + i.name, prefix + '│   ');
            });
          };
          print(resolve(arg).replace(/\//g, '\\')); walk(resolve(arg), ''); break;
        }
        case 'start': {
          const app = Apps.get(arg.toLowerCase());
          if (app && Apps.isInstalled(app.id)) { Apps.launch(app.id); print('Launching ' + app.name + '...'); }
          else print('App not found: ' + arg + ' (try "apps")');
          break;
        }
        case 'apps': Apps.visible().forEach(a => print('  ' + a.id.padEnd(14) + a.name)); break;
        case 'cls': case 'clear': root.innerHTML = ''; break;
        case 'ver': print('Windows 11 Web [Version 11.0.2026.728]'); break;
        case 'whoami': print('desktop-web\\seefood'); break;
        case 'date': print(new Date().toString()); break;
        case 'exit': win.close(); break;
        default:
          if (Object.prototype.hasOwnProperty.call(FunCmds, cmd.toLowerCase())) { FunCmds[cmd.toLowerCase()](print, arg, win); break; }
          print(`'${cmd}' is not recognized as an internal or external command. Type "help".`);
      }
      Bus.emit('terminal:cmd', cmd);
    }
    const l1 = Utils.el('div', 't-line'); l1.textContent = 'Windows 11 Web [Version 11.0.2026.728]';
    const l2 = Utils.el('div', 't-line'); l2.textContent = '(c) A browser near you. Type "help" to get started.';
    const l3 = Utils.el('div', 't-line'); l3.textContent = '';
    root.append(l1, l2, l3);
    promptLine();
    root.addEventListener('click', () => { const i = root.querySelector('input'); if (i && !getSelection().toString()) i.focus(); });
  }
});

/* ---------- Paint ---------- */
Apps.register({
  id: 'paint', name: 'Paint', icon: '🎨', color: 'linear-gradient(135deg,#ffb2c8,#e2486d)',
  category: 'Creativity', width: 980, height: 660,
  mount(win, args) {
    const TOOLS = [
      ['brush', '🖌️', 'Brush (B)'], ['pencil', '✏️', 'Pencil (P)'], ['marker', '🖍️', 'Marker (M)'],
      ['spray', '💨', 'Spray (A)'], ['eraser', '🧽', 'Eraser (E)'], ['fill', '🪣', 'Fill (F)'],
      ['picker', '💧', 'Pick color (I)'], ['text', '🅰️', 'Text (T)']
    ];
    const SHAPES = [
      ['line', '╱', 'Line'], ['rect', '▭', 'Rectangle'], ['ellipse', '◯', 'Ellipse'],
      ['triangle', '△', 'Triangle'], ['arrow', '➔', 'Arrow'], ['star', '★', 'Star']
    ];
    const SHAPE_IDS = SHAPES.map(s => s[0]);
    const PALETTE = ['#000000', '#7f7f7f', '#c3c3c3', '#ffffff', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4', '#ffaec9', '#b97a57'];
    win.body.innerHTML = `
      <div class="app-toolbar">
        ${TOOLS.map(([t, i, tip], n) => `<button class="pt-tool ${n === 0 ? 'on' : ''}" data-t="${t}" title="${tip}">${i}</button>`).join('')}
        <div class="sep"></div>
        ${SHAPES.map(([t, i, tip]) => `<button class="pt-tool" data-t="${t}" title="${tip}">${i}</button>`).join('')}
        <select class="pt-fillmode" title="Shape style"><option value="outline">Outline</option><option value="filled">Filled</option><option value="both">Both</option></select>
        <div class="sep"></div>
        <button class="pt-undo" title="Undo (Ctrl+Z)">↶</button>
        <button class="pt-redo" title="Redo (Ctrl+Y)">↷</button>
        <button class="pt-clear" title="Clear canvas">🗑️</button>
        <div class="sep"></div>
        <button class="pt-open" title="Open image">📂</button>
        <button class="pt-save" title="Save to Pictures (Ctrl+S)">💾</button>
        <button class="pt-dl" title="Download as PNG">⬇️</button>
      </div>
      <div class="app-toolbar">
        <div class="paint-palette">
          ${PALETTE.map((c, i) => `<div class="pt-swatch ${i === 0 ? 'sel' : ''}" data-c="${c}" style="background:${c}"></div>`).join('')}
          <input type="color" class="pt-color" value="#000000" title="Custom color">
        </div>
        <div class="sep"></div>
        <span class="paint-lbl">Size</span>
        <input type="range" class="pt-size" min="1" max="64" value="6" style="width:110px" title="Brush size">
        <span class="paint-lbl pt-size-val">6px</span>
        <span class="paint-lbl" style="margin-left:8px">Opacity</span>
        <input type="range" class="pt-alpha" min="10" max="100" value="100" style="width:90px" title="Opacity">
      </div>
      <div class="paint-canvas-wrap"><canvas></canvas><div class="brush-cursor"></div></div>
      <div class="paint-status"><span class="ps-pos"></span><span class="ps-info"></span></div>
      <input type="file" accept="image/*" style="display:none">`;
    const $ = s => win.body.querySelector(s);
    const cv = $('canvas'), wrap = $('.paint-canvas-wrap'), cursorEl = $('.brush-cursor');
    const fileInput = $('input[type=file]');
    // size the canvas to the window it opened in
    cv.width = Utils.clamp(wrap.clientWidth - 28, 320, 1400);
    cv.height = Utils.clamp(wrap.clientHeight - 28, 240, 900);
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    $('.ps-info').textContent = cv.width + ' × ' + cv.height + 'px';

    let tool = 'brush', drawing = false, sx = 0, sy = 0, last = null, lastMid = null;
    let previewSnap = null, sprayTimer = null, sprayPos = null, fileName = null;
    const color = () => $('.pt-color').value;
    const size = () => +$('.pt-size').value;
    const alpha = () => +$('.pt-alpha').value / 100;
    const fillMode = () => $('.pt-fillmode').value;
    const isShape = t => SHAPE_IDS.includes(t);

    /* ----- undo / redo (snapshot before each committed action) ----- */
    const undoStack = [], redoStack = [];
    const grab = () => ctx.getImageData(0, 0, cv.width, cv.height);
    function updHistBtns() {
      $('.pt-undo').style.opacity = undoStack.length ? 1 : 0.35;
      $('.pt-redo').style.opacity = redoStack.length ? 1 : 0.35;
    }
    function snapshot() {
      undoStack.push(grab());
      if (undoStack.length > 15) undoStack.shift();
      redoStack.length = 0;
      updHistBtns();
    }
    function undo() {
      if (!undoStack.length) return;
      redoStack.push(grab());
      ctx.putImageData(undoStack.pop(), 0, 0);
      updHistBtns();
    }
    function redo() {
      if (!redoStack.length) return;
      undoStack.push(grab());
      ctx.putImageData(redoStack.pop(), 0, 0);
      updHistBtns();
    }
    updHistBtns();

    /* ----- tools / colors UI ----- */
    function selectTool(t) {
      tool = t;
      win.body.querySelectorAll('.pt-tool').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    }
    win.body.querySelectorAll('.pt-tool').forEach(b => b.addEventListener('click', () => selectTool(b.dataset.t)));
    function setColor(hex) {
      $('.pt-color').value = hex;
      win.body.querySelectorAll('.pt-swatch').forEach(s => s.classList.toggle('sel', s.dataset.c === hex));
    }
    win.body.querySelectorAll('.pt-swatch').forEach(s => s.addEventListener('click', () => setColor(s.dataset.c)));
    $('.pt-color').addEventListener('input', () => setColor($('.pt-color').value));
    $('.pt-size').addEventListener('input', () => $('.pt-size-val').textContent = size() + 'px');

    function applyStyle() {
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.lineWidth = tool === 'pencil' ? 1 : tool === 'eraser' ? size() * 2 : size();
      ctx.globalAlpha = tool === 'eraser' ? 1 : tool === 'marker' ? Math.min(alpha(), 0.35) : alpha();
      ctx.strokeStyle = ctx.fillStyle = tool === 'eraser' ? '#ffffff' : color();
    }

    /* ----- drawing primitives ----- */
    const pos = e => {
      const r = cv.getBoundingClientRect();
      return [Math.round(e.clientX - r.left), Math.round(e.clientY - r.top)];
    };
    function dot(x, y) {
      ctx.beginPath();
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    function drawShape(t, x, y, shift) {
      if (shift) {
        if (t === 'line' || t === 'arrow') {
          const ang = Math.atan2(y - sy, x - sx);
          const snapAng = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
          const len = Math.hypot(x - sx, y - sy);
          x = sx + Math.cos(snapAng) * len; y = sy + Math.sin(snapAng) * len;
        } else {
          const s = Math.max(Math.abs(x - sx), Math.abs(y - sy));
          x = sx + Math.sign(x - sx || 1) * s;
          y = sy + Math.sign(y - sy || 1) * s;
        }
      }
      const mode = fillMode();
      ctx.beginPath();
      if (t === 'line') { ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke(); return; }
      if (t === 'arrow') {
        const ang = Math.atan2(y - sy, x - sx), hd = Math.max(12, ctx.lineWidth * 3);
        ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - hd * Math.cos(ang - 0.45), y - hd * Math.sin(ang - 0.45));
        ctx.lineTo(x - hd * Math.cos(ang + 0.45), y - hd * Math.sin(ang + 0.45));
        ctx.closePath(); ctx.fill();
        return;
      }
      if (t === 'rect') ctx.rect(Math.min(sx, x), Math.min(sy, y), Math.abs(x - sx), Math.abs(y - sy));
      else if (t === 'ellipse') ctx.ellipse((sx + x) / 2, (sy + y) / 2, Math.abs(x - sx) / 2, Math.abs(y - sy) / 2, 0, 0, Math.PI * 2);
      else if (t === 'triangle') {
        ctx.moveTo((sx + x) / 2, Math.min(sy, y));
        ctx.lineTo(Math.min(sx, x), Math.max(sy, y));
        ctx.lineTo(Math.max(sx, x), Math.max(sy, y));
        ctx.closePath();
      } else if (t === 'star') {
        const cx = (sx + x) / 2, cy = (sy + y) / 2;
        const R = Math.max(Math.abs(x - sx), Math.abs(y - sy)) / 2, r = R * 0.42;
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 ? r : R, a = -Math.PI / 2 + i * Math.PI / 5;
          const px = cx + rad * Math.cos(a), py = cy + rad * Math.sin(a);
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
      }
      if (mode !== 'outline') ctx.fill();
      if (mode !== 'filled') ctx.stroke();
    }
    function floodFill(x, y, hex) {
      const img = ctx.getImageData(0, 0, cv.width, cv.height);
      const d = img.data, W = cv.width, H = cv.height;
      const idx = (x, y) => (y * W + x) * 4;
      const i0 = idx(x, y);
      const target = [d[i0], d[i0 + 1], d[i0 + 2]];
      const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
      if (target[0] === r && target[1] === g && target[2] === b) return;
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
        const i = idx(cx, cy);
        if (Math.abs(d[i] - target[0]) > 12 || Math.abs(d[i + 1] - target[1]) > 12 || Math.abs(d[i + 2] - target[2]) > 12) continue;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      ctx.putImageData(img, 0, 0);
    }
    function stopSpray() {
      clearInterval(sprayTimer);
      sprayTimer = null;
    }

    /* ----- pointer handling ----- */
    cv.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      [sx, sy] = pos(e);
      applyStyle();
      if (tool === 'fill') { snapshot(); ctx.globalAlpha = 1; floodFill(sx, sy, color()); return; }
      if (tool === 'picker') {
        const d = ctx.getImageData(sx, sy, 1, 1).data;
        setColor('#' + [d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join(''));
        selectTool('brush');
        return;
      }
      if (tool === 'text') {
        const txt = prompt('Text to add:');
        if (txt) {
          snapshot();
          applyStyle();
          ctx.font = Math.max(14, size() * 3) + 'px "Segoe UI", sans-serif';
          ctx.textBaseline = 'middle';
          ctx.fillText(txt, sx, sy);
        }
        return;
      }
      snapshot();
      drawing = true;
      cv.setPointerCapture(e.pointerId);
      if (isShape(tool)) {
        previewSnap = grab();
      } else if (tool === 'spray') {
        sprayPos = { x: sx, y: sy };
        sprayTimer = setInterval(() => {
          applyStyle();
          ctx.globalAlpha = Math.min(alpha(), 0.7);
          for (let i = 0; i < size() * 1.5 + 8; i++) {
            const a = Math.random() * Math.PI * 2, r = Math.random() * size() * 1.6;
            ctx.fillRect(sprayPos.x + Math.cos(a) * r, sprayPos.y + Math.sin(a) * r, 1.3, 1.3);
          }
        }, 25);
      } else {
        last = { x: sx, y: sy };
        lastMid = { x: sx, y: sy };
        dot(sx, sy);
      }
    });
    cv.addEventListener('pointermove', e => {
      const [x, y] = pos(e);
      $('.ps-pos').textContent = x + ', ' + y + 'px';
      // brush-size cursor preview
      if (['brush', 'pencil', 'marker', 'eraser', 'spray'].includes(tool)) {
        const w = tool === 'pencil' ? 3 : tool === 'eraser' ? size() * 2 : size();
        cursorEl.style.cssText = `display:block;width:${w}px;height:${w}px;left:${cv.offsetLeft + x}px;top:${cv.offsetTop + y}px`;
      } else cursorEl.style.display = 'none';
      if (!drawing) return;
      applyStyle();
      if (isShape(tool)) {
        ctx.putImageData(previewSnap, 0, 0);
        drawShape(tool, x, y, e.shiftKey);
      } else if (tool === 'spray') {
        sprayPos = { x, y };
      } else {
        // midpoint-smoothed stroke
        const mid = { x: (last.x + x) / 2, y: (last.y + y) / 2 };
        ctx.beginPath();
        ctx.moveTo(lastMid.x, lastMid.y);
        ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
        ctx.stroke();
        lastMid = mid;
        last = { x, y };
      }
    });
    const endStroke = () => {
      drawing = false;
      previewSnap = null;
      stopSpray();
      ctx.globalAlpha = 1;
    };
    cv.addEventListener('pointerup', endStroke);
    cv.addEventListener('pointercancel', endStroke);
    cv.addEventListener('pointerleave', () => { if (!drawing) cursorEl.style.display = 'none'; });

    /* ----- open / save / download ----- */
    function loadImage(src, skipSnapshot) {
      const img = new Image();
      img.onload = () => {
        if (!skipSnapshot) snapshot();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
        const sc = Math.min(cv.width / img.width, cv.height / img.height, 1);
        const w = img.width * sc, h = img.height * sc;
        ctx.drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
      };
      img.src = src;
    }
    $('.pt-open').addEventListener('click', e => {
      e.stopPropagation(); // the same click would immediately close the menu via the document handler
      const pics = FS.list(HOME + '/Pictures')
        .filter(f => f.node.type === 'file' && /\.(png|jpe?g|svg|gif|bmp|webp)$/i.test(f.name)).slice(0, 10);
      const items = pics.map(f => ({ label: f.name, icon: '🖼️', fn: () => loadImage(f.node.content) }));
      if (items.length) items.push({ sep: true });
      items.push({ label: 'From this device…', icon: '⬆️', fn: () => fileInput.click() });
      const r = e.currentTarget.getBoundingClientRect();
      Shell.contextMenu(r.left, r.bottom + 4, items);
    });
    fileInput.addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => loadImage(r.result);
      r.readAsDataURL(f);
    });
    function save(forcePrompt) {
      let name = fileName;
      if (!name || forcePrompt) {
        name = prompt('Save as (in Pictures):', name || 'Drawing');
        if (!name) return;
      }
      fileName = name.replace(/\.png$/i, '');
      FS.write(HOME + '/Pictures/' + fileName + '.png', cv.toDataURL('image/png'), 'image/png');
      win.setTitle(fileName + '.png - Paint');
      Shell.toast('Paint', 'Saved to Pictures/' + fileName + '.png', '🎨');
    }
    $('.pt-save').addEventListener('click', () => save(false));
    $('.pt-dl').addEventListener('click', () => {
      const a = document.createElement('a');
      a.href = cv.toDataURL('image/png');
      a.download = (fileName || 'drawing') + '.png';
      a.click();
    });
    $('.pt-undo').addEventListener('click', undo);
    $('.pt-redo').addEventListener('click', redo);
    $('.pt-clear').addEventListener('click', () => {
      snapshot();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    });

    /* ----- keyboard shortcuts ----- */
    win.body.tabIndex = 0;
    win.body.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      else if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(false); }
      else if (!mod) {
        const keyTool = { b: 'brush', p: 'pencil', m: 'marker', a: 'spray', e: 'eraser', f: 'fill', i: 'picker', t: 'text' }[e.key.toLowerCase()];
        if (keyTool) selectTool(keyTool);
        else if (e.key === '[') { $('.pt-size').value = Math.max(1, size() - 2); $('.pt-size-val').textContent = size() + 'px'; }
        else if (e.key === ']') { $('.pt-size').value = Math.min(64, size() + 2); $('.pt-size-val').textContent = size() + 'px'; }
      }
    });
    win.onClose(stopSpray);

    // opened with an image file (e.g. "Edit in Paint" from Explorer)
    if (args.path) {
      const n = FS.get(args.path);
      if (n) {
        loadImage(n.content, true); // base image load isn't an undoable action
        fileName = args.path.split('/').pop().replace(/\.\w+$/, '');
        win.setTitle(fileName + ' - Paint');
      }
    }
    setTimeout(() => win.body.focus(), 100);
  }
});

/* ---------- Photos ---------- */
Apps.register({
  id: 'photos', name: 'Photos', icon: '🏞️', color: 'linear-gradient(135deg,#6dd5fa,#2980b9)',
  category: 'Creativity', width: 900, height: 600,
  mount(win, args) {
    function allImages() {
      const out = [];
      const walk = (path, node) => {
        for (const [name, n] of Object.entries(node.children || {})) {
          const p = path + '/' + name;
          if (n.type === 'folder') walk(p, n);
          else if (/\.(png|jpe?g|gif|svg|bmp|webp)$/i.test(name)) out.push({ path: p, name, src: n.content });
        }
      };
      const picsRoot = FS.get(HOME + '/Pictures');
      if (picsRoot) walk(HOME + '/Pictures', picsRoot);
      return out;
    }
    let viewing = args.path ? allImages().findIndex(i => i.path === args.path) : -1;
    if (args.path && viewing < 0) {
      const n = FS.get(args.path);
      if (n) { // image outside Pictures — view standalone
        win.body.innerHTML = `<div class="photo-viewer"><img src="${n.content}"></div>`;
        win.setTitle(args.path.split('/').pop() + ' - Photos');
        return;
      }
    }
    function render() {
      const imgs = allImages();
      if (viewing >= 0 && imgs[viewing]) {
        const img = imgs[viewing];
        win.setTitle(img.name + ' - Photos');
        win.body.innerHTML = `
          <div class="app-toolbar">
            <button class="pv-back">← All photos</button>
            <span style="font-size:12px;color:var(--text-2)">${Utils.esc(img.name)} (${viewing + 1} of ${imgs.length})</span>
            <button class="pv-wall" style="margin-left:auto">🖼️ Set as wallpaper</button>
          </div>
          <div class="photo-viewer">
            <img src="${img.src}">
            <button class="pv-nav" style="left:12px">‹</button>
            <button class="pv-nav" style="right:12px">›</button>
          </div>`;
        win.body.querySelector('.pv-back').addEventListener('click', () => { viewing = -1; render(); });
        const navs = win.body.querySelectorAll('.pv-nav');
        navs[0].addEventListener('click', () => { viewing = (viewing - 1 + imgs.length) % imgs.length; render(); });
        navs[1].addEventListener('click', () => { viewing = (viewing + 1) % imgs.length; render(); });
        win.body.querySelector('.pv-wall').addEventListener('click', () => {
          Settings.set('wallpaper', 'custom:' + img.src);
          Shell.toast('Photos', 'Wallpaper updated', '🖼️');
        });
      } else {
        win.setTitle('Photos');
        win.body.innerHTML = `
          <div class="app-toolbar">
            <span style="font-weight:600">All photos</span>
            <label class="tool-btn" style="margin-left:auto">⬆️ Import image<input type="file" accept="image/*" style="display:none"></label>
          </div>
          <div class="photos-grid">${allImages().map((img, i) =>
            `<div class="ph-thumb" data-i="${i}"><img loading="lazy" src="${img.src}"><div class="ph-name">${Utils.esc(img.name)}</div></div>`).join('')
            || '<div class="placeholder-pane"><div class="ph-ico">🏞️</div>No photos yet. Import one!</div>'}</div>`;
        win.body.querySelector('.photos-grid').addEventListener('click', e => {
          const t = e.target.closest('.ph-thumb');
          if (t) { viewing = +t.dataset.i; render(); }
        });
        win.body.querySelector('input[type=file]').addEventListener('change', e => {
          const f = e.target.files[0];
          if (!f) return;
          if (f.size > 1.5 * 1048576) { Shell.toast('Photos', 'Image too large (max 1.5 MB — browser storage is limited).', '⚠️'); return; }
          const r = new FileReader();
          r.onload = () => {
            FS.write(HOME + '/Pictures/' + FS.uniqueName(HOME + '/Pictures', f.name.replace(/\.[^.]+$/, ''), '.' + (f.name.split('.').pop() || 'png')), r.result, f.type);
            render();
          };
          r.readAsDataURL(f);
        });
      }
    }
    render();
  }
});

/* ---------- Media Player ---------- */
Apps.register({
  id: 'mediaplayer', name: 'Media Player', icon: '▶️', color: 'linear-gradient(135deg,#f78ca0,#f9748f)',
  category: 'Entertainment', width: 700, height: 540, singleton: true,
  onArgs(win, args) { if (args.path) win._mpOpenPath(args.path); },
  mount(win, args) {
    win.body.innerHTML = `
      <div class="mp-root">
        <div class="app-toolbar">
          <span style="font-weight:600">Music library</span>
          <label class="tool-btn" style="margin-left:auto">⬆️ Open audio/video file<input type="file" accept="audio/*,video/*" style="display:none"></label>
        </div>
        <div class="mp-viz"></div>
        <div class="mp-list"></div>
        <div class="mp-bar">
          <input type="range" class="mp-seek" min="0" max="1000" value="0">
          <div class="mp-controls">
            <div class="mp-now">Nothing playing</div>
            <button class="mp-prev" title="Previous">⏮</button>
            <button class="mp-play" title="Play/Pause">▶</button>
            <button class="mp-next" title="Next">⏭</button>
            <div class="mp-time">0:00 / 0:00</div>
          </div>
        </div>
      </div>`;
    const $ = s => win.body.querySelector(s);
    const viz = $('.mp-viz');
    for (let i = 0; i < 48; i++) viz.appendChild(Utils.el('div'));
    const vbars = [...viz.children];
    let media = null; // HTMLMediaElement for real files, else null (synth)

    function renderList() {
      $('.mp-list').innerHTML = Synth.tracks.map(t => `
        <div class="mp-track ${Synth.current && Synth.current.id === t.id ? 'playing' : ''}" data-id="${t.id}">
          <div class="mp-art" style="background:${t.color}">${t.art}</div>
          <div><div class="mp-t">${t.title}</div><div class="mp-a">${t.artist} • ${t.album}</div></div>
          <div class="mp-dur">${Utils.fmtTime(Synth.length(t))}</div>
        </div>`).join('');
    }
    $('.mp-list').addEventListener('click', e => {
      const row = e.target.closest('.mp-track');
      if (!row) return;
      stopMedia();
      Synth.setQueue(Synth.tracks);
      Synth.play(Synth.tracks.find(t => t.id === row.dataset.id), 0);
    });
    function stopMedia() {
      if (media) { media.pause(); media.remove(); media = null; }
    }
    win._mpOpenPath = path => {
      const n = FS.get(path);
      if (!n) return;
      Synth.stop(); stopMedia();
      const isVideo = /\.(mp4|webm|mov)$/i.test(path);
      media = document.createElement(isVideo ? 'video' : 'audio');
      media.src = n.content;
      media.controls = false;
      if (isVideo) {
        media.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000';
        viz.innerHTML = ''; viz.style.height = '260px'; viz.appendChild(media);
      }
      media.play().catch(() => Shell.toast('Media Player', 'Could not play this file.', '⚠️'));
      $('.mp-now').textContent = path.split('/').pop();
      media.addEventListener('ended', () => $('.mp-play').textContent = '▶');
      $('.mp-play').textContent = '⏸';
    };
    $('input[type=file]').addEventListener('change', e => {
      const f = e.target.files[0];
      if (!f) return;
      Synth.stop(); stopMedia();
      const isVideo = f.type.startsWith('video');
      media = document.createElement(isVideo ? 'video' : 'audio');
      media.src = URL.createObjectURL(f);
      if (isVideo) {
        media.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000';
        viz.innerHTML = ''; viz.style.height = '260px'; viz.appendChild(media);
      }
      media.play();
      $('.mp-now').textContent = f.name;
      $('.mp-play').textContent = '⏸';
    });
    $('.mp-play').addEventListener('click', () => {
      if (media) { media.paused ? media.play() : media.pause(); }
      else if (Synth.current) Synth.toggle();
      else if (Synth.tracks.length) { Synth.setQueue(Synth.tracks); Synth.play(Synth.tracks[0], 0); }
    });
    $('.mp-next').addEventListener('click', () => { if (!media) Synth.next(); });
    $('.mp-prev').addEventListener('click', () => { if (!media) Synth.prev(); });
    $('.mp-seek').addEventListener('input', e => {
      if (media && media.duration) media.currentTime = e.target.value / 1000 * media.duration;
      else if (Synth.current) Synth.seek(e.target.value / 1000 * Synth.duration());
    });
    const uiTimer = setInterval(() => {
      let pos = 0, dur = 0, playing = false;
      if (media) { pos = media.currentTime || 0; dur = media.duration || 0; playing = !media.paused; }
      else if (Synth.current) { pos = Synth.position(); dur = Synth.duration(); playing = Synth.isPlaying; }
      if (!win.body.contains($('.mp-seek'))) return;
      if (document.activeElement !== $('.mp-seek')) $('.mp-seek').value = dur ? Math.round(pos / dur * 1000) : 0;
      $('.mp-time').textContent = Utils.fmtTime(pos) + ' / ' + Utils.fmtTime(dur);
      $('.mp-play').textContent = playing ? '⏸' : '▶';
      if (!media) $('.mp-now').textContent = Synth.current ? (Synth.current.title + ' — ' + Synth.current.artist) : 'Nothing playing';
      // fake-but-lively visualizer bars driven by playback position
      if (!media || media.tagName === 'AUDIO') {
        vbars.forEach((b, i) => {
          const hgt = playing ? 8 + Math.abs(Math.sin(pos * 5 + i * 0.6)) * 60 * (0.4 + Math.abs(Math.sin(i * 1.7 + pos * 2.3)) * 0.6) : 3;
          b.style.height = hgt + 'px';
        });
      }
    }, 120);
    const onPlayer = () => renderList();
    Bus.on('player:change', onPlayer);
    win.onClose(() => { clearInterval(uiTimer); stopMedia(); });
    renderList();
    if (args.path) win._mpOpenPath(args.path);
  }
});

/* ---------- Microsoft Edge ---------- */
Apps.register({
  id: 'edge', name: 'Microsoft Edge', icon: '🌐', color: 'linear-gradient(135deg,#35d0c0,#0b6fbf)',
  category: 'System', width: 960, height: 620,
  mount(win) {
    win.body.innerHTML = `
      <div class="edge-root">
        <div class="edge-bar">
          <button class="eg-back">←</button><button class="eg-fwd">→</button><button class="eg-reload">⟳</button><button class="eg-home">🏠</button>
          <input class="eg-url" placeholder="Search or enter web address" spellcheck="false">
        </div>
        <div class="edge-view">
          <iframe sandbox="allow-scripts allow-same-origin allow-forms allow-popups" style="display:none"></iframe>
          <div class="edge-home">
            <h1>Where to next?</h1>
            <div class="edge-tiles">
              <div class="edge-tile" data-url="https://example.com"><div class="et-ico">📄</div><div class="et-name">Example</div></div>
              <div class="edge-tile" data-url="https://www.openstreetmap.org/export/embed.html?bbox=-0.15,51.49,-0.09,51.52"><div class="et-ico">🗺️</div><div class="et-name">Maps</div></div>
              <div class="edge-tile" data-url="https://en.wikipedia.org/wiki/Special:Random"><div class="et-ico">📚</div><div class="et-name">Wikipedia</div></div>
              <div class="edge-tile" data-url="https://archive.org"><div class="et-ico">🏛️</div><div class="et-name">Archive.org</div></div>
              <div class="edge-tile" data-url="https://duckduckgo.com/html/"><div class="et-ico">🦆</div><div class="et-name">DuckDuckGo</div></div>
            </div>
            <div class="edge-note">Heads-up: this browser-in-a-browser loads pages in an iframe, and many sites (Google, YouTube, Bing…) refuse to be embedded and will show a blank page. The tiles above usually work. That's a web security rule, not a bug. 🙂</div>
          </div>
        </div>
      </div>`;
    const $ = s => win.body.querySelector(s);
    const frame = $('iframe'), home = $('.edge-home'), url = $('.eg-url');
    const hist = []; let hIdx = -1;
    function go(u, skipHist) {
      if (!u) return;
      if (!/^https?:\/\//i.test(u)) {
        u = /\.\w{2,}($|\/)/.test(u) ? 'https://' + u : 'https://duckduckgo.com/html/?q=' + encodeURIComponent(u);
      }
      if (!skipHist) { hist.splice(hIdx + 1); hist.push(u); hIdx = hist.length - 1; }
      url.value = u;
      home.style.display = 'none';
      frame.style.display = 'block';
      frame.src = u;
      win.setTitle('Microsoft Edge');
    }
    function goHome() {
      frame.src = 'about:blank';
      frame.style.display = 'none';
      home.style.display = 'block';
      url.value = '';
    }
    url.addEventListener('keydown', e => { if (e.key === 'Enter') go(url.value.trim()); });
    home.addEventListener('click', e => {
      const t = e.target.closest('.edge-tile');
      if (t) go(t.dataset.url);
    });
    $('.eg-home').addEventListener('click', goHome);
    $('.eg-reload').addEventListener('click', () => { if (frame.style.display !== 'none') frame.src = frame.src; });
    $('.eg-back').addEventListener('click', () => { if (hIdx > 0) { hIdx--; go(hist[hIdx], true); } else goHome(); });
    $('.eg-fwd').addEventListener('click', () => { if (hIdx < hist.length - 1) { hIdx++; go(hist[hIdx], true); } });
  }
});

/* ---------- Copilot ---------- */
Apps.register({
  id: 'copilot', name: 'Copilot', icon: '✦', letter: true, color: 'linear-gradient(135deg,#7a5fff,#00b7c3)',
  category: 'Productivity', width: 440, height: 600, singleton: true,
  mount(win) {
    win.body.innerHTML = `
      <div class="cop-root">
        <div class="cop-msgs">
          <div class="cop-msg bot">Hi, I'm Copilot ✦ — your (extremely local) assistant. I can open apps ("open excel"), do math ("512*3+7"), tell a joke, switch dark mode, change the wallpaper, or tell you the time. Try me!</div>
        </div>
        <div class="cop-input"><input placeholder="Ask me anything…" spellcheck="false"><button title="Send">➤</button></div>
      </div>`;
    const msgs = win.body.querySelector('.cop-msgs');
    const input = win.body.querySelector('input');
    const add = (text, who) => {
      const m = Utils.el('div', 'cop-msg ' + who);
      m.textContent = text;
      msgs.appendChild(m);
      msgs.scrollTop = msgs.scrollHeight;
      return m;
    };
    const JOKES = [
      'Why do programmers prefer dark mode? Because light attracts bugs.',
      'I would tell you a UDP joke, but you might not get it.',
      'There are only 10 kinds of people: those who understand binary and those who don\'t.',
      'Why was the JavaScript developer sad? Because he didn\'t Node how to Express himself.',
      'A SQL query walks into a bar, walks up to two tables and asks: "Can I JOIN you?"'
    ];
    function respond(q) {
      const l = q.toLowerCase().trim();
      // open apps
      const openM = l.match(/^(?:open|launch|start|run)\s+(.+)$/);
      if (openM) {
        const app = Apps.visible().find(a => a.name.toLowerCase().includes(openM[1].trim()) || a.id === openM[1].trim());
        if (app) { Apps.launch(app.id); return 'Opening ' + app.name + ' for you. 🚀'; }
        return 'I couldn\'t find an app called "' + openM[1].trim() + '". Check the Microsoft Store — maybe it\'s not installed yet?';
      }
      // math
      const mathQ = q.replace(/,/g, '').replace(/[?=\s]+$/, '');
      if (/\d/.test(mathQ) && /^[-+*/().\d\s%^]+$/.test(mathQ)) {
        try {
          const v = Function('"use strict";return (' + mathQ.replace(/\^/g, '**') + ')')();
          if (typeof v === 'number' && isFinite(v)) return q.trim() + ' = ' + (Math.round(v * 1e10) / 1e10);
        } catch (e) {}
      }
      if (/joke|funny/.test(l)) return JOKES[Math.floor(Math.random() * JOKES.length)];
      if (/time|clock/.test(l) && !/spotify/.test(l)) return 'It\'s ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + '.';
      if (/date|day is it|today/.test(l)) return 'Today is ' + new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '.';
      if (/dark mode|dark theme/.test(l)) { Settings.set('theme', 'dark'); return 'Dark mode on. Easy on the eyes. 🌙'; }
      if (/light mode|light theme/.test(l)) { Settings.set('theme', 'light'); return 'Light mode on. ☀️'; }
      if (/wallpaper|background/.test(l)) {
        const ids = Wallpapers.ids;
        const next = ids[(ids.indexOf(Settings.get('wallpaper')) + 1) % ids.length];
        Settings.set('wallpaper', next);
        return 'Switched the wallpaper to "' + Wallpapers.names[next] + '". 🖼️';
      }
      if (/clippy|paperclip|office assistant/.test(l)) { Clippy.toggle(); return Settings.get('clippy') ? 'Summoning Clippy. Don\'t say I didn\'t warn you. 📎' : 'Clippy has been sent back to 1997. 👋'; }
      if (/party|confetti|celebrate|happy happy|joy joy/.test(l)) { Party.start(); return 'Happy happy, joy joy! 🎉'; }
      if (/crash|bsod|blue screen|kernel panic/.test(l)) { setTimeout(() => BSOD.show('COPILOT_WAS_ASKED_NICELY'), 800); return 'You asked for it. Saving your work… just kidding. 💙'; }
      if (/achievement|trophy|gamerscore/.test(l)) { Apps.launch('xbox'); return 'You\'ve earned ' + Achievements.score() + ' G so far. Here\'s the full list. 🏆'; }
      if (/screensaver|screen saver/.test(l)) { setTimeout(() => Screensaver.start(), 600); return 'Starting the screensaver. Move the mouse to come back. 🫧'; }
      if (/lock (the )?(pc|screen|computer)|^lock$/.test(l)) { setTimeout(() => Lock.show(), 400); return 'Locking. See you soon! 🔒'; }
      if (/task manager|processes|not responding/.test(l)) { Apps.launch('taskmgr'); return 'Here\'s Task Manager. Please don\'t end me. 📊'; }
      if (/shortcut|hotkey|keyboard/.test(l)) return 'Hotkeys: Alt+Tab switches windows, Ctrl+Shift+Esc opens Task Manager, Ctrl+Esc opens Start, Win+D shows the desktop, Win+E opens Explorer. And there\'s a certain code from 1986…';
      if (/weather/.test(l)) {
        if (Apps.isInstalled('weather')) { Apps.launch('weather'); return 'Here\'s the forecast for Webville!'; }
        return 'Install MSN Weather from the Microsoft Store and I\'ll pull up the forecast for you.';
      }
      if (/who are you|what are you/.test(l)) return 'I\'m Copilot — well, a homage to it. I live entirely in this browser tab and I\'m powered by a handful of if-statements doing their absolute best.';
      if (/help|what can you/.test(l)) return 'I can: open apps ("open paint"), calculate ("(84/2)*3"), tell jokes, toggle dark/light mode, change the wallpaper, show the weather, tell you the time or date, summon Clippy, start a party, show your achievements, lock the PC, or crash it (on request).';
      if (/thank/.test(l)) return 'Anytime! 💜';
      if (/^(hi|hello|hey|yo)\b/.test(l)) return 'Hey there! What can I do for you?';
      const fallback = [
        'Interesting! I\'m a small local script though — try "help" to see what I can actually do.',
        'Hmm, that\'s beyond my (very finite) powers. Type "help" for my full repertoire.',
        'My neural network is literally a switch statement, but I CAN open apps, do math, and tell jokes. "help" for more.'
      ];
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    function send() {
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      add(q, 'me');
      const thinking = add('…', 'bot');
      setTimeout(() => { thinking.textContent = respond(q); msgs.scrollTop = msgs.scrollHeight; }, 450 + Math.random() * 500);
    }
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    win.body.querySelector('.cop-input button').addEventListener('click', send);
    setTimeout(() => input.focus(), 150);
  }
});

/* ---------- Settings ---------- */
Apps.register({
  id: 'settings', name: 'Settings', icon: '⚙️', color: 'linear-gradient(135deg,#9aa7b8,#5c6b7d)',
  category: 'System', width: 900, height: 600, singleton: true,
  mount(win) {
    const sections = {
      personalization: { icon: '🎨', name: 'Personalization' },
      system: { icon: '🖥️', name: 'System' },
      apps: { icon: '📦', name: 'Apps' },
      fun: { icon: '🎉', name: 'Fun' },
      about: { icon: 'ℹ️', name: 'About' }
    };
    let sel = 'personalization';
    win.body.innerHTML = `<div class="set-root"><div class="set-side"></div><div class="set-content"></div></div>`;
    const side = win.body.querySelector('.set-side');
    const content = win.body.querySelector('.set-content');
    function renderSide() {
      side.innerHTML = Object.entries(sections).map(([id, s]) =>
        `<div class="set-nav ${sel === id ? 'sel' : ''}" data-id="${id}"><span>${s.icon}</span><span>${s.name}</span></div>`).join('');
    }
    side.addEventListener('click', e => {
      const n = e.target.closest('.set-nav');
      if (n) { sel = n.dataset.id; renderSide(); renderContent(); }
    });
    function renderContent() {
      if (sel === 'personalization') {
        const wp = Settings.get('wallpaper');
        const accents = ['#0078d4', '#c42b1c', '#0f7b0f', '#8764b8', '#ca5010', '#038387', '#e3008c', '#4a5459'];
        content.innerHTML = `
          <h1>Personalization</h1>
          <div class="set-card"><div class="set-info"><div class="set-t">Background</div><div class="set-s">Pick a wallpaper</div></div></div>
          <div class="wall-grid" style="margin-bottom:18px">
            ${Wallpapers.ids.map(id => `<div class="wall-opt ${wp === id ? 'sel' : ''}" data-w="${id}" title="${Wallpapers.names[id]}" style="background-image:url('${Wallpapers.uri(id)}')"></div>`).join('')}
          </div>
          <div class="set-card"><div class="set-info"><div class="set-t">Dark mode</div><div class="set-s">Switch between light and dark theme</div></div><div class="switch ${Settings.get('theme') === 'dark' ? 'on' : ''}" data-k="theme"></div></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Accent color</div><div class="set-s">Used across buttons and highlights</div></div></div>
          <div class="accent-row">${accents.map(a => `<div class="acc-opt ${Settings.get('accent') === a ? 'sel' : ''}" data-a="${a}" style="background:${a}"></div>`).join('')}</div>
          <div style="height:14px"></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Taskbar alignment</div><div class="set-s">Center (Windows 11) or left (classic)</div></div>
            <select class="fluent-input" data-k="taskbarAlign"><option value="center" ${Settings.get('taskbarAlign') === 'center' ? 'selected' : ''}>Center</option><option value="left" ${Settings.get('taskbarAlign') === 'left' ? 'selected' : ''}>Left</option></select></div>`;
        content.querySelectorAll('.wall-opt').forEach(w => w.addEventListener('click', () => { Settings.set('wallpaper', w.dataset.w); renderContent(); }));
        content.querySelectorAll('.acc-opt').forEach(a => a.addEventListener('click', () => { Settings.set('accent', a.dataset.a); renderContent(); }));
        content.querySelector('.switch').addEventListener('click', () => { Settings.set('theme', Settings.get('theme') === 'dark' ? 'light' : 'dark'); renderContent(); });
        content.querySelector('select').addEventListener('change', e => Settings.set('taskbarAlign', e.target.value));
      } else if (sel === 'system') {
        let used = 0;
        try { used = (localStorage.getItem('win11.fs') || '').length + (localStorage.getItem('win11.settings') || '').length; } catch (e) {}
        content.innerHTML = `
          <h1>System</h1>
          <div class="set-card"><div class="set-info"><div class="set-t">Storage</div><div class="set-s">${Utils.fmtBytes(used * 2)} used of ~5 MB browser storage</div></div></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Display</div><div class="set-s">${window.innerWidth} × ${window.innerHeight}, ${window.devicePixelRatio}x scaling</div></div></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Reset this PC</div><div class="set-s">Wipes files, settings and installed apps, restores defaults</div></div><button class="fluent-btn" style="background:#c42b1c" id="reset-pc">Reset</button></div>`;
        content.querySelector('#reset-pc').addEventListener('click', () => {
          if (confirm('Reset Windows 11 Web? All your files and settings will be erased.')) {
            localStorage.removeItem('win11.fs');
            localStorage.removeItem('win11.settings');
            localStorage.removeItem('win11.chat');
            localStorage.removeItem('win11.apps');
            ['win11.achievements', 'win11.stats', 'win11.hiscores', 'win11.todo', 'win11.sticky', 'win11.snake.hi', 'win11.welcomed'].forEach(k => localStorage.removeItem(k));
            location.reload();
          }
        });
      } else if (sel === 'apps') {
        const installed = Settings.get('installedApps') || [];
        content.innerHTML = `<h1>Installed apps</h1>` + Apps.visible().map(a => `
          <div class="set-card">${appTileHTML(a)}<div class="set-info"><div class="set-t">${a.name}</div><div class="set-s">${a.category || 'App'}${a.store ? ' • from Microsoft Store' : ' • system app'}</div></div>
          ${a.store && installed.includes(a.id) ? `<button class="fluent-btn subtle" data-un="${a.id}">Uninstall</button>` : ''}</div>`).join('');
        content.querySelectorAll('[data-un]').forEach(b => b.addEventListener('click', () => {
          Apps.uninstall(b.dataset.un);
          Shell.toast('Settings', Apps.get(b.dataset.un).name + ' was uninstalled.', '📦');
          renderContent();
        }));
      } else if (sel === 'fun') {
        const ss = Settings.get('screensaver'), mins = +Settings.get('screensaverMin') || 0;
        content.innerHTML = `
          <h1>Fun</h1>
          <div class="set-card"><div class="set-info"><div class="set-t">Office Assistant (Clippy)</div><div class="set-s">A helpful paperclip that offers tips nobody asked for</div></div><div class="switch ${Settings.get('clippy') ? 'on' : ''}" data-k="clippy"></div></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Screensaver</div><div class="set-s">Starts after a period of inactivity</div></div>
            <select class="fluent-input" data-k="screensaver">${Object.entries(Screensaver.styles).map(([id, n]) => `<option value="${id}" ${ss === id ? 'selected' : ''}>${n}</option>`).join('')}</select>
            <select class="fluent-input" data-k="screensaverMin">${[0, 1, 3, 5, 10, 30].map(m => `<option value="${m}" ${mins === m ? 'selected' : ''}>${m ? m + ' min' : 'Off'}</option>`).join('')}</select>
            <button class="fluent-btn subtle" id="ss-preview">Preview</button></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Achievements</div><div class="set-s">${Achievements.score()} G of ${Achievements.total()} G earned</div></div><button class="fluent-btn" id="open-ach">View</button></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Party mode</div><div class="set-s">Confetti, rainbow accent, questionable music</div></div><button class="fluent-btn" id="party-btn">🎉 Party</button></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Keyboard shortcuts</div><div class="set-s">Alt+Tab switch windows • Ctrl+Shift+Esc Task Manager • Ctrl+Esc Start • Win+D desktop • Win+E Explorer • Win+I Settings</div></div></div>`;
        content.querySelector('.switch').addEventListener('click', () => { Settings.set('clippy', !Settings.get('clippy')); renderContent(); });
        content.querySelectorAll('select').forEach(s => s.addEventListener('change', e => Settings.set(e.target.dataset.k, e.target.dataset.k === 'screensaverMin' ? +e.target.value : e.target.value)));
        content.querySelector('#ss-preview').addEventListener('click', () => setTimeout(() => Screensaver.start(), 250));
        content.querySelector('#open-ach').addEventListener('click', () => Apps.launch('xbox'));
        content.querySelector('#party-btn').addEventListener('click', () => Party.start());
      } else {
        content.innerHTML = `
          <h1>About</h1>
          <div class="set-card"><div class="set-info"><div class="set-t">Windows 11 Web</div><div class="set-s">Version 26H2 (Build 2026.728) — an affectionate, fully client-side replica.<br>Not affiliated with Microsoft. Everything runs locally in your browser tab.</div></div></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Device name</div><div class="set-s">DESKTOP-WEB</div></div></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Processor</div><div class="set-s">Your very own CPU, ${navigator.hardwareConcurrency || '?'} logical cores</div></div></div>
          <div class="set-card"><div class="set-info"><div class="set-t">Installed RAM</div><div class="set-s">${navigator.deviceMemory ? navigator.deviceMemory + ' GB (as reported by the browser)' : 'Plenty'}</div></div></div>`;
      }
    }
    renderSide(); renderContent();
  }
});
