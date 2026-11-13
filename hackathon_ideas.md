# Education hackathon: initial project ideas

Date: November 11, 2026. Prepared for Yuanshi.

Status: initial research retained for reference. The user has since directed the
project toward children learning math, verification and repetition, and timely
teacher feedback. See the [current working concept](concepts_brief.md). Age/grade,
first topic, and implementation remain open; no Goldfish review has run.

## What could make these ideas fail

“AI explains homework” is a crowded starting point. Khanmigo already prompts
students to explain their reasoning, and Gemini Guided Learning already offers
interactive guidance using course material. Asking a follow-up question is not
enough differentiation. A focused project should expose a specific misunderstanding,
show the evidence behind its response, and check what the learner can do afterward.
This is a proposed product distinction, not a claim of market novelty.
[Khan Academy](https://blog.khanacademy.org/khanmigos-first-chapter-changed-how-i-think-about-ai-a-note-from-sal-khan/),
[Google](https://blog.google/products-and-platforms/products/gemini/guided-learning-google-gemini/).

## Event constraints that shape the choice

The November 13 event requires teams of 2–4, at least two modalities, and a
working demo. Use public, synthetic, or consented data; real student records are
excluded. The agenda starts building at 11 a.m. and closes submissions at 4 p.m.
Its demo limit is inconsistent: three minutes in Format, two in the agenda. Plan
for two. Tracks cover voice, handwriting/documents, video, live tutoring, and
storytelling; the wildcard includes other learning problems with measurable
outcomes. Snowflake is listed as venue sponsor; the page states no mandatory
technology stack, detailed judging weights, or policy on pre-existing code.
[Event listing](https://luma.com/beta-3ue5).

Prior-code eligibility needs organizer clarification before treating an existing
application as submission-ready. The ideas below distinguish reusable assets
from the new work proposed for this event.

## Shortlist

These are my provisional judgments based on the available assets, not review scores.

| Idea | Learning experience and modalities | Existing advantage | Main objection |
| --- | --- | --- | --- |
| **ExplainBack** — first choice | Show written work, explain it aloud, receive one targeted hint, then solve a fresh problem. Handwriting/image + voice + text. | Blitz/Pondside already have checked math, diagrams, hints, and a concrete misconception. | Must demonstrate reliable diagnosis and transfer checking beyond an ordinary tutoring conversation. |
| **Pause & Prove** | A short lesson pauses before its solution. The learner draws and explains a prediction; the app selects a relevant explanation and checks a new example. Video/diagram + voice + text. | Reviewed lesson plans, animation, thinking pauses, and a source-linked quiz bank. | Could collapse into a video player with quizzes. Reuse only content whose redistribution rights are established. |
| **LabLens** | A trainee explains a synthetic network diagram or terminal screenshot; the coach asks for the next diagnostic step and checks it in a small simulator. Image + voice + text. | Your networking and troubleshooting experience supports realistic exercises and known answers. | Adult technical training fits the wildcard, but its learning value needs a clear explanation for a general audience. |
| **Practice Lens Tutor** | A learner shows a paper exercise through a phone or glasses and discusses it aloud. Camera + voice + text. | Existing phone/audio/glasses components. | The current audio agent has no live video context. Joining those paths and depending on hardware adds substantial uncertainty for a short build. |

## Recommended working hypothesis: ExplainBack

A learner can produce a number while misunderstanding the rule behind it.
ExplainBack compares a photo of the learner's work with their spoken explanation,
asks about one suspected misconception, and checks the response on a new problem.

Start with one concept already supported by your work: **counting equally spaced
objects on open paths and closed loops**. The diagram makes the distinction visible,
the arithmetic can be checked locally, and the spoken explanation reveals the
learner's rule. Do not start with every school subject or arbitrary homework.

### Concrete example

An original worksheet shows a closed garden path, 60 metres around, with one tree
every 6 metres. The learner writes 11 and says, “There are ten gaps, so I add one.”

The app displays the recognized calculation and the relevant spoken sentence so
the learner can correct recognition errors. It identifies a possible open-path
rule being applied to a loop, then asks: “When you return to the starting point,
are you placing another tree or reaching the first one again?”

A simple diagram highlights that shared starting point. The learner then gets a
new, unaided example with changed numbers and an explicitly open path. They must
choose the count and explain how the endpoints affect it. A short contrast pair
can check both open and closed cases, rather than rewarding a memorized formula.

### What to reuse and what to build

Reuse the authored mathematics, diagrams, question generation, and selected UI
pieces from [Blitz Learning](https://github.com/yuansshi/argon_hackthon_261025).
Its [local README](/Users/yuansshi/Documents/Codex/2026-08-30/https-wx-m-tv-sohu-com/blitz-learning/README.md)
explicitly lists teach-back and transfer evaluation as pending work.
[Pondside Math](/Users/yuansshi/Documents/Codex/2026-08-30/https-wx-m-tv-sohu-com/interactive_tutor/README.md)
also documents the open-path/closed-loop misconception and a bounded teaching scene.

The proposed event contribution is a bounded assessment flow:

1. Capture a worksheet image and a short spoken explanation.
2. Let the learner confirm what was read and heard.
3. Show the evidence supporting one tentative diagnosis, or ask for clarification.
4. Deliver one authored hint or visual explanation.
5. Check a fresh problem with an explicit reasoning rubric and local arithmetic.

Use a small reviewed set of problems and misconceptions. The model can interpret
input and phrase feedback; it should not be the sole judge of arithmetic or
invent unsupported diagnoses. Keep the existing public practice deployment
separate from the hackathon experiment.

### What the demo would measure

Record baseline reasoning, help received, and the answer and explanation on an
unfamiliar unaided problem. A possible rubric checks interval counting, endpoint
handling, and the explanation of why closure matters. Report assisted success
separately from independent success; unclear recognition remains unresolved.

Before demo day, test reviewed examples containing both sound reasoning and known
errors, plus unreadable images and unclear speech. Measure whether the app selects
an appropriate hint or asks for clarification. These checks establish prototype
behavior, not improved learning.

A consenting adult's live demonstration can show the assessment loop. Establishing
learning gains would require a separate evaluation with matched unseen questions,
more participants, and a later retention check. Do not advertise a gain percentage
from a scripted demo or a single participant.

### Two-minute demo target

| Time | Visible action |
| --- | --- |
| 0:00–0:25 | Show the worksheet and give the mistaken spoken explanation. |
| 0:25–0:50 | Confirm the recognized evidence and inspect the targeted question. |
| 0:50–1:15 | Use the diagram to explain the endpoint distinction. |
| 1:15–1:45 | Solve and explain a new problem without a hint. |
| 1:45–2:00 | Show the reasoning rubric, assistance used, and remaining uncertainty. |

Keep accounts, a large dashboard, new avatar production, glasses integration,
curriculum generation, and public child-facing deployment outside this first slice.
Use original diagrams and synthetic worksheets with consenting adult demonstrators.
Team size, intended audience, available project credentials, and reuse eligibility
still need confirmation before implementation planning.

## How the alternatives change the direction

**Pause & Prove** is preferable if your main goal is to extend the lesson library.
Reuse reviewed teaching structure and source-linked checkpoints from the
[lecture workflow](</Users/yuansshi/Documents/Obsidian Vault/40 Insights/Career & Learning/Chinese-to-English lecture video localization playbook.md>).
Limit the prototype to one original or clearly licensed lesson and one concept.
Its central test is whether a learner can explain and transfer that concept after
the intervention, rather than whether the app can generate a summary.

**LabLens** is preferable if you want a project grounded in your professional
experience. Begin with one public networking concept, such as finding a VLAN
mismatch in a synthetic topology. Let the trainee select and justify a diagnostic
command, reveal a deterministic result, then give an unfamiliar topology to solve.
Do not use company code, customer diagrams, credentials, or private incident data.
This would require a new learning interface; the advantage is domain knowledge,
not an already-built training application.

**Practice Lens Tutor** should be a later extension unless the combined camera and
conversation path is already demonstrated on the intended device. The
[current project documentation](/Users/yuansshi/Projects/personal/hobbies-meta-wearables-poc/meta-wearables-tutor/HEADSET_AGENT.md)
separates audio conversation from video capture. Existing capture and speech
components do not establish an integrated visual tutor. A phone worksheet upload
is enough for ExplainBack's initial interaction.

No alternative has been rejected by the user. These are tradeoffs for discussion.

## Next clarification

Identify the learning problem and intended learner that matter most to you.
Then narrow the hypothesis, confirm the brief's author, and follow EGM's readiness
checkpoint before launching fresh-context Goldfish reviews. The shortlist above
is research and initial ideation, not that review or an approved design.
