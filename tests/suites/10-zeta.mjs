import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept('Road Trip'));
await page.route(/open-meteo/, r => r.abort());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(800);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
// game bar
await ev(() => { Apps.install('wordl'); Apps.launch('wordl'); }); await page.waitForTimeout(200);
await page.keyboard.press('Meta+g'); await page.waitForTimeout(700);
console.log('game bar:', await q('.game-bar').count(), 'game:', await q('.gb-game').textContent(), 'fps>0:', +(await q('.gb-fps b').textContent()) > 0, 'ach:', await ev(() => Achievements.has('gamebar')));
await q('[data-a="fps"]').click(); console.log('fps corner:', await q('.fps-corner').count()); await q('[data-a="fps"]').click(); await q('[data-a="x"]').click();
// wordl
const target = await ev(() => { const s = Store.get('win11.wordl', {}); return null; });
await q('.wd-grid').click(); await page.keyboard.type('zzzzz'); await page.keyboard.press('Enter'); console.log('invalid word:', await q('.wd-msg').textContent());
await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
await page.keyboard.type('about'); await page.keyboard.press('Enter'); console.log('guess colored:', await ev(() => [...document.querySelectorAll('.wd-row:first-child .wd-cell')].map(c => c.className.replace('wd-cell ', '')).join('')), 'kb colored:', await ev(() => document.querySelectorAll('.wd-kb button.g, .wd-kb button.y, .wd-kb button.x').length));
await q('.wd-random').click(); console.log('practice mode:', await q('.wd-stat').textContent());
// zip create + extract
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('explorer', { path: HOME }); }); await page.waitForTimeout(300);
const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await q('.fx-item[data-n="Documents"]').click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'Compress' }).click(); })()]);
console.log('zip download:', dl.suggestedFilename());
await page.waitForTimeout(400);
console.log('zip in FS:', await ev(() => !!FS.get(HOME + '/Documents.zip')), 'ach:', await ev(() => Achievements.has('zipper')));
// validate the zip with python later; extract in-app
const zipData = await ev(() => FS.get(HOME + '/Documents.zip').content);
const fs = await import('node:fs'); fs.writeFileSync((process.env.OUT || '/tmp') + '/docs.zip', Buffer.from(zipData.split(',')[1], 'base64'));
await q('.fx-item[data-n="Documents.zip"]').click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'Extract' }).click(); await page.waitForTimeout(500);
console.log('extracted:', await ev(() => FS.list(HOME + '/Documents/Documents').map(f => f.name)));
console.log('roundtrip content ok:', await ev(() => FS.get(HOME + '/Documents/Documents/Welcome.txt').content === FS.get(HOME + '/Documents/Welcome.txt').content));
// deflate extraction: build a zip with node's zlib deflateRaw and upload it
const zlib = await import('node:zlib');
const mk = (name, data) => { const comp = zlib.deflateRawSync(Buffer.from(data)); const crcT = []; for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcT[i] = c >>> 0; } let crc = 0xFFFFFFFF; for (const byte of Buffer.from(data)) crc = crcT[(crc ^ byte) & 255] ^ (crc >>> 8); crc = (crc ^ 0xFFFFFFFF) >>> 0; const n = Buffer.from(name); const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(n.length, 26); const cd = Buffer.alloc(46); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(8, 10); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(n.length, 28); cd.writeUInt32LE(0, 42); const local = Buffer.concat([lh, n, comp]); const central = Buffer.concat([cd, n]); const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(local.length, 16); return Buffer.concat([local, central, eocd]); };
await q('.fx-upload input').setInputFiles({ name: 'deflated.zip', mimeType: 'application/zip', buffer: mk('hello/inflated.txt', 'deflate works '.repeat(20)) }); await page.waitForTimeout(300);
await q('.fx-item[data-n="deflated.zip"]').click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'Extract' }).click(); await page.waitForTimeout(600);
console.log('deflate extracted:', await ev(() => (FS.get(HOME + '/deflated/hello/inflated.txt') || {}).content === 'deflate works '.repeat(20)));
// chat DMs
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('slack'); }); await page.waitForTimeout(200);
console.log('dm channels:', await q('.chat-ch[data-id^="dm-"]').count());
await q('.chat-ch[data-id="dm-priya-sharma"]').click(); await q('.chat-input input').fill('hi Priya'); await page.keyboard.press('Enter');
await page.waitForFunction(() => (ChatStore.get('slack', 'dm-priya-sharma') || []).filter(m => m.user === 'Priya Sharma').length >= 2, null, { timeout: 8000 });
console.log('dm reply from Priya only:', await ev(() => ChatStore.get('slack', 'dm-priya-sharma').every(m => m.user === 'Priya Sharma' || m.user === 'seefood')));
// spotify likes + playlists
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('spotify'); }); await page.waitForTimeout(200);
await q('[data-like="t2"]').first().click(); console.log('liked:', await ev(() => Store.get('win11.spotify').liked));
await q('.sp-row[data-id="t3"]').first().click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'new playlist' }).click(); await page.waitForTimeout(200);
console.log('playlist:', await ev(() => Store.get('win11.spotify').playlists), 'ach:', await ev(() => Achievements.has('curator')));
await q('.sp-side-item[data-v="library"]').click(); console.log('library pls:', await q('.sp-pl').count());
await q('.sp-pl[data-pl="Road Trip"]').click(); console.log('playlist view rows:', await q('.sp-row').count()); await q('.sp-playall').click(); await page.waitForTimeout(100); console.log('playing t3:', await ev(() => Synth.current && Synth.current.id)); await ev(() => Synth.stop());
// pipes screensaver + gaming settings + terminal edit/zip
await ev(() => Screensaver.start('pipes')); await page.waitForTimeout(800); await page.mouse.move(400, 300); await page.waitForTimeout(500); console.log('pipes ok:', await ev(() => !document.querySelector('#screensaver')));
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('settings', { section: 'gaming' }); }); await page.waitForTimeout(150); console.log('gaming page:', await q('#fps-sw').count());
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('terminal'); }); await page.waitForTimeout(150);
await page.keyboard.type('edit notes.txt'); await page.keyboard.press('Enter'); await page.waitForTimeout(200); console.log('edit opened notepad:', await ev(() => WM.byApp('notepad').length), await ev(() => !!FS.get(HOME + '/notes.txt')));
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('wordl'); Apps.launch('spotify'); }); await page.waitForTimeout(400); await page.keyboard.press('Meta+g'); await page.waitForTimeout(600);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch10.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
