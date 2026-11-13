import { z } from 'zod';

export const activityIdSchema = z.enum(['rules', 'design', 'focus']);
export type ActivityId = z.infer<typeof activityIdSchema>;
const statusSchema = z.enum(['new', 'working', 'complete', 'skipped']);
const shortText = z.string().max(2000);
const choiceSchema = z.enum(['', 'same', 'different', 'not-sure', 'skip']);
const shapeSchema = z.enum(['', '○', '△', '□']);
const sortingSchema = z.object({
  p1: choiceSchema,
  p2: choiceSchema,
  p3: choiceSchema,
  p4: choiceSchema,
  n1: choiceSchema,
  n2: choiceSchema,
  n3: choiceSchema,
});
export type SortingWork = z.infer<typeof sortingSchema>;
const codeEntry = (length: number) =>
  z.object({
    reversed: z.array(shapeSchema).length(length),
    coded: z.array(shapeSchema).length(length),
    disposition: z.enum(['working', 'not-sure', 'skip']),
  });
const codeSchema = z.object({ x1: codeEntry(4), x2: codeEntry(5), xn1: codeEntry(6) });
export type CodeWork = z.infer<typeof codeSchema>;
const hintSchema = z.object({
  id: z.string().max(80),
  text: shortText,
  beforeItem: z.string().max(80),
});
const reflectionSchema = z.object({
  r1: z.array(shortText).max(12),
  r2: z.array(shortText).max(12),
  r3: z.array(shortText).max(12),
});
export type Reflections = z.infer<typeof reflectionSchema>;
const rulesSnapshotSchema = z.object({
  mode: z.enum(['sorting', 'code']),
  sorting: sortingSchema,
  code: codeSchema,
  explanationSort: shortText,
  explanationCode: shortText,
  explanationStrip: z.string().max(20),
});
const rulesRecordSchema = z.object({
  id: z.literal('rules'),
  status: statusSchema,
  mode: z.enum(['sorting', 'code']),
  sorting: sortingSchema,
  code: codeSchema,
  explanationSort: shortText,
  explanationCode: shortText,
  explanationStrip: z.string().max(20),
  currentItem: z.string().max(80),
  hints: z.array(hintSchema).max(100),
  submissions: z.array(rulesSnapshotSchema).max(100),
  reflections: reflectionSchema,
  reflectionVersion: z.enum(['sorting', 'code']),
  responseMethod: shortText,
  note: shortText,
  showFeedback: z.boolean(),
});
const borrowIdSchema = z.enum(['choose', 'log', 'take']);
const returnIdSchema = z.enum(['return', 'cross']);
const selfCheckSchema = z.enum(['', 'fits', 'change', 'not-sure', 'skip']);
const designWorkSchema = z
  .object({
    title: z.string().max(100),
    borrow: z.array(borrowIdSchema).length(3),
    returnSteps: z.array(returnIdSchema).length(2),
    helpMessage: z.string().max(200),
    symbol: z.string().max(30),
    symbolMeaning: z.string().max(200),
    selfCheck: z.array(selfCheckSchema).length(6),
  })
  .refine(
    (work) => new Set(work.borrow).size === 3 && new Set(work.returnSteps).size === 2,
    'Each source step must appear exactly once.',
  );
