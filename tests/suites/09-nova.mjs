import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept());
await page.route(/open-meteo/, r => r.abort());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
console.log('hello button on lock:', await q('#lockscreen .hello-btn').count());
await page.click('#lockscreen'); await page.waitForTimeout(800);
// DND
await page.click('#tray-icons'); await q('#ac-dnd').click(); await page.mouse.click(600, 300);
await ev(() => Shell.toast('Quiet', 'should be muted', '🤫')); await page.waitForTimeout(100);
console.log('dnd muted toast:', await ev(() => [document.querySelectorAll('.toast').length === 0 || ![...document.querySelectorAll('.toast .t-title')].some(t => t.textContent === 'Quiet'), Notifications.items.some(n => n.title === 'Quiet' && n.muted), document.querySelector('#tray-icons span').textContent]));
await page.click('#tray-icons'); await q('#ac-dnd').click(); await page.waitForTimeout(100); console.log('dnd off missed toast:', await ev(() => [...document.querySelectorAll('.toast .t-body')].some(t => t.textContent.includes('missed'))));
await q('#ac-saver').click(); console.log('saver class:', await ev(() => document.documentElement.classList.contains('saver'))); await q('#ac-saver').click(); await page.mouse.click(600, 300);
// stocks widget
await page.click('#taskbar-widgets'); console.log('stocks card:', await q('.wg-stock').count(), 'sparklines:', await q('.wg-stock canvas').count()); await page.mouse.click(1000, 100);
// recents
await ev(() => openFile(HOME + '/Documents/Welcome.txt')); await page.waitForTimeout(100);
await ev(() => { WM.all().forEach(w => w.close()); Shell.toggleStart(true); });
console.log('recents:', await ev(() => document.querySelector('#start-recommended').innerText.includes('Recently opened')));
// start context menu pin
await q('.start-app[data-launch="notepad"]').click({ button: 'right' }); console.log('start ctx:', await ev(() => [...document.querySelectorAll('#context-menu .cm-item')].map(x => x.textContent.trim()).join(' | ')));
await page.locator('#context-menu .cm-item', { hasText: 'Pin to taskbar' }).click(); await page.waitForTimeout(100);
console.log('pinned notepad:', await ev(() => [Settings.get('pinnedTaskbar').includes('notepad'), !!document.querySelector('#taskbar-center [data-launch="notepad"]'), Achievements.has('pinner')]));
await ev(() => Shell.toggleStart(false));
await q('#taskbar-center [data-launch="notepad"]').click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'Unpin' }).click(); await page.waitForTimeout(100);
console.log('unpinned:', await ev(() => !Settings.get('pinnedTaskbar').includes('notepad')));
await q('#taskbar').click({ button: 'right', position: { x: 100, y: 20 } }); console.log('taskbar ctx:', await ev(() => [...document.querySelectorAll('#context-menu .cm-item')].map(x => x.textContent.trim()).join(' | '))); await page.keyboard.press('Escape'); await page.mouse.click(600, 300);
// asteroids
await ev(() => { Apps.install('asteroids'); Apps.launch('asteroids'); }); await page.waitForTimeout(300);
await q('.arcade').click(); await page.keyboard.press(' '); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(600); await page.keyboard.up('ArrowUp'); await page.keyboard.press('h');
console.log('asteroids:', await q('.as-score').textContent(), await q('.as-lives').textContent());
// voice typing without a field
await ev(() => { WM.all().forEach(w => w.close()); document.activeElement.blur(); }); await page.keyboard.press('Meta+h'); await page.waitForTimeout(100);
console.log('voice typing guard toast:', await ev(() => Notifications.items.some(n => n.title === 'Voice typing')));
// hello on relock
await ev(() => Lock.show()); await page.waitForTimeout(400); console.log('hello on relock:', await q('#lockscreen .hello-btn').count());
await q('.hello-btn').click(); await page.waitForTimeout(800); console.log('hello no-camera message:', await q('.hello-msg').textContent()); await page.waitForTimeout(2200); await page.mouse.click(640, 200); await page.waitForTimeout(700); console.log('unlocked by click:', await ev(() => !document.querySelector('#lockscreen')));
// completionist logic sanity (not unlocked)
console.log('completionist locked:', await ev(() => !Achievements.has('completionist')));
await ev(() => { Apps.launch('asteroids'); Shell.toggleStart(true); }); await page.waitForTimeout(400);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch9.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
