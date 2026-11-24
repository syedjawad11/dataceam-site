// The eight layouts. Each one measures its text first, then places it, so
// nothing can overflow: a taller text makes a taller picture.
import { textBlock } from './fonts.mjs';
import { rotate } from './svg.mjs';

export const BODY_WIDTH = 1080;
export const MIN_HEIGHT = 800;
export const MAX_HEIGHT = 1700;
const COMFORTABLE_HEIGHT = 1560;

// Type sizes (px on the 1080 canvas), tried from large to small.
const SIZES = [
  { title: 72, label: 44, text: 37, air: 1 },
  { title: 70, label: 43, text: 36, air: 0.96 },
  { title: 66, label: 42, text: 35, air: 0.92 },
  { title: 62, label: 40, text: 34, air: 0.86 },
  { title: 58, label: 38, text: 32, air: 0.76 },
  { title: 54, label: 36, text: 31, air: 0.66 },
  { title: 54, label: 36, text: 31, air: 0.52 },
];

const STYLES = {
  title: { font: 'display', weight: 700, track: -0.022, lead: 1.08 },
  label: { font: 'display', weight: 700, track: -0.012, lead: 1.12 },
  text: { font: 'body', weight: 400, track: -0.006, lead: 1.34 },
  strong: { font: 'body', weight: 600, track: -0.008, lead: 1.32 },
  kicker: { font: 'body', weight: 700, track: 0, lead: 1.2 },
  number: { font: 'display', weight: 800, track: -0.02, lead: 1 },
};

/** Text helper for one picture at one set of sizes. */
function typesetter(theme, sizes) {
  const overflow = [];
  return {
    theme,
    sizes,
    overflow,
    extra: 0,
    air: (value) => Math.round(value * sizes.air),
    /** Space between a label and its text. */
    lead: Math.max(26, Math.round(33 * sizes.air)),
    async block(role, text, maxWidth, { size, highlight } = {}) {
      const base =
        size ?? (role === 'strong' ? sizes.text : (sizes[role] ?? sizes.text));
      const block = await textBlock(
        text,
        { ...STYLES[role], size: base },
        maxWidth,
        highlight,
      );
      if (block.overflow) overflow.push(block.overflow);
      return block;
    },
  };
}

const sum = (list) => list.reduce((total, value) => total + value, 0);
const maxOf = (list) => Math.max(0, ...list);

function highlightRange(title, highlight) {
  if (!highlight) return undefined;
  const words = title.trim().split(/ +/);
  const wanted = highlight.trim().split(/ +/);
  for (let at = 0; at + wanted.length <= words.length; at++)
    if (wanted.every((word, index) => words[at + index].startsWith(word)))
      return [at, at + wanted.length];
  return undefined;
}

/* ---------- steps ---------- */

