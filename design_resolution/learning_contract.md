# Learning actions and chronological correction replay

This contract resolves DR-01 and DR-02 from the consolidated design review. It
completes the authored lesson in `design_draft.md`; it does not implement or
validate the application. The approved problems, two separate exchange targets,
freehand and non-speech routes, current-run memory, independent checks, and
within-run review remain in scope. Every prompt below is authored application
content. Provider observations select among these actions; provider prose cannot
supply a new teaching instruction or a finding transition.

## 1. Fixed lesson identities and eligibility

| Target ID | Practice | Independent pool, consumed in this order | Reserved review |
| --- | --- | --- | --- |
| `addition-exchange` | `addition-practice-1`: 27 + 18 | `addition-check-1`: 36 + 27; `addition-check-2`: 47 + 25; `addition-check-3`: 58 + 17 | `addition-review-1`: 48 + 26 |
| `subtraction-exchange` | `subtraction-practice-1`: 42 − 17 | `subtraction-check-1`: 54 − 28; `subtraction-check-2`: 62 − 18; `subtraction-check-3`: 81 − 57 | `subtraction-review-1`: 83 − 46 |

The server computes all answers, place values, and displayed worked quantities
from this table. An issued assignment has purpose `practice`, `check`, or `review`.
A problem is consumed for that learner when its assignment is issued, including
when it is subsequently cancelled, assisted, left, or corrected. A correction
never returns a problem to a pool. Other learners have separate pools. Neither a
warmup nor a re-submission creates an assignment or consumes another pool item.

`freshAtIssue` is a server fact: the problem had never previously been issued to
that learner in the session. The original, still-current assignment can collect
neutral clarification without becoming a repeated assignment. Reissuing a
consumed problem cannot establish freshness. The reserved review item cannot be
borrowed as an independent-pool item.

An independent qualifying judgment requires all of the following:

1. Its assignment purpose is `check` or `review` and `freshAtIssue` is true.
2. Its server-computed answer is correct and usable source evidence establishes
   the target's value-preserving exchange. A valid alternative method that also
   exposes this relationship qualifies equally.
3. No assistance was recorded on that assignment before the judgment committed.
   Record this assistance fact in the immutable judgment; later replay must not
   infer independence from the current screen or the model.
4. The assignment is still current when that judgment commits. Reassessing
   historical evidence cannot advance a learner through an already-left task.
5. The judgment has not been invalidated or retracted.

Practice success, including initially unaided practice, leads to a fresh check;
it does not clear an established finding. A correct answer or valid method that
does not expose the exchange remains unverified for this target. A localized
arithmetic slip may coexist with supported exchange evidence: it contributes to
exchange coverage, but its wrong answer cannot qualify to clear a finding.

Assistance is sticky for one assignment. Worked examples, warmups, arithmetic
recheck guidance, and requesting teacher help record assistance *before* their
content is revealed or human help is invited. Neutral recognition checks and
the neutral reasoning questions below do not provide a worked relationship and
do not mark assistance. Assistance on one assignment does not contaminate the
next unused assignment or the other target. Help cannot be added to a completed
qualifying assignment after leaving it; help on a current accepted task first
ends its eligibility for any subsequent judgment on that task. It cannot undo a
previously committed judgment's recorded assistance fact.

## 2. Complete classification and dispatch

Apply these rules in order, before selecting the table action. The order avoids
enumerating the same target/purpose/assistance combinations repeatedly.

1. Reject malformed, ungrounded, out-of-range, wrong-target, or unknown-action
   provider output as a provider-result failure. It creates no math judgment.
   For example, `addition_omitted_ten` is inadmissible on subtraction and
   `subtraction_value_changed` is inadmissible on addition. A learner's grounded
   wrong quantity is admissible evidence, not a provider-format failure.
2. Unconfirmed recognition, cross-modal conflict, unexplained disagreement
   between the answer and the stated method, or contradictory exchange evidence
   selects **U** below. This precedence applies even if one disputed source
   appears to support a difficulty or the final number is correct.
3. A difficulty requires its target's explicit, source-grounded predicate. For
   addition, the child drops the exchanged ten from the combined ones without
   adding it to the combined tens. For subtraction, the child adds ten ones
   without reducing the starting tens by one. Compute the quantities for the
   current operands. A coherent incomplete response can establish that error
   even without a final answer. A correct final answer paired with that error
   returns to rule 2. A wrong answer alone never satisfies either predicate.
4. A value-preserving exchange with a correct answer selects **E**, regardless
   of whether it was proposed as `supported_exchange` or as a valid alternative.
5. A specific source-grounded counting/calculation slip with a coherent method
   selects **C**. An unexplained wrong answer selects **U**, not **C**.
