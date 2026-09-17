/* ============ Windows 11 Web — extra: Tetris, Space Invaders, Run dialog, Windows Update + What's new,
   smarter Start search ============ */
'use strict';

Achievements.list.push(
  { id: 'tetris', name: 'Line Cook', desc: 'Cleared 10 lines in Tetris.', icon: '🟦', pts: 20 },
  { id: 'tetris-tetris', name: 'That\'s a Tetris', desc: 'Cleared four lines at once.', icon: '4️⃣', pts: 15 },
  { id: 'invaders', name: 'Earth Defender', desc: 'Cleared a wave in Space Invaders.', icon: '👾', pts: 20 },
  { id: 'run', name: 'Old School', desc: 'Used the Run dialog (Win+R).', icon: '▶️', pts: 5 },
  { id: 'updated', name: 'Patch Tuesday', desc: 'Installed a Windows Update and lived to tell the tale.', icon: '🔄', pts: 15 }
);

/* ---------- Tetris ---------- */
Apps.register({
  id: 'tetris', name: 'Tetris', icon: '🟦', color: 'linear-gradient(135deg,#1e3c72,#2a5298)',
  category: 'Games', store: true, width: 520, height: 620,
  desc: 'The one that came with the Game Boy. Hold, next-piece preview, hard drop, levels that get mean. ←→ move, ↑/X rotate, Z counter-rotate, Space hard drop, C hold.', rating: 4.9, size: '1.0 MB',
  mount(win) {
    const COLS = 10, ROWS = 20, CS = 24, W = COLS * CS, H = ROWS * CS;
    const SHAPES = {
      I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
      S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]]
    };
    const COLORS = { I: '#00c6ff', O: '#ffd400', T: '#b04cff', S: '#3ddc84', Z: '#ff4d4d', J: '#3f7cff', L: '#ff9a3c' };
    win.body.innerHTML = `
      <div class="game-center tet-wrap">
        <div class="tet-side"><div class="tet-lbl">Hold</div><canvas class="tet-hold" width="96" height="96"></canvas><div class="tet-lbl">Score</div><div class="tet-val tet-score">0</div><div class="tet-lbl">Lines</div><div class="tet-val tet-lines">0</div><div class="tet-lbl">Level</div><div class="tet-val tet-level">1</div><div class="tet-lbl">Best</div><div class="tet-val tet-best">${HiScore.get('tetris')}</div></div>
        <div><canvas class="arcade tet-main"></canvas><div class="tet-touch"><button data-k="ArrowLeft">◀</button><button data-k="ArrowUp">⟳</button><button data-k="ArrowDown">▼</button><button data-k="ArrowRight">▶</button><button data-k=" ">⤓</button><button data-k="c">H</button></div></div>
        <div class="tet-side"><div class="tet-lbl">Next</div><canvas class="tet-next" width="96" height="288"></canvas></div>
      </div>`;
    const main = win.body.querySelector('.tet-main');
    const dpr = Math.min(2, devicePixelRatio || 1);
    main.width = W * dpr; main.height = H * dpr; main.style.width = W + 'px'; main.style.height = H + 'px';
    const ctx = main.getContext('2d'); ctx.scale(dpr, dpr);
    const holdC = win.body.querySelector('.tet-hold').getContext('2d'), nextC = win.body.querySelector('.tet-next').getContext('2d');
    main.tabIndex = 0;
    let grid, cur, hold, canHold, bag, queue, score, lines, level, over, paused, dropT, dropInt, lockT;
    const rnd7 = () => { const k = Object.keys(SHAPES); for (let i = k.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [k[i], k[j]] = [k[j], k[i]]; } return k; };
    const nextType = () => { if (!bag.length) bag = rnd7(); return bag.pop(); };
    const piece = t => ({ t, cells: SHAPES[t].map(c => c.slice()), x: 3, y: t === 'I' ? -1 : 0 });
    const fits = (p, dx, dy, cells) => (cells || p.cells).every(([cx, cy]) => { const x = p.x + cx + dx, y = p.y + cy + dy; return x >= 0 && x < COLS && y < ROWS && (y < 0 || !grid[y][x]); });
    function rotate(p, dir) {
      if (p.t === 'O') return;
      const size = p.t === 'I' ? 4 : 3;
      const cells = p.cells.map(([x, y]) => dir > 0 ? [size - 1 - y, x] : [y, size - 1 - x]);
      for (const k of [0, 1, -1, 2, -2]) if (fits(p, k, 0, cells)) { p.cells = cells; p.x += k; blip(70, 0.03); return; }
    }
    function spawn() {
      cur = piece(queue.shift()); queue.push(nextType()); canHold = true; lockT = 0;
      if (!fits(cur, 0, 0)) { over = true; HiScore.submit('tetris', score); hud(); blip(36, 0.5); }
    }
    function reset() {
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      bag = []; queue = [nextType(), nextType(), nextType()]; hold = null;
      score = 0; lines = 0; level = 1; over = false; paused = false; dropT = 0; dropInt = 0.8;
      spawn(); hud();
    }
    function hud() {
      win.body.querySelector('.tet-score').textContent = score;
      win.body.querySelector('.tet-lines').textContent = lines;
      win.body.querySelector('.tet-level').textContent = level;
      win.body.querySelector('.tet-best').textContent = HiScore.get('tetris');
    }
    function lock() {
      cur.cells.forEach(([cx, cy]) => { const y = cur.y + cy; if (y >= 0) grid[y][cur.x + cx] = cur.t; });
      let cleared = 0;
      for (let y = ROWS - 1; y >= 0; y--) if (grid[y].every(Boolean)) { grid.splice(y, 1); grid.unshift(Array(COLS).fill(null)); cleared++; y++; }
      if (cleared) {
        score += [0, 100, 300, 500, 800][cleared] * level; lines += cleared;
        level = 1 + Math.floor(lines / 10); dropInt = Math.max(0.08, 0.8 * Math.pow(0.85, level - 1));
        blip(cleared === 4 ? 91 : 79, 0.12);
        if (cleared === 4) Achievements.unlock('tetris-tetris');
        if (lines >= 10) Achievements.unlock('tetris');
        HiScore.submit('tetris', score);
      } else blip(52, 0.04);
      hud(); spawn();
    }
    function step(dt) {
      if (over || paused) return;
      dropT += dt;
      if (dropT >= dropInt) { dropT = 0; if (fits(cur, 0, 1)) cur.y++; }
      if (!fits(cur, 0, 1)) { lockT += dt; if (lockT > 0.45) lock(); } else lockT = 0;
    }
    function cell(c, x, y, size, col, ghost) {
      c.fillStyle = col; c.globalAlpha = ghost ? .25 : 1;
      c.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      if (!ghost) { c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(x * size + 1, y * size + 1, size - 2, 4); }
      c.globalAlpha = 1;
    }
    function drawMini(c, t) {
      c.clearRect(0, 0, c.canvas.width, c.canvas.height);
      if (!t) return;
      SHAPES[t].forEach(([x, y]) => cell(c, x, y, 22, COLORS[t]));
    }
    function draw() {
      ctx.fillStyle = '#0d1321'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(255,255,255,.05)';
      for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CS, 0); ctx.lineTo(x * CS, H); ctx.stroke(); }
      for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CS); ctx.lineTo(W, y * CS); ctx.stroke(); }
      grid.forEach((row, y) => row.forEach((t, x) => t && cell(ctx, x, y, CS, COLORS[t])));
      if (cur && !over) {
        let g = 0; while (fits(cur, 0, g + 1)) g++;
        cur.cells.forEach(([cx, cy]) => { if (cur.y + cy + g >= 0) cell(ctx, cur.x + cx, cur.y + cy + g, CS, COLORS[cur.t], true); });
        cur.cells.forEach(([cx, cy]) => { if (cur.y + cy >= 0) cell(ctx, cur.x + cx, cur.y + cy, CS, COLORS[cur.t]); });
      }
      drawMini(holdC, hold);
      nextC.clearRect(0, 0, 96, 288);
      queue.forEach((t, i) => SHAPES[t].forEach(([x, y]) => cell(nextC, x, y + i * 4.2, 22, COLORS[t])));
      if (over || paused) {
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 24px Segoe UI, system-ui, sans-serif';
        ctx.fillText(over ? 'GAME OVER' : 'PAUSED', W / 2, H / 2 - 10);
        ctx.font = '14px Segoe UI, system-ui, sans-serif'; ctx.fillText(over ? 'Press Enter or tap to restart' : 'Press P to resume', W / 2, H / 2 + 18);
      }
    }
    function key(k) {
      if (over) { if (k === 'Enter' || k === ' ') reset(); return; }
      if (k === 'p' || k === 'P') { paused = !paused; return; }
      if (paused) return;
      if (k === 'ArrowLeft' && fits(cur, -1, 0)) cur.x--;
      else if (k === 'ArrowRight' && fits(cur, 1, 0)) cur.x++;
      else if (k === 'ArrowDown') { if (fits(cur, 0, 1)) { cur.y++; score += 1; dropT = 0; } }
      else if (k === 'ArrowUp' || k === 'x' || k === 'X') rotate(cur, 1);
      else if (k === 'z' || k === 'Z') rotate(cur, -1);
      else if (k === ' ') { let d = 0; while (fits(cur, 0, 1)) { cur.y++; d++; } score += d * 2; lock(); }
      else if (k === 'c' || k === 'C') {
        if (!canHold) return;
        const t = cur.t;
        if (hold) { cur = piece(hold); hold = t; } else { hold = t; spawn(); }
        canHold = false; blip(64, 0.04);
      }
      hud();
    }
    main.addEventListener('keydown', e => { if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(e.key)) e.preventDefault(); key(e.key); });
    main.addEventListener('pointerdown', () => { main.focus(); if (over) reset(); });
    win.body.querySelector('.tet-touch').addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); key(b.dataset.k); } });
    reset();
    gameLoop(win, dt => { step(dt); draw(); });
    setTimeout(() => main.focus(), 100);
  }
});

