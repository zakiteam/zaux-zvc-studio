import { test, expect } from '@playwright/test';
test('builder boots and renders actual Zaux components', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') console.log('BROWSER:', message.text().slice(0, 1000)); });
  const cssResponse = page.waitForResponse(response => response.url().endsWith('/api/preview-css'));
  await page.goto('/');
  expect((await cssResponse).ok()).toBe(true);
  await expect(page.locator('.zb-brand')).toBeVisible({ timeout: 60000 });
  const preview = page.frameLocator('iframe');
  await expect(preview.locator('h1')).toContainText('Le tue idee.', { timeout: 60000 });
  await page.screenshot({ path: 'test-results/studio.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('runtime Tailwind compiles newly authored classes in production', async ({ request }) => {
  const response = await request.post('/api/preview-css', { data: { content: 'text-[#13579b] w-[317px]' } });
  expect(response.ok()).toBe(true);
  const { css } = await response.json();
  expect(css).toMatch(/width:\s*317px/);
  expect(css).toContain('19 87 155');
});
