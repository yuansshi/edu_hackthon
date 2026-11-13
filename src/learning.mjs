const TARGETS = {
  'addition-exchange': {
    operation: 'add', criterionId: 'conserve-value-addition',
    difficultyCode: 'addition-omitted-ten', category: 'addition_omitted_ten',
    stem: 'addition', operands: [[27, 18], [36, 27], [47, 25], [58, 17], [48, 26]]
  },
  'subtraction-exchange': {
    operation: 'subtract', criterionId: 'conserve-value-subtraction',
    difficultyCode: 'subtraction-value-changed', category: 'subtraction_value_changed',
    stem: 'subtraction', operands: [[42, 17], [54, 28], [62, 18], [81, 57], [83, 46]]
  }
};

const PROMPTS = {
  'ask-carried-value': 'What does the one you carried represent?',
  'ask-strategy': 'How could you check your answer?',
  'ask-value-check': 'How can you check that these tens and ones still make the starting number?',
  'ask-exchange-evidence': 'Your way can work. Can you also show the tens and ones in your work?',
  'confirm-recognition': 'Do these words and marks match your work? You can correct them or show more.',
  'recheck-computation': 'Check the counting or calculation in your work. Show what you counted or calculated again.',
  'warmup-tens-ones': 'Here is 34: 3 tens and 4 ones. Each long block is one ten. Each small block is one one. Show 34 as tens and ones, then return to your problem.',
  'warmup-addition': 'For 23 + 14, put the tens together and the ones together. 2 tens and 1 ten make 3 tens. 3 ones and 4 ones make 7 ones. That makes 37. Now return to your problem.',
  'warmup-subtraction': 'For 46 − 12, start with 4 tens and 6 ones. Take away 1 ten and 2 ones. 3 tens and 4 ones are left. That makes 34. Now return to your problem.',
  'teach-addition-exchange': 'Here are {aT} tens and {aO} ones, and {bT} tens and {bO} ones.',
  'teach-subtraction-exchange': 'Start with {t} tens and {o} ones. That makes {a}.',
  'fresh-addition-check': 'Try {a} + {b} on your own. Draw or write how you know. You can also record your explanation.',
  'fresh-subtraction-check': 'Try {a} − {b} on your own. Draw or write how you know. You can also record your explanation.',
  'start-subtraction-practice': 'Now try 42 − 17. Draw or write how you know. You can also record your explanation.',
  'later-review': 'Let’s come back to {targetName}. Try {a} {operator} {b} on your own. Show how you know.',
  'resume-subtraction-task': '{destinationPrompt}',
  'request-teacher-review': 'Ask your teacher to look at this with you. Your work is saved for this session.',
  'finish-session': 'Your work is saved for this session. Your teacher can see what you tried and what still needs checking.'
};

const ADDITION_STEPS = [
  PROMPTS['teach-addition-exchange'],
  'Together there are {t} tens and {o} ones.',
  'Trade 10 ones for 1 ten. The amount stays the same.',
  'Now {afterT} tens and {afterO} ones make {answer}. Use the trade to finish your work.'
];
const SUBTRACTION_STEPS = [
  PROMPTS['teach-subtraction-exchange'],
  'Trade 1 ten for 10 ones. The amount stays the same.',
  'Now take away {bT} tens and {bO} ones.',
  '{remainingT} tens and {remainingO} ones are left. That makes {answer}. Use the trade to finish your work.'
];
const CATEGORIES = new Set([
  'supported_exchange', 'addition_omitted_ten', 'subtraction_value_changed',
  'procedure_without_exchange_explanation', 'correct_answer_without_reasoning',
  'valid_alternative_strategy', 'computation_error', 'needs_clarification'
]);
const ASSISTING = new Set([
  'recheck-computation', 'warmup-tens-ones', 'warmup-addition', 'warmup-subtraction',
  'teach-addition-exchange', 'teach-subtraction-exchange', 'request-teacher-review'
]);
const NEW_ASSIGNMENT = new Set([
  'fresh-addition-check', 'fresh-subtraction-check', 'start-subtraction-practice',
  'later-review', 'resume-subtraction-task'
]);
const CANDIDATE_KEYS = [
  'category', 'observedAnswer', 'exchangeEvidence', 'recognitionStatus',
  'sourceEvidence', 'exchangeQuantities', 'neutralReadback', 'reasoningSummary', 'teachingMoveId'
];
const UNCLEAR_REASONING = 'Show what each number in your work means. Which step did you use to get your answer?';

