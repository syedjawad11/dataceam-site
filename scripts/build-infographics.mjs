// Draws the cover, infographics and social card of a guide from
// ops/guides/infographics/<slug>.json. Run with --help for the full contract.
import { realpathSync } from 'node:fs';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EXAMPLE, FIXTURES, SPARSE, STRESS } from './infographics/fixtures.mjs';
import { MAX_HEIGHT, MIN_HEIGHT } from './infographics/layouts.mjs';
import {
  SIZE_LIMITS,
  renderImage,
  renderSocial,
} from './infographics/render.mjs';
import { helpText, validate } from './infographics/spec.mjs';
import { contrast } from './infographics/svg.mjs';
import { THEMES } from './infographics/themes/index.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Renders a validated guide spec in memory: [{ kind, name, buffer, width, height }]. */
async function renderAll(data) {
  const out = [];
  let figure = 0;
  for (const image of data.images) {
    const isCover = image.layout === 'cover';
    if (!isCover) figure++;
    try {
      out.push({
        kind: isCover ? 'cover' : 'body',
        name: image.file,
        ...(await renderImage(data.theme, image, figure)),
      });
      if (isCover)
        out.push({
          kind: 'og',
          name: data.slug,
          ...(await renderSocial(data.theme, image)),
        });
    } catch (error) {
      throw new Error(`${image.file}: ${error.message}`, { cause: error });
    }
  }
  for (const image of out)
    if (image.buffer.length > SIZE_LIMITS[image.kind])
      throw new Error(
        `${image.name}: the PNG is ${kb(image.buffer.length)}, the limit is ${kb(SIZE_LIMITS[image.kind])}. Use less text.`,
      );
  return out;
}

/**
 * Renders one guide to disk and returns what was written. The same JSON gives
 * the same bytes every time, so callers can compare with committed files.
 *   jsonPath   default ops/guides/infographics/<slug>.json
 *   assetsDir  folder for cover.png and <file>.png, default src/assets/guides/<slug>
 *   ogDir      folder for <slug>.png, default public/og/guides
 */
