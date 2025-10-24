import { test, expect } from '@playwright/test';

const INVITE_CODE = process.env.INVITE_CODE || 'CHD2025FALL-STAGING';

function uniqueEmail(prefix = 'e2e') {
  const ts = Date.now();
  return `${prefix}+${ts}@example.com`;
}

test.describe('Signup → Login → Dashboard happy path', () => {
  test('create account with invite, then sign in and reach dashboard', async ({ page }) => {
    const email = uniqueEmail('student');
    const password = 'StrongPass!123';
    const alias = `Test-Alias-${Math.floor(Math.random() * 10_000)}`;

    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: /join chd qbank/i })).toBeVisible();

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByLabel(/invite code/i).fill(INVITE_CODE);
    await page.getByLabel(/preferred alias/i).fill(alias);
    await page.getByRole('button', { name: /request access/i }).click();

    const success = page.getByText(/account created\. please sign in\./i);
    await success.or(page.waitForURL(/\/login$/)).catch(() => {});

    if (!page.url().includes('/login')) {
      await page.goto('/login');
    }
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password$/i).fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByText(/next up/i)).toBeVisible();
    await expect(page.getByText(/practice attempts/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /resume practice/i })).toBeVisible();
  });
});