function invalid() {
  const error = new Error('The returned interpretation could not be verified.');
  error.code = 'INTERPRETATION_INVALID';
  return error;
}

function requireValue(condition) {
  if (!condition) throw invalid();
}

function closed(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function integer(value, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  return Number.isSafeInteger(value) && !Object.is(value, -0) && value >= min && value <= max;
}

function text(value, limit, nonempty = false) {
  return typeof value === 'string' && !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value) &&
    [...value].length <= limit && (!nonempty || value.trim().length > 0);
}

function pairEqual(a, b) {
  return a.tens === b.tens && a.ones === b.ones;
}

function pairValid(value) {
  return closed(value, ['tens', 'ones']) && integer(value.tens, 0, 999) && integer(value.ones, 0, 999);
}

function effectFor(actionId) {
  if (NEW_ASSIGNMENT.has(actionId)) return 'new_assignment';
  if (actionId === 'request-teacher-review' || actionId === 'finish-session') return 'session_status';
  return 'current_assignment';
}

function problemPrompt(stem, left, right, purpose) {
  const operator = stem === 'addition' ? '+' : '−';
  if (purpose === 'review') return `Let’s come back to ${stem}. Try ${left} ${operator} ${right} on your own. Show how you know.`;
  const prefix = purpose === 'check' ? `Try ${left} ${operator} ${right} on your own.` :
    `${stem === 'subtraction' ? 'Now try' : 'Try'} ${left} ${operator} ${right}.`;
  return `${prefix} Draw or write how you know. You can also record your explanation.`;
}

export function validateLesson(lesson) {
  const check = (condition) => {
    if (!condition) throw new TypeError('Invalid authored lesson');
  };
  check(closed(lesson, ['lessonId', 'title', 'targetIds', 'targets', 'actions']));
  check(text(lesson.lessonId, 100, true) && text(lesson.title, 200, true));
  check(Array.isArray(lesson.targetIds) && lesson.targetIds.join(',') === Object.keys(TARGETS).join(','));
  check(Array.isArray(lesson.targets) && lesson.targets.length === 2);
  lesson.targets.forEach((target, targetIndex) => {
    const targetId = lesson.targetIds[targetIndex];
    const spec = TARGETS[targetId];
    check(closed(target, ['targetId', 'criterionId', 'difficultyCode', 'practice', 'checks', 'review']));
    check(target.targetId === targetId && target.criterionId === spec.criterionId &&
      target.difficultyCode === spec.difficultyCode && Array.isArray(target.checks) && target.checks.length === 3);
    [target.practice, ...target.checks, target.review].forEach((problem, index) => {
      const purpose = index === 0 ? 'practice' : index === 4 ? 'review' : 'check';
      const suffix = purpose === 'check' ? index : 1;
      const [left, right] = spec.operands[index];
      check(closed(problem, ['problemId', 'operation', 'left', 'right', 'prompt']));
      check(problem.problemId === `${spec.stem}-${purpose}-${suffix}` &&
        problem.operation === spec.operation && problem.left === left && problem.right === right &&
        problem.prompt === problemPrompt(spec.stem, left, right, purpose));
    });
  });
  check(Array.isArray(lesson.actions) && lesson.actions.length === Object.keys(PROMPTS).length);
  const seen = new Set();
  for (const action of lesson.actions) {
    check(action !== null && typeof action === 'object' && Object.hasOwn(PROMPTS, action.actionId) && !seen.has(action.actionId));
    seen.add(action.actionId);
    const hasVisual = Object.hasOwn(action, 'visualTitle') || Object.hasOwn(action, 'stepTemplates') ||
      Object.hasOwn(action, 'visualStepTemplates');
    const keys = ['actionId', 'effect', 'prompt', 'marksAssisted'];
    if (hasVisual) keys.push('visualTitle', 'stepTemplates', 'visualStepTemplates');
    check(closed(action, keys) && action.effect === effectFor(action.actionId) &&
      action.prompt === PROMPTS[action.actionId] && action.marksAssisted === ASSISTING.has(action.actionId));
    check(hasVisual === (action.actionId.startsWith('warmup-') || action.actionId.startsWith('teach-')));
    if (hasVisual) {
      check(text(action.visualTitle, 200, true) && Array.isArray(action.stepTemplates) &&
        action.stepTemplates.length > 0 && action.stepTemplates.length === action.visualStepTemplates.length);
      check([...action.stepTemplates, ...action.visualStepTemplates].every(step => text(step, 1500, true)));
      const expected = action.actionId === 'teach-addition-exchange' ? ADDITION_STEPS :
        action.actionId === 'teach-subtraction-exchange' ? SUBTRACTION_STEPS : null;
      if (expected) check(JSON.stringify(action.stepTemplates) === JSON.stringify(expected));
      for (const step of [...action.stepTemplates, ...action.visualStepTemplates]) {
        check([...step.matchAll(/\{([^}]+)\}/g)].every(match => TEMPLATE_KEYS.has(match[1])));
      }
    }
  }
  return structuredClone(lesson);
}

