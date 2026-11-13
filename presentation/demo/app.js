import {profiles, prepareDemo} from './scenario.mjs';

const stage = document.querySelector('#stage');
let demo;
let state;
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const profile = () => profiles.find(item => item.id === state.profile);
const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4 10-10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function reset() {
  state = {stage: 0, profile: 'maya', sample: 'missing', first: null, help: false, traded: false, corrected: null, check: null};
  render();
}

function blocks(tens, ones, extra = '') {
  return `<div class="blocks ${extra}" role="img" aria-label="${tens} tens and ${ones} ones"><div class="rods">${Array.from({length: tens}, () => '<i class="rod"></i>').join('')}</div><div class="dots">${Array.from({length: ones}, () => '<i class="dot"></i>').join('')}</div></div>`;
}

function learnerPill() {
  const p = profile();
  return `<div class="learner-pill"><span class="avatar mini ${p.color}">${p.initial}</span><span>${p.name}’s learning desk</span><span class="pill-note">Sample profile</span></div>`;
}

function renderProfile() {
  return `<section class="profile-layout">
    <div class="profile-intro"><p class="small-caption">Every learner has a starting point.</p><h1>Meet the person<br>behind the answer.</h1><p class="intro-copy">A student profile helps us choose how to start the conversation. The math goal stays the same.</p>
      <div class="learning-object"><div class="object-equation"><span>27</span><b>+</b><span>18</span></div><div class="object-underline"></div><p>One concept.<br>More than one way in.</p><span class="object-star" aria-hidden="true">✳</span></div>
    </div>
    <div class="profile-picker"><p class="section-label">Choose a prepared student profile</p><div class="profiles" role="group" aria-label="Synthetic student profiles">${profiles.map(p => `<button class="profile-card ${p.id === state.profile ? 'selected' : ''}" data-action="profile" data-profile="${p.id}" aria-pressed="${p.id === state.profile}"><span class="profile-top"><span class="avatar ${p.color}">${p.initial}</span><span><strong>${p.name}</strong><small>Grade 2 · synthetic profile</small></span><span class="selected-check">${p.id === state.profile ? icon : ''}</span></span><span class="profile-quote">“${p.preference}”</span><span class="profile-description">${p.description}</span></button>`).join('')}</div>
      <div class="invitation"><span class="section-label">The opening changes with the profile</span><p>“${profile().invitation}”</p><div class="tags">${profile().tags.map(tag => `<span>${tag}</span>`).join('')}</div></div>
      <button class="primary full" data-action="start">Start ${profile().name}’s lesson <span aria-hidden="true">↗</span></button>
      <p class="tiny">Preview profiles are hand-authored. Your partner’s assessment will supply this context after integration.</p>
    </div>
  </section>`;
}

const sampleLabels = {missing: 'A missing ten', procedure: 'A rule without meaning', guess: 'A correct guess'};

