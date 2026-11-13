# Smart Pants — judge questions

## Is this live AI?

The presentation preview uses synthetic student profiles and scripted
personalization. The existing learning core evaluates the example evidence.
The project also has an OpenAI assessment adapter, but this preview makes no
provider calls. The complete profile-to-browser integration is the next milestone.
Our partner is still developing the personality assessment and profile component
in this same repository.

## How do you know personality-based teaching works?

We have not established that yet. We are exploring whether profile information
can make interaction more useful. The examples represent adjustable preferences,
not fixed ability labels or proven learning styles. We need feedback from learners
and teachers before making an effectiveness claim.

## What stops the AI from inventing a misconception?

The adapter requests structured observations with cited submitted evidence.
Application rules validate accepted sources and select reviewed teaching actions.
Unclear or conflicting evidence leads to clarification. These boundaries limit
accepted output; they do not eliminate every model error.

## Does a successful check prove lasting learning?

We separate success with help from applying an idea independently. A fresh
unaided problem provides evidence of current performance. Later review and
evaluation with learners remain necessary. We do not claim mastery from one demo.

## What happens to student data?

The selected prototype keeps records in memory for the current application run,
releases audio after transcription, and provides no teacher audio replay. The
presentation demo uses synthetic data and no microphone. Production use with
children needs additional work.

## What does each teammate own?

Yuanshi's partner owns personality assessment and student profile creation;
she is still developing that component in this repository. Yuanshi owns tutoring,
reasoning assessment, and learning verification. The planned connection uses
the student profile to shape the tutor's interaction while
preserving the same mathematical evidence requirements.

## What is the next demonstrable milestone?

One connected journey: create a profile, receive a tailored teaching interaction,
complete a fresh check, and show the teacher the supporting evidence. The shared
profile format and complete browser integration remain to be agreed and built.

## Can you show a different interaction style?

Yes. After the three-minute pitch, reset the demo, select Leo, and compare his
opening with Maya's. The prepared rule and guess examples also demonstrate
different follow-up questions from the existing rubric. These remain synthetic
examples; the partner's assessment component is still in development.

## Evidence behind these answers

- [Current implementation and ownership](../README.md)
- [Learning rules](../src/learning.mjs) and [learning contract](../design_resolution/learning_contract.md)
- [Assessment adapter](../src/assessment-adapter.mjs)
- [Session records](../src/session-state.mjs) and [media contract](../design_resolution/media_contract.md)
