import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { try { localStorage.setItem('win11.oobe', '1'); } catch (e) {} });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept('out.txt'));
await page.route(/open-meteo/, r => r.abort());
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800); await page.click('#lockscreen'); await page.waitForTimeout(800);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
// Notepad
await ev(() => Apps.launch('notepad')); await page.waitForTimeout(150);
await q('.notepad-area').fill('the cat sat on the mat. the end.');
await page.keyboard.press('Control+h'); console.log('findbar:', await q('.np-findbar').isVisible());
await q('.np-q').fill('the'); await q('.np-r').fill('a'); await q('.np-next').click(); console.log('match count:', await q('.np-count').textContent());
await q('.np-replaceall').click(); console.log('replaced:', JSON.stringify(await ev(() => document.querySelector('.notepad-area').value)), await q('.np-count').textContent());
console.log('statusbar:', await q('.np-words').textContent(), '| title:', await ev(() => WM.byApp('notepad')[0].getTitle()));
await q('.np-zoom-in').click(); console.log('zoom:', await q('.np-zoom').textContent(), await ev(() => document.querySelector('.notepad-area').style.fontSize));
await q('.np-save').click(); await page.waitForTimeout(150); await q('.fd-name').fill('out.txt'); await q('.fd-ok').click(); await page.waitForTimeout(150); console.log('saved as:', await ev(() => !!FS.get(HOME + '/Documents/out.txt')), await ev(() => WM.byApp('notepad')[0].getTitle()));
// Terminal history + tab completion
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('terminal'); }); await page.waitForTimeout(150);
await page.keyboard.type('ver'); await page.keyboard.press('Enter'); await page.keyboard.type('whoami'); await page.keyboard.press('Enter');
await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); console.log('history up x2:', await ev(() => document.querySelector('.term-in input').value));
await page.keyboard.press('ArrowDown'); console.log('history down:', await ev(() => document.querySelector('.term-in input').value));
await ev(() => { document.querySelector('.term-in input').value = 'cow'; }); await page.keyboard.press('Tab'); console.log('tab complete:', JSON.stringify(await ev(() => document.querySelector('.term-in input').value)));
await ev(() => { document.querySelector('.term-in input').value = 'cd Doc'; }); await page.keyboard.press('Tab'); console.log('tab complete path:', JSON.stringify(await ev(() => document.querySelector('.term-in input').value)));
await page.keyboard.type(' && '); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
await ev(() => { document.querySelector('.term-in input').value = 'timer 2s'; }); await page.keyboard.press('Enter');
// Explorer list view, sort, search, properties
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('explorer', { path: HOME + '/Documents' }); }); await page.waitForTimeout(150);
await q('.fx-view').click(); console.log('list view:', await ev(() => document.querySelector('.fx-files').classList.contains('list')), 'meta cols:', await q('.fx-meta').count());
await q('.fx-sort').selectOption('size'); console.log('sorted by size first:', await q('.fx-item .fx-name').first().textContent());
await q('.fx-search').fill('budget'); console.log('search:', await q('.fx-item').count(), await q('.fx-status').textContent());
await q('.fx-search').fill('');
await q('.fx-item').first().click({ button: 'right' }); await page.locator('#context-menu .cm-item', { hasText: 'Properties' }).click();
console.log('properties:', await q('.fx-props-card').count(), await ev(() => document.querySelector('.fx-props-row:nth-child(3)').innerText.replace(/\n/g, ' ')));
await q('.fx-props button').click();
// timer rang (2s) ?
await page.waitForTimeout(1800);
console.log('timer rang:', await ev(() => Notifications.items.some(n => n.body.includes("time's up"))), 'ach:', await ev(() => Achievements.has('timer')));
// Clock app
await ev(() => { Apps.install('clock'); WM.all().forEach(w => w.close()); Apps.launch('clock'); }); await page.waitForTimeout(150);
console.log('zones:', await q('.clk-zone').count());
await q('.clk-tabs [data-t=timer]').click(); await q('[data-min="1"]').click(); await page.waitForTimeout(150); console.log('timers:', await q('.clk-item').count(), await ev(() => Timers.list.length));
await q('[data-cancel]').click(); console.log('cancelled:', await ev(() => Timers.list.length));
await q('.clk-tabs [data-t=alarm]').click(); await q('.al-time').fill('06:45'); await q('.al-label').fill('Wake'); await q('.al-add').click(); await page.waitForTimeout(150); console.log('alarms:', await q('.clk-item').count(), await ev(() => Timers.alarms()[0].time));
await q('[data-toggle]').click(); console.log('alarm toggled off:', await ev(() => Timers.alarms()[0].on === false));
await q('.clk-tabs [data-t=stopwatch]').click(); await q('.sw-start').click(); await page.waitForTimeout(400); await q('.sw-lap').click(); console.log('laps:', await q('.clk-laps div').count());
// Minesweeper levels
await ev(() => { Apps.install('minesweeper'); WM.all().forEach(w => w.close()); Apps.launch('minesweeper'); }); await page.waitForTimeout(150);
await q('.ms-level').selectOption('expert'); await page.waitForTimeout(100); console.log('expert cells:', await q('.mine-cell').count(), 'win width:', await ev(() => WM.byApp('minesweeper')[0].el.offsetWidth));
await q('.mine-cell').first().click(); await page.waitForTimeout(700); console.log('timer running:', await q('.ms-time').textContent());
// Photos rotate + save copy
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('photos'); }); await page.waitForTimeout(200);
await q('.ph-thumb').first().click(); await q('.pv-rot').click(); await q('.pv-filter').selectOption('sepia(.8)'); await page.waitForTimeout(200);
await q('.pv-savecopy').click(); await page.waitForTimeout(300);
console.log('edited copy:', await ev(() => FS.list(HOME + '/Pictures').filter(f => f.name.includes('(edited)')).map(f => f.name)));
// Copilot intents
await ev(() => Apps.launch('copilot'));
const ask = async t => { await q('.cop-input input').fill(t); await page.keyboard.press('Enter'); await page.waitForTimeout(1100); return ev(() => [...document.querySelectorAll('.cop-msg.bot')].pop().textContent); };
console.log('timer:', await ask('set a timer for 5 minutes'), '| timers:', await ev(() => Timers.list.length));
console.log('dice:', await ask('roll 2 dice'));
console.log('coin:', await ask('flip a coin'));
console.log('remind:', await ask('remind me to call mom at 6:30 pm'), '| events:', await ev(() => CalendarStore.all().length));
console.log('open file:', await ask('open Welcome.txt'), '| notepad:', await ev(() => WM.byApp('notepad').length));
// accessibility
await ev(() => Settings.set('textScale', 1.25)); console.log('zoom:', await ev(() => document.documentElement.style.zoom));
await ev(() => Settings.set('textScale', 1)); await ev(() => Settings.set('highContrast', true)); console.log('hc:', await ev(() => document.documentElement.classList.contains('hc'))); await ev(() => Settings.set('highContrast', false));
// sounds toggle in settings
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('settings', { section: 'system' }); }); await page.waitForTimeout(150);
await q('#snd-sw').click(); console.log('sounds off:', await ev(() => Settings.get('sounds') === false)); await q('#snd-sw').click();
// lock screen info
await ev(() => Lock.show()); await page.waitForTimeout(300); console.log('lock info:', await ev(() => document.querySelector('#lockscreen .lock-info').innerText.replace(/\n/g, ' | ')));
await page.keyboard.press('Enter'); await page.waitForTimeout(600);
// snip
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('notepad'); Apps.launch('calculator'); }); await page.waitForTimeout(300);
await ev(() => Snip.capture()); await page.waitForTimeout(3500);
console.log('screenshot files:', await ev(() => FS.get(HOME + '/Pictures/Screenshots') ? FS.list(HOME + '/Pictures/Screenshots').map(f => f.name + ' ' + Utils.fmtBytes(f.node.content.length)) : 'none'), 'ach:', await ev(() => Achievements.has('snip')));
const shot = await ev(() => { const f = FS.get(HOME + '/Pictures/Screenshots'); const k = f && Object.keys(f.children)[0]; return k ? f.children[k].content : null; });
if (shot) { const fs = await import('node:fs'); fs.writeFileSync((process.env.OUT || '/tmp') + '/snip.jpg', Buffer.from(shot.split(',')[1], 'base64')); }
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch6.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
