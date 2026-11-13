# Injected interpretation, prepared examples, and class seed — DR-04

This resolution freezes the seam used by the live adapter, fixture adapter,
server tests, browser tests, and seeder. It adds no application, network call,
credential access, framework, queue, or storage. Public operations and projections
are exactly the [HTTP contract](api_contract.md); learning outcomes follow the
[learning contract](learning_contract.md). Fixture use remains visibly labelled
and does not satisfy the live multimodal gate.

## 1. Application and adapter injection

`server.mjs` exports this single constructor:

```text
createApp({config, lesson, adapter,
           now = () => new Date(), newId = crypto.randomUUID})
  -> {server: node:http.Server, close: () => Promise<void>}
```

`config`, parsed by `src/config.mjs`, and the complete validated
`content/demo-lesson.json` object are required. `adapter` is required; the
executable entry point constructs the selected live or fixture adapter before
calling `createApp`. Tests supply the same interface. There is no hidden default
adapter or fallback from live to fixture. `now()` returns a valid Date; `newId()`
returns a fresh canonical UUID. Those two synchronous seams permit deterministic
IDs/time in tests without an alternate state store. The constructor validates
configuration/content and creates fresh process-memory state and a new runId;
it creates the server without listening. Call Node's `server.listen` on the
selected loopback host/port. `close()` is repeatable, invalidates all jobs,
aborts/release transient resources, releases admitted media/state, and closes a
listening server. The returned object exposes no mutable records or fixture
selector; tests verify behavior through HTTP.

Both adapters implement exactly:

```text
adapter.transcribe(input: TranscribeInput) -> Promise<{text: string}>
adapter.assess(input: AssessInput) -> Promise<Candidate>
adapter.cancel({jobId: UUID, reason: CancelReason}) -> Promise<void>

CancelReason = "superseded" | "correction" | "cancelled" | "reset" |
               "shutdown" | "timeout"
JobContext = {jobId, runId, sessionId, learnerId, assignmentId,
              assignmentRevision, targetId, attemptId, workVersion,
              evidenceVersion, correctionRevision}
FrozenWork = {image: {bytes: Uint8Array, sha256: lowercaseHex64,
                     width: integer, height: integer} | null,
              imageSourceId: string | null, strokes: Stroke[],
              writtenWorking: string, writtenSourceId: string | null}
AdapterProblem = {problemId, targetId, operation: "add" | "subtract",
                  left: integer, right: integer, prompt: string,
                  purpose: "practice" | "check" | "review",
                  assisted: boolean}
TranscribeInput = {job: JobContext, problem: AdapterProblem, work: FrozenWork,
                   turn: {turnId, index: integer, source: "transcription"},
                   audio: {bytes: Uint8Array, mimeType: string},
                   signal: AbortSignal}
ConfirmedTurn = {turnId, source: "transcription" | "written", text: string}
AssessInput = {job: JobContext, problem: AdapterProblem, work: FrozenWork,
               turns: ConfirmedTurn[], criteria: Criteria,
               allowedActionIds: string[], signal: AbortSignal}
Criteria = {criterionId: "conserve-value-addition" | "conserve-value-subtraction",
            expectedAnswer: integer, before: {tens: integer, ones: integer},
            conservedAfter: {tens: integer, ones: integer},
            difficultyCode: "addition-omitted-ten" | "subtraction-value-changed"}
```

All input fields are required, including nullable image fields. `index` is the
zero-based turn position. An image source ID is exactly
`attemptId + ":work:" + workVersion`; no image means both image fields are null.
A nonblank writtenWorking has writtenSourceId exactly
`attemptId + ":work:" + workVersion + ":written"`; otherwise that source ID is
null. The submitted text is an immutable confirmed work source, distinct from
explanation turns. Include that source ID with its text in the assessment input
sent to the provider; no transformation or invented explanation turn is needed.
Adapter image bytes are the immutable normalized admitted PNG defined in the
[media contract](media_contract.md), not a second copy of client metadata.
For addition, Criteria `before` is the combined original tens/ones and
`conservedAfter` is the normalized exchange; for subtraction they describe the
minuend before/after the one-ten exchange. Compute every quantity/answer from
authored operands, never from provider advice. `allowedActionIds` is the complete
finite authored action catalog, not the learner's currently eligible next actions
and not a requested diagnosis. A known but inapplicable proposed action is ignored
by the learning controller, which derives the eligible action from the validated
evidence and scheduler; an unknown action ID fails validation. Neither input contains teacher counts,
a desired category, a fixture ID, or a claimed finding transition.

