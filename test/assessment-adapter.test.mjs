import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getEventListeners } from 'node:events';
import { createLiveAdapter, InterpretationError } from '../src/assessment-adapter.mjs';
import { criteriaFor, validateLesson, classifyCandidate } from '../src/learning.mjs';
import { createSessionState } from '../src/session-state.mjs';
import { loadConfig } from '../src/config.mjs';

const lesson = validateLesson(JSON.parse(readFileSync(new URL('../content/demo-lesson.json', import.meta.url), 'utf8')));
const catalog = JSON.parse(readFileSync(new URL('./fixtures/regrouping-cases.json', import.meta.url), 'utf8'));
const config = {
  host: '127.0.0.1', port: 3000, assessmentMode: 'live',
  openaiApiKey: 'project-test-key-not-a-real-credential',
  transcribeModel: 'gpt-transcribe', reasoningModel: 'gpt-5.6-terra'
};
const CAP = 262_144;
const tick = () => new Promise(resolve => setImmediate(resolve));

function inputs(caseId = 'audio-add-supported', signal = new AbortController().signal) {
  const fixture = catalog.cases.find(item => item.caseId === caseId);
  const target = lesson.targets.find(item => item.practice.problemId === fixture.problemId);
  const attemptId = randomUUID();
  const turnId = randomUUID();
  const job = {
    jobId: randomUUID(), runId: randomUUID(), sessionId: randomUUID(), learnerId: 'A',
    assignmentId: randomUUID(), assignmentRevision: 1, targetId: target.targetId,
    attemptId, workVersion: 1, evidenceVersion: 1, correctionRevision: 0
  };
  const input = {
    job,
    problem: { ...target.practice, targetId: target.targetId, purpose: fixture.purpose, assisted: fixture.assisted },
    work: { image: null, imageSourceId: null, strokes: [], writtenWorking: fixture.writtenWorking,
      writtenSourceId: `${attemptId}:work:1:written` },
    turns: fixture.turns.map(turn => ({ turnId, source: turn.source, text: turn.text })),
    criteria: criteriaFor(target.practice),
    allowedActionIds: lesson.actions.map(action => action.actionId), signal
  };
  const candidate = structuredClone(fixture.candidate);
  for (const source of candidate.sourceEvidence) {
    source.sourceId = source.sourceKind === 'written_work' ? input.work.writtenSourceId : turnId;
  }
  const transcribe = {
    job: { ...job, jobId: randomUUID() }, problem: input.problem, work: input.work,
    turn: { turnId, index: 0, source: 'transcription' },
    audio: { bytes: Buffer.from('RIFF0000WAVE-synthetic'), mimeType: 'audio/wav' }, signal
  };
  return { input, candidate, transcribe };
}

function responseEnvelope(candidate, overrides = {}) {
  return { status: 'completed', output: [
    { type: 'reasoning', summary: [] },
    { type: 'message', role: 'assistant', status: 'completed',
      content: [{ type: 'output_text', text: JSON.stringify(candidate) }] }
  ], ...overrides };
}

function jsonResponse(value, headers = {}) {
  return new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
}

function streamed(bytes, { headers = {}, chunks = [bytes.length], status = 200, leaveOpen = false } = {}) {
  const stats = { reads: 0, cancelled: false };
  let offset = 0;
  const stream = new ReadableStream({
    pull(controller) {
      stats.reads++;
      if (offset >= bytes.length) {
        if (!leaveOpen) controller.close();
        return;
      }
      const length = chunks.shift() ?? bytes.length - offset;
      controller.enqueue(bytes.subarray(offset, offset + length));
      offset += length;
    },
    cancel() { stats.cancelled = true; }
  }, { highWaterMark: 0 });
  return { stats, response: new Response(stream, { status, headers: { 'content-type': 'application/json', ...headers } }) };
}

