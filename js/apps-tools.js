/* ============ Windows 11 Web — tools: timers & alarms, system sounds, lock-screen info,
   accessibility (text size, high contrast), Snipping Tool ============ */
'use strict';

Achievements.list.push(
  { id: 'snip', name: 'Say Cheese, Desktop', desc: 'Took a screenshot with Win+Shift+S.', icon: '✂️', pts: 10 },
  { id: 'timer', name: 'Egg Timer', desc: 'A timer or alarm went off.', icon: '⏲️', pts: 5 },
  { id: 'sweeper-expert', name: 'Expert Sweeper', desc: 'Won Minesweeper on Expert.', icon: '🏅', pts: 40 }
);

/* ---------- Timers & alarms (global, keep running with the Clock app closed) ---------- */
const Timers = {
  KEY: 'win11.alarms',
  list: [], // { id, label, end }
  ring(label) {
    Achievements.unlock('timer');
    Shell.toast('Clock', label + ' — time\'s up!', '⏰');
    try { [[79, 0], [84, 150], [79, 300], [84, 450], [88, 700]].forEach(([m, t]) => setTimeout(() => Synth.note(m, 0.35, 'square'), t)); } catch (e) {}
  },
  add(seconds, label) {
    const t = { id: Date.now() + Math.random(), label: label || 'Timer', end: Date.now() + seconds * 1000, total: seconds };
    this.list.push(t); Bus.emit('timers:changed'); return t;
  },
  cancel(id) { this.list = this.list.filter(t => t.id !== id); Bus.emit('timers:changed'); },
  alarms() { return Store.get(this.KEY, []); },
  saveAlarms(a) { Store.set(this.KEY, a); Bus.emit('timers:changed'); },
  addAlarm(time, label) { const a = this.alarms(); a.push({ id: Date.now(), time, label: label || 'Alarm', on: true }); this.saveAlarms(a); },
  tick() {
    const now = Date.now();
    this.list.filter(t => t.end <= now).forEach(t => { this.ring(t.label); });
    if (this.list.some(t => t.end <= now)) { this.list = this.list.filter(t => t.end > now); Bus.emit('timers:changed'); }
    const hm = new Date().toTimeString().slice(0, 5);
    if (hm !== this._lastMin) {
      this._lastMin = hm;
      this.alarms().filter(a => a.on && a.time === hm).forEach(a => this.ring(a.label + ' (' + a.time + ')'));
    }
  }
};
setInterval(() => Timers.tick(), 1000);
const parseDuration = s => { let sec = 0; const m = String(s).match(/(\d+)\s*(h|hour|hr|m|min|minute|s|sec|second)/gi); if (!m) return +s > 0 ? +s * 60 : 0; m.forEach(x => { const [, n, u] = x.match(/(\d+)\s*([a-z]+)/i); sec += +n * (/^h/i.test(u) ? 3600 : /^m/i.test(u) ? 60 : 1); }); return sec; };

/* ---------- System sounds ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const toast = Shell.toast.bind(Shell);
  Shell.toast = function (title, body, icon) {
    if (Settings.get('sounds') !== false && !/^Achievement/.test(title)) { try { Synth.note(84, 0.12, 'sine'); setTimeout(() => Synth.note(91, 0.18, 'sine'), 90); } catch (e) {} }
    return toast(title, body, icon);
  };
});

/* ---------- Lock screen info (weather, agenda, unread) ---------- */
const LockInfo = {
  html() {
    const bits = [];
    const w = typeof Weather !== 'undefined' && Weather.snapshot();
    if (w) bits.push(`<span>${Weather.desc(w.now.code)[0]} ${Weather.fmt(w.now.temp)}${Weather.unit()} · ${Utils.esc(w.loc)}</span>`);
    if (typeof CalendarStore !== 'undefined') { const e = CalendarStore.upcoming(1)[0]; if (e) bits.push(`<span>📅 ${Utils.esc(e.title)}${e.time ? ' at ' + e.time : ''}</span>`); }
    const mail = Store.get('win11.mail', null); if (mail) { const n = mail.filter(m => m.folder === 'inbox' && !m.read).length; if (n) bits.push(`<span>📧 ${n} unread</span>`); }
    if (typeof Notifications !== 'undefined' && Notifications.items.length) bits.push(`<span>🔔 ${Notifications.items.length}</span>`);
    return bits.join('');
  }
};

/* ---------- Accessibility: text size, high contrast ---------- */
const Access = {
  apply() {
    const z = +Settings.get('textScale') || 1;
    document.documentElement.style.zoom = z === 1 ? '' : String(z);
    document.documentElement.classList.toggle('hc', !!Settings.get('highContrast'));
  }
};
Bus.on('settings:textScale', () => Access.apply());
Bus.on('settings:highContrast', () => Access.apply());
document.addEventListener('DOMContentLoaded', () => Access.apply());

