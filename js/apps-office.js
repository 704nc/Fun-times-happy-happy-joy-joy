/* ============ Windows 11 Web — Microsoft Office suite ============ */
'use strict';

/* ---------- Word ---------- */
Apps.register({
  id: 'word', name: 'Word', icon: 'W', letter: true, color: 'linear-gradient(135deg,#2b579a,#153a6e)',
  category: 'Microsoft Office', width: 940, height: 640,
  mount(win, args) {
    let path = args.path || null;
    win.body.innerHTML = `
      <div class="office-ribbon" style="--office-color:#2b579a;background:#2b579a">
        <span class="o-name">Word</span>
        <input class="doc-name" placeholder="Document1" spellcheck="false">
        <button class="o-save w-open" style="margin-left:auto">📂 Open</button>
        <button class="o-save w-saveas" style="margin-left:0">Save As…</button>
        <button class="o-save" style="margin-left:0">💾 Save</button>
        <button class="o-save w-print" style="margin-left:0" title="Print (Ctrl+P)">🖨️</button>
        <button class="o-save w-export" style="margin-left:0" title="Download">⬇️</button>
      </div>
      <div class="app-toolbar">
        <select class="w-block"><option value="p">Normal</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option><option value="blockquote">Quote</option></select>
        <select class="w-font"><option value="Calibri">Calibri</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times</option><option value="Courier New">Courier</option><option value="Comic Sans MS">Comic Sans</option></select>
        <select class="w-size"><option value="2">10</option><option value="3" selected>12</option><option value="4">14</option><option value="5">18</option><option value="6">24</option><option value="7">36</option></select>
        <div class="sep"></div>
        <button data-cmd="bold" title="Bold"><b>B</b></button>
        <button data-cmd="italic" title="Italic"><i>I</i></button>
        <button data-cmd="underline" title="Underline"><u>U</u></button>
        <button data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button>
        <div class="sep"></div>
        <input type="color" class="w-color" value="#000000" title="Text color">
        <button data-cmd="insertUnorderedList" title="Bullets">• List</button>
        <button data-cmd="insertOrderedList" title="Numbered">1. List</button>
        <div class="sep"></div>
        <button data-cmd="justifyLeft" title="Align left">⯇</button>
        <button data-cmd="justifyCenter" title="Center">≡</button>
        <button data-cmd="justifyRight" title="Align right">⯈</button>
        <div class="sep"></div>
        <button data-cmd="undo">↶</button>
        <button data-cmd="redo">↷</button>
        <div class="sep"></div>
        <button class="w-img" title="Insert picture from Pictures">🖼️</button>
        <button class="w-table" title="Insert table">▦</button>
        <button data-cmd="insertHorizontalRule" title="Horizontal line">―</button>
        <button class="w-date" title="Insert date">📅</button>
        <button class="w-find" title="Find (Ctrl+F)">🔍</button>
        <span class="w-count" style="margin-left:auto;font-size:12px;color:var(--text-2)"></span>
      </div>
      <div class="np-findbar w-findbar" style="display:none"><input class="fluent-input w-q" placeholder="Find in document" spellcheck="false"><button class="fluent-btn subtle w-next">Next</button><span class="np-count w-fcount"></span><button class="np-findx w-findx">✕</button></div>
      <div class="word-page-wrap"><div class="word-page" contenteditable="true" spellcheck="false"></div></div>`;
    const $ = s => win.body.querySelector(s);
    const page = $('.word-page');
    const nameInput = $('.doc-name');
    if (path) {
      const n = FS.get(path);
      page.innerHTML = n ? n.content : '<p></p>';
      nameInput.value = path.split('/').pop().replace(/\.(docx?|txt)$/i, '');
      win.setTitle(path.split('/').pop() + ' - Word');
    } else {
      page.innerHTML = '<p>Start writing your document here…</p>';
      win.setTitle('Document1 - Word');
    }
    win.body.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => {
      page.focus();
      document.execCommand(b.dataset.cmd, false, null);
    }));
    $('.w-block').addEventListener('change', e => {
      page.focus();
      document.execCommand('formatBlock', false, e.target.value === 'p' ? 'p' : e.target.value);
    });
    $('.w-color').addEventListener('input', e => {
      page.focus();
      document.execCommand('foreColor', false, e.target.value);
    });
    $('.w-font').addEventListener('change', e => { page.focus(); document.execCommand('fontName', false, e.target.value); });
    $('.w-size').addEventListener('change', e => { page.focus(); document.execCommand('fontSize', false, e.target.value); });
    $('.w-img').addEventListener('click', () => FileDialog.show({ mode: 'open', title: 'Insert picture', dir: HOME + '/Pictures', filter: /\.(png|jpe?g|gif|svg|webp|bmp)$/i }).then(p => { if (!p) return; page.focus(); document.execCommand('insertHTML', false, `<img src="${FS.get(p).content}" style="max-width:100%;height:auto" alt="${Utils.esc(p.split('/').pop())}">`); updCount(); }));
    $('.w-table').addEventListener('click', () => { const rc = prompt('Table size (rows x columns):', '3x3'); const m = String(rc || '').match(/(\d+)\s*[x×]\s*(\d+)/i); if (!m) return; const r = Math.min(20, +m[1]), c = Math.min(10, +m[2]); page.focus(); document.execCommand('insertHTML', false, `<table class="w-tbl"><tbody>${Array.from({ length: r }, () => `<tr>${Array.from({ length: c }, () => '<td>&nbsp;</td>').join('')}</tr>`).join('')}</tbody></table><p></p>`); updCount(); });
    $('.w-date').addEventListener('click', () => { page.focus(); document.execCommand('insertText', false, new Date().toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })); });
    $('.w-find').addEventListener('click', () => { $('.w-findbar').style.display = ''; $('.w-q').focus(); $('.w-q').select(); });
    $('.w-findx').addEventListener('click', () => { $('.w-findbar').style.display = 'none'; page.focus(); });
    const findNext = () => { const q = $('.w-q').value; if (!q) return; const txt = page.innerText.toLowerCase(); const n = txt.split(q.toLowerCase()).length - 1; $('.w-fcount').textContent = n ? n + ' match' + (n > 1 ? 'es' : '') : 'Not found'; if (!n) return; const sel = getSelection(); if (!page.contains(sel.anchorNode)) { sel.removeAllRanges(); const r = document.createRange(); r.setStart(page, 0); r.collapse(true); sel.addRange(r); } if (!window.find || !window.find(q, false, false, true, false, false, false)) { sel.removeAllRanges(); const r = document.createRange(); r.setStart(page, 0); r.collapse(true); sel.addRange(r); if (window.find) window.find(q, false, false, true, false, false, false); } };
    $('.w-next').addEventListener('click', findNext);
    $('.w-q').addEventListener('keydown', e => { if (e.key === 'Enter') findNext(); if (e.key === 'Escape') $('.w-findx').click(); });
    $('.w-open').addEventListener('click', () => FileDialog.show({ mode: 'open', dir: HOME + '/Documents', filter: /\.(docx?|txt|html?)$/i }).then(p => { if (!p) return; path = p; const n = FS.get(p); page.innerHTML = /\.docx?$/i.test(p) ? n.content : '<p>' + Utils.esc(String(n.content)).replace(/\n/g, '<br>') + '</p>'; nameInput.value = p.split('/').pop().replace(/\.[^.]+$/, ''); win.setTitle(p.split('/').pop() + ' - Word'); updCount(); }));
    $('.w-print').addEventListener('click', () => Printer.print('<div class="print-doc">' + page.innerHTML + '</div>', nameInput.value || 'Document'));
    $('.w-export').addEventListener('click', () => { const fmt = prompt('Download as: txt, html or md', 'txt'); if (!fmt) return; const name = (nameInput.value.trim() || 'Document1'); let content, type; if (/html/i.test(fmt)) { content = '<!doctype html><meta charset="utf-8"><title>' + Utils.esc(name) + '</title><body style="font-family:Calibri,sans-serif;max-width:720px;margin:40px auto">' + page.innerHTML; type = 'text/html'; } else if (/md/i.test(fmt)) { content = page.innerText; type = 'text/markdown'; } else { content = page.innerText; type = 'text/plain'; } const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name + '.' + fmt.toLowerCase().replace(/[^a-z]/g, ''); document.body.appendChild(a); a.click(); a.remove(); });
    const updCount = () => {
      const words = (page.innerText.trim().match(/\S+/g) || []).length;
      const pages = Math.max(1, Math.ceil(page.innerText.length / 3000));
      $('.w-count').textContent = words + ' word' + (words === 1 ? '' : 's') + ' • ' + pages + ' page' + (pages === 1 ? '' : 's');
    };
    page.addEventListener('input', updCount);
    updCount();
    function save() {
      const name = (nameInput.value.trim() || 'Document1');
      path = (path && path.split('/').pop().replace(/\.docx?$/i, '') === name)
        ? path : 'C:/Users/Seefood/Documents/' + name + '.doc';
      FS.write(path, page.innerHTML, 'application/msword');
      win.setTitle(name + '.doc - Word');
      Shell.toast('Word', 'Saved to Documents/' + name + '.doc', '📘');
    }
    $('.office-ribbon .o-save:not(.w-open):not(.w-saveas):not(.w-print):not(.w-export)').addEventListener('click', save);
    $('.w-saveas').addEventListener('click', () => FileDialog.show({ mode: 'save', dir: HOME + '/Documents', name: (nameInput.value.trim() || 'Document1') + '.doc', exts: ['.doc'] }).then(p => { if (!p) return; path = p; nameInput.value = p.split('/').pop().replace(/\.doc$/i, ''); FS.write(p, page.innerHTML, 'application/msword'); win.setTitle(p.split('/').pop() + ' - Word'); Shell.toast('Word', 'Saved ' + p.split('/').pop(), '📘'); }));
    win.body.addEventListener('keydown', e => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 's') { e.preventDefault(); if (e.shiftKey) $('.w-saveas').click(); else save(); }
      else if (mod && e.key === 'f') { e.preventDefault(); $('.w-find').click(); }
      else if (mod && e.key === 'p') { e.preventDefault(); $('.w-print').click(); }
      else if (mod && e.key === 'o') { e.preventDefault(); $('.w-open').click(); }
    });
  }
});

