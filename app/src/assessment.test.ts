import { describe, expect, it } from 'vitest';
import { createActivity, getActivityObservations } from './activityModel';
import { answerSchema, buildReport, DIMENSIONS, questions, toggleChoice } from './assessment';
import type { Answer, Dimension, ReportSection } from './assessment';

function question(id: string) {
  const result = questions.find((item) => item.id === id);
  if (!result) throw new Error(`Missing source question ${id}.`);
  return result;
}
function section(report: ReportSection[], id: Dimension) {
  const result = report.find((item) => item.id === id);
  if (!result) throw new Error(`Missing report section ${id}.`);
  return result;
}
function selected(...values: string[]): Answer {
  return { kind: 'selected', values, other: '' };
}

describe('source inventory', () => {
  it('offers all 28 prompts in 24 groups and records Q24 choices separately', () => {
    expect(questions).toHaveLength(28);
    expect(new Set(questions.map((item) => item.id))).toHaveLength(28);
    expect(new Set(questions.map((item) => item.id.replace(/-[SICOF]$/, '')))).toHaveLength(24);
    expect(
      questions.filter((item) => item.id.startsWith('LDS-Q24-')).map((item) => item.id),
    ).toEqual(['LDS-Q24-S', 'LDS-Q24-I', 'LDS-Q24-C', 'LDS-Q24-O', 'LDS-Q24-F']);
  });

  it('keeps a skipped response distinct from an empty or uncertain selection', () => {
    expect(answerSchema.parse({ kind: 'skipped' })).toEqual({ kind: 'skipped' });
    expect(answerSchema.parse(selected('unsure'))).toEqual(selected('unsure'));
    expect(answerSchema.safeParse({ kind: 'selected', values: ['unsure'] }).success).toBe(false);
  });
});

describe('choosing answers', () => {
  it('replaces concrete choices with an exclusive choice and removes it when choosing a condition', () => {
    const focus = question('LDS-Q07');
    const first = toggleChoice({
      question: focus,
      current: selected('quiet', 'room-to-move'),
      value: 'depends',
    });
    expect(first).toEqual(selected('depends'));
    expect(toggleChoice({ question: focus, current: first, value: 'next-small-step' })).toEqual(
      selected('next-small-step'),
    );
  });

  it('does not exceed the actual maximum and lets a learner unselect a multi-choice answer', () => {
    const focus = question('LDS-Q07');
    const current = selected('quiet', 'room-to-move');
    expect(toggleChoice({ question: focus, current, value: 'nearby-check-in' })).toBe(current);
    expect(toggleChoice({ question: focus, current, value: 'quiet' })).toEqual(
      selected('room-to-move'),
    );
    expect(
      toggleChoice({ question: focus, current: selected('depends'), value: 'depends' }),
    ).toEqual(selected());
  });

  it('keeps a single choice selected and permits choosing after a skip', () => {
    const pace = question('LDS-Q09');
    expect(
      toggleChoice({
        question: pace,
        current: selected('extra-thinking-time'),
        value: 'extra-thinking-time',
      }),
    ).toEqual(selected('extra-thinking-time'));
    expect(
      toggleChoice({ question: pace, current: { kind: 'skipped' }, value: 'whole-activity' }),
    ).toEqual(selected('whole-activity'));
  });

  it('preserves custom words only while the other choice stays selected', () => {
    const focus = question('LDS-Q07');
    const current: Answer = { kind: 'selected', values: ['other'], other: 'A window nearby' };
    expect(toggleChoice({ question: focus, current, value: 'quiet' })).toEqual({
      kind: 'selected',
      values: ['other', 'quiet'],
      other: 'A window nearby',
    });
    expect(toggleChoice({ question: focus, current, value: 'other' })).toEqual(selected());
    expect(toggleChoice({ question: focus, current, value: 'unsure' })).toEqual(selected('unsure'));
  });

  it('treats try-first as a standalone request without calling it uncertainty', () => {
    const supports = question('LDS-Q10');
    expect(
      toggleChoice({ question: supports, current: selected('visible-steps'), value: 'try-first' }),
    ).toEqual(selected('try-first'));
    const pace = section(
      buildReport({
        answers: { 'LDS-Q10': selected('try-first') },
        activities: [],
        corrections: [],
      }),
      'pace',
    );
    expect(pace.said[0]?.text).toContain('Let me try first');
    expect(pace.tryNext.length).toBeGreaterThan(0);
  });
});

