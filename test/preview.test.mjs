import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {previewFixture, previewRequests} from './preview-fixture.mjs';

async function harness(t) {
  const port = 31991;
  const fixture = previewFixture(port);
  t.after(() => fixture.server.emit('close'));
  const origin = `http://127.0.0.1:${port}`;
  const virtualFetch = previewRequests(fixture.server);
  const get = async path => {
    const response = await virtualFetch(origin + path);
    assert.equal(response.status, 200);
    return response.json();
  };
  let context = await get('/api/context');
  const snapshot = () => get(`/api/student?${new URLSearchParams({runId: context.runId, sessionId: context.sessionId, learnerId: 'A'})}`);
  const envelope = () => ({runId: context.runId, sessionId: context.sessionId, idempotencyKey: randomUUID()});
  const post = (path, body) => virtualFetch(origin + path, {
    method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify(body)
  });
  const submit = async (text = 'My answer is 35.', mode = 'written') => {
    const current = await snapshot();
    const response = await post('/api/attempts', {
      ...envelope(), learnerId: 'A', assignmentId: current.assignment.assignmentId, attemptId: randomUUID(),
      expectedAssignmentRevision: current.assignment.revision, expectedTargetCorrectionRevision: 0,
      imagePngBase64: null, strokes: [], writtenWorking: '27 + 18 = ?', explanationMode: mode, initialText: mode === 'written' ? text : null
    });
    assert.equal(response.status, 201);
    return (await response.json()).result;
  };
  const ae = async () => {
    const current = await snapshot();
    const attempt = current.attempts.find(item => item.attemptId === current.assignment.activeAttemptId);
    return {...envelope(), learnerId: 'A', assignmentId: current.assignment.assignmentId,
      expectedAssignmentRevision: current.assignment.revision, expectedTargetCorrectionRevision: 0,
      expectedEvidenceVersion: attempt.evidenceVersion};
  };
  const wait = async () => {
    for (let count = 0; count < 100; count++) {
      const current = await snapshot();
      const attempt = current.attempts.at(-1);
      if (!attempt.job) return current;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('Preview job did not settle.');
  };
  const assess = async (submitted, text) => {
    const current = await snapshot();
    const response = await post(`/api/attempts/${submitted.attemptId}/assessment`, {
      ...await ae(), confirmedTurns: current.attempts.at(-1).turns.map(turn => ({turnId: turn.turnId, text: text ?? turn.confirmedText ?? turn.recognizedText}))
    });
    assert.equal(response.status, 202);
    return wait();
  };
  return {...fixture, origin, fetch: virtualFetch, get, post, snapshot, envelope, submit, ae, wait, assess, context};
}

test('the preview handler accepts an initial answer and returns the actual server-owned clarification', async t => {
  const h = await harness(t);
  const submitted = await h.submit();
  const current = await h.assess(submitted);
  assert.equal(current.attempts[0].state, 'needs_clarification');
  assert.equal(current.targets[0].finding.active, false);
  const query = new URLSearchParams({runId: h.context.runId, sessionId: h.context.sessionId, learnerId: 'A'});
  const reply = await h.get(`/api/replies/${current.judgments[0].judgmentId}?${query}`);
  assert.match(reply.text, /Show what each number/);
  assert.equal(h.calls.assess.length, 1);
  const speech = await h.post('/api/speech', {
    runId: h.context.runId, sessionId: h.context.sessionId, learnerId: 'A', type: 'judgment', id: current.judgments[0].judgmentId
  });
  assert.equal(speech.status, 200);
  assert.equal(speech.headers.get('content-type'), 'audio/mpeg');
  assert.equal(speech.headers.get('cache-control'), 'no-store');
  assert.equal(h.calls.speech[0], reply.text);
});

test('voice uploads are transcribed but cannot be assessed before explicit transcript review', async t => {
  const h = await harness(t);
  const submitted = await h.submit(null, 'spoken');
  const ae = await h.ae();
  const headers = {Origin: h.origin, 'Content-Type': 'audio/webm;codecs=opus'};
  const mapping = {runId: 'X-Run-Id', sessionId: 'X-Session-Id', idempotencyKey: 'X-Idempotency-Key',
    learnerId: 'X-Learner-Id', assignmentId: 'X-Assignment-Id', expectedAssignmentRevision: 'X-Expected-Assignment-Revision',
    expectedEvidenceVersion: 'X-Expected-Evidence-Version', expectedTargetCorrectionRevision: 'X-Expected-Target-Correction-Revision'};
  for (const [key, name] of Object.entries(mapping)) headers[name] = String(ae[key]);
  const uploaded = await h.fetch(`${h.origin}/api/attempts/${submitted.attemptId}/audio?turnId=${submitted.turnId}`,
    {method: 'POST', headers, body: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0])});
  assert.equal(uploaded.status, 202);
  const transcribed = await h.wait();
  assert.equal(transcribed.attempts[0].state, 'awaiting_transcript_review');
  assert.equal(h.calls.transcribe.length, 1);
  assert.equal(h.calls.assess.length, 0);
  assert.equal(transcribed.judgments.length, 0);
  const accepted = await h.assess(submitted, transcribed.attempts[0].turns[0].recognizedText);
  assert.equal(accepted.targets[0].finding.active, true);
  assert.equal(h.calls.assess.length, 1);
  assert.ok(!JSON.stringify(await h.get(`/api/teacher?runId=${h.context.runId}&sessionId=${h.context.sessionId}`)).includes('audio/webm'));
});

