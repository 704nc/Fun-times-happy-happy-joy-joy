/* ============ Windows 11 Web — Slack, Discord, Spotify ============ */
'use strict';

/* ---------- shared chat engine (localStorage-persisted, with chatty bots) ---------- */
const ChatStore = {
  _key: 'win11.chat',
  _data: null,
  load() {
    try { this._data = JSON.parse(localStorage.getItem(this._key) || '{}'); }
    catch (e) { this._data = {}; }
  },
  get(app, channel) {
    if (!this._data) this.load();
    return ((this._data[app] || {})[channel]) || null;
  },
  set(app, channel, msgs) {
    if (!this._data) this.load();
    (this._data[app] = this._data[app] || {})[channel] = msgs.slice(-60);
    try { localStorage.setItem(this._key, JSON.stringify(this._data)); } catch (e) {}
  }
};

function makeChatApp(cfg) {
  return function mount(win) {
    let curCh = cfg.channels[0].id;
    const botTimers = [];
    win.body.innerHTML = `
      <div class="chat-root" style="--chat-accent:${cfg.accent};--chat-av-radius:${cfg.avatarRadius}">
        ${cfg.servers ? `<div class="chat-servers">${cfg.servers.map((s, i) => `<div class="srv ${i === 0 ? 'sel' : ''}" title="${s.name}">${s.icon}</div>`).join('')}</div>` : ''}
        <div class="chat-side" style="background:${cfg.sideBg};color:${cfg.sideFg}">
          <div class="chat-side-head">${cfg.workspace}</div>
          <div class="chat-channels"></div>
        </div>
        <div class="chat-main" style="background:${cfg.mainBg};color:${cfg.mainFg}">
          <div class="chat-main-head"></div>
          <div class="chat-msgs"></div>
          <div class="chat-input-wrap">
            <div class="chat-input"><span>➕</span><input placeholder="" spellcheck="false"><span>😊</span></div>
            <div class="chat-typing"></div>
          </div>
        </div>
      </div>`;
    const $ = s => win.body.querySelector(s);
    const msgsEl = $('.chat-msgs'), input = $('.chat-input input'), typingEl = $('.chat-typing');

    function channel() { return cfg.channels.find(c => c.id === curCh); }
    function getMsgs() {
      let m = ChatStore.get(cfg.id, curCh);
      if (!m) { m = channel().seed.map(([user, text], i) => ({ user, text, t: Date.now() - (channel().seed.length - i) * 480000 })); ChatStore.set(cfg.id, curCh, m); }
      return m;
    }
    function fmtT(ts) {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    function renderChannels() {
      $('.chat-channels').innerHTML = `<div class="chat-ch-group">${cfg.channelGroupLabel}</div>` +
        cfg.channels.map(c => `<div class="chat-ch ${c.id === curCh ? 'sel' : ''}" data-id="${c.id}"><span>${cfg.channelPrefix}</span><span>${c.name}</span></div>`).join('') +
        `<div class="chat-ch-group">Direct messages</div>` +
        cfg.bots.map(b => `<div class="chat-ch" style="opacity:.6"><span style="font-size:10px">🟢</span><span>${b.name}</span></div>`).join('');
    }
    function renderMsgs() {
      const ch = channel();
      $('.chat-main-head').innerHTML = `<span>${cfg.channelPrefix}${ch.name}</span><span class="topic">${ch.topic}</span>`;
      input.placeholder = `Message ${cfg.channelPrefix}${ch.name}`;
      msgsEl.innerHTML = getMsgs().map(m => {
        const bot = cfg.bots.find(b => b.name === m.user);
        const av = bot ? bot.avatar : cfg.selfAvatar;
        const avBg = bot ? bot.color : 'linear-gradient(135deg,#e3008c,#68217a)';
        return `<div class="chat-msg"><div class="cm-av" style="background:${avBg}">${av}</div>
          <div><div class="cm-head"><span class="cm-user">${Utils.esc(m.user)}</span><span class="cm-time">${fmtT(m.t)}</span></div>
          <div class="cm-text">${Utils.esc(m.text)}</div></div></div>`;
      }).join('');
      msgsEl.scrollTop = msgsEl.scrollHeight;
    }
    $('.chat-channels').addEventListener('click', e => {
      const c = e.target.closest('.chat-ch[data-id]');
      if (c) { curCh = c.dataset.id; renderChannels(); renderMsgs(); }
    });
    function botReply(userText) {
      const ch = curCh;
      const bot = cfg.bots[Math.floor(Math.random() * cfg.bots.length)];
      const lower = userText.toLowerCase();
      let pool = cfg.replies.generic;
      if (/\?$/.test(userText.trim()) || /^(what|how|why|when|who|where|can|does|is|are)\b/.test(lower)) pool = cfg.replies.question;
      if (/(hi|hello|hey|yo|morning|afternoon)\b/.test(lower)) pool = cfg.replies.greeting;
      if (/(thanks|thank you|thx|ty)\b/.test(lower)) pool = cfg.replies.thanks;
      const text = pool[Math.floor(Math.random() * pool.length)].replace('{user}', cfg.selfName);
      const delay = 1200 + Math.random() * 2500;
      botTimers.push(setTimeout(() => {
        typingEl.textContent = `${bot.name} is typing…`;
        botTimers.push(setTimeout(() => {
          typingEl.textContent = '';
          const msgs = ChatStore.get(cfg.id, ch) || [];
          msgs.push({ user: bot.name, text, t: Date.now() });
          ChatStore.set(cfg.id, ch, msgs);
          if (curCh === ch && win.body.isConnected) renderMsgs();
          if (win.minimized || !win.body.isConnected) Shell.toast(cfg.name, `${bot.name}: ${text}`, cfg.toastIcon);
        }, 900 + Math.random() * 1400));
      }, delay));
    }
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !input.value.trim()) return;
      const msgs = getMsgs();
      msgs.push({ user: cfg.selfName, text: input.value.trim(), t: Date.now() });
      ChatStore.set(cfg.id, curCh, msgs);
      botReply(input.value.trim());
      input.value = '';
      renderMsgs();
    });
    win.onClose(() => botTimers.forEach(clearTimeout));
    renderChannels(); renderMsgs();
  };
}

