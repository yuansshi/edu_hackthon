import { createHash, randomUUID } from 'node:crypto';
import { LIMITS, validateConfig } from './config.mjs';
import { admitDrawing } from './png.mjs';
import { actionFor, classifyCandidate, criteriaFor, reduceTarget, validateCandidate, validateLesson } from './learning.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TARGETS = ['addition-exchange', 'subtraction-exchange'];
const BLOCKED = new Set(['awaiting_audio', 'transcribing', 'awaiting_transcript_review', 'assessing', 'awaiting_readback']);
const ERRORS = {
  INTERPRETATION_INVALID: { message: 'The returned interpretation could not be verified. Try new work or use writing.', retryable: true },
  INTERPRETATION_UNAVAILABLE: { message: 'The explanation could not be processed. Try new work or use writing.', retryable: true },
  INTERPRETATION_TIMEOUT: { message: 'Processing took too long. Try new work or use writing.', retryable: true },
  FIXTURE_UNMATCHED: { message: 'This input has no prepared example. Use the documented example or switch modes.', retryable: false }
};

export class SessionError extends Error {
  constructor(code) {
    super(code);
    this.name = 'SessionError';
    this.code = code;
  }
}

function requireValue(condition, code = 'INVALID_REQUEST') {
  if (!condition) throw new SessionError(code);
}

function integer(value, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && !Object.is(value, -0) && value >= min && value <= max;
}

function text(value, max = LIMITS.textPerTurn, nonempty = false) {
  return typeof value === 'string' && value.isWellFormed() &&
    Array.from(value).length <= max && (!nonempty || value.trim().length > 0);
}

function keys(value, expected) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...expected].sort().join(','));
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function fingerprint(route, body, audio) {
  const hash = createHash('sha256').update(route).update('\0').update(canonical(body));
  if (audio) hash.update('\0').update(audio.mimeType).update('\0').update(audio.bytes);
  return hash.digest('hex');
}

const ENVELOPE = ['runId', 'sessionId', 'idempotencyKey'];
const ATTEMPT_ENVELOPE = [...ENVELOPE, 'learnerId', 'assignmentId', 'expectedAssignmentRevision',
  'expectedEvidenceVersion', 'expectedTargetCorrectionRevision'];

