import {profiles} from './scenario.mjs';

const stage = document.querySelector('#stage');
const messages = [];
let context;
let snapshot;
let selected = 'maya';
let busy = false;
let voice = false;
let recording;
let captureStream;
let captureTimer;
let pendingTranscript;
let playback;
let playbackUrl;
let generation = 0;
let controller;
let speechController;
let playBlocked = false;
let draftAnswer = '';
let draftMessage = '';
let statusText = '';
let deskOpen = false;
let importedPlan = null;
const cameFromDiscovery = new URLSearchParams(location.search).get('from') === 'discovery';
const escape = value => String(value).replace(/[&<>"']/g, character =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[character]));
const profile = () => importedPlan
  ? {name: importedPlan.learner, invitation: importedPlan.opening}
  : profiles.find(item => item.id === selected);
const learnerId = () => importedPlan?.learnerId ?? (selected === 'maya' ? 'A' : 'B');
const latestAttempt = () => snapshot?.attempts.find(attempt => attempt.attemptId === snapshot.assignment.activeAttemptId);
const status = message => {
  statusText = message;
  const element = document.querySelector('#chat-status');
  if (element) element.textContent = message;
};

async function request(path, {method = 'GET', body, signal, headers = {}} = {}) {
  const response = await fetch(path, {
    method, cache: 'no-store', signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(5000)]),
    headers: {...(body && !(body instanceof Blob) ? {'Content-Type': 'application/json'} : {}), ...headers},
    body: body instanceof Blob ? body : body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'The request could not be completed.');
  }
  return response.json();
}

function envelope() {
  return {runId: context.runId, sessionId: context.sessionId, idempotencyKey: crypto.randomUUID()};
}

function assignmentEnvelope() {
  return {...envelope(), learnerId: learnerId(), assignmentId: snapshot.assignment.assignmentId,
    expectedAssignmentRevision: snapshot.assignment.revision,
    expectedTargetCorrectionRevision: snapshot.targets.find(target => target.targetId === snapshot.assignment.targetId).correctionRevision};
}

function attemptEnvelope(attempt = latestAttempt()) {
  return {...assignmentEnvelope(), expectedEvidenceVersion: attempt.evidenceVersion};
}

async function refresh(signal) {
  const query = new URLSearchParams({runId: context.runId, sessionId: context.sessionId, learnerId: learnerId()});
  const current = await request(`/api/student?${query}`, {signal});
  if (current.runId === context.runId && current.sessionId === context.sessionId &&
      (!snapshot || current.revision >= snapshot.revision)) snapshot = current;
}

function stopPlayback() {
  speechController?.abort();
  speechController = null;
  playBlocked = false;
  const button = document.querySelector('#play-reply');
  if (button) button.hidden = true;
  if (playback) {
    playback.pause();
    playback.removeAttribute('src');
    playback.load();
    playback = null;
  }
  if (playbackUrl) URL.revokeObjectURL(playbackUrl);
  playbackUrl = null;
}

async function speak(message, token) {
  if (!voice || !message.speech) return;
  stopPlayback();
  speechController = new AbortController();
  try {
    const response = await fetch('/api/speech', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      signal: AbortSignal.any([speechController.signal, AbortSignal.timeout(50_000)]),
      body: JSON.stringify({runId: context.runId, sessionId: context.sessionId, learnerId: learnerId(), ...message.speech})
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Voice is unavailable.');
    }
    const blob = await response.blob();
    if (token !== generation || !voice) return;
    playbackUrl = URL.createObjectURL(blob);
    playback = new Audio(playbackUrl);
    playback.onended = stopPlayback;
    playback.onerror = () => {
      stopPlayback();
      status('Audio could not play. Your tutor’s words are still in the chat.');
    };
    try {
      await playback.play();
    } catch {
      playBlocked = true;
      status('Tap “Play reply” to let your browser play the voice.');
      const button = document.querySelector('#play-reply');
      button.hidden = false;
    }
  } catch (error) {
    if (token === generation && error.name !== 'AbortError') status(`${error.message} You can keep typing.`);
  }
}

function addMessage(role, text, extra = {}) {
  const message = {id: crypto.randomUUID(), role, text, ...extra};
  messages.push(message);
  renderMessages();
  return message;
}

