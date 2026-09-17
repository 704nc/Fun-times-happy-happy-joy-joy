import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
let pins = ['1234', '1234'];
page.on('dialog', d => d.accept(d.message().includes('PIN') ? pins.shift() : 'ok'));
await page.route(/open-meteo/, r => r.abort());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(800);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
// PIN set via Accounts, then lock and unlock with wrong/right PIN
await ev(() => Apps.launch('settings', { section: 'accounts' })); await page.waitForTimeout(150);
await q('#pin-set').click(); await page.waitForTimeout(300);
console.log('pin set:', await ev(() => PinLock.enabled()), 'ach:', await ev(() => Achievements.has('pin')), 'stored hashed:', await ev(() => { const r = Store.get('win11.pin'); return r && r.hash.length === 64 && !r.hash.includes('1234'); }));
await ev(() => { WM.all().forEach(w => w.close()); Lock.show(); }); await page.waitForTimeout(500);
await page.mouse.click(640, 300); await page.waitForTimeout(200); console.log('pin pad shown:', await q('.pin-box').count(), 'still locked:', await q('#lockscreen').count());
await q('.pin-input').fill('0000'); await page.keyboard.press('Enter'); await page.waitForTimeout(200); console.log('wrong pin msg:', await q('.pin-msg').textContent(), 'still locked:', await q('#lockscreen').count());
await q('[data-k="1"]').click(); await q('[data-k="2"]').click(); await q('[data-k="3"]').click(); await q('[data-k="4"]').click(); await q('[data-k="⏎"]').click(); await page.waitForTimeout(700);
console.log('unlocked with pad:', await q('#lockscreen').count() === 0);
// boot lock screen also gated: reload
await page.reload(); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(300); console.log('boot lock gated:', await q('.pin-box').count());
await q('.pin-input').fill('1234'); await page.keyboard.press('Enter'); await page.waitForTimeout(800); console.log('boot unlocked:', await q('#lockscreen').count() === 0);
await ev(() => Apps.launch('settings', { section: 'accounts' })); await page.waitForTimeout(150); await q('#pin-rm').click(); console.log('pin removed:', await ev(() => !PinLock.enabled()));
// widgets hide/restore
await ev(() => WM.all().forEach(w => w.close())); await page.click('#taskbar-widgets'); await page.waitForTimeout(100);
const before = await ev(() => [...document.querySelectorAll('.wg-card')].filter(c => c.style.display !== 'none').length);
await ev(() => document.querySelector('.wg-card[data-key="Stocks"] .wg-hide').click()); await page.waitForTimeout(100);
console.log('widget hidden:', before - (await ev(() => [...document.querySelectorAll('.wg-card')].filter(c => c.style.display !== 'none').length)) === 1, 'restore link:', await q('.wg-restore a').count());
await q('.wg-restore a').click(); await page.waitForTimeout(100); console.log('restored:', await ev(() => Store.get('win11.widgets.hidden', []).length === 0)); await page.mouse.click(1000, 100);
// explorer multi-select, keyboard, inline rename
await ev(() => { Apps.launch('explorer', { path: HOME + '/Documents' }); }); await page.waitForTimeout(200);
await q('.fx-item[data-n="Welcome.txt"]').click(); await q('.fx-item[data-n="Budget 2026.xls"]').click({ modifiers: ['Control'] });
console.log('ctrl multi-select:', await q('.fx-item.sel').count());
await q('.fx-item[data-n="Welcome.txt"]').click(); await q('.fx-item[data-n="Quarterly Report.doc"]').click({ modifiers: ['Shift'] }); console.log('shift range:', await q('.fx-item.sel').count());
await q('.fx-files').press('Control+a'); console.log('ctrl+a:', await q('.fx-item.sel').count(), await q('.fx-status').textContent());
await q('.fx-item[data-n="Welcome.txt"]').click(); await q('.fx-files').press('F2'); await page.waitForTimeout(100); console.log('rename input:', await q('.fx-rename').count());
await page.keyboard.press('Control+a'); await page.keyboard.type('Hello.txt'); await page.keyboard.press('Enter'); await page.waitForTimeout(200);
console.log('renamed:', await ev(() => !!FS.get(HOME + '/Documents/Hello.txt') && !FS.get(HOME + '/Documents/Welcome.txt')));
await q('.fx-item[data-n="Hello.txt"]').click(); await q('.fx-files').press('ArrowRight'); console.log('arrow moved selection:', await ev(() => document.querySelector('.fx-item.sel').dataset.n));
await q('.fx-item[data-n="Hello.txt"]').click(); await q('.fx-files').press('Delete'); await page.waitForTimeout(200); console.log('delete key -> bin:', await ev(() => FS.binCount() >= 1 && !FS.get(HOME + '/Documents/Hello.txt')));
await q('.fx-item[data-n="Budget 2026.xls"]').click(); await q('.fx-item[data-n="Pitch Deck.ppt"]').click({ modifiers: ['Control'] }); await q('.fx-files').press('Control+c');
await ev(() => WM.byApp('explorer')[0].body.querySelector('.fx-side-item[data-p$="Desktop"]').click()); await page.waitForTimeout(100); await q('.fx-files').click({ position: { x: 300, y: 300 } }); await page.keyboard.press('Control+v'); await page.waitForTimeout(200);
console.log('multi paste:', await ev(() => FS.list(HOME + '/Desktop').map(f => f.name)));
await q('.fx-files').press('Enter');
// media player file library
await ev(() => { FS.write(HOME + '/Music/beep.wav', 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=', 'audio/wav'); WM.all().forEach(w => w.close()); Apps.launch('mediaplayer'); }); await page.waitForTimeout(200);
console.log('media library files:', await q('.mp-track[data-path]').count(), await q('.mp-section').count());
await q('.mp-track[data-path]').first().click(); await page.waitForTimeout(200); console.log('now playing file:', await q('.mp-now').textContent());
await ev(() => { WM.all().forEach(w => w.close()); Lock.show(); }); await page.waitForTimeout(400); await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch15.png' }); await page.mouse.click(640, 300);
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
