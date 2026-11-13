# Smart Pants combined demo — static build

This generated client-only build is ready to publish with the public repository.
Open `index.html?demo=combined` through an HTTPS static host for the synthetic
rehearsal. It is not a deployed URL until the host is verified.

## Rebuild

From `app/` with the locked dependencies installed:

```sh
./node_modules/.bin/tsc -b
./node_modules/.bin/vite build --base=./
```

Copy the contents of `app/dist/` into this directory. The relative base lets the
bundle work under a repository subdirectory. Fonts and other assets are bundled;
there are no provider calls, API keys, or backend in this build.

## Preview scope

The rehearsal uses explicit synthetic Grade 5 examples in memory, the real
Discovery profile generator, and a working profile-to-lesson mapper. Math
responses are prepared examples evaluated by the existing math rules. Live AI,
voice input, and drawing assessment remain in development. Optional question
read-aloud uses a local device voice when available. The profile does not choose
math level; the regrouping task is a teacher-selected foundational review.

The normal Discovery app requires review of the current profile and confirmation
of the routine before opening a lesson. Rehearsal shortcuts include prepared
answers, review, and confirmation and do not read or alter saved visits.
