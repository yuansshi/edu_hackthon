import { z } from 'zod';
import { answerSchema, correctionSchema, questions } from './assessment';
import type { Answer, Correction } from './assessment';
import { activityRecordSchema } from './activityModel';
import type { ActivityRecord } from './activityModel';

export const STORAGE_KEY = 'learning-strength-discovery.visit.v1';
export const FOCUS_MINUTES = [3, 5, 8, 10, 15, 20];
export const PAUSE_MINUTES = [1, 2, 3, 5, 10];
export const reflectionWindowSchema = z
  .object({ from: z.iso.date(), through: z.iso.date() })
  .refine(
    (window) => Date.parse(window.through) - Date.parse(window.from) === 13 * 86_400_000,
    'The reflection window must cover fourteen calendar dates.',
  );
type ReflectionWindow = z.infer<typeof reflectionWindowSchema>;

function localDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatReflectionWindow(window: ReflectionWindow): string {
  const format = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' });
  return `${format.format(new Date(window.from))} – ${format.format(new Date(window.through))}`;
}
export const routineSchema = z
  .object({
    minutes: z.number().int().min(5).max(60).multipleOf(5),
    focus: z
      .number()
      .int()
      .refine((value) => FOCUS_MINUTES.includes(value)),
    pause: z
      .number()
      .int()
      .refine((value) => PAUSE_MINUTES.includes(value)),
    encouragement: z.enum(['progress', 'private', 'points', 'none']),
    challenge: z.enum(['steady', 'stretch', 'choice']),
    supports: z.array(z.string().max(120)).max(12),
  })
  .refine((value) => value.focus <= value.minutes, 'The focus block must fit the available time.');
export type Routine = z.infer<typeof routineSchema>;

export const sessionSchema = z
  .object({
    version: z.literal(1),
    reflectionWindow: reflectionWindowSchema,
    name: z.string().max(30),
    grade: z.enum(['5', '6', '7', '8', 'unspecified']),
    remember: z.boolean(),
    answers: z.record(z.string(), answerSchema),
    activities: z.array(activityRecordSchema).max(3),
    corrections: z.array(correctionSchema).max(8),
    revision: z.number().int().min(0).max(1_000_000),
    reviewedRevision: z.number().int().min(0).nullable(),
    routine: z.object({
      choices: routineSchema,
      acceptedRevision: z.number().int().min(0).nullable(),
    }),
  })
  .superRefine((session, context) => {
    for (const [id, answer] of Object.entries(session.answers)) {
      const question = questions.find((item) => item.id === id);
      if (!question) {
        context.addIssue({ code: 'custom', message: 'Unknown question.' });
        continue;
      }
      if (answer.kind === 'skipped') continue;
      const chosen = question.options.filter((option) => answer.values.includes(option.value));
      if (
        new Set(answer.values).size !== answer.values.length ||
        chosen.length !== answer.values.length ||
        chosen.length > question.maxChoices ||
        (chosen.length > 1 && chosen.some((option) => option.exclusive))
      ) {
        context.addIssue({ code: 'custom', message: 'Unsupported answer combination.' });
      }
    }
    if (
      new Set(session.activities.map((item) => item.id)).size !== session.activities.length ||
      new Set(session.corrections.map((item) => item.dimension)).size !== session.corrections.length
    ) {
      context.addIssue({ code: 'custom', message: 'Duplicate record.' });
    }
    if (
      (session.reviewedRevision !== null && session.reviewedRevision > session.revision) ||
      (session.routine.acceptedRevision !== null &&
        session.routine.acceptedRevision !== session.reviewedRevision)
    ) {
      context.addIssue({ code: 'custom', message: 'Unsupported review revision.' });
    }
  });
export type Session = z.infer<typeof sessionSchema>;

export function createSession(now: Date = new Date()): Session {
  const from = new Date(now);
  from.setDate(from.getDate() - 13);
  return {
    version: 1,
    reflectionWindow: { from: localDate(from), through: localDate(now) },
    name: '',
    grade: 'unspecified',
    remember: false,
    answers: {},
    activities: [],
    corrections: [],
    revision: 0,
    reviewedRevision: null,
    routine: {
      choices: {
        minutes: 20,
        focus: 10,
        pause: 3,
        encouragement: 'progress',
        challenge: 'choice',
        supports: [],
      },
      acceptedRevision: null,
    },
  };
}

export function restoreSession(raw: string | null): { session: Session; notice: string } {
  if (!raw) return { session: createSession(), notice: '' };
  try {
    if (raw.length > 250_000) throw new Error('Visit is too large.');
    const input: unknown = JSON.parse(raw);
    const result = sessionSchema.safeParse(input);
    if (result.success && result.data.remember)
      return {
        session: result.data,
        notice: 'Welcome back. Your saved visit is ready on this browser.',
      };
  } catch {
    /* A fresh visit remains usable when a saved record cannot be opened. */
  }
  return {
    session: createSession(),
    notice:
      'We couldn’t open the saved visit. You can start fresh, or clear this browser’s old visit in settings.',
  };
}

function revise(
  session: Session,
  patch: Pick<Session, 'answers'> | Pick<Session, 'activities'> | Pick<Session, 'corrections'>,
): Session {
  return {
    ...session,
    ...patch,
    revision: session.revision + 1,
    reviewedRevision: null,
    routine: { ...session.routine, acceptedRevision: null },
  };
}
export function recordAnswer({
  session,
  id,
  answer,
}: {
  session: Session;
  id: string;
  answer: Answer;
}): Session {
  if (JSON.stringify(session.answers[id]) === JSON.stringify(answer)) return session;
  return revise(session, { answers: { ...session.answers, [id]: answer } });
}
export function recordActivity({
  session,
  activity,
}: {
  session: Session;
  activity: ActivityRecord;
}): Session {
  if (
    JSON.stringify(session.activities.find((item) => item.id === activity.id)) ===
    JSON.stringify(activity)
  )
    return session;
  return revise(session, {
    activities: [...session.activities.filter((item) => item.id !== activity.id), activity],
  });
}
export function recordCorrection({
  session,
  correction,
}: {
  session: Session;
  correction: Correction;
}): Session {
  const corrections = session.corrections.filter((item) => item.dimension !== correction.dimension);
  if (correction.note.trim() || correction.status === 'disagree') corrections.push(correction);
  if (JSON.stringify(corrections) === JSON.stringify(session.corrections)) return session;
  return revise(session, { corrections });
}
export function canUseRoutine(session: Session): boolean {
  return session.reviewedRevision === session.revision;
}
