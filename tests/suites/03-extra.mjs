import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(800);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
// tetris
await ev(() => { Apps.install('tetris'); Apps.install('invaders'); Apps.launch('tetris'); }); await page.waitForTimeout(300);
await q('.tet-main').click();
for (let i = 0; i < 30; i++) { await page.keyboard.press('ArrowLeft'); await page.keyboard.press(' '); await page.waitForTimeout(30); }
console.log('tetris score>0:', +(await q('.tet-score').textContent()) > 0, 'lines:', await q('.tet-lines').textContent());
await page.keyboard.press('c'); await page.keyboard.press('p');
console.log('tetris paused overlay drawn (no error):', errors.length === 0);
// invaders
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('invaders'); }); await page.waitForTimeout(300);
const inv = q('.arcade'); await inv.click(); await page.keyboard.press(' '); await page.waitForTimeout(1500);
console.log('invaders running, score:', await q('.si-score').textContent());
// run dialog
await ev(() => WM.all().forEach(w => w.close()));
await page.keyboard.press('Meta+r'); await page.waitForTimeout(100);
console.log('run dialog:', await q('.run-dialog').isVisible());
await q('.run-dialog input').fill('calc'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
console.log('run calc -> app:', await ev(() => WM.all().map(w => w.app.id)), 'ach:', await ev(() => Achievements.has('run')));
await ev(() => RunDialog.run('https://example.com')); await page.waitForTimeout(200);
console.log('run url -> edge:', await ev(() => WM.byApp('edge').length), await ev(() => document.querySelector('.eg-url').value));
await ev(() => RunDialog.run('C:\\Users\\Seefood\\Documents')); await page.waitForTimeout(100);
console.log('run path -> explorer:', await ev(() => WM.byApp('explorer').length));
await ev(() => RunDialog.run('nonsense.exe')); await page.waitForTimeout(100);
console.log('run unknown -> toast:', await ev(() => [...document.querySelectorAll('.toast .t-body')].some(t => t.textContent.includes('cannot find'))));
// start search extras
await ev(() => { WM.all().forEach(w => w.close()); Shell.toggleStart(true); });
await q('#start-search-input').fill('12*12'); await page.waitForTimeout(50);
console.log('search math:', await ev(() => document.querySelector('#start-search-results').innerText.includes('144')));
await q('#start-search-input').fill('narrator'); await page.waitForTimeout(50);
console.log('search settings:', await ev(() => document.querySelector('#start-search-results').innerText.includes('Accessibility')));
await q('#start-search-input').fill('zzzqqq'); await page.waitForTimeout(50);
console.log('search web fallback:', await ev(() => document.querySelector('#start-search-results').innerText.includes('Search the web')));
await q('[data-run="settings"]').first().click().catch(() => {});
await q('#start-search-input').fill('lock'); await page.waitForTimeout(50);
await q('[data-run="cmd"]').first().click(); await page.waitForTimeout(400);
console.log('search cmd lock:', await ev(() => !!document.querySelector('#lockscreen')));
await page.keyboard.press('Enter'); await page.waitForTimeout(600);
// windows update flow
await ev(() => Apps.launch('settings', { section: 'update' })); await page.waitForTimeout(200);
console.log('update page:', await q('.wu-btn').textContent());
await q('.wu-btn').click(); await page.waitForTimeout(2300);
console.log('after check:', await q('.wu-btn').textContent(), '|', await q('.wu-title').textContent());
await q('.wu-btn').click();
await page.waitForFunction(() => document.querySelector('.wu-btn') && document.querySelector('.wu-btn').textContent === 'Restart now', null, { timeout: 15000 });
console.log('download done:', await q('.wu-title').textContent());
await q('.wu-btn').click(); await page.waitForTimeout(500);
console.log('winupdate screen:', await ev(() => !!document.getElementById('winupdate')));
await page.waitForFunction(() => localStorage.getItem('win11.update.pending') === 'true', null, { timeout: 30000 });
await page.waitForTimeout(2000); // reload happens
await page.waitForSelector('#lockscreen', { timeout: 10000 }); await page.waitForTimeout(500); await page.click('#lockscreen'); await page.waitForTimeout(2200);
console.log('after reboot whatsnew:', await ev(() => WM.byApp('whatsnew').length), 'ach updated:', await ev(() => Achievements.has('updated')), 'history:', await ev(() => WinUpdate.state().history.length));
await q('.wn-root [data-i="2"]').click(); console.log('try-it taskview:', await ev(() => !!document.querySelector('.task-view')));
await ev(() => TaskView.close());
await ev(() => Apps.launch('settings', { section: 'update' })); await page.waitForTimeout(200);
console.log('up to date:', await q('.wu-title').textContent());
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('tetris'); Apps.launch('invaders'); RunDialog.open(); }); await page.waitForTimeout(400);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch3.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