function renderMessages() {
  const log = document.querySelector('#chat-log');
  if (!log) return;
  log.innerHTML = messages.map(message => `<article class="message ${message.role}">
    <span class="message-author">${message.role === 'student' ? escape(profile().name) : 'Pip · your math buddy'}</span>
    <p>${escape(message.text)}</p>${message.kind === 'transcript' ? '<span class="message-note">Voice transcript · review before sending</span>' :
      message.kind === 'voice' ? '<span class="message-note">Reviewed voice transcript</span>' : ''}
    </article>`).join('');
  log.scrollTop = log.scrollHeight;
}

function blocks(tens, ones) {
  return `<div class="blocks" role="img" aria-label="${tens} tens and ${ones} ones">
    <div class="rods">${'<i class="rod"></i>'.repeat(tens)}</div>
    <div class="dots">${'<i class="dot"></i>'.repeat(ones)}</div></div>`;
}

function renderProfiles() {
  stage.innerHTML = `<section class="welcome"><span class="buddy-face" aria-hidden="true">✳</span>
    <h1>A little math.<br>A big adventure.</h1><p>Who’s learning with Pip today?</p>
    <a class="discovery-link" href="/discovery/">Start with Discovery →</a>
    <div class="profiles" role="group" aria-label="Synthetic student profiles">${profiles.map(p =>
      `<button class="profile-card ${p.id === selected ? 'selected' : ''}" data-action="profile" data-profile="${p.id}" aria-pressed="${p.id === selected}">
      <span class="avatar ${p.color}">${p.initial}</span><strong>${p.name}</strong><small>${escape(p.preference)}</small></button>`).join('')}</div>
    <button class="primary" data-action="start">Let’s play with numbers ↗</button>
    ${!context ? '<p class="connection-notice" role="status">The preview server needs a restart. You can explore the layout, but chat and voice are not connected.</p>' : ''}
    <p class="tiny">Two sample profiles, not a real personality assessment.</p></section>`;
}

function renderConnectionProblem(message) {
  deskOpen = false;
  stage.innerHTML = `<section class="load-error" role="alert">
    <h1>Let’s reconnect your plan.</h1><p>${escape(message)}</p>
    <div class="reconnect-actions"><button class="primary" data-action="reconnect">Try connecting again</button>
    <a class="quiet discovery-link" href="/discovery/">Back to Discovery</a></div></section>`;
}

function renderArrangement() {
  if (!importedPlan) return '';
  return `<section class="arrangement-banner" aria-label="Your Discovery teaching plan">
    <div><span class="arrangement-label">Discovery → your math session</span>
      <h2>Learning with ${escape(importedPlan.learner)}</h2>
      <p>${escape(importedPlan.pacing)}</p><p>${escape(importedPlan.encouragement)}</p>
      ${importedPlan.supportLabels.length ? `<ul aria-label="Your chosen supports">${importedPlan.supportLabels.map(label => `<li>${escape(label)}</li>`).join('')}</ul>` : ''}
      <p class="arrangement-note">Teacher-selected foundational review. Your choices shape the interaction; they do not choose your math level.</p>
    </div><a class="quiet discovery-link" href="/discovery/">Start a different plan</a></section>`;
}

