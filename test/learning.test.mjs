import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { createSessionState } from '../src/session-state.mjs';
import { loadConfig, LIMITS } from '../src/config.mjs';
import {
  validateLesson, criteriaFor, validateCandidate, classifyCandidate, actionFor, reduceTarget
} from '../src/learning.mjs';

const lesson = validateLesson(JSON.parse(readFileSync(new URL('../content/demo-lesson.json', import.meta.url), 'utf8')));
const allowedActionIds = lesson.actions.map(action => action.actionId);
const targetId = 'addition-exchange';
const learnerId = 'A';

function inputFor(targetIndex = 0, purpose = 'practice', assisted = false, index = 0) {
  const target = lesson.targets[targetIndex];
  const authored = purpose === 'check' ? target.checks[index] : target[purpose];
  const problem = {...authored, targetId: target.targetId, purpose, assisted};
  return {
    job: {attemptId: '00000000-0000-4000-8000-000000000001', workVersion: 1},
    problem,
    work: {image: null, imageSourceId: null, strokes: [], writtenWorking: '', writtenSourceId: null},
    turns: [{turnId: '00000000-0000-4000-8000-000000000002', source: 'written', text: ''}],
    criteria: criteriaFor(problem), allowedActionIds, signal: new AbortController().signal
  };
}

function candidateFor(input, overrides = {}, words) {
  const c = input.criteria;
  const q = {before: c.before, after: c.conservedAfter};
  input.turns[0].text = words ??
    `${c.before.tens} tens and ${c.before.ones} ones become ${c.conservedAfter.tens} tens and ${c.conservedAfter.ones} ones. My answer is ${c.expectedAnswer}.`;
  return {
    category: 'supported_exchange', observedAnswer: c.expectedAnswer,
    exchangeEvidence: 'supported', recognitionStatus: 'usable',
    sourceEvidence: [{sourceKind: 'turn', sourceId: input.turns[0].turnId, quote: input.turns[0].text, description: ''}],
    exchangeQuantities: structuredClone(q), neutralReadback: '',
    reasoningSummary: 'The submitted quantities show an equal trade.',
    teachingMoveId: 'finish-session', ...overrides
  };
}

function difficultyFor(input, overrides = {}) {
  const before = input.criteria.before;
  const after = {tens: before.tens, ones: before.ones + (input.problem.operation === 'add' ? -10 : 10)};
  const observedAnswer = input.criteria.expectedAnswer + (input.problem.operation === 'add' ? -10 : 10);
  return candidateFor(input, {
    category: input.problem.operation === 'add' ? 'addition_omitted_ten' : 'subtraction_value_changed',
    observedAnswer, exchangeEvidence: 'contradicted', exchangeQuantities: {before, after}, ...overrides
  }, `${before.tens} tens and ${before.ones} ones become ${after.tens} tens and ${after.ones} ones. My answer is ${observedAnswer}.`);
}

function neutralFor(input, category, words, overrides = {}) {
  return candidateFor(input, {
    category, observedAnswer: input.criteria.expectedAnswer, exchangeEvidence: 'not_established',
    exchangeQuantities: null, ...overrides
  }, words);
}

function invalidResult(fn) {
  assert.throws(fn, error => error instanceof Error && error.code === 'INTERPRETATION_INVALID');
}

test('lesson is complete, closed, copied, and contains only the approved ordered problems', () => {
  assert.equal(lesson.targets.length, 2);
  assert.equal(lesson.actions.length, 18);
  assert.deepEqual(lesson.targets.map(target => [target.practice, ...target.checks, target.review].map(p => [p.left, p.right])), [
    [[27, 18], [36, 27], [47, 25], [58, 17], [48, 26]],
    [[42, 17], [54, 28], [62, 18], [81, 57], [83, 46]]
  ]);
  const source = structuredClone(lesson);
  const copy = validateLesson(source);
  copy.targets[0].practice.left = 99;
  assert.equal(source.targets[0].practice.left, 27);
  for (const mutate of [
    value => { value.unknown = true; },
    value => { value.targets[0].checks.pop(); },
    value => { value.targets[0].checks[0].left = 27; },
    value => { value.targets[1].review.prompt = 'Try an easier problem'; },
    value => { value.actions[0].marksAssisted = true; },
    value => { value.actions.pop(); },
    value => { value.actions[1] = value.actions[0]; },
    value => { value.actions.find(a => a.actionId === 'teach-addition-exchange').stepTemplates[1] = 'Invent a strategy.'; }
  ]) {
    const changed = structuredClone(lesson);
    mutate(changed);
    assert.throws(() => validateLesson(changed), TypeError);
  }
});

test('criteria use actual operands and have exactly the adapter contract fields', () => {
  assert.deepEqual(criteriaFor(lesson.targets[0].checks[0]), {
    criterionId: 'conserve-value-addition', expectedAnswer: 63,
    before: {tens: 5, ones: 13}, conservedAfter: {tens: 6, ones: 3},
    difficultyCode: 'addition-omitted-ten'
  });
  assert.deepEqual(criteriaFor(lesson.targets[1].review), {
    criterionId: 'conserve-value-subtraction', expectedAnswer: 37,
    before: {tens: 8, ones: 3}, conservedAfter: {tens: 7, ones: 13},
    difficultyCode: 'subtraction-value-changed'
  });
  assert.throws(() => criteriaFor({operation: 'subtract', left: 80, right: 17}), TypeError);
  assert.throws(() => criteriaFor({operation: 'add', left: 23, right: 14}), TypeError);
});

for (const targetIndex of [0, 1]) {
  for (const purpose of ['practice', 'check', 'review']) {
    for (const assisted of [false, true]) {
      test(`ordered classification ${lesson.targetIds[targetIndex]} ${purpose} help=${assisted}`, () => {
        const input = inputFor(targetIndex, purpose, assisted);
        const success = classifyCandidate(candidateFor(input), input);
        assert.equal(success.outcome, 'E');
        assert.equal(success.answerCorrect, true);
        assert.equal(success.exchangeCovered, true);
        assert.equal(success.qualifies, purpose !== 'practice' && !assisted);
        if (targetIndex === 1 && purpose === 'review' && !assisted) {
          assert.equal(success.teachingMoveId, 'finish-session');
        } else assert.notEqual(success.teachingMoveId, 'finish-session', 'known provider advice cannot select the transition');
      });
    }
  }
}

test('all authored check/review difficulties use dynamic quantities, not practice constants', () => {
  for (const targetIndex of [0, 1]) {
    for (const purpose of ['practice', 'check', 'review']) {
      for (const assisted of [false, true]) {
        const count = purpose === 'check' ? 3 : 1;
        for (let index = 0; index < count; index += 1) {
          const input = inputFor(targetIndex, purpose, assisted, index);
          const candidate = difficultyFor(input);
          const result = classifyCandidate(candidate, input);
          assert.equal(result.outcome, 'D');
          assert.equal(result.qualifies, false);
          assert.equal(result.exchangeCovered, true);
          assert.equal(result.teachingMoveId, targetIndex === 0 ? 'teach-addition-exchange' : 'teach-subtraction-exchange');
          assert.equal(result.feedback, '', 'worked help is not revealed by classification');
          candidate.observedAnswer = null;
          assert.equal(classifyCandidate(candidate, input).outcome, 'D', 'coherent incomplete difficulty counts');
        }
      }
    }
  }
});

test('current, fresh, unaided checks/reviews are the only qualifiers', () => {
  for (const purpose of ['check', 'review']) {
    for (const field of ['freshAtIssue', 'currentAtCommit']) {
      const input = inputFor(0, purpose);
      input.problem[field] = false;
      const result = classifyCandidate(candidateFor(input), input);
      assert.equal(result.outcome, 'E');
      assert.equal(result.qualifies, false);
      assert.doesNotMatch(result.feedback, /on your own|used help/);
    }
  }
});

test('classification consumes validated observations without requiring a second full adapter boundary', () => {
  const input = inputFor(0, 'check');
  const candidate = validateCandidate(candidateFor(input), input);
  const partial = {problem: input.problem, work: {imageSourceId: null}, turns: input.turns};
  assert.equal(classifyCandidate(candidate, partial).qualifies, true);
  assert.equal(classifyCandidate(candidate, {problem: input.problem}).outcome, 'E');
});

test('exact feedback distinguishes practice, independent, assisted, and review success', () => {
  const cases = [
    ['practice', false, 'You showed how the amount stays the same.'],
    ['check', false, 'You showed it on a new problem on your own.'],
    ['check', true, 'You used help on this problem. Try a new one on your own.'],
    ['review', false, 'You showed it again on your own.'],
    ['review', true, 'You used help this time. Your teacher can see what still needs checking.']
  ];
  for (const [purpose, helped, feedback] of cases) {
    const input = inputFor(0, purpose, helped);
    assert.equal(classifyCandidate(candidateFor(input), input).feedback, feedback);
  }
});

test('all neutral category rows dispatch on evidence, not the proposed action', () => {
  for (const targetIndex of [0, 1]) {
    for (const purpose of ['practice', 'check', 'review']) {
      for (const assisted of [false, true]) {
        const input = inputFor(targetIndex, purpose, assisted);
        const answer = input.criteria.expectedAnswer;
        const cases = [
          ['correct_answer_without_reasoning', `My answer is ${answer}. I guessed.`, 'ask-strategy'],
          ['procedure_without_exchange_explanation', `I write 5, carry one, and add. My answer is ${answer}.`,
            targetIndex === 0 ? 'ask-carried-value' : 'ask-value-check'],
          ['procedure_without_exchange_explanation', `I use the written procedure. My answer is ${answer}.`,
            targetIndex === 0 ? 'ask-exchange-evidence' : 'ask-value-check'],
          ['valid_alternative_strategy', `I counted on. My answer is ${answer}.`, 'ask-exchange-evidence']
        ];
        for (const [category, words, action] of cases) {
          const result = classifyCandidate(neutralFor(input, category, words), input);
          assert.equal(result.outcome, 'N');
          assert.equal(result.teachingMoveId, action);
          assert.equal(result.exchangeCovered, false);
          assert.equal(result.qualifies, false);
        }
        const unfinished = candidateFor(input, {observedAnswer: null});
        assert.equal(classifyCandidate(unfinished, input).outcome, 'N');
        assert.equal(classifyCandidate(unfinished, input).exchangeCovered, true);
        assert.equal(classifyCandidate(unfinished, input).teachingMoveId, 'ask-strategy');
      }
    }
  }
});

