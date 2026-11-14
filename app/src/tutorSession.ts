import { z } from 'zod';
import type { TeachingProfile } from './handoff';
import { SUPPORT_LABELS } from '../../src/teaching-plan.mjs';

const tutorContextSchema = z.object({
  runId: z.uuid(),
  sessionId: z.uuid(),
  revision: z.number().int().nonnegative(),
  processingMode: z.enum(['live', 'fixture']),
});

export type TutorContext = z.infer<typeof tutorContextSchema>;

export function createTutorHandoff(profile: TeachingProfile) {
  const routine = profile.routine;
  if (!profile.reviewed || !routine || routine.acceptedRevision !== profile.revision) {
    throw new RangeError('Review your current profile and confirm your routine before tutoring.');
  }
  return {
    schemaVersion: 'smart-pants-tutoring/v1',
    sourceSchemaVersion: profile.schemaVersion,
    revision: profile.revision,
    reviewed: profile.reviewed,
    learner: { ...profile.learner },
    routine: {
      acceptedRevision: routine.acceptedRevision,
      basis: routine.basis,
      choices: {
        ...routine.choices,
        supports: SUPPORT_LABELS.filter((label) => routine.choices.supports.includes(label)),
      },
    },
  };
}

async function responseData(response: Response): Promise<unknown> {
  const data: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.object({ message: z.string() }) }).safeParse(data);
    throw new Error(
      error.success ? error.data.error.message : 'The tutoring session could not be started.',
    );
  }
  return data;
}

export async function readTutorContext(
  fetcher: typeof fetch = fetch,
  signal: AbortSignal = AbortSignal.timeout(5000),
): Promise<TutorContext> {
  const response = await fetcher('/api/context', {
    cache: 'no-store',
    credentials: 'same-origin',
    signal,
  });
  return tutorContextSchema.parse(await responseData(response));
}

export async function startTutorSession(
  profile: TeachingProfile,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<TutorContext> {
  const handoff = createTutorHandoff(profile);
  const signalForRequest = () =>
    AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(5000)]);
  const context = await readTutorContext(fetcher, signalForRequest());
  const response = await fetcher('/api/teaching-profile', {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    signal: signalForRequest(),
    body: JSON.stringify({
      runId: context.runId,
      sessionId: context.sessionId,
      idempotencyKey: crypto.randomUUID(),
      expectedSessionRevision: context.revision,
      handoff,
    }),
  });
  const result = z.object({ result: z.object({ context: tutorContextSchema }) });
  return result.parse(await responseData(response)).result.context;
}
