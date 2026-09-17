/* ============ Windows 11 Web — Microsoft Store + downloadable apps ============ */
'use strict';

/* ---------- Store apps (store: true → only usable after install) ---------- */

/* Minesweeper */
Apps.register({
  id: 'minesweeper', name: 'Minesweeper', icon: '💣', color: 'linear-gradient(135deg,#4b79cf,#283e6b)',
  category: 'Games', store: true, width: 420, height: 520,
  desc: 'The classic. Clear the board without detonating a mine. Right-click to flag.', rating: 4.8, size: '2.1 MB',
  mount(win) {
    const W = 9, H = 9, MINES = 10;
    let grid, revealed, flagged, over, firstClick;
    win.body.innerHTML = `
      <div class="game-center">
        <div class="game-hud"><span class="ms-mines">💣 ${MINES}</span><button class="fluent-btn subtle ms-new">🙂 New game</button><span class="ms-status"></span></div>
        <div class="mine-grid" style="grid-template-columns:repeat(${W},30px)"></div>
      </div>`;
    const gridEl = win.body.querySelector('.mine-grid');
    const status = win.body.querySelector('.ms-status');
    function reset() {
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
      if (unrevealed === MINES) { over = true; status.textContent = '🎉 You win!'; Achievements.unlock('minesweeper'); }
    }
    gridEl.addEventListener('click', e => {
      const c = e.target.closest('.mine-cell');
      if (!c || over) return;
      const x = +c.dataset.x, y = +c.dataset.y;
      if (flagged[y][x]) return;
      if (firstClick) { placeMines(x, y); firstClick = false; }
      if (grid[y][x] === -1) {
        over = true;
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
  category: 'Utilities', store: true, width: 620, height: 520,
  desc: 'A 7-day forecast for Webville. Deterministically generated from the date — meteorology, but honest about it.', rating: 4.1, size: '3.2 MB',
  mount(win) {
    const kinds = [['☀️', 'Sunny'], ['🌤️', 'Mostly sunny'], ['⛅', 'Partly cloudy'], ['🌥️', 'Cloudy'], ['🌧️', 'Rain showers'], ['⛈️', 'Thunderstorms'], ['🌫️', 'Foggy']];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const rnd = Utils.rng(today.getFullYear() * 400 + today.getMonth() * 31 + today.getDate());
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const k = kinds[Math.floor(rnd() * kinds.length)];
      const hi = Math.round(62 + rnd() * 28), lo = hi - Math.round(8 + rnd() * 10);
      return { day: i === 0 ? 'Today' : days[d.getDay()], ico: k[0], desc: k[1], hi, lo };
    });
    win.body.innerHTML = `
      <div class="weather-root">
        <h1>📍 Webville, Internet</h1>
        <div class="weather-now">
          <div class="w-ico">${week[0].ico}</div>
          <div><div class="w-temp">${week[0].hi}°F</div><div>${week[0].desc} • Low ${week[0].lo}°</div></div>
        </div>
        <div class="weather-days">
          ${week.map(w => `<div class="weather-day"><div>${w.day}</div><div class="wd-ico">${w.ico}</div><div><b>${w.hi}°</b> / ${w.lo}°</div><div style="font-size:11px;opacity:.85">${w.desc}</div></div>`).join('')}
        </div>
        <p style="margin-top:22px;font-size:12px;opacity:.75">Forecast generated locally — 100% accurate for Webville, results may vary elsewhere.</p>
      </div>`;
  }
});

/* Clock */
Apps.register({
  id: 'clock', name: 'Clock', icon: '⏰', color: 'linear-gradient(135deg,#a18cd1,#5b48a2)',
  category: 'Utilities', store: true, width: 420, height: 440,
  desc: 'Clock and stopwatch. Time flies when you are simulating an OS.', rating: 4.4, size: '1.0 MB',
  mount(win) {
    win.body.innerHTML = `
      <div class="clock-root">
        <div class="clock-time"></div>
        <div class="clock-date"></div>
        <div class="clock-sw">0:00.0</div>
        <div style="display:flex;gap:8px">
          <button class="fluent-btn sw-start">Start</button>
          <button class="fluent-btn subtle sw-reset">Reset</button>
        </div>
      </div>`;
    const timeEl = win.body.querySelector('.clock-time');
    const dateEl = win.body.querySelector('.clock-date');
    const swEl = win.body.querySelector('.clock-sw');
    let swRunning = false, swAcc = 0, swStart = 0;
    const tick = setInterval(() => {
      const now = new Date();
      timeEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
      dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const ms = swAcc + (swRunning ? Date.now() - swStart : 0);
      swEl.textContent = Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') + '.' + Math.floor(ms % 1000 / 100);
    }, 100);
    win.body.querySelector('.sw-start').addEventListener('click', e => {
      if (swRunning) { swAcc += Date.now() - swStart; swRunning = false; e.target.textContent = 'Start'; }
      else { swStart = Date.now(); swRunning = true; e.target.textContent = 'Pause'; }
    });
    win.body.querySelector('.sw-reset').addEventListener('click', () => { swAcc = 0; swStart = Date.now(); });
    win.onClose(() => clearInterval(tick));
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
    let cat = 'home';
    const downloading = {}; // id -> progress 0..100
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
        <div class="store-content"></div>
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
          ${btn}`;
    }
    function render() {
      win.body.querySelectorAll('.store-side button').forEach(b => b.classList.toggle('sel', b.dataset.c === cat));
      let apps = storeApps(), head = '';
      if (cat === 'home') {
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
      if (b) { cat = b.dataset.c; render(); }
    });
    content.addEventListener('click', e => {
      const inst = e.target.closest('[data-install]');
      const open = e.target.closest('[data-open]');
      const unin = e.target.closest('[data-uninstall]');
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
    Bus.on('apps:changed', () => { if (win.body.isConnected) render(); });
    render();
  }
});
