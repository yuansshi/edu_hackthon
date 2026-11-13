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
the lesson opening, pacing, supports, and encouragement. Math responses remain
prepared examples evaluated by the tutoring rules; live voice/drawing assessment
and full adaptive tutoring remain in development. The current grade 5–8 discovery
must not be presented as validated for the grade 2 lesson or other age groups.

## Smart Pants submission and combined preview

The [three-slide submission kit](presentation/README.md) includes
[copy-ready text](presentation/SUBMISSION-COPY.txt), a screenshot, presenter
notes, and a repeatable 60-second walkthrough. The submission follows the shared
deck's exact three-slide format and three-minute limit.

Run Discovery below and open `http://127.0.0.1:5173/?demo=combined` for explicit
synthetic examples. **Load Maya example → Back to my profile → Build my trial
routine → Build my lesson.** The rehearsal stays in memory and leaves remembered
Discovery visits untouched. A synthetic Grade 5 learner uses teacher-selected
foundational math review; the profile does not select ability or math placement.
See [the combined demo guide](presentation/COMBINED-DEMO.md) for scope and limits.

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

The existing page is an early prototype, not the approved tutor. It uses browser
speech recognition when available and allows transcript editing before submission.
It returns a generic follow-up, not a math assessment. It does not use OpenAI or
provide spoken responses. Use synthetic or adult role-play data only.

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

These modules are not connected to the existing prototype server or page yet.
The complete HTTP API, drawing workspace, teacher browser view, and speech output
remain pending. The legacy page is not a demonstration of the new core or
adapter. No full speech cascade or live browser journey is claimed.

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
for the later browser phase; a full tutor browser suite does not exist yet.

## Run the demo

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
npm run test:prototype
make check
```

`npm run check` syntax-checks an explicit manifest of existing application and
test modules. `npm test` covers the new core, PNG admission, and adapter with injected provider
responses and no network calls. `npm run test:prototype` separately protects the legacy page's
conservative responses and local HTTP boundaries. `make check` checks only the
agent scaffold. `make app-check` and `make app-test` wrap the core npm commands.

The core tests use synthetic, injected observations. Passing them does not
establish that a model understands drawings/speech or that the prototype improves
learning. HTTP and browser wiring follow the adapter/probe checkpoint.

Current checkpoint verified on 2026-11-13: 127 core/media/adapter tests and four
legacy prototype tests passed, 15 JavaScript modules passed syntax checks, and
`make check` passed. The core tests exercise the complete synthetic learning
route, both correction counterfactuals before/after navigation, stale jobs,
recognition gates, and actual text/image/record capacity limits.

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