function renderLesson() {
  const sample = demo.assess(state.sample);
  const p = profile();
  let response = '';
  if (state.first && !state.help) {
    response = state.first.result.outcome === 'D' ? `<div class="feedback support"><span class="section-label">Evidence-based next step</span><h3>Let’s look at that missing ten.</h3><p>The explanation keeps 5 ones but drops the new ten. Offer a visual exchange, then check again.</p><button class="primary" data-action="help">Show teaching step</button></div>` : `<div class="feedback"><span class="section-label">The answer alone is not enough</span><h3>“${escape(state.first.result.feedback)}”</h3><p>A correct answer leaves the exchange reasoning unestablished.</p><button class="secondary" data-action="missing">Try the missing-ten example</button></div>`;
  }
  if (state.help) {
    const step = demo.help.visual.steps[state.traded ? 3 : 2].split('\n')[0];
    response = `<div class="feedback teaching"><span class="section-label">Authored teaching · practice now uses help</span><h3>${state.traded ? 'Same amount. A new arrangement.' : 'Ten ones can become one ten.'}</h3><p>${escape(step)}</p><div class="trade-caption">${state.traded ? '4 tens + 5 ones = 45' : '3 tens + 15 ones = 45'}</div><button class="primary" data-action="${state.traded ? 'correct' : 'trade'}">${state.traded ? 'Show corrected attempt' : 'Trade 10 ones for 1 ten'}</button></div>`;
  }
  return `${learnerPill()}<div class="stage-heading"><div><h1>Same goal.<br>A different invitation.</h1><p>${p.invitation}</p></div><div class="objective">Our math goal<strong>10 ones = 1 ten</strong><span>Grade 2 · regrouping</span></div></div>
    <section class="lesson-grid"><div class="math-board"><div class="board-top"><span>Let’s work it out</span><span class="board-chip">${state.help ? 'Teaching view' : 'Practice'}</span></div><div class="equation">27 <span>+</span> 18 <span>=</span> <strong>${state.traded ? '45' : '?'}</strong></div><div class="board-divider"></div>${state.help ? `${blocks(state.traded ? 4 : 3, state.traded ? 5 : 15, state.traded ? 'traded' : '')}<p class="board-note">${state.traded ? 'One new ten. Five ones left.' : 'Three tens and fifteen ones.'}</p>` : `<div class="number-groups"><div>${blocks(2, 7)}<p>2 tens + 7 ones</p></div><span class="group-plus">+</span><div>${blocks(1, 8)}<p>1 ten + 8 ones</p></div></div><p class="board-note">${p.id === 'maya' ? 'Take one small step: start with the ones.' : 'What happens when the ones add up to more than ten?'}</p>`}<div class="board-footer"><span class="pencil" aria-hidden="true">✎</span> A prepared visual example; drawing capture is pending.</div></div>
    <div class="reasoning-panel"><p class="section-label">Prepared learner explanation</p><div class="sample-options" role="group" aria-label="Choose explanation example">${Object.entries(sampleLabels).map(([key, label]) => `<button class="sample ${key === state.sample ? 'active' : ''}" data-action="sample" data-sample="${key}" aria-pressed="${key === state.sample}">${label}</button>`).join('')}</div><blockquote>${escape(sample.input.turns[0].text)}</blockquote>${state.first ? response : `<button class="primary" data-action="assess">Check this sample</button><p class="tiny">The existing core checks grounded evidence. This prepared observation is not generated by a model.</p>`}</div></section>`;
}

function renderCheck() {
  const record = demo.assess('supported', {fresh: true});
  return `${learnerPill()}<div class="stage-heading"><div><h1>Now try a new one.<br>Without help.</h1><p>Correcting the practice is a start. A fresh problem checks the same idea independently.</p></div><div class="status-note">${icon}<span>27 + 18 = 45<strong>Correct with help</strong></span></div></div>
    <section class="check-grid"><div class="fresh-board"><span class="board-chip">Fresh independent check</span><div class="equation">36 <span>+</span> 27 <span>=</span> <strong>${state.check ? '63' : '?'}</strong></div><p>Show how you know. No worked example on this problem.</p>${state.check ? '<div class="fresh-groups"><span>5 tens</span><span>13 ones</span><span class="trade-equals">=</span><span>6 tens</span><span>3 ones</span></div>' : ''}</div><div class="check-panel"><p class="section-label">Prepared independent explanation</p><blockquote>${escape(record.input.turns[0].text)}</blockquote>${state.check ? `<div class="feedback success"><span class="success-mark">${icon}</span><h3>Shown on a new problem.</h3><p>${escape(state.check.result.feedback)}</p><p class="tiny">Freshness and independence are scripted assumptions in this preview. This is not a mastery claim.</p><button class="primary" data-action="teacher">See the teacher evidence</button></div>` : `<button class="primary" data-action="check">Check the new problem</button><p class="tiny">This example supplies no help on the fresh task. Its observation is still a prepared fixture.</p>`}</div></section>`;
}

