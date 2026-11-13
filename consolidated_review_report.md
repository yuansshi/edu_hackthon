# ExplainBack Classroom — consolidated EGM review

Date: November 11, 2026.

**Follow-up:** The working brief was revised after this review using the user's
decisions. See the [resolution record](review_resolution.md) and
[current brief](concepts_brief.md). Target links and line references below
point to the preserved reviewed snapshot; findings describe that version.

Target: [concepts_brief.md](review_context/concepts_brief.reviewed.md), lines 1–354.
Reviewed SHA-256: `a1d3fd1b00d50b61a119b1a02e3420349b3cd23aa751b75e2419a2267d2c0df1`.

## Conclusion

**Two major design questions need resolution before implementation planning:**
what happens to a teacher finding after a child improves, and what happens when
the child's visual work and spoken explanation disagree.

The reviewers found no blocker requiring abandonment or a different architecture.
They supported retaining the narrow proposed shape: one reviewed math lesson,
targeted teaching, a new independent check, and one evidence-backed teacher card.
That is a concept-review judgment, not confirmation that the product improves
learning, is ready to build, or is approved for use with children.

Seven reviewers completed four applicable stages. The review produced seven
original findings, with four later carry-forward records, consolidated into six
actions below. No changes were applied to the concept brief during the review. No finding is marked
resolved, and no iterative convergence or approval is claimed.

## Prioritized actions

### A1 — Major — make the teacher card describe current teaching needs

Target scope: [teacher findings](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:108) and
[attempt records and updates](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:227).

The current brief leaves the card's meaning ambiguous: does it count children
who ever showed a difficulty, children whose latest work shows it, or children
whose need remains unresolved? An obsolete finding could keep recommending
remedial instruction after independent success. Teacher corrections have the
same unresolved effect.

Recommended change: distinguish historical difficulty from current follow-up needs.
Add a small example showing a learner's initial difficulty, supported practice,
independent success, and resulting card update. Also show how a teacher correction
changes the displayed interpretation while retaining earlier evidence.

Completion evidence: a reader can follow those example events and determine the
learner's current group, the card's numerator and denominator, and the evidence
still available for inspection. No database schema is required to settle this
product meaning.

### A2 — Major — clarify conflicting evidence before labeling a misconception

Target scope: [example responses](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:170) and
[teaching selection](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:204).

A child might arrange three correct groups of four while saying, “I added three
and four.” Both inputs may be interpretable while supporting different conclusions.
The brief handles missing or unclear evidence, but does not state how a disputed
interpretation changes the teaching response or teacher card.

Recommended change: add this conflict to the lesson examples. Use a neutral
distinguishing check before assigning the disputed misconception, and define the
supporting evidence in the reviewed lesson rubric. Represent unresolved conflict
as a follow-up need rather than a confirmed misconception.

Completion evidence: the example identifies the next question or action, what
would support each interpretation, and what the teacher sees while it is unresolved.
The fix belongs in the narrow lesson rules; it does not require a general system
for combining every possible input type.

### A3 — Nit — simplify the first demonstrated interaction

Target scope: [first-slice choice](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:145),
[submitted input](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:222), and [scope cuts](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:281).

Both draggable manipulation and freehand drawing assessment would be new work.
The distinct benefit of drawing has not yet been established for the initial
equal-groups lesson.

Recommended change: first demonstrate structured object work, its visual snapshot,
and spoken explanation, with a written/non-speech fallback. Defer freehand drawing
assessment unless an early learning example demonstrates why the first path is
insufficient. Preserve the accessible non-speech route.

### A4 — Nit — define the live multimodal demonstration and its proceed/cut decision

Target scope: [interpretation path](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:222) and
[early probe](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:268).

“Genuine multimodal” does not specify the observable requirement, and the probe
does not say how its outcome changes scope.

Recommended change: name one end-to-end scenario: capture visual work and a spoken
explanation, show the recognized evidence, and use it to select a reviewed teaching
response or ask for clarification. During implementation planning, choose a usable
delay target and use the probe to proceed, simplify, or mark live capability as
unready. Keep fixtures visibly distinct from live interpretation.

### A5 — Nit — describe intended counting behavior without claiming it is verified

Target scope: [object-counting responsibility](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:216).

Replace the unqualified claim that direct object actions provide reliable counts
with the intended operation: compute counts from the submitted arrangement and
check them against the authored quantities. The current source inventory does
not establish the reliability of the proposed new interaction.