6. Apply the remaining category row below. A known but inapplicable proposed
   `teachingMoveId` does not override these rules; the controller selects the
   table action. An unknown action ID fails rule 1.

| Accepted candidate category | Remaining admissible meaning | Outcome/action family for addition | Outcome/action family for subtraction |
| --- | --- | --- | --- |
| `supported_exchange` | Usable conservation evidence and correct answer | E | E |
| `supported_exchange` | Conservation is shown but no final answer is supplied | N: `ask-strategy` | N: `ask-strategy` |
| `supported_exchange` | Wrong answer with a localized slip / unexplained mismatch | C / U under rules 2 and 5 | C / U under rules 2 and 5 |
| `addition_omitted_ten` | Explicit target predicate, no unresolved conflict | D: `teach-addition-exchange` | Reject wrong-target provider result |
| `subtraction_value_changed` | Explicit target predicate, no unresolved conflict | Reject wrong-target provider result | D: `teach-subtraction-exchange` |
| `procedure_without_exchange_explanation` | Usable procedure without supported exchange | N: `ask-carried-value` if a carried one is actually observed; otherwise `ask-exchange-evidence` | N: `ask-value-check` |
| `correct_answer_without_reasoning` | Correct answer with no usable strategy/exchange evidence | N: `ask-strategy` | N: `ask-strategy` |
| `valid_alternative_strategy` | Valid compensation, counting, decomposition, or another method; exchange not exposed | N: `ask-exchange-evidence` | N: `ask-exchange-evidence` |
| `valid_alternative_strategy` | Exchange also exposed / localized calculation slip / unexplained mismatch | E / C / U under the precedence rules | E / C / U under the precedence rules |
| `computation_error` | Grounded localized arithmetic slip; exchange separately supported or not established | C: `recheck-computation` | C: `recheck-computation` |
| `needs_clarification` | Unreadable/missing/conflicting mathematical evidence | U: `confirm-recognition` for disputed capture, otherwise the neutral question specified below | Same |

`exchangeEvidence` stays separate from the category. E requires `supported`; D
requires grounded `contradicted` quantities satisfying its predicate; C and N may
have `supported` or `not_established` evidence as their source permits. An
unexplained combination of these fields returns U. A correct alternative is
never described as wrong merely because the target exchange was not shown.

The following dispatch is exhaustive for both targets. H0 means no assistance
on this assignment; H1 means at least one assistance event. A row marked H0/H1
applies to both without an additional independence inference.

| Outcome | Purpose / assistance | Immediate current-assignment response | Finding and next-assignment effect |
| --- | --- | --- | --- |
| E | `practice`, H0/H1 | Show “You showed how the amount stays the same.” | Record supported exchange; preserve any active finding. Offer the next unused same-target check. |
| E | `check`, H0 | Show “You showed it on a new problem on your own.” | Commit a qualifying success, clear only this target's active finding, and apply the scheduler in section 4. |
| E | `check`, H1 | Show “You used help on this problem. Try a new one on your own.” | Record supported practice; preserve any active finding. Offer the next unused same-target check. |
| E | `review`, H0 | Show “You showed it again on your own.” | Commit independent evidence, clear an active same-target need if any, and complete an eligible review obligation. Then apply section 4. |
| E | `review`, H1 | Show “You used help this time. Your teacher can see what still needs checking.” | No independent clearing or successful-review claim. Record the review as unsuccessful and use its continuation in section 4. |
| D | `practice` or `check`, H0/H1 | Offer the target's worked teaching action; do not reveal it until assistance is recorded. | Commit/reopen the supported same-target need. After the worked panel, offer the next unused same-target check or teacher review if exhausted. The child may first revise current work. |
| D | `review`, H0/H1 | Offer the target's worked teaching action on the current review task. | Reopen the same-target need and mark review unsuccessful. After displaying that response, offer the scheduled continuation; queue a fresh same-target repair check before session finish. |
| C | `practice` or `check`, H0/H1 | Offer `recheck-computation` on the current work. | Do not invent an exchange finding. Preserve prior need/qualification. A correction after this help is supported practice; after the panel offer a fresh same-target check. |
| C | `review`, H0/H1 | Offer `recheck-computation`. | Mark review unsuccessful, preserve the earlier finding unless separate valid D evidence exists, and offer the review continuation. A fresh arithmetic/exchange check remains needed before a later claim of improvement. |
| N | `practice` or `check`, H0/H1 | Ask the category/target question above; accept speech or writing/drawing. | Preserve prior need and qualification. Continue this assignment for neutral clarification. The child may instead select the target teaching action or a warmup, after which a fresh same-target check is offered. |
| N | `review`, H0/H1 | Ask the category/target neutral question. | Review is unverified/unsuccessful while a usable nonqualifying judgment is current; it cannot clear a need. Permit neutral clarification on the same current review, or the scheduled continuation after the prompt has been displayed. |
| U | Any purpose, H0/H1 | Confirm/correct recognized content first. If capture is usable but reasoning conflicts, ask “Show what each number in your work means. Which step did you use to get your answer?” | No new disputed finding, clearing, or successful review. Preserve earlier supported need/qualification. Keep this assignment for clarification; offer authored help or teacher review. If review is left after requesting help, record it as unsuccessful, never as a pass. |

