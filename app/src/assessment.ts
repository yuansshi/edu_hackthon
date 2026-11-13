import { z } from 'zod';
import questionData from './questions.json';
import { DESIGN_REQUIREMENTS, getActivityObservations } from './activityModel';
import type { ActivityRecord } from './activityModel';

export const dimensionSchema = z.enum([
  'personality',
  'focus',
  'reasoning',
  'pace',
  'motivation',
  'management',
  'confidence',
  'interaction',
]);
export type Dimension = z.infer<typeof dimensionSchema>;

export const DIMENSIONS = [
  {
    id: 'personality',
    title: 'How you approach learning',
    shortTitle: 'Learning habits',
    description: 'Curiosity, organization, learning with others, and stressful moments.',
    color: '#b291d4',
  },
  {
    id: 'focus',
    title: 'Finding your focus',
    shortTitle: 'Focus & returning',
    description: 'Conditions you report as helpful and ways you return to a task.',
    color: '#75aaa0',
  },
  {
    id: 'reasoning',
    title: 'Learning a new rule',
    shortTitle: 'Rules & reasoning',
    description: 'Examples of using a visible rule, explaining, and choosing help.',
    color: '#d6a468',
  },
  {
    id: 'pace',
    title: 'Your pace and instructions',
    shortTitle: 'Pace & support',
    description: 'The pace and kinds of instructions you would like to try.',
    color: '#7c9ac4',
  },
  {
    id: 'motivation',
    title: 'What makes learning matter',
    shortTitle: 'Reasons to learn',
    description: 'Your separate reasons for effort; several can fit at once.',
    color: '#d28b99',
  },
  {
    id: 'management',
    title: 'Starting, planning, and checking',
    shortTitle: 'Managing a task',
    description: 'Getting started, planning, returning, checking, and asking for help.',
    color: '#91a96d',
  },
  {
    id: 'confidence',
    title: 'Confidence and trying again',
    shortTitle: 'Confidence',
    description: 'What you report about new tasks and continuing after a mistake.',
    color: '#c7966d',
  },
  {
    id: 'interaction',
    title: 'Learning with other people',
    shortTitle: 'Working together',
    description: 'Arrangements you would like to try with a teacher or tutor.',
    color: '#8490c5',
  },
] satisfies {
  id: Dimension;
  title: string;
  shortTitle: string;
  description: string;
  color: string;
}[];

export const questionSchema = z
  .object({
    id: z.string().regex(/^LDS-Q\d{2}(?:-[SICOF])?$/),
    dimension: dimensionSchema,
    section: z.string().min(1),
    prompt: z.string().min(1),
    context: z.string(),
    kind: z.enum(['single', 'multi']),
    maxChoices: z.number().int().min(1),
    options: z
      .array(
        z.object({ value: z.string().min(1), label: z.string().min(1), exclusive: z.boolean() }),
      )
      .min(1),
  })
  .superRefine((question, context) => {
    if (question.kind === 'single' && question.maxChoices !== 1) {
      context.addIssue({
        code: 'custom',
        message: 'A single-choice question allows exactly one choice.',
      });
    }
    if (new Set(question.options.map((option) => option.value)).size !== question.options.length) {
      context.addIssue({
        code: 'custom',
        message: 'Option values must be unique within a question.',
      });
    }
  });
export type Question = z.infer<typeof questionSchema>;
export const questions = z.array(questionSchema).parse(questionData);

export const answerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('selected'), values: z.array(z.string()), other: z.string() }),
  z.object({ kind: z.literal('skipped') }),
]);
export type Answer = z.infer<typeof answerSchema>;
export const correctionSchema = z.object({
  dimension: dimensionSchema,
  note: z.string(),
  status: z.enum(['comment', 'disagree']),
});
export type Correction = z.infer<typeof correctionSchema>;

export type EvidenceLine = { sourceId: string; label: string; text: string };
export type ReportSection = {
  id: Dimension;
  title: string;
  summary: string;
  said: EvidenceLine[];
  observed: EvidenceLine[];
  unknown: string;
  tryNext: string[];
  correction: Correction | null;
};

