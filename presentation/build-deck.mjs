// Import these callbacks into Artifact Session to edit the connected deck.
const C = { cream: '#F7F6ED', ink: '#163C32', soft: '#426052', lime: '#DDF174' };

function text(slide, name, value, x, y, w, h, size = 28, bold = false, color = C.ink) {
  const shape = slide.shapes.add({ geometry: 'textbox', name,
    position: { left: x, top: y, width: w, height: h }, fill: 'none',
    line: { fill: 'none', width: 0 } });
  shape.text = value;
  shape.text.style = { typeface: 'Avenir Next', fontSize: size, bold, color,
    insets: 0, autoFit: 'none', wrap: 'square' };
  return shape;
}

function slide(presentation, title, number, dark = false) {
  const s = presentation.slides.add({ width: 1280, height: 720 });
  s.background.fill = dark ? C.ink : C.cream;
  text(s, `title-${number}`, title, 76, 62, 1120, 108, 48, true, dark ? C.cream : C.ink);
  text(s, `page-${number}`, `${number}`, 1180, 663, 40, 28, 18, false, dark ? C.lime : C.soft);
  return s;
}

export const slideNotes = [
  '0:00–0:15. We are Smart Pants. Our project combines a student profile with a math tutor that adapts its interaction, then checks what the learner can show. Today we will show the combined experience as an integration preview. Smart Pants is the team name; ExplainBack Classroom remains the working product name. Source: user direction, 2026-11-13; README.md.',
  '0:15–0:50. Here is 27 plus 18. Three students might all write 45. One guessed. One knows the rule “carry one.” One can explain that ten ones became a ten and the total stayed the same. Those attempts need different next questions. We want a tutor that responds to the thinking a child can actually show. Sources: content/demo-lesson.json; test/fixtures/regrouping-cases.json; src/learning.mjs.',
  '0:50–1:25. The team has two workstreams: personality assessment and student profiles, and tutoring and reasoning. Maya and Leo are synthetic examples of how that connection could work. Maya asks for a small visual step; Leo asks for a concise challenge. These are adjustable interaction preferences, not fixed ability labels or proven learning styles. The shared profile format is still to be agreed. Source: user direction; README.md, Development tracks and integration goal.',
  '1:25–1:55. The profile influences how we ask and how we offer help. The math evidence determines the next learning step. The learner shows work, gets a targeted teaching response, then tries a fresh problem without that help. A later revisit stays separate from success on one question. Sources: design_resolution/learning_contract.md; src/learning.mjs.',
  '1:55–3:25. Switch to http://127.0.0.1:3100. Say: “This is an integration preview. Profiles and personalized wording are scripted; the lesson rubric uses the current learning core.” Select Maya and start. Show 27+18 and the omitted-ten mistake. Explain that ten ones must become one ten. Advance to the fresh check, 36+27. Choose the supported reasoning. Show the evidence screen. Reset and choose Leo briefly to show a changed interaction style. Do not say this runs the partner’s personality assessment or a live AI call. If the browser fails, use the screenshot and continue to slide 6.',
  '3:25–3:50. A teacher should see why a finding exists and whether the latest work changes it. Keep the original difficulty, the help given, and the fresh check visible. Say “demonstrated on this check,” not “mastered.” The preview summarizes one scripted example; the implemented session projection and correction rules are separate core logic. Sources: src/session-state.mjs; design_resolution/learning_contract.md; design_resolution/api_contract.md.',
  '3:50–4:30. We have an authored regrouping lesson, deterministic learning/session rules, and an assessment adapter that accepts structured evidence with cited inputs. Offline tests exercise those boundaries. The existing browser page remains an early prototype, and the profile integration and full browser journey are still being connected. Passing tests does not prove learning gains or model accuracy. Sources: README.md; src/assessment-adapter.mjs; src/learning.mjs; test/learning.test.mjs.',
  '4:30–5:00. Our next milestone is one connected journey: a student creates a profile, receives a tailored interaction, shows reasoning on a fresh problem, and gives the teacher evidence for the next step. We want feedback on whether those interaction choices are useful. We have not yet measured learning outcomes with children. Thank you—we are Smart Pants. Source: user integration goal, 2026-11-13; README.md.',
];

export async function createCover({ presentation, input }) {
  const s = presentation.slides.add({ width: 1280, height: 720 });
  s.background.fill = C.cream;
  text(s, 'cover-team', 'TEAM', 80, 105, 500, 40, 22, true);
  text(s, 'cover-title', 'Smart\nPants', 74, 170, 620, 238, 104, true);
  text(s, 'cover-subtitle', 'Personalized math tutoring', 80, 465, 650, 64, 34);
  text(s, 'cover-product', 'ExplainBack Classroom · working prototype', 80, 570, 660, 42, 22, false, C.soft);
  s.speakerNotes.text = slideNotes[0];
  if (input?.path) await addCoverImage({ presentation, input });
}

