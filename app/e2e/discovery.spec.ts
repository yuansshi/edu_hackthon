import { readFile } from 'node:fs/promises';
import { expect, test } from 'playwright/test';
import type { Page } from 'playwright/test';
import { z } from 'zod';
import { activityRecordSchema } from '../src/activityModel';

const storageKey = 'learning-strength-discovery.visit.v1';
const answerSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('selected'), values: z.array(z.string()), other: z.string() }),
  z.object({ kind: z.literal('skipped') }),
]);
const downloadedVisitSchema = z.object({
  session: z.object({
    answers: z.record(z.string(), answerSchema),
    activities: z.array(activityRecordSchema),
    revision: z.number().int(),
    reviewedRevision: z.number().int().nullable(),
  }),
  report: z.array(
    z.object({
      id: z.string(),
      said: z.array(z.object({ sourceId: z.string(), text: z.string() })),
    }),
  ),
  teachingProfile: z
    .object({
      schemaVersion: z.literal('learning-strength-discovery/v1'),
      reviewed: z.literal(true),
      revision: z.number().int(),
      dimensions: z
        .array(
          z.object({
            id: z.string(),
            corrections: z.array(z.object({ note: z.string(), status: z.string() })),
          }),
        )
        .length(8),
      routine: z
        .object({
          acceptedRevision: z.number().int(),
          basis: z.literal('learner-chosen-trial'),
          choices: z.object({
            focus: z.number(),
            pause: z.number(),
            supports: z.array(z.string()),
          }),
        })
        .optional(),
    })
    .nullable(),
});

async function begin(page: Page, nickname?: string) {
  await page.getByRole('button', { name: 'Let’s discover', exact: true }).click();
  const welcome = page.getByRole('dialog', { name: 'Before your discovery' });
  if (nickname) await welcome.getByLabel(/What should we call you/).fill(nickname);
  await welcome.getByRole('button', { name: 'I’m ready to explore' }).click();
}