/* ---------- Space Invaders ---------- */
Apps.register({
  id: 'invaders', name: 'Space Invaders', icon: '👾', color: 'linear-gradient(135deg,#000428,#004e92)',
  category: 'Games', store: true, width: 460, height: 600,
  desc: 'Fifty-five aliens, four crumbling shields, one cannon. ←→ or A/D to move, Space to fire. Drag and tap on touch screens.', rating: 4.6, size: '1.2 MB',
  mount(win) {
    const W = 400, H = 480;
    win.body.innerHTML = `<div class="game-center"><div class="game-hud"><span class="si-score">Score 0</span><span class="si-lives">🚀🚀🚀</span><span class="si-wave">Wave 1</span><span class="si-hi">Best ${HiScore.get('invaders')}</span></div></div>`;
    const { c, ctx } = makeCanvas(win, W, H);
    win.body.querySelector('.game-center').appendChild(c);
    c.tabIndex = 0;
    let player, aliens, dir, stepT, stepInt, bullets, bombs, shields, score, lives, wave, state, keys = {}, anim = 0, ufo = null, ufoT = 0;
    const hud = () => {
      win.body.querySelector('.si-score').textContent = 'Score ' + score;
      win.body.querySelector('.si-lives').textContent = '🚀'.repeat(lives) || '💥';
      win.body.querySelector('.si-wave').textContent = 'Wave ' + wave;
      win.body.querySelector('.si-hi').textContent = 'Best ' + HiScore.get('invaders');
    };
    function buildShields() {
      shields = [];
      for (let s = 0; s < 4; s++) {
        const bx = 40 + s * 90, by = H - 110;
        for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
          if (y === 3 && (x === 2 || x === 3)) continue;
          if (y === 0 && (x === 0 || x === 5)) continue;
          shields.push({ x: bx + x * 7, y: by + y * 7, hp: 2 });
        }
      }
    }
    function buildWave() {
      aliens = [];
      for (let r = 0; r < 5; r++) for (let col = 0; col < 11; col++) aliens.push({ x: 40 + col * 28, y: 50 + r * 26 + Math.min(60, (wave - 1) * 12), type: r === 0 ? 2 : r < 3 ? 1 : 0, alive: true });
      dir = 1; stepT = 0; stepInt = Math.max(0.12, 0.7 - (wave - 1) * 0.08); bombs = []; bullets = []; ufo = null; ufoT = 8 + Math.random() * 10;
    }
    function reset() { player = { x: W / 2, dead: 0 }; score = 0; lives = 3; wave = 1; state = 'play'; buildWave(); buildShields(); hud(); }
    function fire() {
      if (state !== 'play' || player.dead > 0) return;
      if (bullets.length >= 1) return;
      bullets.push({ x: player.x, y: H - 48 }); blip(84, 0.05);
    }
    function loseLife() {
      lives--; player.dead = 1.2; blip(38, 0.4); bombs = []; hud();
      if (lives <= 0) { state = 'over'; HiScore.submit('invaders', score); }
    }
    function update(dt) {
      if (state !== 'play') return;
      if (player.dead > 0) { player.dead -= dt; if (player.dead > 0) return; }
      if (keys.ArrowLeft || keys.a) player.x -= 220 * dt;
      if (keys.ArrowRight || keys.d) player.x += 220 * dt;
      player.x = Utils.clamp(player.x, 16, W - 16);
      // aliens march
      stepT += dt;
      const alive = aliens.filter(a => a.alive);
      const speedup = stepInt * Math.max(0.15, alive.length / 55);
      if (stepT >= speedup) {
        stepT = 0; anim ^= 1;
        const xs = alive.map(a => a.x);
        const edge = dir > 0 ? Math.max(...xs) >= W - 24 : Math.min(...xs) <= 24;
        if (edge) { dir *= -1; alive.forEach(a => a.y += 12); blip(45, 0.03); }
        else { alive.forEach(a => a.x += dir * 10); blip(alive.length > 20 ? 48 : 55, 0.02); }
        if (Math.random() < 0.6 + wave * 0.05) { const s = alive[Math.floor(Math.random() * alive.length)]; if (s) bombs.push({ x: s.x, y: s.y + 8 }); }
      }
      if (alive.some(a => a.y >= H - 90)) { state = 'over'; HiScore.submit('invaders', score); blip(30, 0.6); return; }
      // ufo
      ufoT -= dt;
      if (ufoT <= 0 && !ufo) { ufo = { x: -30, dir: 1 }; ufoT = 15 + Math.random() * 15; }
      if (ufo) { ufo.x += 90 * dt; if (ufo.x > W + 30) ufo = null; }
      // bullets
      for (const b of bullets) b.y -= 420 * dt;
      for (const b of bombs) b.y += 160 * dt;
      bullets = bullets.filter(b => b.y > -10);
      bombs = bombs.filter(b => b.y < H);
      const hitShield = (p, dmg) => { for (const s of shields) { if (s.hp > 0 && p.x > s.x - 1 && p.x < s.x + 8 && p.y > s.y - 1 && p.y < s.y + 8) { s.hp -= dmg; return true; } } return false; };
      bullets = bullets.filter(b => {
        if (hitShield(b, 1)) return false;
        if (ufo && Math.abs(b.x - ufo.x) < 16 && b.y < 36 && b.y > 16) { score += 100 + 50 * Math.floor(Math.random() * 3); ufo = null; blip(96, 0.2); hud(); return false; }
        for (const a of aliens) if (a.alive && Math.abs(b.x - a.x) < 12 && Math.abs(b.y - a.y) < 10) { a.alive = false; score += (a.type + 1) * 10; blip(72 + a.type * 5, 0.05); hud(); return false; }
        return true;
      });
      bombs = bombs.filter(b => {
        if (hitShield(b, 1)) return false;
        if (b.y > H - 56 && Math.abs(b.x - player.x) < 14) { loseLife(); return false; }
        return true;
      });
      if (!aliens.some(a => a.alive)) {
        Achievements.unlock('invaders');
        wave++; score += 250; hud(); buildWave();
        Shell.toast('Space Invaders', 'Wave ' + wave + ' incoming. They\'re faster now.', '👾');
      }
    }
    function alienSprite(a) {
      const f = anim;
      ctx.fillStyle = ['#3ddc84', '#4cc9f0', '#f72585'][a.type];
      const x = a.x, y = a.y;
      ctx.fillRect(x - 10, y - 6, 20, 8);
      ctx.fillRect(x - 6, y - 10, 12, 4);
      ctx.fillRect(x - 12, y - 2, 4, 6); ctx.fillRect(x + 8, y - 2, 4, 6);
      if (f) { ctx.fillRect(x - 8, y + 2, 4, 4); ctx.fillRect(x + 4, y + 2, 4, 4); } else { ctx.fillRect(x - 12, y + 4, 4, 3); ctx.fillRect(x + 8, y + 4, 4, 3); }
      ctx.fillStyle = '#0d1321'; ctx.fillRect(x - 6, y - 4, 3, 3); ctx.fillRect(x + 3, y - 4, 3, 3);
    }
    function draw() {
      ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % W, (i * 53) % H, 1, 1);
      aliens.forEach(a => a.alive && alienSprite(a));
      if (ufo) { ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.ellipse(ufo.x, 26, 16, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd400'; ctx.fillRect(ufo.x - 6, 18, 12, 5); }
      for (const s of shields) if (s.hp > 0) { ctx.fillStyle = s.hp > 1 ? '#3ddc84' : '#1e7a48'; ctx.fillRect(s.x, s.y, 7, 7); }
      if (player.dead <= 0 || Math.floor(player.dead * 10) % 2) {
        ctx.fillStyle = '#4cc9f0'; ctx.fillRect(player.x - 14, H - 48, 28, 10); ctx.fillRect(player.x - 3, H - 56, 6, 8); ctx.fillRect(player.x - 16, H - 42, 32, 4);
      }
      ctx.fillStyle = '#fff'; bullets.forEach(b => ctx.fillRect(b.x - 1, b.y - 6, 2, 8));
      ctx.fillStyle = '#ff9a3c'; bombs.forEach(b => ctx.fillRect(b.x - 1.5, b.y - 5, 3, 8));
      ctx.fillStyle = '#3ddc84'; ctx.fillRect(0, H - 30, W, 2);
      if (state === 'over') {
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 26px Segoe UI, system-ui, sans-serif';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 10);
        ctx.font = '14px Segoe UI, system-ui, sans-serif'; ctx.fillText('Score ' + score + ' — click to play again', W / 2, H / 2 + 20);
      }
    }
    c.addEventListener('keydown', e => { keys[e.key] = true; if (e.key === ' ') { e.preventDefault(); fire(); } if (e.key.startsWith('Arrow')) e.preventDefault(); });
    c.addEventListener('keyup', e => { keys[e.key] = false; });
    let drag = null;
    c.addEventListener('pointerdown', e => { e.preventDefault(); c.focus(); if (state === 'over') { reset(); return; } drag = { x: e.clientX, px: player.x, moved: false }; });
    c.addEventListener('pointermove', e => { if (!drag) return; const dx = (e.clientX - drag.x) * (W / c.getBoundingClientRect().width); if (Math.abs(dx) > 4) drag.moved = true; player.x = Utils.clamp(drag.px + dx, 16, W - 16); });
    c.addEventListener('pointerup', () => { if (drag && !drag.moved) fire(); drag = null; });
    reset();
    gameLoop(win, dt => { update(dt); draw(); });
    setTimeout(() => c.focus(), 100);
  }
});

