// Runs every suite in ./suites against a static server and fails if any suite reports errors.
// Usage: node tests/run.mjs [suite-substring]   (env: BASE=http://host:port to use an existing server)
import { spawn, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const filter = process.argv[2] || '';
let server = null;
if (!process.env.BASE) {
  server = spawn('python3', ['-m', 'http.server', '8123', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 1200));
}
const suites = readdirSync(path.join(here, 'suites')).filter(f => f.endsWith('.mjs') && f.includes(filter)).sort();
let failed = 0;
for (const s of suites) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(here, 'suites', s)], { cwd: here, encoding: 'utf8', env: Object.assign({}, process.env, { OUT: process.env.OUT || '/tmp' }), timeout: 600000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0 && /ERRORS: none/.test(out);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${s.padEnd(16)} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (!ok || process.env.VERBOSE) console.log(out.split('\n').map(l => '    ' + l).join('\n'));
}
if (server) server.kill();
console.log(`\n${suites.length - failed}/${suites.length} suites passed`);
process.exit(failed ? 1 : 0);
