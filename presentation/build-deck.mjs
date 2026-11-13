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
  text(s, `page-${number}`, `${pitchSlideNumbers.indexOf(number) + 1 || number}`, 1180, 663, 40, 28, 18, false, dark ? C.lime : C.soft);
  return s;
}

export const pitchSlideNumbers = [1, 2, 3, 5, 7, 8];

export const slideNotes = [
  "0:00–0:10. SAY: We’re Smart Pants. We’re building math tutoring that uses a student’s profile to shape the conversation, then checks their reasoning. Source: user direction; README.md.",
  "0:10–0:35. SAY: All three students wrote 45 for 27 plus 18. One guessed. One followed the carry rule. One can explain that ten ones became one ten. Those responses need different next questions. The number alone gives us an incomplete picture. Sources: content/demo-lesson.json; test/fixtures/regrouping-cases.json; src/learning.mjs.",
  "0:35–1:00. SAY: Both workstreams share this repository. Our partner is still building the personality assessment and student profiles. Yuanshi is building tutoring and reasoning. Maya and Leo are synthetic examples of adjustable interaction preferences. The profile should shape the teaching approach while the mathematical requirements stay consistent. Source: user clarification; README.md.",
  "BACKUP ONLY. The learner shows work, receives targeted help, then tries a fresh problem without that help. Later review stays separate. Sources: design_resolution/learning_contract.md; src/learning.mjs.",
  "1:00–2:00. SAY: This is a scripted integration preview using the real math rules. Maya starts with a visual example. Her explanation drops the new ten, giving 35. We offer the exchange: ten ones become one ten, so the amount stays 45. That correction used help. On a fresh problem, the prepared response shows the exchange independently. The teacher sees the earlier difficulty, the help, and the new evidence. Later review remains pending. ACTIONS: Start Maya’s lesson → Check this sample → Show teaching step → Trade 10 ones for 1 ten → Show corrected attempt → Check the new problem → See the teacher evidence. Keep Maya only; Leo and alternate responses are for Q&A. Switch to http://127.0.0.1:3100 at 1:00 and back to slide 5 at 2:00. FALLBACK: if the browser fails, explain the screenshot for the same minute; do not troubleshoot on stage. Prepared profiles, responses, freshness and independence assumptions are fixtures, not live partner assessment or live AI calls.",
  "BACKUP ONLY. Keep the original difficulty, the help given, and the fresh check visible. Say demonstrated on this check, not mastered. The session projection and correction rules are separate core logic. Sources: src/session-state.mjs; design_resolution/learning_contract.md.",
  "2:00–2:35. SAY: The authored lesson, learning rules, session state, and assessment adapter are implemented. This preview exercises deterministic math rules with prepared evidence. Her personality and profile component is still being developed in our shared repository. The next integration will pass that profile into the tutoring interaction and connect the complete browser journey. We have not yet measured learning outcomes with children. Sources: README.md; src/learning.mjs; src/session-state.mjs; src/assessment-adapter.mjs; user clarification.",
  "2:35–2:50. SAY: Our next milestone is one connected experience: create a student profile, tailor the teaching interaction, and give the teacher evidence from a fresh check. We’re Smart Pants. Thank you. TIMING: finish by 2:50; keep 2:50–3:00 as transition and technical buffer. Source: user integration goal."
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
      text(s, 'profile-disclosure', 'Synthetic profiles · partner’s assessment in development in this repository', 80, 624, 1080, 38, 22, false, C.soft);
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
      text(s, 'next-heading', 'In progress', 700, 221, 480, 55, 40, true);
      text(s, 'next-body', 'Partner: personality + profiles\nProfile → tutor connection\nComplete browser journey\nTeacher browser view', 700, 310, 480, 254, 31);
      text(s, 'implementation-limit', 'Same repository · partner’s profiles in development · synthetic preview', 80, 624, 1100, 36, 22, false, C.soft);
    } else if (n === 8) {
      s = slide(presentation, 'One connected student journey', n, true);
      text(s, 'close-main', 'A profile that informs teaching.\nWork that informs the next step.', 80, 230, 1120, 196, 58, true, C.cream);
      text(s, 'close-next', 'Next: connect student profiles to tutoring in our shared repository.', 80, 484, 1040, 98, 34, false, C.lime);
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
  const s = presentation.slides.getItem(pitchSlideNumbers.indexOf(5));
  s.images.add({ path: input.path, alt: 'Actual Smart Pants integration preview with a synthetic sample profile',
    fit: 'contain', position: { left: 80, top: 242, width: 1110, height: 366 } });
  s.speakerNotes.text = slideNotes[4] + '\nScreenshot: locally exercised presentation demo, synthetic data.';
}

export async function adaptToThreeMinutes({ presentation }) {
  if (presentation.slides.items.length === 8) presentation.slides.keep([0, 1, 2, 4, 6, 7]);
  if (presentation.slides.items.length !== 6) throw new Error('Expected the Smart Pants six-slide pitch');
  const inspected = await presentation.inspect({ select: '$.slides[*].elements[*]', include: ['id', 'name'] });
  const set = (name, value) => {
    const record = inspected.records.find(item => item.name === name);
    if (!record) throw new Error(`Missing pitch element: ${name}`);
    presentation.resolve(record.id).text = value;
  };
  pitchSlideNumbers.forEach((original, index) => {
    presentation.slides.getItem(index).speakerNotes.text = slideNotes[original - 1];
    if (original !== 1) set(`page-${original}`, String(index + 1));
  });
  set('profile-disclosure', 'Synthetic profiles · partner’s assessment in development in this repository');
  set('next-heading', 'In progress');
  set('next-body', 'Partner: personality + profiles\nProfile → tutor connection\nComplete browser journey\nTeacher browser view');
  set('implementation-limit', 'Same repository · partner’s profiles in development · synthetic preview');
  set('close-next', 'Next: connect student profiles to tutoring in our shared repository.');
  presentation.slides.getItem(0).speakerNotes.append('\nCover illustration: AI-generated; exact prompt in presentation/assets/README.md.');
  presentation.slides.getItem(3).speakerNotes.append('\nScreenshot: locally exercised preview with synthetic data.');
  return { slides: presentation.slides.items.length, demoSeconds: 60, finishBy: '2:50', bufferSeconds: 10 };
}