function renderDesk() {
  const problem = snapshot?.assignment.problem ?? {left: 27, right: 18, operation: 'add'};
  const isPractice = !snapshot || snapshot.assignment.purpose === 'practice';
  const offered = (snapshot?.allowedActions ?? []).filter(action =>
    action.effect === 'new_assignment' || ['teach-addition-exchange', 'teach-subtraction-exchange', 'request-teacher-review', 'finish-session'].includes(action.actionId));
  const visualWasRequested = snapshot?.actions.some(action =>
    action.assignmentId === snapshot.assignment.assignmentId && action.visual);
  const showVisual = isPractice && (importedPlan?.approach !== 'challenge' || visualWasRequested);
  stage.innerHTML = `${renderArrangement()}<section class="learning-desk">
    <aside class="puzzle-card"><div class="puzzle-label"><span>Number adventure</span><span class="board-chip">${isPractice ? 'Practice' : 'On your own'}</span></div>
      <h1 class="puzzle-equation">${problem.left} ${problem.operation === 'add' ? '+' : '−'} ${problem.right} = ?</h1>
      <p>What do you think? Tell Pip your answer and how you got there.</p>
      ${showVisual ? `<div class="number-groups">${blocks(Math.floor(problem.left / 10), problem.left % 10)}<span>${problem.operation === 'add' ? '+' : '−'}</span>${blocks(Math.floor(problem.right / 10), problem.right % 10)}</div>` : '<div class="puzzle-star" aria-hidden="true">✦</div>'}
      ${!importedPlan ? '<a class="discovery-link small-link" href="/discovery/">Choose a plan in Discovery →</a>' : ''}
      <div class="desk-actions">${offered.map(action => `<button class="${action.effect === 'new_assignment' ? 'primary' : 'quiet'}" data-action="next" data-id="${action.actionId}">
        ${action.effect === 'new_assignment' ? 'Next puzzle ↗' : action.actionId.startsWith('teach-') ? 'A little help' : action.actionId === 'finish-session' ? 'Finish for now' : 'Ask my teacher'}</button>`).join('')}</div>
      <details class="evidence-details"><summary>Teacher evidence</summary>${snapshot ? snapshot.targets.map(target =>
        `<p>${target.targetId === 'addition-exchange' ? 'Addition' : 'Subtraction'} · ${escape(target.finding.status)}<br>
        ${escape(target.independentStatus.replaceAll('_', ' '))} · later review ${escape(target.review.status.replaceAll('_', ' '))}</p>`).join('') : '<p>No connection. No assessment or progress has been recorded.</p>'}</details>
    </aside>
    <section class="chat-card" aria-label="Chat with your math tutor"><header class="chat-heading"><span class="buddy-face mini" aria-hidden="true">✳</span>
      <div><strong>Pip</strong><small>Your patient math buddy</small></div>
      <button class="quiet voice-toggle" data-action="voice" aria-pressed="${voice}" ${context ? '' : 'disabled'}>${voice ? 'Voice on' : 'Voice off'}</button></header>
      <div id="chat-log" class="chat-log" role="log" aria-label="Conversation" aria-live="polite"></div>
      <p id="chat-status" class="chat-status" role="status">${escape(statusText)}</p>
      <button id="play-reply" class="quiet play-reply" data-action="play" ${playBlocked ? '' : 'hidden'}>Play reply</button>
      <form id="chat-form" class="chat-composer">
        <div class="answer-field"><label for="answer">Your answer</label><input id="answer" name="answer" type="text" inputmode="numeric" maxlength="4" placeholder="?" autocomplete="off" value="${escape(draftAnswer)}"></div>
        <div class="message-field"><label for="message">${pendingTranscript ? 'Review your voice transcript' : 'Message Pip'}</label>
          <textarea id="message" name="message" rows="2" maxlength="4000" placeholder="Type your thinking, or use the mic…">${escape(draftMessage)}</textarea></div>
        <div class="composer-buttons"><button class="mic-button" type="button" data-action="record" aria-label="${recording ? 'Stop recording' : 'Record your thinking'}" ${busy || !context ? 'disabled' : ''}>${recording ? '■' : '●'}<span>${recording ? 'Stop' : 'Mic'}</span></button>
          <button class="send-button" type="submit" aria-label="${pendingTranscript ? 'Send reviewed transcript' : 'Send message'}" ${busy || recording || !context ? 'disabled' : ''}>↑</button></div>
      </form>
      <p class="voice-disclosure">${!context ? 'Server not connected. Messages are not assessed or sent to OpenAI.' :
        context.processingMode === 'live' ? 'OpenAI transcription and assessment. Voice replies are AI-generated, not a human recording.' : 'Prepared processing. Live voice is unavailable in this mode.'}</p>
    </section></section>`;
  renderMessages();
}

function render() {
  document.querySelector('#stepper').hidden = true;
  if (deskOpen) renderDesk();
  else renderProfiles();
}

async function waitForJob(signal) {
  const deadline = performance.now() + 60_000;
  for (;;) {
    if (performance.now() > deadline) throw new Error('The tutor took too long. Reset or submit new work to continue.');
    await refresh(signal);
    const attempt = latestAttempt();
    if (!attempt?.job) {
      if (attempt?.state === 'failed') throw new Error(attempt.error.message);
      return attempt;
    }
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 500);
      function abort() { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); }
      signal.addEventListener('abort', abort, {once: true});
    });
  }
}