function padded(value, length) {
  const body = Buffer.from(JSON.stringify(value));
  assert.ok(body.length <= length);
  return Buffer.concat([body, Buffer.alloc(length - body.length, 32)]);
}

function rejectsCode(promise, code) {
  return assert.rejects(promise, error => {
    assert.ok(error instanceof InterpretationError);
    assert.equal(error.name, 'InterpretationError');
    assert.equal(error.code, code);
    assert.equal(error.message, 'Interpretation could not be completed.');
    assert.ok(!Object.hasOwn(error, 'cause'));
    return true;
  });
}

test('transcription sends only completed audio and provider settings, with no problem/answer metadata', async () => {
  const { transcribe } = inputs();
  const original = Buffer.from(transcribe.audio.bytes);
  let form;
  const adapter = createLiveAdapter({ config, transport: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions');
    assert.equal(options.method, 'POST');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.authorization, `Bearer ${config.openaiApiKey}`);
    assert.ok(!Object.hasOwn(options.headers, 'content-type'));
    assert.ok(options.body instanceof FormData);
    form = options.body;
    assert.deepEqual([...form.keys()], ['model', 'response_format', 'file']);
    assert.equal(form.get('model'), config.transcribeModel);
    assert.equal(form.get('response_format'), 'json');
    const file = form.get('file');
    assert.equal(file.name, 'explanation.wav');
    assert.equal(file.type, 'audio/wav');
    assert.deepEqual(Buffer.from(await file.arrayBuffer()), original);
    return jsonResponse({ text: 'My answer is forty-five.' });
  } });
  assert.deepEqual(await adapter.transcribe(transcribe), { text: 'My answer is forty-five.' });
  assert.deepEqual(transcribe.audio.bytes, original);
  assert.equal(form.has('file'), false);
  assert.equal(getEventListeners(transcribe.signal, 'abort').length, 0);
});

test('assessment uses strict structured output, confirmed sources, no answer key and no provider persistence', async () => {
  const { input, candidate } = inputs();
  let request;
  const adapter = createLiveAdapter({ config, transport: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    request = JSON.parse(options.body);
    return jsonResponse(responseEnvelope(candidate));
  } });
  const result = await adapter.assess(input);
  assert.deepEqual(result, candidate);
  assert.equal(request.model, config.reasoningModel);
  assert.equal(request.store, false);
  assert.deepEqual(request.reasoning, { effort: 'low' });
  assert.equal(request.max_output_tokens, 2000);
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
  assert.equal(request.text.format.schema.additionalProperties, false);
  assert.deepEqual(request.text.format.schema.required.sort(), Object.keys(candidate).sort());
  const payload = JSON.parse(request.input[0].content[0].text);
  assert.deepEqual(payload.allowedActionIds, input.allowedActionIds);
  assert.deepEqual(payload.writtenWorking, { sourceId: input.work.writtenSourceId, text: input.work.writtenWorking });
  assert.equal(payload.confirmedTurns[0].sourceId, input.turns[0].turnId);
  for (const forbidden of ['expectedAnswer', 'conservedAfter', 'before', 'caseId', 'teacherCounts', 'canClearFinding', 'masteryEstablished']) {
    assert.ok(!Object.hasOwn(payload, forbidden));
    assert.ok(!Object.hasOwn(payload.rubric, forbidden));
  }
  assert.ok(!Object.hasOwn(request, 'tools'));
  assert.ok(!Object.hasOwn(request, 'background'));
  assert.equal(getEventListeners(input.signal, 'abort').length, 0);
  result.sourceEvidence[0].description = 'Changed outside adapter.';
  assert.notDeepEqual(result, candidate);
});

for (const fixture of catalog.cases) {
  test(`shared source validation accepts the authored candidate ${fixture.caseId}`, async () => {
    const { input, candidate } = inputs(fixture.caseId);
    const adapter = createLiveAdapter({ config, transport: async () => jsonResponse(responseEnvelope(candidate)) });
    const result = await adapter.assess(input);
    assert.deepEqual(result, candidate);
    if (fixture.caseId === 'written-conflict') assert.equal(classifyCandidate(result, input).outcome, 'U');
  });
}

