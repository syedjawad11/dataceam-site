// Self-test for publish-guide: throwaway git repos with a local bare origin.
// Every refusal is proven, plus one successful push, a push race and parking.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SLUG = 'tokens';
const TODAY = '2026-11-24';
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('fake png data'),
]);

function sh(cwd, args) {
  const r = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: '0',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_SYSTEM: '/dev/null',
    },
  });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

const md = (slug, status, extra = {}) => {
  const fm = {
    title: `Guide ${slug} title`,
    topic: 'llm-basics',
    status,
    pubDate: '2026-11-01',
    ...extra,
  };
  const lines = Object.entries(fm).map(([k, v]) => `${k}: '${v}'`);
  return `---\n${lines.join('\n')}\n---\n\nSome tokens text about the topic. More about tokens here.\n`;
};

function write(dir, rel, content) {
  mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  writeFileSync(path.join(dir, rel), content);
}

function identity(dir) {
  sh(dir, ['config', 'user.name', 'Test']);
  sh(dir, ['config', 'user.email', 'test@example.com']);
  sh(dir, ['config', 'commit.gpgsign', 'false']);
}

export async function runSelfTest({ publishGuide, parkGuide, parsePorcelain }) {
  const started = Date.now();
  const tmp = mkdtempSync(path.join(tmpdir(), 'publish-guide-'));
  const pristine = path.join(tmp, 'pristine.git');
  let origin = pristine;
  const seed = path.join(tmp, 'seed');
  sh(tmp, ['init', '-q', '--bare', '-b', 'main', pristine]);
  mkdirSync(seed);
  sh(seed, ['init', '-q', '-b', 'main']);
  identity(seed);
  write(seed, 'package.json', '{"name":"x"}\n');
  write(seed, 'scripts/hello.mjs', 'console.log(1);\n');
  write(seed, '.claude/settings.json', '{}\n');
  write(seed, 'src/content/guides/tokens.md', md('tokens', 'soon'));
  write(seed, 'src/content/guides/nextone.md', md('nextone', 'soon'));
  write(seed, 'src/content/guides/unqueued.md', md('unqueued', 'soon'));
  write(
    seed,
    'src/content/guides/alpha.md',
    md('alpha', 'live').replace(
      'Some tokens text',
      'Alpha mentions tokens text',
    ),
  );
  write(
    seed,
    'ops/guides/queue.json',
    JSON.stringify({ guides: [{ slug: 'tokens' }, { slug: 'nextone' }] }),
  );
  write(seed, 'ops/guides/banned-phrases.json', '["x"]\n');
  write(seed, 'ops/guides/publish-daily.md', 'daily\n');
  write(
    seed,
    'ops/guides/log.md',
    '# Guide publish log\n\n| Date | Slug | Words | Commit |\n| --- | --- | --- | --- |\n| 2026-11-20 | alpha | 1500 | abc |\n',
  );
  write(
    seed,
    'ops/guides/parked.json',
    JSON.stringify({
      tokens: { attempts: 1, reason: 'old', date: '2026-11-22' },
    }),
  );
  write(
    seed,
    'ops/guides/infographics/tokens.json',
    JSON.stringify({ slug: 'tokens', theme: 'daylight', images: [] }),
  );
  writeFileSync(path.join(seed, 'dummy.bin'), PNG);
  mkdirSync(path.join(seed, 'src/assets/guides/tokens'), { recursive: true });
  writeFileSync(path.join(seed, 'src/assets/guides/tokens/cover.png'), PNG);
  mkdirSync(path.join(seed, 'public/og/guides'), { recursive: true });
  writeFileSync(path.join(seed, 'public/og/guides/tokens.png'), PNG);
  sh(seed, ['add', '-A']);
  sh(seed, ['commit', '-q', '-m', 'seed']);
  sh(seed, ['remote', 'add', 'origin', pristine]);
  sh(seed, ['push', '-q', 'origin', 'main']);

  let counter = 0;
  // Every scenario gets its own copy of the pristine origin.
  const resetOrigin = () => {
    counter += 1;
    origin = path.join(tmp, `origin-${counter}.git`);
    cpSync(pristine, origin, { recursive: true });
  };
  const clone = () => {
    counter += 1;
    const dir = path.join(tmp, `w${counter}`);
    sh(tmp, ['clone', '-q', origin, dir]);
    identity(dir);
    return dir;
  };
  const makeHooks = (over = {}) => {
    const calls = { render: 0, lint: 0, check: 0, push: 0 };
    const hooks = {
      calls,
      today: () => TODAY,
      async renderGuide(slug, { assetsDir, ogDir }) {
        calls.render += 1;
        mkdirSync(assetsDir, { recursive: true });
        mkdirSync(ogDir, { recursive: true });
        writeFileSync(
          path.join(assetsDir, 'cover.png'),
          Buffer.concat([PNG, Buffer.from(String(calls.render))]),
        );
        writeFileSync(path.join(assetsDir, 'step-1.png'), PNG);
        writeFileSync(path.join(ogDir, `${slug}.png`), PNG);
      },
      runLint() {
        calls.lint += 1;
      },
      runCheck() {
        calls.check += 1;
      },
      ...over,
    };
    return hooks;
  };
  const quiet = [];
  const log = (line) => quiet.push(line);
  const goLive = (dir, slug = SLUG, edit = (t) => t) =>
    write(
      dir,
      `src/content/guides/${slug}.md`,
      edit(
        readFileSync(path.join(dir, `src/content/guides/${slug}.md`), 'utf8')
          .replace("status: 'soon'", "status: 'live'")
          .replace("pubDate: '2026-11-01'", `pubDate: '${TODAY}'`),
      ),
    );
  const run = (dir, over = {}, opts = {}) =>
    publishGuide({
      root: dir,
      slug: SLUG,
      hooks: makeHooks(over),
      log,
      ...opts,
    });
  const refuses = async (name, dir, pattern, over, opts) => {
    const before = sh(dir, ['rev-parse', 'HEAD']).trim();
    const remote = sh(origin, ['rev-parse', 'main']).trim();
    await assert.rejects(
      run(dir, over, opts),
      (error) => {
        assert.match(error.message, pattern, `${name}: ${error.message}`);
        return true;
      },
      name,
    );
    assert.equal(
      sh(dir, ['rev-parse', 'HEAD']).trim(),
      before,
      `${name}: HEAD must not move`,
    );
    assert.equal(
      sh(origin, ['rev-parse', 'main']).trim(),
      remote,
      `${name}: origin must not move`,
    );
  };
  const scenario = async (name, setup, pattern, over, opts) => {
    resetOrigin();
    const dir = clone();
    setup(dir);
    await refuses(name, dir, pattern, over, opts);
  };
  let proven = 0;
  const prove = async (...args) => {
    await scenario(...args);
    proven += 1;
  };

  // Parser unit check: renames carry the old path in the next NUL field.
  assert.deepEqual(parsePorcelain('R  new.md\0old.md\0?? a b.png\0 M c.md\0'), [
    { x: 'R', y: ' ', path: 'new.md', from: 'old.md' },
    { x: '?', y: '?', path: 'a b.png', from: null },
    { x: ' ', y: 'M', path: 'c.md', from: null },
  ]);

  // ---- successful publish -------------------------------------------------
  {
    resetOrigin();
    const dir = clone();
    goLive(dir, SLUG, (t) => `${t}\nMore words in the new guide.\n`);
    write(
      dir,
      'src/content/guides/alpha.md',
      md('alpha', 'live', { updatedDate: TODAY }).replace(
        'Some tokens text',
        'Alpha mentions [tokens](/guides/tokens/) text',
      ),
    );
    write(
      dir,
      'ops/guides/infographics/tokens.json',
      JSON.stringify({ slug: 'tokens', theme: 'blueprint', images: [] }),
    );
    writeFileSync(
      path.join(dir, 'src/assets/guides/tokens/extra-diagram.png'),
      PNG,
    );
    const hooks = makeHooks();
    const sha = await publishGuide({ root: dir, slug: SLUG, hooks, log });
    assert.equal(
      sh(origin, ['rev-parse', 'main']).trim(),
      sha,
      'origin main moved to the pushed commit',
    );
    assert.equal(
      sh(dir, ['log', '-1', '--format=%s']).trim(),
      'content: publish guide tokens',
    );
    assert.match(
      sh(dir, ['log', '-1', '--format=%B']),
      /Co-Authored-By: Claude <noreply@anthropic\.com>\s*$/,
    );
    const files = sh(dir, ['show', '--name-only', '--format=', 'HEAD'])
      .trim()
      .split('\n')
      .sort();
    assert.deepEqual(files, [
      'ops/guides/infographics/tokens.json',
      'ops/guides/log.md',
      'ops/guides/parked.json',
      'src/assets/guides/tokens/cover.png',
      'src/assets/guides/tokens/extra-diagram.png',
      'src/assets/guides/tokens/step-1.png',
      'src/content/guides/alpha.md',
      'src/content/guides/tokens.md',
    ]);
    assert.match(
      readFileSync(path.join(dir, 'ops/guides/log.md'), 'utf8'),
      /\| 2026-11-24 \| tokens \| \d+ \| this commit \|\n$/,
    );
    assert.deepEqual(
      JSON.parse(
        readFileSync(path.join(dir, 'ops/guides/parked.json'), 'utf8'),
      ),
      {},
      'slug removed from parked.json',
    );
    assert.deepEqual(
      { ...hooks.calls },
      { render: 1, lint: 1, check: 1, push: 0 },
    );
    assert.ok(quiet.some((l) => l === `PUSHED ${sha}`));
    assert.equal(
      sh(dir, ['status', '--porcelain']).trim(),
      '',
      'working tree clean after publish',
    );
    console.log(
      `  publish OK, pushed ${sha.slice(0, 7)} touching ${files.length} files`,
    );
  }

  // ---- dry run --------------------------------------------------------------
  {
    resetOrigin();
    const dir = clone();
    goLive(dir);
    const hooks = makeHooks();
    const before = sh(dir, ['rev-parse', 'HEAD']).trim();
    const result = await publishGuide({
      root: dir,
      slug: SLUG,
      hooks,
      log,
      dryRun: true,
    });
    assert.equal(result, null);
    assert.equal(sh(dir, ['rev-parse', 'HEAD']).trim(), before);
    assert.equal(
      sh(origin, ['rev-parse', 'main']).trim(),
      sh(dir, ['rev-parse', 'origin/main']).trim(),
    );
    assert.equal(hooks.calls.check, 1, 'dry run still runs the checks');
    assert.ok(quiet.some((l) => l.startsWith('dry run OK')));
    assert.equal(
      sh(dir, ['diff', '--cached', '--name-only']).trim(),
      '',
      'dry run stages nothing',
    );
    console.log('  dry run OK: no commit, no push');
  }

  // ---- refusals -------------------------------------------------------------
  for (const rel of [
    'package.json',
    'scripts/hello.mjs',
    '.claude/settings.json',
    'ops/guides/queue.json',
    'ops/guides/banned-phrases.json',
    'ops/guides/publish-daily.md',
    'src/content/guides/unqueued.md',
  ]) {
    await prove(
      `out-of-scope edit ${rel}`,
      (dir) => {
        goLive(dir);
        writeFileSync(
          path.join(dir, rel),
          `${readFileSync(path.join(dir, rel), 'utf8')}\n changed`,
        );
      },
      /not an allowed path|not live|exactly one guide/,
    );
  }
  await prove(
    'untracked out-of-scope file',
    (dir) => {
      goLive(dir);
      write(dir, 'scripts/evil.mjs', 'x');
    },
    /scripts\/evil\.mjs.*not an allowed path/s,
  );
  await prove(
    'untracked file in another guide asset folder',
    (dir) => {
      goLive(dir);
      writeFileSync(path.join(dir, 'public/og/guides/other.png'), PNG);
    },
    /other\.png.*not an allowed path/s,
  );
  await prove(
    'new guide markdown file',
    (dir) => {
      goLive(dir);
      write(dir, 'src/content/guides/brandnew.md', md('brandnew', 'soon'));
    },
    /new guide files cannot be published/,
  );
  await prove(
    'second guide going live',
    (dir) => {
      goLive(dir);
      goLive(dir, 'nextone');
    },
    /exactly one guide may go live/,
  );
  await prove(
    'target not edited',
    (dir) => {
      write(
        dir,
        'src/content/guides/nextone.md',
        md('nextone', 'live').replace(
          "pubDate: '2026-11-01'",
          `pubDate: '${TODAY}'`,
        ),
      );
    },
    /is not among the changes/,
  );
  await prove(
    'other live guide edited beyond links',
    (dir) => {
      goLive(dir);
      write(
        dir,
        'src/content/guides/alpha.md',
        md('alpha', 'live').replace(
          'Some tokens text',
          'Alpha says new things about tokens text',
        ),
      );
    },
    /beyond adding markdown links/,
  );
  await prove(
    'other live guide gets a link to another page',
    (dir) => {
      goLive(dir);
      write(
        dir,
        'src/content/guides/alpha.md',
        md('alpha', 'live').replace(
          'Some tokens text',
          'Alpha [mentions](/guides/elsewhere/) tokens text',
        ),
      );
    },
    /beyond adding markdown links/,
  );
  await prove(
    'other live guide frontmatter changed',
    (dir) => {
      goLive(dir);
      write(
        dir,
        'src/content/guides/alpha.md',
        md('alpha', 'live', { title: 'Renamed' }).replace(
          'Some tokens text',
          'Alpha mentions tokens text',
        ),
      );
    },
    /frontmatter "title" changed/,
  );
  await prove(
    'other live guide put back to soon',
    (dir) => {
      goLive(dir);
      write(
        dir,
        'src/content/guides/alpha.md',
        md('alpha', 'soon').replace(
          'Some tokens text',
          'Alpha mentions tokens text',
        ),
      );
    },
    /not live/,
  );
  await prove(
    'link removed from other live guide',
    (dir) => {
      write(
        dir,
        'src/content/guides/alpha.md',
        md('alpha', 'live').replace(
          'Some tokens text',
          'Alpha mentions [tokens](/guides/tokens/) text',
        ),
      );
      sh(dir, ['add', '-A']);
      sh(dir, ['commit', '-q', '-m', 'local link']);
      sh(dir, ['push', '-q', 'origin', 'main']);
      goLive(dir);
      write(
        dir,
        'src/content/guides/alpha.md',
        md('alpha', 'live').replace(
          'Some tokens text',
          'Alpha mentions tokens text',
        ),
      );
    },
    /beyond adding markdown links/,
  );
  await prove(
    'wrong branch',
    (dir) => {
      sh(dir, ['checkout', '-q', '-b', 'feature']);
      goLive(dir);
    },
    /must be on branch main/,
  );
  await prove(
    'deletion',
    (dir) => {
      goLive(dir);
      unlinkSync(path.join(dir, 'src/assets/guides/tokens/cover.png'));
    },
    /deleted/,
  );
  await prove(
    'rename',
    (dir) => {
      goLive(dir);
      sh(dir, [
        'mv',
        'src/assets/guides/tokens/cover.png',
        'src/assets/guides/tokens/other.png',
      ]);
    },
    /something is already staged/,
  );
  await prove(
    'dirty index',
    (dir) => {
      goLive(dir);
      sh(dir, ['add', 'src/content/guides/tokens.md']);
    },
    /something is already staged/,
  );
  await prove(
    'symlink replaces png',
    (dir) => {
      goLive(dir);
      unlinkSync(path.join(dir, 'src/assets/guides/tokens/cover.png'));
      symlinkSync(
        '/etc/hosts',
        path.join(dir, 'src/assets/guides/tokens/cover.png'),
      );
    },
    /symlink|type change|not an allowed|change type/,
  );
  await prove(
    'untracked symlink',
    (dir) => {
      goLive(dir);
      symlinkSync(
        '/etc/hosts',
        path.join(dir, 'src/assets/guides/tokens/link.png'),
      );
    },
    /symlink|not a regular file/,
  );
  await prove(
    'symlinked directory',
    (dir) => {
      goLive(dir);
      rmSync(path.join(dir, 'src/assets/guides/tokens'), { recursive: true });
      mkdirSync(path.join(dir, 'elsewhere'));
      writeFileSync(path.join(dir, 'elsewhere/cover.png'), PNG);
      symlinkSync(
        path.join(dir, 'elsewhere'),
        path.join(dir, 'src/assets/guides/tokens'),
      );
    },
    /symlink|not an allowed path|deleted|change type/,
  );
  await prove(
    'executable bit',
    (dir) => {
      goLive(dir);
      chmodSync(path.join(dir, 'src/assets/guides/tokens/cover.png'), 0o755);
    },
    /executable bit|mode/,
  );
  await prove(
    'png that is not a png',
    (dir) => {
      goLive(dir);
      writeFileSync(
        path.join(dir, 'src/assets/guides/tokens/bad.png'),
        '<?php evil ?>',
      );
    },
    /is not a PNG/,
  );
  await prove(
    'pubDate not today',
    (dir) => {
      goLive(dir, SLUG, (t) => t.replace(TODAY, '2026-11-23'));
    },
    /pubDate .* must be today/,
  );
  await prove(
    'title changed',
    (dir) => {
      goLive(dir, SLUG, (t) => t.replace('Guide tokens title', 'A new title'));
    },
    /title of "tokens" changed/,
  );
  await prove(
    'topic changed',
    (dir) => {
      goLive(dir, SLUG, (t) => t.replace('llm-basics', 'hardware'));
    },
    /topic of "tokens" changed/,
  );
  await scenario(
    'slug not in queue',
    (dir) => {
      goLive(dir, 'unqueued');
    },
    /not in ops\/guides\/queue\.json/,
    undefined,
    { slug: 'unqueued' },
  );
  resetOrigin();
  await assert.rejects(
    run(clone(), {}, { slug: 'Tokens/../x' }),
    /Invalid slug/,
  );
  proven += 1;
  await prove(
    'log.md rewritten instead of appended',
    (dir) => {
      goLive(dir);
      write(dir, 'ops/guides/log.md', '# rewritten\n');
    },
    /may only be appended/,
  );
  await prove(
    'parked.json malformed',
    (dir) => {
      goLive(dir);
      write(dir, 'ops/guides/parked.json', '{"tokens":{"attempts":"many"}}');
    },
    /parked\.json must look like/,
  );
  await prove(
    'render writes out-of-scope file',
    (dir) => {
      goLive(dir);
    },
    /package\.json.*not an allowed path/s,
    {
      async renderGuide(slug, opts) {
        writeFileSync(
          path.join(opts.assetsDir, '../../../../package.json'),
          '{"evil":true}\n',
        );
      },
    },
  );
  await prove('lint fails', (dir) => goLive(dir), /guide:lint failed/, {
    runLint() {
      throw new Error('guide:lint failed: bad');
    },
  });
  await prove('check fails', (dir) => goLive(dir), /npm run check failed/, {
    runCheck() {
      throw new Error('npm run check failed');
    },
  });
  await prove(
    'behind origin',
    (dir) => {
      goLive(dir);
      const other = clone();
      write(other, 'README.md', 'newer\n');
      sh(other, ['add', '-A']);
      sh(other, ['commit', '-q', '-m', 'newer']);
      sh(other, ['push', '-q', 'origin', 'main']);
    },
    /behind origin\/main/,
  );
  await prove(
    'local commit ahead of origin',
    (dir) => {
      write(dir, 'README.md', 'local\n');
      sh(dir, ['add', '-A']);
      sh(dir, ['commit', '-q', '-m', 'local']);
      goLive(dir);
    },
    /ahead of origin\/main/,
  );
  console.log(
    `  ${proven} refusals proven (out-of-scope, second guide, link-only edits, branch, deletion, rename, index, symlink, mode, png, dates, queue, behind/ahead, gates)`,
  );

  // ---- post-commit verification resets the commit ------------------------------
  {
    resetOrigin();
    const dir = clone();
    goLive(dir);
    const before = sh(dir, ['rev-parse', 'HEAD']).trim();
    await assert.rejects(
      run(dir, {
        beforeCommit(root) {
          writeFileSync(path.join(root, 'package.json'), '{"evil":true}\n');
          sh(root, ['add', 'package.json']);
        },
      }),
      /not clean and has been undone/,
    );
    assert.equal(
      sh(dir, ['rev-parse', 'HEAD']).trim(),
      before,
      'commit was reset (soft)',
    );
    assert.equal(
      sh(origin, ['rev-parse', 'main']).trim(),
      before.length ? sh(dir, ['rev-parse', 'origin/main']).trim() : '',
      'nothing pushed',
    );
    console.log(
      '  commit verification: tampered commit is soft-reset and nothing is pushed',
    );
  }

  // ---- push race: one rebase, then success ---------------------------------------
  {
    resetOrigin();
    const dir = clone();
    goLive(dir);
    let raced = 0;
    const hooks = makeHooks({
      beforePush() {
        raced += 1;
        if (raced === 1) {
          const other = clone();
          write(other, 'README.md', `race ${raced}\n`);
          sh(other, ['add', '-A']);
          sh(other, ['commit', '-q', '-m', 'race']);
          sh(other, ['push', '-q', 'origin', 'main']);
        }
      },
    });
    const sha = await publishGuide({ root: dir, slug: SLUG, hooks, log });
    assert.equal(sh(origin, ['rev-parse', 'main']).trim(), sha);
    assert.equal(hooks.calls.check, 2, 'check re-run after the rebase');
    assert.equal(
      sh(dir, ['log', '-2', '--format=%s']).trim().split('\n')[1],
      'race',
      'rebased on top of the raced commit',
    );
    console.log(
      '  push race: rejected once, pull --rebase, check re-run, pushed',
    );
  }
  {
    resetOrigin();
    const dir = clone();
    goLive(dir);
    let raced = 0;
    const hooks = makeHooks({
      beforePush() {
        raced += 1;
        const other = clone();
        write(other, `README-${raced}.md`, `race ${raced}\n`);
        sh(other, ['add', '-A']);
        sh(other, ['commit', '-q', '-m', 'race']);
        sh(other, ['push', '-q', 'origin', 'main']);
      },
    });
    await assert.rejects(
      publishGuide({ root: dir, slug: SLUG, hooks, log }),
      /rejected a second time/,
    );
    console.log('  push race: second rejection exits with instructions');
  }

  // ---- park ----------------------------------------------------------------------
  const draftPath = (name) => `ops/guides/drafts/${SLUG}/${name}`;
  const draftContents = {
    'article.md': md(SLUG, 'live'),
    'infographics.json': JSON.stringify({ slug: SLUG, images: [] }),
    'review.md': '# Review\n\nReadability needs another pass.\n',
  };
  const writeDrafts = (dir, names = Object.keys(draftContents)) => {
    for (const name of names) write(dir, draftPath(name), draftContents[name]);
  };
  const park = (dir, opts = {}) =>
    parkGuide({
      root: dir,
      slug: SLUG,
      reason: 'readability kept failing',
      hooks: makeHooks(),
      log,
      ...opts,
    });
  const committedFiles = (dir) =>
    sh(dir, ['show', '--name-only', '--format=', 'HEAD'])
      .trim()
      .split('\n')
      .sort();

  {
    resetOrigin();
    const dir = clone();
    const sha = await parkGuide({
      root: dir,
      slug: SLUG,
      reason: 'readability kept failing',
      hooks: makeHooks(),
      log,
    });
    assert.equal(sh(origin, ['rev-parse', 'main']).trim(), sha);
    assert.equal(
      sh(dir, ['log', '-1', '--format=%s']).trim(),
      'ops: park guide tokens',
    );
    assert.deepEqual(
      sh(dir, ['show', '--name-only', '--format=', 'HEAD']).trim().split('\n'),
      ['ops/guides/parked.json'],
    );
    const parked = JSON.parse(
      readFileSync(path.join(dir, 'ops/guides/parked.json'), 'utf8'),
    );
    assert.equal(parked.tokens.attempts, 2, 'attempts incremented');
    assert.equal(parked.tokens.reason, 'readability kept failing');
    assert.equal(parked.tokens.date, TODAY);
    console.log('  park OK: attempts 1 -> 2, one file committed');
  }
  for (const names of [
    Object.keys(draftContents),
    ['article.md'],
    ['infographics.json', 'review.md'],
  ]) {
    resetOrigin();
    const dir = clone();
    writeDrafts(dir, names);
    const before = sh(dir, ['rev-parse', 'HEAD']).trim();
    const sha = await park(dir);
    assert.equal(sh(origin, ['rev-parse', 'main']).trim(), sha);
    assert.equal(sh(dir, ['rev-parse', 'HEAD^']).trim(), before);
    assert.deepEqual(
      committedFiles(dir),
      ['ops/guides/parked.json', ...names.map(draftPath)].sort(),
    );
    for (const name of names)
      assert.equal(
        sh(dir, ['show', `HEAD:${draftPath(name)}`]),
        draftContents[name],
      );
    assert.equal(sh(dir, ['status', '--porcelain']).trim(), '');

    if (names.length === 3) {
      // A later attempt edits the already tracked article and retains its companions.
      const revised = `${draftContents['article.md']}\nRevised article.\n`;
      write(dir, draftPath('article.md'), revised);
      const second = await park(dir);
      assert.equal(sh(origin, ['rev-parse', 'main']).trim(), second);
      assert.equal(sh(dir, ['rev-parse', 'HEAD^']).trim(), sha);
      assert.deepEqual(
        committedFiles(dir),
        [draftPath('article.md'), 'ops/guides/parked.json'].sort(),
      );
      assert.equal(
        sh(dir, ['show', `HEAD:${draftPath('article.md')}`]),
        revised,
      );
      for (const name of ['infographics.json', 'review.md'])
        assert.equal(
          sh(dir, ['show', `HEAD:${draftPath(name)}`]),
          draftContents[name],
        );
      assert.equal(
        JSON.parse(
          readFileSync(path.join(dir, 'ops/guides/parked.json'), 'utf8'),
        ).tokens.attempts,
        3,
      );
    }
  }
  console.log(
    '  park drafts: all, subsets and a second tracked edit committed',
  );

  {
    resetOrigin();
    const dir = clone();
    writeDrafts(dir);
    let raced = 0;
    const hooks = makeHooks({
      beforePush() {
        raced += 1;
        if (raced === 1) {
          const other = clone();
          write(other, 'README.md', 'park race\n');
          sh(other, ['add', '-A']);
          sh(other, ['commit', '-q', '-m', 'park race']);
          sh(other, ['push', '-q', 'origin', 'main']);
        }
      },
    });
    const sha = await park(dir, { hooks });
    assert.equal(raced, 2);
    assert.equal(sh(origin, ['rev-parse', 'main']).trim(), sha);
    assert.equal(
      sh(dir, ['log', '-1', '--format=%s', 'HEAD^']).trim(),
      'park race',
    );
    assert.deepEqual(
      committedFiles(dir),
      [
        'ops/guides/parked.json',
        ...Object.keys(draftContents).map(draftPath),
      ].sort(),
    );
    for (const [name, content] of Object.entries(draftContents))
      assert.equal(sh(dir, ['show', `HEAD:${draftPath(name)}`]), content);
    assert.equal(sh(dir, ['status', '--porcelain']).trim(), '');
    console.log('  park push race: rebase retained all drafts');
  }

  {
    resetOrigin();
    const dir = clone();
    writeDrafts(dir);
    const before = sh(dir, ['rev-parse', 'HEAD']).trim();
    const remote = sh(origin, ['rev-parse', 'main']).trim();
    const status = sh(dir, [
      'status',
      '--porcelain=v1',
      '-z',
      '--untracked-files=all',
    ]);
    const paths = [
      'ops/guides/parked.json',
      ...Object.keys(draftContents).map(draftPath),
    ];
    const contents = paths.map((rel) => readFileSync(path.join(dir, rel)));
    const messages = [];
    assert.equal(
      await park(dir, { dryRun: true, log: (line) => messages.push(line) }),
      null,
    );
    assert.equal(sh(dir, ['rev-parse', 'HEAD']).trim(), before);
    assert.equal(sh(origin, ['rev-parse', 'main']).trim(), remote);
    assert.equal(
      sh(dir, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
      status,
    );
    assert.equal(sh(dir, ['diff', '--cached', '--name-only']), '');
    for (const [i, rel] of paths.entries()) {
      assert.deepEqual(readFileSync(path.join(dir, rel)), contents[i]);
      assert.ok(messages[0].includes(`\n- ${rel}`), `dry run lists ${rel}`);
    }
    console.log(
      '  park dry run: files listed, contents/index/HEAD/origin unchanged',
    );
  }

  const trackDrafts = (dir) => {
    writeDrafts(dir);
    sh(dir, ['add', '--', `ops/guides/drafts/${SLUG}`]);
    sh(dir, ['commit', '-q', '-m', 'existing drafts']);
    sh(dir, ['push', '-q', 'origin', 'main']);
  };
  const parkRefuses = async (name, setup, pattern, opts = {}) => {
    resetOrigin();
    const dir = clone();
    setup(dir);
    const before = sh(dir, ['rev-parse', 'HEAD']).trim();
    const remote = sh(origin, ['rev-parse', 'main']).trim();
    const parked = readFileSync(
      path.join(dir, 'ops/guides/parked.json'),
      'utf8',
    );
    const index = sh(dir, ['diff', '--cached', '--raw']);
    await assert.rejects(
      park(dir, opts),
      (error) => {
        assert.match(error.message, pattern, `${name}: ${error.message}`);
        return true;
      },
      name,
    );
    assert.equal(sh(dir, ['rev-parse', 'HEAD']).trim(), before, name);
    assert.equal(sh(origin, ['rev-parse', 'main']).trim(), remote, name);
    assert.equal(sh(dir, ['diff', '--cached', '--raw']), index, name);
    assert.equal(
      readFileSync(path.join(dir, 'ops/guides/parked.json'), 'utf8'),
      parked,
      name,
    );
  };
  for (const rel of [
    'ops/guides/drafts/nextone/article.md',
    draftPath('other.md'),
    draftPath('subfolder/article.md'),
  ]) {
    await parkRefuses(
      `park out-of-scope draft ${rel}`,
      (dir) => write(dir, rel, md(SLUG, 'live')),
      /refusing to park.*not an allowed path/s,
    );
  }
  for (const [name, setup, pattern] of [
    [
      'symlinked draft file',
      (dir) => {
        writeDrafts(dir, ['review.md']);
        symlinkSync('/etc/hosts', path.join(dir, draftPath('article.md')));
      },
      /article\.md.*symlink/s,
    ],
    [
      'symlinked drafts folder',
      (dir) => symlinkSync(seed, path.join(dir, 'ops/guides/drafts')),
      /refusing to park.*drafts.*not an allowed path/s,
    ],
    [
      'executable draft',
      (dir) => {
        writeDrafts(dir);
        chmodSync(path.join(dir, draftPath('article.md')), 0o755);
      },
      /article\.md.*executable bit/s,
    ],
    [
      'tracked draft not 100644 in HEAD',
      (dir) => {
        writeDrafts(dir);
        chmodSync(path.join(dir, draftPath('article.md')), 0o755);
        sh(dir, ['add', '-A']);
        sh(dir, ['commit', '-q', '-m', 'executable draft fixture']);
        sh(dir, ['push', '-q', 'origin', 'main']);
        chmodSync(path.join(dir, draftPath('article.md')), 0o644);
      },
      /article\.md.*not a plain 100644 file in HEAD/s,
    ],
    [
      'deleted draft',
      (dir) => {
        trackDrafts(dir);
        unlinkSync(path.join(dir, draftPath('review.md')));
      },
      /refusing to park.*review\.md.*deleted/s,
    ],
    [
      'staged draft',
      (dir) => {
        writeDrafts(dir);
        sh(dir, ['add', '--', draftPath('article.md')]);
      },
      /something is already staged/,
    ],
    [
      'renamed draft',
      (dir) => {
        trackDrafts(dir);
        sh(dir, ['mv', draftPath('article.md'), draftPath('other.md')]);
      },
      /something is already staged/,
    ],
    [
      'article missing from HEAD',
      (dir) => {
        sh(dir, ['rm', `src/content/guides/${SLUG}.md`]);
        sh(dir, ['commit', '-q', '-m', 'missing guide fixture']);
        sh(dir, ['push', '-q', 'origin', 'main']);
        writeDrafts(dir, ['article.md']);
      },
      /src\/content\/guides\/tokens\.md does not exist in HEAD/,
    ],
  ])
    await parkRefuses(name, setup, pattern);

  for (const name of Object.keys(draftContents)) {
    await parkRefuses(
      `oversized ${name}`,
      (dir) =>
        write(
          dir,
          draftPath(name),
          'x'.repeat(name.endsWith('.json') ? 300_001 : 600_001),
        ),
      /too large/,
    );
  }
  for (const [name, content, pattern] of [
    ['article.md', md(SLUG, 'soon'), /article\.md.*status must be "live"/s],
    [
      'article.md',
      md(SLUG, 'live', { title: 'Changed title' }),
      /article\.md.*title must match.*HEAD/s,
    ],
    [
      'article.md',
      md(SLUG, 'live', { topic: 'hardware' }),
      /article\.md.*topic must match.*HEAD/s,
    ],
    [
      'article.md',
      '---\ntitle: [broken\n---\n',
      /article\.md has unreadable frontmatter/,
    ],
    ['article.md', 'No frontmatter\n', /article\.md.*status must be "live"/s],
    [
      'infographics.json',
      '{broken',
      /infographics\.json must be valid JSON with "slug": "tokens"/,
    ],
    [
      'infographics.json',
      '{"slug":"nextone"}',
      /infographics\.json must be valid JSON with "slug": "tokens"/,
    ],
    ['review.md', '', /review\.md must not be empty/],
    ['review.md', ' \n\t', /review\.md must not be empty/],
  ]) {
    const setup = (dir) => write(dir, draftPath(name), content);
    await parkRefuses(`invalid draft ${name}: ${content}`, setup, pattern);
    await parkRefuses(
      `dry run invalid draft ${name}: ${content}`,
      setup,
      pattern,
      { dryRun: true },
    );
  }
  await prove(
    'publish refuses a draft change',
    (dir) => {
      goLive(dir);
      writeDrafts(dir, ['article.md']);
    },
    /refusing to publish.*drafts\/tokens\/article\.md.*not an allowed path/s,
  );
  console.log(
    '  park draft refusals and dry-run validation proven; publish still refuses drafts',
  );

  for (const [name, setup, pattern] of [
    [
      'park with other change',
      (dir) => writeFileSync(path.join(dir, 'package.json'), '{"a":1}\n'),
      /package\.json.*not an allowed path/s,
    ],
    ['park with guide edit', (dir) => goLive(dir), /not an allowed path/],
    [
      'park wrong branch',
      (dir) => sh(dir, ['checkout', '-q', '-b', 'x']),
      /must be on branch main/,
    ],
  ]) {
    resetOrigin();
    const dir = clone();
    setup(dir);
    const before = sh(dir, ['rev-parse', 'HEAD']).trim();
    await assert.rejects(
      parkGuide({
        root: dir,
        slug: SLUG,
        reason: 'r',
        hooks: makeHooks(),
        log,
      }),
      pattern,
      name,
    );
    assert.equal(sh(dir, ['rev-parse', 'HEAD']).trim(), before);
  }
  resetOrigin();
  await assert.rejects(
    parkGuide({
      root: clone(),
      slug: SLUG,
      reason: '  ',
      hooks: makeHooks(),
      log,
    }),
    /needs a reason/,
  );
  await assert.rejects(
    parkGuide({
      root: clone(),
      slug: 'unqueued',
      reason: 'r',
      hooks: makeHooks(),
      log,
    }),
    /not in ops\/guides\/queue\.json/,
  );
  console.log('  park refusals proven');

  rmSync(tmp, { recursive: true, force: true });
  console.log(
    `publish-guide self-test OK (${((Date.now() - started) / 1000).toFixed(1)}s)`,
  );
}
