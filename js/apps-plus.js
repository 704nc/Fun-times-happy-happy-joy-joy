/* ============ Windows 11 Web — plus: retro themes (XP / 95), Outlook, Calendar, Voice Recorder,
   live wallpaper ============ */
'use strict';

Achievements.list.push(
  { id: 'retro', name: 'Bliss', desc: 'Switched to a retro theme.', icon: '🌄', pts: 10 },
  { id: 'mail', name: 'You\'ve Got Mail', desc: 'Sent an email from Outlook.', icon: '📧', pts: 10 },
  { id: 'planner', name: 'Planner', desc: 'Added an event to the Calendar.', icon: '📅', pts: 10 },
  { id: 'recorder', name: 'Testing, 1-2-3', desc: 'Saved a voice recording.', icon: '🎙️', pts: 15 },
  { id: 'uploader', name: 'Inbound', desc: 'Dropped a file from your real computer into File Explorer.', icon: '📥', pts: 10 }
);

/* ---------- Retro themes ---------- */
(() => {
  const svg = s => 'data:image/svg+xml,' + encodeURIComponent(s);
  const bliss = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2a6fd6"/><stop offset="55%" stop-color="#7fb7f2"/><stop offset="100%" stop-color="#cfe6fb"/></linearGradient><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8fd14f"/><stop offset="60%" stop-color="#4f9d1c"/><stop offset="100%" stop-color="#2f6e0f"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#s)"/><g fill="#fff" opacity=".9"><ellipse cx="300" cy="180" rx="140" ry="40"/><ellipse cx="380" cy="150" rx="90" ry="35"/><ellipse cx="1200" cy="120" rx="180" ry="45"/><ellipse cx="1300" cy="95" rx="100" ry="38"/><ellipse cx="1650" cy="230" rx="120" ry="34"/><ellipse cx="800" cy="260" rx="110" ry="28"/></g><path d="M0,700 C300,560 600,540 900,600 C1200,660 1500,620 1920,520 L1920,1080 0,1080Z" fill="url(#h)"/><path d="M0,820 C400,720 800,760 1200,700 C1500,660 1750,700 1920,660 L1920,1080 0,1080Z" fill="#5aa626" opacity=".8"/></svg>`);
  const teal = svg(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#008080"/></svg>`);
  const uri = Wallpapers.uri.bind(Wallpapers);
  Wallpapers.uri = id => id === 'bliss' ? bliss : id === 'teal' ? teal : uri(id);
  Wallpapers.ids.push('bliss', 'teal');
  Wallpapers.names.bliss = 'Bliss (XP)'; Wallpapers.names.teal = 'Classic Teal (95)';
  const Retro = {
    apply() {
      const r = Settings.get('retro') || '';
      document.documentElement.classList.toggle('theme-xp', r === 'xp');
      document.documentElement.classList.toggle('theme-95', r === '95');
    },
    set(r) {
      const prev = Settings.get('retro') || '';
      Settings.set('retro', r);
      if (r === 'xp') { Settings.set('wallpaper', 'bliss'); Settings.set('accent', '#0058ee'); Settings.set('theme', 'light'); }
      else if (r === '95') { Settings.set('wallpaper', 'teal'); Settings.set('accent', '#000080'); Settings.set('theme', 'light'); }
      else if (prev) { Settings.set('wallpaper', 'bloom'); Settings.set('accent', '#0078d4'); }
      if (r) { Achievements.unlock('retro'); Retro.chime(r); }
    },
    chime(r) {
      try {
        const seq = r === 'xp' ? [[75, 0], [70, 180], [63, 360], [68, 560]] : [[67, 0], [72, 200], [76, 400], [79, 600], [84, 900]];
        seq.forEach(([m, t]) => setTimeout(() => Synth.note(m, r === 'xp' ? 1.2 : 1.8, 'sine'), t));
      } catch (e) {}
    }
  };
  window.Retro = Retro;
  Bus.on('settings:retro', () => Retro.apply());
  document.addEventListener('DOMContentLoaded', () => Retro.apply());
})();

/* ---------- Outlook ---------- */
Apps.register({
  id: 'outlook', name: 'Outlook', icon: 'O', letter: true, color: 'linear-gradient(135deg,#0f6cbd,#0a4a8a)',
  category: 'Communication', width: 960, height: 620, singleton: true,
  mount(win) {
    const KEY = 'win11.mail';
    const me = () => (Settings.get('userName') || 'Seefood').toLowerCase().replace(/\s+/g, '.') + '@outlook.web';
    const BOTS = {
      'clippy@office.web': { name: 'Clippy', replies: ['It looks like you\'re writing an email. Would you like help? No? I\'ll stay right here anyway.', 'I read your message. Twice. Have you considered adding a bulleted list?', 'Thank you for your email. I have forwarded it to myself for safekeeping.'] },
      'neko@desktop.web': { name: 'Neko', replies: ['meow', 'mrrp?', '🐾🐾🐾 (walked across the keyboard) 🐾', 'meow meow. (Release me from the Store and I\'ll explain.)'] },
      'it@helpdesk.web': { name: 'IT Helpdesk', replies: ['Ticket #4021 created. Have you tried turning it off and on again? The Start menu has a power button.', 'Your ticket has been escalated to Tier 2 (also me). Please clear your browser cache. Actually don\'t, you\'d lose everything.', 'We have received your request and will respond within 3-5 business decades.'] },
      'boss@bigcorp.web': { name: 'The Boss', replies: ['Great, let\'s circle back on this. Can you put together a deck? PowerPoint is on the taskbar.', 'Thanks. Per my last email, the numbers in Budget 2026.xls still don\'t add up. They literally use =SUM.', 'Sounds good. Also, the quarterly report is due. It\'s in Documents. It\'s been there the whole time.'] },
      'store@microsoft.web': { name: 'Microsoft Store', replies: ['Thanks for reaching out! Have you seen our games? Solitaire, Tetris, Space Invaders, all free, all installed in seconds.', 'Your feedback has been recorded and will be ignored with the utmost care.'] },
      '*': { name: 'Mailer-Daemon', replies: ['Delivery has failed to these recipients: this is a browser tab, not the internet. Try clippy@office.web, neko@desktop.web, it@helpdesk.web, boss@bigcorp.web or store@microsoft.web.'] }
    };
    const seed = () => {
      const t = Date.now();
      return [
        { id: 1, folder: 'inbox', from: 'Windows 11 Web <hello@win11.web>', to: me(), subject: 'Welcome to Outlook (the fake one)', body: 'Hi!\n\nThis is a fully client-side Outlook. Emails you send to the bots in the address book get replies. Anything else bounces, honestly.\n\nTry writing to clippy@office.web or boss@bigcorp.web.\n\n— Windows 11 Web', t: t - 86400000 * 2, read: false },
        { id: 2, folder: 'inbox', from: 'Clippy <clippy@office.web>', to: me(), subject: 'It looks like you have unread mail', body: 'Would you like help with that?\n\n📎', t: t - 3600000 * 5, read: false },
        { id: 3, folder: 'inbox', from: 'IT Helpdesk <it@helpdesk.web>', to: me(), subject: 'ACTION REQUIRED: Password expires in -3 days', body: 'Your password has already expired. This is fine. There are no passwords.\n\nDo not click any links (there are none).', t: t - 3600000 * 26, read: true },
        { id: 4, folder: 'inbox', from: 'The Boss <boss@bigcorp.web>', to: me(), subject: 'Quick question', body: 'Do you have a sec? Can you open Excel and check Budget 2026? Something about the total.\n\nSent from my Windows 11 Web', t: t - 3600000 * 30, read: true },
        { id: 5, folder: 'junk', from: 'Prince of Webville <prince@totally.legit>', to: me(), subject: 'URGENT business proposal (100% real)', body: 'Dear friend, I have 4,000,000 gamerscore locked in an achievements account and need your help…', t: t - 86400000 * 4, read: false },
        { id: 6, folder: 'inbox', from: 'Microsoft Store <store@microsoft.web>', to: me(), subject: 'New this week: Tetris, Solitaire, Space Invaders', body: 'Three classics just landed in the Store. Free, as always. Install them and they show up in Start, on the desktop and in your library.', t: t - 3600000 * 50, read: true }
      ];
    };
    let mail = Store.get(KEY, null) || seed();
    let folder = 'inbox', sel = null, search = '', composeEl = null, nextId = mail.reduce((m, x) => Math.max(m, x.id), 0) + 1;
    const save = () => Store.set(KEY, mail.slice(-200));
    const FOLDERS = [['inbox', 'Inbox', '📥'], ['sent', 'Sent', '📤'], ['drafts', 'Drafts', '📝'], ['junk', 'Junk', '🚫'], ['deleted', 'Deleted', '🗑️']];
    win.body.innerHTML = `
      <div class="ol-root">
        <div class="ol-side"><button class="fluent-btn ol-new">✉️ New mail</button><div class="ol-folders"></div><div class="ol-book"><div class="ol-lbl">Address book</div>${Object.keys(BOTS).filter(k => k !== '*').map(k => `<div class="ol-contact" data-a="${k}">${BOTS[k].name}<br><small>${k}</small></div>`).join('')}</div></div>
        <div class="ol-list"><div class="ol-search"><input placeholder="Search mail" spellcheck="false"></div><div class="ol-items"></div></div>
        <div class="ol-read"><div class="placeholder-pane"><div class="ph-ico">📬</div>Select an item to read</div></div>
      </div>`;
    const $ = s => win.body.querySelector(s);
    const fmt = t => { const d = new Date(t), now = new Date(); return d.toDateString() === now.toDateString() ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
    const unread = f => mail.filter(m => m.folder === f && !m.read).length;
    function renderFolders() {
      $('.ol-folders').innerHTML = FOLDERS.map(([id, n, i]) => `<div class="ol-folder ${folder === id ? 'sel' : ''}" data-f="${id}"><span>${i}</span><span>${n}</span>${unread(id) ? `<b>${unread(id)}</b>` : ''}</div>`).join('');
      const total = unread('inbox');
      win.setTitle((total ? `(${total}) ` : '') + 'Outlook');
    }
    function renderList() {
      const items = mail.filter(m => m.folder === folder && (!search || (m.subject + m.from + m.body).toLowerCase().includes(search))).sort((a, b) => b.t - a.t);
      $('.ol-items').innerHTML = items.map(m => `<div class="ol-item ${m.read ? '' : 'unread'} ${sel === m.id ? 'sel' : ''}" data-id="${m.id}"><div class="ol-from">${Utils.esc((folder === 'sent' || folder === 'drafts' ? 'To: ' + m.to : m.from).replace(/<.*>/, '').trim())}<span class="ol-time">${fmt(m.t)}</span></div><div class="ol-subj">${Utils.esc(m.subject || '(no subject)')}</div><div class="ol-prev">${Utils.esc(m.body.slice(0, 80))}</div></div>`).join('') || '<div class="placeholder-pane"><div class="ph-ico">🌤️</div>Nothing here.</div>';
    }
    function renderRead() {
      const m = mail.find(x => x.id === sel);
      if (!m) { $('.ol-read').innerHTML = '<div class="placeholder-pane"><div class="ph-ico">📬</div>Select an item to read</div>'; return; }
      $('.ol-read').innerHTML = `
        <div class="ol-read-head"><h2>${Utils.esc(m.subject || '(no subject)')}</h2>
          <div class="ol-meta"><b>${Utils.esc(m.from)}</b><br>To: ${Utils.esc(m.to)} • ${new Date(m.t).toLocaleString()}</div>
          <div class="ol-actions"><button class="fluent-btn subtle" data-act="reply">↩ Reply</button><button class="fluent-btn subtle" data-act="junk">${m.folder === 'junk' ? '✅ Not junk' : '🚫 Junk'}</button><button class="fluent-btn subtle" data-act="delete">🗑️ ${m.folder === 'deleted' ? 'Delete forever' : 'Delete'}</button></div></div>
        <div class="ol-body">${Utils.esc(m.body).replace(/\n/g, '<br>')}</div>`;
    }
    const renderAll = () => { renderFolders(); renderList(); renderRead(); };
    function addrOf(s) { const m = String(s).match(/[\w.+-]+@[\w.-]+/); return m ? m[0].toLowerCase() : ''; }
    function botReply(to, subject) {
      const a = addrOf(to);
      const bot = BOTS[a] || BOTS['*'];
      const from = bot === BOTS['*'] ? 'Mail Delivery System <mailer-daemon@outlook.web>' : `${bot.name} <${a}>`;
      setTimeout(() => {
        mail.push({ id: nextId++, folder: 'inbox', from, to: me(), subject: (bot === BOTS['*'] ? 'Undeliverable: ' : 'RE: ') + subject, body: bot.replies[Math.floor(Math.random() * bot.replies.length)], t: Date.now(), read: false });
        save();
        Shell.toast('Outlook', from.replace(/<.*>/, '').trim() + ': ' + (bot === BOTS['*'] ? 'Undeliverable' : 'RE: ' + subject), '📧');
        if (win.body.isConnected) renderAll();
      }, 2500 + Math.random() * 4000);
    }
    function compose(pre) {
      if (composeEl) composeEl.remove();
      composeEl = Utils.el('div', 'ol-compose');
      composeEl.innerHTML = `<div class="ol-compose-head"><span>New message</span><button class="oc-x">✕</button></div>
        <input class="oc-to" placeholder="To (try clippy@office.web)" value="${Utils.esc(pre.to || '')}" spellcheck="false">
        <input class="oc-subj" placeholder="Subject" value="${Utils.esc(pre.subject || '')}" spellcheck="false">
        <textarea class="oc-body" placeholder="Write something…">${Utils.esc(pre.body || '')}</textarea>
        <div class="oc-btns"><button class="fluent-btn oc-send">Send</button><button class="fluent-btn subtle oc-draft">Save draft</button></div>`;
      win.body.querySelector('.ol-root').appendChild(composeEl);
      const g = s => composeEl.querySelector(s);
      g('.oc-x').addEventListener('click', () => { composeEl.remove(); composeEl = null; });
      g('.oc-draft').addEventListener('click', () => {
        mail.push({ id: nextId++, folder: 'drafts', from: me(), to: g('.oc-to').value.trim(), subject: g('.oc-subj').value.trim(), body: g('.oc-body').value, t: Date.now(), read: true });
        save(); composeEl.remove(); composeEl = null; folder = 'drafts'; renderAll();
      });
      g('.oc-send').addEventListener('click', () => {
        const to = g('.oc-to').value.trim(), subject = g('.oc-subj').value.trim() || '(no subject)';
        if (!addrOf(to)) { Shell.toast('Outlook', 'Enter a valid address, e.g. boss@bigcorp.web', '⚠️'); return; }
        mail.push({ id: nextId++, folder: 'sent', from: me(), to, subject, body: g('.oc-body').value, t: Date.now(), read: true });
        save(); composeEl.remove(); composeEl = null;
        Achievements.unlock('mail');
        blip(88, 0.1);
        botReply(to, subject);
        renderAll();
      });
      setTimeout(() => g(pre.to ? '.oc-body' : '.oc-to').focus(), 50);
    }
    $('.ol-new').addEventListener('click', () => compose({}));
    $('.ol-book').addEventListener('click', e => { const c = e.target.closest('.ol-contact'); if (c) compose({ to: c.dataset.a }); });
    $('.ol-folders').addEventListener('click', e => { const f = e.target.closest('.ol-folder'); if (f) { folder = f.dataset.f; sel = null; renderAll(); } });
    $('.ol-search input').addEventListener('input', e => { search = e.target.value.trim().toLowerCase(); renderList(); });
    $('.ol-items').addEventListener('click', e => {
      const it = e.target.closest('.ol-item'); if (!it) return;
      sel = +it.dataset.id;
      const m = mail.find(x => x.id === sel);
      if (m && m.folder === 'drafts') { compose(m); return; }
      if (m) m.read = true;
      save(); renderAll();
    });
    $('.ol-read').addEventListener('click', e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const m = mail.find(x => x.id === sel); if (!m) return;
      if (b.dataset.act === 'reply') compose({ to: addrOf(m.from) || m.from, subject: 'RE: ' + m.subject.replace(/^RE: /, ''), body: '\n\n> ' + m.body.split('\n').join('\n> ') });
      else if (b.dataset.act === 'junk') { m.folder = m.folder === 'junk' ? 'inbox' : 'junk'; sel = null; }
      else if (b.dataset.act === 'delete') { if (m.folder === 'deleted') mail = mail.filter(x => x.id !== m.id); else m.folder = 'deleted'; sel = null; }
      save(); renderAll();
    });
    renderAll();
  }
});

/* ---------- Calendar ---------- */
const CalendarStore = {
  KEY: 'win11.events',
  all() { return Store.get(this.KEY, []); },
  save(list) { Store.set(this.KEY, list); Bus.emit('events:changed'); },
  add(ev) { const l = this.all(); ev.id = Date.now() + Math.floor(Math.random() * 1000); l.push(ev); this.save(l); Achievements.unlock('planner'); return ev; },
  remove(id) { this.save(this.all().filter(e => e.id !== id)); },
  onDay(d) { const key = d.toISOString ? d.toISOString().slice(0, 10) : d; return this.all().filter(e => e.date === key).sort((a, b) => (a.time || '').localeCompare(b.time || '')); },
  upcoming(n) { const today = new Date().toISOString().slice(0, 10); return this.all().filter(e => e.date >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''))).slice(0, n || 5); }
};
Apps.register({
  id: 'calendar', name: 'Calendar', icon: '📅', color: 'linear-gradient(135deg,#0f7b0f,#0a5a0a)',
  category: 'Productivity', width: 820, height: 600, singleton: true,
  mount(win) {
    let view = new Date(); view.setDate(1);
    let selDay = new Date().toISOString().slice(0, 10);
    win.body.innerHTML = `<div class="cal-root"><div class="cal-main"><div class="app-toolbar"><button class="cal-prev">‹</button><button class="cal-today">Today</button><button class="cal-next">›</button><span class="cal-title" style="font-weight:600;margin-left:8px"></span><button class="fluent-btn cal-add" style="margin-left:auto">＋ New event</button></div><div class="cal-month"></div></div><div class="cal-day-pane"><div class="cal-day-head"></div><div class="cal-day-list"></div><div class="cal-upcoming"><div class="ol-lbl">Upcoming</div><div class="cal-up-list"></div></div></div></div>`;
    const $ = s => win.body.querySelector(s);
    const key = d => d.toISOString().slice(0, 10);
    function render() {
      $('.cal-title').textContent = view.toLocaleDateString([], { month: 'long', year: 'numeric' });
      const first = new Date(view.getFullYear(), view.getMonth(), 1);
      const daysIn = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      const today = key(new Date());
      let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => `<div class="cm-dow">${d}</div>`).join('');
      for (let i = 0; i < first.getDay(); i++) html += '<div class="cm-cell dim"></div>';
      for (let d = 1; d <= daysIn; d++) {
        const dt = new Date(view.getFullYear(), view.getMonth(), d, 12);
        const k = key(dt), evs = CalendarStore.onDay(k);
        html += `<div class="cm-cell ${k === today ? 'today' : ''} ${k === selDay ? 'sel' : ''}" data-d="${k}"><div class="cm-num">${d}</div>${evs.slice(0, 3).map(e => `<div class="cm-ev" style="background:${e.color || 'var(--accent)'}">${Utils.esc(e.title)}</div>`).join('')}${evs.length > 3 ? `<div class="cm-more">+${evs.length - 3} more</div>` : ''}</div>`;
      }
      $('.cal-month').innerHTML = html;
      const sd = new Date(selDay + 'T12:00:00');
      $('.cal-day-head').textContent = sd.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
      const evs = CalendarStore.onDay(selDay);
      $('.cal-day-list').innerHTML = evs.map(e => `<div class="cal-ev" data-id="${e.id}"><span class="cal-ev-dot" style="background:${e.color || 'var(--accent)'}"></span><div><div>${Utils.esc(e.title)}</div><small>${e.time ? e.time : 'All day'}${e.remind ? ' • 🔔' : ''}</small></div><button title="Delete">🗑️</button></div>`).join('') || '<div class="wg-sub" style="padding:8px 0">No events. Click "New event" or double-click a day.</div>';
      $('.cal-up-list').innerHTML = CalendarStore.upcoming(6).map(e => `<div class="cal-up">${new Date(e.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}${e.time ? ' ' + e.time : ''} — ${Utils.esc(e.title)}</div>`).join('') || '<div class="wg-sub">Nothing coming up.</div>';
    }
    function addDialog(date) {
      const dlg = Utils.el('div', 'cal-dialog');
      dlg.innerHTML = `<div class="cal-dlg-title">New event</div><input class="fluent-input ce-title" placeholder="Title" spellcheck="false"><div class="cal-dlg-row"><input class="fluent-input ce-date" type="date" value="${date}"><input class="fluent-input ce-time" type="time"></div><div class="cal-dlg-row"><label><input type="checkbox" class="ce-remind" checked> Remind me 10 min before</label><select class="fluent-input ce-color"><option value="#0078d4">Blue</option><option value="#c42b1c">Red</option><option value="#0f7b0f">Green</option><option value="#8764b8">Purple</option><option value="#ca5010">Orange</option></select></div><div class="oc-btns"><button class="fluent-btn ce-ok">Save</button><button class="fluent-btn subtle ce-cancel">Cancel</button></div>`;
      win.body.querySelector('.cal-root').appendChild(dlg);
      dlg.querySelector('.ce-cancel').addEventListener('click', () => dlg.remove());
      dlg.querySelector('.ce-ok').addEventListener('click', () => {
        const title = dlg.querySelector('.ce-title').value.trim(); if (!title) return;
        CalendarStore.add({ title, date: dlg.querySelector('.ce-date').value || date, time: dlg.querySelector('.ce-time').value, remind: dlg.querySelector('.ce-remind').checked, color: dlg.querySelector('.ce-color').value });
        selDay = dlg.querySelector('.ce-date').value || date;
        dlg.remove(); render();
        Shell.toast('Calendar', 'Event added: ' + title, '📅');
      });
      dlg.querySelector('.ce-title').addEventListener('keydown', e => { if (e.key === 'Enter') dlg.querySelector('.ce-ok').click(); });
      setTimeout(() => dlg.querySelector('.ce-title').focus(), 40);
    }
    $('.cal-prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
    $('.cal-next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });
    $('.cal-today').addEventListener('click', () => { view = new Date(); view.setDate(1); selDay = key(new Date()); render(); });
    $('.cal-add').addEventListener('click', () => addDialog(selDay));
    $('.cal-month').addEventListener('click', e => { const c = e.target.closest('.cm-cell[data-d]'); if (c) { selDay = c.dataset.d; render(); } });
    $('.cal-month').addEventListener('dblclick', e => { const c = e.target.closest('.cm-cell[data-d]'); if (c) addDialog(c.dataset.d); });
    $('.cal-day-list').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { CalendarStore.remove(+b.closest('.cal-ev').dataset.id); render(); } });
    Bus.on('events:changed', () => { if (win.body.isConnected) render(); });
    render();
  }
});
/* reminders + clock-flyout integration */
(() => {
  const notified = new Set();
  setInterval(() => {
    const now = Date.now();
    for (const e of CalendarStore.all()) {
      if (!e.remind || !e.time || notified.has(e.id)) continue;
      const at = new Date(e.date + 'T' + e.time + ':00').getTime();
      if (at - now <= 10 * 60000 && at - now > -60000) { notified.add(e.id); Shell.toast('Calendar', e.title + ' at ' + e.time + (at > now ? ' — in ' + Math.max(1, Math.round((at - now) / 60000)) + ' min' : ' — now'), '🔔'); try { Synth.note(84, 0.3, 'sine'); } catch (x) {} }
    }
  }, 30000);
  document.addEventListener('DOMContentLoaded', () => {
    const rc = Shell.renderCalendar.bind(Shell);
    Shell.renderCalendar = function () {
      rc();
      const grid = document.getElementById('cal-grid');
      const now = new Date();
      grid.querySelectorAll('.cal-day').forEach(d => {
        const n = +d.textContent; if (!n) return;
        const k = new Date(now.getFullYear(), now.getMonth(), n, 12).toISOString().slice(0, 10);
        if (CalendarStore.onDay(k).length) d.classList.add('has-ev');
      });
      let box = document.getElementById('cal-agenda');
      if (!box) { box = Utils.el('div'); box.id = 'cal-agenda'; document.getElementById('calendar-flyout').appendChild(box); box.addEventListener('click', e => { e.stopPropagation(); Shell.closeFlyouts(); Apps.launch('calendar'); }); }
      const up = CalendarStore.upcoming(3);
      box.innerHTML = `<div class="nc-head" style="padding-top:10px"><span>Agenda</span><span style="font-weight:400;color:var(--accent);font-size:12px">Open Calendar</span></div>` + (up.length ? up.map(e => `<div class="cal-up">${e.date === now.toISOString().slice(0, 10) ? 'Today' : new Date(e.date + 'T12:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' })}${e.time ? ' ' + e.time : ''} — ${Utils.esc(e.title)}</div>`).join('') : '<div class="nc-empty">Nothing scheduled. Click to add an event.</div>');
    };
  });
})();