export type DesignWork = z.infer<typeof designWorkSchema>;
const designRecordSchema = z.object({
  id: z.literal('design'),
  status: statusSchema,
  work: designWorkSchema,
  submissions: z.array(designWorkSchema).max(100),
  hints: z.array(hintSchema).max(100),
  reflections: reflectionSchema,
  responseMethod: shortText,
  note: shortText,
  showFeedback: z.boolean(),
});
const matchDecisionSchema = z.enum(['unreached', 'match', 'different', 'not-sure', 'skip']);
const matchingWorkSchema = z.array(matchDecisionSchema).length(12);
const focusRecordSchema = z.object({
  id: z.literal('focus'),
  status: statusSchema,
  decisions: matchingWorkSchema,
  submissions: z.array(matchingWorkSchema).max(100),
  supports: z.array(shortText).max(8),
  supportHistory: z
    .array(
      z.object({ choices: z.array(shortText).max(8), beforePair: z.number().int().min(1).max(12) }),
    )
    .max(100),
  row: z.number().int().min(0).max(3),
  marker: z.number().int().min(0).max(11).nullable(),
  hints: z.array(hintSchema).max(100),
  reflections: reflectionSchema,
  responseMethod: shortText,
  note: shortText,
  showFeedback: z.boolean(),
});
export const activityRecordSchema = z.discriminatedUnion('id', [
  rulesRecordSchema,
  designRecordSchema,
  focusRecordSchema,
]);
export type ActivityRecord = z.infer<typeof activityRecordSchema>;
export type RulesRecord = Extract<ActivityRecord, { id: 'rules' }>;
export type DesignRecord = Extract<ActivityRecord, { id: 'design' }>;
export type FocusRecord = Extract<ActivityRecord, { id: 'focus' }>;

export const SORT_ITEMS: readonly {
  id: keyof SortingWork;
  sourceId: string;
  strip: string;
  key: 'same' | 'different';
}[] = [
  { id: 'p1', sourceId: 'LDS-A01-P1', strip: '○ △ ○', key: 'same' },
  { id: 'p2', sourceId: 'LDS-A01-P2', strip: '□ ○ △', key: 'different' },
  { id: 'p3', sourceId: 'LDS-A01-P3', strip: '△ □ △', key: 'same' },
  { id: 'p4', sourceId: 'LDS-A01-P4', strip: '○ △ □', key: 'different' },
  { id: 'n1', sourceId: 'LDS-A01-N1', strip: '□ ○ △ □', key: 'same' },
  { id: 'n2', sourceId: 'LDS-A01-N2', strip: '△ ○ □ ○', key: 'different' },
  { id: 'n3', sourceId: 'LDS-A01-N3', strip: '○ □ △ □ ○', key: 'same' },
];
export const CODE_ITEMS: readonly {
  id: keyof CodeWork;
  sourceId: string;
  input: string;
  reversed: string;
  coded: string;
}[] = [
  { id: 'x1', sourceId: 'LDS-A01-X1', input: '△ ○ □ ○', reversed: '○ □ ○ △', coded: '△ ○ △ □' },
  {
    id: 'x2',
    sourceId: 'LDS-A01-X2',
    input: '□ △ ○ □ △',
    reversed: '△ □ ○ △ □',
    coded: '□ ○ △ □ ○',
  },
  {
    id: 'xn1',
    sourceId: 'LDS-A01-XN1',
    input: '○ □ △ △ ○ □',
    reversed: '□ ○ △ △ □ ○',
    coded: '○ △ □ □ ○ △',
  },
];
export const PAIRS = [
  '○ △',
  '△ ○',
  '○ □',
  '○ △',
  '□ △',
  '○ △',
  '△ □',
  '□ ○',
  '○ △',
  '△ △',
  '○ ○',
  '○ △',
];
export const MATCH_NUMBERS = [1, 4, 6, 9, 12];
export const BORROW_STEPS = {
  choose: 'Choose an item.',
  log: 'Write your name and the chosen item in the log.',
  take: 'Take the item.',
};
export const RETURN_STEPS = {
  return: 'Put the item in the return box.',
  cross: 'Cross out your log entry.',
};
export const DESIGN_REQUIREMENTS = [
  'A title with no more than five words',
  'Two sections labeled BORROW and RETURN',
  'Three BORROW steps following the source notes',
  'Two RETURN steps following the source notes',
  '“Ask if an item is missing.” near BORROW',
  'A symbol beside a section label, with its meaning',
];
export const HINTS = {
  sortPoint: {
    id: 'LDS-A01-H1',
    text: 'Point to the first shape. Now point to the last shape. Are those two the same or different?',
  },
  sortModel: {
    id: 'LDS-A01-H2',
    text: '□ △ □ — The first shape is a square. The last shape is a square. They match, so I choose Same ends. The triangle in the middle does not change my choice.',
  },
  reverse: {
    id: 'LDS-A01-XH1',
    text: 'Start with the last shape. Copy it first. Move toward the start, copying one shape at a time. You can mark the shapes you have copied.',
  },
  replace: {
    id: 'LDS-A01-XH2',
    text: 'Use your reversed strip. Point to its first shape and find that shape in the left column. Write the shape beside it from the right column. Do that once for each position.',
  },
  plan: {
    id: 'LDS-A02-XH1',
    text: 'Which parts of the brief are about the steps, and which are about how the guide looks? You can mark them or talk about them.',
  },
  order: {
    id: 'LDS-A02-XH2',
    text: 'Find the notes that say “before” or “after.” Use one to decide which step comes first.',
  },
  check: {
    id: 'LDS-A02-XH3',
    text: 'We can read one requirement and compare it with your guide. Which one would you like to check?',
  },
  match: {
    id: 'LDS-A03-H1',
    text: 'Look at the sample: circle, then triangle. Compare both shapes and their order with one numbered pair.',
  },
};