async function downloadVisit(page: Page) {
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Make it comfortable' });
  const pending = page.waitForEvent('download');
  await settings.getByRole('button', { name: 'Download my visit' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('my-learning-discovery.json');
  const path = await download.path();
  if (!path) throw new Error('The browser did not provide the downloaded visit file.');
  const input: unknown = JSON.parse(await readFile(path, 'utf8'));
  const visit = downloadedVisitSchema.parse(input);
  await settings.getByRole('button', { name: 'Close dialog', exact: true }).click();
  return visit;
}

async function finishActivity(page: Page) {
  await page.getByRole('button', { name: 'I’m ready to finish', exact: true }).click();
  await page.getByRole('button', { name: 'Save & finish', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Where will curiosity take you/ })).toBeVisible();
}

test('all prompts lead to an editable eight-area report and a reviewed teaching-profile export', async ({
  page,
}) => {
  await page.goto('/');
  await begin(page, 'River');
  for (let position = 1; position <= 28; position += 1) {
    await expect(
      page.getByRole('progressbar', { name: 'Position in reflections' }),
    ).toHaveAttribute('value', String(position));
    if (position === 2) {
      await page.getByRole('button', { name: 'Skip for now', exact: true }).click();
      continue;
    }
    if (position === 7) {
      const quiet = page.getByRole('button', { name: /A quiet place/ });
      const movement = page.getByRole('button', { name: /Room to move or change position/ });
      await quiet.click();
      await movement.click();
      await page.getByRole('button', { name: 'Depends on the situation', exact: true }).click();
      await expect(quiet).toHaveAttribute('aria-pressed', 'false');
      await expect(movement).toHaveAttribute('aria-pressed', 'false');
      await expect(
        page.getByRole('button', { name: 'Depends on the situation', exact: true }),
      ).toHaveAttribute('aria-pressed', 'true');
    } else {
      await page
        .getByRole('group', { name: 'Answer choices', exact: true })
        .getByRole('button')
        .first()
        .click();
    }
    await page
      .getByRole('button', {
        name: position === 28 ? 'Explore the activities' : 'Next',
        exact: true,
      })
      .click();
  }
  await expect(page.getByText('28 of 28 prompts visited.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'My discoveries', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(8);
  const buildRoutine = page.getByRole('button', { name: 'Build my trial routine', exact: true });
  await expect(buildRoutine).toBeDisabled();
  await page.getByRole('button', { name: 'I’ve reviewed this picture', exact: true }).click();
  await expect(buildRoutine).toBeEnabled();

  await page.getByRole('button', { name: 'Add your say', exact: true }).first().click();
  const correction = page.getByRole('dialog');
  await correction.getByRole('radio', { name: /This part doesn’t fit me/ }).check();
  await correction
    .getByRole('textbox', { name: /Your words/ })
    .fill('I prefer quiet thinking before I explain.');
  await correction.getByRole('button', { name: 'Save my say', exact: true }).click();
  await expect(
    page.getByText('I prefer quiet thinking before I explain.', { exact: true }),
  ).toBeVisible();
  await expect(buildRoutine).toBeDisabled();
  await page.getByRole('button', { name: 'I’ve reviewed this picture', exact: true }).click();
  await buildRoutine.click();
  await page.getByRole('combobox', { name: 'Try a focus block', exact: true }).selectOption('5');
  await page.getByRole('combobox', { name: 'Room for a pause', exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Visible steps', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s try this arrangement', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'My trial is saved in this visit', exact: true }),
  ).toBeVisible();

  const visit = await downloadVisit(page);
  expect(Object.keys(visit.session.answers)).toHaveLength(28);
  expect(visit.session.answers['LDS-Q02']).toEqual({ kind: 'skipped' });
  expect(visit.session.answers['LDS-Q07']).toEqual({
    kind: 'selected',
    values: ['depends'],
    other: '',
  });
  expect(Object.keys(visit.session.answers).filter((id) => id.startsWith('LDS-Q24-'))).toHaveLength(
    5,
  );
  expect(visit.session.reviewedRevision).toBe(visit.session.revision);
  expect(visit.teachingProfile?.reviewed).toBe(true);
  expect(visit.teachingProfile?.revision).toBe(visit.session.revision);
  expect(new Set(visit.teachingProfile?.dimensions.map((dimension) => dimension.id)).size).toBe(8);
  expect(
    visit.teachingProfile?.dimensions.find((dimension) => dimension.id === 'personality')
      ?.corrections,
  ).toEqual([{ note: 'I prefer quiet thinking before I explain.', status: 'disagree' }]);
  expect(visit.teachingProfile?.routine).toMatchObject({
    acceptedRevision: visit.session.revision,
    basis: 'learner-chosen-trial',
    choices: { focus: 5, pause: 2, supports: ['Visible steps'] },
  });
});

test('activity revisions retain first work, and guide and matching controls save actual choices', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /A little exploring/ }).click();
  await page.getByRole('button', { name: /The pattern studio/ }).click();
  const firstStrip = page.getByRole('group', { name: /Choice for LDS-A01-P1:/ });
  await firstStrip.getByRole('button', { name: 'Different ends', exact: true }).click();
  await page.getByRole('button', { name: 'Pointing hint', exact: true }).click();
  await page.getByRole('button', { name: 'Check my work, if I want', exact: true }).click();
  await firstStrip.getByRole('button', { name: 'Same ends', exact: true }).click();
  await page.getByRole('button', { name: 'Check my work, if I want', exact: true }).click();
  await page.getByText('See my first submitted work', { exact: true }).click();
  await expect(page.locator('.activity-original').getByText(/P1:.*Different ends/)).toBeVisible();
  await page.getByRole('button', { name: /Try a two-step code/ }).click();
  await page
    .getByRole('combobox', { name: '1. My reversed strip, position 1', exact: true })
    .first()
    .selectOption('○');
  await page.getByRole('button', { name: 'Help with reversing', exact: true }).click();
  const reflectionVersion = page.getByRole('combobox', {
    name: 'These reflections are about',
    exact: true,
  });
  await reflectionVersion.selectOption('sorting');
  await page.getByRole('button', { name: 'Very sure', exact: true }).click();
  await expect(reflectionVersion).toHaveValue('sorting');
  await finishActivity(page);

  await page.getByRole('button', { name: /Make a little guide/ }).click();
  await page.getByLabel(/Give your guide a title/).fill('Borrow and return supplies');
  const moveTakeDown = page.getByRole('button', { name: /Move BORROW step.*Take the item.*down/ });
  await moveTakeDown.click();
  await moveTakeDown.click();
  await page.getByRole('button', { name: /Move RETURN step.*Put the item.*up/ }).click();
  await page.getByRole('button', { name: 'Use “Ask if an item is missing.”', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'A symbol beside BORROW', exact: true })
    .selectOption('→');
  await page.getByLabel('My symbol means', { exact: true }).fill('Start borrowing here');
  await page.getByRole('button', { name: 'Check my work, if I want', exact: true }).click();
  await expect(
    page.getByText('Your BORROW steps follow the source notes.', { exact: true }),
  ).toBeVisible();
  await finishActivity(page);

  await page.getByRole('button', { name: /Find your focus/ }).click();
  await page.getByRole('button', { name: 'Show one row at a time', exact: true }).click();
  await page.getByRole('button', { name: 'Use a place marker', exact: true }).click();
  await page.getByRole('button', { name: 'Place marker at pair 1', exact: true }).click();
  await page
    .getByRole('group', { name: 'Pair 1: circle triangle', exact: true })
    .getByRole('button', { name: 'Match', exact: true })
    .click();
  await page
    .getByRole('group', { name: 'Pair 2: triangle circle', exact: true })
    .getByRole('button', { name: 'Different', exact: true })
    .click();
  await page.getByRole('button', { name: 'Next row', exact: true }).click();
  await page
    .getByRole('group', { name: 'Pair 4: circle triangle', exact: true })
    .getByRole('button', { name: 'Match', exact: true })
    .click();
  await finishActivity(page);

  const visit = await downloadVisit(page);
  expect(visit.teachingProfile).toBeNull();
  const rules = visit.session.activities.find((activity) => activity.id === 'rules');
  if (!rules || rules.id !== 'rules') throw new Error('No rule work was exported.');
  expect(rules.status).toBe('complete');
  expect(rules.sorting.p1).toBe('same');
  expect(rules.submissions[0]?.sorting.p1).toBe('different');
  expect(rules.code.x1.reversed[0]).toBe('○');
  expect(rules.mode).toBe('code');
  expect(rules.reflectionVersion).toBe('sorting');
  expect(rules.reflections.r1).toEqual(['Very sure']);
  const confidenceReflection = visit.report
    .find((section) => section.id === 'confidence')
    ?.said.find((line) => line.sourceId === 'LDS-A01-R1');
  expect(confidenceReflection?.text).toContain('For same ends sorting');
  expect(confidenceReflection?.text).toContain('Very sure');
  expect(rules.hints.map((hint) => hint.id)).toContain('LDS-A01-H1');
  expect(rules.hints.map((hint) => hint.id)).toContain('LDS-A01-XH1');
  const guide = visit.session.activities.find((activity) => activity.id === 'design');
  if (!guide || guide.id !== 'design') throw new Error('No guide was exported.');
  expect(guide.work.borrow).toEqual(['choose', 'log', 'take']);
  expect(guide.work.returnSteps).toEqual(['return', 'cross']);
  expect(guide.work.symbolMeaning).toBe('Start borrowing here');
  const matching = visit.session.activities.find((activity) => activity.id === 'focus');
  if (!matching || matching.id !== 'focus') throw new Error('No matching work was exported.');
  expect(matching.decisions[0]).toBe('match');
  expect(matching.decisions[1]).toBe('different');
  expect(matching.decisions[3]).toBe('match');
  expect(matching.decisions[11]).toBe('unreached');
  expect(matching.supports).toContain('Show one row at a time');
});

