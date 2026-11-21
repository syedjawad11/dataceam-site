/**
 * Usage: node scripts/build-redirects.mjs (after astro build).
 * Generates Cloudflare redirects; validates every keyword and built target.
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { shortlinks } from '../src/config/shortlinks.ts';

// Only top-level scalar fields are needed from our simple YAML frontmatter.
function scalar(frontmatter, key) {
  const raw = frontmatter
    .match(new RegExp(`^${key}:\\s*([^\\r\\n]*)$`, 'm'))?.[1]
    ?.trim();
  if (raw === undefined) return undefined;
  if (raw.startsWith('"')) return JSON.parse(raw);
  if (raw.startsWith("'"))
    return raw.slice(1, raw.lastIndexOf("'")).replaceAll("''", "'");
  return raw.replace(/\s+#.*$/, '').trim();
}

async function main() {
  const redirects = ['/experts /jobs/ 301', '/experts/ /jobs/ 301'];
  const entries = Object.entries(shortlinks).map(([keyword, target]) => ({
    keyword,
    target,
    source: 'src/config/shortlinks.ts',
  }));
  for (const collection of ['tracks', 'repos', 'guides']) {
    const directory = `src/content/${collection}`;
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
      const keyword = scalar(frontmatter, 'shortlink');
      if (keyword === undefined) continue;
      const slug =
        collection === 'tracks'
          ? scalar(frontmatter, 'slug')
          : collection === 'repos'
            ? `${scalar(frontmatter, 'owner')}-${scalar(frontmatter, 'name')}`
            : file.replace(/\.md$/, '').split(path.sep).join('/');
      entries.push({
        keyword,
        target: `/${collection}/${slug}/`,
        source: filename,
      });
    }
  }
  const seen = new Map();
  // Validate the static destination too, so the legacy redirect cannot go stale.
  for (const target of ['/jobs/', ...entries.map((entry) => entry.target)]) {
    if (!/^\/(?:[a-zA-Z0-9_-]+\/)*$/.test(target))
      throw new Error(`Invalid page target: ${target}`);
    try {
      if (!(await stat(path.join('dist', target, 'index.html'))).isFile())
        throw new Error('not a file');
    } catch {
      throw new Error(
        `Redirect target ${target} has no built page in dist. Run astro build first.`,
      );
    }
  }
  for (const { keyword, target, source } of entries) {
    if (typeof keyword !== 'string' || !/^[a-z0-9-]+$/.test(keyword))
      throw new Error(
        `${source}: invalid shortlink keyword ${JSON.stringify(keyword)} (expected ^[a-z0-9-]+$)`,
      );
    if (seen.has(keyword))
      throw new Error(
        `${source}: duplicate shortlink ${JSON.stringify(keyword)} (also in ${seen.get(keyword)})`,
      );
    seen.set(keyword, source);
    const destination = `${target}?utm_source=social&utm_medium=shortlink&utm_campaign=${keyword} 302`;
    redirects.push(
      `/free/${keyword} ${destination}`,
      `/free/${keyword}/ ${destination}`,
    );
  }
  await writeFile('dist/_redirects', `${redirects.join('\n')}\n`);
  console.log(
    `Redirects: 2 static, ${entries.length} short links → dist/_redirects`,
  );
}
main().catch((error) => {
  console.error(`Redirect build failed: ${error.message}`);
  process.exitCode = 1;
});
