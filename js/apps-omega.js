/* ============ Windows 11 Web — omega: shared Open/Save dialog, printing ============ */
'use strict';

/* ---------- FileDialog: a real Open / Save As dialog over the virtual FS ---------- */
const FileDialog = {
  el: null,
  show(opts) {
    opts = Object.assign({ mode: 'save', title: null, dir: HOME + '/Documents', name: '', exts: [], filter: null }, opts || {});
    return new Promise(resolve => {
      if (this.el) this.close(null);
      let cwd = FS.get(opts.dir) ? opts.dir : HOME, selected = null;
      const done = v => { this.close(); resolve(v); };
      this._resolve = resolve;
      const el = Utils.el('div', 'fd-backdrop');
      el.innerHTML = `<div class="fd-dlg" role="dialog">
        <div class="fd-head"><span>${opts.title ? Utils.esc(opts.title) : opts.mode === 'save' ? 'Save As' : 'Open'}</span><button class="fd-x">✕</button></div>
        <div class="fd-bar"><button class="fd-up" title="Up">↑</button><div class="fd-crumb"></div><button class="fd-newdir" title="New folder">📁+</button></div>
        <div class="fd-main"><div class="fd-side">${[['🖥️', 'Desktop', HOME + '/Desktop'], ['📄', 'Documents', HOME + '/Documents'], ['🖼️', 'Pictures', HOME + '/Pictures'], ['🎵', 'Music', HOME + '/Music'], ['🎬', 'Videos', HOME + '/Videos'], ['⬇️', 'Downloads', HOME + '/Downloads'], ['💽', 'Local Disk (C:)', 'C:']].map(([i, n, p]) => `<div class="fd-side-item" data-p="${p}"><span>${i}</span><span>${n}</span></div>`).join('')}</div><div class="fd-files"></div></div>
        <div class="fd-foot"><label>File name:</label><input class="fd-name" spellcheck="false" value="${Utils.esc(opts.name)}">${opts.exts.length ? `<select class="fd-ext">${opts.exts.map(x => `<option value="${x}">${x}</option>`).join('')}</select>` : ''}<button class="fluent-btn fd-ok">${opts.mode === 'save' ? 'Save' : 'Open'}</button><button class="fluent-btn subtle fd-cancel">Cancel</button></div>
      </div>`;
      document.body.appendChild(el); this.el = el;
      const $ = s => el.querySelector(s);
      const match = name => !opts.filter || opts.filter.test(name);
      function render() {
        el.querySelectorAll('.fd-side-item').forEach(x => x.classList.toggle('sel', x.dataset.p === cwd));
        const crumbs = ['C:', ...cwd.split('/').filter(p => p && p !== 'C:')]; let acc = '';
        $('.fd-crumb').innerHTML = crumbs.map((c, i) => { acc = i === 0 ? 'C:' : acc + '/' + c; return `<span data-p="${acc}">${Utils.esc(c)}</span>`; }).join('<i>›</i>');
        const items = FS.list(cwd).filter(it => it.node.type === 'folder' || match(it.name));
        $('.fd-files').innerHTML = items.map(it => `<div class="fd-item ${selected === it.name ? 'sel' : ''}" data-n="${Utils.esc(it.name)}" data-t="${it.node.type}"><span>${fileIcon(it.name, it.node)}</span><span>${Utils.esc(it.name)}</span></div>`).join('') || '<div class="wg-sub" style="padding:20px;text-align:center">Empty folder</div>';
      }
      const nav = p => { if (FS.get(p) && FS.get(p).type === 'folder') { cwd = p; selected = null; render(); } };
      $('.fd-side').addEventListener('click', e => { const it = e.target.closest('.fd-side-item'); if (it) nav(it.dataset.p); });
      $('.fd-crumb').addEventListener('click', e => { const c = e.target.closest('[data-p]'); if (c) nav(c.dataset.p); });
      $('.fd-up').addEventListener('click', () => { const parts = cwd.split('/'); parts.pop(); nav(parts.join('/') || 'C:'); });
      $('.fd-newdir').addEventListener('click', () => { const p = cwd + '/' + FS.uniqueName(cwd, 'New folder', ''); FS.mkdir(p); render(); });
      $('.fd-files').addEventListener('click', e => { const it = e.target.closest('.fd-item'); if (!it) return; selected = it.dataset.n; el.querySelectorAll('.fd-item').forEach(x => x.classList.toggle('sel', x === it)); if (it.dataset.t !== 'folder') $('.fd-name').value = it.dataset.n; });
      $('.fd-files').addEventListener('dblclick', e => { const it = e.target.closest('.fd-item'); if (!it) return; if (it.dataset.t === 'folder') nav(cwd + '/' + it.dataset.n); else ok(); });
      const ok = () => {
        let name = $('.fd-name').value.trim();
        if (!name) return;
        if (/[\\/:*?"<>|]/.test(name)) { Shell.toast('File name', 'A file name can\'t contain \\ / : * ? " < > |', '⚠️'); return; }
        const extSel = $('.fd-ext');
        if (extSel && !name.toLowerCase().endsWith(extSel.value)) name = name.replace(/\.[^.]+$/, '') + extSel.value;
        const p = cwd + '/' + name;
        if (opts.mode === 'open') { if (!FS.get(p) || FS.get(p).type !== 'file') { Shell.toast('Open', 'Select a file first.', '📂'); return; } done(p); return; }
        if (FS.get(p) && !confirm(name + ' already exists. Replace it?')) return;
        done(p);
      };
      $('.fd-ok').addEventListener('click', ok);
      $('.fd-name').addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
      $('.fd-cancel').addEventListener('click', () => done(null));
      $('.fd-x').addEventListener('click', () => done(null));
      el.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } });
      el.addEventListener('pointerdown', e => e.stopPropagation());
      render();
      setTimeout(() => { const n = $('.fd-name'); n.focus(); n.select(); }, 40);
    });
  },
  close(v) { if (this.el) { this.el.remove(); this.el = null; } if (v === null && this._resolve) { this._resolve(null); this._resolve = null; } }
};

/* ---------- Printing: only the given element goes to paper ---------- */
const Printer = {
  print(html, title) {
    const old = document.getElementById('print-root'); if (old) old.remove();
    const root = Utils.el('div'); root.id = 'print-root'; root.innerHTML = html;
    document.body.appendChild(root);
    const t = document.title; if (title) document.title = title;
    const cleanup = () => { root.remove(); document.title = t; window.removeEventListener('afterprint', cleanup); };
    window.addEventListener('afterprint', cleanup);
    setTimeout(() => { window.print(); setTimeout(cleanup, 1500); }, 50);
  }
};