async function steps(t, data, box) {
  const { theme } = t;
  const mode = theme.steps;
  const tight = t.sizes.air < 0.8;
  const pad = Math.max(24, t.air(38));
  const chipGap = tight ? 28 : 32;
  const rail = mode === 'rail' ? (tight ? 102 : 124) : 0;
  const chip = tight ? (rail ? 84 : 92) : 120;
  const indent = mode === 'zigzag' && t.sizes.air > 0.7 ? 40 : 0;
  const w = box.w - rail - indent;
  const chipInset = mode === 'chips' ? 14 : 0;
  const textWidth = w - pad - chipInset - chip - chipGap - Math.max(pad, 26);
  const gap = t.air({ rail: 32, chips: 54, zigzag: 84 }[mode]);
  const extra = t.extra / data.items.length;

  const rows = [];
  for (const item of data.items) {
    const label = await t.block('label', item.label, textWidth);
    const text = item.text && (await t.block('text', item.text, textWidth));
    const content = label.height + (text ? t.lead + text.height : 0);
    rows.push({
      item,
      label,
      text,
      content,
      h: Math.max(chip, content) + pad * 2 + extra,
    });
  }
  const numbers = await Promise.all(
    rows.map((_, i) =>
      t.block('number', String(i + 1), 200, {
        size: mode === 'rail' ? 44 : 34,
      }),
    ),
  );

  let y = box.y;
  let below = '';
  let above = '';
  const centres = [];
  for (const [i, row] of rows.entries()) {
    const x =
      box.x + rail + (mode === 'zigzag' ? (i % 2 === 0 ? 0 : indent) : 0);
    const tone = 'plain';
    const look = theme.tones[tone];
    below += theme.card({ x, y, w, h: row.h, tone, i });
    const chipOnRight = mode === 'rail';
    const chipX = chipOnRight ? x + w - pad - chip : x + pad + chipInset;
    const textX = chipOnRight ? x + pad : x + pad + chipInset + chip + chipGap;
    const chipY = y + (row.h - chip) / 2;
    above += theme.chip({
      x: chipX,
      y: chipY,
      s: chip,
      name: row.item.icon ?? 'check',
      tone: theme.chipTones[i],
      i,
    });
    if (mode === 'chips')
      above += theme.badge({
        cx: chipX + 2,
        cy: chipY + 2,
        r: 27,
        block: numbers[i],
      });
    if (mode === 'zigzag')
      above += theme.badge({
        cx: x + 8,
        cy: y + 8,
        r: 31,
        block: numbers[i],
        tone: 'deep',
      });
    let textY = y + (row.h - row.content) / 2;
    above += row.label.draw(textX, textY, look.ink);
    textY += row.label.height + t.lead;
    if (row.text) above += row.text.draw(textX, textY, look.body);
    centres.push({ x: chipX + chip / 2, y, h: row.h });
    y += row.h + gap;
  }
  const bottom = y - gap;

  let links = '';
  if (mode === 'rail') {
    const cx = box.x + 46;
    centres.forEach((row, i) => {
      const cy = row.y + row.h / 2;
      if (i + 1 < centres.length) {
        const next = centres[i + 1];
        links += theme.connector({
          from: [cx, cy + 50],
          to: [cx, next.y + next.h / 2 - 54],
        });
      }
      if (!tight)
        links += theme.connector({
          from: [cx + 50, cy],
          to: [box.x + rail - 4, cy],
        });
      above += theme.badge({ cx, cy, r: 38, block: numbers[i] });
    });
  } else {
    for (let i = 0; i + 1 < centres.length; i++) {
      const row = centres[i];
      const x =
        mode === 'zigzag' ? box.x + box.w / 2 + (i % 2 ? 40 : -40) : row.x;
      links += theme.connector({
        from: [x, row.y + row.h + (mode === 'zigzag' ? 17 : 14)],
        to: [x, centres[i + 1].y - 8],
        width: mode === 'zigzag' ? 5 : 9,
      });
    }
  }
  return { svg: below + links + above, bottom };
}

/* ---------- compare ---------- */

async function compare(t, data, box) {
  const { theme } = t;
  const gap = 36;
  const w = (box.w - gap) / 2;
  const pad = 30;
  const bullet = 42;
  const textWidth = w - pad - bullet - 18 - 26;
  const chip = 104;

  const columns = [];
  for (const column of data.columns) {
    const heading = await t.block('label', column.heading, w - pad * 2 - 20, {
      size: t.sizes.label + 2,
    });
    const items = [];
    for (const item of column.items)
      items.push(await t.block('text', item, textWidth));
    columns.push({ column, heading, items });
  }
  const headH =
    t.air(34) +
    chip +
    t.air(34) +
    maxOf(columns.map((c) => c.heading.height)) +
    t.air(38);
  const count = maxOf(columns.map((c) => c.items.length));
  const extra = t.extra / count;
  const tallest = Array.from({ length: count }, (_, i) =>
    maxOf(
      columns.map(({ items }) =>
        items[i] ? items[i].height + bullet - items[i].capHeight : 0,
      ),
    ),
  );
  const rowHeights = tallest.map((value) => value + t.air(22) * 2 + extra);
  const bodyPad = t.air(14);
  const h = headH + bodyPad * 2 + sum(rowHeights);

  let svg = '';
  columns.forEach(({ column, heading, items }, side) => {
    const x = box.x + side * (w + gap);
    const tone = side === 0 ? 'soft' : 'accent';
    const look = theme.tones[tone];
    svg += theme.card({ x, y: box.y, w, h, tone: 'plain', i: side });
    svg += theme.panelHead({ x, y: box.y, w, h: headH, tone });
    svg += theme.chip({
      x: x + (w - chip) / 2,
      y: box.y + t.air(34),
      s: chip,
      name: column.icon ?? 'check',
      tone: side === 0 ? 'solid' : 'white',
      i: side,
    });
    svg += heading.draw(
      x + pad,
      box.y + t.air(34) + chip + t.air(34),
      look.ink,
      { align: 'center', boxWidth: w - pad * 2 },
    );
    let y = box.y + headH + bodyPad;
    items.forEach((block, i) => {
      const rowH = rowHeights[i];
      if (i > 0) svg += theme.rule(x + pad, y, x + w - pad, y);
      // First lines line up across the row, centred on their bullets.
      const top = y + (rowH - tallest[i]) / 2;
      svg += theme.bullet({ x: x + pad, y: top, s: bullet, side });
      svg += block.draw(
        x + pad + bullet + 18,
        top + (bullet - block.capHeight) / 2,
        theme.tones.plain.ink,
      );
      y += rowH;
    });
  });
  const vs = await t.block('number', 'vs', 100, { size: 40 });
  svg += theme.versus({
    cx: box.x + box.w / 2,
    cy: box.y + t.air(34) + chip / 2,
    block: vs,
  });
  return { svg, bottom: box.y + h };
}

