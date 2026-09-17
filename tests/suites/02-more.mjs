import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/');
await page.waitForTimeout(1800);
await page.click('#lockscreen');
await page.waitForTimeout(800);
const ev = (fn, arg) => page.evaluate(fn, arg);
// task view + desktops
await ev(() => { Apps.launch('notepad'); Apps.launch('calculator'); });
await page.click('[data-act=taskview]');
console.log('taskview wins:', await ev(() => document.querySelectorAll('.tv-win').length));
await page.click('.tv-new');
console.log('desktops:', await ev(() => [Desktops.count, Desktops.cur, WM.all().length, WM.allDesks().length]));
await ev(() => Apps.launch('paint'));
console.log('desk2 windows:', await ev(() => WM.all().map(w => w.app.id)), 'taskbar running:', await ev(() => document.querySelectorAll('#taskbar-center .running').length));
await ev(() => Desktops.switch(0));
console.log('desk1 windows:', await ev(() => WM.all().map(w => w.app.id)), 'hidden paint:', await ev(() => WM.allDesks().find(w => w.app.id === 'paint').el.classList.contains('other-desk')));
await ev(() => { TaskView.open(); Desktops.remove(1); });
console.log('after remove:', await ev(() => [Desktops.count, WM.all().length]));
await ev(() => TaskView.close());
// snap layouts
await ev(() => { WM.allDesks().forEach(w => w.close()); Apps.launch('notepad'); }); await page.waitForTimeout(300);
await page.hover('.win.focused .wc-max'); await page.waitForTimeout(500);
console.log('snap popup:', await ev(() => document.querySelectorAll('.sl-opt').length));
await page.click('.sl-opt[data-i="4"]');
console.log('snapped rect:', await ev(() => { const w = WM.focused(); return [w.el.offsetLeft, w.el.offsetWidth, Achievements.has('snapper')]; }));
// minimize animation
await ev(() => WM.focused().minimize()); await page.waitForTimeout(250);
console.log('minimized:', await ev(() => WM.all().filter(w => w.minimized).length));
// notification center
await ev(() => Shell.toast('Test', 'Hello notif', '🔔'));
await page.click('#tray-clock');
console.log('notif items:', await ev(() => document.querySelectorAll('.nc-item').length));
await page.click('.nc-clear');
console.log('notif cleared:', await ev(() => document.querySelectorAll('.nc-item').length));
// widgets
await page.click('#taskbar-widgets');
console.log('widgets open:', await ev(() => document.getElementById('widgets-panel').classList.contains('open')), 'cards:', await ev(() => document.querySelectorAll('.wg-card').length), await ev(() => document.querySelector('.wg-headline').textContent));
await page.mouse.click(1000, 100);
// spotlight wallpaper + matrix screensaver
await ev(() => Settings.set('wallpaper', 'spotlight'));
console.log('spotlight bg:', await ev(() => document.getElementById('desktop').style.backgroundImage.slice(0, 40)), 'wall opts:', await ev(() => Wallpapers.ids.length));
await ev(() => Screensaver.start('matrix')); await page.waitForTimeout(700); await page.mouse.move(300, 300); await page.waitForTimeout(500);
console.log('matrix stopped:', await ev(() => !document.querySelector('#screensaver')));
// emoji picker into notepad
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('notepad'); });
await page.waitForTimeout(300);
await page.click('.notepad-area'); await page.keyboard.type('hi ');
await page.keyboard.press('Meta+.'); await page.waitForTimeout(100);
console.log('emoji picker:', await ev(() => !!document.querySelector('.emoji-picker')));
await page.click('.ep-grid span');
console.log('notepad text:', JSON.stringify(await ev(() => document.querySelector('.notepad-area').value)), 'ach:', await ev(() => Achievements.has('emoji')));
// camera (no device in headless -> graceful message)
await ev(() => Apps.launch('camera')); await page.waitForTimeout(800);
console.log('camera msg:', await ev(() => document.querySelector('.cam-msg').innerText.replace(/\n/g, ' ')));
// neko
await ev(() => { Apps.install('neko'); Apps.launch('neko'); });
await page.click('.placeholder-pane .fluent-btn'); await page.waitForTimeout(100);
await page.mouse.move(200, 200); await page.waitForTimeout(600);
console.log('neko:', await ev(() => [!!document.querySelector('.neko'), document.querySelector('.neko').dataset.state]));
await page.click('.neko'); console.log('cat-person:', await ev(() => Achievements.has('cat-person')));
await ev(() => Settings.set('neko', false));
// accounts
await ev(() => { const w = Apps.launch('settings'); w.body.querySelector('.set-nav[data-id=accounts]').click(); });
await page.fill('#acc-name', 'Bob'); await page.keyboard.press('Tab'); await page.waitForTimeout(100);
await page.click('.av-opt[data-av="🦊"]');
console.log('start user:', await ev(() => [document.querySelector('.start-user span').textContent, document.querySelector('.start-avatar').textContent]));
await ev(() => { const w = WM.byApp('settings')[0]; w.body.querySelector('.set-nav[data-id=accessibility]').click(); });
await page.click('.switch[data-k=cursorTrail]'); await page.mouse.move(400, 400); await page.mouse.move(420, 410); await page.waitForTimeout(50);
console.log('trail dots:', await ev(() => document.querySelectorAll('.trail-dot').length));
await ev(() => Settings.set('cursorTrail', false));
// solitaire: deal, stock click, drag a card, force win
await ev(() => { WM.all().forEach(w => w.close()); Apps.install('solitaire'); Apps.launch('solitaire'); });
await page.waitForTimeout(300);
console.log('sol cards:', await ev(() => document.querySelectorAll('.sol-board .card').length));
await page.click('.sol-pile.stock'); console.log('waste:', await ev(() => document.querySelectorAll('.waste .card').length));
// find a legal drag: try dragging waste card onto each tableau
const dragged = await ev(async () => {
  const w = document.querySelector('.waste .card'); if (!w) return 'no waste';
  const r = w.getBoundingClientRect();
  return [r.left + 10, r.top + 10];
});
const tabs = await ev(() => [...document.querySelectorAll('.sol-pile.tab')].map(t => { const r = t.getBoundingClientRect(); return [r.left + 20, r.top + 20]; }));
let movedTo = -1;
for (let i = 0; i < 7 && movedTo < 0; i++) {
  await page.mouse.move(dragged[0], dragged[1]); await page.mouse.down(); await page.mouse.move(dragged[0] + 20, dragged[1] + 20); await page.mouse.move(tabs[i][0], tabs[i][1]); await page.mouse.up();
  const wasteNow = await ev(() => document.querySelectorAll('.waste .card').length);
  if (wasteNow === 0) movedTo = i;
}
console.log('drag moved to tab:', movedTo, 'ghost cleaned:', await ev(() => !document.querySelector('.sol-drag')));
await page.dblclick('.sol-pile.tab .card:last-child');
console.log('undo btn:', await page.locator('.sol-undo').count());
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/solitaire.png' });
// task view screenshot
await ev(() => { Apps.launch('notepad'); Apps.launch('calculator'); TaskView.open(); });
await page.waitForTimeout(200);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/taskview.png' });
await ev(() => TaskView.close());
await page.click('#taskbar-widgets'); await page.waitForTimeout(200);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/widgets.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
