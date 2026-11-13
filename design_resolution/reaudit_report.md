# Fresh Stage 9 re-audit

**Result as reviewed: does not pass.** All three fresh reviewers completed their
required reads and independently matched the main target and five appendix
hashes. They reported **4 Major findings and 2 Nits; no Blockers**.

This report preserves the audit of
[the frozen resolution revision](../design_draft.resolved.reviewed.2026-11-13.md),
FeatureRange 1–431 and DetailedRange 432–812, plus the five appendices archived
byte-for-byte in [reviewed_contracts.json](reviewed_contracts.json).
[Manifest and read receipts](reaudit_manifest.json) record the precise hashes,
ranges, baseline consultations, and execution limits.

The current design is subsequently corrected through the
[annotated resolution report](goldfish_review_report.md). Those edits and the
integrator's checks do not retroactively turn this frozen audit into a pass.
The one Stage 9 re-audit cap is reached; no second independent pass is claimed.

## Findings

| ID | Lens / severity | Frozen affected scope | Gap and required repair |
| --- | --- | --- | --- |
| RR-01 → DR-04 | Codebase / Major | fixture contract 185–212, 217–237 | Four canonical addition spoken rows share the same work/turn context and only two browser media classes; mandatory browser registration collides with duplicate-key rejection. Allow canonical WAV-only rows and define separate uniquely keyed browser work. |
| RR-02 → DR-13 | Readiness / Major | API 125–128, 281–294; fixtures 46–49, 129–157; frozen main 604–605, 713 | `writtenWorking` may be the sole work input, but closed source kinds admit only turn/image. Add a deterministic immutable written-work source, exact quotation validation, conflict handling, and tests. |
| RR-03 → DR-14 | Codebase / Major | fixtures 102–112; frozen main 462–469, 486–496, 709 | “Bounded” provider responses have no byte cap or pre-parse enforcement. Select finite transcription/Responses limits, count the incoming stream before parsing, abort on overflow, and test safe failures. |
| RR-04 → DR-07 | Style / Major | verification 178–181, 368–373 | Phase 4 requires its live gate before Phase 5, but Phase 5 permits a fixture rehearsal with a remaining live gate. State one progression rule for missing access and failed gates. |
| RR-05 → DR-12 | Style / Nit, DROP | frozen main 373–374, 417–418, 429–430 | Three trailing caveats about permanent rejection/technical failure repeat explicit first-prototype dispositions. Remove them and retain affirmative rationale. |
| RR-06 → DR-15 | Codebase / Nit | fixtures 295–308; verification 168–171 | The shared `prepareSyntheticAudio` helper lacks exact inputs, returned byte/path/duration map, and cleanup ownership. Freeze its cross-file interface and lifetime. |

Readiness found the original action/learning, replay, API, PNG, probe, phase and
clock contracts substantially present, with RR-02 remaining at their shared
source seam. Codebase found DR-04 partially unresolved and the two additional
transport/helper gaps. Style found DR-07 and DR-12 partially unresolved. These
lens-specific assessments are preserved; the combined findings above govern the
follow-up work.

## Provenance and limits

All reviewers used `fork_turns=none`, read their assigned persona first, fully
read the frozen main and five appendices, and consulted all ten baseline files.
Readiness and Codebase fully read the implementation-readiness standard; no
extra style standard was assigned. Truncated aggregate reads were corrected
with untruncated chunks. Reported hashes matched independently computed root
hashes before integration.

Codebase also read the existing scaffold, rules, configuration, skill and checker;
it confirmed the absence of an application is accurately documented. No proposed
Create file was treated as a defect. No reviewer edited files, executed the app,
ran tests, compiled, read credentials/history/vault, called a model, or inspected
unassigned peer reports. Provider documents were saved snapshots; live behavior
was not reverified. Host instruction-file exclusion remains unverified, and root
does not have separate native child tool traces.
