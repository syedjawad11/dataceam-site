/**
 * Usage: npm run links:external -- [--dry-run]
 * Checks collection URL/source fields and body source links, four at a time.
 * Dry-run lists file, field and URL without making network requests.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
const dryRun = process.argv.includes('--dry-run');

function bodyUrl(raw) {
  let url = raw;
  while (true) {
    const trimmed = url.replace(/[.,;:!?]+$/, '');
    const opens = (trimmed.match(/\(/g) ?? []).length;
    const closes = (trimmed.match(/\)/g) ?? []).length;
    const next =
      trimmed.endsWith(')') && closes > opens ? trimmed.slice(0, -1) : trimmed;
    if (next === url) return url;
    url = next;
  }
}

async function request(url, method) {
  const response = await fetch(url, {
    method,
    redirect: 'follow',
    headers: { 'User-Agent': 'dataceam-link-check' },
    signal: AbortSignal.timeout(15000),
  });
  await response.body?.cancel();
  return response;
}
async function check(url) {
  try {
    const head = await request(url, 'HEAD');
    if (head.ok) return { ok: true, detail: `HTTP ${head.status}` };
  } catch {
    /* Retry with GET for servers that reject HEAD. */
  }
  try {
    const get = await request(url, 'GET');
    return { ok: get.ok, detail: `HTTP ${get.status}` };
  } catch (error) {
    return { ok: false, detail: error.message };
  }
}
async function main() {
  const references = new Map();
  const failedFiles = new Set();
  const add = (url, filename, field, line) => {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol))
        throw new Error('Unsupported protocol');
    } catch (error) {
      failedFiles.add(filename);
      console.error(
        `FAIL ${filename}:${line} (${field}): ${error.message}: ${url}`,
      );
      process.exitCode = 1;
      return;
    }
    const refs = references.get(url) ?? [];
    refs.push(`${filename}:${line} (${field})`);
    references.set(url, refs);
  };
  for (const collection of ['tracks', 'repos', 'guides']) {
    const directory = `src/content/${collection}`;
    for (const file of (await readdir(directory, { recursive: true }))
      .filter((name) => name.endsWith('.md'))
      .sort()) {
      const filename = path.join(directory, file);
      const source = await readFile(filename, 'utf8');
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
      if (!match) throw new Error(`${filename}: missing frontmatter`);
      const frontmatter = match[1];
      for (const item of frontmatter.matchAll(
        /^[ \t]*(?:-[ \t]+)?(url|sourceUrl|source):[ \t]*['"]?([^\s'"\]}]+)(?:['"])?/gm,
      )) {
        const line = frontmatter.slice(0, item.index).split('\n').length + 1;
        add(item[2], filename, item[1], line);
      }
      const body = source.slice(match[0].length);
      for (const item of body.matchAll(/https?:\/\/[^\s<>[\]"']+/g)) {
        const line = source
          .slice(0, match[0].length + item.index)
          .split('\n').length;
        add(bodyUrl(item[0]), filename, 'source link', line);
      }
    }
  }
  const entries = [...references];
  if (dryRun) {
    for (const [url, refs] of entries)
      console.log(`${url}\n  ${refs.join('\n  ')}`);
    console.log(
      `External links (dry-run): ${entries.length} unique URLs; no requests made. ${failedFiles.size} files with invalid URLs.`,
    );
    return;
  }
  let next = 0;
  let failures = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, entries.length) }, async () => {
      while (next < entries.length) {
        const [url, refs] = entries[next++];
        const result = await check(url);
        if (!result.ok) {
          failures++;
          console.error(
            `FAIL ${result.detail}: ${url}\n  ${refs.join('\n  ')}`,
          );
        }
      }
    }),
  );
  console.log(
    `External links: ${entries.length - failures} passed, ${failures} failed (${entries.length} unique URLs). ${failedFiles.size} files with invalid URLs.`,
  );
  if (failures) process.exitCode = 1;
}
main().catch((error) => {
  console.error(`External link check failed: ${error.message}`);
  process.exitCode = 1;
});