export function toggleChoice({
  question,
  current,
  value,
}: {
  question: Question;
  current: Answer | undefined;
  value: string;
}): Answer {
  const option = question.options.find((choice) => choice.value === value);
  if (!option) throw new RangeError(`Unknown choice for ${question.id}.`);
  const previous =
    current?.kind === 'selected'
      ? current
      : ({ kind: 'selected', values: [], other: '' } satisfies Answer);
  const selected = (values: string[]): Answer => ({
    kind: 'selected',
    values,
    other: values.includes('other') ? previous.other : '',
  });
  if (question.kind === 'single') return selected([value]);
  if (previous.values.includes(value))
    return selected(previous.values.filter((choice) => choice !== value));
  if (option.exclusive) return selected([value]);
  const concrete = previous.values.filter((choice) =>
    question.options.some((item) => item.value === choice && !item.exclusive),
  );
  if (concrete.length >= question.maxChoices) return current ?? previous;
  return selected([...concrete, value]);
}

const labels: Record<string, string> = {
  'LDS-Q01': 'Curiosity',
  'LDS-Q02': 'Organization',
  'LDS-Q03': 'Wanting to talk with others',
  'LDS-Q04': 'Wanting to listen to each other’s ideas',
  'LDS-Q05': 'Stress making it hard to think clearly',
  'LDS-Q06': 'Attention moving away',
  'LDS-Q07': 'Reported focus conditions',
  'LDS-Q08': 'Reported ways to return',
  'LDS-Q09': 'Pace to try',
  'LDS-Q10': 'Instructions to try',
  'LDS-Q11': 'Enjoyment',
  'LDS-Q12': 'Personal value',
  'LDS-Q13': 'Your own improvement goal',
  'LDS-Q14': 'Recognition',
  'LDS-Q15': 'Optional rewards',
  'LDS-Q16': 'Feeling pushed',
  'LDS-Q17': 'Starting',
  'LDS-Q18': 'Planning',
  'LDS-Q19': 'Returning after distraction',
  'LDS-Q20': 'Checking',
  'LDS-Q21': 'Asking for help',
  'LDS-Q22': 'Belief about a new task',
  'LDS-Q23': 'Continuing after a mistake',
  'LDS-Q24-S': 'Structure',
  'LDS-Q24-I': 'Independence',
  'LDS-Q24-C': 'Conversation',
  'LDS-Q24-O': 'Choice',
  'LDS-Q24-F': 'Private feedback',
};

const openValues = new Set(['depends', 'unsure', 'no-chance', 'no-opportunity', 'skip']);
type ResponseFact = { question: Question; line: EvidenceLine; open: boolean; choices: string[] };

function questionContext(question: Question): string {
  return question.dimension === 'motivation'
    ? 'Past 14 days, as a reason for effort'
    : question.dimension === 'pace'
      ? 'For a new learning activity'
      : question.dimension === 'interaction'
        ? 'With a tutor or teacher'
        : 'Past 14 days';
}

function responseFact(question: Question, answer: Answer | undefined): ResponseFact | undefined {
  const label = labels[question.id] ?? question.prompt;
  if (!answer) return undefined;
  if (answer.kind === 'skipped') {
    return {
      question,
      line: {
        sourceId: question.id,
        label,
        text: `“${question.prompt}” You chose to skip this question.`,
      },
      open: true,
      choices: [],
    };
  }
  const selected = question.options.filter((option) => answer.values.includes(option.value));
  if (!selected.length) return undefined;
  const choices = selected.map((option) =>
    option.value === 'other' && answer.other.trim()
      ? `${option.label}: ${answer.other}`
      : option.value === 'other'
        ? `${option.label} (not specified yet)`
        : option.label,
  );
  return {
    question,
    line: {
      sourceId: question.id,
      label,
      text: `${questionContext(question)}: “${question.prompt}” You chose “${choices.join('” and “')}”.`,
    },
    open: selected.some(
      (option) =>
        openValues.has(option.value) || (option.value === 'other' && !answer.other.trim()),
    ),
    choices,
  };
}

type ActivityReport = { dimension: Dimension; line: EvidenceLine; open: boolean; summary: string };
type ActivityObservation = { dimension: Dimension; line: EvidenceLine };
const activityContexts: Record<
  ActivityRecord['id'],
  { dimension: Dimension; sourceId: string; task: string }
