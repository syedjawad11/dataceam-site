import { expect, test } from '@playwright/test';
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scripts = fileURLToPath(new URL('../scripts/', import.meta.url));
let root: string;
function write(file: string, content: string) {
  const filename = path.join(root, file);
  mkdirSync(path.dirname(filename), { recursive: true });
  writeFileSync(filename, content);
  return filename;
}
function run(script: string, args: string[] = [], env: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [path.join(scripts, script), ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 10000,
  });
}
test.beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'dataceam-tooling-'));
  for (const collection of ['tracks', 'repos', 'guides'])
    mkdirSync(path.join(root, 'src/content', collection), { recursive: true });
});
test.afterEach(() => rmSync(root, { recursive: true, force: true }));

test('redirects include soon entries and reject invalid, duplicate and missing targets', () => {
  write('dist/jobs/index.html', 'Jobs');
  write('dist/guides/index.html', 'Guides');
  write('dist/tracks/fixture/index.html', 'Track');
  const content = (keyword: string) =>
    `---\nslug: fixture\nstatus: soon\nshortlink: ${keyword}\n---\n`;
  write('src/content/tracks/fixture.md', content('fixture'));
  const built = run('build-redirects.mjs');
  expect(built.status, built.stderr).toBe(0);
  const redirects = readFileSync(path.join(root, 'dist/_redirects'), 'utf8');
  expect(redirects).toContain(
    '/free/fixture /tracks/fixture/?utm_source=social&utm_medium=shortlink&utm_campaign=fixture 302',
  );
  for (const line of redirects.trim().split('\n')) {
    const [source, ...destination] = line.split(' ');
    if (source.startsWith('/free/') && !source.endsWith('/'))
      expect(redirects).toContain(`${source}/ ${destination.join(' ')}\n`);
  }
  for (const [keyword, error] of [
    ['bad_word', 'invalid shortlink keyword'],
    ['jobs', 'duplicate shortlink'],
  ]) {
    write('src/content/tracks/fixture.md', content(keyword));
    const result = run('build-redirects.mjs');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(error);
  }
  write('src/content/tracks/fixture.md', content('fixture'));
  rmSync(path.join(root, 'dist/tracks'), { recursive: true });
  const result = run('build-redirects.mjs');
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('/tracks/fixture/ has no built page');
});

test('repo refresh dry-run preserves bytes and writes only the stats block', () => {
  const literal = "$& $` $' $$";
  const gh = write(
    'bin/gh',
    `#!${process.execPath}\nprocess.stdout.write(JSON.stringify({stargazers_count:42,forks_count:3,license:{spdx_id:${JSON.stringify(literal)}},language:'Python',pushed_at:'2026-11-20T12:00:00Z'}));\n`,
  );
  chmodSync(gh, 0o755);
  const env = {
    PATH: `${path.dirname(gh)}${path.delimiter}${process.env.PATH}`,
  };
  const before =
    `---\nowner: example\nname: project\ndescription: ${JSON.stringify(literal)}\n` +
    'status: soon\nstats:\n  stars: 1\n  forks: 0\n  license: Old\n  language: Old\n  pushedAt: 2020-01-01\n  fetchedAt: 2020-01-01\nquickstart:\n  commands: echo hello\n---\n\nBody stays exactly.\n';
  const file = write('src/content/repos/fixture.md', before);
  const dry = run('refresh-repos.mjs', ['--dry-run'], env);
  expect(dry.status, dry.stderr).toBe(0);
  expect(dry.stdout).toContain('+  stars: 42');
  expect(readFileSync(file, 'utf8')).toBe(before);
  const result = run('refresh-repos.mjs', [], env);
  expect(result.status, result.stderr).toBe(0);
  const after = readFileSync(file, 'utf8');
  expect(after).toContain('  stars: 42');
  expect(after).toContain('  forks: 3');
  expect(after).toContain(`  license: ${JSON.stringify(literal)}\n`);
  const withoutStats = (source: string) =>
    source.replace(/^stats:[^\n]*(?:\n[ \t]+[^\n]*)*/m, 'STATS');
  expect(withoutStats(after)).toBe(withoutStats(before));
  write(
    'src/content/repos/fixture.md',
    before.replace(/^stats:[^\n]*(?:\n[ \t]+[^\n]*)*\n/m, ''),
  );
  const inserted = run('refresh-repos.mjs', [], env);
  expect(inserted.status, inserted.stderr).toBe(0);
  expect(readFileSync(file, 'utf8')).toContain('  stars: 42');
  expect(readFileSync(file, 'utf8')).toContain(
    `description: ${JSON.stringify(literal)}\n`,
  );
  expect(readFileSync(file, 'utf8')).toContain(
    `  license: ${JSON.stringify(literal)}\n`,
  );
});

