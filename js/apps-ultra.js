/* ============ Windows 11 Web — ultra: Labyrinth 3D raycaster, deep links, wallpaper slideshow,
   desktop icon positioning, shortcuts cheat sheet, js/curl terminal commands ============ */
'use strict';

Achievements.list.push(
  { id: 'labyrinth', name: 'Way Out', desc: 'Escaped the Labyrinth.', icon: '🧭', pts: 25 },
  { id: 'deeplink', name: 'Shortcut Taker', desc: 'Opened an app straight from a link.', icon: '🔗', pts: 5 },
  { id: 'arranger', name: 'Feng Shui', desc: 'Rearranged the desktop icons.', icon: '🧲', pts: 5 }
);

/* ---------- Labyrinth 3D (Wolfenstein-style raycaster) ---------- */
Apps.register({
  id: 'labyrinth', name: 'Labyrinth 3D', icon: '🧭', color: 'linear-gradient(135deg,#3a1c71,#d76d77,#ffaf7b)',
  category: 'Games', store: true, width: 560, height: 520,
  desc: 'A first-person maze rendered with a 1992-style raycaster, in a browser tab, in 2026. Collect the three keys and find the exit. WASD / arrows to move, drag or ← → to turn.', rating: 4.8, size: '1.9 MB',
  mount(win) {
    const W = 480, H = 320;
    const MAPS = [
      ['################', '#..#.......#...#', '#..#.####..#.#.#', '#....#..#....#.#', '####.#..####.#.#', '#....#.......#.#', '#.####.#####.#.#', '#.#....#...#...#', '#.#.####.#.###.#', '#.#......#.....#', '#.########.###.#', '#........#.#...#', '#.######.#.#.###', '#......#...#...#', '#.####.#####.#.E', '################']
    ];
    win.body.innerHTML = `<div class="game-center"><div class="game-hud"><span class="lb-keys">🔑 0/3</span><span class="lb-time">⏱ 0:00</span><span class="lb-best">Best ${HiScore.get('labyrinth') ? Utils.fmtTime(HiScore.get('labyrinth')) : '—'}</span><button class="fluent-btn subtle lb-new">New maze</button></div></div><div class="lb-touch"><button data-k="ArrowLeft">⟲</button><button data-k="ArrowUp">▲</button><button data-k="ArrowDown">▼</button><button data-k="ArrowRight">⟳</button></div>`;
    const { c, ctx } = makeCanvas(win, W, H);
    win.body.querySelector('.game-center').appendChild(c);
    c.tabIndex = 0;
    let map, px, py, ang, keys = {}, items, got, t0, done, exitPos;
    function reset() {
      map = MAPS[0].map(r => r.split(''));
      px = 1.5; py = 1.5; ang = 0; got = 0; done = false; t0 = performance.now();
      const floor = []; map.forEach((row, y) => row.forEach((ch, x) => { if (ch === '.' && (x > 2 || y > 2)) floor.push([x + .5, y + .5]); if (ch === 'E') { exitPos = [x, y]; map[y][x] = '.'; } }));
      items = [];
      while (items.length < 3) { const p = floor[Math.floor(Math.random() * floor.length)]; if (!items.some(i => i[0] === p[0] && i[1] === p[1])) items.push(p); }
      hud();
    }
    function hud() { win.body.querySelector('.lb-keys').textContent = `🔑 ${got}/3`; }
    const wall = (x, y) => { const r = map[Math.floor(y)]; return !r || r[Math.floor(x)] !== '.'; };
    function update(dt) {
      if (done) return;
      const turn = (keys.ArrowLeft || keys.a ? -1 : 0) + (keys.ArrowRight || keys.d ? 1 : 0);
      ang += turn * 2.4 * dt;
      const mv = (keys.ArrowUp || keys.w ? 1 : 0) - (keys.ArrowDown || keys.s ? 1 : 0);
      if (mv) {
        const nx = px + Math.cos(ang) * mv * 2.2 * dt, ny = py + Math.sin(ang) * mv * 2.2 * dt;
        if (!wall(nx + Math.sign(nx - px) * .2, py)) px = nx;
        if (!wall(px, ny + Math.sign(ny - py) * .2)) py = ny;
      }
      items = items.filter(i => { if (Math.hypot(i[0] - px, i[1] - py) < .45) { got++; hud(); blip(84 + got * 4, 0.1); return false; } return true; });
      win.body.querySelector('.lb-time').textContent = '⏱ ' + Utils.fmtTime((performance.now() - t0) / 1000);
      if (got === 3 && Math.floor(px) === exitPos[0] && Math.floor(py) === exitPos[1]) {
        done = true;
        const secs = Math.round((performance.now() - t0) / 1000);
        const best = HiScore.get('labyrinth');
        if (!best || secs < best) { HiScore.submit('labyrinth', 1); Store.set('win11.hiscores', Object.assign(Store.get('win11.hiscores', {}), { labyrinth: secs })); win.body.querySelector('.lb-best').textContent = 'Best ' + Utils.fmtTime(secs); }
        Achievements.unlock('labyrinth'); Party.confetti(3);
        Shell.toast('Labyrinth 3D', 'You escaped in ' + Utils.fmtTime(secs) + '!', '🧭');
      }
    }
    function draw() {
      const sky = ctx.createLinearGradient(0, 0, 0, H / 2); sky.addColorStop(0, '#1b1b3a'); sky.addColorStop(1, '#3a2a5a');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H / 2);
      const fl = ctx.createLinearGradient(0, H / 2, 0, H); fl.addColorStop(0, '#2a2a2a'); fl.addColorStop(1, '#555');
      ctx.fillStyle = fl; ctx.fillRect(0, H / 2, W, H / 2);
      const fov = Math.PI / 3, cols = 160, cw = W / cols, depth = new Array(cols);
      for (let i = 0; i < cols; i++) {
        const ra = ang - fov / 2 + (i / cols) * fov;
        const dx = Math.cos(ra), dy = Math.sin(ra);
        // DDA
        let mx = Math.floor(px), my = Math.floor(py);
        const ddx = Math.abs(1 / dx), ddy = Math.abs(1 / dy);
        let sx, sy, sdx, sdy;
        if (dx < 0) { sx = -1; sdx = (px - mx) * ddx; } else { sx = 1; sdx = (mx + 1 - px) * ddx; }
        if (dy < 0) { sy = -1; sdy = (py - my) * ddy; } else { sy = 1; sdy = (my + 1 - py) * ddy; }
        let side = 0, hit = false, n = 0;
        while (!hit && n++ < 64) { if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; } if (wall(mx + .5, my + .5)) hit = true; }
        const dist = (side === 0 ? sdx - ddx : sdy - ddy) * Math.cos(ra - ang);
        depth[i] = dist;
        const h = Math.min(H, H / Math.max(.05, dist));
        const isExit = mx === exitPos[0] && my === exitPos[1] - 0 && false;
        const shade = Math.max(0, 1 - dist / 12);
        const base = ((mx + my) % 2 === 0) ? [120, 70, 160] : [90, 110, 190];
        ctx.fillStyle = `rgb(${base[0] * shade * (side ? .7 : 1) | 0},${base[1] * shade * (side ? .7 : 1) | 0},${base[2] * shade * (side ? .7 : 1) | 0})`;
        ctx.fillRect(i * cw, (H - h) / 2, cw + 1, h);
        void isExit;
      }
      // sprites: keys and exit marker, sorted far to near
      const sprites = items.map(i => ({ x: i[0], y: i[1], glyph: '🔑' })).concat([{ x: exitPos[0] + .5, y: exitPos[1] + .5, glyph: got === 3 ? '🚪' : '🔒' }]);
      sprites.map(s => ({ s, d: Math.hypot(s.x - px, s.y - py) })).sort((a, b) => b.d - a.d).forEach(({ s, d }) => {
        let a = Math.atan2(s.y - py, s.x - px) - ang;
        while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
        if (Math.abs(a) > fov / 2 + .3) return;
        const col = Math.floor((a + fov / 2) / fov * cols);
        if (depth[Math.max(0, Math.min(cols - 1, col))] < d * Math.cos(a)) return;
        const size = Math.min(160, 90 / Math.max(.3, d));
        ctx.font = size + 'px serif'; ctx.textAlign = 'center';
        ctx.fillText(s.glyph, W / 2 + Math.tan(a) * (W / 2) / Math.tan(fov / 2), H / 2 + size / 2 + size * .1);
      });
      // minimap
      const ms = 5, ox = W - map[0].length * ms - 8, oy = 8;
      ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(ox - 2, oy - 2, map[0].length * ms + 4, map.length * ms + 4);
      map.forEach((row, y) => row.forEach((ch, x) => { if (ch !== '.') { ctx.fillStyle = '#9b8fc4'; ctx.fillRect(ox + x * ms, oy + y * ms, ms, ms); } }));
      items.forEach(i => { ctx.fillStyle = '#ffd700'; ctx.fillRect(ox + i[0] * ms - 2, oy + i[1] * ms - 2, 4, 4); });
      ctx.fillStyle = got === 3 ? '#3ddc84' : '#e55'; ctx.fillRect(ox + exitPos[0] * ms, oy + exitPos[1] * ms, ms, ms);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox + px * ms, oy + py * ms, 2.5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(ox + px * ms, oy + py * ms); ctx.lineTo(ox + (px + Math.cos(ang)) * ms, oy + (py + Math.sin(ang)) * ms); ctx.stroke();
      if (done) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 28px Segoe UI, system-ui, sans-serif'; ctx.fillText('YOU ESCAPED', W / 2, H / 2); ctx.font = '14px Segoe UI, system-ui, sans-serif'; ctx.fillText('Click "New maze" to play again', W / 2, H / 2 + 28); }
      else if (performance.now() - t0 < 4000) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.textAlign = 'center'; ctx.font = '600 14px Segoe UI, system-ui, sans-serif'; ctx.fillText('Find 3 keys, then the exit. WASD / arrows. Drag to look.', W / 2, H - 14); }
    }
    c.addEventListener('keydown', e => { keys[e.key] = true; if (e.key.startsWith('Arrow') || e.key === ' ') e.preventDefault(); });
    c.addEventListener('keyup', e => { keys[e.key] = false; });
    let drag = null;
    c.addEventListener('pointerdown', e => { e.preventDefault(); c.focus(); drag = { x: e.clientX, a: ang }; });
    c.addEventListener('pointermove', e => { if (drag) ang = drag.a + (e.clientX - drag.x) * 0.008; });
    window.addEventListener('pointerup', () => { drag = null; });
    const touch = win.body.querySelector('.lb-touch');
    touch.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); keys[b.dataset.k] = true; } });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => touch.addEventListener(ev, () => { Object.keys(keys).forEach(k => keys[k] = false); }));
    win.body.querySelector('.lb-new').addEventListener('click', () => { reset(); c.focus(); });
    reset();
    gameLoop(win, dt => { update(dt); draw(); });
    setTimeout(() => c.focus(), 100);
  }
});

