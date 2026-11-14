import {readFileSync} from 'node:fs';
import {loadConfig} from '../src/config.mjs';
import {createDemoServer} from '../presentation/demo-server.mjs';
import {InterpretationError} from '../src/assessment-adapter.mjs';
import {Readable, Writable} from 'node:stream';
import {once} from 'node:events';

export function previewRequests(server) {
  return async (address, options = {}) => {
    const url = new URL(address);
    const bytes = options.body === undefined ? Buffer.alloc(0) : Buffer.from(options.body);
    const request = Readable.from(bytes.length ? [bytes] : []);
    request.url = url.pathname + url.search;
    request.method = options.method ?? 'GET';
    request.headers = Object.fromEntries(Object.entries({host: url.host, ...options.headers})
      .map(([key, value]) => [key.toLowerCase(), value]));
    const chunks = [];
    const response = new Writable({write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); }});
    response.statusCode = 200;
    response.headersSent = false;
    response.writeHead = (code, headers) => {
      response.statusCode = code;
      response.headers = headers;
      response.headersSent = true;
      return response;
    };
    const finished = once(response, 'finish');
    server.emit('request', request, response);
    await finished;
    return new Response(Buffer.concat(chunks), {status: response.statusCode, headers: response.headers});
  };
}

export function previewFixture(port) {
  const lesson = JSON.parse(readFileSync(new URL('../content/demo-lesson.json', import.meta.url), 'utf8'));
  const calls = {assess: [], transcribe: [], speech: [], cancel: []};
  const controls = {failAssess: false, failSpeech: false, holdAssess: false, releaseAssess: null};
  const adapter = {
    async transcribe(input) {
      calls.transcribe.push(input.audio.mimeType);
      return {text: 'I keep 3 tens and 5 ones and ignore the new ten. My answer is 35.'};
    },
    async assess(input) {
      calls.assess.push(input.turns.map(turn => turn.text).join('\n'));
      if (controls.holdAssess) await new Promise(resolve => { controls.releaseAssess = resolve; });
      if (controls.failAssess) throw new InterpretationError('unavailable');
      const text = input.turns.at(-1).text;
      const c = input.criteria;
      const difficulty = text.includes('ignore');
      const supported = text.includes('become');
      const answer = /answer is (\d+)/i.exec(text)?.[1];
      return {
        category: difficulty ? 'addition_omitted_ten' : supported ? 'supported_exchange' : 'needs_clarification',
        observedAnswer: answer ? Number(answer) : null,
        exchangeEvidence: difficulty ? 'contradicted' : supported ? 'supported' : 'not_established',
        recognitionStatus: 'usable',
        sourceEvidence: [{sourceKind: 'turn', sourceId: input.turns.at(-1).turnId, quote: text, description: ''}],
        exchangeQuantities: difficulty ? {before: c.before, after: {tens: c.before.tens, ones: c.before.ones - 10}} :
          supported ? {before: c.before, after: c.conservedAfter} : null,
        neutralReadback: '', reasoningSummary: 'Synthetic test observation.',
        teachingMoveId: 'ask-strategy'
      };
    },
    async cancel({reason}) { calls.cancel.push(reason); }
  };
  const speechAdapter = {
    async speak({text}) {
      calls.speech.push(text);
      if (controls.failSpeech) throw new InterpretationError('unavailable');
      return {bytes: Buffer.from('ID3synthetic-test-audio'), mimeType: 'audio/mpeg'};
    }
  };
  const config = loadConfig({env: {ASSESSMENT_MODE: 'fixture', PORT: String(port)}});
  return {server: createDemoServer({config, lesson, adapter, speechAdapter}), calls, controls};
}
