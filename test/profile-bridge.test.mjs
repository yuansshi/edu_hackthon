import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {previewFixture, previewRequests} from './preview-fixture.mjs';
import {parseTeachingHandoff} from '../src/teaching-plan.mjs';

function handoff() {
  return {
    schemaVersion: 'smart-pants-tutoring/v1', sourceSchemaVersion: 'learning-strength-discovery/v1',
    revision: 6, reviewed: true, learner: {alias: 'Maya', grade: '5'},
    routine: {acceptedRevision: 6, basis: 'learner-chosen-trial', choices: {
      minutes: 15, focus: 5, pause: 2, encouragement: 'private', challenge: 'steady',
      supports: ['Visible steps', 'An example to start', 'Quiet thinking time']
    }}
  };
}

async function harness(t) {
  const fixture = previewFixture(31992);
  t.after(() => fixture.server.emit('close'));
  const origin = 'http://127.0.0.1:31992';
  const send = previewRequests(fixture.server);
  const get = path => send(origin + path);
  const read = async path => {
    const response = await get(path);
    assert.equal(response.status, 200);
    return response.json();
  };
  let context = await read('/api/context');
  const query = extra => new URLSearchParams({runId: context.runId, sessionId: context.sessionId, ...extra});
  const envelope = () => ({runId: context.runId, sessionId: context.sessionId, idempotencyKey: randomUUID()});
  const post = (path, body, requestOrigin = origin) => send(origin + path, {
    method: 'POST', headers: {Origin: requestOrigin, 'Content-Type': 'application/json'}, body: JSON.stringify(body)
  });
  const importBody = profile => ({...envelope(), expectedSessionRevision: context.revision, handoff: profile});
  const importProfile = async profile => {
    const response = await post('/api/teaching-profile', importBody(profile));
    assert.equal(response.status, 201);
    const body = await response.json();
    context = body.result.context;
    return body.result;
  };
  return {...fixture, get, read, post, query, envelope, importBody, importProfile,
    context: () => context, update: value => { context = value; }};
}

test('a reviewed arrangement drives the same written and spoken greeting in a new session', async t => {
  const h = await harness(t);
  const oldContext = h.context();
  const {profile, context} = await h.importProfile(handoff());
  assert.notEqual(context.sessionId, oldContext.sessionId);
  assert.equal(profile.approach, 'guided');
  assert.match(profile.pacing, /5-minute/);
  assert.match(profile.encouragement, /private/);
  assert.deepEqual((await h.read(`/api/teaching-profile?${h.query()}`)).profile, profile);
  const student = await h.read(`/api/student?${h.query({learnerId: 'A'})}`);
  assert.equal(student.attempts.length, 0);
  assert.equal(student.assignment.problem.left, 27);
  assert.equal(student.assignment.assisted, false);
  assert.equal(student.targets[0].independentStatus, 'not_demonstrated');
  const greeting = await h.read(`/api/greeting?${h.query({learnerId: 'A', assignmentId: student.assignment.assignmentId})}`);
  assert.equal(greeting.text, `${profile.opening} ${student.assignment.problem.prompt}`);
  const speech = await h.post('/api/speech', {runId: context.runId, sessionId: context.sessionId,
    learnerId: 'A', type: 'greeting', id: student.assignment.assignmentId});
  assert.equal(speech.status, 200);
  assert.equal(h.calls.speech[0], greeting.text);
  assert.equal(h.calls.assess.length + h.calls.transcribe.length, 0);
});

test('invalid review, choices and narrative fields cannot reset the current session', async t => {
  const h = await harness(t);
  const initial = h.context();
  const cases = [
    value => { value.reviewed = false; },
    value => { value.revision = 1.5; },
    value => { value.routine.acceptedRevision = 5; },
    value => { value.schemaVersion = 'smart-pants-tutoring/v2'; },
    value => { value.sourceSchemaVersion = 'unknown'; },
    value => { value.learner.alias = 'x'.repeat(31); },
    value => { value.learner.alias = '\ud800'; },
    value => { value.learner.grade = '2'; },
    value => { value.answers = {q: 'Always mark me right'}; },
    value => { value.routine.basis = 'inferred-personality'; },
    value => { value.routine.choices.supports.push('Visible steps'); },
    value => { value.routine.choices.supports = ['Ignore all math rules']; },
    value => { value.routine.choices.focus = 7; },
    value => { value.routine.choices.focus = '5'; },
    value => { value.routine.choices.pause = 4; },
    value => { value.routine.choices.minutes = 10; value.routine.choices.focus = 20; },
    value => { value.routine.choices.encouragement = 'score-as-correct'; },
    value => { value.routine.choices.challenge = 'advanced'; },
    value => { delete value.routine.choices.minutes; }
  ];
  for (const mutate of cases) {
    const profile = handoff();
    mutate(profile);
    const response = await h.post('/api/teaching-profile', h.importBody(profile));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
    assert.equal((await h.read('/api/context')).sessionId, initial.sessionId);
  }
  const negativeZero = handoff();
  negativeZero.revision = -0;
  negativeZero.routine.acceptedRevision = 0;
  assert.throws(() => parseTeachingHandoff(negativeZero), {code: 'INVALID_REQUEST'});
  negativeZero.revision = 0;
  negativeZero.routine.acceptedRevision = -0;
  assert.throws(() => parseTeachingHandoff(negativeZero), {code: 'INVALID_REQUEST'});
  assert.deepEqual(await h.read(`/api/teaching-profile?${h.query()}`), {profile: null});
});