A current help panel can be replayed without another mutation once its assistance
event exists. New frozen board work is a new attempt on the same assignment.
Submitting an appended explanation is a clarification, not a new problem.
Neutral follow-ups remain bounded by the evidence/turn limits in the API
contract; the learner can always choose help or teacher review rather than being
required to repeat a question. Reaching a limit offers teacher review and retains
the work; it never converts uncertainty into success or a difficulty.

Only E and D establish the assessed exchange denominator, along with C whose
separate exchange evidence is supported. N with independently supported exchange
but a missing final answer also establishes exchange coverage. Procedural-only,
guessed, valid-but-unexposed alternatives, and U do not. Existing valid evidence
can keep a learner assessed while a new task needs clarification. Counts remain
distinct learners per target.

## 3. Authored action catalog

`current_assignment` retains its ID, problem, purpose, consumed-pool position,
and existing work. `new_assignment` closes the source task only after the server
accepts the action and issues the selected next assignment atomically.
`session_status` changes no problem identity. A `/next` response identifies the
actual effect and actual performed action; offered actions already reflect the
scheduler, so there is no silent substitution of a requested fresh check with a
review. Styling and motion may change; the mathematical steps and words below
may not be invented during implementation.

### Actions that retain the current assignment

| Action ID | Exact prompt/content | Ordered visual behavior | Assistance |
| --- | --- | --- | --- |
| `ask-carried-value` | “What does the one you carried represent?” | Show the child's frozen work and its source-grounded carried mark; supply no new blocks, equation, answer, or corrective highlight. | No |
| `ask-strategy` | “How could you check your answer?” | Keep the original work visible and offer Draw/write and Record controls. Do not add a sample strategy. | No |
| `ask-value-check` | “How can you check that these tens and ones still make the starting number?” | Show only the child's submitted starting representation and recognized quantities; do not change them or display an expected equality. | No |
| `ask-exchange-evidence` | “Your way can work. Can you also show the tens and ones in your work?” | Preserve the child's method. Offer an empty work area/clarification field; do not insert a regrouping diagram or say the method was wrong. | No |
| `confirm-recognition` | “Do these words and marks match your work? You can correct them or show more.” | Show recognized words and a source-bound neutral image readback next to the frozen original. Expose no expected result, worked exchange, judgment, or math feedback until confirmation. If only reasoning is unclear, use the U question in section 2. | No |
| `recheck-computation` | “Check the counting or calculation in your work. Show what you counted or calculated again.” | Keep the original work and, if available, its exact source quotation for the localized slip. Show no invented error location or replacement answer. Let the child recount/recompute and submit new work. | Yes, before display |
| `warmup-tens-ones` | “Here is 34: 3 tens and 4 ones. Each long block is one ten. Each small block is one one. Show 34 as tens and ones, then return to your problem.” | Show three ten-rods and four unit dots; label 30 and 4, then 34. Invite a drawing; do not score or create a warmup judgment. Preserve the original assignment beside/behind the panel. | Yes, before display |
| `warmup-addition` | “For 23 + 14, put the tens together and the ones together. 2 tens and 1 ten make 3 tens. 3 ones and 4 ones make 7 ones. That makes 37. Now return to your problem.” | Show 2 rods/3 dots and 1 rod/4 dots separately; move like units together; show 3 rods/7 dots and `23 + 14 = 37`. No exchange occurs. | Yes, before display |
| `warmup-subtraction` | “For 46 − 12, start with 4 tens and 6 ones. Take away 1 ten and 2 ones. 3 tens and 4 ones are left. That makes 34. Now return to your problem.” | Show 4 rods/6 dots; mark and remove exactly 1 rod/2 dots; show 3 rods/4 dots and `46 − 12 = 34`. No exchange occurs. | Yes, before display |

The tens-and-ones warmup is available on either target; the addition and
subtraction warmups are available on their corresponding target. The learner
can request the corresponding worked teaching action on any current purpose,
including an independent check, with the recorded assistance consequences above.
Help actions are unavailable during provider processing until cancellation or
completion. They must never appear early in transcript/image recognition review.