/* ---------- Run dialog (Win+R) ---------- */
const RunDialog = {
  el: null,
  ALIASES: { cmd: 'terminal', powershell: 'terminal', wt: 'terminal', calc: 'calculator', mspaint: 'paint', control: 'settings', 'ms-settings:': 'settings', winword: 'word', excel: 'excel', powerpnt: 'powerpoint', msedge: 'edge', iexplore: 'edge', explorer: 'explorer', taskmgr: 'taskmgr', notepad: 'notepad', wmplayer: 'mediaplayer', msconfig: 'taskmgr', camera: 'camera' },
  open() {
    if (this.el) { this.el.querySelector('input').focus(); return; }
    Achievements.unlock('run');
    const hist = Store.get('win11.run.history', []);
    this.el = Utils.el('div', 'run-dialog');
    this.el.innerHTML = `
      <div class="run-head"><span>▶️</span><span>Run</span><button class="run-x" title="Close">✕</button></div>
      <div class="run-body">
        <div class="run-hint">Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</div>
        <div class="run-row"><label>Open:</label><input list="run-hist" spellcheck="false" autocomplete="off" placeholder="notepad, calc, cmd, C:\\Users, https://…"><datalist id="run-hist">${hist.map(h => `<option value="${Utils.esc(h)}">`).join('')}</datalist></div>
        <div class="run-btns"><button class="fluent-btn run-ok">OK</button><button class="fluent-btn subtle run-cancel">Cancel</button><button class="fluent-btn subtle run-browse">Browse…</button></div>
      </div>`;
    document.body.appendChild(this.el);
    const input = this.el.querySelector('input');
    input.value = hist[0] || '';
    setTimeout(() => { input.focus(); input.select(); }, 30);
    this.el.querySelector('.run-x').addEventListener('click', () => this.close());
    this.el.querySelector('.run-cancel').addEventListener('click', () => this.close());
    this.el.querySelector('.run-browse').addEventListener('click', () => { this.close(); Apps.launch('explorer'); });
    this.el.querySelector('.run-ok').addEventListener('click', () => this.run(input.value));
    input.addEventListener('keydown', e => { if (e.key === 'Enter') this.run(input.value); if (e.key === 'Escape') this.close(); });
    this.el.addEventListener('pointerdown', e => e.stopPropagation());
  },
  run(v) {
    v = String(v || '').trim();
    if (!v) return;
    const hist = [v].concat(Store.get('win11.run.history', []).filter(h => h !== v)).slice(0, 10);
    Store.set('win11.run.history', hist);
    this.close();
    const [cmd, ...rest] = v.split(/\s+/);
    const key = cmd.toLowerCase().replace(/\.exe$/, '');
    if (/^https?:\/\//i.test(v) || /^www\./i.test(v)) { Apps.launch('edge', { url: v }); return; }
    if (/^[a-z]:[\\/]/i.test(v)) { const p = v.replace(/\\/g, '/'); if (FS.get(p)) openFile(p); else Shell.toast('Run', 'Windows cannot find \'' + v + '\'. Make sure you typed the name correctly.', '⚠️'); return; }
    if (key === 'shutdown') { Power.shutdown(rest.includes('/r')); return; }
    if (key === 'lock' || key === 'rundll32') { Lock.show(); return; }
    if (key === 'regedit') { Shell.toast('Registry Editor', 'HKEY_LOCAL_MACHINE\\SOFTWARE\\Nope. There is no registry, and you cannot edit it.', '🗝️'); return; }
    if (key === 'winver') { Apps.launch('settings', { section: 'about' }); return; }
    if (key === 'bsod' || key === 'crash') { BSOD.show('RUN_DIALOG_SAID_SO'); return; }
    if (key === 'party') { Party.start(); return; }
    const id = this.ALIASES[key] || key;
    const app = Apps.get(id) || Apps.visible().find(a => a.name.toLowerCase() === v.toLowerCase());
    if (app && Apps.isInstalled(app.id)) { Apps.launch(app.id, rest.length ? { path: rest.join(' ').replace(/\\/g, '/') } : undefined); return; }
    if (typeof FunCmds !== 'undefined' && Object.prototype.hasOwnProperty.call(FunCmds, key)) { const w = Apps.launch('terminal'); setTimeout(() => { const i = w.body.querySelector('input'); if (i) { i.value = v; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); } }, 150); return; }
    Shell.toast('Run', 'Windows cannot find \'' + v + '\'. Make sure you typed the name correctly, and then try again.', '⚠️');
  },
  close() { if (this.el) { this.el.remove(); this.el = null; } }
};
document.addEventListener('keydown', e => { if (e.metaKey && e.key.toLowerCase() === 'r') { e.preventDefault(); RunDialog.open(); } });