test('images use the current immutable PNG source and neutral readback, not a file upload', async () => {
  const { input, candidate } = inputs();
  const bytes = Buffer.from('synthetic-normalized-png-bytes');
  input.work.image = { bytes, sha256: '0'.repeat(64), width: 1, height: 1 };
  input.work.imageSourceId = `${input.job.attemptId}:work:1`;
  candidate.neutralReadback = 'The marks show four tens and five ones.';
  candidate.sourceEvidence.push({ sourceKind: 'image', sourceId: input.work.imageSourceId,
    quote: null, description: 'Four tens and five ones are visible.' });
  const adapter = createLiveAdapter({ config, transport: async (url, options) => {
    const body = JSON.parse(options.body);
    assert.equal(body.input[0].content[1].type, 'input_image');
    assert.equal(body.input[0].content[1].image_url, `data:image/png;base64,${bytes.toString('base64')}`);
    assert.equal(JSON.parse(body.input[0].content[0].text).imageSourceId, input.work.imageSourceId);
    return jsonResponse(responseEnvelope(candidate));
  } });
  assert.deepEqual(await adapter.assess(input), candidate);
  assert.equal(bytes.toString(), 'synthetic-normalized-png-bytes');
});

for (const operation of ['transcribe', 'assess']) {
  for (const variant of ['exact', 'overflow', 'lying-length', 'multiple-chunks', 'oversized-header']) {
    test(`${operation} applies the 256 KiB cap to its entire decoded envelope (${variant})`, async () => {
      const { input, candidate, transcribe } = inputs();
      const value = operation === 'assess' ? responseEnvelope(candidate) : { text: 'Confirmed words.' };
      const overflow = ['overflow', 'lying-length', 'multiple-chunks'].includes(variant);
      const bytes = padded(value, CAP + (overflow ? 1 : 0));
      const headers = variant === 'lying-length' ? { 'content-length': '1' } :
        variant === 'oversized-header' ? { 'content-length': String(CAP + 1) } : {};
      const { response, stats } = streamed(bytes, {
        headers, chunks: variant === 'multiple-chunks' ? [CAP - 10, 11] : [bytes.length], leaveOpen: variant !== 'exact'
      });
      let fetchSignal;
      const adapter = createLiveAdapter({ config, transport: async (url, options) => {
        fetchSignal = options.signal;
        return response;
      } });
      const call = adapter[operation](operation === 'assess' ? input : transcribe);
      if (variant === 'exact') {
        assert.deepEqual(await call, operation === 'assess' ? candidate : { text: 'Confirmed words.' });
        assert.equal(fetchSignal.aborted, false);
      } else {
        await rejectsCode(call, 'invalid');
        assert.equal(fetchSignal.aborted, true);
        assert.equal(stats.cancelled, true);
        if (variant === 'oversized-header') assert.equal(stats.reads, 0);
      }
    });
  }
}

for (const operation of ['transcribe', 'assess']) {
  test(`${operation} rejects malformed UTF-8/JSON, non-JSON MIME, missing body and unsafe envelopes`, async () => {
    const { input, candidate, transcribe } = inputs();
    const value = operation === 'assess' ? responseEnvelope(candidate) : { text: 'words' };
    const cases = [
      () => new Response(Uint8Array.from([0xff]), { headers: { 'content-type': 'application/json' } }),
      () => new Response('{bad json', { headers: { 'content-type': 'application/json' } }),
      () => new Response(JSON.stringify(value), { headers: { 'content-type': 'text/plain' } }),
      () => new Response(null, { headers: { 'content-type': 'application/json' } }),
      () => jsonResponse(null), () => jsonResponse([]), () => jsonResponse({})
    ];
    for (const response of cases) {
      const adapter = createLiveAdapter({ config, transport: async () => response() });
      await rejectsCode(adapter[operation](operation === 'assess' ? input : transcribe), 'invalid');
    }
  });
}

