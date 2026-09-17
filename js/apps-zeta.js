/* ============ Windows 11 Web — zeta: Game Bar + FPS, ZIP compress/extract, Camera video, Wordl,
   Pipes screensaver, Spotify playlists & likes, Terminal edit ============ */
'use strict';

Achievements.list.push(
  { id: 'wordl', name: 'Wordsmith', desc: 'Solved a Wordl.', icon: '🟩', pts: 20 },
  { id: 'zipper', name: 'Compressed', desc: 'Made a real ZIP file in File Explorer.', icon: '🗜️', pts: 10 },
  { id: 'director', name: 'Director', desc: 'Recorded a video with the Camera.', icon: '🎬', pts: 15 },
  { id: 'gamebar', name: 'Game Bar', desc: 'Opened the Xbox Game Bar (Win+G).', icon: '🎮', pts: 5 },
  { id: 'curator', name: 'Curator', desc: 'Made a Spotify playlist.', icon: '🎧', pts: 10 }
);

/* ---------- FPS meter + Xbox Game Bar (Win+G) ---------- */
const GameBar = {
  el: null, fps: 0, _frames: 0, _last: performance.now(), corner: null,
  init() {
    const loop = t => { this._frames++; if (t - this._last >= 500) { this.fps = Math.round(this._frames * 1000 / (t - this._last)); this._frames = 0; this._last = t; if (this.corner) this.corner.textContent = this.fps + ' FPS'; if (this.el) this.el.querySelector('.gb-fps b').textContent = this.fps; } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    this.applyCorner();
  },
  applyCorner() {
    const want = !!Settings.get('fps');
    if (want && !this.corner) { this.corner = Utils.el('div', 'fps-corner', '-- FPS'); document.body.appendChild(this.corner); }
    else if (!want && this.corner) { this.corner.remove(); this.corner = null; }
  },
  toggle() {
    if (this.el) { this.el.remove(); this.el = null; return; }
    Achievements.unlock('gamebar');
    this.el = Utils.el('div', 'game-bar');
    const game = WM.focused() && Apps.get(WM.focused().app.id).category === 'Games' ? WM.focused().app.name : null;
    this.el.innerHTML = `<div class="gb-pill"><span class="gb-logo">🎮</span><span class="gb-time">${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span><span class="gb-fps"><b>${this.fps}</b> FPS</span><span class="gb-game">${game ? Utils.esc(game) : 'No game in focus'}</span>
      <button data-a="snip" title="Screenshot (Win+Shift+S)">📸</button><button data-a="win" title="Capture active window">🪟</button><button data-a="xbox" title="Achievements">🏆</button><button data-a="perf" title="Performance">📊</button><button data-a="fps" title="Toggle always-on FPS counter">${Settings.get('fps') ? '🟢' : '⚪'} FPS</button><button data-a="x" title="Close (Win+G)">✕</button></div>
      <div class="gb-side"><div class="gb-card"><div class="wg-title">Gamerscore</div><b>${Achievements.score()} G</b><small>${Object.keys(Achievements.unlocked()).length} / ${Achievements.list.length} achievements</small></div><div class="gb-card"><div class="wg-title">High scores</div>${(() => { const h = Store.get('win11.hiscores', {}); const k = Object.keys(h).filter(x => h[x]).slice(0, 6); return k.length ? k.map(x => `<div class="gb-row"><span>${x}</span><b>${h[x]}</b></div>`).join('') : '<small>Play something!</small>'; })()}</div></div>`;
    document.body.appendChild(this.el);
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b && e.target === this.el) { this.toggle(); return; } if (!b) return;
      const a = b.dataset.a;
      if (a === 'x') this.toggle();
      else if (a === 'snip') { this.toggle(); setTimeout(() => Snip.capture(), 200); }
      else if (a === 'win') { const w = WM.focused(); this.toggle(); if (w) setTimeout(() => Snip.capture({ win: w }), 200); else Shell.toast('Game Bar', 'No window in focus.', '🎮'); }
      else if (a === 'xbox') { this.toggle(); Apps.launch('xbox'); }
      else if (a === 'perf') { this.toggle(); Apps.launch('taskmgr'); }
      else if (a === 'fps') { Settings.set('fps', !Settings.get('fps')); this.applyCorner(); b.textContent = (Settings.get('fps') ? '🟢' : '⚪') + ' FPS'; }
    });
  }
};
document.addEventListener('DOMContentLoaded', () => GameBar.init());
Bus.on('settings:fps', () => GameBar.applyCorner());
document.addEventListener('keydown', e => { if (e.metaKey && e.key.toLowerCase() === 'g') { e.preventDefault(); GameBar.toggle(); } else if (GameBar.el && e.key === 'Escape') GameBar.toggle(); });

