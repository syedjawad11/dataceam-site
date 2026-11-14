import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Buyer and platform names may appear inside URLs (referral and listing
// links), never in visible copy, so URLs are masked for that rule only.
const NAME_RULE = /micro1|datafactor|lodex|mercor/gi;
const URL_PATTERN = /https?:\/\/[^\s"'<>()]+/gi;
const rules = [
  /linkedin/gi,
  NAME_RULE,
  /data\s+broker/gi,
  /guarantee(?:d)?/gi,
  /\bvetted\b/gi,
  /\b(?:partner|agent|representative)\s+(?:of|for|to)\s+\w+/gi,
  /official\s+partner/gi,
  /act\s+now|limited\s+time|don't\s+miss|get\s+rich/gi,
];
const REFERRER_ONLY = 'Dataceam is a referrer only.';
const disclosures = {
  home: 'If a company I introduce signs with a buyer, the buyer may pay me a referral fee. You pay nothing for my help.',
  faq: 'If a deal or a hire happens, the buyer or platform may pay me a referral fee. It costs you nothing.',
  experts:
    "If you're hired through one, the platform may pay me a referral bonus.",
};
const allowedPhrases = [
  'not a data broker',
  'not a guarantee',
  'for a limited time before the software accounts are shut down',
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
  for (const rule of rules) {
    const text = rule === NAME_RULE ? urlMasked : checkedSource;
    for (const match of text.matchAll(rule)) {
      const line = source.slice(0, match.index).split('\n').length;
      errors.push(
        `${filename}:${line}: forbidden match ${JSON.stringify(match[0])}`,
      );
    }
  }

  const page = new Map([
    [path.join('dist', 'index.html'), 'home'],
    [path.join('dist', 'faq', 'index.html'), 'faq'],
    [path.join('dist', 'experts', 'index.html'), 'experts'],
  ]).get(filename);
  const disclosure = disclosures[page];
  if (page && new RegExp(`\\bdata-page\\s*=\\s*["']${page}["']`).test(source)) {
    for (const required of [disclosure, REFERRER_ONLY]) {
      if (!source.includes(required)) {
        errors.push(
          `${filename}: missing required disclosure ${JSON.stringify(required)}`,
        );
      }
    }
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
  for (const page of ['home', 'faq', 'experts']) {
    const file = path.join(
      'dist',
      ...(page === 'home' ? [] : [page]),
      'index.html',
    );
    for (const quote of ['"', "'"]) {
      const marker = `<main data-page=${quote}${page}${quote}>`;
      assert.equal(lintSource(file, marker).length, 2);
      assert.deepEqual(
        lintSource(file, `${marker}${REFERRER_ONLY}${disclosures[page]}`),
        [],
      );
      assert.equal(lintSource(file, `${marker}${disclosures[page]}`).length, 1);
      const otherPage = page === 'home' ? 'faq' : 'home';
      assert.equal(
        lintSource(file, `${marker}${REFERRER_ONLY}${disclosures[otherPage]}`)
          .length,
        1,
      );
    }
    assert.deepEqual(lintSource(file, '<main>Placeholder</main>'), []);
  }
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