export function criteriaFor(problem) {
  const targetId = problem.targetId ?? (problem.operation === 'add' ? 'addition-exchange' : 'subtraction-exchange');
  const spec = TARGETS[targetId];
  if (!spec || problem.operation !== spec.operation || !integer(problem.left, 10, 99) ||
      !integer(problem.right, 10, 99)) throw new TypeError('Invalid exchange problem');
  const aT = Math.floor(problem.left / 10);
  const aO = problem.left % 10;
  const bT = Math.floor(problem.right / 10);
  const bO = problem.right % 10;
  const addition = spec.operation === 'add';
  const before = addition ? {tens: aT + bT, ones: aO + bO} : {tens: aT, ones: aO};
  const expectedAnswer = addition ? problem.left + problem.right : problem.left - problem.right;
  if (addition ? before.ones < 10 || expectedAnswer >= 100 : aO >= bO || aO === 0 || expectedAnswer < 0) {
    throw new TypeError('Problem does not have the authored one-exchange structure');
  }
  return {
    criterionId: spec.criterionId, expectedAnswer, before,
    conservedAfter: {tens: before.tens + (addition ? 1 : -1), ones: before.ones + (addition ? -10 : 10)},
    difficultyCode: spec.difficultyCode
  };
}

const NUMBER_WORDS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90
};

// This only reads explicit numerical claims; it never infers a strategy from keywords.
function mathText(value) {
  const tokens = value.toLowerCase().replace(/−/g, '-').replace(/([a-z])-([a-z])/g, '$1 $2')
    .match(/\d+|[a-z]+|[^\s]/g) ?? [];
  const result = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!Object.hasOwn(NUMBER_WORDS, token)) {
      result.push(token);
      continue;
    }
    let number = NUMBER_WORDS[token];
    if (tokens[index + 1] === 'hundred' && number > 0 && number < 10) {
      number *= 100;
      index += 1;
      if (tokens[index + 1] === 'and' && Object.hasOwn(NUMBER_WORDS, tokens[index + 2])) index += 1;
      if (Object.hasOwn(NUMBER_WORDS, tokens[index + 1])) number += NUMBER_WORDS[tokens[++index]];
    }
    if (number % 10 === 0 && number >= 20 && NUMBER_WORDS[tokens[index + 1]] > 0 &&
        NUMBER_WORDS[tokens[index + 1]] < 10) number += NUMBER_WORDS[tokens[++index]];
    result.push(String(number));
  }
  return result.join(' ').replace(/\bplus\b/g, '+').replace(/\bminus\b/g, '-')
    .replace(/\b(?:a|an)\s+(ten|one)\b/g, '1 $1');
}

function hasNumber(source, value) {
  const literal = value < 0 ? `-\\s*${-value}` : String(value);
  return new RegExp(`(?<![\\d-])${literal}(?!\\d)`).test(source);
}

function groundedPair(pair, source) {
  return new RegExp(`\\b${pair.tens}\\s+tens?\\b`).test(source) &&
    new RegExp(`\\b${pair.ones}\\s+ones?\\b`).test(source);
}

function sourceTexts(candidate) {
  return candidate.sourceEvidence.map(source => {
    if (source.sourceKind === 'image') return source.description;
    return source.quote;
  });
}

