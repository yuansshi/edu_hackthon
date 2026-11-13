import { createSession, recordAnswer, sessionSchema } from './model';
import type { Routine, Session } from './model';

export type CombinedDemoKind = 'guided' | 'challenge';

/** Synthetic rehearsal input, built through the real Discovery session model. */
export function createCombinedDemo(kind: CombinedDemoKind): Session {
  let session: Session = {
    ...createSession(),
    name: kind === 'guided' ? 'Maya' : 'Leo',
    grade: '5',
    remember: false,
  };
  const answers: { id: string; values: string[] }[] =
    kind === 'guided'
      ? [
          { id: 'LDS-Q07', values: ['quiet', 'next-small-step'] },
          { id: 'LDS-Q09', values: ['one-small-part'] },
          { id: 'LDS-Q10', values: ['worked-example', 'drawing-of-steps'] },
          { id: 'LDS-Q24-S', values: ['clear-steps'] },
          { id: 'LDS-Q24-I', values: ['example-together'] },
          { id: 'LDS-Q24-F', values: ['private-small-parts'] },
        ]
      : [
          { id: 'LDS-Q07', values: ['quiet'] },
          { id: 'LDS-Q09', values: ['whole-activity'] },
          { id: 'LDS-Q10', values: ['try-first'] },
          { id: 'LDS-Q24-S', values: ['goal-with-choice'] },
          { id: 'LDS-Q24-I', values: ['own-then-check-in'] },
          { id: 'LDS-Q24-F', values: ['ask-for-check'] },
        ];
  for (const answer of answers) {
    session = recordAnswer({
      session,
      id: answer.id,
      answer: { kind: 'selected', values: answer.values, other: '' },
    });
  }
  const choices: Routine =
    kind === 'guided'
      ? {
          minutes: 15,
          focus: 5,
          pause: 2,
          encouragement: 'private',
          challenge: 'steady',
          supports: ['Visible steps', 'An example to start', 'Quiet thinking time'],
        }
      : {
          minutes: 20,
          focus: 10,
          pause: 2,
          encouragement: 'progress',
          challenge: 'stretch',
          supports: ['Hints when I ask', 'Quiet thinking time'],
        };
  return sessionSchema.parse({
    ...session,
    reviewedRevision: session.revision,
    routine: { choices, acceptedRevision: session.revision },
  });
}
