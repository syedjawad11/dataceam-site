import { expect, test } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';

const notice = 'Referral links: we may earn a fee if you join through them.';
for (const url of ['/', '/jobs/', '/companies/']) {
  test(`${url} navigation fits at 375px`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(url);
    await expect(page.locator('h1')).toHaveCount(1);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    const links = [
      ['Guides', '/guides/'],
      ['Career tracks', '/tracks/'],
      ['Repos', '/repos/'],
      ['AI jobs', '/jobs/'],
      ['For companies', '/companies/'],
    ];
    await expect(nav.getByRole('link')).toHaveCount(5);
    for (const [name, href] of links) {
      const link = nav.getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('href', href);
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const footer = page.locator('.site-footer');
    await expect(footer).not.toContainText('Independent referrer disclosure');
    await expect(
      footer.getByRole('link', { name: 'Referral disclosure' }),
    ).toHaveAttribute('href', '/disclosure/');
    await expect(
      footer.getByText('Facebook (coming soon)', { exact: true }),
    ).toBeVisible();
    await expect(footer.getByRole('link', { name: /Facebook/ })).toHaveCount(0);
  });
}

test('Home has a static newsletter, referral notice and no person identity', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('form, input[type="email"]')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Newsletter: coming soon' }),
  ).toBeVisible();
  await expect(page.locator('main')).toContainText(notice);
  await expect(page.locator('main a[href="/disclosure/"]')).toBeVisible();
  expect(await page.content()).not.toContain('Syed Jawad');
  await expect(page.locator('[data-track-card] a')).toHaveCount(0);
  await expect(
    page.locator(
      'main a[href^="https://refer."], main a[href^="https://t.mercor"]',
    ),
  ).toHaveCount(0);
});

test('disclosure contains the person identity and Person structured data', async ({
  page,
}) => {
  await page.goto('/disclosure/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('main')).toContainText('Syed Jawad');
  await expect(page.locator('main')).toContainText(
    'Last updated 21 November 2026',
  );
  const data = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect([data].flat()).toContainEqual(
    expect.objectContaining({ '@type': 'Person', name: 'Syed Jawad' }),
  );
});

test('jobs consent unlocks real links and locks them again without layout shift', async ({
  page,
}) => {
  await page.goto('/jobs/');
  const platforms = page.locator('.platforms');
  await expect(platforms.getByRole('link')).toHaveCount(0);
  await expect(platforms.getByRole('button')).toHaveCount(2);
  for (const button of await platforms.getByRole('button').all())
    await expect(button).toBeDisabled();
  await page.getByRole('checkbox').scrollIntoViewIfNeeded();
  const before = await platforms.boundingBox();
  await expect(page.locator('main')).toContainText(notice);
  await page.getByRole('checkbox').check();
  await expect(platforms.getByRole('link')).toHaveCount(2);
  for (const link of await platforms.getByRole('link').all()) {
    await expect(link).toHaveAttribute('href', /^https:\/\//);
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
  }
  expect(await platforms.boundingBox()).toEqual(before);
  await page.getByRole('checkbox').uncheck();
  await expect(platforms.getByRole('link')).toHaveCount(0);
  await expect(platforms.getByRole('button')).toHaveCount(2);
  expect(await platforms.boundingBox()).toEqual(before);
});

test('jobs links stay locked without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    baseURL,
  });
  try {
    const page = await context.newPage();
    await page.goto('/jobs/');
    await expect(page.locator('.platforms a')).toHaveCount(0);
    for (const button of await page.locator('.platforms button').all())
      await expect(button).toBeDisabled();
  } finally {
    await context.close();
  }
});

test('redirect output includes legacy redirects and tagged short links', () => {
  const redirects = readFileSync(
    new URL('../dist/_redirects', import.meta.url),
    'utf8',
  );
  expect(redirects).toContain('/experts /jobs/ 301\n');
  expect(redirects).toContain('/experts/ /jobs/ 301\n');
  expect(redirects).toContain(
    '/free/jobs /jobs/?utm_source=social&utm_medium=shortlink&utm_campaign=jobs 302\n',
  );
  expect(
    existsSync(new URL('../dist/experts/index.html', import.meta.url)),
  ).toBe(false);
});