/* ---------- Voice Recorder ---------- */
Apps.register({
  id: 'recorder', name: 'Voice Recorder', icon: '🎙️', color: 'linear-gradient(135deg,#ff6a88,#ff99ac)',
  category: 'Creativity', width: 560, height: 480, singleton: true,
  mount(win) {
    const DIR = HOME + '/Music/Recordings';
    let stream = null, rec = null, chunks = [], t0 = 0, timer = null, ctxA = null, raf = null;
    win.body.innerHTML = `<div class="vr-root"><div class="vr-top"><canvas class="vr-meter" width="400" height="60"></canvas><div class="vr-time">0:00</div><button class="vr-btn" title="Record">⏺</button><div class="vr-hint">Click to start recording. Saves to Music › Recordings.</div></div><div class="vr-list"></div></div>`;
    const $ = s => win.body.querySelector(s);
    const btn = $('.vr-btn'), timeEl = $('.vr-time'), hint = $('.vr-hint'), meter = $('.vr-meter').getContext('2d');
    function list() {
      const items = FS.get(DIR) ? FS.list(DIR).filter(f => f.node.type === 'file') : [];
      $('.vr-list').innerHTML = items.length ? items.map(f => `<div class="vr-item" data-n="${Utils.esc(f.name)}"><span>🎙️</span><span class="vr-name">${Utils.esc(f.name)}</span><button data-act="play" title="Play">▶</button><button data-act="del" title="Delete">🗑️</button></div>`).join('') : '<div class="placeholder-pane"><div class="ph-ico">🎙️</div>No recordings yet.</div>';
    }
    function drawMeter(analyser) {
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getByteFrequencyData(data);
        meter.clearRect(0, 0, 400, 60);
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0078d4';
        meter.fillStyle = accent;
        const n = 48, step = Math.floor(data.length / n);
        for (let i = 0; i < n; i++) { const v = data[i * step] / 255; meter.fillRect(i * (400 / n) + 1, 60 - v * 58, 400 / n - 2, v * 58); }
        raf = requestAnimationFrame(loop);
      };
      loop();
    }
    async function start() {
      if (!navigator.mediaDevices || !window.MediaRecorder) { hint.textContent = 'Recording isn\'t supported in this browser (needs HTTPS + MediaRecorder).'; return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { hint.textContent = 'Microphone unavailable: ' + (e.name === 'NotAllowedError' ? 'permission denied' : e.name === 'NotFoundError' ? 'no microphone found' : e.message); return; }
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
      rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks = [];
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
        const r = new FileReader();
        r.onload = () => {
          if (r.result.length > 2 * 1048576) { Shell.toast('Voice Recorder', 'Recording too long for browser storage (max ~1.5 MB). Try a shorter one.', '⚠️'); return; }
          if (!FS.get(DIR)) FS.mkdir(DIR);
          const ext = /mp4/.test(blob.type) ? '.m4a' : /ogg/.test(blob.type) ? '.ogg' : '.webm';
          const name = FS.uniqueName(DIR, 'Recording ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date().toTimeString().slice(0, 5).replace(':', '.'), ext);
          FS.write(DIR + '/' + name, r.result, blob.type);
          Achievements.unlock('recorder');
          Shell.toast('Voice Recorder', 'Saved ' + name, '🎙️');
          list();
        };
        r.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop()); stream = null;
        cancelAnimationFrame(raf); meter.clearRect(0, 0, 400, 60);
        if (ctxA) { ctxA.close().catch(() => {}); ctxA = null; }
      };
      try { ctxA = new (window.AudioContext || window.webkitAudioContext)(); const src = ctxA.createMediaStreamSource(stream); const an = ctxA.createAnalyser(); an.fftSize = 256; src.connect(an); drawMeter(an); } catch (e) {}
      rec.start(250); t0 = Date.now();
      btn.textContent = '⏹'; btn.classList.add('rec'); hint.textContent = 'Recording… click to stop.';
      timer = setInterval(() => { timeEl.textContent = Utils.fmtTime((Date.now() - t0) / 1000); }, 250);
    }
    function stop() {
      clearInterval(timer);
      if (rec && rec.state !== 'inactive') rec.stop();
      rec = null; btn.textContent = '⏺'; btn.classList.remove('rec'); hint.textContent = 'Click to start recording. Saves to Music › Recordings.';
    }
    btn.addEventListener('click', () => rec ? stop() : start());
    $('.vr-list').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const n = b.closest('.vr-item').dataset.n;
      if (b.dataset.act === 'play') Apps.launch('mediaplayer', { path: DIR + '/' + n });
      else { FS.recycle(DIR + '/' + n); list(); }
    });
    win.onClose(() => { stop(); if (stream) stream.getTracks().forEach(t => t.stop()); cancelAnimationFrame(raf); });
    Bus.on('fs:changed', () => { if (win.body.isConnected) list(); });
    list();
  }
});

