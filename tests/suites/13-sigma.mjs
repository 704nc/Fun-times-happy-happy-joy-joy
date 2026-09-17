import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); localStorage.setItem('win11.sticky', 'old note text'); } catch (e) {} });
const mk = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errors.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); }); p.on('dialog', d => d.accept()); await p.route(/open-meteo/, r => r.abort()); await p.goto((process.env.BASE || 'http://localhost:8123') + '/'); await p.waitForTimeout(1800); await p.click('#lockscreen'); await p.waitForTimeout(800); return p; };
const page = await mk();
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
// stickies: migration + add + drag + persist
console.log('migrated sticky:', await q('.sticky').count(), await ev(() => Stickies.list()[0].text));
await ev(() => { Apps.install('stickynotes'); Apps.launch('stickynotes'); }); await page.waitForTimeout(150);
await q('.sn-new').click(); await page.waitForTimeout(100); console.log('stickies:', await q('.sticky').count(), 'list items:', await q('.sn-item').count(), 'ach:', await ev(() => Achievements.has('sticky')));
await page.keyboard.type('buy milk'); await page.waitForTimeout(50); console.log('typed saved:', await ev(() => Stickies.list().some(n => n.text === 'buy milk')));
await ev(() => WM.all().forEach(w => w.close())); await page.waitForTimeout(300);
const st = await q('.sticky').last().locator('.sticky-head').boundingBox();
await page.mouse.move(st.x + st.width - 50, st.y + 12); await page.mouse.down(); await page.mouse.move(st.x + st.width + 350, st.y + 300, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(100);
console.log('dragged pos saved:', await ev(() => { const n = Stickies.list().pop(); return n.x > 300 && n.y > 200; }));
await q('.sticky').last().locator('[data-c="#cfe8ff"]').click(); console.log('color:', await ev(() => Stickies.list().pop().color));
await page.reload(); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(800); console.log('persist after reload:', await q('.sticky').count());
// auto theme
await ev(() => { Weather._cache = { key: 'x', t: Date.now(), data: Object.assign(Weather.fake(), { sun: { rise: new Date(Date.now() + 3600000).toISOString(), set: new Date(Date.now() + 7200000).toISOString() } }) }; Settings.set('theme', 'light'); Settings.set('autoTheme', true); });
await page.waitForTimeout(150); console.log('auto theme -> dark (before sunrise):', await ev(() => Settings.get('theme')));
await ev(() => { Settings.set('autoTheme', false); Settings.set('theme', 'light'); });
// explorer preview pane
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('explorer', { path: HOME + '/Documents' }); }); await page.waitForTimeout(200);
await q('.fx-preview-btn').click(); await q('.fx-item[data-n="Welcome.txt"]').click(); console.log('preview text:', await ev(() => document.querySelector('.fx-preview pre') && document.querySelector('.fx-preview pre').textContent.includes('Welcome')));
await q('.fx-item[data-n="Budget 2026.xls"]').click(); console.log('preview xls rows:', await q('.fx-pv-tbl tr').count());
await q('.fx-item[data-n="Pitch Deck.ppt"]').click(); console.log('preview ppt slides:', await q('.fx-pv-slide').count());
await ev(() => WM.byApp('explorer')[0].body.querySelector('.fx-side-item[data-p$="Pictures"]').click()); await q('.fx-item[data-n="Aurora.svg"]').click(); console.log('preview img:', await q('.fx-preview img').count());
await q('.fx-files').press(' '); console.log('space toggles off:', await ev(() => document.querySelector('.fx-preview').style.display === 'none'));
// settings search
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('settings'); }); await page.waitForTimeout(150);
await q('.set-search').fill('narr'); console.log('settings search:', await ev(() => [...document.querySelectorAll('.set-results .set-nav')].map(x => x.textContent.trim().split('\n')[0])));
await q('.set-results .set-nav').first().click(); console.log('navigated:', await q('.set-content h1').textContent());
await q('.set-search').fill(''); console.log('nav restored:', await ev(() => document.querySelector('.set-nav-list').style.display === ''));
// photos albums
await ev(() => { FS.mkdir(HOME + '/Pictures/Camera Roll'); FS.write(HOME + '/Pictures/Camera Roll/shot.svg', FS.get(HOME + '/Pictures/Aurora.svg').content, 'image/svg+xml'); WM.all().forEach(w => w.close()); Apps.launch('photos'); }); await page.waitForTimeout(200);
console.log('albums:', await ev(() => [...document.querySelectorAll('.ph-albums button')].map(b => b.textContent)));
await page.locator('.ph-albums button', { hasText: 'Camera Roll' }).click(); console.log('album filtered:', await q('.ph-thumb').count());
// network chess between two tabs
const p2 = await mk(); await page.waitForTimeout(600);
await ev(() => { Apps.install('chess'); }); await p2.evaluate(() => Apps.install('chess'));
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('chess'); }); await page.waitForTimeout(200);
await q('.ch-net').click(); await p2.waitForTimeout(1200);
console.log('invitee opened chess:', await p2.evaluate(() => WM.byApp('chess').length), 'title:', await p2.evaluate(() => WM.byApp('chess')[0] && WM.byApp('chess')[0].getTitle()));
console.log('inviter status:', await q('.ch-status').textContent());
await q('.sq[data-i="52"]').click(); await q('.sq[data-i="36"]').click(); await p2.waitForTimeout(400);
console.log('move arrived at B (e4):', await p2.evaluate(() => document.querySelector('.chess-moves').textContent.includes('e4')), 'B status:', await p2.locator('.ch-status').textContent());
await p2.locator('.sq[data-i="12"]').click(); await p2.locator('.sq[data-i="28"]').click(); await page.waitForTimeout(400);
console.log('reply arrived at A (e5):', await ev(() => document.querySelector('.chess-moves').textContent.includes('e5')), 'A status:', await q('.ch-status').textContent());
await q('.ch-undo').click(); console.log('no undo in net:', await ev(() => Notifications.items.some(n => n.body.includes('take-backs'))));
await ev(() => { Stickies.render(); }); await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch13.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
