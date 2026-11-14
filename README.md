# edu_hackthon

Workspace for the education hackathon. The [working concept](concepts_brief.md)
explores Grades 1–6 math learning with adaptive practice and teacher feedback.
The [design draft](design_draft.md) records the selected laptop prototype:
Node.js, plain browser JavaScript/SVG, current-run memory, and freehand math work
with an explanation. Two-digit addition/subtraction with regrouping is the
selected first lesson for Grade 2; the demo covers this one lesson.

## Development tracks and integration goal

- **Heather Bian — Product Marketing:** Discovery and student profile creation.
- **Yuan Shi — Software Engineer:** tutoring, math reasoning assessment, learning verification, and
  teacher feedback.
- **Combined demo:** create a student profile first, then use the student's
  personality and profile to customize teaching and interaction.

The two parts are developed separately. This repository now includes
[Learning Strength Discovery](app/README.md), an interactive learning-habit
profile for grades 5–8. Students review and correct their profile before it
produces a versioned [teaching handoff](app/INTEGRATION.md). The new combined
lesson preview consumes that profile and confirmed routine choices to change
the lesson opening, pacing, supports, and encouragement. On the combined local
server, **Start a new tutoring session** carries those choices into the chat and
clears the previous tutoring practice. Typed work and reviewed voice transcripts
then use the existing assessment/core path. The plan's separate sample math
sequence remains prepared. Freehand assessment, a complete classroom workflow,
and learning-effectiveness evaluation remain pending. The grade 5–8 Discovery
pilot is not validated for the grade 2 lesson or other age groups.

## Smart Pants submission and combined preview

The [three-slide submission kit](presentation/README.md) includes
[copy-ready text](presentation/SUBMISSION-COPY.txt), a screenshot, presenter
notes, and a repeatable 60-second walkthrough. The submission follows the shared
deck's exact three-slide format and three-minute limit.

Use Node.js 24 and this project's designated `.env` credential. Install both
locked dependency sets once, then start the combined server:

```sh
npm ci
npm ci --prefix app
npm run preview:combined
```

