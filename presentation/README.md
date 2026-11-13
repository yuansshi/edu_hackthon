# Smart Pants submission kit

Use exactly three slides in this order: **Who Are You**, **What Are You Solving**,
**Why Our Team**. Duplicate templates 5–7 in the shared master deck and move the
copies to its end. Do not edit other teams’ slides. The presentation limit is
three minutes; the demo must be a video of at most two minutes or a screenshot
plus live URL. Include modalities, a learning check, and data provenance.

- [Copy-ready slide text](SUBMISSION-COPY.txt)
- [Three-slide source](build-submission.mjs) and [copy data](submission-copy.json)
- [Deck preview](assets/deck-preview.png)
- [Demo screenshot](assets/combined-lesson-preview.png)
- [Presenter script](presenter-script.md)
- [Combined demo guide](COMBINED-DEMO.md)
- [Judge questions](judge-questions.md)

Team: Yuan Shi — Software Engineer; Heather Bian — Product Marketing.
Yuan authorized [his LinkedIn](https://www.linkedin.com/in/yuan-shi-123a1b1a/).
The saved editable presentation is available in the Codex chat. The older
`build-deck.mjs` is an earlier pitch source, not the official three-slide deck.

## Live walkthrough

[Open the public demo](https://instantly-henry-reforms-notebook.trycloudflare.com/?demo=combined).
This URL is temporary: keep the static server, tunnel, laptop, and network running
through judging. The static files are under `docs/combined-demo/`.
For a repeatable local run, follow the app README and open `?demo=combined`.

Load Maya example → Back to my profile → Build my trial routine → Build my lesson.
Show the five-minute trial block, example-first opening and private feedback.
Open “Why this lesson design?” if time permits. Use the screenshot if the network
fails. The full math sequence is available for Q&A.

The profile handoff and choice-to-lesson mapping run. Synthetic examples include
prepared review/confirmation for stage time. Fresh users review their actual
profile and confirm their routine themselves; edits invalidate those gates.
Math responses, freshness and independence are prepared examples evaluated by
the existing rules. Live voice/drawing assessment remains in development.

## Verification

Passed: Discovery build, 57 unit tests, nine browser tests, 127 tutoring core
tests, four prototype tests, module checks, and agent-scaffold checks. Browser
coverage includes the full prepared math sequence, a fresh Discovery journey,
reconfirmation after edits, saved-visit isolation, and phone layout. The public
HTTPS route was exercised through profile → routine → customized lesson.

The production bundle reports a chunk-size advisory. No paid provider calls or
project credentials were used. Learning gains and fixed learning-style claims
are not established. All rehearsal data is synthetic; the Grade 5 example uses
teacher-selected foundational math review. The profile does not choose ability.