The server retains ownership of input buffers and snapshots; adapters must not
mutate them, persist them, log them, or retain their references after settlement.
An adapter holds only its current cancellation handles. Audio is released by the
server's `finally` path as well as adapter-local cleanup. `cancel` aborts its
named job if present and is a no-op if already settled/unknown. It is safe to
repeat. The AbortSignal is the immediate propagation path; the explicit method
also lets the server release adapter-owned resources. Cancellation never
changes learning state itself. Late settlement is always checked against
JobContext and the server's commit token before any state change.

Adapter rejection is an `Error` with `name: "InterpretationError"` and a finite
`code`: `unavailable`, `invalid`, `timeout`, `cancelled`, or `fixture_unmatched`.
Use the HTTP catalog's corresponding safe error; raw error strings are never
returned or logged with user media. A known abort leaves the already selected
cancelled/superseded state, rather than adding a failure. The server owns the
45-second deadline and two-call limit for both adapters. No adapter performs
automatic retries. A fixture may simulate a delayed result that ignores abort
only through the startup test controls below, to prove the server rejects it.

The live implementation keeps the approved models/endpoints, structured output,
bounded response, and project-only credential behavior from `design_draft.md`.
Its transcription provider call receives audio only; the extra local problem/work
fields exist so the fixture implementation can match the same server-owned
request context. Assessment sends frozen work, confirmed turns, authored operands,
the symbolic target rubric, and allowed authored action IDs. Criteria's computed
expectedAnswer/before/conservedAfter remain local validation inputs for every
mode and never enter the outbound provider prompt or probe request. The provider
is not handed a case-specific answer key or expected classification.
The transport injection for unit-testing the live
adapter remains internal to `src/assessment-adapter.mjs`; it does not add an API.


### Provider response limits and transport checks — DR-14

Both live endpoints use completed, non-streaming JSON responses. Set Responses
`max_output_tokens: 2000`; this is an output-generation limit, not a replacement
for the byte limit. Keep its approved low reasoning effort and store:false.

Each successful transcription JSON envelope and each successful Responses JSON
envelope is capped at **262,144 bytes (256 KiB)** as exposed by fetch's response
body after any content decoding. The cap includes the entire provider envelope,
not only transcript/candidate fields. Preserve the existing per-field limits.
In src/assessment-adapter.mjs, use one internal bounded JSON reader for both:

1. Keep the job's 45-second AbortSignal/deadline active through body consumption,
   JSON parsing, and candidate validation. Race pending reader reads against that
   signal and cancel the reader on abort, even if injected transport ignores
   fetch cancellation; remove the abort listener in finally. A non-2xx response is unavailable:
   cancel/discard its body without parsing or logging provider error content.
2. Require application/json, allowing charset parameters. If a valid integer
   Content-Length exceeds 262,144, reject immediately; do not rely on that header
   for admission. Require a readable body, and consume with its stream reader.
3. Count every received body chunk before retaining it. On cumulative size over
   262,144, cancel the reader and abort the job's fetch; retain no excess chunk
   or raw body. Otherwise retain at most the capped byte total. Never call
   unbounded response.json(), response.text(), or response.arrayBuffer().
4. Decode the completed bounded bytes as strict UTF-8 and parse JSON once, then
   validate endpoint envelope and all normal transcript/candidate/source limits.
   Malformed UTF-8/JSON, wrong content type/envelope, absent body, overflow, or
   truncated structured output is an invalid interpretation. A deadline is
   timeout; a transport/provider failure is unavailable. Release reader/chunks
   and provider slot in finally on every terminal path. Do not retry paid work.

These errors map through the existing safe invalid/timeout/unavailable codes;
no provider text escapes. Unit tests inject transport Response streams at the
exact cap and cap+1, including a missing/lying Content-Length, multi-chunk
crossing, wrong MIME, invalid UTF-8/JSON, slow body timeout, non-2xx, and abort.
Verify early cancellation, no partial candidate/judgment, released slot/audio,
and recovery through the normal explicit new-attempt path. API tests exercise
safe async failure after 202. No new file or dependency is needed.

## 2. Assessment result and common validation

