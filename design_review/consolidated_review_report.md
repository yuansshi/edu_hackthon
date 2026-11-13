# Consolidated EGM design review

Date: 2026-11-13. Preset: uninterrupted consolidated review, all five stages.

**The design is finalized and author-approved, but it does not yet pass
implementation readiness.** The ten fresh-context reviews produced 13 raw
findings. After merging the overlapping PNG-size observation, there are
**8 Major actions, 4 Nits, and no Blockers**. All actions remain open; no review
finding was silently applied to the approved design.

The high-level architecture, self-containment, feature specification, and
structural layout passed their assigned reviews. The Major actions concern
contracts and reproducible verification that the implementer would otherwise
have to design. Resolve those before starting application implementation.

## Reviewed artifact and provenance

- Current design: [design_draft.md](../design_draft.md).
- Frozen reviewed copy: [design_draft.reviewed.2026-11-13.md](../design_draft.reviewed.2026-11-13.md).
- SHA-256: `cb473d985b83182a72c2887a8c115d1e5788cc0c9a47add3317300d9424c6b83`.
- FeatureRange: 1–451. DetailedRange: 452–881.
- [Finalization record](finalization_record.md): drafting-agent reconciliation
  with the predecessor and explicit later author decisions; no unresolved
  predecessor contradiction was found.
- [Manifest](manifest.json): reading list, saved official sources, reviewer
  receipts, hashes, and execution status.

The finalized target stayed unchanged throughout review. Earlier concept-review
reports in the workspace root remain separate and are not replaced by this report.

## Stage coverage

| Stage | Reviewers | Outcome | Artifact |
| --- | --- | --- | --- |
| 5 — Initial Zoom Out | Zoom Out; Inventive Catalyst | No actionable findings | [Report](zoom_out_report.md) |
| 6 — Comprehension | Document-only Comprehension | Both paraphrases matched the stated design; no findings | [Full paraphrases](comprehension_report.md) |
| 7 — Feature Critique | Design Critic; Structural; Style | Three editorial Nits | [Report](critic_report.md) |
| 8 — Intermediate Zoom Out | Zoom Out | No new findings; carried forward the three Nits without claiming fixes | [Report](intermediate_zoom_out_report.md) |
| 9 — Implementation Readiness | Readiness; Codebase Details; Style | Does not pass; eight Major actions and one separate Nit after within-stage PNG deduplication | [Report](implementation_readiness_report.md) |

All ten requested reviewers completed. None was treated as clean after failure
or missing required reads. Each used `fork_turns=none`; no parent conversation or
vault notes were supplied. The comprehension reviewer received only its persona
and the target. Other reviewers received the explicit baseline; Stage 8 also
received prior-stage reports. Host instruction-file exclusion is unverified, and
root does not separately receive native child tool traces. Reported read scopes
and independently matched hashes are preserved rather than claimed as stronger
isolation evidence.

## Major actions

### DR-01 — complete the teaching-action decision table

Source: R9-1. Target: [547–621](../design_draft.reviewed.2026-11-13.md:547),
[692–698](../design_draft.reviewed.2026-11-13.md:692),
[750](../design_draft.reviewed.2026-11-13.md:750), and
[786–788](../design_draft.reviewed.2026-11-13.md:786).

Map every accepted evidence category, target, assignment purpose, and assistance
condition to a permitted authored action. Include computation slips, valid
alternative methods, warmups, pool exhaustion, and unsuccessful review. Specify
the learner-facing content, visual teaching steps, assistance effect, resulting
state, and pool/review effects. Distinguish help on the current assignment from
issuing a new assignment. The teaching logic must not be invented while coding.

### DR-02 — define chronological finding replay after corrections

Source: R9-3. Target: [603–621](../design_draft.reviewed.2026-11-13.md:603),
[657–671](../design_draft.reviewed.2026-11-13.md:657), and
[719–729](../design_draft.reviewed.2026-11-13.md:719).

Define deterministic reduction of valid judgments and assistance events across
difficulty → independent clearing → later reopening. State the result after a
reopening judgment is retracted and after an independent clearing judgment is
invalidated, including assignment advancement and review obligations. Define
which record owns the correction revision and which pending jobs it invalidates.
Include expected snapshots for both sequences.

### DR-03 — finish exact mutation and error contracts

Source: R9-2. Target: [675–690](../design_draft.reviewed.2026-11-13.md:675),
[733–760](../design_draft.reviewed.2026-11-13.md:733), and
[783–794](../design_draft.reviewed.2026-11-13.md:783).

Provide exact request and response shapes for every mutation, especially written
versus spoken clarification and `/next`. Specify required/optional/null fields,
revision scopes, returned resource IDs, synchronous versus `202` outcomes, and
the finite stable error-code catalog with status and retry meaning. Server,
browser, seed, and tests must share one contract.

### DR-04 — freeze fixture selection and synthetic-class recipes

Source: B9-1. Target: [783](../design_draft.reviewed.2026-11-13.md:783) and
[798–805](../design_draft.reviewed.2026-11-13.md:798).

Specify the injected adapter's input/result/cancellation interface, server-owned
prepared-example selection, unmatched-input behavior, six seeded learner
scenarios, and accepted event sequence. Define browser fake-microphone input and
delay/malformed-response controls. Fixture observations must pass the same
source/schema/learning validation as live observations, rather than manufacture
a predetermined finding independently of submitted evidence.