export async function appendSlides({ presentation, input }) {
  for (const n of input.slides) {
    let s;
    if (n === 2) {
      s = slide(presentation, 'One answer, different reasoning', n);
      text(s, 'equation', '27 + 18 = 45', 76, 197, 1120, 133, 98, true);
      const rows = [['“I guessed.”', 'Ask for a way to check.'], ['“I carried one.”', 'Ask what the one represents.'], ['“Ten ones became one ten.”', 'Check the idea on a fresh problem.']];
      rows.forEach(([a, b], i) => { text(s, `quote-${i}`, a, 80, 370 + i * 79, 596, 60, 30, true); text(s, `response-${i}`, b, 713, 370 + i * 79, 480, 64, 27, false, C.soft); });
    } else if (n === 3) {
      s = slide(presentation, 'Student profiles shape the interaction', n);
      text(s, 'maya-name', 'Maya', 80, 220, 520, 62, 52, true);
      text(s, 'maya-preference', 'Short visual steps\nTime to explain', 80, 310, 480, 120, 34);
      text(s, 'maya-prompt', '“Let’s bundle ten ones together.”', 80, 478, 510, 104, 31, true);
      text(s, 'leo-name', 'Leo', 690, 220, 500, 62, 52, true);
      text(s, 'leo-preference', 'A concise challenge\nA choice of approach', 690, 310, 480, 120, 34);
      text(s, 'leo-prompt', '“Can you prove the total stays equal?”', 690, 478, 500, 104, 31, true);
      text(s, 'profile-disclosure', 'Synthetic profiles · illustrative preferences · partner integration pending', 80, 624, 1080, 38, 22, false, C.soft);
    } else if (n === 4) {
      s = slide(presentation, 'The learning loop', n, true);
      const steps = [['01', 'Show', 'Work and explanation'], ['02', 'Teach', 'Help for this difficulty'], ['03', 'Check', 'A fresh unaided problem'], ['04', 'Revisit', 'Later evidence of recall']];
      steps.forEach(([a, b, c], i) => { const x = 80 + i * 298; text(s, `step-number-${i}`, a, x, 235, 240, 44, 26, true, C.lime); text(s, `step-title-${i}`, b, x, 310, 250, 70, 48, true, C.cream); text(s, `step-description-${i}`, c, x, 416, 240, 116, 28, false, C.cream); });
      text(s, 'loop-principle', 'The profile shapes the interaction. The work guides the learning decision.', 80, 598, 1110, 62, 29, false, C.lime);
    } else if (n === 5) {
      s = slide(presentation, 'Demo: one learner, one concept', n);
      text(s, 'demo-subtitle', 'Student profile → tailored help → fresh check → teacher evidence', 80, 172, 1120, 52, 27);
      text(s, 'demo-disclosure', 'Synthetic student profiles and scripted responses · no live provider calls', 80, 624, 1110, 42, 22, false, C.soft);
    } else if (n === 6) {
      s = slide(presentation, 'Teacher evidence keeps the story honest', n);
      text(s, 'evidence-initial-label', 'EARLIER WORK', 80, 223, 335, 34, 23, true, C.soft);
      text(s, 'evidence-help-label', 'ASSISTANCE', 465, 223, 335, 34, 23, true, C.soft);
      text(s, 'evidence-check-label', 'FRESH CHECK', 850, 223, 335, 34, 23, true, C.soft);
      text(s, 'evidence-initial', 'A ten went missing\nduring regrouping', 80, 302, 335, 150, 36, true);
      text(s, 'evidence-help', 'A visual explanation\nmade the exchange explicit', 465, 302, 335, 160, 34, true);
      text(s, 'evidence-check', 'A new problem\nshows current performance', 850, 302, 335, 160, 34, true);
      text(s, 'evidence-boundary', 'Helped success, independent performance, and later recall stay separate.', 80, 565, 1100, 94, 32, false, C.soft);
    } else if (n === 7) {
      s = slide(presentation, 'Implementation and next integration', n);
      text(s, 'working-heading', 'Implemented', 80, 221, 500, 55, 40, true);
      text(s, 'working-body', 'Authored regrouping lesson\nLearning and session rules\nEvidence validation\nOpenAI assessment adapter', 80, 310, 520, 254, 31);
      text(s, 'next-heading', 'Still to connect', 700, 221, 480, 55, 40, true);
      text(s, 'next-body', 'Partner’s student profiles\nComplete browser journey\nDrawing and audio interaction\nTeacher browser view', 700, 310, 480, 254, 31);
      text(s, 'implementation-limit', 'Presentation preview: synthetic profiles and scripted personalization', 80, 624, 1100, 36, 22, false, C.soft);
    } else if (n === 8) {
      s = slide(presentation, 'One connected student journey', n, true);
      text(s, 'close-main', 'A profile that informs teaching.\nWork that informs the next step.', 80, 230, 1120, 196, 58, true, C.cream);
      text(s, 'close-next', 'Next milestone: connect both components in one repeatable demo.', 80, 484, 1040, 98, 34, false, C.lime);
      text(s, 'close-team', 'Smart Pants', 80, 622, 640, 42, 27, true, C.cream);
    }
    if (!s) throw new Error(`Unknown slide ${n}`);
    s.speakerNotes.text = slideNotes[n - 1];
  }
  return { slides: presentation.slides.items.length };
}

export async function addCoverImage({ presentation, input }) {
  const s = presentation.slides.getItem(0);
  s.images.add({ path: input.path, alt: 'Illustrated Smart Pants team character beside math learning materials',
    fit: 'contain', position: { left: 740, top: 158, width: 460, height: 460 } });
  s.speakerNotes.text = slideNotes[0] + '\nCover illustration: AI-generated with the built-in image generation tool; exact prompt in presentation/assets/README.md.';
}

export async function addDemoScreenshot({ presentation, input }) {
  const s = presentation.slides.getItem(4);
  s.images.add({ path: input.path, alt: 'Actual Smart Pants integration preview with a synthetic sample profile',
    fit: 'contain', position: { left: 80, top: 242, width: 1110, height: 366 } });
  s.speakerNotes.text = slideNotes[4] + '\nScreenshot: locally exercised presentation demo, synthetic data.';
}
