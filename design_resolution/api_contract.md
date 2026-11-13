# HTTP and processing contract — DR-03

This resolution completes the operation table in `design_draft.md`. It specifies
the selected local Node/browser application; it creates no application code.
The [learning contract](learning_contract.md) determines authored actions,
judgment replay, and review scheduling. The [fixture contract](fixture_contract.md)
uses this same transport. The frozen reviewed design remains the historical input.

## 1. Wire rules and identities

All API paths are same-origin under the configured `http://127.0.0.1:PORT`.
Mutations require the exact configured Host and Origin. Every API response,
including errors, carries `Cache-Control: no-store` and
`X-Content-Type-Options: nosniff`; no response carries `Set-Cookie`, an audio URL,
provider payload, or an API key. JSON responses use
`Content-Type: application/json; charset=utf-8`. JSON requests use
`Content-Type: application/json`; parameters such as `charset=utf-8` are accepted.
No CORS permission headers are emitted. Static HTML/JS/CSS also use `no-store`.

Every object below is closed: reject unknown fields. Every listed field is
required unless explicitly marked optional. `T | null` means the key is required
and its value can be null. Empty arrays are permitted unless a minimum is stated;
omission is not an alias for empty/null. Strings use Unicode scalar values;
text limits count Unicode code points, and byte limits count actual bytes.
No string coercion, fractional revisions, `NaN`, or negative zero is admitted.
Resource IDs are canonical lowercase UUID strings, except learner IDs `A`–`F`
and content-owned lesson/problem/target/action IDs. Derived image/written-work
source IDs use the exact formats below; those source IDs are not UUIDs. A client-generated `attemptId`
is a UUID; all other resource IDs are server-generated. Idempotency keys are
1–128 ASCII characters matching `[A-Za-z0-9._:-]+`.

`runId` changes at process start. `sessionId` changes at reset. The session-wide
`revision` starts at zero and increases once for each atomic externally visible
state change, including processing completion/failure. A snapshot identifies
exactly one revision; `generatedAt` is an RFC 3339 UTC timestamp, not an ordering
key. The following record revisions start at zero and are independent:

| Field | Owner and increment |
| --- | --- |
| `assignmentRevision` (serialized as Assignment `revision`) | One assignment; accepted submission/replacement, assistance/prompt action, or completion changes it |
| `workVersion` | One assignment; allocate the next positive integer for each new immutable board submission |
| `evidenceVersion` | One attempt; initial version 1, then increment when a turn is appended/confirmed/edited or a recognition mismatch adds evidence; a pure unchanged confirmation does not increment |
| `correctionRevision` | One `(sessionId, learnerId, targetId)` target record; increment once per accepted correction batch that invalidates previously committed judgments, including teacher retraction; an edit before first commitment does not increment |
| Finding `revision` | One stable learner/target finding record; increment when its history or replayed projection changes |

Correction scope and chronological replay are defined in the learning contract.
A job captures run, session, learner, assignment ID/revision, attempt ID,
work/evidence versions, and target `correctionRevision`. It commits only while
all captured values and active-attempt identity still match. A target correction
invalidates pending jobs for that learner/target; jobs for another target or
learner remain eligible. A new attempt replaces only that assignment's current
attempt. Reset, cancellation, and shutdown invalidate the affected jobs even if
the provider ignores abort. A mismatched late result makes no state change.

All JSON mutation bodies contain this flattened envelope (`E` below):

```text
E = {runId, sessionId, idempotencyKey}
AE = E + {learnerId, assignmentId, expectedAssignmentRevision,
          expectedEvidenceVersion, expectedTargetCorrectionRevision}
```

The `AE` fields identify the route's existing attempt; the body learner and
assignment must equal that record. `expectedTargetCorrectionRevision` refers to
the assignment's target, never to a class-wide correction counter. The submission
operation has no existing evidence version and uses its explicitly listed fields.
Route/body disagreement is `RESOURCE_MISMATCH`; an obsolete expected revision is
`REVISION_CONFLICT`. An old run/session is `CONTEXT_CHANGED`, even if the old
resource no longer exists. Read routes require their listed query parameters;
reject duplicate or unknown query keys.

