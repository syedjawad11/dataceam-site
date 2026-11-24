import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Buyer and platform names may appear inside URLs (referral and listing
// links), never in visible copy, so URLs are masked for that rule only.
const NAME_RULE = /micro1|datafactor|lodex|mercor/gi;
const URL_PATTERN = /https?:\/\/[^\s"'<>()]+/gi;
// "agent" is a normal word in AI guides: the guides drop only that alternative.
const PARTNER_RULE =
  /\b(?:partner|agent|representative)\s+(?:of|for|to)\s+\w+/gi;
const GUIDE_PARTNER_RULE =
  /\b(?:partner|representative)\s+(?:of|for|to)\s+\w+/gi;
const isGuideFile = (normalized) =>
  normalized.startsWith('dist/guides/') ||
  normalized.startsWith('src/content/guides/');
const rules = [
  /linkedin/gi,
  NAME_RULE,
  /data\s+broker/gi,
  /guarantee(?:d)?/gi,
  /\bvetted\b/gi,
  PARTNER_RULE,
  /official\s+partner/gi,
  /act\s+now|limited\s+time|don't\s+miss|get\s+rich/gi,
];
const REFERRER_ONLY = 'Dataceam is a referrer only.';
const disclosures = {
  companies:
    'Dataceam is a referrer only. If a company we introduce signs with a buyer, the buyer may pay us a referral fee. You pay nothing for the introduction.',
  jobs: "Dataceam is a referrer only. If you're hired through one of these links, the platform may pay us a referral bonus. You pay nothing.",
  faq: 'If a deal or a hire happens, the buyer or platform may pay us a referral fee. It costs you nothing.',
};
const NOTICE = 'Referral links: we may earn a fee if you join through them.';
const allowedPhrases = [
  'not a data broker',
  'not a guarantee',
  'for a limited time before the software accounts are shut down',
  'AI agent',
];

async function findFiles(directory, extension, optional = false) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (optional && error.code === 'ENOENT') return [];
    throw error;
  }

  const files = await Promise.all(
    entries.map((entry) => {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) return findFiles(filename, extension);
      return entry.isFile() && filename.endsWith(extension) ? [filename] : [];
    }),
  );
  return files.flat().sort();
}