`Candidate` has exactly these required fields, with no additional properties:

```text
{category: CandidateCategory, observedAnswer: safe integer | null,
 exchangeEvidence: "supported" | "contradicted" | "not_established" | "unclear",
 recognitionStatus: "usable" | "clarify" | "conflict",
 sourceEvidence: SourceEvidence[], exchangeQuantities: Quantities | null,
 neutralReadback: string, reasoningSummary: string, teachingMoveId: string}

CandidateCategory = "supported_exchange" | "addition_omitted_ten" |
 "subtraction_value_changed" | "procedure_without_exchange_explanation" |
 "correct_answer_without_reasoning" | "valid_alternative_strategy" |
 "computation_error" | "needs_clarification"
SourceEvidence = {sourceKind: "turn" | "image" | "written_work", sourceId: string,
                  quote: string | null, description: string}
Quantities = {before: {tens: integer 0..999, ones: integer 0..999},
              after: {tens: integer 0..999, ones: integer 0..999}}
```

`sourceEvidence` has at most ten entries. A turn entry requires an existing
confirmed turnId and a nonempty exact substring quote from that turn. A
written_work entry requires the current non-null writtenSourceId and a nonempty
exact substring quote from the immutable writtenWorking; it cannot cite an older
work version, unrelated attempt, or normalized/paraphrased text. An image
entry requires the current imageSourceId, `quote: null`, and nonempty description;
it cannot cite an absent image or a previous attempt. Quotes/descriptions are
at most 500 code points each; reasoningSummary at most 500 and neutralReadback
at most 1,200. A non-clarification category requires usable supporting source
entries. An unrecognizable `needs_clarification` can have no source entries.
Text-only input requires `neutralReadback: ""` and no image source entry. For an
image, neutralReadback describes only submitted marks/quantities; it must not
include an expected solution, correctness verdict, teaching step, or a worked
correction. The student sees it before any candidate math feedback.

Written work can establish the full exchange even when its explanation turn
only says “I showed the trade in my work.” Apply the same mathematical predicates
to its grounded quotations as to confirmed turns. Any unexplained conflict
between written work, image, or explanation takes the neutral clarification path
before a disputed finding; do not silently prefer one source. Add learning,
adapter, HTTP, and browser cases with all mathematical reasoning in written work,
short accompanying text, no image, and a separate work/explanation conflict.
Reject forged/stale written source IDs and absent/paraphrased quotes. This adds
no media, provider route, or field to a public mutation body.

Every adapter result passes one shared server path: strict schema and size;
current source identity and exact quotes; independently computed authored answer;
observed quantities and conservation/error predicates; cross-modal consistency;
full action-catalog membership followed by controller selection from the authored
table; recognition readback when an image exists;
then learning reduction. Fixture mode has no bypass flag. The adapter proposes
neither `answerCorrect`, `canClearFinding`, counts, independence, nor mastery.
Only the server derives those values. Source/schema failure is
`INTERPRETATION_INVALID`; actual wrong learner numbers remain admissible grounded
evidence. Unclear/conflicting content is `needs_clarification`, with no disputed
new difficulty/clearing, rather than an invented error code.

The shared validation entry points belong in the selected `src/learning.mjs`
and the server's processing path. The live adapter validates its provider
boundary too, but callers still run common validation after any injected result.
The fixture adapter returns fresh copies of provider-shaped observations, never
prebuilt Attempt/Judgment/Finding objects or teacher snapshots.

## 3. Server-owned fixture matching

`test/fixtures/regrouping-cases.json` is the one authored text/observation
catalog used by the fixture adapter, audio probe, seed script, and browser tests.
It contains the six canonical `audio-*` cases from the
[verification contract](verification_contract.md), the seed rows below, and
image/readback/invalid-output cases needed by the browser/server checks. Case
names are private test/catalog identifiers; none is a mutation field.

`test/fixture-adapter.mjs` exports
`createFixtureAdapter({catalog, controls: FixtureControl[]})`. The executable
uses it only when `ASSESSMENT_MODE=fixture` was explicitly selected. Live mode
must reject attempts to load fixture catalogs/controls and must never instantiate
the fixture adapter. Both views display “Prepared examples” whenever Context
processingMode is fixture; errors do not silently change modes.

The JSON catalog has exactly `{version: 1, cases: FixtureCase[]}`. Each case has
exactly the following required keys:

