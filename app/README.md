# Learning Strength Discovery app

Interactive learning-habit discovery for grades 5–8. Students answer short prompts, choose activities, review eight profile areas, add corrections, and choose a trial routine. A combined lesson preview uses that reviewed profile and confirmed routine to tailor an example math interaction.

## Run locally

Use Node.js 24 and npm. From the repository root:

```sh
npm ci --prefix app
npm run discovery:dev
```

Open [Learning Strength Discovery](http://127.0.0.1:5173/). This app runs independently of the existing tutor on port 3000.

```sh
npm run discovery:build
npm run discovery:test
npm run discovery:test:browser
```

The production build is `app/dist`. `npm --prefix app run preview` serves the build locally. No API key or environment file is required.

For the browser checks, install Chromium once with `npm exec --prefix app -- playwright install chromium`. The suite starts its own local server on port 5174. See [verification results](VERIFICATION.md) for the exercised paths and limits.

## Demonstrate the journey

1. Start discovery. Nickname and grade are optional. Remembering starts off.
2. Answer a few prompts or all 28. Skip, depends, and not sure remain distinct. Go back to change an answer.
3. Choose activities in any order: visible-rule sorting or a two-step code, a supplies-guide design with reorder controls, and matching pairs with optional row-by-row support.
4. Open My discoveries. Inspect a card's sources, add context or disagreement, or revisit an answer.
5. Review the current profile, then use its personalized ideas to choose daily available time, focus blocks and pauses, encouragement, support, and preferred stretch. Open “Why this idea?” for the response behind a suggestion. Times are editable trial choices.
6. Confirm the arrangement, then choose **Build my lesson**. Inspect the opening, pacing, supports, and reasons before trying the prepared math example. Return to the routine to change the arrangement.
7. Save a text or JSON copy. JSON contains a teaching profile only after current-profile review. An accepted routine appears only after confirmation.
8. Use Settings to clear the current visit and saved copy before repeating.

Use synthetic role-play input for the demo. The [assessment kit](../learning_strength_discovery/README.md) contains the source prompts, activity cards, interpretation guide, and evidence notes. [INTEGRATION.md](INTEGRATION.md) describes the versioned teaching handoff.

## Rehearse the combined demo

From the repository root:

```sh
npm --prefix app run dev -- --port 5175 --strictPort
```

Open [the combined rehearsal](http://127.0.0.1:5175/?demo=combined). **Load Maya example** and **Load Leo example** load editable synthetic Grade 5 sessions through the real Discovery model and open an answered question. Unanswered areas remain unknown. This mode stays in memory and does not load, save, or clear a remembered visit.

Use **My discoveries** to inspect the current profile, then **Build my trial routine** to inspect and confirm the arrangement before **Build my lesson**. The ordinary path starts with real questionnaire answers and uses the same review and confirmation gates. The prepared examples are a rehearsal shortcut, not completed assessments from real children.

The [three-minute presenter walkthrough](../presentation/COMBINED-DEMO.md) focuses its 60-second browser segment on Discovery → profile → tailored lesson. The longer math and teacher-evidence sequence is available for Q&A.

## Design for students

One reflection at a time, large choices, visible rules, optional hints, keyboard controls alongside touch, pauses without countdowns, reduced-motion support, and room to disagree. There are no rankings or rewards for speed. Optional read-aloud uses a local-device voice where available; otherwise the app explains alternatives.

The eight areas cover personality tendencies, focus, reasoning responses, pace and information, motivation, self-management, confidence and persistence, and interaction preferences. Reports separate student reports, task work, and unknowns. There is no overall score, fixed learning type, IQ, or inferred attention limit.

## Data and integration

There is no backend, analytics, account, camera, microphone, or external model call. Fonts and assets are bundled. Progress stays in memory unless the learner opts to remember on this browser. A person sharing the browser can see a remembered visit. Turning remembering off removes its saved copy; Clear resets the current visit and saved copy. Storage failures are reported and in-memory use remains available.

Answer, task, and correction changes invalidate prior review and routine confirmation. The learner reviews the updated profile before a teaching handoff can be produced. Downloads occur only on request.

The combined preview calls `createTeachingProfile` on the current session only after profile review and routine confirmation. `designLesson` uses confirmed support, pacing, encouragement, and challenge choices; it keeps questionnaire context and unknowns distinct. Changing routine choices removes confirmation even when the discovery revision number stays the same. The lesson must be reopened from the current confirmed arrangement.

Recent-habit answers retain the original 14-day reflection window in the profile, saved visit, and exports. Opening a saved visit later does not make its answers recent. Start a fresh visit to reflect on a new window.

This is an original grade 5–8 pilot, not a validated psychological test. It needs learner comprehension and usability testing before stronger claims. Subject readiness is separate. The combined example uses the existing regrouping content as teacher-selected foundational review for a synthetic Grade 5 learner. A profile does not select mathematical level, certify readiness, or establish mastery.

The lesson interaction is still a preview: its math responses are prepared examples evaluated by the existing admission, classification, and finding-reduction rules. It makes no live provider, handwriting, microphone, or speech call. The complete live tutoring journey remains in development.

## Code ownership and checks

`questions.json` holds 28 response prompts in 24 groups. `assessment.ts` owns choices and reports. `activityModel.ts` owns typed task work and factual records. `model.ts` owns sessions and review freshness. `App.tsx`, `Activities.tsx`, and `Profile.tsx` own the Discovery interfaces. `handoff.ts` produces the reviewed teaching export. `lessonDesign.ts` maps the confirmed profile arrangement to a lesson design; `LessonPreview.tsx` presents the example interaction. `combinedDemo.ts` builds synthetic rehearsal input through the real session model.

Automated checks cover choices, missing data, context, review invalidation, restoration, routine bounds, and handoff. Browser checks exercise the full journey, corrections, export, responsive layouts, and recovery. No live AI or learning-effect result is claimed.

For the combined slice, run the build, unit, and browser commands above and exercise review/confirmation gating, routine changes, both example openings, rationale, the prepared math route, and reset. See the combined walkthrough for the checks to record; adding this consumer does not by itself establish those checks passed.
