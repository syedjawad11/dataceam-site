// Self-test for guide-lint: builds a passing fixture guide in a temp dir,
// proves it passes, then breaks one thing at a time and checks the rule fires.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fleschReadingEase, sentences, syllables } from './markdown.mjs';

const SLUG = 'what-is-an-llm';
const POOLS = {
  a: {
    adj: [
      'small',
      'clear',
      'plain',
      'quick',
      'calm',
      'warm',
      'bright',
      'green',
    ],
    noun: ['model', 'word', 'token', 'list', 'rule', 'guess', 'score', 'chart'],
    verb: ['shape', 'guide', 'match', 'shift', 'weigh', 'sort', 'test', 'read'],
    noun2: ['text', 'page', 'note', 'story', 'file', 'step', 'pair', 'prompt'],
  },
  b: {
    adj: ['tall', 'rich', 'deep', 'sharp', 'light', 'fresh', 'loud', 'neat'],
    noun: [
      'engine',
      'path',
      'layer',
      'chunk',
      'graph',
      'vector',
      'index',
      'bucket',
    ],
    verb: [
      'trace',
      'merge',
      'split',
      'track',
      'store',
      'fetch',
      'count',
      'build',
    ],
    noun2: [
      'queue',
      'table',
      'frame',
      'label',
      'field',
      'block',
      'group',
      'sheet',
    ],
  },
};
const pick = (list, n) => list[n % list.length];
const sentence = (pool, i) => {
  const p = POOLS[pool];
  return `The ${pick(p.adj, i)} ${pick(p.noun, i * 3 + 1)} will ${pick(p.verb, i * 5 + 2)} the ${pick(p.noun2, i * 7 + 3)} when we ${pick(p.verb, i * 2 + 5)} each ${pick(p.noun, i + 4)}.`;
};
const paragraph = (pool, seed, count = 4) =>
  Array.from({ length: count }, (_, k) =>
    sentence(pool, seed * 11 + k * 3 + 1),
  ).join(' ');

const day = (offset, now = Date.now()) =>
  new Date(now + offset * 86400000).toISOString().slice(0, 10);
const SOURCE_URLS = [
  'https://example.org/a',
  'https://example.org/b',
  'https://example.org/c',
  'https://example.org/d',
  'https://example.org/e',
];

export function fixtureFrontmatter(over = {}) {
  return {
    title: 'What is a large language model? A plain guide for beginners',
    seoTitle: 'What is a large language model? Plain guide',
    description:
      'A plain-English answer to what a large language model is, how it predicts the next word and where it goes wrong, with pictures.',
    topic: 'llm-basics',
    status: 'live',
    image: `../../assets/guides/${SLUG}/cover.png`,
    imageAlt: 'Cover picture of a chat bubble beside a book and a chip',
    ogImage: `/og/guides/${SLUG}.png`,
    theme: 'daylight',
    primaryKeyword: 'what is a large language model',
    keywords: ['large language model', 'LLM', 'next word prediction'],
    takeaways: [
      'A model predicts the next word.',
      'It learns from text.',
      'It can be wrong.',
    ],
    faq: [1, 2, 3, 4].map((n) => ({
      q: `Question number ${n} about models?`,
      a: `${paragraph('b', n + 40, 2)} ${sentence('b', n + 60)}`,
    })),
    sources: SOURCE_URLS.map((url, n) => ({
      title: `Source ${n + 1}`,
      url,
      checked: day(-10),
    })),
    pubDate: day(-1),
    tracks: ['ai-engineer'],
    ...over,
  };
}

