import test from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
import {verifyPreview} from './preview-browser.mjs';

test('chat UI uses an initial answer, reviewed voice transcripts and voice playback with offline fixtures', {timeout: 30_000}, async t => {
  const browser = await chromium.launch({channel: 'chrome', headless: true, timeout: 10_000});
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const result = await verifyPreview(page);
  assert.equal(result.initialAnswerVisible, true);
  assert.equal(result.noCoachButton, true);
  assert.equal(result.mobileFits, true);
  assert.equal(result.transcriptions, 1);
  assert.equal(result.voiceReplyRequests, 1);
});
