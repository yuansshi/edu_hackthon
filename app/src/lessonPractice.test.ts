import { describe, expect, it } from 'vitest';
import { createLessonPractice } from './lessonPractice.mjs';

describe('prepared lesson math evidence', () => {
  it('keeps the need after helped success, then clears it on the fresh fixture', () => {
    const practice = createLessonPractice();
    expect(practice.practice.correct).toBe(false);
    expect(practice.practice.answer).toBe(35);
    expect(practice.afterPractice.needActive).toBe(true);
    expect(practice.helped.correct).toBe(true);
    expect(practice.helped.qualifies).toBe(false);
    expect(practice.afterHelp.needActive).toBe(true);
    expect(practice.afterHelp.independentShown).toBe(false);
    expect(practice.fresh.answer).toBe(63);
    expect(practice.fresh.qualifies).toBe(true);
    expect(practice.afterFresh).toEqual({
      needActive: false,
      independentShown: true,
      laterReviewPending: true,
    });
  });

  it('keeps math criteria unchanged when the starting visual support changes', () => {
    const guided = createLessonPractice({ initialSupport: true });
    const challenge = createLessonPractice({ initialSupport: false });
    expect(guided.practice).toEqual(challenge.practice);
    expect(guided.helped).toEqual(challenge.helped);
    expect(guided.fresh).toEqual(challenge.fresh);
    expect(guided.afterFresh).toEqual(challenge.afterFresh);
  });

  it('only exposes learner-facing authored teaching words', () => {
    const practice = createLessonPractice();
    expect(practice.teachingSteps).toHaveLength(4);
    expect(practice.teachingSteps.join(' ')).toContain('The amount stays the same.');
    expect(practice.teachingSteps.some((step) => step.includes('\n'))).toBe(false);
  });
});