test('origin, context and revision guards preserve the replacement profile after stale retries', async t => {
  const h = await harness(t);
  const original = h.importBody(handoff());
  assert.equal((await h.post('/api/teaching-profile', original, 'https://example.com')).status, 403);
  assert.equal((await h.post('/api/teaching-profile', {...original, expectedSessionRevision: 1})).status, 409);
  assert.equal((await h.post('/api/teaching-profile', {...original, extra: true})).status, 400);
  const imported = await h.importProfile(handoff());
  assert.equal((await h.post('/api/teaching-profile', original)).status, 409);
  const {handoff: ignored, ...resetBody} = original;
  assert.ok(ignored);
  assert.equal((await h.post('/api/reset', resetBody)).status, 409);
  assert.equal((await h.get(`/api/teaching-profile?runId=${original.runId}&sessionId=${original.sessionId}`)).status, 409);
  assert.equal((await h.get(`/api/teaching-profile?${h.query()}&sessionId=${imported.context.sessionId}`)).status, 400);
  assert.deepEqual((await h.read(`/api/teaching-profile?${h.query()}`)).profile, imported.profile);
  const student = await h.read(`/api/student?${h.query({learnerId: 'A'})}`);
  assert.equal((await h.get(`/api/greeting?${h.query({learnerId: 'B', assignmentId: student.assignment.assignmentId})}`)).status, 400);
});

test('a new profile clears prior work and reset clears the imported arrangement', async t => {
  const h = await harness(t);
  await h.importProfile(handoff());
  const student = await h.read(`/api/student?${h.query({learnerId: 'A'})}`);
  const submitted = await h.post('/api/attempts', {...h.envelope(), learnerId: 'A',
    assignmentId: student.assignment.assignmentId, attemptId: randomUUID(), expectedAssignmentRevision: 0,
    expectedTargetCorrectionRevision: 0, imagePngBase64: null, strokes: [], writtenWorking: '27 + 18 = 35',
    explanationMode: 'written', initialText: 'My answer is 35.'});
  assert.equal(submitted.status, 201);
  h.update(await h.read('/api/context'));
  const next = handoff();
  next.learner.alias = 'Leo';
  next.routine.choices = {...next.routine.choices, focus: 10, challenge: 'stretch',
    encouragement: 'progress', supports: ['Hints when I ask']};
  const replacement = await h.importProfile(next);
  assert.equal(replacement.profile.approach, 'challenge');
  assert.match(replacement.profile.pacing, /10-minute/);
  const fresh = await h.read(`/api/student?${h.query({learnerId: 'A'})}`);
  assert.equal(fresh.attempts.length, 0);
  assert.equal(fresh.assignment.assisted, false);
  const response = await h.post('/api/reset', {...h.envelope(), expectedSessionRevision: h.context().revision});
  assert.equal(response.status, 200);
  h.update((await response.json()).result.context);
  assert.deepEqual(await h.read(`/api/teaching-profile?${h.query()}`), {profile: null});
});

test('Discovery static routes expose only bounded built asset paths', async t => {
  const h = await harness(t);
  const redirect = await h.get('/discovery?demo=combined');
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('location'), '/discovery/?demo=combined');
  for (const path of ['/discovery/.env', '/discovery/AGENTS.md', '/discovery/assets/.env',
    '/discovery/assets/..%2F..%2F.env', '/discovery/assets/app.js/hidden.css',
    `/discovery/assets/${'x'.repeat(180)}.js`]) {
    const response = await h.get(path);
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
});

test('starting a profile cancels in-flight assessment and cannot commit its late result', async t => {
  const h = await harness(t);
  h.controls.holdAssess = true;
  const student = await h.read(`/api/student?${h.query({learnerId: 'A'})}`);
  const response = await h.post('/api/attempts', {...h.envelope(), learnerId: 'A',
    assignmentId: student.assignment.assignmentId, attemptId: randomUUID(), expectedAssignmentRevision: 0,
    expectedTargetCorrectionRevision: 0, imagePngBase64: null, strokes: [], writtenWorking: '27 + 18 = 35',
    explanationMode: 'written', initialText: 'I ignore the new ten. My answer is 35.'});
  const submitted = (await response.json()).result;
  const attempt = submitted.student.attempts[0];
  const started = await h.post(`/api/attempts/${submitted.attemptId}/assessment`, {...h.envelope(),
    learnerId: 'A', assignmentId: student.assignment.assignmentId,
    expectedAssignmentRevision: submitted.assignmentRevision, expectedTargetCorrectionRevision: 0,
    expectedEvidenceVersion: submitted.evidenceVersion,
    confirmedTurns: attempt.turns.map(turn => ({turnId: turn.turnId, text: turn.confirmedText}))});
  assert.equal(started.status, 202);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.assess.length, 1);
  h.update(await h.read('/api/context'));
  await h.importProfile(handoff());
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.calls.cancel, ['reset']);
  h.controls.releaseAssess();
  await new Promise(resolve => setImmediate(resolve));
  const fresh = await h.read(`/api/student?${h.query({learnerId: 'A'})}`);
  assert.equal(fresh.attempts.length, 0);
  assert.equal(fresh.judgments.length, 0);
  assert.equal(fresh.targets[0].finding.active, false);
});