function lintSource(filename, source) {
  const errors = [];
  // Mask only complete, exact phrases, preserving offsets and line numbers.
  const checkedSource = allowedPhrases.reduce(
    (text, phrase) =>
      text.replaceAll(new RegExp(`\\b${phrase}\\b`, 'g'), (match) =>
        ' '.repeat(match.length),
      ),
    source,
  );
  const urlMasked = checkedSource.replace(URL_PATTERN, (match) =>
    ' '.repeat(match.length),
  );
  const normalized = filename.split(path.sep).join('/');
  const activeRules = isGuideFile(normalized)
    ? rules.map((rule) => (rule === PARTNER_RULE ? GUIDE_PARTNER_RULE : rule))
    : rules;
  for (const rule of activeRules) {
    const text = rule === NAME_RULE ? urlMasked : checkedSource;
    for (const match of text.matchAll(rule)) {
      const line = source.slice(0, match.index).split('\n').length;
      errors.push(
        `${filename}:${line}: forbidden match ${JSON.stringify(match[0])}`,
      );
    }
  }

  const page = new Map([
    ['dist/companies/index.html', 'companies'],
    ['dist/jobs/index.html', 'jobs'],
    ['dist/faq/index.html', 'faq'],
  ]).get(normalized);
  const text = metadataText(source.replace(/<[^>]*>/g, ' '));
  if (page) {
    for (const required of new Set([disclosures[page], REFERRER_ONLY])) {
      if (!text.includes(required))
        errors.push(
          `${filename}: missing required disclosure ${JSON.stringify(required)}`,
        );
    }
  }
  const dataPage = source.match(/\bdata-page\s*=\s*["']([^"']+)["']/)?.[1];
  if (
    ['home', 'track', 'companies', 'jobs'].includes(dataPage) &&
    !/\bhref\s*=\s*(["'])\/disclosure\/\1/.test(source)
  ) {
    errors.push(`${filename}: missing link to /disclosure/`);
  }
  if (['home', 'jobs'].includes(dataPage) && !text.includes(NOTICE)) {
    errors.push(
      `${filename}: missing required notice ${JSON.stringify(NOTICE)}`,
    );
  }
  if (
    /Syed\s+Jawad/i.test(text) &&
    ![
      'dist/disclosure/index.html',
      'dist/privacy/index.html',
      'content/disclosure.md',
      'content/privacy.md',
    ].includes(normalized)
  ) {
    errors.push(
      `${filename}: Syed Jawad may appear only on disclosure and privacy pages`,
    );
  }
  return errors;
}

function metadataText(value) {
  const entities = {
    amp: '&',
    quot: '"',
    apos: "'",
    lt: '<',
    gt: '>',
    nbsp: ' ',
  };
  return value
    .replace(
      /&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi,
      (match, entity) => {
        if (!entity.startsWith('#')) return entities[entity.toLowerCase()];
        const hex = entity[1].toLowerCase() === 'x';
        const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
        return code <= 0x10ffff ? String.fromCodePoint(code) : match;
      },
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function lintMetadata(filename, source, seen) {
  const errors = [];
  const title = source.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1];
  let description;
  for (const tag of source.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = new Map(
      [
        ...tag[0].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g),
      ].map(([, name, doubleQuoted, singleQuoted, unquoted]) => [
        name.toLowerCase(),
        doubleQuoted ?? singleQuoted ?? unquoted,
      ]),
    );
    if (attributes.get('name')?.toLowerCase() === 'description') {
      description = attributes.get('content');
      break;
    }
  }

  for (const [kind, value] of [
    ['title', title],
    ['description', description],
  ]) {
    if (value === undefined) continue;
    const text = metadataText(value);
    const key = `${kind}:${text}`;
    const previous = seen.get(key);
    if (previous && previous !== filename) {
      errors.push(
        `${filename}: duplicate ${kind} ${JSON.stringify(text)} (also in ${previous})`,
      );
    } else {
      seen.set(key, filename);
    }
  }
  return errors;
}

// ---------- Trailing-slash rule ----------
// Every internal page URL ends in "/". A URL is a file (exempt) only when its
// last path segment has an extension such as .xml, .png or .txt.
const SITE_HOSTS = new Set(['dataceam.com', 'www.dataceam.com']);

function slashProblem(value, base = 'https://dataceam.com/') {
  const raw = value.trim();
  if (
    !raw ||
    raw.startsWith('#') ||
    /^(?:mailto|tel|javascript|data):/i.test(raw)
  )
    return undefined;
  if (/^https?:\/\/(?:www\.)?dataceam\.com$/i.test(raw.split(/[?#]/)[0]))
    return 'write https://dataceam.com/ with the trailing slash';
  let url;
  try {
    url = new URL(raw, base);
  } catch {
    return undefined;
  }
  if (!/^https?:$/.test(url.protocol) || !SITE_HOSTS.has(url.hostname))
    return undefined;
  const last = url.pathname.split('/').pop();
  if (url.pathname.endsWith('/') || /\.[A-Za-z0-9]+$/.test(last))
    return undefined;
  return 'internal page URLs must end with "/"';
}

function pageUrlFor(filename) {
  const normalized = filename.split(path.sep).join('/');
  if (!normalized.startsWith('dist/') || !normalized.endsWith('.html'))
    return 'https://dataceam.com/';
  const route = normalized
    .slice('dist/'.length)
    .replace(/(?:^|\/)index\.html$/, '/')
    .replace(/\.html$/, '/');
  return new URL(
    route.startsWith('/') ? route : `/${route}`,
    'https://dataceam.com/',
  ).href;
}

function lineOf(source, index) {
  return source.slice(0, index).split('\n').length;
}

function walkStrings(value, visit) {
  if (typeof value === 'string') visit(value);
  else if (Array.isArray(value))
    for (const item of value) walkStrings(item, visit);
  else if (value && typeof value === 'object')
    for (const item of Object.values(value)) walkStrings(item, visit);
}

function lintSlashesHtml(filename, source) {
  const errors = [];
  const base = pageUrlFor(filename);
  const report = (what, value, index, problem) =>
    errors.push(
      `${filename}:${lineOf(source, index)}: ${what} ${JSON.stringify(value)}: ${problem}`,
    );
  for (const match of source.matchAll(/<(?:a|link|area)\b[^>]*>/gi)) {
    const href = match[0].match(
      /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
    );
    if (!href) continue;
    const value = href[1] ?? href[2] ?? href[3];
    const problem = slashProblem(value.replaceAll('&amp;', '&'), base);
    if (problem) report('href', value, match.index, problem);
  }
  for (const match of source.matchAll(/<meta\b[^>]*>/gi)) {
    if (!/\bproperty\s*=\s*["']og:url["']/i.test(match[0])) continue;
    const content = match[0].match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
    const value = content?.[1] ?? content?.[2];
    const problem = value === undefined ? undefined : slashProblem(value, base);
    if (problem) report('og:url', value, match.index, problem);
  }
  for (const match of source.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    let data;
    try {
      data = JSON.parse(match[1]);
    } catch {
      errors.push(
        `${filename}:${lineOf(source, match.index)}: invalid JSON-LD`,
      );
      continue;
    }
    walkStrings(data, (value) => {
      if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return;
      const problem = slashProblem(value, base);
      if (problem) report('JSON-LD URL', value, match.index, problem);
    });
  }
  return errors;
}

function lintSlashesXml(filename, source) {
  const errors = [];
  for (const match of source.matchAll(
    /<(loc|link|guid)\b[^>]*>([^<]*)<\/\1>/gi,
  )) {
    const value = match[2].trim().replace(/^<!\[CDATA\[|\]\]>$/g, '');
    const problem = slashProblem(value);
    if (problem)
      errors.push(
        `${filename}:${lineOf(source, match.index)}: <${match[1]}> ${JSON.stringify(value)}: ${problem}`,
      );
  }
  return errors;
}

function lintSlashesText(filename, source) {
  const errors = [];
  for (const match of source.matchAll(/\]\(([^)\s]+)\)/g)) {
    const problem = slashProblem(match[1]);
    if (problem)
      errors.push(
        `${filename}:${lineOf(source, match.index)}: link ${JSON.stringify(match[1])}: ${problem}`,
      );
  }
  return errors;
}

// Markdown sources of guides and insights: links only, never images.
function lintSlashesMarkdown(filename, source) {
  const errors = [];
  const withoutCode = source
    .replace(/^(```|~~~)[\s\S]*?^\1/gm, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (code) => ' '.repeat(code.length));
  const check = (value, index) => {
    const problem = slashProblem(value);
    if (problem)
      errors.push(
        `${filename}:${lineOf(source, index)}: link ${JSON.stringify(value)}: ${problem}`,
      );
  };
  for (const match of withoutCode.matchAll(
    /(!?)\[(?:[^\]\\]|\\.)*\]\(\s*<?([^)\s>]+)>?[^)]*\)/g,
  )) {
    if (match[1] === '!') continue;
    check(match[2], match.index);
  }
  for (const match of withoutCode.matchAll(/<(https?:\/\/[^>\s]+)>/g))
    check(match[1], match.index);
  for (const match of withoutCode.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm))
    check(match[1], match.index);
  return errors;
}

function lintSlashes(filename, source) {
  if (filename.endsWith('.html')) return lintSlashesHtml(filename, source);
  if (filename.endsWith('.xml')) return lintSlashesXml(filename, source);
  if (filename.endsWith('.md')) return lintSlashesMarkdown(filename, source);
  return lintSlashesText(filename, source);
}

function selfTest() {
  const filename = path.join('content', 'fixture.md');
  const forbidden = [
    'LINKEDIN',
    'micro1',
    'datafactor',
    'lodex',
    'mercor',
    'vetted',
    ['data', 'broker'].join(' '),
    'guarantee',
    'guaranteed',
    'partner of Example',
    'agent for Example',
    'representative to Example',
    'official partner',
    'act now',
    'limited time',
    "don't miss",
    'get rich',
  ];
  for (const text of forbidden) {
    for (let repeat = 0; repeat < 2; repeat++) {
      const errors = lintSource(filename, `Safe copy.\n${text}`);
      assert.equal(errors.length, 1, text);
      assert.ok(errors[0].startsWith(`${filename}:2:`), text);
    }
  }
  assert.equal(lintSource(filename, 'guarantee guarantee').length, 2);
  assert.deepEqual(lintSource(filename, 'Independent referral service.'), []);
  // Names inside URLs are allowed; visible names are not.
  assert.deepEqual(
    lintSource(filename, '<a href="https://jobs.micro1.ai/post/1">Apply</a>'),
    [],
  );
  assert.deepEqual(
    lintSource(filename, 'See https://work.mercor.com/jobs/list_1 today'),
    [],
  );
  assert.equal(
    lintSource(filename, '<a href="https://example.com">micro1</a>').length,
    1,
  );
  assert.equal(
    lintSource(filename, '<a href="https://linkedin.com/in/x">X</a>').length,
    1,
  );
  for (const [allowed, forbiddenVariant] of [
    [allowedPhrases[0], 'not a data brokerage'],
    [allowedPhrases[1], 'not a guaranteed payout'],
    [allowedPhrases[2], 'for a limited time before accounts close'],
  ]) {
    assert.deepEqual(lintSource(filename, `Safe copy. ${allowed}.`), []);
    assert.equal(lintSource(filename, forbiddenVariant).length, 1);
    assert.equal(lintSource(filename, allowed.toUpperCase()).length, 1);
    const errors = lintSource(filename, `${allowed}\n${forbiddenVariant}`);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].startsWith(`${filename}:2:`));
  }
  for (const page of ['companies', 'jobs', 'faq']) {
    const file = path.join('dist', page, 'index.html');
    for (const quote of ['"', "'"]) {
      const marker = `<body data-page=${quote}${page}${quote}>`;
      const extras = `<a href=${quote}/disclosure/${quote}>Referral disclosure</a> ${NOTICE}`;
      assert.deepEqual(
        lintSource(
          file,
          `${marker}${disclosures[page]} ${REFERRER_ONLY}${extras}`,
        ),
        [],
      );
      assert.ok(
        lintSource(file, `${marker}${extras}`).some((error) =>
          error.includes('missing required disclosure'),
        ),
      );
      const otherPage = page === 'companies' ? 'jobs' : 'companies';
      assert.ok(
        lintSource(
          file,
          `${marker}${REFERRER_ONLY}${disclosures[otherPage]}${extras}`,
        ).some((error) => error.includes('missing required disclosure')),
      );
      assert.deepEqual(
        lintSource(
          file,
          `${marker}${disclosures[page].replaceAll(' ', '\n')} ${REFERRER_ONLY}${extras}`,
        ),
        [],
      );
      if (page !== 'faq')
        assert.ok(
          lintSource(file, `${marker}${disclosures[page]} ${NOTICE}`).some(
            (error) => error.includes('missing link'),
          ),
        );
    }
    assert.ok(
      lintSource(file, '<main>Placeholder</main>').some((error) =>
        error.includes('missing required disclosure'),
      ),
    );
  }
  for (const page of ['home', 'track', 'companies', 'jobs']) {
    const file = path.join('dist', 'fixture.html');
    const marker = `<body data-page="${page}">`;
    const needsNotice = ['home', 'jobs'].includes(page);
    assert.equal(lintSource(file, marker).length, needsNotice ? 2 : 1);
    assert.deepEqual(
      lintSource(
        file,
        `${marker}<a href="/disclosure/">Referral disclosure</a> ${needsNotice ? NOTICE : ''}`,
      ),
      [],
    );
    if (needsNotice)
      assert.equal(
        lintSource(file, `${marker}<a href="/disclosure/">Disclosure</a>`)
          .length,
        1,
      );
  }
  for (const file of [
    'dist/disclosure/index.html',
    'dist/privacy/index.html',
    'content/disclosure.md',
    'content/privacy.md',
  ]) {
    assert.deepEqual(lintSource(file, 'Syed Jawad'), []);
  }
  for (const file of [
    'dist/index.html',
    'dist/insights/example/index.html',
    'content/fixture.md',
  ]) {
    assert.equal(lintSource(file, 'Syed Jawad').length, 1);
    assert.equal(lintSource(file, 'Syed&#32;Jawad').length, 1);
  }
  // Home and the removed experts route no longer require company disclosures.
  assert.deepEqual(
    lintSource('dist/index.html', '<main>Learning hub</main>'),
    [],
  );
  assert.deepEqual(
    lintSource('dist/experts/index.html', '<main>Legacy</main>'),
    [],
  );
  const seen = new Map();
  const home = path.join('dist', 'index.html');
  const missing = path.join('dist', '404.html');
  assert.deepEqual(
    lintMetadata(
      home,
      '<title>Home &amp; Dataceam</title><meta name="description" content="Home description.">',
      seen,
    ),
    [],
  );
  const duplicates = lintMetadata(
    missing,
    "<title> Home &#38; Dataceam </title><meta content='Home description.' name='description'>",
    seen,
  );
  assert.equal(duplicates.length, 2);
  for (const [index, kind] of ['title', 'description'].entries()) {
    assert.ok(duplicates[index].startsWith(`${missing}: duplicate ${kind}`));
    assert.ok(duplicates[index].includes(home));
  }
  assert.equal(
    lintMetadata(
      missing,
      '<title>Home &amp; Dataceam</title><meta name="description" content="Unique description.">',
      new Map(seen),
    ).length,
    1,
  );
  assert.equal(
    lintMetadata(
      missing,
      '<title>Unique title</title><meta name="description" content="Home description.">',
      new Map(seen),
    ).length,
    1,
  );
  assert.deepEqual(
    lintMetadata(
      missing,
      '<title>Page not found</title><meta name="description" content="Page not found description.">',
      seen,
    ),
    [],
  );

  // Partner rule: "agent" is a normal word in AI guides, the rest still applies.
  for (const file of [
    'dist/guides/rag/index.html',
    'src/content/guides/rag.md',
  ]) {
    assert.deepEqual(lintSource(file, 'An agent for Example runs tools.'), []);
    assert.deepEqual(lintSource(file, 'Each agent to Example is a loop.'), []);
    assert.equal(lintSource(file, 'partner of Example').length, 1);
    assert.equal(lintSource(file, 'representative for Example').length, 1);
    assert.equal(lintSource(file, 'official partner').length, 1);
  }
  for (const file of [
    'dist/tracks/x/index.html',
    'content/fixture.md',
    'dist/insights/x/index.html',
  ]) {
    assert.equal(lintSource(file, 'agent for Example').length, 1);
    assert.equal(lintSource(file, 'partner of Example').length, 1);
    assert.deepEqual(lintSource(file, 'An AI agent for Example'), []);
    assert.equal(lintSource(file, 'AI Agent for Example').length, 1);
    assert.equal(lintSource(file, 'a data agent for Example').length, 1);
  }
  assert.deepEqual(
    lintSource('dist/guides/a/index.html', 'An AI agent for Example'),
    [],
  );

  // Trailing-slash rule.
  const page = 'dist/guides/rag/index.html';
  const okHtml =
    '<link rel="canonical" href="https://dataceam.com/guides/rag/"><meta property="og:url" content="https://dataceam.com/guides/rag/">' +
    '<a href="/jobs/">Jobs</a><a href="/jobs/#top">x</a><a href="#top">x</a><a href="mailto:hello@dataceam.com">m</a>' +
    '<a href="tel:+1">t</a><a href="/rss.xml">rss</a><a href="https://example.com/a">ext</a><a href="/_astro/x.css">c</a>' +
    '<a href=\'../tokens/\'>rel</a><a href="https://dataceam.com/">home</a><a href="https://dataceam.com/free/a/?x=1">f</a>' +
    '<script type="application/ld+json">{"url":"https://dataceam.com/","list":["https://dataceam.com/guides/rag/","https://dataceam.com/favicon.svg","Not a url"]}</script>';
  assert.deepEqual(lintSlashes(page, okHtml), []);
  for (const bad of [
    '<a href="/jobs">x</a>',
    '<a href="/jobs?x=1">x</a>',
    '<a href="/jobs#top">x</a>',
    '<a href="https://dataceam.com/jobs">x</a>',
    '<a href="http://www.dataceam.com/jobs">x</a>',
    '<a href="https://dataceam.com">x</a>',
    '<a href="../tokens">x</a>',
    '<a href="tokens">x</a>',
    '<link rel="canonical" href="https://dataceam.com/guides/rag">',
    '<meta property="og:url" content="https://dataceam.com/guides/rag">',
    '<script type="application/ld+json">{"a":{"item":"https://dataceam.com/guides/rag"}}</script>',
    '<script type="application/ld+json">[{"mainEntityOfPage":"https://dataceam.com"}]</script>',
  ]) {
    const errors = lintSlashes(page, bad);
    assert.equal(errors.length, 1, bad);
    assert.ok(errors[0].startsWith(`${page}:1:`), bad);
  }
  assert.deepEqual(lintSlashes('dist/index.html', '<a href="tokens">x</a>'), [
    'dist/index.html:1: href "tokens": internal page URLs must end with "/"',
  ]);
  assert.deepEqual(
    lintSlashes('dist/guides/rag/index.html', '<a href="tokens/">x</a>'),
    [],
  );
  assert.deepEqual(
    lintSlashes(
      'dist/sitemap-0.xml',
      '<urlset><url><loc>https://dataceam.com/</loc></url><url><loc>https://dataceam.com/guides/rag/</loc></url></urlset>',
    ),
    [],
  );
  assert.equal(
    lintSlashes(
      'dist/sitemap-0.xml',
      '<url><loc>https://dataceam.com/faq</loc></url>',
    ).length,
    1,
  );
  assert.deepEqual(
    lintSlashes(
      'dist/rss.xml',
      '<rss><channel><link>https://dataceam.com/</link><item><link>https://dataceam.com/insights/a/</link><guid isPermaLink="true">https://dataceam.com/insights/a/</guid></item></channel></rss>',
    ),
    [],
  );
  assert.equal(
    lintSlashes(
      'dist/rss.xml',
      '<item><link>https://dataceam.com/insights/a</link><guid>https://dataceam.com/insights/a</guid></item>',
    ).length,
    2,
  );
  assert.equal(
    lintSlashes('dist/llms.txt', '- [A](https://dataceam.com/faq): x').length,
    1,
  );
  assert.deepEqual(
    lintSlashes('dist/llms.txt', '- [A](https://dataceam.com/faq/): x'),
    [],
  );
  const md = 'src/content/guides/rag.md';
  assert.deepEqual(
    lintSlashesMarkdown(
      md,
      'See [jobs](/jobs/), [x](https://example.com/a), ![img](../../assets/guides/rag/a.png)\n\n`[c](/code)`\n\n```\n[d](/fenced)\n```\n',
    ),
    [],
  );
  for (const bad of [
    '[a](/jobs)',
    '[a](https://dataceam.com/faq)',
    '<https://dataceam.com/faq>',
    '[a]: /faq',
    '[a](https://dataceam.com)',
  ]) {
    assert.equal(lintSlashesMarkdown(md, `Intro\n${bad}`).length, 1, bad);
    assert.ok(
      lintSlashesMarkdown(md, `Intro\n${bad}`)[0].startsWith(`${md}:2:`),
    );
  }
  console.log('Content lint self-tests passed.');
}

async function main() {
  if (process.argv.includes('--self-test')) {
    selfTest();
    return;
  }
  const files = [
    ...(await findFiles('dist', '.html')),
    ...(await findFiles('content', '.md', true)),
    ...(await findFiles('src/content/guides', '.md', true)),
  ];
  const slashFiles = [
    ...(await findFiles('dist', '.html')),
    ...(await findFiles('dist', '.xml', true)),
    ...(await findFiles('dist', '.txt', true)).filter((file) =>
      file.endsWith('llms.txt'),
    ),
    ...(await findFiles('src/content/guides', '.md', true)),
    ...(await findFiles('src/content/insights', '.md', true)),
  ];
  let failures = 0;
  const seenMetadata = new Map();

  for (const filename of files) {
    const source = await readFile(filename, 'utf8');
    const errors = lintSource(filename, source);
    if (filename.endsWith('.html')) {
      errors.push(...lintMetadata(filename, source, seenMetadata));
    }
    for (const error of errors) console.error(error);
    failures += errors.length;
  }
  for (const filename of slashFiles) {
    const errors = lintSlashes(filename, await readFile(filename, 'utf8'));
    for (const error of errors) console.error(error);
    failures += errors.length;
  }

  if (failures) {
    process.exitCode = 1;
  } else {
    console.log(`Content lint passed (${files.length} files).`);
  }
}

main().catch((error) => {
  console.error(`Content lint failed: ${error.message}`);
  process.exitCode = 1;
});
