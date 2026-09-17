/* ============ Windows 11 Web — more: Solitaire, virtual desktops + Task View, snap layouts,
   notification center, Widgets, Spotlight wallpaper, Matrix screensaver, emoji picker,
   Camera, Neko, accounts & accessibility, window animations ============ */
'use strict';

Achievements.list.push(
  { id: 'solitaire', name: 'Deal With It', desc: 'Won a game of Solitaire.', icon: '🃏', pts: 30 },
  { id: 'multitasker', name: 'Multitasker', desc: 'Created a second virtual desktop.', icon: '🗔', pts: 10 },
  { id: 'photographer', name: 'Say Cheese', desc: 'Took a photo with the Camera app.', icon: '📸', pts: 15 },
  { id: 'cat-person', name: 'Cat Person', desc: 'Petted Neko.', icon: '🐈', pts: 10 },
  { id: 'snapper', name: 'Snap Decision', desc: 'Used Snap Layouts.', icon: '🪟', pts: 5 },
  { id: 'emoji', name: 'Wordless', desc: 'Inserted an emoji with Win+.', icon: '😎', pts: 5 }
);

/* ---------- window animations + snap layouts (wraps WM.create) ---------- */
(() => {
  const create = WM.create.bind(WM);
  const LAYOUTS = [
    { name: 'Left half', cells: [[0, 0, .5, 1], [.5, 0, .5, 1]], pick: 0 },
    { name: 'Right half', cells: [[0, 0, .5, 1], [.5, 0, .5, 1]], pick: 1 },
    { name: 'Left third', cells: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]], pick: 0 },
    { name: 'Middle third', cells: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]], pick: 1 },
    { name: 'Right third', cells: [[0, 0, 1 / 3, 1], [1 / 3, 0, 1 / 3, 1], [2 / 3, 0, 1 / 3, 1]], pick: 2 },
    { name: 'Top left', cells: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]], pick: 0 },
    { name: 'Top right', cells: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]], pick: 1 },
    { name: 'Bottom left', cells: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]], pick: 2 },
    { name: 'Bottom right', cells: [[0, 0, .5, .5], [.5, 0, .5, .5], [0, .5, .5, .5], [.5, .5, .5, .5]], pick: 3 }
  ];
  let popup = null, hideT = null;
  function hidePopup() { if (popup) { popup.remove(); popup = null; } }
  WM.create = function (app) {
    const win = create(app);
    win.desk = Desktops.cur;
    win.focus(); // re-run with the desktop assigned so the taskbar and focus ring see it
    win.setRect = (x, y, w, h) => {
      if (win.maxed) win.toggleMax();
      win._restoreRect = { x: win.el.offsetLeft, y: win.el.offsetTop, w: win.el.offsetWidth, h: win.el.offsetHeight };
      win.el.style.left = x + 'px'; win.el.style.top = y + 'px'; win.el.style.width = w + 'px'; win.el.style.height = h + 'px';
      Bus.emit('wm:changed');
    };
    const origMin = win.minimize, origRestore = win.restore;
    win.minimize = () => {
      if (win.minimized) return;
      win.el.classList.add('minimizing');
      setTimeout(() => { win.el.classList.remove('minimizing'); origMin(); }, 160);
    };
    win.restore = () => {
      const was = win.minimized;
      origRestore();
      if (was) { win.el.classList.add('restoring'); setTimeout(() => win.el.classList.remove('restoring'), 220); }
    };
    // snap layouts flyout on hover over the maximize button
    const maxBtn = win.el.querySelector('.wc-max');
    let showT = null;
    maxBtn.addEventListener('mouseenter', () => {
      clearTimeout(hideT);
      showT = setTimeout(() => {
        hidePopup();
        popup = Utils.el('div', 'snap-layouts');
        popup.innerHTML = LAYOUTS.map((l, i) => `<div class="sl-opt" data-i="${i}" title="${l.name}">${l.cells.map((c, j) => `<i class="${j === l.pick ? 'pick' : ''}" style="left:${c[0] * 100}%;top:${c[1] * 100}%;width:${c[2] * 100}%;height:${c[3] * 100}%"></i>`).join('')}</div>`).join('');
        document.body.appendChild(popup);
        const r = maxBtn.getBoundingClientRect();
        popup.style.left = Math.max(8, Math.min(r.left + r.width / 2 - popup.offsetWidth / 2, innerWidth - popup.offsetWidth - 8)) + 'px';
        popup.style.top = (r.bottom + 4) + 'px';
        popup.addEventListener('mouseenter', () => clearTimeout(hideT));
        popup.addEventListener('mouseleave', () => { hideT = setTimeout(hidePopup, 250); });
        popup.addEventListener('click', e => {
          const o = e.target.closest('.sl-opt');
          if (!o) return;
          const l = LAYOUTS[+o.dataset.i], c = l.cells[l.pick];
          const W = innerWidth, H = innerHeight - 48;
          win.setRect(Math.round(c[0] * W), Math.round(c[1] * H), Math.round(c[2] * W), Math.round(c[3] * H));
          win.restore(); win.focus();
          Achievements.unlock('snapper');
          hidePopup();
        });
      }, 350);
    });
    maxBtn.addEventListener('mouseleave', () => { clearTimeout(showT); hideT = setTimeout(hidePopup, 350); });
    win.onClose(hidePopup);
    return win;
  };
})();

/* ---------- Virtual desktops + Task View ---------- */
const Desktops = {
  cur: 0, count: 1,
  all() { return [...WM._wins.values()]; },
  switch(i) {
    if (i < 0 || i >= this.count) return;
    this.cur = i;
    this.all().forEach(w => w.el.classList.toggle('other-desk', (w.desk || 0) !== i));
    const top = WM.focused();
    this.all().forEach(w => w.el.classList.toggle('focused', w === top));
    Shell.closeFlyouts();
    Bus.emit('wm:changed');
    Bus.emit('desktops:changed');
  },
  add() {
    this.count++;
    Achievements.unlock('multitasker');
    this.switch(this.count - 1);
  },
  remove(i) {
    if (this.count <= 1) return;
    this.all().forEach(w => { if ((w.desk || 0) === i) w.desk = 0; else if ((w.desk || 0) > i) w.desk--; });
    this.count--;
    this.switch(Math.min(this.cur, this.count - 1) === i ? 0 : Math.min(this.cur > i ? this.cur - 1 : this.cur, this.count - 1));
  },
  move(win, i) { win.desk = i; this.switch(this.cur); }
};
WM.allDesks = () => [...WM._wins.values()];
WM.all = () => WM.allDesks().filter(w => (w.desk || 0) === Desktops.cur);

