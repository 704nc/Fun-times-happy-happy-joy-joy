/* ============ Windows 11 Web — Microsoft Store + downloadable apps ============ */
'use strict';

/* ---------- Store apps (store: true → only usable after install) ---------- */

/* Minesweeper */
Apps.register({
  id: 'minesweeper', name: 'Minesweeper', icon: '💣', color: 'linear-gradient(135deg,#4b79cf,#283e6b)',
  category: 'Games', store: true, width: 420, height: 520,
  desc: 'The classic. Clear the board without detonating a mine. Right-click to flag.', rating: 4.8, size: '2.1 MB',
  mount(win) {
    const LEVELS = { beginner: [9, 9, 10], intermediate: [16, 16, 40], expert: [30, 16, 99] };
    let level = Store.get('win11.mines.level', 'beginner');
    let W, H, MINES, cell;
    let grid, revealed, flagged, over, firstClick, t0 = 0, timer = null;
    win.body.innerHTML = `
      <div class="game-center" style="justify-content:flex-start;overflow:auto">
        <div class="game-hud"><select class="fluent-input ms-level"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option></select><span class="ms-mines">💣</span><span class="ms-time">⏱ 0</span><button class="fluent-btn subtle ms-new">🙂 New game</button><span class="ms-status"></span></div>
        <div class="mine-grid"></div>
        <div class="ms-best" style="font-size:12px;color:var(--text-2)"></div>
      </div>`;
    const gridEl = win.body.querySelector('.mine-grid');
    const status = win.body.querySelector('.ms-status');
    const timeEl = win.body.querySelector('.ms-time');
    win.body.querySelector('.ms-level').value = level;
    function best() { const b = Store.get('win11.mines.best', {}); win.body.querySelector('.ms-best').textContent = b[level] ? 'Best ' + level + ': ' + b[level] + 's' : ''; return b; }
    function reset() {
      [W, H, MINES] = LEVELS[level]; cell = W > 16 ? 22 : W > 9 ? 26 : 30;
      gridEl.style.gridTemplateColumns = `repeat(${W},${cell}px)`;
      gridEl.style.setProperty('--ms-cell', cell + 'px');
      clearInterval(timer); timer = null; t0 = 0; timeEl.textContent = '⏱ 0';
      const wantW = Math.min(innerWidth - 20, W * (cell + 2) + 60), wantH = Math.min(innerHeight - 70, H * (cell + 2) + 170);
      if (!win.maxed && (win.el.offsetWidth < wantW || win.el.offsetHeight < wantH)) { win.el.style.width = Math.max(win.el.offsetWidth, wantW) + 'px'; win.el.style.height = Math.max(win.el.offsetHeight, wantH) + 'px'; }
      best();
      grid = Array.from({ length: H }, () => Array(W).fill(0));
      revealed = Array.from({ length: H }, () => Array(W).fill(false));
      flagged = Array.from({ length: H }, () => Array(W).fill(false));
      over = false; firstClick = true;
      status.textContent = '';
      draw();
    }
    function placeMines(avoidX, avoidY) {
      let placed = 0;
      while (placed < MINES) {
        const x = Math.floor(Math.random() * W), y = Math.floor(Math.random() * H);
        if (grid[y][x] === -1 || (Math.abs(x - avoidX) <= 1 && Math.abs(y - avoidY) <= 1)) continue;
        grid[y][x] = -1; placed++;
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (grid[y][x] === -1) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy, nx = x + dx;
          if (ny >= 0 && ny < H && nx >= 0 && nx < W && grid[ny][nx] === -1) n++;
        }
        grid[y][x] = n;
      }
    }
    function reveal(x, y) {
      if (x < 0 || y < 0 || x >= W || y >= H || revealed[y][x] || flagged[y][x]) return;
      revealed[y][x] = true;
      if (grid[y][x] === 0) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) reveal(x + dx, y + dy);
    }
    function draw() {
      const colors = ['', '#4b79cf', '#2e8b57', '#c0392b', '#8e44ad', '#d35400', '#16a085', '#2c3e50', '#7f8c8d'];
      gridEl.innerHTML = '';
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const c = Utils.el('button', 'mine-cell');
        c.dataset.x = x; c.dataset.y = y;
        if (revealed[y][x]) {
          c.classList.add('open');
          if (grid[y][x] === -1) c.textContent = '💥';
          else if (grid[y][x] > 0) { c.textContent = grid[y][x]; c.style.color = colors[grid[y][x]]; }
        } else if (flagged[y][x]) c.textContent = '🚩';
        gridEl.appendChild(c);
      }
      const flagCount = flagged.flat().filter(Boolean).length;
      win.body.querySelector('.ms-mines').textContent = '💣 ' + Math.max(0, MINES - flagCount);
    }
    function checkWin() {
      let unrevealed = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!revealed[y][x]) unrevealed++;
      if (unrevealed === MINES) { over = true; clearInterval(timer); const secs = Math.max(1, Math.round((Date.now() - t0) / 1000)); status.textContent = '🎉 You win! ' + secs + 's'; Achievements.unlock('minesweeper'); if (level === 'expert') Achievements.unlock('sweeper-expert'); const b = Store.get('win11.mines.best', {}); if (!b[level] || secs < b[level]) { b[level] = secs; Store.set('win11.mines.best', b); Shell.toast('Minesweeper', 'New best time on ' + level + ': ' + secs + 's', '🏅'); } best(); }
    }
    gridEl.addEventListener('click', e => {
      const c = e.target.closest('.mine-cell');
      if (!c || over) return;
      const x = +c.dataset.x, y = +c.dataset.y;
      if (flagged[y][x]) return;
      if (firstClick) { placeMines(x, y); firstClick = false; t0 = Date.now(); timer = setInterval(() => { timeEl.textContent = '⏱ ' + Math.floor((Date.now() - t0) / 1000); }, 500); }
      if (grid[y][x] === -1) {
        over = true; clearInterval(timer);
        for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (grid[yy][xx] === -1) revealed[yy][xx] = true;
        status.textContent = '💥 Boom! Game over.';
      } else { reveal(x, y); checkWin(); }
      draw();
    });
    gridEl.addEventListener('contextmenu', e => {
      e.preventDefault();
      const c = e.target.closest('.mine-cell');
      if (!c || over) return;
      const x = +c.dataset.x, y = +c.dataset.y;
      if (!revealed[y][x]) { flagged[y][x] = !flagged[y][x]; draw(); }
    });
    win.body.querySelector('.ms-new').addEventListener('click', reset);
    win.body.querySelector('.ms-level').addEventListener('change', e => { level = e.target.value; Store.set('win11.mines.level', level); reset(); });
    win.onClose(() => clearInterval(timer));
    reset();
  }
});

