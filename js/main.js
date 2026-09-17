/* ============ Windows 11 Web — boot ============ */
'use strict';

(function boot() {
  Settings.load();
  FS.load();
  ChatStore.load();
  WM.init();
  Shell.init();
  Shell.wireEvents();

  // offline support + installability (PWA); no-op on file:// or unsupported browsers
  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  const bootEl = document.getElementById('boot');
  const lockEl = document.getElementById('lockscreen');

  function showLock() {
    const wp = Settings.get('wallpaper');
    lockEl.style.backgroundImage = `url('${wp.startsWith('custom:') ? wp.slice(7) : Wallpapers.uri(wp)}')`;
    const upd = () => {
      const now = new Date();
      lockEl.querySelector('.lock-time').textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const info = lockEl.querySelector('.lock-info'); if (info && typeof LockInfo !== 'undefined') info.innerHTML = LockInfo.html();
      lockEl.querySelector('.lock-date').textContent = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    };
    upd();
    const t = setInterval(upd, 15000);
    lockEl.style.display = 'flex';
    const unlock = () => {
      clearInterval(t);
      document.removeEventListener('keydown', unlock);
      Synth.chime(); // user gesture → audio allowed
      lockEl.classList.add('unlocking');
      setTimeout(() => lockEl.remove(), 500);
      Bus.emit('shell:unlock');
      if (!localStorage.getItem('win11.welcomed')) {
        localStorage.setItem('win11.welcomed', '1');
        setTimeout(() => {
          Shell.toast('Welcome to Windows 11 Web', 'Open the Start menu to explore. Tip: the Microsoft Store has games you can install!', '👋');
        }, 900);
      }
    };
    lockEl.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
  }

  const finish = () => {
    if (!bootEl.isConnected) return;
    bootEl.classList.add('fade');
    setTimeout(() => bootEl.remove(), 600);
    showLock();
  };
  setTimeout(finish, 1400);
  bootEl.addEventListener('click', finish);
})();
