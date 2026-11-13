import lesson from '../../content/demo-lesson.json' with { type: 'json' };
import catalog from '../../test/fixtures/regrouping-cases.json' with { type: 'json' };
import { prepareDemo } from '../../presentation/demo/scenario.mjs';

const demo = prepareDemo(lesson, catalog);

function response(record) {
  return {
    explanation: record.input.turns[0].text,
    answer: record.candidate.observedAnswer,
    correct: record.result.answerCorrect,
    qualifies: record.result.qualifies,
    feedback: record.result.feedback,
  };
}

function evidence(records) {
  const current = demo.evidence(records);
  return {
    needActive: current.finding.active,
    independentShown: current.independentStatus === 'demonstrated',
    laterReviewPending: current.review.status === 'pending_intervening',
  };
}

export function createLessonPractice({ initialSupport = false } = {}) {
  const first = demo.assess('missing', { assisted: initialSupport });
  const helped = demo.assess('supported', { assisted: true });
  const fresh = demo.assess('supported', { fresh: true });
  return {
    practice: response(first),
    helped: response(helped),
    fresh: response(fresh),
    teachingSteps: demo.help.visual.steps.map((step) => step.split('\n')[0]),
    afterPractice: evidence([first]),
    afterHelp: evidence([first, helped]),
    afterFresh: evidence([first, helped, fresh]),
  };
}