> = {
  rules: { dimension: 'reasoning', sourceId: 'LDS-A01', task: 'the rule activity' },
  design: { dimension: 'management', sourceId: 'LDS-A02', task: 'the supplies guide' },
  focus: { dimension: 'focus', sourceId: 'LDS-A03', task: 'matching pairs' },
};
const reflectionQuestions = {
  rules: {
    r1: {
      dimension: 'confidence',
      question: 'How sure do you feel about using this rule now?',
      summaryLabel: 'Using this rule now',
    },
    r2: {
      dimension: 'reasoning',
      question: 'What helped, if anything?',
      summaryLabel: 'What you said helped',
    },
    r3: {
      dimension: 'pace',
      question: 'For another new rule, what would you try first?',
      summaryLabel: 'First choice for another new rule',
    },
  },
  design: {
    r1: {
      dimension: 'management',
      question: 'What helped you begin?',
      summaryLabel: 'What you said helped you begin',
    },
    r2: {
      dimension: 'pace',
      question: 'Would you want anything different for a task with more steps?',
      summaryLabel: 'For a task with more steps',
    },
    r3: {
      dimension: 'confidence',
      question: 'If one part needed changing, what would you like to do?',
      summaryLabel: 'If one part needed changing',
    },
  },
  focus: {
    r1: {
      dimension: 'focus',
      question: 'How was it to stay with this small activity today?',
      summaryLabel: 'Staying with this small activity today',
    },
    r2: {
      dimension: 'focus',
      question: 'If you lost your place or your mind wandered, what did you do?',
      summaryLabel: 'If you lost your place or your mind wandered',
    },
    r3: {
      dimension: 'focus',
      question: 'What would you change next time?',
      summaryLabel: 'What you would change next time',
    },
  },
} satisfies Record<
  ActivityRecord['id'],
  Record<
    keyof ActivityRecord['reflections'],
    { dimension: Dimension; question: string; summaryLabel: string }
  >
>;

function isOpenReportChoice(choice: string): boolean {
  const text = choice.trim().toLowerCase();
  return (
    text.startsWith('depends') ||
    text === 'not sure' ||
    text.startsWith('prefer to skip') ||
    [
      'skip',
      'another way',
      'another choice',
      'another support',
      'i did not notice this happen',
    ].includes(text)
  );
}

function shortSummary(text: string): string {
  const characters = Array.from(text);
  return characters.length <= 180 ? text : `${characters.slice(0, 179).join('').trimEnd()}…`;
}

