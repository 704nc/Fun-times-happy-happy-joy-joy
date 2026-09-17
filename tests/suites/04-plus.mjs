import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(800);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
// Outlook
await ev(() => Apps.launch('outlook')); await page.waitForTimeout(200);
console.log('outlook inbox items:', await q('.ol-item').count(), 'title:', await ev(() => WM.byApp('outlook')[0].getTitle()));
await q('.ol-item').first().click(); console.log('read pane:', await q('.ol-read h2').textContent());
await q('.ol-contact[data-a="boss@bigcorp.web"]').click(); await q('.oc-subj').fill('Numbers'); await q('.oc-body').fill('Fixed the total.'); await q('.oc-send').click();
console.log('sent, ach:', await ev(() => Achievements.has('mail')), 'sent folder count:', await ev(() => Store.get('win11.mail').filter(m => m.folder === 'sent').length));
await page.waitForFunction(() => Store.get('win11.mail').some(m => m.from.includes('boss@') && m.subject.startsWith('RE:')), null, { timeout: 10000 });
console.log('boss replied:', await ev(() => Store.get('win11.mail').filter(m => m.subject.startsWith('RE:')).length));
await q('[data-act="delete"]').click(); console.log('deleted moves:', await ev(() => Store.get('win11.mail').filter(m => m.folder === 'deleted').length));
// Calendar
await ev(() => Apps.launch('calendar')); await page.waitForTimeout(200);
await q('.cal-add').click(); await q('.ce-title').fill('Dentist'); await q('.ce-time').fill('09:30'); await q('.ce-ok').click(); await page.waitForTimeout(100);
console.log('event added:', await ev(() => CalendarStore.all().length), 'shown in month:', await q('.cm-ev').count(), 'ach:', await ev(() => Achievements.has('planner')));
await page.click('#tray-clock'); await page.waitForTimeout(100);
console.log('clock flyout agenda:', await ev(() => document.querySelector('#cal-agenda').innerText.includes('Dentist')), 'dot:', await ev(() => document.querySelectorAll('.cal-day.has-ev').length));
await page.mouse.click(300, 300);
// Explorer upload (via file chooser) + download
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('explorer', { path: HOME + '/Downloads' }); }); await page.waitForTimeout(200);
await q('.fx-upload input').setInputFiles({ name: 'hello.txt', mimeType: 'text/plain', buffer: Buffer.from('hi from disk') });
await page.waitForTimeout(300);
console.log('uploaded:', await ev(() => (FS.get(HOME + '/Downloads/hello.txt') || {}).content), 'ach:', await ev(() => Achievements.has('uploader')));
await q('.fx-upload input').setInputFiles({ name: 'pic.png', mimeType: 'image/png', buffer: Buffer.from('89504e470d0a1a0a', 'hex') });
await page.waitForTimeout(300);
console.log('binary as dataurl:', await ev(() => String((FS.get(HOME + '/Downloads/pic.png') || {}).content).slice(0, 22)));
const [dl] = await Promise.all([page.waitForEvent('download'), ev(() => WM.byApp('explorer')[0]._fxDownload(HOME + '/Downloads/hello.txt'))]);
console.log('download:', dl.suggestedFilename());
// drag-drop simulation via DataTransfer
await ev(() => { const dt = new DataTransfer(); dt.items.add(new File(['dropped'], 'drop.txt', { type: 'text/plain' })); const el = document.querySelector('.fx-files'); el.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true })); el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true })); });
await page.waitForTimeout(300);
console.log('dropped:', await ev(() => !!FS.get(HOME + '/Downloads/drop.txt')));
// Recorder (no mic in headless -> message)
await ev(() => Apps.launch('recorder')); await page.waitForTimeout(100); await q('.vr-btn').click(); await page.waitForTimeout(800);
console.log('recorder msg:', await q('.vr-hint').textContent());
// Live wallpaper
await ev(() => Settings.set('wallpaper', 'aurora-live')); await page.waitForTimeout(300);
console.log('live wallpaper canvas:', await ev(() => !!document.getElementById('live-wallpaper')));
await ev(() => Settings.set('wallpaper', 'bloom')); await page.waitForTimeout(100);
console.log('live removed:', await ev(() => !document.getElementById('live-wallpaper')));
// Themes
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('notepad'); Apps.launch('settings'); });
await ev(() => Retro.set('xp')); await page.waitForTimeout(300);
console.log('xp:', await ev(() => [document.documentElement.classList.contains('theme-xp'), Settings.get('wallpaper'), getComputedStyle(document.getElementById('taskbar')).height, Achievements.has('retro')]));
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/xp.png' });
await ev(() => Retro.set('95')); await page.waitForTimeout(300);
await ev(() => { Shell.toggleStart(true); }); await page.waitForTimeout(200);
console.log('95:', await ev(() => [document.documentElement.classList.contains('theme-95'), Settings.get('wallpaper')]));
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/95.png' });
await ev(() => { Shell.toggleStart(false); Retro.set(''); }); await page.waitForTimeout(200);
console.log('back to 11:', await ev(() => [document.documentElement.className, Settings.get('wallpaper')]));
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('outlook'); Apps.launch('calendar'); }); await page.waitForTimeout(300);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch4.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