For `teach-addition-exchange`, compute `t = floor(a/10) + floor(b/10)` and
`o = a%10 + b%10`; every authored addition problem has 10–18 combined ones.
The exact current-problem script and visual steps are:

1. “Here are {aT} tens and {aO} ones, and {bT} tens and {bO} ones.” Show two
   separated groups matching the operands; count rods and unit dots with labels.
2. “Together there are {t} tens and {o} ones.” Bring the groups together without
   removing or duplicating a mark.
3. “Trade 10 ones for 1 ten. The amount stays the same.” Enclose exactly ten
   unit dots, replace that set with one ten-rod, and show the before/after side by
   side. Keep all other dots and all original rods. Display
   `{t} tens + {o} ones = {t+1} tens + {o−10} ones`.
4. “Now {t+1} tens and {o−10} ones make {answer}. Use the trade to finish your
   work.” Label the remaining units and the complete equation. Keep the teaching
   panel separate from the child's immutable submission.

For the approved practice item this is 3 tens/15 ones → 4 tens/5 ones = 45.
Record assistance before step 1. The current assignment remains the same, and
all later responses on it are assisted.

For `teach-subtraction-exchange`, compute `t = floor(a/10)`, `o = a%10`,
`u = floor(b/10)`, and `v = b%10`. The exact script and visual steps are:

1. “Start with {t} tens and {o} ones. That makes {a}.” Show precisely that
   starting collection and label its total.
2. “Trade 1 ten for 10 ones. The amount stays the same.” Select one existing
   rod; replace it with exactly ten dots. Show before and after side by side,
   labelled `{t} tens + {o} ones = {t−1} tens + {o+10} ones = {a}`. Reduce the
   visible rod count at the same step that adds the dots.
3. “Now take away {u} tens and {v} ones.” Mark and remove exactly those units
   from the exchanged collection, keeping tens and ones in separate columns.
4. “{t−1−u} tens and {o+10−v} ones are left. That makes {answer}. Use the trade
   to finish your work.” Label the remaining units and complete equation.

For the approved practice item this is 4 tens/2 ones → 3 tens/12 ones, then
remove 1 ten/7 ones to leave 2 tens/5 ones = 25. Record assistance before step 1;
the current assignment remains the same. Reduced-motion presentation uses the
same ordered static frames and values, without moving objects.

### Actions that issue a new assignment or show session status

| Action ID / effect | Exact child-facing content | State, pool, and review effect |
| --- | --- | --- |
| `fresh-addition-check` / `new_assignment` | “Try {a} + {b} on your own. Draw or write how you know. You can also record your explanation.” | Issue the lowest unused addition check, purpose `check`, initially unassisted. Never relabel the old task as new. |
| `fresh-subtraction-check` / `new_assignment` | “Try {a} − {b} on your own. Draw or write how you know. You can also record your explanation.” | Same rule for the subtraction pool. |
| `start-subtraction-practice` / `new_assignment` | “Now try 42 − 17. Draw or write how you know. You can also record your explanation.” | First issue of subtraction practice, after valid addition qualification. Existing addition finding/history/review stays available. |
| `later-review` / `new_assignment` | “Let’s come back to addition. Try 48 + 26 on your own. Show how you know.” or “Let’s come back to subtraction. Try 83 − 46 on your own. Show how you know.” | Issue only the scheduler-selected target's unused reserved review, purpose `review`, initially unassisted. No solution or exchange cue is shown. |
| `resume-subtraction-task` / `new_assignment` | Use the exact `start-subtraction-practice` or `fresh-subtraction-check` prompt for the stored destination. | After an addition-review detour, issue the stored next subtraction task. It creates a new assignment for that destination; it never resurrects a closed assignment or resets its help. If the destination's pool is exhausted, offer teacher review instead. |
| `request-teacher-review` / `session_status` | “Ask your teacher to look at this with you. Your work is saved for this session.” | Preserve the current assignment and evidence; set the teacher-help request and record assistance before inviting human help. Do not clear/reopen a finding or claim a review pass. The learner may continue with the existing help/work controls; fresh-check eligibility requires an unused next item. |
| `finish-session` / `session_status` | “Your work is saved for this session. Your teacher can see what you tried and what still needs checking.” | Show the actual current needs and pending review/recheck/teacher-help flags. No mastery label or persistent progress. Offer only after the scheduler has no available required new task, or after teacher review is requested at an exhausted/blocked boundary. |

The initial addition-practice prompt is: “Try 27 + 18. Draw or write how you
know. You can also record your explanation.” Every new task shows the empty work
surface and preserves history separately. No success animation, label, or action
can turn an assisted/repeated task into an independent one.

