// `npm run guide:sources -- <slug>`: checks that every source URL answers.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  GuideToolError,
  REPO_ROOT,
  assertSlug,
  loadGuides,
  parseArgs,
} from './guides/common.mjs';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BLOCKED = new Set([401, 403, 429]);

const decode = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Returns { url, state: 'ok'|'blocked'|'fail', status, finalUrl, title, note }. */
export async function checkSource(
  url,
  { timeoutMs = 20000, fetchImpl = fetch } = {},
) {
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
        'accept-language': 'en',
      },
    });
    let title = '';
    try {
      const text = (await response.text()).slice(0, 400000);
      title = decode(text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    } catch {
      /* body unreadable (PDF, reset): status is enough */
    }
    const status = response.status;
    const base = { url, status, finalUrl: response.url || url, title };
    if (status >= 200 && status < 400) return { ...base, state: 'ok' };
    if (BLOCKED.has(status))
      return {
        ...base,
        state: 'blocked',
        note: 'BLOCKED: open it with WebFetch',
      };
    return {
      ...base,
      state: 'fail',
      note:
        status === 404 || status === 410
          ? 'GONE: replace this source'
          : `HTTP ${status}`,
    };
  } catch (error) {
    const reason =
      error?.name === 'TimeoutError'
        ? `timeout after ${timeoutMs / 1000}s`
        : (error?.cause?.code ?? error?.message ?? 'network error');
    return {
      url,
      state: 'fail',
      status: 0,
      finalUrl: url,
      title: '',
      note: `NETWORK ERROR: ${reason}`,
    };
  }
}

export async function checkGuideSources(
  root,
  slug,
  options = {},
  log = console.log,
) {
  assertSlug(slug);
  const guide = loadGuides(root).find((g) => g.slug === slug);
  if (!guide) throw new GuideToolError(`No guide with slug "${slug}".`);
  const sources = Array.isArray(guide.fm.sources) ? guide.fm.sources : [];
  if (!sources.length)
    throw new GuideToolError(
      `guides/${guide.file} has no sources in its frontmatter.`,
    );
  let failed = 0;
  const results = await Promise.all(
    sources.map((s) => checkSource(String(s.url), options)),
  );
  for (const r of results) {
    const moved = r.finalUrl && r.finalUrl !== r.url ? ` -> ${r.finalUrl}` : '';
    log(
      `${r.status || '---'} ${r.url}${moved}${r.title ? ` | ${r.title}` : ''}${r.note ? ` | ${r.note}` : ''}`,
    );
    if (r.state === 'fail') failed += 1;
  }
  return { results, failed };
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  if (flags['self-test']) return selfTest();
  const root =
    typeof flags.root === 'string' ? path.resolve(flags.root) : REPO_ROOT;
  if (!positional[0])
    throw new GuideToolError('Usage: npm run guide:sources -- <slug>');
  const { failed } = await checkGuideSources(root, positional[0]);
  if (failed) {
    console.error(
      `guide-sources: ${failed} source(s) failed: fix or replace them.`,
    );
    process.exitCode = 1;
  }
}

async function selfTest() {
  const started = Date.now();
  const server = createServer((req, res) => {
    const route = req.url;
    if (route === '/ok')
      return res
        .writeHead(200, { 'content-type': 'text/html' })
        .end('<html><title> Hello &amp; welcome </title></html>');
    if (route === '/redirect')
      return res.writeHead(301, { location: '/ok' }).end();
    if (route === '/gone') return res.writeHead(410).end('gone');
    if (route === '/missing') return res.writeHead(404).end('no');
    if (route === '/forbidden') return res.writeHead(403).end('no');
    if (route === '/limited') return res.writeHead(429).end('no');
    if (route === '/boom') return res.writeHead(503).end('no');
    if (route === '/slow') return;
    return res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const silent = () => {};
  const one = (route, options) => checkSource(`${base}${route}`, options);
  try {
    const ok = await one('/ok');
    assert.equal(ok.state, 'ok');
    assert.equal(ok.title, 'Hello & welcome');
    const redirected = await one('/redirect');
    assert.equal(redirected.state, 'ok');
    assert.equal(redirected.finalUrl, `${base}/ok`);
    for (const route of ['/missing', '/gone', '/boom'])
      assert.equal((await one(route)).state, 'fail', route);
    for (const route of ['/forbidden', '/limited']) {
      const r = await one(route);
      assert.equal(r.state, 'blocked');
      assert.match(r.note, /BLOCKED: open it with WebFetch/);
    }
    const slow = await one('/slow', { timeoutMs: 300 });
    assert.equal(slow.state, 'fail');
    assert.match(slow.note, /timeout/);
    assert.equal(
      (await checkSource('http://127.0.0.1:1/', { timeoutMs: 2000 })).state,
      'fail',
    );

    const root = mkdtempSync(path.join(tmpdir(), 'guide-sources-'));
    mkdirSync(path.join(root, 'src/content/guides'), { recursive: true });
    const write = (sources) =>
      writeFileSync(
        path.join(root, 'src/content/guides/demo.md'),
        `---\ntitle: Demo\nstatus: soon\nsources:\n${sources.map((u) => `  - { title: t, url: '${u}', checked: 2026-11-24 }`).join('\n')}\n---\nx\n`,
      );
    write([`${base}/ok`, `${base}/forbidden`]);
    const lines = [];
    let outcome = await checkGuideSources(root, 'demo', {}, (line) =>
      lines.push(line),
    );
    assert.equal(outcome.failed, 0, 'blocked sources are not failures');
    assert.ok(lines.some((l) => l.includes('BLOCKED')));
    write([`${base}/ok`, `${base}/missing`]);
    outcome = await checkGuideSources(root, 'demo', {}, silent);
    assert.equal(outcome.failed, 1);
    rmSync(root, { recursive: true, force: true });
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
  console.log(
    `guide-sources self-test OK (${((Date.now() - started) / 1000).toFixed(1)}s)`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch((error) => {
    console.error(
      error instanceof GuideToolError
        ? `guide-sources: ${error.message}`
        : error,
    );
    process.exitCode = 1;
  });
}
