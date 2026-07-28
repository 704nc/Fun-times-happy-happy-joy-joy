/* ============ Windows 11 Web — boot ============ */
'use strict';

(function boot() {
  Settings.load();
  FS.load();
  ChatStore.load();
  WM.init();
  Shell.init();
  Shell.wireEvents();

  // dismiss boot screen
  const bootEl = document.getElementById('boot');
  const finish = () => {
    bootEl.classList.add('fade');
    setTimeout(() => bootEl.remove(), 600);
    if (!localStorage.getItem('win11.welcomed')) {
      localStorage.setItem('win11.welcomed', '1');
      setTimeout(() => {
        Shell.toast('Welcome to Windows 11 Web', 'Open the Start menu to explore. Tip: the Microsoft Store has games you can install!', '👋');
      }, 900);
    }
  };
  setTimeout(finish, 1400);
  bootEl.addEventListener('click', finish);
})();