Before the first attempt on any current assignment, show the submit-work control,
the two explanation modes, the applicable warmups/worked teaching action, and
`request-teacher-review`. Do not offer advancement on an empty task. A user
cancelled or provider-failed attempt is terminal: keep its admitted image/history,
clear its pending indicator, and offer a **new attempt on this same assignment**
in written or spoken mode, the current authored help actions, or teacher review.
Do not manufacture a judgment from failure or retry a paid call automatically.
The new attempt can reuse the displayed work as its starting board but receives
a new attempt/work version. Its assignment's existing assistance still applies.
When a failed attempt has no committed judgment, a retry does not itself mark
help; the existing task can still qualify if all eligibility conditions hold.

At pool exhaustion, replace the impossible fresh action with
`request-teacher-review`; show: “There is no new problem left for this check.
Ask your teacher to look at your work.” Leave the active finding and independent
requirement intact. At unavailable review/intervening work, show: “A later check
is still waiting. Your teacher can see it.” Do not immediately repeat a problem,
substitute another target's success, or silently declare the session mastered.

## 4. Deterministic assignment and review scheduling

Navigation is an accepted server event, separate from committing a judgment.
Help and neutral questions retain the current assignment. A task boundary occurs
when an offered new-assignment action is accepted, or when the learner explicitly
leaves a review after its authored response. No recognition screen or pending
provider job is a completed task. For spacing, an intervening task is a different
assignment on which a usable judgment was accepted and which the learner then
left. It need not be correct; missing work, a pure recognition failure, or
opening an empty assignment does not provide intervening work.

Apply this order when offering the next *new* assignment:

1. Keep an open current assignment until its allowed current response or
   completion boundary. A correction never deletes or silently replaces work
   being entered on another target. At the next boundary, a qualification that
   was invalidated by correction requires an unused same-target check before
   further ordinary target advancement. If both targets require this repair,
   addition precedes subtraction. If exhausted, request teacher review.
2. The run starts with addition practice. E on practice, or completing its
   worked help panel, enables a fresh addition check. Until addition has a valid
   independent qualifier, continue that finite check/help pool; do not start
   subtraction automatically on an unverified answer.
3. Addition's first valid qualification opens its review obligation. Offer
   `start-subtraction-practice`; this preserves the addition record. On leaving
   the first completed subtraction task, offer due addition `later-review`
   before issuing another subtraction task. Store the otherwise-next
   subtraction destination, usually its lowest unused check. Same-assignment
   teaching/clarification is allowed before leaving that first task.
4. On an addition review, usable nonqualifying work is an unsuccessful review,
   with the current authored response from section 2. The learner may clarify
   neutrally on that same review before leaving it; a later qualifying judgment
   can then complete it. Once the response is displayed, offer
   `resume-subtraction-task`. Grounded D reopens addition; N/C/U never invent
   that finding. Queue any still-needed addition repair check before session
   finish. An unresolved recognition conflict is not a completed review:
   leaving it first requires choosing help/teacher review and records an
   unsuccessful/uncertain outcome. Do not demand endless clarification.
5. Subtraction's first valid qualification opens its review obligation. It needs
   a completed task issued after that qualification. Use an outstanding unused
   due addition review if available; otherwise issue the lowest unused addition
   check as an unassisted `check` assignment. Its purpose remains `check`, and
   it consumes that addition-pool item. Repeated qualifying addition success
   while its qualification remains current does not open another addition
   review obligation. After this intervening task, offer reserved subtraction
   `later-review`. If no intervening task is available, leave subtraction review
   `pending_intervening` and request teacher review rather than call an
   immediate repeat a later review.
6. After the reserved subtraction review, process its response by the same
   rules. Before finish, offer unused repair checks for active/recheck-required
   targets **and every target whose review remains unsuccessful**, addition
   first. The latter obligation also applies after C/N/assisted E when the older
   independent qualification remains valid; it does not invent a misconception.
   A new qualifying check after an unsuccessful review creates a
   new review obligation; if that target's sole reserved review item was already
   consumed, its review is `pending_pool`. Preserve that limit and request
   teacher review. Do not manufacture another review problem.
7. Finish when no required available new task remains. The final view may
   explicitly contain active needs, teacher review, or review pending because
   the authored pools or intervening work were exhausted. Finishing is a pause
   in this run, not an award of lasting mastery.

If a fresh target check is replaced by a due review in this order, the student
snapshot offers `later-review` in the first place. After the detour it offers
`resume-subtraction-task`, not both alternatives. All counts, review flags, and
the new assignment commit in one accepted transition.

## 5. Immutable judgments and correction ownership