export function createSessionState({ config, lesson, now = () => new Date(), newId = randomUUID, beforeJobStart = () => {} }) {
  config = validateConfig(config);
  lesson = structuredClone(validateLesson(lesson));
  let state;
  let images = new Map();
  const controllers = new Map();
  const audioByJob = new Map();
  let closed = false;
  const runId = newId();
  requireValue(UUID.test(runId));

  function id() {
    const value = newId();
    requireValue(typeof value === 'string' && UUID.test(value));
    return value;
  }

  function timestamp() {
    const date = now();
    requireValue(date instanceof Date && Number.isFinite(date.getTime()));
    return date.toISOString();
  }

  function targetDefinition(targetId) {
    const result = lesson.targets.find(target => target.targetId === targetId);
    requireValue(result, 'RESOURCE_NOT_FOUND');
    return result;
  }

  function issue(draft, learner, problem, purpose) {
    requireValue(!learner.assignments.some(assignment => assignment.problem.problemId === problem.problemId), 'ACTION_NOT_ALLOWED');
    const assignment = {
      assignmentId: id(), revision: 0, learnerId: learner.learnerId,
      targetId: lesson.targets.find(target =>
        [target.practice, ...target.checks, target.review].some(item => item.problemId === problem.problemId)).targetId,
      problem: structuredClone(problem), purpose, freshAtIssue: true, state: 'current',
      assisted: false, assistance: [], activeAttemptId: null, issuedAt: timestamp(),
      completedAt: null, issuedSequence: ++draft.eventSequence, completedSequence: null, workVersion: 0
    };
    learner.assignments.push(assignment);
    learner.currentAssignmentId = assignment.assignmentId;
    return assignment;
  }

  function initialState() {
    const draft = { runId, sessionId: id(), revision: 0, eventSequence: 0, learners: {}, attempts: {}, jobs: {}, receipts: {} };
    for (const learnerId of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const learner = {
        learnerId, assignments: [], judgments: [], corrections: [], actions: [], boundaries: [],
        currentAssignmentId: null, sessionStatus: 'in_progress', resumeProblemId: null,
        findingIds: Object.fromEntries(TARGETS.map(targetId => [targetId, id()])),
        findingRevisions: Object.fromEntries(TARGETS.map(targetId => [targetId, 0]))
      };
      draft.learners[learnerId] = learner;
      issue(draft, learner, targetDefinition('addition-exchange').practice, 'practice');
    }
    return draft;
  }
  state = initialState();

  function context(draft = state) {
    return {
      runId, sessionId: draft.sessionId, revision: draft.revision,
      processingMode: config.assessmentMode,
      lesson: { lessonId: lesson.lessonId, title: lesson.title, targetIds: [...TARGETS] },
      roster: Object.keys(draft.learners).map(learnerId => ({ learnerId, label: `Learner ${learnerId}` })),
      limits: { ...LIMITS }
    };
  }

  function checkContext(body, draft = state) {
    requireValue(!closed, 'CONTEXT_CHANGED');
    requireValue(body.runId === runId && body.sessionId === draft.sessionId, 'CONTEXT_CHANGED');
  }

  function learnerFor(draft, learnerId) {
    requireValue(typeof learnerId === 'string' && /^[A-F]$/.test(learnerId));
    return draft.learners[learnerId];
  }

  function currentFor(learner) {
    return learner.assignments.find(assignment => assignment.assignmentId === learner.currentAssignmentId);
  }

  function targetsFor(draft, learner) {
    return TARGETS.map(targetId => {
      const projection = reduceTarget({
        learnerId: learner.learnerId, targetId, findingId: learner.findingIds[targetId],
        judgments: learner.judgments, corrections: learner.corrections,
        assignments: learner.assignments, boundaries: learner.boundaries
      });
      projection.finding.revision = learner.findingRevisions[targetId];
      const assignment = currentFor(learner);
      const attempt = assignment?.targetId === targetId ? draft.attempts[assignment.activeAttemptId] : null;
      projection.pending = Boolean(attempt?.job);
      projection.needsClarification = projection.needsClarification ||
        Boolean(attempt && ['awaiting_transcript_review', 'awaiting_readback', 'needs_clarification'].includes(attempt.state));
      return projection;
    });
  }

  function correctionRevision(draft, learner, targetId) {
    return targetsFor(draft, learner).find(target => target.targetId === targetId).correctionRevision;
  }

  function checkAssignment(draft, body, attemptId = null) {
    const learner = learnerFor(draft, body.learnerId);
    const assignment = currentFor(learner);
    requireValue(assignment?.assignmentId === body.assignmentId, 'RESOURCE_MISMATCH');
    requireValue(integer(body.expectedAssignmentRevision) && integer(body.expectedTargetCorrectionRevision));
    requireValue(assignment.revision === body.expectedAssignmentRevision &&
      correctionRevision(draft, learner, assignment.targetId) === body.expectedTargetCorrectionRevision, 'REVISION_CONFLICT');
    let attempt = null;
    if (attemptId !== null) {
      requireValue(typeof attemptId === 'string' && UUID.test(attemptId));
      attempt = draft.attempts[attemptId];
      requireValue(attempt, 'RESOURCE_NOT_FOUND');
      requireValue(attempt.learnerId === body.learnerId && attempt.assignmentId === body.assignmentId, 'RESOURCE_MISMATCH');
      requireValue(assignment.activeAttemptId === attemptId, 'INVALID_TRANSITION');
      requireValue(integer(body.expectedEvidenceVersion));
      requireValue(attempt.evidenceVersion === body.expectedEvidenceVersion, 'REVISION_CONFLICT');
    }
    return { learner, assignment, attempt };
  }

  function validJudgments(learner) {
    const invalid = new Set(learner.corrections.flatMap(correction => correction.judgmentIds));
    return learner.judgments.filter(judgment => !invalid.has(judgment.judgmentId));
  }

  function nextCheck(learner, targetId) {
    return targetDefinition(targetId).checks.find(problem =>
      !learner.assignments.some(assignment => assignment.problem.problemId === problem.problemId));
  }

  function unused(learner, problem) {
    return !learner.assignments.some(assignment => assignment.problem.problemId === problem.problemId);
  }

  function destination(draft, learner, assignment, judgment, afterHelp) {
    if (!judgment && !afterHelp) return null;
    if (judgment?.outcome === 'U' && !afterHelp) return null;
    if (judgment?.outcome === 'N' && assignment.purpose !== 'review' && !afterHelp) return null;
    const targets = targetsFor(draft, learner);
    const addition = targets[0];
    const subtraction = targets[1];
    const check = targetId => {
      const problem = nextCheck(learner, targetId);
      return problem ? { actionId: targetId === TARGETS[0] ? 'fresh-addition-check' : 'fresh-subtraction-check', problem, purpose: 'check' } : { blocked: true };
    };
    // Corrections create repair obligations at a boundary, not a navigation rewind.
    for (const target of targets) {
      const lostQualifier = learner.corrections.some(correction =>
        correction.targetId === target.targetId && correction.judgmentIds.some(judgmentId =>
          learner.judgments.some(item => item.judgmentId === judgmentId && item.qualifies)));
      if (lostQualifier && target.independentStatus === 'recheck_required') return check(target.targetId);
    }
    if (assignment.purpose === 'review' && assignment.targetId === TARGETS[0] && learner.resumeProblemId) {
      if (judgment?.outcome === 'U' && !afterHelp) return null;
      const problem = [targetDefinition(TARGETS[1]).practice, ...targetDefinition(TARGETS[1]).checks]
        .find(item => item.problemId === learner.resumeProblemId);
      return problem && unused(learner, problem)
        ? { actionId: 'resume-subtraction-task', problem, purpose: problem.problemId.includes('practice') ? 'practice' : 'check' }
        : { blocked: true };
    }
    if (assignment.targetId === TARGETS[0] && assignment.purpose !== 'review' && (afterHelp || judgment?.outcome === 'E') &&
        !targets.find(target => target.targetId === assignment.targetId).independentJudgmentId) {
      return check(assignment.targetId);
    }
    if (!addition.independentJudgmentId) return afterHelp || judgment?.outcome === 'E' ? check(TARGETS[0]) : null;
    const subPractice = targetDefinition(TARGETS[1]).practice;
    if (unused(learner, subPractice)) return { actionId: 'start-subtraction-practice', problem: subPractice, purpose: 'practice' };

    const usableBoundary = judgment?.recognitionStatus === 'usable';
    const willMakeAdditionDue = addition.review.status === 'pending_intervening' &&
      assignment.targetId === TARGETS[1] && usableBoundary;
    if ((addition.review.status === 'due' || willMakeAdditionDue) && unused(learner, targetDefinition(TARGETS[0]).review)) {
      return { actionId: 'later-review', problem: targetDefinition(TARGETS[0]).review, purpose: 'review',
        resumeProblemId: nextCheck(learner, TARGETS[1])?.problemId ?? null };
    }
    if (!subtraction.independentJudgmentId && assignment.targetId === TARGETS[1] &&
        (afterHelp || judgment?.outcome === 'E')) return check(TARGETS[1]);
    if (subtraction.independentJudgmentId) {
      const willMakeSubtractionDue = subtraction.review.status === 'pending_intervening' &&
        assignment.targetId === TARGETS[0] && usableBoundary &&
        assignment.assignmentId !== subtraction.review.dueAfterAssignmentId;
      if ((subtraction.review.status === 'due' || willMakeSubtractionDue) &&
          unused(learner, targetDefinition(TARGETS[1]).review)) {
        return { actionId: 'later-review', problem: targetDefinition(TARGETS[1]).review, purpose: 'review' };
      }
      if (subtraction.review.status === 'pending_intervening') return check(TARGETS[0]);
    }
    if (assignment.purpose === 'review' || learner.assignments.some(item => item.purpose === 'review' && item.state === 'completed')) {
      for (const target of targets) {
        if (target.finding.active || target.independentStatus === 'recheck_required' || target.review.status === 'unsuccessful') {
          return check(target.targetId);
        }
      }
    }
    if (targets.some(target => ['pending_pool', 'pending_intervening', 'unsuccessful'].includes(target.review.status))) {
      return { blocked: true };
    }
    return { finished: true };
  }

  function offered(draft, learner) {
    const assignment = currentFor(learner);
    if (!assignment || learner.sessionStatus === 'finished') return [];
    const attempt = draft.attempts[assignment.activeAttemptId];
    if (attempt && BLOCKED.has(attempt.state)) return [];
    const judgments = validJudgments(learner);
    const judgment = attempt ? judgments.find(item => item.judgmentId === attempt.acceptedJudgmentId) : null;
    const helpIds = ['warmup-tens-ones', assignment.targetId === TARGETS[0] ? 'warmup-addition' : 'warmup-subtraction',
      assignment.targetId === TARGETS[0] ? 'teach-addition-exchange' : 'teach-subtraction-exchange', 'request-teacher-review'];
    const offers = helpIds.map(actionId => actionFor(lesson, actionId, assignment.problem));
    if (judgment && ['N', 'U', 'C'].includes(judgment.outcome)) {
      offers.unshift({ ...actionFor(lesson, judgment.teachingMoveId, assignment.problem), prompt: judgment.feedback });
    } else if (attempt?.state === 'needs_clarification') {
      offers.unshift(actionFor(lesson, 'confirm-recognition', assignment.problem));
    }
    const afterHelp = learner.actions.some(action => action.sourceAssignmentId === assignment.assignmentId &&
      action.marksAssisted && action.eventSequence > (judgment?.eventSequence ?? assignment.issuedSequence));
    const ready = Boolean((judgment && (judgment.outcome === 'E' ||
      (assignment.purpose === 'review' && judgment.outcome === 'N' &&
        learner.actions.some(action => action.sourceAssignmentId === assignment.assignmentId &&
          action.actionId === judgment.teachingMoveId && action.eventSequence > judgment.eventSequence)) ||
      learner.actions.some(action => action.sourceAssignmentId === assignment.assignmentId &&
        action.actionId === judgment.teachingMoveId && action.eventSequence > judgment.eventSequence))) || afterHelp);
    if (ready && !['ready_for_assessment'].includes(attempt?.state)) {
      const next = destination(draft, learner, assignment, judgment, afterHelp);
      if (next?.problem) offers.push(actionFor(lesson, next.actionId, next.problem));
      if (next?.finished || (next?.blocked && learner.sessionStatus === 'teacher_review')) {
        offers.push(actionFor(lesson, 'finish-session', assignment.problem));
      }
      if (next?.blocked) {
        const teacher = offers.find(action => action.actionId === 'request-teacher-review');
        teacher.prompt = 'There is no new problem left for this check. Ask your teacher to look at your work.';
      }
    }
    return [...new Map(offers.map(offer => [offer.actionId, offer])).values()].map(({ actionId, effect, prompt, marksAssisted }) =>
      ({ actionId, effect, prompt, marksAssisted }));
  }

  function publicAssignment(assignment) {
    const { issuedSequence, completedSequence, workVersion, ...result } = assignment;
    return result;
  }

  function publicAttempt(draft, attempt) {
    const { candidate, turnVersions, commitToken, ...result } = structuredClone(attempt);
    result.correctionRevision = correctionRevision(draft, draft.learners[attempt.learnerId], attempt.targetId);
    return result;
  }

  function publicJudgments(learner) {
    const valid = new Set(validJudgments(learner).map(judgment => judgment.judgmentId));
    return learner.judgments.map(judgment => {
      const { outcome, qualifies, exchangeCovered, feedback, learnerId, workVersion, assistanceEventIds, turnVersions, ...result } = judgment;
      return { ...result, valid: valid.has(judgment.judgmentId) };
    });
  }

  function publicActions(learner) {
    return learner.actions.map(action => {
      const { eventSequence, marksAssisted, ...result } = action;
      return result;
    });
  }

  function student(learnerId, draft = state) {
    const learner = learnerFor(draft, learnerId);
    return structuredClone({
      runId, sessionId: draft.sessionId, revision: draft.revision, generatedAt: timestamp(), learnerId,
      processingMode: config.assessmentMode, assignment: publicAssignment(currentFor(learner)),
      assignments: learner.assignments.map(publicAssignment),
      attempts: Object.values(draft.attempts).filter(attempt => attempt.learnerId === learnerId).map(attempt => publicAttempt(draft, attempt)),
      targets: targetsFor(draft, learner), judgments: publicJudgments(learner), corrections: learner.corrections,
      allowedActions: offered(draft, learner), actions: publicActions(learner),
      lastAction: publicActions(learner).at(-1) ?? null, sessionStatus: learner.sessionStatus
    });
  }

  function teacher(draft = state) {
    const learners = Object.keys(draft.learners).map(learnerId => {
      const view = student(learnerId, draft);
      return {
        learnerId, label: `Learner ${learnerId}`, targets: view.targets, assignments: view.assignments,
        attempts: view.attempts, judgments: view.judgments, corrections: view.corrections, actions: view.actions
      };
    });
    return {
      runId, sessionId: draft.sessionId, revision: draft.revision, generatedAt: timestamp(),
      processingMode: config.assessmentMode, rosterTotal: 6,
      counts: TARGETS.map(targetId => {
        const targets = learners.map(learner => learner.targets.find(target => target.targetId === targetId));
        return { targetId, assessed: targets.filter(target => target.assessed).length,
          unassessed: targets.filter(target => !target.assessed).length,
          activeNeeds: targets.filter(target => target.finding.active).length,
          clarification: targets.filter(target => target.needsClarification).length,
          pending: targets.filter(target => target.pending).length };
      }), learners
    };
  }

  function resultFor(reference, draft = state) {
    if (reference.type === 'attempt') {
      const attempt = draft.attempts[reference.attemptId];
      const learner = draft.learners[attempt.learnerId];
      const assignment = learner.assignments.find(item => item.assignmentId === attempt.assignmentId);
      return { attemptId: attempt.attemptId, turnId: reference.turnId ?? null, workVersion: attempt.workVersion,
        evidenceVersion: attempt.evidenceVersion, assignmentRevision: assignment.revision,
        targetCorrectionRevision: correctionRevision(draft, learner, attempt.targetId),
        jobId: reference.jobId ?? null, student: student(attempt.learnerId, draft) };
    }
    if (reference.type === 'action') {
      const learner = draft.learners[reference.learnerId];
      return { performedAction: publicActions(learner).find(action => action.eventId === reference.eventId),
        assignment: publicAssignment(currentFor(learner)), student: student(reference.learnerId, draft) };
    }
    const learner = draft.learners[reference.learnerId];
    const target = targetsFor(draft, learner).find(item => item.targetId === reference.targetId);
    return { findingId: target.finding.findingId, correctionId: reference.correctionId,
      findingRevision: target.finding.revision, targetCorrectionRevision: target.correctionRevision, teacher: teacher(draft) };
  }

  function receipt(reference, replayed) {
    return { runId, sessionId: state.sessionId, revision: state.revision, replayed, result: resultFor(reference) };
  }

  function synchronizeJobs(previous, reasons) {
    for (const jobId of Object.keys(previous.jobs)) {
      if (!state.jobs[jobId]) {
        if (reasons.has(jobId)) controllers.get(jobId)?.abort(reasons.get(jobId));
        controllers.delete(jobId);
        audioByJob.delete(jobId);
      }
    }
    for (const jobId of Object.keys(state.jobs)) {
      if (!controllers.has(jobId)) controllers.set(jobId, new AbortController());
    }
  }

  function mutate(route, body, execute, { audio = null, exempt = false } = {}) {
    checkContext(body);
    requireValue(typeof body.idempotencyKey === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(body.idempotencyKey));
    const hash = fingerprint(route, body, audio);
    const previousReceipt = Object.hasOwn(state.receipts, body.idempotencyKey) ? state.receipts[body.idempotencyKey] : null;
    if (previousReceipt) {
      requireValue(previousReceipt.fingerprint === hash, 'IDEMPOTENCY_CONFLICT');
      return receipt(previousReceipt.reference, true);
    }
    requireValue(exempt || Object.values(state.receipts).filter(record => !record.exempt).length < LIMITS.mutationRecords, 'SESSION_CAPACITY');
    const previous = state;
    const draft = structuredClone(state);
    const draftImages = new Map(images);
    const reasons = new Map();
    const reference = execute(draft, draftImages, reasons);
    if (!reference.unchanged) draft.revision++;
    if (exempt) {
      for (const [key, record] of Object.entries(draft.receipts)) {
        if (record.exempt && record.reference.attemptId === reference.attemptId) delete draft.receipts[key];
      }
    }
    Object.defineProperty(draft.receipts, body.idempotencyKey, {
      value: { fingerprint: hash, reference, exempt }, enumerable: true, writable: true, configurable: true
    });
    state = draft;
    images = draftImages;
    synchronizeJobs(previous, reasons);
    if (audio && reference.jobId) audioByJob.set(reference.jobId, { bytes: Buffer.from(audio.bytes), mimeType: audio.mimeType });
    return receipt(reference, false);
  }

  function removeJobs(draft, predicate, reasons, reason, recover = false) {
    for (const job of Object.values(draft.jobs)) {
      if (!predicate(job)) continue;
      const attempt = draft.attempts[job.attemptId];
      delete draft.jobs[job.jobId];
      reasons.set(job.jobId, reason);
      attempt.job = null;
      attempt.candidate = null;
      attempt.readback = null;
      attempt.commitToken++;
      attempt.state = recover
        ? attempt.turns.some(turn => turn.confirmation === 'awaiting_audio' || turn.confirmation === 'transcribing')
          ? 'awaiting_audio'
          : attempt.turns.some(turn => turn.confirmation !== 'confirmed') ? 'awaiting_transcript_review' : 'ready_for_assessment'
        : 'cancelled';
      for (const turn of attempt.turns) if (turn.confirmation === 'transcribing') turn.confirmation = 'awaiting_audio';
      attempt.updatedAt = timestamp();
    }
  }

  function validateHistory(attempt) {
    const retainedText = [attempt.work.writtenWorking];
    for (const turn of attempt.turns) {
      retainedText.push(turn.recognizedText ?? '', turn.confirmedText ?? '');
      for (const edit of turn.corrections) retainedText.push(edit.previousText ?? '', edit.text);
    }
    requireValue(attempt.evidenceVersion <= LIMITS.evidenceVersionsPerAttempt &&
      attempt.turns.length <= LIMITS.turnsPerAttempt &&
      Array.from(attempt.work.writtenWorking + attempt.turns.map(turn => turn.confirmedText ?? turn.recognizedText ?? '').join('')).length <= LIMITS.assembledTextPerAttempt &&
      retainedText.reduce((sum, value) => sum + Buffer.byteLength(value), 0) <= LIMITS.historyBytesPerAttempt,
    'REQUEST_TOO_LARGE');
  }

  function touch(draft, learner, targetId) {
    learner.findingRevisions[targetId]++;
  }

  function correct(draft, learner, attempt, judgmentIds, kind, reason, reasons, extra = {}) {
    const targetId = attempt?.targetId ?? extra.targetId;
    const revision = correctionRevision(draft, learner, targetId) + 1;
    const correction = { correctionId: id(), kind, targetId, judgmentIds: [...judgmentIds], reason,
      attemptId: attempt?.attemptId ?? null, previousEvidenceVersion: null, replacementEvidenceVersion: null,
      correctionRevision: revision, at: timestamp(), ...extra };
    learner.corrections.push(correction);
    ++draft.eventSequence;
    removeJobs(draft, job => job.learnerId === learner.learnerId && job.targetId === targetId, reasons, 'correction', true);
    for (const item of Object.values(draft.attempts)) {
      if (item.learnerId === learner.learnerId && item.targetId === targetId && item.candidate) {
        item.candidate = null;
        item.readback = null;
        item.commitToken++;
        item.state = 'ready_for_assessment';
        item.updatedAt = timestamp();
      }
      if (item.learnerId === learner.learnerId && item.targetId === targetId &&
          judgmentIds.includes(item.acceptedJudgmentId)) {
        item.acceptedJudgmentId = null;
        if (currentFor(learner).activeAttemptId === item.attemptId && !item.job) item.state = 'needs_clarification';
      }
    }
    touch(draft, learner, targetId);
    return correction;
  }

  function startJob(draft, learner, assignment, attempt, kind, turnId = null) {
    requireValue(Object.keys(draft.jobs).length < LIMITS.inFlightProviderCalls, 'PROCESSING_BUSY');
    beforeJobStart();
    const jobId = id();
    const job = {
      jobId, runId, sessionId: draft.sessionId, learnerId: learner.learnerId, assignmentId: assignment.assignmentId,
      assignmentRevision: assignment.revision, targetId: assignment.targetId, attemptId: attempt.attemptId,
      workVersion: attempt.workVersion, evidenceVersion: attempt.evidenceVersion,
      correctionRevision: correctionRevision(draft, learner, assignment.targetId),
      kind, turnId, commitToken: ++attempt.commitToken
    };
    draft.jobs[jobId] = job;
    attempt.job = { jobId, kind, turnId };
    attempt.state = kind === 'transcribe' ? 'transcribing' : 'assessing';
    attempt.error = null;
    attempt.candidate = null;
    attempt.readback = null;
    attempt.updatedAt = timestamp();
    return jobId;
  }

  function jobMatches(job) {
    if (!job || closed || job.runId !== runId || job.sessionId !== state.sessionId) return false;
    const learner = state.learners[job.learnerId];
    const assignment = currentFor(learner);
    const attempt = state.attempts[job.attemptId];
    return assignment.assignmentId === job.assignmentId && assignment.revision === job.assignmentRevision &&
      assignment.activeAttemptId === job.attemptId && attempt.workVersion === job.workVersion &&
      attempt.evidenceVersion === job.evidenceVersion && attempt.commitToken === job.commitToken &&
      correctionRevision(state, learner, job.targetId) === job.correctionRevision;
  }

  function jobInput(jobId) {
    const job = state.jobs[jobId];
    requireValue(jobMatches(job), 'INVALID_TRANSITION');
    const attempt = state.attempts[job.attemptId];
    const assignment = currentFor(state.learners[job.learnerId]);
    const image = images.get(attempt.attemptId);
    const { kind, turnId, commitToken, ...jobContext } = job;
    const input = {
      job: structuredClone(jobContext),
      problem: { ...structuredClone(assignment.problem), targetId: assignment.targetId,
        purpose: assignment.purpose, assisted: assignment.assisted },
      work: {
        image: image ? { bytes: Buffer.from(image.pngBytes), sha256: image.sha256, width: image.width, height: image.height } : null,
        imageSourceId: image ? `${attempt.attemptId}:work:${attempt.workVersion}` : null,
        strokes: structuredClone(attempt.work.strokes), writtenWorking: attempt.work.writtenWorking,
        writtenSourceId: attempt.work.writtenSourceId
      },
      signal: controllers.get(jobId).signal
    };
    if (kind === 'transcribe') {
      const audio = audioByJob.get(jobId);
      return { ...input, turn: { turnId, index: attempt.turns.findIndex(turn => turn.turnId === turnId), source: 'transcription' },
        audio: { bytes: Buffer.from(audio.bytes), mimeType: audio.mimeType } };
    }
    return { ...input, turns: attempt.turns.map(turn => ({ turnId: turn.turnId, source: turn.source, text: turn.confirmedText })),
      criteria: criteriaFor(assignment.problem), allowedActionIds: lesson.actions.map(action => action.actionId) };
  }

  function commitCandidate(draft, attempt, candidate) {
    const learner = draft.learners[attempt.learnerId];
    const assignment = currentFor(learner);
    const input = {
      problem: { ...assignment.problem, targetId: assignment.targetId, purpose: assignment.purpose,
        assisted: assignment.assisted, freshAtIssue: assignment.freshAtIssue, currentAtCommit: true },
      work: { image: images.has(attempt.attemptId) ? images.get(attempt.attemptId) : null,
        imageSourceId: attempt.work.imageUrl ? `${attempt.attemptId}:work:${attempt.workVersion}` : null,
        strokes: attempt.work.strokes, writtenWorking: attempt.work.writtenWorking, writtenSourceId: attempt.work.writtenSourceId },
      turns: attempt.turns.map(turn => ({ turnId: turn.turnId, source: turn.source, text: turn.confirmedText })),
      criteria: criteriaFor(assignment.problem), allowedActionIds: lesson.actions.map(action => action.actionId)
    };
    const classification = classifyCandidate(candidate, input);
    const { neutralReadback, ...observations } = candidate;
    const judgment = {
      ...observations, ...classification, judgmentId: id(), attemptId: attempt.attemptId,
      assignmentId: assignment.assignmentId, learnerId: learner.learnerId, targetId: assignment.targetId,
      workVersion: attempt.workVersion, evidenceVersion: attempt.evidenceVersion,
      assignmentPurpose: assignment.purpose, freshAtIssue: assignment.freshAtIssue, currentAtCommit: true,
      assisted: assignment.assisted, assistanceEventIds: assignment.assistance.map(event => event.eventId),
      turnVersions: { ...attempt.turnVersions },
      valid: true, eventSequence: ++draft.eventSequence, at: timestamp()
    };
    learner.judgments.push(judgment);
    attempt.acceptedJudgmentId = judgment.judgmentId;
    attempt.state = classification.outcome === 'U' ? 'needs_clarification' : 'accepted';
    attempt.candidate = null;
    touch(draft, learner, assignment.targetId);
  }

  function settle(jobId, execute) {
    const job = state.jobs[jobId];
    if (!jobMatches(job)) return false;
    const previous = state;
    const draft = structuredClone(state);
    const attempt = draft.attempts[job.attemptId];
    execute(draft, attempt);
    delete draft.jobs[jobId];
    attempt.job = null;
    attempt.updatedAt = timestamp();
    draft.revision++;
    state = draft;
    synchronizeJobs(previous, new Map());
    return true;
  }

  function submit(body) {
    keys(body, [...ENVELOPE, 'learnerId', 'assignmentId', 'attemptId', 'expectedAssignmentRevision',
      'expectedTargetCorrectionRevision', 'imagePngBase64', 'strokes', 'writtenWorking', 'explanationMode', 'initialText']);
    return mutate('submit', body, (draft, draftImages, reasons) => {
      const { learner, assignment } = checkAssignment(draft, body);
      requireValue(typeof body.attemptId === 'string' && UUID.test(body.attemptId));
      requireValue(!draft.attempts[body.attemptId], 'RESOURCE_CONFLICT');
      requireValue(Object.keys(draft.attempts).length < LIMITS.attemptsPerSession, 'SESSION_CAPACITY');
      requireValue(text(body.writtenWorking) && Array.isArray(body.strokes));
      let points = 0;
      for (const stroke of body.strokes) {
        keys(stroke, ['tool', 'width', 'points']);
        requireValue(['pen', 'erase'].includes(stroke.tool) && integer(stroke.width, 1, 24) && Array.isArray(stroke.points));
        for (const point of stroke.points) {
          requireValue(Array.isArray(point) && point.length === 2 && integer(point[0], 0, 1023) && integer(point[1], 0, 767));
          requireValue(++points <= LIMITS.pointsPerWork, 'REQUEST_TOO_LARGE');
        }
      }
      requireValue(['spoken', 'written'].includes(body.explanationMode));
      requireValue(body.explanationMode === 'spoken' ? body.initialText === null : text(body.initialText, 4000, true));
      const image = body.imagePngBase64 === null ? null : admitDrawing(body.imagePngBase64);
      requireValue(image || (body.writtenWorking.trim() && body.strokes.length === 0));
      if (!image) requireValue(body.strokes.length === 0);
      const retainedBytes = [...draftImages.values()].reduce((sum, item) => sum + item.byteLength, 0);
      requireValue(retainedBytes + (image?.byteLength ?? 0) <= LIMITS.retainedPngBytes, 'SESSION_CAPACITY');
      const workVersion = assignment.workVersion + 1;
      const turnId = id();
      const at = timestamp();
      const attempt = {
        attemptId: body.attemptId, assignmentId: assignment.assignmentId, learnerId: learner.learnerId,
        targetId: assignment.targetId, workVersion, evidenceVersion: 1,
        correctionRevision: correctionRevision(draft, learner, assignment.targetId),
        work: { workVersion, imageUrl: image
          ? `/api/attempts/${body.attemptId}/work.png?runId=${runId}&sessionId=${draft.sessionId}&workVersion=${workVersion}` : null,
        imageBytes: image?.byteLength ?? 0, strokes: structuredClone(body.strokes),
        writtenWorking: body.writtenWorking,
        writtenSourceId: body.writtenWorking.trim() ? `${body.attemptId}:work:${workVersion}:written` : null },
        turns: [{ turnId, source: body.explanationMode === 'spoken' ? 'transcription' : 'written',
          recognizedText: null, confirmedText: body.initialText,
          confirmation: body.explanationMode === 'spoken' ? 'awaiting_audio' : 'confirmed', corrections: [] }],
        state: body.explanationMode === 'spoken' ? 'awaiting_audio' : 'ready_for_assessment',
        job: null, readback: null, acceptedJudgmentId: null, error: null, createdAt: at, updatedAt: at,
        candidate: null, turnVersions: { [turnId]: 1 }, commitToken: 0
      };
      validateHistory(attempt);
      removeJobs(draft, job => job.assignmentId === assignment.assignmentId, reasons, 'superseded');
      assignment.workVersion = workVersion;
      assignment.revision++;
      assignment.activeAttemptId = body.attemptId;
      draft.attempts[body.attemptId] = attempt;
      if (image) draftImages.set(body.attemptId, image);
      return { type: 'attempt', attemptId: body.attemptId, turnId };
    });
  }

  function startAssessment(attemptId, body) {
    keys(body, [...ATTEMPT_ENVELOPE, 'confirmedTurns']);
    return mutate(`assess:${attemptId}`, body, (draft, draftImages, reasons) => {
      const { learner, assignment, attempt } = checkAssignment(draft, body, attemptId);
      requireValue(['ready_for_assessment', 'awaiting_transcript_review', 'needs_clarification', 'accepted', 'awaiting_readback'].includes(attempt.state), 'INVALID_TRANSITION');
      requireValue(Object.keys(draft.jobs).length < LIMITS.inFlightProviderCalls, 'PROCESSING_BUSY');
      requireValue(Array.isArray(body.confirmedTurns) && body.confirmedTurns.length === attempt.turns.length);
      const replaced = [];
      const priorTurnVersions = { ...attempt.turnVersions };
      let changed = false;
      body.confirmedTurns.forEach((supplied, index) => {
        keys(supplied, ['turnId', 'text']);
        const turn = attempt.turns[index];
        requireValue(supplied.turnId === turn.turnId && text(supplied.text, 4000, true));
        requireValue(!['awaiting_audio', 'transcribing', 'failed'].includes(turn.confirmation), 'INVALID_TRANSITION');
        if (turn.confirmedText !== supplied.text || turn.confirmation !== 'confirmed') {
          changed = true;
          if (turn.confirmation === 'confirmed') replaced.push(turn.turnId);
        }
      });
      requireValue(!['accepted', 'awaiting_readback'].includes(attempt.state) || replaced.length > 0, 'INVALID_TRANSITION');
      const previousEvidenceVersion = attempt.evidenceVersion;
      if (changed) {
        attempt.evidenceVersion++;
        body.confirmedTurns.forEach((supplied, index) => {
          const turn = attempt.turns[index];
          if (turn.confirmedText !== supplied.text || turn.confirmation !== 'confirmed') {
            const previousText = turn.confirmedText ?? turn.recognizedText;
            turn.corrections.push({ correctionId: id(), previousText, text: supplied.text,
              at: timestamp(), evidenceVersion: attempt.evidenceVersion });
            turn.confirmedText = supplied.text;
            turn.confirmation = 'confirmed';
            attempt.turnVersions[turn.turnId] = attempt.evidenceVersion;
          }
        });
      }
      validateHistory(attempt);
      if (replaced.length) {
        const invalidated = validJudgments(learner).filter(judgment => judgment.attemptId === attemptId &&
          replaced.some(turnId => judgment.turnVersions[turnId] === priorTurnVersions[turnId]))
          .map(judgment => judgment.judgmentId);
        if (invalidated.length) correct(draft, learner, attempt, invalidated, 'recognition_edit',
          'Confirmed explanation corrected.', reasons, { previousEvidenceVersion, replacementEvidenceVersion: attempt.evidenceVersion });
      }
      const jobId = startJob(draft, learner, assignment, attempt, 'assess');
      return { type: 'attempt', attemptId, jobId };
    });
  }

  function startTranscription(attemptId, turnId, body, audio) {
    keys(body, ATTEMPT_ENVELOPE);
    requireValue(audio && audio.bytes instanceof Uint8Array && audio.bytes.byteLength > 0, 'INVALID_AUDIO');
    requireValue(audio.bytes.byteLength <= LIMITS.audioBytes, 'REQUEST_TOO_LARGE');
    const mimeType = typeof audio.mimeType === 'string' ? audio.mimeType.toLowerCase().replace(/\s/g, '') : '';
    requireValue(['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/wav'].includes(mimeType), 'UNSUPPORTED_MEDIA');
    const bytes = Buffer.from(audio.bytes);
    const validContainer = mimeType.startsWith('audio/webm') ? bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
      : mimeType === 'audio/mp4' ? bytes.subarray(4, 8).toString('ascii') === 'ftyp'
        : bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WAVE';
    requireValue(validContainer, 'INVALID_AUDIO');
    return mutate(`audio:${attemptId}:${turnId}`, body, draft => {
      const { learner, assignment, attempt } = checkAssignment(draft, body, attemptId);
      const turn = attempt.turns.find(item => item.turnId === turnId);
      requireValue(attempt.state === 'awaiting_audio' && turn?.confirmation === 'awaiting_audio', 'INVALID_TRANSITION');
      const jobId = startJob(draft, learner, assignment, attempt, 'transcribe', turnId);
      turn.confirmation = 'transcribing';
      return { type: 'attempt', attemptId, turnId, jobId };
    }, { audio: { bytes, mimeType } });
  }

  function settleTranscription(jobId, transcript) {
    if (!jobMatches(state.jobs[jobId])) return false;
    if (!text(transcript, 4000, true)) return failJob(jobId, 'INTERPRETATION_INVALID');
    requireValue(!state.jobs[jobId] || state.jobs[jobId].kind === 'transcribe', 'INVALID_TRANSITION');
    try {
      return settle(jobId, (draft, attempt) => {
        const turn = attempt.turns.find(item => item.turnId === draft.jobs[jobId].turnId);
        turn.recognizedText = transcript;
        turn.confirmation = 'unconfirmed';
        attempt.evidenceVersion++;
        validateHistory(attempt);
        attempt.state = 'awaiting_transcript_review';
      });
    } catch (error) {
      if (error.code !== 'REQUEST_TOO_LARGE') throw error;
      return failJob(jobId, 'INTERPRETATION_INVALID');
    }
  }

  function settleAssessment(jobId, candidate) {
    if (!jobMatches(state.jobs[jobId])) return false;
    requireValue(state.jobs[jobId].kind === 'assess', 'INVALID_TRANSITION');
    let validated;
    try {
      validated = validateCandidate(candidate, jobInput(jobId));
    } catch (error) {
      if (error.code !== 'INTERPRETATION_INVALID') throw error;
      return failJob(jobId, 'INTERPRETATION_INVALID');
    }
    return settle(jobId, (draft, attempt) => {
      if (attempt.work.imageUrl) {
        attempt.candidate = { candidateId: id(), value: validated };
        attempt.readback = { candidateId: attempt.candidate.candidateId, evidenceVersion: attempt.evidenceVersion,
          text: validated.neutralReadback, sourceIds: validated.sourceEvidence.map(source => source.sourceId), confirmation: 'pending' };
        attempt.state = 'awaiting_readback';
      } else {
        commitCandidate(draft, attempt, validated);
      }
    });
  }

  function failJob(jobId, code) {
    requireValue(Object.hasOwn(ERRORS, code));
    return settle(jobId, (draft, attempt) => {
      attempt.state = 'failed';
      attempt.error = { code, ...ERRORS[code] };
      for (const turn of attempt.turns) if (turn.confirmation === 'transcribing') turn.confirmation = 'failed';
    });
  }

  function confirmReadback(attemptId, body) {
    keys(body, [...ATTEMPT_ENVELOPE, 'candidateId', 'matches']);
    return mutate(`readback:${attemptId}`, body, (draft, draftImages, reasons) => {
      const { attempt } = checkAssignment(draft, body, attemptId);
      requireValue(typeof body.matches === 'boolean');
      requireValue(attempt.state === 'awaiting_readback' && attempt.candidate?.candidateId === body.candidateId, 'INVALID_TRANSITION');
      attempt.readback.confirmation = body.matches ? 'matched' : 'mismatched';
      if (body.matches) commitCandidate(draft, attempt, attempt.candidate.value);
      else {
        attempt.evidenceVersion++;
        validateHistory(attempt);
        attempt.candidate = null;
        attempt.state = 'needs_clarification';
      }
      attempt.updatedAt = timestamp();
      return { type: 'attempt', attemptId };
    });
  }

  function clarify(attemptId, body) {
    keys(body, [...ATTEMPT_ENVELOPE, 'mode', ...(body.mode === 'written' ? ['text'] : [])]);
    return mutate(`clarify:${attemptId}`, body, draft => {
      const { learner, assignment, attempt } = checkAssignment(draft, body, attemptId);
      const lastAction = learner.actions.at(-1);
      requireValue(attempt.state === 'needs_clarification' || (attempt.state === 'accepted' &&
        lastAction?.sourceAssignmentId === assignment.assignmentId && lastAction.effect === 'current_assignment'), 'INVALID_TRANSITION');
      requireValue(body.mode === 'spoken' || (body.mode === 'written' && text(body.text, 4000, true)));
      const turnId = id();
      attempt.turns.push({ turnId, source: body.mode === 'spoken' ? 'transcription' : 'written',
        recognizedText: null, confirmedText: body.mode === 'written' ? body.text : null,
        confirmation: body.mode === 'spoken' ? 'awaiting_audio' : 'confirmed', corrections: [] });
      attempt.evidenceVersion++;
      attempt.turnVersions[turnId] = attempt.evidenceVersion;
      validateHistory(attempt);
      attempt.state = body.mode === 'spoken' ? 'awaiting_audio' : 'ready_for_assessment';
      attempt.updatedAt = timestamp();
      attempt.candidate = null;
      attempt.readback = null;
      return { type: 'attempt', attemptId, turnId };
    });
  }

  function cancel(attemptId, body) {
    keys(body, ATTEMPT_ENVELOPE);
    return mutate(`cancel:${attemptId}`, body, (draft, draftImages, reasons) => {
      const retained = draft.attempts[attemptId];
      if (retained?.state === 'cancelled') {
        requireValue(retained.learnerId === body.learnerId && retained.assignmentId === body.assignmentId, 'RESOURCE_MISMATCH');
        const learner = learnerFor(draft, body.learnerId);
        const assignment = learner.assignments.find(item => item.assignmentId === retained.assignmentId);
        requireValue(integer(body.expectedAssignmentRevision) && integer(body.expectedEvidenceVersion) &&
          integer(body.expectedTargetCorrectionRevision));
        requireValue(assignment.revision === body.expectedAssignmentRevision &&
          retained.evidenceVersion === body.expectedEvidenceVersion &&
          correctionRevision(draft, learner, retained.targetId) === body.expectedTargetCorrectionRevision, 'REVISION_CONFLICT');
        return { type: 'attempt', attemptId, unchanged: true };
      }
      const { attempt } = checkAssignment(draft, body, attemptId);
      requireValue(attempt.state !== 'accepted', 'INVALID_TRANSITION');
      removeJobs(draft, job => job.attemptId === attemptId, reasons, 'cancelled');
      attempt.state = 'cancelled';
      attempt.job = null;
      attempt.candidate = null;
      attempt.readback = null;
      attempt.commitToken++;
      attempt.updatedAt = timestamp();
      return { type: 'attempt', attemptId };
    }, { exempt: true });
  }

  function next(body) {
    keys(body, [...ENVELOPE, 'learnerId', 'assignmentId', 'expectedAssignmentRevision', 'expectedTargetCorrectionRevision', 'actionId']);
    return mutate('next', body, (draft, draftImages, reasons) => {
      const { learner, assignment } = checkAssignment(draft, body);
      const offer = offered(draft, learner).find(action => action.actionId === body.actionId);
      requireValue(offer, 'ACTION_NOT_ALLOWED');
      let action = null;
      let assigned = assignment;
      if (offer.effect === 'new_assignment') {
        const attempt = draft.attempts[assignment.activeAttemptId];
        const judgment = validJudgments(learner).find(item => item.judgmentId === attempt?.acceptedJudgmentId);
        const afterHelp = learner.actions.some(event => event.sourceAssignmentId === assignment.assignmentId &&
          event.marksAssisted && event.eventSequence > (judgment?.eventSequence ?? assignment.issuedSequence));
        const selected = destination(draft, learner, assignment, judgment, afterHelp);
        requireValue(selected?.actionId === body.actionId && selected.problem, 'ACTION_NOT_ALLOWED');
        assignment.state = 'completed';
        assignment.completedAt = timestamp();
        assignment.completedSequence = ++draft.eventSequence;
        assignment.revision++;
        learner.boundaries.push({ eventSequence: assignment.completedSequence, assignmentId: assignment.assignmentId,
          learnerId: learner.learnerId, usable: Boolean(judgment?.recognitionStatus === 'usable'),
          judgmentId: judgment?.judgmentId ?? null });
        if (Object.hasOwn(selected, 'resumeProblemId')) learner.resumeProblemId = selected.resumeProblemId;
        if (body.actionId === 'resume-subtraction-task') learner.resumeProblemId = null;
        assigned = issue(draft, learner, selected.problem, selected.purpose);
        action = actionFor(lesson, body.actionId, selected.problem);
      } else {
        action = actionFor(lesson, body.actionId, assignment.problem);
        assignment.revision++;
      }
      const eventId = id();
      const event = { eventId, idempotencyKey: body.idempotencyKey, actionId: body.actionId, effect: offer.effect,
        sourceAssignmentId: assignment.assignmentId, assignmentId: assigned.assignmentId,
        prompt: offer.prompt, visual: action.visual, at: timestamp(),
        marksAssisted: offer.marksAssisted, eventSequence: ++draft.eventSequence };
      if (offer.marksAssisted) {
        assignment.assisted = true;
        assignment.assistance.push({ eventId, actionId: body.actionId, at: event.at, assignmentRevision: assignment.revision });
      }
      if (body.actionId === 'request-teacher-review') learner.sessionStatus = 'teacher_review';
      if (body.actionId === 'finish-session') learner.sessionStatus = 'finished';
      learner.actions.push(event);
      return { type: 'action', learnerId: learner.learnerId, eventId };
    });
  }

  function retract(findingId, body) {
    keys(body, [...ENVELOPE, 'learnerId', 'targetId', 'expectedFindingRevision', 'expectedTargetCorrectionRevision', 'judgmentIds', 'reason']);
    return mutate(`retract:${findingId}`, body, (draft, draftImages, reasons) => {
      const learner = learnerFor(draft, body.learnerId);
      requireValue(TARGETS.includes(body.targetId));
      requireValue(learner.findingIds[body.targetId] === findingId, 'RESOURCE_MISMATCH');
      requireValue(integer(body.expectedFindingRevision) && integer(body.expectedTargetCorrectionRevision));
      requireValue(learner.findingRevisions[body.targetId] === body.expectedFindingRevision &&
        correctionRevision(draft, learner, body.targetId) === body.expectedTargetCorrectionRevision, 'REVISION_CONFLICT');
      requireValue(Array.isArray(body.judgmentIds) && body.judgmentIds.length > 0 && body.judgmentIds.length <= 128 &&
        new Set(body.judgmentIds).size === body.judgmentIds.length && text(body.reason, 500, true) &&
        body.reason === body.reason.trim());
      const valid = validJudgments(learner);
      requireValue(body.judgmentIds.every(judgmentId => valid.some(judgment =>
        judgment.judgmentId === judgmentId && judgment.targetId === body.targetId)), 'RESOURCE_MISMATCH');
      const correction = correct(draft, learner, null, body.judgmentIds, 'teacher_retraction', body.reason, reasons, { targetId: body.targetId });
      return { type: 'correction', learnerId: learner.learnerId, targetId: body.targetId, correctionId: correction.correctionId };
    });
  }

  function reset(body) {
    keys(body, [...ENVELOPE, 'expectedSessionRevision']);
    checkContext(body);
    requireValue(typeof body.idempotencyKey === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(body.idempotencyKey));
    requireValue(!Object.hasOwn(state.receipts, body.idempotencyKey), 'IDEMPOTENCY_CONFLICT');
    requireValue(integer(body.expectedSessionRevision));
    requireValue(body.expectedSessionRevision === state.revision, 'REVISION_CONFLICT');
    const previous = state;
    state = initialState();
    images.clear();
    synchronizeJobs(previous, new Map(Object.keys(previous.jobs).map(jobId => [jobId, 'reset'])));
    return { runId, sessionId: state.sessionId, revision: 0, replayed: false,
      result: { context: context(), teacher: teacher() } };
  }

  function work(attemptId, workVersion, body) {
    checkContext(body);
    const attempt = state.attempts[attemptId];
    requireValue(attempt && attempt.workVersion === workVersion && images.has(attemptId), 'RESOURCE_NOT_FOUND');
    return Buffer.from(images.get(attemptId).pngBytes);
  }

  function close() {
    if (closed) return;
    closed = true;
    for (const controller of controllers.values()) controller.abort('shutdown');
    controllers.clear();
    audioByJob.clear();
    images.clear();
    state = { runId, sessionId: state.sessionId, revision: state.revision, eventSequence: state.eventSequence,
      learners: {}, attempts: {}, jobs: {}, receipts: {} };
  }

  return {
    context: () => { requireValue(!closed, 'CONTEXT_CHANGED'); return structuredClone(context()); },
    student: learnerId => { requireValue(!closed, 'CONTEXT_CHANGED'); return student(learnerId); },
    teacher: () => { requireValue(!closed, 'CONTEXT_CHANGED'); return teacher(); },
    feedback: (learnerId, judgmentId) => {
      requireValue(!closed, 'CONTEXT_CHANGED');
      const judgment = validJudgments(learnerFor(state, learnerId)).find(item => item.judgmentId === judgmentId);
      requireValue(judgment, 'RESOURCE_NOT_FOUND');
      return judgment.feedback;
    },
    submit, startTranscription, settleTranscription, startAssessment, settleAssessment, failJob, jobInput,
    confirmReadback, clarify, cancel, next, retract, reset, work, close
  };
}