test('alternative methods with an explicit equal trade qualify, including other conserving representations', () => {
  for (const index of [0, 1]) {
    const input = inputFor(index, 'check');
    const candidate = candidateFor(input, {category: 'valid_alternative_strategy'});
    assert.equal(classifyCandidate(candidate, input).qualifies, true);
  }
  const input = inputFor();
  const candidate = candidateFor(input, {
    category: 'valid_alternative_strategy',
    exchangeQuantities: {before: {tens: 2, ones: 25}, after: {tens: 3, ones: 15}}
  }, '2 tens and 25 ones are equal to 3 tens and 15 ones. My answer is 45.');
  assert.equal(classifyCandidate(candidate, input).outcome, 'E');
});

test('localized arithmetic slips are C, wrong answers or unexplained mismatches are U', () => {
  for (const targetIndex of [0, 1]) {
    for (const purpose of ['practice', 'check', 'review']) {
      for (const assisted of [false, true]) {
        const input = inputFor(targetIndex, purpose, assisted);
        const c = input.criteria;
        const wrong = c.expectedAnswer - 1;
        const words = `${c.before.tens} tens and ${c.before.ones} ones become ${c.conservedAfter.tens} tens and ${c.conservedAfter.ones} ones. I wrote ${wrong} instead of ${c.expectedAnswer}. My answer is ${wrong}.`;
        for (const category of ['supported_exchange', 'valid_alternative_strategy', 'computation_error']) {
          const slip = candidateFor(input, {category, observedAnswer: wrong}, words);
          const result = classifyCandidate(slip, input);
          assert.equal(result.outcome, 'C');
          assert.equal(result.exchangeCovered, true);
          assert.equal(result.qualifies, false);
          assert.equal(result.teachingMoveId, 'recheck-computation');
        }
        const unexplained = neutralFor(input, 'computation_error',
          `${input.problem.left} ${targetIndex === 0 ? '+' : '-'} ${input.problem.right} = ${wrong}.`,
          {observedAnswer: wrong});
        assert.equal(classifyCandidate(unexplained, input).outcome, 'U');
        const explicit = neutralFor(input, 'computation_error', `I calculated 8 + 7 = 14. My answer is ${wrong}.`, {observedAnswer: wrong});
        assert.equal(classifyCandidate(explicit, input).outcome, 'C');
        assert.equal(classifyCandidate(explicit, input).exchangeCovered, false);
      }
    }
  }
});

test('uncertainty and contradictory reasoning precede apparent correctness or difficulty', () => {
  for (const targetIndex of [0, 1]) {
    const input = inputFor(targetIndex);
    for (const recognitionStatus of ['clarify', 'conflict']) {
      const uncertain = difficultyFor(input, {recognitionStatus});
      const result = classifyCandidate(uncertain, input);
      assert.equal(result.outcome, 'U');
      assert.equal(result.exchangeCovered, false);
      assert.equal(result.feedback, 'Do these words and marks match your work? You can correct them or show more.');
    }
    const contradictory = difficultyFor(input);
    contradictory.observedAnswer = input.criteria.expectedAnswer;
    input.turns[0].text += ` My answer is ${input.criteria.expectedAnswer}.`;
    contradictory.sourceEvidence[0].quote = input.turns[0].text;
    assert.equal(classifyCandidate(contradictory, input).outcome, 'U');
    const missing = candidateFor(input, {
      category: 'needs_clarification', observedAnswer: null, exchangeEvidence: 'unclear',
      exchangeQuantities: null, sourceEvidence: []
    });
    assert.equal(classifyCandidate(missing, input).outcome, 'U');
  }
});

test('the six canonical synthetic spoken observations pass the same grounding path', () => {
  const cases = [
    [0, 'supported_exchange', 45, 'supported', {tens: 4, ones: 5},
      'Seven ones plus eight ones is fifteen ones. Ten of those ones make a ten, leaving five ones. Two tens plus one ten plus that new ten is four tens. The answer is forty-five.', 'E'],
    [1, 'supported_exchange', 25, 'supported', {tens: 3, ones: 12},
      'Forty-two is three tens and twelve ones. Twelve minus seven is five. Three tens minus one ten is two tens. The answer is twenty-five.', 'E'],
    [0, 'addition_omitted_ten', 35, 'contradicted', {tens: 3, ones: 5},
      'Seven plus eight is fifteen. I keep five ones and ignore the ten in fifteen. Two tens plus one ten is three tens. My answer is thirty-five.', 'D'],
    [1, 'subtraction_value_changed', 35, 'contradicted', {tens: 4, ones: 12},
      'Forty-two becomes four tens and twelve ones. Twelve minus seven is five, and four tens minus one ten is three tens. My answer is thirty-five.', 'D'],
    [0, 'procedure_without_exchange_explanation', 45, 'not_established', null,
      'I write five, carry one, and add the top numbers and that one. The answer is forty-five.', 'N'],
    [0, 'correct_answer_without_reasoning', 45, 'not_established', null,
      'My answer is forty-five. I guessed. I do not know why.', 'N']
  ];
  for (const [targetIndex, category, observedAnswer, exchangeEvidence, after, words, outcome] of cases) {
    const input = inputFor(targetIndex);
    input.turns[0].source = 'transcription';
    const candidate = candidateFor(input, {
      category, observedAnswer, exchangeEvidence,
      exchangeQuantities: after ? {before: input.criteria.before, after} : null
    }, words);
    assert.equal(classifyCandidate(candidate, input).outcome, outcome);
  }
});

test('closed candidate/source/quantity schemas and all enum, scalar, size, action and target limits', () => {
  const mutations = [
    c => { c.canClearFinding = true; }, c => { delete c.reasoningSummary; },
    c => { c.category = 'mastered'; }, c => { c.recognitionStatus = 'confident'; },
    c => { c.exchangeEvidence = 'yes'; }, c => { c.observedAnswer = -0; },
    c => { c.observedAnswer = 4.5; }, c => { c.observedAnswer = Number.MAX_SAFE_INTEGER + 1; },
    c => { c.teachingMoveId = 'invented-help'; }, c => { c.reasoningSummary = 'x'.repeat(501); },
    c => { c.reasoningSummary = '\ud800'; }, c => { c.neutralReadback = 'x'.repeat(1201); },
    c => { c.sourceEvidence = Array(11).fill(c.sourceEvidence[0]); },
    c => { c.sourceEvidence = []; }, c => { c.sourceEvidence[0].extra = 1; },
    c => { c.sourceEvidence[0].quote = 'paraphrased text'; },
    c => { c.sourceEvidence[0].quote = ''; }, c => { c.sourceEvidence[0].sourceId = 'other-turn'; },
    c => { c.sourceEvidence[0].description = 'x'.repeat(501); },
    c => { c.sourceEvidence[0].sourceKind = 'provider'; },
    c => { c.exchangeQuantities.after.tens = 1000; },
    c => { c.exchangeQuantities.after.ones = -1; },
    c => { c.exchangeQuantities.after.tens = -0; },
    c => { c.exchangeQuantities.after.total = 45; },
    c => { c.exchangeQuantities.after = {tens: 8, ones: 8}; },
    c => { c.category = 'subtraction_value_changed'; }
  ];
  for (const mutate of mutations) {
    const input = inputFor();
    const candidate = candidateFor(input);
    mutate(candidate);
    invalidResult(() => validateCandidate(candidate, input));
  }
  const input = inputFor();
  const candidate = candidateFor(input);
  const fresh = validateCandidate(candidate, input);
  fresh.exchangeQuantities.after.ones = 900;
  assert.equal(candidate.exchangeQuantities.after.ones, 5);
  input.criteria.expectedAnswer = 999;
  invalidResult(() => validateCandidate(candidate, input));
});

test('written work alone establishes reasoning with immutable exact-substring citations', () => {
  const input = inputFor(0, 'check');
  const candidate = candidateFor(input);
  input.work.writtenWorking = input.turns[0].text;
  input.work.writtenSourceId = `${input.job.attemptId}:work:1:written`;
  input.turns[0].text = 'I showed the trade in my work.';
  candidate.sourceEvidence = [{
    sourceKind: 'written_work', sourceId: input.work.writtenSourceId,
    quote: input.work.writtenWorking, description: ''
  }];
  assert.equal(classifyCandidate(candidate, input).qualifies, true);
  for (const sourceId of [
    `${input.job.attemptId}:work:2:written`, 'other-attempt:work:1:written', null
  ]) {
    const changed = structuredClone(candidate);
    changed.sourceEvidence[0].sourceId = sourceId;
    invalidResult(() => validateCandidate(changed, input));
  }
  const changed = structuredClone(candidate);
  changed.sourceEvidence[0].quote = input.work.writtenWorking.replace('become', 'equals');
  invalidResult(() => validateCandidate(changed, input));
  input.turns[0].text = 'I used 5 tens and 13 ones, but made 5 tens and 3 ones. My answer is 53.';
  assert.equal(classifyCandidate(candidate, input).outcome, 'U', 'do not silently prefer correct written evidence');
});

test('image citations are current and readback remains neutral; image/text conflicts are U', () => {
  const input = inputFor();
  const candidate = candidateFor(input);
  input.work.image = {bytes: new Uint8Array([1]), sha256: '0'.repeat(64), width: 1, height: 1};
  input.work.imageSourceId = `${input.job.attemptId}:work:1`;
  candidate.neutralReadback = 'There are labels for 4 tens and 5 ones.';
  candidate.sourceEvidence.push({
    sourceKind: 'image', sourceId: input.work.imageSourceId, quote: null,
    description: '3 tens and 15 ones become 4 tens and 5 ones; written answer 45.'
  });
  assert.equal(classifyCandidate(candidate, input).outcome, 'E');
  const changed = structuredClone(candidate);
  changed.sourceEvidence[1].description = '3 tens and 15 ones become 3 tens and 5 ones; written answer 35.';
  assert.equal(classifyCandidate(changed, input).outcome, 'U');
  for (const mutate of [
    c => { c.sourceEvidence[1].sourceId = `${input.job.attemptId}:work:2`; },
    c => { c.sourceEvidence[1].quote = 'invented image quotation'; },
    c => { c.sourceEvidence[1].description = ''; },
    c => { c.neutralReadback = ''; },
    c => { c.neutralReadback = 'Your answer is correct. The amount stays the same.'; }
  ]) {
    const invalid = structuredClone(candidate);
    mutate(invalid);
    invalidResult(() => validateCandidate(invalid, input));
  }
  input.work.image = null;
  input.work.imageSourceId = null;
  invalidResult(() => validateCandidate(candidate, input));
});

