# Implementation-readiness review

Target: [frozen finalized design](../design_draft.reviewed.2026-11-13.md),
DetailedRange 452–881. FeatureRange 1–451 was available for definitions and
existing-state context.

**Result: does not pass implementation readiness.** Eight Major gaps and two
raw Nits were reported; the PNG-size Nit overlaps the PNG-admission Major, giving
eight Major actions and one separate Nit within this stage. No Blocker was found.
Author approval and a sound high-level design do not resolve these execution
choices.

| Reviewer | Status | Blocker | Major | Nit |
| --- | --- | --- | --- | --- |
| Implementation Readiness | Completed | 0 | 4 | 0 |
| Codebase Details | Completed | 0 | 3 | 0 |
| Style | Completed | 0 | 1 | 2 |

## Implementation Readiness findings

### R9-1 — Major — complete the authored action and learning transition contract

- **Affected scope:** lines 547–559, 584–621, 692–698, 750, 786–788.
- **Gap:** Action IDs and several paths exist, but accepted evidence and assignment
  state do not map completely to permitted next actions. Teaching visuals are
  deferred to implementation. Computation slips, valid alternatives, warmups,
  exhausted pools, and unsuccessful reviews lack complete authored responses and
  transitions. `/next` describes issuing another assignment although some actions
  operate on the existing assignment.
- **Consequence:** The implementer must invent instructional content, assistance
  effects, assignment retention/replacement, and pool/review effects.
- **Recommendation:** Supply one decision table for every candidate category,
  target, assignment purpose, and assistance condition. Specify each action's
  learner-facing content, pedagogical visual steps, assistance flag, resulting
  state, and pool/review effect. Leave visual styling, rather than teaching logic,
  to implementation.

### R9-2 — Major — finish mutation request/response contracts

- **Affected scope:** lines 675–690, 733–760, 783–794.
- **Gap:** `/clarifications` lacks exact fields for written text versus a new
  spoken turn; `/next` lacks an action field and expected revision. Success
  responses do not consistently identify current revisions and resource IDs.
  The finite safe-error catalog and stable code enum are not specified.
- **Consequence:** Server, client, seed script, and tests require additional API
  design to agree.
- **Recommendation:** Define exact JSON/header shapes, optional/null/required
  fields, revision scopes, returned IDs, synchronous versus `202` outcomes, and
  stable error codes with HTTP status/retry meaning. Distinguish `/next` returning
  help on an existing assignment from issuing a new one.

### R9-3 — Major — define chronological correction recomputation

- **Affected scope:** lines 603–621, 657–671, 681–690, 719–729, 753.
- **Gap:** Recomputing from remaining valid judgments does not define replay of
  clearing and reopening. For J1 difficulty → J2 independent success → J3 review
  difficulty, the restored state after retracting J3 is unspecified. Invalidation
  of J2 and its effect on advancement/review are also unspecified. The owning
  record and scope of `correction revision` are not defined.
- **Consequence:** Implementations may restore different findings, obligations,
  assignments, or pending-job eligibility after the same correction.
- **Recommendation:** Specify deterministic chronological reduction of valid
  judgments and assistance events, the correction revision owner, and exactly
  which jobs become obsolete. Include expected snapshots and assignments for
  retracting a reopening judgment and invalidating an independent clearing judgment.

### R9-4 — Major — provide stable phase checkpoints

- **Affected scope:** lines 781–813, 819–835, 854–871.
- **Gap:** The six verifiable units are an order, without per-phase file subsets
  or executable pass criteria. Fixed final check commands may refer to modules
  and tests that do not yet exist in earlier phases.
- **Consequence:** The implementer must choose temporary stubs, partial commands,
  or different phase boundaries, contrary to the supplied stable-phase standard.
- **Recommendation:** Define each phase's exact files, behavior, and executable
  checkpoint. Identify the minimum checks before HTTP/browser/provider modules
  exist and the phase containing the live adapter needed for the first capture gate.

## Codebase Details findings

### B9-1 — Major — define fixture selection, adapter, and seed contracts

- **Affected scope:** lines 798–805, plus injection at 783.
- **Gap:** Deterministic fixture interpretation, browser media input, and public
  seed operations are required without specifying how input selects a fixture,
  unmatched-input behavior, adapter input/result/cancellation interfaces, or the
  six learners' seeded scenarios/event sequence. No prepared-example selector is
  defined in the mutation contract.