Each committed judgment is immutable and records at least: `judgmentId`, the
server's strictly increasing `eventSequence`, learner/target/assignment/attempt
IDs, work/evidence versions, source references (including immutable written-work citations), category, computed correctness,
exchange evidence, assignment purpose and `freshAtIssue`, assistance events seen
before commit, qualifying eligibility, and the selected learning transition.
Processing candidates are not judgments. Append invalidation/retraction events
with their own sequence and reason; do not edit the historical judgment to
pretend it never existed. Snapshots distinguish valid history from corrected
history. No replay calls a provider, reinterprets an old image, or changes a
recorded assistance fact.

The stable target record `(runId, sessionId, learnerId, targetId)` owns
`correctionRevision`, starting at 0. It also owns the stable `findingId`, even
before a difficulty exists. A correction transaction increments
`correctionRevision` once, increments the finding/snapshot revisions, records
the invalidated judgment IDs, and publishes the recomputed projection atomically.
Ordinary additional work, appended explanations, assistance, and success do not
increment this correction revision; their own record/snapshot revisions change.

Distinguish these operations:

| Event | Validity and revision effect |
| --- | --- |
| Append a new clarification/explanation turn | Preserve the old confirmed sources and old valid judgments. A new evidence version can yield a later chronological judgment. It is new evidence, not automatic retraction of a genuine earlier difficulty. No correction-revision increment. |
| New frozen board submission | Create a separate attempt and judgment history on the assignment. Preserve previous valid judgments. A new active work/evidence version invalidates obsolete jobs for that assignment through their version guards. |
| Edit an already-confirmed recognized/written turn | When the edited evidence is admitted for reassessment, append a correction and invalidate all judgments on that attempt based on evidence snapshots containing the replaced turn version, including later assembled versions. Increment this target's correction revision once. This is recognition correction, not improvement. Retain both original and corrected text. |
| Correct a provisional image readback before commit | Discard its candidate and seek clarification; no committed judgment existed, so no target correction-revision increment. The evidence/candidate version rejects its late result. |
| Dispute a committed image interpretation | Retract the selected committed judgment through the teacher correction operation, then collect clarification/reassessment; the immutable original image is retained. A new explanation alone does not silently erase an earlier confirmed judgment. |
| Teacher retraction | Invalidate exactly the selected current valid judgment IDs belonging to this learner/target, whether difficulty, clearing, or later review. Preserve all unselected judgments and their evidence; increment this target correction revision once. Reject cross-target or already-invalid IDs. |

All provider jobs capture the target correction revision in addition to run,
session, assignment revision/assistance eligibility, attempt/work/evidence
version, and candidate identity. On a target correction, abort every pending
transcription or assessment job for **that learner and target** where possible;
otherwise discard its eventual result. This deliberately includes a different
attempt on that same target. It excludes the same learner's other target and
every other learner. Commit the correction first; a correcting reassessment job
starts afterwards with the new revision and is not among the old jobs to abort.
Reset/restart invalidates every
old-context job as already specified. Replaying findings does not cancel or
reclassify completed judgments on the other target.

An obsolete job is terminal `cancelled`, releases its provider slot/audio, and
cannot leave the owning attempt in `transcribing` or `assessing`. Clear its
provisional candidate and pending indicator, retain frozen work/turns, and expose
the following recoverable attempt state. This restoration is for correction
invalidation; an explicit user cancellation remains terminal as specified above.

| Retained current evidence after correction abort | Attempt state / allowed recovery |
| --- | --- |
| All required explanation turns are confirmed | `ready_for_assessment`; the learner can explicitly submit `/assessment` under current revisions, edit/append evidence, create a new attempt, or choose current help/teacher review. |
| Transcription text exists but is unconfirmed | `awaiting_transcript_review`; confirm/correct it before a new `/assessment`. To choose current help instead, explicitly cancel this attempt first; no candidate judgment is displayed. |
| A spoken turn still needs audio, including an aborted transcription whose audio was released | `awaiting_audio`; explicitly record/upload new audio for that turn with a new idempotency identity, or create a written new attempt. No old audio is restored. |
| Current task's committed judgment was retracted, with no active provider job | `needs_clarification`; keep its sources, append a clarification or correct the confirmed text, and request assessment explicitly. The removed judgment stays invalid. |

Learner evidence edits, clarifications, and assessment requests are restricted
to the current assignment. Historical attempts expose retained evidence and
correction history for inspection; a teacher can retract their judgment through
the existing retraction operation. They cannot become current through recovery
or receive a historical learner reassessment. A current reassessment is an
explicit operation, never an automatic paid retry, and always captures the new
correction revision. Reusing an obsolete idempotency identity returns the recorded
obsolete result; it cannot resurrect that job.

## 6. Chronological reducer

Use the accepted event sequence, not response arrival time, timestamps, model
confidence, or the most recent screen. First collect the invalid judgment IDs
from all accepted correction events in the current context. Then replay the
remaining valid judgments and the immutable assistance/assignment-boundary
events in their original sequence, separately for each learner and target.
Previously issued navigation is an occurrence to preserve, not a command to
issue another assignment during replay.

