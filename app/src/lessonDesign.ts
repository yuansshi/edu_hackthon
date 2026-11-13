import type { TeachingProfile } from './handoff';

export type LessonDesign = {
  learner: string;
  approach: 'guided' | 'challenge' | 'balanced';
  opening: string;
  encouragement: string;
  pacing: string;
  supportLabels: string[];
  rationale: { title: string; detail: string; sourceIds: string[] }[];
  sourceRevision: number;
};

const supportedArrangements = [
  'Visible steps',
  'An example to start',
  'Hints when I ask',
  'Quiet thinking time',
  'A quick check-in',
  'A first-step plan',
];

/** Consumes an internal reviewed handoff; external JSON needs its own parser. */
export function designLesson(profile: TeachingProfile): LessonDesign {
  const routine = profile.routine;
  const base = {
    learner: profile.learner.alias.trim() || 'Learner',
    sourceRevision: profile.revision,
  };
  if (!routine || routine.acceptedRevision !== profile.revision) {
    return {
      ...base,
      approach: 'balanced',
      opening:
        'Choose whether to try first or see an example. We can change the approach together.',
      encouragement: 'Use a calm, factual check and ask which feedback feels useful.',
      pacing: 'Choose a comfortable work block and pause; no timed routine has been confirmed.',
      supportLabels: [],
      rationale: [
        {
          title: 'Your choice comes first',
          detail:
            'A routine has not been confirmed for this reviewed profile. No personality type or pace is inferred from missing information.',
          sourceIds: ['revision', 'routine'],
        },
      ],
    };
  }

  const choices = routine.choices;
  const supportLabels = supportedArrangements.filter((label) => choices.supports.includes(label));
  const asksForGuidance = supportLabels.some((label) =>
    ['Visible steps', 'An example to start', 'A first-step plan'].includes(label),
  );
  const approach = asksForGuidance
    ? 'guided'
    : choices.challenge === 'stretch'
      ? 'challenge'
      : 'balanced';
  const opening =
    approach === 'guided'
      ? 'We can begin with one example and one small step. Then you can try a new problem.'
      : approach === 'challenge'
        ? 'Try the problem first and show how you know. You can ask for a hint or a check-in.'
        : 'Choose whether to try first or see an example. We can change the approach together.';
  const encouragement = {
    progress: 'Notice the step you explained or corrected.',
    private: 'Keep feedback private and kind.',
    points:
      'Use a small progress marker after a completed step; it is separate from the math evidence.',
    none: 'Use a calm, factual check without extra praise.',
  }[choices.encouragement];
  const profileContextIds = profile.dimensions
    .filter((dimension) => !dimension.corrections.some((item) => item.status === 'disagree'))
    .flatMap((dimension) => dimension.studentReports.map((item) => item.sourceId))
    .filter((id) => /^LDS-Q(?:07|09|10|24-[SICOF])$/.test(id));

  return {
    ...base,
    approach,
    opening,
    encouragement,
    pacing: `Try a ${choices.focus}-minute work block, then choose a ${choices.pause}-minute pause. These are your trial choices.`,
    supportLabels,
    rationale: [
      {
        title: 'Your confirmed choice',
        detail:
          'The opening follows support and challenge choices in your confirmed routine. This is an adjustable arrangement, not a personality label.',
        sourceIds: ['routine.choices.supports', 'routine.choices.challenge'],
      },
      {
        title: 'Profile context available',
        detail: profileContextIds.length
          ? 'These questionnaire sources remain available as context. They do not control the lesson or certify agreement; only the confirmed routine controls this opening.'
          : 'No undisputed questionnaire context is available for these arrangements. The routine remains a direct choice, not an inferred trait.',
        sourceIds: [...new Set(profileContextIds)],
      },
      {
        title: 'A pace you can change',
        detail:
          'Work and pause lengths copy your chosen trial. They are not measurements of concentration or ability.',
        sourceIds: ['routine.choices.focus', 'routine.choices.pause'],
      },
      {
        title: 'Feedback on your terms',
        detail:
          'Encouragement follows your confirmed preference. Math correctness and evidence requirements stay the same.',
        sourceIds: ['routine.choices.encouragement'],
      },
    ],
  };
}
