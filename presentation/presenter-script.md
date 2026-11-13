# Smart Pants — three-minute presenter script

Six slides. Target finish: 2:50, with ten seconds of buffer. The demo runs from 1:00 to 2:00. Both teammates use the same repository; the personality/profile component is still in development.

## 1. Smart Pants

0:00–0:10. SAY: We’re Smart Pants. We’re building math tutoring that uses a student’s profile to shape the conversation, then checks their reasoning. Source: user direction; README.md.

## 2. One answer, different reasoning

0:10–0:35. SAY: All three students wrote 45 for 27 plus 18. One guessed. One followed the carry rule. One can explain that ten ones became one ten. Those responses need different next questions. The number alone gives us an incomplete picture. Sources: content/demo-lesson.json; test/fixtures/regrouping-cases.json; src/learning.mjs.

## 3. Student profiles shape the interaction

0:35–1:00. SAY: Both workstreams share this repository. Our partner is still building the personality assessment and student profiles. Yuanshi is building tutoring and reasoning. Maya and Leo are synthetic examples of adjustable interaction preferences. The profile should shape the teaching approach while the mathematical requirements stay consistent. Source: user clarification; README.md.

## 4. Demo: one learner, one concept

1:00–2:00. SAY: This is a scripted integration preview using the real math rules. Maya starts with a visual example. Her explanation drops the new ten, giving 35. We offer the exchange: ten ones become one ten, so the amount stays 45. That correction used help. On a fresh problem, the prepared response shows the exchange independently. The teacher sees the earlier difficulty, the help, and the new evidence. Later review remains pending. ACTIONS: Start Maya’s lesson → Check this sample → Show teaching step → Trade 10 ones for 1 ten → Show corrected attempt → Check the new problem → See the teacher evidence. Keep Maya only; Leo and alternate responses are for Q&A. Switch to http://127.0.0.1:3100 at 1:00 and back to slide 5 at 2:00. FALLBACK: if the browser fails, explain the screenshot for the same minute; do not troubleshoot on stage. Prepared profiles, responses, freshness and independence assumptions are fixtures, not live partner assessment or live AI calls.

## 5. Implementation and next integration

2:00–2:35. SAY: The authored lesson, learning rules, session state, and assessment adapter are implemented. This preview exercises deterministic math rules with prepared evidence. Her personality and profile component is still being developed in our shared repository. The next integration will pass that profile into the tutoring interaction and connect the complete browser journey. We have not yet measured learning outcomes with children. Sources: README.md; src/learning.mjs; src/session-state.mjs; src/assessment-adapter.mjs; user clarification.

## 6. One connected student journey

2:35–2:50. SAY: Our next milestone is one connected experience: create a student profile, tailor the teaching interaction, and give the teacher evidence from a fresh check. We’re Smart Pants. Thank you. TIMING: finish by 2:50; keep 2:50–3:00 as transition and technical buffer. Source: user integration goal.

After the pitch, use Leo and the alternate reasoning samples for Q&A only.
