import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

export const LIMITS = Object.freeze({
  boardWidth: 1024,
  boardHeight: 768,
  pngFileBytes: 1_048_576,
  jsonBytes: 2_097_152,
  audioBytes: 10_485_760,
  recordingSeconds: 60,
  pointsPerWork: 20_000,
  textPerTurn: 4000,
  assembledTextPerAttempt: 12_000,
  turnsPerAttempt: 16,
  evidenceVersionsPerAttempt: 16,
  historyBytesPerAttempt: 65_536,
  attemptsPerSession: 128,
  retainedPngBytes: 67_108_864,
  mutationRecords: 2048,
  inFlightProviderCalls: 2,
  providerTimeoutMs: 45_000,
  snapshotTimeoutMs: 5000,
  pollAfterSettleMs: 1000
});

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export function validateConfig(config) {
  if (!config || config.host !== '127.0.0.1' ||
      !Number.isInteger(config.port) || config.port < 1 || config.port > 65535 ||
      !['live', 'fixture'].includes(config.assessmentMode) ||
      typeof config.transcribeModel !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(config.transcribeModel) ||
      typeof config.reasoningModel !== 'string' || !/^[A-Za-z0-9._-]{1,128}$/.test(config.reasoningModel) ||
      (config.assessmentMode === 'live' && (typeof config.openaiApiKey !== 'string' || !config.openaiApiKey.trim())) ||
      (config.assessmentMode === 'fixture' && config.openaiApiKey !== null)) {
    throw new ConfigurationError('Invalid local application configuration.');
  }
  return Object.freeze({ ...config });
}

export function loadConfig({
  projectDir = dirname(dirname(fileURLToPath(import.meta.url))),
  env = process.env
} = {}) {
  const assessmentMode = env.ASSESSMENT_MODE ?? 'live';
  if (!['live', 'fixture'].includes(assessmentMode)) {
    throw new ConfigurationError('ASSESSMENT_MODE must be live or fixture.');
  }
  let projectEnv = {};
  if (assessmentMode === 'live') {
    try {
      projectEnv = parseEnv(readFileSync(join(projectDir, '.env'), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw new ConfigurationError('Cannot read the project configuration.');
      throw new ConfigurationError('Live mode requires OPENAI_API_KEY in this project\'s .env.');
    }
  }
  const port = env.PORT ?? projectEnv.PORT ?? '3000';
  if (typeof port !== 'string' || !/^[1-9]\d{0,4}$/.test(port)) {
    throw new ConfigurationError('PORT must be an integer from 1 to 65535.');
  }
  return validateConfig({
    host: '127.0.0.1',
    port: Number(port),
    assessmentMode,
    openaiApiKey: assessmentMode === 'live' ? projectEnv.OPENAI_API_KEY : null,
    transcribeModel: env.OPENAI_TRANSCRIBE_MODEL ?? projectEnv.OPENAI_TRANSCRIBE_MODEL ?? 'gpt-transcribe',
    reasoningModel: env.OPENAI_REASONING_MODEL ?? projectEnv.OPENAI_REASONING_MODEL ?? 'gpt-5.6-terra'
  });
}