/* ---------- Slack ---------- */
Apps.register({
  id: 'slack', name: 'Slack', icon: '#', letter: true, color: 'linear-gradient(135deg,#611f69,#4a154b)',
  category: 'Communication', width: 940, height: 620, singleton: true,
  mount: makeChatApp({
    id: 'slack', name: 'Slack', toastIcon: '💬',
    workspace: 'Fun Times HQ',
    accent: '#611f69', avatarRadius: '6px',
    sideBg: '#4a154b', sideFg: '#fff', mainBg: '#fff', mainFg: '#1d1c1d',
    channelPrefix: '# ', channelGroupLabel: 'Channels',
    selfName: 'seefood', selfAvatar: '🦞',
    servers: null,
    channels: [
      { id: 'general', name: 'general', topic: 'Company-wide announcements and work-based matters', seed: [
        ['Priya Sharma', 'Reminder: all-hands at 3pm today! 📣'],
        ['Marcus Webb', 'The Q3 numbers are looking great, nice work everyone'],
        ['Dana Reyes', 'Donuts in the kitchen 🍩 first come first served'],
        ['Priya Sharma', 'Recording of the all-hands will be posted in #general after']
      ] },
      { id: 'random', name: 'random', topic: 'Non-work banter and water cooler conversation', seed: [
        ['Dana Reyes', 'anyone else watching the new season of Severance?'],
        ['Marcus Webb', 'no spoilers please, I am 2 episodes behind!!'],
        ['Priya Sharma', 'my cat just walked across my keyboard during standup lol']
      ] },
      { id: 'engineering', name: 'engineering', topic: 'Ship it 🚢', seed: [
        ['Marcus Webb', 'Deployed v2.4.1 to prod, watching the dashboards'],
        ['Priya Sharma', 'Code freeze starts Friday, get your PRs in'],
        ['Marcus Webb', 'That flaky test in CI is finally fixed. It was a timezone bug. It is ALWAYS a timezone bug.']
      ] },
      { id: 'design', name: 'design', topic: 'Pixels and vibes', seed: [
        ['Dana Reyes', 'New mockups are in Figma, would love feedback by EOD'],
        ['Priya Sharma', 'The rounded corners look so much better 👌']
      ] }
    ],
    bots: [
      { name: 'Priya Sharma', avatar: '👩🏽‍💼', color: 'linear-gradient(135deg,#36c5f0,#2eb67d)' },
      { name: 'Marcus Webb', avatar: '👨🏻‍💻', color: 'linear-gradient(135deg,#ecb22e,#e01e5a)' },
      { name: 'Dana Reyes', avatar: '🎨', color: 'linear-gradient(135deg,#e01e5a,#611f69)' }
    ],
    replies: {
      greeting: ['hey {user}! 👋', 'morning! coffee acquired ☕', 'hey hey! how is your day going?', 'o/ welcome back'],
      question: ['good question — let me check and get back to you', 'I think Marcus looked into that last sprint, let me find the thread', 'hmm, I would say yes, but let us confirm in the standup', 'there is a doc about that somewhere… searching 🔎'],
      thanks: ['anytime! 🙌', 'no problem at all', 'happy to help!', 'you got it 👍'],
      generic: ['totally agree', '+1 to that', 'interesting 🤔 tell me more', 'can we add that to the sprint board?', 'nice, shipping it 🚀', 'lol 😂', 'noted! adding it to the meeting agenda', 'good point — let us discuss at standup']
    }
  })
});

