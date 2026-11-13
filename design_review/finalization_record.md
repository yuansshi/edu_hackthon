# Design finalization record

Date: 2026-11-13. Finalized by the drafting agent before fresh-context review.

The author approved Detailed Implementation and requested finalization followed
by consolidated EGM review. The design is finalized in place at
[design_draft.md](../design_draft.md), the concrete artifact the author approved.
This preserves the existing project links. No separate design directory or
SITEMAP was established by the project.

## Reconciliation with the predecessor

The drafting agent reread [concepts_brief.md](../concepts_brief.md) and compared its
confirmed requirements with the complete design. **No unresolved contradictions
remain.** The design preserves engaging math activities, evidence-based help,
clarification before disputed labels, fresh independent checks, within-run
revisiting, teacher evidence and corrections, and a non-speech route.

| Earlier brief position | Final design and basis |
| --- | --- |
| Ages 7–9 and equal groups were explicitly proposed, not confirmed | The author selected Grades 1–6 as the broader direction, two-digit addition/subtraction with regrouping, and approved the plan targeting Grade 2 |
| Guided objects were proposed with drawing and explanation | The author subsequently selected freehand drawing/writing with explanation; the accessible alternative remains |
| The teacher page could receive pushed updates | The author selected periodic refresh about once per second; the brief did not establish push as a requirement |
| Stack, hosting, storage, provider, and capture remained open | Later author choices selected one laptop, Node/plain browser JavaScript/SVG, current-run memory, and OpenAI transcription-review-image/text assessment |
| Retain evidence and show current findings, preserving unknowns | The author selected transcript retention without audio replay and original drawings retained in memory until reset/restart; the final plan adds bounded admission and immutable versions |
| A finding clears after independent improvement, and conflicting evidence prompts more reasoning | The final rules preserve these confirmed requirements, assistance tracking, retraction history, and same-target fresh checks |

Architecture, interfaces, and dependencies added during drafting include explicit
HTTP operations, in-process version/idempotency records, a direct OpenAI adapter,
bounded capture, offline fixtures, and development-only Playwright verification.
These additions are contained in the Detailed Implementation section the author
approved; no further architecture choice is inferred from this reconciliation.

## Review boundary

Author approval records the chosen design, not successful implementation. No app
exists. The six synthetic audio results do not establish image interpretation,
child speech performance, learning gains, or end-to-end response time. Those
limits remain in the finalized design and its live verification gate.

The review will use a frozen byte-for-byte snapshot and separate reports here.
Earlier concept-review artifacts remain unchanged. The target will not be edited
during this consolidated audit, and any new findings will remain open until a
separate resolution step.
