import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const sitemap = readFileSync(
  new URL('../dist/sitemap-0.xml', import.meta.url),
  'utf8',
);
const soonPages = [
  '/tracks/',
  '/tracks/ai-engineer/',
  '/repos/',
  '/repos/microsoft-ai-agents-for-beginners/',
  '/guides/',
  '/guides/what-is-an-llm/',
  '/guides/topic/llm-basics/',
  '/guides/topic/retrieval-rag/',
  '/guides/topic/agents/',
  '/guides/topic/prompting-safety/',
  '/guides/topic/hardware/',
];

for (const url of soonPages) {
  test(`${url} has one heading, stays unindexed and fits a phone`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(url);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex',
    );
    expect(sitemap).not.toContain(`https://dataceam.com${url}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.locator(
        '.site-header a[href^="/tracks"], .site-header a[href^="/repos"], .site-header a[href^="/guides"]',
      ),
    ).toHaveCount(0);
  });
}

test('the track preview shows stages without a weekly plan or next step', async ({
  page,
}) => {
  await page.goto('/tracks/ai-engineer/');
  await expect(page.locator('body')).toHaveAttribute('data-page', 'track');
  await expect(page.locator('.learning-stage-preview > li')).toHaveCount(3);
  await expect(page.getByText('Coming soon.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Your weekly plan' }),
  ).toHaveCount(0);
  await expect(
    page.locator('a[href="/jobs/"], a[download], #course-list'),
  ).toHaveCount(0);
  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent())!,
  );
  expect(jsonLd).toHaveLength(1);
  expect(jsonLd[0]['@type']).toBe('BreadcrumbList');
  expect(jsonLd[0].itemListElement[0]).toMatchObject({
    name: 'Home',
    item: 'https://dataceam.com/',
  });
});

test('guides lists all 14 linked previews and topic counts', async ({
  page,
}) => {
  await page.goto('/guides/');
  await expect(page.locator('[data-guide-card]')).toHaveCount(14);
  await expect(page.locator('[data-guide-card] a')).toHaveCount(14);
  const counts = [8, 2, 1, 2, 1];
  const tiles = page
    .getByRole('list', { name: 'Guide topics' })
    .locator(':scope > li');
  await expect(tiles).toHaveCount(counts.length);
  for (const [index, count] of counts.entries()) {
    await expect(tiles.nth(index)).toContainText(
      `${count} ${count === 1 ? 'guide' : 'guides'}`,
    );
    await expect(tiles.nth(index)).toContainText('Coming soon');
  }
  await page.getByRole('link', { name: 'What are tokens in AI?' }).click();
  await expect(page).toHaveURL(/\/guides\/tokens\/$/);
  await expect(page.locator('h1')).toHaveText('What are tokens in AI?');
  await expect(page.locator('video, .learning-media')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Related tracks' }),
  ).toBeVisible();
});
