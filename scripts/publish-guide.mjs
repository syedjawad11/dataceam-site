// `npm run guide:publish -- <slug> [--dry-run]` and `--park "<reason>"`.
//
// This is the only path by which the unattended guide routine reaches `main`,
// so it is deliberately strict: it inspects exactly what changed in the working
// tree (git status -z), compares guides against HEAD, runs the quality gates,
// commits only allow-listed files, verifies the commit and pushes without force.
// Hooks (render, lint, check, today, push race) can be injected only by calling
// publishGuide()/parkGuide() from code, which the CLI never does except for the
// real implementations. The self-test lives in guides/publish-guide-selftest.mjs.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { analyzeGuide } from './guide-lint.mjs';
import {
  GuideToolError,
  REPO_ROOT,
  assertSlug,
  dateString,
  guideSlug,
  maltaToday,
  parseArgs,
  splitMarkdown,
} from './guides/common.mjs';

export class Refusal extends GuideToolError {}

const TRAILER = 'Co-Authored-By: Claude <noreply@anthropic.com>';
const LIMITS = { png: 3_000_000, json: 300_000, md: 600_000, log: 1_000_000 };
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const LOG_PATH = 'ops/guides/log.md';
const PARKED_PATH = 'ops/guides/parked.json';
const GUIDE_MD = /^src\/content\/guides\/[a-z0-9][a-z0-9-]*\.md$/;

// ---- git -------------------------------------------------------------------

const GIT_ENV = (() => {
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };
  for (const key of [
    'GIT_DIR',
    'GIT_WORK_TREE',
    'GIT_INDEX_FILE',
    'GIT_COMMON_DIR',
    'GIT_PREFIX',
    'GIT_OBJECT_DIRECTORY',
  ])
    delete env[key];
  return env;
})();