describe('evidence-based profiles', () => {
  it('always returns the eight open sections without manufacturing activity observations', () => {
    const report = buildReport({
      answers: {},
      activities: [createActivity('rules'), createActivity('design'), createActivity('focus')],
      corrections: [],
    });
    expect(report.map((item) => item.id)).toEqual(DIMENSIONS.map((item) => item.id));
    for (const item of report) {
      expect(item.said).toEqual([]);
      expect(item.observed).toEqual([]);
      expect(item.tryNext).toEqual([]);
      expect(item.unknown).toContain('not enough information');
    }
  });

  it('preserves skip, no-opportunity, depends, and uncertainty as their own words', () => {
    const report = buildReport({
      answers: {
        'LDS-Q01': { kind: 'skipped' },
        'LDS-Q02': selected('no-chance'),
        'LDS-Q03': selected('depends'),
        'LDS-Q04': selected('unsure'),
      },
      activities: [],
      corrections: [],
    });
    const habits = section(report, 'personality');
    expect(habits.said.map((line) => line.sourceId)).toEqual([
      'LDS-Q01',
      'LDS-Q02',
      'LDS-Q03',
      'LDS-Q04',
    ]);
    expect(habits.said.map((line) => line.text).join(' ')).toContain('skip this question');
    expect(habits.said.map((line) => line.text).join(' ')).toContain('No chance to try');
    expect(habits.tryNext).toEqual([]);
    expect(habits.summary).toContain('stay open');
    expect(JSON.stringify(habits)).not.toMatch(/low ability|poor|low motivation|short attention/i);
  });

  it('keeps the five facets, six motives, five habits and five interaction requests separate', () => {
    const answers: Record<string, Answer> = {};
    for (const item of questions) {
      const first = item.options[0];
      if (first) answers[item.id] = selected(first.value);
    }
    const report = buildReport({ answers, activities: [], corrections: [] });
    for (const [id, count] of [
      ['personality', 5],
      ['motivation', 6],
      ['management', 5],
      ['interaction', 5],
    ] satisfies [Dimension, number][]) {
      const result = section(report, id);
      expect(result.said).toHaveLength(count);
      expect(new Set(result.said.map((line) => line.label))).toHaveLength(count);
    }
    expect(
      section(report, 'motivation').said.find((line) => line.sourceId === 'LDS-Q16')?.label,
    ).toBe('Feeling pushed');
    expect(section(report, 'personality').said[0]?.text).toContain('Never or almost never');
  });

  it('shows the exact selected words and custom condition without claiming a benefit', () => {
    const answers: Record<string, Answer> = {
      'LDS-Q07': { kind: 'selected', values: ['quiet', 'other'], other: 'A window nearby' },
    };
    const focus = section(buildReport({ answers, activities: [], corrections: [] }), 'focus');
    expect(focus.said).toHaveLength(1);
    expect(focus.said[0]?.sourceId).toBe('LDS-Q07');
    expect(focus.said[0]?.text).toContain(question('LDS-Q07').prompt);
    expect(focus.said[0]?.text).toContain(
      'You chose “A quiet place” and “Another condition: A window nearby”.',
    );
    expect(focus.observed).toEqual([]);
    expect(focus.tryNext.join(' ')).toContain('Review whether');
    expect(focus.summary).not.toMatch(/works best|improved|caused|attention span/i);
  });

  it('uses actual recorded work and help, and leaves unrecorded activities absent', () => {
    const rules = createActivity('rules');
    if (rules.id !== 'rules') throw new Error('Expected rules record.');
    rules.status = 'working';
    rules.sorting.p1 = 'same';
    rules.hints.push({
      id: 'LDS-A01-H1',
      text: 'Point to the first shape.',
      beforeItem: 'LDS-A01-P1',
    });
    const report = buildReport({
      answers: {},
      activities: [rules, createActivity('design')],
      corrections: [],
    });
    const reasoning = section(report, 'reasoning');
    expect(
      reasoning.observed.map((line) => ({ sourceId: line.sourceId, text: line.text })),
    ).toEqual(
      getActivityObservations(rules).map((line) => ({ sourceId: line.sourceId, text: line.text })),
    );
    expect(reasoning.observed.some((line) => line.sourceId === 'LDS-A01-P1')).toBe(true);
    expect(reasoning.observed.some((line) => line.sourceId === 'LDS-A01-H1')).toBe(true);
    expect(section(report, 'management').observed).toEqual([]);
    expect(reasoning.summary).not.toMatch(/IQ|better|independent|improved|caused/i);
  });

  it('preserves the actual assertion and recent-time context behind a frequency label', () => {
    const report = buildReport({
      answers: {
        'LDS-Q05': selected('often'),
        'LDS-Q11': selected('often'),
      },
      activities: [],
      corrections: [],
    });
    const stress = section(report, 'personality').said.find((line) => line.sourceId === 'LDS-Q05');
    expect(stress?.text).toContain(
      'When learning felt stressful, it was hard for me to think clearly.',
    );
    expect(stress?.text).toContain('Many times');
    expect(stress?.text).toContain('Past 14 days');
    expect(section(report, 'personality').summary).toContain(
      'Stress making it hard to think clearly: Many times',
    );
    const enjoyment = section(report, 'motivation').said.find(
      (line) => line.sourceId === 'LDS-Q11',
    );
    expect(enjoyment?.text).toContain('as a reason for effort');
    expect(enjoyment?.text).toContain('I enjoyed doing it.');
  });

  it('shows a few meaningful current answers immediately without a trait score', () => {
    const report = buildReport({
      answers: {
        'LDS-Q01': selected('sometimes'),
        'LDS-Q02': selected('almost'),
        'LDS-Q03': selected('never'),
        'LDS-Q09': selected('extra-thinking-time'),
      },
      activities: [],
      corrections: [],
    });
    const habits = section(report, 'personality');
    expect(habits.summary).toContain('Past 14 days');
    expect(habits.summary).toContain('Curiosity: Sometimes');
    expect(habits.summary).toContain('Organization: Almost every time');
    expect(habits.summary).not.toContain('Wanting to talk');
    expect(habits.said).toHaveLength(3);
    expect(section(report, 'pace').summary).toContain(
      'Let me have extra thinking time before I answer.',
    );
    expect(habits.summary).not.toMatch(/high|low|strong|weak|score/i);
  });

  it('leaves an unspecified other answer open without suggesting a blank arrangement', () => {
    for (const id of ['LDS-Q07', 'LDS-Q09', 'LDS-Q24-S']) {
      const source = question(id);
      const report = buildReport({
        answers: { [id]: { kind: 'selected', values: ['other'], other: '   ' } },
        activities: [],
        corrections: [],
      });
      const result = section(report, source.dimension);
      expect(result.said[0]?.text).toContain(source.prompt);
      expect(result.said[0]?.text).toContain('not specified yet');
      expect(result.summary).toContain('stay open');
      expect(result.tryNext).toEqual([]);
    }
  });

  it('routes task-specific confidence to student reports with the recorded reflection version', () => {
    for (const version of ['sorting', 'code'] satisfies ('sorting' | 'code')[]) {
      const rules = createActivity('rules');
      if (rules.id !== 'rules') throw new Error('Expected rules record.');
      rules.status = 'working';
      rules.mode = version === 'sorting' ? 'code' : 'sorting';
      rules.reflectionVersion = version;
      rules.reflections.r1 = ['Very sure'];
      const report = buildReport({ answers: {}, activities: [rules], corrections: [] });
      const confidence = section(report, 'confidence');
      expect(confidence.said).toHaveLength(1);
      expect(confidence.said[0]?.sourceId).toBe('LDS-A01-R1');
      expect(confidence.said[0]?.text).toContain('How sure do you feel about using this rule now?');
      expect(confidence.said[0]?.text).toContain('Very sure');
      expect(confidence.said[0]?.text).toContain(
        version === 'code' ? 'the two-step code' : 'same ends sorting',
      );
      expect(confidence.summary).toContain(
        version === 'code' ? 'the two-step code' : 'same ends sorting',
      );
      expect(confidence.summary).toContain('using this rule now: Very sure');
      expect(confidence.observed).toEqual([]);
      expect(
        report.flatMap((item) => item.observed).some((line) => line.sourceId === 'LDS-A01-R1'),
      ).toBe(false);
      expect(section(report, 'reasoning').said).toEqual([]);
    }
  });

  it('keeps all nine reflections in the dimensions their questions describe', () => {
    const rules = createActivity('rules');
    const design = createActivity('design');
    const focus = createActivity('focus');
    for (const activity of [rules, design, focus]) {
      activity.status = 'working';
      activity.reflections = {
        r1: ['First reflection'],
        r2: ['Second reflection'],
        r3: ['Third reflection'],
      };
    }
    const report = buildReport({
      answers: {},
      activities: [rules, design, focus],
      corrections: [],
    });
    const expected = [
      ['LDS-A01-R1', 'confidence'],
      ['LDS-A01-R2', 'reasoning'],
      ['LDS-A01-R3', 'pace'],
      ['LDS-A02-R1', 'management'],
      ['LDS-A02-R2', 'pace'],
      ['LDS-A02-R3', 'confidence'],
      ['LDS-A03-R1', 'focus'],
      ['LDS-A03-R2', 'focus'],
      ['LDS-A03-R3', 'focus'],
    ] satisfies [string, Dimension][];
    for (const [sourceId, dimension] of expected) {
      expect(section(report, dimension).said.some((line) => line.sourceId === sourceId)).toBe(true);
      expect(
        report.flatMap((item) => item.observed).some((line) => line.sourceId === sourceId),
      ).toBe(false);
    }
    expect(
      section(report, 'pace').said.find((line) => line.sourceId === 'LDS-A02-R2')?.text,
    ).toContain('Would you want anything different for a task with more steps?');
    expect(
      section(report, 'focus').said.find((line) => line.sourceId === 'LDS-A03-R2')?.text,
    ).toContain('If you lost your place or your mind wandered, what did you do?');
  });

  it('separates support requests, response methods, learner notes and self-checks from work facts', () => {
    const focus = createActivity('focus');
    const design = createActivity('design');
    if (focus.id !== 'focus' || design.id !== 'design')
      throw new Error('Expected activity records.');
    focus.status = 'working';
    focus.decisions[0] = 'match';
    focus.supports = ['Show one row at a time'];
    focus.supportHistory = [{ choices: ['Read the shapes aloud'], beforePair: 2 }];
    focus.responseMethod = 'Pointing';
    focus.note = 'I wanted room to move.';
    focus.hints = [
      { id: 'LDS-A03-H1', text: 'Compare both shapes and their order.', beforeItem: 'LDS-A03-M01' },
    ];
    design.status = 'working';
    design.work.selfCheck[0] = 'fits';
    const report = buildReport({ answers: {}, activities: [focus, design], corrections: [] });
    const focusReport = section(report, 'focus');
    expect(
      focusReport.said.some(
        (line) => line.sourceId === 'LDS-A03-S1' && line.text.includes('Show one row at a time'),
      ),
    ).toBe(true);
    expect(
      focusReport.said.some(
        (line) =>
          line.text.includes('Before matching pair 2') &&
          line.text.includes('Read the shapes aloud'),
      ),
    ).toBe(true);
    expect(focusReport.said.some((line) => line.text.includes(focus.note))).toBe(true);
    expect(
      section(report, 'pace').said.some(
        (line) => line.sourceId === 'LDS-A03' && line.text.includes('Pointing'),
      ),
    ).toBe(true);
    expect(
      section(report, 'management').said.some(
        (line) => line.sourceId === 'LDS-A02-XC1' && line.text.includes('Fits'),
      ),
    ).toBe(true);
    expect(focusReport.observed.map((line) => line.sourceId)).toEqual([
      'LDS-A03-H1',
      'LDS-A03-M01',
    ]);
    expect(section(report, 'management').observed).toEqual([]);
  });

  it('keeps uncertain reflections open without deriving an arrangement from them', () => {
    const rules = createActivity('rules');
    rules.status = 'working';
    rules.reflections = { r1: ['Not sure'], r2: ['Depends'], r3: ['Another way'] };
    const report = buildReport({ answers: {}, activities: [rules], corrections: [] });
    for (const id of ['confidence', 'reasoning', 'pace'] satisfies Dimension[]) {
      const result = section(report, id);
      expect(result.said).toHaveLength(1);
      expect(result.observed).toEqual([]);
      expect(result.summary).toContain('stay open');
      expect(result.tryNext).toEqual([]);
    }
  });

  it('withholds disputed suggestions while preserving the learner note and source facts', () => {
    const answers = { 'LDS-Q07': selected('quiet') };
    const before = section(buildReport({ answers, activities: [], corrections: [] }), 'focus');
    const correction = {
      dimension: 'focus',
      status: 'disagree',
      note: 'Quiet does not always fit me.',
    } satisfies Parameters<typeof buildReport>[0]['corrections'][number];
    const after = section(
      buildReport({ answers, activities: [], corrections: [correction] }),
      'focus',
    );
    expect(before.tryNext.length).toBeGreaterThan(0);
    expect(after.tryNext).toEqual([]);
    expect(after.correction).toEqual(correction);
    expect(after.said).toEqual(before.said);
    expect(after.summary).toContain('remains open');
  });

  it('recomputes from edits and honors the latest correction for a section', () => {
    const before = buildReport({
      answers: { 'LDS-Q07': selected('quiet') },
      activities: [],
      corrections: [],
    });
    const after = buildReport({
      answers: { 'LDS-Q07': selected('room-to-move') },
      activities: [],
      corrections: [
        { dimension: 'focus', status: 'disagree', note: 'Earlier thought.' },
        { dimension: 'focus', status: 'comment', note: 'This choice fits today.' },
      ],
    });
    expect(section(after, 'focus').said[0]?.text).toContain('Room to move');
    expect(section(after, 'focus').tryNext.join(' ')).not.toContain('A quiet place');
    expect(section(after, 'focus').tryNext.length).toBeGreaterThan(0);
    expect(section(before, 'focus').said[0]?.text).toContain('A quiet place');
  });
});