const TaskView = {
  el: null,
  toggle() { this.el ? this.close() : this.open(); },
  open() {
    if (this.el) return;
    Shell.closeFlyouts();
    this.el = Utils.el('div', 'task-view');
    document.body.appendChild(this.el);
    this.render();
    this.el.addEventListener('click', e => {
      const t = e.target;
      if (t.closest('.tv-new')) { Desktops.add(); this.render(); return; }
      const dclose = t.closest('.tv-desk-close');
      if (dclose) { e.stopPropagation(); Desktops.remove(+dclose.dataset.i); this.render(); return; }
      const d = t.closest('.tv-desk');
      if (d) { Desktops.switch(+d.dataset.i); this.render(); return; }
      const w = t.closest('.tv-win');
      if (w) {
        const wclose = t.closest('.tv-win-close');
        const win = WM.allDesks().find(x => x.id === w.dataset.id);
        if (!win) return;
        if (wclose) { win.close(); this.render(); return; }
        this.close(); win.restore(); win.focus(); return;
      }
      if (t === this.el) this.close();
    });
    this.el.addEventListener('contextmenu', e => {
      const w = e.target.closest('.tv-win');
      if (!w) return;
      e.preventDefault();
      const win = WM.allDesks().find(x => x.id === w.dataset.id);
      if (!win) return;
      const items = [];
      for (let i = 0; i < Desktops.count; i++) if (i !== Desktops.cur) items.push({ label: 'Move to Desktop ' + (i + 1), icon: '🗔', fn: () => { Desktops.move(win, i); this.render(); } });
      items.push({ label: 'Move to new desktop', icon: '➕', fn: () => { Desktops.count++; Desktops.move(win, Desktops.count - 1); this.render(); } });
      items.push({ sep: true }, { label: 'Close', icon: '✕', fn: () => { win.close(); this.render(); } });
      Shell.contextMenu(e.clientX, e.clientY, items);
    });
  },
  render() {
    if (!this.el) return;
    const wins = WM.all();
    this.el.innerHTML = `
      <div class="tv-wins">${wins.length ? wins.map(w => `
        <div class="tv-win ${w.minimized ? 'min' : ''}" data-id="${w.id}">
          <div class="tv-win-head">${appTileHTML(w.app, 'sm')}<span>${Utils.esc(w.getTitle())}</span><button class="tv-win-close" title="Close">✕</button></div>
          <div class="tv-win-body" style="background:${w.app.color || '#5c6bc0'}">${w.app.icon}</div>
        </div>`).join('') : '<div class="tv-empty">No open windows on this desktop. Right-click a window on another desktop to move it here.</div>'}</div>
      <div class="tv-desks">
        ${Array.from({ length: Desktops.count }, (_, i) => `
          <div class="tv-desk ${i === Desktops.cur ? 'sel' : ''}" data-i="${i}">
            <div class="tv-desk-thumb">${WM.allDesks().filter(w => (w.desk || 0) === i).slice(0, 6).map(w => appTileHTML(w.app, 'sm')).join('')}</div>
            <div class="tv-desk-name">Desktop ${i + 1}${Desktops.count > 1 ? `<button class="tv-desk-close" data-i="${i}" title="Close desktop">✕</button>` : ''}</div>
          </div>`).join('')}
        <div class="tv-desk tv-new"><div class="tv-desk-thumb">➕</div><div class="tv-desk-name">New desktop</div></div>
      </div>`;
  },
  close() { if (this.el) { this.el.remove(); this.el = null; } }
};
document.addEventListener('keydown', e => {
  if (e.metaKey && e.key === 'Tab') { e.preventDefault(); TaskView.toggle(); }
  else if (TaskView.el && e.key === 'Escape') TaskView.close();
  else if (e.ctrlKey && e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    Desktops.switch(Desktops.cur + (e.key === 'ArrowRight' ? 1 : -1));
    if (TaskView.el) TaskView.render();
  } else if (e.ctrlKey && e.metaKey && e.key.toLowerCase() === 'd') { e.preventDefault(); Desktops.add(); }
});
Bus.on('wm:changed', () => { if (TaskView.el) TaskView.render(); });

/* ---------- Notification center (inside the clock flyout) ---------- */
const Notifications = {
  items: [],
  render() {
    let box = document.getElementById('notif-center');
    if (!box) {
      box = Utils.el('div'); box.id = 'notif-center';
      document.getElementById('calendar-flyout').prepend(box);
      box.addEventListener('click', e => {
        if (e.target.closest('.nc-clear')) { this.items = []; this.render(); }
        const it = e.target.closest('.nc-item');
        if (it) { this.items.splice(+it.dataset.i, 1); this.render(); }
      });
    }
    box.innerHTML = this.items.length
      ? `<div class="nc-head"><span>Notifications</span><button class="nc-clear">Clear all</button></div>` +
        this.items.map((n, i) => `<div class="nc-item" data-i="${i}" title="Click to dismiss"><span class="nc-ico">${n.icon}</span><div><div class="nc-t">${Utils.esc(n.title)}</div><div class="nc-b">${Utils.esc(n.body)}</div></div><span class="nc-time">${n.t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>`).join('')
      : `<div class="nc-head"><span>Notifications</span></div><div class="nc-empty">No new notifications</div>`;
  }
};
// Shell is defined in shell.js, which loads after this file: wrap it once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const toast = Shell.toast.bind(Shell);
  Shell.toast = function (title, body, icon) {
    Notifications.items.unshift({ title, body, icon: icon || '🔔', t: new Date() });
    if (Notifications.items.length > 30) Notifications.items.length = 30;
    if (Settings.get('narrator')) Narrator.say(title + '. ' + body);
    return toast(title, body, icon);
  };
  const renderCal = Shell.renderCalendar.bind(Shell);
  Shell.renderCalendar = function () { renderCal(); Notifications.render(); };
  const tb = document.getElementById('tb-weather');
  if (tb && !(typeof Weather !== 'undefined' && Weather.snapshot())) tb.textContent = Widgets.ICONS[new Date().getDay()] + ' ' + Widgets.TEMPS[new Date().getDay()] + '°F';
});

