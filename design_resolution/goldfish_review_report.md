# Goldfish Annotated Review Report

**Status:** resolved — all accepted design fixes applied and locally verified; post-audit edits have not had another independent review.

**Target:** [design_draft.md](../design_draft.md), full file and its five normative contract appendices.

**Input:** [Original consolidated report](../design_review/consolidated_review_report.md), 8 Major actions and 4 Nits. The frozen reviewed snapshot and original reports remain unchanged.

The user explicitly requested resolving the Major findings and gaps. This is the custom instruction to apply the valid fixes in one batch; no repeated permission gate is needed. All eight Majors and the four coupled editorial Nits are classified **PROPOSE FIX**. No severity is changed and no finding is silently dropped.

## Prioritized Findings & AI Suggestions

### DR-01 [Implementation Readiness] — Severity: Major
**Source:** R9-1. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** The full authored action catalog, ordered evidence/purpose/assistance dispatch, visual steps, assignment effects, and exhaustion/review paths replace the incomplete action list in Detailed Implementation §2.
**Normative result:** [learning_contract.md](learning_contract.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-02 [Implementation Readiness] — Severity: Major
**Source:** R9-3. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Detailed Implementation §3 now delegates to deterministic chronological replay with target-owned correction revisions, explicit invalidation scope, repair priority, and worked J1/J2/J3 correction snapshots.
**Normative result:** [learning_contract.md](learning_contract.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-03 [Implementation Readiness] — Severity: Major
**Source:** R9-2. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Detailed Implementation data shapes and HTTP §4 now link the closed exact schemas, version scopes, required/null/conditional fields, every success receipt, written/spoken clarification branches, /next effects, and finite error catalog.
**Normative result:** [api_contract.md](api_contract.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-04 [Codebase Details] — Severity: Major
**Source:** B9-1. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Detailed Implementation §4 and file inventory now require the shared injected adapter, exact server-owned input matching and unmatched behavior, fault controls, fake microphone contract, and A–F public-operation seed recipes.
**Normative result:** [fixture_contract.md](fixture_contract.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-05 [Codebase Details] — Severity: Major
**Source:** B9-3. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Detailed Implementation §1 drawing row specifies 1,048,576 base64-decoded PNG file bytes and a separate 3,146,496-byte raster cap. The unified inventory adds src/png.mjs and test/png.test.mjs for restricted RGB/RGBA admission, chunk CRC/deflate bounds, metadata stripping, and safe failures. This also resolves overlapping raw Nit T9-2 without a second consolidated count.
**Normative result:** [media_contract.md](media_contract.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-06 [Codebase Details] — Severity: Major
**Source:** B9-2. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Detailed Implementation §6 and the probe inventory now require macOS say/afconvert preflight, the exact full Samantha voice, mono 16kHz PCM recipe, all six frozen inputs and comparisons, and historical-to-current action mapping before paid calls.
**Normative result:** [verification_contract.md](verification_contract.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-07 [Implementation Readiness] — Severity: Major
**Source:** R9-4. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Detailed Implementation §6 replaces the ambiguous ordering with five phases, exact file sets, progressively introduced commands/manifests, and checkpoints that need no later modules. The complete live adapter is Phase 2, before the first usable browser/live gate in Phase 4.
**Normative result:** [verification_contract.md](verification_contract.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-08 [Style] — Severity: Major
**Source:** T9-1. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

- **Affected scope:** lines 837–845.
- **Gap:** “Submit-to-next-step delay” and “a clear short example” do not define
  reproducible 30-second acceptance. The sequence includes human transcript/image
  review and could stop at an intermediate screen.
- **Reader decision:** Whether the live gate passes or requires simplification.
- **Recommendation:** Define exact start/end events, qualifying input duration,
  and whether participant review time is included.

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Detailed Implementation §6 now defines the actual-browser 5–20-second input cases and Submit-to-final-committed-decision clock. Only explicit human transcript/image review intervals are excluded; wall time and those intervals are reported. Teacher acceptance is observed separately.
**Normative result:** [verification_contract.md](verification_contract.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-09 [Style] — Severity: Nit
**Source:** T9-3. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

- **Affected scope:** line 497.
- **Gap:** “16 evidence versions/turns” does not distinguish two separate caps
  from a combined count. A correction can add a version without adding a turn.
- **Reader decision:** When another clarification/correction must be rejected.
- **Recommendation:** State separate caps or an explicit combined-count formula.

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Detailed Implementation §1 now says 16 evidence versions and separately 16 explanation turns per attempt; the context limits encode both distinct caps.
**Normative result:** [api_contract.md](api_contract.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-10 [Style] — Severity: Nit
**Source:** T7-1. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Technical Plan now links completed API/reducer/coverage contracts and renames the heading Interaction contracts; stale claims that these remain to be specified are removed.
**Normative result:** [../design_draft.md](../design_draft.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-11 [Style] — Severity: Nit
**Source:** T7-2. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Opening metadata retains the decision synopsis. The Open Questions tail now links historical reviews and experiment evidence; Alternatives no longer repeats the full decision inventory. Approval prose is consolidated into the opening record.
**Normative result:** [../design_draft.md](../design_draft.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

### DR-12 [Style] — Severity: Nit
**Source:** T7-3. **AI Suggestion:** PROPOSE FIX.

**Original finding:**

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

**Justification:** The missing or inconsistent contract affects a human implementer; the selected architecture can be preserved while supplying the explicit rule.

**Applied edit:** Alternatives now affirmatively identifies author scope and predecessor rationale. Both redundant anti-attribution clauses are deleted while preserving each alternative disposition.
**Normative result:** [../design_draft.md](../design_draft.md).

**Verification:** Structural/link checks and fresh Stage 9 re-audit are recorded below after integration. This is a design fix, not an application pass.

## Fresh-review follow-ups

The [one fresh Stage 9 re-audit](reaudit_report.md) completed all three reviewers
and found four Majors and two Nits. Its frozen result is preserved as **does not
pass**. The following fixes were then applied; the re-audit cap is reached, so
these changes have integrator verification rather than a second independent pass.
No finding is downgraded or silently treated as clean.

| Fresh finding | Disposition | Applied repair and verification |
| --- | --- | --- |
| RR-01, Major → existing DR-04 | PROPOSE FIX, applied | Canonical audio rows are WAV-only with no browser registrations. Six separate browser rows have exact unique neutral ordinal work strings, and catalog preparation rejects duplicate generated keys. Temporary hashing checked all 12 browser transcription keys are distinct. |
| RR-04, Major → existing DR-07 | PROPOSE FIX, applied | Both phase passages require the Phase 4 live gate before Phase 5. Missing/failed gate stops progression; lost access after a previously passed gate permits offline checks with the current live rehearsal explicitly unrun. Read both passages after editing. |
| RR-05, Nit → existing DR-12 | PROPOSE FIX, applied | Deleted all three remaining cited caveats about permanent rejection/technical failure while retaining author dispositions and rationale. Read the complete Alternatives section after editing. |

### DR-13 [Implementation Readiness] — Severity: Major

**Source:** R9-FRESH-01 / RR-02. **AI Suggestion:** PROPOSE FIX.

**Affected scope:** API WorkRef/attempt admission; adapter FrozenWork and
Candidate/SourceEvidence schema; common source validation.

**Discrepancy Description:** `writtenWorking` is an immutable assessment input
and may be the sole submitted work when there is no image. However, the closed
`SourceEvidence` schema permits only `turn` and `image`; there is no source ID
or exact-quotation rule for written working.

**Rationale:** Admitted mathematical evidence cannot be legally cited, forcing
the implementer to discard it, invent a source, or duplicate it into a turn.

**Justification:** This is a valid non-speech-route contract gap. Give the
existing immutable input its own source without changing provider or media scope.

**Applied edit:** API WorkRef and adapter FrozenWork expose writtenSourceId for
nonblank working, exactly `attemptId + ":work:" + workVersion + ":written"`.
SourceEvidence adds `written_work` with a required exact substring quote from
that frozen version. Confirmed turns, written working, and images use the same
conflict precedence. Candidate/Judgment citations and teacher display preserve
that source. Add full-reasoning-in-written-work, conflicting-work, forged/stale
source, and paraphrase cases to the existing planned tests.

**Verification:** Reconciled both exact schemas, IDs, grounding rules and
immutability. Temporary checks admitted the exact work quotation and rejected a
stale work version and paraphrase. No live model accuracy is claimed.

### DR-14 [Codebase Details] — Severity: Major

**Source:** RR-03. **AI Suggestion:** PROPOSE FIX.

**Affected scope:** Live adapter's provider transport, both response envelopes.

**Discrepancy Description:** The adapter is required to bound provider responses,
but neither the main document nor any appendix selects response byte limits or
states how to enforce them before parsing.

**Rationale:** Candidate field limits and the timeout do not prevent unbounded
provider-envelope buffering or parsing. The implementer would choose a resource
policy.

**Justification:** An explicit streaming byte-count boundary is necessary even
when requesting a completed non-streaming API response.

**Applied edit:** Freeze each endpoint's decoded JSON envelope at 262,144 bytes
and Responses max_output_tokens at 2,000. Count stream chunks before retention,
race reads with the deadline/abort signal, cancel/abort overflow, then strictly
decode UTF-8/parse/validate within that bound. Non-2xx bodies are discarded;
invalid/timeout/unavailable use the finite safe catalog. Planned transport tests
cover exact/cap+1, missing/lying length, multi-chunk crossing, MIME, UTF-8/JSON,
slow body, and abort. Restore explicit text-node rendering/server-owned URLs
alongside these limits in the main plan.

**Verification:** A temporary Node built-in stream check accepted the exact cap
and rejected excess in single/multiple chunks, lying/oversized length, wrong
MIME, invalid UTF-8/JSON; it observed slow-body abort and did not parse non-2xx
content. This verifies the selected primitive policy, not a future adapter.

### DR-15 [Codebase Details] — Severity: Nit

**Source:** RR-06. **AI Suggestion:** PROPOSE FIX.

**Affected scope:** scripts/live-probe.mjs generation/cleanup export used by
browser tests and fixture preparation.

**Discrepancy Description:** The helper is named but its inputs, result fields,
and cleanup ownership are not specified.

**Rationale:** Shared test infrastructure needs generated WAV bytes, absolute
paths, durations and a consistent lifetime; adjacent callers cannot infer a
common cross-file contract.

**Justification:** The small interface definition prevents another synthesis
recipe or accidental file/buffer retention.

**Applied edit:** Freeze prepareSyntheticAudio({cases, signal}) to validate and
generate all six cases, return the exact voice, Map of AudioAsset records and
idempotent async cleanup. Define bytes/path/duration/MIME, failure cleanup,
caller finally ownership and the no-use-after-cleanup lifetime. Fixture
preparation borrows that same map and retains only hashes/durations, or takes an
empty map for written/browser-only operation. No extra file/dependency is added.

**Verification:** Reconciled helper inputs/results and both callers against the
existing actual synthesis recipe, 16 kHz mono PCM inspection, and cleanup rules.

## Post-resolution verification

- Three completed fresh reviewers matched the frozen main and all five appendix
  hashes. Full receipts and original findings are in the re-audit manifest/report.
- Main design and normative contracts were reread after all six repairs. Source
  schemas, fixture registration, helper lifetimes and phase progression agree.
- `make check` passes for the existing agent scaffold. Markdown local-link,
  whitespace/fence, JSON archive and hash-consistency checks pass.
- Temporary checks confirmed Node CRC32/bounded inflation/trailing-input
  detection, the exact Samantha synthesis/conversion to mono 16 kHz 16-bit PCM,
  and 12 response-bound/fixture-key/written-source checks. Temporary owned files
  were removed. No provider calls, keys or application code were used this task.
- The original finalized snapshot and review-context hashes remain unchanged.
  The frozen re-audit main and exact appendix archive preserve the reviewed
  bytes; current corrected hashes are recorded in final_resolution_manifest.json.
- There is no configured Git remote; publication was not applicable.

These are document and building-block checks. No app/browser test, actual image
assessment, child-learning study or end-to-end latency pass is claimed.

## Disposition counts

| Category | Count |
| --- | --- |
| PROPOSE FIX, accepted and applied | 15 unique actions: 10 Major, 5 Nit |
| Original actions | 12: 8 Major, 4 Nit |
| New actions from fresh review | 3: DR-13/14 Major, DR-15 Nit |
| Fresh carried-forward actions repaired | DR-04/07 Major and DR-12 Nit; not counted again |
| CONTEST | 0 |
| ESCALATE | 0 |
| DECLINE | 0 |
| Remaining unaddressed findings | 0, based on integrator reconciliation |

The final post-audit edits have local verification only; no second fresh-audit
pass is asserted. Next is implementation Phase 1 under the project workflow,
then the later real-adapter and browser gates. Application files do not yet exist.
