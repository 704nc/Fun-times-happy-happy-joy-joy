/* ============ Windows 11 Web — link: PWA install prompt, Nearby Share between tabs, Ctrl+Alt+Del screen,
   About credits ============ */
'use strict';

Achievements.list.push(
  { id: 'installed-pwa', name: 'Home Screen Hero', desc: 'Installed Windows 11 Web as an app.', icon: '📲', pts: 15 },
  { id: 'nearby', name: 'Nearby', desc: 'Shared something with another tab via Nearby Share.', icon: '📡', pts: 15 },
  { id: 'cad', name: 'Three-Finger Salute', desc: 'Pressed Ctrl+Alt+Del.', icon: '🖐️', pts: 5 }
);

/* ---------- PWA install ---------- */
const Installer = {
  prompt: null,
  init() {
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.prompt = e; Bus.emit('install:available'); if (!Store.get('win11.install.nagged', false)) { Store.set('win11.install.nagged', true); setTimeout(() => Shell.toast('Install Windows 11 Web', 'Run it as its own app, no browser chrome. Settings → About → Install.', '📲'), 6000); } });
    window.addEventListener('appinstalled', () => { this.prompt = null; Achievements.unlock('installed-pwa'); Shell.toast('Installed', 'Windows 11 Web is now an app. Find it with your other apps.', '📲'); Bus.emit('install:available'); });
  },
  async install() {
    if (!this.prompt) { Shell.toast('Install', matchMedia('(display-mode: standalone)').matches ? 'Already running as an installed app.' : 'Your browser didn\'t offer an install prompt. Try the install icon in the address bar, or "Add to Home Screen" on iOS.', '📲'); return; }
    this.prompt.prompt(); const r = await this.prompt.userChoice; this.prompt = null; Bus.emit('install:available');
    if (r.outcome !== 'accepted') Shell.toast('Install', 'Maybe later. The option stays in Settings → About.', '📲');
  }
};
document.addEventListener('DOMContentLoaded', () => Installer.init());