test('grounded wrong quantities are admitted but unsupported claims remain neutral', () => {
  const input = inputFor();
  const candidate = candidateFor(input, {
    observedAnswer: 85, exchangeQuantities: {before: {tens: 3, ones: 15}, after: {tens: 8, ones: 5}}
  }, '3 tens and 15 ones become 8 tens and 5 ones. My answer is 85.');
  assert.deepEqual(validateCandidate(candidate, input), candidate);
  assert.equal(classifyCandidate(candidate, input).outcome, 'U');
  const negative = neutralFor(input, 'needs_clarification', 'My answer is -5.', {observedAnswer: -5});
  assert.equal(validateCandidate(negative, input).observedAnswer, -5);
  assert.equal(classifyCandidate(negative, input).outcome, 'U');
});

test('all teaching frames use the actual operands, preserve value, and remove the subtraction rod', () => {
  for (const target of lesson.targets) {
    for (const problem of [target.practice, ...target.checks, target.review]) {
      const c = criteriaFor(problem);
      const actionId = target.targetId === 'addition-exchange' ? 'teach-addition-exchange' : 'teach-subtraction-exchange';
      const action = actionFor(lesson, actionId, problem);
      assert.equal(action.effect, 'current_assignment');
      assert.equal(action.marksAssisted, true, 'caller records assistance before revealing these frames');
      assert.equal(action.visual.steps.length, 4);
      assert.equal(action.visual.steps[0].split('\n')[0], action.prompt);
      assert.ok(action.visual.steps.join('\n').includes(`${c.before.tens} tens + ${c.before.ones} ones = ${c.conservedAfter.tens} tens + ${c.conservedAfter.ones} ones`));
      assert.equal(c.before.tens * 10 + c.before.ones, c.conservedAfter.tens * 10 + c.conservedAfter.ones);
      assert.ok(action.visual.steps[3].includes(`${problem.left} ${problem.operation === 'add' ? '+' : '−'} ${problem.right} = ${c.expectedAnswer}`));
      assert.doesNotMatch(action.visual.steps.join('\n'), /\{[^}]*\}/);
      if (problem.operation === 'subtract') {
        assert.match(action.visual.steps[1], /Reduce the visible rod count at the same step that adds the dots/);
        assert.match(action.visual.steps[2], /Mark and remove exactly/);
      } else assert.match(action.visual.steps[2], /Enclose exactly ten unit dots/);
    }
  }
});

test('warmups retain the current task; neutral prompts do not reveal teaching or mark help', () => {
  for (const target of lesson.targets) {
    const p = target.practice;
    for (const actionId of ['warmup-tens-ones', p.operation === 'add' ? 'warmup-addition' : 'warmup-subtraction']) {
      const action = actionFor(lesson, actionId, p);
      assert.equal(action.effect, 'current_assignment');
      assert.equal(action.marksAssisted, true);
      assert.equal(action.visual.steps.length, 3);
      assert.deepEqual(actionFor(lesson, actionId, p), action);
    }
    for (const actionId of ['ask-carried-value', 'ask-strategy', 'ask-value-check', 'ask-exchange-evidence', 'confirm-recognition']) {
      const action = actionFor(lesson, actionId, p);
      assert.equal(action.marksAssisted, false);
      assert.equal(action.effect, 'current_assignment');
      assert.equal(action.visual, null);
    }
    assert.equal(actionFor(lesson, 'request-teacher-review', p).marksAssisted, true);
    assert.equal(actionFor(lesson, 'request-teacher-review', p).effect, 'session_status');
  }
  assert.throws(() => actionFor(lesson, 'warmup-addition', lesson.targets[1].practice), TypeError);
  assert.throws(() => actionFor(lesson, 'nonexistent', lesson.targets[0].practice), TypeError);
});

test('new-task prompts are exact and contain no answer or worked exchange', () => {
  for (const target of lesson.targets) {
    for (const problem of target.checks) {
      const action = actionFor(lesson, `fresh-${problem.operation === 'add' ? 'addition' : 'subtraction'}-check`, problem);
      assert.equal(action.prompt, problem.prompt);
      assert.equal(action.visual, null);
      assert.equal(action.marksAssisted, false);
      assert.equal(action.effect, 'new_assignment');
    }
    assert.equal(actionFor(lesson, 'later-review', target.review).prompt, target.review.prompt);
  }
  const sub = lesson.targets[1];
  assert.equal(actionFor(lesson, 'start-subtraction-practice', sub.practice).prompt, sub.practice.prompt);
  for (const p of [sub.practice, ...sub.checks]) {
    assert.equal(actionFor(lesson, 'resume-subtraction-task', p).prompt, p.prompt);
  }
  assert.throws(() => actionFor(lesson, 'fresh-addition-check', sub.checks[0]), TypeError);
  assert.throws(() => actionFor(lesson, 'resume-subtraction-task', lesson.targets[0].checks[0]), TypeError);
});

function assignment(assignmentId, purpose, issuedSequence, options = {}) {
  const targetIndex = options.targetId === 'subtraction-exchange' ? 1 : 0;
  return {
    assignmentId, revision: 0, learnerId, targetId: lesson.targetIds[targetIndex],
    problem: purpose === 'check' ? lesson.targets[targetIndex].checks[0] : lesson.targets[targetIndex][purpose],
    purpose, freshAtIssue: true, state: 'current', assisted: false, assistance: [],
    activeAttemptId: null, issuedAt: '2026-11-13T00:00:00.000Z', completedAt: null,
    issuedSequence, ...options
  };
}

function judgment(judgmentId, eventSequence, assignmentId, outcome, options = {}) {
  const supported = outcome === 'E' || options.exchangeCovered === true;
  return {
    judgmentId, attemptId: `${judgmentId}-attempt`, assignmentId, targetId, learnerId,
    evidenceVersion: 1, workVersion: 1,
    category: outcome === 'D' ? 'addition_omitted_ten' : outcome === 'C' ? 'computation_error' :
      outcome === 'U' ? 'needs_clarification' : outcome === 'N' ? 'correct_answer_without_reasoning' : 'supported_exchange',
    observedAnswer: outcome === 'E' ? 63 : 53, answerCorrect: outcome === 'E',
    exchangeEvidence: outcome === 'D' ? 'contradicted' : supported ? 'supported' : 'not_established',
    recognitionStatus: outcome === 'U' ? 'conflict' : 'usable',
    sourceEvidence: [], exchangeQuantities: null, reasoningSummary: '', teachingMoveId: 'ask-strategy',
    assignmentPurpose: 'check', freshAtIssue: true, currentAtCommit: true, assisted: false,
    valid: true, eventSequence, at: `2026-11-13T00:00:${String(eventSequence).padStart(2, '0')}.000Z`,
    outcome, exchangeCovered: outcome === 'D' || supported,
    qualifies: outcome === 'E', ...options
  };
}

function correction(judgmentIds, correctionRevision = 1) {
  return {correctionId: `correction-${correctionRevision}`, targetId, judgmentIds, correctionRevision};
}

function reduce(overrides = {}) {
  return reduceTarget({learnerId, targetId, findingId: 'stable-finding', ...overrides});
}

function chronology(leftReview = false) {
  return {
    assignments: [
      assignment('practice', 'practice', 1, {state: 'completed', assisted: true,
        assistance: [{eventId: 'help', eventSequence: 3}]}),
      assignment('check', 'check', 4, {state: 'completed'}),
      assignment('sub-practice', 'practice', 6, {targetId: 'subtraction-exchange', state: 'completed'}),
      assignment('review', 'review', 9, {state: leftReview ? 'completed' : 'current'}),
      ...(leftReview ? [assignment('sub-check', 'check', 12, {targetId: 'subtraction-exchange'})] : [])
    ],
    boundaries: [{learnerId, assignmentId: 'sub-practice', eventSequence: 8, usable: true}],
    judgments: [
      judgment('J1', 2, 'practice', 'D', {assignmentPurpose: 'practice'}),
      judgment('J2', 5, 'check', 'E'),
      judgment('J3', 10, 'review', 'D', {assignmentPurpose: 'review'}),
      judgment('S1', 7, 'sub-practice', 'N', {targetId: 'subtraction-exchange', assignmentPurpose: 'practice'})
    ]
  };
}

test('empty projection has stable identity and no inferred assessment, need, independence, or review', () => {
  const projection = reduce();
  assert.equal(projection.correctionRevision, 0);
  assert.equal(projection.assessed, false);
  assert.equal(projection.pending, false);
  assert.equal(projection.finding.findingId, 'stable-finding');
  assert.equal(projection.finding.revision, 0);
  assert.equal(projection.finding.status, 'none');
  assert.equal(projection.independentStatus, 'not_demonstrated');
  assert.equal(projection.review.status, 'not_due');
});

test('difficulty, assisted correction, fresh clearing, and subsequent repeated difficulty are chronological', () => {
  const events = chronology();
  let result = reduce({judgments: events.judgments.slice(0, 1)});
  assert.equal(result.finding.status, 'active');
  assert.equal(result.independentStatus, 'recheck_required');
  const assisted = judgment('helped', 3, 'practice', 'E', {assignmentPurpose: 'practice', assisted: true, qualifies: false});
  result = reduce({judgments: [events.judgments[0], assisted]});
  assert.equal(result.finding.status, 'active');
  assert.deepEqual(result.finding.supportingJudgmentIds, ['J1']);
  result = reduce({judgments: events.judgments.slice(0, 2)});
  assert.equal(result.finding.status, 'cleared');
  assert.equal(result.finding.clearingJudgmentId, 'J2');
  assert.equal(result.independentJudgmentId, 'J2');
  assert.equal(result.review.status, 'pending_intervening');
  result = reduce(events);
  assert.equal(result.finding.status, 'active');
  assert.deepEqual(result.finding.supportingJudgmentIds, ['J3']);
  assert.equal(result.finding.clearingJudgmentId, null);
  assert.equal(result.independentJudgmentId, null);
  assert.equal(result.review.status, 'unsuccessful');
  assert.equal(result.review.dueAfterAssignmentId, 'check');
});

