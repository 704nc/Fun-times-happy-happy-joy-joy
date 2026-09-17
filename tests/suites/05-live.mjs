import { chromium } from 'playwright';
const b = await chromium.launch();
const errors = [];
const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error' && !/ERR_|net::/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
page.on('dialog', d => d.accept('password'));
await page.route(/api\.open-meteo\.com/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ current: { temperature_2m: 61.3, apparent_temperature: 59, weather_code: 61, wind_speed_10m: 7.2, relative_humidity_2m: 80 }, daily: { time: ['2026-09-17','2026-09-18','2026-09-19','2026-09-20','2026-09-21','2026-09-22','2026-09-23'], weather_code: [61,2,0,3,80,95,1], temperature_2m_max: [64,68,72,66,60,58,70], temperature_2m_min: [50,52,55,51,48,47,53] } }) }));
await page.route(/geocoding-api\.open-meteo\.com/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ name: 'Paris', admin1: 'Île-de-France', country_code: 'FR', latitude: 48.85, longitude: 2.35 }] }) }));
await page.goto((process.env.BASE || 'http://localhost:8123') + '/'); await page.waitForTimeout(1800);
await page.click('#lockscreen'); await page.waitForTimeout(1200);
const ev = (fn, a) => page.evaluate(fn, a);
const q = s => page.locator(s);
// OOBE appears on fresh profile
console.log('oobe shown:', await q('#oobe').count());
await q('.oobe-name').fill('Ada'); await q('.oobe-av [data-av="🦄"]').click(); await q('.oobe-next').click();
await q('[data-retro="xp"]').click(); await q('[data-retro=""]').click(); await q('.oobe-next').click();
await q('.oobe-walls [data-w="sunset"]').click(); await q('.oobe-next').click();
await q('.oobe-tgl[data-k="clippy"]').click(); await q('.oobe-next').click();
await page.waitForFunction(() => !document.getElementById('oobe'), null, { timeout: 8000 });
console.log('oobe done:', await ev(() => [Settings.get('userName'), Settings.get('avatar'), Settings.get('wallpaper'), Settings.get('clippy'), Achievements.has('oobe'), localStorage.getItem('win11.oobe')]));
await ev(() => Settings.set('clippy', false));
// weather
await page.waitForFunction(() => Weather.snapshot() && !Weather.snapshot().fake, null, { timeout: 8000 });
console.log('taskbar weather:', await ev(() => document.getElementById('tb-weather').textContent), 'ach:', await ev(() => Achievements.has('meteorologist')));
await ev(() => { Apps.install('weather'); Apps.launch('weather'); }); await page.waitForTimeout(400);
console.log('weather app:', await ev(() => document.querySelector('.w-body h1').textContent), '|', await ev(() => document.querySelectorAll('.weather-day').length), 'days');
await q('.w-search').fill('Par'); await page.waitForTimeout(600); await q('.w-result').first().click(); await page.waitForTimeout(400);
console.log('city set:', await ev(() => Weather.loc().name));
await q('.w-unit').click(); await page.waitForTimeout(300); console.log('unit:', await ev(() => Weather.unit()), await q('.w-unit').textContent());
await ev(() => Settings.set('weatherUnit', 'F'));
await page.click('#taskbar-widgets'); console.log('widget weather title:', await ev(() => document.querySelector('.wg-card .wg-title').textContent)); await page.mouse.click(1000, 100);
// chess: engine self-play sanity + UI
const chk = await ev(() => { let s = ChessEngine.initial(); let n = 0; while (ChessEngine.status(s) === 'play' || ChessEngine.status(s) === 'check') { const m = ChessEngine.bestMove(s, 1); if (!m) break; s = ChessEngine.make(s, m); if (++n > 120) break; } return [n, ChessEngine.status(s), ChessEngine.legal(ChessEngine.initial()).length]; });
console.log('chess selfplay moves/status/initial-legal:', chk);
const t0 = Date.now(); const d3 = await ev(() => { const s = ChessEngine.initial(); return !!ChessEngine.bestMove(s, 3); }); console.log('depth3 ok:', d3, 'in', Date.now() - t0, 'ms');
await ev(() => { Apps.install('chess'); WM.all().forEach(w => w.close()); Apps.launch('chess'); }); await page.waitForTimeout(300);
await q('.sq[data-i="52"]').click(); console.log('legal dots for e2:', await q('.sq.dot').count());
await q('.sq[data-i="36"]').click(); await page.waitForTimeout(600);
console.log('after e4, moves:', await ev(() => document.querySelectorAll('.chess-moves div').length), 'status:', await q('.ch-status').textContent(), 'ach:', await ev(() => Achievements.has('chess-first')));
await q('.ch-undo').click(); console.log('undo ->', await ev(() => document.querySelectorAll('.chess-moves div').length));
// castling & en passant & promotion legality spot checks
console.log('special moves:', await ev(() => {
  let s = ChessEngine.initial();
  const mv = (from, to) => { const m = ChessEngine.legal(s).find(x => x.from === from && x.to === to && (!x.promo || x.promo === 'Q')); if (!m) throw new Error('illegal ' + from + '-' + to); s = ChessEngine.make(s, m); };
  mv(52, 36); mv(12, 28); mv(62, 45); mv(1, 18); mv(61, 34); mv(6, 21);
  const castle = ChessEngine.legal(s).find(x => x.castle === 'K');
  mv(60, 62);
  const rookMoved = s.b[61] === 'R' && !s.b[63];
  // en passant: set up manually
  let e = ChessEngine.initial(); const mv2 = (f, t) => { const m = ChessEngine.legal(e).find(x => x.from === f && x.to === t); if (!m) throw new Error('illegal2 ' + f + '-' + t); e = ChessEngine.make(e, m); };
  mv2(52, 36); mv2(8, 16); mv2(36, 28); mv2(11, 19 + 8 - 8 === 19 ? 19 : 19); // d7-d6? use d7-d5 instead
  e = ChessEngine.initial(); mv2(52, 36); mv2(8, 16); mv2(36, 28); mv2(11, 27);
  const ep = ChessEngine.legal(e).find(x => x.ep);
  return { castle: !!castle, rookMoved, enPassant: !!ep && ep.to === 19 };
}));
// wifi / bt panels + airplane
await page.click('#tray-icons'); await page.waitForTimeout(100);
await q('#action-center .ac-tile').first().locator('.ac-chev').click(); console.log('wifi panel rows:', await q('.acp-row').count());
await q('[data-connect="2"]').click(); await page.waitForTimeout(100); console.log('connected to:', await ev(() => Connectivity.NETS[0][0]), 'tray:', await ev(() => document.querySelector('#tray-icons span').textContent));
await q('.acp-back').click({ force: true });
await q('#action-center .ac-tile').nth(2).click({ force: true }); console.log('airplane tray:', await ev(() => document.querySelector('#tray-icons span').textContent)); await q('#action-center .ac-tile').nth(2).click({ force: true });
await page.mouse.click(600, 300);
// clipboard history
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('notepad'); }); await page.waitForTimeout(200);
await q('.notepad-area').fill('copy me please'); await q('.notepad-area').press('Control+a'); await q('.notepad-area').press('Control+c');
await q('.notepad-area').press('End'); await page.keyboard.type(' ');
await page.keyboard.press('Meta+v'); await page.waitForTimeout(100);
console.log('clip panel items:', await q('.clip-item').count());
await q('.clip-item').first().click(); console.log('pasted:', JSON.stringify(await ev(() => document.querySelector('.notepad-area').value)), 'ach:', await ev(() => Achievements.has('clipboard')));
// terminal network fakes
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('terminal'); }); await page.waitForTimeout(200);
for (const c of ['ping example.com', 'ipconfig', 'weather', 'netstat']) { await page.keyboard.type(c); await page.keyboard.press('Enter'); await page.waitForTimeout(100); }
await page.waitForTimeout(3200);
const term = await ev(() => document.querySelector('.term-root').innerText);
console.log('ping replies:', (term.match(/Reply from/g) || []).length, 'ipconfig:', term.includes('IPv4 Address'), 'weather cmd:', term.includes('Redmond') || term.includes('Paris'));
// xbox hi-scores + copilot mic button presence
await ev(() => { HiScore.submit('tetris', 1234); Apps.launch('xbox'); }); console.log('xbox hiscores:', await q('.ach-hs-row').count());
await ev(() => Apps.launch('copilot')); console.log('copilot mic:', await q('.cop-mic').count());
await q('.cop-input input').fill('what is the weather'); await page.keyboard.press('Enter'); await page.waitForTimeout(1200);
console.log('copilot weather:', await ev(() => [...document.querySelectorAll('.cop-msg.bot')].pop().textContent.slice(0, 60)));
await ev(() => { WM.all().forEach(w => w.close()); Apps.launch('chess'); Apps.launch('weather'); }); await page.waitForTimeout(500);
await page.screenshot({ path: (process.env.OUT || '/tmp') + '/batch5.png' });
console.log('ERRORS:', errors.length ? errors : 'none');
await b.close();