export function validateCandidate(candidate, input) {
  requireValue(closed(candidate, CANDIDATE_KEYS));
  requireValue(CATEGORIES.has(candidate.category));
  requireValue(candidate.observedAnswer === null || integer(candidate.observedAnswer));
  requireValue(['supported', 'contradicted', 'not_established', 'unclear'].includes(candidate.exchangeEvidence));
  requireValue(['usable', 'clarify', 'conflict'].includes(candidate.recognitionStatus));
  requireValue(Array.isArray(candidate.sourceEvidence) && candidate.sourceEvidence.length <= 10);
  requireValue(text(candidate.neutralReadback, 1200) && text(candidate.reasoningSummary, 500));
  requireValue(typeof candidate.teachingMoveId === 'string' && Object.hasOwn(PROMPTS, candidate.teachingMoveId) &&
    input.allowedActionIds.includes(candidate.teachingMoveId));
  const criteria = criteriaFor(input.problem);
  requireValue(closed(input.criteria, ['criterionId', 'expectedAnswer', 'before', 'conservedAfter', 'difficultyCode']) &&
    input.criteria.criterionId === criteria.criterionId && input.criteria.expectedAnswer === criteria.expectedAnswer &&
    pairValid(input.criteria.before) && pairEqual(input.criteria.before, criteria.before) &&
    pairValid(input.criteria.conservedAfter) && pairEqual(input.criteria.conservedAfter, criteria.conservedAfter) &&
    input.criteria.difficultyCode === criteria.difficultyCode);
  const addition = input.problem.operation === 'add';
  requireValue(candidate.category !== (addition ? 'subtraction_value_changed' : 'addition_omitted_ten'));
  const imageId = `${input.job.attemptId}:work:${input.job.workVersion}`;
  const writtenId = `${imageId}:written`;
  requireValue(input.work.image ? input.work.imageSourceId === imageId : input.work.imageSourceId === null);
  requireValue(input.work.writtenWorking.trim() ? input.work.writtenSourceId === writtenId : input.work.writtenSourceId === null);
  for (const source of candidate.sourceEvidence) {
    requireValue(closed(source, ['sourceKind', 'sourceId', 'quote', 'description']));
    requireValue(text(source.sourceId, 200, true) && text(source.description, 500));
    if (source.sourceKind === 'image') {
      requireValue(input.work.image !== null && source.sourceId === imageId && source.quote === null &&
        source.description.trim().length > 0);
    } else {
      requireValue(source.sourceKind === 'turn' || source.sourceKind === 'written_work');
      const original = source.sourceKind === 'turn' ?
        input.turns.find(turn => turn.turnId === source.sourceId)?.text :
        (source.sourceId === input.work.writtenSourceId ? input.work.writtenWorking : undefined);
      requireValue(text(source.quote, 500, true) && typeof original === 'string' && original.includes(source.quote));
    }
  }
  requireValue(candidate.category === 'needs_clarification' || candidate.sourceEvidence.length > 0);
  if (input.work.image === null) {
    requireValue(candidate.neutralReadback === '');
  } else {
    requireValue(candidate.neutralReadback.trim().length > 0);
    requireValue(!/\b(?:correct answer|expected answer|incorrect|your answer is correct|you should|you need to|the answer should|the amount stays the same|trade 10 ones for 1 ten|trade 1 ten for 10 ones)\b/i
      .test(candidate.neutralReadback));
  }
  const grounded = mathText(sourceTexts(candidate).join('\n'));
  if (candidate.observedAnswer !== null) requireValue(hasNumber(grounded, candidate.observedAnswer));
  if (candidate.exchangeQuantities !== null) {
    requireValue(closed(candidate.exchangeQuantities, ['before', 'after']) &&
      pairValid(candidate.exchangeQuantities.before) && pairValid(candidate.exchangeQuantities.after));
    const {before, after} = candidate.exchangeQuantities;
    requireValue(pairEqual(before, criteria.before) || groundedPair(before, grounded));
    requireValue(groundedPair(after, grounded));
  }
  return structuredClone(candidate);
}

function exchangeFacts(candidate, criteria, addition) {
  const quantities = candidate.exchangeQuantities;
  if (!quantities) return {supported: false, difficulty: false};
  const {before, after} = quantities;
  const startingValue = criteria.before.tens * 10 + criteria.before.ones;
  const supported = candidate.exchangeEvidence === 'supported' &&
    before.tens * 10 + before.ones === startingValue && after.tens * 10 + after.ones === startingValue &&
    Math.abs(after.tens - before.tens) === 1 && Math.abs(after.ones - before.ones) === 10;
  const difficulty = candidate.exchangeEvidence === 'contradicted' && pairEqual(before, criteria.before) &&
    after.tens === before.tens && after.ones === before.ones + (addition ? -10 : 10);
  return {supported, difficulty};
}

