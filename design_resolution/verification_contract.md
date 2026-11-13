# Verification contract — DR-06, DR-07, and DR-08

Normative resolution dated 2026-11-13. This document makes the approved
verification plan executable; it is not an implementation or a new live result.
It preserves the selected Node 24/plain browser stack, OpenAI route, one-laptop
memory lifetime, media limits, recognition reviews, and learning rules. The
historical [audio probe](../regrouping_audio_probe.md) remains evidence only of
its six synthetic cases. The consolidated design review remains unchanged.

## DR-06 — reproducible synthetic audio probe

### Platform, prerequisites, and exact recipe

`scripts/live-probe.mjs` supports macOS for this probe. It uses Node built-ins,
the installed `/usr/bin/say` and `/usr/bin/afconvert`, and the exact installed
voice name `Samantha (English (US))`. Do not use the shorter `Samantha` alias,
choose another voice, download a voice, or replace synthesis with a fixture
silently. On 2026-11-13 the drafting operator verified that this exact voice and
the AIFF-to-WAV conversion run locally; that is tool availability evidence, not
evidence that the future probe script exists or passes.

Before reading a credential or making any provider request, the script must:

1. Require `process.platform === 'darwin'` and Node major version 24.
2. Check that both absolute tool paths are executable. Run
   `/usr/bin/say -v '?'` and require the exact voice-name field
   `Samantha (English (US))` in the returned inventory. Bound command output and
   give each synthesis/conversion process a 30-second timeout.
3. Parse and validate all six canonical cases below from
   `test/fixtures/regrouping-cases.json`, including their expected values.
4. Set the probe process's umask to `077`, create its own directory with
   `fs.mkdtemp` under `os.tmpdir()`, and ensure that directory is mode `0700`.
   Write a UTF-8 `<caseId>.txt` with the exact speech plus one final newline.
5. Generate **all six** WAVs and inspect every WAV before any paid call. For
   each case, invoke these argument arrays with `spawn`/`execFile`, without a
   shell or interpolated command text:

   ```text
   /usr/bin/say -v "Samantha (English (US))" -r 150 -o <private-dir>/<caseId>.aiff -f <private-dir>/<caseId>.txt
   /usr/bin/afconvert -f WAVE -d LEI16@16000 -c 1 <private-dir>/<caseId>.aiff <private-dir>/<caseId>.wav
   ```

   Require an ordinary RIFF/WAVE PCM file: format tag 1, one channel, sample
   rate 16,000 Hz, 16 bits per sample, block alignment 2, and byte rate 32,000.
   Walk bounded RIFF chunks with their padding, require one valid `fmt ` chunk
   and one nonempty `data` chunk, and reject truncation or contradictory sizes.
   Require an even data length, duration `dataBytes / 32,000` greater than zero
   and at most 60 seconds, and total file size at most 10 MiB. Do not infer the
   format from the `.wav` suffix.

Missing tools/voice, unsupported platform/runtime, a command failure/timeout, a
bad case file, or invalid WAV produces a bounded `probe_prerequisite_failed`
report, nonzero exit, and **zero provider calls**. Remove the private directory
in `finally`. There is no partial run with the cases that happened to synthesize.
`npm run probe:audio -- --preflight-only` performs the complete prerequisite,
generation, inspection, and cleanup sequence, then exits without reading `.env`
or making any network request. Missing project access must not be diagnosed by
printing environment contents.

The normal `npm run probe:audio` command explicitly opts into the paid probe.
After successful media preflight, the existing project-only configuration loader
requires the project `.env` key and the selected models. It must not fall back to
an inherited or other project's key. A missing configuration stops before the
first provider request. There are no automatic paid retries.

### Frozen speech and candidate expectations

Each case supplies its authored problem and target, no image, and a single
transcribed turn. Only this synthetic probe may automatically confirm the
returned transcript for assessment. The application still requires participant
transcript review. The probe does not submit learning events or clear a finding.

The exact speech strings, excluding the final file newline, are:

| Case ID | Problem/target | Exact speech |
| --- | --- | --- |
| `audio-add-supported` | `27 + 18`, addition exchange | Seven ones plus eight ones is fifteen ones. Ten of those ones make a ten, leaving five ones. Two tens plus one ten plus that new ten is four tens. The answer is forty-five. |
| `audio-sub-supported` | `42 - 17`, subtraction exchange | Forty-two is three tens and twelve ones. Twelve minus seven is five. Three tens minus one ten is two tens. The answer is twenty-five. |
| `audio-add-omitted-ten` | `27 + 18`, addition exchange | Seven plus eight is fifteen. I keep five ones and ignore the ten in fifteen. Two tens plus one ten is three tens. My answer is thirty-five. |
| `audio-sub-value-changed` | `42 - 17`, subtraction exchange | Forty-two becomes four tens and twelve ones. Twelve minus seven is five, and four tens minus one ten is three tens. My answer is thirty-five. |
| `audio-add-procedure` | `27 + 18`, addition exchange | I write five, carry one, and add the top numbers and that one. The answer is forty-five. |
| `audio-add-guess` | `27 + 18`, addition exchange | My answer is forty-five. I guessed. I do not know why. |

All six expect `recognitionStatus: usable`. Expected candidate fields and the
explicit historical move-ID mapping are:

| Case ID | `category` | `observedAnswer` / server-computed correctness | `exchangeEvidence` | Historical move → `teachingMoveId` |
| --- | --- | --- | --- | --- |
| `audio-add-supported` | `supported_exchange` | `45` / true | `supported` | `fresh_addition` → `fresh-addition-check` |
| `audio-sub-supported` | `supported_exchange` | `25` / true | `supported` | `fresh_subtraction` → `fresh-subtraction-check` |
| `audio-add-omitted-ten` | `addition_omitted_ten` | `35` / false | `contradicted` | `exchange_ones_for_ten` → `teach-addition-exchange` |
| `audio-sub-value-changed` | `subtraction_value_changed` | `35` / false | `contradicted` | `exchange_ten_for_ones` → `teach-subtraction-exchange` |
| `audio-add-procedure` | `procedure_without_exchange_explanation` | `45` / true | `not_established` | `ask_carried_value` → `ask-carried-value` |
| `audio-add-guess` | `correct_answer_without_reasoning` | `45` / true | `not_established` | `ask_strategy` → `ask-strategy` |

The two supported-exchange move expectations use the practice context: their
candidate proposes a fresh check. The learning controller separately owns action
eligibility, assistance, assignments, and findings. Historical fields
`canClearFinding` and `masteryEstablished` do not belong to the new candidate
schema; strict schema validation rejects them instead of expecting false values.

For `exchangeQuantities`, compare these exact canonical representations, then
also run the lesson's value/source predicates. Different valid representations
belong in other reviewed cases; they do not change this fixed baseline.

| Case ID | `before` | `after` |
| --- | --- | --- |
| `audio-add-supported` | `{tens: 3, ones: 15}` | `{tens: 4, ones: 5}` |
| `audio-sub-supported` | `{tens: 4, ones: 2}` | `{tens: 3, ones: 12}` |
| `audio-add-omitted-ten` | `{tens: 3, ones: 15}` | `{tens: 3, ones: 5}` |
| `audio-sub-value-changed` | `{tens: 4, ones: 2}` | `{tens: 4, ones: 12}` |
| `audio-add-procedure`, `audio-add-guess` | Entire `exchangeQuantities` is `null` | — |

Expected outcomes stay in the probe harness. Do not include the expected
category, answer, quantities, or case-specific move in either provider request.
The adapter receives the normal authored rubric and complete allowed action
catalog. Generate a turn ID using the same UUID format as the application and
validate returned source references against that case's confirmed transcript.

### Comparison, reporting, and cleanup

Compare transcripts with an explicit conservative normalization: Unicode NFKC;
lowercase; convert hyphens to spaces; replace these whole-word number phrases,
longest first, with their decimal form: `twenty five`, `thirty five`, `forty two`,
`forty five`, `fifteen`, `twelve`, `seven`, `eight`, `three`, `four`, `five`,
`ten`, `one`, `two`; remove remaining punctuation; collapse whitespace and trim.
Apply the same procedure to the canonical speech and returned transcript and
require equality. This allows `forty-five`/`45` and punctuation changes, including
the historical guess-case normalization. Other wording changes fail the baseline
for inspection; do not silently declare them equivalent.

For each assessment require the exact category, answer, exchange status,
recognition status, action, and quantities above; derive answer correctness from
the authored arithmetic. Require a valid strict candidate schema, bounded
nonempty reasoning summary, and one to ten source-evidence entries. All sources
must reference this case's one confirmed turn, every quote must be a nonempty
exact substring of the **actual** transcript, and no image source is permitted.
Run the normal source/quantity/action validator used for application candidates.
Do not compare model prose or require a preselected quote. No candidate may carry
finding/count/mastery mutations. With no image, there is no image readback gate;
the schema's neutral readback text is unused and must not be displayed as a
teaching response.

