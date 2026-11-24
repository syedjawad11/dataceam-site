// `npm run guide:verify -- <slug>`: waits until the guide is live on dataceam.com.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  GuideToolError,
  REPO_ROOT,
  SITE,
  assertSlug,
  loadGuides,
  parseArgs,
} from './guides/common.mjs';

const decode = (text) =>
  text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
const plain = (html) =>
  decode(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function jsonLdTypes(html) {
  const types = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === 'object') {
      for (const type of [].concat(node['@type'] ?? [])) types.add(type);
      Object.values(node).forEach(
        (value) => typeof value === 'object' && visit(value),
      );
    }
  };
  for (const match of html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    try {
      visit(JSON.parse(match[1]));
    } catch {
      /* reported through the missing types */
    }
  }
  return types;
}

const noindex = (html, headers) =>
  /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html) ||
  /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]*name=["']robots["']/i.test(
    html,
  ) ||
  /noindex/i.test(headers.get('x-robots-tag') ?? '');

/** Polls and checks. Returns the live URL or throws GuideToolError. */
export async function verifyGuide({
  slug,
  title,
  base = SITE,
  intervalMs = 20000,
  timeoutMs = 8 * 60 * 1000,
  log = console.log,
  fetchImpl = fetch,
}) {
  const url = `${base}/guides/${slug}/`;
  const get = (target, init = {}) =>
    fetchImpl(target, {
      signal: AbortSignal.timeout(30000),
      headers: { 'user-agent': 'dataceam-guide-verify' },
      ...init,
    });
  const pageProblems = async (html) => {
    const problems = [];

    const redirect = await get(`${base}/guides/${slug}`, {
      redirect: 'manual',
    });
    const location = redirect.headers.get('location');
    if (
      ![301, 302, 307, 308].includes(redirect.status) ||
      !location ||
      new URL(location, base).pathname !== `/guides/${slug}/`
    ) {
      problems.push(
        `${base}/guides/${slug} (no slash) should redirect to the slash URL, got HTTP ${redirect.status}${location ? ` -> ${location}` : ''}`,
      );
    }

    const sitemap = await get(`${base}/sitemap-0.xml?verify=${Date.now()}`);
    const sitemapText = sitemap.status === 200 ? await sitemap.text() : '';
    if (sitemap.status !== 200)
      problems.push(`/sitemap-0.xml returned HTTP ${sitemap.status}`);
    else if (
      !sitemapText.includes(`<loc>${SITE}/guides/${slug}/</loc>`) &&
      !sitemapText.includes(`<loc>${url}</loc>`)
    ) {
      problems.push(`${SITE}/guides/${slug}/ is not in /sitemap-0.xml`);
    }

    const assets = new Set();
    for (const match of html.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi))
      assets.add(decode(match[1]));
    const og =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i,
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i,
      );
    if (!og) problems.push('no og:image meta tag');
    else assets.add(decode(og[1]));
    for (const src of assets) {
      if (src.startsWith('data:')) continue;
      const target = new URL(src, url).toString();
      try {
        const response = await get(target);
        await response.arrayBuffer();
        if (response.status !== 200)
          problems.push(`${target} returned HTTP ${response.status}`);
      } catch (error) {
        problems.push(`${target} failed: ${error.message}`);
      }
    }

    const types = jsonLdTypes(html);
    for (const type of ['Article', 'FAQPage']) {
      if (!types.has(type)) problems.push(`JSON-LD has no ${type}`);
    }
    return problems;
  };

  const deadline = Date.now() + timeoutMs;
  let lastProblem;
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await get(`${url}?verify=${Date.now()}`);
      const text = await response.text();
      const h1 = text.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (response.status !== 200) lastProblem = `HTTP ${response.status}`;
      else if (!h1 || !plain(h1[1]).includes(title))
        lastProblem = `h1 does not contain the title "${title}"`;
      else if (noindex(text, response.headers)) lastProblem = 'page is noindex';
      else {
        // Right after a deploy the CDN can serve the page before its images,
        // so these checks are retried until the deadline too.
        const problems = await pageProblems(text);
        if (!problems.length) {
          log(`LIVE ${url}`);
          return url;
        }
        lastProblem = `up but not right:\n- ${problems.join('\n- ')}`;
      }
    } catch (error) {
      lastProblem = error?.message ?? 'network error';
    }
    if (Date.now() + intervalMs > deadline) {
      throw new GuideToolError(
        `${url} is not live after ${Math.round(timeoutMs / 1000)}s: ${lastProblem}\nCheck the Cloudflare Pages deploy.`,
      );
    }
    log(`waiting (${attempt}): ${lastProblem}`);
    await sleep(intervalMs);
  }
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  if (flags['self-test']) return selfTest();
  const slug = assertSlug(positional[0] ?? '');
  const root =
    typeof flags.root === 'string' ? path.resolve(flags.root) : REPO_ROOT;
  const guide = loadGuides(root).find((g) => g.slug === slug);
  if (!guide) throw new GuideToolError(`No guide with slug "${slug}".`);
  await verifyGuide({
    slug,
    title: String(guide.fm.title),
    base: typeof flags.base === 'string' ? flags.base.replace(/\/$/, '') : SITE,
    intervalMs: flags.interval ? Number(flags.interval) : 20000,
    timeoutMs: flags.timeout ? Number(flags.timeout) : 8 * 60 * 1000,
  });
}

