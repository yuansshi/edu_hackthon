import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const routes = new Map([
  ['/', ['./demo/index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['./demo/app.js', 'text/javascript; charset=utf-8']],
  ['/scenario.mjs', ['./demo/scenario.mjs', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['./demo/styles.css', 'text/css; charset=utf-8']],
  ['/src/learning.mjs', ['../src/learning.mjs', 'text/javascript; charset=utf-8']],
  ['/lesson.json', ['../content/demo-lesson.json', 'application/json; charset=utf-8']],
  ['/fixtures.json', ['../test/fixtures/regrouping-cases.json', 'application/json; charset=utf-8']]
]);

export function createDemoServer() {
  return createServer(async (request, response) => {
    const path = new URL(request.url, 'http://127.0.0.1').pathname;
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, {Allow: 'GET, HEAD'}).end();
      return;
    }
    const route = routes.get(path);
    if (!route) {
      response.writeHead(404, {'Content-Type': 'text/plain; charset=utf-8'}).end('Not found');
      return;
    }
    try {
      const body = await readFile(new URL(route[0], import.meta.url));
      response.writeHead(200, {
        'Content-Type': route[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(500, {'Content-Type': 'text/plain; charset=utf-8'}).end('Demo file unavailable');
    }
  });
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const server = createDemoServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? 'Port 3100 is busy. Stop the other demo server and try again.' : 'The demo server could not start.');
    process.exitCode = 1;
  });
  server.listen(3100, '127.0.0.1', () => console.log('Smart Pants demo: http://127.0.0.1:3100'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}
