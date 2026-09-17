import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept('Renamed'));
await page.route(/^https:\/\/(example\.com|github\.com|p\.example)/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<h1>stub ' + r.request().url() + '</h1>' }));
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(800);
const ev = (fn, a) => page.evaluate(fn, a);
await ev(() => Apps.launch('edge')); await page.waitForTimeout(200);
const q = s => page.locator(s);
console.log('tabs:', await q('.edge-tab').count(), 'home visible:', await q('.edge-home').isVisible(), 'bookmarks:', await q('.edge-bm .bm').count());
await q('.eg-url').fill('example.com'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
console.log('friendly: src=', await ev(() => document.querySelector('.edge-view iframe').src), 'banner:', await q('.edge-banner').isVisible(), 'title:', await ev(() => WM.byApp('edge')[0].getTitle()));
await q('.eg-url').fill('github.com/foo'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
console.log('blocked-site banner:', await q('.edge-banner').isVisible(), 'setup btn:', await q('.eb-setup').isVisible(), 'proxy btn:', await q('.eb-proxy').isVisible());
await q('.eb-x').click(); console.log('dismissed:', !(await q('.edge-banner').isVisible()));
await q('.eg-star').click(); console.log('star:', await q('.eg-star').textContent(), 'bookmarks:', await q('.edge-bm .bm').count());
// configure proxy via Settings → System input
await ev(() => Apps.launch('settings', { section: 'system' })); await page.waitForTimeout(200);
await q('#edge-proxy').fill('http://bad'); await page.keyboard.press('Tab'); await page.waitForTimeout(100);
console.log('invalid proxy rejected:', await ev(() => Settings.get('edgeProxy')) === '');
await q('#edge-proxy').fill('https://p.example/'); await page.keyboard.press('Tab'); await page.waitForTimeout(300);
console.log('proxy set:', await ev(() => Settings.get('edgeProxy')));
await ev(() => WM.byApp('edge')[0].focus());
console.log('reloaded via proxy: src=', await ev(() => document.querySelector('.edge-view iframe').src), 'shield on:', await ev(() => document.querySelector('.eg-shield').classList.contains('on')), 'banner:', await q('.edge-banner').isVisible());
await q('.eg-shield').click(); await page.waitForTimeout(200);
console.log('direct: src=', await ev(() => document.querySelector('.edge-view iframe').src), 'banner:', await q('.edge-banner').isVisible(), 'proxy btn:', await q('.eb-proxy').isVisible());
await q('.eb-proxy').click(); await page.waitForTimeout(200);
console.log('back via proxy:', (await ev(() => document.querySelector('.edge-view iframe').src)).startsWith('https://p.example/?url='));
// tabs
await q('.eg-newtab').click(); console.log('tabs after new:', await q('.edge-tab').count(), 'home:', await q('.edge-home').isVisible());
await q('.edge-tab[data-i="0"]').click(); await page.waitForTimeout(200);
console.log('switched back url:', await q('.eg-url').inputValue());
await q('.edge-tab[data-i="1"] .et-close').click(); console.log('tabs after close:', await q('.edge-tab').count(), 'edge still open:', await ev(() => WM.byApp('edge').length));
// back/forward
await q('.eg-back').click(); await page.waitForTimeout(100); console.log('back url:', await q('.eg-url').inputValue());
await q('.eg-fwd').click(); await page.waitForTimeout(100); console.log('fwd url:', await q('.eg-url').inputValue());
// home search
await q('.eg-home').click(); await q('.edge-search input').fill('cats'); await page.keyboard.press('Enter'); await page.waitForTimeout(100);
console.log('search url:', await q('.eg-url').inputValue());
// bookmark rename via context menu
await q('.edge-bm .bm').last().click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'Rename' }).click();
console.log('renamed:', await q('.edge-bm .bm').last().textContent());
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/edge.png' });
await ev(() => Settings.set('edgeProxy', ''));
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
