import { test, expect } from '@playwright/test';

const INVITE_CODE = process.env.INVITE_CODE || 'CHD2025FALL-STAGING';

function uniqueEmail(prefix = 'offline') {
  const timestamp = Date.now();
  return `${prefix}+${timestamp}@example.com`;
}

function uniqueAlias(prefix = 'OfflineLearner') {
  const suffix = Math.floor(Math.random() * 10_000);
  return `${prefix}-${suffix}`;
}

test.describe('Offline practice session', () => {
  test('serves cached questions and queues answers while offline', async ({ page, context }) => {
    const email = uniqueEmail();
    const password = 'StrongPass!123';
    const alias = uniqueAlias();

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /join chd qbank/i })).toBeVisible();

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/invite code/i).fill(INVITE_CODE);
    await page.getByLabel(/preferred alias/i).fill(alias);
    await page.getByRole('button', { name: /request access/i }).click();

    const creationNotice = page.getByText(/account created\. please sign in\./i);
    await creationNotice.or(page.waitForURL(/\/login$/)).catch(() => {});

    if (!page.url().includes('/login')) {
      await page.goto('/login');
    }

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByText(/next up/i)).toBeVisible();

    await page.waitForFunction(async () => {
      if (!('serviceWorker' in navigator)) {
        return false;
      }
      const registration = await navigator.serviceWorker.ready;
      return !!registration?.active;
    });

    await page.goto('/practice');
    await expect(page.getByRole('button', { name: /reveal explanation/i })).toBeVisible();
    const choiceButtons = page.locator('[data-choice-id]');
    await expect(choiceButtons.first()).toBeVisible();

    const firstChoiceText = await choiceButtons.first().textContent();

    await context.setOffline(true);

    await page.reload();

    await expect(choiceButtons.first()).toBeVisible();
    if (firstChoiceText) {
      await expect(choiceButtons.first()).toContainText(firstChoiceText);
    }

    const offlineBanner = page.getByText(/you are offline/i);
    await expect(offlineBanner).toBeVisible();

    await choiceButtons.first().click();

    const queueNotice = page.getByText(/queued for sync/i);
    await expect(queueNotice).toBeVisible();

    const nextButton = page.getByRole('button', { name: /next question/i });
    await expect(nextButton).toBeEnabled();

    await context.setOffline(false);
  });
});
