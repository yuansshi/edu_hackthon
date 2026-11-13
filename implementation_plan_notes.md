# Detailed Implementation — Node.js and browser JavaScript plan

Date: 2026-11-11. Audio experiment and lesson choice recorded 2026-11-12.
Completed plan integration: 2026-11-13.

The complete [Detailed Implementation Plan](design_draft.md#detailed-implementation-plan)
is now the canonical file, interface, parameter, and verification contract. The
author approved it on 2026-11-13 and requested finalization and consolidated
review. This note preserves the earlier planning alternatives; its draft labels
describe their earlier state rather than reopening approved choices.

Source: [approved design sections](design_draft.md),
[execution and memory decisions](technical_plan_notes.md), and
[review resolutions](review_resolution.md).

Overview & Goals, the logical Technical Plan, and Alternatives Considered are
approved. The author selected **Option A: Node.js with plain browser JavaScript
and SVG**, followed by **freehand drawing/writing with an explanation** as the
primary work input. The author then selected **addition/subtraction with two-digit
regrouping** as the first lesson. This note narrows the file plan to those choices.
The author also selected release of recorded audio after transcription, retaining
the transcript for the current run without teacher audio replay. The teacher view
uses periodic refresh about once per second. The author then selected the OpenAI
transcription-review-image/text route and original images retained in process
memory until reset/restart. Capture bounds, concrete interfaces, and lesson
criteria are proposed in the completed plan for approval. No application files
or dependencies have been created or installed.

The author subsequently requested an audio-only reasoning test first. A
[live synthetic-speech probe](audio_reasoning_probe.md) exercised transcription
and assessment of the stated reasoning. This narrows the immediate experiment;
it does not remove drawing from the broader design or approve the remaining
implementation choices.

## Audience — Grades 1–6 direction, proposed Grade 2 first lesson

The author selected elementary learners in **Grades 1–6** as the broader product
audience and suggested Grade 1 or 2 for this particular lesson. That product
direction does not expand the initial demonstration beyond the single selected
two-digit addition/subtraction lesson.

**Grade 2 is the proposed first-lesson target**, pending final lesson review.
This placement uses Common Core as a curriculum reference, not a universal rule
for every school or a claim about an individual learner. Grade 1 introduces tens
and ones and composing a ten in addition (`1.NBT.B.2`, `1.NBT.C.4`). Grade 2
includes adding and subtracting within 100 and explaining place-value strategies
(`2.NBT.B.5`, `2.NBT.B.9`). These support Grade 2 as the working placement for the
selected addition and subtraction exchange objectives.
[Grade 1 reference](https://www.thecorestandards.org/Math/Content/1/NBT/),
[Grade 2 reference](https://www.thecorestandards.org/Math/Content/2/NBT/).

Use demonstrated prerequisites alongside the grade context. A ready Grade 1
learner may attempt the lesson, and an older elementary learner may use it for
review. Do not infer readiness or a mathematical difficulty from grade alone.
The initial prototype does not include a full curriculum or automatic lesson
placement for all six grades.

### Draft readiness and language checks

* Ask “Show 34 as tens and ones. You can draw or write.” A valid representation
  that preserves 34 is acceptable; the point is the value of the quantities, not
  matching one exact sentence.
* Ask “Solve 23 + 14 and 46 - 12. Show or explain how you worked them out.” The
  expected results are 37 and 34; neither problem requires regrouping. Inspect
  the method as well as the answer before deciding which prerequisite needs help.
* Keep wording short and concrete: tens, ones, trading, and the number staying
  the same. Accept everyday language that expresses the relationship. Do not
  score reading fluency, formal vocabulary, or the length of an explanation as
  mathematical understanding.

These are proposed readiness prompts and content checks, not a validated
placement assessment or completed learner test. Unclear recognition still needs
clarification rather than a prerequisite-failure label.

## First lesson — addition/subtraction selected

The author selected addition/subtraction rather than the earlier proposed
equal-groups topic, then selected **two-digit regrouping** as the starting level.
The broader audience is Grades 1–6, with Grade 2 proposed for this first lesson.
The examples and teaching criteria below are draft content for that choice. The
earlier audio probe used equal groups. The subsequent
[regrouping probe](regrouping_audio_probe.md) completed six synthetic audio cases
with the expected classifications; it does not validate images or teaching effects.

### Proposed learning and evidence criteria

The selected concept is exchanging **ten ones for one ten**, or **one ten for ten
ones**, while preserving the number's value. Addition and subtraction are two
applications of that relationship. Assess answer accuracy, stated or shown
strategy, evidence about that exchange, and assistance separately.

Proposed first-content bounds are two-digit positive operands, addition totals
below 100, nonnegative subtraction results, and a single exchange between tens
and ones. The draft examples avoid exchanging through a zero. These bounds keep
the first demonstration focused; they remain part of the lesson draft awaiting
section approval. Prerequisites are reading two-digit numbers, distinguishing
tens and ones, and working with the single-digit quantities in the problem.

Accept decomposition, compensation, counting on or back, fingers, drawings, and
other mathematically valid methods. Do not require the column algorithm or the
words “carry” and “borrow.” A valid alternative can support solving a problem
while leaving the specific exchange concept unconfirmed; ask for additional
evidence about that target without marking the valid method wrong.

The immediate audio path analyzes what the person says. Present the recognized
words for confirmation or correction, then compare usable evidence with the
authored problem and criteria. A typed or visible explanation remains an
alternative to speech. An unclear transcript is not evidence of a math error.

| Illustrative problem and response | Evidence-supported interpretation | Next response |
| --- | --- | --- |
| `27 + 18 = 45`: “Seven ones plus eight ones is fifteen ones. Ten of those ones make a ten, leaving five ones. Two tens plus one ten plus that new ten is four tens.” | The answer and explanation account for all tens and ones and preserve the value during the exchange | Acknowledge that evidence, then use a fresh unaided addition problem |
| `42 - 17 = 25`: “Forty-two is three tens and twelve ones. Twelve minus seven is five; three tens minus one ten is two tens.” | The explanation represents the same starting quantity after exchanging a ten, then subtracts the corresponding quantities | Use a fresh unaided subtraction problem after any needed clarification |
| `27 + 18 = 35`: “Seven plus eight is fifteen. I keep five ones and ignore the ten in fifteen. Two tens plus one ten is three tens.” | The stated method discards a ten; this is evidence of a quantity-preservation difficulty in this attempt | Ask “What happened to all the value in your fifteen ones?” before choosing a reviewed teaching response |
| `42 - 17 = 35`: “Forty-two becomes four tens and twelve ones. Twelve minus seven is five and four tens minus one ten is three tens.” | The claimed starting representation has changed from 42 to 52; the explanation supports investigating the exchange | Ask “How can you check that your new tens and ones still make the starting number?” |
| `27 + 18 = 45`: “I wrote five, carried one, and added the top numbers and that one.” | The procedure and answer are consistent; the value represented by the carried one has not been explained | Ask “What does the carried one represent?” A procedural explanation alone is not a confirmed misconception |
| `27 + 18`: “Forty-five. I guessed.” | The answer is accurate; the explanation does not establish the reasoning | Ask “How could you check your answer?” and keep reasoning unverified |
| Audio could say “three tens” or “four tens,” or the learner disputes the transcript | Recognition uncertainty could change the mathematical interpretation | Confirm the recognized words or accept a typed/visible alternative before assigning a math finding |

For a wrong answer with a usable explanation, distinguish what was observed from
what remains uncertain. For example, a supported method with a conflicting final
number needs clarification; the mismatch alone does not prove an operation
misunderstanding. A correct answer with contradictory reasoning keeps both
observations visible; it does not automatically count as a supported explanation.
Do not infer hidden thoughts, ability, or confidence from voice.

For example, `27 + 20 - 2 = 45` is valid compensation, and counting upward from
17 to 42 in jumps of 3, 20, and 2 is a valid solution to `42 - 17`. Neither must
be rewritten as the column algorithm. If exchange evidence is still needed,
collect it with a neutral follow-up or another reviewed task. A follow-up that
supplies an exchange or a worked step counts as assistance.

### Proposed practice, independent check, and teacher feedback

1. Present one short authored problem and invite a spoken explanation, with the
   existing accessible alternative. The interface should make it clear which
   problem is being explained.
2. Confirm recognized evidence and ask a short neutral question when necessary.
   Readback during an independent check must not disclose the expected answer.
3. When usable evidence supports a specific difficulty, offer a reviewed teaching
   response tied to that evidence and record the help supplied.
4. Treat a correction after help as supported practice. Follow it with a fresh
   problem for the same targeted concept, using different quantities and no hint.
   The draft sequences below use different quantities and different answers for
   practice and the independent check; reusing a remembered answer is insufficient.
5. Clear an active finding only when the fresh unaided evidence meets the selected
   criteria for that target. A subtraction success alone cannot clear a separately
   supported addition difficulty. Keep the previous evidence and later-review
   state for this application run.
6. Show the teacher the target, supporting words or work, help supplied, current
   finding, and recognition uncertainty. Derive counts from distinct learners;
   neither unclear speech nor an unsupported correct guess creates a confirmed
   misconception by itself.

### Draft problem sequences for the selected level

| Target | Initial problem / supported practice | Fresh independent check | Later review in the same application run |
| --- | --- | --- | --- |
| Addition exchange | `27 + 18 = 45` | `36 + 27 = 63` | `48 + 26 = 74` |
| Subtraction exchange | `42 - 17 = 25` | `54 - 28 = 26` | `83 - 46 = 37` |

Each sequence changes both the quantities and the result. Every check still needs
supporting working or explanation rather than the answer alone. Later review is
distinct from immediate independent success and is not a retention study. Final
wording, alternative representations, and teaching moves remain subject to lesson
review.

An addition teaching response can show fifteen ones being exchanged for one ten
and five ones without changing the total. A subtraction teaching response can
show four tens and two ones exchanged for three tens and twelve ones. Those are
assisted examples; the fresh check must not replay their worked steps or supply
the new solution. The teacher view should say which exchange is supported by
the evidence, rather than label the learner globally as struggling with math.

### Starting-level alternatives — two-digit regrouping selected

| Choice | Example demands | Tradeoff and limit |
| --- | --- | --- |
| Within 10 — not selected | Small joining and taking-away quantities that can be shown with fingers or objects | Does not exercise the selected two-digit exchange target |
| Within 20, including crossing 10 — not selected | Problems such as `8 + 7` and `14 - 6`, accepting any valid strategy | Can expose decomposition, but is not the author's selected starting level |
| Two-digit regrouping — selected by the author | Problems such as `27 + 18` and `42 - 17` | Examines place-value reasoning; assumes foundations and needs more detailed evidence than a final answer alone |

The lesson-specific probe exercised both correct exchange explanations, the two
stated errors, a procedural-only answer, and an admitted guess. All six matched
the prewritten expectations. The full visual teaching and browser capture paths
remain unverified. This planning subsection is not approval of the completed
Detailed Implementation Plan.

## Audio lifetime — release after transcription selected

The author selected **release after transcription**. Keep the recognized words,
accepted evidence, and any transcript corrections in current-run memory. Teachers
can inspect those words but cannot replay the original audio. Reset and application
restart clear the transcripts along with the other current-run records.

The following lifecycle details implement that choice without adding audio
retention for retries or review:

| Event | Audio handling | Learning record and visible result |
| --- | --- | --- |
| Recording stops and the attempt is submitted | Stop microphone capture; keep only the transient browser/server data needed for the active transcription request | Show transcription pending; do not assess a pending recording as math evidence |
| Transcription succeeds | Release browser and server audio references and revoke any temporary playback URL; do not attach audio to the attempt or teacher response | Retain the recognized words and their attempt/version identity; offer transcript correction before using disputed text |
| Transcription fails or times out | Release the transient audio when the request terminates; do not save it for a later retry | Discard partial transcripts, show unavailable transcription, and allow a new recording or the non-speech route; do not create a math finding from the failure |
| The learner cancels, resets, or submits a replacement version | Stop capture, cancel the associated request where possible, and release its audio | Invalidate the superseded result; a late transcript cannot replace the current version or repopulate a reset demonstration |
| The learner corrects a transcript | No original audio remains for replay | Retain the recognized text and correction history for this run; assess the corrected evidence version and reject older pending assessments |
| The application stops or restarts | Retain no application audio files or stored recordings | Begin a fresh run without transcripts or restoration from disk/browser storage |

Cleanup must be safe to repeat and scoped to its own attempt; cleanup of an old
request cannot dispose a newer recording. The application must not write
recordings to disk, browser persistent storage, application-managed caches, logs,
or a provider file-storage workflow. A new attempt is required to record again
after release. Release means dropping application references and temporary
URLs; it is not a promise of immediate physical memory erasure or control over
the external transcription provider's handling. Exact capture limits and provider
handling remain to be specified.

Teacher feedback uses transcript excerpts, correction status, and the accepted
reasoning evidence. It has no audio URL, audio download, or replay control. A
disputed transcript stays uncertain until corrected or replaced; the model cannot
claim it checked the original recording after that recording was released.

The final implementation checks must exercise success, failure/timeout, cancel,
replacement, reset during transcription, transcript correction during assessment,
and restart. They must verify release in the browser and server, absence of audio
in retained records and teacher responses, preserved transcript evidence for the
current run, and rejection of late results. These are planned checks, not executed
application tests.

### Audio-lifetime alternatives considered

| Option | Mechanism | Tradeoff and failure condition |
| --- | --- | --- |
| Release after transcription — selected by the author | Release the application's recording after transcription or a terminal failure/cancellation; retain the transcript and accepted evidence for the current run | The teacher cannot replay the original audio; a disputed transcript may require correction or a new recording |
| Retain during the current run — not selected | Keep the recording in process memory alongside its attempt until reset or application restart; allow review against the transcript | Adds replay and recognition review, but retains audio longer than the selected lifetime and consumes memory across attempts |

## Image lifetime — current-run originals selected

The author selected retention of original drawing images in process memory until
reset or restart so teachers can reopen them. Keep each frozen work version tied
to its evidence history; do not replace an older image when the child edits a new
version. Enforce the plan's byte and attempt limits by rejecting a new submission
without silently evicting earlier evidence. Reset/restart releases those images,
and an old evidence URL must not retrieve an image from the ended session.

The unselected alternative released images after interpretation and retained only
descriptions/transcripts. The author chose original-work review, accepting that
memory limits may stop new submissions. No disk image archive or browser
persistent image store is part of this choice.

## Teacher updates — periodic refresh selected

The author selected **refresh about once per second**. The teacher tab reads the
current snapshot from the same local application used by the student tab. This
is an intended foreground refresh cadence, not a promise that transcription,
assessment, or end-to-end feedback finishes within one second.

### Polling and snapshot contract

* Request a complete teacher snapshot immediately when the view opens. Schedule
  the next request about one second after the previous request finishes. Keep
  one request active at a time and give each request a finite timeout so a stalled
  response cannot stop refreshes indefinitely. The timeout value belongs in the
  final detailed configuration.
* A snapshot carries the application run, demonstration session, server revision,
  and the current counts, findings, evidence, coverage, and pending/unknown states.
  Apply the snapshot as one view rather than combining counts from one revision
  with evidence from another. The server remains responsible for distinct-learner
  counts.
* Revisions increase when teacher-visible state changes within the current run
  and session. Ignore a snapshot older than the newest accepted revision. An
  unchanged snapshot can keep the same revision and confirm connectivity.
  Responses must not be served from an old HTTP/browser cache.
* Keep the last valid snapshot visible during a request or a failed refresh.
  Show updating or update failure and the last successful synchronization time.
  Keep that time separate from the time of the learner evidence; a successful
  poll does not make an old observation newly assessed. Failure must not turn
  existing counts into zero or clear findings.
* Reset, application restart, and selecting another demonstration invalidate the
  old polling context and pending teacher actions. Clear the previous context's
  cards when the authoritative context changes. Cancel obsolete requests where
  possible; a response begun in the old context cannot repopulate the new one.
  A normal tab refresh reconnects to the still-running session.
* A successful teacher correction returns the accepted snapshot/revision and uses
  the same ordering rule as polls. A pre-correction poll cannot undo it. Reject
  corrections for an obsolete run/session/finding version, and show failed or
  pending correction status without claiming the correction was accepted.
* Background tabs may refresh less often. On return, request the current state
  promptly without overlapping an existing request or replaying missed intervals.
  Keep one timer owned by the active teacher view and dispose it when that view
  ends or changes context.

Planned verification covers a slow snapshot request, failed requests and recovery,
an older revision arriving after a teacher correction, reset/restart during a
request, tab refresh, and returning from a background tab. Check that stale data
is labelled, counts and evidence stay consistent, and requests do not accumulate.
No application polling or response-time measurement has run yet.

### Update alternatives considered

| Option | Mechanism | Tradeoff and failure condition |
| --- | --- | --- |
| Periodic refresh — selected by the author | The teacher tab requests the current snapshot about once a second, with one request active at a time | The view can lag until the next successful request; background-tab throttling and failed requests must remain visible |
| Server-pushed updates — not selected | The teacher tab opens a server-sent-event connection; the server announces accepted changes and the tab refreshes its view | Needs reconnect, resynchronization, and connection cleanup beyond the selected periodic request mechanism |

## Fixed requirements for the selected approach

* Serve student and teacher browser views from the presentation laptop.
* Keep attempts, help, findings, corrections, and review status in the running
  application; reset and application restart clear those records.
* Reconnect a refreshed tab without duplicating a learner. Reject superseded
  interpretation results and preserve newer teacher corrections.
* Clarify conflicting evidence before assigning the disputed misconception.
* Clear an established finding after a fresh unaided success meeting reviewed
  lesson criteria; retain its earlier evidence for the current run.
* Use original/synthetic demonstration material, with a non-speech input route.
* Distinguish fixtures from actual model processing and keep missing interpretation
  visible.

## Interface stack decision — Option A selected

The author approved approach 1, selecting Node.js with plain browser JavaScript
and SVG. The comparison below preserves the alternatives presented. Selecting
this stack did not itself choose a provider or input mode. The author subsequently
selected freehand work, periodic teacher refresh, and the OpenAI interpretation
route. The complete plan records their concrete parameters for approval.

### Option A — selected: Node.js with plain browser JavaScript and SVG

**Mechanism:** serve student and teacher HTML pages, browser JavaScript modules,
and CSS from the local application. Render the mathematical work surface with SVG
and browser controls. Adapt selected authored questions and diagram logic from
Blitz without adding a React frontend compilation step.

**Tradeoffs:** the interface behavior and synchronization must be kept explicit
in browser modules. Existing math and SVG code are reuse candidates, but their
state and storage behavior require review rather than wholesale copying.

**Fails when:** increasingly complex interface state is spread across imperative
DOM updates and starts showing a different attempt or finding from the server's
current record. Behavior checks across both tabs must expose that drift.

### Option B — not selected: Node.js with React, TypeScript, and Vite

**Mechanism:** implement student, teacher, and work-surface components in a React
frontend, add TypeScript checks, and use Vite for frontend development/build output.
Serve the resulting interface with the local Node application. The backend can
remain JavaScript; a typed frontend does not require rewriting every reused module.

**Tradeoffs:** introduces frontend dependencies, TypeScript configuration, and a
build process. Component props and state can be checked by TypeScript, but JSON
received from the server still needs runtime validation. Reused SVG or question
code may need adapters to fit the component lifecycle.

**Fails when:** build/configuration or dependency compatibility prevents a repeatable
start on the presentation laptop, or client types are treated as proof of unchecked
runtime input. The final plan would need explicit type-check and build verification.

React documents its TypeScript setup and component typing, and Vite documents its
development server and build workflow.
[React TypeScript](https://react.dev/learn/typescript),
[Vite guide](https://vite.dev/guide/).

## Prospective file inventory

These were the planning candidates for the selected Node/plain-JavaScript
approach. The completed plan now contains the exhaustive inventory with exact
changes and checks. No files in the candidate inventory below have been created.
All listed paths are relative to this project.

### Node application and behavior files

| Prospective file | Intended purpose |
| --- | --- |
| `./package.json`, `./package-lock.json` | Declare the selected runtime, dependencies, reproducible installation, and run/check/test scripts |
| `./server.mjs` | Start the local application and expose the selected student/teacher assets and session, submission, correction, and reset operations |
| `./src/session-state.mjs` | Own current-run session/learner records, submitted versions, corrections, reset invalidation, and teacher aggregates |
| `./src/learning.mjs` | Apply reviewed criteria, clarification and teaching transitions, assistance eligibility, independent checks, and finding clearing/reopening |
| `./src/assessment-adapter.mjs` | Interpret a submitted evidence bundle through the eventual provider boundary and return observations or uncertainty |
| `./content/demo-lesson.json` | Hold the eventual selected lesson's problems, expected quantities, criteria, teaching moves, and fresh checks; exact content representation remains subject to the final plan |
| `./test/learning.test.mjs` | Protect the observable learning and finding-lifecycle behaviors with reviewed cases |
| `./test/server.test.mjs` | Exercise duplicate/stale submissions, reset, corrections, and delayed interpretation using injected fixtures |
| `./test/demo.spec.mjs`, `./playwright.config.mjs` | Verify the student/teacher journey in browser tabs, including refresh and correction behavior, if this browser-test approach is adopted |
| `./README.md`, `./Makefile` | Add the actual install/start/test and reset procedure while preserving the existing agent scaffold check |
| `./.gitignore` | Add only generated artifacts introduced by the selected tools; existing Node/build exclusions may already suffice |

The final list includes direct OpenAI calls, project-only configuration,
`.env.example`, offline fixtures, and repeatable probes. It does not require a
runtime provider SDK; see the canonical inventory rather than treating this older
candidate table as complete.

### Selected browser frontend inventory

| Prospective file | Intended purpose |
| --- | --- |
| `./public/student.html`, `./public/teacher.html` | The two demonstration views |
| `./public/student.js`, `./public/teacher.js` | Student interaction and teacher presentation |
| `./public/math-workspace.js` | Freehand drawing/writing controls, work revisions, submitted image preparation, and accessible alternative input |
| `./public/api.js` | HTTP communication and session/version handling, including the selected teacher snapshot refresh and its request/timer lifecycle |
| `./public/styles.css` | Visual hierarchy, responsive layout, focus states, and shared styles |

No React components, TypeScript configuration, or Vite configuration are planned
under the selected stack. The historical Option B description above records its
tradeoffs without adding those files to the implementation inventory.

## Evidence and state contracts to preserve

The final interfaces must carry enough information to connect each submission to
its current demonstration, learner, lesson, problem, and work version. They also
need the assistance already supplied and the evidence used for interpretation.
Teacher updates use the selected periodic HTTP snapshot requests. Exact request
payloads, operation paths, and student assessment-response handling are specified
in the completed implementation section.

Interpretation returns observations tied to that submitted work, a possible
reviewed teaching move, or a clarification need. It cannot change the authored
quantities or update a teacher count directly. A late result must be checked against
the current session, submitted version, and newer teacher corrections before use.

The application derives current findings and distinct-learner counts from accepted
records. A hinted correction stays supported; a fresh unaided success can clear
the active finding while retaining the current-run history. Unclear follow-up
evidence cannot clear a separately supported finding.

## Mathematical work input — freehand selected

The author selected Input B: draw or write freely and explain. Both routes were
presented with a spoken explanation and accessible non-speech alternative. This
choice alone did not select a speech/model provider; the author later selected
OpenAI. The later topic and level choice
is two-digit addition/subtraction with regrouping, with Grade 2 now proposed as
the first-lesson target within the Grades 1–6 product audience.
Input A remains a comparison rather than the primary prototype activity.

### Input A — not selected as the primary activity: movable objects plus explanation

**Mechanism:** the learner arranges objects in the browser work area and submits
the resulting visual work with a spoken explanation. The application has the
object positions and quantities; the interpretation path also receives the visual
snapshot and explanation. Accessible controls provide an alternative to dragging
or speaking.

**Tradeoffs:** actions produce quantities that can be checked against authored
lesson facts, but the activity constrains how the learner shows their work. A
valid arrangement alone still cannot establish the reasoning; a follow-up or fresh
problem may be needed.

**Fails when:** the chosen concept needs expressions or constructions the provided
objects cannot express, or the interface lets the learner complete a pattern
without understanding the mathematical relationship. Freehand assessment would
remain outside the first implementation if this input scope is selected.

### Input B — selected: freehand mathematical drawing plus an explanation

**Mechanism:** the learner writes or draws in a browser work area and submits that
image with a spoken explanation. Interpretation must identify the relevant marks,
quantities, and explanation; the learner can clarify what was recognized. A typed
or otherwise accessible path must remain available.

**Tradeoffs:** allows more ways to express working, while adding drawing controls,
recognition ambiguity, and reviewed examples of uncertain input. The application
cannot obtain reliable mathematical quantities solely by counting pointer strokes.

**Fails when:** writing or diagrams cannot be interpreted adequately for the chosen
lesson, or recognition errors produce inappropriate teaching. Such cases must
stay unresolved rather than become confirmed misconceptions.

The freehand choice determines the work-area implementation, evidence bundle,
lesson cases, and interpretation acceptance checks. The earlier recommendation to
defer drawing assessment (review action A3) is superseded by this explicit author
choice, not recorded as a technical fix or a proven recognition capability.

For either approach, the visual snapshot and explanation must refer to the same
submitted attempt and work version. A structured-object view needs click/tap
placement as well as keyboard support; dragging alone is insufficient for the
accessible interaction route.
[W3C dragging guidance](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).

If the implementation uses canvas image export, the browser standard supports
PNG serialization of an origin-clean canvas. Cross-origin content and failed
serialization require explicit handling. The actual SVG-to-image or freehand
capture path still needs verification in the intended browser; it was not run
during this design work.
[WHATWG canvas export](https://html.spec.whatwg.org/multipage/canvas.html#dom-canvas-toblob-dev).

## Selected freehand submission and assessment flow

1. Show the authored prompt and a large writing/drawing area. Provide pen, erase,
   undo, and clear-work controls. Clearing the board is separate from resetting
   the demonstration's progress.
2. Let the child add a spoken explanation or use the accessible non-speech route.
   The alternative must express the relevant relationship or working; a typed
   total alone may not supply the required reasoning evidence.
3. On submission, bind a frozen image and the accompanying explanation to one
   attempt and work version. Editing afterward creates a new version rather
   than changing the image attached to the earlier attempt.
4. Let the child inspect or clarify what the system recognized. Recognition
   readback describes their submitted marks and explanation; it does not reveal
   the expected solution during an independent check.
5. Compare usable observations with the reviewed lesson criteria. Unreadable marks,
   uncertain quantities, or disagreement with the explanation prompt clarification.
   Stroke counts and drawing quality do not establish the mathematical answer.
6. Select a reviewed teaching move or fresh independent check. Keep assistance
   recorded and update the teacher card from the accepted evidence and finding.

For example, a child might draw three groups of four dots, write an addition of
three and four, and explain that addition aloud. Treat the grouping and written
step as conflicting evidence to investigate. A neutral question about what their
groups represent helps clarify the reasoning. If the image itself is ambiguous,
clarify the captured work first. This is an earlier equal-groups illustration,
not content for the subsequently selected addition/subtraction lesson or a tested
image-model result. The final plan must author matching visual/explanation cases
for the now-selected regrouping level.

The completed plan specifies PNG capture, browser audio format negotiation,
capture limits, the selected image lifetime, and OpenAI endpoint handling.
Local audio release after transcription is selected. There is no persistent raw
media archive or provider file-storage workflow.

## Interpretation provider routes — OpenAI selected

The author selected OpenAI transcription, transcript review, then drawing/text
assessment behind the local Node application. Use the tested `gpt-transcribe` and
`gpt-5.6-terra` defaults without a runtime SDK. Image interpretation is still a
live implementation gate. The alternatives below preserve the routes presented.

### Provider A — not selected: Gemini image/audio interpretation

**Mechanism:** submit the drawing image, recorded explanation, and lesson context
as image/audio/text inputs through a compatible Gemini model and endpoint.
Official documentation describes image input, audio input, and mixed input files.
[Image input](https://aistudio.google.com/docs/image-understanding),
[audio input](https://aistudio.google.com/docs/audio),
[mixed files](https://aistudio.google.com/docs/files).

**Tradeoffs:** this route can interpret the drawing and recorded explanation
together without a separate transcription service. It still needs a visible
recognized-work/explanation result and a way to clarify it. Inline data and uploaded
files have different constraints and lifecycles; the final plan must choose a
permitted path and verify the selected model's supported media.

**Fails when:** project/model access is unavailable, media exceeds supported limits,
or the drawing/audio cannot be interpreted adequately. Those cases remain unresolved
rather than producing a confirmed misconception.

### Provider B — selected by the author: OpenAI transcription and image/text interpretation

**Mechanism:** transcribe a completed audio recording, review/correct the transcript,
then submit its confirmed version, drawing image, and lesson context to Responses.
This is a documented submit-and-review route, rather than a claim that all OpenAI
audio integrations require this sequence.
[Speech transcription](https://developers.openai.com/api/docs/guides/speech-to-text),
[image understanding](https://developers.openai.com/api/docs/guides/images-vision).

**Tradeoffs:** the intermediate transcript is available for correction before it
is used with the image. There are separate transcription and interpretation failure
boundaries. Vision may struggle with small or rotated text, spatial relationships,
and approximate counts, so recognition must remain inspectable and uncertain work
must be clarified.

**Fails when:** API/model access is unavailable, transcription changes the child's
meaning, or image interpretation is insufficient for the lesson. A successful API
response alone cannot verify the child's mathematical understanding.

Both routes need project-designated backend authentication and verification of
actual model access and media limits. The choice does not authorize retrieving a
personal API key or establish production child-deployment eligibility. OpenAI
authentication passed, and live transcription plus transcript reasoning completed
for the earlier equal-groups samples and six regrouping samples. See the
[regrouping probe](regrouping_audio_probe.md) for the actual inputs, outputs, and
limits. No packages were installed; image recognition, real learner speech, and
end-to-end delay remain unevaluated. Provider data handling and `store: false`
are described in the completed plan without claiming account-level Zero Data
Retention was verified.
[Gemini API access](https://aistudio.google.com/docs/api-key),
[OpenAI API setup](https://developers.openai.com/api/docs/quickstart).

## Selective reuse constraints

The source inventory confirmed authored equal-group content, quantities, hints,
and assistance flags in Blitz `quests.mjs`, static SVG in `public/blitz-state.js`,
and pond-specific assessment patterns in `lesson.mjs`. These support selective
adaptation of interaction and assistance patterns. The selected addition/subtraction
lesson and its reasoning criteria require their own authored content; the older
equal-groups questions are not the selected lesson.

The old server includes adult-session and provider-specific behavior plus disk job
metadata writes. The browser code persists best-star progress. Copying those
behaviors unchanged would conflict with the selected current-run-only progress
scope. Retain the mathematics and relevant patterns while designing the new
application's state lifetime explicitly. This source inspection does not establish
that the old application or any provider currently runs.

## Verification cases the final plan must cover

1. For two-digit regrouping, a stated value-preservation error, a computation
   slip, valid reasoning, procedural-only evidence, and insufficient evidence lead
   to different reviewed next actions when the submitted explanation supports
   those distinctions. A wrong answer alone does not establish the difficulty.
2. Conflicting visual/spoken evidence prompts clarification; weak speech alone
   does not become a math failure.
   Include unreadable writing, ambiguous groups, missing explanation, and a mismatch
   between the interpreted marks and what the child intended. Recognition readback
   must not disclose the expected answer in an independent check.
3. A hinted correction leaves an independent check pending. A fresh unaided
   success clears the active finding once and preserves earlier work in memory.
4. Teacher retraction preserves correction history. Unclear new work cannot clear
   a separately supported finding.
5. Duplicate submissions and old results cannot double-count learners, undo a
   correction, or overwrite a newer submitted version.
6. Tab refresh preserves the running session. Explicit reset and application
   restart clear its state; an old response cannot repopulate a fresh run.
7. A teacher card is derived from learner records and exposes assessed coverage,
   uncertainty, and current rather than obsolete teaching needs.
8. Model unavailability remains visible. A final live demo must process actual
   visual work and explanation; fixture-driven interface tests do not prove that path.

These remain application verification requirements. The separate
[audio probe](audio_reasoning_probe.md) exercises part of the interpretation
boundary; it does not verify these application journeys. Exact commands, fixtures,
interface contracts, and pass criteria will be specified once the implementation
choices are closed.

## Runtime observation and references

Read-only inspection found Node.js `v24.22.1` and npm `11.19.1` on this laptop.
That establishes runtime presence, not an application build or model capability.
No packages were installed and no application was run.

Node 24 documents built-in HTTP serving and its test runner, which are relevant
to the proposed local backend and behavior checks.
[Node 24 HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html),
[Node 24 test runner](https://nodejs.org/docs/latest-v24.x/api/test.html).

## Completed plan and remaining approval

The stack, freehand input, regrouping topic, audio release, current-run images,
OpenAI route, and periodic teacher refresh are selected. The completed plan gives
one file-by-file list, concrete operations, error cases, limits, lesson criteria,
and verification commands. Review that section, including the proposed Grade 2
wording and parameters, before finalization and consolidated EGM review. The
unselected alternatives above remain historical choices rather than planned work.
