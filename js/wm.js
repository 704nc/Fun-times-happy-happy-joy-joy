/* ============ Windows 11 Web — window manager + app registry ============ */
'use strict';

const Apps = {
  _reg: {},
  register(app) { this._reg[app.id] = app; },
  get(id) { return this._reg[id]; },
  all() { return Object.values(this._reg); },
  // apps visible in start menu / search (store apps only after install)
  visible() {
    const installed = Settings.get('installedApps') || [];
    return this.all().filter(a => !a.store || installed.includes(a.id));
  },
  isInstalled(id) {
    const a = this._reg[id];
    return !!a && (!a.store || (Settings.get('installedApps') || []).includes(id));
  },
  install(id) {
    const list = (Settings.get('installedApps') || []).slice();
    if (!list.includes(id)) { list.push(id); Settings.set('installedApps', list); }
    Bus.emit('apps:changed');
  },
  uninstall(id) {
    Settings.set('installedApps', (Settings.get('installedApps') || []).filter(x => x !== id));
    WM.byApp(id).forEach(w => w.close());
    Bus.emit('apps:changed');
  },
  launch(id, args) {
    const app = this._reg[id];
    if (!app) return null;
    if (app.singleton) {
      const existing = WM.byApp(id)[0];
      if (existing) {
        existing.restore(); existing.focus();
        if (app.onArgs && args) app.onArgs(existing, args);
        return existing;
      }
    }
    const win = WM.create(app);
    try { app.mount(win, args || {}); }
    catch (e) {
      console.error('App crashed:', id, e);
      win.body.innerHTML = '<div class="placeholder-pane"><div class="ph-ico">💥</div><div>This app ran into a problem.<br>' + Utils.esc(e.message) + '</div></div>';
    }
    return win;
  }
};

function appTileHTML(app, extraCls) {
  const style = app.color ? ` style="background:${app.color}"` : ' style="background:linear-gradient(135deg,#5c6bc0,#3949ab)"';
  const cls = 'app-tile' + (app.letter ? ' letter' : '') + (extraCls ? ' ' + extraCls : '');
  return `<div class="${cls}"${style}>${app.icon}</div>`;
}

