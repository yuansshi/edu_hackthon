const transcriptBox = document.getElementById('transcript');
const listenButton = document.getElementById('listen-button');
const sampleButton = document.getElementById('sample-button');
const submitButton = document.getElementById('submit-button');
const clearButton = document.getElementById('clear-button');
const statusLabel = document.getElementById('status');
const coachOutput = document.getElementById('coach-output');

const sampleTranscript = 'Seven ones plus eight ones is fifteen ones. Ten of those ones make a ten, leaving five ones. Two tens plus one ten plus that new ten is four tens. The answer is forty-five.';

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let generation = 0;

async function requestCoach(transcriptText) {
  const body = {
    problem: '27 + 18',
    transcript: transcriptText
  };

  const response = await fetch('/api/coach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error('Coach request failed');
  }

  return response.json();
}

function setStatus(message) {
  statusLabel.textContent = message;
}

async function coachFromTranscript(currentTranscript) {
  const requestGeneration = ++generation;
  const trimmed = currentTranscript.trim();
  if (!trimmed) {
    coachOutput.textContent = 'Say the steps you used with the numbers before I coach you.';
    return;
  }

  setStatus('Preparing a general follow-up...');
  try {
    const result = await requestCoach(trimmed);
    if (requestGeneration !== generation) return;
    coachOutput.textContent = result.response;
    setStatus('General follow-up only; math assessment is not implemented.');
  } catch (error) {
    if (requestGeneration !== generation) return;
    coachOutput.textContent = 'The tutor could not process that explanation. Try a shorter explanation and say the regrouping step.';
    setStatus('Coach error. Please try again.');
  }
}

function stopRecognition() {
  if (recognition) {
    recognition.onend = null;
    recognition.onerror = null;
    recognition.onresult = null;
    recognition.abort();
    recognition = null;
  }
}

function startListening() {
  if (!SpeechRecognitionCtor) {
    setStatus('This browser does not support the speech listener. Please type your explanation instead.');
    return;
  }

  if (recognition) {
    stopRecognition();
    setStatus('Listening stopped. Review or type your explanation.');
    return;
  }

  const current = new SpeechRecognitionCtor();
  recognition = current;
  let failed = false;
  let captured = false;
  current.lang = 'en-US';
  current.interimResults = true;
  current.continuous = false;

  current.onstart = () => {
    setStatus('Listening with browser speech recognition...');
  };

  current.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; i += 1) {
      transcript += event.results[i][0].transcript;
    }
    captured = Boolean(transcript.trim());
    transcriptBox.value = transcript;
  };

  current.onend = () => {
    recognition = null;
    if (failed) return;
    setStatus(captured
      ? 'Review and edit the transcript, then select Coach me.'
      : 'No speech was captured. Please type your thinking or try again.');
  };

  current.onerror = () => {
    failed = true;
    setStatus('Speech was interrupted. Please type or try again.');
  };

  current.start();
}

listenButton.addEventListener('click', startListening);
submitButton.addEventListener('click', () => coachFromTranscript(transcriptBox.value));
clearButton.addEventListener('click', () => {
  generation++;
  transcriptBox.value = '';
  coachOutput.textContent = 'The tutor is ready for another explanation.';
  setStatus('Ready to listen.');
  stopRecognition();
});
sampleButton.addEventListener('click', () => {
  generation++;
  stopRecognition();
  transcriptBox.value = sampleTranscript;
  setStatus('Sample loaded. Review it, then select Coach me.');
});