/* ---------- ZIP: real archives (STORE) out of the virtual FS, and extraction (STORE + DEFLATE) ---------- */
const Zip = (() => {
  const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder(), dec = new TextDecoder();
  const TEXT_EXT = /\.(txt|md|csv|json|js|css|html?|log|xml|ini|cfg|doc|xls|ppt|svg)$/i;
  function bytesOf(node) {
    const c = String(node.content || '');
    if (/^data:/.test(c)) { const i = c.indexOf(','); if (/;base64/.test(c.slice(0, i))) { const bin = atob(c.slice(i + 1)); const u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k); return u; } return enc.encode(decodeURIComponent(c.slice(i + 1))); }
    return enc.encode(c);
  }
  function dosTime(d) { return { t: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), d: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() }; }
  function build(entries) { // entries: [{ name, bytes }]
    const parts = [], central = []; let offset = 0; const now = dosTime(new Date());
    const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
    for (const e of entries) {
      const name = enc.encode(e.name), crc = crc32(e.bytes), n = e.bytes.length;
      const local = new Uint8Array([...u32(0x04034b50), ...u16(20), ...u16(0x800), ...u16(0), ...u16(now.t), ...u16(now.d), ...u32(crc), ...u32(n), ...u32(n), ...u16(name.length), ...u16(0), ...name]);
      parts.push(local, e.bytes);
      central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x800), ...u16(0), ...u16(now.t), ...u16(now.d), ...u32(crc), ...u32(n), ...u32(n), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]));
      offset += local.length + n;
    }
    const cdSize = central.reduce((s, c) => s + c.length, 0);
    const eocd = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
    return new Blob([...parts, ...central, eocd], { type: 'application/zip' });
  }
  function collect(path) {
    const node = FS.get(path), base = path.split('/').pop(), out = [];
    if (node.type === 'file') { out.push({ name: base, bytes: bytesOf(node) }); return out; }
    const walk = (n, prefix) => { for (const [k, v] of Object.entries(n.children || {})) { if (v.type === 'folder') { out.push({ name: prefix + k + '/', bytes: new Uint8Array(0) }); walk(v, prefix + k + '/'); } else out.push({ name: prefix + k, bytes: bytesOf(v) }); } };
    walk(node, base + '/');
    return out;
  }
  async function compress(path) {
    const entries = collect(path);
    const blob = build(entries);
    const name = path.split('/').pop().replace(/\.[^.]+$/, '') + '.zip';
    const dir = path.split('/').slice(0, -1).join('/') || 'C:';
    if (blob.size < 1.4 * 1048576) {
      const data = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
      FS.write(dir + '/' + FS.uniqueName(dir, name.replace(/\.zip$/, ''), '.zip'), data, 'application/zip');
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    Achievements.unlock('zipper');
    return { name, size: blob.size, count: entries.filter(e => !e.name.endsWith('/')).length };
  }
  async function inflate(bytes) {
    if (!window.DecompressionStream) throw new Error('This browser cannot inflate DEFLATE entries');
    const ds = new DecompressionStream('deflate-raw');
    const w = ds.writable.getWriter(); w.write(bytes); w.close();
    return new Uint8Array(await new Response(ds.readable).arrayBuffer());
  }
  async function extract(zipPath, destDir) {
    const b = bytesOf(FS.get(zipPath)), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let eocd = -1; for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('Not a ZIP file');
    const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true), files = 0;
    if (!FS.get(destDir)) FS.mkdir(destDir);
    for (let i = 0; i < count; i++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), loff = dv.getUint32(p + 42, true);
      const name = dec.decode(b.subarray(p + 46, p + 46 + nlen)); p += 46 + nlen + xlen + clen;
      if (/(^|\/)\.\.(\/|$)/.test(name)) continue; // no path traversal
      const lnlen = dv.getUint16(loff + 26, true), lxlen = dv.getUint16(loff + 28, true), start = loff + 30 + lnlen + lxlen;
      const parts = name.split('/').filter(Boolean);
      if (name.endsWith('/')) { let d = destDir; for (const seg of parts) { d += '/' + seg; if (!FS.get(d)) FS.mkdir(d); } continue; }
      let d = destDir; for (const seg of parts.slice(0, -1)) { d += '/' + seg; if (!FS.get(d)) FS.mkdir(d); }
      let data = b.subarray(start, start + csize);
      if (method === 8) data = await inflate(data); else if (method !== 0) continue;
      const fname = parts[parts.length - 1];
      if (TEXT_EXT.test(fname)) FS.write(d + '/' + fname, dec.decode(data), 'text/plain');
      else { let bin = ''; for (let k = 0; k < data.length; k++) bin += String.fromCharCode(data[k]); const mime = /\.(png)$/i.test(fname) ? 'image/png' : /\.(jpe?g)$/i.test(fname) ? 'image/jpeg' : /\.(gif)$/i.test(fname) ? 'image/gif' : /\.(webp)$/i.test(fname) ? 'image/webp' : /\.(mp3)$/i.test(fname) ? 'audio/mpeg' : /\.(wav)$/i.test(fname) ? 'audio/wav' : /\.(webm)$/i.test(fname) ? 'video/webm' : /\.(mp4)$/i.test(fname) ? 'video/mp4' : 'application/octet-stream'; FS.write(d + '/' + fname, 'data:' + mime + ';base64,' + btoa(bin), mime); }
      files++;
    }
    return files;
  }
  return { compress, extract };
})();