const WM = {
  _wins: new Map(),
  _z: 100,
  _seq: 1,
  layer: null,

  init() { this.layer = document.getElementById('windows-layer'); },
  all() { return [...this._wins.values()]; },
  byApp(appId) { return this.all().filter(w => w.app.id === appId); },
  focused() {
    let top = null;
    for (const w of this._wins.values()) if (!w.minimized && (!top || w.z > top.z)) top = w;
    return top;
  },

  create(app) {
    const id = 'w' + (this._seq++);
    const deskW = window.innerWidth, deskH = window.innerHeight - 48;
    const w = Math.min(app.width || 860, deskW - 20);
    const h = Math.min(app.height || 560, deskH - 20);
    const n = this._wins.size % 8;
    const x = Utils.clamp(Math.round((deskW - w) / 2) + n * 26 - 60, 4, Math.max(4, deskW - w - 4));
    const y = Utils.clamp(Math.round((deskH - h) / 2.4) + n * 24 - 40, 4, Math.max(4, deskH - h - 4));

    const el = Utils.el('div', 'win');
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;`;
    el.innerHTML = `
      <div class="win-titlebar">
        <div class="win-title">${appTileHTML(app)}<span class="wt-text">${Utils.esc(app.name)}</span></div>
        <div class="win-controls">
          <button class="wc-min" title="Minimize">🗕</button>
          <button class="wc-max" title="Maximize">🗖</button>
          <button class="wc-close" title="Close">✕</button>
        </div>
      </div>
      <div class="win-body"></div>`;
    for (const dir of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']) {
      el.appendChild(Utils.el('div', 'win-resizer ' + dir));
    }
    this.layer.appendChild(el);

    const win = {
      id, app, el,
      body: el.querySelector('.win-body'),
      minimized: false, maxed: false, z: 0,
      _restoreRect: null,
      _closeHooks: [],
      setTitle(t) { el.querySelector('.wt-text').textContent = t; Bus.emit('wm:changed'); },
      getTitle() { return el.querySelector('.wt-text').textContent; },
      onClose(fn) { this._closeHooks.push(fn); },
      focus() {
        win.z = ++WM._z;
        el.style.zIndex = win.z;
        WM.all().forEach(o => o.el.classList.toggle('focused', o === win));
        Bus.emit('wm:changed');
      },
      minimize() {
        win.minimized = true;
        el.classList.add('minimized');
        Bus.emit('wm:changed');
      },
      restore() {
        if (win.minimized) {
          win.minimized = false;
          el.classList.remove('minimized');
        }
        Bus.emit('wm:changed');
      },
      toggleMax() {
        if (win.maxed) {
          win.maxed = false;
          el.classList.remove('maxed');
          const r = win._restoreRect || { x: 40, y: 40, w: 800, h: 520 };
          el.style.left = r.x + 'px'; el.style.top = r.y + 'px';
          el.style.width = r.w + 'px'; el.style.height = r.h + 'px';
        } else {
          win._restoreRect = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
          win.maxed = true;
          el.classList.add('maxed');
          el.style.left = '0'; el.style.top = '0';
          el.style.width = '100%'; el.style.height = '100%';
        }
        el.querySelector('.wc-max').textContent = win.maxed ? '🗗' : '🗖';
        Bus.emit('wm:changed');
      },
      snap(side) {
        if (win.maxed) win.toggleMax();
        win._restoreRect = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
        const W = window.innerWidth, H = window.innerHeight - 48;
        if (side === 'left') { el.style.cssText += `;left:0;top:0;width:${Math.round(W / 2)}px;height:${H}px;`; }
        else if (side === 'right') { el.style.cssText += `;left:${Math.round(W / 2)}px;top:0;width:${Math.round(W / 2)}px;height:${H}px;`; }
        Bus.emit('wm:changed');
      },
      close() {
        win._closeHooks.forEach(fn => { try { fn(); } catch (e) {} });
        el.classList.add('closing');
        WM._wins.delete(id);
        setTimeout(() => el.remove(), 150);
        Bus.emit('wm:changed');
      }
    };
    this._wins.set(id, win);

    el.addEventListener('pointerdown', () => win.focus(), true);
    el.querySelector('.wc-close').addEventListener('click', () => win.close());
    el.querySelector('.wc-min').addEventListener('click', () => win.minimize());
    el.querySelector('.wc-max').addEventListener('click', () => win.toggleMax());
    const tb = el.querySelector('.win-titlebar');
    tb.addEventListener('dblclick', e => { if (!e.target.closest('.win-controls')) win.toggleMax(); });
    this._drag(win, tb);
    this._resize(win);
    win.focus();
    // phone-sized screens: floating windows are fiddly, open maximized
    if (window.innerWidth < 700 || window.innerHeight < 480) win.toggleMax();
    return win;
  },

  _drag(win, handle) {
    const el = win.el;
    const preview = document.getElementById('snap-preview');
    handle.addEventListener('pointerdown', ev => {
      if (ev.target.closest('.win-controls') || ev.button !== 0) return;
      ev.preventDefault();
      let startX = ev.clientX, startY = ev.clientY;
      let ox = el.offsetLeft, oy = el.offsetTop;
      let dragging = false, snapZone = null;
      const move = e => {
        if (!dragging && Math.abs(e.clientX - startX) + Math.abs(e.clientY - startY) < 4) return;
        if (!dragging && win.maxed) {
          // dragging a maximized window un-maximizes it under the cursor
          const ratio = e.clientX / window.innerWidth;
          win.toggleMax();
          ox = Math.round(e.clientX - el.offsetWidth * ratio);
          oy = e.clientY - 16;
          startX = e.clientX; startY = e.clientY;
        }
        dragging = true;
        const nx = ox + e.clientX - startX;
        const ny = Utils.clamp(oy + e.clientY - startY, 0, window.innerHeight - 80);
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
        snapZone = null;
        const W = window.innerWidth, H = window.innerHeight - 48;
        if (e.clientY <= 2) snapZone = 'max';
        else if (e.clientX <= 2) snapZone = 'left';
        else if (e.clientX >= W - 3) snapZone = 'right';
        if (snapZone) {
          preview.style.display = 'block';
          if (snapZone === 'max') preview.style.cssText += `;display:block;left:6px;top:6px;width:${W - 12}px;height:${H - 12}px;`;
          else if (snapZone === 'left') preview.style.cssText += `;display:block;left:6px;top:6px;width:${Math.round(W / 2) - 10}px;height:${H - 12}px;`;
          else preview.style.cssText += `;display:block;left:${Math.round(W / 2) + 4}px;top:6px;width:${Math.round(W / 2) - 10}px;height:${H - 12}px;`;
        } else preview.style.display = 'none';
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        preview.style.display = 'none';
        if (snapZone === 'max') { if (!win.maxed) win.toggleMax(); }
        else if (snapZone) win.snap(snapZone);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  },

  _resize(win) {
    const el = win.el;
    el.querySelectorAll('.win-resizer').forEach(r => {
      const dir = r.classList[1];
      r.addEventListener('pointerdown', ev => {
        if (win.maxed || ev.button !== 0) return;
        ev.preventDefault(); ev.stopPropagation();
        win.focus();
        const sx = ev.clientX, sy = ev.clientY;
        const rect = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
        const move = e => {
          const dx = e.clientX - sx, dy = e.clientY - sy;
          let { x, y, w, h } = rect;
          if (dir.includes('e')) w = Math.max(320, rect.w + dx);
          if (dir.includes('s')) h = Math.max(200, rect.h + dy);
          if (dir.includes('w')) { w = Math.max(320, rect.w - dx); x = rect.x + rect.w - w; }
          if (dir.includes('n')) { h = Math.max(200, rect.h - dy); y = rect.y + rect.h - h; }
          el.style.left = x + 'px'; el.style.top = y + 'px';
          el.style.width = w + 'px'; el.style.height = h + 'px';
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      });
    });
  }
};