/* ---------- cycle ---------- */

async function cycle(t, data, box) {
  const { theme } = t;
  const count = data.items.length;
  const gap = 84;
  const half = (box.w - gap) / 2;
  const wide = 500;
  const pad = 34;
  const top = Math.max(60, t.air(64));

  const numbers = await Promise.all(
    data.items.map((_, i) =>
      t.block('number', String(i + 1), 80, { size: 36 }),
    ),
  );
  const cards = [];
  for (const [i, item] of data.items.entries()) {
    const w = count !== 4 && i === 0 ? wide : half;
    const label = await t.block('label', item.label, w - pad * 2);
    const text = item.text && (await t.block('text', item.text, w - pad * 2));
    cards.push({
      w,
      label,
      text,
      h: top + label.height + (text ? t.lead + text.height : 0) + t.air(40),
    });
  }
  const centre = await t.block('label', data.center, 330, {
    size: t.sizes.label - 2,
  });
  const pillW = centre.width + 88;
  const pillH = Math.max(112, centre.height + 72);
  const band = Math.max(t.air(230), pillH + 124);
  const rowGap = t.air(128);

  const rowsCount = count === 5 ? 3 : 2;
  const extra = t.extra / rowsCount;
  const leftX = box.x;
  const rightX = box.x + half + gap;
  const midX = box.x + (box.w - wide) / 2;
  const place = (card, x, y, h) => Object.assign(card, { x, y, h });

  let y = box.y + 30;
  let bandY;
  let curves = '';
  if (count === 4) {
    const h1 = Math.max(cards[0].h, cards[1].h) + extra;
    place(cards[0], leftX, y, h1);
    place(cards[1], rightX, y, h1);
    bandY = y + h1;
    y = bandY + band;
    const h2 = Math.max(cards[2].h, cards[3].h) + extra;
    place(cards[2], rightX, y, h2);
    place(cards[3], leftX, y, h2);
    y += h2;
    curves += theme.connector({
      from: [leftX + half + 14, cards[0].y + h1 / 2],
      to: [rightX - 10, cards[0].y + h1 / 2],
      width: theme.arrowWidth,
    });
  } else {
    place(cards[0], midX, y, cards[0].h + extra);
    const first = cards[0];
    y += first.h + (count === 5 ? rowGap : band);
    if (count === 3) bandY = first.y + first.h;
    const [rightCard, leftCard] =
      count === 5 ? [cards[1], cards[4]] : [cards[1], cards[2]];
    const h2 = Math.max(rightCard.h, leftCard.h) + extra;
    place(rightCard, rightX, y, h2);
    place(leftCard, leftX, y, h2);
    const turnY = first.y + first.h * 0.5;
    const outX = rightX + half * 0.68;
    const inX = leftX + half * 0.32;
    curves += theme.curve({
      d: `M${midX + wide + 16} ${turnY}Q${outX} ${turnY} ${outX} ${y - 34}`,
      tip: [outX, y - 12],
      dir: [0, 1],
    });
    curves += theme.curve({
      d: `M${inX} ${y - 16}Q${inX} ${turnY} ${midX - 36} ${turnY}`,
      tip: [midX - 14, turnY],
      dir: [1, 0],
    });
    y += h2;
    if (count === 5) {
      bandY = y;
      y += band;
      const h3 = Math.max(cards[2].h, cards[3].h) + extra;
      place(cards[2], rightX, y, h3);
      place(cards[3], leftX, y, h3);
      y += h3;
    }
  }
  if (count !== 3) {
    const down = count === 4 ? [cards[1], cards[2]] : [cards[1], cards[2]];
    const up = count === 4 ? [cards[3], cards[0]] : [cards[3], cards[4]];
    const downX = rightX + half * 0.62;
    const upX = leftX + half * 0.38;
    curves += theme.curve({
      d: `M${downX} ${down[0].y + down[0].h + 22}V${down[1].y - 34}`,
      tip: [downX, down[1].y - 12],
      dir: [0, 1],
    });
    curves += theme.curve({
      d: `M${upX} ${up[0].y - 16}V${up[1].y + up[1].h + 46}`,
      tip: [upX, up[1].y + up[1].h + 24],
      dir: [0, -1],
    });
  }
  // The last turn along the bottom row, right to left.
  const bottomPair = count === 3 ? [cards[1], cards[2]] : [cards[2], cards[3]];
  const turn = bottomPair[0].y + bottomPair[0].h / 2;
  curves += theme.connector({
    from: [rightX - 14, turn],
    to: [leftX + half + 18, turn],
    width: theme.arrowWidth,
  });

  let svg = curves;
  svg += theme.centre({
    cx: box.x + box.w / 2,
    cy: bandY + band / 2 - 6,
    w: pillW,
    h: pillH,
    block: centre,
  });
  cards.forEach((card, i) => {
    const look = theme.tones.plain;
    svg += theme.card({ x: card.x, y: card.y, w: card.w, h: card.h, i });
    svg += theme.badge({
      cx: card.x + pad + 24,
      cy: card.y,
      r: 32,
      block: numbers[i],
      tone: theme.cycleBadge,
    });
    const textY = card.y + top;
    svg += card.label.draw(card.x + pad, textY, look.ink);
    if (card.text)
      svg += card.text.draw(
        card.x + pad,
        textY + card.label.height + t.lead,
        look.body,
      );
  });
  return { svg, bottom: y };
}

