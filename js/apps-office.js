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
        <button class="o-save">💾 Save</button>
      </div>
      <div class="app-toolbar">
        <select class="w-block"><option value="p">Normal</option><option value="h1">Heading 1</option><option value="h2">Heading 2</option></select>
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
        <span class="w-count" style="margin-left:auto;font-size:12px;color:var(--text-2)"></span>
      </div>
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
    const updCount = () => {
      const words = (page.innerText.trim().match(/\S+/g) || []).length;
      $('.w-count').textContent = words + ' word' + (words === 1 ? '' : 's');
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
    $('.o-save').addEventListener('click', save);
    win.body.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); save(); }
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
    let cells = {}, chart = null; // "A1" -> raw string; chart = { range, type }
    if (path) {
      const n = FS.get(path);
      if (n) { try { const j = JSON.parse(n.content); cells = j.cells || {}; chart = j.chart || null; } catch (e) {} }
    }
    win.body.innerHTML = `
      <div class="office-ribbon" style="background:#107c41">
        <span class="o-name">Excel</span>
        <input class="doc-name" placeholder="Book1" spellcheck="false">
        <button class="o-save">💾 Save</button>
        <button class="o-chart">📊 Chart</button>
      </div>
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
        expr = expr.replace(/(SUM|AVG|AVERAGE|MIN|MAX|COUNT)\(([A-Z]+\d+:[A-Z]+\d+)\)/g, (_, fn, range) => {
          const vals = rangeRefs(range).map(r => cellValue(r, new Set(seen))).filter(v => typeof v === 'number');
          if (fn === 'SUM') return vals.reduce((a, b) => a + b, 0);
          if (fn === 'AVG' || fn === 'AVERAGE') return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          if (fn === 'MIN') return vals.length ? Math.min(...vals) : 0;
          if (fn === 'MAX') return vals.length ? Math.max(...vals) : 0;
          return vals.length;
        });
        // cell refs
        expr = expr.replace(/[A-Z]+\d+/g, r => {
          const v = cellValue(r, new Set(seen));
          return typeof v === 'number' ? v : (v === '' ? 0 : NaN);
        });
        if (!/^[-+*/().\d\sNaN]+$/.test(expr)) return '#NAME?';
        const val = Function('"use strict";return (' + expr + ')')();
        if (typeof val !== 'number' || isNaN(val)) return '#VALUE!';
        return Math.round(val * 1e8) / 1e8;
      } catch (e) { return '#ERROR!'; }
    }
    function renderAll() {
      win.body.querySelectorAll('td[data-ref]').forEach(td => {
        const v = cellValue(td.dataset.ref);
        td.textContent = v;
        td.classList.toggle('num', typeof v === 'number');
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
      FS.write(path, JSON.stringify({ cells, chart }), 'application/vnd.ms-excel');
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
    let slides = [{ title: 'Click to add title', body: 'Click to add text' }];
    if (path) {
      const n = FS.get(path);
      if (n) { try { slides = JSON.parse(n.content).slides || slides; } catch (e) {} }
    }
    let cur = 0;
    win.body.innerHTML = `
      <div class="office-ribbon" style="background:#c43e1c">
        <span class="o-name">PowerPoint</span>
        <input class="doc-name" placeholder="Presentation1" spellcheck="false">
        <button class="pp-add o-save" style="margin-left:0">➕ New slide</button>
        <button class="pp-del o-save" style="margin-left:0">🗑️ Delete</button>
        <button class="pp-present o-save" style="margin-left:0">▶️ Present</button>
        <button class="o-save">💾 Save</button>
      </div>
      <div class="ppt-root">
        <div class="ppt-thumbs"></div>
        <div class="ppt-stage">
          <div class="ppt-slide">
            <div class="ppt-title" contenteditable="true" spellcheck="false"></div>
            <div class="ppt-body" contenteditable="true" spellcheck="false"></div>
          </div>
        </div>
      </div>`;
    const $ = s => win.body.querySelector(s);
    const nameInput = $('.doc-name');
    if (path) {
      nameInput.value = path.split('/').pop().replace(/\.pptx?$/i, '');
      win.setTitle(path.split('/').pop() + ' - PowerPoint');
    } else win.setTitle('Presentation1 - PowerPoint');
    const titleEl = $('.ppt-title'), bodyEl = $('.ppt-body');
    function renderThumbs() {
      $('.ppt-thumbs').innerHTML = slides.map((s, i) =>
        `<div class="ppt-thumb ${i === cur ? 'sel' : ''}" data-i="${i}"><span class="num">${i + 1}</span><div class="mini-title">${Utils.esc(s.title)}</div></div>`).join('');
    }
    function loadSlide() {
      titleEl.textContent = slides[cur].title;
      bodyEl.textContent = slides[cur].body;
      renderThumbs();
    }
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
      const show = () => {
        const s = slides[pi];
        ov.innerHTML = `<div class="ppt-slide"><div class="ppt-title">${Utils.esc(s.title)}</div><div class="ppt-body">${Utils.esc(s.body)}</div></div>
          <div class="present-hint">Slide ${pi + 1} / ${slides.length} — click or → to advance, Esc to exit</div>`;
      };
      const key = e => {
        if (e.key === 'Escape') end();
        else if (e.key === 'ArrowRight' || e.key === ' ') advance();
        else if (e.key === 'ArrowLeft') { pi = Math.max(0, pi - 1); show(); }
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
      FS.write(path, JSON.stringify({ slides }), 'application/vnd.ms-powerpoint');
      win.setTitle(name + '.ppt - PowerPoint');
      Shell.toast('PowerPoint', 'Saved to Documents/' + name + '.ppt', '📙');
    });
    loadSlide();
  }
});