test('remembering is optional, survives reload when chosen, clears, and recovers from malformed storage', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Let’s discover', exact: true }).click();
  let welcome = page.getByRole('dialog', { name: 'Before your discovery' });
  await expect(welcome.getByRole('checkbox')).not.toBeChecked();
  await welcome.getByLabel(/What should we call you/).fill('Temporary');
  await welcome.getByRole('button', { name: 'I’m ready to explore' }).click();
  await page
    .getByRole('group', { name: 'Answer choices', exact: true })
    .getByRole('button')
    .first()
    .click();
  await page.reload();
  await page.getByRole('button', { name: 'Let’s discover', exact: true }).click();
  welcome = page.getByRole('dialog', { name: 'Before your discovery' });
  await expect(welcome.getByLabel(/What should we call you/)).toHaveValue('');
  await welcome.getByLabel(/What should we call you/).fill('Sage');
  await welcome.getByRole('checkbox').check();
  await welcome.getByRole('button', { name: 'I’m ready to explore' }).click();
  await page
    .getByRole('group', { name: 'Answer choices', exact: true })
    .getByRole('button')
    .first()
    .click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.reload();
  await expect(
    page.getByText('Welcome back. Your saved visit is ready on this browser.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Continue my discovery', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Position in reflections' })).toHaveAttribute(
    'value',
    '2',
  );
  await page.getByRole('button', { name: 'Open settings', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /Remember on this browser/ })).toBeChecked();
  await page.getByRole('button', { name: 'Clear my visit and start fresh', exact: true }).click();
  await page.getByRole('button', { name: 'Clear this visit', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Let’s discover', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Continue my discovery', exact: true }),
  ).toHaveCount(0);

  // Deliberately corrupt only the off-path storage boundary; happy paths use the UI.
  await page.evaluate((key) => localStorage.setItem(key, '{broken-json'), storageKey);
  await page.reload();
  await expect(page.getByText(/We couldn’t open the saved visit/)).toBeVisible();
  await page.getByRole('button', { name: 'Let’s discover', exact: true }).click();
  welcome = page.getByRole('dialog', { name: 'Before your discovery' });
  await expect(welcome.getByLabel(/What should we call you/)).toHaveValue('');
  await expect(welcome.getByRole('checkbox')).not.toBeChecked();
});

test('390px layout keeps named navigation and question controls usable without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const header = page.getByRole('banner');
  for (const name of ['Your journey', 'My discoveries', 'Open settings']) {
    await expect(header.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(header.getByRole('button', { name, exact: true })).toHaveAccessibleName(name);
  }
  const noHorizontalOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(await noHorizontalOverflow()).toBe(true);
  await begin(page);
  await expect(header.getByRole('button', { name: 'Pause', exact: true })).toHaveAccessibleName(
    'Pause',
  );
  const next = page.getByRole('button', { name: 'Next', exact: true });
  const skip = page.getByRole('button', { name: 'Skip for now', exact: true });
  await expect(next).toBeInViewport();
  await expect(skip).toBeInViewport();
  await page
    .getByRole('group', { name: 'Answer choices', exact: true })
    .getByRole('button')
    .first()
    .click();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByRole('progressbar', { name: 'Position in reflections' })).toHaveAttribute(
    'value',
    '2',
  );
  expect(await noHorizontalOverflow()).toBe(true);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Take a breather' })).toBeVisible();
  await page.getByRole('button', { name: 'Ready when you are', exact: true }).click();
  await expect(next).toBeInViewport();
});
