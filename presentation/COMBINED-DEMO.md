# Smart Pants — Discovery to a tailored lesson

The combined demo connects the published Discovery app to an initial lesson
preview. A learner answers questions about what helps them, reviews the profile,
and confirms an arrangement. That reviewed result shapes the lesson's opening,
supports, pacing, and encouragement. The mathematical goal and evidence rules
stay consistent.

The complete live tutoring experience is still in development. The current math
interaction uses prepared responses evaluated by the existing learning core.

## Run locally

Use Node.js 24. From the repository root:

```sh
npm ci --prefix app
npm --prefix app run dev -- --port 5175 --strictPort
```

Open [the combined rehearsal](http://127.0.0.1:5175/?demo=combined). No API key,
environment file, or external provider is needed. Stop the server with `Ctrl+C`.

The rehearsal controls load **Maya** or **Leo**, two clearly labeled synthetic
Grade 5 examples built through the real Discovery session model. Loading an
example opens an actual answered question. Unanswered areas stay unknown. The
rehearsal is memory-only and does not load, save, or clear a remembered visit.

For a new learner's ordinary journey, open the same app without
`?demo=combined`. Answer a few prompts or all 28; activities are optional. Then
open **My discoveries**, review the current profile, build and confirm a trial
routine, and choose **Build my lesson**. The ordinary and rehearsal paths use
the same handoff and lesson-design functions.

## The 60-second presentation demo

Keep Maya's route on screen. Use Leo and the longer math route for Q&A.

| Demo time | Action | Presenter line |
| --- | --- | --- |
| 0:00–0:10 | Choose **Load Maya example**. Point to the selected answers. | “These are editable synthetic answers in the real Discovery app.” |
| 0:10–0:25 | Open **My discoveries**. Inspect the profile and review its current version. | “The child can review the picture, disagree, and leave things unknown.” |
| 0:25–0:40 | Choose **Build my trial routine**. Show Maya's choices; confirm the arrangement if needed. | “The learner chooses visible steps, a steady start, and a short work block.” |
| 0:40–0:55 | Choose **Build my lesson**. Show the tailored opening and its rationale. | “The reviewed profile and confirmed choices now shape this lesson interaction.” |
| 0:55–1:00 | Point to the math goal and preview disclosure. | “We change the approach. The math still needs its own evidence.” |

The synthetic examples include prepared review and routine confirmation so the
short rehearsal can focus on the handoff. If an answer is changed, review and
confirmation must be completed again. Do not describe the prepared answers as
responses from a real child.

## Three-minute pitch structure

| Time | Subject |
| --- | --- |
| 0:00–0:15 | Smart Pants and the need for a useful starting interaction |
| 0:15–0:40 | Discovery answers and a learner-reviewed profile |
| 0:40–1:00 | How confirmed choices become an adjustable lesson design |
| 1:00–2:00 | Combined browser demo |
| 2:00–2:30 | Current integration and the live tutoring work still ahead |
| 2:30–2:50 | The next complete profile-to-learning journey |
| 2:50–3:00 | Window-switching and technical buffer |

If the browser fails, explain the saved demo screenshot and continue the pitch.
Do not spend the presentation debugging the local server.

## Q&A extensions

- Load Leo, inspect his actual prepared Discovery answers, and build his lesson.
  Compare its challenge-first opening with Maya's guided opening. The learner can
  return to change either arrangement; these are choices to try, not fixed types.
- Open the lesson rationale. Confirmed routine choices control the initial
  opening, pacing, and feedback. Questionnaire sources remain context, and
  disagreements and unknowns remain visible in the Discovery profile.
- Try the prepared missing-ten explanation for `27 + 18`. Show the authored
  exchange teaching and the fresh `36 + 27` example, then inspect the resulting
  teacher evidence. A correction with help differs from a fresh unaided check;
  later review still remains pending.
- Return to the routine and change its support or challenge choice. Confirm it
  again and reopen the lesson to show a new design from the current arrangement.

## What is connected

`App.tsx` checks current profile review and routine confirmation, then calls
`createTeachingProfile(currentSession)`. `designLesson` consumes that internal
snapshot. `LessonPreview` renders the design and the prepared mathematical
interaction. This is an actual client-side connection between the two workstreams,
not a pasted profile screenshot or a live model call.

Routine confirmation is a separate gate from revision equality. Editing routine
choices clears confirmation without incrementing the Discovery revision. Editing
an answer, activity, or correction also invalidates profile review. The lesson
must be opened from the current confirmed arrangement.

Discovery is an original grades 5–8 pilot. This demonstration uses a synthetic
Grade 5 learner and a presenter-selected foundational regrouping review. The
profile does not assign the learner a Grade 2 level or determine subject
readiness. It also does not certify a psychological type, attention capacity,
mathematical understanding, or learning gain.

## Verification to record

From the repository root:

```sh
npm run discovery:build
npm run discovery:test
npm run discovery:test:browser
npm run check
npm test
npm run test:prototype
make check
```

For browser checks, install Chromium once if needed:

```sh
npm exec --prefix app -- playwright install chromium
```

After running the commands, record the actual results for this slice. The
existing Discovery [verification record](../app/VERIFICATION.md) describes its
earlier published checkpoint; it is not evidence that the new consumer has passed.
Exercise these combined behaviors in the running app:

- A fresh learner can answer a few prompts, review the profile, confirm a routine,
  and open a lesson. Launch is unavailable before both gates are satisfied.
- Maya and Leo produce different arrangements while keeping the same selected
  mathematical goal and evidence requirements.
- The rationale separates confirmed choices, questionnaire context, and unknowns.
- Editing an answer invalidates review and confirmation. Editing routine choices
  invalidates confirmation even when the revision number is unchanged.
- The prepared math route distinguishes helped correction from fresh evidence;
  later review remains pending.
- Rehearsal examples do not touch remembered visits. **Start fresh** clears only
  the rehearsal visit, and keyboard controls and the small-screen layout remain
  usable.

No check in this list establishes the full live speech/drawing tutor, assessment
validity, or learning effectiveness.
