export type PreparedMathResponse = {
  explanation: string;
  answer: number | null;
  correct: boolean;
  qualifies: boolean;
  feedback: string;
};

export type PreparedMathEvidence = {
  needActive: boolean;
  independentShown: boolean;
  laterReviewPending: boolean;
};

export type LessonPractice = {
  practice: PreparedMathResponse;
  helped: PreparedMathResponse;
  fresh: PreparedMathResponse;
  teachingSteps: string[];
  afterPractice: PreparedMathEvidence;
  afterHelp: PreparedMathEvidence;
  afterFresh: PreparedMathEvidence;
};

/** Runs reviewed fixtures through the existing math rules; no model or session API. */
export function createLessonPractice(options?: { initialSupport?: boolean }): LessonPractice;