/* ---------- Live wallpaper (animated aurora) ---------- */
const LiveWallpaper = {
  canvas: null, raf: null,
  apply() {
    const want = Settings.get('wallpaper') === 'aurora-live';
    if (want && !this.canvas) this.start();
    else if (!want && this.canvas) this.stop();
  },
  start() {
    const c = Utils.el('canvas'); c.id = 'live-wallpaper';
    document.getElementById('desktop').prepend(c);
    this.canvas = c;
    const ctx = c.getContext('2d');
    const fit = () => { c.width = Math.ceil(innerWidth / 2); c.height = Math.ceil(innerHeight / 2); };
    fit(); window.addEventListener('resize', fit);
    this._fit = fit;
    let t = 0, last = 0;
    const loop = now => {
      this.raf = requestAnimationFrame(loop);
      if (now - last < 33 || document.hidden) return;
      last = now; t += 0.008;
      const W = c.width, H = c.height;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#020a1e'); g.addColorStop(1, '#0a1a3a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) {
          const y = H * (0.35 + i * 0.09) + Math.sin(x / (60 + i * 20) + t * (1 + i * .3)) * 30 + Math.sin(x / 140 - t * 1.7) * 20;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H); ctx.closePath();
        const hue = 140 + i * 35 + Math.sin(t + i) * 20;
        ctx.fillStyle = `hsla(${hue},90%,55%,${0.14 - i * 0.02})`; ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < 60; i++) { const tw = (Math.sin(t * 6 + i) + 1) / 2; ctx.globalAlpha = .3 + tw * .6; ctx.fillRect((i * 173) % W, (i * 97) % (H * .6), 1.2, 1.2); }
      ctx.globalAlpha = 1;
    };
    this.raf = requestAnimationFrame(loop);
  },
  stop() { cancelAnimationFrame(this.raf); window.removeEventListener('resize', this._fit); this.canvas.remove(); this.canvas = null; }
};
(() => {
  const uri = Wallpapers.uri.bind(Wallpapers);
  Wallpapers.uri = id => id === 'aurora-live' ? 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#020a1e"/><stop offset="1" stop-color="#0a1a3a"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><path d="M0,500 C300,380 600,560 960,430 C1300,320 1600,520 1920,400 L1920,1080 0,1080Z" fill="#1db98e" opacity=".25"/></svg>') : uri(id);
  Wallpapers.ids.push('aurora-live'); Wallpapers.names['aurora-live'] = 'Aurora (animated)';
  Bus.on('settings:wallpaper', () => LiveWallpaper.apply());
  Bus.on('shell:unlock', () => LiveWallpaper.apply());
})();