/* ---------- Widgets panel ---------- */
const Widgets = {
  el: null,
  NEWS_A: ['Local cat', 'Area developer', 'Browser tab', 'Paperclip', 'Small startup', 'Retired admin', 'Wandering penguin', 'Excel spreadsheet', 'Rogue AI', 'Lost USB stick'],
  NEWS_B: ['refuses to update', 'achieves sentience', 'declared employee of the month', 'found living in the Recycle Bin', 'wins Solitaire on first try', 'blames DNS', 'demands dark mode', 'discovered to be three raccoons in a trench coat', 'ships on a Friday', 'reaches 2048'],
  TEMPS: [68, 71, 72, 74, 69, 66, 70],
  ICONS: ['☀️', '⛅', '🌤️', '🌧️', '☀️', '🌩️', '🌥️'],
  NEWS_C: ['experts baffled', 'sources say', 'film at 11', 'more at the top of the hour', 'Clippy unavailable for comment', 'markets unmoved', 'again'],
  toggle() {
    if (!this.el) {
      this.el = Utils.el('div', 'shell-flyout'); this.el.id = 'widgets-panel';
      document.body.appendChild(this.el);
      this.el.addEventListener('click', e => {
        e.stopPropagation();
        const a = e.target.closest('[data-launch]');
        if (a) { this.el.classList.remove('open'); Apps.launch(a.dataset.launch); }
      });
    }
    const open = !this.el.classList.contains('open');
    Shell.closeFlyouts(this.el);
    if (open) this.render();
    this.el.classList.toggle('open', open);
  },
  render() {
    const rnd = Utils.rng(Math.floor(Date.now() / 3600000));
    const pick = a => a[Math.floor(rnd() * a.length)];
    const news = Array.from({ length: 5 }, () => `${pick(this.NEWS_A)} ${pick(this.NEWS_B)}, ${pick(this.NEWS_C)}`);
    const todo = Store.get('win11.todo', []).filter(t => !t.done).slice(0, 4);
    const pics = FS.list(HOME + '/Pictures').filter(f => f.node.type === 'file' && /\.(png|jpe?g|svg|gif|webp)$/i.test(f.name));
    const pic = pics.length ? pics[Math.floor(rnd() * pics.length)] : null;
    const temps = this.TEMPS.slice(), icons = this.ICONS.slice();
    const wx = typeof Weather !== 'undefined' && Weather.snapshot();
    if (wx) { const d0 = new Date().getDay(); wx.days.slice(0, 7).forEach((x, i) => { temps[(d0 + i) % 7] = Math.round(x.hi); icons[(d0 + i) % 7] = Weather.desc(x.code)[0]; }); temps[d0] = Math.round(wx.now.temp); icons[d0] = Weather.desc(wx.now.code)[0]; }
    const day = new Date().getDay();
    const now = new Date();
    this.el.innerHTML = `
      <div class="wg-head"><div class="wg-time">${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div><div class="wg-date">${now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</div></div>
      <div class="wg-grid">
        <div class="wg-card" data-launch="${Apps.isInstalled('weather') ? 'weather' : 'store'}"><div class="wg-title">Weather • ${wx ? Utils.esc(wx.loc) : 'Webville'}</div><div class="wg-weather"><span class="wg-big">${icons[day]}</span><div><div class="wg-temp">${temps[day]}°${wx ? Weather.unit() : 'F'}</div><div class="wg-sub">${wx ? Weather.desc(wx.now.code)[1] + ' • Wind ' + Math.round(wx.now.wind) + ' mph' : 'Feels like ' + (temps[day] - 2) + '° • Mostly fine'}</div></div></div>
          <div class="wg-days">${[1, 2, 3, 4].map(i => `<div><div>${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(day + i) % 7]}</div><div>${icons[(day + i) % 7]}</div><div>${temps[(day + i) % 7]}°</div></div>`).join('')}</div></div>
        <div class="wg-card" data-launch="${Apps.isInstalled('todo') ? 'todo' : 'store'}"><div class="wg-title">To Do</div>${todo.length ? todo.map(t => `<div class="wg-todo">☐ ${Utils.esc(t.text)}</div>`).join('') : '<div class="wg-sub">Nothing pending. Install Microsoft To Do to add tasks.</div>'}</div>
        <div class="wg-card wg-news"><div class="wg-title">Top stories • MSN-ish</div>${news.map(n => `<div class="wg-headline">${Utils.esc(n)}</div>`).join('')}</div>
        <div class="wg-card" data-launch="photos"><div class="wg-title">Photos • Memories</div>${pic ? `<div class="wg-photo" style="background-image:url('${pic.node.content}')"></div><div class="wg-sub">${Utils.esc(pic.name)}</div>` : '<div class="wg-sub">No photos yet.</div>'}</div>
        <div class="wg-card" data-launch="calendar"><div class="wg-title">Calendar</div>${(typeof CalendarStore !== 'undefined' && CalendarStore.upcoming(3).length) ? CalendarStore.upcoming(3).map(e => `<div class="wg-todo">📅 ${new Date(e.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}${e.time ? ' ' + e.time : ''} — ${Utils.esc(e.title)}</div>`).join('') : '<div class="wg-sub">Nothing scheduled. Open Calendar to add an event.</div>'}</div>
        <div class="wg-card" data-launch="xbox"><div class="wg-title">Xbox</div><div class="wg-weather"><span class="wg-big">🏆</span><div><div class="wg-temp">${Achievements.score()} G</div><div class="wg-sub">${Object.keys(Achievements.unlocked()).length} of ${Achievements.list.length} achievements</div></div></div></div>
        <div class="wg-card" data-launch="taskmgr"><div class="wg-title">System</div><div class="wg-sub">${WM.allDesks().length} windows • ${Desktops.count} desktop${Desktops.count > 1 ? 's' : ''} • ${Apps.visible().length} apps</div><div class="wg-sub">Up ${Math.floor(performance.now() / 60000)} min</div></div>
      </div>`;
  }
};

