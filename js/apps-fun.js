/* ============ Windows 11 Web — fun: achievements, Clippy, screensaver, party mode, BSOD,
   Task Manager, hotkeys, power menu, arcade games, extra terminal commands ============ */
'use strict';

/* ---------- tiny persisted JSON helper ---------- */
const Store = {
  get(k, d) {
    try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; }
    catch (e) { return d; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

const HiScore = {
  _key: 'win11.hiscores',
  get(game) { return +(Store.get(this._key, {})[game] || 0); },
  submit(game, score) {
    const all = Store.get(this._key, {});
    if (score > (all[game] || 0)) { all[game] = score; Store.set(this._key, all); return true; }
    return false;
  }
};

/* ---------- Achievements ---------- */
const Achievements = {
  _key: 'win11.achievements',
  _statsKey: 'win11.stats',
  list: [
    { id: 'first-boot', name: 'Hello, World', desc: 'Signed in to Windows 11 Web.', icon: '👋', pts: 5 },
    { id: 'explorer', name: 'Window Shopper', desc: 'Opened 5 different apps.', icon: '🪟', pts: 10 },
    { id: 'power-user', name: 'Power User', desc: 'Opened every built-in app.', icon: '⚡', pts: 25 },
    { id: 'installer', name: 'Downloader', desc: 'Installed an app from the Store.', icon: '🛍️', pts: 10 },
    { id: 'collector', name: 'Collector', desc: 'Installed 5 Store apps.', icon: '📚', pts: 20 },
    { id: 'author', name: 'Author', desc: 'Saved a file.', icon: '💾', pts: 10 },
    { id: 'terminal-velocity', name: 'Terminal Velocity', desc: 'Ran 10 commands in Terminal.', icon: '⌨️', pts: 10 },
    { id: 'minesweeper', name: 'Bomb Squad', desc: 'Won a game of Minesweeper.', icon: '💣', pts: 20 },
    { id: 'tictactoe', name: 'The Only Winning Move', desc: 'Drew against the Tic-Tac-Toe AI.', icon: '🤝', pts: 10 },
    { id: '2048', name: 'Powers of Two', desc: 'Reached 512 in 2048.', icon: '🔢', pts: 20 },
    { id: 'snake', name: 'Snake Charmer', desc: 'Scored 10 in Snake.', icon: '🐍', pts: 15 },
    { id: 'breakout', name: 'Wall Breaker', desc: 'Cleared a level in Breakout.', icon: '🧱', pts: 20 },
    { id: 'pong', name: 'Table Tennis Champ', desc: 'Beat the computer at Pong.', icon: '🏓', pts: 20 },
    { id: 'flappy', name: 'Frequent Flyer', desc: 'Scored 10 in Flappy Window.', icon: '🐦', pts: 20 },
    { id: 'clippy', name: 'It Looks Like…', desc: 'Summoned Clippy.', icon: '📎', pts: 10 },
    { id: 'taskmgr', name: 'Not Responding', desc: 'Ended a task in Task Manager.', icon: '📊', pts: 10 },
    { id: 'screensaver', name: 'Idle Hands', desc: 'Watched the screensaver.', icon: '🫧', pts: 5 },
    { id: 'night-owl', name: 'Night Owl', desc: 'Used Windows 11 Web after midnight.', icon: '🦉', pts: 10 },
    { id: 'konami', name: '↑↑↓↓←→←→BA', desc: 'You know the code.', icon: '🎉', pts: 30, secret: true },
    { id: 'bsod', name: 'Blue Screen of Death', desc: 'Crashed Windows on purpose.', icon: '💙', pts: 15, secret: true }
  ],
  unlocked() { return Store.get(this._key, {}); },
  has(id) { return !!this.unlocked()[id]; },
  score() { return this.list.filter(a => this.has(a.id)).reduce((s, a) => s + a.pts, 0); },
  total() { return this.list.reduce((s, a) => s + a.pts, 0); },
  unlock(id) {
    const a = this.list.find(x => x.id === id);
    if (!a || this.has(id)) return false;
    const all = this.unlocked();
    all[id] = Date.now();
    Store.set(this._key, all);
    Shell.toast('Achievement unlocked — ' + a.name, a.desc + '  (+' + a.pts + ' G)', a.icon);
    try { [[72, 0], [76, 90], [79, 180], [84, 300]].forEach(([m, t]) => setTimeout(() => Synth.note(m, 0.5, 'triangle'), t)); } catch (e) {}
    Bus.emit('achievements:changed', id);
    return true;
  },
  stats() { return Store.get(this._statsKey, { opened: [], cmds: 0 }); },
  track(kind, value) {
    const s = this.stats();
    if (kind === 'open') {
      if (!s.opened.includes(value)) s.opened.push(value);
      Store.set(this._statsKey, s);
      if (s.opened.length >= 5) this.unlock('explorer');
      const builtin = Apps.all().filter(a => !a.store).map(a => a.id);
      if (builtin.every(id => s.opened.includes(id))) this.unlock('power-user');
    } else if (kind === 'cmd') {
      s.cmds = (s.cmds || 0) + 1;
      Store.set(this._statsKey, s);
      if (s.cmds >= 10) this.unlock('terminal-velocity');
    }
  }
};

/* hooks into existing systems */
(() => {
  const launch = Apps.launch.bind(Apps);
  Apps.launch = function (id, args) {
    const w = launch(id, args);
    if (w) { Achievements.track('open', id); Clippy.onApp(id); }
    return w;
  };
  const write = FS.write.bind(FS);
  FS.write = function (path, content, mime) {
    const ok = write(path, content, mime);
    if (ok && content) Achievements.unlock('author');
    return ok;
  };
  Bus.on('apps:changed', () => {
    const n = (Settings.get('installedApps') || []).length;
    if (n >= 1) Achievements.unlock('installer');
    if (n >= 5) Achievements.unlock('collector');
  });
  Bus.on('terminal:cmd', () => Achievements.track('cmd'));
  Bus.on('shell:unlock', () => {
    Achievements.unlock('first-boot');
    const h = new Date().getHours();
    if (h >= 0 && h < 5) Achievements.unlock('night-owl');
    if (Settings.get('clippy')) setTimeout(() => Clippy.show(true), 1500);
    Screensaver.init();
  });
  Bus.on('settings:clippy', on => on ? Clippy.show() : Clippy.hide());
})();

/* ---------- Xbox Achievements app ---------- */
Apps.register({
  id: 'xbox', name: 'Xbox Achievements', icon: '🏆', color: 'linear-gradient(135deg,#107c10,#0b5a0b)',
  category: 'Games', width: 720, height: 560, singleton: true,
  mount(win) {
    function render() {
      const got = Achievements.unlocked();
      const score = Achievements.score(), total = Achievements.total();
      const n = Object.keys(got).length;
      win.body.innerHTML = `
        <div class="ach-root">
          <div class="ach-head">
            <div class="ach-avatar">${Utils.esc((Settings.get('userName') || 'S')[0])}</div>
            <div style="flex:1">
              <div class="ach-name">${Utils.esc(Settings.get('userName') || 'Seefood')}</div>
              <div class="ach-sub">${n} / ${Achievements.list.length} achievements • <b>${score} G</b> of ${total} G</div>
              <div class="ach-bar"><div style="width:${Math.round(100 * score / total)}%"></div></div>
            </div>
          </div>
          ${(() => { const h = Store.get('win11.hiscores', {}); const names = { breakout: 'Breakout', pong: 'Pong', flappy: 'Flappy Window', tetris: 'Tetris', invaders: 'Space Invaders', solitaire: 'Solitaire', chess: 'Chess' }; const snake = +(localStorage.getItem('win11.snake.hi') || 0); if (snake) h.snake = snake; const keys = Object.keys(h).filter(k => h[k]); return keys.length ? `<div class="ach-hs"><div class="ach-hs-t">High scores</div>${keys.map(k => `<div class="ach-hs-row"><span>${names[k] || (k === 'snake' ? 'Snake' : k)}</span><b>${h[k]}</b></div>`).join('')}</div>` : ''; })()}
          <div class="ach-grid">${Achievements.list.map(a => {
            const on = !!got[a.id];
            const hidden = a.secret && !on;
            return `<div class="ach-card ${on ? 'on' : ''}">
              <div class="ach-ico">${hidden ? '❔' : a.icon}</div>
              <div style="flex:1"><div class="ach-t">${hidden ? 'Secret achievement' : Utils.esc(a.name)}</div>
              <div class="ach-d">${hidden ? 'Keep exploring…' : Utils.esc(a.desc)}</div>
              ${on ? `<div class="ach-when">Unlocked ${new Date(got[a.id]).toLocaleDateString()}</div>` : ''}</div>
              <div class="ach-pts">${a.pts} G</div>
            </div>`;
          }).join('')}</div>
        </div>`;
    }
    render();
    win.on('achievements:changed', () => { if (win.body.isConnected) render(); });
  }
});

/* ---------- Clippy ---------- */
const Clippy = {
  el: null, timer: null, _idx: 0,
  TIPS: [
    'It looks like you\'re using a web browser. Would you like help pretending it\'s an operating system?',
    'Did you know? The Microsoft Store has games you can actually play. I checked. Twice.',
    'Try typing "help" in Terminal. Or "cowsay". I won\'t judge.',
    'Press Alt+Tab to switch windows like it\'s 1995.',
    'Tip: right-click the desktop to change the wallpaper. I prefer the green one.',
    'You can drag a window to the edge of the screen to snap it. Neat, huh?',
    'I have been waiting in this browser tab for a very long time.',
    'Have you tried turning it off and on again? The Start menu has a power button.',
    'Ctrl+Shift+Esc opens Task Manager. You could end my task. But you won\'t.',
    'Excel here supports formulas like =SUM(A1:A5). Budget responsibly.',
    'There are secret achievements. That\'s all I\'m allowed to say.',
    'Everything you make is saved in this browser. Clear site data and I vanish. Forever.'
  ],
  APP_TIPS: {
    word: 'It looks like you\'re writing a letter. Would you like help?',
    excel: 'It looks like you\'re building a spreadsheet. Have you tried =SUM()?',
    powerpoint: 'It looks like you\'re making a presentation. Fewer bullet points, more pictures.',
    paint: 'It looks like you\'re drawing. Flood fill is the bucket icon.',
    terminal: 'It looks like you\'re a hacker. Type "neofetch" to look the part.',
    minesweeper: 'Right-click to plant a flag. Left-click to regret your choices.',
    taskmgr: 'I see you\'ve found Task Manager. Please be gentle.'
  },
  show(quiet) {
    if (this.el) return;
    const el = Utils.el('div', 'clippy');
    el.innerHTML = `<div class="clippy-bubble"></div><div class="clippy-body" title="Clippy — click for another tip, right-click to dismiss">📎</div>`;
    document.body.appendChild(el);
    this.el = el;
    el.querySelector('.clippy-body').addEventListener('click', e => { e.stopPropagation(); this.next(); });
    el.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      Shell.contextMenu(e.clientX, e.clientY, [
        { label: 'Another tip', icon: '💡', fn: () => this.next() },
        { label: 'Open Copilot', icon: '✦', fn: () => Apps.launch('copilot') },
        { sep: true },
        { label: 'Hide Clippy', icon: '👋', fn: () => Settings.set('clippy', false) }
      ]);
    });
    this.say(quiet ? 'Hi! I\'m Clippy. Click me for tips, right-click to make me go away.' : this.TIPS[0]);
    this.timer = setInterval(() => this.next(), 45000);
    Achievements.unlock('clippy');
  },
  hide() {
    if (!this.el) return;
    clearInterval(this.timer);
    this.el.classList.add('bye');
    const el = this.el; this.el = null;
    setTimeout(() => el.remove(), 400);
  },
  toggle() { Settings.set('clippy', !Settings.get('clippy')); },
  say(text) {
    if (!this.el) return;
    const b = this.el.querySelector('.clippy-bubble');
    b.textContent = text;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    const body = this.el.querySelector('.clippy-body');
    body.classList.remove('wiggle'); void body.offsetWidth; body.classList.add('wiggle');
  },
  next() {
    this._idx = (this._idx + 1) % this.TIPS.length;
    this.say(this.TIPS[this._idx]);
  },
  onApp(id) {
    if (this.el && this.APP_TIPS[id] && Math.random() < 0.7) setTimeout(() => this.say(this.APP_TIPS[id]), 600);
  }
};