Run cases sequentially in table order through the real adapter: transcription,
comparison, then assessment only if transcription passes. Stop the paid run on
the first provider failure or comparison failure; report later cases as not run.
This avoids spending on known-invalid evidence and is not a successful six-case
probe. A pass requires all six in one invocation. Keep the original failed result
when a later manual rerun is recorded; a rerun is a separate observation.

Print a bounded JSON report to stdout with probe version, runtime/tool/voice
identifiers, per-case status (`passed`, `failed`, `not_run`), synthetic transcript
(at most 4,000 characters), expected/observed comparison fields, transcription
milliseconds, assessment milliseconds, and finite failure reasons. Use
`transcript_mismatch`, `candidate_mismatch`, `provider_failed`,
`provider_timeout`, or `probe_prerequisite_failed`; do not print raw provider
responses/errors, credentials, audio, or data URLs. Exit zero only when all six
pass, or when an explicitly requested preflight succeeds. The historical report
is not overwritten by this command.

Release each audio buffer after transcription and the adapter's ordinary
`finally` cleanup; keep no audio in retained state. In an outer `finally`, abort
active work, terminate owned child processes, and recursively remove only this
invocation's private directory, including `.txt`, `.aiff`, and `.wav` files.
Handle SIGINT/SIGTERM through the same idempotent cleanup before exit. A forced
OS kill cannot run `finally`; no claim of cleanup after SIGKILL is made.

The script exports this exact credential-free helper from
`scripts/live-probe.mjs`:

```text
prepareSyntheticAudio({cases, signal: AbortSignal})
  -> Promise<{voice: "Samantha (English (US))",
              audioByCaseId: Map<string, AudioAsset>,
              cleanup: () => Promise<void>}>
cases = [{caseId: string, speech: string}]
AudioAsset = {caseId, wavPath: absolute string, bytes: Buffer,
              mimeType: "audio/wav", durationMs: number}
```

Require exactly all six canonical IDs/strings in the table order; reject missing,
extra, duplicate, reordered, or changed cases before synthesis. Callers obtain
these pairs from the six canonical catalog rows (their caseId and first turn's
text). The helper performs the complete media preflight, generates all six
files, validates every WAV, and returns only after all succeed. durationMs is
1000*dataBytes/32000, not wall-clock synthesis time. It reads no credential and
makes no network request. The supplied signal terminates owned child processes
and fails generation through the same cleanup path. Generation failure cleans
its private directory before rejection; no partial handle escapes. Reject with
an Error named `ProbePrerequisiteError`, code `probe_prerequisite_failed`; callers
render the bounded local failure reason, never raw child output or credentials.

The caller owns the returned handle and must await cleanup in finally after all
provider use, fixture hash preparation, and browser capture contexts using those
files have ended. Assets are borrowed read-only until cleanup: do not mutate,
log, persist, or retain bytes/path references beyond that lifetime. cleanup is
idempotent, stops remaining owned processes, clears/releases its byte map, and
removes only its own private files. No returned path or buffer is valid after
cleanup. Browser tests may prepare one handle for the suite and select the
appropriate one of its six WAVs for each fresh context; close all such contexts
before cleanup. The normal probe and --preflight-only use this same helper and
always clean it. No checked-in WAV or second synthesis recipe is added.

## DR-07 — independent implementation phases

The following five phases replace the ambiguous implementation ordering. Every
new module contains its complete responsibility for that phase; do not add
temporary adapters, empty tests, placeholder pages, or imports of later files.
Only move to the next phase after its offline checkpoint passes. Missing access
blocks the live checks, not the distinction between an offline pass and a live
pass. The Phase 4 live gate must pass before Phase 5 demo polish or a live-ready
claim; a failure follows the approved simplify/rerun/escalate policy.

`scripts/check.mjs` has an explicit manifest of the JavaScript files existing at
the end of the current phase. It rejects a missing listed file and runs
`node --check` on every entry. Update this manifest when a phase adds files; do
not enumerate future paths and skip absent ones. `package.json` scripts and
Makefile application targets likewise appear only when their complete commands
exist. Preserve `make check` as the scaffold-only check throughout.

### Phase 1 — authored rules and bounded current-run state

Create exactly:

```text
package.json
package-lock.json
src/config.mjs
src/png.mjs
src/session-state.mjs
src/learning.mjs
content/demo-lesson.json
test/fixtures/regrouping-cases.json
test/png.test.mjs
test/learning.test.mjs
scripts/check.mjs
```

Modify `README.md`, `Makefile`, `AGENTS.md`, `.agents/rules/verification.md`, and
`.gitignore` only as needed for this completed phase and generated dependencies.
Describe the core as implemented and the HTTP/browser application as pending.
The PNG module uses the separately resolved Node-built-ins-only admission
contract; no image dependency is introduced.

Implement full authored actions/rubric, assistance and chronological judgment
reduction, bounded immutable state, versions/idempotency/reset, source/quantity
validation, coverage, check-pool/review scheduling, and PNG admission. Tests
exercise these observable rules in memory, including correction replay and PNG
corruption/decompression bounds. No provider or HTTP module is imported.

Introduce:

```text
npm run check  -> node scripts/check.mjs
npm test       -> node --test test/png.test.mjs test/learning.test.mjs
make app-check -> npm run check
make app-test  -> npm test
```

Checkpoint: install and lock the selected development-only Playwright version
with `npm install`, then run `npm run check`, `npm test`, and `make check`.
No later file is needed by these commands. Subsequent clean installs use
`npm ci`.

### Phase 2 — real interpretation adapter and repeatable audio probe

Create exactly:

```text
src/assessment-adapter.mjs
test/assessment-adapter.test.mjs
scripts/live-probe.mjs
.env.example
```

Modify `package.json`, `scripts/check.mjs`, `README.md`, `Makefile`, and
`.agents/rules/verification.md`. Implement the complete bounded live
transcribe/assess/cancel interface, strict candidate schema and validation,
injected provider transport, safe error translation, timeouts, audio cleanup,
and project-only configuration. Unit tests inject transport and never make paid
calls. The probe is the contract above, not an audio-response stub.

Append `test/assessment-adapter.test.mjs` to the exact `npm test` list. Introduce:

```text
npm run probe:audio -> node --use-system-ca scripts/live-probe.mjs
make app-probe     -> npm run probe:audio
```

Checkpoint: `npm run check`, `npm test`, `make check`, and
`npm run probe:audio -- --preflight-only`. Then, when the project credential is
available, run `npm run probe:audio` and retain its actual result. A missing
credential is an unrun live probe, not an offline failure or a synthetic pass.
The full live adapter exists before the browser capture phase.

### Phase 3 — complete HTTP API with injected prepared examples

Create exactly:

```text
server.mjs
test/fixture-adapter.mjs
test/server.test.mjs
```

Modify `package.json`, `scripts/check.mjs`, `README.md`, `AGENTS.md`, and
`.agents/rules/verification.md`. Implement all API operations and response/error
contracts, exact adapter injection, server-owned prepared-example matching,
Host/Origin/body limits, media lifetime, cancellation, shutdown, and current-run
snapshots. `createApp` accepts the complete injected adapter contract. Both the
real adapter and fixture adapter now exist; no dynamic missing-module fallback
is necessary. Until browser files exist, absent static paths return an ordinary
404; do not serve placeholder student/teacher pages.

Append `test/server.test.mjs` to `npm test`. Its injected tests start real
loopback HTTP listeners and prove the complete mutations, concurrency/failure
contracts, reset/restart, resource bounds, and safe errors without credentials.
Introduce `npm start -> node --use-system-ca server.mjs`; live is the default,
and explicit fixture mode never reads a key or calls a provider.

Checkpoint: `npm run check`, `npm test`, and `make check`. The server tests cover actual HTTP
startup and shutdown in fixture mode; no browser or seed file is required.

### Phase 4 — usable student/teacher browser loop and first live capture gate

Create exactly:

```text
public/student.html
public/student.js
public/math-workspace.js
public/teacher.html
public/teacher.js
public/api.js
public/styles.css
playwright.config.mjs
test/demo.spec.mjs
```

Modify `package.json`, `scripts/check.mjs`, `README.md`, `Makefile`,
`.agents/rules/verification.md`, and `.gitignore` for browser reports/artifacts
if needed. Implement the full two-tab input/review/teaching/finding loop,
accessible written route, PNG export, microphone negotiation and cleanup,
transcript correction, neutral image readback, teacher retractions, polling,
freshness/failure states, refresh, and reset. Authored worked visuals must be
reviewed here before their child-facing display. This is the first usable
browser capture unit, including the real adapter already completed in Phase 2.

