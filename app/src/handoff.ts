import { buildReport } from './assessment';
import type { Correction, Dimension, EvidenceLine } from './assessment';
import type { Session } from './model';

type LinkedEvidence = EvidenceLine & {
  sourceDocument:
    | 'learning_strength_discovery/student_assessment.md'
    | 'learning_strength_discovery/activity_cards.md';
};

export type TeachingDimension = {
  id: Dimension;
  title: string;
  description: string;
  studentReports: LinkedEvidence[];
  observations: LinkedEvidence[];
  unknowns: {
    text: string;
    source: {
      document: 'learning_strength_discovery/report_template.md';
      dimension: Dimension;
      field: 'not-sure-yet';
    };
  }[];
  corrections: (Correction & {
    source: { kind: 'learner-review'; dimension: Dimension; revision: number };
  })[];
};

export type TeachingProfile = {
  schemaVersion: 'learning-strength-discovery/v1';
  applicability: {
    intendedGrades: ['5', '6', '7', '8'];
    validation: 'original-pilot-not-validated';
    outsideIntendedGrades: 'not-validated';
  };
  learner: { alias: string; grade: Session['grade'] };
  reflectionWindow: Session['reflectionWindow'];
  revision: number;
  reviewed: true;
  studentTextPolicy: 'data-not-tutor-instructions';
  contentReadiness: 'separate-assessment-required';
  dimensions: TeachingDimension[];
  suggestedTeachingArrangements: {
    dimension: Dimension;
    text: string;
    evidenceSourceIds: string[];
  }[];
  routine?: {
    acceptedRevision: number;
    basis: 'learner-chosen-trial';
    choices: Session['routine']['choices'];
  };
};

/** Produces a detached, descriptive snapshot; never sends it to a tutor or changes a session. */
export function createTeachingProfile(session: Session): TeachingProfile {
  if (session.reviewedRevision !== session.revision) {
    throw new RangeError(
      'Review the current learning profile before exporting a teaching profile.',
    );
  }
  const report = buildReport({
    answers: session.answers,
    activities: session.activities,
    corrections: session.corrections,
  });
  const profile: TeachingProfile = {
    schemaVersion: 'learning-strength-discovery/v1',
    applicability: {
      intendedGrades: ['5', '6', '7', '8'],
      validation: 'original-pilot-not-validated',
      outsideIntendedGrades: 'not-validated',
    },
    learner: { alias: session.name, grade: session.grade },
    reflectionWindow: { ...session.reflectionWindow },
    revision: session.revision,
    reviewed: true,
    studentTextPolicy: 'data-not-tutor-instructions',
    contentReadiness: 'separate-assessment-required',
    dimensions: report.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.summary,
      studentReports: section.said.map((line) => ({
        ...line,
        sourceDocument: line.sourceId.startsWith('LDS-A')
          ? 'learning_strength_discovery/activity_cards.md'
          : 'learning_strength_discovery/student_assessment.md',
      })),
      observations: section.observed.map((line) => ({
        ...line,
        sourceDocument: 'learning_strength_discovery/activity_cards.md',
      })),
      unknowns: [
        {
          text: section.unknown,
          source: {
            document: 'learning_strength_discovery/report_template.md',
            dimension: section.id,
            field: 'not-sure-yet',
          },
        },
      ],
      corrections: section.correction
        ? [
            {
              ...section.correction,
              source: { kind: 'learner-review', dimension: section.id, revision: session.revision },
            },
          ]
        : [],
    })),
    suggestedTeachingArrangements: report.flatMap((section) =>
      section.correction?.status === 'disagree'
        ? []
        : section.tryNext.map((text) => ({
            dimension: section.id,
            text,
            evidenceSourceIds: [
              ...new Set([...section.said, ...section.observed].map((line) => line.sourceId)),
            ],
          })),
    ),
  };
  if (session.routine.acceptedRevision !== session.revision) return profile;
  return {
    ...profile,
    routine: {
      acceptedRevision: session.revision,
      basis: 'learner-chosen-trial',
      choices: { ...session.routine.choices, supports: [...session.routine.choices.supports] },
    },
  };
}