/* ---------- layers ---------- */

async function layers(t, data, box) {
  const { theme } = t;
  const count = data.items.length;
  const depth = 22;
  const gap = t.air(26) + depth;
  const inset = Math.min(30, (t.sizes.air < 0.7 ? 50 : 110) / (count - 1));
  const padX = 40;
  const numberW = 92;
  const extra = t.extra / count;

  const rows = [];
  for (const [i, item] of data.items.entries()) {
    const shift = (count - 1 - i) * inset;
    const w = box.w - shift * 2;
    const textWidth = w - padX * 2 - numberW;
    const label = await t.block('label', item.label, textWidth);
    const text = item.text && (await t.block('text', item.text, textWidth));
    const content = label.height + (text ? t.lead + text.height : 0);
    rows.push({
      shift,
      w,
      label,
      text,
      content,
      h: content + Math.max(28, t.air(40)) * 2 + extra,
    });
  }
  const numbers = await Promise.all(
    rows.map((_, i) => t.block('number', String(i + 1), 200, { size: 84 })),
  );
  let y = box.y + depth;
  let svg = '';
  rows.forEach((row, i) => {
    const x = box.x + row.shift;
    const tone = theme.slabTone(i, count);
    svg += theme.slab({ x, y, w: row.w, h: row.h, index: i, count, depth });
    svg += numbers[i].draw(
      x + padX - 4,
      y + (row.h - numbers[i].capHeight) / 2,
      tone.number,
    );
    const textX = x + padX + numberW;
    const textY = y + (row.h - row.content) / 2;
    svg += row.label.draw(textX, textY, tone.ink);
    if (row.text)
      svg += row.text.draw(textX, textY + row.label.height + t.lead, tone.body);
    y += row.h + gap;
  });
  return { svg, bottom: y - gap };
}

