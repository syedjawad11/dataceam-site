// The input contract: fields, limits, validation and the --help text.
import { unsupportedCharacters } from './fonts.mjs';
import { ICON_NAMES } from './icons.mjs';
import { THEMES } from './themes/index.mjs';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const str = (max, extra = {}) => ({ type: 'string', max, ...extra });
const opt = (field) => ({ ...field, optional: true });
const icon = { type: 'icon' };
const list = (min, max, of) => ({ type: 'list', min, max, of });
const object = (fields) => ({ type: 'object', fields });

const title = str(70);
const label = str(34);
const text = str(110);
const message = str(140);
const shared = {
  file: { type: 'file' },
  layout: { type: 'layout' },
  title,
  highlight: opt({ type: 'highlight' }),
};

export const LAYOUT_FIELDS = {
  cover: {
    use: 'the title card (exactly one, file "cover")',
    fields: {
      ...shared,
      kicker: str(28),
      subtitle: str(120),
      icons: list(2, 3, icon),
    },
  },
  steps: {
    use: 'a process in order',
    fields: {
      ...shared,
      items: list(3, 6, object({ icon, label, text })),
      note: opt(message),
    },
  },
  compare: {
    use: 'two things side by side',
    fields: {
      ...shared,
      columns: list(
        2,
        2,
        object({ heading: label, icon, items: list(2, 6, text) }),
      ),
      verdict: opt(message),
    },
  },
  cycle: {
    use: 'a loop that repeats (clockwise from the top)',
    fields: {
      ...shared,
      center: label,
      items: list(3, 5, object({ label, text })),
      note: opt(message),
    },
  },
  layers: {
    use: 'things stacked on each other (first item is the top layer)',
    fields: {
      ...shared,
      items: list(3, 6, object({ label, text })),
      note: opt(message),
    },
  },
  bars: {
    use: 'real numbers compared (the biggest bar is highlighted)',
    fields: {
      ...shared,
      items: list(
        2,
        6,
        object({ label, value: { type: 'number' }, display: str(20) }),
      ),
      note: opt(message),
      source: str(120),
    },
  },
  cards: {
    use: 'types, uses, tips, mistakes',
    fields: {
      ...shared,
      items: list(3, 6, object({ icon, label, text })),
      note: opt(message),
    },
  },
  analogy: {
    use: 'an everyday thing matched to an AI thing, pair by pair',
    fields: {
      ...shared,
      left: object({ heading: label, icon }),
      right: object({ heading: label, icon }),
      pairs: list(3, 5, object({ left: text, right: text })),
      note: opt(message),
    },
  },
};

