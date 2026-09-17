/* ============ Windows 11 Web — mega: Dot Muncher, Sudoku, Snipping Tool app, media flyout ============ */
'use strict';

Achievements.list.push(
  { id: 'muncher', name: 'Waka Waka', desc: 'Cleared a maze in Dot Muncher.', icon: '🟡', pts: 25 },
  { id: 'ghost', name: 'Ghost Buster', desc: 'Ate a ghost.', icon: '👻', pts: 10 },
  { id: 'sudoku', name: 'Logician', desc: 'Solved a Sudoku without hints.', icon: '🔢', pts: 25 },
  { id: 'organizer', name: 'Copy Paste Pro', desc: 'Copied or moved a file in File Explorer.', icon: '📑', pts: 5 }
);

/* ---------- Dot Muncher (Pac-Man-like) ---------- */
Apps.register({
  id: 'muncher', name: 'Dot Muncher', icon: '🟡', color: 'linear-gradient(135deg,#ffd200,#f7971e)',
  category: 'Games', store: true, width: 460, height: 600,
  desc: 'A yellow circle, four ghosts, 200-odd dots. Arrow keys or WASD; swipe on touch. Power pellets turn the tables for a few seconds.', rating: 4.8, size: '1.3 MB',
  mount(win) {
    const MAP = [
      '###################', '#........#........#', '#o##.###.#.###.##o#', '#.................#', '#.##.#.#####.#.##.#', '#....#...#...#....#', '####.###.#.###.####',
      '   #.#.......#.#   ', '####.#.##G##.#.####', '    ...#GGG#...    ', '####.#.#####.#.####', '   #.#.......#.#   ', '####.#.#####.#.####', '#........#........#',
      '#.##.###.#.###.##.#', '#o.#.....P.....#.o#', '##.#.#.#####.#.#.##', '#....#...#...#....#', '#.######.#.######.#', '#.................#', '###################'
    ];
    const CS = 20, COLS = 19, ROWS = 21, W = COLS * CS, H = ROWS * CS;
    win.body.innerHTML = `<div class="game-center"><div class="game-hud"><span class="pm-score">Score 0</span><span class="pm-lives">🟡🟡🟡</span><span class="pm-level">Level 1</span><span class="pm-hi">Best ${HiScore.get('muncher')}</span></div></div>`;
    const { c, ctx } = makeCanvas(win, W, H);
    win.body.querySelector('.game-center').appendChild(c);
    c.tabIndex = 0;
    let grid, pac, ghosts, score, lives, level, dots, state, fright, t, wantDir, mouth = 0;
    const DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
    const GC = ['#ff4d4d', '#ffb8ff', '#4cf0f0', '#ffb852'];
    const hud = () => { win.body.querySelector('.pm-score').textContent = 'Score ' + score; win.body.querySelector('.pm-lives').textContent = '🟡'.repeat(lives); win.body.querySelector('.pm-level').textContent = 'Level ' + level; win.body.querySelector('.pm-hi').textContent = 'Best ' + HiScore.get('muncher'); };
    const wallAt = (x, y) => { const r = MAP[((y % ROWS) + ROWS) % ROWS]; const ch = r[((x % COLS) + COLS) % COLS]; return ch === '#'; };
    function placeActors() {
      pac = { x: 9, y: 15, dir: [0, 0], fx: 9, fy: 15 }; wantDir = [0, 0];
      ghosts = [0, 1, 2, 3].map(i => ({ x: 8 + (i % 3), y: 9, dir: [0, -1], fx: 8 + (i % 3), fy: 9, col: GC[i], out: i === 0, dead: false, wait: i * 2.5 }));
      fright = 0;
    }
    function reset(full) {
      if (full) { score = 0; lives = 3; level = 1; }
      grid = MAP.map(r => r.split('').map(ch => ch === '.' ? 1 : ch === 'o' ? 2 : 0));
      dots = grid.flat().filter(v => v).length;
      placeActors(); state = 'ready'; t = 0; hud();
    }
    function canMove(x, y, d) { return !wallAt(x + d[0], y + d[1]); }
    const wrap = a => { a.x = ((a.x % COLS) + COLS) % COLS; };
    function stepActor(a, speed, dt, pick) {
      // grid-locked movement: actors move between cells, choose direction at cell centers
      a.prog = (a.prog || 0) + speed * dt;
      while (a.prog >= 1) {
        a.prog -= 1;
        if (pick) pick(a);
        if (canMove(a.x, a.y, a.dir)) { a.x += a.dir[0]; a.y += a.dir[1]; wrap(a); } else a.prog = 0;
      }
      a.fx = a.x + a.dir[0] * a.prog; a.fy = a.y + a.dir[1] * a.prog;
      if (!canMove(a.x, a.y, a.dir)) { a.fx = a.x; a.fy = a.y; a.prog = 0; }
    }
    function pacPick(a) {
      if (wantDir[0] || wantDir[1]) { if (canMove(a.x, a.y, wantDir)) a.dir = wantDir; }
      if (!canMove(a.x, a.y, a.dir)) a.dir = [0, 0];
    }
    function ghostPick(g) {
      const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(d => canMove(g.x, g.y, d) && !(d[0] === -g.dir[0] && d[1] === -g.dir[1]));
      if (!opts.length) { g.dir = [-g.dir[0], -g.dir[1]]; return; }
      if (g.dead) { const tx = 9, ty = 9; opts.sort((p, q) => Math.hypot(g.x + p[0] - tx, g.y + p[1] - ty) - Math.hypot(g.x + q[0] - tx, g.y + q[1] - ty)); g.dir = opts[0]; return; }
      const chase = Math.random() < (fright ? 0.1 : 0.55 + level * 0.05);
      if (chase) { const tx = pac.x, ty = pac.y; opts.sort((p, q) => (Math.hypot(g.x + p[0] - tx, g.y + p[1] - ty) - Math.hypot(g.x + q[0] - tx, g.y + q[1] - ty)) * (fright ? -1 : 1)); g.dir = opts[0]; }
      else g.dir = opts[Math.floor(Math.random() * opts.length)];
    }
    function update(dt) {
      t += dt; mouth += dt * 10;
      if (state === 'ready') { if (t > 1.5) { state = 'play'; } return; }
      if (state !== 'play') return;
      if (fright > 0) fright -= dt;
      stepActor(pac, 6 + level * .3, dt, pacPick);
      const v = grid[pac.y][pac.x];
      if (v) { grid[pac.y][pac.x] = 0; dots--; score += v === 2 ? 50 : 10; if (v === 2) { fright = 6; ghosts.forEach(g => { if (!g.dead) g.dir = [-g.dir[0], -g.dir[1]]; }); } blip(v === 2 ? 70 : 88, 0.03); hud(); }
      for (const g of ghosts) {
        if (!g.out) { g.wait -= dt; if (g.wait <= 0) { g.out = true; g.x = 9; g.y = 7; g.fx = 9; g.fy = 7; g.dir = [0, -1]; } continue; }
        stepActor(g, g.dead ? 10 : fright > 0 ? 3.5 : 5 + level * .4, dt, ghostPick);
        if (g.dead && g.x === 9 && g.y === 9) { g.dead = false; g.out = false; g.wait = 2; }
        if (!g.dead && Math.hypot(g.fx - pac.fx, g.fy - pac.fy) < .6) {
          if (fright > 0) { g.dead = true; score += 200; Achievements.unlock('ghost'); blip(60, 0.2); hud(); }
          else { lives--; blip(36, 0.5); hud(); HiScore.submit('muncher', score); if (lives <= 0) { state = 'over'; } else { placeActors(); state = 'ready'; t = 0; } return; }
        }
      }
      if (dots === 0) { Achievements.unlock('muncher'); level++; score += 500; HiScore.submit('muncher', score); reset(false); Shell.toast('Dot Muncher', 'Level ' + level + '! Ghosts are getting faster.', '🟡'); }
    }
    function draw() {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        const ch = MAP[y][x];
        if (ch === '#') { ctx.fillStyle = '#1a1aa6'; ctx.fillRect(x * CS + 2, y * CS + 2, CS - 4, CS - 4); ctx.strokeStyle = '#4c4cff'; ctx.strokeRect(x * CS + 2.5, y * CS + 2.5, CS - 5, CS - 5); }
        else if (grid[y][x] === 1) { ctx.fillStyle = '#ffd7a0'; ctx.fillRect(x * CS + CS / 2 - 2, y * CS + CS / 2 - 2, 4, 4); }
        else if (grid[y][x] === 2) { ctx.fillStyle = Math.floor(t * 4) % 2 ? '#ffd7a0' : '#ff9'; ctx.beginPath(); ctx.arc(x * CS + CS / 2, y * CS + CS / 2, 6, 0, 7); ctx.fill(); }
      }
      // pac
      const px = pac.fx * CS + CS / 2, py = pac.fy * CS + CS / 2;
      const a = (Math.sin(mouth) + 1) / 2 * 0.35 + 0.05;
      const base = Math.atan2(pac.dir[1], pac.dir[0]) || 0;
      ctx.fillStyle = '#ffe600'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, CS / 2 - 1, base + a, base - a + Math.PI * 2); ctx.closePath(); ctx.fill();
      // ghosts
      for (const g of ghosts) {
        const gx = g.fx * CS + CS / 2, gy = g.fy * CS + CS / 2, r = CS / 2 - 1;
        ctx.fillStyle = g.dead ? 'rgba(255,255,255,.25)' : fright > 0 ? (fright < 2 && Math.floor(t * 8) % 2 ? '#fff' : '#2121de') : g.col;
        ctx.beginPath(); ctx.arc(gx, gy - 2, r, Math.PI, 0); ctx.lineTo(gx + r, gy + r - 2);
        for (let i = 0; i < 4; i++) ctx.lineTo(gx + r - (i + .5) * r / 2, gy + r - 2 - (i % 2 ? 0 : 3));
        ctx.lineTo(gx - r, gy + r - 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(gx - 3, gy - 3, 3, 0, 7); ctx.arc(gx + 3, gy - 3, 3, 0, 7); ctx.fill();
        ctx.fillStyle = '#22f'; ctx.beginPath(); ctx.arc(gx - 3 + g.dir[0] * 1.5, gy - 3 + g.dir[1] * 1.5, 1.5, 0, 7); ctx.arc(gx + 3 + g.dir[0] * 1.5, gy - 3 + g.dir[1] * 1.5, 1.5, 0, 7); ctx.fill();
      }
      if (state === 'ready') { ctx.fillStyle = '#ff0'; ctx.textAlign = 'center'; ctx.font = '700 16px Segoe UI, system-ui, sans-serif'; ctx.fillText('READY!', W / 2, 9 * CS + 15 + CS * 2); }
      if (state === 'over') { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '700 26px Segoe UI, system-ui, sans-serif'; ctx.fillText('GAME OVER', W / 2, H / 2); ctx.font = '14px Segoe UI, system-ui, sans-serif'; ctx.fillText('Score ' + score + ' — click to play again', W / 2, H / 2 + 28); }
    }
    c.addEventListener('keydown', e => { const d = DIRS[e.key]; if (d) { e.preventDefault(); wantDir = d; if (state === 'over') reset(true); } });
    let sw = null;
    c.addEventListener('pointerdown', e => { e.preventDefault(); c.focus(); sw = [e.clientX, e.clientY]; if (state === 'over') reset(true); });
    c.addEventListener('pointerup', e => { if (!sw) return; const dx = e.clientX - sw[0], dy = e.clientY - sw[1]; if (Math.hypot(dx, dy) > 15) wantDir = Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]; sw = null; });
    reset(true);
    gameLoop(win, dt => { update(dt); draw(); });
    setTimeout(() => c.focus(), 100);
  }
});