function renderTeacher() {
  const evidence = demo.evidence([state.first, state.corrected, state.check]);
  return `<div class="stage-heading teacher-heading"><div><p class="small-caption">A teacher sees the journey, not just a score.</p><h1>The evidence tells<br>the learning story.</h1></div><div class="learner-summary"><span class="avatar ${profile().color}">${profile().initial}</span><span><strong>${profile().name}</strong>Sample student · Grade 2</span></div></div>
  <section class="teacher-grid"><div class="evidence-story"><div class="evidence-entry"><span class="timeline-point coral"></span><div><span class="section-label">Practice · 27 + 18</span><h3>The new ten was left out.</h3><p>“I keep five ones and ignore the ten in fifteen.”</p><span class="evidence-tag coral">Support needed</span></div></div><div class="evidence-entry"><span class="timeline-point lime"></span><div><span class="section-label">After visual teaching · 27 + 18</span><h3>The exchange is shown with help.</h3><p>3 tens + 15 ones becomes 4 tens + 5 ones.</p><span class="evidence-tag">Independent check still needed</span></div></div><div class="evidence-entry"><span class="timeline-point green"></span><div><span class="section-label">Fresh check · 36 + 27</span><h3>The exchange is shown independently.</h3><p>5 tens + 13 ones becomes 6 tens + 3 ones.</p><span class="evidence-tag green">Fresh check demonstrated</span></div></div></div>
  <div class="teacher-conclusion"><span class="section-label">Computed by the learning core</span><h2>${evidence.finding.status === 'cleared' ? 'This need clears.<br>The history stays.' : 'This need stays visible.'}</h2><dl><div><dt>Current finding</dt><dd>${evidence.finding.status === 'cleared' ? 'Cleared after fresh check' : escape(evidence.finding.status)}</dd></div><div><dt>Independent evidence</dt><dd>${escape(evidence.independentStatus.replaceAll('_', ' '))}</dd></div><div><dt>Next teaching step</dt><dd>Revisit after intervening work</dd></div></dl><p>No claim of lasting mastery. Later review is still pending.</p><button class="primary" data-action="reset">Try another profile</button></div></section><div class="closing-line">Know the learner. Teach the concept. Check the understanding.</div>`;
}

function render(focus = true) {
  [...document.querySelectorAll('#stepper li')].forEach((item, index) => {
    if (index === state.stage) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
    item.classList.toggle('complete', index < state.stage);
  });
  stage.innerHTML = [renderProfile, renderLesson, renderCheck, renderTeacher][state.stage]();
  if (focus) {
    stage.focus({preventScroll: true});
    window.scrollTo(0, 0);
  }
}

stage.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  switch (button.dataset.action) {
    case 'profile':
      state.profile = button.dataset.profile;
      render(false);
      stage.querySelector(`[data-profile="${state.profile}"]`).focus({preventScroll: true});
      return;
    case 'start': state.stage = 1; break;
    case 'sample': state.sample = button.dataset.sample; state.first = null; state.help = false; state.traded = false; break;
    case 'assess': state.first = demo.assess(state.sample); break;
    case 'missing': state.sample = 'missing'; state.first = null; break;
    case 'help': state.help = true; break;
    case 'trade': state.traded = true; break;
    case 'correct': state.corrected = demo.assess('supported', {assisted: true}); state.stage = 2; break;
    case 'check': state.check = demo.assess('supported', {fresh: true}); break;
    case 'teacher': state.stage = 3; break;
    case 'reset': reset(); return;
  }
  render();
});
document.querySelector('#reset').addEventListener('click', () => {if (demo) reset();});

try {
  const responses = await Promise.all([fetch('/lesson.json'), fetch('/fixtures.json')]);
  if (responses.some(response => !response.ok)) throw new Error('Prepared content unavailable');
  const [lesson, catalog] = await Promise.all(responses.map(response => response.json()));
  demo = prepareDemo(lesson, catalog);
  reset();
} catch {
  stage.innerHTML = '<section class="load-error"><h1>The learning desk could not open.</h1><p>Start the demo from the repository root with <code>node presentation/demo-server.mjs</code>, then reload this page.</p></section>';
}
