// Font loading, text measuring and line breaking.
// Every string is turned into outlines by satori, so the final SVG holds no
// <text> and needs no fonts (system or otherwise) when resvg draws it.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { inflateSync } from 'node:zlib';
import satori from 'satori';

const require = createRequire(import.meta.url);

const FACES = [
  ['display', 'bricolage-grotesque', 700],
  ['display', 'bricolage-grotesque', 800],
  ['body', 'inter', 400],
  ['body', 'inter', 600],
  ['body', 'inter', 700],
];

const fonts = FACES.map(([name, family, weight]) => ({
  name,
  weight,
  style: 'normal',
  data: readFileSync(
    require.resolve(
      `@fontsource/${family}/files/${family}-latin-${weight}-normal.woff`,
    ),
  ),
}));

/** Reads the cmap (format 4 and 12) of a WOFF 1 file into a set of code points. */
function readCmap(woff) {
  const tables = woff.readUInt16BE(12);
  let cmap;
  for (let i = 0; i < tables; i++) {
    const at = 44 + i * 20;
    if (woff.toString('latin1', at, at + 4) !== 'cmap') continue;
    const offset = woff.readUInt32BE(at + 4);
    const packed = woff.readUInt32BE(at + 8);
    const size = woff.readUInt32BE(at + 12);
    const raw = woff.subarray(offset, offset + packed);
    cmap = packed < size ? inflateSync(raw) : raw;
  }
  if (!cmap) throw new Error('Font has no cmap table.');
  const points = new Set();
  const subtables = cmap.readUInt16BE(2);
  for (let i = 0; i < subtables; i++) {
    const at = cmap.readUInt32BE(4 + i * 8 + 4);
    const format = cmap.readUInt16BE(at);
    if (format === 4) {
      const count = cmap.readUInt16BE(at + 6) / 2;
      for (let s = 0; s < count; s++) {
        const end = cmap.readUInt16BE(at + 14 + s * 2);
        const start = cmap.readUInt16BE(at + 16 + count * 2 + s * 2);
        if (start === 0xffff) continue;
        for (let code = start; code <= end; code++) points.add(code);
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(at + 12);
      for (let g = 0; g < groups; g++) {
        const start = cmap.readUInt32BE(at + 16 + g * 12);
        const end = cmap.readUInt32BE(at + 20 + g * 12);
        for (let code = start; code <= end; code++) points.add(code);
      }
    }
  }
  return points;
}

const supported = fonts
  .map((font) => readCmap(font.data))
  .reduce((all, set) => new Set([...all].filter((code) => set.has(code))));

/** Characters in `text` that the bundled fonts cannot draw. */
export function unsupportedCharacters(text) {
  const bad = new Set();
  for (const char of text) {
    const code = char.codePointAt(0);
    const invisible =
      code < 0x20 ||
      (code >= 0x7f && code < 0xa0) ||
      code === 0xad ||
      (code >= 0x2000 && code <= 0x200f) ||
      (code >= 0x2028 && code <= 0x202f) ||
      code === 0xfeff;
    if (invisible || !supported.has(code)) bad.add(char);
  }
  return [...bad];
}

// Outlines are made at 4x and scaled down: satori rounds to a tenth of a pixel.
const OVERSAMPLE = 4;
const shapes = new Map();

async function shape(text, style) {
  const key = `${style.font}|${style.weight}|${style.size}|${style.track}|${text}`;
  const cached = shapes.get(key);
  if (cached) return cached;
  let width = 0;
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { display: 'flex', alignItems: 'flex-start', width: '100%' },
        children: {
          type: 'div',
          key: 'text',
          props: {
            style: {
              display: 'flex',
              flexShrink: 0,
              whiteSpace: 'pre',
              fontFamily: style.font,
              fontWeight: style.weight,
              fontSize: style.size * OVERSAMPLE,
              lineHeight: 1,
              letterSpacing: style.track * style.size * OVERSAMPLE,
            },
            children: text,
          },
        },
      },
    },
    {
      width: 40000,
      fonts,
      onNodeDetected: (node) => {
        if (node.key === 'text') width = node.width;
      },
    },
  );
  const d = [...svg.matchAll(/<path[^>]*? d="([^"]+)"/g)]
    .map((match) => match[1])
    .join('');
  const shaped = {
    d,
    width: width / OVERSAMPLE - style.track * style.size,
  };
  shapes.set(key, shaped);
  return shaped;
}

const capCache = new Map();

/** Top and bottom of a capital H, as a share of the font size. */
async function capMetrics(style) {
  const key = `${style.font}|${style.weight}`;
  if (!capCache.has(key)) {
    const { d } = await shape('H', { ...style, size: 100, track: 0 });
    const numbers = d.match(/-?\d*\.?\d+/g).map(Number);
    const ys = numbers.filter((_, index) => index % 2 === 1);
    capCache.set(key, {
      top: Math.min(...ys) / (100 * OVERSAMPLE),
      base: Math.max(...ys) / (100 * OVERSAMPLE),
    });
  }
  return capCache.get(key);
}

