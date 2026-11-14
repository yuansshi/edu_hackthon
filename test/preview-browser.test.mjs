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

test('an imported Discovery plan keeps its learner, choices and voice opt-in in the chat UI', {timeout: 30_000}, async t => {
  const browser = await chromium.launch({channel: 'chrome', headless: true, timeout: 10_000});
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const result = await verifyPreview(page, {handoff: {
    schemaVersion: 'smart-pants-tutoring/v1', sourceSchemaVersion: 'learning-strength-discovery/v1',
    revision: 3, reviewed: true, learner: {alias: 'Ari <img>', grade: '6'},
    routine: {acceptedRevision: 3, basis: 'learner-chosen-trial', choices: {
      minutes: 20, focus: 10, pause: 2, encouragement: 'progress', challenge: 'stretch',
      supports: ['Hints when I ask', 'Quiet thinking time']
    }}
  }});
  assert.equal(result.importedProfile, true);
  assert.equal(result.transcriptions, 1);
  assert.equal(result.voiceReplyRequests, 1);
});

test('a failed teaching-plan load does not substitute a sample learner', {timeout: 30_000}, async t => {
  const browser = await chromium.launch({channel: 'chrome', headless: true, timeout: 10_000});
  t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(5000);
  const result = await verifyPreview(page, {failProfileLoad: true});
  assert.equal(result.profileFailureBlocked, true);
});