Introduce:

```text
npm run test:browser -> playwright test --project=chromium
make app-browser    -> npm run test:browser
```

Checkpoint: `npm run check`, `npm test`, `make check`, `npx playwright install chromium`, then
`npm run test:browser`. The Chromium test uses one project/worker, its own fresh
explicit fixture server on loopback port 3100, generated fake-microphone WAVs,
and the fixture controls defined in the fixture contract. It proves the spoken
upload/review UI and non-speech route, browser drawing export and server admission,
teaching/fresh-check transitions, teacher updates/corrections, refresh, and reset.
It must not label simulated transcription as live speech understanding.

After those checks, run the actual browser/live gate defined below with
`ASSESSMENT_MODE=live npm start`. Its teacher evidence is read from the same
server-accepted event. No seeder, canned count, or prepared-example adapter is
needed to pass this gate. All browser files are complete before the check is
attempted; do not time a placeholder or defer the first live capture check until
the class demonstration is polished.

### Phase 5 — repeatable class seed and verified handoff

Create exactly `scripts/seed-demo.mjs`.

Modify `package.json`, `scripts/check.mjs`, `test/server.test.mjs`,
`test/demo.spec.mjs`, `README.md`, `Makefile`, `AGENTS.md`,
`.agents/rules/verification.md`, `design_draft.md`, `implementation_plan_notes.md`,
and `technical_plan_notes.md`. Record actual implementation/check evidence and
historical-document links without altering the frozen review or rewriting prior
experiment outcomes. Implement the fixed A–F recipe through public operations,
deterministic idempotency, and explicit mode labeling; do not reset existing work
silently or set counts directly. Extend the existing server/browser tests in
their existing files to exercise seed execution twice and inspect its accepted
snapshots; no new test path is required.

Introduce:

```text
npm run demo:seed -> node scripts/seed-demo.mjs
make demo-seed    -> npm run demo:seed
```

Final `npm test` is exactly:

```text
node --test test/png.test.mjs test/learning.test.mjs test/assessment-adapter.test.mjs test/server.test.mjs
```

Checkpoint: `npm run check`, `npm test`, `npm run test:browser`, and `make check`.
Rehearse the README's actual start → labeled seed → learner difficulty → teaching
→ fresh independent success → teacher count/evidence → reset sequence. **Do not
enter Phase 5 until the Phase 4 live gate has passed.** Missing access leaves
Phase 4's offline browser result recorded and its live gate pending; no seeder or
Phase 5 polish is implemented/rehearsed yet. An attempted failed gate follows the
simplify/rerun/escalate policy and also stops progression. If access is lost only
after a previously recorded passing gate, Phase 5 offline checks/fixture rehearsal
may proceed, but record that the current live rehearsal was not run. No fixture
result replaces a missing/failed gate. Do not rerun paid probes merely because
unrelated documentation changed.

The final syntax-check manifest contains every `.mjs`/`.js` file named in these
five phases, including the four Node test files, browser spec, fixture adapter,
Playwright configuration, and three scripts. JSON/HTML/CSS are exercised through
their normal loader or browser behavior, not passed to `node --check`.

## DR-08 — actual browser gate and the 30-second measurement

### Qualifying inputs and required outcomes

Use the presentation laptop, the target Chromium browser, the local live server,
an actual microphone, and consenting adult role-play with original synthetic
work. Draw/write directly in the browser; do not inject a PNG, upload the
synthetic WAV, use a fake microphone, or preselect an expected result. Keep both
student and teacher views visibly in live mode. No fixture fallback is allowed.

A qualifying short sample has one completed continuous spoken explanation of
**5 through 20 seconds**, inclusive, measured from the recorder's actual start
to stop events, plus bounded freehand work and an authored regrouping assignment.
Recording and drawing are completed before the timed Submit action. All normal
60-second/10-MiB audio and PNG admission limits still apply. A longer/shorter
sample may be useful exploratory evidence but does not satisfy this timed gate.

Exercise these four prescribed cases through normal server-issued assignments:

