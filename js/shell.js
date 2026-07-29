/* ============ Windows 11 Web — shell: desktop, taskbar, start menu, flyouts ============ */
'use strict';

const Shell = {
  init() {
    this.desktop = document.getElementById('desktop');
    this.iconsEl = document.getElementById('desktop-icons');
    this.taskbarCenter = document.getElementById('taskbar-center');
    this.startMenu = document.getElementById('start-menu');
    this.applySettings();
    this.renderDesktopIcons();
    this.renderTaskbar();
    this.renderStart();
    this.initClock();
    this.initFlyouts();
    this.initContextMenu();
    Bus.on('wm:changed', () => this.renderTaskbar());
    Bus.on('apps:changed', () => { this.renderStart(); this.renderTaskbar(); this.renderDesktopIcons(); });
    Bus.on('settings', () => this.applySettings());
    Bus.on('fs:quota', () => this.toast('Storage full', 'Browser storage is full — delete some files to keep saving.', '⚠️'));
  },

  applySettings() {
    document.documentElement.classList.toggle('dark', Settings.get('theme') === 'dark');
    document.documentElement.style.setProperty('--accent', Settings.get('accent'));
    const wp = Settings.get('wallpaper');
    this.desktop.style.backgroundImage = `url('${wp.startsWith('custom:') ? wp.slice(7) : Wallpapers.uri(wp)}')`;
    document.getElementById('taskbar').classList.toggle('left', Settings.get('taskbarAlign') === 'left');
    this.startMenu.classList.toggle('left-align', Settings.get('taskbarAlign') === 'left');
    this.desktop.style.filter = Settings.get('nightLight') ? 'sepia(.25) brightness(.96)' : '';
  },

  /* ----- desktop icons ----- */
  renderDesktopIcons() {
    const pinned = ['edge', 'explorer', 'store', 'word', 'excel', 'powerpoint', 'photos', 'spotify', 'slack', 'discord', 'mediaplayer', 'paint', 'settings'];
    const items = pinned.filter(id => Apps.isInstalled(id)).map(id => ({ type: 'app', id }));
    (Settings.get('installedApps') || []).forEach(id => {
      if (!pinned.includes(id) && Apps.get(id)) items.push({ type: 'app', id });
    });
    FS.list(HOME + '/Desktop').forEach(f => items.push({ type: 'file', name: f.name, node: f.node }));
    this.iconsEl.innerHTML = items.map(it => {
      if (it.type === 'app') {
        const a = Apps.get(it.id);
        return `<div class="desk-icon" data-app="${a.id}"><div class="di-glyph">${appTileHTML(a)}</div><div class="di-label">${a.name}</div></div>`;
      }
      return `<div class="desk-icon" data-file="${Utils.esc(it.name)}"><div class="di-glyph">${fileIcon(it.name, it.node)}</div><div class="di-label">${Utils.esc(it.name)}</div></div>`;
    }).join('') + `<div class="desk-icon" data-sys="recycle"><div class="di-glyph">🗑️</div><div class="di-label">Recycle Bin${FS.binCount() ? ' (' + FS.binCount() + ')' : ''}</div></div>`;
  },

  /* ----- taskbar ----- */
  renderTaskbar() {
    const pinned = (Settings.get('pinnedTaskbar') || []).filter(id => Apps.isInstalled(id));
    const running = WM.all();
    const focusedWin = WM.focused();
    const shown = new Set();
    let html = `
      <button class="tb-btn" data-act="start" title="Start"><span class="tb-ico"><svg viewBox="0 0 24 24" width="24" height="24"><rect x="3" y="3" width="8.5" height="8.5" rx="1" fill="#0b5cd5"/><rect x="12.5" y="3" width="8.5" height="8.5" rx="1" fill="#0b5cd5"/><rect x="3" y="12.5" width="8.5" height="8.5" rx="1" fill="#0b5cd5"/><rect x="12.5" y="12.5" width="8.5" height="8.5" rx="1" fill="#0b5cd5"/></svg></span></button>
      <button class="tb-btn" data-act="search" title="Search"><span class="tb-ico">🔍</span></button>
      <button class="tb-btn ${WM.byApp('copilot').length ? 'running' : ''}" data-launch="copilot" title="Copilot">${appTileHTML(Apps.get('copilot'))}<span class="run-dot"></span></button>`;
    shown.add('copilot');
    const btn = (app, wins) => {
      const isActive = focusedWin && wins.includes(focusedWin);
      return `<button class="tb-btn ${wins.length ? 'running' : ''} ${isActive ? 'active-win' : ''}" data-launch="${app.id}" title="${app.name}">
        ${appTileHTML(app)}<span class="run-dot"></span></button>`;
    };
    for (const id of pinned) {
      const app = Apps.get(id);
      if (!app) continue;
      shown.add(id);
      html += btn(app, running.filter(w => w.app.id === id));
    }
    for (const w of running) {
      if (shown.has(w.app.id)) continue;
      shown.add(w.app.id);
      html += btn(w.app, running.filter(x => x.app.id === w.app.id));
    }
    this.taskbarCenter.innerHTML = html;
  },

  handleTaskbarClick(id) {
    const wins = WM.byApp(id);
    if (!wins.length) { Apps.launch(id); return; }
    const focused = WM.focused();
    if (focused && focused.app.id === id && !focused.minimized) focused.minimize();
    else {
      const w = wins[wins.length - 1];
      w.restore(); w.focus();
    }
  },

  /* ----- start menu ----- */
  renderStart() {
    const visible = Apps.visible();
    const pinnedIds = ['edge', 'word', 'excel', 'powerpoint', 'store', 'photos', 'settings', 'explorer', 'copilot', 'spotify', 'slack', 'discord', 'mediaplayer', 'notepad', 'paint', 'calculator', 'terminal'];
    const pinned = pinnedIds.map(id => Apps.get(id)).filter(a => a && Apps.isInstalled(a.id));
    const extra = visible.filter(a => !pinnedIds.includes(a.id));
    document.getElementById('start-pinned').innerHTML = pinned.concat(extra).slice(0, 18).map(a =>
      `<div class="start-app" data-launch="${a.id}">${appTileHTML(a)}<span class="lbl">${a.name}</span></div>`).join('');
    // recommended: recent docs
    const recDocs = FS.list(HOME + '/Documents').filter(f => f.node.type === 'file').slice(0, 4);
    document.getElementById('start-recommended').innerHTML = recDocs.map(f =>
      `<div class="start-rec" data-file="${Utils.esc(HOME + '/Documents/' + f.name)}"><div style="font-size:22px">${fileIcon(f.name, f.node)}</div><div><div class="rec-t">${Utils.esc(f.name)}</div><div class="rec-s">Documents</div></div></div>`).join('')
      || '<div style="font-size:12px;color:var(--text-2);padding:8px">Files you save will show up here.</div>';
    // all apps A-Z
    const sorted = visible.slice().sort((a, b) => a.name.localeCompare(b.name));
    let lastLetter = '', html = '';
    for (const a of sorted) {
      const L = a.name[0].toUpperCase();
      if (L !== lastLetter) { lastLetter = L; html += `<div class="start-letter-head">${L}</div>`; }
      html += `<div class="start-list-item" data-launch="${a.id}">${appTileHTML(a)}<span>${a.name}</span></div>`;
    }
    document.getElementById('start-all-list').innerHTML = html;
  },

  startSearch(q) {
    const resEl = document.getElementById('start-search-results');
    const secPinned = document.getElementById('start-pinned-section');
    const secAll = document.getElementById('start-all-section');
    const secSearch = document.getElementById('start-search-section');
    if (!q) {
      secSearch.style.display = 'none';
      secPinned.style.display = '';
      return;
    }
    secPinned.style.display = 'none';
    secAll.style.display = 'none';
    secSearch.style.display = '';
    const ql = q.toLowerCase();
    const apps = Apps.visible().filter(a => a.name.toLowerCase().includes(ql));
    const files = [];
    const walk = (path, node, depth) => {
      if (depth > 4 || files.length > 8) return;
      for (const [name, n] of Object.entries(node.children || {})) {
        if (name.toLowerCase().includes(ql) && n.type === 'file') files.push(path + '/' + name);
        if (n.type === 'folder') walk(path + '/' + name, n, depth + 1);
      }
    };
    const homeNode = FS.get(HOME);
    if (homeNode) walk(HOME, homeNode, 0);
    resEl.innerHTML =
      apps.map(a => `<div class="start-list-item" data-launch="${a.id}">${appTileHTML(a)}<span>${a.name}</span></div>`).join('') +
      files.map(p => `<div class="start-list-item" data-file="${Utils.esc(p)}"><div style="font-size:20px;width:28px;text-align:center">${fileIcon(p.split('/').pop())}</div><span>${Utils.esc(p.split('/').pop())}</span></div>`).join('') ||
      '<div style="padding:14px;color:var(--text-2);font-size:13px">No results found.</div>';
  },

  toggleStart(force) {
    const open = force !== undefined ? force : !this.startMenu.classList.contains('open');
    this.startMenu.classList.toggle('open', open);
    if (open) {
      this.closeFlyouts(this.startMenu);
      const inp = document.getElementById('start-search-input');
      inp.value = '';
      this.startSearch('');
      document.getElementById('start-all-section').style.display = 'none';
      document.getElementById('start-pinned-section').style.display = '';
      setTimeout(() => inp.focus(), 80);
    }
  },
  closeFlyouts(except) {
    for (const f of document.querySelectorAll('.shell-flyout')) {
      if (f !== except) f.classList.remove('open');
    }
  },

  /* ----- clock / calendar / action center ----- */
  initClock() {
    const t = document.getElementById('tray-time');
    const d = document.getElementById('tray-date');
    const upd = () => {
      const now = new Date();
      t.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      d.textContent = now.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' });
    };
    upd();
    setInterval(upd, 15000);
  },
  renderCalendar() {
    const now = new Date();
    document.getElementById('cal-head').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const startDow = first.getDay();
    let html = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(x => `<div class="cal-dow">${x}</div>`).join('');
    for (let i = 0; i < startDow; i++) html += '<div class="cal-day dim"></div>';
    for (let d = 1; d <= daysIn; d++) html += `<div class="cal-day ${d === now.getDate() ? 'today' : ''}">${d}</div>`;
    document.getElementById('cal-grid').innerHTML = html;
  },

  initFlyouts() {
    const ac = document.getElementById('action-center');
    const cal = document.getElementById('calendar-flyout');
    document.getElementById('tray-icons').addEventListener('click', e => {
      e.stopPropagation();
      this.closeFlyouts(ac);
      ac.classList.toggle('open');
    });
    document.getElementById('tray-clock').addEventListener('click', e => {
      e.stopPropagation();
      this.closeFlyouts(cal);
      this.renderCalendar();
      cal.classList.toggle('open');
    });
    document.getElementById('ac-theme').addEventListener('click', e => {
      Settings.set('theme', Settings.get('theme') === 'dark' ? 'light' : 'dark');
      e.currentTarget.classList.toggle('on', Settings.get('theme') === 'dark');
    });
    document.getElementById('ac-night').addEventListener('click', e => {
      Settings.set('nightLight', !Settings.get('nightLight'));
      e.currentTarget.classList.toggle('on', Settings.get('nightLight'));
    });
    document.getElementById('ac-brightness').addEventListener('input', e => {
      document.getElementById('desktop').style.opacity = e.target.value / 100;
    });
    document.getElementById('ac-volume').addEventListener('input', e => Synth.setVolume(e.target.value / 100));
    document.getElementById('show-desktop').addEventListener('click', () => WM.all().forEach(w => w.minimize()));
    document.getElementById('taskbar-widgets').addEventListener('click', () => {
      if (Apps.isInstalled('weather')) Apps.launch('weather');
      else this.toast('Widgets', 'Install MSN Weather from the Microsoft Store for the full forecast!', '🌤️');
    });
  },

  /* ----- context menu ----- */
  contextMenu(x, y, items) {
    const cm = document.getElementById('context-menu');
    cm.innerHTML = items.map((it, i) => it.sep ? '<div class="cm-sep"></div>' :
      `<div class="cm-item" data-i="${i}"><span class="cm-ico">${it.icon || ''}</span><span>${it.label}</span></div>`).join('');
    cm.style.display = 'block';
    cm.style.left = Math.min(x, window.innerWidth - cm.offsetWidth - 8) + 'px';
    cm.style.top = Math.min(y, window.innerHeight - cm.offsetHeight - 8) + 'px';
    cm.onclick = e => {
      const el = e.target.closest('.cm-item');
      if (el) { const it = items[+el.dataset.i]; cm.style.display = 'none'; if (it.fn) it.fn(); }
    };
  },
  initContextMenu() {
    document.addEventListener('click', e => {
      const cm = document.getElementById('context-menu');
      if (!e.target.closest('#context-menu')) cm.style.display = 'none';
      // close flyouts on outside click
      if (!e.target.closest('.shell-flyout') && !e.target.closest('#taskbar')) this.closeFlyouts();
    });
    this.desktop.addEventListener('contextmenu', e => {
      if (e.target.closest('.win') || e.target.closest('.desk-icon')) return;
      e.preventDefault();
      this.contextMenu(e.clientX, e.clientY, [
        { label: 'Refresh', icon: '🔄', fn: () => this.renderDesktopIcons() },
        { sep: true },
        { label: 'New folder on Desktop', icon: '📁', fn: () => FS.mkdir(HOME + '/Desktop/' + FS.uniqueName(HOME + '/Desktop', 'New folder', '')) },
        { label: 'New text file on Desktop', icon: '📄', fn: () => FS.write(HOME + '/Desktop/' + FS.uniqueName(HOME + '/Desktop', 'New Text Document', '.txt'), '', 'text/plain') },
        { sep: true },
        { label: 'Next wallpaper', icon: '🖼️', fn: () => {
          const ids = Wallpapers.ids;
          const cur = ids.indexOf(Settings.get('wallpaper'));
          Settings.set('wallpaper', ids[(cur + 1) % ids.length]);
        } },
        { label: 'Display settings', icon: '⚙️', fn: () => Apps.launch('settings') }
      ]);
    });
    this.iconsEl.addEventListener('contextmenu', e => {
      const ic = e.target.closest('.desk-icon');
      if (!ic) return;
      e.preventDefault(); e.stopPropagation();
      if (ic.dataset.app) {
        const app = Apps.get(ic.dataset.app);
        const items = [{ label: 'Open', icon: '📂', fn: () => Apps.launch(app.id) }];
        if (app.store) items.push({ sep: true }, { label: 'Uninstall', icon: '🗑️', fn: () => Apps.uninstall(app.id) });
        this.contextMenu(e.clientX, e.clientY, items);
      } else if (ic.dataset.sys === 'recycle') {
        this.contextMenu(e.clientX, e.clientY, [
          { label: 'Open', icon: '📂', fn: () => Apps.launch('explorer', { path: FS.binPath }) },
          { sep: true },
          { label: 'Empty Recycle Bin', icon: '❌', fn: () => { if (!FS.binCount() || confirm('Permanently delete all ' + FS.binCount() + ' item(s)?')) FS.emptyBin(); } }
        ]);
      } else if (ic.dataset.file) {
        const p = HOME + '/Desktop/' + ic.dataset.file;
        this.contextMenu(e.clientX, e.clientY, [
          { label: 'Open', icon: '📂', fn: () => openFile(p) },
          { label: 'Rename', icon: '✏️', fn: () => { const n = prompt('Rename to:', ic.dataset.file); if (n) FS.rename(p, n); } },
          { sep: true },
          { label: 'Delete', icon: '🗑️', fn: () => FS.recycle(p) }
        ]);
      }
    });
  },

  /* ----- toasts ----- */
  toast(title, body, icon) {
    const layer = document.getElementById('notif-layer');
    const t = Utils.el('div', 'toast');
    t.innerHTML = `<div class="t-ico">${icon || '🔔'}</div><div><div class="t-title">${Utils.esc(title)}</div><div class="t-body">${Utils.esc(body)}</div></div>`;
    layer.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 350); }, 4200);
    t.addEventListener('click', () => t.remove());
  },

  /* ----- delegated click wiring ----- */
  wireEvents() {
    // taskbar
    document.getElementById('taskbar').addEventListener('click', e => {
      const b = e.target.closest('.tb-btn');
      if (!b) return;
      e.stopPropagation();
      if (b.dataset.act === 'start' || b.dataset.act === 'search') this.toggleStart();
      else if (b.dataset.launch) { this.toggleStart(false); this.handleTaskbarClick(b.dataset.launch); }
    });
    // start menu
    this.startMenu.addEventListener('click', e => {
      e.stopPropagation();
      const launch = e.target.closest('[data-launch]');
      const file = e.target.closest('[data-file]');
      if (launch) { this.toggleStart(false); Apps.launch(launch.dataset.launch); }
      else if (file) { this.toggleStart(false); openFile(file.dataset.file); }
    });
    document.getElementById('start-all-btn').addEventListener('click', () => {
      document.getElementById('start-pinned-section').style.display = 'none';
      document.getElementById('start-all-section').style.display = '';
    });
    document.getElementById('start-back-btn').addEventListener('click', () => {
      document.getElementById('start-all-section').style.display = 'none';
      document.getElementById('start-pinned-section').style.display = '';
    });
    document.getElementById('start-search-input').addEventListener('input', e => this.startSearch(e.target.value.trim()));
    document.getElementById('power-btn').addEventListener('click', () => {
      if (confirm('Shut down Windows 11 Web? (This just reloads the page.)')) location.reload();
    });
    // desktop icons — double-click opens; on touch screens a single tap opens
    const openIcon = ic => {
      if (ic.dataset.app) Apps.launch(ic.dataset.app);
      else if (ic.dataset.sys === 'recycle') Apps.launch('explorer', { path: FS.binPath });
      else if (ic.dataset.file) openFile(HOME + '/Desktop/' + ic.dataset.file);
    };
    this.iconsEl.addEventListener('click', e => {
      const ic = e.target.closest('.desk-icon');
      this.iconsEl.querySelectorAll('.desk-icon').forEach(x => x.classList.toggle('sel', x === ic));
      if (ic && TOUCH) openIcon(ic);
    });
    this.iconsEl.addEventListener('dblclick', e => {
      const ic = e.target.closest('.desk-icon');
      if (ic) openIcon(ic);
    });
    // desktop click closes start
    this.desktop.addEventListener('pointerdown', e => {
      if (!e.target.closest('.win')) this.closeFlyouts();
    });
    // keyboard: Meta/Ctrl+Esc opens start
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.startMenu.classList.contains('open')) this.toggleStart(false);
    });
    Bus.on('fs:changed', () => { this.renderDesktopIcons(); this.renderStart(); });
  }
};