function git(root, args, { allowFail = false } = {}) {
  const result = spawnSync(
    'git',
    ['-c', 'core.quotepath=off', '--literal-pathspecs', ...args],
    {
      cwd: root,
      encoding: 'utf8',
      env: GIT_ENV,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error)
    throw new Refusal(`could not run git: ${result.error.message}`);
  if (result.status !== 0 && !allowFail) {
    throw new Refusal(
      `git ${args.join(' ')} failed (exit ${result.status}): ${(result.stderr || result.stdout).trim()}`,
    );
  }
  return allowFail ? result : result.stdout;
}

const head = (root) => git(root, ['rev-parse', 'HEAD']).trim();

function showHead(root, rel) {
  const result = git(root, ['show', `HEAD:${rel}`], { allowFail: true });
  return result.status === 0 ? result.stdout : null;
}

// ---- change inspection -----------------------------------------------------

/** Entries of `git status --porcelain=v1 -z --untracked-files=all`. */
export function parsePorcelain(output) {
  const tokens = output.split('\0');
  const entries = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;
    const x = token[0];
    const y = token[1];
    const entry = { x, y, path: token.slice(3), from: null };
    if (x === 'R' || x === 'C' || y === 'R' || y === 'C') {
      i += 1;
      entry.from = tokens[i] ?? '';
    }
    entries.push(entry);
  }
  return entries;
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function pathKind(rel, slug, mode) {
  if (mode === 'park') {
    if (rel === PARKED_PATH) return 'parked';
    if (
      ['article.md', 'infographics.json', 'review.md'].some(
        (name) => rel === `ops/guides/drafts/${slug}/${name}`,
      )
    )
      return 'draft';
    return null;
  }
  if (GUIDE_MD.test(rel)) return 'md';
  if (
    new RegExp(
      `^src/assets/guides/${escapeRegex(slug)}/[a-z0-9][a-z0-9._-]*\\.png$`,
    ).test(rel)
  )
    return 'png';
  if (rel === `public/og/guides/${slug}.png`) return 'png';
  if (rel === `ops/guides/infographics/${slug}.json`) return 'json';
  if (rel === LOG_PATH) return 'log';
  if (rel === PARKED_PATH) return 'parked';
  return null;
}

function assertPlainFile(root, rel, tracked) {
  // Every directory on the way, and the file itself, must be real (no symlinks).
  const parts = rel.split('/');
  let current = root;
  for (let i = 0; i < parts.length; i += 1) {
    current = path.join(current, parts[i]);
    let stat;
    try {
      stat = lstatSync(current);
    } catch {
      throw new Refusal(`${rel} cannot be read: it must be an ordinary file.`);
    }
    if (stat.isSymbolicLink())
      throw new Refusal(
        `${rel} goes through a symlink (${parts.slice(0, i + 1).join('/')}): refused.`,
      );
    if (i < parts.length - 1 && !stat.isDirectory())
      throw new Refusal(
        `${rel}: ${parts.slice(0, i + 1).join('/')} is not a directory.`,
      );
    if (i === parts.length - 1) {
      if (!stat.isFile()) throw new Refusal(`${rel} is not a regular file.`);
      if (stat.mode & 0o111)
        throw new Refusal(`${rel} has an executable bit: refused.`);
      if (stat.size > LIMITS.log)
        throw new Refusal(`${rel} is unreasonably large (${stat.size} bytes).`);
    }
  }
  if (tracked) {
    const listing = git(root, ['ls-tree', 'HEAD', '--', rel]).trim();
    if (!listing.startsWith('100644 blob '))
      throw new Refusal(
        `${rel} is not a plain 100644 file in HEAD (${listing.split('\t')[0]}): refused.`,
      );
  }
}

/** Validates the whole working tree against the allow-list; returns entries. */
export function inspectChanges(root, slug, mode) {
  const entries = parsePorcelain(
    git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
  );
  const bad = [];
  for (const entry of entries) {
    const label = entry.from ? `${entry.from} -> ${entry.path}` : entry.path;
    const kind = pathKind(entry.path, slug, mode);
    const staged = entry.x !== ' ' && entry.x !== '?';
    if (staged)
      bad.push(`${label} (already staged or renamed: ${entry.x}${entry.y})`);
    else if (!kind) bad.push(`${label} (not an allowed path)`);
    else if (entry.y !== 'M' && entry.y !== '?')
      bad.push(
        `${label} (${entry.y === 'D' ? 'deleted' : `change type ${entry.y}`}: only edits and new files are allowed)`,
      );
    else if (kind === 'md' && entry.y === '?')
      bad.push(
        `${label} (new guide files cannot be published, only existing ones)`,
      );
    entry.kind = kind;
  }
  if (bad.length)
    throw new Refusal(
      `refusing to ${mode === 'park' ? 'park' : 'publish'}, these changes are not allowed:\n- ${bad.join('\n- ')}`,
    );
  for (const entry of entries) {
    assertPlainFile(root, entry.path, entry.y === 'M');
    const full = path.join(root, entry.path);
    const size = lstatSync(full).size;
    if (entry.kind === 'png') {
      if (size > LIMITS.png)
        throw new Refusal(`${entry.path} is larger than ${LIMITS.png} bytes.`);
      if (!readFileSync(full).subarray(0, 8).equals(PNG_MAGIC))
        throw new Refusal(`${entry.path} is not a PNG file.`);
    } else if (
      (entry.kind === 'json' ||
        (entry.kind === 'draft' && entry.path.endsWith('.json'))) &&
      size > LIMITS.json
    )
      throw new Refusal(`${entry.path} is too large.`);
    else if (
      (entry.kind === 'md' ||
        (entry.kind === 'draft' && entry.path.endsWith('.md'))) &&
      size > LIMITS.md
    )
      throw new Refusal(`${entry.path} is too large.`);
    if (entry.kind === 'draft') validateDraft(root, entry.path, slug);
  }
  return entries;
}

function validateDraft(root, rel, slug) {
  const text = readFileSync(path.join(root, rel), 'utf8');
  if (rel.endsWith('/article.md')) {
    const guidePath = `src/content/guides/${slug}.md`;
    const headText = showHead(root, guidePath);
    if (headText === null)
      throw new Refusal(
        `${guidePath} does not exist in HEAD: cannot park ${rel}.`,
      );
    const before = parseGuideText(headText, `${guidePath} (HEAD)`);
    const article = parseGuideText(text, rel);
    if (article.fm.status !== 'live')
      throw new Refusal(`${rel}: frontmatter status must be "live".`);
    for (const key of ['title', 'topic']) {
      if (article.fm[key] !== before.fm[key])
        throw new Refusal(
          `${rel}: frontmatter ${key} must match ${guidePath} in HEAD.`,
        );
    }
  } else if (rel.endsWith('/infographics.json')) {
    try {
      if (JSON.parse(text)?.slug !== slug) throw new Error('slug mismatch');
    } catch {
      throw new Refusal(`${rel} must be valid JSON with "slug": "${slug}".`);
    }
  } else if (!text.trim()) {
    throw new Refusal(`${rel} must not be empty.`);
  }
}

function checkLogAndParked(root, entries) {
  for (const entry of entries) {
    if (entry.kind === 'log') {
      const before = showHead(root, LOG_PATH) ?? '';
      const now = readFileSync(path.join(root, LOG_PATH), 'utf8');
      if (!now.startsWith(before))
        throw new Refusal(
          `${LOG_PATH} may only be appended to, but existing lines were changed.`,
        );
    }
    if (entry.kind === 'parked') validateParked(readParkedFile(root));
  }
}

function readParkedFile(root) {
  const file = path.join(root, PARKED_PATH);
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Refusal(`${PARKED_PATH} is not valid JSON: ${error.message}`);
  }
}