/** How good it is to end a line after this word. */
function pause(word) {
  if (/[.!?]$/.test(word)) return 0.12;
  return /[,:;]$/.test(word) ? 0.03 : 0;
}

/**
 * Fewest lines first, then the most even line lengths. A short last line costs
 * less than a short line in the middle, and breaks after punctuation are nicer.
 */
function breakLines(words, widths, space, maxWidth, lastLineWeight) {
  const count = widths.length;
  const best = Array(count + 1).fill(null);
  best[count] = { lines: 0, cost: 0, next: count };
  for (let start = count - 1; start >= 0; start--) {
    let width = -space;
    for (let end = start; end < count; end++) {
      width += widths[end] + space;
      if (width > maxWidth && end > start) break;
      const rest = best[end + 1];
      const slack = Math.max(0, maxWidth - width) / maxWidth;
      const orphan = end === start && count > 2 && end === count - 1 ? 0.12 : 0;
      const option = {
        lines: rest.lines + 1,
        cost:
          rest.cost +
          slack * slack * (end === count - 1 ? lastLineWeight : 1) +
          orphan -
          (end < count - 1 ? pause(words[end]) : 0),
        next: end + 1,
      };
      const current = best[start];
      if (
        !current ||
        option.lines < current.lines ||
        (option.lines === current.lines && option.cost < current.cost)
      )
        best[start] = option;
    }
  }
  const ranges = [];
  for (let at = 0; at < count; at = best[at].next)
    ranges.push([at, best[at].next]);
  return ranges;
}

/**
 * Wraps and outlines text. The block is measured from the cap height of the
 * first line to the baseline of the last one, so padding looks even.
 * `highlight` is [firstWord, lastWord + 1], or 'last-line' (the
 * last two words when there is only one line).
 */
export async function textBlock(text, style, maxWidth, highlight) {
  const words = text.trim().split(/ +/);
  const cap = await capMetrics(style);
  const shapedWords = await Promise.all(
    words.map((word) => shape(word, style)),
  );
  const space = (await shape('n n', style)).width;
  const spaceWidth = space - 2 * (await shape('n', style)).width;
  const widths = shapedWords.map((word) => word.width);
  const ranges = breakLines(
    words,
    widths,
    spaceWidth,
    maxWidth - 1,
    style.font === 'display' ? 0.85 : 0.75,
  );
  const lineHeight = style.size * style.lead;
  const capHeight = (cap.base - cap.top) * style.size;

  const lines = [];
  for (const [index, [from, to]] of ranges.entries()) {
    const line = words.slice(from, to).join(' ');
    const { width } = await shape(line, style);
    const [markFrom, markTo] =
      highlight === 'last-line' && ranges.length === 1
        ? [Math.max(0, to - 2), to]
        : highlight === 'last-line'
          ? index === ranges.length - 1
            ? [from, to]
            : [0, 0]
          : (highlight ?? [0, 0]);
    const start = Math.max(from, markFrom);
    const end = Math.min(to, markTo);
    const runs = [];
    const addRun = async (runFrom, runTo, marked) => {
      if (runFrom >= runTo) return;
      const run = await shape(words.slice(runFrom, runTo).join(' '), style);
      const upTo = await shape(words.slice(from, runTo).join(' '), style);
      runs.push({
        d: run.d,
        x: upTo.width - run.width,
        width: run.width,
        marked,
      });
    };
    if (start < end) {
      await addRun(from, start, false);
      await addRun(start, end, true);
      await addRun(end, to, false);
    } else {
      await addRun(from, to, false);
    }
    lines.push({ width, runs });
  }

  const width = Math.max(...lines.map((line) => line.width));
  const longest = widths.indexOf(Math.max(...widths));
  return {
    width,
    height: (lines.length - 1) * lineHeight + capHeight,
    capHeight,
    size: style.size,
    lineCount: lines.length,
    endsAtPause: ranges
      .slice(0, -1)
      .some(([, to]) => /[.!?:]$/.test(words[to - 1])),
    overflow: width > maxWidth ? words[longest] : null,
    /** Highlighted boxes, for markers drawn behind the text. */
    marks(x, y, align = 'left', boxWidth = width) {
      return lines.flatMap((line, index) =>
        line.runs
          .filter((run) => run.marked)
          .map((run) => ({
            x: x + offset(line, align, boxWidth) + run.x,
            y: y + index * lineHeight,
            width: run.width,
            height: capHeight,
          })),
      );
    },
    draw(x, y, fill, { align = 'left', boxWidth = width, mark } = {}) {
      return lines
        .map((line, index) => {
          const top = y + index * lineHeight - cap.top * style.size;
          return line.runs
            .map((run) => {
              const left = x + offset(line, align, boxWidth) + run.x;
              const color = run.marked && mark ? mark : fill;
              return `<path transform="translate(${round(left)} ${round(top)}) scale(${1 / OVERSAMPLE})" fill="${color}" d="${run.d}"/>`;
            })
            .join('');
        })
        .join('');
    },
  };
}

function offset(line, align, boxWidth) {
  if (align === 'center') return (boxWidth - line.width) / 2;
  if (align === 'right') return boxWidth - line.width;
  return 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