/* ---------- Windows Update + What's new ---------- */
const WinUpdate = {
  VERSION: '26H2.3', KB: 'KB5027331',
  NOTES: [
    { icon: '🏆', t: 'Xbox Achievements', d: 'Earn gamerscore for exploring. Some are secret.', app: 'xbox' },
    { icon: '🃏', t: 'Solitaire, Tetris, Space Invaders, Breakout, Pong, Flappy', d: 'All in the Microsoft Store. Every one keeps a high score.', app: 'store' },
    { icon: '🗔', t: 'Virtual desktops & Snap Layouts', d: 'Task View on the taskbar; hover the maximize button for layouts.', fn: () => TaskView.open() },
    { icon: '📎', t: 'Clippy', d: 'He\'s back. Settings → Fun, if you dare.', fn: () => Settings.set('clippy', true) },
    { icon: '🐈', t: 'Neko', d: 'A desktop cat that chases your mouse. In the Store.', app: 'store' },
    { icon: '🌐', t: 'Edge with tabs and bookmarks', d: 'Plus an optional proxy so more sites load inside it.', app: 'edge' },
    { icon: '📷', t: 'Camera', d: 'Real webcam, filters, saves to Camera Roll.', app: 'camera' },
    { icon: '📊', t: 'Task Manager', d: 'Ctrl+Shift+Esc. End tasks. Break things.', app: 'taskmgr' },
    { icon: '⌨️', t: 'Shortcuts', d: 'Alt+Tab, Win+Tab, Win+R, Win+., Win+D/E/I, Ctrl+Esc, and the Konami code.', fn: () => RunDialog.open() },
    { icon: '🫧', t: 'Screensavers, Spotlight wallpaper, Widgets, notification center', d: 'Settings → Fun / Personalization, the weather button, and the clock.', fn: () => Widgets.toggle() }
  ],
  state() { return Store.get('win11.update', { installed: false, history: [] }); },
  install() {
    Shell.closeFlyouts();
    const el = Utils.el('div'); el.id = 'winupdate';
    el.innerHTML = `<div class="wu-inner"><div class="boot-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div><div class="wu-text">Working on updates <span class="wu-pct">0</span>%<br><small>Don't turn off your PC. This will take a while.</small></div></div>`;
    document.body.appendChild(el);
    WM.allDesks().forEach(w => w.close());
    const pct = el.querySelector('.wu-pct'), text = el.querySelector('.wu-text small');
    let p = 0;
    const lines = ['Don\'t turn off your PC. This will take a while.', 'Installing feature update 26H2…', 'Configuring Clippy (this cannot be skipped)…', 'Optimizing achievements database…', 'Teaching Neko to chase cursors…', 'Still don\'t turn off your PC.', 'Getting things ready…'];
    const t = setInterval(() => {
      p = Math.min(100, p + (p < 30 ? 6 : p < 90 ? 2 + Math.random() * 5 : 1));
      pct.textContent = Math.floor(p);
      text.textContent = lines[Math.min(lines.length - 1, Math.floor(p / 15))];
      if (p >= 100) {
        clearInterval(t);
        const s = this.state();
        s.installed = true; s.version = this.VERSION;
        s.history.unshift({ kb: this.KB, name: 'Windows 11 Web Feature Update ' + this.VERSION, when: new Date().toISOString() });
        Store.set('win11.update', s);
        Store.set('win11.update.pending', true);
        Achievements.unlock('updated');
        text.textContent = 'Restarting…';
        setTimeout(() => location.reload(), 1200);
      }
    }, 180);
  }
};
Bus.on('shell:unlock', () => {
  if (Store.get('win11.update.pending', false)) {
    localStorage.removeItem('win11.update.pending');
    setTimeout(() => { Shell.toast('Windows Update', 'Feature update ' + WinUpdate.VERSION + ' installed. Here\'s what\'s new.', '🔄'); Apps.launch('whatsnew'); }, 1200);
  }
});
Apps.register({
  id: 'whatsnew', name: 'Tips & What\'s New', icon: '💡', color: 'linear-gradient(135deg,#f6d365,#fda085)',
  category: 'System', width: 640, height: 560, singleton: true,
  mount(win) {
    win.body.innerHTML = `<div class="wn-root"><div class="wn-hero"><div class="wn-big">💡</div><div><h1>What's new in Windows 11 Web ${WinUpdate.VERSION}</h1><p>Happy happy, joy joy. Tap "Try it" to jump straight in.</p></div></div>
      ${WinUpdate.NOTES.map((n, i) => `<div class="set-card"><div class="wn-ico">${n.icon}</div><div class="set-info"><div class="set-t">${n.t}</div><div class="set-s">${n.d}</div></div><button class="fluent-btn subtle" data-i="${i}">Try it</button></div>`).join('')}</div>`;
    win.body.addEventListener('click', e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const n = WinUpdate.NOTES[+b.dataset.i];
      if (n.app) Apps.launch(n.app); else if (n.fn) n.fn();
    });
  }
});