/* ---------- Sudoku ---------- */
Apps.register({
  id: 'sudoku', name: 'Sudoku', icon: '🔢', color: 'linear-gradient(135deg,#2193b0,#6dd5ed)',
  category: 'Games', store: true, width: 520, height: 620,
  desc: 'Freshly generated puzzles with a unique solution, three difficulties, pencil-free. Arrow keys move, digits fill, Backspace clears, H for a hint.', rating: 4.7, size: '0.7 MB',
  mount(win) {
    let sol, puzzle, board, sel = 0, diff = Store.get('win11.sudoku.diff', 'medium'), hints = 0, t0, timer, done = false;
    const rnd = () => Math.random();
    function solveCount(g, limit) {
      let count = 0;
      const ok = (i, v) => { const r = Math.floor(i / 9), c = i % 9; for (let k = 0; k < 9; k++) { if (g[r * 9 + k] === v || g[k * 9 + c] === v) return false; } const br = r - r % 3, bc = c - c % 3; for (let y = br; y < br + 3; y++) for (let x = bc; x < bc + 3; x++) if (g[y * 9 + x] === v) return false; return true; };
      const rec = () => { if (count >= limit) return; const i = g.indexOf(0); if (i < 0) { count++; return; } for (let v = 1; v <= 9; v++) if (ok(i, v)) { g[i] = v; rec(); g[i] = 0; } };
      rec(); return count;
    }
    function fill(g, i) {
      if (i === 81) return true;
      const r = Math.floor(i / 9), c = i % 9;
      const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => rnd() - .5);
      for (const v of vals) {
        let ok = true;
        for (let k = 0; k < 9 && ok; k++) if (g[r * 9 + k] === v || g[k * 9 + c] === v) ok = false;
        const br = r - r % 3, bc = c - c % 3;
        for (let y = br; y < br + 3 && ok; y++) for (let x = bc; x < bc + 3; x++) if (g[y * 9 + x] === v) ok = false;
        if (ok) { g[i] = v; if (fill(g, i + 1)) return true; g[i] = 0; }
      }
      return false;
    }
    function generate() {
      sol = Array(81).fill(0); fill(sol, 0);
      puzzle = sol.slice();
      const target = { easy: 38, medium: 30, hard: 24 }[diff];
      const idx = [...Array(81).keys()].sort(() => rnd() - .5);
      let filled = 81;
      for (const i of idx) {
        if (filled <= target) break;
        const keep = puzzle[i]; puzzle[i] = 0;
        if (solveCount(puzzle.slice(), 2) !== 1) puzzle[i] = keep; else filled--;
      }
      board = puzzle.slice(); hints = 0; done = false; t0 = Date.now();
      clearInterval(timer); timer = setInterval(() => { if (!done) win.body.querySelector('.su-time').textContent = Utils.fmtTime((Date.now() - t0) / 1000); }, 500);
    }
    win.body.innerHTML = `<div class="su-root"><div class="app-toolbar"><select class="fluent-input su-diff"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select><button class="fluent-btn subtle su-new">New puzzle</button><button class="fluent-btn subtle su-hint">💡 Hint</button><button class="fluent-btn subtle su-check">✔ Check</button><span class="su-time" style="margin-left:auto;font-variant-numeric:tabular-nums">0:00</span></div><div class="su-grid" tabindex="0"></div><div class="su-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-n="${n}">${n}</button>`).join('')}<button data-n="0">⌫</button></div></div>`;
    const grid = win.body.querySelector('.su-grid');
    win.body.querySelector('.su-diff').value = diff;
    const conflicts = () => { const bad = new Set(); for (let i = 0; i < 81; i++) { const v = board[i]; if (!v) continue; const r = Math.floor(i / 9), c = i % 9; for (let j = 0; j < 81; j++) { if (j === i || board[j] !== v) continue; const rr = Math.floor(j / 9), cc = j % 9; if (rr === r || cc === c || (Math.floor(rr / 3) === Math.floor(r / 3) && Math.floor(cc / 3) === Math.floor(c / 3))) { bad.add(i); bad.add(j); } } } return bad; };
    function render() {
      const bad = conflicts(), sv = board[sel];
      grid.innerHTML = board.map((v, i) => `<div class="su-cell ${puzzle[i] ? 'given' : ''} ${i === sel ? 'sel' : ''} ${bad.has(i) ? 'bad' : ''} ${v && v === sv && i !== sel ? 'same' : ''} ${i % 3 === 2 ? 'br' : ''} ${Math.floor(i / 9) % 3 === 2 ? 'bb' : ''}" data-i="${i}">${v || ''}</div>`).join('');
      if (!done && board.every((v, i) => v === sol[i])) {
        done = true; clearInterval(timer);
        const secs = Math.round((Date.now() - t0) / 1000);
        if (!hints) Achievements.unlock('sudoku');
        HiScore.submit('sudoku', Math.max(1, 5000 - secs - hints * 300));
        Shell.toast('Sudoku', 'Solved in ' + Utils.fmtTime(secs) + (hints ? ' with ' + hints + ' hint' + (hints > 1 ? 's' : '') : ' with no hints') + '!', '🔢');
        Party.confetti(3);
      }
    }
    function set(v) { if (puzzle[sel] || done) return; board[sel] = v; if (v) blip(76, 0.03); render(); }
    grid.addEventListener('click', e => { const c = e.target.closest('.su-cell'); if (c) { sel = +c.dataset.i; render(); grid.focus(); } });
    grid.addEventListener('keydown', e => {
      if (/^[1-9]$/.test(e.key)) set(+e.key);
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') set(0);
      else if (e.key === 'ArrowLeft') sel = Math.max(0, sel - 1); else if (e.key === 'ArrowRight') sel = Math.min(80, sel + 1);
      else if (e.key === 'ArrowUp') sel = Math.max(0, sel - 9); else if (e.key === 'ArrowDown') sel = Math.min(80, sel + 9);
      else if (e.key.toLowerCase() === 'h') { win.body.querySelector('.su-hint').click(); return; }
      else return;
      e.preventDefault(); render();
    });
    win.body.querySelector('.su-pad').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { set(+b.dataset.n); grid.focus(); } });
    win.body.querySelector('.su-new').addEventListener('click', () => { generate(); render(); });
    win.body.querySelector('.su-diff').addEventListener('change', e => { diff = e.target.value; Store.set('win11.sudoku.diff', diff); generate(); render(); });
    win.body.querySelector('.su-hint').addEventListener('click', () => { if (done) return; const empties = board.map((v, i) => v === sol[i] ? -1 : i).filter(i => i >= 0); if (!empties.length) return; const i = empties.includes(sel) ? sel : empties[Math.floor(rnd() * empties.length)]; board[i] = sol[i]; sel = i; hints++; render(); });
    win.body.querySelector('.su-check').addEventListener('click', () => { const wrong = board.filter((v, i) => v && v !== sol[i]).length; const bad = conflicts().size; Shell.toast('Sudoku', wrong ? wrong + ' cell' + (wrong > 1 ? 's are' : ' is') + ' wrong.' : bad ? 'No wrong digits, but there are conflicts.' : 'Everything so far is correct. Keep going!', '🔢'); });
    win.onClose(() => clearInterval(timer));
    generate(); render();
    setTimeout(() => grid.focus(), 100);
  }
});

/* ---------- Snipping Tool app (full screen or active window, with delay) ---------- */
Apps.register({
  id: 'snip', name: 'Snipping Tool', icon: '✂️', color: 'linear-gradient(135deg,#f857a6,#ff5858)',
  category: 'Utilities', width: 560, height: 480, singleton: true,
  mount(win) {
    const DIR = HOME + '/Pictures/Screenshots';
    win.body.innerHTML = `<div class="snip-root"><div class="app-toolbar"><select class="fluent-input snip-mode"><option value="screen">Full screen</option><option value="window">Active window</option></select><select class="fluent-input snip-delay"><option value="0">No delay</option><option value="3">3 s delay</option><option value="5">5 s delay</option></select><button class="fluent-btn snip-go">📸 New</button><span class="wg-sub" style="margin-left:auto">Win+Shift+S captures the screen anytime</span></div><div class="snip-list"></div></div>`;
    const list = win.body.querySelector('.snip-list');
    function render() {
      const files = FS.get(DIR) ? FS.list(DIR).filter(f => f.node.type === 'file').reverse() : [];
      list.innerHTML = files.length ? files.map(f => `<div class="snip-item" data-n="${Utils.esc(f.name)}"><img src="${f.node.content}"><div class="snip-name">${Utils.esc(f.name)}</div></div>`).join('') : '<div class="placeholder-pane"><div class="ph-ico">✂️</div>No screenshots yet. Click New.</div>';
    }
    win.body.querySelector('.snip-go').addEventListener('click', () => {
      const mode = win.body.querySelector('.snip-mode').value, delay = +win.body.querySelector('.snip-delay').value;
      const target = mode === 'window' ? WM.all().filter(w => w !== win && !w.minimized).sort((a, b) => b.z - a.z)[0] : null;
      if (mode === 'window' && !target) { Shell.toast('Snipping Tool', 'Open another window first, then capture it.', '✂️'); return; }
      win.minimize();
      setTimeout(() => Snip.capture(target ? { win: target } : undefined).then(() => { win.restore(); win.focus(); render(); }), delay * 1000 + 250);
    });
    list.addEventListener('click', e => { const it = e.target.closest('.snip-item'); if (it) Apps.launch('photos', { path: DIR + '/' + it.dataset.n }); });
    win.on('fs:changed', () => { if (win.body.isConnected) render(); });
    render();
  }
});

/* ---------- Now-playing media flyout in the tray ---------- */
const MediaTray = {
  el: null, flyout: null,
  init() {
    const tray = document.getElementById('tray-icons');
    this.el = Utils.el('span'); this.el.id = 'tray-media'; this.el.textContent = '🎵'; this.el.title = 'Now playing'; this.el.style.display = 'none';
    tray.insertBefore(this.el, tray.firstChild);
    this.el.addEventListener('click', e => { e.stopPropagation(); this.toggle(); });
    this.flyout = Utils.el('div', 'shell-flyout'); this.flyout.id = 'media-flyout';
    document.body.appendChild(this.flyout);
    this.flyout.addEventListener('click', e => {
      e.stopPropagation();
      const b = e.target.closest('[data-m]'); if (!b) return;
      if (b.dataset.m === 'toggle') Synth.toggle(); else if (b.dataset.m === 'next') Synth.next(); else if (b.dataset.m === 'prev') Synth.prev(); else if (b.dataset.m === 'open') { this.flyout.classList.remove('open'); Apps.launch('spotify'); }
    });
    Bus.on('player:change', () => this.render());
    setInterval(() => { if (this.flyout.classList.contains('open') && Synth.isPlaying) this.render(); }, 1000);
    this.render();
  },
  toggle() { const open = !this.flyout.classList.contains('open'); Shell.closeFlyouts(this.flyout); if (open) this.render(); this.flyout.classList.toggle('open', open); },
  render() {
    const t = Synth.current;
    this.el.style.display = t ? '' : 'none';
    this.el.classList.toggle('playing', !!(t && Synth.isPlaying));
    if (!t) { this.flyout.innerHTML = '<div class="wg-sub" style="padding:8px">Nothing playing.</div>'; return; }
    const pos = Synth.position(), dur = Synth.duration();
    this.flyout.innerHTML = `<div class="mf-row"><div class="mf-art" style="background:${t.color}">${t.art}</div><div style="flex:1;min-width:0"><div class="mf-t">${Utils.esc(t.title)}</div><div class="mf-a">${Utils.esc(t.artist)} • ${Utils.esc(t.album)}</div><div class="store-progress" style="margin-top:8px"><div style="width:${dur ? pos / dur * 100 : 0}%"></div></div><div class="mf-time">${Utils.fmtTime(pos)} / ${Utils.fmtTime(dur)}</div></div></div><div class="mf-ctl"><button data-m="prev">⏮</button><button data-m="toggle" class="mf-play">${Synth.isPlaying ? '⏸' : '▶'}</button><button data-m="next">⏭</button><button data-m="open" class="mf-open">Open Spotify</button></div>`;
  }
};
document.addEventListener('DOMContentLoaded', () => MediaTray.init());