async function assess(attempt, signal) {
  const response = await request(`/api/attempts/${attempt.attemptId}/assessment`, {
    method: 'POST', signal,
    body: {...attemptEnvelope(attempt), confirmedTurns: attempt.turns.map(turn => ({
      turnId: turn.turnId, text: pendingTranscript && turn.turnId === pendingTranscript.turnId
        ? document.querySelector('#message').value.trim() : turn.confirmedText ?? turn.recognizedText
    }))}
  });
  snapshot = response.result.student;
  pendingTranscript = null;
  const accepted = await waitForJob(signal);
  const judgment = snapshot.judgments.find(item => item.judgmentId === accepted.acceptedJudgmentId);
  if (!judgment) throw new Error('The tutor needs another try. Your work is still here.');
  const query = new URLSearchParams({runId: context.runId, sessionId: context.sessionId, learnerId: learnerId()});
  const reply = await request(`/api/replies/${judgment.judgmentId}?${query}`, {signal});
  draftAnswer = '';
  draftMessage = '';
  const message = addMessage('tutor', reply.text, {speech: {type: 'judgment', id: judgment.judgmentId}});
  status('');
  render();
  await speak(message, generation);
}

async function send(event) {
  event.preventDefault();
  if (!context) { status('Restart the preview server before sending messages.'); return; }
  if (busy || recording) return;
  let answer = document.querySelector('#answer').value.trim();
  const explanation = document.querySelector('#message').value.trim();
  if (!answer && !explanation) { status('Type an answer or tell Pip what you’re thinking.'); return; }
  if (answer && !/^\d{1,3}$/.test(answer)) { status('Use a whole number for your answer.'); return; }
  if (pendingTranscript && !explanation) { status('Review or replace the transcript before sending it.'); return; }
  answer = answer ? String(Number(answer)) : '';
  busy = true;
  const token = ++generation;
  controller?.abort();
  controller = new AbortController();
  document.querySelector('.send-button').disabled = true;
  stopPlayback();
  try {
    if (pendingTranscript) {
      const reviewed = messages.find(message => message.id === pendingTranscript.messageId);
      reviewed.text = explanation;
      reviewed.kind = 'voice';
      renderMessages();
      status('Pip is thinking…');
      await assess(latestAttempt(), controller.signal);
    } else {
      const text = [answer ? `My answer is ${answer}.` : '', explanation].filter(Boolean).join(' ');
      addMessage('student', text);
      status('Pip is thinking…');
      const previous = latestAttempt();
      let attempt;
      if (!answer && previous?.state === 'needs_clarification') {
        const clarified = await request(`/api/attempts/${previous.attemptId}/clarifications`, {
          method: 'POST', signal: controller.signal, body: {...attemptEnvelope(previous), mode: 'written', text}
        });
        snapshot = clarified.result.student;
        attempt = latestAttempt();
      } else {
        const problem = snapshot.assignment.problem;
        const submitted = await request('/api/attempts', {
          method: 'POST', signal: controller.signal,
          body: {...assignmentEnvelope(), attemptId: crypto.randomUUID(), imagePngBase64: null, strokes: [],
            writtenWorking: `${problem.left} ${problem.operation === 'add' ? '+' : '-'} ${problem.right}${answer ? ` = ${answer}` : ' = ?'}`,
            explanationMode: 'written', initialText: text}
        });
        snapshot = submitted.result.student;
        attempt = latestAttempt();
      }
      await assess(attempt, controller.signal);
    }
  } catch (error) {
    if (token === generation && error.name !== 'AbortError') {
      await refresh().catch(refreshError => status(refreshError.message));
      render();
      status(`${error.message} You can edit your message and try again.`);
    }
  } finally {
    if (token === generation) { busy = false; render(); }
  }
}

function releaseCapture() {
  clearTimeout(captureTimer);
  captureStream?.getTracks().forEach(track => track.stop());
  captureStream = null;
  recording = null;
}