### DR-05 — choose the PNG validation boundary and size representation

Sources: B9-3 and overlapping T9-2. Target:
[463–467](../design_draft.reviewed.2026-11-13.md:463),
[495](../design_draft.reviewed.2026-11-13.md:495),
[682](../design_draft.reviewed.2026-11-13.md:682), and
[783–802](../design_draft.reviewed.2026-11-13.md:783).

Select the admitted PNG subset and exact admission procedure under the chosen
runtime dependency boundary. Name the allowlisted implementation file and any
approved decoder or required built-ins. Define malformed/truncated/corrupt image
handling and decompression bounds. State whether 1 MiB measures PNG file bytes
after base64 decoding or decompressed raster bytes; do not leave those two
different limits implicit.

### DR-06 — specify the repeatable audio probe

Source: B9-2. Target: [463–467](../design_draft.reviewed.2026-11-13.md:463),
[797](../design_draft.reviewed.2026-11-13.md:797), and
[827](../design_draft.reviewed.2026-11-13.md:827).

Choose the synthesis/conversion tools, supported platform, prerequisite check,
voice/format recipe, and missing-tool behavior. Freeze the six input strings and
expected comparisons for the new candidate schema/action IDs, explicitly mapping
the historical probe's IDs. Missing prerequisites should stop before paid calls.
The old synthetic audio result alone is not an executable future probe contract.

### DR-07 — make each implementation phase independently verifiable

Source: R9-4. Target: [781–835](../design_draft.reviewed.2026-11-13.md:781) and
[854–871](../design_draft.reviewed.2026-11-13.md:854).

Assign exact files and implemented behavior to each phase, with an executable
checkpoint that works before later modules/tests exist. Identify the phase that
supplies the live adapter needed for the first browser capture gate. Do not leave
temporary stubs or partial final commands to the implementer's judgment.

### DR-08 — define the 30-second live-gate measurement

Source: T9-1. Target: [837–845](../design_draft.reviewed.2026-11-13.md:837).

Define the exact start and end events, qualifying input duration, and treatment
of participant transcript/image review time. An operator must not be able to pass
the gate by measuring only an intermediate screen or a different interval. This
is an acceptance definition to resolve, not an observed latency failure.

## Nits

| Action | Source | Target | Required clarification or edit |
| --- | --- | --- | --- |
| DR-09 | T9-3 | [497](../design_draft.reviewed.2026-11-13.md:497) | Define separate evidence-version and turn caps, or their explicit combined-count formula |
| DR-10 | T7-1 | [273–301](../design_draft.reviewed.2026-11-13.md:273) | Replace stale “remain to be specified/to make concrete” prose with references to the completed interface and coverage contracts |
| DR-11 | T7-2 | [155–166](../design_draft.reviewed.2026-11-13.md:155), [433–440](../design_draft.reviewed.2026-11-13.md:433) | Consolidate repeated decision/approval summaries without losing alternatives' dispositions |
| DR-12 | T7-3 | [369–372](../design_draft.reviewed.2026-11-13.md:369), [413–415](../design_draft.reviewed.2026-11-13.md:413) | Remove redundant anti-attribution caveats; retain affirmative author-choice and rationale statements |

## Traceability and deduplication

| Raw finding | Stage/lens | Consolidated action | Disposition |
| --- | --- | --- | --- |
| T7-1 | 7 / Style | DR-10 | Open Nit; Stage 8 carry-forward is not another finding |
| T7-2 | 7 / Style | DR-11 | Open Nit; Stage 8 carry-forward is not another finding |
| T7-3 | 7 / Style | DR-12 | Open Nit; Stage 8 carry-forward is not another finding |
| R9-1 | 9 / Readiness | DR-01 | Open Major |
| R9-2 | 9 / Readiness | DR-03 | Open Major |
| R9-3 | 9 / Readiness | DR-02 | Open Major |
| R9-4 | 9 / Readiness | DR-07 | Open Major |
| B9-1 | 9 / Codebase | DR-04 | Open Major |
| B9-2 | 9 / Codebase | DR-06 | Open Major |
| B9-3 | 9 / Codebase | DR-05 | Open Major |
| T9-1 | 9 / Style | DR-08 | Open Major |
| T9-2 | 9 / Style | DR-05 | Merged size-clarity Nit into the PNG-admission Major; no separate count |
| T9-3 | 9 / Style | DR-09 | Open Nit |

No raw finding was dropped or claimed resolved. Stages with no findings are
represented by completed reviewer status rather than synthetic deficiency IDs.

## Limits and next step

This was a document review, not a code build, app test, or new provider experiment.
Workspace searches verified scaffold references and absence of an existing app;
proposed Create files were not treated as defects. External legacy implementations
were not independently inspected. Official provider references were reviewed from
saved snapshots, not exercised during the audit.

The earlier six synthetic audio results retain their original limited meaning.
Actual browser drawing input, child speech, teaching effectiveness, and end-to-end
performance remain unverified. Resolving these Major planning gaps is the next
EGM work; the approved live gate remains necessary during later implementation.
