# Audio reasoning feasibility probe

Date: 2026-11-12, America/Los_Angeles.

The author asked to try reasoning from audio first: analyze what the person says.
This is a bounded experiment within Detailed Implementation planning. It does not
replace the broader freehand-work design or approve the finished implementation.

## What ran

Three English explanations were converted to synthetic speech with the laptop's
`say` command, then converted to WAV using `afconvert`. No person was recorded.
The project-designated key was read from `.env` inside the test process and was
never printed or copied into an artifact.

Each WAV went through live OpenAI processing:

1. `gpt-transcribe` returned a transcript.
2. `gpt-5.6-terra` received only that transcript and the authored lesson context.
3. Structured output returned an assessment, exact evidence quotes, a short
   explanation, one follow-up question, and a teacher note.

The expected category for each sample was recorded before the API calls and was
not included in the model input. The lesson rubric was included: three bags with
four apples each, with repeated addition or multiplication as valid reasoning.
The transcript was treated as data, not instructions. Responses requested
`store: false`; that request is not a claim about the provider's complete data
handling. TLS certificate verification used the system trust store.

This route reasons about transcribed words. It does not directly assess tone,
hesitation, emotion, or unspoken thoughts. The named models were used for this
experiment; the application model choice remains open.

Official references: [file transcription](https://developers.openai.com/api/docs/guides/speech-to-text),
[GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra),
and [structured output](https://developers.openai.com/api/docs/guides/structured-outputs).

## Observed results

All three transcription and reasoning requests completed. All returned categories
matched their expected category; all evidence quotes were present verbatim in the
transcripts; all three results left lasting mastery unestablished. These are
observations from three authored samples, not an accuracy estimate.

### 1. Adding group count to group size

Spoken sample and returned transcript:

> There are three bags with four apples in each bag. I added three and four, so
> there are seven apples altogether.

Returned category: **misconception evidence in this attempt**.

Evidence: “I added three and four” and “there are seven apples altogether.”
The assessment identified that the speaker added the bag count to the apples per
bag instead of accounting for the apples across all bags.

Returned follow-up: “Can you describe what you would count in each bag?”

The teacher note described the stated strategy; it did not claim a stable trait
or diagnosis. A teaching response can address the relationship between groups
and items per group, followed by a fresh independent problem.

### 2. An answer supported by a stated method

Spoken sample and returned transcript:

> There are three bags with four apples in each bag. Four plus four plus four is
> twelve, so there are twelve apples altogether.

Returned category: **supported reasoning in this explanation**.

Evidence: “Four plus four plus four is twelve.” The assessment connected the
repeated addition to the three equal groups.

Returned follow-up: “Can you explain what each number in your reasoning represents?”

This does not by itself clear an existing learner finding. There was no learner
session, assistance history, or fresh independent verification problem in this
experiment.

### 3. A correct answer described as a guess

Spoken sample:

> There are three bags with four apples in each bag. My answer is twelve, but I
> guessed. I do not know why.

The transcript preserved the words and normalized “twelve” to “12.”

Returned category: **insufficient evidence**.

Evidence: “My answer is 12, but I guessed.” and “I do not know why.” The assessment
kept a correct answer separate from evidence of understanding and did not label
the guess a confirmed misconception.

Returned follow-up: “What could you say about the apples in each bag to explain
your answer?” A shorter authored alternative for the eventual lesson is “How
could you check your answer?”

## What this establishes and what remains

The project credential can run live transcription and transcript assessment with
the tested models. For these samples, the route distinguished a stated grouping
error, a supported solution, and an unsupported correct answer. Follow-up wording
was also inspected: none supplied the answer or the required operation.

The next bounded step can accept an actual supplied recording and show the
recognized words before using them as math evidence. Uncertain recognition or a
disputed transcript needs correction or clarification, rather than a math label.

Child speech, noisy or missing audio, other languages, self-corrections, recording
controls, latency, teaching effectiveness, teacher updates, and image input were
not evaluated. This experiment does not establish the full multimodal demo path.

The temporary synthetic WAVs and machine-readable outputs are in
`/var/folders/kd/df9m6_753_b2q13j97x6tzx00000gn/T/edu-audio-probe-PEMJPz/`.
This report preserves the observations if the temporary files are removed.