Open [Discovery on the combined server](http://127.0.0.1:3100/discovery/?demo=combined).
**Load Maya example → Back to my profile → Build my trial routine → Build my
lesson → Start a new tutoring session.** The final action explicitly clears
previous tutoring practice and opens chat with the chosen opening, pacing,
supports and encouragement. Voice starts off. Only nickname, grade and confirmed
arrangement cross the handoff; raw answers and report text do not go to the model.

The synthetic rehearsal stays in memory and leaves remembered Discovery visits
untouched. A Grade 5 example uses teacher-selected foundational regrouping review;
the profile does not select ability or math placement. The earlier static public
preview remains a prepared walkthrough and cannot call this local tutoring API.
See [the combined demo guide](presentation/COMBINED-DEMO.md) for the fresh-learner
route, reset steps and verification limits.

## Run Learning Strength Discovery

Use Node.js 24. From the repository root:

```sh
npm ci --prefix app
npm run discovery:dev
```

Open [the Discovery app](http://127.0.0.1:5173/). It needs no API key. The journey
includes short reflections, three interactive activities, an eight-area profile,
student corrections, and a chosen trial routine. Optional browser remembering
starts off. Save a JSON copy after profile review to obtain the teaching export.
See the [assessment materials](learning_strength_discovery/README.md).

```sh
npm run discovery:build
npm run discovery:test
npm run discovery:test:browser
```

The tutor commands and checkpoint below retain their existing scope.

The default page on port 3000 is an early prototype, not the approved tutor. It uses browser
speech recognition when available and allows transcript editing before submission.
It returns a generic follow-up, not a math assessment. It does not use OpenAI or
provide spoken responses. Use synthetic or adult role-play data only.

The separate [chat preview](presentation/README.md) on port 3100 now has a
playful chat, an answer field on the first task, and normal message sending
instead of a coach/check-sample button. It connects typed work and reviewed voice
transcripts to the learning core and OpenAI assessment. Voice mode uses an actual
OpenAI-generated reply and shows the same words in chat, never browser speech
synthesis. The combined route above uses the learner's reviewed Discovery
choices; the standalone chooser also retains two hand-authored sample profiles.

## Implementation checkpoint

The in-memory core implements the first phase of the
[verification contract](design_resolution/verification_contract.md).

- [Authored lesson](content/demo-lesson.json) and [learning rules](src/learning.mjs)
  cover both exchange targets, reviewed help, fresh checks, evidence validation,
  independent eligibility, review obligations, and chronological corrections.
- [Session state](src/session-state.mjs) owns immutable submitted work, transcript
  confirmation and image readback gates, idempotency, version-guarded jobs,
  bounded current-run records, teacher projections, and reset/shutdown cleanup.
- [PNG admission](src/png.mjs) checks the restricted drawing transport in the
  [media contract](design_resolution/media_contract.md).
- [Configuration](src/config.mjs) reads live credentials only from this project's
  `.env`. Explicit fixture configuration does not read credentials.

The [OpenAI adapter](src/assessment-adapter.mjs) implements the next phase's
completed-audio transcription and structured drawing/text assessment. Its
transport is injected in offline tests. It uses the official endpoints, rejects
responses over 256 KiB, validates exact evidence citations, and honors
cancellation/deadlines through response reading. It never falls back to fixtures
or retries a paid call automatically.

These modules are not connected to the legacy port-3000 page. The focused
port-3100 chat preview connects the core, transcription, assessment, and generated
speech, but it is not the complete normative HTTP API or classroom application.
The reviewed-profile handoff is connected. Freehand capture and the complete
separate teacher workflow remain pending. See the [preview verification notes](presentation/README.md#verification-record)
for the difference between offline fixture tests and actual live checks.

## Setup

Use Node.js 24 and install the locked development dependencies.

```sh
git clone https://github.com/yuansshi/edu_hackthon.git
cd edu_hackthon
npm ci
```

For collaboration, pull the latest `main`, make changes on a separate branch,
and open a pull request. Local `.env` credentials and generated probe audio are
excluded from Git; use `.env.example` for configuration names.

The tutoring core has no runtime dependencies. Discovery has its own locked
dependencies under `app/`. Playwright is a development-only dependency
for browser checks; the focused joined-flow test does not establish the full
normative classroom browser gate.

## Run the demo

For the chat/voice preview, with this project's `.env` credential:

```sh
npm run preview
```

Open http://127.0.0.1:3100. Recordings become editable chat transcripts; sending
the reviewed transcript starts assessment. Spoken replies are disclosed as
AI-generated. See the [walkthrough](presentation/README.md#start-the-chat-preview).

For the older generic prototype only:

```sh
npm start
```

Then open http://127.0.0.1:3000 in a browser.

## Demo flow

1. Open the tutor page.
2. Click “Try a sample”, or type an explanation in the transcript box. Browser
   speech recognition can also fill the box when supported.
3. Review the text and click “Coach me”. The page returns a generic question.
4. Click “Clear” to repeat. Restart the server after changing server code.

Example supported explanation:

> Seven ones plus eight ones is fifteen ones. Ten of those ones make a ten,
> leaving five ones. Two tens plus one ten plus that new ten is four tens.
> The answer is forty-five.

Expected result: “Can you show me what you did with the ones and tens?”

## Verification

```sh
npm run check
npm test
npm run test:preview:browser
npm run test:combined:browser
npm run discovery:test
npm run discovery:test:browser
npm run test:prototype
make check
```

`npm run check` syntax-checks an explicit manifest of existing application and
test modules. `npm test` covers the new core, PNG admission, and adapter with injected provider
responses and no network calls. `npm run test:prototype` separately protects the legacy page's
conservative responses and local HTTP boundaries. The preview handler tests are
in-process and open no listener. Its browser test intercepts all requests and
uses a fake microphone/transcription/playback; it requires installed Google
Chrome and makes no provider calls. `make check` checks only the
agent scaffold. `make app-check` and `make app-test` wrap the core npm commands.

The core tests use synthetic, injected observations. Passing them does not
establish that a model understands drawings/speech or that the prototype improves
learning. The complete classroom drawing/browser workflow remains pending.

Current joined-flow verification on 2026-11-13: the Discovery production build,
62 Discovery unit tests, nine Discovery browser tests, 147 Node tests, three
mocked chat browser tests, one real-HTTP Chrome joined flow, four legacy prototype
tests, 25 module syntax checks, and scaffold checks passed. The real-HTTP flow
uses fixture provider adapters and checks a fresh reviewed visit, confirmed
choices, imported preferences, typed work, a second isolated session, and reset.
Separately, the connected live OpenAI server assessed one synthetic typed
regrouping explanation successfully in the browser. This is a bounded live
observation, not a speech/handwriting accuracy or learning-gain evaluation.

Historical chat checkpoint on 2026-11-13: 141 native Node tests and the offline
Chrome chat/voice flow passed, 22 JavaScript modules passed syntax checks, and
the scaffold checker passed. Actual typed chat and generated MP3 reply playback
also passed on the live port-3100 preview. See the presentation notes for the
remaining recording-validation limits. The core tests exercise the synthetic learning
route, both correction counterfactuals before/after navigation, stale jobs,
recognition gates, and actual text/image/record capacity limits.

If npm cannot read its installed runtime under the active sandbox policy, the
project checks can be run directly without accessing that blocked npm file:

```sh
node --test test/png.test.mjs test/learning.test.mjs test/assessment-adapter.test.mjs test/preview.test.mjs
node --test test/preview-browser.test.mjs
node scripts/check.mjs
python3 .agents/scripts/check_setup.py
```

## Synthetic audio probe

The [probe](scripts/live-probe.mjs) requires Node.js 24 on macOS, `/usr/bin/say`,
`/usr/bin/afconvert`, and the installed voice named exactly
`Samantha (English (US))`. It generates and validates all six canonical WAVs in
a private temporary directory and removes its files on normal completion,
failure, or handled interruption.

```sh
npm run probe:audio -- --preflight-only
```

Preflight does not read `.env` or make provider calls. It checks all six WAVs,
not just tool availability. The live command below explicitly opts into paid
transcription/assessment calls with this project's `.env` credential.
See [.env.example](.env.example) for non-secret variable names/defaults.
Never replace an existing `.env` when copying the example.

```sh
npm run probe:audio
```

`make app-probe` runs the same opt-in live command.

The live probe runs supported addition, supported subtraction, omitted-ten,
changed-value, procedure-only, and guessed-answer cases in that order. It stops
on the first failed comparison or provider call and reports later cases as not
run. Each call has a 45-second deadline. There are no automatic retries.
It prints bounded JSON containing only synthetic transcripts and comparison
fields; it does not save audio or advance learning state. Only this synthetic
probe automatically confirms transcribed text. The application still requires
participant transcript and image readback review once wired.

### Phase 2 verification on 2026-11-13

- 132 offline core/media/adapter/probe-helper tests and four legacy prototype
  tests passed. All 15 listed JavaScript modules passed syntax checks, and
  `make check` passed.
- The actual macOS preflight generated, inspected, and cleaned all six WAVs
  with zero provider calls.
- The fourth live invocation passed all six cases in one sequential run using
  `gpt-transcribe` and `gpt-5.6-terra`, with 12 provider calls. Every transcript,
  candidate comparison, quotation, and source-scope gate passed.

The earlier failed invocations remain separate observations, not overwritten
successes. Run 1 stopped at the subtraction value-change candidate gate.
Run 2 stopped because the omitted-ten candidate supplied no exchange quantities.
Run 3 supplied those quantities but included a non-mathematical work-label
citation. The adapter instructions were clarified to require observed quantities
for explicit invalid exchanges and to exclude administrative labels as evidence.
The expected results and shared source/quantity validators were not weakened.
One isolated diagnostic assessment between runs 1 and 2 was not a six-case pass.
The bounded JSON reports for all four invocations are retained in the session.

These are synthetic cases from one installed voice, not an accuracy estimate.
That probe does not verify browser recordings or handwriting. The later chat
checkpoint separately exercised generated speech playback; the complete
student/teacher classroom browser journey remains pending.

## Agent setup

Start with [AGENTS.md](AGENTS.md) for project instructions and the
[setup guide](.agents/README.md) for rules, skills, settings, and hooks.

Validate the setup with Python 3.11+:

```sh
make check
```

Without Make:

```sh
python3 .agents/scripts/check_setup.py
```