async function selfTest() {
  const started = Date.now();
  let hits = 0;
  let mode = 'good';
  let base = '';
  const page = (extra = '') =>
    `<!doctype html><html><head>${mode === 'noindex' ? '<meta name="robots" content="noindex">' : ''}<meta property="og:image" content="${base}/og/guides/demo.png"><script type="application/ld+json">${JSON.stringify({ '@graph': [{ '@type': 'Article' }, { '@type': 'FAQPage' }, { '@type': 'BreadcrumbList' }] })}</script></head><body><h1>What is &amp; why?</h1><img src="/img/a.png">${extra}</body></html>`;
  const server = createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://x');
    if (pathname === '/guides/demo/') {
      hits += 1;
      if (mode === 'late' && hits < 3) return res.writeHead(404).end('not yet');
      return res.writeHead(200, { 'content-type': 'text/html' }).end(page());
    }
    if (pathname === '/guides/demo')
      return mode === 'noredirect'
        ? res.writeHead(200).end('x')
        : res.writeHead(308, { location: '/guides/demo/' }).end();
    if (pathname === '/sitemap-0.xml')
      return res
        .writeHead(200)
        .end(
          mode === 'nositemap'
            ? '<urlset></urlset>'
            : `<urlset><url><loc>${base}/guides/demo/</loc></url></urlset>`,
        );
    if (pathname === '/img/a.png' && mode === 'brokenimg')
      return res.writeHead(404).end();
    if (pathname === '/img/a.png' || pathname === '/og/guides/demo.png')
      return res.writeHead(200).end('png');
    return res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  const quiet = [];
  const run = (over = {}) =>
    verifyGuide({
      slug: 'demo',
      title: 'What is & why?',
      base,
      intervalMs: 20,
      timeoutMs: 200,
      log: (l) => quiet.push(l),
      ...over,
    });
  const fails = async (m, pattern) => {
    mode = m;
    await assert.rejects(run(), pattern, m);
  };
  try {
    mode = 'good';
    assert.equal(await run(), `${base}/guides/demo/`);
    assert.ok(quiet.includes(`LIVE ${base}/guides/demo/`));
    mode = 'late';
    hits = 0;
    assert.equal(
      await run(),
      `${base}/guides/demo/`,
      'polls until the page appears',
    );
    assert.ok(quiet.some((l) => l.startsWith('waiting')));
    await fails('noindex', /noindex/);
    await fails('noredirect', /no slash/);
    await fails('nositemap', /not in \/sitemap-0.xml/);
    await fails('brokenimg', /a\.png returned HTTP 404/);
    mode = 'good';
    await assert.rejects(
      run({ title: 'A different title' }),
      /h1 does not contain/,
    );
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
  console.log(
    `verify-guide self-test OK (${((Date.now() - started) / 1000).toFixed(1)}s)`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch((error) => {
    console.error(
      error instanceof GuideToolError
        ? `guide-verify: ${error.message}`
        : error,
    );
    process.exitCode = 1;
  });
}