/* ---------- bars ---------- */

async function bars(t, data, box) {
  const { theme } = t;
  const pad = 44;
  const inner = box.w - pad * 2;
  const top = maxOf(data.items.map((item) => item.value));
  const barH = t.air(data.items.length <= 3 ? 76 : 60);
  const rows = [];
  for (const item of data.items) {
    const display = await t.block(
      'number',
      item.display ?? String(item.value),
      inner * 0.55,
      {
        size: t.sizes.label + 10,
      },
    );
    const label = await t.block(
      'label',
      item.label,
      inner - display.width - 44,
      {
        size: t.sizes.label - 2,
      },
    );
    rows.push({
      item,
      display,
      label,
      head: Math.max(display.height, label.height),
    });
  }
  const extra = t.extra / rows.length;
  const gap = t.air(60) + extra;
  const h =
    t.air(52) * 2 +
    sum(rows.map((row) => row.head + 24 + barH)) +
    gap * (rows.length - 1) +
    10 +
    (rows.length === 0 ? 0 : extra);

  let svg = theme.card({ x: box.x, y: box.y, w: box.w, h, tone: 'plain' });
  let y = box.y + t.air(52) + extra / 2;
  const x = box.x + pad;
  const best = data.items.findIndex((item) => item.value === top);
  rows.forEach((row, i) => {
    svg += row.label.draw(
      x,
      y + row.head - row.label.height,
      theme.tones.plain.ink,
    );
    svg += row.display.draw(
      x,
      y + row.head - row.display.height,
      i === best ? theme.tones.plain.accent : theme.tones.plain.ink,
      { align: 'right', boxWidth: inner },
    );
    y += row.head + 24;
    svg += theme.bar({
      x,
      y,
      w: (row.item.value / top) * inner,
      h: barH,
      full: inner,
      best: i === best,
      i,
    });
    y += barH + gap;
  });
  return { svg, bottom: box.y + h };
}

/* ---------- cards ---------- */

async function cards(t, data, box) {
  const { theme } = t;
  const gap = t.air(34);
  const half = (box.w - gap) / 2;
  const count = data.items.length;
  const longest = maxOf(data.items.map((item) => item.text?.length ?? 0));
  const list = longest > 84 && count !== 3;
  const pad = Math.max(30, t.air(38));
  const chip = t.sizes.air < 0.8 ? 92 : 108;

  const build = async (item, w, sideways) => {
    const textWidth = sideways ? w - pad * 2 - chip - 34 : w - 34 * 2;
    const label = await t.block('label', item.label, textWidth);
    const text = item.text && (await t.block('text', item.text, textWidth));
    const content = label.height + (text ? t.lead + text.height : 0);
    return {
      item,
      w,
      sideways,
      textWidth,
      label,
      text,
      content,
      h: sideways
        ? Math.max(chip, content) + pad * 2
        : pad + chip + t.air(36) + content + t.air(42),
    };
  };

  const rows = [];
  if (list) {
    for (const item of data.items) rows.push([await build(item, box.w, true)]);
  } else {
    let at = 0;
    if (count % 2 === 1)
      rows.push([await build(data.items[at++], box.w, true)]);
    for (; at < count; at += 2)
      rows.push([
        await build(data.items[at], half, false),
        await build(data.items[at + 1], half, false),
      ]);
  }
  const extra = t.extra / rows.length;
  let svg = '';
  let y = box.y;
  let i = 0;
  for (const row of rows) {
    const h = maxOf(row.map((card) => card.h)) + extra;
    row.forEach((card, column) => {
      const x = box.x + column * (half + gap);
      const featured = !list && count % 2 === 1 && i === 0;
      const tone = featured ? 'accent' : 'plain';
      const look = theme.tones[tone];
      svg += theme.card({ x, y, w: card.w, h, tone, i });
      // Corner ornament, unless the text needs the space.
      if (
        !card.sideways ||
        maxOf([card.label.width, card.text?.width ?? 0]) + 130 < card.textWidth
      )
        svg += theme.cardDeco({ x, y, w: card.w, h, tone, i });
      const chipTone = featured ? 'white' : theme.softChipTones[i];
      if (card.sideways) {
        svg += theme.chip({
          x: x + pad,
          y: y + (h - chip) / 2,
          s: chip,
          name: card.item.icon ?? 'check',
          tone: chipTone,
          i,
        });
        const textX = x + pad + chip + 34;
        const textY = y + (h - card.content) / 2;
        svg += card.label.draw(textX, textY, look.ink);
        if (card.text)
          svg += card.text.draw(
            textX,
            textY + card.label.height + t.lead,
            look.body,
          );
      } else {
        svg += theme.chip({
          x: x + 34,
          y: y + pad,
          s: chip,
          name: card.item.icon ?? 'check',
          tone: chipTone,
          i,
        });
        const textY = y + pad + chip + t.air(36) + extra / 2;
        svg += card.label.draw(x + 34, textY, look.ink);
        if (card.text)
          svg += card.text.draw(
            x + 34,
            textY + card.label.height + t.lead,
            look.body,
          );
      }
      i++;
    });
    y += h + gap;
  }
  return { svg, bottom: y - gap };
}

