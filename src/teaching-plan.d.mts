export type TeachingChoices = {
  minutes: number;
  focus: number;
  pause: number;
  encouragement: 'progress' | 'private' | 'points' | 'none';
  challenge: 'steady' | 'stretch' | 'choice';
  supports: string[];
};

export type TeachingDescription = {
  approach: 'guided' | 'challenge' | 'balanced';
  opening: string;
  encouragement: string;
  pacing: string;
  supportLabels: string[];
};

export type TeachingPlan = TeachingDescription & {
  learnerId: 'A';
  learner: string;
  grade: '5' | '6' | '7' | '8' | 'unspecified';
  sourceRevision: number;
};

export const SUPPORT_LABELS: readonly string[];
export function describeTeachingChoices(choices: TeachingChoices): TeachingDescription;
export function parseTeachingHandoff(handoff: unknown): TeachingPlan;
