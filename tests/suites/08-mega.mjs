import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept('A2:B5'));
await page.route(/open-meteo/, r => r.abort());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(800);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
// muncher
await ev(() => { Apps.install('muncher'); Apps.install('sudoku'); Apps.launch('muncher'); }); await page.waitForTimeout(300);
await q('.arcade').click(); await page.waitForTimeout(1700); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(1200); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(800);
console.log('muncher score:', await q('.pm-score').textContent(), 'lives:', await q('.pm-lives').textContent());
// sudoku
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('sudoku'); }); await page.waitForTimeout(600);
const su = await ev(() => { const given = document.querySelectorAll('.su-cell.given').length; return [given, document.querySelectorAll('.su-cell').length]; });
console.log('sudoku givens/cells:', su);
await q('.su-cell:not(.given)').first().click(); await page.keyboard.press('5'); await page.keyboard.press('Backspace');
console.log('hint works:', await (async () => { const before = await ev(() => document.querySelectorAll('.su-cell:not(.given):not(:empty)').length); await q('.su-hint').click(); return (await ev(() => document.querySelectorAll('.su-cell:not(.given):not(:empty)').length)) === before + 1; })());
// force-solve by filling from solution via hints loop (verifies win detection)
await ev(() => { for (let i = 0; i < 81; i++) document.querySelector('.su-hint').click(); }); await page.waitForTimeout(200);
console.log('solved toast:', await ev(() => Notifications.items.some(n => n.title === 'Sudoku' && n.body.startsWith('Solved'))));
// explorer copy/paste/cut, open with
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('explorer', { path: HOME + '/Documents' }); }); await page.waitForTimeout(400);
await q('.fx-item[data-n="Welcome.txt"]').click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'Copy' }).click();
await ev(() => WM.byApp('explorer')[0].body.querySelector('.fx-side-item[data-p$="Desktop"]').click()); await page.waitForTimeout(100);
await q('.fx-files').click({ button: 'right', position: { x: 300, y: 300 } }); await page.locator('#context-menu .cm-item', { hasText: 'Paste' }).click(); await page.waitForTimeout(200);
console.log('copied to desktop:', await ev(() => !!FS.get(HOME + '/Desktop/Welcome.txt')), 'ach:', await ev(() => Achievements.has('organizer')));
await q('.fx-item[data-n="Welcome.txt"]').click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'Cut' }).click();
await ev(() => WM.byApp('explorer')[0].body.querySelector('.fx-side-item[data-p$="Downloads"]').click()); await page.waitForTimeout(100);
await q('.fx-files').click({ position: { x: 300, y: 300 } }); await page.keyboard.press('Control+v'); await page.waitForTimeout(200);
console.log('moved:', await ev(() => [!!FS.get(HOME + '/Downloads/Welcome.txt'), !FS.get(HOME + '/Desktop/Welcome.txt')]));
await q('.fx-item[data-n="Welcome.txt"]').click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'Open with' }).click(); await page.waitForTimeout(100);
console.log('open-with items:', await ev(() => [...document.querySelectorAll('#context-menu .cm-item')].map(x => x.textContent.trim()).join(',')));
await page.locator('#context-menu .cm-item', { hasText: 'Word' }).click(); console.log('opened in word:', await ev(() => WM.byApp('word').length));
// excel chart
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('excel', { path: HOME + '/Documents/Budget 2026.xls' }); }); await page.waitForTimeout(300);
await q('.o-chart').click(); await page.waitForTimeout(200);
console.log('chart shown:', await q('.xl-chart').isVisible(), await q('.xl-chart-title').textContent());
await q('.xl-chart-type').selectOption('pie'); await q('.o-save:not(.x-csv)').click(); await page.waitForTimeout(100);
console.log('chart saved:', await ev(() => JSON.parse(FS.get(HOME + '/Documents/Budget 2026.xls').content).chart));
// task manager tabs
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('taskmgr'); }); await page.waitForTimeout(200);
await q('.tm-tabs [data-t=perf]').click(); console.log('perf stats:', await q('.tm-stat').count());
await q('.tm-tabs [data-t=startup]').click(); await q('[data-st="cursorTrail"]').click(); console.log('startup toggle:', await ev(() => Settings.get('cursorTrail'))); await ev(() => Settings.set('cursorTrail', false));
// media flyout
await ev(() => { Synth.setQueue(Synth.tracks); Synth.play(Synth.tracks[0], 0); }); await page.waitForTimeout(200);
console.log('tray media visible:', await q('#tray-media').isVisible());
await q('#tray-media').click({ force: true }); console.log('flyout:', await q('#media-flyout').evaluate(e => e.classList.contains('open')), await q('.mf-t').textContent());
await q('[data-m="toggle"]').click(); console.log('paused:', await ev(() => !Synth.isPlaying)); await ev(() => Synth.stop()); await page.mouse.click(600, 300);
// snipping tool app window capture
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('calculator'); Apps.launch('snip'); }); await page.waitForTimeout(300);
await q('.snip-mode').selectOption('window'); await q('.snip-go').click(); await page.waitForTimeout(3500);
console.log('window shot:', await ev(() => FS.get(HOME + '/Pictures/Screenshots') ? FS.list(HOME + '/Pictures/Screenshots').map(f => f.name + ' ' + Utils.fmtBytes(f.node.content.length)) : 'none'), 'app items:', await q('.snip-item').count());
const shot = await ev(() => { const f = FS.get(HOME + '/Pictures/Screenshots'); const k = f && Object.keys(f.children)[0]; return k ? f.children[k].content : null; });
if (shot) { const fs = await import('node:fs'); fs.writeFileSync((process.env.OUT || '/tmp') + '/winsnip.png', Buffer.from(shot.split(',')[1], 'base64')); }
// storage breakdown + widgets calendar
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('settings', { section: 'system' }); }); await page.waitForTimeout(150); console.log('storage rows:', await q('.stg-row').count());
await page.click('#taskbar-widgets'); console.log('widgets calendar card:', await ev(() => [...document.querySelectorAll('.wg-title')].some(t => t.textContent === 'Calendar'))); await page.mouse.click(1000, 100);
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('muncher'); Apps.launch('sudoku'); }); await page.waitForTimeout(500);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch8.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