Idempotency is scoped to `(runId, sessionId, idempotencyKey)` across mutation
routes. Fingerprint method, canonical route/query, parsed body including expected
revisions, and binary media bytes/type. Ignore JSON key order, not text
whitespace. Compare an existing key **before** checking now-advanced revisions or
transition eligibility. Equal content returns the original HTTP status and
resource IDs, `replayed: true`, and their current safe projection; it starts no
new job, increments no revision, and repeats no help. Changed content or route
is `IDEMPOTENCY_CONFLICT`. Rejected pre-admission requests consume no key and
change no record. A started operation retains its key even if its job later
fails. Reset invalidates earlier keys; old-session reset retries cannot reset a
new session. At capacity only cancellation and reset are exempt from the
mutation-record limit; their bounded receipts replace earlier receipts for the
same cancelled attempt/reset transition rather than creating an unbounded log.

## 2. Shared returned records

This notation is a schema specification, not proposed application source. Each
record has exactly the keys shown. Integers are nonnegative unless bounded
otherwise. `TargetId` is `addition-exchange` or `subtraction-exchange`.

```text
Problem = {problemId, operation: "add" | "subtract", left: integer,
           right: integer, prompt: string}
Assignment = {assignmentId, revision, learnerId, targetId, problem: Problem,
              purpose: "practice" | "check" | "review",
              freshAtIssue: boolean,
              state: "current" | "completed", assisted: boolean,
              assistance: Assistance[], activeAttemptId: UUID | null,
              issuedAt: timestamp, completedAt: timestamp | null}
Assistance = {eventId, actionId, at: timestamp, assignmentRevision: integer}
ActionOffer = {actionId, effect: "current_assignment" | "new_assignment" |
               "session_status", prompt: string, marksAssisted: boolean}
PerformedAction = {eventId, idempotencyKey, actionId, effect,
                   sourceAssignmentId: UUID, assignmentId: UUID | null,
                   prompt: string, visual: Visual | null, at: timestamp}
Visual = {visualId, title: string, steps: string[]}
```

`Visual` contains only the finite ordered authored steps from the learning
contract, rendered by content-owned SVG templates; it contains no model prose.
Independent-task Problem and ActionOffer records never contain the expected
answer or worked solution. `ActionOffer[]` contains only the next actions
actually allowed now, after scheduling precedence; `/next` does not silently
substitute a different action. Intervening work uses purpose `check` and an unused
check-pool problem under the same freshness and assistance rules in learning.

```text
Turn = {turnId, source: "transcription" | "written",
        recognizedText: string | null, confirmedText: string | null,
        confirmation: "awaiting_audio" | "transcribing" | "unconfirmed" |
                      "confirmed" | "failed",
        corrections: TurnEdit[]}
TurnEdit = {correctionId, previousText: string | null, text: string,
            at: timestamp, evidenceVersion: integer}
WorkRef = {workVersion, imageUrl: string | null, imageBytes: integer,
           strokes: Stroke[], writtenWorking: string,
           writtenSourceId: string | null}
Stroke = {tool: "pen" | "erase", width: integer 1..24,
          points: [integer 0..1023, integer 0..767][]}
Readback = {candidateId, evidenceVersion, text: string,
            sourceIds: string[], confirmation: "pending" | "matched" |
                                                "mismatched"}
JobRef = {jobId, kind: "transcribe" | "assess", turnId: UUID | null}
Attempt = {attemptId, assignmentId, learnerId, targetId, workVersion,
           evidenceVersion, correctionRevision, work: WorkRef, turns: Turn[],
           state: AttemptState, job: JobRef | null, readback: Readback | null,
           acceptedJudgmentId: UUID | null, error: SafeErrorValue | null,
           createdAt: timestamp, updatedAt: timestamp}
```