/* Snake */
Apps.register({
  id: 'snake', name: 'Snake', icon: '🐍', color: 'linear-gradient(135deg,#56ab2f,#2c5e1a)',
  category: 'Games', store: true, width: 460, height: 560,
  desc: 'Eat the apples, grow long, do not bite yourself. Arrow keys or WASD.', rating: 4.6, size: '1.4 MB',
  mount(win) {
    win.body.innerHTML = `
      <div class="game-center">
        <div class="game-hud"><span class="sn-score">Score: 0</span><span class="sn-hi"></span><button class="fluent-btn subtle sn-new">Restart</button></div>
        <canvas class="snake-board" width="400" height="400"></canvas>
        <div style="font-size:12px;color:var(--text-2)">Arrow keys / WASD to steer • click the board first</div>
      </div>`;
    const cv = win.body.querySelector('canvas'), ctx = cv.getContext('2d');
    cv.tabIndex = 0;
    const CELL = 20, N = 20;
    let snake, dir, nextDir, food, score, dead, timer;
    let hi = +(localStorage.getItem('win11.snake.hi') || 0);
    const hiEl = win.body.querySelector('.sn-hi');
    function reset() {
      snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
      dir = { x: 1, y: 0 }; nextDir = dir;
      score = 0; dead = false;
      dropFood();
      clearInterval(timer);
      timer = setInterval(step, 110);
      cv.focus();
    }
    function dropFood() {
      do { food = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; }
      while (snake.some(s => s.x === food.x && s.y === food.y));
    }
    function step() {
      dir = nextDir;
      const head = { x: (snake[0].x + dir.x + N) % N, y: (snake[0].y + dir.y + N) % N };
      if (snake.some(s => s.x === head.x && s.y === head.y)) {
        dead = true; clearInterval(timer);
        if (score > hi) { hi = score; localStorage.setItem('win11.snake.hi', hi); }
        if (score >= 10) Achievements.unlock('snake');
        draw(); return;
      }
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) { score += 10; dropFood(); }
      else snake.pop();
      draw();
    }
    function draw() {
      ctx.fillStyle = '#14290f'; ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath(); ctx.arc(food.x * CELL + 10, food.y * CELL + 10, 8, 0, 7); ctx.fill();
      snake.forEach((s, i) => {
        ctx.fillStyle = i === 0 ? '#7cff5e' : '#4caf50';
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });
      win.body.querySelector('.sn-score').textContent = 'Score: ' + score;
      hiEl.textContent = 'Best: ' + hi;
      if (dead) {
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, 0, 400, 400);
        ctx.fillStyle = '#fff'; ctx.font = '26px "Segoe UI"'; ctx.textAlign = 'center';
        ctx.fillText('Game over — Restart to try again', 200, 200);
      }
    }
    cv.addEventListener('keydown', e => {
      const map = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
      const m = map[e.key];
      if (m) {
        e.preventDefault();
        if (m[0] !== -dir.x || m[1] !== -dir.y) nextDir = { x: m[0], y: m[1] };
      }
    });
    win.body.querySelector('.sn-new').addEventListener('click', reset);
    win.onClose(() => clearInterval(timer));
    reset();
  }
});

