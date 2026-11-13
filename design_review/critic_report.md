# Feature-specification critique

Target: [frozen finalized design](../design_draft.reviewed.2026-11-13.md),
FeatureRange 1–451. DetailedRange 452–881 was consulted for definitions and
cross-section consistency, not subjected to a premature detail requirement.

| Reviewer | Status | Blocker | Major | Nit |
| --- | --- | --- | --- | --- |
| Design Critic | Completed | 0 | 0 | 0 |
| Structural | Completed | 0 | 0 | 0 |
| Style | Completed | 0 | 0 | 3 |

The Design Critic found the problem, goals, uncertainty rules, bounded model
authority, lifecycle, alternatives, and feasibility gate sufficient for the
feature standard. The Structural reviewer found complete topic coverage and
valid heading, list, table, and fence structure. Neither proposed a new finding.

## Findings

### T7-1 — Nit — CALIBRATE stale statements about unfinished interface planning

- **Affected scope:** lines 273–274, 299, and heading at 301.
- **Evidence:** The text says identifier formats and payloads “remain to be
  specified,” and describes interaction contracts “to make concrete.” Detailed
  Implementation already supplies identifier rules and data shapes at 675–729
  and HTTP operations at 731–754. Lines 316–318 correctly say these contracts are
  concrete.
- **Rationale:** These statements disagree about the document's completion state.
- **Reader decision:** Whether more interface and counting-contract design is
  needed before implementation.
- **Recommendation:** Refer directly to the completed contract, rename the
  heading “Interaction contracts,” and point the denominator statement to the
  explicit coverage rules at 719–729.

### T7-2 — Nit — repeated decision and approval summaries

- **Affected scope:** lines 155–166 and 433–440; duplication with lines 8–19,
  23–35, and 335–342.
- **Evidence:** Multiple passages enumerate the same lesson, stack, freehand
  input, provider, media lifetimes, teacher cadence, audience, and approval state.
- **Rationale:** Repeated inventories add reading work and distribute status
  statements across several places that must stay synchronized.
- **Recommendation:** Keep the opening metadata as the concise decision synopsis.
  Reduce 155–166 to links for historical findings and experiment evidence; remove
  the repeated inventory at 433–440 while preserving alternative dispositions
  and their rationale.

### T7-3 — Nit — DROP redundant anti-attribution caveats

- **Affected scope:** lines 369–372 and 413–415.
- **Evidence:** “No rejection is attributed to an upstream maintainer” and “they
  are not invented quotes of individual rejection decisions” qualify passages
  that already identify author choices and distinguish the remaining rationales.
- **Rationale:** These clauses defend against an interpretation the surrounding
  text does not assert and obscure the actual alternatives.
- **Reader decision:** Which alternatives belong in the first prototype, and why.
  The explicit dispositions already answer it.
- **Recommendation:** Drop the quoted clauses; retain affirmative statements
  recording author choices and design rationales carried from the predecessor.

## Read receipts and limits

All three reviewers reported fully reading their own persona first, the assigned
FeatureRange, the shared baseline list, and consulting all ten baseline files.
Design and Structural fully read the feature standard. Style had no additional
standard. All independently verified the target SHA-256:
`cb473d985b83182a72c2887a8c115d1e5788cc0c9a47add3317300d9424c6b83`.

| Reviewer | Additional target coverage | Official source sections consulted |
| --- | --- | --- |
| Design Critic | Full DetailedRange 452–881 | Data 1–157; transcription 1–33, 155–183, 295–312, 709–733; vision 232–250, 976–1086, 1243–1256 |
| Structural | Detailed 452–535 for referenced definitions | Data 1–160; transcription 1–35, 709–753, 912–947; vision 1–28, 232–275, 976–1028, 1243–1256 |
| Style | Full DetailedRange 452–881 | Data 1–159; transcription 1–100; vision 232–249, 976–1018, 1243–1256 |

Each reported fully reading the seven local baseline documents and treating the
earlier concept review as historical. Truncated segments were reread where needed.
No edits, application execution, tests, live APIs, credentials, vault/history, or
unassigned peer reports were used. This feature review does not establish
implementation readiness or successful live multimodal behavior.
