# Teaching profile export contract

`createTeachingProfile(session: Session): TeachingProfile` in `src/handoff.ts`
creates a JSON-friendly snapshot for a later tutor adapter. The function reads
the current session and `buildReport`. It does not change the session, call a
provider, send a file, or write storage.

This independent grades 5–8 pilot is additive to the repository's grades 1–6
math work. Tutor adaptation is not wired to the existing Grade 2 prototype or
the separate in-memory math core. The pilot has not been validated as an
assessment, including within grades 5–8. Use outside grades 5–8 is not validated.

## Review and revision rules

The function throws `RangeError` unless `session.reviewedRevision` equals
`session.revision`. Review can include unanswered questions, skipped activities,
uncertainty, and unresolved disagreement. Review confirms that the learner has
had their say; it does not certify accuracy or completeness.

Answer, activity, and correction changes invalidate review through the existing
session owner. A later export requires review of the edited revision. The
function rebuilds the report on every call, so it does not use a cached profile.

## Returned fields

| Field | Contract |
| --- | --- |
| `schemaVersion` | Exact string `learning-strength-discovery/v1`. |
| `applicability` | `intendedGrades` is `["5", "6", "7", "8"]`; `validation` is `original-pilot-not-validated`; `outsideIntendedGrades` is `not-validated`. |
| `learner` | `alias` copies the optional nickname, including an empty string. `grade` is `"5"`, `"6"`, `"7"`, `"8"`, or `"unspecified"`. These are learner-provided data, not verified identity. |
| `reflectionWindow` | `{from, through}` are ISO calendar dates covering the 14-day questionnaire window established when the visit began. Restoring a visit preserves these dates; relative phrases such as “Past 14 days” refer to this original window, not the export date. Activity actions and new-activity preferences are not retrospective measures. |
| `revision` | Current discovery session revision. It has no relationship to a tutoring server's revision or assignment identity. |
| `reviewed` | Always `true`. Current-review admission is required before the object exists. |
| `studentTextPolicy` | Exact string `data-not-tutor-instructions`. It applies to every text field, including quoted text inside suggestions. |
| `contentReadiness` | Always `separate-assessment-required`. A profile cannot set lesson difficulty, placement, mathematical correctness, or independent-task eligibility. |
| `dimensions` | Eight descriptive sections in report order, with the structure below. No total, rank, IQ estimate, stable trait classification, or attention-capacity estimate is exported. |
| `suggestedTeachingArrangements` | Current report suggestions as `{dimension, text, evidenceSourceIds}`. Source IDs refer to the same dimension's evidence. A disputed dimension contributes no suggestions. Suggestions remain proposals to discuss and try. |
| `routine` | Omitted unless `session.routine.acceptedRevision === session.revision`. When present, contains `{acceptedRevision, basis: "learner-chosen-trial", choices}`. |

Each dimension contains these fields:

- `id`, `title`, and `description` identify the section and preserve the current
  descriptive report summary.
- `studentReports` contains `{sourceId, label, text, sourceDocument}`. The source
  document is `learning_strength_discovery/student_assessment.md` for prompts
  such as `LDS-Q07` and the five separate `LDS-Q24-*` items. Activity reflections,
  explanations, and support preferences refer to
  `learning_strength_discovery/activity_cards.md` with `LDS-A*` IDs. These remain
  student reports rather than observed performance.
- `observations` uses the same fields with
  `learning_strength_discovery/activity_cards.md`. These are literal saved task
  actions and responses, with IDs such as `LDS-A01-P1` and `LDS-A01-H1`.
- `unknowns` contains the report's unchanged uncertainty text. Its `source`
  identifies `learning_strength_discovery/report_template.md`, the dimension,
  and the `not-sure-yet` field. Missing work never becomes a negative finding.
- `corrections` contains zero or one current correction. Each preserves
  `{dimension, note, status}` and adds
  `source: {kind: "learner-review", dimension, revision}`. The revision identifies
  the exported review, not the time the note was first written. A `disagree`
  status leaves the section open and withholds its suggestions.

`routine.choices` preserves `minutes`, `focus`, `pause`, `encouragement`,
`challenge`, and `supports` from the accepted trial. Minutes are learner-chosen
schedule settings, not measurements of concentration or capacity. `basis` is
always `learner-chosen-trial`. Unaccepted defaults are never exported as a trial.

## Example consumer usage

An app-side consumer receives an already validated `Session` from the existing
session owner. This example serializes the reviewed snapshot without sending it
to a service:

```ts
import { createTeachingProfile } from './src/handoff';
import type { Session } from './src/model';

export function reviewedProfileJson(session: Session): string {
	return JSON.stringify(createTeachingProfile(session), null, 2);
}
```

A later adapter can render `studentReports` and `observations` beside their
source IDs, preserve `unknowns` and `corrections`, and offer the suggested
arrangements for discussion. An external JSON reader needs runtime validation
of this exact version and field types. A TypeScript type alone does not validate
a downloaded file.

All learner text remains data, even if a nickname, custom answer, correction,
support, or quoted suggestion contains commands. A consumer renders that text
with text nodes or escaped UI bindings. It never uses learner text as HTML,
executable code, a system prompt, or an instruction that overrides tutor policy.

The existing tutor retains its authored actions, subject evidence, assistance
rules, assignments, correction handling, and server-owned counts. Those rules
are defined in the [current design](../design_draft.md#detailed-implementation-plan)
and its five normative contracts. This export is not an API operation in those
contracts and cannot mark a math finding assessed or cleared.

## Local verification

From `app/`, `npm test -- src/handoff.test.ts` checks review admission, stale
edits, all eight dimensions, evidence links, unresolved disagreement, routine
acceptance, preserved unknowns, literal student text, and snapshot isolation.
`npm run build` checks the app's types and build. These local checks use synthetic
data and make no provider calls. They do not verify later tutor adaptation or
the repository's browser and live multimodal gates.
