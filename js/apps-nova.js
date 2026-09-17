/* ============ Windows 11 Web — nova: voice typing, Do Not Disturb, battery saver, Stocks widget,
   recent files in Start, taskbar & Start context menus (pin/unpin), Windows Hello, Asteroids ============ */
'use strict';

Achievements.list.push(
  { id: 'asteroids', name: 'Rock Breaker', desc: 'Cleared a wave in Asteroids.', icon: '☄️', pts: 20 },
  { id: 'hello', name: 'Hello, You', desc: 'Signed in with Windows Hello.', icon: '👤', pts: 10 },
  { id: 'dictation', name: 'Dictator', desc: 'Used voice typing (Win+H).', icon: '🗣️', pts: 10 },
  { id: 'pinner', name: 'Pinned', desc: 'Pinned an app to the taskbar.', icon: '📌', pts: 5 },
  { id: 'completionist', name: 'Completionist', desc: 'Unlocked every other achievement. Go outside.', icon: '💯', pts: 100, secret: true }
);
Bus.on('achievements:changed', () => { if (Achievements.list.filter(a => a.id !== 'completionist').every(a => Achievements.has(a.id))) Achievements.unlock('completionist'); });

/* ---------- Voice typing (Win+H) into the focused field ---------- */
const VoiceTyping = {
  rec: null, el: null,
  toggle() {
    if (this.rec) { this.rec.stop(); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { Shell.toast('Voice typing', 'Needs a browser with the Web Speech API (Chrome or Edge).', '🎤'); return; }
    const t = document.activeElement;
    if (!t || !(t.matches('input, textarea') || t.isContentEditable)) { Shell.toast('Voice typing', 'Click into a text field first, then press Win+H.', '🎤'); return; }
    const rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = true;
    this.rec = rec;
    this.el = Utils.el('div', 'voice-pill'); this.el.innerHTML = '<span class="vp-dot"></span> Listening… <button>Stop</button>';
    document.body.appendChild(this.el);
    this.el.querySelector('button').addEventListener('click', () => rec.stop());
    let committed = '';
    rec.onresult = e => {
      let finalT = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) { const r = e.results[i]; if (r.isFinal) finalT += r[0].transcript; else interim += r[0].transcript; }
      if (finalT) { t.focus(); const txt = (committed ? ' ' : '') + finalT.trim(); if (!document.execCommand('insertText', false, txt) && t.setRangeText) { t.setRangeText(txt, t.selectionStart, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input', { bubbles: true })); } committed += txt; Achievements.unlock('dictation'); }
      this.el.querySelector('.vp-dot').title = interim;
    };
    rec.onerror = e => Shell.toast('Voice typing', 'Stopped: ' + e.error, '🎤');
    rec.onend = () => { this.rec = null; if (this.el) { this.el.remove(); this.el = null; } };
    try { rec.start(); } catch (e) { rec.onend(); }
  }
};
document.addEventListener('keydown', e => { if (e.metaKey && e.key.toLowerCase() === 'h') { e.preventDefault(); VoiceTyping.toggle(); } });

/* ---------- Do Not Disturb + Battery saver tiles ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('#action-center .ac-grid');
  const dnd = Utils.el('button', 'ac-tile', '🔕<span>Do not disturb</span>'); dnd.id = 'ac-dnd';
  const saver = Utils.el('button', 'ac-tile', '🍃<span>Battery saver</span>'); saver.id = 'ac-saver';
  grid.append(dnd, saver);
  const trayDnd = Utils.el('span'); trayDnd.textContent = '🔕'; trayDnd.title = 'Do not disturb is on'; trayDnd.style.display = 'none';
  document.getElementById('tray-icons').prepend(trayDnd);
  const sync = () => { dnd.classList.toggle('on', !!Settings.get('dnd')); saver.classList.toggle('on', !!Settings.get('saver')); trayDnd.style.display = Settings.get('dnd') ? '' : 'none'; document.documentElement.classList.toggle('saver', !!Settings.get('saver')); };
  dnd.addEventListener('click', () => { Settings.set('dnd', !Settings.get('dnd')); sync(); if (!Settings.get('dnd')) { const n = Notifications.items.filter(x => x.muted).length; Notifications.items.forEach(x => delete x.muted); if (n) Shell.toast('Notifications', 'You missed ' + n + ' notification' + (n > 1 ? 's' : '') + ' while Do not disturb was on. They\'re in the clock flyout.', '🔔'); } });
  saver.addEventListener('click', () => { Settings.set('saver', !Settings.get('saver')); sync(); if (Settings.get('saver')) Shell.toast('Battery saver', 'Animations and blur reduced. Your battery thanks you, probably.', '🍃'); });
  sync();
  const toast = Shell.toast.bind(Shell);
  Shell.toast = function (title, body, icon) {
    if (Settings.get('dnd') && !/^Achievement|Do not disturb|^Notifications$/.test(title)) {
      Notifications.items.unshift({ title, body, icon: icon || '🔔', t: new Date(), muted: true });
      if (Notifications.items.length > 30) Notifications.items.length = 30;
      if (document.getElementById('notif-center')) Notifications.render();
      return null;
    }
    return toast(title, body, icon);
  };
});

/* ---------- Stocks widget (a random walk, seeded per day, definitely not financial advice) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const render = Widgets.render.bind(Widgets);
  Widgets.render = function () {
    render();
    const rnd = Utils.rng(Math.floor(Date.now() / 86400000) * 7 + new Date().getHours());
    const tick = [['WIN11', 'Windows 11 Web', 342.1], ['CLPY', 'Clippy Holdings', 9.98], ['NEKO', 'Neko Pet Co.', 77.7], ['BSOD', 'Blue Screen Inc.', 0.01]].map(([sym, name, base]) => { const pts = [base]; for (let i = 1; i < 24; i++) pts.push(Math.max(0.01, pts[i - 1] * (1 + (rnd() - .48) * .04))); return { sym, name, pts, chg: (pts[23] / pts[0] - 1) * 100 }; });
    const card = Utils.el('div', 'wg-card');
    card.innerHTML = `<div class="wg-title">Stocks • MSN Money-ish</div>${tick.map((t, i) => `<div class="wg-stock"><div><b>${t.sym}</b><small>${t.name}</small></div><canvas width="90" height="28" data-i="${i}"></canvas><div class="wg-stock-p"><b>${t.pts[23].toFixed(2)}</b><small class="${t.chg >= 0 ? 'up' : 'down'}">${t.chg >= 0 ? '▲' : '▼'} ${Math.abs(t.chg).toFixed(2)}%</small></div></div>`).join('')}`;
    this.el.querySelector('.wg-grid').appendChild(card);
    card.querySelectorAll('canvas').forEach(cv => { const t = tick[+cv.dataset.i], ctx = cv.getContext('2d'); const min = Math.min(...t.pts), max = Math.max(...t.pts), span = max - min || 1; ctx.strokeStyle = t.chg >= 0 ? '#0f7b0f' : '#c42b1c'; ctx.lineWidth = 1.5; ctx.beginPath(); t.pts.forEach((p, i) => { const x = i / 23 * 88 + 1, y = 26 - (p - min) / span * 24; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); });
  };
});

/* ---------- Recent files in Start's Recommended section ---------- */
(() => {
  const KEY = 'win11.recent';
  const orig = window.openFile;
  window.openFile = function (path) {
    const n = FS.get(path);
    if (n && n.type === 'file') { const list = Store.get(KEY, []).filter(p => p !== path); list.unshift(path); Store.set(KEY, list.slice(0, 8)); Shell.renderStart(); }
    return orig(path);
  };
  document.addEventListener('DOMContentLoaded', () => {
    const rs = Shell.renderStart.bind(Shell);
    Shell.renderStart = function () {
      rs();
      const rec = Store.get(KEY, []).filter(p => FS.get(p)).slice(0, 4);
      if (!rec.length) return;
      document.getElementById('start-recommended').innerHTML = rec.map(p => { const name = p.split('/').pop(), dir = p.split('/').slice(-2, -1)[0] || 'C:'; return `<div class="start-rec" data-file="${Utils.esc(p)}"><div style="font-size:22px">${fileIcon(name, FS.get(p))}</div><div><div class="rec-t">${Utils.esc(name)}</div><div class="rec-s">${Utils.esc(dir)} • Recently opened</div></div></div>`; }).join('');
    };
    Shell.renderStart();
  });
})();

/* ---------- Taskbar & Start context menus: pin / unpin / close ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const pinned = () => (Settings.get('pinnedTaskbar') || []).slice();
  const isPinned = id => pinned().includes(id);
  const pin = id => { if (!isPinned(id)) { Settings.set('pinnedTaskbar', pinned().concat([id])); Achievements.unlock('pinner'); } };
  const unpin = id => Settings.set('pinnedTaskbar', pinned().filter(x => x !== id));
  Bus.on('settings:pinnedTaskbar', () => Shell.renderTaskbar());
  document.getElementById('taskbar').addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    const b = e.target.closest('.tb-btn[data-launch]');
    if (b) {
      const id = b.dataset.launch, app = Apps.get(id), wins = WM.byApp(id);
      const items = [{ label: app.name, icon: app.letter ? '' : app.icon, fn: () => Apps.launch(id) }, { sep: true }];
      if (id !== 'copilot') items.push(isPinned(id) ? { label: 'Unpin from taskbar', icon: '📌', fn: () => unpin(id) } : { label: 'Pin to taskbar', icon: '📌', fn: () => pin(id) });
      if (wins.length) items.push({ label: wins.length > 1 ? 'Close all windows' : 'Close window', icon: '✕', fn: () => wins.forEach(w => w.close()) });
      Shell.contextMenu(e.clientX, e.clientY - 10, items);
    } else if (!e.target.closest('#tray-clock, #tray-icons')) {
      Shell.contextMenu(e.clientX, e.clientY - 10, [
        { label: 'Task Manager', icon: '📊', fn: () => Apps.launch('taskmgr') },
        { label: 'Task View', icon: '🗔', fn: () => TaskView.open() },
        { sep: true },
        { label: 'Show the desktop', icon: '🖥️', fn: () => WM.all().forEach(w => w.minimize()) },
        { label: 'Taskbar settings', icon: '⚙️', fn: () => Apps.launch('settings', { section: 'personalization' }) }
      ]);
    }
  });
  document.getElementById('start-menu').addEventListener('contextmenu', e => {
    const t = e.target.closest('[data-launch]'); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    const id = t.dataset.launch, app = Apps.get(id); if (!app) return;
    const items = [{ label: 'Open', icon: '📂', fn: () => { Shell.toggleStart(false); Apps.launch(id); } }];
    items.push(isPinned(id) ? { label: 'Unpin from taskbar', icon: '📌', fn: () => unpin(id) } : { label: 'Pin to taskbar', icon: '📌', fn: () => pin(id) });
    items.push({ label: 'Run as administrator', icon: '🛡️', fn: () => Shell.toast('User Account Control', 'Do you want to allow this app to make changes? …There are no changes to make. Opening normally.', '🛡️') || Apps.launch(id) });
    items.push({ label: 'Open file location', icon: '📁', fn: () => { Shell.toggleStart(false); Apps.launch('explorer', { path: 'C:/Windows/System32' }); } });
    if (app.store) items.push({ sep: true }, { label: 'Uninstall', icon: '🗑️', fn: () => { Apps.uninstall(id); Shell.toast('Apps', app.name + ' was uninstalled.', '📦'); } });
    Shell.contextMenu(e.clientX, e.clientY, items);
  });
});

/* ---------- Windows Hello: sign in with your face (the recognition part is theatre) ---------- */
const HelloSignIn = {
  attach(lockEl) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || lockEl.querySelector('.hello-btn')) return;
    const btn = Utils.el('button', 'hello-btn', '👤 Sign in with Windows Hello');
    lockEl.appendChild(btn);
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      btn.disabled = true;
      const box = Utils.el('div', 'hello-box'); box.innerHTML = '<video autoplay playsinline muted></video><div class="hello-msg">Looking for you…</div>';
      lockEl.appendChild(box);
      box.addEventListener('click', ev => ev.stopPropagation());
      let stream = null;
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }); box.querySelector('video').srcObject = stream; }
      catch (err) { box.querySelector('.hello-msg').textContent = 'Couldn\'t use the camera. Click anywhere to sign in instead.'; btn.disabled = false; setTimeout(() => box.remove(), 2500); return; }
      setTimeout(() => { box.querySelector('.hello-msg').textContent = 'Hi, ' + (Settings.get('userName') || 'there') + '! ✓'; box.classList.add('ok'); try { Synth.note(84, 0.3, 'sine'); } catch (x) {} }, 1800);
      setTimeout(() => { stream.getTracks().forEach(t => t.stop()); Achievements.unlock('hello'); if (typeof PinLock !== 'undefined') PinLock.bypass = true; lockEl.click(); }, 2700);
    });
  }
};