function explicitRepresentations(source) {
  return [...source.matchAll(/\b(\d+)\s+tens?\s+(?:and|\+)\s+(\d+)\s+ones?\b/g)]
    .map(match => ({tens: Number(match[1]), ones: Number(match[2])}));
}

function localizedSlip(source, problem) {
  for (const match of source.matchAll(/\b(\d+)\s*(?:ones?|tens?)?\s*([+-])\s*(\d+)\s*(?:ones?|tens?)?\s*(?:=|is|makes?|equals?)\s*(\d+)/g)) {
    if (Number(match[1]) === problem.left && Number(match[3]) === problem.right &&
        match[2] === (problem.operation === 'add' ? '+' : '-')) continue;
    const expected = match[2] === '+' ? Number(match[1]) + Number(match[3]) : Number(match[1]) - Number(match[3]);
    if (expected !== Number(match[4])) return true;
  }
  for (const match of source.matchAll(/\b(\d+)\s+tens?\s+(?:and|\+)\s+(\d+)\s+ones?\s+(?:is|make|makes|=)\s+(\d+)/g)) {
    if (Number(match[1]) * 10 + Number(match[2]) !== Number(match[3])) return true;
  }
  return /\bcount(?:ed)?\b[^.!?]{0,80}\b\d+\b[^.!?]{0,40}\bas\s+\d+\b/.test(source) ||
    /\b(?:wrote|write)\s+\d+\s+instead\s+of\s+\d+\b/.test(source);
}

function conflictingEvidence(candidate, input, criteria, facts) {
  const source = mathText([
    input.work?.writtenWorking ?? '', ...(input.turns ?? []).map(turn => turn.text),
    ...candidate.sourceEvidence.filter(item => item.sourceKind === 'image').map(item => item.description)
  ].join('\n'));
  const representations = explicitRepresentations(source);
  const bad = {tens: criteria.before.tens, ones: criteria.before.ones + (input.problem.operation === 'add' ? -10 : 10)};
  const goodShown = representations.some(pair => pairEqual(pair, criteria.conservedAfter));
  const badShown = representations.some(pair => pairEqual(pair, bad));
  if (goodShown && badShown) return true;
  const operator = input.problem.operation === 'add' ? '\\+' : '-';
  const answerPattern = new RegExp(
    `\\b(?:answer\\s+(?:is|=)|${input.problem.left}\\s*${operator}\\s*${input.problem.right}\\s*=)\\s*(-?\\s*\\d+)`, 'g');
  const answers = [...source.matchAll(answerPattern)].map(match => Number(match[1].replace(/\s/g, '')));
  if (new Set(answers).size > 1) return true;
  if (facts.supported && badShown) return true;
  if (facts.difficulty && goodShown) return true;
  if (candidate.exchangeEvidence === 'supported' && !facts.supported) return true;
  if (candidate.exchangeEvidence === 'contradicted' && !facts.difficulty) return true;
  return false;
}