async function record() {
  if (recording) { recording.stop(); return; }
  if (busy || pendingTranscript) { status('Send or edit the current transcript first.'); return; }
  if (draftAnswer && !/^\d{1,3}$/.test(draftAnswer.trim())) { status('Use a whole number for your answer.'); return; }
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    status('This browser cannot record audio. You can type instead.'); return;
  }
  const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(value => MediaRecorder.isTypeSupported(value));
  if (!type) { status('Audio recording is unsupported here. You can type instead.'); return; }
  const token = ++generation;
  controller?.abort();
  controller = new AbortController();
  stopPlayback();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({audio: true});
    if (token !== generation) { stream.getTracks().forEach(track => track.stop()); return; }
    captureStream = stream;
    recording = new MediaRecorder(stream, {mimeType: type});
    let chunks = [];
    let size = 0;
    let tooLarge = false;
    const current = recording;
    current.ondataavailable = event => {
      size += event.data.size;
      if (size > context.limits.audioBytes) {
        tooLarge = true;
        if (current.state === 'recording') current.stop();
      } else if (!tooLarge) chunks.push(event.data);
    };
    current.onerror = () => {
      current.onstop = null;
      chunks = [];
      if (token !== generation) { stream.getTracks().forEach(track => track.stop()); return; }
      releaseCapture();
      status('Recording failed. Please type or record again.');
      render();
    };
    current.onstop = async () => {
      if (recording === current) releaseCapture();
      else stream.getTracks().forEach(track => track.stop());
      if (token !== generation) { chunks = []; return; }
      busy = true;
      render();
      status('Turning your voice into words…');
      let audio = new Blob(chunks, {type});
      chunks = [];
      try {
        if (tooLarge || !audio.size) throw new Error('That recording was too large or empty. Please record again.');
        const problem = snapshot.assignment.problem;
        const submitted = await request('/api/attempts', {
          method: 'POST', signal: controller.signal,
          body: {...assignmentEnvelope(), attemptId: crypto.randomUUID(), imagePngBase64: null, strokes: [],
            writtenWorking: `${problem.left} ${problem.operation === 'add' ? '+' : '-'} ${problem.right} = ${draftAnswer ? String(Number(draftAnswer)) : '?'}`,
            explanationMode: 'spoken', initialText: null}
        });
        snapshot = submitted.result.student;
        const ae = attemptEnvelope();
        const headers = {'Content-Type': type};
        const headerNames = {
          runId: 'X-Run-Id', sessionId: 'X-Session-Id', idempotencyKey: 'X-Idempotency-Key',
          learnerId: 'X-Learner-Id', assignmentId: 'X-Assignment-Id', expectedAssignmentRevision: 'X-Expected-Assignment-Revision',
          expectedEvidenceVersion: 'X-Expected-Evidence-Version', expectedTargetCorrectionRevision: 'X-Expected-Target-Correction-Revision'
        };
        for (const [key, name] of Object.entries(headerNames)) headers[name] = String(ae[key]);
        const uploaded = await request(`/api/attempts/${submitted.result.attemptId}/audio?turnId=${submitted.result.turnId}`, {
          method: 'POST', signal: controller.signal, headers, body: audio
        });
        audio = null;
        snapshot = uploaded.result.student;
        const attempt = await waitForJob(controller.signal);
        const turn = attempt.turns.at(-1);
        const message = addMessage('student', turn.recognizedText, {kind: 'transcript'});
        pendingTranscript = {text: turn.recognizedText, turnId: turn.turnId, messageId: message.id};
        draftMessage = turn.recognizedText;
        render();
        status('Check the words below, then send them to Pip. Nothing has been assessed yet.');
      } catch (error) {
        if (token === generation && error.name !== 'AbortError') status(error.message);
      } finally {
        audio = null;
        if (token === generation) { busy = false; render(); if (pendingTranscript) status('Review the transcript and send it when it looks right.'); }
      }
    };
    voice = true;
    current.start(1000);
    captureTimer = setTimeout(() => { if (current.state === 'recording') current.stop(); }, 60_000);
    render();
    status('Listening… tap Stop when you’re done.');
  } catch (error) {
    if (token !== generation) return;
    releaseCapture();
    status(error.name === 'NotAllowedError' ? 'Microphone access was denied. You can type instead.' : 'Could not start the microphone. You can type instead.');
  }
}

async function action(actionId) {
  if (busy || recording || pendingTranscript) return;
  busy = true;
  const token = ++generation;
  controller?.abort();
  controller = new AbortController();
  stopPlayback();
  try {
    const response = await request(`/api/learners/${learnerId()}/next`, {
      method: 'POST', signal: controller.signal, body: {...assignmentEnvelope(), actionId}
    });
    snapshot = response.result.student;
    const performed = response.result.performedAction;
    if (performed.effect === 'new_assignment') { draftAnswer = ''; draftMessage = ''; }
    const text = performed.visual ? performed.visual.steps.map(step => step.split('\n')[0]).join(' ') : performed.prompt;
    const message = addMessage('tutor', text, {speech: {type: 'action', id: performed.eventId}});
    render();
    await speak(message, token);
  } catch (error) {
    if (token === generation && error.name !== 'AbortError') status(error.message);
  } finally {
    if (token === generation) { busy = false; render(); }
  }
}