function checkString(value, max, at, errors) {
  if (typeof value !== 'string' || !value.trim()) {
    errors.push(`${at}: must be a non-empty string.`);
    return false;
  }
  if (value !== value.trim() || / {2}/.test(value))
    errors.push(`${at}: remove the extra spaces.`);
  const length = [...value].length;
  if (max && length > max)
    errors.push(
      `${at}: ${length} characters, the limit is ${max}. Shorten "${value}".`,
    );
  if (value.includes('—') || / -- /.test(value))
    errors.push(`${at}: no em dashes. Use a comma, a colon or two sentences.`);
  else {
    const bad = unsupportedCharacters(value);
    if (bad.length)
      errors.push(
        `${at}: the fonts cannot draw ${bad
          .map(
            (char) =>
              `"${char}" (U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`,
          )
          .join(', ')}. Use plain letters, numbers and punctuation.`,
      );
  }
  return true;
}

function checkObject(value, fields, at, errors, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${at}: must be an object.`);
    return;
  }
  for (const key of Object.keys(value))
    if (!Object.hasOwn(fields, key))
      errors.push(
        `${at}.${key}: unknown field. Allowed: ${Object.keys(fields).join(', ')}.`,
      );
  for (const [key, field] of Object.entries(fields))
    checkField(value[key], field, `${at}.${key}`, errors, value, where);
}

function checkField(value, field, at, errors, parent) {
  if (value === undefined) {
    if (!field.optional) errors.push(`${at}: missing.`);
    return;
  }
  if (field.type === 'string') checkString(value, field.max, at, errors);
  else if (field.type === 'icon') {
    if (!ICON_NAMES.includes(value))
      errors.push(
        `${at}: unknown icon "${value}". Valid icons: ${ICON_NAMES.join(', ')}.`,
      );
  } else if (field.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0)
      errors.push(`${at}: must be a number of 0 or more.`);
  } else if (field.type === 'file') {
    if (typeof value !== 'string' || !KEBAB.test(value))
      errors.push(`${at}: must be kebab-case, such as "next-word".`);
  } else if (field.type === 'highlight') {
    if (
      checkString(value, 70, at, errors) &&
      typeof parent.title === 'string' &&
      !` ${parent.title}`.includes(` ${value}`)
    )
      errors.push(
        `${at}: "${value}" must be whole words copied from the title.`,
      );
  } else if (field.type === 'list') {
    if (!Array.isArray(value)) {
      errors.push(`${at}: must be a list.`);
      return;
    }
    if (value.length < field.min || value.length > field.max)
      errors.push(
        `${at}: has ${value.length} entries, needs ${field.min === field.max ? field.min : `${field.min} to ${field.max}`}.`,
      );
    value.forEach((entry, index) =>
      checkField(entry, field.of, `${at}[${index}]`, errors, parent),
    );
  } else if (field.type === 'object') {
    checkObject(value, field.fields, at, errors);
  }
}

/** Returns a list of problems; empty when the guide spec is fine. */
export function validate(data, slug) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return ['The file must hold one JSON object with slug, theme and images.'];
  for (const key of Object.keys(data))
    if (!['slug', 'theme', 'images'].includes(key))
      errors.push(`${key}: unknown field. Allowed: slug, theme, images.`);
  if (typeof data.slug !== 'string' || !KEBAB.test(data.slug))
    errors.push('slug: must be kebab-case.');
  else if (slug && data.slug !== slug)
    errors.push(`slug: is "${data.slug}" but the guide is "${slug}".`);
  if (!Object.hasOwn(THEMES, data.theme ?? ''))
    errors.push(`theme: must be one of ${Object.keys(THEMES).join(', ')}.`);
  if (!Array.isArray(data.images)) {
    errors.push('images: must be a list.');
    return errors;
  }
  const covers = data.images.filter((image) => image?.layout === 'cover');
  if (covers.length !== 1)
    errors.push(`images: needs exactly one cover, found ${covers.length}.`);
  const others = data.images.length - covers.length;
  if (others < 2 || others > 4)
    errors.push(
      `images: needs 2 to 4 pictures besides the cover, found ${others}.`,
    );
  const seen = new Set();
  data.images.forEach((image, index) => {
    const at = `images[${index}]`;
    if (!image || !Object.hasOwn(LAYOUT_FIELDS, image.layout ?? '')) {
      errors.push(
        `${at}.layout: must be one of ${Object.keys(LAYOUT_FIELDS).join(', ')}.`,
      );
      return;
    }
    checkObject(image, LAYOUT_FIELDS[image.layout].fields, at, errors);
    if (seen.has(image.file))
      errors.push(`${at}.file: "${image.file}" is used twice.`);
    seen.add(image.file);
    if ((image.layout === 'cover') !== (image.file === 'cover'))
      errors.push(
        `${at}.file: "cover" is the name of the cover, and only the cover.`,
      );
    if (
      image.layout === 'bars' &&
      Array.isArray(image.items) &&
      !image.items.some((item) => item?.value > 0)
    )
      errors.push(`${at}.items: at least one value must be above 0.`);
  });
  return errors;
}

function describe(field) {
  if (field.type === 'string') return `text up to ${field.max} characters`;
  if (field.type === 'icon') return 'icon name';
  if (field.type === 'number') return 'number, 0 or more';
  if (field.type === 'file') return 'unique kebab-case name of the PNG';
  if (field.type === 'layout') return 'the layout name';
  if (field.type === 'highlight')
    return 'whole words copied from the title to mark as the key phrase (recommended)';
  if (field.type === 'list') {
    const size =
      field.min === field.max ? field.min : `${field.min} to ${field.max}`;
    return `list of ${size}: ${describe(field.of)}`;
  }
  return `{ ${Object.entries(field.fields)
    .map(([key, value]) => `${key}: ${describe(value)}`)
    .join('; ')} }`;
}

export function helpText(example) {
  const layouts = Object.entries(LAYOUT_FIELDS).map(
    ([name, { use, fields }]) =>
      `  ${name}: ${use}\n` +
      Object.entries(fields)
        .map(
          ([key, field]) =>
            `    ${key}${field.optional ? ' (optional)' : ''}: ${
              field.type === 'layout' ? `"${name}"` : describe(field)
            }`,
        )
        .join('\n'),
  );
  return `Draws the cover, infographics and social card of one guide.

Usage
  npm run guide:images -- <slug>              read ops/guides/infographics/<slug>.json, write
                                              src/assets/guides/<slug>/<file>.png and
                                              public/og/guides/<slug>.png
  npm run guide:images -- <slug> --out <dir>  write everything to <dir> instead (social card: <dir>/og)
  npm run guide:images -- --samples <dir>     draw every layout in every theme for review
  npm run guide:images -- --self-test         test the renderer
  npm run guide:images -- --help              this text

File
  { "slug": "<slug>", "theme": "daylight" | "blueprint" | "paper", "images": [ ... ] }
  images: exactly one cover plus 2 to 4 other pictures. Use at least two different layouts.

Sizes
  cover 1200x675, social card 1200x630, other pictures 1080 wide (drawn at 1.5x), 800 to 1700 high.
  Type shrinks in steps when there is a lot of text; past 1700 high the run fails and says so.

Rules
  Titles make the point. Labels 1 to 4 words. Texts under about 14 words read best on a phone.
  The small tag above each title ("4 steps", "Side by side") is added automatically.
  List pictures in the order they appear in the article (blueprint numbers them Fig. 1, Fig. 2).
  If highlight is left out, covers and the paper theme mark the last line of the title.
  No em dashes, no emoji, no arrows or symbols the fonts lack. Unknown fields are errors.

Icons
  ${ICON_NAMES.join(', ')}

Layouts and fields
${layouts.join('\n\n')}

Complete example (ops/guides/infographics/${example.slug}.json)
${JSON.stringify(example, null, 2)}`;
}
