import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/');
await page.waitForTimeout(1800);
await page.click('#lockscreen');
await page.waitForTimeout(800);
const ev = (fn, arg) => page.evaluate(fn, arg);
console.log('achievements after unlock:', await ev(() => Object.keys(Achievements.unlocked())));
// launch every built-in app
const ids = await ev(() => Apps.all().filter(a => !a.store).map(a => a.id));
for (const id of ids) { await ev(id => Apps.launch(id), id); await page.waitForTimeout(150); }
console.log('open windows:', await ev(() => WM.all().length), 'power-user:', await ev(() => Achievements.has('power-user')));
// task manager end task
await ev(() => { const w = Apps.launch('taskmgr'); w.body.querySelector('.tm-row[data-id^="w"]').click(); w.body.querySelector('.tm-end').click(); });
await page.waitForTimeout(200);
console.log('taskmgr ach:', await ev(() => Achievements.has('taskmgr')));
// alt-tab
await page.keyboard.down('Alt'); await page.keyboard.press('Tab'); await page.waitForTimeout(100);
console.log('switcher visible:', await ev(() => !!document.querySelector('.alt-tab')));
await page.keyboard.up('Alt');
console.log('switcher closed:', await ev(() => !document.querySelector('.alt-tab')));
// close all, terminal commands
await ev(() => WM.all().forEach(w => w.close()));
await page.waitForTimeout(300);
await ev(() => Apps.launch('terminal'));
for (const cmd of ['cowsay happy happy joy joy', 'fortune', 'neofetch', 'sl', 'achievements', 'hiscores', 'help', 'bogus', 'dir', 'ver']) {
  await page.keyboard.type(cmd); await page.keyboard.press('Enter'); await page.waitForTimeout(80);
}
const termText = await ev(() => document.querySelector('.term-root').innerText);
console.log(termText.includes('(oo)') ? 'cowsay ok' : 'cowsay FAIL', termText.includes('Windows 11 Web 26H2') ? 'neofetch ok' : 'neofetch FAIL', 'term-velocity:', await ev(() => Achievements.has('terminal-velocity')));
// install store games + play smoke
await ev(() => ['breakout', 'pong', 'flappy', 'minesweeper', 'game2048'].forEach(id => Apps.install(id)));
for (const id of ['breakout', 'pong', 'flappy']) {
  await ev(id => Apps.launch(id), id);
  await page.waitForTimeout(300);
  const c = page.locator('.arcade').last();
  await c.click(); await page.keyboard.press('Space'); await page.waitForTimeout(1500);
  console.log(id, 'running; frames ok:', await ev(() => !!document.querySelector('.arcade')));
}
console.log('installer/collector:', await ev(() => [Achievements.has('installer'), Achievements.has('collector')]));
// xbox app, clippy, party, screensaver, lock
await ev(() => Apps.launch('xbox'));
console.log('xbox cards:', await ev(() => document.querySelectorAll('.ach-card').length));
await ev(() => Settings.set('clippy', true)); await page.waitForTimeout(200);
console.log('clippy:', await ev(() => !!document.querySelector('.clippy')), await ev(() => document.querySelector('.clippy-bubble').textContent.slice(0, 30)));
await ev(() => Clippy.next());
await ev(() => Settings.set('clippy', false)); await page.waitForTimeout(500);
console.log('clippy gone:', await ev(() => !document.querySelector('.clippy')));
for (const k of ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']) await page.keyboard.press(k);
await page.waitForTimeout(300);
console.log('party:', await ev(() => document.documentElement.classList.contains('party')), 'konami ach:', await ev(() => Achievements.has('konami')));
for (const st of ['bubbles','starfield','mystify','logo']) { await ev(s => Screensaver.start(s), st); await page.waitForTimeout(600); await page.mouse.move(100 + Math.random()*50, 100); await page.waitForTimeout(500); }
console.log('screensaver stopped:', await ev(() => !document.querySelector('#screensaver')));
await ev(() => Lock.show()); await page.waitForTimeout(500); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
console.log('relock cleared:', await ev(() => !document.querySelector('#lockscreen')));
// power menu
await ev(() => Shell.toggleStart(true)); await page.click('#power-btn'); await page.waitForTimeout(100);
console.log('power menu items:', await ev(() => [...document.querySelectorAll('#context-menu .cm-item')].map(x => x.textContent.trim())));
await page.keyboard.press('Escape');
// settings fun page
await ev(() => { const w = Apps.launch('settings'); w.body.querySelector('.set-nav[data-id=fun]').click(); });
console.log('settings fun cards:', await ev(() => document.querySelectorAll('.set-content .set-card').length));
// copilot
await ev(() => Apps.launch('copilot'));
await page.locator('.cop-input input').fill('show achievements'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
console.log('copilot:', await ev(() => [...document.querySelectorAll('.cop-msg.bot')].pop().textContent.slice(0, 50)));
// mobile viewport sanity
await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(300);
await ev(() => Apps.launch('taskmgr'));
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/mobile.png' });
await page.setViewportSize({ width: 1280, height: 800 });
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('xbox'); Apps.launch('breakout'); Settings.set('clippy', true); });
await page.waitForTimeout(600);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/desktop.png' });
// bsod
await ev(() => BSOD.show('TEST'));
await page.waitForTimeout(500);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/bsod.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