test('spacing requires a usable completed task issued after qualification, not an empty or already-open task', () => {
  const events = chronology();
  events.judgments = events.judgments.filter(judgment => judgment.judgmentId !== 'J3');
  let result = reduce(events);
  assert.equal(result.review.status, 'due');
  for (const mutate of [
    e => { e.boundaries[0].usable = false; },
    e => { e.boundaries[0].learnerId = 'B'; },
    e => { e.boundaries[0].eventSequence = 10; },
    e => { e.assignments[2].issuedSequence = 3; }
  ]) {
    const changed = structuredClone(events);
    mutate(changed);
    result = reduce(changed);
    assert.equal(result.review.status, 'pending_intervening');
  }
});

test('corrections remove intervening eligibility, including an explicit boundary judgmentId', () => {
  const events = chronology();
  events.judgments = events.judgments.filter(judgment => judgment.judgmentId !== 'J3');
  events.boundaries[0].judgmentId = 'S1';
  assert.equal(reduce(events).review.status, 'due');
  const corrected = {...events, corrections: [{
    correctionId: 'sub-correction', targetId: 'subtraction-exchange',
    judgmentIds: ['S1'], correctionRevision: 1
  }]};
  assert.equal(reduce(corrected).review.status, 'pending_intervening');
  assert.equal(reduce(corrected).correctionRevision, 0, 'other-target correction does not change this target revision');
  events.boundaries[0].eventSequence = 9;
  events.assignments[3].issuedSequence = 10;
  events.judgments.push(judgment('S2', 8, 'sub-practice', 'N', {targetId: 'subtraction-exchange'}));
  assert.equal(reduce(corrected).review.status, 'pending_intervening', 'a bound invalid judgment cannot be replaced implicitly');
  delete events.boundaries[0].judgmentId;
  assert.equal(reduce(corrected).review.status, 'due', 'without a bound identity another remaining usable judgment suffices');
  const successful = chronology();
  successful.judgments[2] = judgment('review-success', 10, 'review', 'E', {assignmentPurpose: 'review'});
  assert.equal(reduce(successful).review.status, 'completed');
  successful.corrections = corrected.corrections;
  const replayed = reduce(successful);
  assert.equal(replayed.review.status, 'pending_pool', 'correction cannot preserve a falsely spaced successful-review claim');
  assert.equal(replayed.independentJudgmentId, 'review-success', 'fresh unaided evidence itself remains valid');
});

for (const leftReview of [false, true]) {
  test(`correction A retracts only J3 ${leftReview ? 'after' : 'before'} leaving review`, () => {
    const events = chronology(leftReview);
    const before = structuredClone(events);
    const result = reduce({...events, corrections: [correction(['J3'])]});
    assert.equal(result.correctionRevision, 1);
    assert.equal(result.finding.status, 'cleared');
    assert.deepEqual(result.finding.supportingJudgmentIds, []);
    assert.equal(result.finding.clearingJudgmentId, 'J2');
    assert.equal(result.independentJudgmentId, 'J2');
    assert.equal(result.assessed, true);
    assert.equal(result.review.status, leftReview ? 'pending_pool' : 'due');
    assert.equal(result.needsClarification, !leftReview);
    assert.deepEqual(result.finding.historyJudgmentIds, ['J1', 'J2', 'J3']);
    assert.deepEqual(events, before, 'replay cannot mutate history or rewind navigation');
  });

  test(`correction B retracts only J2 ${leftReview ? 'after' : 'before'} leaving review`, () => {
    const events = chronology(leftReview);
    const result = reduce({...events, corrections: [correction(['J2'])]});
    assert.equal(result.correctionRevision, 1);
    assert.equal(result.finding.status, 'active');
    assert.deepEqual(result.finding.supportingJudgmentIds, ['J1', 'J3']);
    assert.equal(result.finding.clearingJudgmentId, null);
    assert.equal(result.independentStatus, 'recheck_required');
    assert.equal(result.independentJudgmentId, null);
    assert.equal(result.assessed, true);
    assert.equal(result.review.status, 'unsuccessful');
    assert.equal(result.review.dueAfterAssignmentId, null);
    assert.equal(result.needsClarification, false);
  });
}

test('J4 repair qualifies chronologically, clears only valid support, and cannot recycle the reserved review', () => {
  const events = chronology(true);
  events.assignments.push(assignment('repair', 'check', 14));
  events.judgments.push(judgment('J4', 15, 'repair', 'E'));
  const result = reduce({...events, corrections: [correction(['J2'])]});
  assert.equal(result.finding.status, 'cleared');
  assert.equal(result.finding.clearingJudgmentId, 'J4');
  assert.equal(result.independentJudgmentId, 'J4');
  assert.equal(result.review.status, 'pending_pool');
  assert.equal(result.review.dueAfterAssignmentId, 'repair');
  events.judgments.at(-1).assisted = true;
  const helped = reduce({...events, corrections: [correction(['J2'])]});
  assert.equal(helped.finding.status, 'active');
  assert.equal(helped.review.status, 'unsuccessful');
});

test('retraction is not learning; removing difficulty, success, or both replays all remaining judgments', () => {
  const events = chronology();
  const retracted = reduce({...events, corrections: [correction(['J1', 'J3'])]});
  assert.equal(retracted.finding.status, 'retracted');
  assert.equal(retracted.finding.clearingJudgmentId, null);
  assert.equal(retracted.independentJudgmentId, 'J2');
  const active = reduce({...events, corrections: [correction(['J3']), correction(['J2'], 2)]});
  assert.equal(active.correctionRevision, 2);
  assert.deepEqual(active.finding.supportingJudgmentIds, ['J1']);
  assert.equal(active.finding.status, 'active');
  const empty = reduce({...events, corrections: [correction(['J1', 'J2', 'J3'], 55)]});
  assert.equal(empty.correctionRevision, 1, 'count correction events, not their claimed revision field');
  assert.equal(empty.finding.status, 'retracted');
  assert.equal(empty.assessed, false);
  assert.equal(empty.independentStatus, 'recheck_required');
});

test('valid review success completes only a valid spaced cycle; missing or removed anchor creates pending_pool', () => {
  const events = chronology();
  events.judgments[2] = judgment('J3', 10, 'review', 'E', {assignmentPurpose: 'review'});
  const result = reduce(events);
  assert.equal(result.review.status, 'completed');
  assert.equal(result.review.completedAssignmentId, 'review');
  assert.equal(result.independentJudgmentId, 'J3');
  assert.equal(result.finding.clearingJudgmentId, 'J3');
  const removedAnchor = reduce({...events, corrections: [correction(['J2'])]});
  assert.equal(removedAnchor.independentJudgmentId, 'J3');
  assert.equal(removedAnchor.finding.status, 'cleared');
  assert.equal(removedAnchor.review.status, 'pending_pool');
  assert.equal(removedAnchor.review.completedAssignmentId, null);
  const noIntervening = reduce({...events, boundaries: []});
  assert.equal(noIntervening.review.status, 'pending_pool');
});

test('review C/N/assisted E is unsuccessful without inventing a finding; neutral same-review success can supersede it', () => {
  for (const outcome of ['C', 'N', 'E', 'U']) {
    const events = chronology();
    events.judgments[2] = judgment('review-result', 10, 'review', outcome, {
      assignmentPurpose: 'review', assisted: outcome === 'E', qualifies: false
    });
    const result = reduce(events);
    assert.equal(result.finding.status, 'cleared');
    assert.equal(result.independentJudgmentId, 'J2');
    assert.equal(result.review.status, outcome === 'U' ? 'due' : 'unsuccessful');
    if (outcome !== 'E') {
      const beforeSuccess = structuredClone(events);
      events.judgments.push(judgment('review-success', 11, 'review', 'E', {assignmentPurpose: 'review'}));
      assert.equal(reduce(events).review.status, 'completed');
      if (outcome === 'U') {
        beforeSuccess.assignments[3].state = 'completed';
        beforeSuccess.assignments[3].assisted = true;
        assert.equal(reduce(beforeSuccess).review.status, 'unsuccessful');
      }
    }
  }
});

test('repair after unsuccessful review opens a new pending_pool cycle even if older independent evidence survived', () => {
  const events = chronology();
  events.assignments[3].state = 'completed';
  events.judgments[2] = judgment('review-incomplete', 10, 'review', 'N', {assignmentPurpose: 'review'});
  assert.equal(reduce(events).independentJudgmentId, 'J2');
  events.assignments.push(assignment('repair', 'check', 12));
  events.judgments.push(judgment('repair-success', 13, 'repair', 'E'));
  assert.equal(reduce(events).review.status, 'pending_pool');
  assert.equal(reduce(events).review.dueAfterAssignmentId, 'repair');
});

test('repeated qualifying checks update evidence but do not open repeated review cycles', () => {
  const events = chronology();
  events.judgments[2] = judgment('review-success', 10, 'review', 'E', {assignmentPurpose: 'review'});
  events.assignments[3].state = 'completed';
  events.assignments.push(assignment('extra-check', 'check', 12));
  events.judgments.push(judgment('extra-success', 13, 'extra-check', 'E'));
  const result = reduce(events);
  assert.equal(result.independentJudgmentId, 'extra-success');
  assert.equal(result.review.status, 'completed');
  assert.equal(result.review.dueAfterAssignmentId, 'check');
  assert.equal(result.review.completedAssignmentId, 'review');
});

test('immutable assistance at commitment is checked, never inferred from the current assisted screen', () => {
  const a = assignment('check', 'check', 1, {
    assisted: true, assistance: [{eventId: 'later-help', eventSequence: 4}]
  });
  const j = judgment('success', 2, 'check', 'E');
  assert.equal(reduce({assignments: [a], judgments: [j]}).independentStatus, 'demonstrated');
  a.assistance[0].eventSequence = 1;
  assert.equal(reduce({assignments: [a], judgments: [j]}).independentStatus, 'not_demonstrated');
  a.assistance = [];
  j.assistanceEventIds = ['observed-help'];
  assert.equal(reduce({assignments: [a], judgments: [j]}).independentStatus, 'not_demonstrated');
});

test('coverage and independence are distinct; uncertain work preserves earlier supported evidence', () => {
  const records = [
    judgment('procedure', 1, 'a', 'N'),
    judgment('uncertain', 2, 'a', 'U'),
    judgment('slip', 3, 'a', 'C', {exchangeCovered: true}),
    judgment('unfinished', 4, 'a', 'N', {exchangeCovered: true})
  ];
  assert.equal(reduce({judgments: records.slice(0, 2)}).assessed, false);
  assert.equal(reduce({judgments: records.slice(0, 3)}).assessed, true);
  assert.equal(reduce({judgments: records}).independentStatus, 'not_demonstrated');
  const result = reduce({judgments: records, corrections: [correction(['slip', 'unfinished'])]});
  assert.equal(result.assessed, false);
});

