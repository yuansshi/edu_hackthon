#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, chmod, mkdtemp, open, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { classifyCandidate, criteriaFor, validateCandidate, validateLesson } from '../src/learning.mjs';

const PROJECT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const VOICE = 'Samantha (English (US))';
const SAY = '/usr/bin/say';
const AFCONVERT = '/usr/bin/afconvert';
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const TOOL_TIMEOUT_MS = 30_000;
const PROVIDER_TIMEOUT_MS = 45_000;
const CATALOG_KEYS = [
  'caseId', 'problemId', 'purpose', 'assisted', 'writtenWorking', 'strokes',
  'imagePngBase64', 'turns', 'candidate'
];

function freeze(value) {
  for (const child of Object.values(value)) {
    if (child !== null && typeof child === 'object') freeze(child);
  }
  return Object.freeze(value);
}

const BASELINE = freeze([
  {
    caseId: 'audio-add-supported', problemId: 'addition-practice-1', outcome: 'E',
    speech: 'Seven ones plus eight ones is fifteen ones. Ten of those ones make a ten, leaving five ones. Two tens plus one ten plus that new ten is four tens. The answer is forty-five.',
    expected: {
      category: 'supported_exchange', observedAnswer: 45, answerCorrect: true,
      exchangeEvidence: 'supported', recognitionStatus: 'usable', teachingMoveId: 'fresh-addition-check',
      exchangeQuantities: {before: {tens: 3, ones: 15}, after: {tens: 4, ones: 5}}
    }
  },
  {
    caseId: 'audio-sub-supported', problemId: 'subtraction-practice-1', outcome: 'E',
    speech: 'Forty-two is three tens and twelve ones. Twelve minus seven is five. Three tens minus one ten is two tens. The answer is twenty-five.',
    expected: {
      category: 'supported_exchange', observedAnswer: 25, answerCorrect: true,
      exchangeEvidence: 'supported', recognitionStatus: 'usable', teachingMoveId: 'fresh-subtraction-check',
      exchangeQuantities: {before: {tens: 4, ones: 2}, after: {tens: 3, ones: 12}}
    }
  },
  {
    caseId: 'audio-add-omitted-ten', problemId: 'addition-practice-1', outcome: 'D',
    speech: 'Seven plus eight is fifteen. I keep five ones and ignore the ten in fifteen. Two tens plus one ten is three tens. My answer is thirty-five.',
    expected: {
      category: 'addition_omitted_ten', observedAnswer: 35, answerCorrect: false,
      exchangeEvidence: 'contradicted', recognitionStatus: 'usable', teachingMoveId: 'teach-addition-exchange',
      exchangeQuantities: {before: {tens: 3, ones: 15}, after: {tens: 3, ones: 5}}
    }
  },
  {
    caseId: 'audio-sub-value-changed', problemId: 'subtraction-practice-1', outcome: 'D',
    speech: 'Forty-two becomes four tens and twelve ones. Twelve minus seven is five, and four tens minus one ten is three tens. My answer is thirty-five.',
    expected: {
      category: 'subtraction_value_changed', observedAnswer: 35, answerCorrect: false,
      exchangeEvidence: 'contradicted', recognitionStatus: 'usable', teachingMoveId: 'teach-subtraction-exchange',
      exchangeQuantities: {before: {tens: 4, ones: 2}, after: {tens: 4, ones: 12}}
    }
  },
  {
    caseId: 'audio-add-procedure', problemId: 'addition-practice-1', outcome: 'N',
    speech: 'I write five, carry one, and add the top numbers and that one. The answer is forty-five.',
    expected: {
      category: 'procedure_without_exchange_explanation', observedAnswer: 45, answerCorrect: true,
      exchangeEvidence: 'not_established', recognitionStatus: 'usable', teachingMoveId: 'ask-carried-value',
      exchangeQuantities: null
    }
  },
  {
    caseId: 'audio-add-guess', problemId: 'addition-practice-1', outcome: 'N',
    speech: 'My answer is forty-five. I guessed. I do not know why.',
    expected: {
      category: 'correct_answer_without_reasoning', observedAnswer: 45, answerCorrect: true,
      exchangeEvidence: 'not_established', recognitionStatus: 'usable', teachingMoveId: 'ask-strategy',
      exchangeQuantities: null
    }
  }
]);

