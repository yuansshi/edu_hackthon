import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeMathCoach } from '../src/coach.mjs';

test('unverified learner explanations receive a neutral question', () => {
  for (const explanation of [
    'I guessed 35.',
    'I do not know how to carry. My answer is 45.',
    'I ignored the ten but got 45.',
    'Seven ones plus eight ones is fifteen ones. I made a ten and five ones.'
  ]) {
    const result = analyzeMathCoach('27 + 18', explanation);
    assert.equal(result.kind, 'needs_clarification');
    assert.match(result.response, /show me/i);
    assert.doesNotMatch(result.response, /right answer|nice work|wrong|45/i);
  }
});

test('an empty explanation asks for a starting point', () => {
  assert.equal(analyzeMathCoach('27 + 18', '').kind, 'empty');
});

test('rejects unsupported problems and invalid or oversized explanations', () => {
  for (const [problem, text] of [
    ['42 - 17', 'I guessed'], ['27 + 18', null], ['27 + 18', 'a'.repeat(4001)]
  ]) {
    assert.throws(() => analyzeMathCoach(problem, text), TypeError);
  }
});
