# Verification record

Verified locally on November 13, 2026 using synthetic learner input.

## Automated checks

| Check | Result |
| --- | --- |
| Discovery strict TypeScript and production build, Node 24 | Passed |
| Discovery unit tests | 43 passed across 3 files |
| Discovery Chromium browser suite | 4 passed |
| Existing tutor core, PNG, and assessment adapter tests | 127 passed |
| Existing prototype tests | 4 passed |
| Existing syntax check, Node 24 | 15 modules passed |
| Repository setup, links, config, and whitespace check | Passed |

Run the Discovery checks from the repository root after installing dependencies
and Chromium as described in [README.md](README.md):

```sh
npm run discovery:build
npm run discovery:test
npm run discovery:test:browser
```

The browser suite uses its own server on port 5174. It exercises all 28 prompts,
exclusive choices and skips, eight report areas, learner disagreement, review
invalidation, routine confirmation, and downloaded JSON. Activities cover saved
initial work and revisions, selected reflection context, guide reordering, and
matching supports. It also checks default memory-only use, opt-in restoration,
clear, malformed storage recovery, and the 390 × 844 layout.

## Additional browser checks

The app was exercised at desktop and phone sizes, including the optional
two-step code, all twelve matching decisions, pauses, larger text, keyboard
controls, reduced motion, text and JSON downloads, and a simulated storage-write
failure. Downloaded files were read back to inspect source links, corrections,
accepted routine settings, and preserved initial work. Print preparation was
checked to expand all eight areas; native printer output was not tested.

Automated axe checks on the welcome screen, a question, a matching activity,
profile, and routine found no violations in the selected WCAG 2 A/AA and 2.1 AA
rules. This is limited state coverage, not a claim of full accessibility
conformance. Broader assistive-technology and learner testing remains needed.

## Limits

These checks establish the implemented behavior, not psychological validity,
attention capacity, intelligence, or improved learning. The original assessment
still needs comprehension and usability pilots with grades 5–8. No real student
data, live model, external voice provider, or paid API was used. The exported
teaching profile is ready for a later consumer; automatic adaptation in the
existing Grade 2 math tutor has not been implemented or tested.
