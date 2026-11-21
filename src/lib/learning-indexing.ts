import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from 'astro/markdown';
import { isLive, repoSlug } from './learning';

// Config runs before Astro's content store exists. Read only local frontmatter
// with Astro's own YAML parser; builds run from the repository root. Both Seo
// callers and sitemap use this exact allow-list, including mixed soon/live sets.
const indexable = new Set<string>();
const sections = ['tracks', 'repos', 'guides'] as const;

for (const section of sections) {
  const directory = path.join(process.cwd(), 'src/content', section);
  const files = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  });
  for (const file of files) {
    if (!file.isFile() || !file.name.endsWith('.md')) continue;
    const filename = path.join(file.parentPath, file.name);
    const { frontmatter } = parseFrontmatter(readFileSync(filename, 'utf8'));
    if (!isLive(frontmatter)) continue;
    const id = path
      .relative(directory, filename)
      .replace(/\.md$/, '')
      .split(path.sep)
      .join('/');
    const slug =
      section === 'tracks'
        ? String(frontmatter.slug)
        : section === 'repos'
          ? repoSlug({
              owner: String(frontmatter.owner),
              name: String(frontmatter.name),
            })
          : String(frontmatter.slug ?? id);
    indexable.add(`/${section}/${slug}/`);
    indexable.add(`/${section}/`);
    if (section === 'guides')
      indexable.add(`/guides/topic/${frontmatter.topic}/`);
  }
}

export function isLearningPageIndexable(url: string): boolean {
  const pathname = new URL(url, 'https://dataceam.com').pathname;
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (!sections.some((section) => normalized.startsWith(`/${section}/`)))
    return true;
  return indexable.has(normalized);
}