/* ---------- Smarter Start search: math, settings pages, commands, web ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const orig = Shell.startSearch.bind(Shell);
  const SETTINGS = [['personalization', 'Personalization', '🎨', 'wallpaper theme accent color dark mode taskbar'], ['system', 'System', '🖥️', 'storage display reset proxy edge'], ['apps', 'Apps', '📦', 'installed uninstall'], ['accounts', 'Accounts', '👤', 'name avatar user'], ['accessibility', 'Accessibility', '♿', 'narrator mouse trails emoji'], ['fun', 'Fun', '🎉', 'clippy screensaver achievements party'], ['about', 'About', 'ℹ️', 'version build device']];
  const COMMANDS = [['lock', 'Lock', '🔒', () => Lock.show()], ['sleep', 'Sleep', '🌙', () => Screensaver.start()], ['restart', 'Restart', '🔄', () => Power.shutdown(true)], ['shut down', 'Shut down', '⏻', () => Power.shutdown(false)], ['task view', 'Task View', '🗔', () => TaskView.open()], ['run', 'Run', '▶️', () => RunDialog.open()], ['windows update', 'Check for updates', '🔄', () => Apps.launch('settings', { section: 'update' })], ['emoji', 'Emoji panel', '😀', () => EmojiPicker.toggle()], ['party', 'Party mode', '🎉', () => Party.start()], ['what\'s new', 'Tips & What\'s New', '💡', () => Apps.launch('whatsnew')]];
  const rowHTML = (ico, label, sub, attrs) => `<div class="start-list-item" ${attrs}><div style="font-size:20px;width:28px;text-align:center">${ico}</div><span>${label}${sub ? ` <span style="color:var(--text-2);font-size:12px">— ${sub}</span>` : ''}</span></div>`;
  Shell.startSearch = function (q) {
    orig(q);
    if (!q) return;
    const res = document.getElementById('start-search-results');
    const ql = q.toLowerCase();
    let extra = '';
    // math
    const m = q.replace(/,/g, '').replace(/[?=\s]+$/, '');
    if (/\d/.test(m) && /^[-+*/().\d\s%^]+$/.test(m) && /[-+*/^%]/.test(m)) {
      try { const v = Function('"use strict";return (' + m.replace(/\^/g, '**') + ')')(); if (typeof v === 'number' && isFinite(v)) extra += rowHTML('🧮', Utils.esc(m) + ' = <b>' + (Math.round(v * 1e10) / 1e10) + '</b>', 'Calculator', `data-run="calc" data-v="${Utils.esc(String(v))}"`); } catch (e) {}
    }
    SETTINGS.filter(s => (s[1] + ' ' + s[3]).toLowerCase().includes(ql)).forEach(s => { extra += rowHTML(s[2], s[1], 'Settings', `data-run="settings" data-v="${s[0]}"`); });
    COMMANDS.filter(c => c[0].includes(ql) || c[1].toLowerCase().includes(ql)).forEach((c, i) => { extra += rowHTML(c[2], c[1], 'Command', `data-run="cmd" data-v="${COMMANDS.indexOf(c)}"`); });
    extra += rowHTML('🌐', 'Search the web for "' + Utils.esc(q) + '"', 'Microsoft Edge', `data-run="web" data-v="${Utils.esc(q)}"`);
    if (res.textContent.includes('No results found')) res.innerHTML = extra; else res.insertAdjacentHTML('beforeend', extra);
  };
  document.getElementById('start-menu').addEventListener('click', e => {
    const r = e.target.closest('[data-run]'); if (!r) return;
    const v = r.dataset.v;
    Shell.toggleStart(false);
    if (r.dataset.run === 'settings') Apps.launch('settings', { section: v });
    else if (r.dataset.run === 'web') Apps.launch('edge', { url: 'https://duckduckgo.com/html/?q=' + encodeURIComponent(v) });
    else if (r.dataset.run === 'calc') { const w = Apps.launch('calculator'); Shell.toast('Calculator', '= ' + v, '🧮'); }
    else if (r.dataset.run === 'cmd') COMMANDS[+v][3]();
  });
});