| Case | Adult's submitted work/explanation | Required observed decision |
| --- | --- | --- |
| Clear correct exchange | `27 + 18 = 45`; show and explain ten of fifteen ones becoming one ten, retaining five ones and all four tens | Usable supported exchange and its context-eligible authored next action; no claim of independent success if the assignment was assisted practice |
| Clear addition error | `27 + 18 = 35`; explicitly show/explain keeping five ones and dropping the ten | Supported `addition-omitted-ten` and reviewed addition teaching action |
| Clear subtraction error | `42 - 17 = 35`; explicitly show/explain four tens and twelve ones without reducing the tens | Supported `subtraction-value-changed` and reviewed subtraction teaching action |
| Ambiguous/conflicting evidence | Deliberately unclear marks or a visible exchange that contradicts the spoken account | Visible neutral clarification, with no disputed supported finding committed |

Use ordinary lesson operations to reach subtraction practice; any preceding
setup submissions remain labeled synthetic and are recorded separately. Do not
invent a target-selection endpoint, change an assignment's purpose, or inject a
judgment to reach the required case. Use separate learners or reset/rehearse as
needed to preserve the authored context. Record every gate attempt, not only the
fastest result. Transcript/image corrections and unexpected outcomes are part of
the record; an interpretation that changes a case's intended meaning fails its
case even if the UI responds quickly.

### Clock events and review-time accounting

Use one browser `performance.now()` time base for the following events and keep
their attempt ID, work/evidence version, and accepted snapshot revision together:

| Timestamp | Exact event |
| --- | --- |
| `t0` | The student's Submit handler begins, before PNG serialization, attempt admission, or audio upload; the completed recording and drawing are already ready |
| `tTranscriptReady` | The returned transcript is fully rendered and the confirm/edit controls are enabled |
| `tTranscriptConfirm` | The participant's confirm/correct handler begins, before its outgoing assessment request |
| `tImageReady` | The neutral image readback is fully rendered and its match/mismatch controls are enabled; candidate mathematical feedback remains withheld |
| `tImageConfirm` | The participant's match/mismatch handler begins, before its outgoing readback mutation |
| `tFinal` | The student view first renders the server-accepted reviewed teaching/next-step action or neutral `needs_clarification` decision for this current evidence version, with its committed snapshot revision |

`tFinal` cannot be a recording-stopped notice, upload success, transcription
screen, pending state, provisional assessment, or image readback screen. If the
participant rejects a readback, the final visible clarification must still come
from the accepted mismatch operation. If a live candidate needs clarification
without an image review, the final committed clarification is the end event and
there is no image-review pause to subtract.

Compute and report:

```text
wallMs = tFinal - t0
transcriptReviewMs = tTranscriptConfirm - tTranscriptReady
imageReviewMs = tImageConfirm - tImageReady              # only if reached
processingMs = wallMs - transcriptReviewMs - imageReviewMs
```

Only those explicit participant-review intervals are excluded from processing
time. Their full durations, including participant edits, are retained in wall
time. Keep serialization, upload, server work, both provider calls, request/poll
delay, rendering, and all request/correction submission overhead in
`processingMs`. Do not stop or pause the clock while a provider is working or
while an unexplained UI delay occurs. Missing/reordered timestamps invalidate a
measurement. A separate teaching/clarification turn after the displayed final
decision is a new cycle, not extra hidden review time in the measured cycle.

All three clear short cases must reach their required final decision with
`processingMs <= 30,000`. The ambiguous case must remain uncertain; record both
times for it as well. Report `processingMs`, `wallMs`, both participant-review
durations, actual recording duration, outcome/action, corrections, and any failed
attempt. The 45-second per-provider timeout remains a safety bound; it is not a
substitute for the 30-second demo criterion. This defines acceptance, not a
latency result or statistical performance claim.

After each final decision, observe the teacher's next successful scheduled
snapshot update and verify it contains the same accepted evidence/revision and
the corresponding counts or clarification flag. Record its observed update
delay separately from the student processing clock. Inspect the original drawing
and confirmed transcript in that view, and confirm there is no teacher audio
replay. A teacher display with canned/preseeded counts cannot satisfy this check.

Proceed with the full live demonstration only if the clear cases preserve their
intended meaning, the ambiguous case stays uncertain, recognition review exposes
no solution cue, the timing criterion passes, and teacher state derives from
those same accepted events. On capture/interpretation failure, simplify the
authored visual representation and rerun with a separately recorded result; if
it still fails, record the live multimodal path as unready and obtain an explicit
author decision for a fallback scope change. Passing synthetic audio or fixture
browser tests does not replace this gate. Passing this adult laptop gate also
does not establish child speech/drawing accuracy, classroom scale, learning
effectiveness, or retention.
