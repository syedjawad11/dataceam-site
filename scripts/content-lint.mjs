import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const rules = [
  /linkedin/gi,
  /micro1|datafactor|lodex/gi,
  /data\s+broker/gi,
  /guarantee(?:d)?/gi,
  /\b(?:partner|agent|representative)\s+(?:of|for|to)\s+\w+/gi,
  /official\s+partner/gi,
  /act\s+now|limited\s+time|don't\s+miss|get\s+rich/gi,
];
const disclosures = {
  home: 'The buyer pays us a referral fee when a deal closes. You pay nothing for our help.',
  faq: "I'm paid a referral fee by the buyer. It costs you nothing.",
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
  for (const rule of rules) {
    for (const match of checkedSource.matchAll(rule)) {
      const line = source.slice(0, match.index).split('\n').length;
      errors.push(
        `${filename}:${line}: forbidden match ${JSON.stringify(match[0])}`,
      );
    }
  }

  const page = new Map([
    [path.join('dist', 'index.html'), 'home'],
    [path.join('dist', 'faq', 'index.html'), 'faq'],
  ]).get(filename);
  const disclosure = disclosures[page];
  if (
    page &&
    new RegExp(`\\bdata-page\\s*=\\s*["']${page}["']`).test(source) &&
    !source.includes(disclosure)
  ) {
    errors.push(
      `${filename}: missing required disclosure ${JSON.stringify(disclosure)}`,
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

function selfTest() {
  const filename = path.join('content', 'fixture.md');
  const forbidden = [
    'LINKEDIN',
    'micro1',
    'datafactor',
    'lodex',
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
  for (const page of ['home', 'faq']) {
    const file = path.join(
      'dist',
      ...(page === 'faq' ? ['faq'] : []),
      'index.html',
    );
    for (const quote of ['"', "'"]) {
      const marker = `<main data-page=${quote}${page}${quote}>`;
      assert.equal(lintSource(file, marker).length, 1);
      assert.deepEqual(lintSource(file, `${marker}${disclosures[page]}`), []);
      const otherPage = page === 'home' ? 'faq' : 'home';
      assert.equal(
        lintSource(file, `${marker}${disclosures[otherPage]}`).length,
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
