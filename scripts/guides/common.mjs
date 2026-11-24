// Shared helpers for the guide tooling (lint, queue, sources, publish, verify).
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseFrontmatter } from 'astro/markdown';

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
export const SLUG_PATTERN = /^[a-z0-9-]+$/;
export const SITE = 'https://dataceam.com';

export class GuideToolError extends Error {}

export const assertSlug = (slug) => {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) {
    throw new GuideToolError(
      `Invalid slug "${slug}": use lowercase letters, digits and hyphens only.`,
    );
  }
  return slug;
};

/** Frontmatter and body of a markdown string. Dates come back as Date objects. */
export function splitMarkdown(raw) {
  const { frontmatter, content } = parseFrontmatter(raw);
  return { fm: frontmatter ?? {}, body: content.replace(/^\r?\n/, '') };
}

/** YYYY-MM-DD for a Date (UTC) or a date-like string; null when unusable. */
export function dateString(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  return null;
}

export const toDate = (value) => {
  const text = dateString(value);
  return text ? new Date(`${text}T00:00:00Z`) : null;
};

/** Today's date in Europe/Malta as YYYY-MM-DD. */
export const maltaToday = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Malta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

export const guidesDir = (root) => path.join(root, 'src/content/guides');

/** Slug of a guide: frontmatter slug when set, else the file name. */
export const guideSlug = (fileName, fm) =>
  typeof fm.slug === 'string' && fm.slug
    ? fm.slug
    : fileName.replace(/\.md$/, '');

export function loadGuides(root) {
  const dir = guidesDir(root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const raw = readFileSync(path.join(dir, name), 'utf8');
      const { fm, body } = splitMarkdown(raw);
      return {
        file: name,
        relPath: `src/content/guides/${name}`,
        slug: guideSlug(name, fm),
        fm,
        body,
        raw,
        live: fm.status === 'live',
      };
    });
}

export function loadInsights(root) {
  const dir = path.join(root, 'src/content/insights');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const { fm } = splitMarkdown(readFileSync(path.join(dir, name), 'utf8'));
      return { slug: guideSlug(name, fm), draft: fm.draft === true };
    });
}

export function readJsonFile(file, label = file) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    throw new GuideToolError(`${label} is missing.`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new GuideToolError(`${label} is not valid JSON: ${error.message}`);
  }
}

export const ensureDir = (dir) => mkdirSync(dir, { recursive: true });

export function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [name, inline] = arg.slice(2).split(/=(.*)/s);
      if (inline !== undefined) flags[name] = inline;
      else if (
        argv[i + 1] !== undefined &&
        !argv[i + 1].startsWith('--') &&
        VALUE_FLAGS.has(name)
      ) {
        flags[name] = argv[(i += 1)];
      } else flags[name] = true;
    } else positional.push(arg);
  }
  return { flags, positional };
}
const VALUE_FLAGS = new Set(['root', 'park', 'base', 'interval', 'timeout']);

export const liveGuideSummaries = (guides) =>
  guides
    .filter((guide) => guide.live)
    .map((guide) => ({
      slug: guide.slug,
      title: guide.fm.title,
      url: `${SITE}/guides/${guide.slug}/`,
    }));