/* ---------- Excel ---------- */
Apps.register({
  id: 'excel', name: 'Excel', icon: 'X', letter: true, color: 'linear-gradient(135deg,#107c41,#0a5a2f)',
  category: 'Microsoft Office', width: 980, height: 620,
  mount(win, args) {
    const COLS = 12, ROWS = 40;
    const colName = i => String.fromCharCode(65 + i);
    let path = args.path || null;
    let cells = {}, chart = null, fmt = {}; // "A1" -> raw string; chart = { range, type }; fmt[ref] = { bold, cur, pct, dec }
    if (path) {
      const n = FS.get(path);
      if (n) { try { const j = JSON.parse(n.content); cells = j.cells || {}; chart = j.chart || null; fmt = j.fmt || {}; } catch (e) {} }
    }
    win.body.innerHTML = `
      <div class="office-ribbon" style="background:#107c41">
        <span class="o-name">Excel</span>
        <input class="doc-name" placeholder="Book1" spellcheck="false">
        <button class="o-save">💾 Save</button>
        <button class="o-chart">📊 Chart</button>
        <button class="o-save x-csv" style="margin-left:0" title="Download as CSV">⬇️ CSV</button>
      </div>
      <div class="app-toolbar x-fmt"><button data-f="bold" title="Bold"><b>B</b></button><button data-f="cur" title="Currency">$</button><button data-f="pct" title="Percent">%</button><button data-f="dec+" title="More decimals">.00</button><button data-f="dec-" title="Fewer decimals">.0</button><button data-f="clear" title="Clear formatting">✕</button><span class="wg-sub" style="margin-left:auto">Functions: SUM AVG MIN MAX COUNT ROUND ABS SQRT POWER MOD INT MEDIAN PRODUCT IF PI RAND • comparisons in IF: = &lt;&gt; &lt; &gt; &lt;= &gt;=</span></div>
      <div class="xl-chart" style="display:none"><div class="xl-chart-bar"><span class="xl-chart-title"></span><select class="xl-chart-type"><option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option></select><button class="xl-chart-x" title="Remove chart">✕</button></div><canvas width="640" height="220"></canvas></div>
      <div class="excel-formula-bar">
        <div class="cell-ref">A1</div>
        <input class="fx-input" placeholder="Enter a value or formula, e.g. =SUM(A1:A5)" spellcheck="false">
      </div>
      <div class="excel-grid-wrap">
        <table class="excel-grid">
          <thead><tr><th></th>${Array.from({ length: COLS }, (_, c) => `<th>${colName(c)}</th>`).join('')}</tr></thead>
          <tbody>${Array.from({ length: ROWS }, (_, r) =>
            `<tr><th>${r + 1}</th>${Array.from({ length: COLS }, (_, c) => `<td data-ref="${colName(c)}${r + 1}" tabindex="0"></td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>`;
    const $ = s => win.body.querySelector(s);
    const nameInput = $('.doc-name');
    const fxInput = $('.fx-input');
    const refEl = $('.cell-ref');
    if (path) {
      nameInput.value = path.split('/').pop().replace(/\.xlsx?$/i, '');
      win.setTitle(path.split('/').pop() + ' - Excel');
    } else win.setTitle('Book1 - Excel');

    /* formula evaluation */
    function cellValue(ref, seen) {
      seen = seen || new Set();
      if (seen.has(ref)) return '#CIRC!';
      seen.add(ref);
      const raw = cells[ref];
      if (raw === undefined || raw === '') return '';
      if (String(raw)[0] === '=') return evalFormula(String(raw).slice(1), seen);
      const num = parseFloat(raw);
      return (!isNaN(num) && /^-?[\d.]+$/.test(String(raw).trim())) ? num : raw;
    }
    function rangeRefs(range) {
      const m = range.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
      if (!m) return [];
      const c1 = m[1].charCodeAt(0) - 65, r1 = +m[2], c2 = m[3].charCodeAt(0) - 65, r2 = +m[4];
      const out = [];
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
        for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
          out.push(colName(c) + r);
      return out;
    }
    function evalFormula(f, seen) {
      try {
        let expr = f.toUpperCase().replace(/\s+/g, '');
        // functions over ranges
        expr = expr.replace(/(SUM|AVG|AVERAGE|MIN|MAX|COUNT|MEDIAN|PRODUCT)\(([A-Z]+\d+:[A-Z]+\d+)\)/g, (_, fn, range) => {
          const vals = rangeRefs(range).map(r => cellValue(r, new Set(seen))).filter(v => typeof v === 'number');
          if (fn === 'SUM') return vals.reduce((a, b) => a + b, 0);
          if (fn === 'AVG' || fn === 'AVERAGE') return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          if (fn === 'MIN') return vals.length ? Math.min(...vals) : 0;
          if (fn === 'MAX') return vals.length ? Math.max(...vals) : 0;
          if (fn === 'MEDIAN') { const s = vals.slice().sort((a, b) => a - b); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; }
          if (fn === 'PRODUCT') return vals.reduce((a, b) => a * b, 1);
          return vals.length;
        });
        // cell refs
        expr = expr.replace(/[A-Z]+\d+/g, r => {
          const v = cellValue(r, new Set(seen));
          return typeof v === 'number' ? v : (v === '' ? 0 : NaN);
        });
        // scalar functions and IF with comparisons
        expr = expr.replace(/\b(ROUND|ABS|SQRT|POWER|MOD|INT|IF|PI|RAND|SUM|MIN|MAX|AVG|AVERAGE)\(/g, 'F.$1(');
        expr = expr.replace(/<>/g, '!=').replace(/(^|[^<>!=])=(?!=)/g, '$1==');
        if (!/^[-+*/().,\d\sNaN<>=!?F.A-Z]+$/.test(expr)) return '#NAME?';
        const F = { ROUND: (x, n) => { const m = Math.pow(10, n || 0); return Math.round(x * m) / m; }, ABS: Math.abs, SQRT: Math.sqrt, POWER: Math.pow, MOD: (a, b) => a % b, INT: Math.floor, IF: (c, a, b) => c ? a : (b === undefined ? 0 : b), PI: () => Math.PI, RAND: Math.random, SUM: (...a) => a.reduce((x, y) => x + y, 0), MIN: Math.min, MAX: Math.max, AVG: (...a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, AVERAGE: (...a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0 };
        const val = Function('F', '"use strict";return (' + expr + ')')(F);
        if (typeof val !== 'number' || isNaN(val)) return '#VALUE!';
        return Math.round(val * 1e8) / 1e8;
      } catch (e) { return '#ERROR!'; }
    }
    function renderAll() {
      win.body.querySelectorAll('td[data-ref]').forEach(td => {
        const v = cellValue(td.dataset.ref), f = fmt[td.dataset.ref];
        let out = v;
        if (typeof v === 'number' && f) { const dec = f.dec !== undefined ? f.dec : (f.cur ? 2 : f.pct ? 1 : undefined); out = f.pct ? (v * 100).toFixed(dec) + '%' : (dec !== undefined ? v.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec }) : v); if (f.cur) out = '$' + out; }
        td.textContent = out;
        td.classList.toggle('num', typeof v === 'number');
        td.style.fontWeight = f && f.bold ? '700' : '';
      });
      drawChart();
    }
    function drawChart() {
      const box = $('.xl-chart');
      if (!chart) { box.style.display = 'none'; return; }
      box.style.display = '';
      const refs = rangeRefs(chart.range);
      const m = chart.range.match(/^([A-Z])(\d+):([A-Z])(\d+)$/); if (!m) return;
      const c1 = m[1].charCodeAt(0) - 65, r1 = +m[2], r2 = +m[4];
      const labels = [], values = [];
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
        const a = cellValue(colName(c1) + r), b = cellValue(colName(c1 + 1) + r);
        if (typeof b === 'number') { labels.push(String(a)); values.push(b); }
      }
      $('.xl-chart-title').textContent = chart.range + (values.length ? '' : ' — no numbers found in the second column');
      $('.xl-chart-type').value = chart.type;
      const cv = box.querySelector('canvas'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      if (!values.length) return;
      const accent = ['#107c41', '#0078d4', '#ca5010', '#8764b8', '#e3008c', '#038387', '#c42b1c', '#ffb900'];
      ctx.font = '12px Segoe UI, system-ui, sans-serif'; ctx.fillStyle = '#333';
      if (chart.type === 'pie') {
        const tot = values.reduce((s, v) => s + Math.max(0, v), 0) || 1; let a0 = -Math.PI / 2;
        values.forEach((v, i) => { const a1 = a0 + Math.max(0, v) / tot * Math.PI * 2; ctx.fillStyle = accent[i % accent.length]; ctx.beginPath(); ctx.moveTo(150, H / 2); ctx.arc(150, H / 2, 90, a0, a1); ctx.closePath(); ctx.fill(); a0 = a1; ctx.fillRect(270, 20 + i * 18, 12, 12); ctx.fillStyle = '#333'; ctx.fillText(labels[i] + ' — ' + v + ' (' + Math.round(v / tot * 100) + '%)', 290, 31 + i * 18); });
        return;
      }
      const pad = 40, min = Math.min(0, ...values), max = Math.max(...values, 1), span = max - min || 1, n = values.length;
      ctx.strokeStyle = '#ccc'; ctx.beginPath(); ctx.moveTo(pad, 10); ctx.lineTo(pad, H - pad); ctx.lineTo(W - 10, H - pad); ctx.stroke();
      const y = v => H - pad - (v - min) / span * (H - pad - 20);
      const zero = y(0); ctx.strokeStyle = '#999'; ctx.beginPath(); ctx.moveTo(pad, zero); ctx.lineTo(W - 10, zero); ctx.stroke();
      ctx.fillStyle = '#555'; ctx.textAlign = 'right'; ctx.fillText(String(max), pad - 4, 16); ctx.fillText(String(min), pad - 4, H - pad + 4);
      const bw = (W - pad - 20) / n;
      if (chart.type === 'bar') values.forEach((v, i) => { ctx.fillStyle = accent[i % accent.length]; const top = Math.min(y(v), zero); ctx.fillRect(pad + i * bw + bw * .15, top, bw * .7, Math.abs(y(v) - zero)); });
      else { ctx.strokeStyle = '#107c41'; ctx.lineWidth = 2; ctx.beginPath(); values.forEach((v, i) => { const x = pad + i * bw + bw / 2; i ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); }); ctx.stroke(); ctx.fillStyle = '#107c41'; values.forEach((v, i) => { ctx.beginPath(); ctx.arc(pad + i * bw + bw / 2, y(v), 3.5, 0, 7); ctx.fill(); }); ctx.lineWidth = 1; }
      ctx.fillStyle = '#333'; ctx.textAlign = 'center'; labels.forEach((l, i) => ctx.fillText(l.slice(0, 10), pad + i * bw + bw / 2, H - pad + 14));
      ctx.textAlign = 'left';
    }
    $('.x-fmt').addEventListener('click', e => {
      const b = e.target.closest('[data-f]'); if (!b) return;
      const f = fmt[sel] = fmt[sel] || {};
      const k = b.dataset.f;
      if (k === 'bold') f.bold = !f.bold; else if (k === 'cur') { f.cur = !f.cur; if (f.cur) f.pct = false; } else if (k === 'pct') { f.pct = !f.pct; if (f.pct) f.cur = false; }
      else if (k === 'dec+') f.dec = Math.min(6, (f.dec === undefined ? 0 : f.dec) + 1); else if (k === 'dec-') f.dec = Math.max(0, (f.dec === undefined ? 2 : f.dec) - 1); else if (k === 'clear') delete fmt[sel];
      renderAll();
    });
    $('.x-csv').addEventListener('click', () => {
      const rows = []; let maxR = 0, maxC = 0;
      Object.keys(cells).forEach(r => { const m = r.match(/^([A-Z])(\d+)$/); if (m) { maxR = Math.max(maxR, +m[2]); maxC = Math.max(maxC, m[1].charCodeAt(0) - 64); } });
      for (let r = 1; r <= maxR; r++) rows.push(Array.from({ length: maxC }, (_, c) => { const v = cellValue(colName(c) + r); const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','));
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = (nameInput.value.trim() || 'Book1') + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    });
    $('.o-chart').addEventListener('click', () => {
      const guess = (() => { const m = sel.match(/^([A-Z])(\d+)$/); let r = +m[2]; while (r > 1 && cells[m[1] + (r - 1)] !== undefined) r--; let r2 = r; while (cells[m[1] + (r2 + 1)] !== undefined) r2++; return m[1] + r + ':' + colName(m[1].charCodeAt(0) - 65 + 1) + r2; })();
      const range = prompt('Chart range (labels in the first column, numbers in the second):', chart ? chart.range : guess);
      if (!range) return;
      const norm = range.toUpperCase().replace(/\s+/g, '');
      if (!/^[A-L]\d+:[A-L]\d+$/.test(norm)) { Shell.toast('Excel', 'Use a range like A1:B6.', '📗'); return; }
      chart = { range: norm, type: chart ? chart.type : 'bar' }; drawChart();
    });
    $('.xl-chart-type').addEventListener('change', e => { if (chart) { chart.type = e.target.value; drawChart(); } });
    $('.xl-chart-x').addEventListener('click', () => { chart = null; drawChart(); });
    let sel = 'A1';
    function selectCell(ref, focusFormula) {
      sel = ref;
      win.body.querySelectorAll('td.sel').forEach(t => t.classList.remove('sel'));
      const td = win.body.querySelector(`td[data-ref="${ref}"]`);
      if (td) td.classList.add('sel');
      refEl.textContent = ref;
      fxInput.value = cells[ref] || '';
      if (focusFormula) fxInput.focus();
    }
    function commit(val) {
      if (val === '') delete cells[sel]; else cells[sel] = val;
      renderAll();
    }
    win.body.querySelector('tbody').addEventListener('click', e => {
      const td = e.target.closest('td[data-ref]');
      if (td) selectCell(td.dataset.ref);
    });
    win.body.querySelector('tbody').addEventListener('dblclick', e => {
      const td = e.target.closest('td[data-ref]');
      if (td) { selectCell(td.dataset.ref); fxInput.focus(); fxInput.select(); }
    });
    // type directly into grid
    win.body.querySelector('.excel-grid-wrap').addEventListener('keydown', e => {
      const m = sel.match(/^([A-Z])(\d+)$/);
      if (!m) return;
      let c = m[1].charCodeAt(0) - 65, r = +m[2];
      if (e.key === 'ArrowDown' || e.key === 'Enter') r = Math.min(ROWS, r + 1);
      else if (e.key === 'ArrowUp') r = Math.max(1, r - 1);
      else if (e.key === 'ArrowLeft') c = Math.max(0, c - 1);
      else if (e.key === 'ArrowRight' || e.key === 'Tab') c = Math.min(COLS - 1, c + 1);
      else if (e.key === 'Delete' || e.key === 'Backspace') { commit(''); fxInput.value = ''; return; }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { fxInput.focus(); fxInput.value = ''; return; }
      else return;
      e.preventDefault();
      selectCell(colName(c) + r);
      const td = win.body.querySelector(`td[data-ref="${sel}"]`);
      if (td) td.focus();
    });
    fxInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit(fxInput.value);
        const m = sel.match(/^([A-Z])(\d+)$/);
        selectCell(m[1] + Math.min(ROWS, +m[2] + 1));
        const td = win.body.querySelector(`td[data-ref="${sel}"]`);
        if (td) td.focus();
      } else if (e.key === 'Escape') { fxInput.value = cells[sel] || ''; }
    });
    fxInput.addEventListener('input', () => { commit(fxInput.value); });
    function save() {
      const name = nameInput.value.trim() || 'Book1';
      path = 'C:/Users/Seefood/Documents/' + name + '.xls';
      FS.write(path, JSON.stringify({ cells, chart, fmt }), 'application/vnd.ms-excel');
      win.setTitle(name + '.xls - Excel');
      Shell.toast('Excel', 'Saved to Documents/' + name + '.xls', '📗');
    }
    $('.o-save').addEventListener('click', save);
    win.body.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
    });
    renderAll();
    selectCell('A1');
  }
});

