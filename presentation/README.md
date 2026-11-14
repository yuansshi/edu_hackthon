# Smart Pants submission kit

Use exactly three slides in this order: **Who Are You**, **What Are You Solving**,
**Why Our Team**. Duplicate templates 5–7 in the shared master deck and move the
copies to its end. Do not edit other teams’ slides. The presentation limit is
three minutes; the demo must be a video of at most two minutes or a screenshot
plus live URL. Include modalities, a learning check, and data provenance.

- [Copy-ready slide text](SUBMISSION-COPY.txt)
- [Three-slide source](build-submission.mjs) and [copy data](submission-copy.json)
- [Deck preview](assets/deck-preview.png)
- [Profile-to-lesson screenshot](assets/combined-lesson-preview.png)
- [Presenter script](presenter-script.md)
- [Combined demo guide](COMBINED-DEMO.md)
- [Judge questions](judge-questions.md)

Team: Yuan Shi — Software Engineer; Heather Bian — Product Marketing.
Yuan authorized [his LinkedIn](https://www.linkedin.com/in/yuan-shi-123a1b1a/).
The saved editable presentation is available in the Codex chat. The older
`build-deck.mjs` is an earlier pitch source, not the official three-slide deck.

## Profile-to-lesson walkthrough

[Open the static combined preview](https://instantly-henry-reforms-notebook.trycloudflare.com/?demo=combined).
This temporary URL depends on its static server, tunnel, laptop, and network.
The static files are under `docs/combined-demo/`. For a repeatable local run,
follow the [Discovery setup](../app/README.md) and open `?demo=combined`.

Load Maya example → Back to my profile → Build my trial routine → Build my lesson.
Show the five-minute trial block, example-first opening and private feedback.
Open “Why this lesson design?” if time permits. Use the screenshot if the network
fails. The full prepared math sequence is available for Q&A.

The real profile handoff and choice-to-lesson mapping run in this preview.
Synthetic examples include prepared review/confirmation for stage time. Fresh
users review their current profile and confirm their routine themselves; edits
invalidate those gates. Math observations, freshness and independence remain
prepared examples evaluated by the existing rules. This static build cannot
perform live transcription, assessment, or tutor speech.

## Start the chat preview

From the repository root, using this project's designated `.env` credential:

```sh
npm run preview
```

Direct equivalent when npm is unavailable:

```sh
node --use-system-ca presentation/demo-server.mjs
```

Open [the local chat](http://127.0.0.1:3100). It runs separately from `npm start`
and uses OpenAI for transcription, text assessment and generated voice. Do not
overwrite an existing `.env`; [.env.example](../.env.example) documents names.
The original chat entry point uses hand-authored Maya/Leo profiles. Its live
processing is separate from the static profile-to-lesson preview described above.

Use synthetic material or adult role-play only:

1. Keep **Maya** selected and choose **Let's play with numbers**.
2. Enter `35` in **Your answer** and send. A number alone does not establish a
   misconception; the tutor asks for reasoning.
3. Send `I keep 3 tens and 5 ones and ignore the new ten. My answer is 35.`
   Inspect **Teacher evidence** for the supported finding.
4. Choose **A little help**. Authored teaching appears and marks practice assisted.
   **Next puzzle** issues an unused check.
5. For voice, use **Mic**, record thinking, then **Stop**. Review/edit the transcript
   and send it. Assessment starts only after that confirmation.
6. Enable voice to hear an OpenAI-generated reply with the same text in chat.
   **Voice off** stops playback. Autoplay refusal offers **Play reply**.

The composer appears on the first task. Enter sends; Shift+Enter adds a line.
API failures are explicit. A voice failure leaves text usable. There is no
browser-speech-synthesis fallback for tutor replies. Recordings stop at 60
seconds or 10 MiB and release microphone tracks; browser audio URLs are transient.

**Reset demo** clears current-run evidence, cancels processing/playback, and
returns to the profile chooser. Restart the server after server-code changes.
An old static server produces a labelled layout-only view with sending and voice
disabled, never a fake tutor response. Generated speech uses `gpt-4o-mini-tts`
with `marin` in this slice.

## Presentation flow

| Time | Topic |
| --- | --- |
| 0:00–0:25 | Slide 1: team and complementary roles |
| 0:25–1:05 | Slide 2: problem, approach, modalities and data |
| 1:05–2:05 | One chosen demo; use the screenshot if unavailable |
| 2:05–2:50 | Slide 3: team fit, implemented behavior and next work |
| 2:50–3:00 | Transition buffer |

Choose either the short profile-to-lesson walkthrough or a rehearsed chat
sequence. Live chat makes paid calls and depends on actual provider latency;
the scripted 60-second timing is not a measured live guarantee. Keep the saved
profile-to-lesson screenshot labelled accurately rather than presenting it as
an image of live chat.

Personalization changes interaction, not mathematical evidence requirements or
ability placement. The synthetic Grade 5 example uses teacher-selected
foundational regrouping review. Adjustable preferences are not validated fixed
learning styles. A fresh successful check shows current performance, not lasting
mastery or measured learning gains. Freehand capture, a complete separate teacher
workflow, teacher retractions, and the full normative HTTP API remain pending.

## Verification record

The profile-to-lesson publication passed the Discovery build, 57 unit tests,
nine browser tests, 127 tutoring core tests, four prototype tests, syntax checks,
and scaffold checks. Browser coverage included prepared math, a fresh Discovery
journey, reconfirmation, saved-visit isolation and phone layout. Its public HTTPS
route was exercised through profile → routine → customized lesson. No paid calls
or project credentials were used for those checks. The bundle has a chunk-size
advisory.

The later chat/voice update recorded 141 native Node tests, one offline Chrome
flow, 22 syntax checks, and the scaffold checker passing. Run `npm test` and
`npm run test:preview:browser` for that coverage. The browser check intercepts
requests and uses fake recording, transcription and playback; it opens no
localhost listener and makes no provider calls. It is not live E2E evidence.

That update also recorded an actual typed `35` receiving a tutor reply in live
port-3100 chat; the same judgment reply returned MP3 and completed native browser
playback without an error. An earlier authored-question speech smoke check also
returned MP3 without saving the audio. These checks do not establish real
microphone-recording accuracy.

Additional file-backed microphone automation did not complete: the exact
Samantha voice was unavailable, MP3 fixture conversion failed, and a separate
PCM-backed Chrome startup/cleanup encountered sandbox restrictions. No automated
live recording pass is claimed. These limits do not change the frozen audio
probe. New integration checks should be recorded separately from these historical
results.