const PREREQUISITE_REASONS = new Set([
  'invalid_arguments', 'invalid_cases', 'invalid_catalog', 'invalid_signal',
  'unsupported_platform', 'unsupported_runtime', 'missing_tool', 'missing_voice',
  'tool_failed', 'tool_timeout', 'invalid_wav', 'filesystem_failed',
  'configuration_unavailable', 'cancelled', 'cleanup_failed'
]);

class ProbePrerequisiteError extends Error {
  constructor(reason) {
    super('The synthetic audio probe prerequisites were not satisfied.');
    this.name = 'ProbePrerequisiteError';
    this.code = 'probe_prerequisite_failed';
    this.reason = PREREQUISITE_REASONS.has(reason) ? reason : 'filesystem_failed';
  }
}

function requirePrerequisite(condition, reason) {
  if (!condition) throw new ProbePrerequisiteError(reason);
}

function closed(value, keys) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

function checkAborted(signal) {
  requirePrerequisite(!signal.aborted, 'cancelled');
}

export function normalizeTranscript(text) {
  if (typeof text !== 'string') throw new TypeError('A transcript must be text.');
  const numbers = [
    ['twenty five', '25'], ['thirty five', '35'], ['forty five', '45'], ['forty two', '42'],
    ['fifteen', '15'], ['twelve', '12'], ['seven', '7'], ['eight', '8'], ['three', '3'],
    ['four', '4'], ['five', '5'], ['ten', '10'], ['one', '1'], ['two', '2']
  ];
  let normalized = text.normalize('NFKC').toLowerCase().replace(/[-\u2010\u2011]/gu, ' ');
  for (const [phrase, number] of numbers) {
    normalized = normalized.replace(new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])${phrase}(?![\\p{L}\\p{M}\\p{N}_])`, 'gu'), number);
  }
  return normalized.replace(/\p{Punctuation}/gu, '').replace(/\s+/gu, ' ').trim();
}

export function inspectSyntheticWav(bytes) {
  const check = condition => requirePrerequisite(condition, 'invalid_wav');
  check(bytes instanceof Uint8Array && bytes.byteLength >= 44 && bytes.byteLength <= MAX_AUDIO_BYTES);
  const buffer = Buffer.isBuffer(bytes) ? bytes :
    Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  check(buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WAVE');
  check(buffer.readUInt32LE(4) + 8 === buffer.length);
  let offset = 12;
  let chunks = 0;
  let formatFound = false;
  let dataBytes = null;
  while (offset < buffer.length) {
    check(++chunks <= 1024 && offset + 8 <= buffer.length);
    const type = buffer.toString('latin1', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    const paddedEnd = end + (size % 2);
    check(end <= buffer.length && paddedEnd <= buffer.length);
    if (type === 'fmt ') {
      check(!formatFound && dataBytes === null && (size === 16 || size === 18));
      check(buffer.readUInt16LE(start) === 1 && buffer.readUInt16LE(start + 2) === 1 &&
        buffer.readUInt32LE(start + 4) === 16_000 && buffer.readUInt32LE(start + 8) === 32_000 &&
        buffer.readUInt16LE(start + 12) === 2 && buffer.readUInt16LE(start + 14) === 16);
      if (size === 18) check(buffer.readUInt16LE(start + 16) === 0);
      formatFound = true;
    } else if (type === 'data') {
      check(formatFound && dataBytes === null && size > 0 && size % 2 === 0);
      dataBytes = size;
    }
    offset = paddedEnd;
  }
  check(offset === buffer.length && formatFound && dataBytes !== null &&
    dataBytes / 32_000 > 0 && dataBytes / 32_000 <= 60);
  return {byteLength: buffer.length, dataBytes, durationMs: 1000 * dataBytes / 32_000};
}

function validateSpeechCases(cases) {
  requirePrerequisite(Array.isArray(cases) && cases.length === BASELINE.length, 'invalid_cases');
  for (let index = 0; index < BASELINE.length; index += 1) {
    const value = cases[index];
    requirePrerequisite(closed(value, ['caseId', 'speech']) &&
      value.caseId === BASELINE[index].caseId && value.speech === BASELINE[index].speech, 'invalid_cases');
  }
}

function runTool(path, args, signal, owned) {
  return new Promise((resolveTool, rejectTool) => {
    checkAborted(signal);
    let child;
    try {
      child = execFile(path, args, {
        encoding: 'utf8', shell: false, timeout: TOOL_TIMEOUT_MS,
        maxBuffer: 262_144, killSignal: 'SIGKILL', signal
      }, (error, stdout) => {
        if (error) {
          const reason = signal.aborted ? 'cancelled' :
            error.killed && error.signal === 'SIGKILL' && error.code !== 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ?
              'tool_timeout' : 'tool_failed';
          rejectTool(new ProbePrerequisiteError(reason));
        } else if (signal.aborted) {
          rejectTool(new ProbePrerequisiteError('cancelled'));
        } else {
          resolveTool(stdout);
        }
      });
    } catch {
      rejectTool(new ProbePrerequisiteError(signal.aborted ? 'cancelled' : 'tool_failed'));
      return;
    }
    const settled = new Promise(resolveChild => child.once('close', resolveChild));
    owned.set(child, settled);
    void settled.then(() => owned.delete(child));
  });
}

async function readBoundedFile(path, limit) {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    requirePrerequisite(stat.isFile() && stat.size > 0 && stat.size <= limit, 'filesystem_failed');
    const bytes = Buffer.alloc(stat.size);
    let offset = 0;
    while (offset < bytes.length) {
      const {bytesRead} = await file.read(bytes, offset, bytes.length - offset, offset);
      requirePrerequisite(bytesRead > 0, 'filesystem_failed');
      offset += bytesRead;
    }
    const extra = await file.read(Buffer.alloc(1), 0, 1, offset);
    requirePrerequisite(extra.bytesRead === 0, 'filesystem_failed');
    return bytes;
  } finally {
    await file.close();
  }
}

export async function prepareSyntheticAudio({cases, signal} = {}) {
  validateSpeechCases(cases);
  requirePrerequisite(signal instanceof AbortSignal, 'invalid_signal');
  checkAborted(signal);
  requirePrerequisite(process.platform === 'darwin', 'unsupported_platform');
  requirePrerequisite(process.versions.node.split('.')[0] === '24', 'unsupported_runtime');
  const lifetime = new AbortController();
  const operationSignal = AbortSignal.any([signal, lifetime.signal]);
  const owned = new Map();
  const audioByCaseId = new Map();
  let privateDir = null;
  let previousUmask;
  let cleanupPromise;
  const cleanup = () => {
    cleanupPromise ??= (async () => {
      lifetime.abort();
      for (const child of owned.keys()) child.kill('SIGKILL');
      await Promise.all([...owned.values()]);
      owned.clear();
      audioByCaseId.clear();
      if (privateDir !== null) {
        try {
          await rm(privateDir, {recursive: true, force: true});
        } catch {
          throw new ProbePrerequisiteError('cleanup_failed');
        }
        privateDir = null;
      }
    })();
    return cleanupPromise;
  };
  try {
    try {
      await Promise.all([access(SAY, constants.X_OK), access(AFCONVERT, constants.X_OK)]);
    } catch {
      throw new ProbePrerequisiteError('missing_tool');
    }
    const inventory = await runTool(SAY, ['-v', '?'], operationSignal, owned);
    const voices = inventory.split(/\r?\n/u).map(line =>
      /^(.+?)\s+[a-z]{2,3}[_-][A-Za-z]{2,}(?:[_-][A-Za-z0-9]+)*\s+#/u.exec(line)?.[1].trim());
    requirePrerequisite(voices.includes(VOICE), 'missing_voice');
    checkAborted(operationSignal);
    previousUmask = process.umask(0o077);
    privateDir = await mkdtemp(join(tmpdir(), 'explainback-audio-'));
    await chmod(privateDir, 0o700);
    for (const value of BASELINE) {
      checkAborted(operationSignal);
      const textPath = join(privateDir, `${value.caseId}.txt`);
      const aiffPath = join(privateDir, `${value.caseId}.aiff`);
      const wavPath = join(privateDir, `${value.caseId}.wav`);
      await writeFile(textPath, `${value.speech}\n`, {encoding: 'utf8', mode: 0o600, flag: 'wx', signal: operationSignal});
      await runTool(SAY, ['-v', VOICE, '-r', '150', '-o', aiffPath, '-f', textPath], operationSignal, owned);
      await runTool(AFCONVERT, ['-f', 'WAVE', '-d', 'LEI16@16000', '-c', '1', aiffPath, wavPath], operationSignal, owned);
      const bytes = await readBoundedFile(wavPath, MAX_AUDIO_BYTES);
      const {durationMs} = inspectSyntheticWav(bytes);
      checkAborted(operationSignal);
      audioByCaseId.set(value.caseId, {caseId: value.caseId, wavPath, bytes, mimeType: 'audio/wav', durationMs});
    }
    checkAborted(operationSignal);
    return {voice: VOICE, audioByCaseId, cleanup};
  } catch (error) {
    await cleanup();
    if (error instanceof ProbePrerequisiteError) throw error;
    throw new ProbePrerequisiteError(operationSignal.aborted && signal.aborted ? 'cancelled' : 'filesystem_failed');
  } finally {
    if (previousUmask !== undefined) process.umask(previousUmask);
  }
}

function makeCaseInput(row, lesson, index) {
  const target = lesson.targets.find(value => value.practice.problemId === row.problemId);
  requirePrerequisite(Boolean(target), 'invalid_catalog');
  const attemptId = randomUUID();
  const workVersion = 1;
  return {
    job: {
      jobId: randomUUID(), runId: randomUUID(), sessionId: randomUUID(), learnerId: 'ABCDEF'[index],
      assignmentId: randomUUID(), assignmentRevision: 1, targetId: target.targetId, attemptId,
      workVersion, evidenceVersion: 1, correctionRevision: 0
    },
    problem: {...target.practice, targetId: target.targetId, purpose: 'practice', assisted: false},
    work: {
      image: null, imageSourceId: null, strokes: [], writtenWorking: row.writtenWorking,
      writtenSourceId: `${attemptId}:work:${workVersion}:written`
    },
    turns: [{turnId: randomUUID(), source: 'transcription', text: row.turns[0].text}],
    allowedActionIds: lesson.actions.map(action => action.actionId)
  };
}

function candidateFields(candidate, classification) {
  return {
    category: candidate.category, observedAnswer: candidate.observedAnswer, answerCorrect: classification.answerCorrect,
    exchangeEvidence: candidate.exchangeEvidence, recognitionStatus: candidate.recognitionStatus,
    teachingMoveId: candidate.teachingMoveId, exchangeQuantities: candidate.exchangeQuantities
  };
}

function sameQuantities(left, right) {
  return left === null || right === null ? left === right :
    left.before.tens === right.before.tens && left.before.ones === right.before.ones &&
    left.after.tens === right.after.tens && left.after.ones === right.after.ones;
}

function sameCandidateFields(observed, expected) {
  return Object.keys(expected).every(key => key === 'exchangeQuantities' ?
    sameQuantities(observed[key], expected[key]) : observed[key] === expected[key]);
}

function checkProbeCandidate(candidate, input) {
  const validated = validateCandidate(candidate, input);
  requirePrerequisite(validated.reasoningSummary.trim().length > 0 &&
    validated.sourceEvidence.length >= 1 && validated.sourceEvidence.length <= 10 &&
    validated.sourceEvidence.every(source => source.sourceKind === 'turn' &&
      source.sourceId === input.turns[0].turnId &&
      typeof source.quote === 'string' && source.quote.trim().length > 0 &&
      input.turns[0].text.includes(source.quote)), 'invalid_catalog');
  return {candidate: validated, classification: classifyCandidate(validated, input)};
}

// Returns fresh copies of the six canonical FixtureCase rows, in the frozen order.
export function validateProbeCatalog(catalog, lesson) {
  try {
    const validatedLesson = validateLesson(lesson);
    requirePrerequisite(closed(catalog, ['version', 'cases']) && catalog.version === 1 &&
      Array.isArray(catalog.cases) && catalog.cases.length >= BASELINE.length &&
      catalog.cases.length <= 1024, 'invalid_catalog');
    const ids = new Set();
    for (const row of catalog.cases) {
      requirePrerequisite(typeof row?.caseId === 'string' && /^[a-z0-9-]{1,100}$/u.test(row.caseId) &&
        !ids.has(row.caseId), 'invalid_catalog');
      ids.add(row.caseId);
    }
    const rows = catalog.cases.filter(row => row.caseId.startsWith('audio-'));
    requirePrerequisite(rows.length === BASELINE.length, 'invalid_catalog');
    rows.forEach((row, index) => {
      const baseline = BASELINE[index];
      requirePrerequisite(catalog.cases[index] === row && closed(row, CATALOG_KEYS) &&
        row.caseId === baseline.caseId && row.problemId === baseline.problemId &&
        row.purpose === 'practice' && row.assisted === false &&
        row.writtenWorking === `Synthetic audio probe. ${baseline.problemId}.` &&
        Array.isArray(row.strokes) && row.strokes.length === 0 && row.imagePngBase64 === null &&
        Array.isArray(row.turns) && row.turns.length === 1, 'invalid_catalog');
      const turn = row.turns[0];
      requirePrerequisite(closed(turn, ['source', 'text', 'audioCaseId', 'browserAudioClasses']) &&
        turn.source === 'transcription' && turn.text === baseline.speech && turn.audioCaseId === baseline.caseId &&
        Array.isArray(turn.browserAudioClasses) && turn.browserAudioClasses.length === 0, 'invalid_catalog');
      const input = makeCaseInput(row, validatedLesson, index);
      input.criteria = criteriaFor(input.problem);
      const candidate = structuredClone(row.candidate);
      requirePrerequisite(Array.isArray(candidate?.sourceEvidence), 'invalid_catalog');
      for (const source of candidate.sourceEvidence) {
        requirePrerequisite(source.sourceId === '$turn[0]', 'invalid_catalog');
        source.sourceId = input.turns[0].turnId;
      }
      const result = checkProbeCandidate(candidate, input);
      requirePrerequisite(sameCandidateFields(candidateFields(result.candidate, result.classification), baseline.expected) &&
        result.classification.outcome === baseline.outcome, 'invalid_catalog');
    });
    return structuredClone(rows);
  } catch {
    throw new ProbePrerequisiteError('invalid_catalog');
  }
}

function providerFailure(error, deadline) {
  return deadline.aborted || (error?.name === 'InterpretationError' && error.code === 'timeout') ?
    'provider_timeout' : 'provider_failed';
}

async function callProvider(adapter, operation, input, shutdown, activeJobs, report) {
  const deadline = AbortSignal.timeout(PROVIDER_TIMEOUT_MS);
  const signal = AbortSignal.any([shutdown, deadline]);
  const jobId = input.job.jobId;
  let cancellation;
  let cancellationFailed = false;
  const cancel = () => {
    cancellation ??= Promise.resolve().then(() =>
      adapter.cancel({jobId, reason: deadline.aborted ? 'timeout' : 'shutdown'})).catch(() => {
      cancellationFailed = true;
    });
  };
  signal.addEventListener('abort', cancel, {once: true});
  activeJobs.add(jobId);
  try {
    if (signal.aborted) {
      cancel();
      throw new Error('The probe operation was cancelled.');
    }
    report.providerCalls += 1;
    const result = await adapter[operation]({...input, signal});
    if (signal.aborted) throw new Error('The probe operation was cancelled.');
    return result;
  } catch (error) {
    const failure = new Error('The probe provider operation failed.');
    failure.code = providerFailure(error, deadline);
    throw failure;
  } finally {
    signal.removeEventListener('abort', cancel);
    if (cancellation) await cancellation;
    activeJobs.delete(jobId);
    if (cancellationFailed) {
      const failure = new Error('The probe provider cancellation failed.');
      failure.code = 'provider_failed';
      throw failure;
    }
  }
}

async function runLiveCases(rows, lesson, adapter, handle, shutdown, report) {
  const activeJobs = new Set();
  try {
    for (let index = 0; index < rows.length; index += 1) {
      const result = report.cases[index];
      const input = makeCaseInput(rows[index], lesson, index);
      let asset = handle.audioByCaseId.get(rows[index].caseId);
      let started = performance.now();
      let transcription;
      try {
        transcription = await callProvider(adapter, 'transcribe', {
          job: input.job, problem: input.problem, work: input.work,
          turn: {turnId: input.turns[0].turnId, index: 0, source: 'transcription'},
          audio: {bytes: asset.bytes, mimeType: asset.mimeType}
        }, shutdown, activeJobs, report);
      } catch (error) {
        result.failureReason = error.code === 'provider_timeout' ? 'provider_timeout' : 'provider_failed';
      } finally {
        result.transcriptionMs = Math.round(performance.now() - started);
        handle.audioByCaseId.delete(rows[index].caseId);
        asset = null;
      }
      if (!result.failureReason) {
        const text = transcription?.text;
        const validText = closed(transcription, ['text']) && typeof text === 'string' &&
          [...text].length <= 4000 && text.trim().length > 0 &&
          !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(text);
        if (!validText) {
          result.failureReason = 'provider_failed';
        } else {
          result.transcript = text;
          result.transcriptMatches = normalizeTranscript(text) === normalizeTranscript(BASELINE[index].speech);
          if (!result.transcriptMatches) result.failureReason = 'transcript_mismatch';
          else input.turns[0].text = text;
        }
      }
      if (!result.failureReason) {
        const assessmentInput = {
          ...input, job: {...input.job, jobId: randomUUID(), evidenceVersion: 2}, criteria: criteriaFor(input.problem)
        };
        let candidate;
        started = performance.now();
        try {
          candidate = await callProvider(adapter, 'assess', assessmentInput, shutdown, activeJobs, report);
        } catch (error) {
          result.failureReason = error.code === 'provider_timeout' ? 'provider_timeout' : 'provider_failed';
        } finally {
          result.assessmentMs = Math.round(performance.now() - started);
        }
        if (!result.failureReason) {
          try {
            const checked = checkProbeCandidate(candidate, assessmentInput);
            result.observed = candidateFields(checked.candidate, checked.classification);
            if (!sameCandidateFields(result.observed, BASELINE[index].expected) ||
                checked.classification.outcome !== BASELINE[index].outcome) {
              result.failureReason = 'candidate_mismatch';
            }
          } catch {
            result.failureReason = 'candidate_mismatch';
          }
        }
      }
      result.status = result.failureReason ? 'failed' : 'passed';
      if (result.failureReason) {
        report.failureReason = result.failureReason;
        break;
      }
    }
  } finally {
    const cancellations = await Promise.allSettled([...activeJobs].map(jobId =>
      Promise.resolve().then(() => adapter.cancel({jobId, reason: 'shutdown'}))));
    if (cancellations.some(result => result.status === 'rejected')) {
      report.status = 'failed';
      report.failureReason = 'provider_failed';
    }
  }
}

async function main(args) {
  const shutdown = new AbortController();
  let interrupted = null;
  const interrupt = signal => {
    interrupted ??= signal;
    shutdown.abort();
  };
  const onInterrupt = () => interrupt('SIGINT');
  const onTerminate = () => interrupt('SIGTERM');
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onTerminate);
  let handle;
  const report = {
    probeVersion: 1, mode: args.includes('--preflight-only') ? 'preflight_only' : 'live',
    runtime: {node: process.version, platform: process.platform},
    tools: {say: SAY, afconvert: AFCONVERT, voice: VOICE},
    status: 'failed', preflightPassed: false, providerCalls: 0, models: null,
    failureReason: null, prerequisiteReason: null,
    cases: BASELINE.map(row => ({
      caseId: row.caseId, status: 'not_run', transcript: null, transcriptMatches: null,
      expected: row.expected, observed: null, transcriptionMs: null, assessmentMs: null, failureReason: null
    }))
  };
  try {
    requirePrerequisite(args.length === 0 || (args.length === 1 && args[0] === '--preflight-only'), 'invalid_arguments');
    let lesson;
    let catalog;
    try {
      lesson = validateLesson(JSON.parse(await readBoundedFile(join(PROJECT_DIR, 'content/demo-lesson.json'), 1_048_576)));
      catalog = JSON.parse(await readBoundedFile(join(PROJECT_DIR, 'test/fixtures/regrouping-cases.json'), 1_048_576));
    } catch {
      throw new ProbePrerequisiteError('invalid_catalog');
    }
    const rows = validateProbeCatalog(catalog, lesson);
    handle = await prepareSyntheticAudio({
      cases: rows.map(row => ({caseId: row.caseId, speech: row.turns[0].text})),
      signal: shutdown.signal
    });
    report.preflightPassed = true;
    if (args.length === 1) {
      report.status = 'passed';
    } else {
      checkAborted(shutdown.signal);
      let adapter;
      try {
        const {loadConfig} = await import('../src/config.mjs');
        const config = loadConfig({
          projectDir: PROJECT_DIR,
          env: {
            ASSESSMENT_MODE: 'live', PORT: process.env.PORT,
            OPENAI_TRANSCRIBE_MODEL: process.env.OPENAI_TRANSCRIBE_MODEL,
            OPENAI_REASONING_MODEL: process.env.OPENAI_REASONING_MODEL
          }
        });
        report.models = { transcription: config.transcribeModel, assessment: config.reasoningModel };
        const {createLiveAdapter} = await import('../src/assessment-adapter.mjs');
        checkAborted(shutdown.signal);
        adapter = createLiveAdapter({config});
      } catch (error) {
        if (error instanceof ProbePrerequisiteError) throw error;
        throw new ProbePrerequisiteError('configuration_unavailable');
      }
      await runLiveCases(rows, lesson, adapter, handle, shutdown.signal, report);
      if (report.cases.every(row => row.status === 'passed')) report.status = 'passed';
    }
  } catch (error) {
    report.failureReason = 'probe_prerequisite_failed';
    report.prerequisiteReason = error instanceof ProbePrerequisiteError ? error.reason : 'filesystem_failed';
  } finally {
    shutdown.abort();
    try {
      if (handle) await handle.cleanup();
    } catch {
      report.status = 'failed';
      report.failureReason = 'probe_prerequisite_failed';
      report.prerequisiteReason = 'cleanup_failed';
    }
    process.off('SIGINT', onInterrupt);
    process.off('SIGTERM', onTerminate);
  }
  if (interrupted) {
    report.status = 'failed';
    report.failureReason ??= 'probe_prerequisite_failed';
    report.prerequisiteReason ??= 'cancelled';
  }
  process.stdout.write(`${JSON.stringify(report)}\n`);
  process.exitCode = interrupted === 'SIGINT' ? 130 : interrupted === 'SIGTERM' ? 143 :
    report.status === 'passed' ? 0 : 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