### A6 — Nit — combine the repeated scope summaries

Target scope: [overview and hypothesis](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:11) and
[closing scope](/Users/yuansshi/Projects/hackthon/edu_hackthon/review_context/concepts_brief.reviewed.md:344).

Use one synopsis that separates confirmed direction from proposed assumptions.
Let the closing section state the next decision rather than repeat the same age,
topic, activity, and teacher card. Retain the synthetic-class and adult-demonstrator
boundaries.

## Stage coverage

| Stage | Reviewers | Status and result | Artifact |
| --- | --- | --- | --- |
| 5 — Initial zoom out | Zoom out; Inventive Catalyst | Both completed. One Nit; no false compromise detected. | [Initial review](zoom_out_report.md) |
| 6 — Comprehension | Comprehension | Completed on the document alone. No findings; paraphrase retained. | [Comprehension](comprehension_report.md) |
| 7 — Design critique | Design; structural; style | All completed in parallel. Two Major and four Nit findings; structure had none. | [Critic report](critic_report.md) |
| 8 — Intermediate zoom out | Fresh zoom-out reviewer | Completed. Carries prior findings forward; no new underlying issue or strategic pivot. | [Intermediate review](intermediate_zoom_out_report.md) |
| 9 — Implementation readiness | None dispatched | Not applicable: the target has no separate detailed implementation plan. This is not a pass. | [Scope explanation](implementation_readiness_report.md) |

There was no uncompleted assigned reviewer and no reviewer retry was needed.
The applicable stages ran in sequence; reviewers within Stages 5 and 7 ran in
parallel. This consolidated run assessed the existing target once rather than
performing an automatic fix/review loop.

## Traceability matrix

Every reported finding maps to an action. Stage 8 records are explicit carry-forwards,
not additional independent discoveries.

| Finding ID | Reviewer / stage | Severity | Consolidated action | Relationship |
| --- | --- | --- | --- | --- |
| S5-ZO-01 | Zoom out / 5 | Nit | A3 | Original drawing-scope finding |
| S7-D-01 | Design / 7 | Major | A1 | Original current-need ambiguity |
| S7-D-02 | Design / 7 | Major | A2 | Original conflicting-evidence ambiguity |
| S7-D-03 | Design / 7 | Nit | A4 | Probe needs a decision outcome |
| S7-T-01 | Style / 7 | Nit | A6 | Repeated summaries |
| S7-T-02 | Style / 7 | Nit | A5 | Unverified reliability claim |
| S7-T-03 | Style / 7 | Nit | A4 | Observable multimodal requirement |
| S8-ZO-01 | Zoom out / 8 | Major | A1 | Carries S7-D-01 |
| S8-ZO-02 | Zoom out / 8 | Major | A2 | Carries S7-D-02 |
| S8-ZO-03 | Zoom out / 8 | Nit | A3 | Carries S5-ZO-01 |
| S8-ZO-04 | Zoom out / 8 | Nit | A4 | Carries S7-D-03, informed by S7-T-03 |

Inventive Catalyst, comprehension, and structural reviewers returned completed
reports without findings. They are not missing reviews.

## Evidence and practical limits

Reviewers read the target, their assigned persona and standard, selected baseline
source files, initial research, and saved IES pages. Stage 6 intentionally received
only the target and comprehension persona. Stage 8 additionally received the
prior stage reports. Read receipts and code-search observations appear in each
stage artifact; exact source paths and hashes are in the
[manifest](review_context/manifest.json).

Fresh contexts were requested with `fork_turns: none`. Parent chat turns and vault
history were not supplied. This does not establish exclusion of host instruction
files; the comprehension reviewer explicitly reported that host instructions were
present.

The IES pages were saved as raw HTML with readable derivatives. The EEF page
returned HTTP 403, so its attribution in the target was not independently verified
in this run. No new source was used to fill that gap. Existing code was inspected,
not executed. No live model calls, child study, deployment, latency test, or
learning-outcome evaluation occurred.

## Recommended next step at review completion

Resolve A1 and A2 in the concept before detailed implementation planning. Incorporate
the small scope and wording edits alongside that work. Keep ages 7–9 and equal
groups explicitly provisional until chosen, and use the early interpretation probe
to determine what can actually be demonstrated. A focused re-review of changed
behavior can follow; the present report does not authorize or apply those changes.
