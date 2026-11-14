# Smart Pants — Discovery to tutoring

One local server now connects Discovery, the reviewed profile, the confirmed
routine, and the live-capable chat tutor. The learner chooses an arrangement;
the same authored opening, pacing, supports and encouragement carry into chat.
The mathematical goal and evidence rules stay separate from the profile.

## Run locally

Use Node.js 24 and the credential designated in this project's `.env`:

```sh
npm ci
npm ci --prefix app
npm run preview:combined
```

Open [the combined rehearsal](http://127.0.0.1:3100/discovery/?demo=combined).
The command builds Discovery before starting the same-origin port-3100 server.
Stop with `Ctrl+C`; restart after server changes and rebuild after app changes.
`npm run preview` alone starts the server with the existing Discovery build.
Do not overwrite an existing `.env`; consult `.env.example` for variable names.

For a fresh visit, omit `?demo=combined`. Answer some questions, open **My
discoveries**, review the current profile, build and confirm a trial routine, then
choose **Build my lesson**. On that plan choose **Start a new tutoring session**.
This explicit action clears previous tutoring practice and opens chat. Voice
starts off; assessment happens after the learner sends work. Recorded thinking
first becomes an editable transcript that must be reviewed and sent.

The rehearsal loads clearly labelled synthetic Grade 5 examples through the real
Discovery model. Unanswered areas remain unknown. It does not load, save, replace
or clear remembered Discovery visits. Synthetic shortcuts include prepared review
and confirmation; edits require those gates again. The normal fresh-learner path
requires both gates itself.

## The 60-second presentation route

| Time | Action | Presenter line |
| --- | --- | --- |
| 0:00–0:10 | **Load Maya example**; show the answered question. | “Editable synthetic answers in the real Discovery flow.” |
| 0:10–0:25 | **Back to my profile**; inspect the reviewed profile. | “The learner can disagree and keep unknowns visible.” |
| 0:25–0:40 | **Build my trial routine**, then **Build my lesson**. | “Confirmed choices produce an example-first opening and five-minute trial block.” |
| 0:40–0:55 | **Start a new tutoring session**. | “The chosen arrangement now carries into Pip’s chat.” |
| 0:55–1:00 | Point to the personalized greeting and plan. | “The interaction changes; math still requires its own evidence.” |

Do not promise provider latency within the minute. Sending work, recording voice,
the full math sequence and Leo’s contrasting plan are Q&A extensions. The saved
screenshot is from the earlier prepared profile-to-lesson preview; label it as
that fallback if the local server or network fails. Keep the official submission
at exactly three slides and finish the full pitch by 2:50.

## What crosses the handoff

The app requires current profile review and routine confirmation before launch.
A minimal `smart-pants-tutoring/v1` projection carries nickname, grade and confirmed
routine choices, with the source version/revision and review state. Raw answers,
report text and narrative suggestions do not go to the tutor or model.

The same-origin POST is bound to the current run/session and expected session
revision. Starting resets old tutoring practice and cancels active work. Stale
contexts and invalid versions/choices are rejected. The active plan exists only
for the current server session and clears on reset/restart.

Shared `src/teaching-plan.mjs` keeps the lesson preview and tutoring opening,
pacing, supports and encouragement consistent. Choices never determine ability,
placement, correctness, assistance or independent-task eligibility. Student text
is rendered as data, not used as tutor instructions.

## Scope and reset

The plan’s **sample** math sequence still uses prepared observations evaluated by
the real learning rules. The separate chat accepts actual typed work and reviewed
voice transcripts through the existing live-capable assessment path. The mode is
shown explicitly; a failed live call never falls back to prepared processing.
Voice is initially off and enabling it uses AI-generated replies.

**Reset demo** in chat clears current-run tutoring evidence and the active plan,
cancels processing/playback and returns to the chooser. Returning to Discovery
and starting a new tutoring session also explicitly clears the previous practice.
The Discovery review/confirmation rules remain independent from tutoring session
revision and math evidence.

The earlier `docs/combined-demo/` public static bundle remains a prepared preview.
It cannot call this local API; no new public live deployment is claimed. Standalone
Discovery on port 5173 can still show the plan and prepared sample without a key.

Discovery is an original grades 5–8 pilot. A synthetic Grade 5 learner uses a
teacher-selected foundational regrouping review. The profile does not assign a
Grade 2 level, psychological type or attention capacity. Freehand assessment and
the complete classroom teacher workflow remain pending. No learning gains or
permanent mastery are established.

## Verification

```sh
npm run discovery:build
npm run discovery:test
npm run discovery:test:browser
npm run check
npm test
npm run test:preview:browser
npm run test:combined:browser
npm run test:prototype
make check
```

The joined browser test uses real local HTTP and Chrome for a fresh Discovery
visit → review → confirmed routine → plan → new tutoring session → personalized
chat. Its provider is a fixture, so it does not establish live model quality or
microphone accuracy. The separate preview browser suite intercepts requests and
mocks recording, transcription and playback; it is not real HTTP E2E evidence.

Current joined-flow verification on 2026-11-13: the Discovery production build,
62 Discovery unit tests, nine Discovery browser tests, 147 Node tests, three
mocked chat browser tests, one real-HTTP Chrome joined flow, four legacy prototype
tests, 25 module syntax checks, and scaffold checks passed. The real-HTTP flow
uses fixture provider adapters and checks a fresh reviewed visit, confirmed
choices, imported preferences, typed work, a second isolated session, and reset.
Separately, the connected live OpenAI server assessed one synthetic typed
regrouping explanation successfully in the browser. This is a bounded live
observation, not a speech/handwriting accuracy or learning-gain evaluation.