```text
FixtureCase = {caseId: string, problemId: string,
               purpose: "practice" | "check" | "review", assisted: boolean,
               writtenWorking: string, strokes: Stroke[],
               imagePngBase64: string | null,
               turns: FixtureTurn[], candidate: CandidateTemplate}
FixtureTurn = {source: "written" | "transcription", text: string,
               audioCaseId: string | null, browserAudioClasses: string[]}
```

CandidateTemplate is exactly Candidate with sourceId placeholders described
below. Written turns require audioCaseId null and browserAudioClasses empty;
spoken turns reference one of the six canonical audio case IDs. Canonical
WAV-only rows require browserAudioClasses empty. Separate browser rows explicitly
allow both `browser-webm-opus` and `browser-mp4`; an empty list creates no browser
transcription key. Audio hashes are computed from the
generated canonical WAVs, not invented or copied from removed old probe files.
`test/fixture-adapter.mjs` also exports `prepareFixtureCatalog({catalog,
canonicalWavs})` and `makeFixturePng({width,height,rgba})`: canonicalWavs is the
borrowed audioByCaseId map returned by the verification contract's
prepareSyntheticAudio helper; preparation
stores only the derived SHA-256/duration metadata and retains no WAV buffers.
For makeFixturePng, rgba is a Uint8Array of exactly width*height*4 pixel bytes;
require positive in-board integer dimensions and the same raster/file bounds.
The former validates closed catalog rows and builds the private indexes; the
latter produces bounded
synthetic RGBA PNG bytes with built-in Buffer, `node:zlib.deflateSync`, and
`node:zlib.crc32`, then passes them through `src/png.mjs` admission. These are
test helpers within the existing file allowlist, not runtime dependencies.
`canonicalWavs` is a Map from audioCaseId to that helper's AudioAsset records;
read asset.bytes without retaining it. The map can be empty for written/browser-only
fixture operation. The helper returns private
PreparedCatalog indexes; `createFixtureAdapter` receives that result as its
`catalog` argument. Exact-WAV matching is available only for the supplied map
entries; browser class matching uses the separately registered browser rows.
All canonical audio rows use text-only work `Synthetic audio probe. <problemId>.`,
empty strokes, practice purpose, no assistance, and the exact canonical spoken
text and browserAudioClasses empty; probe-created IDs are substituted at call
time. Seed rows use section 5.

Add six browser-only rows `browser-01` through `browser-06`, in the same order as
the canonical audio table. Each inherits its canonical problem, exact spoken
text, audioCaseId and normal candidate template, with practice purpose, no help,
no image and empty strokes. Its writtenWorking is exactly
`Synthetic browser sample NN. <problemId>.`, replacing NN by its two-digit ordinal
01–06 and problemId by that authored ID. Its single transcription turn allows
both browser classes. These neutral ordinal work strings are distinct even for
the four addition cases; they contain no expected category or answer. The live
probe continues to use the canonical WAV-only rows, not these browser rows.
Validate and assert uniqueness of every generated TranscriptionKey and
AssessmentKey at catalog preparation, including both browser classes. Browser
image/readback cases use separate catalog rows with their actual frozen image
hash; they cannot replace the canonical audio baseline.

The catalog indexes the actual input, not a requested outcome:

```text
WorkKey = SHA256(canonicalJSON({problemId, writtenWorking, strokes,
                               normalizedImageSha256: string | null}))
AssessmentKey = SHA256(canonicalJSON({workKey, purpose, assisted,
                                     confirmedTexts: string[]}))
TranscriptionKey = {workKey, turnIndex, audioClass}
audioClass = "canonical-wav:<sha256>" | "browser-webm-opus" | "browser-mp4"
```

Use canonical JSON object-key order as written, arrays in their original order,
UTF-8, and exact strings (no trimming/case normalization of evidence). IDs,
timestamps, revisions, and learner identity are excluded from keys; they are
bound by JobContext instead. Canonical WAV files require exact byte SHA-256.
Browser capture uses the negotiated container class because MediaRecorder
container bytes are not reproducible. It still requires matching frozen work,
turn ordinal, supported nonempty media, and the preselected fake-microphone
recipe. The simulated transcript is explicit; fixture tests do not establish
recognition of arbitrary audio. Assessment requires the subsequently confirmed
text to match, so a fixture cannot impose a finding on different words.

