import { describe, expect, it } from 'vitest';
import { createActivity } from './activityModel';
import {
  canUseRoutine,
  createSession,
  formatReflectionWindow,
  recordActivity,
  recordAnswer,
  recordCorrection,
  restoreSession,
  routineSchema,
} from './model';

describe('a learner visit', () => {
  it('preserves the original fourteen-day window when an older visit is restored', () => {
    const session = createSession(new Date(2026, 10, 5, 12));
    expect(session.reflectionWindow).toEqual({ from: '2026-10-23', through: '2026-11-05' });
    const restored = restoreSession(JSON.stringify({ ...session, remember: true })).session;
    expect(restored.reflectionWindow).toEqual(session.reflectionWindow);
    expect(formatReflectionWindow(restored.reflectionWindow)).toBe('Oct 23, 2026 – Nov 5, 2026');
  });
  it('requires another profile review after an answer changes', () => {
    const base = createSession();
    const reviewed = {
      ...base,
      reviewedRevision: 0,
      routine: { ...base.routine, acceptedRevision: 0 },
    };
    expect(canUseRoutine(reviewed)).toBe(true);
    const changed = recordAnswer({
      session: reviewed,
      id: 'LDS-Q01',
      answer: { kind: 'selected', values: ['sometimes'], other: '' },
    });
    expect(canUseRoutine(changed)).toBe(false);
    expect(changed.routine.acceptedRevision).toBeNull();
  });
  it('preserves skipped and uncertain responses distinctly on restoration', () => {
    let session = createSession();
    session = recordAnswer({ session, id: 'LDS-Q01', answer: { kind: 'skipped' } });
    session = recordAnswer({
      session,
      id: 'LDS-Q02',
      answer: { kind: 'selected', values: ['unsure'], other: '' },
    });
    const restored = restoreSession(JSON.stringify({ ...session, remember: true })).session;
    expect(restored.answers['LDS-Q01']).toEqual({ kind: 'skipped' });
    expect(restored.answers['LDS-Q02']).toEqual({
      kind: 'selected',
      values: ['unsure'],
      other: '',
    });
  });
  it.each(['not-json', '{"version":999}', 'x'.repeat(250_001)])(
    'offers a fresh usable visit for invalid saved data',
    (raw) => {
      const restored = restoreSession(raw);
      expect(restored.notice).toContain('couldn’t open');
      expect(restored.session.answers).toEqual({});
      expect(restored.session.remember).toBe(false);
    },
  );
  it('rejects unknown options and exclusive mixed choices in saved data', () => {
    for (const values of [['invented'], ['quiet', 'unsure']]) {
      const session = {
        ...createSession(),
        remember: true,
        answers: { 'LDS-Q07': { kind: 'selected', values, other: '' } },
      };
      expect(restoreSession(JSON.stringify(session)).session.answers).toEqual({});
    }
  });
  it('does not restore a record that was not marked for remembering', () => {
    const session = recordAnswer({
      session: createSession(),
      id: 'LDS-Q01',
      answer: { kind: 'skipped' },
    });
    expect(restoreSession(JSON.stringify(session)).session.answers).toEqual({});
  });
  it('invalidates review when activity evidence or a correction changes', () => {
    const base = { ...createSession(), reviewedRevision: 0 };
    const record = createActivity('rules');
    const afterTask = recordActivity({ session: base, activity: { ...record, status: 'working' } });
    expect(canUseRoutine(afterTask)).toBe(false);
    const afterReview = { ...afterTask, reviewedRevision: afterTask.revision };
    const corrected = recordCorrection({
      session: afterReview,
      correction: { dimension: 'focus', note: 'Only with background talking.', status: 'disagree' },
    });
    expect(canUseRoutine(corrected)).toBe(false);
    expect(corrected.corrections[0]?.note).toBe('Only with background talking.');
  });
  it('does not invalidate review for an unchanged answer', () => {
    const answered = recordAnswer({
      session: createSession(),
      id: 'LDS-Q01',
      answer: { kind: 'skipped' },
    });
    const reviewed = { ...answered, reviewedRevision: answered.revision };
    expect(recordAnswer({ session: reviewed, id: 'LDS-Q01', answer: { kind: 'skipped' } })).toBe(
      reviewed,
    );
  });
  it('rejects trial values that the controls cannot represent or that do not fit', () => {
    const choice = createSession().routine.choices;
    expect(routineSchema.safeParse({ ...choice, minutes: 5, focus: 30 }).success).toBe(false);
    expect(routineSchema.safeParse({ ...choice, pause: 4 }).success).toBe(false);
    expect(routineSchema.safeParse({ ...choice, minutes: 7 }).success).toBe(false);
    expect(routineSchema.safeParse({ ...choice, minutes: 5, focus: 5 }).success).toBe(true);
  });
});