function validateParked(data) {
  const ok =
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    Object.entries(data).every(
      ([key, value]) =>
        /^[a-z0-9-]+$/.test(key) &&
        value &&
        typeof value === 'object' &&
        Number.isInteger(value.attempts) &&
        value.attempts >= 0 &&
        typeof value.reason === 'string' &&
        typeof value.date === 'string',
    );
  if (!ok)
    throw new Refusal(
      `${PARKED_PATH} must look like {"<slug>":{"attempts":1,"reason":"...","date":"YYYY-MM-DD"}}.`,
    );
}

/** The queue as committed in HEAD: a working-tree edit can never add a slug. */
function assertQueued(root, slug) {
  const text = showHead(root, 'ops/guides/queue.json');
  let guides;
  try {
    guides = JSON.parse(text ?? '').guides;
  } catch {
    throw new Refusal('ops/guides/queue.json is missing or invalid in HEAD.');
  }
  if (!Array.isArray(guides) || !guides.some((entry) => entry?.slug === slug)) {
    throw new Refusal(
      `"${slug}" is not in ops/guides/queue.json (as committed).`,
    );
  }
}

function parseGuideText(text, rel) {
  try {
    return splitMarkdown(text);
  } catch (error) {
    throw new Refusal(`${rel} has unreadable frontmatter: ${error.message}`);
  }
}

/** Checks which guides changed and how. Returns { target, others }. */
function inspectGuides(root, slug, entries, today) {
  const changed = entries.filter((entry) => entry.kind === 'md');
  const goingLive = [];
  const others = [];
  let target = null;
  for (const entry of changed) {
    const headText = showHead(root, entry.path);
    if (headText === null)
      throw new Refusal(`${entry.path} does not exist in HEAD.`);
    const before = parseGuideText(headText, `${entry.path} (HEAD)`);
    const after = parseGuideText(
      readFileSync(path.join(root, entry.path), 'utf8'),
      entry.path,
    );
    const name = path.basename(entry.path);
    const info = {
      rel: entry.path,
      name,
      before,
      after,
      slug: guideSlug(name, before.fm),
    };
    const wasLive = before.fm.status === 'live';
    const isLive = after.fm.status === 'live';
    if (!wasLive && isLive) goingLive.push(info);
    if (info.slug === slug) target = info;
    else others.push(info);
  }
  if (!target)
    throw new Refusal(
      `src/content/guides/${slug}.md is not among the changes: the guide to publish must be edited.`,
    );
  if (goingLive.length !== 1 || goingLive[0] !== target) {
    const names = goingLive.map((g) => g.slug).join(', ') || 'none';
    throw new Refusal(
      `exactly one guide may go live and it must be "${slug}" (soon -> live), but status changed to live for: ${names}.`,
    );
  }
  const { before: tb, after: ta } = target;
  if (tb.fm.status === 'live')
    throw new Refusal(`"${slug}" is already live in HEAD.`);
  if (dateString(ta.fm.pubDate) !== today)
    throw new Refusal(
      `pubDate of "${slug}" is ${dateString(ta.fm.pubDate)}: it must be today in Europe/Malta (${today}).`,
    );
  if (ta.fm.title !== tb.fm.title)
    throw new Refusal(
      `title of "${slug}" changed from the committed one ("${tb.fm.title}"): the queue title is fixed.`,
    );
  if (ta.fm.topic !== tb.fm.topic)
    throw new Refusal(
      `topic of "${slug}" changed from "${tb.fm.topic}" to "${ta.fm.topic}": not allowed.`,
    );
  if (guideSlug(target.name, ta.fm) !== slug)
    throw new Refusal(
      `slug of "${slug}" changed in the frontmatter: not allowed.`,
    );
  if (others.length > 3)
    throw new Refusal(
      `${others.length} other guides changed (max 3): ${others.map((o) => o.name).join(', ')}.`,
    );
  const link = new RegExp(
    `\\[([^\\]\\[\\n]+)\\]\\(/guides/${escapeRegex(slug)}/\\)`,
    'g',
  );
  const unwrap = (body) => body.replace(link, '$1');
  const count = (body) => (body.match(link) ?? []).length;
  for (const other of others) {
    const { before, after } = other;
    if (before.fm.status !== 'live' || after.fm.status !== 'live')
      throw new Refusal(
        `${other.name} is not live: only already-live guides may be edited besides "${slug}".`,
      );
    const keys = new Set([...Object.keys(before.fm), ...Object.keys(after.fm)]);
    keys.delete('updatedDate');
    for (const key of keys) {
      if (!isDeepStrictEqual(before.fm[key], after.fm[key]))
        throw new Refusal(
          `${other.name}: frontmatter "${key}" changed: only updatedDate and links to the new guide are allowed.`,
        );
    }
    if (after.fm.updatedDate !== undefined) {
      const updated = dateString(after.fm.updatedDate);
      if (!updated || updated > today)
        throw new Refusal(
          `${other.name}: updatedDate must be a date up to today (${today}).`,
        );
    }
    if (
      unwrap(before.body) !== unwrap(after.body) ||
      count(after.body) < count(before.body)
    ) {
      throw new Refusal(
        `${other.name}: the body changed beyond adding markdown links to /guides/${slug}/ (wrap existing words only, change nothing else).`,
      );
    }
  }
  return { target, others };
}