async function start() {
  busy = true;
  try {
    if (context) await refresh();
    const greeting = context ? await request(`/api/greeting?${new URLSearchParams({
      runId: context.runId, sessionId: context.sessionId, learnerId: learnerId(),
      assignmentId: snapshot.assignment.assignmentId
    })}`) : {text: `${profile().invitation} Try 27 + 18. Draw or write how you know.`};
    deskOpen = true;
    messages.length = 0;
    addMessage('tutor', greeting.text,
      context ? {speech: {type: 'greeting', id: snapshot.assignment.assignmentId}} : {});
    if (!context) status('The server needs a restart before messages and voice can work. This is a layout preview only.');
    render();
    document.querySelector('#answer').focus();
  } catch (error) { renderConnectionProblem(error.message); }
  finally {
    busy = false;
    if (deskOpen) {
      render();
      document.querySelector('#answer').focus();
    }
  }
}

async function reset() {
  ++generation;
  controller?.abort();
  if (recording?.state === 'recording') { recording.onstop = null; recording.stop(); }
  releaseCapture();
  stopPlayback();
  busy = false;
  voice = false;
  pendingTranscript = null;
  try {
    if (!context) {
      deskOpen = false;
      importedPlan = null;
      draftAnswer = '';
      draftMessage = '';
      messages.length = 0;
      render();
      return;
    }
    const current = await request('/api/context');
    const result = await request('/api/reset', {method: 'POST',
      body: {runId: current.runId, sessionId: current.sessionId, idempotencyKey: crypto.randomUUID(), expectedSessionRevision: current.revision}});
    context = result.result.context;
    importedPlan = null;
    voice = false;
    snapshot = null;
    deskOpen = false;
    draftAnswer = '';
    draftMessage = '';
    statusText = '';
    messages.length = 0;
    render();
  } catch (error) { status(error.message); }
}

stage.addEventListener('submit', event => { if (event.target.id === 'chat-form') void send(event); });
stage.addEventListener('input', event => {
  if (event.target.id === 'answer') draftAnswer = event.target.value;
  if (event.target.id === 'message') draftMessage = event.target.value;
});
stage.addEventListener('keydown', event => {
  if (event.target.id === 'message' && event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    document.querySelector('#chat-form').requestSubmit();
  }
});
stage.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'profile') { selected = button.dataset.profile; render(); }
  if (button.dataset.action === 'reconnect') void connect();
  if (button.dataset.action === 'start') void start();
  if (button.dataset.action === 'record') void record();
  if (button.dataset.action === 'next') void action(button.dataset.id);
  if (button.dataset.action === 'voice') {
    voice = !voice;
    if (!voice) stopPlayback();
    render();
    if (voice) {
      void speak([...messages].reverse().find(message => message.role === 'tutor') ?? {}, generation);
    }
  }
  if (button.dataset.action === 'play' && playback) void playback.play().then(() => {
    playBlocked = false;
    button.hidden = true;
  }).catch(() => status('Your browser could not play this audio.'));
});
document.querySelector('#reset').addEventListener('click', () => void reset());
window.addEventListener('pagehide', () => {
  ++generation;
  controller?.abort();
  if (recording) recording.onstop = null;
  releaseCapture();
  stopPlayback();
});

async function connect() {
  importedPlan = null;
  snapshot = null;
  try {
    context = await request('/api/context');
  } catch {
    context = null;
    document.querySelector('.disclosure').textContent = 'Layout preview only. The running server is not connected to the new chat API. No assessment or voice response is simulated.';
    if (cameFromDiscovery) renderConnectionProblem('Your tutoring session is unavailable. Reopen Discovery on the running tutoring server.');
    else render();
    return;
  }
  try {
    const query = new URLSearchParams({runId: context.runId, sessionId: context.sessionId});
    const result = await request(`/api/teaching-profile?${query}`);
    if (!Object.hasOwn(result, 'profile')) throw new Error('Your teaching plan could not be loaded.');
    importedPlan = result.profile;
  } catch {
    renderConnectionProblem('Your teaching plan could not be loaded. Try connecting again or review your choices in Discovery.');
    return;
  }
  document.querySelector('.disclosure').textContent =
    'Use synthetic or adult role-play data only. Current-run math evidence is not lasting mastery. Typed messages and voice transcripts stay in this run; recordings are released after transcription.';
  if (importedPlan) await start();
  else if (cameFromDiscovery) renderConnectionProblem('This tutoring session no longer has a Discovery plan. Review and confirm your choices to start a new session.');
  else render();
}

await connect();