AttemptState is exactly `awaiting_audio`, `transcribing`,
`awaiting_transcript_review`, `ready_for_assessment`, `assessing`,
`awaiting_readback`, `needs_clarification`, `accepted`, `failed`, or `cancelled`.
An Attempt's `correctionRevision` is the current revision of its target; its
stored job has a separate captured value. The server keeps the immutable PNG;
`imageUrl` is the exact work route below or null. `imageBytes` is zero for no
image. Candidate category, answer feedback, reasoning summary, and proposed
teaching action are withheld while readback is pending. Only the neutral
`Readback` is exposed. A text-only submission has `readback: null`. Nonblank immutable writtenWorking
has source ID `attemptId + ":work:" + workVersion + ":written"`, exposed as
WorkRef writtenSourceId; otherwise writtenSourceId is null. Submitted written
working is already confirmed, is never silently duplicated into a turn, and is
editable only through a new frozen work submission. Its exact-substring citations
are retained in Candidate/Judgment sourceEvidence and shown beside that working
in the teacher view. Render all submitted/model text through text nodes, never
HTML, and accept image URLs only from the server-owned immutable work route.

```text
Finding = {findingId, revision, learnerId, targetId,
           code: "addition-omitted-ten" | "subtraction-value-changed",
           status: "none" | "active" | "cleared" | "retracted",
           active: boolean, supportingJudgmentIds: UUID[],
           clearingJudgmentId: UUID | null, historyJudgmentIds: UUID[]}
Target = {targetId, correctionRevision, assessed: boolean,
          needsClarification: boolean, pending: boolean,
          independentStatus: "not_demonstrated" | "demonstrated" | "recheck_required",
          independentJudgmentId: UUID | null,
          evidenceAt: timestamp | null, finding: Finding,
          review: ReviewProjection}
ReviewProjection = {status: "not_due" | "due" | "pending_intervening" |
                            "completed" | "unsuccessful" | "pending_pool",
                    dueAfterAssignmentId: UUID | null,
                    completedAssignmentId: UUID | null}
Judgment = {judgmentId, attemptId, assignmentId, targetId, evidenceVersion,
            category: CandidateCategory, observedAnswer: integer | null,
            answerCorrect: boolean | null, exchangeEvidence: ExchangeEvidence,
            recognitionStatus: "usable" | "clarify" | "conflict",
            sourceEvidence: SourceEvidence[], exchangeQuantities: Quantities | null,
            reasoningSummary: string, teachingMoveId: string,
            assignmentPurpose: "practice" | "check" | "review",
            freshAtIssue: boolean, currentAtCommit: boolean,
            assisted: boolean, valid: boolean, eventSequence: integer,
            at: timestamp}
Correction = {correctionId, kind: "recognition_edit" | "teacher_retraction",
              targetId, judgmentIds: UUID[], reason: string,
              attemptId: UUID | null, previousEvidenceVersion: integer | null,
              replacementEvidenceVersion: integer | null,
              correctionRevision: integer, at: timestamp}
```

Every learner/target has one stable Finding ID from session creation; a code on
an inactive record is a target identifier, not a supported diagnosis. Its active
support and clearing judgment follow chronological replay. `historyJudgmentIds`
includes invalidated judgments; `supportingJudgmentIds` contains the reducer's active difficulty support and
becomes empty after qualifying clearing.
Judgment teachingMoveId records the controller-selected authored action, not
an inapplicable provider suggestion. Teacher retraction may address any currently valid judgment in that target's
history, including a clearing or reopening judgment. This makes correction of an
unsupported success possible without inventing a separate transport.

