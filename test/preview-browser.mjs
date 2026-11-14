import {previewFixture, previewRequests} from './preview-fixture.mjs';
import {readFile} from 'node:fs/promises';

export async function verifyPreview(page, {handoff = null, failProfileLoad = false} = {}) {
  const fixture = previewFixture(31991);
  const send = previewRequests(fixture.server);
  if (handoff) {
    const context = await (await send('http://127.0.0.1:31991/api/context')).json();
    const imported = await send('http://127.0.0.1:31991/api/teaching-profile', {
      method: 'POST', headers: {'Content-Type': 'application/json', Origin: 'http://127.0.0.1:31991'},
      body: JSON.stringify({runId: context.runId, sessionId: context.sessionId,
        idempotencyKey: crypto.randomUUID(), expectedSessionRevision: context.revision, handoff})
    });
    if (imported.status !== 201) throw new Error(`Teaching plan import failed: ${imported.status}`);
  }
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
    if (failProfileLoad && url.pathname === '/api/teaching-profile') {
      await route.fulfill({status: 502, contentType: 'application/json',
        body: JSON.stringify({error: {message: 'The teaching plan is unavailable.'}})});
      return;
    }
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
    await page.goto(`http://127.0.0.1:3100${handoff ? '/?from=discovery' : ''}`);
    if (failProfileLoad) {
      await page.getByRole('alert').getByText('Your teaching plan could not be loaded. Try connecting again or review your choices in Discovery.', {exact: true}).waitFor();
      if (await page.getByRole('group', {name: 'Synthetic student profiles', exact: true}).count() ||
          await page.getByRole('textbox', {name: 'Your answer', exact: true}).count()) {
        throw new Error('A failed profile load fell back to a sample learner.');
      }
      return {profileFailureBlocked: true};
    }
    if (handoff) {
      await page.getByRole('heading', {name: `Learning with ${handoff.learner.alias}`, exact: true}).waitFor();
      await page.getByRole('log').getByText(/Try the problem first and show how you know/).waitFor();
      await page.getByText('Try a 10-minute work block, then choose a 2-minute pause. These are your trial choices.', {exact: true}).waitFor();
      await page.getByText('Notice the step you explained or corrected.', {exact: true}).waitFor();
      if (await page.locator('.number-groups').count()) throw new Error('A challenge-first opening exposed visual scaffolding.');
      if (await page.getByRole('button', {name: 'Voice off', exact: true}).getAttribute('aria-pressed') !== 'false' || fixture.calls.speech.length) {
        throw new Error('Import enabled voice without a learner choice.');
      }
      if (await page.locator('.arrangement-banner img').count()) throw new Error('The imported alias was interpreted as markup.');
    } else await page.getByRole('button', {name: /play with numbers/}).click();
    const answer = page.getByRole('textbox', {name: 'Your answer', exact: true});
    await answer.waitFor({state: 'visible'});
    const bounds = await answer.boundingBox();
    if (!bounds || bounds.y + bounds.height > 800) throw new Error('Initial answer is not in the viewport.');
    if (await page.getByRole('button', {name: /coach|check this sample/i}).count()) throw new Error('A coach button remains.');
    await answer.fill('35');
    await answer.press('Enter');
    await page.getByRole('log').getByText('Show what each number in your work means. Which step did you use to get your answer?', {exact: true}).waitFor();
    if (handoff && await page.locator('.message.student .message-author').first().textContent() !== handoff.learner.alias) {
      throw new Error('The imported learner was replaced by a sample profile.');
    }
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
    if (handoff) {
      await page.getByRole('button', {name: 'Reset demo', exact: true}).click();
      await page.getByRole('group', {name: 'Synthetic student profiles', exact: true}).waitFor();
      if (await page.getByRole('region', {name: 'Your Discovery teaching plan', exact: true}).count()) {
        throw new Error('Reset retained the previous learner’s teaching plan.');
      }
    }
    return {
      validation: 'Offline fixture UI and in-process handlers only; fake microphone, transcription and playback; no listener or provider calls.',
      initialAnswerVisible: true, noCoachButton: true, mobileFits: true,
      importedProfile: Boolean(handoff),
      assessments: fixture.calls.assess.length, transcriptions: fixture.calls.transcribe.length,
      voiceReplyRequests: fixture.calls.speech.length, ...observed
    };
  } finally {
    await page.unroute('**/*', handler);
    fixture.server.emit('close');
    await page.close();
  }
}