export async function renderGuide(slug, { jsonPath, assetsDir, ogDir } = {}) {
  if (!/^[a-z0-9-]+$/.test(slug ?? ''))
    throw new Error(`"${slug}" is not a guide slug.`);
  const source =
    jsonPath ?? path.join(root, 'ops/guides/infographics', `${slug}.json`);
  const assets = assetsDir ?? path.join(root, 'src/assets/guides', slug);
  const og = ogDir ?? path.join(root, 'public/og/guides');

  let data;
  try {
    data = JSON.parse(await readFile(source, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${source}: ${error.message}`, {
      cause: error,
    });
  }
  const errors = validate(data, slug);
  if (errors.length)
    throw new Error(
      `${path.basename(source)} has ${errors.length} problem(s):\n  - ${errors.join('\n  - ')}`,
    );

  const images = await renderAll(data);
  await mkdir(assets, { recursive: true });
  await mkdir(og, { recursive: true });
  const written = [];
  for (const image of images) {
    const file = path.join(
      image.kind === 'og' ? og : assets,
      `${image.name}.png`,
    );
    await writeFile(file, image.buffer);
    written.push({
      file,
      kind: image.kind,
      width: image.width,
      height: image.height,
      bytes: image.buffer.length,
    });
  }
  return written;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

function report(entry) {
  return `${path.relative(process.cwd(), entry.file)}  ${entry.width}x${entry.height}  ${kb(entry.bytes)}`;
}

async function writeSamples(directory) {
  const started = performance.now();
  let count = 0;
  for (const theme of Object.keys(THEMES)) {
    const folder = path.join(directory, theme);
    await mkdir(folder, { recursive: true });
    for (const set of [FIXTURES, SPARSE, STRESS]) {
      const prefix =
        set === FIXTURES ? '' : set === SPARSE ? 'sparse-' : 'stress-';
      let figure = 0;
      for (const image of set) {
        if (image.layout !== 'cover') figure++;
        const save = async (name, png) => {
          const file = path.join(folder, `${prefix}${name}.png`);
          await writeFile(file, png.buffer);
          console.log(report({ ...png, file, bytes: png.buffer.length }));
          count++;
        };
        await save(
          image.layout === 'cover' || prefix ? image.file : image.layout,
          await renderImage(theme, image, figure),
        );
        if (image.layout === 'cover')
          await save('og', await renderSocial(theme, image));
      }
    }
  }
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`Drew ${count} sample pictures in ${seconds} s.`);
}

async function selfTest() {
  const started = performance.now();
  const failures = [];
  const check = (ok, message) => {
    if (!ok) failures.push(message);
  };

  // Every text and background pair must reach WCAG AA for normal text.
  for (const [name, theme] of Object.entries(THEMES)) {
    const pairs = [
      ...theme.contrastPairs,
      ...Object.entries(theme.tones).flatMap(([tone, look]) => [
        [`${tone} label`, look.ink, look.fill],
        [`${tone} text`, look.body, look.fill],
      ]),
      ...[3, 4, 5, 6].flatMap((count) =>
        Array.from({ length: count }, (_, index) => {
          const look = theme.slabTone(index, count);
          return ['ink', 'body', 'number'].map((key) => [
            `layer ${index + 1} of ${count} ${key}`,
            look[key],
            look.fill,
          ]);
        }).flat(),
      ),
    ];
    for (const [what, text, background] of pairs) {
      const ratio = contrast(text, background);
      check(
        ratio >= 4.5,
        `${name}: ${what} has contrast ${ratio.toFixed(2)} (${text} on ${background}), needs 4.5.`,
      );
    }
  }

  // Every layout in every theme: right size, light enough, same bytes twice.
  for (const theme of Object.keys(THEMES)) {
    let figure = 0;
    for (const image of FIXTURES) {
      const isCover = image.layout === 'cover';
      if (!isCover) figure++;
      const at = `${theme} ${image.layout}`;
      const png = await renderImage(theme, image, figure);
      if (isCover) {
        check(png.width === 1200 && png.height === 675, `${at}: wrong size.`);
        const og = await renderSocial(theme, image);
        check(og.width === 1200 && og.height === 630, `${at}: wrong OG size.`);
        check(og.buffer.length <= SIZE_LIMITS.og, `${at}: OG file too big.`);
      } else {
        check(
          png.width === 1620 &&
            png.height >= MIN_HEIGHT * 1.5 &&
            png.height <= MAX_HEIGHT * 1.5,
          `${at}: wrong size ${png.width}x${png.height}.`,
        );
      }
      const limit = SIZE_LIMITS[isCover ? 'cover' : 'body'];
      check(png.buffer.length <= limit, `${at}: ${kb(png.buffer.length)}.`);
      if (image.layout === 'steps') {
        const again = await renderImage(theme, image, figure);
        check(png.buffer.equals(again.buffer), `${at}: output changed.`);
      }
    }
  }

  // Too much text fails with advice instead of being cut.
  const crowded = structuredClone(
    FIXTURES.find((image) => image.layout === 'compare'),
  );
  for (const column of crowded.columns)
    column.items = Array(6).fill('a long entry '.repeat(8).trim());
  await renderImage('paper', crowded, 1).then(
    () => failures.push('A crowded picture should fail.'),
    (error) =>
      check(error.message.includes('over the limit'), `Got: ${error.message}`),
  );

  // The contract: the example passes, broken files fail with a clear message.
  check(
    validate(EXAMPLE, EXAMPLE.slug).length === 0,
    'The example is invalid.',
  );
  const broken = (change, expected) => {
    const data = structuredClone(EXAMPLE);
    change(data);
    const errors = validate(data, EXAMPLE.slug);
    check(
      errors.some((error) => error.includes(expected)),
      `Expected "${expected}", got: ${errors.join(' | ') || 'no error'}`,
    );
  };
  broken((d) => (d.slug = 'other'), 'but the guide is');
  broken((d) => (d.theme = 'neon'), 'theme: must be one of');
  broken((d) => (d.images[0].icons[0] = 'unicorn'), 'Valid icons');
  broken((d) => (d.images[1].title = 'x'.repeat(71)), 'the limit is 70');
  broken((d) => (d.images[1].items.length = 2), 'needs 3 to 6');
  broken((d) => (d.images[1].note = 'One — two'), 'no em dashes');
  broken((d) => (d.images[1].note = 'One → two'), 'cannot draw');
  broken((d) => (d.images[1].file = 'Bad Name'), 'kebab-case');
  broken((d) => (d.images[1].file = d.images[2].file), 'used twice');
  broken((d) => (d.images[1].extra = 'x'), 'unknown field');
  broken((d) => (d.images[1].highlight = 'nowhere'), 'copied from the title');
  broken((d) => d.images.shift(), 'exactly one cover');
  broken((d) => (d.images.length = 2), '2 to 4 pictures');
  check(helpText(EXAMPLE).includes('"layout": "bars"'), 'Help is incomplete.');

  // Files on disk, through the exported function.
  const temp = await mkdtemp(path.join(tmpdir(), 'infographics-'));
  try {
    const jsonPath = path.join(temp, 'guide.json');
    await writeFile(jsonPath, JSON.stringify(EXAMPLE));
    const written = await renderGuide(EXAMPLE.slug, {
      jsonPath,
      assetsDir: path.join(temp, 'assets'),
      ogDir: path.join(temp, 'og'),
    });
    const files = await readdir(path.join(temp, 'assets'));
    check(
      written.length === EXAMPLE.images.length + 1 &&
        files.length === EXAMPLE.images.length,
      'renderGuide wrote the wrong files.',
    );
  } finally {
    await rm(temp, { recursive: true, force: true });
  }

  if (failures.length) {
    console.error(`Infographics self-test failed:\n- ${failures.join('\n- ')}`);
    process.exitCode = 1;
    return;
  }
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`Infographics self-test passed (${seconds} s).`);
}

async function main(args) {
  const valueOf = (flag) => {
    const at = args.indexOf(flag);
    if (at === -1) return undefined;
    const value = args[at + 1];
    if (!value || value.startsWith('--'))
      throw new Error(`${flag} needs a folder.`);
    return path.resolve(value);
  };
  if (args.includes('--help') || args.length === 0) {
    console.log(helpText(EXAMPLE));
    if (args.length === 0) process.exitCode = 1;
    return;
  }
  if (args.includes('--self-test')) return selfTest();
  if (args.includes('--samples')) return writeSamples(valueOf('--samples'));
  const slug = args[0];
  const out = valueOf('--out');
  const written = await renderGuide(
    slug,
    out ? { assetsDir: out, ogDir: path.join(out, 'og') } : {},
  );
  for (const entry of written) console.log(report(entry));
  const names = new Set(written.map((entry) => path.basename(entry.file)));
  const folder = path.dirname(
    written.find((entry) => entry.kind === 'cover').file,
  );
  const stale = (await readdir(folder)).filter(
    (file) => file.endsWith('.png') && !names.has(file),
  );
  if (stale.length)
    console.warn(
      `Not in the JSON any more, remove if unused: ${stale.join(', ')}`,
    );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href
) {
  try {
    await main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
