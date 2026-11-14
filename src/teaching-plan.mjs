export const SUPPORT_LABELS = Object.freeze([
  'Visible steps',
  'An example to start',
  'Hints when I ask',
  'Quiet thinking time',
  'A quick check-in',
  'A first-step plan'
]);

/** Describes confirmed learner choices; it does not choose math ability or evidence rules. */
export function describeTeachingChoices(choices) {
  const supportLabels = SUPPORT_LABELS.filter(label => choices.supports.includes(label));
  const asksForGuidance = supportLabels.some(label =>
    ['Visible steps', 'An example to start', 'A first-step plan'].includes(label));
  const approach = asksForGuidance ? 'guided' : choices.challenge === 'stretch' ? 'challenge' : 'balanced';
  const opening = approach === 'guided'
    ? 'We can begin with one example and one small step. Then you can try a new problem.'
    : approach === 'challenge'
      ? 'Try the problem first and show how you know. You can ask for a hint or a check-in.'
      : 'Choose whether to try first or see an example. We can change the approach together.';
  const encouragement = {
    progress: 'Notice the step you explained or corrected.',
    private: 'Keep feedback private and kind.',
    points: 'Use a small progress marker after a completed step; it is separate from the math evidence.',
    none: 'Use a calm, factual check without extra praise.'
  }[choices.encouragement];
  return {
    approach, opening, encouragement,
    pacing: `Try a ${choices.focus}-minute work block, then choose a ${choices.pause}-minute pause. These are your trial choices.`,
    supportLabels
  };
}

function requireValue(condition) {
  if (!condition) {
    const error = new Error('INVALID_REQUEST');
    error.code = 'INVALID_REQUEST';
    throw error;
  }
}

function closed(value, expected) {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === [...expected].sort().join(','));
}

function integer(value, min, max) {
  return Number.isSafeInteger(value) && !Object.is(value, -0) && value >= min && value <= max;
}

/** Admits only the small chosen arrangement, never answers or descriptive report text. */
export function parseTeachingHandoff(handoff) {
  closed(handoff, ['schemaVersion', 'sourceSchemaVersion', 'revision', 'reviewed', 'learner', 'routine']);
  requireValue(handoff.schemaVersion === 'smart-pants-tutoring/v1' &&
    handoff.sourceSchemaVersion === 'learning-strength-discovery/v1' && handoff.reviewed === true &&
    integer(handoff.revision, 0, 1_000_000));
  closed(handoff.learner, ['alias', 'grade']);
  const {alias, grade} = handoff.learner;
  requireValue(typeof alias === 'string' && alias.isWellFormed() && Array.from(alias).length <= 30 &&
    ['5', '6', '7', '8', 'unspecified'].includes(grade));
  closed(handoff.routine, ['acceptedRevision', 'basis', 'choices']);
  requireValue(integer(handoff.routine.acceptedRevision, 0, 1_000_000) &&
    handoff.routine.acceptedRevision === handoff.revision && handoff.routine.basis === 'learner-chosen-trial');
  const choices = handoff.routine.choices;
  closed(choices, ['minutes', 'focus', 'pause', 'encouragement', 'challenge', 'supports']);
  requireValue(integer(choices.minutes, 5, 60) && choices.minutes % 5 === 0 &&
    integer(choices.focus, 3, 20) && [3, 5, 8, 10, 15, 20].includes(choices.focus) &&
    choices.focus <= choices.minutes && integer(choices.pause, 1, 10) && [1, 2, 3, 5, 10].includes(choices.pause) &&
    ['progress', 'private', 'points', 'none'].includes(choices.encouragement) &&
    ['steady', 'stretch', 'choice'].includes(choices.challenge));
  requireValue(Array.isArray(choices.supports) && choices.supports.length <= SUPPORT_LABELS.length &&
    new Set(choices.supports).size === choices.supports.length &&
    choices.supports.every(label => SUPPORT_LABELS.includes(label)));
  return {
    learnerId: 'A', learner: alias.trim() || 'Learner', grade,
    sourceRevision: handoff.revision, ...describeTeachingChoices(choices)
  };
}