/* ---------- Pipes screensaver ---------- */
Screensaver.styles.pipes = '3D Pipes';
Screensaver.plugins.pipes = (ctx, c) => {
  const proj = (x, y, z) => [c.width / 2 + (x - z) * 0.866, c.height / 2 + y + (x + z) * 0.5];
  let pipes = [], segs = 0;
  const newPipe = () => ({ x: (Math.random() - .5) * 500, y: (Math.random() - .5) * 400, z: (Math.random() - .5) * 500, dir: [1, 0, 0], hue: Math.random() * 360, len: 0 });
  for (let i = 0; i < 3; i++) pipes.push(newPipe());
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
  let frame = 0;
  return () => {
    if (++frame % 3) return;
    for (const p of pipes) {
      if (Math.random() < .3 || p.len > 6) { const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].filter(d => !(d[0] === -p.dir[0] && d[1] === -p.dir[1] && d[2] === -p.dir[2])); p.dir = dirs[Math.floor(Math.random() * dirs.length)]; p.len = 0; const [jx, jy] = proj(p.x, p.y, p.z); ctx.fillStyle = `hsl(${p.hue},70%,45%)`; ctx.beginPath(); ctx.arc(jx, jy, 9, 0, 7); ctx.fill(); }
      const [x0, y0] = proj(p.x, p.y, p.z); const step = 24;
      p.x += p.dir[0] * step; p.y += p.dir[1] * step; p.z += p.dir[2] * step; p.len++;
      if (Math.abs(p.x) > 520 || Math.abs(p.y) > 420 || Math.abs(p.z) > 520) { Object.assign(p, newPipe()); continue; }
      const [x1, y1] = proj(p.x, p.y, p.z);
      ctx.lineCap = 'round'; ctx.lineWidth = 14; ctx.strokeStyle = `hsl(${p.hue},70%,35%)`; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = `hsl(${p.hue},80%,65%)`; ctx.beginPath(); ctx.moveTo(x0 - 2, y0 - 3); ctx.lineTo(x1 - 2, y1 - 3); ctx.stroke();
      if (++segs > 900) { segs = 0; ctx.fillStyle = 'rgba(0,0,0,1)'; ctx.fillRect(0, 0, c.width, c.height); pipes = [newPipe(), newPipe(), newPipe()]; }
    }
  };
};