test('reduction uses eventSequence, supports public-only records, and isolates learner and target histories', () => {
  const events = chronology();
  const expected = reduce(events);
  events.judgments.reverse();
  events.judgments.push(judgment('other-learner', 30, 'foreign', 'D', {learnerId: 'B'}));
  events.judgments.push(judgment('other-target', 31, 'foreign', 'D', {targetId: 'subtraction-exchange'}));
  assert.deepEqual(reduce(events), expected);
  const publicOnly = judgment('public-success', 1, 'a', 'E');
  delete publicOnly.outcome;
  delete publicOnly.qualifies;
  delete publicOnly.exchangeCovered;
  assert.equal(reduce({judgments: [publicOnly]}).independentStatus, 'demonstrated');
  const other = reduceTarget({
    learnerId, targetId: 'subtraction-exchange', findingId: 'sub-finding',
    judgments: events.judgments, assignments: events.assignments, corrections: [correction(['J2'])]
  });
  assert.equal(other.correctionRevision, 0);
  assert.deepEqual(other.finding.historyJudgmentIds, ['S1', 'other-target']);
  assert.equal(other.finding.code, 'subtraction-value-changed');
});

function coreHarness(t) {
  const core = createSessionState({
    config: loadConfig({ env: { ASSESSMENT_MODE: 'fixture' } }),
    lesson, now: () => new Date('2026-11-13T20:00:00Z')
  });
  t.after(() => core.close());
  const envelope = (key = randomUUID()) => {
    const context = core.context();
    return { runId: context.runId, sessionId: context.sessionId, idempotencyKey: key };
  };
  const assignmentEnvelope = (who = 'A', key) => {
    const snapshot = core.student(who);
    return {
      ...envelope(key), learnerId: who, assignmentId: snapshot.assignment.assignmentId,
      expectedAssignmentRevision: snapshot.assignment.revision,
      expectedTargetCorrectionRevision: snapshot.targets.find(target => target.targetId === snapshot.assignment.targetId).correctionRevision
    };
  };
  const attemptEnvelope = (attemptId, key) => {
    const attempt = core.teacher().learners.flatMap(learner => learner.attempts).find(item => item.attemptId === attemptId);
    return { ...assignmentEnvelope(attempt.learnerId, key), expectedEvidenceVersion: attempt.evidenceVersion };
  };
  const submitWork = (options = {}, who = 'A') => core.submit({
    ...assignmentEnvelope(who), attemptId: randomUUID(), imagePngBase64: null, strokes: [],
    writtenWorking: 'My math work.', explanationMode: 'written', initialText: 'I showed my work.', ...options
  });
  const act = (actionId, who = 'A', key) => core.next({ ...assignmentEnvelope(who, key), actionId });
  const sourceCandidate = (input, outcome = 'E') => {
    const c = input.criteria;
    const after = outcome === 'D'
      ? { tens: c.before.tens, ones: c.before.ones + (input.problem.operation === 'add' ? -10 : 10) }
      : c.conservedAfter;
    const answer = c.expectedAnswer + (outcome === 'D' ? input.problem.operation === 'add' ? -10 : 10 : 0);
    return {
      category: outcome === 'U' ? 'needs_clarification' : outcome === 'D'
        ? input.problem.operation === 'add' ? 'addition_omitted_ten' : 'subtraction_value_changed' : 'supported_exchange',
      observedAnswer: outcome === 'U' ? null : answer,
      exchangeEvidence: outcome === 'U' ? 'unclear' : outcome === 'D' ? 'contradicted' : 'supported',
      recognitionStatus: outcome === 'U' ? 'clarify' : 'usable',
      sourceEvidence: outcome === 'U' ? [] : [{
        sourceKind: 'turn', sourceId: input.turns.at(-1).turnId,
        quote: input.turns.at(-1).text, description: ''
      }],
      exchangeQuantities: outcome === 'U' ? null : { before: c.before, after },
      neutralReadback: input.work.image ? 'There are marks on a white board.' : '',
      reasoningSummary: outcome === 'U' ? 'More evidence is needed.' : 'The quantities are explicitly stated.',
      teachingMoveId: outcome === 'D' ? input.problem.operation === 'add'
        ? 'teach-addition-exchange' : 'teach-subtraction-exchange' : 'ask-strategy'
    };
  };
  const words = (who, outcome = 'E') => {
    const snapshot = core.student(who);
    const c = criteriaFor(snapshot.assignment.problem);
    const after = outcome === 'D'
      ? { tens: c.before.tens, ones: c.before.ones + (snapshot.assignment.problem.operation === 'add' ? -10 : 10) }
      : c.conservedAfter;
    const answer = c.expectedAnswer + (outcome === 'D' ? snapshot.assignment.problem.operation === 'add' ? -10 : 10 : 0);
    return outcome === 'U' ? 'I am not sure.' :
      `${c.before.tens} tens and ${c.before.ones} ones become ${after.tens} tens and ${after.ones} ones. My answer is ${answer}.`;
  };
  const assess = (attemptId) => {
    const snapshot = core.teacher().learners.flatMap(learner => learner.attempts).find(item => item.attemptId === attemptId);
    return core.startAssessment(attemptId, {
      ...attemptEnvelope(attemptId), confirmedTurns: snapshot.turns.map(turn => ({ turnId: turn.turnId, text: turn.confirmedText ?? turn.recognizedText }))
    });
  };
  const judge = (outcome = 'E', who = 'A', options = {}) => {
    const submitted = submitWork({ initialText: words(who, outcome), ...options }, who);
    const attemptId = submitted.result.attemptId;
    const started = assess(attemptId);
    const input = core.jobInput(started.result.jobId);
    assert.equal(core.settleAssessment(started.result.jobId, sourceCandidate(input, outcome)), true);
    return core.student(who).judgments.at(-1);
  };
  const retractJudgments = (judgmentIds, target = 'addition-exchange', who = 'A') => {
    const projection = core.student(who).targets.find(item => item.targetId === target);
    return core.retract(projection.finding.findingId, {
      ...envelope(), learnerId: who, targetId: target,
      expectedFindingRevision: projection.finding.revision, expectedTargetCorrectionRevision: projection.correctionRevision,
      judgmentIds, reason: 'Unsupported interpretation.'
    });
  };
  return { core, envelope, assignmentEnvelope, attemptEnvelope, submitWork, act, words, assess, judge, sourceCandidate, retractJudgments };
}