Start with `activeNeed=false`, no current qualification, empty active supporting
IDs, and no review obligation. The target has one fixed difficulty code.

* A valid D judgment sets `activeNeed=true`, appends its ID to active support,
  and removes the current qualification. A repeated D while active adds evidence
  without counting another child or another reopen. D on a review records an
  unsuccessful review. D on another purpose requires a new independent check
  before opening a new review cycle.
* A valid qualifying E judgment sets `activeNeed=false`, empties active support,
  and sets the current independent judgment to that E. Earlier valid difficulty
  remains in history. A qualifying check after no current qualification opens
  one review obligation anchored to that judgment. Further qualifying checks
  while qualification is current update the independent evidence but keep the
  same review obligation; they do not repeatedly schedule reviews. The exception
  is a required repair check after an unsuccessful review: its qualification
  opens a new review cycle, which is `pending_pool` because the reserved item was
  already consumed.
* A qualifying review completes an existing review obligation only if its valid
  anchor precedes that review's issuance and a completed intervening task occurs
  between them. It can also clear an active need. If correction removed the old
  anchor, its fresh unaided success still supplies current independent evidence,
  but opens a new obligation instead of retroactively proving a properly spaced
  review. Its reserved item is already consumed, so that new review is
  `pending_pool`.
* Other usable judgments do not change `activeNeed` or the current independent
  evidence. On a reserved review, C/N/assisted E records an unsuccessful review;
  a later qualifying judgment on that same still-current, unassisted assignment
  may supersede its review result. U/pending/missing work never opens, clears, or
  reopens a finding. Current unresolved recognition remains a separate flag.
* Assistance affects only eligibility of judgments committed after that event
  on that assignment. An already-recorded later judgment has its own immutable
  eligibility; replay validates that against the prior help events, not against
  whether an earlier judgment was corrected.

`assessed` is true if any remaining valid judgment meets the coverage definition
in section 2. `supportingJudgmentIds` contains valid D judgments after the most
recent qualifying E. `historyJudgmentIds` preserves the ordered IDs, with
validity/correction metadata available separately. `clearingJudgmentId` is the
current qualifying E only when it cleared an earlier valid need; an independent
success with no valid earlier need is still independent evidence, not a claimed
learning gain.

| Finding status | Deterministic meaning |
| --- | --- |
| `active` | Replay ends with `activeNeed=true`. |
| `cleared` | Replay ends inactive, with a valid earlier D followed by current qualifying E. |
| `retracted` | No valid D remains, but a formerly recorded D was invalidated/retracted. Any independent evidence remains visible without claiming the correction was learning. |
| `none` | No valid or corrected difficulty history exists. Supported exchange/independent evidence can still exist. |

`independentStatus` is `demonstrated` when a current valid qualifier remains;
`recheck_required` when none remains after a supported difficulty or invalidation
of a former qualifier; otherwise `not_demonstrated`. Expose the current
`independentJudgmentId` or null separately from the clearing judgment.

| Review status | Meaning and permitted next step |
| --- | --- |
| `not_due` | No valid qualification has opened a current cycle; obtain independent evidence first. Historical invalid/unsuccessful review remains inspectable. |
| `pending_intervening` | A cycle is open but no qualifying intervening task has completed; use section 4's other-target task if available. |
| `due` | A cycle has the required intervening work and its reserved review is unused or is the still-current task awaiting a valid result. |
| `completed` | A valid unaided qualifying reserved-review judgment satisfies the current cycle. |
| `unsuccessful` | A valid nonqualifying/assisted review outcome remains, including a review difficulty that reopens the need. Obtain the required fresh repair check or teacher review; do not repeat the consumed review as fresh. If correction removes its old qualification anchor, retain the valid failed-review record with no valid anchor and require independent recheck first. |
| `pending_pool` | A review obligation remains but its reserved item was consumed and left without a remaining valid successful result, or a new cycle opens after that reserved item was used. Request teacher review; do not invent/recycle a review. |

The review projection includes its valid anchor assignment (or null), completed
review assignment (or null), and the original failed/invalid evidence in history.
When the current task's sole accepted judgment is corrected, retain that same
assignment and work but remove its accepted-current pointer; expose
`needs_clarification` and current allowed actions. When that task was already
left, do not rewind navigation. Recompute obligations and apply them at the next
assignment boundary. In both cases consumed pool items stay consumed, assistance
stays attached to its original assignment, and accepted other-target work remains.

## 7. Required correction examples and expected snapshots