/* ---------- Windows Spotlight: procedural wallpaper, new every day ---------- */
(() => {
  let cache = null, cacheDay = null;
  function generate() {
    const day = new Date().toDateString();
    if (cache && cacheDay === day) return cache;
    const W = 1600, H = 900, c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const rnd = Utils.rng(Math.floor(Date.now() / 86400000));
    const hue = Math.floor(rnd() * 360);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `hsl(${hue},70%,18%)`); g.addColorStop(.5, `hsl(${(hue + 40) % 360},65%,35%)`); g.addColorStop(1, `hsl(${(hue + 90) % 360},70%,15%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 9; i++) {
      const x = rnd() * W, y = rnd() * H, r = 150 + rnd() * 450;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, `hsla(${(hue + rnd() * 120) % 360},90%,${55 + rnd() * 25}%,${.35 + rnd() * .35})`);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      const y0 = rnd() * H;
      ctx.moveTo(-50, y0);
      for (let x = 0; x <= W + 100; x += 100) ctx.quadraticCurveTo(x + 50, y0 + (rnd() - .5) * 500, x + 100, y0 + (rnd() - .5) * 300);
      ctx.lineTo(W + 100, H + 50); ctx.lineTo(-50, H + 50); ctx.closePath();
      ctx.fillStyle = `hsla(${(hue + 180 + i * 30) % 360},80%,60%,.12)`; ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,255,255,${rnd() * .6})`; const s = rnd() * 2.2; ctx.fillRect(rnd() * W, rnd() * H * .7, s, s); }
    cache = c.toDataURL('image/jpeg', .82); cacheDay = day;
    return cache;
  }
  const uri = Wallpapers.uri.bind(Wallpapers);
  Wallpapers.uri = id => id === 'spotlight' ? generate() : uri(id);
  Wallpapers.ids.push('spotlight');
  Wallpapers.names.spotlight = 'Windows Spotlight (daily)';
})();

/* ---------- Matrix screensaver plugin ---------- */
Screensaver.styles.matrix = 'Matrix';
Screensaver.plugins = {
  matrix(ctx, c) {
    const fs = 16;
    let cols = [];
    const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789ABCDEFXYZ<>{}[]=+*/';
    return () => {
      const n = Math.ceil(c.width / fs);
      if (cols.length !== n) cols = Array.from({ length: n }, () => Math.random() * -50);
      ctx.fillStyle = 'rgba(0,0,0,.07)'; ctx.fillRect(0, 0, c.width, c.height);
      ctx.font = fs + 'px monospace';
      cols.forEach((y, i) => {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillStyle = '#b6ffb6'; ctx.fillText(ch, i * fs, y * fs);
        ctx.fillStyle = '#0f0'; ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * fs, (y - 1) * fs);
        cols[i] = y * fs > c.height && Math.random() > .975 ? 0 : y + 1;
      });
    };
  }
};

/* ---------- Emoji picker (Win+. / Win+;) ---------- */
const EmojiPicker = {
  el: null, target: null,
  SETS: {
    '😀': '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😍 🤩 😘 😜 🤔 🤨 😐 😏 😒 🙄 😬 🤯 😎 🥳 😭 😡 🥺 😴 🤖 👻 💀 👽 🤡 💩'.split(' '),
    '👋': '👋 🤚 ✋ 🖖 👌 🤌 ✌️ 🤞 🤟 🤘 👍 👎 👊 🙌 👏 🙏 💪 🫶 ❤️ 🧡 💛 💚 💙 💜 🖤 💯 🔥 ✨ ⭐ 🎉 🎊 🎈'.split(' '),
    '🐶': '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🦄 🐝 🦋 🐌 🐢 🐍 🦖 🐙 🦀 🐟 🐬 🦈 🐈 🦉'.split(' '),
    '🍕': '🍕 🍔 🍟 🌭 🍿 🧀 🥚 🥞 🧇 🍗 🌮 🌯 🍜 🍣 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍦 ☕ 🍵 🧃 🍺 🍷 🥤'.split(' '),
    '⚽': '⚽ 🏀 🏈 ⚾ 🎾 🏐 🎱 🏓 🏸 🥊 🎯 🎮 🕹️ 🎲 🧩 🎨 🎬 🎤 🎧 🎸 🎹 🥁 🏆 🥇 🎪 🚀 ✈️ 🚗'.split(' '),
    '💻': '💻 🖥️ 🖨️ ⌨️ 🖱️ 💾 💿 📀 📱 ☎️ 📷 📸 🔋 🔌 💡 🔦 🧲 🔧 🔨 ⚙️ 🧰 🔒 🔑 📎 📌 ✂️ 📁 📂 📄 📊 📈 🗑️'.split(' ')
  },
  toggle() {
    if (this.el) { this.close(); return; }
    this.target = document.activeElement;
    this.el = Utils.el('div', 'emoji-picker');
    document.body.appendChild(this.el);
    const recent = Store.get('win11.emoji.recent', []);
    let tab = recent.length ? 'recent' : Object.keys(this.SETS)[0];
    const render = () => {
      const list = tab === 'recent' ? recent : this.SETS[tab];
      this.el.innerHTML = `<div class="ep-tabs">${recent.length ? `<button class="${tab === 'recent' ? 'sel' : ''}" data-t="recent">🕒</button>` : ''}${Object.keys(this.SETS).map(k => `<button class="${tab === k ? 'sel' : ''}" data-t="${k}">${k}</button>`).join('')}</div><div class="ep-grid">${list.map(e => `<span>${e}</span>`).join('')}</div>`;
    };
    render();
    this.el.addEventListener('click', e => {
      e.stopPropagation();
      const t = e.target.closest('[data-t]');
      if (t) { tab = t.dataset.t; render(); return; }
      const s = e.target.closest('.ep-grid span');
      if (s) this.insert(s.textContent);
    });
    // position near the focused field, else center-bottom
    const r = this.target && this.target !== document.body ? this.target.getBoundingClientRect() : null;
    const x = r ? Utils.clamp(r.left, 8, innerWidth - 330) : innerWidth / 2 - 160;
    const y = r ? (r.bottom + 260 < innerHeight ? r.bottom + 6 : Math.max(8, r.top - 270)) : innerHeight - 340;
    this.el.style.left = x + 'px'; this.el.style.top = y + 'px';
    setTimeout(() => document.addEventListener('pointerdown', this._outside = ev => { if (!ev.target.closest('.emoji-picker')) this.close(); }), 0);
  },
  insert(em) {
    const recent = Store.get('win11.emoji.recent', []).filter(x => x !== em);
    recent.unshift(em); Store.set('win11.emoji.recent', recent.slice(0, 24));
    const t = this.target;
    this.close();
    Achievements.unlock('emoji');
    if (t && (t.matches('input, textarea') || t.isContentEditable)) {
      t.focus();
      if (!document.execCommand('insertText', false, em) && t.setRangeText) { t.setRangeText(em, t.selectionStart, t.selectionEnd, 'end'); t.dispatchEvent(new Event('input', { bubbles: true })); }
    } else {
      navigator.clipboard && navigator.clipboard.writeText(em).catch(() => {});
      Shell.toast('Emoji', em + ' copied to clipboard — click a text field first to insert directly.', em);
    }
  },
  close() { if (this.el) { this.el.remove(); this.el = null; document.removeEventListener('pointerdown', this._outside); } }
};
document.addEventListener('keydown', e => {
  if (e.metaKey && (e.key === '.' || e.key === ';')) { e.preventDefault(); EmojiPicker.toggle(); }
  else if (EmojiPicker.el && e.key === 'Escape') EmojiPicker.close();
});

