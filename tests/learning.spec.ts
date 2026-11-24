import { expect, test, type Page } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { parseFrontmatter } from 'astro/markdown';

const sitemap = readFileSync(
  new URL('../dist/sitemap-0.xml', import.meta.url),
  'utf8',
);

// Status, titles and topics come from the content files, so publishing a
// guide, track or repo never breaks these tests.
interface Entry {
  id: string;
  data: Record<string, unknown>;
  live: boolean;
}
function load(section: 'guides' | 'tracks' | 'repos'): Entry[] {
  const directory = new URL(`../src/content/${section}/`, import.meta.url);
  return readdirSync(directory)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const { frontmatter } = parseFrontmatter(
        readFileSync(new URL(name, directory), 'utf8'),
      );
      return {
        id: name.replace(/\.md$/, ''),
        data: frontmatter,
        live: frontmatter.status === 'live',
      };
    });
}

const guides = load('guides');
const tracks = load('tracks');
const repos = load('repos');
const topics = [...new Set(guides.map(({ data }) => String(data.topic)))];
const slugOf = (entry: Entry) => String(entry.data.slug ?? entry.id);
const repoUrl = (entry: Entry) => `${entry.data.owner}-${entry.data.name}`;

interface PageCase {
  url: string;
  live: boolean;
}
const pages: PageCase[] = [
  { url: '/tracks/', live: tracks.some(({ live }) => live) },
  ...tracks.map((entry) => ({
    url: `/tracks/${slugOf(entry)}/`,
    live: entry.live,
  })),
  { url: '/repos/', live: repos.some(({ live }) => live) },
  ...repos.map((entry) => ({
    url: `/repos/${repoUrl(entry)}/`,
    live: entry.live,
  })),
  { url: '/guides/', live: guides.some(({ live }) => live) },
  ...guides.map((entry) => ({ url: `/guides/${entry.id}/`, live: entry.live })),
  ...topics.map((topic) => ({
    url: `/guides/topic/${topic}/`,
    live: guides.some(({ live, data }) => live && data.topic === topic),
  })),
];

const phoneFits = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

for (const { url, live } of pages) {
  test(`${url} (${live ? 'live' : 'soon'}) has one heading, the right index state and fits a phone`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(url);
    await expect(page.locator('h1')).toHaveCount(1);
    if (live) {
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      expect(sitemap).toContain(`https://dataceam.com${url}`);
    } else {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex',
      );
      expect(sitemap).not.toContain(`https://dataceam.com${url}`);
    }
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://dataceam.com${url}`,
    );
    expect(await phoneFits(page)).toBe(true);
    await expect(
      page.locator(
        '.site-header a[href^="/tracks"], .site-header a[href^="/repos"], .site-header a[href^="/guides"]',
      ),
    ).toHaveCount(3);
  });
}

for (const guide of guides.filter(({ live }) => live)) {
  const url = `/guides/${guide.id}/`;
  test(`${url} is a full article with Article, FAQ and Breadcrumb data`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(url);
    await expect(page.locator('h1')).toHaveText(String(guide.data.title));
    await expect(page).toHaveTitle(
      `${guide.data.seoTitle ?? guide.data.title} | Dataceam`,
    );
    await expect(
      page.getByRole('navigation', { name: 'On this page' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Key takeaways' }),
    ).toBeVisible();
    expect(
      await page.locator('.learning-body img').count(),
    ).toBeGreaterThanOrEqual(2);
    await expect(page.locator('.guide-sources > li').first()).toBeVisible();
    expect(await phoneFits(page)).toBe(true);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'article',
    );
    const types = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    )
      .flatMap((text) => [JSON.parse(text)].flat())
      .map((item) => item['@type']);
    expect(types).toEqual(
      expect.arrayContaining(['Article', 'FAQPage', 'BreadcrumbList']),
    );
  });
}

test('the track preview shows stages without a weekly plan or next step', async ({
  page,
}) => {
  const track = tracks.find(({ live }) => !live);
  test.skip(!track, 'every track is live');
  await page.goto(`/tracks/${slugOf(track!)}/`);
  await expect(page.locator('body')).toHaveAttribute('data-page', 'track');
  await expect(page.locator('.learning-stage-preview > li')).toHaveCount(
    (track!.data.stages as unknown[]).length,
  );
  await expect(page.getByText('Coming soon.', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Your weekly plan' }),
  ).toHaveCount(0);
  await expect(
    page.locator('main a[href="/jobs/"], main a[download], #course-list'),
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

test(`guides lists all ${guides.length} linked previews and topic counts`, async ({
  page,
}) => {
  await page.goto('/guides/');
  await expect(page.locator('h1')).toHaveText('AI guides in plain English');
  await expect(page.locator('[data-guide-card]')).toHaveCount(guides.length);
  await expect(page.locator('[data-guide-card] a')).toHaveCount(guides.length);
  const tiles = page
    .getByRole('list', { name: 'Guide topics' })
    .locator(':scope > li');
  await expect(tiles).toHaveCount(topics.length);
  for (const topic of topics) {
    const inTopic = guides.filter(({ data }) => data.topic === topic);
    const tile = tiles.filter({
      has: page.locator(`a[href="/guides/topic/${topic}/"]`),
    });
    await expect(tile).toContainText(
      `${inTopic.length} ${inTopic.length === 1 ? 'guide' : 'guides'}`,
    );
    if (inTopic.some(({ live }) => live)) {
      await expect(tile).not.toContainText('Coming soon');
    } else {
      await expect(tile).toContainText('Coming soon');
    }
  }
  // Live guides come first, newest first.
  const liveIds = guides
    .filter(({ live }) => live)
    .sort(
      (a, b) =>
        new Date(String(b.data.pubDate)).getTime() -
        new Date(String(a.data.pubDate)).getTime(),
    )
    .map(({ id }) => `/guides/${id}/`);
  const hrefs = await page
    .locator('[data-guide-card] a')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href')));
  expect(hrefs.slice(0, liveIds.length).sort()).toEqual([...liveIds].sort());
  const first = guides[0];
  await page
    .getByRole('link', { name: String(first.data.title), exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(new RegExp(`/guides/${first.id}/$`));
  await expect(page.locator('h1')).toHaveText(String(first.data.title));
  if (!first.live) {
    await expect(page.locator('video, .learning-media')).toHaveCount(0);
    await expect(page.getByText('This guide is being written.')).toBeVisible();
  }
  if ((first.data.tracks as string[]).length > 0) {
    await expect(
      page.getByRole('heading', { name: 'Related tracks' }),
    ).toBeVisible();
  }
});

test('inline links in guide text stay normal text links', async ({ page }) => {
  const guide = guides.find(({ live }) => live);
  test.skip(!guide, 'no live guide yet');
  await page.goto(`/guides/${guide!.id}/`);
  const link = page.locator('.learning-body p a').first();
  test.skip((await link.count()) === 0, 'no inline link in the guide body');
  await expect(link).toHaveCSS('display', 'inline');
});

test('guide titles and slashes: every live guide is linked with a trailing slash', async ({
  page,
}) => {
  await page.goto('/llms.txt');
  const text = await page.locator('body').innerText();
  expect(text).toContain('# Dataceam');
  for (const guide of guides.filter(({ live }) => live))
    expect(text).toContain(`(https://dataceam.com/guides/${guide.id}/)`);
  if (!guides.some(({ live }) => live)) expect(text).not.toContain('## Guides');
});