// ---- shared pre-flight and commit/push -------------------------------------

function preflight(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']).trim();
  if (realpathSync(top) !== realpathSync(root))
    throw new Refusal(`run this from the repository root (${top}).`);
  const branch = git(root, ['symbolic-ref', '--short', '-q', 'HEAD'], {
    allowFail: true,
  }).stdout.trim();
  if (branch !== 'main')
    throw new Refusal(
      `must be on branch main (currently ${branch || 'a detached HEAD'}).`,
    );
  git(root, [
    'fetch',
    '--no-tags',
    'origin',
    '+refs/heads/main:refs/remotes/origin/main',
  ]);
  const [ahead, behind] = git(root, [
    'rev-list',
    '--left-right',
    '--count',
    'HEAD...origin/main',
  ])
    .trim()
    .split(/\s+/)
    .map(Number);
  if (behind > 0)
    throw new Refusal(
      `local main is ${behind} commit(s) behind origin/main: run git pull --ff-only first.`,
    );
  if (ahead > 0)
    throw new Refusal(
      `local main is ${ahead} commit(s) ahead of origin/main: unpushed local commits are not allowed.`,
    );
  if (git(root, ['diff', '--cached', '--name-only', '-z']).length)
    throw new Refusal(
      'something is already staged: unstage it first (git reset).',
    );
}

function parseNameStatus(output) {
  const tokens = output.split('\0').filter(Boolean);
  const rows = [];
  for (let i = 0; i + 1 < tokens.length; i += 2)
    rows.push({ status: tokens[i], path: tokens[i + 1] });
  return rows;
}

function sameSet(rows, expected) {
  const got = rows.map((r) => r.path).sort();
  return isDeepStrictEqual(got, [...expected].sort());
}

function verifyCommit(root, parent, expected, slug, mode) {
  const parents = git(root, ['rev-list', '--parents', '-n', '1', 'HEAD'])
    .trim()
    .split(' ');
  const rows = parseNameStatus(
    git(root, [
      'show',
      '--no-renames',
      '--name-status',
      '--format=',
      '-z',
      'HEAD',
    ]),
  );
  const problems = [];
  if (parents.length !== 2 || (parent && parents[1] !== parent))
    problems.push(
      'the commit does not have exactly the expected single parent',
    );
  for (const row of rows) {
    if (row.status !== 'A' && row.status !== 'M')
      problems.push(
        `${row.status} ${row.path} (only added or modified files are allowed)`,
      );
    if (!pathKind(row.path, slug, mode))
      problems.push(`${row.path} is not an allowed path`);
  }
  if (!sameSet(rows, expected))
    problems.push(
      `commit contains ${JSON.stringify(rows.map((r) => r.path))}, expected ${JSON.stringify(expected)}`,
    );
  return problems;
}

