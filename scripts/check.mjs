import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';

const modules = [
  'src/config.mjs',
  'src/png.mjs',
  'src/learning.mjs',
  'src/session-state.mjs',
  'src/assessment-adapter.mjs',
  'scripts/check.mjs',
  'scripts/live-probe.mjs',
  'test/png.test.mjs',
  'test/learning.test.mjs',
  'test/assessment-adapter.test.mjs',
  'server.mjs',
  'src/coach.mjs',
  'public/app.js',
  'test/coach.test.mjs',
  'test/server.test.mjs',
  'presentation/demo-server.mjs',
  'presentation/demo/app.js',
  'presentation/demo/scenario.mjs',
  'test/preview-fixture.mjs',
  'test/preview.test.mjs',
  'test/preview-browser.mjs',
  'test/preview-browser.test.mjs'
];

if (Number(process.versions.node.split('.')[0]) !== 24) {
  console.error('Application checks require Node.js 24.');
  process.exit(1);
}
for (const filename of modules) {
  accessSync(new URL(`../${filename}`, import.meta.url), constants.R_OK);
  const result = spawnSync(process.execPath, ['--check', filename], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(`Syntax checks passed for ${modules.length} modules.`);