/* ---------- Asteroids ---------- */
Apps.register({
  id: 'asteroids', name: 'Asteroids', icon: '☄️', color: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)',
  category: 'Games', store: true, width: 540, height: 460,
  desc: 'Vector rocks, a tiny triangle, and physics with no friction to speak of. ← → rotate, ↑ thrust, Space fires, H hyperspace. Drag on touch to steer, tap to fire.', rating: 4.7, size: '0.6 MB',
  mount(win) {
    const W = 480, H = 340;
    win.body.innerHTML = `<div class="game-center"><div class="game-hud"><span class="as-score">Score 0</span><span class="as-lives">🚀🚀🚀</span><span class="as-wave">Wave 1</span><span class="as-hi">Best ${HiScore.get('asteroids')}</span></div></div>`;
    const { c, ctx } = makeCanvas(win, W, H);
    win.body.querySelector('.game-center').appendChild(c); c.tabIndex = 0;
    let ship, rocks, bullets, score, lives, wave, state, keys = {}, inv = 0, t = 0;
    const hud = () => { win.body.querySelector('.as-score').textContent = 'Score ' + score; win.body.querySelector('.as-lives').textContent = '🚀'.repeat(lives) || '💥'; win.body.querySelector('.as-wave').textContent = 'Wave ' + wave; win.body.querySelector('.as-hi').textContent = 'Best ' + HiScore.get('asteroids'); };
    const wrapP = p => { p.x = (p.x + W) % W; p.y = (p.y + H) % H; };
    const mkRock = (x, y, r) => ({ x, y, r, vx: (Math.random() - .5) * (90 - r), vy: (Math.random() - .5) * (90 - r), a: 0, va: (Math.random() - .5) * 2, pts: Array.from({ length: 9 }, () => .7 + Math.random() * .5) });
    function spawnWave() { rocks = []; for (let i = 0; i < 3 + wave; i++) { let x, y; do { x = Math.random() * W; y = Math.random() * H; } while (Math.hypot(x - W / 2, y - H / 2) < 110); rocks.push(mkRock(x, y, 34)); } }
    function reset() { ship = { x: W / 2, y: H / 2, vx: 0, vy: 0, a: -Math.PI / 2 }; bullets = []; score = 0; lives = 3; wave = 1; state = 'play'; inv = 2; spawnWave(); hud(); }
    function die() { lives--; blip(38, 0.4); if (lives <= 0) { state = 'over'; HiScore.submit('asteroids', score); } else { ship.x = W / 2; ship.y = H / 2; ship.vx = ship.vy = 0; inv = 2.5; } hud(); }
    function fire() { if (state !== 'play' || bullets.length > 5) return; bullets.push({ x: ship.x + Math.cos(ship.a) * 12, y: ship.y + Math.sin(ship.a) * 12, vx: Math.cos(ship.a) * 320 + ship.vx, vy: Math.sin(ship.a) * 320 + ship.vy, life: 1.1 }); blip(86, 0.04); }
    function hyper() { if (state !== 'play') return; ship.x = Math.random() * W; ship.y = Math.random() * H; ship.vx = ship.vy = 0; inv = 1; blip(60, 0.2); }
    function update(dt) {
      t += dt; if (state !== 'play') return;
      if (inv > 0) inv -= dt;
      if (keys.ArrowLeft || keys.a) ship.a -= 3.6 * dt;
      if (keys.ArrowRight || keys.d) ship.a += 3.6 * dt;
      if (keys.ArrowUp || keys.w) { ship.vx += Math.cos(ship.a) * 260 * dt; ship.vy += Math.sin(ship.a) * 260 * dt; }
      ship.vx *= Math.pow(.4, dt); ship.vy *= Math.pow(.4, dt);
      ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrapP(ship);
      for (const r of rocks) { r.x += r.vx * dt; r.y += r.vy * dt; r.a += r.va * dt; wrapP(r); }
      for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; wrapP(b); }
      bullets = bullets.filter(b => b.life > 0);
      const nr = [];
      for (const r of rocks) {
        const hit = bullets.find(b => Math.hypot(b.x - r.x, b.y - r.y) < r.r);
        if (hit) { hit.life = 0; score += r.r > 25 ? 20 : r.r > 14 ? 50 : 100; blip(r.r > 25 ? 48 : 64, 0.06); if (r.r > 12) { nr.push(mkRock(r.x, r.y, r.r / 2), mkRock(r.x, r.y, r.r / 2)); } }
        else nr.push(r);
      }
      rocks = nr; bullets = bullets.filter(b => b.life > 0); hud();
      if (inv <= 0 && rocks.some(r => Math.hypot(r.x - ship.x, r.y - ship.y) < r.r + 8)) die();
      if (!rocks.length) { Achievements.unlock('asteroids'); wave++; score += 300; HiScore.submit('asteroids', score); spawnWave(); hud(); inv = 2; }
    }
    function draw() {
      ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.4)'; for (let i = 0; i < 50; i++) ctx.fillRect((i * 131) % W, (i * 71) % H, 1, 1);
      ctx.strokeStyle = '#dfe6ff'; ctx.lineWidth = 1.5;
      for (const r of rocks) { ctx.beginPath(); r.pts.forEach((p, i) => { const a = r.a + i / 9 * Math.PI * 2; const x = r.x + Math.cos(a) * r.r * p, y = r.y + Math.sin(a) * r.r * p; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke(); }
      if (state === 'play' && (inv <= 0 || Math.floor(t * 10) % 2)) {
        ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a);
        ctx.strokeStyle = '#4cc9f0'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, 9); ctx.lineTo(-6, 0); ctx.lineTo(-10, -9); ctx.closePath(); ctx.stroke();
        if ((keys.ArrowUp || keys.w) && Math.floor(t * 20) % 2) { ctx.strokeStyle = '#ff9a3c'; ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(-16, 0); ctx.lineTo(-7, -4); ctx.stroke(); }
        ctx.restore();
      }
      ctx.fillStyle = '#fff'; bullets.forEach(b => ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3));
      if (state === 'over') { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 26px Segoe UI, system-ui, sans-serif'; ctx.fillText('GAME OVER', W / 2, H / 2 - 10); ctx.font = '14px Segoe UI, system-ui, sans-serif'; ctx.fillText('Score ' + score + ' — click to play again', W / 2, H / 2 + 20); }
    }
    c.addEventListener('keydown', e => { keys[e.key] = true; if (e.key === ' ') { e.preventDefault(); fire(); } if (e.key.toLowerCase() === 'h') hyper(); if (e.key.startsWith('Arrow')) e.preventDefault(); });
    c.addEventListener('keyup', e => { keys[e.key] = false; });
    let drag = null;
    c.addEventListener('pointerdown', e => { e.preventDefault(); c.focus(); if (state === 'over') { reset(); return; } drag = { x: e.clientX, y: e.clientY, moved: false }; });
    c.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 3) { drag.moved = true; ship.a += dx * 0.01; drag.x = e.clientX; } if (e.clientY < drag.y - 10) { keys.ArrowUp = true; drag.moved = true; } });
    window.addEventListener('pointerup', () => { if (drag && !drag.moved) fire(); keys.ArrowUp = false; drag = null; });
    reset();
    gameLoop(win, dt => { update(dt); draw(); });
    setTimeout(() => c.focus(), 100);
  }
});
