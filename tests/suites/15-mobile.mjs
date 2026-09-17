import { chromium, devices } from 'playwright';
const b = await chromium.launch();
const errors = [];
const ctx = await b.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept());
await page.route(/open-meteo/, r => r.abort());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800); await page.tap('#lockscreen'); await page.waitForTimeout(800);
const ev = (fn, a) => page.evaluate(fn, a);
const ids = await ev(() => { ['solitaire', 'chess', 'tetris', 'muncher', 'wordl', 'sudoku', 'labyrinth', 'neko', 'weather', 'clock'].forEach(id => Apps.install(id)); return Apps.all().map(a => a.id); });
const overflow = [];
for (const id of ids) {
  await ev(id => { WM.allDesks().forEach(w => w.close()); Apps.launch(id); }, id); await page.waitForTimeout(250);
  const r = await ev(() => { const w = WM.all()[0]; if (!w) return null; const body = w.body; return { maxed: w.maxed, scrollW: body.scrollWidth, clientW: body.clientWidth, docW: document.documentElement.scrollWidth, vw: innerWidth }; });
  if (r && (r.docW > r.vw + 2)) overflow.push(id + ' page-overflow ' + r.docW);
  if (['explorer', 'outlook', 'calendar', 'chess', 'solitaire', 'store', 'settings', 'tetris', 'edge', 'taskmgr'].includes(id)) await page.screenshot({ path: (process.env.OUT || '/tmp') + '/m-' + id + '.png' });
}
await ev(() => { WM.allDesks().forEach(w => w.close()); Shell.toggleStart(true); }); await page.waitForTimeout(200); await page.screenshot({ path: (process.env.OUT || '/tmp') + '/m-start.png' });
await ev(() => { Shell.toggleStart(false); Widgets.toggle(); }); await page.waitForTimeout(200); await page.screenshot({ path: (process.env.OUT || '/tmp') + '/m-widgets.png' });
await ev(() => { Widgets.toggle(); TaskView.open(); }); await page.waitForTimeout(200); await page.screenshot({ path: (process.env.OUT || '/tmp') + '/m-taskview.png' }); await ev(() => TaskView.close());
console.log('apps launched:', ids.length, 'page overflow:', overflow.length ? overflow : 'none');
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