/* ---------- Wordl ---------- */
Apps.register({
  id: 'wordl', name: 'Wordl', icon: '🟩', color: 'linear-gradient(135deg,#538d4e,#3a3a3c)',
  category: 'Games', store: true, width: 420, height: 620,
  desc: 'Six guesses, five letters, one word a day (plus unlimited practice). Green is right, yellow is close, grey is gone.', rating: 4.8, size: '0.4 MB',
  mount(win) {
    const WORDS = 'about above abuse actor acute admit adopt adult after again agent agree ahead alarm album alert alike alive allow alone along alter among anger angle angry apart apple apply arena argue arise array aside asset audio audit avoid awake award aware badly baker bases basic basis beach began begin begun being below bench birth black blame blind block blood board boost booth bound brain brand bread break breed brief bring broad broke brown build built buyer cable calif carry catch cause chain chair chart chase cheap check chest chief child china chose civil claim class clean clear click clock close coach coast could count court cover craft crash cream crime cross crowd crown curve cycle daily dance dated dealt death debut delay depth doing doubt dozen draft drama drawn dream dress drill drink drive drove dying eager early earth eight elite empty enemy enjoy enter entry equal error event every exact exist extra faith false fault fiber field fifth fifty fight final first fixed flash fleet floor fluid focus force forth forty forum found frame frank fraud fresh front fruit fully funny giant given glass globe going grace grade grand grant grass great green gross group grown guard guess guest guide happy harry heart heavy hence henry horse hotel house human ideal image index inner input issue japan jimmy joint jones judge known label large laser later laugh layer learn lease least leave legal level lewis light limit links lives local logic loose lower lucky lunch lying magic major maker march maria match maybe mayor meant media metal might minor minus mixed model money month moral motor mount mouse mouth movie music needs never newly night noise north noted novel nurse occur ocean offer often order other ought paint panel paper party peace peter phase phone photo piece pilot pitch place plain plane plant plate point pound power press price pride prime print prior prize proof proud prove queen quick quiet quite radio raise range rapid ratio reach ready refer right rival river robin roger roman rough round route royal rural scale scene scope score sense serve seven shall shape share sharp sheet shelf shell shift shirt shock shoot short shown sight since sixth sixty sized skill sleep slide small smart smile smith smoke solid solve sorry sound south space spare speak speed spend spent split spoke sport staff stage stake stand start state steam steel stick still stock stone stood store storm story strip stuck study stuff style sugar suite super sweet table taken taste taxes teach teeth terry texas thank theft their theme there these thick thing think third those three threw throw tight times tired title today topic total touch tough tower track trade train treat trend trial tried tries truck truly trust truth twice under undue union unity until upper upset urban usage usual valid value video virus visit vital voice waste watch water wheel where which while white whole whose woman women world worry worse worst worth would wound write wrong wrote young youth'.split(' ');
    let target, guesses, cur, done, daily = true;
    const dayIdx = () => Math.floor(Date.now() / 86400000);
    function newGame(isDaily) { daily = isDaily; target = isDaily ? WORDS[dayIdx() % WORDS.length] : WORDS[Math.floor(Math.random() * WORDS.length)]; guesses = []; cur = ''; done = false; if (isDaily) { const s = Store.get('win11.wordl', {}); if (s.day === dayIdx() && s.guesses) { guesses = s.guesses; done = guesses.includes(target) || guesses.length >= 6; } } render(); }
    win.body.innerHTML = `<div class="wd-root"><div class="app-toolbar"><button class="fluent-btn subtle wd-daily">Daily</button><button class="fluent-btn subtle wd-random">Practice</button><span class="wd-stat" style="margin-left:auto;font-size:12px;color:var(--text-2)"></span></div><div class="wd-grid" tabindex="0"></div><div class="wd-msg"></div><div class="wd-kb">${['qwertyuiop', 'asdfghjkl', '⏎zxcvbnm⌫'].map(r => `<div>${[...r].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>`).join('')}</div></div>`;
    const grid = win.body.querySelector('.wd-grid'), msg = win.body.querySelector('.wd-msg');
    const color = (g, i) => { if (g[i] === target[i]) return 'g'; const tc = [...target].filter((ch, j) => ch === g[i] && g[j] !== target[j]).length; const before = [...g.slice(0, i)].filter((ch, j) => ch === g[i] && g[j] !== target[j]).length; return tc > before ? 'y' : 'x'; };
    function render() {
      const rows = [];
      for (let r = 0; r < 6; r++) { const g = guesses[r] || (r === guesses.length ? cur : ''); rows.push(`<div class="wd-row">${[0, 1, 2, 3, 4].map(i => `<div class="wd-cell ${guesses[r] ? color(g, i) : g[i] ? 'fill' : ''}">${g[i] || ''}</div>`).join('')}</div>`); }
      grid.innerHTML = rows.join('');
      const kbState = {}; guesses.forEach(g => [...g].forEach((ch, i) => { const c = color(g, i); if (c === 'g' || (c === 'y' && kbState[ch] !== 'g') || !kbState[ch]) kbState[ch] = c; }));
      win.body.querySelectorAll('.wd-kb button').forEach(b => { b.className = kbState[b.dataset.k] || ''; });
      const s = Store.get('win11.wordl', {});
      win.body.querySelector('.wd-stat').textContent = (daily ? 'Daily #' + (dayIdx() % WORDS.length) : 'Practice') + (s.streak ? ' • streak ' + s.streak : '');
      if (done) msg.innerHTML = guesses.includes(target) ? `🎉 Got it in ${guesses.length}! <button class="fluent-btn subtle wd-share">Share</button>` : `The word was <b>${target.toUpperCase()}</b>. <button class="fluent-btn subtle wd-share">Share</button>`; else msg.textContent = '';
      const sh = msg.querySelector('.wd-share'); if (sh) sh.addEventListener('click', () => { const txt = 'Wordl ' + (daily ? '#' + (dayIdx() % WORDS.length) : 'practice') + ' ' + (guesses.includes(target) ? guesses.length : 'X') + '/6\n' + guesses.map(g => [0, 1, 2, 3, 4].map(i => ({ g: '🟩', y: '🟨', x: '⬛' })[color(g, i)]).join('')).join('\n'); navigator.clipboard && navigator.clipboard.writeText(txt).catch(() => {}); ClipHistory.push(txt); Shell.toast('Wordl', 'Result copied to the clipboard.', '🟩'); });
    }
    function submit() {
      if (done || cur.length !== 5) return;
      if (!WORDS.includes(cur)) { msg.textContent = 'Not in word list'; grid.classList.add('shake'); setTimeout(() => grid.classList.remove('shake'), 400); return; }
      guesses.push(cur); cur = '';
      if (guesses.includes(target) || guesses.length >= 6) { done = true; if (guesses.includes(target)) { Achievements.unlock('wordl'); blip(88, 0.2); Party.confetti(2); } else blip(40, 0.4); }
      if (daily) { const s = Store.get('win11.wordl', {}); if (done && s.day !== dayIdx()) { s.streak = guesses.includes(target) ? (s.lastWin === dayIdx() - 1 ? (s.streak || 0) + 1 : 1) : 0; if (guesses.includes(target)) s.lastWin = dayIdx(); } s.day = dayIdx(); s.guesses = guesses; Store.set('win11.wordl', s); }
      render();
    }
    const key = k => { if (done) return; if (k === '⏎' || k === 'Enter') submit(); else if (k === '⌫' || k === 'Backspace') { cur = cur.slice(0, -1); render(); } else if (/^[a-z]$/.test(k) && cur.length < 5) { cur += k; render(); } };
    grid.addEventListener('keydown', e => { key(e.key.toLowerCase() === 'enter' ? 'Enter' : e.key === 'Backspace' ? 'Backspace' : e.key.toLowerCase()); if (e.key.length === 1 || e.key === 'Backspace') e.preventDefault(); });
    win.body.querySelector('.wd-kb').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { key(b.dataset.k); grid.focus(); } });
    win.body.querySelector('.wd-daily').addEventListener('click', () => newGame(true));
    win.body.querySelector('.wd-random').addEventListener('click', () => newGame(false));
    newGame(true);
    setTimeout(() => grid.focus(), 100);
  }
});

