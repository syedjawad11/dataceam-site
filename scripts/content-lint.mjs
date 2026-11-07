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
const disclosure =
  "I'm paid a referral fee by the buyer. It costs you nothing.";

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
  for (const rule of rules) {
    for (const match of source.matchAll(rule)) {
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
  for (const page of ['home', 'faq']) {
    const file = path.join(
      'dist',
      ...(page === 'faq' ? ['faq'] : []),
      'index.html',
    );
    for (const quote of ['"', "'"]) {
      const marker = `<main data-page=${quote}${page}${quote}>`;
      assert.equal(lintSource(file, marker).length, 1);
      assert.deepEqual(lintSource(file, `${marker}${disclosure}`), []);
    }
    assert.deepEqual(lintSource(file, '<main>Placeholder</main>'), []);
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
  ];
  let failures = 0;

  for (const filename of files) {
    const errors = lintSource(filename, await readFile(filename, 'utf8'));
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