Each unique key has exactly one catalog row; duplicate ambiguous keys fail
startup. The server/adapter chooses it after admission. No `fixtureCaseId`,
category, transcript override, delay, or malformed-output switch is accepted in
public JSON, headers, query parameters, browser storage, or live configuration.
Human fixture rehearsal uses the published authored work and exact words;
typing different content can deliberately exercise unmatched handling. A
prepared example can be selected locally in a test before submitting its real
work; that local name is never sent to the application API.

Template source placeholders `$turn[0]`, `$turn[1]`, and `$image` are replaced only
with the actual request source IDs. Templates contain exact literal quotes from
their expected confirmed text; substitution never changes quotes, quantities,
or categories. If the input has an image, its registered normalized PNG hash
must match the actual drawing. Browser image cases use fixed catalogued strokes
and a deterministic white-board PNG built by `makeFixturePng`. Their test setup
admits those exact bytes through POST attempts, then opens/refreshes the normal
student view to exercise audio, transcript, image readback, and feedback controls.
It adds no image-import/fixture-selection feature to the product.
A separate drawing/export browser test uses actual pointer events and validates
the resulting admitted PNG/strokes without pretending an uncatalogued picture
was interpreted. Real freehand interpretation is verified by the live gate.

The input request's idempotency fingerprint uses the original admitted request
bytes; fixture work matching uses the media contract's normalized image SHA.
Ancillary-chunk stripping can therefore produce the same fixture WorkKey for
two different raw submissions without making them idempotent retries.

An unmatched transcribe/assess key rejects with `fixture_unmatched`. After 202,
the attempt becomes `failed` with `FIXTURE_UNMATCHED`, releasing audio/provider
slots and retaining the drawing/history. It never calls live services, chooses
a nearby case, guesses a category, or manufactures a normal success. All fixture
catalogs and helpers are credential-free and make no external requests.

## 4. Delay, malformed-result, and browser audio controls

Fixture controls are constructor-only test data, separate from the content
catalog. Each control has exactly:

```text
{operation: "transcribe" | "assess", matchKey: string,
 occurrence: positive integer, delayMs: integer 0..60000,
 ignoresAbort: boolean,
 result: "normal" | "malformed_schema" | "ungrounded_quote" |
         "unsupported_action" | "unavailable"}
```

`matchKey` names a known private catalog key, `occurrence` counts matching calls
within that one adapter instance, and no duplicate control can target the same
call. Unspecified calls use zero delay, respect abort, and return normal data.
`malformed_schema` returns one deliberately invalid shape, `ungrounded_quote`
changes a quote to absent text, `unsupported_action` returns an unlisted action,
and `unavailable` throws the classified unavailable error. Non-normal
transcription controls allow only malformed_schema or unavailable; quote/action
controls are assessment-only. The three invalid assessment variants must fail
through the common validator as `INTERPRETATION_INVALID`, not through a fixture
shortcut. Delay beyond 45 seconds proves the real timeout path. The optional
ignoresAbort control proves that a late result cannot overwrite a correction,
replacement, reset, or cancellation. Controls are never populated by HTTP.

Browser spoken cases prepare the specified synthetic WAV before launching their
own Chromium context/process, using the credential-free
`prepareSyntheticAudio({cases, signal})` helper exported by `scripts/live-probe.mjs` and the
exact tools/voice/format in the verification contract. Launch Chromium with
`--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream`, and
`--use-file-for-fake-audio-capture=<absolute-wav-path>`. Grant microphone
permission only to the loopback origin. Start and stop through the real learner
recording controls, wait at least the generated WAV duration before Stop, upload
the actual negotiated MediaRecorder output, inspect the fixture transcript, and
confirm/edit it through the real review screen. Use one generated WAV per fresh
context; never the user's microphone. The file must remain until capture ends;
cleanup closes contexts/tracks and removes the private temporary directory in a
finally path. Missing synthesis prerequisites fail before browser launch and
never trigger live/provider calls. Written browser cases need no fake microphone.

Browser tests cover both confirmation and correction, matching/mismatching image
readback, supported and uncertain learning outcomes, refresh, one-second teacher
polling, cancellation/reset with an ignoring-abort delayed job, and malformed
response display. They assert labelled fixture processing. None can be reported
as the actual browser drawing/speech live gate or a learning-effectiveness test.