/* ---------- Camera ---------- */
Apps.register({
  id: 'camera', name: 'Camera', icon: '📷', color: 'linear-gradient(135deg,#8e9eab,#3d4b5c)',
  category: 'Creativity', width: 720, height: 560, singleton: true,
  mount(win) {
    let stream = null, facing = 'user';
    win.body.innerHTML = `
      <div class="cam-root">
        <div class="cam-view"><video autoplay playsinline muted></video><div class="cam-msg"><div class="ph-ico">📷</div><div>Starting camera…</div></div><div class="cam-flash"></div></div>
        <div class="app-toolbar cam-bar">
          <select class="fluent-input cam-filter"><option value="none">No filter</option><option value="grayscale(1)">Noir</option><option value="sepia(.8)">Vintage</option><option value="saturate(2.2)">Vivid</option><option value="invert(1)">Negative</option><option value="hue-rotate(120deg)">Alien</option><option value="contrast(1.6) brightness(1.1)">Punchy</option><option value="blur(3px)">Dreamy</option></select>
          <button class="fluent-btn cam-snap">📸 Take photo</button>
          <button class="fluent-btn subtle cam-rec">⏺ Record</button>
          <button class="fluent-btn subtle cam-flip" title="Switch camera">🔄</button>
          <button class="fluent-btn subtle" data-launch="photos">🏞️ Photos</button>
        </div>
      </div>`;
    const video = win.body.querySelector('video');
    const msg = win.body.querySelector('.cam-msg');
    const filterSel = win.body.querySelector('.cam-filter');
    filterSel.addEventListener('change', () => { video.style.filter = filterSel.value === 'none' ? '' : filterSel.value; });
    function stop() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }
    function start() {
      stop();
      msg.style.display = '';
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg.innerHTML = '<div class="ph-ico">🚫</div><div>This browser has no camera API (or the page is not on HTTPS).</div>'; return; }
      navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false }).then(s => {
        if (!win.body.isConnected) { s.getTracks().forEach(t => t.stop()); return; }
        stream = s; video.srcObject = s; msg.style.display = 'none';
      }).catch(err => {
        msg.innerHTML = `<div class="ph-ico">🙈</div><div>Camera unavailable: ${Utils.esc(err.name === 'NotAllowedError' ? 'permission denied' : err.name === 'NotFoundError' ? 'no camera found' : err.message)}</div>`;
      });
    }
    win.body.querySelector('.cam-flip').addEventListener('click', () => { facing = facing === 'user' ? 'environment' : 'user'; start(); });
    let rec = null, recT = null, recStart = 0;
    const recBtn = win.body.querySelector('.cam-rec');
    recBtn.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      if (!stream || !window.MediaRecorder) { Shell.toast('Camera', 'No video feed to record.', '🎬'); return; }
      const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
      const chunks = [];
      try { rec = new MediaRecorder(stream, Object.assign({ videoBitsPerSecond: 500000 }, type ? { mimeType: type } : {})); } catch (e) { Shell.toast('Camera', 'Recording isn\'t supported here.', '🎬'); return; }
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        clearInterval(recT); recBtn.textContent = '⏺ Record'; recBtn.classList.remove('rec');
        const blob = new Blob(chunks, { type: rec.mimeType || 'video/webm' }); rec = null;
        const r = new FileReader();
        r.onload = () => {
          if (r.result.length > 1.4 * 1048576) { Shell.toast('Camera', 'Clip too large for browser storage (~1.4 MB). Keep it under ~15 seconds.', '⚠️'); return; }
          const dir = HOME + '/Videos'; if (!FS.get(dir)) FS.mkdir(dir);
          const now = new Date(); const name = FS.uniqueName(dir, 'Video ' + now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8).replace(/:/g, '-'), /mp4/.test(blob.type) ? '.mp4' : '.webm');
          FS.write(dir + '/' + name, r.result, blob.type); Achievements.unlock('director');
          Shell.toast('Camera', 'Saved to Videos as ' + name, '🎬');
        };
        r.readAsDataURL(blob);
      };
      rec.start(500); recStart = Date.now(); recBtn.classList.add('rec');
      recT = setInterval(() => { const s = Math.floor((Date.now() - recStart) / 1000); recBtn.textContent = '⏹ ' + Utils.fmtTime(s); if (s >= 20) rec.stop(); }, 250);
    });
    win.body.querySelector('[data-launch]').addEventListener('click', () => Apps.launch('photos'));
    win.body.querySelector('.cam-snap').addEventListener('click', () => {
      if (!stream || !video.videoWidth) { Shell.toast('Camera', 'No video feed to capture.', '📷'); return; }
      const c = document.createElement('canvas');
      const scale = Math.min(1, 1024 / video.videoWidth);
      c.width = Math.round(video.videoWidth * scale); c.height = Math.round(video.videoHeight * scale);
      const ctx = c.getContext('2d');
      ctx.filter = filterSel.value === 'none' ? 'none' : filterSel.value;
      if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0, c.width, c.height);
      const data = c.toDataURL('image/jpeg', .85);
      if (data.length > 1.4 * 1048576) { Shell.toast('Camera', 'Photo too large for browser storage.', '⚠️'); return; }
      const flash = win.body.querySelector('.cam-flash');
      flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
      blip(88, 0.05);
      const dir = HOME + '/Pictures/Camera Roll';
      if (!FS.get(dir)) FS.mkdir(dir);
      const now = new Date();
      const name = FS.uniqueName(dir, 'Photo ' + now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 8).replace(/:/g, '-'), '.jpg');
      FS.write(dir + '/' + name, data, 'image/jpeg');
      Shell.toast('Camera', 'Saved to Pictures › Camera Roll as ' + name, '📸');
      Achievements.unlock('photographer');
    });
    win.onClose(() => { if (rec) rec.stop(); stop(); });
    start();
  }
});