- **Evidence:** The repository contains no existing application/fixture/browser
  helper to inherit. The audio report provides examples, not a fixture protocol.
- **Recommendation:** Freeze server-owned selection, adapter interfaces, unmatched
  behavior, seed scenarios/events, fake microphone input, and delay/malformed
  response controls. Require fixture observations to pass the same source,
  schema, and learning validation as live observations.

### B9-2 — Major — make the live audio probe reproducible

- **Affected scope:** lines 463–467, 797, 827.
- **Gap:** The declared Node/Playwright toolchain does not synthesize speech. The
  new probe lacks a selected tool/platform prerequisite, voice, conversion recipe,
  and missing-tool failure path. Historical action IDs also differ from the new
  catalog: for example, `fresh_addition` versus `fresh-addition-check`.
- **Evidence:** The audio report used macOS `say`/`afconvert`, one unspecified
  voice, and 16 kHz PCM WAV. The generated WAVs were removed. No current probe
  implementation or retained audio fixture exists.
- **Recommendation:** Define the generation/conversion recipe and prerequisite
  check, canonical six speech strings and expected comparisons under the new
  schema/action IDs, and the historical-to-current mapping. Missing prerequisites
  should stop the command before paid calls.

### B9-3 — Major — choose the PNG admission algorithm

- **Affected scope:** lines 463–467, 495, 783, 802.
- **Gap:** Signature, dimensions, and encoding validation are required under a
  built-ins-only runtime, but the admitted PNG subset, decoding/validation
  procedure, and dependency boundary are not specified. Header checks alone do
  not validate compressed image data.
- **Evidence:** No selected decoder or image-validation helper exists in the
  allowlist or current source. Provider file-type documentation does not specify
  this application's validation algorithm.
- **Recommendation:** Choose the admitted formats and exact validation procedure,
  assign it to an allowlisted file, and identify the built-ins or approved decoder.
  Define failures for truncated chunks, invalid dimensions, corrupt data, and
  excessive decoded data. Clarify the byte representation measured by 1 MiB.

## Style findings

### T9-1 — Major — define the live-gate timing metric

- **Affected scope:** lines 837–845.
- **Gap:** “Submit-to-next-step delay” and “a clear short example” do not define
  reproducible 30-second acceptance. The sequence includes human transcript/image
  review and could stop at an intermediate screen.
- **Reader decision:** Whether the live gate passes or requires simplification.
- **Recommendation:** Define exact start/end events, qualifying input duration,
  and whether participant review time is included.

### T9-2 — Nit — specify what decoded PNG size means

- **Affected scope:** line 495 and base64 submission at 682.
- **Gap:** “1 MiB decoded” could mean PNG file bytes after base64 decoding or
  decompressed raster bytes; those are materially different limits.
- **Reader decision:** Which byte count admission validates.
- **Recommendation:** Name the representation explicitly while preserving the
  approved limit. This overlaps B9-3 and is counted there once in consolidation.

### T9-3 — Nit — separate version and turn limits

- **Affected scope:** line 497.
- **Gap:** “16 evidence versions/turns” does not distinguish two separate caps
  from a combined count. A correction can add a version without adding a turn.
- **Reader decision:** When another clarification/correction must be rejected.
- **Recommendation:** State separate caps or an explicit combined-count formula.

## Read receipts and limits

All three reviewers reported fully reading their own persona and assigned
DetailedRange, consulting FeatureRange and all ten supplied baseline files, and
independently matching the frozen SHA-256:
`cb473d985b83182a72c2887a8c115d1e5788cc0c9a47add3317300d9424c6b83`.
Readiness and Codebase fully read the implementation-readiness standard; Style
had no additional assigned standard. Required full reads were completed in
untruncated chunks. Longer baseline documents were consulted at relevant ranges,
not uniformly claimed as full reads.

Codebase inspected the current README, AGENTS, Makefile, ignore rules, project
rules, scaffold configuration/skill documentation, and checker source. It found
only scaffold implementation; absence of proposed Create files was not a finding.
External reuse repositories, temporary probe files, installed browser behavior,
and actual provider capability were not independently exercised in this review.

No reviewer edited files, executed app/tests, compiled code, called live APIs,
accessed credentials or vault/history, or read unassigned peer reports. Findings
are documentary implementation gaps, not observed application failures.
