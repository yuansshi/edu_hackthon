# Smart Pants — presenter script

Draft for five minutes, including a 90-second demo. Smart Pants is the team name; ExplainBack Classroom is the working product name.

## 1. Smart Pants

0:00–0:15. We are Smart Pants. Our project combines a student profile with a math tutor that adapts its interaction, then checks what the learner can show. Today we will show the combined experience as an integration preview. Smart Pants is the team name; ExplainBack Classroom remains the working product name. Source: user direction, 2026-11-13; README.md.

## 2. One answer, different reasoning

0:15–0:50. Here is 27 plus 18. Three students might all write 45. One guessed. One knows the rule “carry one.” One can explain that ten ones became a ten and the total stayed the same. Those attempts need different next questions. We want a tutor that responds to the thinking a child can actually show. Sources: content/demo-lesson.json; test/fixtures/regrouping-cases.json; src/learning.mjs.

## 3. Student profiles shape the interaction

0:50–1:25. The team has two workstreams: personality assessment and student profiles, and tutoring and reasoning. Maya and Leo are synthetic examples of how that connection could work. Maya asks for a small visual step; Leo asks for a concise challenge. These are adjustable interaction preferences, not fixed ability labels or proven learning styles. The shared profile format is still to be agreed. Source: user direction; README.md, Development tracks and integration goal.

## 4. The learning loop

1:25–1:55. The profile influences how we ask and how we offer help. The math evidence determines the next learning step. The learner shows work, gets a targeted teaching response, then tries a fresh problem without that help. A later revisit stays separate from success on one question. Sources: design_resolution/learning_contract.md; src/learning.mjs.

## 5. Demo: one learner, one concept

1:55–3:25. Switch to http://127.0.0.1:3100. Say: “This is an integration preview. Profiles and personalized wording are scripted; the lesson rubric uses the current learning core.” Select Maya and start. Show 27+18 and the omitted-ten mistake. Explain that ten ones must become one ten. Advance to the fresh check, 36+27. Choose the supported reasoning. Show the evidence screen. Reset and choose Leo briefly to show a changed interaction style. Do not say this runs the partner’s personality assessment or a live AI call. If the browser fails, use the screenshot and continue to slide 6.

## 6. Teacher evidence keeps the story honest

3:25–3:50. A teacher should see why a finding exists and whether the latest work changes it. Keep the original difficulty, the help given, and the fresh check visible. Say “demonstrated on this check,” not “mastered.” The preview summarizes one scripted example; the implemented session projection and correction rules are separate core logic. Sources: src/session-state.mjs; design_resolution/learning_contract.md; design_resolution/api_contract.md.

## 7. Implementation and next integration

3:50–4:30. We have an authored regrouping lesson, deterministic learning/session rules, and an assessment adapter that accepts structured evidence with cited inputs. Offline tests exercise those boundaries. The existing browser page remains an early prototype, and the profile integration and full browser journey are still being connected. Passing tests does not prove learning gains or model accuracy. Sources: README.md; src/assessment-adapter.mjs; src/learning.mjs; test/learning.test.mjs.

## 8. One connected student journey

4:30–5:00. Our next milestone is one connected journey: a student creates a profile, receives a tailored interaction, shows reasoning on a fresh problem, and gives the teacher evidence for the next step. We want feedback on whether those interaction choices are useful. We have not yet measured learning outcomes with children. Thank you—we are Smart Pants. Source: user integration goal, 2026-11-13; README.md.