/* ---------- Neko: desktop cat ---------- */
const Neko = {
  el: null, x: 200, y: 200, mx: 300, my: 300, raf: null, lastMove: 0, state: 'idle', face: 1, _t: 0,
  show() {
    if (this.el) return;
    this.el = Utils.el('div', 'neko');
    this.el.innerHTML = '<span class="neko-cat">🐈</span><span class="neko-z">💤</span>';
    document.body.appendChild(this.el);
    this.x = innerWidth - 120; this.y = innerHeight - 110; this.mx = this.x; this.my = this.y;
    this.lastMove = performance.now();
    this._onMove = e => { this.mx = e.clientX; this.my = e.clientY; this.lastMove = performance.now(); };
    document.addEventListener('pointermove', this._onMove);
    this.el.addEventListener('pointerdown', e => {
      e.stopPropagation();
      Achievements.unlock('cat-person');
      [[84, 0], [88, 80]].forEach(([m, t]) => setTimeout(() => Synth.note(m, 0.25, 'sine'), t));
      this.el.querySelector('.neko-cat').textContent = '😻';
      setTimeout(() => { if (this.el) this.el.querySelector('.neko-cat').textContent = '🐈'; }, 700);
    });
    let last = performance.now();
    const step = t => {
      if (!this.el) return;
      const dt = Math.min(.05, (t - last) / 1000); last = t;
      const dx = this.mx - this.x, dy = this.my - this.y, d = Math.hypot(dx, dy);
      const idle = t - this.lastMove;
      let state = 'idle';
      if (d > 48) { state = 'run'; const sp = Math.min(260, 120 + d); this.x += dx / d * sp * dt; this.y += dy / d * sp * dt; this.face = dx < 0 ? -1 : 1; }
      else if (idle > 6000) state = 'sleep';
      if (state !== this.state) { this.state = state; this.el.dataset.state = state; }
      this._t += dt;
      const bob = state === 'run' ? Math.abs(Math.sin(this._t * 18)) * 6 : 0;
      this.el.style.transform = `translate(${this.x - 18}px, ${this.y - 18 - bob}px) scaleX(${this.face})`;
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  },
  hide() {
    if (!this.el) return;
    cancelAnimationFrame(this.raf);
    document.removeEventListener('pointermove', this._onMove);
    this.el.remove(); this.el = null;
  }
};
Bus.on('settings:neko', on => on ? Neko.show() : Neko.hide());
Bus.on('shell:unlock', () => { if (Settings.get('neko')) Neko.show(); Accounts.apply(); Trails.apply(); });
Apps.register({
  id: 'neko', name: 'Neko', icon: '🐈', color: 'linear-gradient(135deg,#ffd194,#d1913c)',
  category: 'Utilities', store: true, width: 340, height: 220,
  desc: 'A cat that lives on your desktop and chases your mouse. Falls asleep when you stop moving. Pet responsibly.', rating: 4.9, size: '0.3 MB',
  mount(win) {
    const render = () => {
      const on = !!Settings.get('neko');
      win.body.innerHTML = `<div class="placeholder-pane"><div class="ph-ico">${on ? '🐈' : '📦'}</div><div>${on ? 'Neko is loose on your desktop. Move the mouse and she\'ll follow.' : 'Neko is napping in her box.'}</div><button class="fluent-btn">${on ? 'Call her back' : 'Release the cat'}</button></div>`;
      win.body.querySelector('button').addEventListener('click', () => { Settings.set('neko', !on); render(); });
    };
    render();
  }
});
(() => { const un = Apps.uninstall.bind(Apps); Apps.uninstall = id => { if (id === 'neko') Settings.set('neko', false); un(id); }; })();

/* ---------- Accounts, Narrator, cursor trails ---------- */
const Accounts = {
  AVATARS: ['', '😀', '😎', '🦊', '🐼', '🐸', '🦄', '🤖', '👾', '🐙', '🌵', '🍕', '🚀'],
  apply() {
    const name = Settings.get('userName') || 'Seefood', av = Settings.get('avatar') || '';
    const a = document.querySelector('.start-avatar'), n = document.querySelector('.start-user span');
    if (a) a.textContent = av || name[0].toUpperCase();
    if (n) n.textContent = name;
  }
};
Bus.on('settings:userName', () => Accounts.apply());
Bus.on('settings:avatar', () => Accounts.apply());
const Narrator = {
  say(text) {
    if (!('speechSynthesis' in window)) return;
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; speechSynthesis.speak(u); } catch (e) {}
  }
};
(() => { const say = Clippy.say.bind(Clippy); Clippy.say = t => { say(t); if (Settings.get('narrator') && Clippy.el) Narrator.say(t); }; })();
const Trails = {
  _on: false, _last: 0,
  apply() {
    const want = !!Settings.get('cursorTrail');
    if (want === this._on) return;
    this._on = want;
    if (want) document.addEventListener('pointermove', this._h = e => {
      const now = performance.now();
      if (now - this._last < 24) return;
      this._last = now;
      const d = Utils.el('div', 'trail-dot');
      d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px';
      d.style.background = `hsl(${(now / 8) % 360},90%,60%)`;
      document.body.appendChild(d);
      setTimeout(() => d.remove(), 600);
    });
    else document.removeEventListener('pointermove', this._h);
  }
};
Bus.on('settings:cursorTrail', () => Trails.apply());