/* ---------- Discord ---------- */
Apps.register({
  id: 'discord', name: 'Discord', icon: '🎮', color: 'linear-gradient(135deg,#5865f2,#404eed)',
  category: 'Communication', width: 960, height: 620, singleton: true,
  mount: makeChatApp({
    id: 'discord', name: 'Discord', toastIcon: '🎮',
    workspace: 'Fun Times Gaming',
    accent: '#5865f2', avatarRadius: '50%',
    sideBg: '#2b2d31', sideFg: '#dbdee1', mainBg: '#313338', mainFg: '#dbdee1',
    channelPrefix: '# ', channelGroupLabel: 'Text channels',
    selfName: 'seefood', selfAvatar: '🦞',
    servers: [
      { name: 'Fun Times Gaming', icon: '🎮' },
      { name: 'Study Group', icon: '📚' },
      { name: 'Movie Night', icon: '🍿' }
    ],
    channels: [
      { id: 'general', name: 'general', topic: 'Chat about anything', seed: [
        ['NovaKnight', 'who is on tonight? thinking 9pm est'],
        ['PixelWitch', 'I can do 9, need to finish this ranked match first'],
        ['ToasterGhost', 'count me in, downloading the update now (37 GB 💀)']
      ] },
      { id: 'gaming', name: 'gaming', topic: 'LFG and game talk', seed: [
        ['PixelWitch', 'the new patch completely broke my main 😭'],
        ['NovaKnight', 'skill issue tbh'],
        ['PixelWitch', 'NovaKnight I will remember this'],
        ['ToasterGhost', 'anyone want to duo? I am 2 wins from gold']
      ] },
      { id: 'memes', name: 'memes', topic: 'Only the dankest', seed: [
        ['ToasterGhost', 'my code does not work: 😡. my code works: 😨 why does it work'],
        ['NovaKnight', 'real'],
        ['PixelWitch', 'posting my 47th cat picture of the week, no one can stop me']
      ] },
      { id: 'music', name: 'music', topic: 'Share what you are listening to', seed: [
        ['NovaKnight', 'the new Pixel Drifters album goes hard 🔥'],
        ['ToasterGhost', 'Neon Skyline on repeat all week']
      ] }
    ],
    bots: [
      { name: 'NovaKnight', avatar: '⚔️', color: 'linear-gradient(135deg,#5865f2,#7289da)' },
      { name: 'PixelWitch', avatar: '🔮', color: 'linear-gradient(135deg,#eb459e,#a239ca)' },
      { name: 'ToasterGhost', avatar: '👻', color: 'linear-gradient(135deg,#57f287,#3ba55c)' }
    ],
    replies: {
      greeting: ['yooo {user} 👋', 'sup', 'hey! you playing tonight?', 'ayy welcome back'],
      question: ['idk man but google probably does', 'good q, asking in the other server', 'pretty sure yes? 70% sure. 60%.', 'wiki says yes but the wiki also lies'],
      thanks: ['np np', 'gg 🤝', 'anytime bro', '💜'],
      generic: ['lmaooo', 'based', 'real', 'ok that is actually wild', 'clip it or it did not happen', 'brb queueing up', 'F', 'true true', 'no way 💀', 'add it to the list of reasons we need a new server icon']
    }
  })
});