export function classifyCandidate(candidate, input) {
  // Source/schema admission happens once at validateCandidate, before recognition review.
  const value = candidate;
  requireValue(CATEGORIES.has(value.category) && Object.hasOwn(PROMPTS, value.teachingMoveId));
  requireValue(value.category !== (input.problem.operation === 'add' ? 'subtraction_value_changed' : 'addition_omitted_ten'));
  const criteria = criteriaFor(input.problem);
  const addition = input.problem.operation === 'add';
  const facts = exchangeFacts(value, criteria, addition);
  const answerCorrect = value.observedAnswer === null ? null : value.observedAnswer === criteria.expectedAnswer;
  const grounded = mathText(sourceTexts(value).join('\n'));
  const slip = localizedSlip(grounded, input.problem);
  let outcome;
  let teachingMoveId;
  let feedback = '';
  if (value.recognitionStatus !== 'usable' || value.exchangeEvidence === 'unclear' ||
      conflictingEvidence(value, input, criteria, facts) || (facts.difficulty && answerCorrect === true) ||
      (facts.supported && answerCorrect === false && !slip)) {
    outcome = 'U';
  } else if (facts.difficulty) {
    outcome = 'D';
    teachingMoveId = addition ? 'teach-addition-exchange' : 'teach-subtraction-exchange';
  } else if (facts.supported && answerCorrect === true) {
    outcome = 'E';
  } else if (slip && answerCorrect !== true &&
      (value.category === 'computation_error' || value.category === 'valid_alternative_strategy' ||
       value.category === 'supported_exchange')) {
    outcome = 'C';
    teachingMoveId = 'recheck-computation';
  } else if (value.category === 'needs_clarification' || value.category === 'computation_error' ||
      value.category === 'addition_omitted_ten' || value.category === 'subtraction_value_changed' ||
      answerCorrect === false) {
    outcome = 'U';
  } else {
    outcome = 'N';
    if (facts.supported || value.category === 'correct_answer_without_reasoning') teachingMoveId = 'ask-strategy';
    else if (value.category === 'procedure_without_exchange_explanation') {
      teachingMoveId = addition ?
        (/\bcarry|carried|carrying\b/.test(grounded) && /\b(?:1|one)\b/.test(grounded) ? 'ask-carried-value' : 'ask-exchange-evidence') :
        'ask-value-check';
    } else teachingMoveId = 'ask-exchange-evidence';
  }
  const problem = input.problem;
  const qualifies = outcome === 'E' && (problem.purpose === 'check' || problem.purpose === 'review') &&
    !problem.assisted && (problem.freshAtIssue ?? true) && (problem.currentAtCommit ?? true);
  if (outcome === 'U') {
    teachingMoveId = 'confirm-recognition';
    feedback = value.recognitionStatus !== 'usable' ? PROMPTS['confirm-recognition'] : UNCLEAR_REASONING;
  } else if (outcome === 'E') {
    if (problem.purpose === 'practice') feedback = 'You showed how the amount stays the same.';
    else if (!qualifies && !problem.assisted) feedback = 'You showed how the amount stays the same.';
    else if (!qualifies && problem.purpose === 'review') feedback = 'You used help this time. Your teacher can see what still needs checking.';
    else if (!qualifies) feedback = 'You used help on this problem. Try a new one on your own.';
    else feedback = problem.purpose === 'review' ? 'You showed it again on your own.' : 'You showed it on a new problem on your own.';
    teachingMoveId = !qualifies ? `fresh-${addition ? 'addition' : 'subtraction'}-check` :
      problem.purpose === 'review' ? (addition ? 'resume-subtraction-task' : 'finish-session') :
      (addition ? 'start-subtraction-practice' : 'later-review');
  } else if (outcome !== 'D') feedback = PROMPTS[teachingMoveId];
  return {
    outcome, answerCorrect,
    exchangeCovered: outcome === 'E' || outcome === 'D' || ((outcome === 'C' || outcome === 'N') && facts.supported),
    qualifies, teachingMoveId, feedback
  };
}

const TEMPLATE_KEYS = new Set([
  'a', 'b', 'aT', 'aO', 'bT', 'bO', 't', 'o', 'afterT', 'afterO',
  'remainingT', 'remainingO', 'answer', 'targetName', 'operator', 'destinationPrompt'
]);

export function actionFor(lesson, actionId, problem) {
  const action = lesson.actions.find(item => item.actionId === actionId);
  if (!action) throw new TypeError('Unknown authored action');
  const addition = problem.operation === 'add';
  const criteria = criteriaFor(problem);
  const additionOnly = ['teach-addition-exchange', 'warmup-addition', 'fresh-addition-check'];
  const subtractionOnly = [
    'teach-subtraction-exchange', 'warmup-subtraction', 'fresh-subtraction-check',
    'start-subtraction-practice', 'resume-subtraction-task'
  ];
  if ((additionOnly.includes(actionId) && !addition) || (subtractionOnly.includes(actionId) && addition)) {
    throw new TypeError('Action does not apply to this target');
  }
  const values = {
    a: problem.left, b: problem.right,
    aT: Math.floor(problem.left / 10), aO: problem.left % 10,
    bT: Math.floor(problem.right / 10), bO: problem.right % 10,
    t: criteria.before.tens, o: criteria.before.ones,
    afterT: criteria.conservedAfter.tens, afterO: criteria.conservedAfter.ones,
    remainingT: criteria.conservedAfter.tens - Math.floor(problem.right / 10),
    remainingO: criteria.conservedAfter.ones - problem.right % 10,
    answer: criteria.expectedAnswer, targetName: addition ? 'addition' : 'subtraction',
    operator: addition ? '+' : '−',
    destinationPrompt: problem.problemId === 'subtraction-practice-1' ?
      PROMPTS['start-subtraction-practice'] : problemPrompt('subtraction', problem.left, problem.right, 'check')
  };
  const interpolate = template => template.replace(/\{([^}]+)\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) throw new TypeError('Unknown authored template parameter');
    return String(values[key]);
  });
  return {
    actionId, effect: action.effect, prompt: interpolate(action.prompt), marksAssisted: action.marksAssisted,
    visual: action.stepTemplates ? {
      visualId: actionId, title: interpolate(action.visualTitle),
      steps: action.stepTemplates.map((step, index) =>
        `${interpolate(step)}\n${interpolate(action.visualStepTemplates[index])}`)
    } : null
  };
}