test('speech requires a known server message and rejects arbitrary text and cross-origin requests', async t => {
  const h = await harness(t);
  const body = {runId: h.context.runId, sessionId: h.context.sessionId, learnerId: 'A', type: 'greeting', id: (await h.snapshot()).assignment.assignmentId};
  assert.equal((await h.post('/api/speech', {...body, text: 'Untrusted replacement'})).status, 400);
  assert.equal((await h.post('/api/speech', {...body, id: 'leo'})).status, 400);
  assert.equal((await h.post('/api/speech', {...body, type: 'judgment', id: randomUUID()})).status, 404);
  const rejected = await h.fetch(`${h.origin}/api/speech`, {method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: 'http://example.com'}, body: JSON.stringify(body)});
  assert.equal(rejected.status, 403);
  assert.equal(h.calls.speech.length, 0);
  assert.equal((await h.post('/api/attempts', null)).status, 400);
});

test('provider failures stay visible, create no finding, and never become prepared successes', async t => {
  const h = await harness(t);
  h.controls.failAssess = true;
  const current = await h.assess(await h.submit());
  assert.equal(current.attempts[0].state, 'failed');
  assert.equal(current.attempts[0].error.code, 'INTERPRETATION_UNAVAILABLE');
  assert.equal(current.judgments.length, 0);
  assert.equal(current.targets[0].finding.active, false);
  h.controls.failSpeech = true;
  const response = await h.post('/api/speech', {
    runId: h.context.runId, sessionId: h.context.sessionId, learnerId: 'A', type: 'greeting', id: current.assignment.assignmentId
  });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error.code, 'INTERPRETATION_UNAVAILABLE');
});

test('reset rejects old chat/speech identities and releases current-run evidence', async t => {
  const h = await harness(t);
  await h.assess(await h.submit());
  const old = h.context;
  const current = await h.get('/api/context');
  const reset = await h.post('/api/reset', {...h.envelope(), expectedSessionRevision: current.revision});
  assert.equal(reset.status, 200);
  const replacement = (await reset.json()).result.context;
  assert.notEqual(replacement.sessionId, old.sessionId);
  assert.equal((await h.post('/api/speech', {
    runId: old.runId, sessionId: old.sessionId, learnerId: 'A', type: 'greeting', id: 'maya'
  })).status, 409);
});

test('closing the preview cancels pending work before waiting for HTTP shutdown', async t => {
  const h = await harness(t);
  h.controls.holdAssess = true;
  const submitted = await h.submit();
  const response = await h.post(`/api/attempts/${submitted.attemptId}/assessment`, {
    ...await h.ae(), confirmedTurns: [{turnId: submitted.turnId, text: 'My answer is 35.'}]
  });
  assert.equal(response.status, 202);
  h.server.close(() => {});
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.calls.cancel, ['shutdown']);
  h.controls.releaseAssess();
  await new Promise(resolve => setImmediate(resolve));
});
