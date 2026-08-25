import { test, expect } from '@playwright/test';

test('login page loads and shows sign-in form', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/SecureCode AI/i);
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  await expect(page.getByPlaceholder(/Enter your org UUID/i)).toBeVisible();
  await expect(page.getByPlaceholder(/you@company.com/i)).toBeVisible();
  await expect(page.getByPlaceholder(/Enter your password/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
});

test('register page is reachable from login', async ({ page }) => {
  await page.goto('/login');
  await page.getByText('Create one').click();
  await expect(page).toHaveURL(/\/register$/);
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
});