## 5. Frozen six-learner seed recipe

`scripts/seed-demo.mjs` reads Context and Student/Teacher snapshots and invokes
only the documented public mutations. It never imports session-state, appends
judgments directly, writes counts, supplies a fixture selector, or calls reset.
Learner A stays unsubmitted so the stage operator can demonstrate the actual
live loop. Every seeded submission is visibly labelled synthetic material in
the handoff and its retained written working, using the exact prefix below.

For all seed submissions: `imagePngBase64: null`, `strokes: []`,
`explanationMode: "written"`, and `writtenWorking` equal to
`"Synthetic demo. " +` the work string in the following table. `initialText`
is the exact explanation string identified here. These are original authored
examples, not invented historical learner records.

| Text ID | Work string | Exact explanation |
| --- | --- | --- |
| `seed-add-error` | `27 + 18 = 35. 7 + 8 = 15; keep 5 ones; ignore the ten; 2 tens + 1 ten = 3 tens.` | The canonical `audio-add-omitted-ten` string in the verification contract |
| `seed-add-practice-correct` | `27 + 18 = 45. 3 tens and 15 ones become 4 tens and 5 ones.` | The canonical `audio-add-supported` string |
| `seed-add-check-correct` | `36 + 27 = 63. 5 tens and 13 ones become 6 tens and 3 ones.` | `Six ones plus seven ones is thirteen ones. Ten of those ones make a ten, leaving three ones. Three tens plus two tens plus that new ten is six tens. The answer is sixty-three.` |
| `seed-sub-error` | `42 - 17 = 35. I changed 4 tens and 2 ones to 4 tens and 12 ones. Then I subtracted 1 ten and 7 ones.` | The canonical `audio-sub-value-changed` string |
| `seed-add-procedure` | `27 + 18 = 45. Write 5, carry 1, then add 2 + 1 + 1.` | The canonical `audio-add-procedure` string |
| `seed-add-conflict` | `27 + 18. I wrote both 45 and 35 and have not chosen between them.` | `Seven plus eight is fifteen. Ten ones make a ten, leaving five ones. I counted four tens and five ones, so my answer is forty-five. I also ignored the ten in fifteen and counted three tens and five ones, so my answer is thirty-five.` |

Every `Submit(textId)` below means: fetch current StudentSnapshot; POST attempts
with its expected assignment/target revisions; POST assessment with that
attempt's full confirmedTurns; await its current-context completion through GET
student. Require the expected category and grounded evidence, then continue.
There is no image/readback shortcut in this text-only recipe. Every
`Next(actionId)` means fetch/validate the current offered action and POST next
with current expected revisions. All request/response fields use the HTTP
contract. Stop safely on an unexpected action/category/error rather than forcing
the following step.

| Learner | Exact accepted sequence | End state |
| --- | --- | --- |
| A | No mutation | Addition practice assigned, no submitted work; both targets unassessed |
| B | `Submit(seed-add-error)` | Addition assessed, active omitted-ten finding; remains on addition practice |
| C | `Submit(seed-add-error)` → `Next(teach-addition-exchange)` → `Submit(seed-add-practice-correct)` on the same now-assisted practice assignment → `Next(fresh-addition-check)` → `Submit(seed-add-check-correct)` on `addition-check-1` | Addition independently demonstrated, prior active finding cleared, original error/help retained, later review pending; stop before moving to subtraction |
| D | `Submit(seed-add-practice-correct)` → `Next(fresh-addition-check)` → `Submit(seed-add-check-correct)` on `addition-check-1` → `Next(start-subtraction-practice)` → `Submit(seed-sub-error)` on subtraction practice | Addition assessed/independently demonstrated; subtraction assessed with active value-change finding; addition review is due after this completed subtraction task, with its scheduling action left for the demonstrator |
| E | `Submit(seed-add-procedure)` | Addition unassessed/unverified, no confirmed difficulty; neutral carried-value question offered |
| F | `Submit(seed-add-conflict)` | Addition unassessed, needs clarification, no disputed difficulty; conflicting explanations retained |

The conflict row deliberately uses two contradictory claims in the same confirmed
text, so the initial seed needs no image fixture. Separate browser cases exercise
image/explanation disagreement with catalogued actual images. Seed mode does not
claim that written working alone verifies image recognition.

## 6. Seed replay, validation, and mode behavior