function pushWithRetry({ root, slug, mode, expected, hooks, log }) {
  const attempt = () => {
    hooks.beforePush?.(root);
    return git(root, ['push', 'origin', 'HEAD:refs/heads/main'], {
      allowFail: true,
    });
  };
  let result = attempt();
  if (result.status !== 0) {
    log(
      `push rejected (${result.stderr.trim().split('\n').pop()}): rebasing once`,
    );
    const pulled = git(root, ['pull', '--rebase', 'origin', 'main'], {
      allowFail: true,
    });
    if (pulled.status !== 0) {
      git(root, ['rebase', '--abort'], { allowFail: true });
      throw new Refusal(
        `pull --rebase failed: ${pulled.stderr.trim()}\nNothing was pushed. Resolve by hand, then push the local commit.`,
      );
    }
    const problems = verifyCommit(
      root,
      git(root, ['rev-parse', 'HEAD^']).trim(),
      expected,
      slug,
      mode,
    );
    if (problems.length)
      throw new Refusal(
        `after rebase the commit is not clean:\n- ${problems.join('\n- ')}`,
      );
    if (mode === 'publish') hooks.runCheck(root);
    result = attempt();
    if (result.status !== 0) {
      throw new Refusal(
        `push rejected a second time: ${result.stderr.trim()}\nThe commit is local only. Run git pull --rebase origin main, npm run check, then git push origin HEAD:main, or stop and report.`,
      );
    }
  }
}

function commitAndPush({ root, slug, mode, message, paths, hooks, log }) {
  const expected = [...new Set(paths)];
  git(root, ['add', '--', ...expected]);
  const staged = parseNameStatus(
    git(root, ['diff', '--cached', '--no-renames', '--name-status', '-z']),
  );
  if (
    !sameSet(staged, expected) ||
    staged.some((r) => r.status !== 'A' && r.status !== 'M')
  ) {
    git(root, ['reset', '-q', '--']);
    throw new Refusal(
      `staged files differ from the expected set: ${JSON.stringify(staged)}. Unstaged again; nothing committed.`,
    );
  }
  const before = head(root);
  hooks.beforeCommit?.(root);
  git(root, ['commit', '-q', '-m', message, '-m', TRAILER]);
  const problems = verifyCommit(root, before, expected, slug, mode);
  if (problems.length) {
    git(root, ['reset', '--soft', before]);
    throw new Refusal(
      `the new commit was not clean and has been undone (reset --soft):\n- ${problems.join('\n- ')}`,
    );
  }
  pushWithRetry({ root, slug, mode, expected, hooks, log });
  const sha = head(root);
  log(`PUSHED ${sha}`);
  return sha;
}

// ---- real hooks ------------------------------------------------------------