/* ---------- analogy ---------- */

async function analogy(t, data, box) {
  const { theme } = t;
  const gap = 92;
  const w = (box.w - gap) / 2;
  const pad = 30;
  const chip = 112;
  const sides = [];
  for (const side of [data.left, data.right])
    sides.push(
      await t.block('label', side.heading, w - pad * 2, {
        size: t.sizes.label + 2,
      }),
    );
  const headH =
    t.air(38) +
    chip +
    t.air(36) +
    maxOf(sides.map((b) => b.height)) +
    t.air(44);

  const extra = t.extra / data.pairs.length;
  const rows = [];
  for (const pair of data.pairs) {
    const left = await t.block('text', pair.left, w - pad * 2);
    const right = await t.block('strong', pair.right, w - pad * 2);
    rows.push({
      left,
      right,
      h:
        Math.max(left.height, right.height) +
        Math.max(28, t.air(40)) * 2 +
        extra,
    });
  }
  const leftX = box.x;
  const rightX = box.x + w + gap;
  const cx = box.x + box.w / 2;
  let svg = '';
  let top = '';
  [
    [leftX, data.left, 'soft', 'solid'],
    [rightX, data.right, 'accent', 'white'],
  ].forEach(([x, side, tone, chipTone], i) => {
    svg += theme.card({ x, y: box.y, w, h: headH, tone, i });
    top += theme.chip({
      x: x + (w - chip) / 2,
      y: box.y + t.air(38),
      s: chip,
      name: side.icon,
      tone: chipTone,
      i,
    });
    top += sides[i].draw(
      x + pad,
      box.y + t.air(38) + chip + t.air(36),
      theme.tones[tone].ink,
      { align: 'center', boxWidth: w - pad * 2 },
    );
  });
  svg += theme.pairLink({
    cx,
    cy: box.y + headH / 2,
    from: leftX + w,
    to: rightX,
    big: true,
  });
  let y = box.y + headH + t.air(44);
  const gapY = t.air(28);
  rows.forEach((row, i) => {
    const cy = y + row.h / 2;
    svg += theme.card({ x: leftX, y, w, h: row.h, tone: 'plain', i: 0, r: 22 });
    svg += theme.card({
      x: rightX,
      y,
      w,
      h: row.h,
      tone: 'plain',
      i: 1,
      r: 22,
    });
    svg += theme.pairLink({ cx, cy, from: leftX + w, to: rightX, i });
    top += row.left.draw(
      leftX + pad,
      y + (row.h - row.left.height) / 2,
      theme.tones.plain.body,
      { align: 'center', boxWidth: w - pad * 2 },
    );
    top += row.right.draw(
      rightX + pad,
      y + (row.h - row.right.height) / 2,
      theme.tones.plain.ink,
      { align: 'center', boxWidth: w - pad * 2 },
    );
    y += row.h + gapY;
  });
  return { svg: svg + top, bottom: y - gapY };
}

const LAYOUTS = { steps, compare, cycle, layers, bars, cards, analogy };