CandidateCategory, ExchangeEvidence, SourceEvidence, and Quantities have exactly
the [adapter schema](fixture_contract.md#2-assessment-result-and-common-validation).
An uncertain observation can be retained as a Judgment with `valid: true` without
making `assessed` true; validity is source/schema admission, not sufficient math
evidence. Retraction appends an immutable correction event; the returned
Judgment projection then has `valid: false`. Preserve the original committed
judgment and derive validity from those events, as required by learning replay.

```text
StudentSnapshot = {runId, sessionId, revision, generatedAt, learnerId,
                   processingMode: "live" | "fixture", assignment: Assignment | null,
                   assignments: Assignment[], attempts: Attempt[], targets: Target[],
                   judgments: Judgment[], corrections: Correction[],
                   allowedActions: ActionOffer[], actions: PerformedAction[],
                   lastAction: PerformedAction | null,
                   sessionStatus: "in_progress" | "teacher_review" | "finished"}
TargetCount = {targetId, assessed: integer, unassessed: integer,
               activeNeeds: integer, clarification: integer, pending: integer}
TeacherLearner = {learnerId, label: string, targets: Target[],
                  assignments: Assignment[], attempts: Attempt[],
                  judgments: Judgment[], corrections: Correction[],
                  actions: PerformedAction[]}
TeacherSnapshot = {runId, sessionId, revision, generatedAt,
                   processingMode: "live" | "fixture", rosterTotal: 6,
                   counts: TargetCount[], learners: TeacherLearner[]}
Receipt<R> = {runId, sessionId, revision, replayed: boolean, result: R}
AttemptResult = {attemptId, turnId: UUID | null, workVersion, evidenceVersion,
                 assignmentRevision, targetCorrectionRevision,
                 jobId: UUID | null, student: StudentSnapshot}
```

Arrays of learners use A–F order; target arrays use addition then subtraction;
history arrays use server acceptance order. StudentSnapshot contains only that
learner. TeacherSnapshot includes all six learners and no audio or raw candidate.
`clarification` and `pending` counts can overlap assessed/active children; they
are not denominators. Never sum attempts as learners. All duplicated identity
and revision fields within one response describe the same atomic snapshot.

## 3. Read operations

GET has no request body. Except `/api/context`, read operations require current
`runId` and `sessionId`. A missing/unknown current-context resource is 404; an old
context is 409. Reads never allocate IDs, restart work, or advance a lesson.

| Operation | Exact query | Success |
| --- | --- | --- |
| `GET /api/context` | none | `200 Context` |
| `GET /api/student` | `learnerId`, `runId`, `sessionId` | `200 StudentSnapshot` |
| `GET /api/teacher` | `runId`, `sessionId` | `200 TeacherSnapshot` |
| `GET /api/attempts/:id/work.png` | `runId`, `sessionId`, positive integer `workVersion` | `200` immutable admitted PNG bytes after metadata normalization; `Content-Type: image/png`; `Content-Length` actual retained PNG bytes |

```text
Context = {runId, sessionId, revision, processingMode: "live" | "fixture",
           lesson: {lessonId, title: string, targetIds: TargetId[]},
           roster: [{learnerId: "A".."F", label: "Learner A".."Learner F"}],
           limits: {boardWidth: 1024, boardHeight: 768,
                    pngFileBytes: 1048576, jsonBytes: 2097152,
                    audioBytes: 10485760, recordingSeconds: 60,
                    pointsPerWork: 20000, textPerTurn: 4000,
                    assembledTextPerAttempt: 12000, turnsPerAttempt: 16,
                    evidenceVersionsPerAttempt: 16,
                    historyBytesPerAttempt: 65536, attemptsPerSession: 128,
                    retainedPngBytes: 67108864, mutationRecords: 2048,
                    inFlightProviderCalls: 2, providerTimeoutMs: 45000,
                    snapshotTimeoutMs: 5000, pollAfterSettleMs: 1000}}
```

Context never includes a fixture case selector, test controls, model credentials,
or expected answers. Work GET requires exact attempt-owned workVersion; another
version or a text-only attempt is `RESOURCE_NOT_FOUND`. A reset releases old
images; an old-context request is `CONTEXT_CHANGED` and cannot recover their bytes.

## 4. Mutation operations

All successes below are `Receipt<...>`. `201` responses include `Location` naming
the current learner's `/api/student?learnerId=…&runId=…&sessionId=…`. All `202`
responses include the same `Location` plus `Retry-After: 1`. `202` means the job
has been admitted and assigned a job ID, not that a provider result succeeded.
Poll StudentSnapshot to observe its terminal or review state. The server never
holds the HTTP response open until a provider finishes. The transient
`ready_for_assessment` state is observable; assessment always requires its own
explicit operation.

### Submit immutable work

`POST /api/attempts` receives:

```text
E + {learnerId, assignmentId, attemptId, expectedAssignmentRevision,
     expectedTargetCorrectionRevision, imagePngBase64: string | null,
     strokes: Stroke[], writtenWorking: string,
     explanationMode: "spoken" | "written", initialText: string | null}
```

`imagePngBase64` is canonical padded base64 without a data-URL prefix, whitespace,
or URL-safe alphabet. PNG admission and the separate raster bound follow the
[media contract](media_contract.md). Require an admitted image or nonempty
trimmed `writtenWorking`; strokes alone are not submitted work. No image requires
`strokes: []`; an image can have no strokes. Total points are bounded across all
strokes. `writtenWorking` is at most 4,000 code points and counts toward retained
text history. Written mode requires nonempty `initialText` at most 4,000 code
points; spoken mode requires `initialText: null`.

Only the current assignment accepts new work. Reject an attemptId already used
under a different idempotency key with `RESOURCE_CONFLICT`. Admission atomically
allocates its next workVersion, evidenceVersion 1, and initial turnId; makes it
the assignment's active attempt; increments assignmentRevision; and supersedes
any pending job for the previous attempt. Retain earlier work/history. Check all
capacity/PNG/text bounds before doing any of this. No provider call starts.

Return `201 Receipt<AttemptResult>` with `turnId` initial turn, `jobId: null`, and
state `awaiting_audio` (spoken) or `ready_for_assessment` (written). The initial
written turn is already confirmed. A submission's new expected assignment
revision is returned in `assignmentRevision`.

### Upload one completed audio turn

`POST /api/attempts/:id/audio?turnId=UUID` has binary bytes as its entire body.
Require these headers instead of JSON:

```text
Content-Type: audio/webm;codecs=opus | audio/webm | audio/mp4 | audio/wav
X-Run-Id, X-Session-Id, X-Idempotency-Key,
X-Learner-Id, X-Assignment-Id, X-Expected-Assignment-Revision,
X-Expected-Evidence-Version, X-Expected-Target-Correction-Revision
```

Header revision values are canonical nonnegative base-10 strings. Accept case
insensitive MIME tokens/parameter ordering; normalize MIME for fingerprinting.
Reject unsupported parameters/codecs, empty bodies, or a container signature that
does not match the declared type. This is bounded format admission, not a claim
to verify duration or speech meaning. A turn must be the active unfilled spoken
turn in `awaiting_audio`. Admission reserves one of two provider slots, records
the job, and enters `transcribing`. Return `202 Receipt<AttemptResult>` with the
audio turnId and jobId. The byte buffer is transient and released on every
completion, rejection, abort, failure, timeout, and shutdown path.

A successful transcription stores bounded recognized text, increments
evidenceVersion, and enters `awaiting_transcript_review`. It does not assess.
An empty/unusable or over-limit transcription fails visibly without inventing
text; the attempt enters `failed`. A transcription job timeout/failure appears
in Attempt `error`; the already returned 202 is not rewritten to an HTTP error.

### Confirm text and start assessment

`POST /api/attempts/:id/assessment` receives:

```text
AE + {confirmedTurns: [{turnId: UUID, text: string}]}
```

Supply exactly all current turns, once each and in their stored order; each text
is nonempty and at most 4,000 code points. No audio-pending/transcribing turn can
be confirmed. Initial written text or previous confirmed text can be sent
unchanged. Preserve recognized/original text and every edit. An actual edit or
new confirmation increments evidenceVersion once for this whole operation, not
once per turn. Enforce the 12,000 assembled-text, 16-turn, 16-evidence-version,
and 64 KiB UTF-8 retained-history limits before commitment. Limits are separate;
an unchanged confirmation consumes neither a version nor a turn.

The attempt's assignment must still be the learner's current assignment.
Historical evidence remains visible; correct a historical judgment through
teacher retraction rather than learner reassessment. Allowed from
`ready_for_assessment`, `awaiting_transcript_review`,
`needs_clarification`, or a current `accepted`/`awaiting_readback` attempt when its
confirmed text is being corrected. In the latter cases require an actual text
edit; unchanged accepted work cannot be repeatedly assessed. A recognition edit
of already-confirmed text invalidates the old candidate and that attempt's
judgments based on replaced evidence, as specified by the learning contract;
it increments
the target correctionRevision if a committed judgment was invalidated, and
replays that target before starting the new job. Slot/bounds validation precedes
the whole correction; a busy rejection cannot invalidate old evidence.

Reserve a provider slot and return `202 Receipt<AttemptResult>` with `turnId:
null`, new/current evidenceVersion, new/current targetCorrectionRevision, and
assessment jobId. On validated success: an image goes to `awaiting_readback`;
text-only evidence commits synchronously within the job completion and enters
`accepted` or `needs_clarification` according to its validated observations.
An uncertainty/conflict is a learning outcome, not a provider failure. A malformed
or ungrounded result enters `failed` with its safe error and commits no judgment.

### Confirm the neutral image readback

`POST /api/attempts/:id/readback` receives:

```text
AE + {candidateId: UUID, matches: boolean}
```

Only the current attempt's `awaiting_readback` candidate can be addressed. `matches: true`
confirms the image source, then commits the candidate through learning validation
exactly once. A validated usable judgment enters `accepted`; uncertainty/conflict
enters `needs_clarification`, preserving earlier supported findings. `matches:
false` records a mismatch, invalidates that uncommitted candidate, increments
evidenceVersion once, and enters `needs_clarification`. It commits no disputed
math judgment and shows the authored recognition prompt. The next clarification
can describe the marks; editing the board instead requires a new attempt. No
provider starts here. Return `200 Receipt<AttemptResult>`, `turnId/jobId: null`.

### Add a clarification turn

`POST /api/attempts/:id/clarifications` receives exactly one union branch:

```text
AE + {mode: "written", text: string}
AE + {mode: "spoken"}
```

The spoken branch has no `text` key. A written clarification is nonempty and at
most 4,000 code points. Allow this in `needs_clarification`, or in `accepted`
after the most recent `/next` applied a current-assignment neutral prompt or
teaching action that requests another explanation. No pending turn/job may
exist. Append a new turnId, preserve previous turns/work, and increment
evidenceVersion once. Appending reasoning does not invalidate a prior committed
judgment or increment correctionRevision: its assessment adds a chronological
judgment and updates only the Attempt's latest acceptedJudgmentId pointer.
Earlier difficulty remains valid history and clears only through the learning
rules' fresh independent evidence. Editing an already-confirmed source or an
explicit correction can invalidate earlier support. Return
`201 Receipt<AttemptResult>` with
the new turnId and `jobId: null`. Written mode enters `ready_for_assessment` and
requires `/assessment` with all turns; spoken mode enters `awaiting_audio`, then
requires audio, transcript review, and `/assessment` in that order. Clarification
never changes assistance automatically; an authored teaching/warmup action has
already marked assistance before being displayed.

### Cancel processing

`POST /api/attempts/:id/cancel` receives `AE`, with no extra keys. From any state
other than `accepted` or already `cancelled`, cancel its active work, invalidate
its commit token, abort its jobs, stop processing, and release transient audio.
No admitted PNG/history or committed older judgment is deleted. An accepted
attempt has no pending processing to cancel and returns `INVALID_TRANSITION`.
An already-cancelled attempt with current context returns 200 with its current
projection, including under a new key; it has no additional side effects. Return
`200 Receipt<AttemptResult>` with `turnId/jobId: null` and state `cancelled`.
Do not increment evidenceVersion or target correctionRevision for cancellation.
The next submission is a new attempt. Failed/cancelled attempts cannot resume.

### Apply help or issue the next assignment

`POST /api/learners/:id/next` receives:

```text
E + {learnerId, assignmentId, expectedAssignmentRevision,
     expectedTargetCorrectionRevision, actionId}
```

Require the route/body learner, current assignment identity, and one current
`allowedActions` actionId. No processing/readback/transcript confirmation may be
pending. The learning contract supplies the finite catalog and complete decision
table. The server returns the same action it accepted; a scheduler-dependent
action must already be the action offered by the preceding snapshot.

* `current_assignment`: record the action event, increment assignmentRevision,
  record assistance before returning teaching/warmup material when applicable,
  and return the same assignmentId/problem/workVersion. Neutral prompts do not
  consume problems or clear findings.
* `new_assignment`: complete the old assignment if the learning rules permit,
  allocate a new assignmentId/revision 0 and the next authored problem, and
  consume a pool entry only as specified by the scheduler. No attempt or evidence
  is pre-created. Independent eligibility is server-owned.
* `session_status`: record `request-teacher-review` or `finish-session`, keep the
  last assignment/history, and set the corresponding sessionStatus. It never
  creates a repeated problem merely to fill a pool gap.

Return `200 Receipt<{performedAction: PerformedAction,
assignment: Assignment | null, student: StudentSnapshot}>`. First assignment
creation happens with session initialization, not by calling `/next` on null.

### Retract unsupported judgments

`POST /api/findings/:id/retractions` receives:

```text
E + {learnerId, targetId, expectedFindingRevision,
     expectedTargetCorrectionRevision, judgmentIds: UUID[], reason: string}
```

Require a nonempty unique list (at most 128) of currently valid judgments in
that exact finding/learner/target history and a trimmed reason of 1–500 code
points. Reject mixed targets, unknown judgments, or already invalid judgments
without partial retraction. Mark the selected judgments invalid, append one
Correction, increment that target correctionRevision once, invalidate only its
pending jobs, replay it chronologically, and produce one atomic new snapshot.
Retain issued assignments, consumed pools, original evidence, and correction
history; follow the learning contract's corrected obligations for future issue.
Restore current attempts whose jobs were invalidated to ready_for_assessment,
awaiting_transcript_review, or awaiting_audio according to their retained turns,
as specified by learning. Retraction of the current committed judgment with no
active job enters needs_clarification. Historical attempts remain read-only.
Return `200 Receipt<{findingId, correctionId, findingRevision,
targetCorrectionRevision, teacher: TeacherSnapshot}>`. Teacher and poll responses
use the same monotonic session revision rule.

### Reset the current session

`POST /api/reset` receives `E + {expectedSessionRevision}`. Require the current
session-wide revision. Reset is available even at capacity or during processing.
Atomically invalidate/cancel all jobs, release all admitted images and transient
audio, clear previous attempts/judgments/help/corrections/idempotency records,
allocate a new sessionId (same runId), reset revision to zero, recreate the fixed
roster/stable target findings and initial addition assignments, and return
`200 Receipt<{context: Context, teacher: TeacherSnapshot}>` in the **new**
context. This response has `replayed: false`; a retry of the old-session request
returns `CONTEXT_CHANGED` with the new context identities. There is no implicit
reset in startup seeding, a read, a provider failure, or a browser refresh.

## 5. Finite safe error catalog

Every API error body is exactly:

```text
{error: {code: ErrorCode, message: catalog string, retryable: boolean},
 runId: UUID, sessionId: UUID}
```

Those IDs identify the server's current context, including a context mismatch.
No details/raw exception/provider body is added. Failed jobs use the same inner
`{code,message,retryable}` as Attempt `error`. The HTTP column below applies when
the failure can be known before a response; after 202 it is the snapshot error
classification. `retryable` means a later user-authorized fresh operation can
succeed under the stated condition; there are no automatic paid retries.

| Code | HTTP | Message (exact) | Retryable / recovery |
| --- | --- | --- | --- |
| `INVALID_REQUEST` | 400 | `Check the submitted fields.` | false; correct body/query/headers, including invalid JSON or IDs |
| `RESOURCE_MISMATCH` | 400 | `The submitted work does not match this request.` | false; correct route/body ownership |
| `INVALID_PNG` | 400 | `The drawing file is damaged or invalid.` | false; re-export admitted PNG |
| `INVALID_AUDIO` | 400 | `The recording file is empty or invalid.` | false; record again or use writing |
| `ORIGIN_REJECTED` | 403 | `Open the app from its local address.` | false; correct Host/Origin |
| `RESOURCE_NOT_FOUND` | 404 | `This item is not available in the current session.` | false; refresh current state |
| `ROUTE_NOT_FOUND` | 404 | `This address is not available.` | false; correct route |
| `METHOD_NOT_ALLOWED` | 405 | `This action is not available at this address.` | false; response also has `Allow` with the supported verb(s) |
| `CONTEXT_CHANGED` | 409 | `The demo session changed. Refresh to continue.` | false; fetch context, discard old actions |
| `REVISION_CONFLICT` | 409 | `This work changed. Refresh before continuing.` | false; fetch current snapshot, intentionally retry under a new key |
| `IDEMPOTENCY_CONFLICT` | 409 | `This request identity was already used for different content.` | false; correct accidental key reuse |
| `RESOURCE_CONFLICT` | 409 | `This work identity was already submitted.` | false; recover its accepted result or use a new attemptId |
| `INVALID_TRANSITION` | 409 | `Complete the current step before this action.` | false; refresh and follow allowed actions |
| `ACTION_NOT_ALLOWED` | 409 | `Choose an action offered for the current work.` | false; refresh allowedActions |
| `REQUEST_TOO_LARGE` | 413 | `This submission is too large.` | false; reduce JSON/audio/retained turn-history input |
| `IMAGE_TOO_LARGE` | 413 | `The drawing exceeds the allowed size.` | false; re-export within file/raster/dimension bounds |
| `UNSUPPORTED_MEDIA` | 415 | `Use a supported recording or JSON format.` | false; negotiate recording format or use writing |
| `UNSUPPORTED_PNG` | 415 | `Use a supported PNG drawing format.` | false; re-export admitted PNG subset |
| `PROCESSING_BUSY` | 429 | `Two explanations are processing. Try again shortly.` | true; no admission; `Retry-After: 1` |
| `SESSION_CAPACITY` | 429 | `This demo is full. Reset or restart to add work.` | false; prior evidence remains; reset/restart is explicit |
| `INTERPRETATION_UNAVAILABLE` | 502 | `The explanation could not be processed. Try new work or use writing.` | true; new attempt or non-speech route; no finding |
| `INTERPRETATION_INVALID` | 502 | `The returned interpretation could not be verified. Try new work or use writing.` | true; malformed schema, ungrounded source, invalid action or impossible provider claims; no finding |
| `FIXTURE_UNMATCHED` | 502 | `This input has no prepared example. Use the documented example or switch modes.` | false; fixture mode only; never fall back to live |
| `INTERPRETATION_TIMEOUT` | 504 | `Processing took too long. Try new work or use writing.` | true; new attempt; no finding |
| `INTERNAL_ERROR` | 500 | `The app could not complete this action.` | false; preserve prior snapshot; operator may restart |

Unknown provider errors map to `INTERPRETATION_UNAVAILABLE`; syntax/schema/source
failures map to `INTERPRETATION_INVALID`; AbortError from a known cancellation is
not a failed learning result. Explicit cancellation is a successful 200 response,
not an error. Unsupported fixture controls/configuration fail server startup;
they are not new public API errors.

Validation precedence is Host/Origin and method/route, bounded parse/media shape,
current context, idempotency replay/conflict, resource ownership, expected
revisions, state/action eligibility, per-attempt and session bounds, provider
slot, then atomic admission. PNG errors are produced by PNG admission before
state mutation. Exceeding HTTP body byte caps can terminate input consumption;
the server still returns the safe 413 when the connection permits. No failed
validation consumes a pool slot, invalidates a judgment, or changes a count.

## 6. Browser reconciliation

Use `cache: "no-store"` for API reads and fetch exact work URLs without browser
storage. After a mutation replace local state only with the same-context
snapshot whose revision is at least the displayed revision. Reject older
snapshot responses, including a poll that arrives after a correction. A new
run/session disposes the old timer, in-flight fetch, capture, and pending actions,
then loads the new context rather than comparing revisions across sessions.
Keep last-known teacher data visibly stale on errors; never replace it with
zeros. Poll immediately, then 1,000 ms after settlement, with one request/timer
and a 5,000 ms request timeout. Student polling runs only during processing;
operation responses and explicit refresh handle the other states.
