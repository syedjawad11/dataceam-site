/**
 * Usage: npm run build && npm run pdfs -- [--dry-run]
 * Prints live tracks from dist to public/downloads/<slug>.pdf using Chromium.
 * Rebuild afterwards to include the generated PDFs in dist. No network needed.
 */
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const slugs = [];
  const directory = 'src/content/tracks';
  for (const file of (await readdir(directory, { recursive: true }))
    .filter((name) => name.endsWith('.md'))
    .sort()) {
    const filename = path.join(directory, file);
    const source = await readFile(filename, 'utf8');
    const frontmatter = source.match(
      /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
    )?.[1];
    if (frontmatter === undefined)
      throw new Error(`${filename}: missing frontmatter`);
    if (!/^status:\s*['"]?live['"]?\s*(?:#.*)?$/m.test(frontmatter)) continue;
    const slug = frontmatter.match(
      /^slug:\s*['"]?([a-z0-9-]+)['"]?\s*(?:#.*)?$/m,
    )?.[1];
    if (!slug) throw new Error(`${filename}: invalid or missing slug`);
    if (slugs.includes(slug))
      throw new Error(`${filename}: duplicate track slug ${slug}`);
    slugs.push(slug);
  }
  if (slugs.length === 0) {
    console.log('No live tracks; nothing to print.');
    return;
  }
  const root = path.resolve('dist');
  for (const slug of slugs) {
    try {
      await stat(path.join(root, 'tracks', slug, 'index.html'));
    } catch {
      throw new Error(
        `Missing built /tracks/${slug}/. Run npm run build first.`,
      );
    }
  }
  if (dryRun) {
    for (const slug of slugs)
      console.log(
        `Would print dist/tracks/${slug}/index.html → public/downloads/${slug}.pdf (A4)`,
      );
    console.log(
      `PDFs (dry-run): ${slugs.length} live tracks; no files written.`,
    );
    return;
  }
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
  };
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let filename = path.resolve(root, `.${decodeURIComponent(url.pathname)}`);
      if (!filename.startsWith(`${root}${path.sep}`) && filename !== root) {
        res.writeHead(403).end();
        return;
      }
      if ((await stat(filename)).isDirectory())
        filename = path.join(filename, 'index.html');
      const content = await readFile(filename);
      res.writeHead(200, {
        'Content-Type':
          types[path.extname(filename)] ?? 'application/octet-stream',
      });
      res.end(content);
    } catch {
      res.writeHead(404).end();
    }
  });
  let browser;
  try {
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const port = server.address().port;
    browser = await chromium.launch();
    const page = await browser.newPage();
    // PDFs use local build assets only; optional analytics never fires here.
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === `http://127.0.0.1:${port}`
        ? route.continue()
        : route.abort(),
    );
    await mkdir('public/downloads', { recursive: true });
    for (const slug of slugs) {
      const response = await page.goto(
        `http://127.0.0.1:${port}/tracks/${slug}/`,
        { waitUntil: 'networkidle' },
      );
      if (!response?.ok()) throw new Error(`Unable to load /tracks/${slug}/`);
      // eslint-disable-next-line no-undef -- evaluated inside Chromium
      await page.evaluate(() => document.fonts.ready);
      const output = `public/downloads/${slug}.pdf`;
      await page.pdf({
        path: output,
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      });
      console.log(`Printed ${output}`);
    }
    console.log(
      `PDFs: ${slugs.length} printed. Rebuild to publish the downloads.`,
    );
  } finally {
    try {
      await browser?.close();
    } finally {
      server.closeAllConnections();
      if (server.listening)
        await new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
    }
  }
}
main().catch((error) => {
  console.error(`PDF build failed: ${error.message}`);
  process.exitCode = 1;
});
