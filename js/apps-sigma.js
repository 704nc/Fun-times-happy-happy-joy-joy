/* ============ Windows 11 Web — sigma: desktop sticky notes, auto dark mode at sunset, chess over Nearby ============ */
'use strict';

Achievements.list.push(
  { id: 'sticky', name: 'Post-it', desc: 'Stuck a note on the desktop.', icon: '🗒️', pts: 5 },
  { id: 'chess-net', name: 'Pen Pals', desc: 'Played Chess against another tab.', icon: '♟️', pts: 20 }
);

/* ---------- Desktop sticky notes ---------- */
const Stickies = {
  KEY: 'win11.stickies', COLORS: ['#fff7b1', '#c7f5c4', '#ffd6e7', '#cfe8ff', '#e7d9ff', '#e9e9e9'],
  list() { return Store.get(this.KEY, []); },
  save(l) { Store.set(this.KEY, l); Bus.emit('stickies:changed'); },
  add(text) {
    const l = this.list();
    const n = { id: Date.now() + Math.floor(Math.random() * 1000), text: text || '', color: this.COLORS[l.length % this.COLORS.length], x: 120 + (l.length % 5) * 30, y: 80 + (l.length % 5) * 30, w: 220, h: 200 };
    l.push(n); this.save(l); this.render(); Achievements.unlock('sticky');
    setTimeout(() => { const el = document.querySelector(`.sticky[data-id="${n.id}"] textarea`); if (el) el.focus(); }, 50);
    return n;
  },
  remove(id) { this.save(this.list().filter(n => n.id !== id)); this.render(); },
  update(id, patch) { const l = this.list(); const n = l.find(x => x.id === id); if (n) Object.assign(n, patch); Store.set(this.KEY, l); },
  render() {
    const layer = document.getElementById('desktop');
    const have = new Set([...document.querySelectorAll('.sticky')].map(e => +e.dataset.id));
    const l = this.list();
    l.forEach(n => {
      let el = document.querySelector(`.sticky[data-id="${n.id}"]`);
      if (!el) {
        el = Utils.el('div', 'sticky'); el.dataset.id = n.id;
        el.innerHTML = `<div class="sticky-head"><span class="sticky-colors">${this.COLORS.map(c => `<i style="background:${c}" data-c="${c}"></i>`).join('')}</span><button class="sticky-x" title="Delete note">✕</button></div><textarea spellcheck="false" placeholder="Take a note…"></textarea>`;
        layer.appendChild(el);
        const ta = el.querySelector('textarea');
        ta.value = n.text;
        ta.addEventListener('input', () => this.update(n.id, { text: ta.value }));
        el.querySelector('.sticky-x').addEventListener('click', () => { if (!ta.value.trim() || confirm('Delete this note?')) this.remove(n.id); });
        el.querySelector('.sticky-colors').addEventListener('click', e => { const c = e.target.closest('[data-c]'); if (c) { this.update(n.id, { color: c.dataset.c }); el.style.background = c.dataset.c; } });
        el.addEventListener('pointerdown', () => { document.querySelectorAll('.sticky').forEach(s => s.classList.remove('top')); el.classList.add('top'); });
        const head = el.querySelector('.sticky-head');
        head.addEventListener('pointerdown', ev => {
          if (ev.target.closest('button, i')) return;
          ev.preventDefault();
          const sx = ev.clientX - el.offsetLeft, sy = ev.clientY - el.offsetTop;
          const mv = e => { el.style.left = Utils.clamp(e.clientX - sx, 0, innerWidth - 60) + 'px'; el.style.top = Utils.clamp(e.clientY - sy, 0, innerHeight - 100) + 'px'; };
          const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); this.update(n.id, { x: el.offsetLeft, y: el.offsetTop }); };
          window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
        });
        new ResizeObserver(() => { if (el.offsetWidth && el.isConnected) this.update(n.id, { w: el.offsetWidth, h: el.offsetHeight }); }).observe(el);
      }
      el.style.left = n.x + 'px'; el.style.top = n.y + 'px'; el.style.width = (n.w || 220) + 'px'; el.style.height = (n.h || 200) + 'px'; el.style.background = n.color;
      have.delete(n.id);
    });
    have.forEach(id => { const el = document.querySelector(`.sticky[data-id="${id}"]`); if (el) el.remove(); });
  }
};
Bus.on('shell:unlock', () => {
  // migrate the old single-note app data
  const old = localStorage.getItem('win11.sticky');
  if (old && old.trim() && !Stickies.list().length) { Stickies.save([{ id: Date.now(), text: old, color: Stickies.COLORS[0], x: 140, y: 100, w: 240, h: 200 }]); localStorage.removeItem('win11.sticky'); }
  Stickies.render();
});
Apps.register({
  id: 'stickynotes', name: 'Sticky Notes', icon: '🗒️', color: 'linear-gradient(135deg,#ffe259,#ffa751)',
  category: 'Productivity', store: true, width: 360, height: 420, singleton: true,
  desc: 'Notes that live on your desktop: drag them around, recolor them, resize them. They survive reboots (of the tab).', rating: 4.6, size: '0.3 MB',
  mount(win) {
    win.body.innerHTML = `<div class="app-toolbar"><button class="fluent-btn sn-new">＋ New note</button><span class="wg-sub" style="margin-left:auto">Notes appear on the desktop</span></div><div class="sn-list"></div>`;
    const render = () => { const l = Stickies.list(); win.body.querySelector('.sn-list').innerHTML = l.length ? l.map(n => `<div class="sn-item" data-id="${n.id}" style="background:${n.color}"><div class="sn-text">${Utils.esc(n.text || 'Empty note')}</div><button data-del="${n.id}" title="Delete">🗑️</button></div>`).join('') : '<div class="placeholder-pane"><div class="ph-ico">🗒️</div>No notes yet. Click "New note".</div>'; };
    win.body.querySelector('.sn-new').addEventListener('click', () => { Stickies.add(''); render(); });
    win.body.querySelector('.sn-list').addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (d) { Stickies.remove(+d.dataset.del); render(); return; } const it = e.target.closest('.sn-item'); if (it) { const el = document.querySelector(`.sticky[data-id="${it.dataset.id}"]`); if (el) { el.classList.add('top'); el.querySelector('textarea').focus(); } } });
    win.on('stickies:changed', render);
    render();
  }
});
(() => { const un = Apps.uninstall.bind(Apps); Apps.uninstall = id => { un(id); }; })();