/* 2048 */
Apps.register({
  id: 'game2048', name: '2048', icon: '🔢', color: 'linear-gradient(135deg,#edc22e,#bbada0)',
  category: 'Games', store: true, width: 420, height: 520,
  desc: 'Slide the tiles, merge the numbers, chase the mythical 2048 tile.', rating: 4.7, size: '0.9 MB',
  mount(win) {
    win.body.innerHTML = `
      <div class="game-center" tabindex="0">
        <div class="game-hud"><span class="g-score">Score: 0</span><button class="fluent-btn subtle g-new">New game</button></div>
        <div class="g2048-board"></div>
        <div style="font-size:12px;color:var(--text-2)">Arrow keys to slide • click here first</div>
      </div>`;
    const wrap = win.body.querySelector('.game-center');
    const board = win.body.querySelector('.g2048-board');
    let g, score;
    const tileColors = { 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
    function reset() { g = Array.from({ length: 4 }, () => [0, 0, 0, 0]); score = 0; add(); add(); draw(); wrap.focus(); }
    function add() {
      const empty = [];
      g.forEach((row, y) => row.forEach((v, x) => { if (!v) empty.push([x, y]); }));
      if (!empty.length) return;
      const [x, y] = empty[Math.floor(Math.random() * empty.length)];
      g[y][x] = Math.random() < 0.9 ? 2 : 4;
    }
    function slideRow(row) {
      let arr = row.filter(v => v);
      for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i + 1]) { arr[i] *= 2; score += arr[i]; arr.splice(i + 1, 1); }
      }
      while (arr.length < 4) arr.push(0);
      return arr;
    }
    function move(dx, dy) {
      const before = JSON.stringify(g);
      if (dx) {
        g = g.map(row => dx < 0 ? slideRow(row) : slideRow(row.slice().reverse()).reverse());
      } else {
        for (let x = 0; x < 4; x++) {
          let col = [g[0][x], g[1][x], g[2][x], g[3][x]];
          col = dy < 0 ? slideRow(col) : slideRow(col.slice().reverse()).reverse();
          for (let y = 0; y < 4; y++) g[y][x] = col[y];
        }
      }
      if (JSON.stringify(g) !== before) { add(); draw(); if (g.flat().some(v => v >= 512)) Achievements.unlock('2048'); }
    }
    function draw() {
      board.innerHTML = g.flat().map(v =>
        `<div class="g2048-cell" style="${v ? `background:${tileColors[v] || '#3c3a32'};color:${v > 4 ? '#f9f6f2' : '#776e65'};font-size:${v > 512 ? 20 : 26}px` : ''}">${v || ''}</div>`).join('');
      win.body.querySelector('.g-score').textContent = 'Score: ' + score;
    }
    wrap.addEventListener('keydown', e => {
      const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (map[e.key]) { e.preventDefault(); move(...map[e.key]); }
    });
    win.body.querySelector('.g-new').addEventListener('click', reset);
    reset();
  }
});

/* Tic-Tac-Toe */
Apps.register({
  id: 'tictactoe', name: 'Tic-Tac-Toe', icon: '⭕', color: 'linear-gradient(135deg,#e96443,#904e95)',
  category: 'Games', store: true, width: 380, height: 480,
  desc: 'You are X, the computer is O. It plays a mean game — can you force a draw?', rating: 4.3, size: '0.5 MB',
  mount(win) {
    win.body.innerHTML = `
      <div class="game-center">
        <div class="game-hud"><span class="t-status">Your move (X)</span><button class="fluent-btn subtle t-new">Restart</button></div>
        <div class="ttt-board"></div>
      </div>`;
    const board = win.body.querySelector('.ttt-board');
    const status = win.body.querySelector('.t-status');
    let cells, over;
    const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    function winner(c) {
      for (const [a, b, d] of LINES) if (c[a] && c[a] === c[b] && c[a] === c[d]) return c[a];
      return c.every(Boolean) ? 'draw' : null;
    }
    function minimax(c, player) {
      const w = winner(c);
      if (w === 'O') return { score: 1 };
      if (w === 'X') return { score: -1 };
      if (w === 'draw') return { score: 0 };
      let best = null;
      for (let i = 0; i < 9; i++) {
        if (c[i]) continue;
        c[i] = player;
        const r = minimax(c, player === 'O' ? 'X' : 'O');
        c[i] = null;
        if (!best || (player === 'O' ? r.score > best.score : r.score < best.score)) best = { score: r.score, move: i };
      }
      return best;
    }
    function draw() {
      board.innerHTML = cells.map((v, i) => `<button class="ttt-cell" data-i="${i}" style="color:${v === 'X' ? 'var(--accent)' : '#e96443'}">${v || ''}</button>`).join('');
    }
    function end(w) {
      over = true;
      status.textContent = w === 'draw' ? '🤝 Draw!' : w === 'X' ? '🎉 You win!' : '🤖 Computer wins!';
      if (w === 'draw') Achievements.unlock('tictactoe');
    }
    board.addEventListener('click', e => {
      const b = e.target.closest('.ttt-cell');
      if (!b || over || cells[+b.dataset.i]) return;
      cells[+b.dataset.i] = 'X';
      let w = winner(cells);
      if (w) { draw(); end(w); return; }
      status.textContent = 'Computer thinking…';
      draw();
      setTimeout(() => {
        const m = minimax(cells.slice(), 'O');
        if (m && m.move !== undefined) cells[m.move] = 'O';
        w = winner(cells);
        draw();
        if (w) end(w); else status.textContent = 'Your move (X)';
      }, 350);
    });
    function reset() { cells = Array(9).fill(null); over = false; status.textContent = 'Your move (X)'; draw(); }
    win.body.querySelector('.t-new').addEventListener('click', reset);
    reset();
  }
});

