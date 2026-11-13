import { describe, expect, it } from 'vitest';
import { createCombinedDemo } from './combinedDemo';
import { createTeachingProfile } from './handoff';
import { recordAnswer, sessionSchema } from './model';

describe('combined presentation examples', () => {
  it.each(['guided', 'challenge'] satisfies ('guided' | 'challenge')[])(
    '%s is valid synthetic input to the actual reviewed-profile export',
    (kind) => {
      const session = createCombinedDemo(kind);
      expect(sessionSchema.safeParse(session).success).toBe(true);
      expect(session.grade).toBe('5');
      expect(session.remember).toBe(false);
      expect(Object.keys(session.answers)).toHaveLength(6);
      expect(session.activities).toEqual([]);
      const profile = createTeachingProfile(session);
      expect(profile.reviewed).toBe(true);
      expect(profile.routine?.acceptedRevision).toBe(profile.revision);
      expect(profile.contentReadiness).toBe('separate-assessment-required');
      expect(profile.dimensions.every((section) => section.observations.length === 0)).toBe(true);
      expect(
        profile.dimensions.find((section) => section.id === 'reasoning')?.studentReports,
      ).toEqual([]);
    },
  );

  it('still requires a new review when a rehearsal answer changes', () => {
    const revised = recordAnswer({
      session: createCombinedDemo('guided'),
      id: 'LDS-Q09',
      answer: { kind: 'selected', values: ['whole-activity'], other: '' },
    });
    expect(revised.reviewedRevision).toBe(null);
    expect(revised.routine.acceptedRevision).toBe(null);
    expect(() => createTeachingProfile(revised)).toThrow(RangeError);
  });

  it('starts independent visits without retaining a modified sample', () => {
    const changed = createCombinedDemo('guided');
    changed.name = 'Changed';
    changed.routine.choices.supports.push('Changed support');
    const next = createCombinedDemo('guided');
    expect(next.name).toBe('Maya');
    expect(next.routine.choices.supports).not.toContain('Changed support');
    expect(createCombinedDemo('challenge').name).toBe('Leo');
  });
});
