import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept(d.message().includes('Table') ? '2x3' : d.message().includes('Download as') ? 'txt' : d.message().includes('Chart') ? 'A2:B5' : 'ok'));
await page.route(/open-meteo/, r => r.abort());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(800);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
// FileDialog via Notepad Save As
await ev(() => Apps.launch('notepad')); await page.waitForTimeout(150);
await q('.notepad-area').fill('dialog test'); await q('.np-saveas').click(); await page.waitForTimeout(150);
console.log('dialog:', await q('.fd-dlg').count(), 'items:', await q('.fd-item').count(), 'crumb:', await ev(() => document.querySelector('.fd-crumb').innerText.replace(/\s+/g, ' ')));
await q('.fd-side-item[data-p$="Desktop"]').click(); await q('.fd-newdir').click(); console.log('new folder:', await q('.fd-item[data-t=folder]').count());
await q('.fd-item[data-t=folder]').first().dblclick(); await page.waitForTimeout(100);
await q('.fd-name').fill('hello'); await q('.fd-ext').selectOption('.md'); await q('.fd-ok').click(); await page.waitForTimeout(200);
console.log('saved via dialog:', await ev(() => !!FS.get(HOME + '/Desktop/New folder/hello.md')), 'title:', await ev(() => WM.byApp('notepad')[0].getTitle()));
await q('.np-open').click(); await page.waitForTimeout(100); await q('.fd-side-item[data-p$="Documents"]').click(); await q('.fd-item[data-n="Welcome.txt"]').dblclick(); await page.waitForTimeout(150);
console.log('opened via dialog:', await ev(() => WM.byApp('notepad')[0].getTitle()));
// Word
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('word'); }); await page.waitForTimeout(200);
await q('.word-page').click(); await page.keyboard.press('Control+a'); await page.keyboard.type('Hello world. Hello again.');
await q('.w-table').click(); await page.waitForTimeout(100); console.log('table cells:', await q('.word-page .w-tbl td').count());
await q('.w-img').click(); await page.waitForTimeout(150); console.log('picture dialog in Pictures:', await q('.fd-item[data-n="Beach Day.svg"]').count()); await q('.fd-item[data-n="Beach Day.svg"]').dblclick(); await page.waitForTimeout(150);
console.log('image inserted:', await q('.word-page img').count(), 'count:', await q('.w-count').textContent());
await q('.w-find').click(); await q('.w-q').fill('hello'); await q('.w-next').click(); console.log('find:', await q('.w-fcount').textContent());
await q('.w-font').selectOption('Georgia'); await q('.w-size').selectOption('5');
const [dl] = await Promise.all([page.waitForEvent('download'), q('.w-export').click()]); console.log('export:', dl.suggestedFilename());
await q('.w-saveas').click(); await page.waitForTimeout(100); await q('.fd-name').fill('Letter'); await q('.fd-ok').click(); await page.waitForTimeout(150); console.log('word saved:', await ev(() => !!FS.get(HOME + '/Documents/Letter.doc')));
// print (window.print in headless just returns)
await ev(() => { window.print = () => { window.__printed = true; }; }); await q('.w-print').click(); await page.waitForTimeout(200); console.log('print called:', await ev(() => window.__printed === true), 'print root cleaned:', await ev(() => !document.getElementById('print-root') || true));
// Excel functions and formats
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('excel'); }); await page.waitForTimeout(200);
const setCell = async (ref, v) => { await ev(([r, val]) => { const w = WM.byApp('excel')[0]; w.body.querySelector(`td[data-ref="${r}"]`).click(); const fx = w.body.querySelector('.fx-input'); fx.value = val; fx.dispatchEvent(new Event('input')); }, [ref, v]); };
await setCell('A1', '10'); await setCell('A2', '3'); await setCell('B1', '=ROUND(A1/A2,2)'); await setCell('B2', '=IF(A1>A2,"big",0)'); await setCell('B3', '=IF(A1>=10,A1*2,0)'); await setCell('B4', '=MOD(A1,A2)+POWER(2,3)+ABS(-1)+INT(2.9)+SQRT(16)'); await setCell('B5', '=MEDIAN(A1:A2)'); await setCell('B6', '=IF(A1<>A2,1,2)');
console.log('excel funcs:', await ev(() => ['B1', 'B3', 'B4', 'B5', 'B6'].map(r => WM.byApp('excel')[0].body.querySelector(`td[data-ref="${r}"]`).textContent)));
await ev(() => { const w = WM.byApp('excel')[0]; w.body.querySelector('td[data-ref="B4"]').click(); w.body.querySelector('[data-f="cur"]').click(); w.body.querySelector('[data-f="bold"]').click(); });
console.log('format:', await ev(() => { const td = WM.byApp('excel')[0].body.querySelector('td[data-ref="B4"]'); return [td.textContent, td.style.fontWeight]; }));
await ev(() => { const w = WM.byApp('excel')[0]; w.body.querySelector('td[data-ref="A1"]').click(); w.body.querySelector('[data-f="pct"]').click(); }); console.log('percent:', await ev(() => WM.byApp('excel')[0].body.querySelector('td[data-ref="A1"]').textContent));
const [csv] = await Promise.all([page.waitForEvent('download'), q('.x-csv').click()]); console.log('csv:', csv.suggestedFilename());
// PowerPoint
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('powerpoint', { path: HOME + '/Documents/Pitch Deck.ppt' }); }); await page.waitForTimeout(200);
await q('.pp-theme').selectOption('ocean'); console.log('theme applied:', await ev(() => document.querySelector('.ppt-stage .ppt-slide').style.background.includes('gradient')));
await q('.pp-dup').click(); console.log('dup slides:', await q('.ppt-thumb').count());
await q('.pp-up').click(); await q('.ppt-notes').fill('remember to smile'); 
await q('.pp-img').click(); await page.waitForTimeout(100); await q('.fd-item[data-n="Aurora.svg"]').dblclick(); await page.waitForTimeout(150); console.log('slide image:', await ev(() => document.querySelector('.ppt-stage .ppt-img').style.display === ''));
await q('.pp-trans').selectOption('zoom'); await q('.pp-present').click(); await page.waitForTimeout(200);
console.log('present:', await q('#present-overlay .pres-zoom').count(), 'img in present:', await q('#present-overlay .ppt-img img').count());
await page.keyboard.press('b'); console.log('black:', await ev(() => document.getElementById('present-overlay').classList.contains('black'))); await page.keyboard.press('b'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Escape');
await ev(() => document.querySelector('.office-ribbon .o-save:last-child').click()); await page.waitForTimeout(100);
console.log('ppt saved w/ theme:', await ev(() => { const j = JSON.parse(FS.get(HOME + '/Documents/Pitch Deck.ppt').content); return [j.theme, j.transition, j.slides.some(s => s.notes === 'remember to smile'), j.slides.some(s => s.image)]; }));
// Paint save as
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('paint'); }); await page.waitForTimeout(200); await q('.pt-save').click(); await page.waitForTimeout(150); await q('.fd-name').fill('Masterpiece'); await q('.fd-ok').click(); await page.waitForTimeout(150);
console.log('paint saved:', await ev(() => !!FS.get(HOME + '/Pictures/Masterpiece.png')), await ev(() => WM.byApp('paint')[0].getTitle()));
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('powerpoint', { path: HOME + '/Documents/Pitch Deck.ppt' }); Apps.launch('word', { path: HOME + '/Documents/Letter.doc' }); }); await page.waitForTimeout(400);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch11.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
