// Small line-based markdown reader for guide bodies. It knows only the
// constructs guides use: headings, paragraphs, lists, tables, blockquotes,
// images, fenced code. No dependency.

const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;
const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const LINK = /(!?)\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
const AUTOLINK = /<(https?:\/\/[^>\s]+)>/g;
const BARE_URL = /https?:\/\/[^\s)<>\]]+/g;

export function parseBlocks(body) {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let current = null;
  const flush = () => {
    if (!current) return;
    if (current.type === 'paragraph') {
      current.text = current.lines.join(' ').trim();
      const italic = /^(\*|_)(?!\1)[\s\S]*[^*_\s]\1$/.test(current.text);
      if (italic && !/^\*\*|^__/.test(current.text)) current.type = 'caption';
    }
    blocks.push(current);
    current = null;
  };
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineNo = i + 1;
    const fence = line.match(/^\s*(```|~~~)/);
    if (fence) {
      flush();
      const start = lineNo;
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) {
        code.push(lines[i]);
        i += 1;
      }
      blocks.push({ type: 'code', text: code.join('\n'), line: start });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      flush();
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: heading[2],
        line: lineNo,
      });
      continue;
    }
    if (/^ {0,3}([-*_])( *\1){2,} *$/.test(line)) {
      flush();
      blocks.push({ type: 'hr', line: lineNo });
      continue;
    }
    const image = line.match(IMAGE_LINE);
    if (image && (!current || current.type === 'paragraph')) {
      flush();
      blocks.push({
        type: 'image',
        alt: image[1],
        src: image[2],
        line: lineNo,
      });
      continue;
    }
    if (/^\s*\|/.test(line)) {
      if (current?.type !== 'table') {
        flush();
        current = { type: 'table', rows: [], line: lineNo };
      }
      current.rows.push(line);
      continue;
    }
    if (/^\s*>/.test(line)) {
      if (current?.type !== 'quote') {
        flush();
        current = { type: 'quote', lines: [], line: lineNo };
      }
      current.lines.push(line.replace(/^\s*>\s?/, ''));
      continue;
    }
    const item = line.match(LIST_ITEM);
    if (item && current?.type !== 'quote') {
      if (current?.type !== 'list') {
        flush();
        current = { type: 'list', items: [], ordered: false, line: lineNo };
      }
      if (/^\d/.test(item[2])) current.ordered = true;
      current.items.push(item[3]);
      continue;
    }
    if (current?.type === 'list' && /^\s+\S/.test(line)) {
      current.items[current.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    if (current?.type === 'quote') {
      current.lines.push(line.trim());
      continue;
    }
    if (current?.type !== 'paragraph') {
      flush();
      current = { type: 'paragraph', lines: [], line: lineNo };
    }
    current.lines.push(line.trim());
  }
  flush();
  for (const block of blocks) {
    if (block.type === 'quote') block.text = block.lines.join(' ').trim();
  }
  return blocks;
}

/** Visible text of an inline markdown string (no code, images, URLs). */
export function inlineText(source) {
  return source
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(AUTOLINK, ' ')
    .replace(BARE_URL, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*+/g, '')
    .replace(/(?<![\p{L}\p{N}])_+|_+(?![\p{L}\p{N}])/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tableCells(rows) {
  const cells = [];
  for (const row of rows) {
    if (/^\s*\|?[\s:|-]+\|?\s*$/.test(row) && row.includes('-')) continue;
    for (const cell of row
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')) {
      cells.push(cell.trim());
    }
  }
  return cells;
}

/** Plain text of every block that counts as body words (no code, no alt). */
export function blockTexts(blocks) {
  const texts = [];
  for (const block of blocks) {
    if (
      block.type === 'heading' ||
      block.type === 'paragraph' ||
      block.type === 'caption' ||
      block.type === 'quote'
    ) {
      texts.push(inlineText(block.text));
    } else if (block.type === 'list') {
      for (const item of block.items) texts.push(inlineText(item));
    } else if (block.type === 'table') {
      for (const cell of tableCells(block.rows)) texts.push(inlineText(cell));
    }
  }
  return texts.filter(Boolean);
}

/** Every markdown link and bare URL outside code and images. */
export function extractLinks(blocks) {
  const links = [];
  const scan = (source, line) => {
    const clean = source.replace(/`[^`]*`/g, ' ');
    let rest = clean;
    for (const match of clean.matchAll(LINK)) {
      if (match[1] === '!') continue;
      links.push({ text: match[2].trim(), href: match[3], line });
    }
    rest = rest.replace(LINK, ' ');
    for (const match of rest.matchAll(AUTOLINK)) {
      links.push({ text: match[1], href: match[1], line, bare: true });
    }
    rest = rest.replace(AUTOLINK, ' ');
    for (const match of rest.matchAll(BARE_URL)) {
      links.push({ text: match[0], href: match[0], line, bare: true });
    }
  };
  for (const block of blocks) {
    if (
      block.type === 'paragraph' ||
      block.type === 'caption' ||
      block.type === 'heading' ||
      block.type === 'quote'
    )
      scan(block.text, block.line);
    else if (block.type === 'list')
      for (const item of block.items) scan(item, block.line);
    else if (block.type === 'table')
      for (const row of block.rows) scan(row, block.line);
  }
  return links;
}

// ---- text metrics -------------------------------------------------------

const WORD = /[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu;
export const words = (text) => text.match(WORD) ?? [];
export const wordCount = (text) => words(text).length;

const ABBREVIATIONS =
  /\b(e\.g|i\.e|vs|etc|approx|Dr|Mr|Mrs|Ms|St|No|Fig|U\.S|U\.K)\./g;

export function sentences(text) {
  const protectedText = text.replace(ABBREVIATIONS, (m) =>
    m.replace(/\./g, '\uE000'),
  );
  return protectedText
    .split(/(?<=[.!?…])["”’)\]]*\s+(?=["“‘([]?[\p{Lu}\p{N}])/u)
    .map((part) => part.replace(/\uE000/g, '.').trim())
    .filter((part) => wordCount(part) > 0);
}

export function syllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  // Silent endings: "-es" and "-ed" after most consonants, "-e" except "-le".
  w = w
    .replace(/[^aeiouy]es$/, (m) => m[0])
    .replace(/[^aeiouytd]ed$/, (m) => m[0])
    .replace(/[^aeiouyl]e$/, (m) => m[0])
    .replace(/^y/, '');
  return Math.max(1, (w.match(/[aeiouy]+/g) ?? []).length);
}

export function fleschReadingEase(proseSentences) {
  let wordTotal = 0;
  let syllableTotal = 0;
  for (const sentence of proseSentences) {
    for (const word of words(sentence)) {
      wordTotal += 1;
      syllableTotal += syllables(word);
    }
  }
  if (!wordTotal || !proseSentences.length) return 100;
  return (
    206.835 -
    1.015 * (wordTotal / proseSentences.length) -
    84.6 * (syllableTotal / wordTotal)
  );
}

/** Lowercase letters/digits only, single spaces; for phrase matching. */
export const normalizeText = (text) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
