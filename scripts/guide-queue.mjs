// `npm run guide:next [-- --list]`: prints the next guide brief to write.
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  GuideToolError,
  REPO_ROOT,
  liveGuideSummaries,
  loadGuides,
  parseArgs,
  readJsonFile,
} from './guides/common.mjs';

const MAX_ATTEMPTS = 2;

export function readQueue(root) {
  const queue = readJsonFile(
    path.join(root, 'ops/guides/queue.json'),
    'ops/guides/queue.json',
  );
  if (!queue || !Array.isArray(queue.guides)) {
    throw new GuideToolError(
      'ops/guides/queue.json must look like {"guides":[{"slug":"..."}]}.',
    );
  }
  for (const entry of queue.guides) {
    if (!entry || typeof entry.slug !== 'string')
      throw new GuideToolError('Every queue entry needs a "slug" string.');
  }
  return queue.guides;
}

export function readParked(root) {
  const file = path.join(root, 'ops/guides/parked.json');
  return existsSync(file) ? readJsonFile(file, 'ops/guides/parked.json') : {};
}

/** Pure selection: first queue entry that is not live and has < 2 parked attempts. */
export function nextGuide(root) {
  const queue = readQueue(root);
  const parked = readParked(root);
  const guides = loadGuides(root);
  const rows = queue.map((entry) => {
    const guide = guides.find((g) => g.slug === entry.slug);
    return {
      entry,
      status: guide ? String(guide.fm.status ?? 'unknown') : 'missing',
      title: guide?.fm.title ?? entry.title ?? '',
      attempts: Number(parked[entry.slug]?.attempts ?? 0),
    };
  });
  const next = rows.find(
    (row) => row.status !== 'live' && row.attempts < MAX_ATTEMPTS,
  );
  return { rows, next, liveGuides: liveGuideSummaries(guides) };
}

function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (flags['self-test']) return selfTest();
  const root =
    typeof flags.root === 'string' ? path.resolve(flags.root) : REPO_ROOT;
  const { rows, next, liveGuides } = nextGuide(root);
  if (flags.list) {
    const pad = (text, n) => String(text).padEnd(n);
    console.log(
      `${pad('slug', 28)}${pad('status', 9)}${pad('parked', 8)}title`,
    );
    for (const row of rows) {
      const state =
        row === next
          ? `${row.status} (next)`
          : row.attempts >= MAX_ATTEMPTS
            ? `${row.status} (parked)`
            : row.status;
      console.log(
        `${pad(row.entry.slug, 28)}${pad(state, 9 + 7)}${pad(row.attempts, 8)}${row.title}`,
      );
    }
    return;
  }
  if (!next) {
    console.log('QUEUE_EMPTY');
    return;
  }
  console.log(
    JSON.stringify(
      { brief: next.entry, parkedAttempts: next.attempts, liveGuides },
      null,
      2,
    ),
  );
}

function selfTest() {
  const started = Date.now();
  const root = mkdtempSync(path.join(tmpdir(), 'guide-queue-'));
  const write = (rel, content) => {
    mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    writeFileSync(path.join(root, rel), content);
  };
  const guide = (slug, status) =>
    write(
      `src/content/guides/${slug}.md`,
      `---\ntitle: 'Guide ${slug}'\ntopic: llm-basics\nstatus: ${status}\npubDate: 2026-11-01\n---\nBody\n`,
    );
  guide('one', 'live');
  guide('two', 'soon');
  guide('three', 'soon');
  guide('four', 'soon');
  write(
    'ops/guides/queue.json',
    JSON.stringify({
      guides: [
        { slug: 'one', angle: 'a' },
        { slug: 'two', angle: 'b' },
        { slug: 'three', angle: 'c' },
        { slug: 'four' },
        { slug: 'five' },
      ],
    }),
  );
  let result = nextGuide(root);
  assert.equal(result.next.entry.slug, 'two', 'skips live guides');
  assert.deepEqual(result.liveGuides, [
    {
      slug: 'one',
      title: 'Guide one',
      url: 'https://dataceam.com/guides/one/',
    },
  ]);
  write(
    'ops/guides/parked.json',
    JSON.stringify({ two: { attempts: 1, reason: 'x', date: '2026-11-24' } }),
  );
  assert.equal(
    nextGuide(root).next.entry.slug,
    'two',
    '1 parked attempt is still allowed',
  );
  write(
    'ops/guides/parked.json',
    JSON.stringify({ two: { attempts: 2, reason: 'x', date: '2026-11-24' } }),
  );
  assert.equal(
    nextGuide(root).next.entry.slug,
    'three',
    '2 parked attempts skips the guide',
  );
  rmSync(path.join(root, 'ops/guides/parked.json'));
  assert.equal(
    nextGuide(root).next.entry.slug,
    'two',
    'parked.json may be missing',
  );
  guide('two', 'live');
  guide('three', 'live');
  guide('four', 'live');
  result = nextGuide(root);
  assert.equal(
    result.next.entry.slug,
    'five',
    'guide without a file counts as not live',
  );
  write('ops/guides/queue.json', JSON.stringify({ guides: [{ slug: 'one' }] }));
  assert.equal(nextGuide(root).next, undefined, 'queue empty');
  write('ops/guides/queue.json', '{"nope":1}');
  assert.throws(() => nextGuide(root), /queue.json must look like/);
  rmSync(root, { recursive: true, force: true });
  console.log(
    `guide-queue self-test OK (${((Date.now() - started) / 1000).toFixed(1)}s)`,
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  try {
    main();
  } catch (error) {
    console.error(
      error instanceof GuideToolError ? `guide-queue: ${error.message}` : error,
    );
    process.exitCode = 1;
  }
}