function npmRun(root, args, label) {
  const result = spawnSync('npm', ['run', ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0)
    throw new Refusal(
      `${label} failed: fix the errors above; nothing was committed.`,
    );
}

export const realHooks = {
  today: () => maltaToday(),
  async renderGuide(slug, options) {
    const { renderGuide } = await import('./build-infographics.mjs');
    return renderGuide(slug, options);
  },
  runLint: (root, slug) =>
    npmRun(root, ['guide:lint', '--', slug], 'npm run guide:lint'),
  runCheck: (root) => npmRun(root, ['check'], 'npm run check'),
};

// ---- publish ----------------------------------------------------------------

export async function publishGuide({
  root,
  slug,
  dryRun = false,
  hooks = realHooks,
  log = console.log,
}) {
  assertSlug(slug);
  root = path.resolve(root);
  const today = hooks.today();
  preflight(root);
  const inspect = () => {
    const entries = inspectChanges(root, slug, 'publish');
    const guides = inspectGuides(root, slug, entries, today);
    checkLogAndParked(root, entries);
    return { entries, guides };
  };
  inspect();
  assertQueued(root, slug);
  const jsonPath = path.join(root, `ops/guides/infographics/${slug}.json`);
  if (!existsSync(jsonPath))
    throw new Refusal(`ops/guides/infographics/${slug}.json does not exist.`);
  try {
    if (JSON.parse(readFileSync(jsonPath, 'utf8')).slug !== slug)
      throw new Error('slug mismatch');
  } catch {
    throw new Refusal(
      `ops/guides/infographics/${slug}.json must be valid JSON with "slug": "${slug}".`,
    );
  }
  log('re-rendering infographics in place');
  await hooks.renderGuide(slug, {
    jsonPath,
    assetsDir: path.join(root, 'src/assets/guides', slug),
    ogDir: path.join(root, 'public/og/guides'),
  });
  inspect();
  hooks.runLint(root, slug);
  hooks.runCheck(root);
  const { entries } = inspect();

  const { stats } = analyzeGuide(root, slug);
  if (dryRun) {
    log(
      `dry run OK: would publish "${slug}" (${stats.words} words) with ${entries.length} file(s):\n- ${entries.map((e) => e.path).join('\n- ')}`,
    );
    return null;
  }

  // Bookkeeping files: append the log row, drop the slug from parked.json.
  const logFile = path.join(root, LOG_PATH);
  let logText = existsSync(logFile)
    ? readFileSync(logFile, 'utf8')
    : '# Guide publish log\n\n| Date | Slug | Words | Commit |\n| --- | --- | --- | --- |\n';
  if (!logText.endsWith('\n')) logText += '\n';
  writeFileSync(
    logFile,
    `${logText}| ${today} | ${slug} | ${stats.words} | this commit |\n`,
  );
  const parked = readParkedFile(root);
  if (slug in parked) {
    delete parked[slug];
    writeFileSync(
      path.join(root, PARKED_PATH),
      `${JSON.stringify(parked, null, 2)}\n`,
    );
  }
  const final = inspect().entries;
  return commitAndPush({
    root,
    slug,
    mode: 'publish',
    message: `content: publish guide ${slug}`,
    paths: final.map((e) => e.path),
    hooks,
    log,
  });
}

// ---- park -------------------------------------------------------------------

export async function parkGuide({
  root,
  slug,
  reason,
  dryRun = false,
  hooks = realHooks,
  log = console.log,
}) {
  assertSlug(slug);
  root = path.resolve(root);
  const text = String(reason ?? '')
    .replace(/\p{Cc}+/gu, ' ')
    .trim();
  if (!text)
    throw new Refusal(
      '--park needs a reason, e.g. --park "lint kept failing on readability".',
    );
  if (text.length > 500)
    throw new Refusal('the park reason is longer than 500 characters.');
  preflight(root);
  const entries = inspectChanges(root, slug, 'park');
  assertQueued(root, slug);
  checkLogAndParked(root, entries);
  const parked = readParkedFile(root);
  validateParked(parked);
  const attempts = Number(parked[slug]?.attempts ?? 0) + 1;
  parked[slug] = { attempts, reason: text, date: hooks.today() };
  if (dryRun) {
    const paths = [...new Set([PARKED_PATH, ...entries.map((e) => e.path)])];
    log(
      `dry run OK: would park "${slug}" (attempt ${attempts}): ${text}\n- ${paths.join('\n- ')}`,
    );
    return null;
  }
  writeFileSync(
    path.join(root, PARKED_PATH),
    `${JSON.stringify(parked, null, 2)}\n`,
  );
  const final = inspectChanges(root, slug, 'park');
  return commitAndPush({
    root,
    slug,
    mode: 'park',
    message: `ops: park guide ${slug}`,
    paths: final.map((e) => e.path),
    hooks,
    log,
  });
}

// ---- CLI --------------------------------------------------------------------

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  if (flags['self-test']) {
    const { runSelfTest } = await import('./guides/publish-guide-selftest.mjs');
    await runSelfTest({ publishGuide, parkGuide, parsePorcelain });
    return;
  }
  if (!positional[0])
    throw new GuideToolError(
      'Usage: npm run guide:publish -- <slug> [--dry-run] | --park "<reason>"',
    );
  const slug = assertSlug(positional[0]);
  if (flags.park !== undefined) {
    if (typeof flags.park !== 'string')
      throw new Refusal('--park needs a reason.');
    await parkGuide({
      root: REPO_ROOT,
      slug,
      reason: flags.park,
      dryRun: Boolean(flags['dry-run']),
    });
    return;
  }
  await publishGuide({
    root: REPO_ROOT,
    slug,
    dryRun: Boolean(flags['dry-run']),
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  main().catch((error) => {
    console.error(
      error instanceof GuideToolError
        ? `guide-publish: ${error.message}`
        : error,
    );
    process.exitCode = 1;
  });
}
