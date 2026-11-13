import { expect, test } from 'playwright/test';
import type { Page } from 'playwright/test';

async function openExampleRoutine(page: Page, name: 'Maya' | 'Leo') {
  await page.goto('/?demo=combined');
  await page.getByRole('button', { name: `Load ${name} example`, exact: true }).click();
  await expect(page.getByRole('group', { name: 'Answer choices', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Back to my profile', exact: true }).click();
  await page.getByRole('button', { name: 'Build my trial routine', exact: true }).click();
}

test('reviewed Discovery preferences produce a lesson and a complete prepared math journey', async ({
  page,
}) => {
  await openExampleRoutine(page, 'Maya');
  await page.getByRole('button', { name: 'Build my lesson', exact: true }).click();
  const lesson = page.locator('.lesson-preview');
  await expect(lesson.getByRole('heading', { name: 'A lesson with you in mind' })).toBeVisible();
  await expect(lesson.getByText('Visible steps', { exact: true })).toBeVisible();
  await expect(lesson.getByText(/Try a 5-minute work block/)).toBeVisible();
  await lesson.screenshot({
    path: new URL('../../presentation/assets/combined-lesson-preview.png', import.meta.url)
      .pathname,
  });
  await lesson.getByText('Why this lesson design?', { exact: true }).click();
  await expect(lesson.getByText(/routine\.choices\.supports/)).toBeVisible();
  await expect(lesson.getByText(/LDS-Q10/)).toBeVisible();
  await lesson.getByRole('button', { name: 'Start this lesson', exact: true }).click();
  await expect(lesson.getByRole('img', { name: '2 tens and 7 ones', exact: true })).toBeVisible();
  await lesson.getByRole('button', { name: 'Check this sample', exact: true }).click();
  await lesson.getByRole('button', { name: 'Show the teaching step', exact: true }).click();
  await lesson.getByRole('button', { name: 'Trade 10 ones for 1 ten', exact: true }).click();
  await lesson.getByRole('button', { name: 'Try the fresh problem', exact: true }).click();
  await expect(lesson.locator('.lp-blocks')).toHaveCount(0);
  await expect(lesson.getByText(/5 tens and 13 ones become/)).toHaveCount(0);
  await lesson.getByRole('button', { name: 'Check the prepared response', exact: true }).click();
  await expect(
    lesson.getByRole('heading', { name: 'The need clears. The history stays.' }),
  ).toBeVisible();
  await expect(lesson.getByText('Still pending', { exact: true })).toBeVisible();
});

test('changing the routine requires reconfirmation and changes the next lesson approach', async ({
  page,
}) => {
  await openExampleRoutine(page, 'Maya');
  await page.getByRole('button', { name: 'Build my lesson', exact: true }).click();
  await page
    .locator('.lesson-preview')
    .getByRole('button', { name: 'Back to my routine', exact: true })
    .click();
  await page.getByRole('button', { name: 'Visible steps', exact: true }).click();
  await page.getByRole('button', { name: 'An example to start', exact: true }).click();
  await page.getByLabel('My preferred stretch', { exact: true }).selectOption('stretch');
  await expect(page.getByRole('button', { name: 'Build my lesson', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Let’s try this arrangement', exact: true }).click();
  await page.getByRole('button', { name: 'Build my lesson', exact: true }).click();
  const lesson = page.locator('.lesson-preview');
  await expect(lesson.getByText(/Try the problem first and show how you know/)).toBeVisible();
  await expect(lesson.getByText('10 ones = 1 ten', { exact: true })).toBeVisible();
  await lesson.getByRole('button', { name: 'Start this lesson', exact: true }).click();
  await expect(lesson.locator('.lp-blocks')).toHaveCount(0);
});

test('a real partial discovery requires review and confirmation before a lesson is available', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Let’s discover', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Before your discovery' })
    .getByRole('button', { name: 'I’m ready to explore', exact: true })
    .click();
  await page
    .getByRole('group', { name: 'Answer choices', exact: true })
    .getByRole('button')
    .first()
    .click();
  await page.getByRole('button', { name: 'My discoveries', exact: true }).click();
  const routine = page.getByRole('button', { name: 'Build my trial routine', exact: true });
  await expect(routine).toBeDisabled();
  await page.getByRole('button', { name: 'I’ve reviewed this picture', exact: true }).click();
  await routine.click();
  await expect(page.getByRole('button', { name: 'Build my lesson', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'An example to start', exact: true }).click();
  await page.getByRole('button', { name: 'Let’s try this arrangement', exact: true }).click();
  await page.getByRole('button', { name: 'Build my lesson', exact: true }).click();
  await expect(
    page.locator('.lesson-preview').getByRole('heading', { name: 'A lesson with you in mind' }),
  ).toBeVisible();
});

test('synthetic rehearsal does not read, replace, or clear the saved discovery visit', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-strength-discovery.visit.v1', 'existing-visit-marker'),
  );
  await page.goto('/?demo=combined');
  await page.getByRole('button', { name: 'Load Leo example', exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem('learning-strength-discovery.visit.v1')),
  ).toBe('existing-visit-marker');
  await page.getByRole('button', { name: 'Start fresh', exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem('learning-strength-discovery.visit.v1')),
  ).toBe('existing-visit-marker');
  await expect(page.getByRole('heading', { name: /A little curiosity/ })).toBeVisible();
});

test('the combined lesson remains usable on a phone-sized screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExampleRoutine(page, 'Maya');
  await page.getByRole('button', { name: 'Build my lesson', exact: true }).click();
  const lesson = page.locator('.lesson-preview');
  await expect(lesson.getByRole('heading', { name: 'A lesson with you in mind' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await lesson.getByRole('button', { name: 'Start this lesson', exact: true }).click();
  await expect(
    lesson.getByRole('button', { name: 'Check this sample', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
