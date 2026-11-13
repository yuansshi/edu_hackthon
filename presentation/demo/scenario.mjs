import {validateLesson, criteriaFor, validateCandidate, classifyCandidate, actionFor, reduceTarget} from '../../src/learning.mjs';

export const profiles = [
  {id: 'maya', name: 'Maya', initial: 'M', color: 'coral', preference: 'Show me, then let me try.', description: 'Pictures and one small step at a time.', invitation: 'Let’s build the numbers together. You can take your time.', tags: ['Visual examples', 'Small steps', 'Calm encouragement']},
  {id: 'leo', name: 'Leo', initial: 'L', color: 'lime', preference: 'Give me a challenge.', description: 'A quick invitation and room to explain.', invitation: 'Ready for a number puzzle? Find the answer, then convince me.', tags: ['Short invitations', 'Challenge first', 'Room to explain']}
];

export function prepareDemo(rawLesson, catalog) {
  const lesson = validateLesson(rawLesson);
  const target = lesson.targets[0];
  function assess(kind, {assisted = false, fresh = false} = {}) {
    const problem = {...(fresh ? target.checks[0] : target.practice), targetId: target.targetId,
      purpose: fresh ? 'check' : 'practice', assisted, freshAtIssue: true, currentAtCommit: true};
    const criteria = criteriaFor(problem);
    const caseId = {missing: 'audio-add-omitted-ten', procedure: 'audio-add-procedure', guess: 'audio-add-guess', supported: 'audio-add-supported'}[kind];
    const row = structuredClone(catalog.cases.find(item => item.caseId === caseId));
    if (!row) throw new Error('Prepared example unavailable');
    const turnId = '00000000-0000-4000-8000-000000000002';
    const input = {
      job: {attemptId: '00000000-0000-4000-8000-000000000001', workVersion: 1},
      problem, criteria, allowedActionIds: lesson.actions.map(action => action.actionId),
      work: {image: null, imageSourceId: null, strokes: [], writtenWorking: '', writtenSourceId: null},
      turns: [{turnId, source: 'written', text: row.turns[0].text}]
    };
    const candidate = row.candidate;
    candidate.sourceEvidence = candidate.sourceEvidence.map(item => ({...item, sourceId: turnId}));
    if (fresh) {
      input.turns[0].text = '5 tens and 13 ones become 6 tens and 3 ones. My answer is 63.';
      candidate.observedAnswer = criteria.expectedAnswer;
      candidate.exchangeQuantities = {before: criteria.before, after: criteria.conservedAfter};
      candidate.sourceEvidence[0].quote = input.turns[0].text;
    }
    const admitted = validateCandidate(candidate, input);
    return {kind, input, candidate: admitted, result: classifyCandidate(admitted, input)};
  }
  const help = actionFor(lesson, 'teach-addition-exchange', {...target.practice, targetId: target.targetId});
  function evidence(records) {
    const judgments = records.map((record, index) => ({
      ...record.candidate, ...record.result, judgmentId: `preview-${index + 1}`, learnerId: 'preview',
      targetId: target.targetId, assignmentId: record.input.problem.purpose === 'check' ? 'check' : 'practice',
      assignmentPurpose: record.input.problem.purpose, assisted: record.input.problem.assisted,
      assistanceEventIds: record.input.problem.assisted ? ['preview-help'] : [],
      freshAtIssue: true, currentAtCommit: true, eventSequence: index * 2 + 1,
      at: new Date().toISOString()
    }));
    return reduceTarget({learnerId: 'preview', targetId: target.targetId, findingId: 'preview-finding', judgments,
      assignments: [
        {assignmentId: 'practice', learnerId: 'preview', targetId: target.targetId, purpose: 'practice', state: 'completed', issuedSequence: 0, assisted: true, assistance: [{eventSequence: 2}]},
        {assignmentId: 'check', learnerId: 'preview', targetId: target.targetId, purpose: 'check', state: 'completed', issuedSequence: 4, assisted: false, assistance: []}
      ]});
  }
  return {lesson, assess, help, evidence};
}