test('transcription requires nonempty, bounded Unicode text and never invents text', async () => {
  const { transcribe } = inputs();
  for (const text of ['', ' ', null, 45, 'x'.repeat(4001), '\ud800']) {
    const adapter = createLiveAdapter({ config, transport: async () => jsonResponse({ text }) });
    await rejectsCode(adapter.transcribe(transcribe), 'invalid');
  }
  const adapter = createLiveAdapter({ config, transport: async () => jsonResponse({ text: '😀'.repeat(4000) }) });
  assert.equal(Array.from((await adapter.transcribe(transcribe)).text).length, 4000);
});

test('refusal, truncation, duplicate messages and malformed candidate output cannot become observations', async () => {
  const { input, candidate } = inputs();
  const normal = responseEnvelope(candidate);
  const envelopes = [
    { ...normal, status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } },
    { ...normal, output: [] },
    { ...normal, output: [normal.output[1], normal.output[1]] },
    { ...normal, output: [{ ...normal.output[1], status: 'incomplete' }] },
    { ...normal, output: [{ ...normal.output[1], content: [{ type: 'refusal', refusal: 'No' }] }] },
    { ...normal, output: [{ ...normal.output[1], content: [{ type: 'output_text', text: '{' }] }] },
    { ...normal, output: [{ type: 'function_call', name: 'unexpected_tool' }, normal.output[1]] }
  ];
  for (const envelope of envelopes) {
    const adapter = createLiveAdapter({ config, transport: async () => jsonResponse(envelope) });
    await rejectsCode(adapter.assess(input), 'invalid');
  }
});

test('schema, grounding and action violations reject without exposing provider content', async () => {
  const { input, candidate } = inputs('written-supported');
  const mutations = [
    value => { value.masteryEstablished = true; },
    value => { value.category = 'invented-category'; },
    value => { value.teachingMoveId = 'invented-teaching'; },
    value => { value.sourceEvidence[0].sourceId = `${input.job.attemptId}:work:99:written`; },
    value => { value.sourceEvidence[0].quote = 'A paraphrase not in the work.'; },
    value => { value.sourceEvidence[0].sourceKind = 'image'; value.sourceEvidence[0].quote = null; },
    value => { value.exchangeQuantities.after.tens = 9999; },
    value => { value.reasoningSummary = 'x'.repeat(501); }
  ];
  for (const mutate of mutations) {
    const bad = structuredClone(candidate);
    mutate(bad);
    const adapter = createLiveAdapter({ config, transport: async () => jsonResponse(responseEnvelope(bad)) });
    await rejectsCode(adapter.assess(input), 'invalid');
  }
});

for (const operation of ['transcribe', 'assess']) {
  test(`${operation} discards non-2xx bodies and maps transport failures without raw messages or retries`, async () => {
    const { input, candidate, transcribe } = inputs();
    let calls = 0;
    const body = streamed(Buffer.from('raw-provider-secret'), { status: 429, leaveOpen: true });
    const adapter = createLiveAdapter({ config, transport: async () => { calls++; return body.response; } });
    await rejectsCode(adapter[operation](operation === 'assess' ? input : transcribe), 'unavailable');
    assert.equal(calls, 1);
    assert.equal(body.stats.reads, 0);
    assert.equal(body.stats.cancelled, true);
    const unavailable = createLiveAdapter({ config, transport: async () => { throw new Error('raw-provider-secret'); } });
    await rejectsCode(unavailable[operation](operation === 'assess' ? input : transcribe), 'unavailable');
    const recovered = createLiveAdapter({ config, transport: async () =>
      jsonResponse(operation === 'assess' ? responseEnvelope(candidate) : { text: 'words' }) });
    await recovered[operation](operation === 'assess' ? input : transcribe);
  });

  test(`${operation} keeps cancellation active through a stalled response body`, async () => {
    const controller = new AbortController();
    const { input, transcribe } = inputs('audio-add-supported', controller.signal);
    let cancelled = false;
    const response = new Response(new ReadableStream({
      pull: () => new Promise(() => {}),
      cancel() { cancelled = true; }
    }, { highWaterMark: 0 }), { headers: { 'content-type': 'application/json' } });
    const adapter = createLiveAdapter({ config, transport: async () => response });
    const pending = adapter[operation](operation === 'assess' ? input : transcribe);
    const rejection = rejectsCode(pending, 'timeout');
    const timer = setTimeout(() => controller.abort('timeout'), 10);
    try { await rejection; } finally { clearTimeout(timer); }
    assert.equal(cancelled, true);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });
}

