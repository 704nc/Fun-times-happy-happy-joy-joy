/* ============ Windows 11 Web — live: real weather (Open-Meteo), Chess, first-run setup (OOBE),
   Copilot voice, Wi-Fi / Bluetooth panels, real battery, clipboard history, network fakes ============ */
'use strict';

Achievements.list.push(
  { id: 'chess', name: 'Grandmaster (of a browser tab)', desc: 'Beat the computer at Chess.', icon: '♛', pts: 40 },
  { id: 'chess-first', name: 'Opening Move', desc: 'Played a game of Chess.', icon: '♟️', pts: 10 },
  { id: 'meteorologist', name: 'Meteorologist', desc: 'Checked the real weather.', icon: '🌦️', pts: 10 },
  { id: 'voice', name: 'Hey, Copilot', desc: 'Talked to Copilot with your voice.', icon: '🎤', pts: 15 },
  { id: 'clipboard', name: 'Copy That', desc: 'Used clipboard history (Win+V).', icon: '📋', pts: 5 },
  { id: 'oobe', name: 'Out of the Box', desc: 'Completed first-time setup.', icon: '📦', pts: 5 }
);

/* ---------- Weather service (Open-Meteo, no key, CORS-friendly) ---------- */
const Weather = {
  WMO: { 0: ['☀️', 'Clear'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'], 45: ['🌫️', 'Fog'], 48: ['🌫️', 'Icy fog'], 51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌧️', 'Heavy drizzle'], 56: ['🌧️', 'Freezing drizzle'], 57: ['🌧️', 'Freezing drizzle'], 61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'], 66: ['🌧️', 'Freezing rain'], 67: ['🌧️', 'Freezing rain'], 71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'], 77: ['🌨️', 'Snow grains'], 80: ['🌦️', 'Showers'], 81: ['🌧️', 'Showers'], 82: ['⛈️', 'Violent showers'], 85: ['🌨️', 'Snow showers'], 86: ['❄️', 'Snow showers'], 95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm, hail'], 99: ['⛈️', 'Thunderstorm, hail'] },
  DEFAULT: { name: 'Redmond, WA', lat: 47.674, lon: -122.121 },
  _cache: null,
  loc() { return Settings.get('weatherLoc') || this.DEFAULT; },
  unit() { return Settings.get('weatherUnit') || 'F'; },
  fmt(t) { return Math.round(t) + '°'; },
  desc(code) { return this.WMO[code] || ['🌡️', 'Weather']; },
  snapshot() { return this._cache && this._cache.data; },
  fake() {
    const today = new Date();
    const rnd = Utils.rng(today.getFullYear() * 400 + today.getMonth() * 31 + today.getDate());
    const codes = [0, 1, 2, 3, 61, 80, 95, 45];
    const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() + i); const hi = 62 + rnd() * 28; return { date: d, code: codes[Math.floor(rnd() * codes.length)], hi, lo: hi - 8 - rnd() * 10 }; });
    return { fake: true, loc: 'Webville, Internet', now: { temp: days[0].hi - 3, code: days[0].code, wind: 5 + rnd() * 10, humidity: 40 + rnd() * 40 }, days };
  },
  async fetch(force) {
    const loc = this.loc();
    const key = loc.lat + ',' + loc.lon + this.unit();
    if (!this._cache) this._cache = Store.get('win11.weather.cache', null);
    if (!force && this._cache && this._cache.key === key && Date.now() - this._cache.t < 30 * 60000) return this._cache.data;
    if (!navigator.onLine) return this._cache && this._cache.data || this.fake();
    try {
      const u = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=${this.unit() === 'C' ? 'celsius' : 'fahrenheit'}&wind_speed_unit=mph&timezone=auto&forecast_days=7`;
      const r = await fetch(u, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      const data = {
        fake: false, loc: loc.name,
        now: { temp: j.current.temperature_2m, feels: j.current.apparent_temperature, code: j.current.weather_code, wind: j.current.wind_speed_10m, humidity: j.current.relative_humidity_2m },
        days: j.daily.time.map((d, i) => ({ date: new Date(d + 'T12:00:00'), code: j.daily.weather_code[i], hi: j.daily.temperature_2m_max[i], lo: j.daily.temperature_2m_min[i] }))
      };
      this._cache = { key, t: Date.now(), data };
      Store.set('win11.weather.cache', this._cache);
      Achievements.unlock('meteorologist');
      Bus.emit('weather:changed', data);
      return data;
    } catch (e) {
      return this._cache && this._cache.data || this.fake();
    }
  },
  async search(q) {
    const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=6&language=en&format=json');
    const j = await r.json();
    return (j.results || []).map(x => ({ name: x.name + (x.admin1 ? ', ' + x.admin1 : '') + (x.country_code ? ' (' + x.country_code + ')' : ''), lat: x.latitude, lon: x.longitude }));
  },
  useMyLocation() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error('No geolocation'));
      navigator.geolocation.getCurrentPosition(p => { Settings.set('weatherLoc', { name: 'My location', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3) }); res(); }, e => rej(e), { timeout: 8000 });
    });
  },
  applyTaskbar(data) {
    const el = document.getElementById('tb-weather');
    if (el && data) el.textContent = this.desc(data.now.code)[0] + ' ' + this.fmt(data.now.temp) + this.unit();
  }
};
Bus.on('shell:unlock', () => Weather.fetch().then(d => Weather.applyTaskbar(d)));
Bus.on('weather:changed', d => Weather.applyTaskbar(d));
Bus.on('settings:weatherLoc', () => Weather.fetch(true));
Bus.on('settings:weatherUnit', () => Weather.fetch(true));
setInterval(() => { if (!document.hidden) Weather.fetch().then(d => Weather.applyTaskbar(d)); }, 30 * 60000);

/* ---------- Chess ---------- */
const ChessEngine = (() => {
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
  const PST_P = [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0];
  const PST_N = [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50];
  const isW = p => p && p === p.toUpperCase();
  const initial = () => ({ b: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'.split('/').flatMap(r => [...r].flatMap(ch => /\d/.test(ch) ? Array(+ch).fill(null) : [ch])), turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, moves: [] });
  const N_D = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]], K_D = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]], B_D = [[-1, -1], [-1, 1], [1, -1], [1, 1]], R_D = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  function attacked(b, idx, byWhite) {
    const r = idx >> 3, c = idx & 7;
    const pd = byWhite ? 1 : -1; // white pawns attack upward (toward row 0)
    for (const dc of [-1, 1]) { const rr = r + pd, cc = c + dc; if (on(rr, cc) && b[rr * 8 + cc] === (byWhite ? 'P' : 'p')) return true; }
    for (const [dr, dc] of N_D) { const rr = r + dr, cc = c + dc; if (on(rr, cc) && b[rr * 8 + cc] === (byWhite ? 'N' : 'n')) return true; }
    for (const [dr, dc] of K_D) { const rr = r + dr, cc = c + dc; if (on(rr, cc) && b[rr * 8 + cc] === (byWhite ? 'K' : 'k')) return true; }
    for (const [dirs, pcs] of [[B_D, byWhite ? 'BQ' : 'bq'], [R_D, byWhite ? 'RQ' : 'rq']]) for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (on(rr, cc)) { const p = b[rr * 8 + cc]; if (p) { if (pcs.includes(p)) return true; break; } rr += dr; cc += dc; }
    }
    return false;
  }
  const kingIdx = (b, white) => b.indexOf(white ? 'K' : 'k');
  const inCheck = (s, white) => attacked(s.b, kingIdx(s.b, white), !white);
  function pseudo(s) {
    const b = s.b, white = s.turn === 'w', out = [];
    const add = (f, t, extra) => out.push(Object.assign({ from: f, to: t, piece: b[f], cap: b[t] }, extra));
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (!p || isW(p) !== white) continue;
      const r = i >> 3, c = i & 7, P = p.toLowerCase();
      if (P === 'p') {
        const dir = white ? -1 : 1, start = white ? 6 : 1, last = white ? 0 : 7;
        const r1 = r + dir;
        if (on(r1, c) && !b[r1 * 8 + c]) {
          if (r1 === last) ['q', 'r', 'b', 'n'].forEach(pr => add(i, r1 * 8 + c, { promo: white ? pr.toUpperCase() : pr }));
          else { add(i, r1 * 8 + c); if (r === start && !b[(r + 2 * dir) * 8 + c]) add(i, (r + 2 * dir) * 8 + c, { dbl: true }); }
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc; if (!on(r1, cc)) continue;
          const t = r1 * 8 + cc;
          if (b[t] && isW(b[t]) !== white) { if (r1 === last) ['q', 'r', 'b', 'n'].forEach(pr => add(i, t, { promo: white ? pr.toUpperCase() : pr })); else add(i, t); }
          else if (t === s.ep) add(i, t, { ep: true, cap: white ? 'p' : 'P' });
        }
      } else if (P === 'n' || P === 'k') {
        for (const [dr, dc] of (P === 'n' ? N_D : K_D)) { const rr = r + dr, cc = c + dc; if (!on(rr, cc)) continue; const t = rr * 8 + cc; if (!b[t] || isW(b[t]) !== white) add(i, t); }
        if (P === 'k') {
          const home = white ? 60 : 4;
          if (i === home && !attacked(b, home, !white)) {
            if (s.castle[white ? 'K' : 'k'] && !b[home + 1] && !b[home + 2] && b[home + 3] === (white ? 'R' : 'r') && !attacked(b, home + 1, !white) && !attacked(b, home + 2, !white)) add(i, home + 2, { castle: 'K' });
            if (s.castle[white ? 'Q' : 'q'] && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === (white ? 'R' : 'r') && !attacked(b, home - 1, !white) && !attacked(b, home - 2, !white)) add(i, home - 2, { castle: 'Q' });
          }
        }
      } else {
        const dirs = P === 'b' ? B_D : P === 'r' ? R_D : B_D.concat(R_D);
        for (const [dr, dc] of dirs) { let rr = r + dr, cc = c + dc; while (on(rr, cc)) { const t = rr * 8 + cc; if (b[t]) { if (isW(b[t]) !== white) add(i, t); break; } add(i, t); rr += dr; cc += dc; } }
      }
    }
    return out;
  }
  function make(s, m) {
    const b = s.b.slice(), white = s.turn === 'w';
    const castle = Object.assign({}, s.castle);
    b[m.to] = m.promo || b[m.from]; b[m.from] = null;
    if (m.ep) b[m.to + (white ? 8 : -8)] = null;
    if (m.castle === 'K') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null; }
    if (m.castle === 'Q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null; }
    const P = m.piece.toLowerCase();
    if (P === 'k') { castle[white ? 'K' : 'k'] = false; castle[white ? 'Q' : 'q'] = false; }
    if (m.from === 63 || m.to === 63) castle.K = false; if (m.from === 56 || m.to === 56) castle.Q = false;
    if (m.from === 7 || m.to === 7) castle.k = false; if (m.from === 0 || m.to === 0) castle.q = false;
    return { b, turn: white ? 'b' : 'w', castle, ep: m.dbl ? (m.from + m.to) / 2 : -1, half: (P === 'p' || m.cap) ? 0 : s.half + 1, moves: s.moves.concat([m]) };
  }
  function legal(s) { const white = s.turn === 'w'; return pseudo(s).filter(m => !inCheck(make(s, m), white)); }
  function evaluate(s) {
    let sc = 0;
    for (let i = 0; i < 64; i++) {
      const p = s.b[i]; if (!p) continue;
      const w = isW(p), P = p.toLowerCase(), idx = w ? i : (63 - i);
      let v = VAL[P] + (P === 'p' ? PST_P[idx] : P === 'n' ? PST_N[idx] : P === 'b' ? (idx % 8 > 1 && idx % 8 < 6 ? 8 : 0) : P === 'q' ? 2 : 0);
      sc += w ? v : -v;
    }
    return sc;
  }
  function search(s, depth, alpha, beta, nodes) {
    nodes.n++;
    if (depth === 0) return evaluate(s);
    const moves = legal(s);
    const white = s.turn === 'w';
    if (!moves.length) return inCheck(s, white) ? (white ? -99999 - depth : 99999 + depth) : 0;
    moves.sort((a, b2) => (VAL[(b2.cap || 'p').toLowerCase()] * !!b2.cap) - (VAL[(a.cap || 'p').toLowerCase()] * !!a.cap));
    if (white) {
      let best = -Infinity;
      for (const m of moves) { best = Math.max(best, search(make(s, m), depth - 1, alpha, beta, nodes)); alpha = Math.max(alpha, best); if (beta <= alpha) break; }
      return best;
    } else {
      let best = Infinity;
      for (const m of moves) { best = Math.min(best, search(make(s, m), depth - 1, alpha, beta, nodes)); beta = Math.min(beta, best); if (beta <= alpha) break; }
      return best;
    }
  }
  function bestMove(s, depth) {
    const moves = legal(s); if (!moves.length) return null;
    const white = s.turn === 'w', nodes = { n: 0 };
    let best = null, bestV = white ? -Infinity : Infinity;
    const scored = moves.map(m => ({ m, v: search(make(s, m), depth - 1, -Infinity, Infinity, nodes) + (Math.random() - .5) * 6 }));
    for (const { m, v } of scored) if (white ? v > bestV : v < bestV) { bestV = v; best = m; }
    return best;
  }
  const status = s => { const ms = legal(s); const white = s.turn === 'w'; if (ms.length) return inCheck(s, white) ? 'check' : s.half >= 100 ? 'draw' : 'play'; return inCheck(s, white) ? 'mate' : 'stalemate'; };
  return { initial, legal, make, bestMove, status, inCheck, isW };
})();
Apps.register({
  id: 'chess', name: 'Chess', icon: '♞', color: 'linear-gradient(135deg,#8d6e63,#4e342e)',
  category: 'Games', store: true, width: 640, height: 600,
  desc: 'Chess Titans, but humble. Full rules — castling, en passant, promotion — against an alpha-beta engine with three difficulty levels. It will occasionally blunder. So will you.', rating: 4.7, size: '1.6 MB',
  mount(win) {
    const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    let s, side = 'w', depth = 2, sel = null, legalFrom = [], thinking = false, over = false, undoStack = [];
    win.body.innerHTML = `<div class="chess-root"><div class="app-toolbar"><button class="fluent-btn subtle ch-new">New game</button><select class="fluent-input ch-side"><option value="w">Play White</option><option value="b">Play Black</option></select><select class="fluent-input ch-depth"><option value="1">Easy</option><option value="2" selected>Normal</option><option value="3">Hard</option></select><button class="fluent-btn subtle ch-undo">↶ Undo</button><span class="ch-status" style="margin-left:auto;font-weight:600"></span></div><div class="chess-wrap"><div class="chess-board"></div><div class="chess-moves"></div></div></div>`;
    const board = win.body.querySelector('.chess-board'), status = win.body.querySelector('.ch-status'), movesEl = win.body.querySelector('.chess-moves');
    const sq = i => 'abcdefgh'[i & 7] + (8 - (i >> 3));
    function render() {
      const flip = side === 'b';
      const last = s.moves[s.moves.length - 1];
      let html = '';
      for (let k = 0; k < 64; k++) {
        const i = flip ? 63 - k : k, r = i >> 3, c = i & 7, p = s.b[i];
        const cls = ['sq', (r + c) % 2 ? 'dark' : 'light', sel === i ? 'sel' : '', legalFrom.some(m => m.to === i) ? (p ? 'cap' : 'dot') : '', last && (last.from === i || last.to === i) ? 'last' : '', p && p.toLowerCase() === 'k' && ChessEngine.inCheck(s, ChessEngine.isW(p)) && s.turn === (ChessEngine.isW(p) ? 'w' : 'b') ? 'check' : ''].join(' ');
        html += `<div class="${cls}" data-i="${i}">${p ? `<span class="pc ${ChessEngine.isW(p) ? 'w' : 'b'}">${GLYPH[p]}</span>` : ''}${c === (flip ? 7 : 0) ? `<i class="rk">${8 - r}</i>` : ''}${r === (flip ? 0 : 7) ? `<i class="fl">${'abcdefgh'[c]}</i>` : ''}</div>`;
      }
      board.innerHTML = html;
      const st = ChessEngine.status(s);
      const turnName = s.turn === 'w' ? 'White' : 'Black';
      over = st === 'mate' || st === 'stalemate' || st === 'draw';
      status.textContent = thinking ? 'Thinking…' : st === 'mate' ? `Checkmate — ${s.turn === 'w' ? 'Black' : 'White'} wins` : st === 'stalemate' ? 'Stalemate' : st === 'draw' ? 'Draw (50-move rule)' : st === 'check' ? `${turnName} to move — check!` : `${turnName} to move`;
      if (st === 'mate' && s.turn !== side && !s._scored) { s._scored = true; Achievements.unlock('chess'); HiScore.submit('chess', Math.max(1, 1000 - s.moves.length * 5) * depth); Shell.toast('Chess', 'Checkmate! You beat the computer on ' + ['', 'Easy', 'Normal', 'Hard'][depth] + '.', '♛'); Party.confetti(3); }
      if (st === 'mate' && s.turn === side && !s._scored) { s._scored = true; blip(40, 0.4); }
      const pairs = [];
      s.moves.forEach((m, i) => { const t = (m.castle === 'K' ? 'O-O' : m.castle === 'Q' ? 'O-O-O' : (m.piece.toLowerCase() !== 'p' ? m.piece.toUpperCase() : '') + (m.cap ? (m.piece.toLowerCase() === 'p' ? sq(m.from)[0] : '') + 'x' : '') + sq(m.to) + (m.promo ? '=' + m.promo.toUpperCase() : '')); if (i % 2 === 0) pairs.push([t]); else pairs[pairs.length - 1].push(t); });
      movesEl.innerHTML = pairs.map((p, i) => `<div><b>${i + 1}.</b> ${p[0]} ${p[1] || ''}</div>`).join('');
      movesEl.scrollTop = movesEl.scrollHeight;
    }
    function aiMove() {
      if (over || s.turn === side) return;
      thinking = true; render();
      setTimeout(() => {
        const m = ChessEngine.bestMove(s, depth);
        thinking = false;
        if (m) { s = ChessEngine.make(s, m); blip(m.cap ? 60 : 68, 0.05); }
        render();
      }, 120);
    }
    function reset() {
      s = ChessEngine.initial(); sel = null; legalFrom = []; undoStack = []; thinking = false; over = false;
      Achievements.unlock('chess-first');
      render(); if (side === 'b') aiMove();
    }
    board.addEventListener('click', e => {
      const el = e.target.closest('.sq'); if (!el || thinking || over || s.turn !== side) return;
      const i = +el.dataset.i;
      const mv = legalFrom.find(m => m.to === i && (!m.promo || m.promo.toLowerCase() === 'q'));
      if (mv) { undoStack.push(s); s = ChessEngine.make(s, mv); sel = null; legalFrom = []; blip(mv.cap ? 62 : 72, 0.05); render(); aiMove(); return; }
      const p = s.b[i];
      if (p && ChessEngine.isW(p) === (side === 'w')) { sel = i; legalFrom = ChessEngine.legal(s).filter(m => m.from === i); }
      else { sel = null; legalFrom = []; }
      render();
    });
    win.body.querySelector('.ch-new').addEventListener('click', reset);
    win.body.querySelector('.ch-side').addEventListener('change', e => { side = e.target.value; reset(); });
    win.body.querySelector('.ch-depth').addEventListener('change', e => { depth = +e.target.value; });
    win.body.querySelector('.ch-undo').addEventListener('click', () => { if (undoStack.length && !thinking) { s = undoStack.pop(); sel = null; legalFrom = []; over = false; render(); } });
    reset();
  }
});

/* ---------- First-run setup (OOBE) ---------- */
const OOBE = {
  el: null, step: 0,
  maybe() {
    if (localStorage.getItem('win11.oobe')) return;
    if (localStorage.getItem('win11.welcomed')) { localStorage.setItem('win11.oobe', '1'); return; } // existing users skip
    setTimeout(() => this.show(), 700);
  },
  show() {
    this.el = Utils.el('div'); this.el.id = 'oobe';
    document.body.appendChild(this.el);
    this.step = 0; this.render();
  },
  finish() {
    localStorage.setItem('win11.oobe', '1');
    localStorage.setItem('win11.welcomed', '1');
    Achievements.unlock('oobe');
    this.el.querySelector('.oobe-card').innerHTML = `<div class="oobe-spin"><div class="boot-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div></div><h1>Hi, ${Utils.esc(Settings.get('userName') || 'there')}.</h1><p class="oobe-sub">This might take a few minutes. Don't turn off your PC.</p>`;
    const lines = ['Getting things ready for you…', 'Almost there…', 'Taking longer than usual, but it\'ll be ready soon…', 'This is taking a while…', 'Ok, done.'];
    let i = 0;
    const t = setInterval(() => { i++; const p = this.el.querySelector('.oobe-sub'); if (p) p.textContent = lines[Math.min(i, lines.length - 1)]; if (i >= lines.length) { clearInterval(t); this.el.classList.add('out'); setTimeout(() => { this.el.remove(); this.el = null; Shell.toast('Welcome to Windows 11 Web', 'Open the Start menu to explore. Tip: the Microsoft Store has games you can install!', '👋'); }, 500); } }, 700);
  },
  render() {
    const steps = [
      () => `<h1>Hi there</h1><p class="oobe-sub">Let's set things up. What should we call you?</p><input class="fluent-input oobe-name" maxlength="24" value="${Utils.esc(Settings.get('userName') || '')}" placeholder="Your name"><div class="accent-row oobe-av">${Accounts.AVATARS.map(a => `<div class="acc-opt av-opt ${(Settings.get('avatar') || '') === a ? 'sel' : ''}" data-av="${a}">${a || 'A'}</div>`).join('')}</div>`,
      () => `<h1>Choose your look</h1><p class="oobe-sub">You can change this later in Settings → Personalization.</p><div class="oobe-opts">${[['', '🪟', 'Windows 11', 'Rounded corners, Mica, the works'], ['xp', '🌄', 'Windows XP', 'Bliss. The green start button. 2001.'], ['95', '🖥️', 'Windows 95', 'Teal, bevels, MS Sans Serif']].map(([v, i, n, d]) => `<div class="oobe-opt ${(Settings.get('retro') || '') === v ? 'sel' : ''}" data-retro="${v}"><div class="oo-ico">${i}</div><div><b>${n}</b><br><small>${d}</small></div></div>`).join('')}</div><div class="oobe-row"><label><input type="checkbox" class="oobe-dark" ${Settings.get('theme') === 'dark' ? 'checked' : ''}> Dark mode</label></div>`,
      () => `<h1>Pick a background</h1><p class="oobe-sub">Spotlight paints a new one every day. Aurora moves.</p><div class="wall-grid oobe-walls">${Wallpapers.ids.map(id => `<div class="wall-opt ${Settings.get('wallpaper') === id ? 'sel' : ''}" data-w="${id}" title="${Wallpapers.names[id]}" style="background-image:url('${Wallpapers.uri(id)}')"></div>`).join('')}</div>`,
      () => `<h1>A few extras</h1><p class="oobe-sub">All optional. All reversible.</p><div class="oobe-opts">${[['clippy', '📎', 'Office Assistant', 'Clippy offers tips you didn\'t ask for'], ['screensaverOn', '🫧', 'Screensaver', 'Bubbles after 5 idle minutes'], ['neko', '🐈', 'Neko', 'A cat that chases your mouse'], ['cursorTrail', '🌈', 'Mouse trails', 'It\'s 1998 and you have a Pentium II']].map(([k, i, n, d]) => `<div class="oobe-opt oobe-tgl ${(k === 'screensaverOn' ? +Settings.get('screensaverMin') > 0 : k === 'neko' ? Apps.isInstalled('neko') && Settings.get('neko') : Settings.get(k)) ? 'sel' : ''}" data-k="${k}"><div class="oo-ico">${i}</div><div><b>${n}</b><br><small>${d}</small></div></div>`).join('')}</div>`
    ];
    const last = this.step === steps.length - 1;
    this.el.innerHTML = `<div class="oobe-card">${steps[this.step]()}<div class="oobe-nav"><button class="fluent-btn subtle oobe-skip">Skip setup</button><span style="flex:1"></span>${this.step ? '<button class="fluent-btn subtle oobe-back">Back</button>' : ''}<button class="fluent-btn oobe-next">${last ? 'Finish' : 'Next'}</button></div><div class="oobe-dots">${steps.map((_, i) => `<i class="${i === this.step ? 'on' : ''}"></i>`).join('')}</div></div>`;
    const $ = s => this.el.querySelector(s);
    $('.oobe-skip').addEventListener('click', () => this.finish());
    if ($('.oobe-back')) $('.oobe-back').addEventListener('click', () => { this.step--; this.render(); });
    $('.oobe-next').addEventListener('click', () => { if (last) this.finish(); else { this.step++; this.render(); } });
    if (this.step === 0) {
      const inp = $('.oobe-name'); setTimeout(() => inp.focus(), 50);
      inp.addEventListener('input', () => { const v = inp.value.trim(); if (v) Settings.set('userName', v); });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') $('.oobe-next').click(); });
      $('.oobe-av').addEventListener('click', e => { const a = e.target.closest('.av-opt'); if (a) { Settings.set('avatar', a.dataset.av); this.render(); } });
    } else if (this.step === 1) {
      this.el.querySelectorAll('[data-retro]').forEach(o => o.addEventListener('click', () => { Retro.set(o.dataset.retro); this.render(); }));
      $('.oobe-dark').addEventListener('change', e => Settings.set('theme', e.target.checked ? 'dark' : 'light'));
    } else if (this.step === 2) {
      this.el.querySelectorAll('.wall-opt').forEach(w => w.addEventListener('click', () => { Settings.set('wallpaper', w.dataset.w); this.render(); }));
    } else if (this.step === 3) {
      this.el.querySelectorAll('.oobe-tgl').forEach(o => o.addEventListener('click', () => {
        const k = o.dataset.k;
        if (k === 'screensaverOn') Settings.set('screensaverMin', +Settings.get('screensaverMin') > 0 ? 0 : 5);
        else if (k === 'neko') { if (!Apps.isInstalled('neko')) Apps.install('neko'); Settings.set('neko', !Settings.get('neko')); }
        else Settings.set(k, !Settings.get(k));
        this.render();
      }));
    }
  }
};
Bus.on('shell:unlock', () => OOBE.maybe());