/* ---------- Terminal: edit / nano ---------- */
Object.assign(FunCmds, {
  edit(print, arg, win) { if (!arg) { print('Usage: edit <file>'); return; } const p = /^c:/i.test(arg) ? arg.replace(/\\/g, '/') : (win._termCwd || HOME) + '/' + arg; if (!FS.get(p)) FS.write(p, '', 'text/plain'); Apps.launch('notepad', { path: p }); print('Opening ' + p.split('/').pop() + ' in Notepad…'); },
  nano(print, arg, win) { FunCmds.edit(print, arg, win); },
  zip(print, arg, win) { if (!arg) { print('Usage: zip <folder or file>'); return; } const p = /^c:/i.test(arg) ? arg.replace(/\\/g, '/') : (win._termCwd || HOME) + '/' + arg; if (!FS.get(p)) { print('Not found: ' + arg); return; } Zip.compress(p).then(r => print('Created ' + r.name + ' (' + r.count + ' files, ' + Utils.fmtBytes(r.size) + ')')).catch(e => print('zip: ' + e.message)); },
  unzip(print, arg, win) { if (!arg) { print('Usage: unzip <file.zip>'); return; } const p = /^c:/i.test(arg) ? arg.replace(/\\/g, '/') : (win._termCwd || HOME) + '/' + arg; if (!FS.get(p)) { print('Not found: ' + arg); return; } Zip.extract(p, p.replace(/\.zip$/i, '')).then(n => print('Extracted ' + n + ' file(s).')).catch(e => print('unzip: ' + e.message)); }
});