function judgmentOutcome(judgment) {
  if (judgment.outcome) return judgment.outcome;
  if (judgment.recognitionStatus !== 'usable' || judgment.exchangeEvidence === 'unclear') return 'U';
  if (judgment.exchangeEvidence === 'contradicted' && judgment.answerCorrect !== true &&
      (judgment.category === 'addition_omitted_ten' || judgment.category === 'subtraction_value_changed')) return 'D';
  if (judgment.exchangeEvidence === 'supported' && judgment.answerCorrect === true) return 'E';
  if (judgment.category === 'computation_error') return 'C';
  return judgment.category === 'needs_clarification' ? 'U' : 'N';
}

function isQualifier(judgment, assignment, outcome) {
  const earlierHelp = assignment?.assistance?.some(event =>
    integer(event.eventSequence, 0) && event.eventSequence < judgment.eventSequence);
  return outcome === 'E' && judgment.qualifies !== false &&
    (judgment.assignmentPurpose === 'check' || judgment.assignmentPurpose === 'review') &&
    judgment.answerCorrect === true && judgment.exchangeEvidence === 'supported' &&
    judgment.freshAtIssue === true && judgment.currentAtCommit === true &&
    judgment.assisted === false && !judgment.assistanceEventIds?.length && !earlierHelp;
}