/* ---------- Snipping Tool: DOM → SVG foreignObject → canvas → JPEG in Pictures/Screenshots ---------- */
const Snip = {
  busy: false,
  async capture() {
    if (this.busy) return;
    this.busy = true;
    try {
      const W = innerWidth, H = innerHeight;
      const css = await fetch('css/win11.css').then(r => r.text()).catch(() => '');
      const root = document.documentElement.cloneNode(true);
      // canvases don't clone their pixels: swap each for an <img> of its current bitmap
      const live = [...document.querySelectorAll('canvas')], cloned = [...root.querySelectorAll('canvas')];
      cloned.forEach((c, i) => { try { const img = document.createElement('img'); img.setAttribute('src', live[i].toDataURL('image/png')); img.setAttribute('style', c.getAttribute('style') || ''); img.setAttribute('class', c.className); img.style.width = live[i].clientWidth + 'px'; img.style.height = live[i].clientHeight + 'px'; c.replaceWith(img); } catch (e) { c.remove(); } });
      root.querySelectorAll('script, iframe, video, #boot, .snip-flash').forEach(el => el.remove());
      root.querySelectorAll('input, textarea').forEach((el, i) => { const src = [...document.querySelectorAll('input, textarea')][i]; if (src && src.type !== 'file') { if (src.tagName === 'TEXTAREA') el.textContent = src.value; else el.setAttribute('value', src.value); } });
      root.querySelectorAll('select').forEach((el, i) => { const src = [...document.querySelectorAll('select')][i]; if (src) [...el.options].forEach((o, j) => j === src.selectedIndex ? o.setAttribute('selected', '') : o.removeAttribute('selected')); });
      const html = new XMLSerializer().serializeToString(root).replace(/&nbsp;/g, ' ');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%"><style>${css.replace(/&/g, '&amp;').replace(/</g, '&lt;')} *, *::before, *::after { animation: none !important; transition: none !important; }</style>${html}</foreignObject></svg>`;
      const perr = new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror');
      if (perr) throw new Error('markup not well-formed');
      const img = new Image();
      const loaded = new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('render failed')); setTimeout(() => rej(new Error('timed out')), 6000); });
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await loaded;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.drawImage(img, 0, 0, W, H);
      let data;
      try { data = c.toDataURL('image/jpeg', 0.85); } catch (e) { throw new Error('canvas tainted'); }
      if (data.length > 1.4 * 1048576) data = c.toDataURL('image/jpeg', 0.6);
      const dir = HOME + '/Pictures/Screenshots';
      if (!FS.get(dir)) FS.mkdir(dir);
      const now = new Date();
      const name = FS.uniqueName(dir, 'Screenshot ' + now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8).replace(/:/g, '-'), '.jpg');
      FS.write(dir + '/' + name, data, 'image/jpeg');
      const flash = Utils.el('div', 'snip-flash'); document.body.appendChild(flash); setTimeout(() => flash.remove(), 400);
      try { Synth.note(96, 0.05, 'square'); } catch (e) {}
      Achievements.unlock('snip');
      Shell.toast('Snipping Tool', 'Saved to Pictures › Screenshots as ' + name + '. Click to open.', '✂️');
      const t = document.querySelector('#notif-layer .toast:last-child'); if (t) t.addEventListener('click', () => Apps.launch('photos', { path: dir + '/' + name }), { once: true });
    } catch (e) {
      Shell.toast('Snipping Tool', 'Couldn\'t capture the screen in this browser (' + e.message + '). Chrome and Edge work best.', '✂️');
    } finally { this.busy = false; }
  }
};
document.addEventListener('keydown', e => { if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); Snip.capture(); } });
Object.assign(FunCmds, {
  snip(print) { print('Say cheese…'); setTimeout(() => Snip.capture(), 300); },
  timer(print, arg) { const s = parseDuration(arg); if (!s) { print('Usage: timer 5m | timer 90s | timer 1h 30m'); return; } Timers.add(s, 'Timer (' + arg + ')'); print('Timer set for ' + Utils.fmtTime(s) + '.'); },
  alarm(print, arg) { const m = String(arg).match(/^(\d{1,2}):(\d{2})/); if (!m) { print('Usage: alarm 07:30 [label]'); return; } const hm = m[1].padStart(2, '0') + ':' + m[2]; Timers.addAlarm(hm, arg.slice(m[0].length).trim() || 'Alarm'); print('Alarm set for ' + hm + '.'); }
});