test('explicit cancellation is idempotent and late headers are discarded even if transport ignores abort', async () => {
  const { input, candidate } = inputs();
  let resolveResponse;
  const adapter = createLiveAdapter({ config, transport: () => new Promise(resolve => { resolveResponse = resolve; }) });
  const pending = adapter.assess(input);
  const rejection = rejectsCode(pending, 'cancelled');
  await tick();
  await adapter.cancel({ jobId: input.job.jobId, reason: 'reset' });
  await adapter.cancel({ jobId: input.job.jobId, reason: 'reset' });
  await rejection;
  const late = streamed(Buffer.from(JSON.stringify(responseEnvelope(candidate))), { leaveOpen: true });
  resolveResponse(late.response);
  await tick();
  assert.equal(late.stats.cancelled, true);
  assert.equal(late.stats.reads, 0);
  assert.equal(getEventListeners(input.signal, 'abort').length, 0);
  await adapter.cancel({ jobId: randomUUID(), reason: 'shutdown' });
});

test('an already-aborted input never starts a provider call; duplicate active job IDs cannot overwrite cancellation', async () => {
  const controller = new AbortController();
  controller.abort(new DOMException('Deadline reached', 'TimeoutError'));
  const { input } = inputs('audio-add-supported', controller.signal);
  let calls = 0;
  const adapter = createLiveAdapter({ config, transport: () => { calls++; return new Promise(() => {}); } });
  await rejectsCode(adapter.assess(input), 'timeout');
  assert.equal(calls, 0);
  const active = inputs().input;
  const pending = adapter.assess(active);
  const rejection = rejectsCode(pending, 'cancelled');
  await tick();
  await rejectsCode(adapter.assess(active), 'invalid');
  await adapter.cancel({ jobId: active.job.jobId, reason: 'cancelled' });
  await rejection;
  assert.equal(calls, 1);
});

test('invalid input or fixture configuration cannot accidentally start a live request', async () => {
  assert.throws(() => createLiveAdapter({ config: loadConfig({ env: { ASSESSMENT_MODE: 'fixture' } }) }), TypeError);
  const { transcribe } = inputs();
  let calls = 0;
  const adapter = createLiveAdapter({ config, transport: async () => { calls++; return jsonResponse({ text: 'words' }); } });
  for (const audio of [{ bytes: Buffer.alloc(0), mimeType: 'audio/wav' }, { bytes: Buffer.from('x'), mimeType: 'text/plain' }]) {
    await rejectsCode(adapter.transcribe({ ...transcribe, audio }), 'invalid');
  }
  assert.equal(calls, 0);
});