/* ---------- Screensaver ---------- */
const Screensaver = {
  styles: { bubbles: 'Bubbles', starfield: 'Starfield', mystify: 'Mystify', logo: 'Bouncing Logo' },
  _canvas: null, _raf: null, _idleT: null, _inited: false,
  init() {
    if (this._inited) return;
    this._inited = true;
    const reset = () => this._arm();
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(ev => document.addEventListener(ev, reset, { passive: true }));
    Bus.on('settings:screensaverMin', reset);
    this._arm();
  },
  _arm() {
    clearTimeout(this._idleT);
    const min = +Settings.get('screensaverMin') || 0;
    if (min > 0) this._idleT = setTimeout(() => this.start(), min * 60000);
  },
  start(style) {
    if (this._canvas) return;
    style = style || Settings.get('screensaver') || 'bubbles';
    const c = Utils.el('canvas'); c.id = 'screensaver';
    document.body.appendChild(c);
    this._canvas = c;
    const ctx = c.getContext('2d');
    const fit = () => { c.width = innerWidth; c.height = innerHeight; };
    fit();
    const W = () => c.width, H = () => c.height;
    let state = null;
    const draw = {
      bubbles() {
        if (!state) state = Array.from({ length: 22 }, () => ({ x: Math.random() * W(), y: Math.random() * H(), r: 30 + Math.random() * 60, vx: (Math.random() - .5) * 1.6, vy: (Math.random() - .5) * 1.6, h: Math.random() * 360 }));
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(0, 0, W(), H());
        for (const b of state) {
          b.x += b.vx; b.y += b.vy; b.h = (b.h + .4) % 360;
          if (b.x < b.r || b.x > W() - b.r) b.vx *= -1;
          if (b.y < b.r || b.y > H() - b.r) b.vy *= -1;
          const g = ctx.createRadialGradient(b.x - b.r * .3, b.y - b.r * .3, b.r * .1, b.x, b.y, b.r);
          g.addColorStop(0, `hsla(${b.h},90%,80%,.9)`); g.addColorStop(1, `hsla(${b.h},80%,50%,.15)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = `hsla(${b.h},90%,85%,.6)`; ctx.lineWidth = 2; ctx.stroke();
        }
      },
      starfield() {
        if (!state) state = Array.from({ length: 400 }, () => ({ x: (Math.random() - .5) * W(), y: (Math.random() - .5) * H(), z: Math.random() * W() }));
        ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, W(), H());
        ctx.fillStyle = '#fff';
        for (const s of state) {
          s.z -= 6;
          if (s.z <= 1) { s.x = (Math.random() - .5) * W(); s.y = (Math.random() - .5) * H(); s.z = W(); }
          const k = 200 / s.z, px = s.x * k + W() / 2, py = s.y * k + H() / 2;
          const sz = Math.max(.5, (1 - s.z / W()) * 3.5);
          ctx.globalAlpha = 1 - s.z / W();
          ctx.fillRect(px, py, sz, sz);
        }
        ctx.globalAlpha = 1;
      },
      mystify() {
        if (!state) state = Array.from({ length: 2 }, (_, i) => ({ h: i * 180, pts: Array.from({ length: 4 }, () => ({ x: Math.random() * W(), y: Math.random() * H(), vx: (Math.random() - .5) * 5, vy: (Math.random() - .5) * 5 })), trail: [] }));
        ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fillRect(0, 0, W(), H());
        for (const poly of state) {
          poly.h = (poly.h + 1) % 360;
          for (const p of poly.pts) {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > W()) p.vx *= -1;
            if (p.y < 0 || p.y > H()) p.vy *= -1;
          }
          ctx.strokeStyle = `hsl(${poly.h},100%,60%)`; ctx.lineWidth = 2;
          ctx.beginPath();
          poly.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
          ctx.closePath(); ctx.stroke();
        }
      },
      logo() {
        if (!state) state = { x: 100, y: 100, vx: 3, vy: 2.4, h: 210, s: 120 };
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W(), H());
        const l = state; l.x += l.vx; l.y += l.vy;
        let hit = false;
        if (l.x < 0 || l.x > W() - l.s) { l.vx *= -1; hit = true; }
        if (l.y < 0 || l.y > H() - l.s) { l.vy *= -1; hit = true; }
        if (hit) l.h = (l.h + 137) % 360;
        ctx.fillStyle = `hsl(${l.h},85%,55%)`;
        const q = l.s * 0.46, g = l.s * 0.08;
        ctx.fillRect(l.x, l.y, q, q); ctx.fillRect(l.x + q + g, l.y, q, q);
        ctx.fillRect(l.x, l.y + q + g, q, q); ctx.fillRect(l.x + q + g, l.y + q + g, q, q);
      }
    };
    const fn = draw[style] || (this.plugins && this.plugins[style] ? this.plugins[style](ctx, c) : draw.bubbles);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W(), H());
    const loop = () => { fn(); this._raf = requestAnimationFrame(loop); };
    this._raf = requestAnimationFrame(loop);
    const stop = () => this.stop();
    this._cleanup = () => {
      window.removeEventListener('resize', fit);
      ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(ev => window.removeEventListener(ev, stop, true));
    };
    window.addEventListener('resize', fit);
    // arm dismissal slightly later so the click/keypress that started it doesn't immediately end it
    setTimeout(() => { if (this._canvas === c) ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, stop, true)); }, 400);
    this._startedAt = Date.now();
  },
  stop() {
    if (!this._canvas) return;
    cancelAnimationFrame(this._raf);
    this._cleanup && this._cleanup();
    const c = this._canvas; this._canvas = null;
    c.classList.add('out');
    setTimeout(() => c.remove(), 400);
    if (Date.now() - this._startedAt > 3000) Achievements.unlock('screensaver');
    this._arm();
  }
};

/* ---------- Party mode (Konami code) ---------- */
const Party = {
  _on: false,
  confetti(seconds) {
    const c = Utils.el('canvas'); c.id = 'confetti';
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const colors = ['#0078d4', '#e3008c', '#ffb900', '#107c10', '#8764b8', '#ff4343', '#00b7c3'];
    const ps = Array.from({ length: 220 }, () => ({
      x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5,
      vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, r: 4 + Math.random() * 6,
      a: Math.random() * Math.PI, va: (Math.random() - .5) * .3, col: colors[Math.floor(Math.random() * colors.length)]
    }));
    const end = Date.now() + (seconds || 4) * 1000;
    let raf;
    const step = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of ps) {
        p.x += p.vx; p.y += p.vy; p.a += p.va; p.vx += Math.sin(p.y / 30) * .05;
        if (p.y > c.height + 20 && Date.now() < end) { p.y = -20; p.x = Math.random() * c.width; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        ctx.fillStyle = p.col; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
      }
      if (Date.now() < end + 3000) raf = requestAnimationFrame(step); else c.remove();
    };
    raf = requestAnimationFrame(step);
  },
  start() {
    if (this._on) return;
    this._on = true;
    Achievements.unlock('konami');
    this.confetti(5);
    document.documentElement.classList.add('party');
    Shell.toast('🎉 PARTY MODE 🎉', 'Happy happy, joy joy! (You found the Konami code.)', '🕺');
    try { [[60, 0], [64, 120], [67, 240], [72, 360], [67, 480], [72, 600], [76, 720], [79, 900]].forEach(([m, t]) => setTimeout(() => Synth.note(m, 0.4, 'square'), t)); } catch (e) {}
    let hue = 0;
    const t = setInterval(() => {
      hue = (hue + 12) % 360;
      document.documentElement.style.setProperty('--accent', `hsl(${hue},85%,50%)`);
    }, 80);
    setTimeout(() => {
      clearInterval(t);
      document.documentElement.classList.remove('party');
      document.documentElement.style.setProperty('--accent', Settings.get('accent'));
      this._on = false;
    }, 9000);
  }
};

/* ---------- BSOD ---------- */
const BSOD = {
  show(code) {
    if (document.getElementById('bsod')) return;
    Achievements.unlock('bsod');
    const el = Utils.el('div');
    el.id = 'bsod';
    el.innerHTML = `
      <div class="bsod-inner">
        <div class="bsod-face">:(</div>
        <p>Your PC ran into a problem and needs to restart. We're just collecting some error info, and then we'll restart for you.</p>
        <p class="bsod-pct"><span>0</span>% complete</p>
        <div class="bsod-foot">
          <div class="bsod-qr"></div>
          <div>
            <p>For more information about this issue and possible fixes, visit https://www.windows.com/stopcode</p>
            <p style="margin-top:14px">If you call a support person, give them this info:<br>Stop code: ${Utils.esc(code || 'USER_REQUESTED_CRASH')}<br>What failed: browser_tab.sys</p>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    const qr = el.querySelector('.bsod-qr');
    const rnd = Utils.rng(1337);
    for (let i = 0; i < 121; i++) { const d = Utils.el('i'); if (rnd() < .5) d.className = 'on'; qr.appendChild(d); }
    let pct = 0;
    const pctEl = el.querySelector('.bsod-pct span');
    const t = setInterval(() => {
      pct = Math.min(100, pct + Math.floor(Math.random() * 12));
      pctEl.textContent = pct;
      if (pct >= 100) {
        clearInterval(t);
        setTimeout(() => location.reload(), 900);
      }
    }, 380 + Math.random() * 300);
  }
};

/* ---------- Lock screen + power menu ---------- */
const Lock = {
  show() {
    if (document.getElementById('lockscreen')) return;
    const el = Utils.el('div');
    el.id = 'lockscreen';
    el.className = 'relock';
    el.innerHTML = `<div class="lock-center"><div class="lock-time"></div><div class="lock-date"></div><div class="lock-info">${typeof LockInfo !== 'undefined' ? LockInfo.html() : ''}</div></div><div class="lock-hint">Click anywhere or press any key to sign in</div>`;
    const wp = Settings.get('wallpaper');
    el.style.backgroundImage = `url('${wp.startsWith('custom:') ? wp.slice(7) : Wallpapers.uri(wp)}')`;
    const upd = () => {
      const now = new Date();
      el.querySelector('.lock-time').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      el.querySelector('.lock-date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };
    upd();
    const t = setInterval(upd, 15000);
    document.body.appendChild(el);
    Shell.closeFlyouts();
    const unlock = () => {
      clearInterval(t);
      document.removeEventListener('keydown', unlock);
      el.classList.add('unlocking');
      setTimeout(() => el.remove(), 500);
    };
    setTimeout(() => {
      el.addEventListener('click', unlock, { once: true });
      document.addEventListener('keydown', unlock, { once: true });
    }, 300);
  }
};

const Power = {
  menu(x, y) {
    Shell.contextMenu(x, y, [
      { label: 'Lock', icon: '🔒', fn: () => Lock.show() },
      { label: 'Sleep', icon: '🌙', fn: () => Screensaver.start() },
      { sep: true },
      { label: 'Restart', icon: '🔄', fn: () => this.shutdown(true) },
      { label: 'Shut down', icon: '⏻', fn: () => this.shutdown(false) }
    ]);
  },
  shutdown(restart) {
    Shell.toggleStart(false);
    const el = Utils.el('div');
    el.id = 'shutdown';
    el.innerHTML = `<div class="boot-logo"><div class="boot-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div><div class="sd-text">${restart ? 'Restarting' : 'Shutting down'}…</div></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    WM.all().forEach(w => w.close());
    setTimeout(() => {
      if (restart) { location.reload(); return; }
      el.innerHTML = `<div class="sd-off">It's now safe to turn off your computer.<br><small>(or click anywhere to turn it back on)</small></div>`;
      el.addEventListener('click', () => location.reload(), { once: true });
      document.addEventListener('keydown', () => location.reload(), { once: true });
    }, 1800);
  }
};

/* ---------- Task Manager ---------- */
Apps.register({
  id: 'taskmgr', name: 'Task Manager', icon: '📊', color: 'linear-gradient(135deg,#5aa0e6,#1e5aa8)',
  category: 'System', width: 700, height: 500, singleton: true,
  mount(win) {
    let selected = null, timer;
    const cpuHist = [];
    const sys = [
      { id: 'sys:explorer', name: 'Windows Explorer', icon: '🗂️', cpu: 1, mem: 84 },
      { id: 'sys:dwm', name: 'Desktop Window Manager', icon: '🪟', cpu: 2, mem: 61 },
      { id: 'sys:clippy', name: 'Office Assistant', icon: '📎', cpu: 0.5, mem: 12 },
      { id: 'sys:idle', name: 'System Idle Process', icon: '💤', cpu: 90, mem: 0 }
    ];
    const hash = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
    win.body.innerHTML = `
      <div class="tm-root">
        <div class="tm-perf"><canvas class="tm-graph" width="600" height="60"></canvas><div class="tm-perf-lbl">CPU <b class="tm-cpu">0%</b> • Memory <b class="tm-mem">0 MB</b> • Processes <b class="tm-n">0</b></div></div>
        <div class="tm-table">
          <div class="tm-row tm-head"><span>Name</span><span>Status</span><span>CPU</span><span>Memory</span></div>
          <div class="tm-body"></div>
        </div>
        <div class="tm-foot"><span class="tm-hint">Select a process to end it. Ctrl+Shift+Esc opens Task Manager from anywhere.</span><button class="fluent-btn tm-end" disabled>End task</button></div>
      </div>`;
    const body = win.body.querySelector('.tm-body');
    const endBtn = win.body.querySelector('.tm-end');
    const graph = win.body.querySelector('.tm-graph');
    function procs() {
      const wins = WM.all().map(w => {
        if (w._cpu === undefined) w._cpu = 2 + Math.random() * 8;
        w._cpu = Utils.clamp(w._cpu + (Math.random() - .5) * 4, 0.1, 45);
        const base = 40 + (hash(w.app.id) % 220);
        return { id: w.id, name: w.getTitle(), icon: w.app.icon, letter: w.app.letter, color: w.app.color, cpu: w._cpu, mem: base + Math.round((Math.random() - .5) * 6), status: w.minimized ? 'Suspended' : 'Running', win: w };
      });
      const used = wins.reduce((s, p) => s + p.cpu, 0) + 3.5;
      sys[3].cpu = Math.max(0, 100 - used);
      sys[2].cpu = Clippy.el ? 0.6 : 0;
      sys[2].mem = Clippy.el ? 12 : 0;
      return wins.concat(sys.filter(s => s.mem || s.id === 'sys:idle').map(s => ({ ...s, status: 'Running' })));
    }
    function render() {
      if (!win.body.isConnected) { clearInterval(timer); return; }
      const list = procs();
      const cpu = Math.round(list.filter(p => p.id !== 'sys:idle').reduce((s, p) => s + p.cpu, 0));
      const mem = list.reduce((s, p) => s + p.mem, 0);
      cpuHist.push(cpu); if (cpuHist.length > 60) cpuHist.shift();
      win.body.querySelector('.tm-cpu').textContent = cpu + '%';
      win.body.querySelector('.tm-mem').textContent = mem + ' MB';
      win.body.querySelector('.tm-n').textContent = list.length;
      body.innerHTML = list.map(p => `
        <div class="tm-row ${selected === p.id ? 'sel' : ''}" data-id="${p.id}">
          <span class="tm-name">${p.win ? appTileHTML(p.win.app, 'sm') : `<span class="tm-sysico">${p.icon}</span>`}<span>${Utils.esc(p.name)}</span></span>
          <span>${p.status}</span><span>${p.cpu.toFixed(1)}%</span><span>${p.mem ? p.mem.toFixed(0) + ' MB' : '—'}</span>
        </div>`).join('');
      const ctx = graph.getContext('2d');
      ctx.clearRect(0, 0, graph.width, graph.height);
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0078d4';
      ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.beginPath();
      cpuHist.forEach((v, i) => { const x = i * (graph.width / 59), y = graph.height - v / 100 * graph.height; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.lineTo((cpuHist.length - 1) * (graph.width / 59), graph.height); ctx.lineTo(0, graph.height); ctx.closePath();
      ctx.globalAlpha = .15; ctx.fillStyle = accent; ctx.fill(); ctx.globalAlpha = 1;
      endBtn.disabled = !selected;
    }
    body.addEventListener('click', e => {
      const r = e.target.closest('.tm-row');
      if (!r) return;
      selected = selected === r.dataset.id ? null : r.dataset.id;
      render();
    });
    endBtn.addEventListener('click', () => {
      const id = selected; selected = null;
      if (!id) return;
      if (id === 'sys:idle') { Shell.toast('Task Manager', 'Access is denied. The System Idle Process is the one thing holding this all together.', '🛑'); render(); return; }
      if (id === 'sys:explorer') {
        const tb = document.getElementById('taskbar'), ic = document.getElementById('desktop-icons');
        tb.style.visibility = 'hidden'; ic.style.visibility = 'hidden';
        setTimeout(() => { tb.style.visibility = ''; ic.style.visibility = ''; Shell.toast('Windows Explorer', 'Explorer restarted. Told you it was a bad idea.', '🗂️'); }, 1800);
      } else if (id === 'sys:dwm') {
        document.documentElement.classList.add('no-dwm');
        setTimeout(() => document.documentElement.classList.remove('no-dwm'), 2500);
      } else if (id === 'sys:clippy') {
        Settings.set('clippy', false);
      } else {
        const w = WM.all().find(x => x.id === id);
        if (w && w !== win) w.close();
        else if (w === win) { Shell.toast('Task Manager', 'Nice try. Use the ✕ button like everyone else.', '📊'); }
      }
      Achievements.unlock('taskmgr');
      render();
    });
    render();
    timer = setInterval(render, 1000);
    win.onClose(() => clearInterval(timer));
  }
});

/* ---------- Hotkeys: Alt+Tab, Win key, Ctrl+Shift+Esc, Konami ---------- */
const Hotkeys = (() => {
  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let kIdx = 0, metaSolo = false;
  const Switcher = {
    el: null, list: [], idx: 0,
    open() {
      this.list = WM.all().sort((a, b) => b.z - a.z);
      if (!this.list.length) return false;
      this.idx = this.list.length > 1 ? 1 : 0;
      if (!this.el) {
        this.el = Utils.el('div', 'alt-tab');
        document.body.appendChild(this.el);
        this.el.addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (t) { this.idx = +t.dataset.i; this.commit(); } });
      }
      this.render();
      return true;
    },
    render() {
      this.el.innerHTML = this.list.map((w, i) => `<div class="alt-tab-item ${i === this.idx ? 'sel' : ''}" data-i="${i}">${appTileHTML(w.app)}<div class="at-title">${Utils.esc(w.getTitle())}</div></div>`).join('');
    },
    step(dir) { this.idx = (this.idx + dir + this.list.length) % this.list.length; this.render(); },
    commit() {
      const w = this.list[this.idx];
      this.close();
      if (w && WM._wins.has(w.id)) { w.restore(); w.focus(); }
    },
    close() { if (this.el) { this.el.remove(); this.el = null; } }
  };
  document.addEventListener('keydown', e => {
    // Konami
    if (e.key === KONAMI[kIdx] || e.key.toLowerCase() === KONAMI[kIdx]) { kIdx++; if (kIdx === KONAMI.length) { kIdx = 0; Party.start(); } }
    else kIdx = (e.key === KONAMI[0]) ? 1 : 0;
    // Alt+Tab / Alt+`
    if (e.altKey && (e.key === 'Tab' || e.key === '`')) {
      e.preventDefault();
      if (!Switcher.el) { if (!Switcher.open()) return; }
      else Switcher.step(e.shiftKey ? -1 : 1);
      return;
    }
    if (Switcher.el && e.key === 'Escape') { Switcher.close(); return; }
    // Ctrl+Shift+Esc → Task Manager
    if (e.ctrlKey && e.shiftKey && e.key === 'Escape') { e.preventDefault(); Apps.launch('taskmgr'); return; }
    // Ctrl+Esc → Start
    if (e.ctrlKey && e.key === 'Escape') { e.preventDefault(); Shell.toggleStart(); return; }
    // Win (Meta) combos
    if (e.key === 'Meta') { metaSolo = true; return; }
    if (e.metaKey) {
      metaSolo = false;
      const k = e.key.toLowerCase();
      if (k === 'd') { e.preventDefault(); WM.all().forEach(w => w.minimize()); }
      else if (k === 'e') { e.preventDefault(); Apps.launch('explorer'); }
      else if (k === 'i' && !e.target.closest('[contenteditable], input, textarea')) { e.preventDefault(); Apps.launch('settings'); }
      else if (k === 'm') { e.preventDefault(); WM.all().forEach(w => w.minimize()); }
    } else metaSolo = false;
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'Alt' && Switcher.el) Switcher.commit();
    if (e.key === 'Meta' && metaSolo) { metaSolo = false; Shell.toggleStart(); }
  });
  window.addEventListener('blur', () => { Switcher.close(); metaSolo = false; });
  return { Switcher };
})();

/* ---------- Extra terminal commands (dispatched from Terminal's default case) ---------- */
const FORTUNES = [
  'A bug in the hand is worth two in the backlog.',
  'You will find a semicolon where you least expect it.',
  'The best code is no code. The second best is someone else\'s.',
  'Today is a good day to clear your browser cache. Just kidding, you\'d lose everything.',
  'There is no cloud. It\'s just someone else\'s computer. This one is yours.',
  'Your lucky number is 0x7FFFFFFF.',
  'Ctrl+Z is the closest thing we have to time travel.',
  'Happy happy, joy joy.'
];
const FunCmds = {
  cowsay(print, arg) {
    const words = (arg || 'Moo. I mean, hello.').split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) { if ((cur + ' ' + w).trim().length > 38) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
    if (cur.trim()) lines.push(cur.trim());
    const width = Math.max(...lines.map(l => l.length));
    print(' ' + '_'.repeat(width + 2));
    lines.forEach((l, i) => {
      const pad = l.padEnd(width);
      const [a, b] = lines.length === 1 ? ['<', '>'] : i === 0 ? ['/', '\\'] : i === lines.length - 1 ? ['\\', '/'] : ['|', '|'];
      print(`${a} ${pad} ${b}`);
    });
    print(' ' + '-'.repeat(width + 2));
    ['        \\   ^__^', '         \\  (oo)\\_______', '            (__)\\       )\\/\\', '                ||----w |', '                ||     ||'].forEach(print);
  },
  fortune(print) { print(FORTUNES[Math.floor(Math.random() * FORTUNES.length)]); },
  neofetch(print) {
    const up = Math.floor(performance.now() / 1000);
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const info = [
      'seefood@DESKTOP-WEB', '-----------------',
      'OS: Windows 11 Web 26H2', 'Host: ' + browser + ' (' + navigator.platform + ')',
      'Kernel: kernel.js 1.0', 'Uptime: ' + Math.floor(up / 60) + ' mins, ' + (up % 60) + ' secs',
      'Packages: ' + Apps.visible().length + ' (store: ' + (Settings.get('installedApps') || []).length + ')',
      'Shell: Terminal', 'Resolution: ' + innerWidth + 'x' + innerHeight,
      'Theme: ' + (Settings.get('theme') === 'dark' ? 'Dark' : 'Light') + ' [' + Settings.get('accent') + ']',
      'Achievements: ' + Achievements.score() + ' G', 'Memory: ' + (navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'yes')
    ];
    const logo = ['  ████  ████  ', '  ████  ████  ', '              ', '  ████  ████  ', '  ████  ████  '];
    const rows = Math.max(logo.length, info.length);
    for (let i = 0; i < rows; i++) print((logo[i] || ' '.repeat(14)) + '   ' + (info[i] || ''));
  },
  clippy(print) { Clippy.toggle(); print(Settings.get('clippy') ? 'It looks like you summoned Clippy.' : 'Clippy has left the building.'); },
  screensaver(print, arg) { if (arg && !Screensaver.styles[arg]) { print('Styles: ' + Object.keys(Screensaver.styles).join(', ')); return; } print('Starting screensaver… move the mouse to stop.'); setTimeout(() => Screensaver.start(arg), 300); },
  party(print) { print('🎉'); Party.start(); },
  bsod(print, arg) { print('Triggering a fatal system error. Hold on to something.'); setTimeout(() => BSOD.show(arg ? arg.toUpperCase().replace(/\s+/g, '_') : 'MANUALLY_INITIATED_CRASH'), 700); },
  achievements(print) { Achievements.list.forEach(a => print((Achievements.has(a.id) ? '[x] ' : '[ ] ') + (a.secret && !Achievements.has(a.id) ? '???' : a.name).padEnd(26) + a.pts + ' G')); print('Total: ' + Achievements.score() + ' / ' + Achievements.total() + ' G'); },
  taskmgr(print) { Apps.launch('taskmgr'); print('Opening Task Manager…'); },
  lock(print) { print('Locking…'); setTimeout(() => Lock.show(), 200); },
  hiscores(print) { const h = Store.get('win11.hiscores', {}); const keys = Object.keys(h); if (!keys.length) print('No high scores yet. Go play something!'); keys.forEach(k => print(k.padEnd(12) + h[k])); },
  sl(print) { ['      ====        ________                ___________ ', '  _D _|  |_______/        \\__I_I_____===__|_________| ', '   |(_)---  |   H\\________/ |   |        =|___ ___|   ', '   /     |  |   H  |  |     |   |         ||_| |_||   ', '  |      |  |   H  |__--------------------| [___] |   ', '  | ________|___H__/__|_____/[][]~\\_______|       |   ', '  |/ |   |-----------I_____I [][] []  D   |=======|__ ', '__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__ ', ' |/-=|___|=    ||    ||    ||    |_____/~\\___/        ', '  \\_/      \\O=====O=====O=====O_/      \\_/            '].forEach(print); print('(you meant "ls", but the train has already left)'); },
  help(print) { print('Fun commands: cowsay <text>, fortune, neofetch, sl, clippy, screensaver [style], party, bsod, achievements, hiscores, taskmgr, lock'); }
};

/* ---------- Arcade helpers ---------- */
function makeCanvas(win, W, H, cls) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = Utils.el('canvas', 'arcade ' + (cls || ''));
  c.width = W * dpr; c.height = H * dpr;
  c.style.width = W + 'px'; c.style.height = H + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(dpr, dpr);
  return { c, ctx };
}
function gameLoop(win, fn) {
  let raf, last = performance.now(), running = true;
  const step = t => {
    if (!running) return;
    const dt = Math.min(0.04, (t - last) / 1000); last = t;
    if (win.body.isConnected && !win.minimized) fn(dt);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  win.onClose(stop);
  return stop;
}
function blip(midi, dur) { try { Synth.note(midi, dur || 0.08, 'square'); } catch (e) {} }

/* Breakout */
Apps.register({
  id: 'breakout', name: 'Breakout', icon: '🧱', color: 'linear-gradient(135deg,#ff7e5f,#feb47b)',
  category: 'Games', store: true, width: 460, height: 600,
  desc: 'Smash every brick. Mouse, touch or arrow keys move the paddle. Three lives, infinite levels, one ball at a time.', rating: 4.7, size: '1.4 MB',
  mount(win) {
    const W = 400, H = 480;
    win.body.innerHTML = `<div class="game-center"><div class="game-hud"><span class="bo-score">Score 0</span><span class="bo-lives">❤️❤️❤️</span><span class="bo-hi">Best ${HiScore.get('breakout')}</span></div></div>`;
    const { c, ctx } = makeCanvas(win, W, H);
    win.body.querySelector('.game-center').appendChild(c);
    c.tabIndex = 0;
    const hud = s => win.body.querySelector(s);
    const COLORS = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
    let paddle, ball, bricks, score, lives, level, state, keys = {};
    function buildLevel() {
      bricks = [];
      const cols = 8, rows = 5 + Math.min(3, level - 1), bw = (W - 40) / cols, bh = 18;
      for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++)
        bricks.push({ x: 20 + col * bw, y: 50 + r * (bh + 6), w: bw - 4, h: bh, col: COLORS[r % COLORS.length], hp: level > 2 && r === 0 ? 2 : 1 });
    }
    function serve() {
      ball = { x: W / 2, y: H - 60, vx: (Math.random() < .5 ? -1 : 1) * (150 + level * 20), vy: -(230 + level * 25), r: 6 };
      paddle = { x: W / 2 - 40, w: 80 };
      state = 'ready';
    }
    function reset() { score = 0; lives = 3; level = 1; buildLevel(); serve(); updHud(); }
    function updHud() {
      hud('.bo-score').textContent = 'Score ' + score + '  •  Level ' + level;
      hud('.bo-lives').textContent = '❤️'.repeat(lives) || '💀';
      hud('.bo-hi').textContent = 'Best ' + HiScore.get('breakout');
    }
    function loseLife() {
      lives--; blip(40, 0.3);
      if (lives <= 0) { state = 'over'; HiScore.submit('breakout', score); updHud(); }
      else { serve(); updHud(); }
    }
    function update(dt) {
      if (keys.ArrowLeft) paddle.x -= 420 * dt;
      if (keys.ArrowRight) paddle.x += 420 * dt;
      paddle.x = Utils.clamp(paddle.x, 0, W - paddle.w);
      if (state === 'ready') { ball.x = paddle.x + paddle.w / 2; return; }
      if (state !== 'play') return;
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -1; blip(72); }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx *= -1; blip(72); }
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; blip(72); }
      if (ball.y > H + 10) { loseLife(); return; }
      const py = H - 24;
      if (ball.vy > 0 && ball.y + ball.r >= py && ball.y - ball.r <= py + 10 && ball.x >= paddle.x - 4 && ball.x <= paddle.x + paddle.w + 4) {
        const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
        const speed = Math.hypot(ball.vx, ball.vy) * 1.015;
        const ang = rel * Math.PI / 3;
        ball.vx = Math.sin(ang) * speed; ball.vy = -Math.abs(Math.cos(ang) * speed);
        ball.y = py - ball.r; blip(64);
      }
      for (const b of bricks) {
        if (b.hp <= 0) continue;
        if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w && ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
          const ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
          const oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
          if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
          b.hp--; score += b.hp ? 5 : 10; blip(b.hp ? 76 : 84);
          updHud();
          break;
        }
      }
      if (bricks.every(b => b.hp <= 0)) {
        Achievements.unlock('breakout');
        level++; score += 100; HiScore.submit('breakout', score);
        buildLevel(); serve(); updHud();
        Shell.toast('Breakout', 'Level ' + level + '! The ball is getting faster…', '🧱');
      }
    }
    function draw() {
      ctx.fillStyle = '#101418'; ctx.fillRect(0, 0, W, H);
      for (const b of bricks) {
        if (b.hp <= 0) continue;
        ctx.fillStyle = b.col; ctx.globalAlpha = b.hp > 1 ? 1 : .9;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.hp > 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2); }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(paddle.x, H - 24, paddle.w, 10);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '600 16px Segoe UI, system-ui, sans-serif';
      if (state === 'ready') ctx.fillText('Click, tap or press Space to launch', W / 2, H / 2 + 40);
      if (state === 'over') { ctx.font = '700 28px Segoe UI, system-ui, sans-serif'; ctx.fillText('GAME OVER', W / 2, H / 2); ctx.font = '16px Segoe UI, system-ui, sans-serif'; ctx.fillText('Score ' + score + ' — click to play again', W / 2, H / 2 + 32); }
    }
    const launchBall = () => { if (state === 'ready') state = 'play'; else if (state === 'over') reset(); };
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); paddle.x = Utils.clamp((e.clientX - r.left) - paddle.w / 2, 0, W - paddle.w); });
    c.addEventListener('pointerdown', e => { e.preventDefault(); c.focus(); launchBall(); });
    c.addEventListener('keydown', e => { keys[e.key] = true; if (e.key === ' ') { e.preventDefault(); launchBall(); } if (e.key.startsWith('Arrow')) e.preventDefault(); });
    c.addEventListener('keyup', e => { keys[e.key] = false; });
    reset();
    gameLoop(win, dt => { update(dt); draw(); });
    setTimeout(() => c.focus(), 100);
  }
});