/* ---------- Deep links: ?app=id[&path=C:/...] ---------- */
Bus.on('shell:unlock', () => {
  const p = new URLSearchParams(location.search);
  const app = p.get('app');
  if (!app) return;
  history.replaceState(null, '', location.pathname);
  if (Apps.get(app) && Apps.isInstalled(app)) { setTimeout(() => { Apps.launch(app, p.get('path') ? { path: p.get('path') } : undefined); Achievements.unlock('deeplink'); }, 600); }
  else Shell.toast('Windows 11 Web', 'The link asked for "' + app + '", which isn\'t installed here.', '🔗');
});

/* ---------- Wallpaper slideshow ---------- */
(() => {
  let last = Date.now();
  setInterval(() => {
    const min = +Settings.get('wallpaperSlide') || 0;
    if (!min || document.hidden || Date.now() - last < min * 60000) return;
    last = Date.now();
    const ids = Wallpapers.ids.filter(id => !/live/.test(id));
    const cur = ids.indexOf(Settings.get('wallpaper'));
    Settings.set('wallpaper', ids[(cur + 1) % ids.length]);
  }, 15000);
  Bus.on('settings:wallpaperSlide', () => { last = Date.now(); });
})();

/* ---------- Desktop icons: drag to arrange (positions persist) ---------- */
const IconLayout = {
  KEY: 'win11.iconpos',
  keyOf(ic) { return ic.dataset.app ? 'app:' + ic.dataset.app : ic.dataset.file ? 'file:' + ic.dataset.file : 'sys:' + ic.dataset.sys; },
  apply() {
    const pos = Store.get(this.KEY, {});
    document.querySelectorAll('#desktop-icons .desk-icon').forEach(ic => {
      const p = pos[this.keyOf(ic)];
      if (p) { ic.style.position = 'absolute'; ic.style.left = p.x + 'px'; ic.style.top = p.y + 'px'; }
    });
  },
  init() {
    const iconsEl = document.getElementById('desktop-icons');
    const render = Shell.renderDesktopIcons.bind(Shell);
    Shell.renderDesktopIcons = function () { render(); IconLayout.apply(); };
    this.apply();
    iconsEl.addEventListener('pointerdown', e => {
      const ic = e.target.closest('.desk-icon'); if (!ic || e.button !== 0) return;
      const sx = e.clientX, sy = e.clientY, r = ic.getBoundingClientRect(), host = iconsEl.getBoundingClientRect();
      let moving = false;
      const mv = ev => {
        if (!moving && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        if (!moving) { moving = true; ic.classList.add('dragging'); ic.style.position = 'absolute'; ic.style.zIndex = 5; }
        ic.style.left = (r.left - host.left + ev.clientX - sx) + 'px';
        ic.style.top = (r.top - host.top + ev.clientY - sy) + 'px';
      };
      const up = ev => {
        window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
        if (!moving) return;
        ic.classList.remove('dragging'); ic.style.zIndex = '';
        const g = 90, x = Utils.clamp(Math.round((r.left - host.left + ev.clientX - sx - 8) / g) * g + 8, 8, host.width - 92), y = Utils.clamp(Math.round((r.top - host.top + ev.clientY - sy - 8) / g) * g + 8, 8, host.height - 92);
        ic.style.left = x + 'px'; ic.style.top = y + 'px';
        const pos = Store.get(this.KEY, {}); pos[this.keyOf(ic)] = { x, y }; Store.set(this.KEY, pos);
        Achievements.unlock('arranger');
        const swallow = c => { c.stopPropagation(); c.preventDefault(); iconsEl.removeEventListener('click', swallow, true); };
        iconsEl.addEventListener('click', swallow, true); setTimeout(() => iconsEl.removeEventListener('click', swallow, true), 300);
      };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
    // "Auto arrange" in the desktop context menu
    const cm = Shell.contextMenu.bind(Shell);
    Shell.contextMenu = function (x, y, items) {
      if (items.some(i => i.label === 'Next wallpaper')) items.splice(1, 0, { label: 'Auto arrange icons', icon: '🧲', fn: () => { Store.set(IconLayout.KEY, {}); Shell.renderDesktopIcons(); } });
      return cm(x, y, items);
    };
  }
};
document.addEventListener('DOMContentLoaded', () => IconLayout.init());

/* ---------- Keyboard shortcuts cheat sheet (Win+/ or F1 on the desktop) ---------- */
const CheatSheet = {
  el: null,
  KEYS: [['Alt + Tab', 'Switch windows'], ['Win + Tab', 'Task View / virtual desktops'], ['Ctrl + Win + ← →', 'Switch desktop'], ['Win + D', 'Show desktop'], ['Win + E', 'File Explorer'], ['Win + I', 'Settings'], ['Win + R', 'Run'], ['Win + .', 'Emoji panel'], ['Win + V', 'Clipboard history'], ['Win + Shift + S', 'Screenshot'], ['Win + /', 'This cheat sheet'], ['Ctrl + Esc', 'Start menu'], ['Ctrl + Shift + Esc', 'Task Manager'], ['Esc', 'Close menus'], ['↑↑↓↓←→←→ B A', 'You know what this does']],
  toggle() {
    if (this.el) { this.el.remove(); this.el = null; return; }
    this.el = Utils.el('div', 'cheat-sheet');
    this.el.innerHTML = `<div class="cheat-card"><div class="cheat-head"><span>⌨️ Keyboard shortcuts</span><button class="cheat-x">✕</button></div><div class="cheat-grid">${this.KEYS.map(([k, d]) => `<div><kbd>${k}</kbd><span>${d}</span></div>`).join('')}</div><div class="wg-sub" style="margin-top:10px">On Windows hosts the OS grabs a few Win-key combos; the taskbar buttons do the same things.</div></div>`;
    document.body.appendChild(this.el);
    this.el.addEventListener('click', e => { if (e.target === this.el || e.target.closest('.cheat-x')) this.toggle(); });
  }
};
document.addEventListener('keydown', e => {
  if ((e.metaKey && (e.key === '/' || e.key === '?')) || (e.key === 'F1' && !e.target.closest('input, textarea, [contenteditable]'))) { e.preventDefault(); CheatSheet.toggle(); }
  else if (CheatSheet.el && e.key === 'Escape') CheatSheet.toggle();
});

/* ---------- Terminal: js REPL and curl ---------- */
Object.assign(FunCmds, {
  js(print, arg) {
    if (!arg) { print('Usage: js <expression>   e.g. js [1,2,3].map(x=>x*2)'); return; }
    try { const v = Function('"use strict";return (' + arg + ')')(); print(typeof v === 'string' ? v : JSON.stringify(v, null, 1) || String(v)); }
    catch (e) { print(e.constructor.name + ': ' + e.message); }
  },
  curl(print, arg, win) {
    if (!arg) { print('Usage: curl <url>'); return; }
    const url = /^https?:/.test(arg) ? arg : 'https://' + arg;
    print('Fetching ' + url + ' …');
    const root = win.body.querySelector('.term-root');
    const out = s => { const l = Utils.el('div', 't-line'); l.textContent = s; root.insertBefore(l, root.lastElementChild); root.scrollTop = root.scrollHeight; };
    fetch(url).then(r => r.text().then(t => { out('HTTP ' + r.status + ' • ' + (r.headers.get('content-type') || '') + ' • ' + Utils.fmtBytes(t.length)); t.split('\n').slice(0, 40).forEach(l => out(l.slice(0, 200))); if (t.split('\n').length > 40) out('… (truncated)'); }))
      .catch(e => out('curl: (7) ' + e.message + ' — most sites block cross-origin requests; try https://api.open-meteo.com/v1/forecast?latitude=47&longitude=-122&current=temperature_2m'));
  }
});
