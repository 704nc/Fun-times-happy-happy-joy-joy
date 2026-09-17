/* ============ Windows 11 Web — theta: PIN sign-in, widget customization ============ */
'use strict';

Achievements.list.push({ id: 'pin', name: 'Four Digits of Security', desc: 'Set a sign-in PIN.', icon: '🔐', pts: 10 });

/* ---------- PIN sign-in (hashed locally with SHA-256 + salt; this is still a browser tab) ---------- */
const PinLock = {
  KEY: 'win11.pin', open: false, bypass: false, fails: 0, lockedUntil: 0,
  enabled() { return !!Store.get(this.KEY, null); },
  async hash(pin, salt) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + ':' + pin)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); },
  async set(pin) { const salt = Math.random().toString(36).slice(2) + Date.now().toString(36); Store.set(this.KEY, { salt, hash: await this.hash(pin, salt) }); Achievements.unlock('pin'); },
  clear() { localStorage.removeItem(this.KEY); },
  async verify(pin) { const rec = Store.get(this.KEY, null); if (!rec) return true; return (await this.hash(pin, rec.salt)) === rec.hash; },
  prompt(lockEl, onOk) {
    if (this.open || lockEl.querySelector('.pin-box')) return;
    this.open = true;
    const box = Utils.el('div', 'pin-box');
    box.innerHTML = `<div class="pin-avatar">${Utils.esc(Settings.get('avatar') || (Settings.get('userName') || 'S')[0].toUpperCase())}</div><div class="pin-name">${Utils.esc(Settings.get('userName') || 'Seefood')}</div><input class="pin-input" type="password" inputmode="numeric" maxlength="8" placeholder="PIN" autocomplete="off"><div class="pin-msg"></div><div class="pin-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '⏎'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div><button class="pin-forgot">I forgot my PIN</button>`;
    lockEl.appendChild(box);
    box.addEventListener('click', e => e.stopPropagation());
    box.addEventListener('keydown', e => e.stopPropagation());
    const input = box.querySelector('.pin-input'), msg = box.querySelector('.pin-msg');
    const done = () => { this.open = false; box.remove(); };
    const submit = async () => {
      if (Date.now() < this.lockedUntil) { msg.textContent = 'Too many attempts. Wait ' + Math.ceil((this.lockedUntil - Date.now()) / 1000) + 's.'; return; }
      const v = input.value.trim(); if (!v) return;
      if (await this.verify(v)) { this.fails = 0; done(); onOk(); }
      else { this.fails++; input.value = ''; box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); msg.textContent = 'The PIN is incorrect. Try again.'; if (this.fails >= 5) { this.lockedUntil = Date.now() + 30000; this.fails = 0; msg.textContent = 'Too many attempts. Wait 30 seconds.'; } }
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); else if (e.key === 'Escape') done(); });
    box.querySelector('.pin-pad').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k; if (k === '⌫') input.value = input.value.slice(0, -1); else if (k === '⏎') submit(); else if (input.value.length < 8) input.value += k; input.focus(); });
    box.querySelector('.pin-forgot').addEventListener('click', () => { if (confirm('Remove the PIN? (It only ever lived in this browser, so this is allowed.)')) { this.clear(); done(); onOk(); } });
    setTimeout(() => input.focus(), 50);
  },
  // wraps a lock screen's unlock function: with a PIN set, the first click/keypress opens the pad instead
  gate(lockEl, unlock) {
    const fire = () => { lockEl.removeEventListener('click', h); document.removeEventListener('keydown', h); unlock(); };
    const h = e => { if (this.enabled() && !this.bypass) { if (e && e.type === 'keydown' && e.target && e.target.closest && e.target.closest('.pin-box')) return; this.prompt(lockEl, fire); } else { this.bypass = false; fire(); } };
    lockEl.addEventListener('click', h); document.addEventListener('keydown', h);
  }
};

/* ---------- Widgets: hide cards you don't want ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const KEY = 'win11.widgets.hidden';
  const render = Widgets.render.bind(Widgets);
  Widgets.render = function () {
    render();
    const hidden = Store.get(KEY, []);
    const cards = [...this.el.querySelectorAll('.wg-card')];
    cards.forEach(c => { const t = (c.querySelector('.wg-title') || {}).textContent || ''; const key = t.split('•')[0].trim(); c.dataset.key = key; if (hidden.includes(key)) { c.style.display = 'none'; return; } const x = Utils.el('button', 'wg-hide', '✕'); x.title = 'Hide this widget'; x.addEventListener('click', e => { e.stopPropagation(); Store.set(KEY, hidden.concat([key])); this.render(); }); c.appendChild(x); });
    if (hidden.length) { const r = Utils.el('div', 'wg-restore', `${hidden.length} hidden widget${hidden.length > 1 ? 's' : ''} — <a>show all</a>`); r.querySelector('a').addEventListener('click', e => { e.stopPropagation(); Store.set(KEY, []); this.render(); }); this.el.appendChild(r); }
  };
});
