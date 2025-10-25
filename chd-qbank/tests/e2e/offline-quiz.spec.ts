import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_USER_EMAIL || process.env.TEST_USER_EMAIL;
const TEST_PASSWORD = process.env.E2E_USER_PASSWORD || process.env.TEST_USER_PASSWORD;

const OFFLINE_BANNER = /you are offline/i;
const QUEUED_NOTICE = /queued for sync/i;

async function ensureSignedIn(page: Page) {
  await page.goto('/dashboard');
  if (page.url().includes('/dashboard')) {
    return;
  }

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL!);
  await page.getByLabel(/^password$/i).fill(TEST_PASSWORD!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe('Practice quiz offline readiness', () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, 'E2E credentials are required to run offline quiz tests.');

  test('loads cached questions and queues answers while offline', async ({ page, context }) => {
    await ensureSignedIn(page);

    const primaryTarget = '/practice/quiz';
    const fallbackTarget = '/practice';

    await page.goto(primaryTarget);
    if (!page.url().includes('/practice')) {
      await page.goto(fallbackTarget);
    }

    const questionHeading = page.locator('main h2').first();
    await expect(questionHeading).toBeVisible();
    const initialQuestion = await questionHeading.innerText();

    await context.setOffline(true);

    await page.reload();
    await expect(page.locator('main h2').first()).toHaveText(initialQuestion);

    await expect(page.getByRole('alert').filter({ hasText: OFFLINE_BANNER })).toBeVisible({ timeout: 5000 });

    const firstChoice = page.locator('button[data-choice-id]').first();
    await firstChoice.click();

    await expect(page.getByText(QUEUED_NOTICE)).toBeVisible();
  });
});
