import {previewFixture, previewRequests} from './preview-fixture.mjs';
import {readFile} from 'node:fs/promises';

export async function verifyPreview(page) {
  const fixture = previewFixture(31991);
  const send = previewRequests(fixture.server);
  await page.addInitScript(() => {
    window.__voicePlays = 0;
    window.__tracksStopped = 0;
    window.Audio = class {
      constructor(src) { this.src = src; }
      async play() { window.__voicePlays++; }
      pause() {}
      load() {}
      removeAttribute() {}
    };
    Object.defineProperty(navigator, 'mediaDevices', {configurable: true, value: {
      getUserMedia: async () => ({getTracks: () => [{stop: () => window.__tracksStopped++}]})
    }});
    window.MediaRecorder = class {
      static isTypeSupported(type) { return type === 'audio/webm;codecs=opus'; }
      constructor(stream, options) { this.state = 'inactive'; this.mimeType = options.mimeType; }
      start() { this.state = 'recording'; }
      stop() {
        if (this.state !== 'recording') return;
        this.state = 'inactive';
        this.ondataavailable?.({data: new Blob([new Uint8Array([26, 69, 223, 163, 0])], {type: this.mimeType})});
        queueMicrotask(() => this.onstop?.());
      }
    };
  });
  const handler = async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) {
      const assets = {
        '/': ['../presentation/demo/index.html', 'text/html'],
        '/app.js': ['../presentation/demo/app.js', 'text/javascript'],
        '/styles.css': ['../presentation/demo/styles.css', 'text/css'],
        '/scenario.mjs': ['../presentation/demo/scenario.mjs', 'text/javascript'],
        '/src/learning.mjs': ['../src/learning.mjs', 'text/javascript']
      };
      const asset = assets[url.pathname];
      if (!asset) { await route.fulfill({status: 404, body: 'Not found'}); return; }
      await route.fulfill({status: 200, contentType: asset[1], body: await readFile(new URL(asset[0], import.meta.url))});
      return;
    }
    const response = await send('http://127.0.0.1:31991' + url.pathname + url.search, {
      method: request.method(),
      headers: {...request.headers(), host: '127.0.0.1:31991', origin: 'http://127.0.0.1:31991'},
      body: request.postDataBuffer() ?? undefined
    });
    await route.fulfill({status: response.status, headers: Object.fromEntries(response.headers),
      body: Buffer.from(await response.arrayBuffer())});
  };
  await page.route('**/*', handler);
  try {
    await page.setViewportSize({width: 1280, height: 800});
    await page.goto('http://127.0.0.1:3100');
    await page.getByRole('button', {name: /play with numbers/}).click();
    const answer = page.getByRole('textbox', {name: 'Your answer', exact: true});
    await answer.waitFor({state: 'visible'});
    const bounds = await answer.boundingBox();
    if (!bounds || bounds.y + bounds.height > 800) throw new Error('Initial answer is not in the viewport.');
    if (await page.getByRole('button', {name: /coach|check this sample/i}).count()) throw new Error('A coach button remains.');
    await answer.fill('35');
    await answer.press('Enter');
    await page.getByRole('log').getByText('Show what each number in your work means. Which step did you use to get your answer?', {exact: true}).waitFor();
    if (fixture.calls.assess.length !== 1) throw new Error('Typed answer was not sent exactly once.');
    await page.getByRole('button', {name: 'Record your thinking', exact: true}).click();
    await page.getByRole('button', {name: 'Stop recording', exact: true}).click();
    await page.getByRole('textbox', {name: 'Review your voice transcript', exact: true}).waitFor();
    if (fixture.calls.assess.length !== 1) throw new Error('Voice bypassed transcript review.');
    await page.getByRole('button', {name: 'Send reviewed transcript', exact: true}).click();
    await page.getByRole('log').getByText('You can show me more of your thinking or ask for a little help.', {exact: true}).waitFor();
    await page.waitForFunction(() => window.__voicePlays > 0);
    const observed = await page.evaluate(() => ({
      voicePlays: window.__voicePlays, tracksStopped: window.__tracksStopped,
      overflow: document.documentElement.scrollWidth > innerWidth
    }));
    if (observed.tracksStopped < 1 || observed.overflow) throw new Error('Capture cleanup or layout failed.');
    await page.setViewportSize({width: 390, height: 844});
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile layout overflows.');
    await page.getByRole('textbox', {name: 'Your answer', exact: true}).scrollIntoViewIfNeeded();
    return {
      validation: 'Offline fixture UI and in-process handlers only; fake microphone, transcription and playback; no listener or provider calls.',
      initialAnswerVisible: true, noCoachButton: true, mobileFits: true,
      assessments: fixture.calls.assess.length, transcriptions: fixture.calls.transcribe.length,
      voiceReplyRequests: fixture.calls.speech.length, ...observed
    };
  } finally {
    await page.unroute('**/*', handler);
    fixture.server.emit('close');
    await page.close();
  }
}