test('repo refresh falls back to authenticated fetch only when gh is absent', () => {
  const file = write(
    'src/content/repos/fixture.md',
    '---\nowner: example\nname: project\nstatus: soon\n---\nBody.\n',
  );
  const mock = write(
    'mock-repo-fetch.mjs',
    `globalThis.fetch = async (url, options) => {
    if (url !== 'https://api.github.com/repos/example/project' || options.headers.Authorization !== 'Bearer fixture-token' || !options.signal) throw new Error('Missing API request options');
    return Response.json({stargazers_count:7,forks_count:1,license:null,language:null,pushed_at:'2026-11-20T12:00:00Z'});
  };`,
  );
  const args = ['--import', mock, path.join(scripts, 'refresh-repos.mjs')];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: '', GITHUB_TOKEN: 'fixture-token' },
    timeout: 10000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(readFileSync(file, 'utf8')).toContain('  stars: 7');
  expect(readFileSync(file, 'utf8')).toContain('  license: "Not specified"');
  const failure = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, PATH: '', GITHUB_TOKEN: '' },
    timeout: 10000,
  });
  expect(failure.status).toBe(1);
  expect(failure.stderr).toContain('gh is missing');
});

test('external checker lists sources offline, retries HEAD and reports failed fields', () => {
  write(
    'src/content/tracks/fixture.md',
    '---\ncourses:\n  - url: https://example.test/course\n    sourceUrl: https://example.test/source\n---\n[Source](https://example.test/body)\n',
  );
  const dry = run('check-external-links.mjs', ['--dry-run']);
  expect(dry.status, dry.stderr).toBe(0);
  expect(dry.stdout).toContain('3 unique URLs; no requests made.');
  expect(dry.stdout).toContain('(sourceUrl)');
  expect(dry.stdout).toContain('(source link)');
  const mock = write(
    'mock-fetch.mjs',
    `globalThis.fetch = async (url, options) => {
    if(options.headers['User-Agent'] !== 'dataceam-link-check' || options.redirect !== 'follow' || !options.signal) throw new Error('Missing request options');
    const status = options.method === 'HEAD' ? 405 : url.endsWith('/source') ? 404 : 200;
    return new Response(null, {status});
  };`,
  );
  const result = spawnSync(
    process.execPath,
    ['--import', mock, path.join(scripts, 'check-external-links.mjs')],
    { cwd: root, encoding: 'utf8', timeout: 10000 },
  );
  expect(result.status).toBe(1);
  expect(result.stdout).toContain('2 passed, 1 failed');
  expect(result.stderr).toContain('HTTP 404');
  expect(result.stderr).toContain('(sourceUrl)');
});

test('external checker trims body punctuation and continues after malformed URLs', () => {
  write(
    'src/content/tracks/a-malformed.md',
    '---\nsourceUrl: https://[invalid\n---\nBroken https://example.test:bad.\n',
  );
  write(
    'src/content/tracks/z-valid.md',
    '---\nsourceUrl: https://example.test/source\n---\n' +
      'https://example.test/body.,;:!?))\n' +
      '[Source](https://example.test/wiki/Topic_(detail)).\n',
  );
  const dry = run('check-external-links.mjs', ['--dry-run']);
  expect(dry.status).toBe(1);
  expect(dry.stderr).toContain('a-malformed.md:2 (sourceUrl)');
  expect(dry.stderr).toContain('a-malformed.md:4 (source link)');
  expect(dry.stdout).toContain('https://example.test/body\n');
  expect(dry.stdout).toContain('https://example.test/wiki/Topic_(detail)\n');
  expect(dry.stdout).toContain('3 unique URLs; no requests made.');
  expect(dry.stdout).toContain('1 files with invalid URLs.');
  const mock = write(
    'mock-valid-fetch.mjs',
    `globalThis.fetch = async (url) => {
    if (!['https://example.test/source', 'https://example.test/body', 'https://example.test/wiki/Topic_(detail)'].includes(url)) throw new Error('Unexpected URL: ' + url);
    return new Response(null, {status: 200});
  };`,
  );
  const result = spawnSync(
    process.execPath,
    ['--import', mock, path.join(scripts, 'check-external-links.mjs')],
    { cwd: root, encoding: 'utf8', timeout: 10000 },
  );
  expect(result.status).toBe(1);
  expect(result.stdout).toContain('3 passed, 0 failed');
  expect(result.stdout).toContain('1 files with invalid URLs.');
});

test('PDF script skips soon tracks and lists live output without printing', () => {
  write(
    'src/content/tracks/fixture.md',
    '---\nslug: fixture\nstatus: soon\n---\n',
  );
  const none = run('build-track-pdfs.mjs');
  expect(none.status, none.stderr).toBe(0);
  expect(none.stdout.trim()).toBe('No live tracks; nothing to print.');
  write(
    'src/content/tracks/fixture.md',
    '---\nslug: fixture\nstatus: live\n---\n',
  );
  const missing = run('build-track-pdfs.mjs', ['--dry-run']);
  expect(missing.status).toBe(1);
  expect(missing.stderr).toContain('Run npm run build first.');
  write('dist/tracks/fixture/index.html', '<h1>Fixture</h1>');
  const live = run('build-track-pdfs.mjs', ['--dry-run']);
  expect(live.status, live.stderr).toBe(0);
  expect(live.stdout).toContain('public/downloads/fixture.pdf (A4)');
});