/* ---------- Auto dark mode at sunset ---------- */
const AutoTheme = {
  tick() {
    if (!Settings.get('autoTheme')) return;
    const w = typeof Weather !== 'undefined' && Weather.snapshot();
    const now = new Date(); const mins = now.getHours() * 60 + now.getMinutes();
    let rise = 7 * 60, set = 19 * 60;
    if (w && w.sun) { const p = s => { const d = new Date(s); return d.getHours() * 60 + d.getMinutes(); }; rise = p(w.sun.rise); set = p(w.sun.set); }
    const want = mins >= rise && mins < set ? 'light' : 'dark';
    if (Settings.get('theme') !== want) { Settings.set('theme', want); Shell.toast('Auto theme', want === 'dark' ? 'The sun set. Switching to dark mode. 🌙' : 'Good morning. Switching to light mode. ☀️', want === 'dark' ? '🌙' : '☀️'); }
  }
};
setInterval(() => AutoTheme.tick(), 60000);
Bus.on('settings:autoTheme', () => AutoTheme.tick());
Bus.on('weather:changed', () => AutoTheme.tick());
Bus.on('shell:unlock', () => setTimeout(() => AutoTheme.tick(), 3000));

/* ---------- Chess over Nearby Share (two tabs) ---------- */
Bus.on('nearby:msg', m => {
  if (m.type === 'chess-invite') {
    if (!Apps.isInstalled('chess')) { Nearby.send({ type: 'chess-decline', to: m.from, reason: 'Chess is not installed there' }); return; }
    Shell.toast('Chess', (m.name || 'Someone') + ' invited you to a game. Opening the board…', '♟️');
    setTimeout(() => { const w = Apps.launch('chess'); if (w && w._chessNet) w._chessNet({ id: m.game, side: 'b', peer: m.from, peerName: m.name }); Nearby.send({ type: 'chess-accept', to: m.from, game: m.game }); }, 600);
  } else if (m.type === 'chess-decline') Shell.toast('Chess', 'Declined: ' + (m.reason || 'no reason given'), '♟️');
});