const EYEBROWS = {
  steps: (data) => [`${data.items.length} steps`, 'list'],
  compare: () => ['Side by side', 'scale'],
  cycle: () => ['The loop', 'refresh'],
  layers: (data) => [`${data.items.length} layers`, 'layers'],
  bars: () => ['In numbers', 'chart'],
  cards: () => ['At a glance', 'eye'],
  analogy: () => ['Think of it like this', 'lightbulb'],
};

async function footer(t, w, y) {
  const { theme } = t;
  const style = { size: 32 };
  const name = await t.block('label', 'dataceam', 400, style);
  const dot = await t.block('label', '.', 400, style);
  const com = await t.block('label', 'com', 400, style);
  const whole = await t.block('label', 'dataceam.com', 400, style);
  const x = theme.margin;
  const comX = x + whole.width - com.width;
  return (
    name.draw(x, y, theme.footerInk) +
    dot.draw(comX - dot.width, y, theme.footerDot) +
    com.draw(comX, y, theme.footerInk) +
    theme.footerMotif({
      right: w - theme.margin,
      y: y + name.capHeight / 2,
    })
  );
}

async function compose(theme, data, sizes, figure, extra) {
  const t = typesetter(theme, sizes);
  t.extra = extra;
  const w = BODY_WIDTH;
  const m = theme.margin;
  const box = { x: m, w: w - m * 2 };

  // Header.
  const [kickerText, kickerIcon] = EYEBROWS[data.layout](data);
  const kicker = await t.block('kicker', kickerText, 600, { size: 31 });
  const fig = await t.block('kicker', `Fig. ${figure}`, 300, { size: 31 });
  let y = m + 4;
  const eyebrow = theme.eyebrow({
    x: box.x,
    y,
    h: 62,
    block: kicker,
    figure: fig,
    icon: kickerIcon,
  });
  let front = eyebrow.svg;
  y += 62 + Math.max(32, t.air(44));
  const setTitle = (size) =>
    t.block('title', data.title, box.w, {
      size,
      highlight: highlightRange(data.title, data.highlight) ?? 'last-line',
    });
  let title = await setTitle(sizes.title);
  // A slightly smaller title may end a line where a sentence ends, or, in a
  // full picture, save a whole line.
  const sentences = /[.!?:] /.test(data.title);
  for (let size = sizes.title - 2; size >= 56; size -= 2) {
    if (title.lineCount === 1 || title.endsAtPause) break;
    const smaller = await setTitle(size);
    if (
      (sizes.air < 0.95 && smaller.lineCount < title.lineCount) ||
      (sentences &&
        size >= 60 &&
        smaller.endsAtPause &&
        smaller.lineCount === title.lineCount)
    )
      title = smaller;
  }
  let back = theme.titleMarks(title.marks(box.x, y), data.title);
  front += title.draw(box.x, y, theme.titleInk, {
    mark: data.highlight && theme.titleMark,
  });
  y += title.height;
  const accent = theme.titleAccent({
    x: box.x,
    y,
    w: Math.min(title.width, box.w),
  });
  front += accent.svg;
  y += accent.height + t.air(54) + (accent.height ? 0 : 20);

  // Body.
  const body = await LAYOUTS[data.layout](t, data, { ...box, y });
  front += body.svg;
  y = body.bottom;

  // Note, verdict, source.
  const message = data.verdict ?? data.note;
  if (message) {
    const block = await t.block('strong', message, box.w - 144 - 40);
    const h = Math.max(84, block.height) + t.air(34) * 2;
    y += t.air(48);
    front += theme.note({
      x: box.x,
      y,
      w: box.w,
      h,
      block,
      name: data.verdict ? 'check' : 'lightbulb',
    });
    y += h;
  }
  if (data.source) {
    const source = await t.block('text', `Source: ${data.source}`, box.w, {
      size: 31,
    });
    y += 44;
    front += source.draw(box.x, y, theme.muted);
    y += source.height;
  }

  y += Math.max(48, t.air(62));
  front += await footer(t, w, y);
  const height = Math.ceil(y + 23 + Math.max(48, m - 8));
  back = theme.background(w, height) + back;
  return { width: w, height, svg: back + front, overflow: t.overflow };
}