/* ---------- Nearby Share: other tabs of this OS in the same browser ---------- */
const Nearby = {
  id: Math.random().toString(36).slice(2, 8), peers: {}, bc: null, inbox: [],
  name() { return (Settings.get('userName') || 'Seefood') + '\'s ' + (matchMedia('(pointer: coarse)').matches ? 'Phone' : 'PC') + ' (' + this.id + ')'; },
  init() {
    if (!window.BroadcastChannel) return;
    this.bc = new BroadcastChannel('win11-nearby');
    this.bc.onmessage = e => {
      const m = e.data; if (!m || m.from === this.id) return;
      if (m.type === 'hello' || m.type === 'pong') { this.peers[m.from] = { name: m.name, t: Date.now() }; if (m.type === 'hello') this.send({ type: 'pong' }); Bus.emit('nearby:peers'); }
      else if (m.type === 'bye') { delete this.peers[m.from]; Bus.emit('nearby:peers'); }
      else if (m.type === 'share' && (!m.to || m.to === this.id)) {
        this.inbox.unshift(Object.assign({ t: Date.now(), read: false }, m));
        Bus.emit('nearby:inbox');
        Shell.toast('Nearby Share', (m.name || 'Someone') + ' sent ' + (m.kind === 'file' ? m.fileName : 'a message') + '. Open Nearby Share to accept.', '📡');
      } else if (!m.to || m.to === this.id) Bus.emit('nearby:msg', m);
    };
    this.send({ type: 'hello' });
    window.addEventListener('beforeunload', () => this.send({ type: 'bye' }));
    setInterval(() => { this.send({ type: 'hello' }); const now = Date.now(); Object.keys(this.peers).forEach(k => { if (now - this.peers[k].t > 12000) { delete this.peers[k]; Bus.emit('nearby:peers'); } }); }, 5000);
  },
  send(m) { if (this.bc) this.bc.postMessage(Object.assign({ from: this.id, name: this.name() }, m)); },
  shareText(to, text) { this.send({ type: 'share', to, kind: 'text', text }); Achievements.unlock('nearby'); },
  shareFile(to, path) { const n = FS.get(path); if (!n || n.type !== 'file') return false; if (String(n.content).length > 900000) { Shell.toast('Nearby Share', 'That file is too large to send between tabs (max ~900 KB).', '📡'); return false; } this.send({ type: 'share', to, kind: 'file', fileName: path.split('/').pop(), mime: n.mime, content: n.content }); Achievements.unlock('nearby'); return true; },
  accept(item) {
    item.read = true;
    if (item.kind === 'file') { const dir = HOME + '/Downloads'; const dot = item.fileName.lastIndexOf('.'); const p = dir + '/' + FS.uniqueName(dir, dot > 0 ? item.fileName.slice(0, dot) : item.fileName, dot > 0 ? item.fileName.slice(dot) : ''); FS.write(p, item.content, item.mime || 'application/octet-stream'); Shell.toast('Nearby Share', 'Saved to Downloads as ' + p.split('/').pop(), '📥'); return p; }
    ClipHistory.push(item.text); Shell.toast('Nearby Share', 'Text copied to clipboard history.', '📋'); return null;
  }
};
document.addEventListener('DOMContentLoaded', () => Nearby.init());
Apps.register({
  id: 'nearby', name: 'Nearby Share', icon: '📡', color: 'linear-gradient(135deg,#00b4db,#0083b0)',
  category: 'Utilities', width: 640, height: 520, singleton: true,
  mount(win) {
    win.body.innerHTML = `<div class="nb-root"><div class="nb-col"><div class="ol-lbl">This device</div><div class="nb-me">📡 ${Utils.esc(Nearby.name())}</div><div class="ol-lbl">Nearby devices <small>(other tabs of this site in this browser)</small></div><div class="nb-peers"></div><div class="ol-lbl">Send</div><div class="nb-send"><textarea class="fluent-input nb-text" placeholder="Type a message…" spellcheck="false"></textarea><div class="oc-btns" style="padding:0"><button class="fluent-btn nb-sendtext">Send text</button><button class="fluent-btn subtle nb-sendfile">Send a file…</button></div></div></div><div class="nb-col"><div class="ol-lbl">Received</div><div class="nb-inbox"></div></div></div>`;
    let target = '';
    const $ = s => win.body.querySelector(s);
    function renderPeers() {
      const ks = Object.keys(Nearby.peers);
      $('.nb-peers').innerHTML = ks.length ? ks.map(k => `<label class="nb-peer"><input type="radio" name="nb-to" value="${k}" ${target === k ? 'checked' : ''}> 💻 ${Utils.esc(Nearby.peers[k].name)}</label>`).join('') + `<label class="nb-peer"><input type="radio" name="nb-to" value="" ${target === '' ? 'checked' : ''}> 📢 Everyone nearby</label>` : '<div class="wg-sub">No other tabs found. Open this site in a second tab (same browser) and it will appear here.</div>';
    }
    function renderInbox() {
      $('.nb-inbox').innerHTML = Nearby.inbox.length ? Nearby.inbox.map((m, i) => `<div class="nb-item ${m.read ? 'read' : ''}"><div class="nb-item-h"><b>${Utils.esc(m.name || 'Someone')}</b><small>${new Date(m.t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small></div><div>${m.kind === 'file' ? '📄 ' + Utils.esc(m.fileName) + ' (' + Utils.fmtBytes(String(m.content).length) + ')' : Utils.esc(m.text)}</div>${m.read ? '' : `<div class="oc-btns" style="padding:8px 0 0"><button class="fluent-btn" data-accept="${i}">${m.kind === 'file' ? 'Save to Downloads' : 'Copy'}</button><button class="fluent-btn subtle" data-dismiss="${i}">Dismiss</button></div>`}</div>`).join('') : '<div class="wg-sub">Nothing received yet.</div>';
    }
    $('.nb-peers').addEventListener('change', e => { if (e.target.name === 'nb-to') target = e.target.value; });
    $('.nb-sendtext').addEventListener('click', () => { const t = $('.nb-text').value.trim(); if (!t) return; if (!Object.keys(Nearby.peers).length) { Shell.toast('Nearby Share', 'Nobody is nearby. Open a second tab first.', '📡'); return; } Nearby.shareText(target || null, t); $('.nb-text').value = ''; Shell.toast('Nearby Share', 'Sent.', '📡'); });
    $('.nb-sendfile').addEventListener('click', () => { if (!Object.keys(Nearby.peers).length) { Shell.toast('Nearby Share', 'Nobody is nearby. Open a second tab first.', '📡'); return; } FileDialog.show({ mode: 'open', title: 'Send a file', dir: HOME + '/Documents' }).then(p => { if (p && Nearby.shareFile(target || null, p)) Shell.toast('Nearby Share', 'Sent ' + p.split('/').pop(), '📡'); }); });
    $('.nb-inbox').addEventListener('click', e => { const a = e.target.closest('[data-accept]'), d = e.target.closest('[data-dismiss]'); if (a) { const p = Nearby.accept(Nearby.inbox[+a.dataset.accept]); renderInbox(); if (p) Apps.launch('explorer', { path: HOME + '/Downloads' }); } if (d) { Nearby.inbox.splice(+d.dataset.dismiss, 1); renderInbox(); } });
    win.on('nearby:peers', renderPeers); win.on('nearby:inbox', renderInbox);
    renderPeers(); renderInbox();
  }
});

/* ---------- Ctrl+Alt+Del ---------- */
const CAD = {
  el: null,
  show() {
    if (this.el) return;
    Achievements.unlock('cad');
    this.el = Utils.el('div'); this.el.id = 'cad';
    this.el.innerHTML = `<div class="cad-list"><button data-a="lock">Lock</button><button data-a="switch">Switch user</button><button data-a="signout">Sign out</button><button data-a="task">Task Manager</button></div><div class="cad-foot"><button data-a="cancel">Cancel</button><button data-a="power">⏻</button></div>`;
    document.body.appendChild(this.el);
    this.el.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      const a = b.dataset.a; this.hide();
      if (a === 'lock' || a === 'switch') Lock.show(); else if (a === 'signout') Power.shutdown(true); else if (a === 'task') Apps.launch('taskmgr'); else if (a === 'power') Power.menu(innerWidth - 220, innerHeight - 200);
    });
  },
  hide() { if (this.el) { this.el.remove(); this.el = null; } }
};
document.addEventListener('keydown', e => { if (e.ctrlKey && e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); CAD.show(); } else if (CAD.el && e.key === 'Escape') CAD.hide(); });
