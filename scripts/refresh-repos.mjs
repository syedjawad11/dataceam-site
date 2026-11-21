/**
 * Usage: npm run repos:refresh -- [--dry-run]
 * Refreshes only repo frontmatter stats. Uses gh, or GITHUB_TOKEN if gh is absent.
 * Dry-run fetches metadata and prints a diff without writing any files.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const execute = promisify(execFile);
const dryRun = process.argv.includes('--dry-run');
let useFetch = false;

async function metadata(owner, name) {
  if (!useFetch) {
    try {
      const { stdout } = await execute(
        'gh',
        ['api', `repos/${owner}/${name}`],
        { timeout: 30000, maxBuffer: 2 * 1024 * 1024 },
      );
      return JSON.parse(stdout);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      useFetch = true;
    }
  }
  if (!process.env.GITHUB_TOKEN)
    throw new Error(
      'gh is missing; install gh or set GITHUB_TOKEN for the fetch fallback.',
    );
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${name}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'dataceam-repo-refresh',
      },
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);
  return response.json();
}

async function main() {
  let failures = 0;
  let refreshed = 0;
  const directory = 'src/content/repos';
  for (const file of (await readdir(directory, { recursive: true }))
    .filter((name) => name.endsWith('.md'))
    .sort()) {
    const filename = path.join(directory, file);
    try {
      const source = await readFile(filename, 'utf8');
      const match = source.match(/^(---\r?\n)([\s\S]*?)(\r?\n---(?:\r?\n|$))/);
      if (!match) throw new Error('Missing frontmatter');
      const frontmatter = match[2];
      const scalar = (key) => {
        const raw = frontmatter
          .match(new RegExp(`^${key}:\\s*([^\\r\\n]+)`, 'm'))?.[1]
          ?.trim()
          .replace(/\s+#.*$/, '');
        return raw?.replace(/^(['"])(.*)\1$/, '$2');
      };
      const owner = scalar('owner');
      const name = scalar('name');
      if (
        !owner ||
        !name ||
        !/^[\w.-]+$/.test(owner) ||
        !/^[\w.-]+$/.test(name)
      )
        throw new Error('Invalid owner or name');
      const data = await metadata(owner, name);
      if (
        !Number.isInteger(data.stargazers_count) ||
        data.stargazers_count < 0 ||
        !Number.isInteger(data.forks_count) ||
        data.forks_count < 0 ||
        !data.pushed_at ||
        Number.isNaN(Date.parse(data.pushed_at))
      )
        throw new Error('GitHub returned invalid stats');
      // All six fields match the stats schema in src/content.config.ts.
      const stats = {
        stars: data.stargazers_count,
        forks: data.forks_count,
        license: data.license?.spdx_id || data.license?.name || 'Not specified',
        language: data.language || 'Not specified',
        pushedAt: new Date(data.pushed_at).toISOString(),
        fetchedAt: new Date().toISOString().slice(0, 10),
      };
      const newline = match[1].includes('\r') ? '\r\n' : '\n';
      const block = `stats:${newline}${Object.entries(stats)
        .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
        .join(newline)}`;
      const oldBlock = frontmatter.match(
        /^stats:[^\r\n]*(?:\r?\n[ \t]+[^\r\n]*)*/m,
      )?.[0];
      const nextFrontmatter =
        oldBlock === undefined
          ? `${frontmatter}${newline}${block}`
          : frontmatter.replace(oldBlock, () => block);
      const next = source.replace(
        match[0],
        () => `${match[1]}${nextFrontmatter}${match[3]}`,
      );
      console.log(`${dryRun ? 'Would refresh' : 'Refreshed'} ${filename}`);
      if (dryRun) {
        console.log(
          `--- ${filename}\n+++ ${filename} (refreshed)\n${
            oldBlock
              ? oldBlock
                  .split(/\r?\n/)
                  .map((line) => `-${line}`)
                  .join('\n') + '\n'
              : ''
          }${block
            .split(/\r?\n/)
            .map((line) => `+${line}`)
            .join('\n')}`,
        );
      } else await writeFile(filename, next);
      refreshed++;
    } catch (error) {
      failures++;
      console.error(`${filename}: ${error.message}`);
    }
  }
  console.log(
    `Repo refresh${dryRun ? ' (dry-run)' : ''}: ${refreshed} succeeded, ${failures} failed.`,
  );
  if (failures) process.exitCode = 1;
}
main().catch((error) => {
  console.error(`Repo refresh failed: ${error.message}`);
  process.exitCode = 1;
});