export function fixtureBody() {
  const link = (n) => `[source ${n + 1} notes](${SOURCE_URLS[n]})`;
  const section = (title, seed, extra = '') =>
    `## ${title}\n\n${paragraph('a', seed)}\n\n${paragraph('a', seed + 1)} See the ${link(seed % 5)}.\n\n${paragraph('a', seed + 2)}\n\n${extra}${paragraph('a', seed + 3)}\n\n${paragraph('a', seed + 4)}\n`;
  const img = (n) =>
    `![A clear picture that shows the part of the process number ${n} in plain steps](../../assets/guides/${SLUG}/step-${n}.png)\n\n*Caption for picture ${n}.*\n\n`;
  const short = (n) => `> **In short:** ${sentence('a', 90 + n)}\n\n`;
  return [
    'What is a large language model? It is a program that reads a lot of text and learns to guess the next word. That one skill lets it answer questions, write drafts and explain ideas in plain words. This guide shows how that works, step by step, and where the idea falls short, so you can use it with care.\n',
    section('What is a large language model (LLM)?', 1, short(1)),
    section('How does a model read text?', 2, img(1)),
    `## A worked example\n\n${paragraph('a', 30)}\n\n1. Split the text into small parts.\n2. Turn each part into a number.\n3. Guess the next part.\n\n${paragraph('a', 31)} Read the [guide to ${'alpha'}](/guides/alpha/) next.\n\n${paragraph('a', 32)}\n\n${short(2)}`,
    section(
      'Why do models make mistakes?',
      4,
      `| Part | What it does |\n| --- | --- |\n| Token | A small piece of text |\n| Context | The text the model can see |\n\n${paragraph('a', 40)}\n\n${img(2)}`,
    ),
    section(
      'Where do the facts come from?',
      5,
      `Read the [FAQ](/faq/) and our [insights](/insights/real-insight/) for more. ${paragraph('a', 41, 2)}\n\n`,
    ),
    `## Next steps\n\n${paragraph('a', 6)} Browse [all guides](/guides/) when you are ready. ${link(1)} ${link(2)} ${link(3)} ${link(4)}\n`,
  ].join('\n');
}

const toMarkdown = (fm, body) =>
  `---\n${JSON.stringify(fm, null, 2)}\n---\n\n${body}`;

function writeFile(root, rel, content) {
  const file = path.join(root, rel);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
}

/** Writes a fixture repo; `tweak` can change fm, body, banned list or files. */
export function makeFixtureRoot(tweak = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'guide-lint-'));
  const fm = fixtureFrontmatter(tweak.fm);
  let body = fixtureBody();
  if (tweak.body) body = tweak.body(body);
  writeFile(root, `src/content/guides/${SLUG}.md`, toMarkdown(fm, body));
  const other = fixtureFrontmatter({
    title: 'Alpha guide about other things entirely, in plain words',
    slug: 'alpha',
    primaryKeyword: 'alpha things',
    sources: [],
  });
  writeFile(
    root,
    'src/content/guides/alpha.md',
    toMarkdown(other, tweak.alphaBody ?? `${paragraph('b', 3, 12)}\n`),
  );
  writeFile(
    root,
    'src/content/insights/real-insight.md',
    toMarkdown({ title: 'Real', draft: false }, 'x\n'),
  );
  writeFile(
    root,
    'src/content/insights/draft-insight.md',
    toMarkdown({ title: 'Draft', draft: true }, 'x\n'),
  );
  for (const rel of ['cover.png', 'step-1.png', 'step-2.png']) {
    if (!tweak.missing?.includes(rel))
      writeFile(root, `src/assets/guides/${SLUG}/${rel}`, 'png');
  }
  if (!tweak.missing?.includes('og.png'))
    writeFile(root, `public/og/guides/${SLUG}.png`, 'png');
  writeFile(
    root,
    `ops/guides/infographics/${SLUG}.json`,
    JSON.stringify({
      slug: SLUG,
      theme: tweak.infoTheme ?? 'daylight',
      images: [],
    }),
  );
  if (tweak.banned !== null)
    writeFile(
      root,
      'ops/guides/banned-phrases.json',
      JSON.stringify(tweak.banned ?? ['\\bdelve\\b', 'game[- ]changer']),
    );
  return root;
}

const long = (n) =>
  Array.from({ length: n }, (_, k) => `word${k}x`.replace(/\d/g, 'a')).join(
    ' ',
  );

