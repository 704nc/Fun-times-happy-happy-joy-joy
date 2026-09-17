import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept());
await page.route(/open-meteo/, r => r.abort());
await page.route('https://example.com/**', r => r.fulfill({ status: 200, contentType: 'text/plain', headers: { 'access-control-allow-origin': '*' }, body: 'line1\nline2\nline3' }));
// deep link
await page.goto((process.env.BASE || 'http://localhost:8123') + '/?app=calculator'); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(1500);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
console.log('deep link opened:', await ev(() => WM.byApp('calculator').length), 'url cleaned:', await ev(() => location.search === ''), 'ach:', await ev(() => Achievements.has('deeplink')));
// listener cleanup: open/close explorer 5 times, count fs:changed handlers
const before = await ev(() => (Bus._h['fs:changed'] || []).length);
for (let i = 0; i < 5; i++) { await ev(() => { const w = Apps.launch('explorer'); w.close(); }); }
await page.waitForTimeout(300);
const after = await ev(() => (Bus._h['fs:changed'] || []).length);
console.log('fs:changed handlers before/after 5 open+close:', before, after, after === before ? 'OK no leak' : 'LEAK');
const c1 = await ev(() => (Bus._h['apps:changed'] || []).length); await ev(() => { Apps.launch('store').close(); Apps.launch('store').close(); }); await page.waitForTimeout(300);
console.log('store apps:changed handlers stable:', c1 === await ev(() => (Bus._h['apps:changed'] || []).length));
// labyrinth
await ev(() => { Apps.install('labyrinth'); WM.all().forEach(w => w.close()); Apps.launch('labyrinth'); }); await page.waitForTimeout(300);
await q('.arcade').click(); await page.keyboard.down('ArrowUp'); await page.waitForTimeout(500); await page.keyboard.up('ArrowUp'); await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
console.log('labyrinth running:', await q('.lb-time').textContent(), 'keys:', await q('.lb-keys').textContent());
await page.mouse.move(600, 300); await page.mouse.down(); await page.mouse.move(700, 300, { steps: 5 }); await page.mouse.up();
console.log('drag-look no error:', errors.length === 0);
// store search + reviews
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('store'); }); await page.waitForTimeout(200);
await q('.store-search input').fill('cat'); await page.waitForTimeout(100); console.log('store search:', await ev(() => [...document.querySelectorAll('.store-card .sc-name')].map(x => x.textContent)));
await q('.store-search input').fill(''); await q('.store-side [data-c=Games]').click();
await q('[data-reviews="tetris"]').click(); console.log('reviews:', await q('.store-rev').count(), 'bars:', await q('.store-bar').count());
await q('.store-rev-in').fill('Great!'); await q('.store-rev-add').click(); console.log('posted:', await q('.store-rev').count());
await q('.store-dlg-x').click();
// icon drag
await ev(() => WM.all().forEach(w => w.close())); await page.waitForTimeout(400);
const ic = q('.desk-icon[data-app="paint"]'); const r = await ic.boundingBox();
await page.mouse.move(r.x + 40, r.y + 40); await page.mouse.down(); await page.mouse.move(r.x + 300, r.y + 200, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(100);
console.log('icon moved:', await ev(() => { const e = document.querySelector('.desk-icon[data-app="paint"]'); return [e.style.position, e.style.left, e.style.top, !!Store.get('win11.iconpos', {})['app:paint'], Achievements.has('arranger')]; }), 'paint opened by drag?', await ev(() => WM.byApp('paint').length));
await ev(() => Shell.renderDesktopIcons()); console.log('persists after rerender:', await ev(() => document.querySelector('.desk-icon[data-app="paint"]').style.position));
await page.click('#desktop', { button: 'right', position: { x: 900, y: 500 } }); console.log('auto arrange item:', await page.locator('#context-menu .cm-item', { hasText: 'Auto arrange' }).count());
await page.locator('#context-menu .cm-item', { hasText: 'Auto arrange' }).click(); console.log('reset:', await ev(() => document.querySelector('.desk-icon[data-app="paint"]').style.position === ''));
// cheat sheet
await page.keyboard.press('Meta+/'); console.log('cheat sheet:', await q('.cheat-sheet').count(), await q('.cheat-grid kbd').count()); await page.keyboard.press('Escape'); console.log('closed:', await q('.cheat-sheet').count());
// js / curl
await ev(() => Apps.launch('terminal')); await page.waitForTimeout(150);
for (const c of ['js [1,2,3].map(x=>x*2)', 'js nope(', 'curl https://example.com/x']) { await page.keyboard.type(c); await page.keyboard.press('Enter'); await page.waitForTimeout(200); }
await page.waitForTimeout(600);
const term = await ev(() => document.querySelector('.term-root').innerText);
console.log('js:', term.includes('2,') || term.includes('[\n 2'), 'js error:', term.includes('SyntaxError') || term.includes('ReferenceError'), 'curl:', term.includes('HTTP 200') && term.includes('line3'));
// slideshow setting
await ev(() => Settings.set('wallpaperSlide', 1)); console.log('slide setting:', await ev(() => Settings.get('wallpaperSlide')));
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('labyrinth'); Apps.launch('store'); }); await page.waitForTimeout(300); await q('[data-reviews="labyrinth"]').click();
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch7.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