function activityEvidence(record: ActivityRecord): {
  reports: ActivityReport[];
  observations: ActivityObservation[];
} {
  if (record.status === 'new' || record.status === 'skipped')
    return { reports: [], observations: [] };
  const context = activityContexts[record.id];
  const reports: ActivityReport[] = [];
  const addReport = (input: {
    dimension: Dimension;
    sourceId: string;
    label: string;
    text: string;
    summary: string;
    open?: boolean;
  }) => {
    reports.push({
      dimension: input.dimension,
      line: { sourceId: input.sourceId, label: input.label, text: input.text },
      open: input.open ?? false,
      summary: shortSummary(input.summary),
    });
  };
  const reflectionTask =
    record.id === 'rules'
      ? record.reflectionVersion === 'code'
        ? 'the two-step code'
        : 'same ends sorting'
      : context.task;
  for (const field of ['r1', 'r2', 'r3'] satisfies (keyof ActivityRecord['reflections'])[]) {
    const answers = record.reflections[field];
    if (!answers.length) continue;
    const prompt = reflectionQuestions[record.id][field];
    addReport({
      dimension: prompt.dimension,
      sourceId: `${context.sourceId}-${field.toUpperCase()}`,
      label: prompt.question,
      text: `For ${reflectionTask}, “${prompt.question}” You chose “${answers.join('” and “')}”.`,
      summary: `For ${reflectionTask}, ${prompt.summaryLabel.toLowerCase()}: ${answers.join('; ')}.`,
      open: answers.some(isOpenReportChoice),
    });
  }
  if (record.responseMethod) {
    addReport({
      dimension: 'pace',
      sourceId: context.sourceId,
      label: 'Chosen response method',
      text: `For ${context.task}, you selected the response method “${record.responseMethod}”.`,
      summary: `For ${context.task}, chosen response method: ${record.responseMethod}.`,
    });
  }
  if (record.note) {
    addReport({
      dimension: context.dimension,
      sourceId: context.sourceId,
      label: 'Your addition',
      text: `For ${context.task}, you added “${record.note}”.`,
      summary: `About ${context.task}, you added: “${record.note}”.`,
    });
  }
  if (record.id === 'focus') {
    if (record.supports.length) {
      addReport({
        dimension: 'focus',
        sourceId: 'LDS-A03-S1',
        label: 'Chosen matching supports',
        text: `For matching pairs, you chose these supports: “${record.supports.join('” and “')}”.`,
        summary: `For matching pairs, chosen supports: ${record.supports.join('; ')}.`,
        open: record.supports.some(isOpenReportChoice),
      });
    }
    for (const change of record.supportHistory) {
      addReport({
        dimension: 'focus',
        sourceId: 'LDS-A03-S1',
        label: 'Matching support request',
        text: `Before matching pair ${change.beforePair}, your support choices were “${change.choices.join('” and “') || 'none selected'}”.`,
        summary: `Before matching pair ${change.beforePair}, chosen supports: ${change.choices.join('; ') || 'none selected'}.`,
        open: !change.choices.length || change.choices.some(isOpenReportChoice),
      });
    }
  }
  if (record.id === 'design') {
    const selfCheckLabels = {
      fits: 'Fits',
      change: 'Want to change',
      'not-sure': 'Not sure',
      skip: 'Skip',
    };
    record.work.selfCheck.forEach((answer, index) => {
      if (!answer) return;
      addReport({
        dimension: 'management',
        sourceId: 'LDS-A02-XC1',
        label: 'Your guide self-check',
        text: `For the supplies-guide requirement “${DESIGN_REQUIREMENTS[index]}”, your self-check was “${selfCheckLabels[answer]}”.`,
        summary: `Your supplies-guide self-check, “${DESIGN_REQUIREMENTS[index]}”: ${selfCheckLabels[answer]}.`,
        open: answer === 'not-sure' || answer === 'skip',
      });
    });
  }
  const observations = getActivityObservations(record)
    .filter(
      (item) =>
        !/-R[123]$/.test(item.sourceId) &&
        !item.id.endsWith('-method') &&
        !item.id.endsWith('-note') &&
        item.sourceId !== 'LDS-A03-S1' &&
        item.sourceId !== 'LDS-A02-XC1',
    )
    .map((item) => ({
      dimension: context.dimension,
      line: { sourceId: item.sourceId, label: 'Activity record', text: item.text },
    }));
  return { reports, observations };
}

