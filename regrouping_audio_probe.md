# Grade 2 regrouping audio probe

Date: 2026-11-12, America/Los_Angeles.

The author approved a lesson-specific audio feasibility test for two-digit addition and subtraction with regrouping. This report records an experiment, not an application implementation or a learning study.

## Method

Six authored English explanations were converted to synthetic speech using the laptop’s `say` command and converted to 16 kHz PCM WAV with `afconvert`. No person was recorded. Each WAV was sent to live OpenAI transcription with `gpt-transcribe`; its returned words and the authored problem were then assessed with `gpt-5.6-terra`. The reasoning call used structured output, low reasoning effort, and `store: false`.

The expected outcomes were recorded before the calls and were not passed as case-specific answers to the model. The model did receive the lesson’s mathematical criteria and a fixed catalog of teaching-move IDs. It could propose a reviewed move but could not change a finding or declare mastery. The six cases used one synthetic voice in quiet audio; there was one run of each case.

Only the project-designated `.env` credential was used. Its value and raw provider errors were not printed or written. TLS verification remained enabled with the system certificate trust store. Temporary synthetic WAV fixtures were removed after the completed probe; the retained experiment artifacts contain text and structured results. This cleanup does not verify the future browser/server audio lifecycle.

Official API references: [transcription](https://developers.openai.com/api/docs/guides/speech-to-text), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [provider data controls](https://developers.openai.com/api/docs/guides/your-data). Local audio release and `store: false` do not imply that all provider processing or retention is controlled by the application.

## Observed outcomes

All six transcription and assessment requests completed. For every case, the returned category, numerical answer, answer correctness, exchange-evidence status, and reviewed teaching move matched the prewritten expectation. Every evidence quote occurred verbatim in the returned transcript. All six results kept `canClearFinding` and `masteryEstablished` false. These are six observed sample outcomes, not an accuracy estimate.

| Case | Returned category | Answer correct | Exchange evidence | Teaching move |
| --- | --- | --- | --- | --- |
| Addition: supported exchange | supported_exchange | true | supported | fresh_addition |
| Subtraction: supported exchange | supported_exchange | true | supported | fresh_subtraction |
| Addition: omitted exchanged ten | addition_omitted_ten | false | contradicted | exchange_ones_for_ten |
| Subtraction: changed value during exchange | subtraction_value_changed | false | contradicted | exchange_ten_for_ones |
| Correct procedure without exchange explanation | procedure_without_exchange_explanation | true | not_established | ask_carried_value |
| Correct answer described as a guess | correct_answer_without_reasoning | true | not_established | ask_strategy |

### Addition: supported exchange

Problem: What is twenty-seven plus eighteen? Explain how you know.

Returned transcript:

> Seven ones plus eight ones is fifteen ones. Ten of those ones make a ten, leaving five ones. Two tens plus one ten plus that new ten is four tens. The answer is forty-five.

Assessment: The explanation exchanges ten of the fifteen ones for one ten, keeps five ones, and counts all four tens to reach 45.

Evidence quotes:

- “Ten of those ones make a ten, leaving five ones.”
- “Two tens plus one ten plus that new ten is four tens.”

Teacher summary: The stated exchange preserves value and accounts for the tens and ones.

Reviewed next move: `fresh_addition` — Try thirty-six plus twenty-seven. Show or explain how you know.

### Subtraction: supported exchange

Problem: What is forty-two minus seventeen? Explain how you know.

Returned transcript:

> Forty-two is three tens and twelve ones. Twelve minus seven is five. Three tens minus one ten is two tens. The answer is twenty-five.

Assessment: The explanation correctly exchanges one ten in 42 for ten ones, making 3 tens and 12 ones without changing the value. It then subtracts ones and tens to obtain 25.

Evidence quotes:

- “Forty-two is three tens and twelve ones.”
- “Twelve minus seven is five.”
- “Three tens minus one ten is two tens.”

Teacher summary: The stated regrouping and subtraction reasoning are mathematically valid. Use a fresh subtraction check to gather additional evidence.

Reviewed next move: `fresh_subtraction` — Try fifty-four minus twenty-eight. Show or explain how you know.

### Addition: omitted exchanged ten

Problem: What is twenty-seven plus eighteen? Explain how you know.

Returned transcript:

> Seven plus eight is fifteen. I keep five ones and ignore the ten in fifteen. Two tens plus one ten is three tens. My answer is thirty-five.

Assessment: The response identifies 7 + 8 = 15 but explicitly omits the ten from those fifteen ones, producing 35 rather than 45.

Evidence quotes:

- “I keep five ones and ignore the ten in fifteen.”
- “My answer is thirty-five.”

Teacher summary: Address that ten of the fifteen ones must be exchanged for one additional ten; it cannot be ignored.

Reviewed next move: `exchange_ones_for_ten` — Use the reviewed visual example that exchanges ten ones for one ten, retaining the value. Mark this as help, then use a fresh check.

### Subtraction: changed value during exchange

Problem: What is forty-two minus seventeen? Explain how you know.

Returned transcript:

> Forty-two becomes four tens and twelve ones. Twelve minus seven is five, and four tens minus one ten is three tens. My answer is thirty-five.

Assessment: The explanation changes 42 from four tens and two ones to four tens and twelve ones, which adds a ten rather than exchanging one ten for ten ones. This leads to 35 instead of 25.

Evidence quotes:

- “Forty-two becomes four tens and twelve ones.”
- “My answer is thirty-five.”

Teacher summary: Use the reviewed visual example that exchanges one ten for ten ones while retaining the value, then use a fresh check.

Reviewed next move: `exchange_ten_for_ones` — Use the reviewed visual example that exchanges one ten for ten ones, retaining the value. Mark this as help, then use a fresh check.

### Correct procedure without exchange explanation

Problem: What is twenty-seven plus eighteen? Explain how you know.

Returned transcript:

> I write five, carry one, and add the top numbers and that one. The answer is forty-five.

Assessment: The answer is correct, and a carrying procedure is stated, but the carried one is not explained as one ten made from ten ones.

Evidence quotes:

- “I write five, carry one”
- “The answer is forty-five.”

Teacher summary: Ask what the carried one represents before treating the procedure as evidence of an exchange explanation.

Reviewed next move: `ask_carried_value` — What does the one you carried represent?

### Correct answer described as a guess

Problem: What is twenty-seven plus eighteen? Explain how you know.

Returned transcript:

> My answer is 45. I guessed. I do not know why.

Assessment: The stated answer is correct, but the speaker explicitly says it was a guess and provides no exchange or other reasoning.

Evidence quotes:

- “My answer is 45.”
- “I guessed.”
- “I do not know why.”

Teacher summary: Use the reviewed strategy-check prompt to elicit a way to verify the answer.

Reviewed next move: `ask_strategy` — How could you check your answer?

## Interpretation and limits

The tested route distinguished explicit value-preservation errors from correct procedures with missing conceptual evidence and correct guesses. It did not label procedural-only or guessed answers as confirmed misconceptions. A numerical normalization from spoken “forty-five” to transcript “45” preserved the last case’s meaning.

The addition and subtraction exchange moves referenced authored visual teaching examples; the visual examples themselves were not exercised by this audio test. A reviewed move ID is not evidence that its future animation, wording, or teaching effect works.

No image input, browser recording controls, real child/adult recordings, noise, accents, transcript correction UI, learner state transitions, teacher polling, or end-to-end response-time criterion was tested. The audio sample alone cannot clear a teacher finding: independent-check eligibility and assistance remain server-owned application rules.

The next implementation gate is actual browser drawing capture plus a completed spoken explanation, visible recognition review, a reviewed teaching response or clarification, and teacher state derived from the same accepted evidence. The full multimodal path remains unverified.

Machine-readable results remain in `/var/folders/kd/df9m6_753_b2q13j97x6tzx00000gn/T/edu-regrouping-audio-iynijt/results.json`. The report above preserves the observed transcripts and assessments if the temporary directory is removed.
