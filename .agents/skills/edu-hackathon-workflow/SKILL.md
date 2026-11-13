---
name: edu-hackathon-workflow
description: Implement a demonstrable feature slice or prepare a repeatable demo handoff in the edu_hackthon project. Use for project feature and demo work after the user provides a product direction.
---

# Education hackathon workflow

Read the root [project instructions](../../../AGENTS.md) before implementation.

## Build a demonstrable slice

Use the confirmed brief to identify the intended user, one complete user journey,
and an observable acceptance criterion. Resolve missing product decisions only
when they affect the current slice; a directory name is not a product brief.

Make that journey usable from input to result before expanding the feature set.
If an external service is unavailable, provide a clearly identified fixture or
report the missing access; do not present simulated output as a live integration.

Document the working setup and run commands in the root README as they become
known. Record material tradeoffs only when they will affect subsequent work.

## Prepare the handoff

Exercise the journey using synthetic sample input. Provide a short demo sequence
with the start command, input, expected result, and reset or repeat steps.
Identify required environment variable names and any external-service dependency
without including credentials.

Run the relevant application checks and `make check` when agent setup changes.
Report the actual result, remaining limitations, and whether the demo used live
services or fixtures. Keep setup validation separate from product verification.