function suggestionsFor(
  id: Dimension,
  facts: ResponseFact[],
  observed: EvidenceLine[],
  activityReports: ActivityReport[],
): string[] {
  const concrete = facts.filter((fact) => !fact.open);
  if (!concrete.length && !observed.length && !activityReports.some((report) => !report.open))
    return [];
  const requested = concrete.filter(
    (fact) =>
      ['LDS-Q07', 'LDS-Q09', 'LDS-Q10'].includes(fact.question.id) ||
      fact.question.id.startsWith('LDS-Q24-'),
  );
  if (requested.length) {
    return requested.flatMap((fact) =>
      fact.choices.map(
        (choice) =>
          `If you still want to, try “${choice}” in a real learning task. Review whether you want to keep or change it.`,
      ),
    );
  }
  switch (id) {
    case 'personality':
      return [
        'Use your separate answers above to talk about one recent example, if you want. Leave room for a different experience next time.',
      ];
    case 'focus':
      return [
        'Choose a focus condition or a pause-and-return plan to try in a real task. Check with yourself afterward.',
      ];
    case 'reasoning':
      return [
        'For the rule activity described above, choose an example, explanation, hint, or fresh attempt you want next. Keep the rule visible if you want.',
      ];
    case 'pace':
      return [
        'Choose a pace or instruction format you want to try. You can change your choice during the task.',
      ];
    case 'motivation':
      return [
        'Keep your reasons above separate. Choose a purpose, goal, encouragement, or optional reward you want to try; help and breaks never have to be earned.',
      ];
    case 'management':
      return [
        'Choose starting, planning, returning, checking, or asking for help and a small support to try in a real task. Review what helped and what you would change.',
      ];
    case 'confidence':
      return [
        'Choose another approach, help, a pause, or a fresh attempt. You can decide what to try after that.',
      ];
    case 'interaction':
      return [
        'Choose one arrangement above to try with your teacher or tutor, then decide together whether to change it.',
      ];
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

function summarizeSection(
  facts: ResponseFact[],
  reports: ActivityReport[],
  observed: EvidenceLine[],
): string {
  const [first, ...remaining] = facts.filter((fact) => !fact.open);
  if (first) {
    const descriptions = [first, ...remaining]
      .slice(0, 2)
      .map((fact) => shortSummary(`${fact.line.label}: ${fact.choices.join('; ')}.`));
    return `${questionContext(first.question)}. ${descriptions.join(' ')}`;
  }
  const reported = reports.filter((report) => !report.open).slice(0, 2);
  if (reported.length) return reported.map((report) => report.summary).join(' ');
  if (observed.length)
    return `In this activity: ${observed
      .slice(0, 2)
      .map((line) => shortSummary(line.text))
      .join(' ')}`;
  return 'This part can stay open. You do not need to turn uncertainty into an answer.';
}

export function buildReport({
  answers,
  activities,
  corrections,
}: {
  answers: Record<string, Answer>;
  activities: ActivityRecord[];
  corrections: Correction[];
}): ReportSection[] {
  const facts = questions.flatMap((question) => {
    const fact = responseFact(question, answers[question.id]);
    return fact ? [fact] : [];
  });
  const activityFacts = activities.map(activityEvidence);
  const activityReports = activityFacts.flatMap((evidence) => evidence.reports);
  const observations = activityFacts.flatMap((evidence) => evidence.observations);
  return DIMENSIONS.map((dimension) => {
    const sectionFacts = facts.filter((fact) => fact.question.dimension === dimension.id);
    const sectionActivityReports = activityReports.filter(
      (report) => report.dimension === dimension.id,
    );
    const said = [
      ...sectionFacts.map((fact) => fact.line),
      ...sectionActivityReports.map((report) => report.line),
    ];
    const observed = observations
      .filter((observation) => observation.dimension === dimension.id)
      .map((observation) => observation.line);
    const correction = corrections.findLast((item) => item.dimension === dimension.id) ?? null;
    const disputed = correction?.status === 'disagree';
    const hasConcreteReport =
      sectionFacts.some((fact) => !fact.open) ||
      sectionActivityReports.some((report) => !report.open);
    const hasEvidence = hasConcreteReport || observed.length > 0;
    const sectionQuestions = questions.filter((question) => question.dimension === dimension.id);
    const hasOpenAnswers =
      sectionActivityReports.some((report) => report.open) ||
      sectionQuestions.some((question) => {
        const fact = sectionFacts.find((item) => item.question.id === question.id);
        return !fact || fact.open;
      });
    let summary = summarizeSection(sectionFacts, sectionActivityReports, observed);
    let unknown = hasEvidence
      ? 'Other settings, tasks, and supports remain untried. These examples do not establish a fixed trait or ability.'
      : 'There is not enough information here to describe this part yet. Skipped or unreached work tells us nothing about your ability.';
    if (hasOpenAnswers && hasEvidence)
      unknown = `Some questions are unanswered, skipped, or left uncertain. ${unknown}`;
    if (disputed) {
      summary =
        'You said this part does not fit. Your note stays with the record, and this section remains open.';
      unknown =
        'Your disagreement is unresolved. Choose what to change or leave open before deciding on a suggestion.';
    }
    return {
      id: dimension.id,
      title: dimension.title,
      summary,
      said,
      observed,
      unknown,
      tryNext: disputed
        ? []
        : suggestionsFor(dimension.id, sectionFacts, observed, sectionActivityReports),
      correction,
    };
  });
}
