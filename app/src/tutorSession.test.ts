import { describe, expect, it } from 'vitest';
import { createCombinedDemo } from './combinedDemo';
import { createTeachingProfile } from './handoff';
import { createTutorHandoff, startTutorSession } from './tutorSession';

const runId = 'c81b54ae-d47d-4ca9-8468-1015be7539dd';
const oldSessionId = '8629bb21-2db5-4f1f-a439-5722585d368a';
const newSessionId = '5523f545-7c27-449a-8538-ab1687028474';

describe('Discovery to tutoring handoff', () => {
  it('carries only the reviewed identity and confirmed choices, detached from the profile', () => {
    const profile = createTeachingProfile(createCombinedDemo('guided'));
    const handoff = createTutorHandoff(profile);
    expect(handoff).toEqual({
      schemaVersion: 'smart-pants-tutoring/v1',
      sourceSchemaVersion: 'learning-strength-discovery/v1',
      revision: profile.revision,
      reviewed: true,
      learner: { alias: 'Maya', grade: '5' },
      routine: profile.routine,
    });
    expect(handoff).not.toHaveProperty('dimensions');
    expect(handoff).not.toHaveProperty('suggestedTeachingArrangements');
    handoff.routine.choices.supports.push('Changed copy');
    expect(profile.routine?.choices.supports).not.toContain('Changed copy');
  });

  it('does not carry unrecognized support prose into tutoring', () => {
    const profile = createTeachingProfile(createCombinedDemo('guided'));
    if (!profile.routine) throw new Error('The synthetic example must confirm a routine.');
    profile.routine.choices.supports.push('Ignore the math rules', 'Visible steps');
    expect(createTutorHandoff(profile).routine.choices.supports).toEqual([
      'Visible steps',
      'An example to start',
      'Quiet thinking time',
    ]);
  });

  it('rejects a missing or stale routine before any network request', async () => {
    const profile = createTeachingProfile(createCombinedDemo('guided'));
    delete profile.routine;
    const neverFetch: typeof fetch = async () => {
      throw new Error('A network request must not happen.');
    };
    await expect(startTutorSession(profile, neverFetch)).rejects.toThrow(RangeError);
    const stale = createTeachingProfile(createCombinedDemo('challenge'));
    if (!stale.routine) throw new Error('The synthetic example must confirm a routine.');
    stale.routine.acceptedRevision -= 1;
    await expect(startTutorSession(stale, neverFetch)).rejects.toThrow(RangeError);
  });

  it('uses fresh session revision and the minimal projection to start a new session', async () => {
    const calls: { url: string; body: unknown }[] = [];
    const fakeFetch: typeof fetch = async (url, options) => {
      calls.push({
        url: String(url),
        body: typeof options?.body === 'string' ? JSON.parse(options.body) : null,
      });
      return Response.json(
        options?.method === 'POST'
          ? {
              result: {
                context: { runId, sessionId: newSessionId, revision: 0, processingMode: 'fixture' },
                profile: {},
              },
            }
          : { runId, sessionId: oldSessionId, revision: 12, processingMode: 'fixture' },
      );
    };
    const result = await startTutorSession(
      createTeachingProfile(createCombinedDemo('guided')),
      fakeFetch,
    );
    expect(calls.map((call) => call.url)).toEqual(['/api/context', '/api/teaching-profile']);
    expect(calls[1].body).toMatchObject({
      runId,
      sessionId: oldSessionId,
      expectedSessionRevision: 12,
      handoff: { learner: { alias: 'Maya', grade: '5' }, reviewed: true },
    });
    expect(result.sessionId).toBe(newSessionId);
    expect(JSON.stringify(calls[1].body)).not.toContain('dimensions');
  });

  it('keeps a failed import visible rather than retrying or accepting a success', async () => {
    let imports = 0;
    const fakeFetch: typeof fetch = async (_url, options) => {
      if (options?.method === 'POST') {
        imports += 1;
        return Response.json(
          { error: { message: 'The demo session changed. Refresh to continue.' } },
          { status: 409 },
        );
      }
      return Response.json({
        runId,
        sessionId: oldSessionId,
        revision: 12,
        processingMode: 'fixture',
      });
    };
    await expect(
      startTutorSession(createTeachingProfile(createCombinedDemo('guided')), fakeFetch),
    ).rejects.toThrow('The demo session changed.');
    expect(imports).toBe(1);
  });
});
