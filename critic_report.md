# Design, structure, and style critique

Date: 2026-11-11. EGM Stage 7, consolidated review.

Target: [concepts_brief.md](review_context/concepts_brief.reviewed.md), full feature range, lines 1–354.
SHA-256: `a1d3fd1b00d50b61a119b1a02e3420349b3cd23aa751b75e2419a2267d2c0df1`.

## Execution

| Reviewer | Status | Standard | Result |
| --- | --- | --- | --- |
| egm-design | Completed | Feature-spec standard | 2 Major, 1 Nit |
| egm-structural | Completed | Feature-spec standard | No findings |
| egm-style | Completed | Persona style criteria; no separate standard | 3 Nit |

The three reviewers ran in parallel with `fork_turns: none`, without receiving
each other's reports, prior-stage reports, or chat history. This is one audit of
the current concept under the consolidated review preset. It is not an iterative
remediation loop or a claim of two-round convergence. No edits were applied to
the review target; all findings remain open recommendations.

## S7-D-01 — Major — define when a classroom finding stops applying

Affected scope: target lines 108–116 and 227–236.

The teacher card derives findings from attempt records and counts distinct
learners. It does not say whether a misconception group reflects initial
difficulty, latest evidence, or an unresolved need. A child could initially show
the confusion, then apply the concept independently, while remaining in a card
that recommends remedial instruction. Teacher corrections create the same
ambiguity.

Recommendation: establish one conceptual aggregation policy separating historical
difficulty from current follow-up needs. Show how independent success and teacher
correction change the learner's grouping and the card count while retaining the
earlier evidence. This is a required product meaning, not a request for a database
schema at concept stage.

## S7-D-02 — Major — resolve disagreement between evidence channels

Affected scope: target lines 170–177 and 204–220.

The examples cover missing or uninterpretable input, but not interpretable inputs
that disagree. A child might build three groups of four while saying, “I added
three and four.” Object quantities establish what was built; they do not resolve
what the spoken explanation means. The proposed teaching selector receives both
channels without a policy for that disagreement.

The same work could therefore receive incompatible teaching or add an unsupported
misconception label to the teacher card.

Recommendation: add a conflicting-evidence example. Require a distinguishing
check before assigning the disputed misconception, and let the reviewed lesson
rubric specify the evidence needed to support each finding.

## S7-D-03 — Nit — give the early multimodal probe a decision outcome

Affected scope: target lines 268–283.

The early interpretation test measures delay and evidence quality without stating
what would make the proposed two-minute demonstration feasible. Fixtures can
support interface work, but the brief preserves live multimodal processing as a
demo requirement. Substantial interface work might proceed before discovering
that the live path cannot support the demonstration.

Recommendation: during implementation planning, define a small live acceptance
scenario and a usable delay target. Based on that probe, proceed, simplify the
multimodal interaction, or report the live capability as unready. This does not
require selecting a provider or stack during concept review.

## S7-T-01 — Nit — consolidate the repeated scope summaries

Affected scope: target lines 11–31 and 344–348.

The overview, anchored hypothesis, and closing paragraph repeat the proposed
learning loop and scope. This repeatedly asks the reader to distinguish the
confirmed direction from assumptions.

Recommendation: merge the overview and anchored hypothesis into one synopsis with
an explicit scope sentence. Use the closing paragraph for the next decision and
refer back to that scope. Preserve the synthetic-data and adult-demonstrator
boundaries.

## S7-T-02 — Nit — calibrate the object-counting claim

Affected scope: target lines 216–220. Editorial action: **CALIBRATE**.

“Direct object actions provide reliable counts” is an unqualified capability
judgment in a proposed architecture. No implementation or runtime verification
establishes that reliability.

Recommendation: state the intended responsibility instead: “Compute object counts
from the submitted arrangement and check them against the authored quantities.”
Keep locally checked quantities distinct from model interpretation.

## S7-T-03 — Nit — define observable multimodal behavior

Affected scope: target lines 222–225 and 281–283.

“Genuinely process” and “genuine multimodal input” do not define whether capture,
interpretation, or use in the teaching response is required.

Recommendation: state the observable behavior once: submit captured visual work
and spoken explanation, show what was recognized, and use the interpreted
evidence to choose a teaching response or request clarification. Preserve the
non-speech route and the distinction between labeled fixtures and live processing.

## Structural result

No structural findings. The reviewer found consistent heading hierarchy, valid
tables, lists, links, and a closed Mermaid fence. Alternatives, responsibilities,
data flow, scope, and failure handling were identifiable at concept-brief level.
The standard does not mandate literal section names or a finished implementation
plan.

## Read receipts

All three reviewers reported reading their persona, the complete target, initial
research, all four supplied Blitz source files, and both readable IES mirrors.
Design and structural reviewers also read the feature-spec standard. Each matched
the target hash. No apps were run, credentials accessed, files edited, or review
history supplied. EEF was unavailable and was not independently assessed.

See [context provenance](review_context/manifest.json) for exact paths and hashes.
Continue to the intermediate zoom-out stage with these findings still open.