/* ---------- Wi-Fi / Bluetooth panels, airplane mode, online status, battery ---------- */
const Connectivity = {
  wifi: true, bt: true, airplane: false, panel: null,
  NETS: [['Webville-5G', 4, true], ['Webville', 3, true], ['FBI Surveillance Van #7', 3, true], ['Pretty Fly for a Wi-Fi', 2, true], ['xfinitywifi', 2, false], ['Clippy_Hotspot', 1, true], ['NETGEAR-2.4', 1, true]],
  DEVICES: [['🎧', 'Clippy\'s Earbuds', 'Audio'], ['🐈', 'Neko Collar', 'Wearable'], ['⌨️', 'Model M (1986)', 'Keyboard'], ['🖱️', 'Trackball', 'Mouse'], ['📱', 'Seefood\'s Phone', 'Phone'], ['🔊', 'Kitchen Speaker', 'Audio']],
  init() {
    const tiles = document.querySelectorAll('#action-center .ac-tile');
    const [wifiT, btT, airT] = tiles;
    const tray = document.querySelectorAll('#tray-icons span');
    const sync = () => {
      wifiT.classList.toggle('on', this.wifi && !this.airplane); btT.classList.toggle('on', this.bt && !this.airplane); airT.classList.toggle('on', this.airplane);
      tray[0].textContent = this.airplane ? '✈️' : !this.wifi ? '🚫' : !navigator.onLine ? '🌐' : '🛜';
      tray[0].title = this.airplane ? 'Airplane mode' : !this.wifi ? 'Wi-Fi off' : !navigator.onLine ? 'No internet' : 'Connected to ' + this.NETS[0][0];
    };
    const addChevron = (tile, kind) => { const c = Utils.el('b', 'ac-chev', '›'); c.title = 'Show ' + kind; tile.appendChild(c); c.addEventListener('click', e => { e.stopPropagation(); this.openPanel(kind); }); };
    addChevron(wifiT, 'Wi-Fi'); addChevron(btT, 'Bluetooth');
    wifiT.addEventListener('click', () => { this.wifi = !this.wifi; if (this.wifi) this.airplane = false; sync(); });
    btT.addEventListener('click', () => { this.bt = !this.bt; sync(); });
    airT.addEventListener('click', () => { this.airplane = !this.airplane; sync(); Shell.toast('Airplane mode', this.airplane ? 'On. Wi-Fi and Bluetooth are off. Please stow your tray table.' : 'Off. Welcome back to the ground.', '✈️'); });
    window.addEventListener('online', () => { sync(); Shell.toast('Network', 'You\'re back online.', '🛜'); });
    window.addEventListener('offline', () => { sync(); Shell.toast('Network', 'No internet connection. Everything here still works, because it never needed one.', '🌐'); });
    sync();
    this._sync = sync;
    // battery
    if (navigator.getBattery) navigator.getBattery().then(bat => {
      const upd = () => {
        const pct = Math.round(bat.level * 100);
        tray[2].textContent = bat.charging ? '⚡' : pct <= 20 ? '🪫' : '🔋';
        tray[2].title = pct + '%' + (bat.charging ? ', charging' : '');
        if (pct <= 20 && !bat.charging && !this._lowWarned) { this._lowWarned = true; Shell.toast('Battery', pct + '% remaining. Plug in, or embrace the darkness.', '🪫'); }
      };
      ['levelchange', 'chargingchange'].forEach(ev => bat.addEventListener(ev, upd)); upd();
      this.battery = bat;
    }).catch(() => {});
  },
  openPanel(kind) {
    const ac = document.getElementById('action-center');
    let p = ac.querySelector('.ac-panel'); if (p) p.remove();
    p = Utils.el('div', 'ac-panel');
    const bat = this.battery;
    if (kind === 'Wi-Fi') p.innerHTML = `<div class="acp-head"><button class="acp-back">‹</button><span>Wi-Fi</span></div>${this.NETS.map(([n, s, sec], i) => `<div class="acp-row" data-i="${i}"><span>${['▂', '▂▄', '▂▄▆', '▂▄▆█'][s - 1]}</span><div style="flex:1"><div>${Utils.esc(n)}</div><small>${i === 0 ? 'Connected, secured' : sec ? 'Secured' : 'Open'}</small></div>${i === 0 ? '<button class="fluent-btn subtle" disabled>Connected</button>' : `<button class="fluent-btn subtle" data-connect="${i}">Connect</button>`}</div>`).join('')}`;
    else p.innerHTML = `<div class="acp-head"><button class="acp-back">‹</button><span>Bluetooth</span></div>${this.DEVICES.map(([i, n, k], idx) => `<div class="acp-row"><span>${i}</span><div style="flex:1"><div>${n}</div><small>${k}${idx < 2 ? ' • Connected' : ''}</small></div><button class="fluent-btn subtle" data-pair="${idx}">${idx < 2 ? 'Disconnect' : 'Pair'}</button></div>`).join('')}${bat ? `<div class="acp-row"><span>🔋</span><div style="flex:1"><div>This device</div><small>${Math.round(bat.level * 100)}%${bat.charging ? ', charging' : ''}</small></div></div>` : ''}`;
    ac.appendChild(p);
    p.querySelector('.acp-back').addEventListener('click', () => p.remove());
    p.addEventListener('click', e => {
      const c = e.target.closest('[data-connect]'); const pr = e.target.closest('[data-pair]');
      if (c) { const n = this.NETS[+c.dataset.connect]; if (n[2]) { const pw = prompt('Enter the network security key for "' + n[0] + '":'); if (pw === null) return; if (pw !== 'password') { Shell.toast('Wi-Fi', 'Can\'t connect to this network. (Hint: the password is "password". It always is.)', '🛜'); return; } } this.NETS.splice(+c.dataset.connect, 1); this.NETS.unshift(n); this._sync(); setTimeout(() => this.openPanel('Wi-Fi'), 0); /* re-render after the click bubbles: a detached target would make the flyout's outside-click handler close it */ Shell.toast('Wi-Fi', 'Connected to ' + n[0] + '. Speed: browser-limited.', '🛜'); }
      if (pr) { const d = this.DEVICES[+pr.dataset.pair]; Shell.toast('Bluetooth', (+pr.dataset.pair < 2 ? 'Disconnected from ' : 'Paired with ') + d[1] + '.', d[0]); }
    });
  }
};
document.addEventListener('DOMContentLoaded', () => Connectivity.init());