test('the real adapter interface integrates with transcript gates and shared current-run learning validation', async t => {
  const core = createSessionState({ config: loadConfig({ env: { ASSESSMENT_MODE: 'fixture' } }), lesson });
  t.after(() => core.close());
  const fixture = catalog.cases.find(item => item.caseId === 'audio-add-supported');
  const context = core.context();
  const envelope = () => ({ runId: context.runId, sessionId: context.sessionId, idempotencyKey: randomUUID() });
  const assignment = core.student('A').assignment;
  const submitted = core.submit({
    ...envelope(), learnerId: 'A', assignmentId: assignment.assignmentId, attemptId: randomUUID(),
    expectedAssignmentRevision: 0, expectedTargetCorrectionRevision: 0, imagePngBase64: null,
    strokes: [], writtenWorking: fixture.writtenWorking, explanationMode: 'spoken', initialText: null
  });
  const attemptId = submitted.result.attemptId;
  const ae = () => {
    const snapshot = core.student('A');
    const attempt = snapshot.attempts.at(-1);
    return { ...envelope(), learnerId: 'A', assignmentId: snapshot.assignment.assignmentId,
      expectedAssignmentRevision: snapshot.assignment.revision, expectedEvidenceVersion: attempt.evidenceVersion,
      expectedTargetCorrectionRevision: snapshot.targets[0].correctionRevision };
  };
  let calls = 0;
  let assessmentCandidate;
  const adapter = createLiveAdapter({ config, transport: async url => {
    calls++;
    return jsonResponse(url.endsWith('/transcriptions') ? { text: fixture.turns[0].text } : responseEnvelope(assessmentCandidate));
  } });
  const transcription = core.startTranscription(attemptId, submitted.result.turnId, ae(),
    { bytes: Buffer.from('RIFF0000WAVE'), mimeType: 'audio/wav' });
  const recognized = await adapter.transcribe(core.jobInput(transcription.result.jobId));
  core.settleTranscription(transcription.result.jobId, recognized.text);
  assert.equal(calls, 1);
  assert.equal(core.student('A').attempts[0].state, 'awaiting_transcript_review');
  assert.equal(core.teacher().counts[0].assessed, 0);
  const assessment = core.startAssessment(attemptId, {
    ...ae(), confirmedTurns: [{ turnId: submitted.result.turnId, text: recognized.text }]
  });
  assessmentCandidate = structuredClone(fixture.candidate);
  assessmentCandidate.sourceEvidence[0].sourceId = submitted.result.turnId;
  const candidate = await adapter.assess(core.jobInput(assessment.result.jobId));
  core.settleAssessment(assessment.result.jobId, candidate);
  assert.equal(calls, 2);
  assert.equal(core.teacher().counts[0].assessed, 1);
  assert.equal(core.student('A').targets[0].independentStatus, 'not_demonstrated');
  assert.equal(core.student('A').attempts[0].state, 'accepted');
});

test('a stream transport failure stays unavailable, rather than becoming a math result or a parse error', async () => {
  for (const operation of ['transcribe', 'assess']) {
    const { input, transcribe } = inputs();
    const stream = new ReadableStream({
      pull(controller) { controller.error(new Error('raw-private-transport-detail')); }
    }, { highWaterMark: 0 });
    const adapter = createLiveAdapter({ config, transport: async () => new Response(stream,
      { headers: { 'content-type': 'application/json' } }) });
    await rejectsCode(adapter[operation](operation === 'assess' ? input : transcribe), 'unavailable');
  }
});

test('an aborted headers request times out even when fetch ignores the deadline signal', async () => {
  const controller = new AbortController();
  const { transcribe } = inputs('audio-add-supported', controller.signal);
  const adapter = createLiveAdapter({ config, transport: () => new Promise(() => {}) });
  const rejection = rejectsCode(adapter.transcribe(transcribe), 'timeout');
  const timer = setTimeout(() => controller.abort(new DOMException('Deadline reached', 'TimeoutError')), 10);
  try { await rejection; } finally { clearTimeout(timer); }
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
});

test('settled cancellation handles are released and subsequent explicit calls do not automatically retry', async () => {
  const { transcribe } = inputs();
  let calls = 0;
  const adapter = createLiveAdapter({ config, transport: async () => {
    calls++;
    return calls === 1 ? jsonResponse({ text: '' }) : jsonResponse({ text: 'Fresh explicit words.' });
  } });
  await rejectsCode(adapter.transcribe(transcribe), 'invalid');
  assert.equal(calls, 1);
  await adapter.cancel({ jobId: transcribe.job.jobId, reason: 'cancelled' });
  assert.deepEqual(await adapter.transcribe(transcribe), { text: 'Fresh explicit words.' });
  assert.equal(calls, 2);
});