/* Sticky Notes */
Apps.register({
  id: 'stickynotes', name: 'Sticky Notes', icon: '🗒️', color: 'linear-gradient(135deg,#ffe259,#ffa751)',
  category: 'Productivity', store: true, width: 320, height: 340,
  desc: 'A little yellow square of memory. Auto-saves as you type.', rating: 4.5, size: '0.3 MB',
  mount(win) {
    win.body.innerHTML = `<textarea class="sticky-note-area" placeholder="Take a note…" spellcheck="false"></textarea>`;
    const area = win.body.querySelector('textarea');
    area.value = localStorage.getItem('win11.sticky') || '';
    area.addEventListener('input', () => {
      try { localStorage.setItem('win11.sticky', area.value); } catch (e) {}
    });
  }
});

/* Weather */
Apps.register({
  id: 'weather', name: 'MSN Weather', icon: '🌤️', color: 'linear-gradient(135deg,#4facfe,#00c6fb)',
  category: 'Utilities', store: true, width: 640, height: 560, singleton: true,
  desc: 'A real 7-day forecast from Open-Meteo for any city on Earth, or your location. Falls back to a lovingly fabricated Webville forecast when offline.', rating: 4.6, size: '3.2 MB',
  mount(win) {
    win.body.innerHTML = `<div class="weather-root"><div class="w-bar"><input class="w-search" placeholder="Search city…" spellcheck="false"><button class="w-loc" title="Use my location">📍</button><button class="w-unit" title="Toggle °F / °C">°${Weather.unit()}</button><button class="w-refresh" title="Refresh">⟳</button></div><div class="w-results"></div><div class="w-body"><div class="placeholder-pane" style="color:#fff"><div class="ph-ico">🌤️</div>Loading forecast…</div></div></div>`;
    const $ = s => win.body.querySelector(s);
    function draw(d) {
      if (!win.body.isConnected) return;
      const now = Weather.desc(d.now.code);
      $('.w-body').innerHTML = `
        <h1>📍 ${Utils.esc(d.loc)}</h1>
        <div class="weather-now"><div class="w-ico">${now[0]}</div><div><div class="w-temp">${Weather.fmt(d.now.temp)}${Weather.unit()}</div><div>${now[1]}${d.now.feels !== undefined ? ' • Feels like ' + Weather.fmt(d.now.feels) : ''} • Wind ${Math.round(d.now.wind)} mph • Humidity ${Math.round(d.now.humidity)}%</div></div></div>
        <div class="weather-days">${d.days.map((x, i) => { const k = Weather.desc(x.code); return `<div class="weather-day"><div>${i === 0 ? 'Today' : x.date.toLocaleDateString([], { weekday: 'short' })}</div><div class="wd-ico">${k[0]}</div><div><b>${Weather.fmt(x.hi)}</b> / ${Weather.fmt(x.lo)}</div><div style="font-size:11px;opacity:.85">${k[1]}</div></div>`; }).join('')}</div>
        <p style="margin-top:22px;font-size:12px;opacity:.75">${d.fake ? 'Offline or blocked — showing the deterministic Webville forecast. Real data returns when the network does.' : 'Live data from Open-Meteo.com • updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>`;
    }
    const load = force => Weather.fetch(force).then(draw);
    let searchT;
    $('.w-search').addEventListener('input', e => {
      clearTimeout(searchT);
      const q = e.target.value.trim();
      if (q.length < 2) { $('.w-results').innerHTML = ''; return; }
      searchT = setTimeout(() => Weather.search(q).then(list => { $('.w-results').innerHTML = list.map((l, i) => `<div class="w-result" data-i="${i}">${Utils.esc(l.name)}</div>`).join('') || '<div class="w-result">No matches</div>'; $('.w-results')._list = list; }).catch(() => { $('.w-results').innerHTML = '<div class="w-result">Search unavailable offline</div>'; }), 350);
    });
    $('.w-results').addEventListener('click', e => { const r = e.target.closest('[data-i]'); if (!r) return; const l = $('.w-results')._list[+r.dataset.i]; $('.w-results').innerHTML = ''; $('.w-search').value = ''; Settings.set('weatherLoc', l); load(true); });
    $('.w-loc').addEventListener('click', () => Weather.useMyLocation().then(() => load(true)).catch(() => Shell.toast('MSN Weather', 'Couldn\'t get your location (permission denied or unavailable).', '📍')));
    $('.w-unit').addEventListener('click', () => { Settings.set('weatherUnit', Weather.unit() === 'F' ? 'C' : 'F'); $('.w-unit').textContent = '°' + Weather.unit(); load(true); });
    $('.w-refresh').addEventListener('click', () => load(true));
    win.on('weather:changed', d => { if (win.body.isConnected) draw(d); });
    load(false);
  }
});