export function reduceTarget({
  learnerId, targetId, findingId, judgments = [], corrections = [], assignments = [], boundaries = []
}) {
  const spec = TARGETS[targetId];
  if (!spec) throw new TypeError('Unknown learning target');
  const belongs = record => record.targetId === targetId && (record.learnerId === undefined || record.learnerId === learnerId);
  const history = judgments.filter(belongs).toSorted((a, b) => a.eventSequence - b.eventSequence);
  const targetCorrections = corrections.filter(belongs);
  const invalidIds = new Set(corrections.filter(correction =>
    correction.learnerId === undefined || correction.learnerId === learnerId).flatMap(correction => correction.judgmentIds));
  const valid = judgment => judgment.valid !== false && !invalidIds.has(judgment.judgmentId);
  const learnerAssignments = assignments.filter(assignment => assignment.learnerId === learnerId);
  const assignmentById = new Map(learnerAssignments.map(assignment => [assignment.assignmentId, assignment]));
  const reviews = learnerAssignments.filter(assignment => assignment.targetId === targetId && assignment.purpose === 'review')
    .toSorted((a, b) => a.issuedSequence - b.issuedSequence);
  const intervening = (anchor, beforeSequence = Infinity) => boundaries.some(boundary => {
    const assignment = assignmentById.get(boundary.assignmentId);
    const usableJudgment = judgments.some(judgment =>
      judgment.assignmentId === boundary.assignmentId &&
      (judgment.learnerId === undefined || judgment.learnerId === learnerId) &&
      (boundary.judgmentId === undefined || boundary.judgmentId === judgment.judgmentId) &&
      valid(judgment) && judgment.recognitionStatus === 'usable' && judgmentOutcome(judgment) !== 'U' &&
      judgment.eventSequence < boundary.eventSequence);
    return boundary.learnerId === learnerId && boundary.usable && assignment &&
      usableJudgment &&
      boundary.assignmentId !== anchor.assignmentId &&
      assignment.issuedSequence > anchor.eventSequence &&
      boundary.eventSequence > anchor.eventSequence && boundary.eventSequence < beforeSequence;
  });
  let active = false;
  let seenDifficulty = false;
  let assessed = false;
  let independent = null;
  let clearingJudgmentId = null;
  let supporting = [];
  let cycle = null;
  let failedReview = null;
  let completedReview = null;
  let evidenceAt = null;
  for (const judgment of history) {
    if (!valid(judgment)) continue;
    const outcome = judgmentOutcome(judgment);
    const assignment = assignmentById.get(judgment.assignmentId);
    const qualifies = isQualifier(judgment, assignment, outcome);
    const covered = judgment.exchangeCovered ?? (outcome === 'D' || outcome === 'E' ||
      ((outcome === 'C' || outcome === 'N') && judgment.exchangeEvidence === 'supported'));
    assessed ||= covered;
    evidenceAt = judgment.at ?? evidenceAt;
    if (outcome === 'D') {
      active = true;
      seenDifficulty = true;
      supporting.push(judgment.judgmentId);
      independent = null;
      clearingJudgmentId = null;
      if (judgment.assignmentPurpose !== 'review') {
        cycle = null;
        completedReview = null;
      }
    }
    if (qualifies) {
      const previouslyIndependent = independent !== null;
      active = false;
      supporting = [];
      independent = judgment;
      clearingJudgmentId = seenDifficulty ? judgment.judgmentId : null;
      if (judgment.assignmentPurpose === 'review') {
        const eligible = cycle && assignment && cycle.eventSequence < assignment.issuedSequence &&
          intervening(cycle, assignment.issuedSequence);
        if (eligible) {
          completedReview = judgment.assignmentId;
          failedReview = null;
        } else {
          cycle = judgment;
          completedReview = null;
          failedReview = null;
        }
      } else if (!previouslyIndependent || !cycle || failedReview) {
        cycle = judgment;
        completedReview = null;
        failedReview = null;
      }
    } else if (judgment.assignmentPurpose === 'review' && ['D', 'C', 'N', 'E'].includes(outcome)) {
      failedReview = judgment;
      completedReview = null;
    }
  }
  // Leaving an uncertain review is possible only after choosing help.
  for (const review of reviews) {
    const last = history.filter(judgment => judgment.assignmentId === review.assignmentId && valid(judgment)).at(-1);
    if (review.state === 'completed' && review.assisted && last && judgmentOutcome(last) === 'U' &&
        (!independent || independent.eventSequence < last.eventSequence)) {
      failedReview = last;
      completedReview = null;
    }
  }
  let reviewStatus = 'not_due';
  if (failedReview) reviewStatus = 'unsuccessful';
  else if (completedReview) reviewStatus = 'completed';
  else if (cycle) {
    const consumed = reviews.at(-1);
    if (consumed && (consumed.state !== 'current' || consumed.issuedSequence <= cycle.eventSequence)) {
      reviewStatus = 'pending_pool';
    } else reviewStatus = intervening(cycle, consumed?.issuedSequence ?? Infinity) ? 'due' : 'pending_intervening';
  }
  const invalidDifficulty = history.some(judgment => !valid(judgment) && judgmentOutcome(judgment) === 'D');
  const invalidQualifier = history.some(judgment => !valid(judgment) &&
    isQualifier(judgment, assignmentById.get(judgment.assignmentId), judgmentOutcome(judgment)));
  const status = active ? 'active' : seenDifficulty && independent ? 'cleared' : invalidDifficulty ? 'retracted' : 'none';
  const current = learnerAssignments.find(assignment => assignment.targetId === targetId && assignment.state === 'current');
  const currentHistory = current ? history.filter(judgment => judgment.assignmentId === current.assignmentId) : [];
  const lastCurrent = currentHistory.at(-1);
  return {
    targetId, correctionRevision: targetCorrections.length, assessed,
    needsClarification: Boolean(lastCurrent && (!valid(lastCurrent) || judgmentOutcome(lastCurrent) === 'U')),
    pending: false,
    independentStatus: independent ? 'demonstrated' : seenDifficulty || invalidQualifier ? 'recheck_required' : 'not_demonstrated',
    independentJudgmentId: independent?.judgmentId ?? null, evidenceAt,
    finding: {
      findingId, revision: 0, learnerId, targetId, code: spec.difficultyCode, status, active,
      supportingJudgmentIds: supporting, clearingJudgmentId,
      historyJudgmentIds: history.map(judgment => judgment.judgmentId)
    },
    review: {
      status: reviewStatus, dueAfterAssignmentId: cycle?.assignmentId ?? null,
      completedAssignmentId: completedReview
    }
  };
}