/* ---------- Spotify ---------- */
Apps.register({
  id: 'spotify', name: 'Spotify', icon: '♫', letter: true, color: 'linear-gradient(135deg,#1db954,#159442)',
  category: 'Entertainment', width: 980, height: 640, singleton: true,
  mount(win) {
    let view = 'home';
    win.body.innerHTML = `
      <div class="sp-root">
        <div class="sp-main">
          <div class="sp-side">
            <div class="sp-logo">🟢 Spotify</div>
            <div class="sp-side-item sel" data-v="home"><span>🏠</span><span>Home</span></div>
            <div class="sp-side-item" data-v="search"><span>🔍</span><span>Search</span></div>
            <div class="sp-side-item" data-v="library"><span>📚</span><span>Your Library</span></div>
          </div>
          <div class="sp-content"></div>
        </div>
        <div class="sp-bar">
          <div class="sp-art" style="background:#333">🎵</div>
          <div class="sp-now"><div class="sp-nt">—</div><div class="sp-na">Not playing</div></div>
          <div class="sp-bar-center">
            <div class="sp-btns">
              <button class="sp-prev" title="Previous">⏮</button>
              <button class="sp-play" title="Play/Pause">▶</button>
              <button class="sp-next" title="Next">⏭</button>
            </div>
            <div class="sp-seek-row"><span class="sp-pos">0:00</span><input type="range" class="sp-seek" min="0" max="1000" value="0"><span class="sp-len">0:00</span></div>
          </div>
          <div class="sp-vol">🔊<input type="range" min="0" max="100" value="${Math.round(Synth.getVolume() * 100)}"></div>
        </div>
      </div>`;
    const $ = s => win.body.querySelector(s);
    const content = $('.sp-content');
    const albums = [...new Map(Synth.tracks.map(t => [t.album, t])).values()];

    function trackRow(t, i) {
      const playing = Synth.current && Synth.current.id === t.id;
      return `<div class="sp-row ${playing ? 'playing' : ''}" data-id="${t.id}">
        <div class="sp-num">${playing && Synth.isPlaying ? '▶' : i + 1}</div>
        <div class="sp-art" style="background:${t.color}">${t.art}</div>
        <div><div class="sp-rt">${t.title}</div><div class="sp-ra">${t.artist}</div></div>
        <div class="sp-dur">${Utils.fmtTime(Synth.length(t))}</div></div>`;
    }
    function render() {
      win.body.querySelectorAll('.sp-side-item').forEach(x => x.classList.toggle('sel', x.dataset.v === view));
      if (view === 'home') {
        content.innerHTML = `<h1>Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}</h1>
          <div class="sp-sub">Every track here is generated and played live by your browser — press play, it really works.</div>
          <div class="sp-card-grid" style="margin-bottom:26px">${albums.map(a =>
            `<div class="sp-card" data-album="${Utils.esc(a.album)}"><div class="sp-card-art" style="background:${a.color}">${a.art}</div><div class="sp-ct">${a.album}</div><div class="sp-ca">${a.artist}</div></div>`).join('')}</div>
          <h1 style="font-size:20px">All tracks</h1><div style="height:8px"></div>
          ${Synth.tracks.map(trackRow).join('')}`;
      } else if (view === 'search') {
        content.innerHTML = `<h1>Search</h1>
          <input class="fluent-input" style="width:100%;max-width:420px;background:#242424;border-color:#444;color:#fff" placeholder="What do you want to listen to?" spellcheck="false">
          <div class="sp-results" style="margin-top:18px"></div>`;
        const inp = content.querySelector('input');
        const res = content.querySelector('.sp-results');
        const doSearch = () => {
          const q = inp.value.toLowerCase();
          const hits = Synth.tracks.filter(t => (t.title + ' ' + t.artist + ' ' + t.album).toLowerCase().includes(q));
          res.innerHTML = hits.map(trackRow).join('') || '<div class="sp-sub">No results found.</div>';
        };
        inp.addEventListener('input', doSearch);
        doSearch();
      } else {
        content.innerHTML = `<h1>Your Library</h1><div class="sp-sub">Albums</div>
          ${albums.map(a => {
            const tracks = Synth.tracks.filter(t => t.album === a.album);
            return `<div style="margin-bottom:24px"><h1 style="font-size:18px;margin-bottom:8px">${a.album} <span style="font-size:12px;color:#b3b3b3;font-weight:400">• ${a.artist} • ${tracks.length} songs</span></h1>${tracks.map(trackRow).join('')}</div>`;
          }).join('')}`;
      }
    }
    win.body.querySelector('.sp-side').addEventListener('click', e => {
      const it = e.target.closest('.sp-side-item');
      if (it) { view = it.dataset.v; render(); }
    });
    content.addEventListener('click', e => {
      const card = e.target.closest('.sp-card');
      if (card) {
        const list = Synth.tracks.filter(t => t.album === card.dataset.album);
        Synth.setQueue(list);
        Synth.play(list[0], 0);
        return;
      }
      const row = e.target.closest('.sp-row');
      if (row) {
        const t = Synth.tracks.find(x => x.id === row.dataset.id);
        if (Synth.current && Synth.current.id === t.id) Synth.toggle();
        else { Synth.setQueue(Synth.tracks); Synth.play(t, 0); }
      }
    });
    $('.sp-play').addEventListener('click', () => {
      if (Synth.current) Synth.toggle();
      else { Synth.setQueue(Synth.tracks); Synth.play(Synth.tracks[0], 0); }
    });
    $('.sp-next').addEventListener('click', () => Synth.next());
    $('.sp-prev').addEventListener('click', () => Synth.prev());
    $('.sp-seek').addEventListener('input', e => { if (Synth.current) Synth.seek(e.target.value / 1000 * Synth.duration()); });
    $('.sp-vol input').addEventListener('input', e => Synth.setVolume(e.target.value / 100));

    function updateBar() {
      const t = Synth.current;
      $('.sp-nt').textContent = t ? t.title : '—';
      $('.sp-na').textContent = t ? t.artist : 'Not playing';
      $('.sp-play').textContent = Synth.isPlaying ? '⏸' : '▶';
      const art = $('.sp-bar .sp-art');
      art.style.background = t ? t.color : '#333';
      art.textContent = t ? t.art : '🎵';
    }
    const uiTimer = setInterval(() => {
      if (!win.body.isConnected) return;
      const pos = Synth.position(), dur = Synth.duration();
      $('.sp-pos').textContent = Utils.fmtTime(pos);
      $('.sp-len').textContent = Utils.fmtTime(dur);
      if (document.activeElement !== $('.sp-seek')) $('.sp-seek').value = dur ? Math.round(pos / dur * 1000) : 0;
    }, 250);
    const onChange = () => { if (win.body.isConnected) { updateBar(); render(); } };
    Bus.on('player:change', onChange);
    win.onClose(() => clearInterval(uiTimer));
    render(); updateBar();
  }
});