function corePng(raster = Buffer.from([0, 0, 0, 0, 255]), width = 1, height = 1) {
  const makeChunk = (name, data) => {
    const result = Buffer.alloc(data.length + 12);
    result.writeUInt32BE(data.length);
    result.write(name, 4, 'ascii');
    data.copy(result, 8);
    result.writeUInt32BE(crc32(result.subarray(4, -4)), result.length - 4);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', header), makeChunk('IDAT', deflateSync(raster)), makeChunk('IEND', Buffer.alloc(0))]);
}

test('configuration is bounded, project-only, and credential-free in explicit fixture mode', () => {
  const directory = mkdtempSync(join(tmpdir(), 'explainback-config-'));
  try {
    const inherited = { OPENAI_API_KEY: 'unrelated-secret-must-not-be-used' };
    assert.throws(() => loadConfig({ projectDir: directory, env: inherited }), /this project's/);
    const fixture = loadConfig({ projectDir: directory, env: { ...inherited, ASSESSMENT_MODE: 'fixture' } });
    assert.equal(fixture.openaiApiKey, null);
    assert.equal(fixture.port, 3000);
    writeFileSync(join(directory, '.env'), 'OPENAI_API_KEY=project-only-test-key\nPORT=3101\n', { mode: 0o600 });
    const live = loadConfig({ projectDir: directory, env: inherited });
    assert.equal(live.openaiApiKey, 'project-only-test-key');
    assert.equal(live.port, 3101);
    for (const PORT of ['0', '65536', '3.5', '-1', '03', 'NaN']) {
      assert.throws(() => loadConfig({ projectDir: directory, env: { ASSESSMENT_MODE: 'fixture', PORT } }));
    }
    assert.throws(() => loadConfig({ env: { ASSESSMENT_MODE: 'silent-fallback' } }));
    assert.ok(Object.isFrozen(LIMITS));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('session initializes six synthetic learners with isolated stable targets and no solutions', t => {
  const { core } = coreHarness(t);
  const snapshot = core.teacher();
  assert.equal(snapshot.rosterTotal, 6);
  assert.deepEqual(snapshot.counts.map(count => [count.assessed, count.unassessed, count.activeNeeds]), [[0, 6, 0], [0, 6, 0]]);
  assert.equal(new Set(snapshot.learners.flatMap(learner => learner.targets.map(target => target.finding.findingId))).size, 12);
  const student = core.student('A');
  assert.equal(student.assignment.problem.problemId, 'addition-practice-1');
  assert.equal(student.assignment.revision, 0);
  assert.equal(student.targets[0].independentStatus, 'not_demonstrated');
  assert.ok(student.allowedActions.some(action => action.actionId === 'teach-addition-exchange'));
  assert.ok(!student.allowedActions.some(action => action.effect === 'new_assignment'));
  assert.ok(!JSON.stringify(core.context()).includes('openaiApiKey'));
  student.assignment.problem.left = 99;
  assert.equal(core.student('A').assignment.problem.left, 27);
});

test('immutable admission is atomic and identical retries return current projections without new work', t => {
  const h = coreHarness(t);
  const options = { ...h.assignmentEnvelope(), attemptId: randomUUID(), imagePngBase64: null, strokes: [],
    writtenWorking: '27 + 18', explanationMode: 'written', initialText: 'I am thinking.' };
  const first = h.core.submit(options);
  const revision = h.core.context().revision;
  const reordered = Object.fromEntries(Object.entries(options).reverse());
  const replay = h.core.submit(reordered);
  assert.equal(replay.replayed, true);
  assert.equal(replay.result.attemptId, first.result.attemptId);
  assert.equal(h.core.context().revision, revision);
  assert.throws(() => h.core.submit({ ...options, initialText: 'different' }), error => error.code === 'IDEMPOTENCY_CONFLICT');
  assert.throws(() => h.core.submit({ ...options, idempotencyKey: randomUUID() }), error => error.code === 'REVISION_CONFLICT');
  const failed = { ...options, ...h.assignmentEnvelope(), attemptId: randomUUID(), writtenWorking: '' };
  assert.throws(() => h.core.submit(failed), error => error.code === 'INVALID_REQUEST');
  assert.equal(h.core.context().revision, revision);
  assert.equal(h.core.student('A').attempts.length, 1);
  const corrected = h.core.submit({ ...failed, writtenWorking: 'Valid work' });
  assert.equal(corrected.result.workVersion, 2);
  assert.equal(h.core.student('A').attempts.length, 2);
  assert.equal(first.result.student.attempts[0].work.writtenWorking, '27 + 18');
});

test('idempotency keys cannot collide through object prototype names or mutation routes', t => {
  const h = coreHarness(t);
  const first = h.submitWork({ idempotencyKey: '__proto__' });
  assert.equal(first.replayed, false);
  assert.throws(() => h.act('warmup-addition', 'A', '__proto__'), error => error.code === 'IDEMPOTENCY_CONFLICT');
  assert.equal(h.submitWork({ idempotencyKey: 'constructor' }).replayed, false);
});

test('help retains the assignment, records sticky assistance before exposing actual teaching steps', t => {
  const h = coreHarness(t);
  const before = h.core.student('A').assignment;
  const response = h.act('teach-addition-exchange');
  assert.equal(response.result.assignment.assignmentId, before.assignmentId);
  assert.equal(response.result.assignment.assisted, true);
  assert.equal(response.result.assignment.assistance.length, 1);
  assert.equal(response.result.performedAction.visual.steps.length, 4);
  assert.match(response.result.performedAction.visual.steps[2], /3 tens \+ 15 ones = 4 tens \+ 5 ones/);
  const assisted = h.judge();
  assert.equal(assisted.assisted, true);
  assert.equal(h.core.student('A').targets[0].independentStatus, 'not_demonstrated');
  h.act('fresh-addition-check');
  assert.equal(h.core.student('A').assignment.assisted, false);
  assert.equal(h.core.student('A').assignment.problem.problemId, 'addition-check-1');
});

function coreReviewSequence(h) {
  const first = h.judge('D');
  h.act('teach-addition-exchange');
  h.act('fresh-addition-check');
  const clearing = h.judge('E');
  assert.equal(h.core.student('A').targets[0].finding.status, 'cleared');
  assert.equal(h.core.student('A').targets[0].review.status, 'pending_intervening');
  h.act('start-subtraction-practice');
  h.judge('E');
  assert.ok(h.core.student('A').allowedActions.some(action => action.actionId === 'later-review'));
  assert.ok(!h.core.student('A').allowedActions.some(action => action.actionId === 'fresh-subtraction-check'));
  h.act('later-review');
  assert.equal(h.core.student('A').assignment.problem.problemId, 'addition-review-1');
  const reopened = h.judge('D');
  return { first, clearing, reopened };
}

test('integrated lesson counts distinct children, clears only with a fresh unaided check, and reopens on review', t => {
  const h = coreHarness(t);
  const sequence = coreReviewSequence(h);
  const target = h.core.student('A').targets[0];
  assert.equal(target.finding.status, 'active');
  assert.deepEqual(target.finding.supportingJudgmentIds, [sequence.reopened.judgmentId]);
  assert.equal(target.independentJudgmentId, null);
  assert.equal(target.review.status, 'unsuccessful');
  assert.equal(h.core.teacher().counts[0].activeNeeds, 1);
  assert.equal(h.core.teacher().counts[0].assessed, 1);
  assert.equal(h.core.teacher().counts[1].assessed, 1);
  assert.equal(h.core.student('B').targets[0].finding.active, false);
});

for (const afterLeaving of [false, true]) {
  test(`session correction A preserves work and restores clearing ${afterLeaving ? 'after' : 'before'} review navigation`, t => {
    const h = coreHarness(t);
    const { clearing, reopened } = coreReviewSequence(h);
    const reviewAssignmentId = h.core.student('A').assignment.assignmentId;
    if (afterLeaving) {
      h.act('teach-addition-exchange');
      h.act('resume-subtraction-task');
    }
    const currentId = h.core.student('A').assignment.assignmentId;
    h.retractJudgments([reopened.judgmentId]);
    const snapshot = h.core.student('A');
    assert.equal(snapshot.assignment.assignmentId, currentId);
    assert.equal(snapshot.targets[0].finding.status, 'cleared');
    assert.equal(snapshot.targets[0].independentJudgmentId, clearing.judgmentId);
    assert.equal(snapshot.targets[0].correctionRevision, 1);
    assert.equal(snapshot.targets[0].review.status, afterLeaving ? 'pending_pool' : 'due');
    assert.equal(snapshot.assignments.find(assignment => assignment.assignmentId === reviewAssignmentId).purpose, 'review');
    assert.equal(snapshot.judgments.find(judgment => judgment.judgmentId === reopened.judgmentId).valid, false);
    if (!afterLeaving) assert.equal(snapshot.attempts.at(-1).state, 'needs_clarification');
  });

  test(`session correction B requests an unused repair without rewinding ${afterLeaving ? 'after' : 'before'} navigation`, t => {
    const h = coreHarness(t);
    const { first, clearing, reopened } = coreReviewSequence(h);
    h.act('teach-addition-exchange');
    if (afterLeaving) h.act('resume-subtraction-task');
    const currentId = h.core.student('A').assignment.assignmentId;
    h.retractJudgments([clearing.judgmentId]);
    const target = h.core.student('A').targets[0];
    assert.equal(target.finding.status, 'active');
    assert.deepEqual(target.finding.supportingJudgmentIds, [first.judgmentId, reopened.judgmentId]);
    assert.equal(target.review.dueAfterAssignmentId, null);
    assert.equal(target.review.status, 'unsuccessful');
    assert.equal(h.core.student('A').assignment.assignmentId, currentId);
    if (afterLeaving) h.judge('E');
    assert.ok(h.core.student('A').allowedActions.some(action => action.actionId === 'fresh-addition-check'));
    h.act('fresh-addition-check');
    assert.equal(h.core.student('A').assignment.problem.problemId, 'addition-check-2');
    h.judge('E');
    assert.equal(h.core.student('A').targets[0].finding.status, 'cleared');
    assert.equal(h.core.student('A').targets[0].review.status, 'pending_pool');
  });
}

test('successful route spaces both reserved reviews and finishes without recycling tasks', t => {
  const h = coreHarness(t);
  h.judge();
  h.act('fresh-addition-check');
  h.judge();
  h.act('start-subtraction-practice');
  h.judge();
  h.act('later-review');
  h.judge();
  h.act('resume-subtraction-task');
  h.judge();
  h.act('fresh-addition-check');
  assert.equal(h.core.student('A').assignment.problem.problemId, 'addition-check-2');
  h.judge();
  h.act('later-review');
  assert.equal(h.core.student('A').assignment.problem.problemId, 'subtraction-review-1');
  h.judge();
  assert.deepEqual(h.core.student('A').targets.map(target => target.review.status), ['completed', 'completed']);
  h.act('finish-session');
  assert.equal(h.core.student('A').sessionStatus, 'finished');
  assert.equal(h.core.student('A').allowedActions.length, 0);
  const problems = h.core.student('A').assignments.map(assignment => assignment.problem.problemId);
  assert.equal(problems.length, new Set(problems).size);
});

test('pool exhaustion preserves the finding and offers teacher review, not a recycled check', t => {
  const h = coreHarness(t);
  for (let index = 0; index < 4; index++) {
    h.judge('D');
    h.act('teach-addition-exchange');
    if (index < 3) h.act('fresh-addition-check');
  }
  assert.ok(!h.core.student('A').allowedActions.some(action => action.effect === 'new_assignment'));
  assert.match(h.core.student('A').allowedActions.find(action => action.actionId === 'request-teacher-review').prompt, /no new problem left/);
  h.act('request-teacher-review');
  h.act('finish-session');
  assert.equal(h.core.student('A').targets[0].finding.active, true);
  assert.equal(h.core.student('A').sessionStatus, 'finished');
});

test('two-call limit rejects admission atomically; cancellation, replacement and reset discard late results', t => {
  const h = coreHarness(t);
  const first = h.submitWork({ initialText: h.words('A') });
  const firstJob = h.assess(first.result.attemptId);
  const firstInput = h.core.jobInput(firstJob.result.jobId);
  const second = h.submitWork({ initialText: h.words('B') }, 'B');
  const secondJob = h.assess(second.result.attemptId);
  const secondInput = h.core.jobInput(secondJob.result.jobId);
  const third = h.submitWork({ initialText: h.words('C') }, 'C');
  const before = h.core.context().revision;
  assert.throws(() => h.assess(third.result.attemptId), error => error.code === 'PROCESSING_BUSY');
  assert.equal(h.core.context().revision, before);
  assert.equal(h.core.student('C').attempts[0].state, 'ready_for_assessment');
  h.core.cancel(first.result.attemptId, h.attemptEnvelope(first.result.attemptId));
  assert.equal(firstInput.signal.aborted, true);
  const revision = h.core.context().revision;
  h.core.cancel(first.result.attemptId, h.attemptEnvelope(first.result.attemptId));
  assert.equal(h.core.context().revision, revision);
  assert.equal(h.core.settleAssessment(firstJob.result.jobId, h.sourceCandidate(firstInput)), false);
  const thirdJob = h.assess(third.result.attemptId);
  const thirdInput = h.core.jobInput(thirdJob.result.jobId);
  h.submitWork({}, 'C');
  assert.equal(thirdInput.signal.aborted, true);
  assert.equal(h.core.settleAssessment(thirdJob.result.jobId, h.sourceCandidate(thirdInput)), false);
  const oldContext = h.envelope();
  const newRun = h.core.reset({ ...oldContext, expectedSessionRevision: h.core.context().revision });
  assert.equal(secondInput.signal.aborted, true);
  assert.equal(h.core.settleAssessment(secondJob.result.jobId, h.sourceCandidate(secondInput)), false);
  assert.equal(newRun.runId, oldContext.runId);
  assert.notEqual(newRun.sessionId, oldContext.sessionId);
  assert.equal(newRun.revision, 0);
  assert.throws(() => h.core.reset({ ...oldContext, expectedSessionRevision: 0 }), error => error.code === 'CONTEXT_CHANGED');
  assert.equal(h.core.teacher().learners[0].attempts.length, 0);
});

test('image feedback waits for readback; admitted bytes remain immutable and are released on reset', t => {
  const h = coreHarness(t);
  const bytes = corePng();
  const submitted = h.submitWork({ initialText: h.words('A'), imagePngBase64: bytes.toString('base64') });
  const attemptId = submitted.result.attemptId;
  const started = h.assess(attemptId);
  h.core.settleAssessment(started.result.jobId, h.sourceCandidate(h.core.jobInput(started.result.jobId)));
  const snapshot = h.core.student('A');
  const attempt = snapshot.attempts[0];
  assert.equal(attempt.state, 'awaiting_readback');
  assert.equal(snapshot.judgments.length, 0);
  assert.equal(snapshot.allowedActions.length, 0);
  assert.ok(!JSON.stringify(attempt).includes('supported_exchange'));
  const retrieved = h.core.work(attemptId, 1, h.envelope());
  assert.deepEqual(retrieved, bytes);
  retrieved.fill(0);
  assert.deepEqual(h.core.work(attemptId, 1, h.envelope()), bytes);
  h.core.confirmReadback(attemptId, {
    ...h.attemptEnvelope(attemptId), candidateId: attempt.readback.candidateId, matches: true
  });
  assert.equal(h.core.student('A').judgments.length, 1);
  assert.equal(h.core.student('A').targets[0].assessed, true);
  const old = h.envelope();
  h.core.reset({ ...old, expectedSessionRevision: h.core.context().revision });
  assert.throws(() => h.core.work(attemptId, 1, old), error => error.code === 'CONTEXT_CHANGED');
  assert.throws(() => h.core.work(attemptId, 1, h.envelope()), error => error.code === 'RESOURCE_NOT_FOUND');
});

test('transcription releases audio and requires explicit transcript confirmation before assessment', t => {
  const h = coreHarness(t);
  const submitted = h.submitWork({ explanationMode: 'spoken', initialText: null });
  const attemptId = submitted.result.attemptId;
  const turnId = submitted.result.turnId;
  const audio = { mimeType: 'audio/webm;codecs=opus', bytes: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0]) };
  const job = h.core.startTranscription(attemptId, turnId, h.attemptEnvelope(attemptId), audio);
  assert.equal(h.core.jobInput(job.result.jobId).audio.bytes.length, 5);
  assert.equal(h.core.student('A').attempts[0].state, 'transcribing');
  assert.throws(() => h.assess(attemptId), error => error.code === 'INVALID_TRANSITION');
  h.core.settleTranscription(job.result.jobId, h.words('A'));
  assert.throws(() => h.core.jobInput(job.result.jobId), error => error.code === 'INVALID_TRANSITION');
  assert.equal(h.core.student('A').attempts[0].state, 'awaiting_transcript_review');
  assert.equal(h.core.student('A').judgments.length, 0);
  const assessment = h.assess(attemptId);
  assert.equal(h.core.student('A').attempts[0].turns[0].confirmation, 'confirmed');
  const input = h.core.jobInput(assessment.result.jobId);
  assert.ok(!Object.hasOwn(input, 'audio'));
  h.core.settleAssessment(assessment.result.jobId, h.sourceCandidate(input));
  assert.equal(h.core.student('A').attempts[0].state, 'accepted');
  assert.ok(!JSON.stringify(h.core.teacher()).includes('audio/webm'));
});

test('invalid interpretations and unusable transcripts fail visibly and release their slots', t => {
  const h = coreHarness(t);
  const submitted = h.submitWork();
  const job = h.assess(submitted.result.attemptId);
  h.core.settleAssessment(job.result.jobId, { fabricated: 'result' });
  const attempt = h.core.student('A').attempts[0];
  assert.equal(attempt.state, 'failed');
  assert.equal(attempt.error.code, 'INTERPRETATION_INVALID');
  assert.equal(h.core.student('A').judgments.length, 0);
  const next = h.submitWork({ explanationMode: 'spoken', initialText: null });
  const transcription = h.core.startTranscription(next.result.attemptId, next.result.turnId,
    h.attemptEnvelope(next.result.attemptId), { bytes: Buffer.from('RIFF0000WAVE'), mimeType: 'audio/wav' });
  h.core.settleTranscription(transcription.result.jobId, '');
  assert.equal(h.core.student('A').attempts.at(-1).error.code, 'INTERPRETATION_INVALID');
  assert.equal(h.core.student('A').targets[0].pending, false);
});

test('append preserves earlier evidence; editing a confirmed turn retracts only dependent judgments', t => {
  const h = coreHarness(t);
  const original = h.judge('D');
  const attemptId = original.attemptId;
  h.act('teach-addition-exchange');
  h.core.clarify(attemptId, { ...h.attemptEnvelope(attemptId), mode: 'written', text: h.words('A') });
  assert.equal(h.core.student('A').targets[0].finding.active, true);
  assert.equal(h.core.student('A').targets[0].correctionRevision, 0);
  // The old explanation and the new exchange conflict until the original is corrected.
  const current = h.core.student('A').attempts[0];
  const request = h.core.startAssessment(attemptId, {
    ...h.attemptEnvelope(attemptId), confirmedTurns: current.turns.map(turn => ({ turnId: turn.turnId, text: h.words('A') }))
  });
  assert.equal(h.core.student('A').targets[0].correctionRevision, 1);
  assert.equal(h.core.student('A').judgments[0].valid, false);
  const input = h.core.jobInput(request.result.jobId);
  h.core.settleAssessment(request.result.jobId, h.sourceCandidate(input));
  assert.equal(h.core.student('A').targets[0].finding.status, 'retracted');
  assert.equal(h.core.student('A').targets[0].independentStatus, 'not_demonstrated');
  assert.equal(h.core.student('A').attempts[0].turns.length, 2);
  assert.equal(h.core.student('A').attempts[0].turns[0].corrections.length, 1);
});

test('core admission enforces exact text, stroke, immutable-attempt and mutation capacity bounds', t => {
  const h = coreHarness(t);
  h.submitWork({ writtenWorking: '😀'.repeat(4000) });
  let revision = h.core.context().revision;
  assert.throws(() => h.submitWork({ writtenWorking: '😀'.repeat(4001) }), error => error.code === 'INVALID_REQUEST');
  assert.throws(() => h.submitWork({ writtenWorking: '\ud800' }), error => error.code === 'INVALID_REQUEST');
  const image = corePng().toString('base64');
  h.submitWork({ imagePngBase64: image, strokes: [{ tool: 'pen', width: 24, points: Array.from({ length: 20_000 }, () => [1023, 767]) }] });
  revision = h.core.context().revision;
  assert.throws(() => h.submitWork({ imagePngBase64: image,
    strokes: [{ tool: 'pen', width: 1, points: Array.from({ length: 20_001 }, () => [0, 0]) }] }), error => error.code === 'REQUEST_TOO_LARGE');
  assert.equal(h.core.context().revision, revision);
  for (let index = h.core.student('A').attempts.length; index < 128; index++) h.submitWork();
  assert.throws(() => h.submitWork(), error => error.code === 'SESSION_CAPACITY');
  assert.equal(h.core.student('A').attempts.length, 128);
  h.core.reset({ ...h.envelope(), expectedSessionRevision: h.core.context().revision });
  const cancellable = h.submitWork();
  for (let index = 0; index < 2047; index++) h.act('warmup-addition');
  assert.throws(() => h.act('warmup-addition'), error => error.code === 'SESSION_CAPACITY');
  h.core.cancel(cancellable.result.attemptId, h.attemptEnvelope(cancellable.result.attemptId));
  assert.equal(h.core.student('A').attempts[0].state, 'cancelled');
  h.core.reset({ ...h.envelope(), expectedSessionRevision: h.core.context().revision });
  assert.equal(h.core.context().revision, 0);
});

test('fixture observations are source-bound candidates, not shortcuts to findings', () => {
  const catalog = JSON.parse(readFileSync(new URL('./fixtures/regrouping-cases.json', import.meta.url), 'utf8'));
  assert.equal(catalog.version, 1);
  assert.equal(new Set(catalog.cases.map(item => item.caseId)).size, catalog.cases.length);
  for (const fixture of catalog.cases) {
    const target = lesson.targets.find(target => [target.practice, ...target.checks, target.review]
      .some(problem => problem.problemId === fixture.problemId));
    const input = inputFor(lesson.targets.indexOf(target), fixture.purpose, fixture.assisted);
    input.work.writtenWorking = fixture.writtenWorking;
    input.work.writtenSourceId = `${input.job.attemptId}:work:1:written`;
    input.turns = fixture.turns.map((turn, index) => ({ turnId: `fixture-turn-${index}`, source: turn.source, text: turn.text }));
    const candidate = structuredClone(fixture.candidate);
    for (const source of candidate.sourceEvidence) {
      if (source.sourceId === '$written') source.sourceId = input.work.writtenSourceId;
      else source.sourceId = input.turns[Number(source.sourceId.match(/\d+/)[0])].turnId;
    }
    assert.doesNotThrow(() => validateCandidate(candidate, input), fixture.caseId);
  }
});

test('a later-turn edit does not retract judgments that never contained that turn', t => {
  const h = coreHarness(t);
  const first = h.judge('D');
  h.act('teach-addition-exchange');
  h.core.clarify(first.attemptId, { ...h.attemptEnvelope(first.attemptId), mode: 'written', text: h.words('A', 'D') });
  const started = h.assess(first.attemptId);
  h.core.settleAssessment(started.result.jobId, h.sourceCandidate(h.core.jobInput(started.result.jobId), 'D'));
  const snapshot = h.core.student('A');
  const second = snapshot.judgments.at(-1);
  const turns = snapshot.attempts[0].turns;
  h.core.startAssessment(first.attemptId, {
    ...h.attemptEnvelope(first.attemptId),
    confirmedTurns: turns.map((turn, index) => ({ turnId: turn.turnId, text: turn.confirmedText + (index === 1 ? ' Again.' : '') }))
  });
  const corrected = h.core.student('A');
  assert.equal(corrected.judgments.find(item => item.judgmentId === first.judgmentId).valid, true);
  assert.equal(corrected.judgments.find(item => item.judgmentId === second.judgmentId).valid, false);
  assert.deepEqual(corrected.targets[0].finding.supportingJudgmentIds, [first.judgmentId]);
});

for (const kind of ['transcribe', 'assess']) {
  test(`target correction cancels only same-learner target ${kind} and restores explicit recovery`, t => {
    const h = coreHarness(t);
    const first = h.judge('D');
    const submitted = h.submitWork(kind === 'transcribe'
      ? { explanationMode: 'spoken', initialText: null } : { initialText: h.words('A') });
    const attemptId = submitted.result.attemptId;
    const job = kind === 'assess' ? h.assess(attemptId) : h.core.startTranscription(
      attemptId, submitted.result.turnId, h.attemptEnvelope(attemptId),
      { bytes: Buffer.from('RIFF0000WAVE'), mimeType: 'audio/wav' });
    const input = h.core.jobInput(job.result.jobId);
    const other = h.submitWork({ initialText: h.words('B') }, 'B');
    const otherJob = h.assess(other.result.attemptId);
    const otherInput = h.core.jobInput(otherJob.result.jobId);
    h.retractJudgments([first.judgmentId]);
    assert.equal(input.signal.aborted, true);
    assert.equal(input.signal.reason, 'correction');
    assert.equal(otherInput.signal.aborted, false);
    assert.equal(h.core.student('A').attempts.at(-1).state, kind === 'assess' ? 'ready_for_assessment' : 'awaiting_audio');
    assert.equal(h.core.student('A').targets[0].pending, false);
    assert.equal(h.core.student('B').targets[0].pending, true);
    if (kind === 'assess') assert.equal(h.core.settleAssessment(job.result.jobId, h.sourceCandidate(input)), false);
    else assert.equal(h.core.settleTranscription(job.result.jobId, 'late text'), false);
    h.core.settleAssessment(otherJob.result.jobId, h.sourceCandidate(otherInput));
    assert.equal(h.core.student('B').attempts[0].state, 'accepted');
  });
}

test('correcting addition does not cancel the same learner’s current subtraction work', t => {
  const h = coreHarness(t);
  const { clearing } = coreReviewSequence(h);
  h.act('teach-addition-exchange');
  h.act('resume-subtraction-task');
  const submitted = h.submitWork({ initialText: h.words('A') });
  const started = h.assess(submitted.result.attemptId);
  const input = h.core.jobInput(started.result.jobId);
  h.retractJudgments([clearing.judgmentId]);
  assert.equal(input.signal.aborted, false);
  assert.equal(h.core.student('A').targets[1].correctionRevision, 0);
  assert.equal(h.core.settleAssessment(started.result.jobId, h.sourceCandidate(input)), true);
  assert.equal(h.core.student('A').assignment.targetId, 'subtraction-exchange');
  assert.ok(h.core.student('A').allowedActions.some(action => action.actionId === 'fresh-addition-check'));
});

test('a busy reassessment cannot partially edit or invalidate an existing judgment', t => {
  const h = coreHarness(t);
  const first = h.judge('D');
  for (const who of ['B', 'C']) {
    const submitted = h.submitWork({ initialText: h.words(who) }, who);
    h.assess(submitted.result.attemptId);
  }
  const previous = h.core.student('A');
  assert.throws(() => h.core.startAssessment(first.attemptId, {
    ...h.attemptEnvelope(first.attemptId),
    confirmedTurns: previous.attempts[0].turns.map(turn => ({ turnId: turn.turnId, text: h.words('A') }))
  }), error => error.code === 'PROCESSING_BUSY');
  assert.deepEqual(h.core.student('A'), previous);
});

test('a mismatched image readback produces clarification without any disputed math judgment', t => {
  const h = coreHarness(t);
  const first = h.judge('D');
  const submitted = h.submitWork({ initialText: h.words('A'), imagePngBase64: corePng().toString('base64') });
  const started = h.assess(submitted.result.attemptId);
  h.core.settleAssessment(started.result.jobId, h.sourceCandidate(h.core.jobInput(started.result.jobId)));
  const attempt = h.core.student('A').attempts.at(-1);
  h.core.confirmReadback(attempt.attemptId, {
    ...h.attemptEnvelope(attempt.attemptId), candidateId: attempt.readback.candidateId, matches: false
  });
  const snapshot = h.core.student('A');
  assert.equal(snapshot.attempts.at(-1).state, 'needs_clarification');
  assert.equal(snapshot.attempts.at(-1).evidenceVersion, 2);
  assert.equal(snapshot.judgments.length, 1);
  assert.deepEqual(snapshot.targets[0].finding.supportingJudgmentIds, [first.judgmentId]);
  assert.equal(snapshot.targets[0].correctionRevision, 0);
});

test('assembled explanation and evidence limits reject additions atomically at the exact thresholds', t => {
  const h = coreHarness(t);
  const submitted = h.submitWork({ writtenWorking: 'w', initialText: 'a'.repeat(4000) });
  const attemptId = submitted.result.attemptId;
  const acceptUnclear = () => {
    const started = h.assess(attemptId);
    h.core.settleAssessment(started.result.jobId, h.sourceCandidate(h.core.jobInput(started.result.jobId), 'U'));
  };
  acceptUnclear();
  for (const size of [4000, 3999]) {
    h.core.clarify(attemptId, { ...h.attemptEnvelope(attemptId), mode: 'written', text: 'b'.repeat(size) });
    acceptUnclear();
  }
  const revision = h.core.context().revision;
  assert.throws(() => h.core.clarify(attemptId, { ...h.attemptEnvelope(attemptId), mode: 'written', text: 'c' }),
    error => error.code === 'REQUEST_TOO_LARGE');
  assert.equal(h.core.context().revision, revision);
  h.core.reset({ ...h.envelope(), expectedSessionRevision: revision });
  const fresh = h.submitWork();
  const freshId = fresh.result.attemptId;
  for (let version = 1; version <= 16; version++) {
    if (version > 1) h.core.clarify(freshId, { ...h.attemptEnvelope(freshId), mode: 'written', text: `Turn ${version}` });
    const started = h.assess(freshId);
    h.core.settleAssessment(started.result.jobId, h.sourceCandidate(h.core.jobInput(started.result.jobId), 'U'));
  }
  assert.equal(h.core.student('A').attempts[0].turns.length, 16);
  assert.equal(h.core.student('A').attempts[0].evidenceVersion, 16);
  assert.throws(() => h.core.clarify(freshId, { ...h.attemptEnvelope(freshId), mode: 'spoken' }),
    error => error.code === 'REQUEST_TOO_LARGE');
});

test('the 64 KiB retained text bound counts UTF-8 bytes and preserves history on overflow', t => {
  const h = coreHarness(t);
  const submitted = h.submitWork({ writtenWorking: 'ww', initialText: '😀'.repeat(4000) });
  const attemptId = submitted.result.attemptId;
  const settleUnclear = started => h.core.settleAssessment(started.result.jobId,
    h.sourceCandidate(h.core.jobInput(started.result.jobId), 'U'));
  settleUnclear(h.assess(attemptId));
  for (const replacement of ['😁'.repeat(4000), '😀'.repeat(2191) + 'abc']) {
    const attempt = h.core.student('A').attempts[0];
    settleUnclear(h.core.startAssessment(attemptId, {
      ...h.attemptEnvelope(attemptId), confirmedTurns: [{ turnId: attempt.turns[0].turnId, text: replacement }]
    }));
  }
  const current = h.core.student('A');
  assert.equal(current.attempts[0].turns[0].corrections.length, 2);
  assert.throws(() => h.core.clarify(attemptId, { ...h.attemptEnvelope(attemptId), mode: 'written', text: 'x' }),
    error => error.code === 'REQUEST_TOO_LARGE');
  assert.deepEqual(h.core.student('A'), current);
});

test('the retained PNG budget is checked before work is admitted and old drawings are not evicted', t => {
  const h = coreHarness(t);
  const width = 512;
  const height = 511;
  const stride = 1 + width * 4;
  const raster = randomBytes(stride * height);
  for (let row = 0; row < height; row++) raster[row * stride] = 0;
  const bytes = corePng(raster, width, height);
  assert.ok(bytes.length <= LIMITS.pngFileBytes);
  const count = Math.floor(LIMITS.retainedPngBytes / bytes.length);
  let first;
  for (let index = 0; index < count; index++) {
    const submitted = h.submitWork({ imagePngBase64: bytes.toString('base64') });
    first ??= submitted.result;
  }
  const revision = h.core.context().revision;
  assert.throws(() => h.submitWork({ imagePngBase64: bytes.toString('base64') }), error => error.code === 'SESSION_CAPACITY');
  assert.equal(h.core.context().revision, revision);
  assert.equal(h.core.student('A').attempts.length, count);
  assert.deepEqual(h.core.work(first.attemptId, first.workVersion, h.envelope()), bytes);
});

test('a target correction invalidates a readback candidate captured before that correction', t => {
  const h = coreHarness(t);
  const original = h.judge('D');
  const submitted = h.submitWork({ initialText: h.words('A'), imagePngBase64: corePng().toString('base64') });
  const started = h.assess(submitted.result.attemptId);
  h.core.settleAssessment(started.result.jobId, h.sourceCandidate(h.core.jobInput(started.result.jobId)));
  const provisional = h.core.student('A').attempts.at(-1);
  h.retractJudgments([original.judgmentId]);
  assert.equal(h.core.student('A').attempts.at(-1).state, 'ready_for_assessment');
  assert.equal(h.core.student('A').attempts.at(-1).readback, null);
  assert.throws(() => h.core.confirmReadback(provisional.attemptId, {
    ...h.attemptEnvelope(provisional.attemptId), candidateId: provisional.readback.candidateId, matches: true
  }), error => error.code === 'INVALID_TRANSITION');
  assert.equal(h.core.student('A').judgments.filter(judgment => judgment.valid).length, 0);
});

test('a single turn may have at most sixteen evidence versions, independently of the turn limit', t => {
  const h = coreHarness(t);
  const submitted = h.submitWork({ initialText: 'Version 1' });
  const attemptId = submitted.result.attemptId;
  for (let version = 1; version <= 16; version++) {
    const attempt = h.core.student('A').attempts[0];
    const started = h.core.startAssessment(attemptId, {
      ...h.attemptEnvelope(attemptId), confirmedTurns: [{ turnId: attempt.turns[0].turnId, text: `Version ${version}` }]
    });
    h.core.settleAssessment(started.result.jobId, h.sourceCandidate(h.core.jobInput(started.result.jobId), 'U'));
  }
  const before = h.core.student('A');
  assert.equal(before.attempts[0].evidenceVersion, 16);
  assert.equal(before.attempts[0].turns.length, 1);
  assert.throws(() => h.core.startAssessment(attemptId, {
    ...h.attemptEnvelope(attemptId), confirmedTurns: [{ turnId: before.attempts[0].turns[0].turnId, text: 'Version 17' }]
  }), error => error.code === 'REQUEST_TOO_LARGE');
  assert.deepEqual(h.core.student('A'), before);
});
