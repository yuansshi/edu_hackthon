import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {loadConfig, LIMITS} from '../src/config.mjs';
import {createSessionState} from '../src/session-state.mjs';
import {createLiveAdapter, createSpeechAdapter} from '../src/assessment-adapter.mjs';
import {profiles} from './demo/scenario.mjs';

const routes = new Map([
  ['/', ['./demo/index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['./demo/app.js', 'text/javascript; charset=utf-8']],
  ['/scenario.mjs', ['./demo/scenario.mjs', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['./demo/styles.css', 'text/css; charset=utf-8']],
  ['/src/learning.mjs', ['../src/learning.mjs', 'text/javascript; charset=utf-8']]
]);
const ERRORS = {
  INVALID_REQUEST: [400, 'Check the submitted fields.'],
  RESOURCE_MISMATCH: [400, 'The submitted work does not match this request.'],
  INVALID_AUDIO: [400, 'The recording file is empty or invalid.'],
  ORIGIN_REJECTED: [403, 'Open the app from its local address.'],
  RESOURCE_NOT_FOUND: [404, 'This item is not available in the current session.'],
  CONTEXT_CHANGED: [409, 'The demo session changed. Refresh to continue.'],
  REVISION_CONFLICT: [409, 'This work changed. Refresh before continuing.'],
  IDEMPOTENCY_CONFLICT: [409, 'This request identity was already used for different content.'],
  RESOURCE_CONFLICT: [409, 'This work identity was already submitted.'],
  INVALID_TRANSITION: [409, 'Complete the current step before this action.'],
  ACTION_NOT_ALLOWED: [409, 'Choose an action offered for the current work.'],
  REQUEST_TOO_LARGE: [413, 'This submission is too large.'],
  UNSUPPORTED_MEDIA: [415, 'Use a supported recording or JSON format.'],
  PROCESSING_BUSY: [429, 'Two explanations are processing. Try again shortly.'],
  SESSION_CAPACITY: [429, 'This demo is full. Reset or restart to add work.'],
  INTERPRETATION_INVALID: [502, 'The returned interpretation could not be verified. Try new work or use writing.'],
  INTERPRETATION_UNAVAILABLE: [502, 'The explanation could not be processed. Try new work or use writing.'],
  INTERPRETATION_TIMEOUT: [504, 'Processing took too long. Try new work or use writing.'],
  INTERNAL_ERROR: [500, 'The app could not complete this action.']
};
const providerCode = error => error?.name === 'InterpretationError'
  ? {invalid: 'INTERPRETATION_INVALID', timeout: 'INTERPRETATION_TIMEOUT', unavailable: 'INTERPRETATION_UNAVAILABLE',
    cancelled: 'INTERPRETATION_UNAVAILABLE'}[error.code] ?? 'INTERPRETATION_UNAVAILABLE'
  : 'INTERPRETATION_UNAVAILABLE';

function fail(code) { const error = new Error(code); error.code = code; throw error; }

function closed(body, expected) {
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).sort().join(',') !== [...expected].sort().join(',')) fail('INVALID_REQUEST');
}

async function readBody(request, limit) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > limit) fail('REQUEST_TOO_LARGE');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, bytes);
}

