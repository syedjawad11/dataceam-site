import { expect, test } from '@playwright/test';
import { site } from '../src/config/site';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('examples expand natively and the hero link targets them', async ({
  page,
}) => {
  const rows = page.locator('#examples details');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toHaveAttribute('open', '');
  for (const index of [1, 2]) {
    await expect(rows.nth(index)).not.toHaveAttribute('open');
    await rows.nth(index).locator('summary').click();
    await expect(rows.nth(index)).toHaveAttribute('open', '');
    await expect(rows.nth(index).locator('.example-detail')).toBeVisible();
  }
  await rows.nth(0).locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(rows.nth(0)).not.toHaveAttribute('open');

  const explore = page.getByRole('link', { name: 'Explore data examples' });
  await expect(explore).toHaveAttribute('href', '#examples');
  await explore.click();
  await expect(page).toHaveURL(/\/#examples$/);
  await expect(page.locator('#examples')).toBeInViewport();
});

test('both openers use one dialog and restore focus', async ({ page }) => {
  const dialog = page.getByRole('dialog', { name: 'Email Dataceam' });
  const headerOpener = page
    .locator('header')
    .getByRole('button', { name: 'Get in touch' });
  await headerOpener.click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Close', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(headerOpener).toBeFocused();

  const finalOpener = page
    .locator('#contact')
    .getByRole('button', { name: 'Get in touch' });
  await finalOpener.click();
  await expect(page.locator('dialog')).toHaveCount(1);
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(finalOpener).toBeFocused();

  await finalOpener.click();
  await page.mouse.click(2, 2);
  await expect(dialog).not.toBeVisible();
  await expect(finalOpener).toBeFocused();
});

test('published ranges link identifies the source and new tab', async ({
  page,
}) => {
  const source = page.getByRole('link', {
    name: 'See micro1’s published ranges (opens in a new tab)',
  });
  await expect(source).toHaveAttribute(
    'href',
    'https://www.micro1.ai/data-partnerships',
  );
  await expect(source).toHaveAttribute('target', '_blank');
  await expect(source).toHaveAttribute('rel', 'noopener');
});

test('dialog email actions follow the configured address', async ({ page }) => {
  await page
    .locator('header')
    .getByRole('button', { name: 'Get in touch' })
    .click();
  const dialog = page.getByRole('dialog');
  const copy = dialog.getByRole('button', { name: 'Copy email address' });
  if (!site.email.trim() || site.email.startsWith('TODO_')) {
    await expect(dialog.locator('#email-address')).toHaveText(
      '[TO FILL: contact email]',
    );
    await expect(
      dialog.getByRole('button', { name: 'Open email draft' }),
    ).toBeDisabled();
    await expect(copy).toBeDisabled();
  } else {
    await expect(dialog.locator('#email-address')).toHaveText(site.email);
    await expect(
      dialog.getByRole('link', { name: 'Open email draft' }),
    ).toHaveAttribute(
      'href',
      `mailto:${site.email}?subject=Business%20data%20licensing%20inquiry`,
    );
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write']);
    await copy.click();
    await expect(dialog.locator('[aria-live]')).toHaveText(
      'Email address copied',
    );
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      site.email,
    );
    await page.context().clearPermissions();
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: () => Promise.reject(new Error('Clipboard unavailable')),
        },
        configurable: true,
      });
    });
    await copy.click();
    await expect(dialog.locator('[aria-live]')).toContainText(
      'Email address selected.',
    );
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe(
      site.email,
    );
  }
});

test('mobile header and dialog fit and keep keyboard focus inside', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const headerOpener = page
    .locator('header')
    .getByRole('button', { name: 'Get in touch' });
  await expect(headerOpener).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await headerOpener.click();
  const dialog = page.getByRole('dialog');
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(16);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(359);
  expect(bounds!.height).toBeLessThanOrEqual(635);
  for (let index = 0; index < 5; index++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate(
        (element) =>
          element.contains(document.activeElement) ||
          document.activeElement === document.body ||
          document.activeElement === null,
      ),
    ).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(headerOpener).toBeFocused();
});

test('header opens the shared dialog on another page', async ({ page }) => {
  await page.goto('/faq/');
  await page
    .locator('header')
    .getByRole('button', { name: 'Get in touch' })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Email Dataceam' }),
  ).toBeVisible();
});

test('without JavaScript the contact links and examples remain usable', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  const page = await context.newPage();
  await page.goto('/');
  const opener = page
    .locator('header')
    .getByRole('link', { name: 'Get in touch' });
  await expect(opener).toHaveAttribute('href', '/#contact');
  await opener.click();
  await expect(page).toHaveURL(/\/#contact$/);
  await expect(page.locator('#contact')).toBeInViewport();
  const row = page.locator('#examples details').nth(1);
  await row.locator('summary').click();
  await expect(row).toHaveAttribute('open', '');
  await context.close();
});
