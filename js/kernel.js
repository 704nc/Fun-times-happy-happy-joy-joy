/* ============ Windows 11 Web — kernel: utils, settings, virtual FS, audio engine ============ */
'use strict';

const Utils = {
  el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  },
  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  },
  fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  },
  clamp(v, a, b) { return Math.min(b, Math.max(a, v)); },
  // deterministic RNG for procedural content
  rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
};

const Bus = {
  _h: {},
  on(ev, fn) { (this._h[ev] = this._h[ev] || []).push(fn); },
  emit(ev, data) { (this._h[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
};

/* ---------- Settings ---------- */
const Settings = {
  _key: 'win11.settings',
  _data: null,
  _defaults: {
    theme: 'light',
    accent: '#0078d4',
    wallpaper: 'bloom',
    taskbarAlign: 'center',
    nightLight: false,
    installedApps: [],
    pinnedTaskbar: ['explorer', 'edge', 'store', 'word', 'excel', 'powerpoint', 'photos', 'spotify', 'slack', 'discord'],
    userName: 'Seefood',
    clippy: false,
    screensaver: 'bubbles',
    screensaverMin: 5,
    neko: false,
    avatar: '',
    narrator: false,
    cursorTrail: false,
    edgeProxy: ''
  },
  load() {
    try { this._data = Object.assign({}, this._defaults, JSON.parse(localStorage.getItem(this._key) || '{}')); }
    catch (e) { this._data = Object.assign({}, this._defaults); }
  },
  get(k) { return this._data[k]; },
  set(k, v) {
    this._data[k] = v;
    try { localStorage.setItem(this._key, JSON.stringify(this._data)); } catch (e) {}
    Bus.emit('settings:' + k, v);
    Bus.emit('settings', k);
  }
};

/* ---------- Wallpapers (generated SVG, no downloads needed) ---------- */
const Wallpapers = (() => {
  function svgUri(svg) { return 'data:image/svg+xml,' + encodeURIComponent(svg); }
  const defs = {
    bloom: `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><defs><radialGradient id="a" cx="30%" cy="55%" r="90%"><stop offset="0%" stop-color="#3d7ff0"/><stop offset="45%" stop-color="#2b5fc7"/><stop offset="100%" stop-color="#0a1e52"/></radialGradient><linearGradient id="p1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7cc0ff" stop-opacity=".95"/><stop offset="100%" stop-color="#2e5fd0" stop-opacity=".2"/></linearGradient><linearGradient id="p2" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a7d6ff" stop-opacity=".85"/><stop offset="100%" stop-color="#3a6be0" stop-opacity=".15"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#a)"/><g transform="translate(960,560)"><path d="M0,0 C240,-340 620,-300 640,-40 C660,200 300,380 40,300 C-40,270 -60,120 0,0Z" fill="url(#p1)"/><path d="M0,0 C-260,-320 -640,-260 -640,0 C-640,260 -280,400 -40,300 C40,260 50,110 0,0Z" fill="url(#p2)"/><path d="M0,0 C300,120 340,460 80,540 C-160,610 -380,420 -300,180 C-260,60 -110,-40 0,0Z" fill="url(#p1)" opacity=".85"/></g></svg>`,
    dark: `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="a" cx="35%" cy="50%" r="95%"><stop offset="0%" stop-color="#40364d"/><stop offset="55%" stop-color="#211d2b"/><stop offset="100%" stop-color="#0b0a10"/></radialGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#c9a3e8" stop-opacity=".7"/><stop offset="100%" stop-color="#4b3a70" stop-opacity=".12"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#a)"/><g transform="translate(930,560)"><path d="M0,0 C240,-340 620,-300 640,-40 C660,200 300,380 40,300 C-40,270 -60,120 0,0Z" fill="url(#b)"/><path d="M0,0 C-260,-320 -640,-260 -640,0 C-640,260 -280,400 -40,300 C40,260 50,110 0,0Z" fill="url(#b)" opacity=".8"/></g></svg>`,
    sunset: `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2b1055"/><stop offset="45%" stop-color="#7597de" stop-opacity="0"/><stop offset="100%" stop-color="#000"/></linearGradient><linearGradient id="k" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a0533"/><stop offset="55%" stop-color="#c94b7c"/><stop offset="80%" stop-color="#f4a261"/><stop offset="100%" stop-color="#ffd166"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#k)"/><circle cx="960" cy="800" r="130" fill="#fff3d6" opacity=".95"/><rect y="820" width="1920" height="260" fill="#12071f"/><path d="M0,820 L200,700 380,790 560,680 760,800 980,690 1180,790 1400,670 1620,780 1820,700 1920,760 L1920,1080 0,1080Z" fill="#1d0f33"/><rect width="1920" height="1080" fill="url(#s)" opacity=".35"/></svg>`,
    mountains: `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#8fd3f4"/><stop offset="100%" stop-color="#e8f7fb"/></linearGradient></defs><rect width="1920" height="1080" fill="url(#sky)"/><circle cx="1560" cy="220" r="90" fill="#fff8dc"/><path d="M0,760 L340,380 640,720 860,470 1180,800 1440,420 1920,780 L1920,1080 0,1080Z" fill="#5b7f9d"/><path d="M340,380 L430,480 340,470 260,500Z" fill="#fff" opacity=".9"/><path d="M1440,420 L1530,540 1430,520 1360,560Z" fill="#fff" opacity=".9"/><path d="M0,880 L420,640 820,900 1240,660 1640,920 1920,760 L1920,1080 0,1080Z" fill="#37596f"/><rect y="960" width="1920" height="120" fill="#243c4d"/></svg>`,
    green: `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="g" cx="40%" cy="45%" r="90%"><stop offset="0%" stop-color="#1f9e6c"/><stop offset="60%" stop-color="#0c5c47"/><stop offset="100%" stop-color="#04241f"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><g fill="none" stroke="#5fe3ae" stroke-opacity=".35" stroke-width="3"><path d="M-100,900 C400,700 700,1000 1100,780 C1450,590 1700,760 2020,600"/><path d="M-100,760 C350,600 750,860 1150,660 C1500,490 1750,640 2020,480"/><path d="M-100,1020 C450,820 720,1080 1120,900 C1470,740 1720,880 2020,740"/></g></svg>`
  };
  const cache = {};
  return {
    ids: Object.keys(defs),
    names: { bloom: 'Windows Bloom', dark: 'Dark Bloom', sunset: 'Sunset Drive', mountains: 'Alpine Peaks', green: 'Emerald Flow' },
    uri(id) {
      if (!cache[id]) cache[id] = svgUri(defs[id] || defs.bloom);
      return cache[id];
    }
  };
})();

/* ---------- Sample photos (generated SVG scenes) ---------- */
const SamplePhotos = (() => {
  function uri(svg) { return 'data:image/svg+xml,' + encodeURIComponent(svg); }
  return {
    'Beach Day.svg': uri(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="380" fill="#7ec8e3"/><circle cx="640" cy="110" r="55" fill="#ffe066"/><rect y="330" width="800" height="120" fill="#1d7fb8"/><path d="M0,330 Q100,315 200,330 T400,330 T600,330 T800,330 V450 H0Z" fill="#2a95d0"/><rect y="440" width="800" height="160" fill="#f2d49b"/><path d="M110,600 L150,440 L190,600Z" fill="#c98d4a"/><ellipse cx="150" cy="428" rx="70" ry="26" fill="#3ca455"/><circle cx="560" cy="520" r="26" fill="#e63946"/><circle cx="560" cy="520" r="26" fill="none" stroke="#fff" stroke-width="7" stroke-dasharray="20 20"/></svg>`),
    'Alpine Lake.svg': uri(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#bfe3f2"/><path d="M0,300 L180,110 340,290 470,150 640,310 800,180 800,340 0,340Z" fill="#5b7f9d"/><path d="M180,110 L230,170 175,165 130,185Z" fill="#fff"/><path d="M470,150 L520,215 465,205 420,230Z" fill="#fff"/><rect y="340" width="800" height="260" fill="#2a6f97"/><path d="M0,340 L180,180 340,330 470,220 640,345 800,240 800,600 0,600Z" fill="#22577a" opacity=".35"/><g fill="#12403c"><path d="M80,420 L110,340 140,420Z"/><path d="M660,450 L695,360 730,450Z"/></g></svg>`),
    'City Nights.svg': uri(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#0d1033"/><circle cx="660" cy="90" r="40" fill="#f4f1de"/><g fill="#1d2455"><rect x="40" y="220" width="90" height="380"/><rect x="160" y="140" width="110" height="460"/><rect x="300" y="250" width="80" height="350"/><rect x="410" y="90" width="130" height="510"/><rect x="570" y="200" width="90" height="400"/><rect x="690" y="270" width="80" height="330"/></g><g fill="#ffd166"><rect x="60" y="250" width="14" height="18"/><rect x="95" y="290" width="14" height="18"/><rect x="185" y="170" width="14" height="18"/><rect x="225" y="220" width="14" height="18"/><rect x="185" y="300" width="14" height="18"/><rect x="440" y="120" width="16" height="20"/><rect x="480" y="180" width="16" height="20"/><rect x="440" y="260" width="16" height="20"/><rect x="595" y="240" width="14" height="18"/><rect x="620" y="330" width="14" height="18"/><rect x="710" y="300" width="14" height="18"/><rect x="325" y="290" width="14" height="18"/></g></svg>`),
    'Autumn Trail.svg': uri(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#f6e7c1"/><rect y="420" width="800" height="180" fill="#8a5a2b"/><path d="M330,600 Q400,430 400,300 Q400,430 470,600Z" fill="#d9b27c"/><g><circle cx="130" cy="300" r="90" fill="#d1495b"/><rect x="120" y="360" width="22" height="120" fill="#5c3a1e"/><circle cx="420" cy="200" r="100" fill="#e07a2f"/><rect x="408" y="270" width="24" height="150" fill="#5c3a1e"/><circle cx="680" cy="310" r="85" fill="#c9a227"/><rect x="668" y="370" width="22" height="110" fill="#5c3a1e"/></g><g fill="#e07a2f" opacity=".8"><circle cx="240" cy="480" r="7"/><circle cx="530" cy="500" r="7"/><circle cx="600" cy="460" r="6"/><circle cx="90" cy="510" r="6"/></g></svg>`),
    'Aurora.svg': uri(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#04102b"/><path d="M0,320 C160,120 300,340 480,140 C620,10 740,220 800,120 L800,0 0,0Z" fill="#1db98e" opacity=".5"/><path d="M0,380 C200,180 360,380 520,200 C660,60 760,260 800,180 L800,40 0,60Z" fill="#4cc9f0" opacity=".35"/><g fill="#fff"><circle cx="90" cy="80" r="2"/><circle cx="200" cy="140" r="2"/><circle cx="330" cy="60" r="2"/><circle cx="520" cy="90" r="2"/><circle cx="660" cy="50" r="2"/><circle cx="740" cy="150" r="2"/><circle cx="420" cy="40" r="2"/></g><path d="M0,520 L120,430 260,510 420,420 580,520 720,440 800,500 800,600 0,600Z" fill="#0a1c3d"/></svg>`)
  };
})();

/* ---------- Virtual File System ---------- */
const FS = {
  _key: 'win11.fs',
  root: null,
  _saveT: null,

  load() {
    try {
      const raw = localStorage.getItem(this._key);
      if (raw) { this.root = JSON.parse(raw); }
    } catch (e) {}
    if (!this.root) {
      this.root = this._defaultTree();
      this.save();
    }
    if (!this.root.children['$Recycle.Bin']) {
      this.root.children['$Recycle.Bin'] = { type: 'folder', children: {} };
      this.save();
    }
  },
  _defaultTree() {
    const pics = { type: 'folder', children: {} };
    for (const [name, data] of Object.entries(SamplePhotos)) {
      pics.children[name] = { type: 'file', mime: 'image/svg+xml', content: data };
    }
    pics.children['Wallpapers'] = { type: 'folder', children: {} };
    for (const id of Wallpapers.ids) {
      pics.children['Wallpapers'].children[Wallpapers.names[id] + '.svg'] = { type: 'file', mime: 'image/svg+xml', content: Wallpapers.uri(id) };
    }
    return {
      type: 'folder', name: 'C:', children: {
        'Users': { type: 'folder', children: {
          'Seefood': { type: 'folder', children: {
            'Desktop': { type: 'folder', children: {} },
            'Documents': { type: 'folder', children: {
              'Welcome.txt': { type: 'file', mime: 'text/plain', content: 'Welcome to Windows 11 Web!\r\n\r\nThis whole OS runs in your browser. Some things to try:\r\n\r\n  * Open the Microsoft Store and install some apps and games\r\n  * Write a document in Word and save it here\r\n  * Build a budget in Excel (formulas like =SUM(A1:A5) work)\r\n  * Play music in Spotify or Media Player\r\n  * Draw something in Paint\r\n  * Open Terminal and type "help"\r\n\r\nEverything you create is saved in your browser (localStorage), so it will still be here when you come back.\r\n' },
              'Quarterly Report.doc': { type: 'file', mime: 'application/msword', content: '<h1>Quarterly Report</h1><p>Revenue is up <b>14%</b> quarter over quarter, driven primarily by strong performance in the cloud division.</p><h2>Highlights</h2><p>• Launched two new product lines<br>• Customer satisfaction at an all-time high of 94%<br>• Expanded into three new markets</p><p>Double-click this file to open it in <i>Word</i> and continue editing.</p>' },
              'Budget 2026.xls': { type: 'file', mime: 'application/vnd.ms-excel', content: JSON.stringify({ cells: { A1: 'Item', B1: 'Cost', A2: 'Rent', B2: '1800', A3: 'Groceries', B3: '520', A4: 'Utilities', B4: '210', A5: 'Internet', B5: '80', A6: 'Total', B6: '=SUM(B2:B5)' } }) },
              'Pitch Deck.ppt': { type: 'file', mime: 'application/vnd.ms-powerpoint', content: JSON.stringify({ slides: [ { title: 'Project Phoenix', body: 'Reimagining the desktop\nfor the modern web' }, { title: 'The Problem', body: '• Native apps are heavy\n• Installs take forever\n• Updates interrupt your day' }, { title: 'Our Solution', body: 'A full desktop experience that runs in any browser tab.\n\nNo install. No updates. Just open and go.' }, { title: 'Thank You', body: 'Questions?\n\nPress Escape to exit the slideshow.' } ] }) }
            } },
            'Pictures': pics,
            'Music': { type: 'folder', children: {} },
            'Videos': { type: 'folder', children: {} },
            'Downloads': { type: 'folder', children: {} }
          } }
        } },
        'Windows': { type: 'folder', children: {
          'System32': { type: 'folder', children: {
            'kernel32.dll': { type: 'file', mime: 'application/octet-stream', content: 'MZ...(you did not really think this was a real DLL, did you?)' },
            'notepad.exe': { type: 'file', mime: 'application/x-msdownload', content: '[app:notepad]' }
          } }
        } },
        'Program Files': { type: 'folder', children: {} }
      }
    };
  },
  save() {
    clearTimeout(this._saveT);
    this._saveT = setTimeout(() => {
      try { localStorage.setItem(this._key, JSON.stringify(this.root)); }
      catch (e) { Bus.emit('fs:quota'); }
    }, 250);
  },
  _parts(path) {
    return String(path).replace(/\\/g, '/').split('/').filter(p => p && p !== 'C:');
  },
  get(path) {
    let node = this.root;
    for (const p of this._parts(path)) {
      if (!node || node.type !== 'folder' || !node.children[p]) return null;
      node = node.children[p];
    }
    return node;
  },
  parentOf(path) {
    const parts = this._parts(path);
    const name = parts.pop();
    let node = this.root;
    for (const p of parts) {
      if (!node || node.type !== 'folder' || !node.children[p]) return null;
      node = node.children[p];
    }
    return { parent: node, name };
  },
  list(path) {
    const node = this.get(path);
    if (!node || node.type !== 'folder') return [];
    return Object.entries(node.children)
      .map(([name, n]) => ({ name, node: n }))
      .sort((a, b) => (a.node.type === b.node.type) ? a.name.localeCompare(b.name) : (a.node.type === 'folder' ? -1 : 1));
  },
  write(path, content, mime) {
    const loc = this.parentOf(path);
    if (!loc || !loc.parent || loc.parent.type !== 'folder') return false;
    loc.parent.children[loc.name] = { type: 'file', mime: mime || 'text/plain', content };
    this.save();
    Bus.emit('fs:changed', path);
    return true;
  },
  mkdir(path) {
    const loc = this.parentOf(path);
    if (!loc || !loc.parent || loc.parent.type !== 'folder' || loc.parent.children[loc.name]) return false;
    loc.parent.children[loc.name] = { type: 'folder', children: {} };
    this.save();
    Bus.emit('fs:changed', path);
    return true;
  },
  remove(path) {
    const loc = this.parentOf(path);
    if (!loc || !loc.parent || !loc.parent.children[loc.name]) return false;
    delete loc.parent.children[loc.name];
    this.save();
    Bus.emit('fs:changed', path);
    return true;
  },
  rename(path, newName) {
    newName = String(newName).trim();
    if (!newName || /[\\/:*?"<>|]/.test(newName)) return false;
    const loc = this.parentOf(path);
    if (!loc || !loc.parent.children[loc.name] || loc.parent.children[newName]) return false;
    loc.parent.children[newName] = loc.parent.children[loc.name];
    delete loc.parent.children[loc.name];
    this.save();
    Bus.emit('fs:changed', path);
    return true;
  },
  binPath: 'C:/$Recycle.Bin',
  recycle(path) {
    const loc = this.parentOf(path);
    if (!loc || !loc.parent.children[loc.name]) return false;
    const node = loc.parent.children[loc.name];
    delete loc.parent.children[loc.name];
    node.meta = { orig: path };
    const bin = this.get(this.binPath);
    bin.children[this.uniqueName(this.binPath, loc.name, '')] = node;
    this.save();
    Bus.emit('fs:changed', path);
    return true;
  },
  restoreFromBin(name) {
    const bin = this.get(this.binPath);
    const node = bin.children[name];
    if (!node) return false;
    let target = (node.meta && node.meta.orig) || null;
    if (!target || !this.parentOf(target) || !this.parentOf(target).parent) {
      target = 'C:/Users/Seefood/Desktop/' + name;
    }
    const loc = this.parentOf(target);
    if (loc.parent.children[loc.name]) {
      const dot = loc.name.lastIndexOf('.');
      const base = dot > 0 ? loc.name.slice(0, dot) : loc.name;
      const ext = dot > 0 ? loc.name.slice(dot) : '';
      loc.name = this.uniqueName(target.slice(0, -loc.name.length - 1) || 'C:', base, ext);
    }
    delete node.meta;
    delete bin.children[name];
    loc.parent.children[loc.name] = node;
    this.save();
    Bus.emit('fs:changed', target);
    return true;
  },
  emptyBin() {
    this.get(this.binPath).children = {};
    this.save();
    Bus.emit('fs:changed', this.binPath);
  },
  binCount() {
    return Object.keys(this.get(this.binPath).children).length;
  },
  uniqueName(dirPath, base, ext) {
    const dir = this.get(dirPath);
    if (!dir || dir.type !== 'folder') return base + (ext || '');
    let name = base + (ext || ''), i = 2;
    while (dir.children[name]) { name = `${base} (${i})${ext || ''}`; i++; }
    return name;
  },
  reset() {
    localStorage.removeItem(this._key);
    this.root = this._defaultTree();
    this.save();
    Bus.emit('fs:changed', 'C:');
  }
};

function fileIcon(name, node) {
  if (node && node.type === 'folder') return '📁';
  const ext = (name.split('.').pop() || '').toLowerCase();
  return ({
    txt: '📄', md: '📄', log: '📄',
    doc: '📘', docx: '📘',
    xls: '📗', xlsx: '📗',
    ppt: '📙', pptx: '📙',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🖼️', bmp: '🖼️', webp: '🖼️',
    mp3: '🎵', wav: '🎵', ogg: '🎵', m4a: '🎵', synth: '🎵',
    mp4: '🎬', webm: '🎬', mov: '🎬',
    exe: '⚙️', dll: '⚙️', zip: '🗜️'
  })[ext] || '📃';
}

/* ---------- Audio engine: procedural chiptune tracks + shared player ---------- */
const Synth = (() => {
  let ctx = null, master = null;
  function audioCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);

  // -- procedural composer: builds a full track (melody/bass/drums) from a seed --
  const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], major: [0, 2, 4, 5, 7, 9, 11] };
  function compose(seed, opts) {
    const rnd = Utils.rng(seed);
    const scale = SCALES[opts.scale || 'minor'];
    const rootN = opts.root || 57; // A3
    const bars = opts.bars || 32;
    const prog = opts.prog || [0, 5, 3, 4]; // scale-degree progression
    const notes = []; // [beat, midi, durBeats, voice] voice: 0 lead,1 bass,2 kick,3 hat,4 snare
    const deg = (d, oct) => rootN + 12 * (oct || 0) + scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    let lastMel = 7;
    for (let bar = 0; bar < bars; bar++) {
      const chord = prog[bar % prog.length];
      // bass: root eighth-note pulse
      for (let b = 0; b < 4; b += 1) {
        notes.push([bar * 4 + b, deg(chord, -1), 0.9, 1]);
        if (rnd() < 0.4) notes.push([bar * 4 + b + 0.5, deg(chord + (rnd() < 0.5 ? 4 : 2), -1), 0.4, 1]);
      }
      // drums
      for (let b = 0; b < 4; b++) {
        if (b === 0 || b === 2) notes.push([bar * 4 + b, 36, 0.1, 2]);
        if (b === 1 || b === 3) notes.push([bar * 4 + b, 38, 0.1, 4]);
        notes.push([bar * 4 + b + 0.5, 42, 0.05, 3]);
        if (rnd() < 0.3) notes.push([bar * 4 + b + 0.25, 42, 0.05, 3]);
      }
      // melody: wander around chord tones, denser in later half of phrase
      let t = 0;
      while (t < 4) {
        const durOpts = [0.5, 0.5, 1, 0.25, 1.5];
        const dur = durOpts[Math.floor(rnd() * durOpts.length)];
        if (rnd() < 0.82) {
          const move = [-2, -1, -1, 0, 1, 1, 2, 3][Math.floor(rnd() * 8)];
          lastMel = Utils.clamp(lastMel + move, 4, 17);
          const chordTones = [chord, chord + 2, chord + 4];
          const pitch = (rnd() < 0.55) ? deg(chordTones[Math.floor(rnd() * 3)], 1) : deg(lastMel, 0);
          notes.push([bar * 4 + t, pitch, dur * 0.92, 0]);
        }
        t += dur;
      }
    }
    return { bpm: opts.bpm || 112, notes, lengthBeats: bars * 4 };
  }

  const TRACKS = [
    { id: 't1', title: 'Neon Skyline', artist: 'The Pixel Drifters', album: 'Night Drive', art: '🌆', color: 'linear-gradient(135deg,#7b2ff7,#f107a3)', seed: 101, opts: { scale: 'minor', root: 57, bpm: 118, prog: [0, 5, 3, 4], bars: 36 } },
    { id: 't2', title: 'Cloud Nine', artist: 'Aria Vale', album: 'Daydream', art: '☁️', color: 'linear-gradient(135deg,#36d1dc,#5b86e5)', seed: 202, opts: { scale: 'major', root: 60, bpm: 100, prog: [0, 3, 4, 4], bars: 32 } },
    { id: 't3', title: 'Midnight Arcade', artist: 'Bitcrusher 9000', album: 'Insert Coin', art: '🕹️', color: 'linear-gradient(135deg,#f5576c,#f093fb)', seed: 303, opts: { scale: 'minor', root: 55, bpm: 132, prog: [0, 0, 5, 4], bars: 40 } },
    { id: 't4', title: 'Golden Hour', artist: 'Aria Vale', album: 'Daydream', art: '🌅', color: 'linear-gradient(135deg,#fa709a,#fee140)', seed: 404, opts: { scale: 'major', root: 62, bpm: 92, prog: [0, 4, 5, 3], bars: 30 } },
    { id: 't5', title: 'Deep Focus', artist: 'Lo-Fi Librarian', album: 'Study Hall', art: '📚', color: 'linear-gradient(135deg,#43e97b,#38f9d7)', seed: 505, opts: { scale: 'minor', root: 53, bpm: 84, prog: [0, 3, 5, 4], bars: 28 } },
    { id: 't6', title: 'Rocket Summer', artist: 'The Pixel Drifters', album: 'Night Drive', art: '🚀', color: 'linear-gradient(135deg,#ff9966,#ff5e62)', seed: 606, opts: { scale: 'major', root: 59, bpm: 126, prog: [0, 5, 1, 4], bars: 36 } },
    { id: 't7', title: 'Rainy Window', artist: 'Lo-Fi Librarian', album: 'Study Hall', art: '🌧️', color: 'linear-gradient(135deg,#4b6cb7,#182848)', seed: 707, opts: { scale: 'minor', root: 55, bpm: 76, prog: [0, 3, 4, 0], bars: 26 } },
    { id: 't8', title: 'Starlight Run', artist: 'Bitcrusher 9000', album: 'Insert Coin', art: '✨', color: 'linear-gradient(135deg,#8ec5fc,#e0c3fc)', seed: 808, opts: { scale: 'minor', root: 60, bpm: 140, prog: [0, 5, 3, 4], bars: 40 } }
  ];
  const composed = {};
  function trackData(t) {
    if (!composed[t.id]) composed[t.id] = compose(t.seed, t.opts);
    return composed[t.id];
  }
  function trackLength(t) {
    const d = trackData(t);
    return d.lengthBeats * 60 / d.bpm;
  }

  // -- playback: lookahead scheduler --
  const P = {
    track: null, data: null, playing: false,
    startCtxTime: 0, offsetBeats: 0, nextIdx: 0, timer: null, onchange: null, onended: null,
    queue: [] // playlist of track objects
  };
  function beatNow() {
    if (!P.playing) return P.offsetBeats;
    return P.offsetBeats + (audioCtx().currentTime - P.startCtxTime) * P.data.bpm / 60;
  }
  function scheduleNote(n, when) {
    const [, midi, durB, voice] = n;
    const c = audioCtx();
    const durS = Math.max(0.05, durB * 60 / P.data.bpm);
    if (voice === 2 || voice === 3 || voice === 4) { // drums
      if (voice === 2) { // kick
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(140, when); o.frequency.exponentialRampToValueAtTime(45, when + 0.1);
        g.gain.setValueAtTime(0.8, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
        o.connect(g); g.connect(master); o.start(when); o.stop(when + 0.2);
      } else { // hat / snare -> filtered noise
        const len = voice === 3 ? 0.04 : 0.12;
        const buf = c.createBuffer(1, c.sampleRate * len, c.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
        const s = c.createBufferSource(); s.buffer = buf;
        const f = c.createBiquadFilter();
        f.type = 'highpass'; f.frequency.value = voice === 3 ? 7000 : 1800;
        const g = c.createGain(); g.gain.value = voice === 3 ? 0.12 : 0.25;
        s.connect(f); f.connect(g); g.connect(master); s.start(when);
      }
      return;
    }
    const o = c.createOscillator(), g = c.createGain();
    o.type = voice === 1 ? 'triangle' : 'square';
    o.frequency.value = midiHz(midi);
    const vol = voice === 1 ? 0.22 : 0.12;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.015);
    g.gain.setValueAtTime(vol, when + durS * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, when + durS);
    o.connect(g); g.connect(master);
    o.start(when); o.stop(when + durS + 0.05);
  }
  function tick() {
    if (!P.playing) return;
    const c = audioCtx();
    const lookaheadBeats = (1.2) * P.data.bpm / 60;
    const nowB = beatNow();
    while (P.nextIdx < P.data.notes.length && P.data.notes[P.nextIdx][0] < nowB + lookaheadBeats) {
      const n = P.data.notes[P.nextIdx];
      const when = P.startCtxTime + (n[0] - P.offsetBeats) * 60 / P.data.bpm;
      if (when >= c.currentTime - 0.03) scheduleNote(n, when);
      P.nextIdx++;
    }
    if (nowB >= P.data.lengthBeats) {
      const t = P.track;
      Player._stopInternal();
      if (P.onended) P.onended(t); else Player.next();
      return;
    }
  }
  function sortIdxFor(beats) {
    let i = 0;
    while (i < P.data.notes.length && P.data.notes[i][0] < beats) i++;
    return i;
  }

  const Player = {
    tracks: TRACKS,
    length: trackLength,
    get current() { return P.track; },
    get isPlaying() { return P.playing; },
    position() {
      if (!P.data) return 0;
      return Utils.clamp(beatNow(), 0, P.data.lengthBeats) * 60 / P.data.bpm;
    },
    duration() { return P.track ? trackLength(P.track) : 0; },
    setQueue(list) { P.queue = list.slice(); },
    play(track, fromSec) {
      const c = audioCtx();
      this._stopInternal(true);
      P.track = track;
      P.data = trackData(track);
      P.data.notes.sort((a, b) => a[0] - b[0]);
      P.offsetBeats = (fromSec || 0) * P.data.bpm / 60;
      P.nextIdx = sortIdxFor(P.offsetBeats);
      P.startCtxTime = c.currentTime + 0.06;
      P.playing = true;
      P.timer = setInterval(tick, 200);
      tick();
      Bus.emit('player:change');
    },
    pause() {
      if (!P.playing) return;
      P.offsetBeats = beatNow();
      P.playing = false;
      clearInterval(P.timer);
      Bus.emit('player:change');
    },
    resume() {
      if (P.playing || !P.track) return;
      this.play(P.track, this.position());
    },
    toggle() { P.playing ? this.pause() : (P.track && this.resume()); },
    seek(sec) {
      if (!P.track) return;
      if (P.playing) this.play(P.track, sec);
      else { P.offsetBeats = sec * P.data.bpm / 60; Bus.emit('player:change'); }
    },
    _stopInternal(silent) {
      P.playing = false;
      clearInterval(P.timer);
      if (!silent) Bus.emit('player:change');
    },
    stop() {
      this._stopInternal(true);
      P.track = null; P.data = null; P.offsetBeats = 0;
      Bus.emit('player:change');
    },
    next() {
      if (!P.queue.length) { this.stop(); return; }
      const i = P.queue.findIndex(t => P.track && t.id === P.track.id);
      this.play(P.queue[(i + 1) % P.queue.length], 0);
    },
    prev() {
      if (!P.queue.length) return;
      const i = P.queue.findIndex(t => P.track && t.id === P.track.id);
      this.play(P.queue[(i - 1 + P.queue.length) % P.queue.length], 0);
    },
    setVolume(v) { audioCtx(); master.gain.value = Utils.clamp(v, 0, 1); },
    getVolume() { return master ? master.gain.value : 0.5; },
    // soft Windows-ish startup chime (must be called from a user gesture)
    chime() {
      try {
        [[64, 0], [59, 130], [61, 260], [66, 420]].forEach(([m, t]) =>
          setTimeout(() => this.note(m, 1.4, 'sine'), t));
      } catch (e) {}
    },
    // one-shot note (piano app)
    note(midi, durS, type) {
      const c = audioCtx();
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'triangle';
      o.frequency.value = midiHz(midi);
      const t = c.currentTime;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.3, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + (durS || 0.8));
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + (durS || 0.8) + 0.05);
    }
  };
  return Player;
})();