Use deterministic UUIDv5 attemptIds derived from the fixed namespace
`08d6e916-ae08-5c28-9f02-f640655d672e` and UTF-8 name
`runId/sessionId/seed-v1/learnerId/stepName`. The complete stepName lists are:

| Learner | Step names in sequence |
| --- | --- |
| B | `01-add-error` |
| C | `01-add-error`, `02-teach-addition`, `03-add-practice-correct`, `04-fresh-addition-check`, `05-add-check-correct` |
| D | `01-add-practice-correct`, `02-fresh-addition-check`, `03-add-check-correct`, `04-start-subtraction`, `05-sub-error` |
| E | `01-add-procedure` |
| F | `01-add-conflict` |

Use keys `seed-v1:<learnerId>:<stepName>:submit`, `:assess`, or `:next` for the
respective operations. On resume, *skip accepted operations*, rather than replay
an old key with advanced expected revisions. The exact algorithm uses existing
snapshot data and no new endpoint/checkpoint store:

1. For Submit, locate its deterministic attemptId. If absent and the current
   assignment is the expected one, submit with current expected revisions. If
   present, verify exact work, source/text, assignment/problem/purpose, and no
   corrections; skip submission. A conflicting deterministic ID stops the seed.
2. If that attempt is `ready_for_assessment`, no assessment was admitted because
   admission atomically changes it to `assessing`; send its deterministic assess
   key with the current revisions. If `assessing`, await it. If accepted or
   needs_clarification, verify its expected candidate/grounding through its
   retained Judgment and skip assessment. Failed/cancelled/unexpected states stop.
3. For Next, locate its exact deterministic key in StudentSnapshot `actions`.
   If present, verify actionId, source assignment, and resulting destination;
   skip it. If absent, require the exact recipe prefix/current offered action,
   then submit using current revisions and that key. A synchronous Next is
   either fully recorded in `actions` or has made no state change.
4. A transport timeout/lost response first fetches a new snapshot and follows
   these same presence/state checks. An in-process byte-for-byte retry may use
   its retained original body/key. After script restart no old admitted request
   body is reconstructed or resent: accepted effects are skipped. If the
   snapshot cannot prove admission or non-admission, stop with that step.

This uses compact existing action receipts, deterministic attempts, and retained
evidence, rather than retaining duplicate request bodies or media. The API's
`actions` list is the chronological accepted `/next` history, including its
idempotencyKey and source/destination assignment IDs; it is not just lastAction.

Before its first mutation, the seeder validates the *entire* session: A has no
work; B–F are either empty or exact prefixes of the recipe; no teacher correction,
extra attempts/actions, unknown current assignment, or incompatible partial job
exists. Initial addition assignments and empty target finding records are not
progress. A valid in-flight seed job is awaited, not restarted. On subsequent
steps it rechecks identities/revisions so concurrent manual work produces a
visible conflict and stop. A complete matching seed is an idempotent no-op after
verification. Divergent user work is never overwritten, reset, or silently
accepted as synthetic class state. The operator can explicitly reset separately
before starting a new demonstration.

Use the processingMode advertised by Context. In fixture mode these exact work
and confirmed-text keys select the server's catalog. In live mode the same text
goes through the real selected assessment adapter; there is no private fixture
API or automatic fallback. Expectation mismatch, missing live access, timeout,
or uncertainty stops seeding at the accepted prefix, reports the learner/step,
and leaves evidence available. Re-running after a provider failure cannot silently
replace a failed terminal attempt under the old key; the operator decides whether
to reset/restart. The seed script makes no direct provider call and reads no key.

After all steps, derive expected counts from the specified per-learner accepted
judgments using the same *definitions*, and compare to the returned canonical
teacher snapshot. The expected result is addition assessed 3 (B/C/D), unassessed
3 (A/E/F), activeNeeds 1 (B); subtraction assessed 1 (D), unassessed 5,
activeNeeds 1 (D). These are assertions, never values to write into state. Verify
that E remains unverified, F has clarification, C retains its error/help and
cleared finding, D retains addition independent evidence and subtraction error,
and A is unsubmitted. Print processing mode, run/session IDs, completed steps,
computed/observed counts, and any mismatch without media or provider payloads.
The actual stage learner A then changes those same derived teacher counts
through ordinary accepted events. Reset must visibly return all counts/progress
to empty before another demonstration.