export function createDemoServer({config, lesson, adapter, speechAdapter}) {
  const jobs = new Map();
  const speechJobs = new Set();
  const capacity = () => { if (jobs.size + speechJobs.size >= 2) fail('PROCESSING_BUSY'); };
  const core = createSessionState({config, lesson, beforeJobStart: capacity});
  let shuttingDown = false;
  const origin = `http://127.0.0.1:${config.port}`;
  const baseHeaders = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'};
  const json = (response, status, body) => {
    response.writeHead(status, {...baseHeaders, 'Content-Type': 'application/json; charset=utf-8'});
    response.end(JSON.stringify(body));
  };
  const checkContext = body => {
    const context = core.context();
    if (body.runId !== context.runId || body.sessionId !== context.sessionId) fail('CONTEXT_CHANGED');
  };
  const query = (url, names) => {
    if (url.searchParams.size !== names.length || names.some(name => !url.searchParams.has(name))) fail('INVALID_REQUEST');
    const body = Object.fromEntries(url.searchParams);
    checkContext(body);
    return body;
  };
  const reply = (who, type, id) => {
    if (!/^[A-F]$/.test(who)) fail('INVALID_REQUEST');
    const snapshot = core.student(who);
    if (type === 'judgment') return core.feedback(who, id) || 'You can show me more of your thinking or ask for a little help.';
    if (type === 'action') {
      const action = snapshot.actions.find(item => item.eventId === id);
      if (!action) fail('RESOURCE_NOT_FOUND');
      return action.visual ? action.visual.steps.map(step => step.split('\n')[0]).join(' ') : action.prompt;
    }
    if (type === 'greeting') {
      const profile = profiles.find(item => who === (item.id === 'maya' ? 'A' : 'B'));
      const assignment = snapshot.assignments.find(item => item.assignmentId === id);
      if (!profile || !assignment) fail('RESOURCE_MISMATCH');
      return `${profile.invitation} ${assignment.problem.prompt}`;
    }
    fail('INVALID_REQUEST');
  };
  function startJob(receipt, kind) {
    const jobId = receipt.result.jobId;
    if (receipt.replayed || !jobId || jobs.has(jobId)) return;
    const input = core.jobInput(jobId);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), LIMITS.providerTimeoutMs);
    const signal = AbortSignal.any([input.signal, controller.signal]);
    jobs.set(jobId, controller);
    let cancellationFailed = false;
    const cancel = () => {
      void adapter.cancel({jobId, reason: signal.reason === 'timeout' ? 'timeout' :
        ['reset', 'shutdown', 'correction', 'superseded', 'cancelled'].includes(signal.reason) ? signal.reason : 'cancelled'})
        .catch(() => { cancellationFailed = true; console.error('Provider cancellation failed.'); });
    };
    signal.addEventListener('abort', cancel, {once: true});
    const task = Promise.resolve().then(() => adapter[kind]({...input, signal}));
    let rejectOnAbort;
    const cancelled = new Promise((_, reject) => {
      if (signal.aborted) { const error = new Error('cancelled'); error.code = signal.reason; reject(error); }
      else {
        rejectOnAbort = () => { const error = new Error('cancelled'); error.code = signal.reason; reject(error); };
        signal.addEventListener('abort', rejectOnAbort, {once: true});
      }
    });
    void Promise.race([task, cancelled]).then(result => {
      if (signal.aborted || shuttingDown) return;
      if (kind === 'transcribe') core.settleTranscription(jobId, result.text);
      else core.settleAssessment(jobId, result);
    }).catch(error => {
      if (shuttingDown || (signal.aborted && signal.reason !== 'timeout')) return;
      core.failJob(jobId, signal.reason === 'timeout' ? 'INTERPRETATION_TIMEOUT' : providerCode(error));
    }).finally(() => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      if (rejectOnAbort) signal.removeEventListener('abort', rejectOnAbort);
      jobs.delete(jobId);
      if (cancellationFailed) console.error('The cancelled provider job requires operator attention.');
    });
  }

  const server = createServer(async (request, response) => {
    try {
      if (request.headers.host !== origin.slice(7)) fail('ORIGIN_REJECTED');
      const url = new URL(request.url, origin);
      if (!url.pathname.startsWith('/api/')) {
        const route = routes.get(url.pathname);
        if (!route) { response.writeHead(404, baseHeaders).end('Not found'); return; }
        if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, {...baseHeaders, Allow: 'GET, HEAD'}).end(); return; }
        const bytes = await readFile(new URL(route[0], import.meta.url));
        response.writeHead(200, {...baseHeaders, 'Content-Type': route[1],
          'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"});
        response.end(request.method === 'HEAD' ? undefined : bytes);
        return;
      }
      if (request.method === 'GET') {
        if (url.pathname === '/api/context') {
          if (url.search) fail('INVALID_REQUEST');
          json(response, 200, core.context()); return;
        }
        if (url.pathname === '/api/student') {
          const body = query(url, ['runId', 'sessionId', 'learnerId']);
          json(response, 200, core.student(body.learnerId)); return;
        }
        if (url.pathname === '/api/teacher') {
          query(url, ['runId', 'sessionId']);
          json(response, 200, core.teacher()); return;
        }
        const match = /^\/api\/replies\/([0-9a-f-]+)$/.exec(url.pathname);
        if (match) {
          const body = query(url, ['runId', 'sessionId', 'learnerId']);
          json(response, 200, {text: reply(body.learnerId, 'judgment', match[1])}); return;
        }
        fail('RESOURCE_NOT_FOUND');
      }
      if (request.method !== 'POST') { response.writeHead(405, {...baseHeaders, Allow: 'GET, POST'}).end(); return; }
      if (request.headers.origin !== origin) fail('ORIGIN_REJECTED');
      const audioMatch = /^\/api\/attempts\/([0-9a-f-]+)\/audio$/.exec(url.pathname);
      if (audioMatch) {
        if (url.searchParams.size !== 1 || !url.searchParams.has('turnId')) fail('INVALID_REQUEST');
        const headers = {
          runId: 'x-run-id', sessionId: 'x-session-id', idempotencyKey: 'x-idempotency-key', learnerId: 'x-learner-id',
          assignmentId: 'x-assignment-id', expectedAssignmentRevision: 'x-expected-assignment-revision',
          expectedEvidenceVersion: 'x-expected-evidence-version', expectedTargetCorrectionRevision: 'x-expected-target-correction-revision'
        };
        const body = {};
        for (const [key, name] of Object.entries(headers)) {
          const value = request.headers[name];
          if (typeof value !== 'string') fail('INVALID_REQUEST');
          if (key.startsWith('expected')) {
            if (!/^(0|[1-9]\d*)$/.test(value) || !Number.isSafeInteger(Number(value))) fail('INVALID_REQUEST');
            body[key] = Number(value);
          } else body[key] = value;
        }
        const audio = {bytes: await readBody(request, LIMITS.audioBytes), mimeType: request.headers['content-type']};
        const receipt = core.startTranscription(audioMatch[1], url.searchParams.get('turnId'), body, audio);
        json(response, 202, receipt);
        startJob(receipt, 'transcribe'); return;
      }
      if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] ?? '')) fail('UNSUPPORTED_MEDIA');
      let body;
      try { body = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(await readBody(request, LIMITS.jsonBytes))); }
      catch (error) { if (error.code === 'REQUEST_TOO_LARGE') throw error; fail('INVALID_REQUEST'); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) fail('INVALID_REQUEST');
      if (url.search) fail('INVALID_REQUEST');
      if (url.pathname === '/api/attempts') {
        if (body.imagePngBase64 !== null) fail('INVALID_REQUEST');
        json(response, 201, core.submit(body)); return;
      }
      const attemptMatch = /^\/api\/attempts\/([0-9a-f-]+)\/(assessment|clarifications|cancel)$/.exec(url.pathname);
      if (attemptMatch) {
        if (attemptMatch[2] === 'assessment') {
          const receipt = core.startAssessment(attemptMatch[1], body);
          json(response, 202, receipt);
          startJob(receipt, 'assess'); return;
        }
        json(response, attemptMatch[2] === 'clarifications' ? 201 : 200,
          attemptMatch[2] === 'clarifications' ? core.clarify(attemptMatch[1], body) : core.cancel(attemptMatch[1], body));
        return;
      }
      const nextMatch = /^\/api\/learners\/([A-F])\/next$/.exec(url.pathname);
      if (nextMatch) {
        if (body.learnerId !== nextMatch[1]) fail('RESOURCE_MISMATCH');
        json(response, 200, core.next(body)); return;
      }
      if (url.pathname === '/api/reset') {
        const receipt = core.reset(body);
        for (const controller of speechJobs) controller.abort('reset');
        json(response, 200, receipt); return;
      }
      if (url.pathname === '/api/speech') {
        closed(body, ['runId', 'sessionId', 'learnerId', 'type', 'id']);
        checkContext(body);
        if (!speechAdapter) fail('INTERPRETATION_UNAVAILABLE');
        const text = reply(body.learnerId, body.type, body.id);
        capacity();
        const controller = new AbortController();
        speechJobs.add(controller);
        const timer = setTimeout(() => controller.abort('timeout'), LIMITS.providerTimeoutMs);
        const disconnected = () => { if (!response.writableEnded) controller.abort('cancelled'); };
        response.once('close', disconnected);
        try {
          const audio = await speechAdapter.speak({text, signal: controller.signal});
          checkContext(body);
          if (!(audio?.bytes instanceof Uint8Array) || !audio.bytes.length ||
              audio.bytes.length > LIMITS.audioBytes || audio.mimeType !== 'audio/mpeg') fail('INTERPRETATION_INVALID');
          response.writeHead(200, {...baseHeaders, 'Content-Type': audio.mimeType, 'Content-Length': audio.bytes.length});
          response.end(audio.bytes);
        } catch (error) {
          if (controller.signal.aborted && controller.signal.reason === 'cancelled') return;
          if (error.code === 'CONTEXT_CHANGED') throw error;
          fail(providerCode(error));
        } finally {
          clearTimeout(timer);
          response.off('close', disconnected);
          speechJobs.delete(controller);
        }
        return;
      }
      fail('RESOURCE_NOT_FOUND');
    } catch (error) {
      if (response.headersSent || response.destroyed) return;
      const code = Object.hasOwn(ERRORS, error.code) ? error.code : 'INTERNAL_ERROR';
      if (code === 'INTERNAL_ERROR') console.error('The preview could not complete an operation.');
      const [status, message] = ERRORS[code];
      json(response, status, {error: {code, message, retryable: status >= 500 || code === 'PROCESSING_BUSY'}});
    }
  });
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const controller of jobs.values()) controller.abort('shutdown');
    for (const controller of speechJobs) controller.abort('shutdown');
    core.close();
  };
  server.on('close', shutdown);
  const close = server.close.bind(server);
  // Cancel work before HTTP shutdown waits for active responses.
  server.close = (...args) => { shutdown(); return close(...args); };
  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const config = loadConfig({env: {...process.env, PORT: '3100'}});
    const lesson = JSON.parse(await readFile(new URL('../content/demo-lesson.json', import.meta.url), 'utf8'));
    const adapter = createLiveAdapter({config});
    const speechAdapter = createSpeechAdapter({config});
    const server = createDemoServer({config, lesson, adapter, speechAdapter});
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE' ? 'Port 3100 is busy.' : 'The preview server could not start.');
      process.exitCode = 1;
    });
    server.listen(3100, '127.0.0.1', () => console.log('Smart Pants chat: http://127.0.0.1:3100 · OpenAI live processing · AI-generated voice'));
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
  } catch {
    console.error('The preview requires a valid project .env credential. No prepared fallback was started.');
    process.exitCode = 1;
  }
}