export function createActivity(id: ActivityId): ActivityRecord {
  const common = {
    status: 'new',
    hints: [],
    submissions: [],
    reflections: { r1: [], r2: [], r3: [] },
    responseMethod: '',
    note: '',
    showFeedback: false,
  };
  switch (id) {
    case 'rules':
      return rulesRecordSchema.parse({
        ...common,
        id,
        mode: 'sorting',
        currentItem: 'LDS-A01-P1',
        sorting: { p1: '', p2: '', p3: '', p4: '', n1: '', n2: '', n3: '' },
        code: { x1: emptyCode(4), x2: emptyCode(5), xn1: emptyCode(6) },
        explanationSort: '',
        explanationCode: '',
        explanationStrip: '',
        reflectionVersion: 'sorting',
      });
    case 'design':
      return designRecordSchema.parse({
        ...common,
        id,
        work: {
          title: '',
          borrow: ['take', 'choose', 'log'],
          returnSteps: ['cross', 'return'],
          helpMessage: '',
          symbol: '',
          symbolMeaning: '',
          selfCheck: ['', '', '', '', '', ''],
        },
      });
    case 'focus':
      return focusRecordSchema.parse({
        ...common,
        id,
        decisions: Array.from({ length: 12 }, () => 'unreached'),
        supports: [],
        supportHistory: [],
        row: 0,
        marker: null,
      });
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}
function emptyCode(length: number) {
  return {
    reversed: Array.from({ length }, () => ''),
    coded: Array.from({ length }, () => ''),
    disposition: 'working',
  };
}

/** Only statements about saved choices/work. No behavioral or ability inference. */
export function getActivityObservations(
  record: ActivityRecord,
): { id: string; sourceId: string; text: string }[] {
  if (record.status === 'new' || record.status === 'skipped') return [];
  const facts: { id: string; sourceId: string; text: string }[] = [];
  const add = (sourceId: string, text: string, suffix = '') =>
    facts.push({ id: `${sourceId}${suffix}`, sourceId, text });
  const prefix = record.id === 'rules' ? 'LDS-A01' : record.id === 'design' ? 'LDS-A02' : 'LDS-A03';
  if (record.responseMethod)
    add(prefix, `Selected response method: ${record.responseMethod}.`, '-method');
  for (const [index, hint] of record.hints.entries())
    add(hint.id, `Opened help at ${hint.beforeItem}: “${hint.text}”`, `-${index}`);
  if (record.id === 'rules') {
    for (const item of SORT_ITEMS) {
      const response = record.sorting[item.id];
      if (response) add(item.sourceId, `For ${item.strip}, chose “${sortLabel(response)}”.`);
    }
    for (const item of CODE_ITEMS) {
      const response = record.code[item.id];
      if (response.disposition !== 'working')
        add(
          item.sourceId,
          `For input ${item.input}, chose “${response.disposition === 'skip' ? 'Skip' : 'Not sure'}”.`,
        );
      else if ([...response.reversed, ...response.coded].some(Boolean))
        add(
          item.sourceId,
          `For input ${item.input}, entered reversed ${response.reversed.map((s) => s || '—').join(' ')} and coded ${response.coded.map((s) => s || '—').join(' ')}.`,
        );
    }
    if (record.explanationSort)
      add(
        'LDS-A01-E1',
        `Explanation${record.explanationStrip ? ` for ${record.explanationStrip}` : ''}: “${record.explanationSort}”.`,
      );
    if (record.explanationCode)
      add('LDS-A01-XE1', `Two-step explanation: “${record.explanationCode}”.`);
    if (record.submissions.length)
      add(
        prefix,
        `Saved ${record.submissions.length === 1 ? 'an initial work snapshot' : 'initial and later work snapshots'}; the original is retained.`,
        '-snapshots',
      );
  } else if (record.id === 'design') {
    const work = record.work;
    if (work.title) add('LDS-A02-XW1', `Guide title: “${work.title}”.`, '-title');
    if (
      work.title ||
      record.submissions.length ||
      work.borrow.join() !== 'take,choose,log' ||
      work.returnSteps.join() !== 'cross,return'
    ) {
      add(
        'LDS-A02-XW1',
        `BORROW order: ${work.borrow.map((id) => BORROW_STEPS[id]).join(' → ')} RETURN order: ${work.returnSteps.map((id) => RETURN_STEPS[id]).join(' → ')}`,
        '-order',
      );
    }
    if (work.helpMessage)
      add('LDS-A02-XW1', `Help message placed beside BORROW: “${work.helpMessage}”.`, '-message');
    if (work.symbol)
      add(
        'LDS-A02-XW1',
        `Section symbol: “${work.symbol}”; stated meaning: “${work.symbolMeaning || 'not provided'}”.`,
        '-symbol',
      );
    work.selfCheck.forEach((value, index) => {
      if (value)
        add(
          'LDS-A02-XC1',
          `For requirement ${index + 1}, self-check choice was “${value}”.`,
          `-${index}`,
        );
    });
    if (record.submissions.length)
      add(
        'LDS-A02-XW1',
        'The first submitted guide is retained separately from the current guide.',
        '-original',
      );
  } else {
    record.decisions.forEach((choice, index) => {
      if (choice !== 'unreached')
        add(
          `LDS-A03-M${String(index + 1).padStart(2, '0')}`,
          `For pair ${index + 1} (${PAIRS[index]}), chose “${choice === 'match' ? 'Exact match' : choice === 'different' ? 'Different' : choice === 'skip' ? 'Skip' : 'Not sure'}”.`,
        );
    });
    if (record.supports.length)
      add('LDS-A03-S1', `Selected supports: ${record.supports.join('; ')}.`);
    for (const [index, change] of record.supportHistory.entries())
      add(
        'LDS-A03-S1',
        `Support selection before pair ${change.beforePair}: ${change.choices.join('; ') || 'none selected'}.`,
        `-change-${index}`,
      );
  }
  if (record.reflections.r1.length)
    add(
      `${prefix}-R1`,
      `Student reflection: “${record.reflections.r1.join('; ')}”${record.id === 'rules' ? ` about ${record.reflectionVersion === 'code' ? 'the two-step code' : 'same ends sorting'}` : ''}.`,
    );
  if (record.reflections.r2.length)
    add(`${prefix}-R2`, `Student selected: ${record.reflections.r2.join('; ')}.`);
  if (record.reflections.r3.length)
    add(`${prefix}-R3`, `Student would like to try: ${record.reflections.r3.join('; ')}.`);
  if (record.note) add(prefix, `Student addition: “${record.note}”.`, '-note');
  return facts;
}
export function sortLabel(value: SortingWork[keyof SortingWork]): string {
  switch (value) {
    case 'same':
      return 'Same ends';
    case 'different':
      return 'Different ends';
    case 'not-sure':
      return 'Not sure';
    case 'skip':
      return 'Skip';
    case '':
      return 'Not reached';
    default: {
      const exhaustive: never = value;
      return exhaustive;
    }
  }
}