/* ---------- PowerPoint ---------- */
Apps.register({
  id: 'powerpoint', name: 'PowerPoint', icon: 'P', letter: true, color: 'linear-gradient(135deg,#c43e1c,#8f2c12)',
  category: 'Microsoft Office', width: 980, height: 640,
  mount(win, args) {
    let path = args.path || null;
    let slides = [{ title: 'Click to add title', body: 'Click to add text' }], theme = 'office', transition = 'fade';
    const THEMES = { office: { name: 'Office', bg: '#ffffff', title: '#111111', body: '#333333', accent: '#c43e1c' }, dark: { name: 'Midnight', bg: '#101418', title: '#ffffff', body: '#cfd8e3', accent: '#4cc9f0' }, ocean: { name: 'Ocean', bg: 'linear-gradient(135deg,#0f2027,#2c5364)', title: '#ffffff', body: '#d7e8ee', accent: '#7fd4ff' }, sunset: { name: 'Sunset', bg: 'linear-gradient(135deg,#ff7e5f,#feb47b)', title: '#2b1b17', body: '#3d2b25', accent: '#7a1f0c' }, mint: { name: 'Mint', bg: '#e8f7f0', title: '#0b5c30', body: '#1d3d2e', accent: '#107c41' }, xp: { name: 'Bliss', bg: 'linear-gradient(180deg,#2a6fd6,#7fb7f2 60%,#4f9d1c)', title: '#ffffff', body: '#f4f9ff', accent: '#ffd700' } };
    if (path) {
      const n = FS.get(path);
      if (n) { try { const j = JSON.parse(n.content); slides = j.slides || slides; theme = j.theme || theme; transition = j.transition || transition; } catch (e) {} }
    }
    let cur = 0;
    win.body.innerHTML = `
      <div class="office-ribbon" style="background:#c43e1c">
        <span class="o-name">PowerPoint</span>
        <input class="doc-name" placeholder="Presentation1" spellcheck="false">
        <button class="pp-add o-save" style="margin-left:0">➕ New slide</button>
        <button class="pp-dup o-save" style="margin-left:0" title="Duplicate slide">⧉</button>
        <button class="pp-up o-save" style="margin-left:0" title="Move up">↑</button>
        <button class="pp-down o-save" style="margin-left:0" title="Move down">↓</button>
        <button class="pp-del o-save" style="margin-left:0">🗑️ Delete</button>
        <button class="pp-img o-save" style="margin-left:0" title="Add a picture to this slide">🖼️</button>
        <select class="pp-theme" title="Theme">${Object.entries(THEMES).map(([k, t]) => `<option value="${k}">${t.name}</option>`).join('')}</select>
        <select class="pp-trans" title="Transition"><option value="none">No transition</option><option value="fade">Fade</option><option value="slide">Slide</option><option value="zoom">Zoom</option></select>
        <button class="pp-present o-save" style="margin-left:0">▶️ Present</button>
        <button class="o-save pp-export" style="margin-left:0" title="Download outline">⬇️</button>
        <button class="o-save">💾 Save</button>
      </div>
      <div class="ppt-root">
        <div class="ppt-thumbs"></div>
        <div class="ppt-stage">
          <div class="ppt-slide">
            <div class="ppt-title" contenteditable="true" spellcheck="false"></div>
            <div class="ppt-cols"><div class="ppt-body" contenteditable="true" spellcheck="false"></div><div class="ppt-img" style="display:none"><img><button class="ppt-img-x" title="Remove picture">✕</button></div></div>
          </div>
          <textarea class="ppt-notes" placeholder="Speaker notes (only you see these)" spellcheck="false"></textarea>
        </div>
      </div>`;
    const $ = s => win.body.querySelector(s);
    const nameInput = $('.doc-name');
    if (path) {
      nameInput.value = path.split('/').pop().replace(/\.pptx?$/i, '');
      win.setTitle(path.split('/').pop() + ' - PowerPoint');
    } else win.setTitle('Presentation1 - PowerPoint');
    const titleEl = $('.ppt-title'), bodyEl = $('.ppt-body'), notesEl = $('.ppt-notes');
    $('.pp-theme').value = theme; $('.pp-trans').value = transition;
    const applyTheme = (slideEl, t) => { const th = THEMES[t] || THEMES.office; slideEl.style.background = th.bg; slideEl.querySelector('.ppt-title').style.color = th.title; slideEl.querySelector('.ppt-body').style.color = th.body; slideEl.style.setProperty('--ppt-accent', th.accent); };
    function renderThumbs() {
      const th = THEMES[theme] || THEMES.office;
      $('.ppt-thumbs').innerHTML = slides.map((s, i) =>
        `<div class="ppt-thumb ${i === cur ? 'sel' : ''}" data-i="${i}" style="background:${th.bg};color:${th.title}"><span class="num">${i + 1}</span><div class="mini-title">${Utils.esc(s.title)}</div>${s.image ? '<span class="mini-img">🖼️</span>' : ''}</div>`).join('');
    }
    function loadSlide() {
      titleEl.textContent = slides[cur].title;
      bodyEl.textContent = slides[cur].body;
      notesEl.value = slides[cur].notes || '';
      const im = $('.ppt-img'); im.style.display = slides[cur].image ? '' : 'none'; if (slides[cur].image) im.querySelector('img').src = slides[cur].image;
      applyTheme($('.ppt-stage .ppt-slide'), theme);
      renderThumbs();
    }
    notesEl.addEventListener('input', () => { slides[cur].notes = notesEl.value; });
    $('.pp-theme').addEventListener('change', e => { theme = e.target.value; loadSlide(); });
    $('.pp-trans').addEventListener('change', e => { transition = e.target.value; });
    $('.pp-dup').addEventListener('click', () => { slides.splice(cur + 1, 0, JSON.parse(JSON.stringify(slides[cur]))); cur++; loadSlide(); });
    $('.pp-up').addEventListener('click', () => { if (cur > 0) { [slides[cur - 1], slides[cur]] = [slides[cur], slides[cur - 1]]; cur--; loadSlide(); } });
    $('.pp-down').addEventListener('click', () => { if (cur < slides.length - 1) { [slides[cur + 1], slides[cur]] = [slides[cur], slides[cur + 1]]; cur++; loadSlide(); } });
    $('.pp-img').addEventListener('click', () => FileDialog.show({ mode: 'open', title: 'Insert picture', dir: HOME + '/Pictures', filter: /\.(png|jpe?g|gif|svg|webp|bmp)$/i }).then(p => { if (!p) return; slides[cur].image = FS.get(p).content; loadSlide(); }));
    $('.ppt-img-x').addEventListener('click', () => { delete slides[cur].image; loadSlide(); });
    $('.pp-export').addEventListener('click', () => { const name = nameInput.value.trim() || 'Presentation1'; const txt = slides.map((s, i) => `Slide ${i + 1}: ${s.title}\n${s.body}${s.notes ? '\n  Notes: ' + s.notes : ''}`).join('\n\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = name + ' outline.txt'; document.body.appendChild(a); a.click(); a.remove(); });
    $('.ppt-thumbs').addEventListener('click', e => {
      const t = e.target.closest('.ppt-thumb');
      if (t) { cur = +t.dataset.i; loadSlide(); }
    });
    titleEl.addEventListener('input', () => { slides[cur].title = titleEl.textContent; renderThumbs(); });
    bodyEl.addEventListener('input', () => { slides[cur].body = bodyEl.textContent; });
    $('.pp-add').addEventListener('click', () => {
      slides.splice(cur + 1, 0, { title: 'New slide', body: '' });
      cur++; loadSlide();
    });
    $('.pp-del').addEventListener('click', () => {
      if (slides.length <= 1) return;
      slides.splice(cur, 1);
      cur = Math.min(cur, slides.length - 1);
      loadSlide();
    });
    $('.pp-present').addEventListener('click', () => {
      let pi = cur;
      const ov = Utils.el('div');
      ov.id = 'present-overlay';
      document.body.appendChild(ov);
      const t0 = Date.now(); let black = false;
      const show = (dir) => {
        const s = slides[pi];
        ov.innerHTML = `<div class="ppt-slide pres-${transition} ${dir === -1 ? 'back' : ''}"><div class="ppt-title">${Utils.esc(s.title)}</div><div class="ppt-cols"><div class="ppt-body">${Utils.esc(s.body).replace(/\n/g, '<br>')}</div>${s.image ? `<div class="ppt-img"><img src="${s.image}"></div>` : ''}</div></div>
          <div class="present-hint">Slide ${pi + 1} / ${slides.length} • ${Utils.fmtTime((Date.now() - t0) / 1000)} — click or → to advance, B for black, Esc to exit</div>`;
        applyTheme(ov.querySelector('.ppt-slide'), theme);
        ov.classList.toggle('black', black);
      };
      const key = e => {
        if (e.key === 'Escape') end();
        else if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') advance();
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { pi = Math.max(0, pi - 1); show(-1); }
        else if (e.key.toLowerCase() === 'b') { black = !black; ov.classList.toggle('black', black); }
        else if (e.key === 'Home') { pi = 0; show(); } else if (e.key === 'End') { pi = slides.length - 1; show(); }
      };
      const advance = () => { if (pi < slides.length - 1) { pi++; show(); } else end(); };
      const end = () => { ov.remove(); document.removeEventListener('keydown', key); };
      ov.addEventListener('click', advance);
      document.addEventListener('keydown', key);
      show();
    });
    $('.office-ribbon .o-save:last-child').addEventListener('click', () => {
      const name = nameInput.value.trim() || 'Presentation1';
      path = 'C:/Users/Seefood/Documents/' + name + '.ppt';
      FS.write(path, JSON.stringify({ slides, theme, transition }), 'application/vnd.ms-powerpoint');
      win.setTitle(name + '.ppt - PowerPoint');
      Shell.toast('PowerPoint', 'Saved to Documents/' + name + '.ppt', '📙');
    });
    loadSlide();
  }
});