Use one learner and the addition target. J1 is a valid omitted-ten difficulty on
addition practice. Teaching on that practice is recorded as assistance. J2 is a
correct supported exchange on the fresh, unassisted `addition-check-1`; it
qualifies and clears J1. The learner completes/leaves subtraction practice as
intervening work. J3 is a valid omitted-ten difficulty on the unassisted reserved
addition review. All event sequences are distinct and increasing.

| Snapshot after accepted event | Finding / active support | Independent evidence | Review / assignments |
| --- | --- | --- | --- |
| J1 | `active`; `[J1]`; assessed true | `recheck_required`; null | `not_due`; current addition practice; same-target teaching is available. |
| J2, before next navigation | `cleared`; `[]`; clearing J2 | `demonstrated`; J2 | `pending_intervening`; current addition check 1 has an accepted qualifying judgment and is ready to leave; offer subtraction practice. |
| Completed intervening subtraction task | `cleared`; `[]`; clearing J2 | `demonstrated`; J2 | `due`; offer addition review and store the next subtraction-check destination. |
| J3, before leaving review | `active`; `[J3]`; no current clearing | `recheck_required`; null | `unsuccessful`, anchored to J2; current addition review; offer same-task addition teaching, then resume subtraction. |

Sequence A appends a teacher retraction of **J3 only**:

| Timing of retraction | Required result |
| --- | --- |
| Before leaving the review | `correctionRevision` increases once; J3 is invalid history. Replay yields `cleared`, active support `[]`, clearing/independent J2, assessed true, review `due`. The same review assignment/image remains current; its attempt needs clarification/reassessment. No help is automatically displayed. Existing help, if any, remains and can prevent that review's later judgment from qualifying. |
| After accepting `resume-subtraction-task` | The same finding/independent state is restored. The current subtraction-check assignment and its evidence are retained; its pending jobs are unaffected. The consumed, left review has no valid result, so addition review is `pending_pool`. No automatic replay of J1 reactivates the need, no new addition problem is issued, and no learning gain is attributed to retraction. |

Sequence B instead has the teacher retract **J2 only** after inspecting its
unsupported recognition/interpretation, while **J1 and J3 remain valid**. This
invalidates the historical clearing judgment through the existing correction
operation; it does not edit a historical learner turn or call the provider:

| Timing of retraction | Required result |
| --- | --- |
| Before leaving the review | `correctionRevision` increases once; J2 is invalid history, not a failure. Replay yields `active`, support `[J1,J3]`, no clearing/independent judgment, assessed true, `independentStatus=recheck_required`. J3 remains a valid unsuccessful review, now without a valid qualification anchor. Keep the current review assignment and its J3 evidence; the next new-task offer is `fresh-addition-check` selecting `addition-check-2`. No automatic subtraction advancement is justified by invalid J2. |
| After accepting `resume-subtraction-task` | The same finding, independent, and review state applies. Keep the already-issued subtraction task and its retained work; do not delete, reissue, or mark it wrong. At its next allowed assignment boundary, offer `addition-check-2` before further ordinary subtraction advancement. Every same-learner addition job captured under the old correction revision is obsolete; subtraction jobs remain valid. |

For Sequence B, a new supported attempt on `addition-check-2` can later commit
J4 at its new event sequence. If unverified or assisted, it cannot clear the
need. If it qualifies, it clears the valid J1/J3 need and opens a new review
obligation; the consumed reserved addition review makes that obligation
`pending_pool`. It cannot move back before J3 or erase it. The historical J2
assignment remains inspectable and corrected; learner operations cannot revisit
it for advancement. Correction never retroactively changes assignment order.

Retracting J1 as well as J3 would yield `retracted`, not `cleared`, because no
valid difficulty remains. Invalidating J2 after J3 had already been retracted
would instead restore active support `[J1]`. These cases use the same reducer,
not special undo operations. In every sequence the other target's own findings,
coverage, assistance, and valid judgments are unchanged.

## 8. Acceptance evidence required during implementation

The learning checks must exercise both targets and all rows of the classification
and dispatch tables, including H0/H1 and the three purposes. At minimum, assert
valid alternatives with and without exchange evidence; an isolated arithmetic
slip; warmups retaining/assisting the current assignment; clarification without
help; a supported difficulty followed by assisted correction and fresh clearing;
failed, unclear, assisted, and successful review; exhausted independent/review
pools; and both correction sequences above before and after navigation.

Verify the rendered teaching steps use the actual current operands, preserve
value, remove the exchanged ten on subtraction, and mark assistance before
display. Repeated requests must not create duplicate judgments, issue duplicate
assignments, or double-count a learner. These are future application acceptance
requirements. This resolution document supplies authored behavior and expected
states; it is not evidence that those checks, visuals, live interpretation, or
learning effectiveness have passed.
