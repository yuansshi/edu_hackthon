import { readFile } from "node:fs/promises";
const ROOT = new URL("./", import.meta.url);
const ink = "#163C32";
function text(
  slide,
  name,
  value,
  left,
  top,
  width,
  height,
  fontSize,
  bold = false,
) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    fill: "none",
    line: { fill: "none", width: 0 },
    position: { left, top, width, height },
  });
  shape.text = value;
  shape.text.style = {
    typeface: "Avenir Next",
    fontSize,
    bold,
    color: ink,
    insets: 0,
    wrap: "square",
    autoFit: "none",
  };
  return shape;
}
export async function buildSubmission({ presentation, input }) {
  const copy = JSON.parse(
    await readFile(new URL("submission-copy.json", ROOT), "utf8"),
  );
  const old = presentation.slides.items.length;
  const one = presentation.slides.add({ width: 1280, height: 720 });
  one.background.fill = "#F7F6ED";
  text(one, "team-title", copy.slides[0].title, 64, 54, 1150, 74, 43, true);
  text(one, "yuan", "Yuan Shi", 68, 205, 760, 66, 46, true);
  text(
    one,
    "yuan-role",
    "Software Engineer\nTutoring, reasoning and verification",
    68,
    290,
    770,
    105,
    29,
  );
  const link = text(
    one,
    "linkedin",
    "LinkedIn · Yuan Shi",
    68,
    412,
    710,
    40,
    24,
  );
  link.text.get("LinkedIn · Yuan Shi").link = {
    uri: copy.linkedin,
    isExternal: true,
  };
  text(one, "heather", "Heather Bian", 68, 495, 760, 60, 42, true);
  text(
    one,
    "heather-role",
    "Product Marketing · Discovery and student profiles",
    68,
    566,
    1090,
    52,
    27,
  );
  text(
    one,
    "track",
    "Track: Real-Time Multi-Modal Tutors & Agents",
    68,
    652,
    1100,
    34,
    22,
  );
  one.images.add({
    path: input.coverPath,
    fit: "contain",
    alt: "Smart Pants illustrated team character",
    position: { left: 895, top: 190, width: 320, height: 320 },
  });
  one.speakerNotes.text =
    "0:00–0:25. We are Smart Pants: Yuan Shi, Software Engineer, and Heather Bian, Product Marketing. Heather builds Discovery and student profiles; Yuan builds tutoring, reasoning and verification. Our goal is one connected learner journey. Team names/backgrounds supplied by the user; LinkedIn verified in the user’s existing profile tab. Cover artwork is AI-generated; prompt in presentation/assets/README.md.";
  const two = presentation.slides.add({ width: 1280, height: 720 });
  two.background.fill = "#FFFFFF";
  text(two, "solution-title", copy.slides[1].title, 64, 47, 1150, 70, 43, true);
  text(two, "problem-label", "Problem", 68, 155, 570, 35, 24, true);
  text(
    two,
    "problem",
    "A correct answer can hide a misunderstanding. Learners need different ways into a lesson.",
    68,
    204,
    570,
    110,
    28,
  );
  text(two, "solution-label", "Our solution", 68, 342, 570, 35, 24, true);
  text(
    two,
    "solution",
    "Discovery answers → reviewed profile → customized lesson → fresh check",
    68,
    394,
    570,
    117,
    31,
    true,
  );
  two.images.add({
    path: input.demoPath,
    fit: "contain",
    alt: "Actual profile-driven lesson preview using synthetic Maya data",
    position: { left: 705, top: 150, width: 510, height: 342 },
  });
  const demo = text(
    two,
    "live-link",
    "Open the Smart Pants demo",
    715,
    510,
    480,
    42,
    24,
    true,
  );
  if (input.liveUrl)
    demo.text.get("Open the Smart Pants demo").link = {
      uri: input.liveUrl,
      isExternal: true,
    };
  text(
    two,
    "modalities",
    "Modalities: text + visual math; optional device voice for Discovery prompts",
    68,
    562,
    1140,
    38,
    23,
  );
  text(
    two,
    "outcome",
    "Learning check: a fresh unaided problem; learning gains not yet validated",
    68,
    608,
    1140,
    38,
    23,
  );
  text(
    two,
    "data",
    "Synthetic data only · prepared math responses · live voice/drawing assessment in progress",
    68,
    654,
    1140,
    34,
    22,
  );
  two.speakerNotes.text =
    "0:25–2:05. Explain the problem and profile-to-lesson flow in30seconds, then use a60-second live walkthrough: Load Maya example → Back to my profile → Build my trial routine → Build my lesson. Open the rationale and start visual practice if time permits. Prepared synthetic answers use real Discovery model/report functions; confirmed choices drive a real mapper. Math observations remain prepared fixtures evaluated by the existing core. Live drawing/voice assessment and full adaptive tutoring remain in development. A synthetic Grade5 learner uses teacher-selected foundational review; the profile does not set ability or placement. Learning gains are unvalidated. Current preview includes text, visual representations, and optional existing local-device prompt read-aloud. If URL fails, narrate the screenshot. Sources: app/INTEGRATION.md; app/src/handoff.ts; lessonDesign.ts; lessonPractice.mjs.";
  const three = presentation.slides.add({ width: 1280, height: 720 });
  three.background.fill = "#F7F6ED";
  text(three, "fit-title", copy.slides[2].title, 64, 54, 1150, 70, 43, true);
  text(three, "fit-label", "Team–problem fit", 68, 177, 1120, 40, 26, true);
  text(
    three,
    "fit",
    "Learner-facing product thinking + reliable, testable tutoring logic",
    68,
    233,
    1100,
    90,
    36,
    true,
  );
  text(
    three,
    "experience-label",
    "Relevant experience",
    68,
    352,
    1120,
    40,
    25,
    true,
  );
  text(
    three,
    "experience",
    "Yuan: software engineering, tutoring and reasoning\nHeather: product marketing, Discovery and student profiles",
    68,
    408,
    1120,
    100,
    29,
  );
  text(
    three,
    "next-label",
    "What we would build next",
    68,
    548,
    1120,
    38,
    25,
    true,
  );
  text(
    three,
    "next",
    "Complete live multimodal tutoring, expand lessons, and evaluate independent application with learners.",
    68,
    605,
    1120,
    83,
    29,
  );
  three.speakerNotes.text =
    "2:05–2:50. Our workstreams bring complementary product and engineering roles to one concrete experience. A reviewed profile already shapes this lesson preview. Next connect live multimodal tutoring and evaluate whether learners can apply the idea on a fresh task. No validated psychological assessment or measured learning gains are claimed. Finish by2:50, leaving ten seconds of buffer. Names/roles user-confirmed; contributions follow shared repository split.";
  presentation.slides.keep([old, old + 1, old + 2]);
  return { slides: presentation.slides.items.length };
}