/* Pong */
Apps.register({
  id: 'pong', name: 'Pong', icon: '🏓', color: 'linear-gradient(135deg,#232526,#414345)',
  category: 'Games', store: true, width: 540, height: 440,
  desc: 'The 1972 original, more or less. You\'re on the left: move with the mouse, touch, or W/S. First to 7 beats the computer.', rating: 4.5, size: '0.9 MB',
  mount(win) {
    const W = 480, H = 320, PH = 60, PW = 8, TARGET = 7;
    win.body.innerHTML = `<div class="game-center"><div class="game-hud"><span class="pg-score">You 0 — 0 CPU</span><button class="fluent-btn subtle pg-new">New game</button></div></div>`;
    const { c, ctx } = makeCanvas(win, W, H);
    win.body.querySelector('.game-center').appendChild(c);
    c.tabIndex = 0;
    let p1, p2, ball, s1, s2, state, keys = {}, serveT;
    function serve(dir) {
      ball = { x: W / 2, y: H / 2, vx: dir * 220, vy: (Math.random() - .5) * 200, r: 5 };
      serveT = 0.8;
    }
    function reset() { p1 = H / 2 - PH / 2; p2 = H / 2 - PH / 2; s1 = 0; s2 = 0; state = 'play'; serve(Math.random() < .5 ? -1 : 1); hud(); }
    function hud() { win.body.querySelector('.pg-score').textContent = `You ${s1} — ${s2} CPU`; }
    function update(dt) {
      if (state !== 'play') return;
      if (keys.w || keys.ArrowUp) p1 -= 300 * dt;
      if (keys.s || keys.ArrowDown) p1 += 300 * dt;
      p1 = Utils.clamp(p1, 0, H - PH);
      // AI: track the ball with limited speed, and a little hesitation when the ball is far away
      const target = ball.vx > 0 ? ball.y - PH / 2 : H / 2 - PH / 2;
      const aiSpeed = 170 + Math.min(80, (s2 - s1) * -10);
      p2 += Utils.clamp(target - p2, -aiSpeed * dt, aiSpeed * dt);
      p2 = Utils.clamp(p2, 0, H - PH);
      if (serveT > 0) { serveT -= dt; return; }
      ball.x += ball.vx * dt; ball.y += ball.vy * dt;
      if (ball.y < ball.r) { ball.y = ball.r; ball.vy *= -1; blip(60); }
      if (ball.y > H - ball.r) { ball.y = H - ball.r; ball.vy *= -1; blip(60); }
      const hit = (px, py) => ball.x + ball.r > px && ball.x - ball.r < px + PW && ball.y + ball.r > py && ball.y - ball.r < py + PH;
      if (ball.vx < 0 && hit(16, p1)) { ball.x = 16 + PW + ball.r; ball.vx = Math.abs(ball.vx) * 1.06; ball.vy += ((ball.y - (p1 + PH / 2)) / PH) * 260; blip(72); }
      if (ball.vx > 0 && hit(W - 16 - PW, p2)) { ball.x = W - 16 - PW - ball.r; ball.vx = -Math.abs(ball.vx) * 1.06; ball.vy += ((ball.y - (p2 + PH / 2)) / PH) * 260; blip(67); }
      ball.vy = Utils.clamp(ball.vy, -420, 420);
      if (ball.x < -10) { s2++; hud(); blip(45, 0.2); if (s2 >= TARGET) { state = 'lost'; } else serve(1); }
      if (ball.x > W + 10) { s1++; hud(); blip(79, 0.15); if (s1 >= TARGET) { state = 'won'; Achievements.unlock('pong'); HiScore.submit('pong', s1 * 10 - s2); } else serve(-1); }
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#444'; for (let y = 0; y < H; y += 20) ctx.fillRect(W / 2 - 1, y, 2, 10);
      ctx.fillStyle = '#fff';
      ctx.fillRect(16, p1, PW, PH); ctx.fillRect(W - 16 - PW, p2, PW, PH);
      if (state === 'play') ctx.fillRect(ball.x - ball.r, ball.y - ball.r, ball.r * 2, ball.r * 2);
      ctx.font = '700 40px "Courier New", monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = '#666'; ctx.fillText(s1, W / 2 - 60, 50); ctx.fillText(s2, W / 2 + 60, 50);
      if (state !== 'play') {
        ctx.fillStyle = '#fff'; ctx.font = '700 26px Segoe UI, system-ui, sans-serif';
        ctx.fillText(state === 'won' ? '🏆 YOU WIN!' : 'CPU WINS', W / 2, H / 2 - 10);
        ctx.font = '14px Segoe UI, system-ui, sans-serif'; ctx.fillText('Click to play again', W / 2, H / 2 + 20);
      }
    }
    c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(); p1 = Utils.clamp((e.clientY - r.top) - PH / 2, 0, H - PH); });
    c.addEventListener('pointerdown', e => { e.preventDefault(); c.focus(); if (state !== 'play') reset(); });
    c.addEventListener('keydown', e => { keys[e.key] = true; if (e.key.startsWith('Arrow')) e.preventDefault(); });
    c.addEventListener('keyup', e => { keys[e.key] = false; });
    win.body.querySelector('.pg-new').addEventListener('click', () => { reset(); c.focus(); });
    reset();
    gameLoop(win, dt => { update(dt); draw(); });
    setTimeout(() => c.focus(), 100);
  }
});