/* ---------- Solitaire (Klondike) ---------- */
Apps.register({
  id: 'solitaire', name: 'Solitaire', icon: '🃏', color: 'linear-gradient(135deg,#0a7a3a,#065c2a)',
  category: 'Games', store: true, width: 720, height: 600,
  desc: 'Klondike, draw one. Click or drag cards, double-click to send them to the foundations. Winning triggers *that* animation.', rating: 4.9, size: '1.1 MB',
  mount(win) {
    const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let S, moves, startT, timerI, undo = [], sel = null, won = false, dragging = null;
    win.body.innerHTML = `
      <div class="sol-root">
        <div class="app-toolbar"><button class="fluent-btn subtle sol-new">🃏 New game</button><button class="fluent-btn subtle sol-undo">↶ Undo</button><span class="sol-stat" style="margin-left:auto"></span></div>
        <div class="sol-board">
          <div class="sol-top"><div class="sol-pile stock" data-p="stock"></div><div class="sol-pile waste" data-p="waste"></div><div class="sol-spacer"></div>${[0, 1, 2, 3].map(i => `<div class="sol-pile found" data-p="f${i}"><span class="sol-hint">${SUITS[i]}</span></div>`).join('')}</div>
          <div class="sol-tab">${[0, 1, 2, 3, 4, 5, 6].map(i => `<div class="sol-pile tab" data-p="t${i}"></div>`).join('')}</div>
        </div>
        <canvas class="sol-win"></canvas>
      </div>`;
    const board = win.body.querySelector('.sol-board');
    const stat = win.body.querySelector('.sol-stat');
    const red = c => c.s === 1 || c.s === 2;
    const cardHTML = (c, i) => `<div class="card ${c.up ? '' : 'down'} ${red(c) ? 'red' : ''}" data-i="${i}">${c.up ? `<span class="c-tl">${RANKS[c.r - 1]}<br>${SUITS[c.s]}</span><span class="c-c">${SUITS[c.s]}</span><span class="c-br">${RANKS[c.r - 1]}<br>${SUITS[c.s]}</span>` : ''}</div>`;
    function deal() {
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ r, s, up: false });
      for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
      S = { stock: deck, waste: [], f: [[], [], [], []], t: [[], [], [], [], [], [], []] };
      for (let i = 0; i < 7; i++) for (let j = 0; j <= i; j++) { const c = S.stock.pop(); c.up = j === i; S.t[i].push(c); }
      moves = 0; undo = []; sel = null; won = false; startT = Date.now();
      clearInterval(timerI); timerI = setInterval(updStat, 1000);
      stopWinAnim(); render();
    }
    function pile(id) { return id === 'stock' ? S.stock : id === 'waste' ? S.waste : id[0] === 'f' ? S.f[+id[1]] : S.t[+id[1]]; }
    function snapshot() { undo.push(JSON.stringify(S)); if (undo.length > 100) undo.shift(); }
    function canDrop(cards, dest) {
      const top = pile(dest)[pile(dest).length - 1], c = cards[0];
      if (dest[0] === 'f') return cards.length === 1 && (top ? top.s === c.s && top.r === c.r - 1 : c.r === 1);
      if (dest[0] === 't') return top ? top.up && red(top) !== red(c) && top.r === c.r + 1 : c.r === 13;
      return false;
    }
    function move(from, idx, dest) {
      const src = pile(from), cards = src.slice(idx);
      if (!cards.length || !canDrop(cards, dest)) return false;
      snapshot();
      src.splice(idx); pile(dest).push(...cards);
      if (from[0] === 't' && src.length && !src[src.length - 1].up) src[src.length - 1].up = true;
      moves++; sel = null; render(); checkWin();
      blip(dest[0] === 'f' ? 84 : 72, 0.04);
      return true;
    }
    function autoFound(from, idx) {
      const src = pile(from);
      if (idx !== src.length - 1) return false;
      for (let i = 0; i < 4; i++) if (move(from, idx, 'f' + i)) return true;
      return false;
    }
    function updStat() {
      if (won) return;
      const sec = Math.floor((Date.now() - startT) / 1000);
      stat.textContent = `Moves ${moves} • ${Utils.fmtTime(sec)}`;
    }
    function render() {
      for (const p of board.querySelectorAll('.sol-pile')) {
        const id = p.dataset.p, cards = pile(id);
        const hint = p.querySelector('.sol-hint');
        p.innerHTML = (hint ? hint.outerHTML : '') + (id === 'stock' ? (cards.length ? cardHTML({ up: false }, cards.length - 1) : '<div class="sol-recycle">↻</div>')
          : id === 'waste' || id[0] === 'f' ? (cards.length ? cardHTML(cards[cards.length - 1], cards.length - 1) : '')
          : cards.map(cardHTML).join(''));
        if (id[0] === 't') { let y = 0; [...p.querySelectorAll('.card')].forEach((el, i) => { el.style.top = y + 'px'; y += cards[i].up ? 24 : 9; }); }
        p.classList.toggle('empty', !cards.length);
      }
      if (sel) { const p = board.querySelector(`[data-p="${sel.p}"]`); const els = [...p.querySelectorAll('.card')]; (sel.p[0] === 't' ? els.slice(sel.i) : els).forEach(el => el.classList.add('sel')); }
      updStat();
    }
    function checkWin() {
      if (S.f.every(f => f.length === 13)) {
        won = true; clearInterval(timerI);
        stat.textContent = `🎉 You won in ${moves} moves, ${Utils.fmtTime(Math.floor((Date.now() - startT) / 1000))}!`;
        Achievements.unlock('solitaire');
        HiScore.submit('solitaire', Math.max(1, 10000 - moves * 20 - Math.floor((Date.now() - startT) / 1000)));
        winAnim();
      }
    }
    /* the legendary bouncing-cards win animation */
    let winRaf = null;
    function stopWinAnim() { cancelAnimationFrame(winRaf); const c = win.body.querySelector('.sol-win'); c.style.display = 'none'; }
    function winAnim() {
      const c = win.body.querySelector('.sol-win');
      const root = win.body.querySelector('.sol-root');
      c.width = root.clientWidth; c.height = root.clientHeight; c.style.display = 'block';
      const ctx = c.getContext('2d');
      const founds = [...board.querySelectorAll('.found')].map(f => { const r = f.getBoundingClientRect(), rr = root.getBoundingClientRect(); return { x: r.left - rr.left, y: r.top - rr.top, w: r.width, h: r.height }; });
      const queue = [];
      for (let r = 13; r >= 1; r--) for (let s = 0; s < 4; s++) queue.push({ r, s, ...founds[s] });
      let flying = [], next = 0, lastSpawn = 0;
      const step = t => {
        if (!win.body.isConnected) return;
        if (next < queue.length && t - lastSpawn > 120) { const q = queue[next++]; flying.push({ ...q, vx: (Math.random() < .5 ? -1 : 1) * (2 + Math.random() * 4), vy: -(2 + Math.random() * 5) }); lastSpawn = t; }
        for (const f of flying) {
          f.x += f.vx; f.vy += .35; f.y += f.vy;
          if (f.y + f.h > c.height) { f.y = c.height - f.h; f.vy *= -.82; }
          ctx.fillStyle = '#fff'; ctx.fillRect(f.x, f.y, f.w, f.h);
          ctx.strokeStyle = '#999'; ctx.strokeRect(f.x + .5, f.y + .5, f.w - 1, f.h - 1);
          ctx.fillStyle = (f.s === 1 || f.s === 2) ? '#d11' : '#111'; ctx.font = 'bold 14px Segoe UI, sans-serif'; ctx.textAlign = 'left';
          ctx.fillText(RANKS[f.r - 1] + SUITS[f.s], f.x + 5, f.y + 17);
          ctx.font = '26px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(SUITS[f.s], f.x + f.w / 2, f.y + f.h / 2 + 10);
        }
        flying = flying.filter(f => f.x > -f.w && f.x < c.width);
        if (next < queue.length || flying.length) winRaf = requestAnimationFrame(step);
      };
      winRaf = requestAnimationFrame(step);
      c.onclick = () => { stopWinAnim(); deal(); };
    }
    /* interaction: click-to-select, drag, double-click */
    let lastClick = { key: '', t: 0 };
    board.addEventListener('pointerdown', e => {
      if (won) return;
      const p = e.target.closest('.sol-pile'); if (!p) return;
      const id = p.dataset.p, cardEl = e.target.closest('.card');
      if (id === 'stock') {
        snapshot();
        if (S.stock.length) { const c = S.stock.pop(); c.up = true; S.waste.push(c); }
        else { S.waste.reverse().forEach(c => { c.up = false; S.stock.push(c); }); S.waste = []; }
        moves++; sel = null; render(); blip(60, 0.03);
        return;
      }
      if (cardEl && pile(id)[+cardEl.dataset.i] && pile(id)[+cardEl.dataset.i].up) {
        const idx = +cardEl.dataset.i;
        const key = id + ':' + idx, now = Date.now();
        if (lastClick.key === key && now - lastClick.t < 350) { lastClick = { key: '', t: 0 }; if (autoFound(id, idx)) return; }
        lastClick = { key, t: now };
        // drag start
        const sx = e.clientX, sy = e.clientY;
        const cards = pile(id).slice(idx);
        const ghost = Utils.el('div', 'sol-drag');
        ghost.innerHTML = cards.map((c, i) => `<div style="top:${i * 24}px">${cardHTML(c, i)}</div>`).join('');
        let started = false;
        const mv = ev => {
          if (!started && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
          if (!started) { started = true; document.body.appendChild(ghost); [...p.querySelectorAll('.card')].slice(idx).forEach(el => el.classList.add('ghosted')); }
          ghost.style.transform = `translate(${ev.clientX - 35}px, ${ev.clientY - 20}px)`;
        };
        const up = ev => {
          window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
          if (started) {
            ghost.remove();
            const under = document.elementFromPoint(ev.clientX, ev.clientY);
            const dp = under && under.closest('.sol-pile');
            if (!(dp && dp.dataset.p !== id && move(id, idx, dp.dataset.p))) render();
          } else {
            // click: select or move selection here
            if (sel && sel.p !== id) { if (!move(sel.p, sel.i, id)) { sel = { p: id, i: idx }; render(); } }
            else if (sel && sel.p === id && sel.i === idx) { sel = null; render(); }
            else { sel = { p: id, i: idx }; render(); }
          }
        };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
        e.preventDefault();
        return;
      }
      // clicked an empty pile or face-down card with a selection → try to move there
      if (sel && sel.p !== id) { if (!move(sel.p, sel.i, id)) { sel = null; render(); } }
      else { sel = null; render(); }
    });
    win.body.querySelector('.sol-new').addEventListener('click', deal);
    win.body.querySelector('.sol-undo').addEventListener('click', () => { if (undo.length && !won) { S = JSON.parse(undo.pop()); moves++; sel = null; render(); } });
    win.onClose(() => { clearInterval(timerI); cancelAnimationFrame(winRaf); });
    deal();
  }
});
