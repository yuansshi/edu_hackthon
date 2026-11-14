# Verification

- Run `make check` after changing the agent setup. It validates the scaffold,
  not an application's build, tests, or behavior.
- Once application code exists, run the checks relevant to the change and exercise
  the affected user journey. Add automated tests when they protect meaningful
  behavior; avoid tests that only assert scaffold wording or internal structure.
- Run `npm run check` and `npm test` for the current in-memory learning/session
  core, PNG admission, and bounded OpenAI adapter. They use synthetic injected
  observations/transports and never call a live provider. Run
  `npm run test:prototype` separately for the legacy prototype.
  The core/adapter are not wired to the legacy port-3000 page. The focused chat
  preview on port 3100 has its own entry point, `npm run preview`.
- `npm test` includes in-process preview handler checks without a listener.
  `npm run test:preview:browser` runs a foreground Chrome check with all requests,
  recording, transcription, and playback explicitly mocked. It opens no server
  socket and must not be reported as a live server/browser E2E pass.
- For the Phase 2 audio checkpoint, run
  `npm run probe:audio -- --preflight-only` first. It must generate and validate
  every canonical WAV without reading a credential or making a provider call.
  `npm run probe:audio` explicitly opts into paid calls using only this project's
  credential. Preserve failures and distinguish preflight/offline passes from
  an actual six-case live pass. Neither one verifies the browser drawing gate.
- For a demo, verify the documented start command, required configuration, sample
  inputs, expected result, and reset steps on the actual implementation.
- For the connected Discovery/tutoring flow, build Discovery, run its unit and
  browser suites, then run `npm run test:combined:browser`. This last check uses
  an actual local HTTP listener and Chrome with injected provider fixtures;
  distinguish it from both the fully intercepted preview UI suite and a live
  provider check. Verify review/confirmation gates, new-session isolation,
  imported preferences, typed work, and reset cleanup.
- Report checks that ran and their results. Distinguish successful behavior from
  mocked behavior, skipped checks, and failures caused by missing access.
- Never claim deployment, live API success, skill discovery, or product readiness
  based only on file existence or a successful scaffold check.

## Learning Strength Discovery track

Install its locked dependencies with `npm ci --prefix app`. Run
`npm run discovery:build`, `npm run discovery:test`, and
`npm run discovery:test:browser` (Chromium installed). Exercise reflections,
all three activities, profile corrections and review invalidation, trial choices,
opt-in persistence, clear, and text/JSON export in a real browser. Check desktop
and small-screen layouts and keyboard access. This original grades 5–8 pilot and
reviewed profile export are separate from math mastery and the existing grade 2
tutor. No external model call or automatic tutor adaptation is implied.
