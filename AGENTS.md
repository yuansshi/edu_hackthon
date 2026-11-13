# Project agent instructions

This is the `edu_hackthon` workspace. The product direction serves Grades 1–6 math
learning with verification, repetition, and timely feedback for teachers. Read the
[working concept](concepts_brief.md) for the product direction and
[current design](design_draft.md) for subsequent approved choices. The prototype
uses Node.js with plain browser JavaScript/SVG on one laptop and keeps progress
in memory for the current application run. The primary input is freehand drawing
or writing with an explanation and a non-speech alternative. The first lesson
is two-digit addition/subtraction with regrouping for Grade 2. Release
audio after transcription; keep transcripts for the current run without teacher
audio replay. Keep original drawings in process memory until reset/restart, and
refresh the teacher view about once per second. The author selected OpenAI
transcription, transcript review, then drawing/text assessment. Detailed
Implementation is author-approved. The [resolution report](design_resolution/goldfish_review_report.md)
tracks the design-review fixes and fresh readiness result. Read the five normative
contracts linked from Detailed Implementation before coding. The Phase 1
in-memory core exists separately from the early browser prototype; HTTP/browser
wiring and the approved OpenAI speech cascade are still pending. See the README
for the current implementation checkpoint and actual verification commands.

The separate [Learning Strength Discovery app](app/README.md) serves grades 5–8
learning-habit profiling and exports a reviewed teaching profile. It has its own
React/TypeScript build under `app/` and [integration boundary](app/INTEGRATION.md).
Its descriptive results do not change the math lesson's evidence or mastery rules.

Before changing files, read these project rules:

- [Project scope and conventions](.agents/rules/project.md)
- [Collaboration and handoff](.agents/rules/collaboration.md)
- [Verification](.agents/rules/verification.md)

These Markdown modules are required by this file; they are not automatically
loaded configuration. Keep this entry point short and update the relevant module
when a project convention changes.

## Commands

- `make check` — validate the agent scaffold; requires Python 3.11+.
- `python3 .agents/scripts/check_setup.py` — run the same check without Make.

Application install, run, build, and test commands belong in
[README.md](README.md) once an application exists.

## Project skill

Use [edu-hackathon-workflow](.agents/skills/edu-hackathon-workflow/SKILL.md)
for implementing a demo slice or preparing a repeatable demo handoff.
Configuration and discovery details are in the [agent setup guide](.agents/README.md).