test('cancelling an audio request removes its adapter-owned upload without mutating server bytes', async () => {
  const { transcribe } = inputs();
  const original = Buffer.from(transcribe.audio.bytes);
  let upload;
  const adapter = createLiveAdapter({ config, transport: (url, options) => {
    upload = options.body;
    return new Promise(() => {});
  } });
  const pending = adapter.transcribe(transcribe);
  const rejection = rejectsCode(pending, 'cancelled');
  await tick();
  assert.equal(upload.has('file'), true);
  await adapter.cancel({ jobId: transcribe.job.jobId, reason: 'superseded' });
  await rejection;
  assert.equal(upload.has('file'), false);
  assert.deepEqual(transcribe.audio.bytes, original);
});

test('an invalid provider result leaves learning unchanged and supports only an explicit fresh-attempt recovery', async t => {
  const core = createSessionState({ config: loadConfig({ env: { ASSESSMENT_MODE: 'fixture' } }), lesson });
  t.after(() => core.close());
  const fixture = catalog.cases.find(item => item.caseId === 'written-supported');
  const context = core.context();
  const envelope = () => ({ runId: context.runId, sessionId: context.sessionId, idempotencyKey: randomUUID() });
  const submit = () => {
    const snapshot = core.student('A');
    return core.submit({
      ...envelope(), learnerId: 'A', assignmentId: snapshot.assignment.assignmentId, attemptId: randomUUID(),
      expectedAssignmentRevision: snapshot.assignment.revision, expectedTargetCorrectionRevision: 0,
      imagePngBase64: null, strokes: [], writtenWorking: fixture.writtenWorking,
      explanationMode: 'written', initialText: fixture.turns[0].text
    });
  };
  const start = submitted => {
    const snapshot = core.student('A');
    return core.startAssessment(submitted.result.attemptId, {
      ...envelope(), learnerId: 'A', assignmentId: snapshot.assignment.assignmentId,
      expectedAssignmentRevision: snapshot.assignment.revision, expectedTargetCorrectionRevision: 0,
      expectedEvidenceVersion: 1,
      confirmedTurns: [{ turnId: submitted.result.turnId, text: fixture.turns[0].text }]
    });
  };
  let calls = 0;
  let candidate;
  const adapter = createLiveAdapter({ config, transport: async () => {
    calls++;
    return calls === 1 ? jsonResponse(responseEnvelope({ madeUp: true })) : jsonResponse(responseEnvelope(candidate));
  } });
  const first = submit();
  const failed = start(first);
  await rejectsCode(adapter.assess(core.jobInput(failed.result.jobId)), 'invalid');
  core.failJob(failed.result.jobId, 'INTERPRETATION_INVALID');
  assert.equal(calls, 1);
  assert.equal(core.student('A').attempts[0].state, 'failed');
  assert.equal(core.student('A').targets[0].pending, false);
  assert.equal(core.teacher().counts[0].assessed, 0);
  assert.equal(core.student('A').judgments.length, 0);
  const second = submit();
  const fresh = start(second);
  candidate = structuredClone(fixture.candidate);
  candidate.sourceEvidence[0].sourceId = core.jobInput(fresh.result.jobId).work.writtenSourceId;
  const observed = await adapter.assess(core.jobInput(fresh.result.jobId));
  core.settleAssessment(fresh.result.jobId, observed);
  assert.equal(calls, 2);
  assert.equal(core.student('A').attempts.length, 2);
  assert.equal(core.student('A').attempts[0].error.code, 'INTERPRETATION_INVALID');
  assert.equal(core.teacher().counts[0].assessed, 1);
});