/* Clock */
Apps.register({
  id: 'clock', name: 'Clock', icon: '⏰', color: 'linear-gradient(135deg,#a18cd1,#5b48a2)',
  category: 'Utilities', store: true, width: 460, height: 500, singleton: true,
  desc: 'Clock, stopwatch, timers and alarms. Timers and alarms keep running after you close the app, and ring with a toast and a chime.', rating: 4.6, size: '1.0 MB',
  mount(win) {
    let tab = 'clock';
    win.body.innerHTML = `<div class="clock-root"><div class="clk-tabs">${[['clock', '🕒 Clock'], ['stopwatch', '⏱ Stopwatch'], ['timer', '⏲ Timer'], ['alarm', '⏰ Alarm']].map(([id, n]) => `<button data-t="${id}" class="${id === tab ? 'sel' : ''}">${n}</button>`).join('')}</div><div class="clk-body"></div></div>`;
    const body = win.body.querySelector('.clk-body');
    let swRunning = false, swAcc = 0, swStart = 0, laps = [];
    function render() {
      win.body.querySelectorAll('.clk-tabs button').forEach(b => b.classList.toggle('sel', b.dataset.t === tab));
      if (tab === 'clock') body.innerHTML = `<div class="clock-time"></div><div class="clock-date"></div><div class="clk-zones">${[['Local', 0], ['UTC', 'UTC'], ['New York', 'America/New_York'], ['London', 'Europe/London'], ['Tokyo', 'Asia/Tokyo'], ['Sydney', 'Australia/Sydney']].map(([n, z]) => `<div class="clk-zone"><span>${n}</span><b data-z="${z}"></b></div>`).join('')}</div>`;
      else if (tab === 'stopwatch') body.innerHTML = `<div class="clock-sw">0:00.0</div><div style="display:flex;gap:8px"><button class="fluent-btn sw-start">${swRunning ? 'Pause' : 'Start'}</button><button class="fluent-btn subtle sw-lap">Lap</button><button class="fluent-btn subtle sw-reset">Reset</button></div><div class="clk-laps">${laps.map((l, i) => `<div>Lap ${i + 1}: ${l}</div>`).join('')}</div>`;
      else if (tab === 'timer') body.innerHTML = `<div class="clk-presets">${[1, 3, 5, 10, 15, 25].map(m => `<button class="fluent-btn subtle" data-min="${m}">${m} min</button>`).join('')}</div><div style="display:flex;gap:8px;align-items:center"><input class="fluent-input tm-custom" placeholder="e.g. 90s, 2m 30s, 1h" style="flex:1"><button class="fluent-btn tm-add">Start</button></div><div class="clk-list tm-list"></div>`;
      else body.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><input type="time" class="fluent-input al-time" value="07:30"><input class="fluent-input al-label" placeholder="Label (optional)" style="flex:1"><button class="fluent-btn al-add">Add</button></div><div class="clk-list al-list"></div>`;
      wire(); tick();
    }
    function tick() {
      if (!body.isConnected) return;
      const now = new Date();
      if (tab === 'clock') {
        body.querySelector('.clock-time').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
        body.querySelector('.clock-date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        body.querySelectorAll('[data-z]').forEach(z => { try { z.textContent = now.toLocaleTimeString([], z.dataset.z === '0' ? { hour: 'numeric', minute: '2-digit' } : { hour: 'numeric', minute: '2-digit', timeZone: z.dataset.z }); } catch (e) { z.textContent = '—'; } });
      } else if (tab === 'stopwatch') {
        const ms = swAcc + (swRunning ? Date.now() - swStart : 0);
        body.querySelector('.clock-sw').textContent = fmtSw(ms);
      } else if (tab === 'timer') {
        body.querySelector('.tm-list').innerHTML = Timers.list.map(t => { const left = Math.max(0, Math.ceil((t.end - Date.now()) / 1000)); return `<div class="clk-item"><div style="flex:1"><div>${Utils.esc(t.label)}</div><div class="store-progress" style="margin-top:6px"><div style="width:${100 - left / t.total * 100}%"></div></div></div><b>${Utils.fmtTime(left)}</b><button data-cancel="${t.id}" title="Cancel">✕</button></div>`; }).join('') || '<div class="wg-sub" style="padding:10px 0">No timers running. Pick a preset or type a duration.</div>';
      } else if (tab === 'alarm') {
        body.querySelector('.al-list').innerHTML = Timers.alarms().map(a => `<div class="clk-item ${a.on ? '' : 'off'}"><div style="flex:1"><div style="font-size:22px">${a.time}</div><div class="wg-sub">${Utils.esc(a.label)}</div></div><div class="switch ${a.on ? 'on' : ''}" data-toggle="${a.id}"></div><button data-del="${a.id}" title="Delete">🗑️</button></div>`).join('') || '<div class="wg-sub" style="padding:10px 0">No alarms. Add one above; it rings even when this window is closed.</div>';
      }
    }
    const fmtSw = ms => Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') + '.' + Math.floor(ms % 1000 / 100);
    function wire() {
      const $ = s => body.querySelector(s);
      if (tab === 'stopwatch') {
        $('.sw-start').addEventListener('click', e => { if (swRunning) { swAcc += Date.now() - swStart; swRunning = false; e.target.textContent = 'Start'; } else { swStart = Date.now(); swRunning = true; e.target.textContent = 'Pause'; } });
        $('.sw-reset').addEventListener('click', () => { swAcc = 0; swStart = Date.now(); laps = []; render(); });
        $('.sw-lap').addEventListener('click', () => { laps.push(fmtSw(swAcc + (swRunning ? Date.now() - swStart : 0))); render(); });
      } else if (tab === 'timer') {
        body.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', () => { Timers.add(+b.dataset.min * 60, b.dataset.min + ' minute timer'); tick(); }));
        const add = () => { const s = parseDuration($('.tm-custom').value); if (!s) { Shell.toast('Clock', 'Try something like "90s", "2m 30s" or "1h".', '⏲'); return; } Timers.add(s, 'Timer (' + $('.tm-custom').value + ')'); $('.tm-custom').value = ''; tick(); };
        $('.tm-add').addEventListener('click', add); $('.tm-custom').addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
        body.addEventListener('click', e => { const c = e.target.closest('[data-cancel]'); if (c) { Timers.cancel(+c.dataset.cancel); tick(); } });
      } else if (tab === 'alarm') {
        $('.al-add').addEventListener('click', () => { if (!$('.al-time').value) return; Timers.addAlarm($('.al-time').value, $('.al-label').value.trim() || 'Alarm'); $('.al-label').value = ''; tick(); });
        body.addEventListener('click', e => {
          const t = e.target.closest('[data-toggle]'), d = e.target.closest('[data-del]');
          if (t) { const a = Timers.alarms(); const x = a.find(z => z.id === +t.dataset.toggle); if (x) x.on = !x.on; Timers.saveAlarms(a); tick(); }
          if (d) { Timers.saveAlarms(Timers.alarms().filter(z => z.id !== +d.dataset.del)); tick(); }
        });
      }
    }
    win.body.querySelector('.clk-tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.t; render(); } });
    const iv = setInterval(tick, 100);
    win.on('timers:changed', () => { if (body.isConnected) tick(); });
    win.onClose(() => clearInterval(iv));
    render();
  }
});

/* Piano */
Apps.register({
  id: 'piano', name: 'Tiny Piano', icon: '🎹', color: 'linear-gradient(135deg,#434343,#000)',
  category: 'Creativity', store: true, width: 720, height: 340,
  desc: 'A playable two-octave piano. Click the keys or use your keyboard (A–L row).', rating: 4.9, size: '1.8 MB',
  mount(win) {
    const whites = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83];
    const blackAfter = { 60: 61, 62: 63, 65: 66, 67: 68, 69: 70, 72: 73, 74: 75, 77: 78, 79: 80, 81: 82 };
    const keyMap = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74, p: 75 };
    win.body.innerHTML = `<div class="piano-keys" tabindex="0"></div>`;
    const wrap = win.body.querySelector('.piano-keys');
    const names = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    whites.forEach((midi, i) => {
      const k = Utils.el('div', 'piano-white');
      k.dataset.midi = midi;
      k.innerHTML = `<span>${names[i % 7]}</span>`;
      if (blackAfter[midi]) {
        const b = Utils.el('div', 'piano-black');
        b.dataset.midi = blackAfter[midi];
        k.appendChild(b);
      }
      wrap.appendChild(k);
    });
    const play = midi => Synth.note(midi, 1.1, 'triangle');
    wrap.addEventListener('pointerdown', e => {
      const k = e.target.closest('[data-midi]');
      if (k) { e.stopPropagation(); play(+k.dataset.midi); }
      wrap.focus();
    });
    wrap.addEventListener('keydown', e => {
      if (e.repeat) return;
      const midi = keyMap[e.key.toLowerCase()];
      if (midi) {
        play(midi);
        const el = wrap.querySelector(`[data-midi="${midi}"]`);
        if (el) { el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 180); }
      }
    });
    setTimeout(() => wrap.focus(), 100);
  }
});

/* Microsoft To Do */
Apps.register({
  id: 'todo', name: 'Microsoft To Do', icon: '✅', color: 'linear-gradient(135deg,#6a8dff,#2557d6)',
  category: 'Productivity', store: true, width: 460, height: 540,
  desc: 'Tasks that sync to absolutely nowhere but your browser. Satisfying checkboxes included.', rating: 4.2, size: '2.6 MB',
  mount(win) {
    let items;
    try { items = JSON.parse(localStorage.getItem('win11.todo') || 'null') || []; }
    catch (e) { items = []; }
    if (!items.length) items = [{ text: 'Try out Windows 11 Web', done: true }, { text: 'Install some apps from the Store', done: false }];
    win.body.innerHTML = `
      <div class="app-toolbar">
        <input class="fluent-input" style="flex:1" placeholder="Add a task and press Enter" spellcheck="false">
      </div>
      <div class="todo-list"></div>`;
    const list = win.body.querySelector('.todo-list');
    const input = win.body.querySelector('input');
    function persist() { try { localStorage.setItem('win11.todo', JSON.stringify(items)); } catch (e) {} }
    function render() {
      list.innerHTML = items.map((it, i) => `
        <div class="todo-item ${it.done ? 'done' : ''}" data-i="${i}">
          <input type="checkbox" ${it.done ? 'checked' : ''}>
          <span class="todo-text">${Utils.esc(it.text)}</span>
          <button title="Delete">🗑️</button>
        </div>`).join('') || '<div class="placeholder-pane"><div class="ph-ico">🌤️</div>All caught up!</div>';
    }
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) {
        items.unshift({ text: input.value.trim(), done: false });
        input.value = ''; persist(); render();
      }
    });
    list.addEventListener('click', e => {
      const row = e.target.closest('.todo-item');
      if (!row) return;
      const i = +row.dataset.i;
      if (e.target.matches('input[type=checkbox]')) { items[i].done = e.target.checked; }
      else if (e.target.matches('button')) { items.splice(i, 1); }
      else return;
      persist(); render();
    });
    render();
  }
});

/* ---------- Microsoft Store ---------- */
Apps.register({
  id: 'store', name: 'Microsoft Store', icon: '🛍️', color: 'linear-gradient(135deg,#3dd5f3,#0f6cbd)',
  category: 'System', width: 940, height: 620, singleton: true,
  mount(win) {
    let cat = 'home', query = '';
    const downloading = {}; // id -> progress 0..100
    const REVIEWERS = ['Ada L.', 'Grace H.', 'Linus T.', 'Margaret H.', 'Dennis R.', 'Clippy', 'Neko', 'A Very Real User', 'xX_Gamer_Xx', 'The Boss', 'IT Helpdesk', 'Seefood'];
    const BLURBS = { 5: ['Exactly what it says on the tin. Five stars.', 'Installed in seconds, no account, no nonsense.', 'My productivity has never been more simulated.', 'Would install again. Did, actually, three times.', 'It just works. Suspicious, but happy.'], 4: ['Great, but I wish it synced to my other browser tab.', 'Solid. Lost a star because Clippy commented on it.', 'Very good. The cat sat on the keyboard mid-game though.', 'Does the thing. Needs dark mode for my dark mood.'], 3: ['It\'s fine. It\'s a browser tab. What did I expect.', 'Works as advertised, and I\'m not sure what I was advertised.'], 2: ['Crashed my PC. (I typed bsod in the terminal.)', 'Uninstalled because I had achievements to earn elsewhere.'], 1: ['Not a real app. Zero stars would be more honest. Still using it daily.'] };
    const hash = s => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
    function reviewsFor(a) { const rnd = Utils.rng(hash(a.id)); const n = 4 + Math.floor(rnd() * 4); return Array.from({ length: n }, (_, i) => { const stars = Math.max(1, Math.min(5, Math.round((a.rating || 4) + (rnd() - .5) * 2.4))); const pool = BLURBS[stars] || BLURBS[4]; return { who: REVIEWERS[Math.floor(rnd() * REVIEWERS.length)], stars, text: pool[Math.floor(rnd() * pool.length)], when: Math.floor(rnd() * 200) + 1 }; }); }
    win.body.innerHTML = `
      <div class="store-root">
        <div class="store-side">
          <button data-c="home" class="sel">🏠<span>Home</span></button>
          <button data-c="Games">🎮<span>Games</span></button>
          <button data-c="Productivity">📈<span>Work</span></button>
          <button data-c="Utilities">🧰<span>Utility</span></button>
          <button data-c="Creativity">🎨<span>Create</span></button>
          <button data-c="library">📚<span>Library</span></button>
        </div>
        <div class="store-main"><div class="store-search"><input placeholder="Search apps, games, and more" spellcheck="false"></div><div class="store-content"></div></div>
      </div>`;
    const content = win.body.querySelector('.store-content');
    const storeApps = () => Apps.all().filter(a => a.store);

    function cardHTML(a) {
      const installed = (Settings.get('installedApps') || []).includes(a.id);
      const dl = downloading[a.id];
      let btn;
      if (dl !== undefined) btn = `<div class="store-progress"><div style="width:${dl}%"></div></div><div style="font-size:11px;color:var(--text-2)">Downloading… ${dl}%</div>`;
      else if (installed) btn = `<div style="display:flex;gap:8px"><button class="fluent-btn" data-open="${a.id}">Open</button><button class="fluent-btn subtle" data-uninstall="${a.id}">Uninstall</button></div>`;
      else btn = `<button class="fluent-btn" data-install="${a.id}">Get</button>`;
      return `
        <div class="store-card" data-app="${a.id}">
          <div class="sc-head">${appTileHTML(a)}<div><div class="sc-name">${a.name}</div><div class="sc-meta">${a.category} • ${a.size || '1 MB'} • Free</div><div class="sc-rating">${'★'.repeat(Math.round(a.rating || 4))}${'☆'.repeat(5 - Math.round(a.rating || 4))} ${a.rating || 4}</div></div></div>
          <div class="sc-desc">${a.desc || ''}</div>
          ${btn}<button class="sc-reviews" data-reviews="${a.id}">Ratings & reviews ›</button>
        </div>`;
    }
    function render() {
      win.body.querySelectorAll('.store-side button').forEach(b => b.classList.toggle('sel', b.dataset.c === cat));
      let apps = storeApps(), head = '';
      if (query) {
        apps = apps.filter(a => (a.name + ' ' + (a.desc || '') + ' ' + a.category).toLowerCase().includes(query));
        head = `<h1 style="font-size:22px;margin-bottom:16px">Results for "${Utils.esc(query)}"</h1>` + (apps.length ? '' : '<p style="color:var(--text-2)">Nothing matched. Try "game", "music" or "cat".</p>');
      } else if (cat === 'home') {
        head = `<div class="store-hero"><h1>Microsoft Store</h1><p>Free apps and games that install right into this browser tab — they show up in your Start menu, and they actually run. No account, no credit card, no 37&nbsp;GB updates.</p></div>`;
      } else if (cat === 'library') {
        apps = apps.filter(a => (Settings.get('installedApps') || []).includes(a.id));
        head = `<h1 style="font-size:22px;margin-bottom:16px">Your library</h1>` + (apps.length ? '' : `<p style="color:var(--text-2)">Nothing installed yet — grab something from Home!</p>`);
      } else {
        apps = apps.filter(a => a.category === cat);
        head = `<h1 style="font-size:22px;margin-bottom:16px">${cat}</h1>`;
      }
      content.innerHTML = head + `<div class="store-grid">${apps.map(cardHTML).join('')}</div>`;
    }
    win.body.querySelector('.store-side').addEventListener('click', e => {
      const b = e.target.closest('button');
      if (b) { cat = b.dataset.c; query = ''; win.body.querySelector('.store-search input').value = ''; render(); }
    });
    win.body.querySelector('.store-search input').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); render(); });
    function showReviews(a) {
      const revs = reviewsFor(a);
      const avg = (revs.reduce((s, r) => s + r.stars, 0) / revs.length).toFixed(1);
      const counts = [5, 4, 3, 2, 1].map(s => revs.filter(r => r.stars === s).length);
      const dlg = Utils.el('div', 'store-dlg');
      dlg.innerHTML = `<div class="store-dlg-card"><div class="sc-head">${appTileHTML(a)}<div><div class="sc-name">${a.name}</div><div class="sc-meta">${revs.length} ratings • ${avg} ★ average</div></div><button class="store-dlg-x">✕</button></div>
        <div class="store-bars">${counts.map((c, i) => `<div class="store-bar"><span>${5 - i}★</span><div><div style="width:${c / revs.length * 100}%"></div></div><span>${c}</span></div>`).join('')}</div>
        <div class="store-revs">${revs.map(r => `<div class="store-rev"><div class="store-rev-h"><b>${Utils.esc(r.who)}</b><span>${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</span><small>${r.when} day${r.when === 1 ? '' : 's'} ago</small></div><div>${Utils.esc(r.text)}</div></div>`).join('')}</div>
        <div class="oc-btns"><input class="fluent-input store-rev-in" placeholder="Write a review (it will be ignored with great care)" style="flex:1"><button class="fluent-btn store-rev-add">Post</button></div></div>`;
      win.body.querySelector('.store-root').appendChild(dlg);
      dlg.querySelector('.store-dlg-x').addEventListener('click', () => dlg.remove());
      dlg.addEventListener('click', e => { if (e.target === dlg) dlg.remove(); });
      dlg.querySelector('.store-rev-add').addEventListener('click', () => { const t = dlg.querySelector('.store-rev-in').value.trim(); if (!t) return; dlg.querySelector('.store-revs').insertAdjacentHTML('afterbegin', `<div class="store-rev"><div class="store-rev-h"><b>${Utils.esc(Settings.get('userName') || 'You')}</b><span>★★★★★</span><small>just now</small></div><div>${Utils.esc(t)}</div></div>`); dlg.querySelector('.store-rev-in').value = ''; Shell.toast('Microsoft Store', 'Thanks for your review! It has been filed under "reviews".', '🛍️'); });
    }
    content.addEventListener('click', e => {
      const inst = e.target.closest('[data-install]');
      const open = e.target.closest('[data-open]');
      const unin = e.target.closest('[data-uninstall]');
      const rev = e.target.closest('[data-reviews]');
      if (rev) { showReviews(Apps.get(rev.dataset.reviews)); return; }
      if (inst) {
        const id = inst.dataset.install;
        downloading[id] = 0;
        render();
        const app = Apps.get(id);
        const timer = setInterval(() => {
          downloading[id] += 7 + Math.floor(Math.random() * 16);
          if (downloading[id] >= 100) {
            clearInterval(timer);
            delete downloading[id];
            Apps.install(id);
            Shell.toast('Microsoft Store', app.name + ' is installed — find it in the Start menu.', '🛍️');
          }
          if (win.body.isConnected) render();
        }, 220);
      } else if (open) {
        Apps.launch(open.dataset.open);
      } else if (unin) {
        Apps.uninstall(unin.dataset.uninstall);
        Shell.toast('Microsoft Store', Apps.get(unin.dataset.uninstall).name + ' was uninstalled.', '🛍️');
        render();
      }
    });
    win.on('apps:changed', () => { if (win.body.isConnected) render(); });
    render();
  }
});
