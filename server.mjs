import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeMathCoach } from './src/coach.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

async function serveStaticFile(res, filename) {
  const resolved = path.join(publicDir, filename);
  try {
    const fileBuffer = await fs.readFile(resolved);
    const extension = path.extname(resolved).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(fileBuffer);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.headers.host !== `127.0.0.1:${port}`) {
      sendJson(res, 403, { error: 'Invalid host' });
      return;
    }
    const requestUrl = new URL(req.url, 'http://127.0.0.1');
    const pathname = requestUrl.pathname;

    if (req.method === 'POST' && pathname === '/api/coach') {
      if (req.headers.origin !== `http://127.0.0.1:${port}`) {
        sendJson(res, 403, { error: 'Invalid origin' });
        return;
      }
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
        sendJson(res, 415, { error: 'Expected JSON' });
        return;
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 2 * 1024 * 1024) {
          sendJson(res, 413, { error: 'Request too large' });
          return;
        }
        chunks.push(chunk);
      }
      let parsed;
      try {
        parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
            Object.keys(parsed).sort().join(',') !== 'problem,transcript') {
          throw new TypeError('Invalid request');
        }
        const result = analyzeMathCoach(parsed.problem, parsed.transcript);
        sendJson(res, 200, result);
      } catch (error) {
        if (!(error instanceof SyntaxError) && !(error instanceof TypeError)) throw error;
        sendJson(res, 400, { error: 'Invalid coaching request' });
      }
      return;
    }

    const assets = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/styles.css': 'styles.css' };
    if (req.method === 'GET' && Object.hasOwn(assets, pathname)) {
      await serveStaticFile(res, assets[pathname]);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch {
    if (!res.headersSent) sendJson(res, 500, { error: 'Server error' });
    else res.destroy();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Tutor demo running at http://127.0.0.1:${port}`);
});

export { server };