/* ---------- Clipboard history (Win+V) ---------- */
const ClipHistory = {
  el: null,
  items() { return Store.get('win11.clip', []); },
  push(text) {
    text = String(text || '').trim(); if (!text) return;
    const list = this.items().filter(t => t !== text); list.unshift(text);
    Store.set('win11.clip', list.slice(0, 25));
  },
  toggle() {
    if (this.el) { this.close(); return; }
    Achievements.unlock('clipboard');
    this.target = document.activeElement;
    this.el = Utils.el('div', 'clip-panel');
    const list = this.items();
    this.el.innerHTML = `<div class="clip-head"><span>Clipboard</span><button class="clip-clear">Clear all</button></div>${list.length ? list.map((t, i) => `<div class="clip-item" data-i="${i}"><span>${Utils.esc(t.length > 140 ? t.slice(0, 140) + '…' : t)}</span><button class="clip-del" title="Remove">✕</button></div>`).join('') : '<div class="nc-empty" style="padding:12px">Nothing copied yet. Copy some text (Ctrl+C) in any app and it shows up here.</div>'}`;
    document.body.appendChild(this.el);
    const r = this.target && this.target !== document.body ? this.target.getBoundingClientRect() : null;
    this.el.style.left = Utils.clamp(r ? r.left : innerWidth / 2 - 170, 8, innerWidth - 348) + 'px';
    this.el.style.top = (r && r.bottom + 300 < innerHeight ? r.bottom + 6 : Math.max(8, (r ? r.top : innerHeight / 2) - 300)) + 'px';
    this.el.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target.closest('.clip-clear')) { Store.set('win11.clip', []); this.close(); return; }
      const it = e.target.closest('.clip-item'); if (!it) return;
      if (e.target.closest('.clip-del')) { const l = this.items(); l.splice(+it.dataset.i, 1); Store.set('win11.clip', l); this.close(); this.toggle(); return; }
      this.insert(this.items()[+it.dataset.i]);
    });
    setTimeout(() => document.addEventListener('pointerdown', this._outside = ev => { if (!ev.target.closest('.clip-panel')) this.close(); }), 0);
  },
  insert(text) {
    const t = this.target; this.close();
    if (t && (t.matches('input, textarea') || t.isContentEditable)) {
      t.focus();
      if (!document.execCommand('insertText', false, text) && t.setRangeText) { t.setRangeText(text, t.selectionStart, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input', { bubbles: true })); }
    } else { navigator.clipboard && navigator.clipboard.writeText(text).catch(() => {}); Shell.toast('Clipboard', 'Copied. Click into a text field first to paste directly.', '📋'); }
  },
  close() { if (this.el) { this.el.remove(); this.el = null; document.removeEventListener('pointerdown', this._outside); } }
};
document.addEventListener('copy', () => { const s = String(getSelection()); if (s.trim()) ClipHistory.push(s); else { const a = document.activeElement; if (a && a.matches && a.matches('input, textarea') && a.selectionEnd > a.selectionStart) ClipHistory.push(a.value.slice(a.selectionStart, a.selectionEnd)); } });
document.addEventListener('cut', () => { const a = document.activeElement; if (a && a.matches && a.matches('input, textarea') && a.selectionEnd > a.selectionStart) ClipHistory.push(a.value.slice(a.selectionStart, a.selectionEnd)); else ClipHistory.push(String(getSelection())); });
document.addEventListener('keydown', e => { if (e.metaKey && e.key.toLowerCase() === 'v' && !e.ctrlKey) { e.preventDefault(); ClipHistory.toggle(); } else if (ClipHistory.el && e.key === 'Escape') ClipHistory.close(); });

/* ---------- Terminal: network fakes ---------- */
(() => {
  const later = (win, lines, gap) => {
    const root = win.body.querySelector('.term-root');
    lines.forEach((s, i) => setTimeout(() => { if (!root.isConnected) return; const l = Utils.el('div', 't-line'); l.textContent = s; root.insertBefore(l, root.lastElementChild); root.scrollTop = root.scrollHeight; }, (i + 1) * (gap || 600)));
  };
  Object.assign(FunCmds, {
    ping(print, arg, win) {
      const host = arg || 'localhost';
      const ip = host === 'localhost' ? '127.0.0.1' : Array.from({ length: 4 }, (_, i) => (host.charCodeAt(i % host.length) * 7 + i * 31) % 255).join('.');
      print(`Pinging ${host} [${ip}] with 32 bytes of data:`);
      const times = Array.from({ length: 4 }, () => host === 'localhost' ? '<1ms' : Math.round(8 + Math.random() * 40) + 'ms');
      later(win, times.map(t => `Reply from ${ip}: bytes=32 time=${t} TTL=${host === 'localhost' ? 128 : 54}`).concat(['', `Ping statistics for ${ip}:`, '    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),']), 700);
    },
    ipconfig(print) {
      const c = navigator.connection || {};
      ['', 'Windows IP Configuration', '', 'Wireless LAN adapter Wi-Fi:', '', '   Connection-specific DNS Suffix  . : webville.internet', '   IPv4 Address. . . . . . . . . . . : 192.168.1.' + (10 + Math.floor(Math.random() * 200)), '   Subnet Mask . . . . . . . . . . . : 255.255.255.0', '   Default Gateway . . . . . . . . . : 192.168.1.1', '   Link type . . . . . . . . . . . . : ' + (c.effectiveType || 'unknown') + (c.downlink ? ' (~' + c.downlink + ' Mbps)' : ''), '   Online. . . . . . . . . . . . . . : ' + (navigator.onLine ? 'Yes' : 'No'), ''].forEach(print);
    },
    tracert(print, arg, win) {
      const host = arg || 'clippy.office.web';
      print(`Tracing route to ${host} over a maximum of 30 hops:`); print('');
      const hops = ['192.168.1.1 [your router, blinking]', '10.0.0.1 [isp-gateway]', '72.14.201.5 [somewhere-in-ohio]', '198.51.100.7 [undersea-cable-probably]', '203.0.113.9 [a-datacenter]', host + ' [destination, waving]'];
      later(win, hops.map((h, i) => `  ${String(i + 1).padStart(2)}    ${Math.round(2 + i * 9 + Math.random() * 6)} ms    ${Math.round(2 + i * 9 + Math.random() * 6)} ms    ${Math.round(2 + i * 9 + Math.random() * 6)} ms  ${h}`).concat(['', 'Trace complete.']), 500);
    },
    nslookup(print, arg) { const h = arg || 'localhost'; ['Server:  UnKnown', 'Address:  192.168.1.1', '', 'Name:    ' + h, 'Address:  ' + (h === 'localhost' ? '127.0.0.1' : '203.0.113.' + (h.length * 7 % 250))].forEach(print); },
    netstat(print) { ['', 'Active Connections', '', '  Proto  Local Address          Foreign Address        State', ...WM.allDesks().map((w, i) => `  TCP    127.0.0.1:${49152 + i * 3}        ${w.app.id}.web:443        ESTABLISHED`), '  TCP    127.0.0.1:1337         clippy.office.web:80   LISTENING'].forEach(print); },
    weather(print) { const d = Weather.snapshot(); if (!d) { print('Fetching…'); Weather.fetch().then(() => print('Done. Run "weather" again.')); return; } print(`${d.loc}: ${Weather.desc(d.now.code)[1]}, ${Weather.fmt(d.now.temp)}${Weather.unit()}, wind ${Math.round(d.now.wind)} mph, humidity ${Math.round(d.now.humidity)}%`); d.days.forEach(x => print(`  ${x.date.toLocaleDateString([], { weekday: 'short' })}  ${Weather.desc(x.code)[0]}  ${Weather.fmt(x.hi)} / ${Weather.fmt(x.lo)}  ${Weather.desc(x.code)[1]}`)); if (d.fake) print('(offline: showing the deterministic Webville forecast)'); }
  });
})();