export async function runSelfTest({ analyzeGuide }) {
  const started = Date.now();
  // Helper unit checks.
  assert.equal(syllables('model'), 2);
  assert.equal(syllables('make'), 1);
  assert.equal(syllables('table'), 2);
  assert.equal(syllables('used'), 1);
  assert.ok(
    fleschReadingEase(
      sentences('The cat sat on the mat. It was a big red cat.'),
    ) > 90,
  );
  assert.ok(
    fleschReadingEase(
      sentences(
        'Epistemological considerations notwithstanding, institutional interoperability necessitates comprehensive standardization.',
      ),
    ) < 0,
  );

  const roots = [];
  const lint = (tweak, slug = SLUG) => {
    const root = makeFixtureRoot(tweak);
    roots.push(root);
    return analyzeGuide(root, slug);
  };
  const base = lint({});
  assert.deepEqual(
    base.failures,
    [],
    `baseline fixture should pass:\n${base.failures.map((f) => `${f.file} [${f.rule}] ${f.msg}`).join('\n')}`,
  );
  console.log(
    `  baseline fixture passes (${base.stats.words} words, Flesch ${base.stats.flesch.toFixed(1)})`,
  );

  const fmCase = (name, rule, over) => [name, rule, { fm: over }];
  const bodyCase = (name, rule, fn) => [name, rule, { body: fn }];
  const cases = [
    fmCase('short title', 'title-length', { title: 'Too short' }),
    fmCase('long seoTitle', 'seo-title', { seoTitle: 'x'.repeat(50) }),
    fmCase('short description', 'description-length', {
      description: 'Too short.',
    }),
    fmCase('keyword not in title', 'keyword-title', {
      title: 'A plain guide to how chat programs write words',
      seoTitle: 'Plain guide to chat programs',
    }),
    fmCase('keyword not in description', 'keyword-description', {
      description:
        'A plain-English answer about how a chat program predicts the next word and where it goes wrong, with pictures and notes.',
    }),
    fmCase('future pubDate', 'pub-date', { pubDate: day(5) }),
    fmCase('few keywords', 'frontmatter', { keywords: ['one'] }),
    fmCase('wrong cover path', 'image-file', {
      image: '../../assets/guides/other/cover.png',
    }),
    fmCase('wrong og path', 'og-file', { ogImage: '/og/guides/other.png' }),
    ['missing cover file', 'image-file', { missing: ['cover.png'] }],
    ['missing og file', 'og-file', { missing: ['og.png'] }],
    ['theme mismatch', 'theme', { infoTheme: 'paper' }],
    ['missing banned file', 'banned-file', { banned: null }],
    fmCase('4 sources only', 'sources-count', {
      sources: SOURCE_URLS.slice(0, 4).map((url) => ({
        title: 't',
        url,
        checked: day(-1),
      })),
    }),
    fmCase('http source', 'source-https', {
      sources: [
        { title: 't', url: 'http://example.org/a', checked: day(-1) },
        ...SOURCE_URLS.slice(1).map((url) => ({
          title: 't',
          url,
          checked: day(-1),
        })),
      ],
    }),
    fmCase('duplicate source', 'source-unique', {
      sources: [...SOURCE_URLS, SOURCE_URLS[0]].map((url) => ({
        title: 't',
        url,
        checked: day(-1),
      })),
    }),
    fmCase('stale source', 'source-stale', {
      sources: SOURCE_URLS.map((url) => ({
        title: 't',
        url,
        checked: day(-500),
      })),
    }),
    fmCase('source not linked', 'source-unlinked', {
      sources: [...SOURCE_URLS, 'https://example.org/zzz'].map((url) => ({
        title: 't',
        url,
        checked: day(-1),
      })),
    }),
    fmCase('three faq', 'faq-count', {
      faq: fixtureFrontmatter().faq.slice(0, 3),
    }),
    fmCase('faq no question mark', 'faq-question', {
      faq: fixtureFrontmatter().faq.map((f, i) =>
        i === 0 ? { ...f, q: 'Not a question' } : f,
      ),
    }),
    fmCase('faq short answer', 'faq-answer', {
      faq: fixtureFrontmatter().faq.map((f, i) =>
        i === 0 ? { ...f, a: 'Too short.' } : f,
      ),
    }),
    bodyCase(
      'too few words',
      'word-count',
      (b) => b.split('## Where do the facts')[0] + '## Next steps\n\nText.',
    ),
    bodyCase(
      'heading before paragraph',
      'first-paragraph',
      (b) => `## Early\n\n${b}`,
    ),
    bodyCase('h1 in body', 'h1', (b) => `${b}\n# Top\n`),
    bodyCase(
      'heading jump',
      'heading-jump',
      (b) => `${b}\n#### Deep\n\nText.\n`,
    ),
    bodyCase('few question headings', 'h2-questions', (b) =>
      b
        .replace(/\?\n\n/g, '\n\n')
        .replace(
          '## What is a large language model (LLM)',
          '## What is a large language model (LLM)',
        ),
    ),
    bodyCase('few h2', 'h2-count', (b) =>
      b.replace(/^## (How|Why|Where|Next)/gm, '### $1'),
    ),
    bodyCase(
      'h2 duplicates faq',
      'faq-duplicate',
      (b) => `${b}\n## Question number 1 about models?\n\nx\n`,
    ),
    bodyCase('no table', 'table', (b) =>
      b.replace(/\| Part[\s\S]*?can see \|\n/, ''),
    ),
    bodyCase('no in-short', 'in-short', (b) =>
      b.replace(/\*\*In short:\*\*/g, '**Short:**'),
    ),
    bodyCase('em dash', 'dash', (b) =>
      b.replace('plain words.', 'plain words — really.'),
    ),
    bodyCase('double hyphen', 'dash', (b) =>
      b.replace('plain words.', 'plain words -- really.'),
    ),
    bodyCase('exclamation', 'exclamation', (b) =>
      b.replace('with care.', 'with care! Great! Wow!'),
    ),
    bodyCase('banned phrase', 'banned-phrase', (b) =>
      b.replace('plain words.', 'plain words and delve deeper.'),
    ),
    bodyCase('as an AI', 'as-an-ai', (b) =>
      b.replace('plain words.', 'plain words. As an AI I help.'),
    ),
    bodyCase('first person', 'first-person', (b) =>
      b.replace('use it with care.', 'use it with care, my friend.'),
    ),
    bodyCase('long sentence', 'sentence-max', (b) =>
      b.replace(
        'Next steps\n\n',
        `Next steps\n\nThis ${long(45)} ends here.\n\n`,
      ),
    ),
    bodyCase('long paragraph', 'paragraph-length', (b) =>
      b.replace(
        'Next steps\n\n',
        `Next steps\n\n${Array.from({ length: 12 }, (_, i) => sentence('a', i + 200)).join(' ')}\n\n`,
      ),
    ),
    bodyCase('hard to read', 'readability', (b) =>
      b.replace(
        'Next steps\n\n',
        `Next steps\n\n${Array.from({ length: 30 }, () => Array.from({ length: 6 }, () => 'Epistemological considerations necessitate comprehensive institutional standardization.').join(' ')).join('\n\n')}\n\n`,
      ),
    ),
    bodyCase('keyword stuffing', 'keyword-density', (b) =>
      b.replace(
        'Next steps\n\n',
        `Next steps\n\n${Array.from({ length: 13 }, () => 'what is a large language model.').join(' ')}\n\n`,
      ),
    ),
    bodyCase('no ordered list or example', 'ordered-list', (b) =>
      b
        .replace('## A worked example', '## Another part')
        .replace(/1\. Split.*\n2\..*\n3\..*\n/, ''),
    ),
    bodyCase('too few internal links', 'internal-links', (b) =>
      b
        .replace('[FAQ](/faq/)', 'FAQ')
        .replace('[all guides](/guides/)', 'all guides')
        .replace('[insights](/insights/real-insight/)', 'insights'),
    ),
    bodyCase('slashless internal link', 'internal-slash', (b) =>
      b.replace('(/faq/)', '(/faq)'),
    ),
    bodyCase('unknown internal target', 'link-target', (b) =>
      b.replace('(/faq/)', '(/nope/)'),
    ),
    bodyCase('draft insight link', 'link-target', (b) =>
      b.replace('/insights/real-insight/', '/insights/draft-insight/'),
    ),
    bodyCase('self link', 'self-link', (b) =>
      b.replace('(/faq/)', `(/guides/${SLUG}/)`),
    ),
    bodyCase('bad anchor', 'anchor-text', (b) =>
      b.replace('[FAQ]', '[click here]'),
    ),
    bodyCase(
      'external not in sources',
      'external-unlisted',
      (b) => `${b}\nSee [another page](https://example.net/x).\n`,
    ),
    bodyCase(
      'referral platform link',
      'referral-link',
      (b) => `${b}\nTry [a job site](https://t.mercor.com/abc).\n`,
    ),
    bodyCase(
      'bare url',
      'anchor-text',
      (b) => `${b}\nSee https://example.org/a for more.\n`,
    ),
    bodyCase('one image', 'images-count', (b) =>
      b.replace(/!\[[^\n]*step-2[^\n]*\n\n\*Caption for picture 2.\*\n\n/, ''),
    ),
    bodyCase('no caption', 'image-caption', (b) =>
      b.replace('*Caption for picture 1.*', 'Plain text.'),
    ),
    bodyCase('short alt', 'image-alt', (b) =>
      b.replace(
        /!\[A clear picture that shows the part of the process number 1 in plain steps\]/,
        '![Short]',
      ),
    ),
    bodyCase('missing body image file', 'image-file', (b) =>
      b.replace('step-1.png', 'step-9.png'),
    ),
    bodyCase('cover in body', 'image-file', (b) =>
      b.replace('step-1.png', 'cover.png'),
    ),
    bodyCase('adjacent images', 'image-spread', (b) =>
      b.replace(
        /(!\[[^\n]*step-1\.png\)\n\n\*Caption for picture 1\.\*\n\n)/,
        '$1![Another clear picture that shows the part of the process number 2 in plain steps](../../assets/guides/what-is-an-llm/step-2.png)\n\n*Extra.*\n\n',
      ),
    ),
    [
      'shared 10-word sequence',
      'originality',
      { alphaBody: `${sentence('a', 1)} ${sentence('a', 2)}\n` },
    ],
  ];
  for (const [name, rule, tweak] of cases) {
    const { failures } = lint(tweak);
    const hit = failures.find((f) => f.rule === rule);
    assert.ok(
      hit,
      `${name}: expected rule [${rule}], got: ${failures.map((f) => f.rule).join(', ') || 'none'}`,
    );
    assert.match(hit.file, /^guides\//);
    assert.ok(hit.msg.length > 20, 'message should explain the fix');
  }
  console.log(`  ${cases.length} failure cases each trigger their rule`);

  // Sample message format.
  const sample = lint({
    body: (b) =>
      b.replace(
        'Next steps\n\n',
        `Next steps\n\n${Array.from({ length: 80 }, (_, i) => `${sentence('a', i)} ${long(30)}.`).join(' ')}\n\n`,
      ),
  }).failures.find((f) => f.rule === 'sentence-length');
  assert.ok(sample, 'sentence-length rule fires');
  console.log(`  sample: ${sample.file} [${sample.rule}] ${sample.msg}`);

  // Linting a soon guide by slug works and unknown slug errors.
  const soon = lint({ fm: { status: 'soon' } });
  assert.deepEqual(soon.failures, []);
  assert.throws(() => lint({}, 'missing-guide'), /No guide with slug/);
  assert.throws(() => lint({}, 'Bad Slug'), /Invalid slug/);

  for (const root of roots) rmSync(root, { recursive: true, force: true });
  console.log(
    `guide-lint self-test OK (${((Date.now() - started) / 1000).toFixed(1)}s)`,
  );
}