/** Draws one body picture. Larger type wins as long as the height stays comfortable. */
export async function drawBody(theme, data, figure) {
  let fallback;
  let last;
  for (const sizes of SIZES) {
    const result = await compose(theme, data, sizes, figure, 0);
    last = result;
    if (result.overflow.length || result.height > MAX_HEIGHT) continue;
    if (result.height > COMFORTABLE_HEIGHT) {
      fallback = result;
      continue;
    }
    if (result.height >= MIN_HEIGHT) return result;
    return compose(theme, data, sizes, figure, MIN_HEIGHT - result.height);
  }
  if (fallback) return fallback;
  if (last.overflow.length)
    throw new Error(
      `"${last.overflow[0]}" is too long for its box in the ${data.layout} layout. Use a shorter word.`,
    );
  throw new Error(
    `Too much text: the picture would be ${last.height}px high, ${last.height - MAX_HEIGHT}px over the limit. Shorten the texts or use fewer items.`,
  );
}

/* ---------- cover and social card ---------- */

const COVER_SIZES = [
  [116, 36],
  [106, 36],
  [96, 35],
  [90, 34],
  [84, 34],
  [78, 33],
  [72, 32],
  [66, 31],
  [60, 31],
  [56, 31],
  [54, 31],
];

/** The 1200 px wide title card; `social` is the Open Graph version. */
export async function drawCover(theme, data, { width, height, social }) {
  const left = 76;
  const textWidth = theme.cover.textWidth;
  let problem;
  for (const [titleSize, textSize] of COVER_SIZES) {
    const t = typesetter(theme, {
      title: titleSize,
      label: 40,
      text: textSize,
    });
    const title = await t.block('title', data.title, textWidth, {
      highlight: highlightRange(data.title, data.highlight) ?? 'last-line',
    });
    const subtitle =
      !social && data.subtitle
        ? await t.block('text', data.subtitle, textWidth - 8)
        : null;
    const kicker = await t.block('kicker', data.kicker, 520, { size: 32 });
    const kickerH = 64;
    const top = 64;
    const footY = height - 90;
    const gap = subtitle ? Math.round(titleSize * 0.2 + 34) : 0;
    const contentH = title.height + gap + (subtitle?.height ?? 0);
    const room =
      footY - (social ? 60 : 40) - (top + kickerH + (social ? 46 : 36));
    if (t.overflow.length) {
      problem = `"${t.overflow[0]}" is too long for the cover.`;
      continue;
    }
    if (contentH > room) {
      problem = 'The cover title and subtitle are too long to fit.';
      continue;
    }
    let y = top + kickerH + (social ? 46 : 36) + (room - contentH) / 2;
    const tagWidth = 26 * 2 + kicker.width;
    const back = theme.titleMarks(title.marks(left, y), data.title);
    let front = coverTag(theme, left, top, tagWidth, kickerH, kicker);
    front += title.draw(left, y, theme.titleInk, { mark: theme.titleMark });
    y += title.height + gap;
    if (subtitle) front += subtitle.draw(left, y, theme.coverBody);
    const name = await t.block('label', 'dataceam', 400, { size: 36 });
    const dot = await t.block('label', '.', 400, { size: 36 });
    const com = await t.block('label', 'com', 400, { size: 36 });
    const whole = await t.block('label', 'dataceam.com', 400, { size: 36 });
    const comX = left + whole.width - com.width;
    front +=
      name.draw(left, footY, theme.footerInk) +
      dot.draw(comX - dot.width, footY, theme.footerDot) +
      com.draw(comX, footY, theme.footerInk);
    return {
      width,
      height,
      svg:
        theme.cover.background(width, height) +
        back +
        front +
        theme.cover.art({ w: width, h: height, icons: data.icons }),
    };
  }
  throw new Error(problem);
}

function coverTag(theme, x, y, w, h, block) {
  const tag = theme.cover.tag({ x, y, w, h });
  const svg =
    tag.svg + block.draw(x + 26, y + (h - block.capHeight) / 2, tag.ink);
  return tag.angle ? rotate(svg, tag.angle, x + w / 2, y + h / 2) : svg;
}