/* Flappy Window */
Apps.register({
  id: 'flappy', name: 'Flappy Window', icon: '🐦', color: 'linear-gradient(135deg,#70c5ce,#4ec0ca)',
  category: 'Games', store: true, width: 380, height: 580,
  desc: 'Guide a tiny Windows logo through the gaps. Click, tap or press Space to flap. Deceptively simple, aggressively unfair.', rating: 4.1, size: '0.8 MB',
  mount(win) {
    const W = 320, H = 480, G = 1400, FLAP = -420, GAP = 130, PIPE_W = 52, SPEED = 150;
    win.body.innerHTML = `<div class="game-center"><div class="game-hud"><span class="fl-score">Score 0</span><span class="fl-hi">Best ${HiScore.get('flappy')}</span></div></div>`;
    const { c, ctx } = makeCanvas(win, W, H);
    win.body.querySelector('.game-center').appendChild(c);
    c.tabIndex = 0;
    let bird, pipes, score, state, t;
    function reset() { bird = { y: H / 2, vy: 0, r: 14, a: 0 }; pipes = []; score = 0; state = 'ready'; t = 0; hud(); }
    function hud() {
      win.body.querySelector('.fl-score').textContent = 'Score ' + score;
      win.body.querySelector('.fl-hi').textContent = 'Best ' + HiScore.get('flappy');
    }
    function flap() {
      if (state === 'ready') state = 'play';
      if (state === 'over') { reset(); return; }
      bird.vy = FLAP; blip(76, 0.06);
    }
    function die() { state = 'over'; blip(38, 0.4); HiScore.submit('flappy', score); hud(); }
    function update(dt) {
      t += dt;
      if (state === 'ready') { bird.y = H / 2 + Math.sin(t * 4) * 8; return; }
      if (state !== 'play') return;
      bird.vy += G * dt; bird.y += bird.vy * dt;
      bird.a = Utils.clamp(bird.vy / 500, -0.5, 1.2);
      if (!pipes.length || pipes[pipes.length - 1].x < W - 180) pipes.push({ x: W + 20, gapY: 90 + Math.random() * (H - 180 - GAP), passed: false });
      for (const p of pipes) {
        p.x -= SPEED * dt;
        if (!p.passed && p.x + PIPE_W < 70) { p.passed = true; score++; blip(84, 0.05); hud(); if (score === 10) Achievements.unlock('flappy'); }
        const bx = 70, r = bird.r - 3;
        if (bx + r > p.x && bx - r < p.x + PIPE_W && (bird.y - r < p.gapY || bird.y + r > p.gapY + GAP)) { die(); return; }
      }
      pipes = pipes.filter(p => p.x > -PIPE_W - 10);
      if (bird.y + bird.r > H - 40 || bird.y < -30) die();
    }
    function draw() {
      const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#70c5ce'); sky.addColorStop(1, '#bde8ec');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 4; i++) { const cx = ((i * 97 + t * 12) % (W + 80)) - 40, cy = 60 + i * 45; ctx.beginPath(); ctx.arc(cx, cy, 16, 0, 7); ctx.arc(cx + 18, cy - 6, 20, 0, 7); ctx.arc(cx + 38, cy, 14, 0, 7); ctx.fill(); }
      for (const p of pipes) {
        ctx.fillStyle = '#5a5a5a'; ctx.fillRect(p.x, 0, PIPE_W, p.gapY); ctx.fillRect(p.x, p.gapY + GAP, PIPE_W, H);
        ctx.fillStyle = '#3d3d3d'; ctx.fillRect(p.x - 3, p.gapY - 16, PIPE_W + 6, 16); ctx.fillRect(p.x - 3, p.gapY + GAP, PIPE_W + 6, 16);
        ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(p.x + 6, 0, 8, p.gapY - 16); ctx.fillRect(p.x + 6, p.gapY + GAP + 16, 8, H);
      }
      ctx.fillStyle = '#ded895'; ctx.fillRect(0, H - 40, W, 40);
      ctx.fillStyle = '#73bf2e'; ctx.fillRect(0, H - 40, W, 8);
      ctx.save(); ctx.translate(70, bird.y); ctx.rotate(bird.a);
      const q = bird.r * .9, g = 2;
      ctx.fillStyle = '#0078d4';
      ctx.fillRect(-q - g / 2, -q - g / 2, q, q); ctx.fillRect(g / 2, -q - g / 2, q, q); ctx.fillRect(-q - g / 2, g / 2, q, q); ctx.fillRect(g / 2, g / 2, q, q);
      ctx.restore();
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.textAlign = 'center';
      ctx.font = '700 36px Segoe UI, system-ui, sans-serif';
      ctx.strokeText(score, W / 2, 60); ctx.fillText(score, W / 2, 60);
      ctx.font = '600 15px Segoe UI, system-ui, sans-serif'; ctx.lineWidth = 2;
      if (state === 'ready') { ctx.strokeText('Click or press Space to flap', W / 2, H / 2 + 70); ctx.fillText('Click or press Space to flap', W / 2, H / 2 + 70); }
      if (state === 'over') { ctx.font = '700 28px Segoe UI, system-ui, sans-serif'; ctx.strokeText('GAME OVER', W / 2, H / 2 - 20); ctx.fillText('GAME OVER', W / 2, H / 2 - 20); ctx.font = '600 15px Segoe UI, system-ui, sans-serif'; ctx.strokeText('Click to try again', W / 2, H / 2 + 12); ctx.fillText('Click to try again', W / 2, H / 2 + 12); }
    }
    c.addEventListener('pointerdown', e => { e.preventDefault(); c.focus(); flap(); });
    c.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); flap(); } });
    reset();
    gameLoop(win, dt => { update(dt); draw(); });
    setTimeout(() => c.focus(), 100);
  }
});
