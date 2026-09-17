import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
await ctx.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
const mk = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errors.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); }); p.on('dialog', d => d.accept()); await p.route(/open-meteo/, r => r.abort()); await p.goto((process.env.BASE || 'http://localhost:8123') + '/'); await p.waitForTimeout(1800); await p.click('#lockscreen'); await p.waitForTimeout(800); return p; };
const a = await mk(), bb = await mk();
const ev = (p, fn, x) => p.evaluate(fn, x);
await a.waitForTimeout(600);
console.log('peers seen by A:', await ev(a, () => Object.keys(Nearby.peers).length), 'by B:', await ev(bb, () => Object.keys(Nearby.peers).length));
await ev(a, () => Apps.launch('nearby')); await a.waitForTimeout(200);
console.log('peer list:', await a.locator('.nb-peer').count());
await a.locator('.nb-text').fill('hello from A'); await a.locator('.nb-sendtext').click(); await bb.waitForTimeout(400);
console.log('B inbox:', await ev(bb, () => Nearby.inbox.map(m => m.kind + ':' + m.text)), 'B toast:', await ev(bb, () => Notifications.items.some(n => n.title === 'Nearby Share')));
await ev(a, () => Nearby.shareFile(null, HOME + '/Documents/Welcome.txt')); await bb.waitForTimeout(400);
await ev(bb, () => Apps.launch('nearby')); await bb.waitForTimeout(200);
console.log('B inbox items ui:', await bb.locator('.nb-item').count());
await bb.locator('[data-accept]').first().click(); await bb.waitForTimeout(200);
console.log('B accepted file:', await ev(bb, () => FS.list(HOME + '/Downloads').map(f => f.name)), 'ach:', await ev(bb, () => Achievements.has('nearby')) || await ev(a, () => Achievements.has('nearby')));
// CAD
await a.keyboard.press('Control+Alt+Delete'); await a.waitForTimeout(100); console.log('cad:', await a.locator('#cad').count(), 'ach:', await ev(a, () => Achievements.has('cad')));
await a.locator('[data-a="task"]').click(); await a.waitForTimeout(200); console.log('cad -> taskmgr:', await ev(a, () => WM.byApp('taskmgr').length), 'cad gone:', await a.locator('#cad').count() === 0);
// About install
await ev(a, () => { WM.all().forEach(w => w.close()); Apps.launch('settings', { section: 'about' }); }); await a.waitForTimeout(150);
console.log('about install btn:', await a.locator('#pwa-install').count()); await a.locator('#pwa-install').click(); await a.waitForTimeout(100); console.log('install toast:', await ev(a, () => Notifications.items.some(n => n.title === 'Install')));
await ev(a, () => { WM.all().forEach(w => w.close()); Apps.launch('nearby'); }); await a.waitForTimeout(300); await a.screenshot({ path: (process.env.OUT || '/tmp') + '/batch12.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
