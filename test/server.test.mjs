import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';

test('local prototype accepts reviewed text and rejects invalid requests', async t => {
  const reservation = createServer();
  reservation.listen(0, '127.0.0.1');
  await once(reservation, 'listening');
  const { port } = reservation.address();
  await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));

  const child = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  t.after(() => child.kill());
  const [output] = await Promise.race([
    once(child.stdout, 'data'),
    once(child, 'exit').then(() => { throw new Error('Server exited before startup'); }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Server startup timed out')), 5000).unref())
  ]);
  assert.match(output.toString(), /Tutor demo running/);
  const origin = `http://127.0.0.1:${port}`;
  const headers = { origin, 'content-type': 'application/json' };
  const request = body => fetch(`${origin}/api/coach`, { method: 'POST', headers, body });

  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  const valid = await request(JSON.stringify({ problem: '27 + 18', transcript: 'I guessed 35' }));
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).kind, 'needs_clarification');
  for (const body of [
    '{', JSON.stringify({ problem: '42 - 17', transcript: 'hello' }),
    JSON.stringify({ problem: '27 + 18', transcript: 45 }),
    JSON.stringify({ problem: '27 + 18', transcript: 'hello', extra: true })
  ]) {
    assert.equal((await request(body)).status, 400);
  }
  assert.equal((await request('x'.repeat(2 * 1024 * 1024 + 1))).status, 413);
  assert.equal((await fetch(`${origin}/api/coach`, {
    method: 'POST',
    headers: { ...headers, origin: 'http://example.com' },
    body: '{}'
  })).status, 403);
  assert.equal((await fetch(`${origin}/api/coach`, {
    method: 'POST', headers: { origin, 'content-type': 'text/plain' }, body: '{}'
  })).status, 415);
  assert.equal((await fetch(`${origin}/server.mjs`)).status, 404);
});
