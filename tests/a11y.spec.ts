import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));

function htmlFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) return htmlFiles(filename);
      return entry.isFile() && filename.endsWith('.html') ? [filename] : [];
    })
    .sort();
}

const pages = htmlFiles(dist);
if (pages.length === 0)
  throw new Error('No built HTML pages found. Run npm run build first.');

for (const filename of pages) {
  const url = `/${path.relative(dist, filename).split(path.sep).map(encodeURIComponent).join('/')}`;

  test(`${url} has no serious or critical accessibility violations`, async ({
    page,
  }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      ({ impact }) => impact === 'serious' || impact === 'critical',
    );
    expect(violations).toEqual([]);
  });
}
