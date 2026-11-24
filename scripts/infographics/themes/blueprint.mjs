// Blueprint: navy drawing sheet, grid, light-blue linework, dashed arrows.
import { icon } from '../icons.mjs';
import {
  arrowHead,
  circle,
  contrast,
  direction,
  group,
  line,
  n,
  path,
  points,
  rect,
  stroke,
} from '../svg.mjs';

const c = {
  page: '#0b1a3a',
  minor: '#0f2148',
  major: '#152b5a',
  frame: '#3c5f9f',
  line: '#93c5fd',
  mid: '#5f93dc',
  panel: '#0f2450',
  soft: '#17346b',
  white: '#ffffff',
  body: '#d6e4fb',
  navy: '#0b1a3a',
};

const tones = {
  plain: {
    fill: c.panel,
    ink: c.white,
    body: c.body,
    accent: c.line,
    rule: '#33558f',
  },
  soft: {
    fill: c.soft,
    ink: c.white,
    body: '#e2ecfd',
    accent: c.line,
    rule: '#3f66a8',
  },
  accent: {
    fill: c.line,
    ink: c.navy,
    body: c.navy,
    accent: c.navy,
    rule: '#5f93dc',
  },
  deep: {
    fill: c.line,
    ink: c.navy,
    body: c.navy,
    accent: c.navy,
    rule: '#5f93dc',
  },
};

const ramp = ['#0f2450', '#16336a', '#1e4488', '#2856a6', '#5f9bec', '#93c5fd'];
const rampFor = {
  3: [0, 2, 5],
  4: [0, 1, 3, 5],
  5: [0, 1, 2, 3, 5],
  6: [0, 1, 2, 3, 4, 5],
};

function grid(w, h) {
  let minor = '';
  let major = '';
  for (let x = 0; x <= w; x += 36) {
    const d = `M${x} 0V${n(h)}`;
    if (x % 180 === 0) major += d;
    else minor += d;
  }
  for (let y = 0; y <= h; y += 36) {
    const d = `M0 ${y}H${n(w)}`;
    if (y % 180 === 0) major += d;
    else minor += d;
  }
  return (
    rect(0, 0, w, h, 0, { fill: c.page }) +
    path(minor, { stroke: c.minor, 'stroke-width': 2 }) +
    path(major, { stroke: c.major, 'stroke-width': 2 })
  );
}

const plus = (x, y, size, color = c.line, width = 3) =>
  path(
    `M${n(x - size)} ${n(y)}H${n(x + size)}M${n(x)} ${n(y - size)}V${n(y + size)}`,
    { stroke: color, 'stroke-width': width },
  );

function frame(w, h) {
  const m = 26;
  return (
    rect(m, m, w - m * 2, h - m * 2, 0, stroke(c.frame, 2)) +
    [
      [m, m],
      [w - m, m],
      [w - m, h - m],
      [m, h - m],
    ]
      .map(([x, y]) => plus(x, y, 16))
      .join('')
  );
}

function brackets(x, y, w, h, size, color, width = 4) {
  return path(
    [
      `M${n(x)} ${n(y + size)}V${n(y)}H${n(x + size)}`,
      `M${n(x + w - size)} ${n(y)}H${n(x + w)}V${n(y + size)}`,
      `M${n(x + w)} ${n(y + h - size)}V${n(y + h)}H${n(x + w - size)}`,
      `M${n(x + size)} ${n(y + h)}H${n(x)}V${n(y + h - size)}`,
    ].join(''),
    { fill: 'none', stroke: color, 'stroke-width': width },
  );
}

export const blueprint = {
  name: 'blueprint',
  colors: c,
  tones,
  margin: 68,
  radius: 4,
  titleInk: c.white,
  titleMark: c.line,
  kickerInk: c.line,
  footerInk: c.white,
  footerDot: c.line,
  muted: '#b9cdf0',
  steps: 'rail',
  coverBody: c.body,
  cycleBadge: 'deep',
  arrowWidth: 4,
  contrastPairs: [
    ['title', c.white, c.page],
    ['title mark', c.line, c.page],
    ['source', '#b9cdf0', c.page],
    ['kicker cell', c.navy, c.line],
    ['ramp dark', c.white, ramp[3]],
    ['ramp light', c.navy, ramp[4]],
    ['chip', c.line, c.panel],
    ['badge', c.navy, c.line],
  ],

  background(w, h) {
    return grid(w, h) + frame(w, h);
  },

  eyebrow({ x, y, h, block, figure }) {
    const cell = figure.width + 44;
    const w = cell + block.width + 52;
    return {
      width: w,
      svg:
        rect(x, y, w, h, 0, {
          fill: c.page,
          stroke: c.line,
          'stroke-width': 3,
        }) +
        rect(x, y, cell, h, 0, { fill: c.line }) +
        figure.draw(x + 22, y + (h - figure.capHeight) / 2, c.navy) +
        block.draw(x + cell + 26, y + (h - block.capHeight) / 2, c.line),
    };
  },

  titleAccent({ x, y, w }) {
    const cy = y + 42;
    return {
      height: 54,
      svg:
        path(
          `M${n(x)} ${n(cy - 13)}V${n(cy + 13)}M${n(x + w)} ${n(cy - 13)}V${n(cy + 13)}`,
          stroke(c.line, 3),
        ) +
        path(
          `M${n(x + 4)} ${n(cy)}H${n(x + w - 4)}`,
          stroke(c.line, 2.5, { 'stroke-linecap': 'butt' }),
        ) +
        path(
          `M${n(x + 4)} ${n(cy)}l18 -7v14ZM${n(x + w - 4)} ${n(cy)}l-18 -7v14Z`,
          { fill: c.line },
        ),
    };
  },
  titleMarks: () => '',

  card({ x, y, w, h, tone = 'plain', r = 4 }) {
    const t = tones[tone];
    const filled = t.fill === c.line;
    return (
      rect(x, y, w, h, Math.min(r, 4), {
        fill: t.fill,
        stroke: filled ? c.line : c.mid,
        'stroke-width': 2.5,
      }) +
      (filled
        ? rect(x + 9, y + 9, w - 18, h - 18, 2, stroke('#3f74bf', 2))
        : brackets(x - 1, y - 1, w + 2, h + 2, 24, c.line, 6))
    );
  },

  panelHead({ x, y, w, h, tone }) {
    const t = tones[tone];
    return rect(x + 1, y + 1, w - 2, h, 0, { fill: t.fill });
  },

  chip({ x, y, s, name, tone = 'solid' }) {
    const styles = {
      solid: [c.page, c.line, c.line],
      deep: [c.line, c.navy, c.line],
      soft: [c.page, c.line, c.line],
      white: [c.navy, c.line, c.navy],
      ghost: [c.line, c.navy, c.navy],
    };
    const [fill, ink, edge] = styles[tone];
    const size = s * 0.5;
    const r = s / 2 - 5;
    const cx = x + s / 2;
    const cy = y + s / 2;
    return (
      circle(cx, cy, r, { fill, stroke: edge, 'stroke-width': 3 }) +
      path(
        `M${n(cx)} ${n(cy - r - 6)}v12M${n(cx)} ${n(cy + r - 6)}v12M${n(cx - r - 6)} ${n(cy)}h12M${n(cx + r - 6)} ${n(cy)}h12`,
        { stroke: edge, 'stroke-width': 3 },
      ) +
      icon(name, cx - size / 2, cy - size / 2, size, ink, 1.8)
    );
  },
  chipTones: ['solid', 'solid', 'solid', 'solid', 'solid', 'solid'],
  softChipTones: ['solid', 'solid', 'solid', 'solid', 'solid', 'solid'],

  badge({ cx, cy, r, block, tone = 'deep' }) {
    const filled = tone !== 'white';
    return (
      circle(cx, cy, r + 7, {
        fill: c.page,
        stroke: c.line,
        'stroke-width': 2.5,
      }) +
      circle(cx, cy, r, { fill: filled ? c.line : c.panel }) +
      block.draw(
        cx - block.width / 2,
        cy - block.capHeight / 2,
        filled ? c.navy : c.white,
      )
    );
  },

  connector({ from, to, width = 4 }) {
    const dir = direction(from, to);
    const head = arrowHead(to, dir, 20);
    return (
      line(...from, ...head.back, {
        fill: 'none',
        stroke: c.line,
        'stroke-width': width,
        'stroke-dasharray': '11 9',
      }) + path(`M${points([head.left, to, head.right])}Z`, { fill: c.line })
    );
  },
  curve({ d, tip, dir, width = 4 }) {
    const head = arrowHead(tip, dir, 24);
    return (
      path(d, {
        fill: 'none',
        stroke: c.line,
        'stroke-width': width,
        'stroke-dasharray': '13 10',
      }) + path(`M${points([head.left, tip, head.right])}Z`, { fill: c.line })
    );
  },

  bullet({ x, y, s, side }) {
    return (
      rect(x + 2, y + 2, s - 4, s - 4, 2, {
        fill: side === 0 ? 'none' : c.line,
        stroke: c.line,
        'stroke-width': 3,
      }) +
      path(
        `M${n(x + s * 0.42)} ${n(y + s * 0.3)}l${n(s * 0.2)} ${n(s * 0.2)}l${n(-s * 0.2)} ${n(s * 0.2)}`,
        stroke(side === 0 ? c.line : c.navy, s * 0.11),
      )
    );
  },

  rule: (x1, y1, x2, y2) =>
    line(x1, y1, x2, y2, {
      fill: 'none',
      stroke: '#3f66a8',
      'stroke-width': 2.5,
      'stroke-dasharray': '8 8',
    }),

  versus({ cx, cy, block }) {
    return (
      circle(cx, cy, 48, { fill: c.page, stroke: c.line, 'stroke-width': 3 }) +
      circle(cx, cy, 39, {
        fill: c.page,
        stroke: c.line,
        'stroke-width': 2,
        'stroke-dasharray': '6 6',
      }) +
      block.draw(cx - block.width / 2, cy - block.capHeight / 2, c.white)
    );
  },

  cardDeco({ x, y, w, tone }) {
    const color = tone === 'plain' ? '#4a74b8' : '#3f74bf';
    let d = '';
    for (let i = 0; i < 5; i++)
      d += `M${n(x + w - 30 - i * 16)} ${n(y + 24)}L${n(x + w - 24)} ${n(y + 30 + i * 16)}`;
    return path(d, { fill: 'none', stroke: color, 'stroke-width': 2.5 });
  },

  bar({ x, y, w, h, full, best }) {
    const width = w > 0 ? Math.max(w, 12) : 0;
    let hatch = '';
    for (let offset = -h; offset < width; offset += 18) {
      const x1 = Math.max(offset, 0);
      const x2 = Math.min(offset + h, width);
      if (x2 <= x1) continue;
      hatch += `M${n(x + x1)} ${n(y + h - (x1 - offset))}L${n(x + x2)} ${n(y + h - (x2 - offset))}`;
    }
    let ticks = '';
    for (let i = 1; i < 10; i++)
      ticks += `M${n(x + (full * i) / 10)} ${n(y + h)}v${i === 5 ? 16 : 10}`;
    return (
      rect(x, y, full, h, 0, {
        fill: c.panel,
        stroke: '#33558f',
        'stroke-width': 2,
      }) +
      path(ticks, { stroke: '#4a74b8', 'stroke-width': 2 }) +
      rect(x, y, width, h, 0, {
        fill: best ? c.line : c.soft,
        stroke: c.line,
        'stroke-width': 3,
      }) +
      (best ? '' : path(hatch, { stroke: c.mid, 'stroke-width': 2.5 }))
    );
  },

  slabTone(index, count) {
    const fill = ramp[rampFor[count][index]];
    const dark = contrast(c.white, fill) > 4.5;
    return {
      fill,
      ink: dark ? c.white : c.navy,
      body: dark ? c.body : c.navy,
      number: !dark ? c.navy : contrast(c.line, fill) > 4.5 ? c.line : c.white,
    };
  },
  slab({ x, y, w, h, index, count, depth }) {
    const { fill } = this.slabTone(index, count);
    return (
      path(
        `M${n(x + depth * 2)} ${n(y - depth)}H${n(x + w - depth * 2)}L${n(x + w)} ${n(y)}H${n(x)}Z`,
        {
          fill: c.page,
          stroke: c.line,
          'stroke-width': 2.5,
          'stroke-linejoin': 'round',
        },
      ) +
      path(
        [0.2, 0.4, 0.6, 0.8]
          .map(
            (t) =>
              `M${n(x + depth * 2 + (w - depth * 4) * t)} ${n(y - depth)}L${n(x + w * t)} ${n(y)}`,
          )
          .join(''),
        { stroke: '#3f66a8', 'stroke-width': 2 },
      ) +
      rect(x, y, w, h, 0, { fill, stroke: c.line, 'stroke-width': 3 })
    );
  },

  note({ x, y, w, h, block, name, tone = 'plain' }) {
    const t = tones[tone === 'deep' ? 'plain' : tone];
    return (
      rect(x, y, w, h, 0, {
        fill: t.fill,
        stroke: c.line,
        'stroke-width': 3,
        'stroke-dasharray': '14 9',
      }) +
      this.chip({ x: x + 26, y: y + (h - 92) / 2, s: 92, name, tone: 'deep' }) +
      block.draw(x + 146, y + (h - block.height) / 2, t.ink)
    );
  },

  footerMotif({ right, y }) {
    let ticks = '';
    for (let i = 0; i <= 8; i++)
      ticks += `M${right - 160 + i * 20} ${n(y - (i % 4 === 0 ? 12 : 6))}V${n(y + 8)}`;
    return path(ticks + `M${right - 160} ${n(y + 8)}H${right}`, {
      fill: 'none',
      stroke: c.line,
      'stroke-width': 2.5,
    });
  },

  pairLink({ cx, cy, from, to }) {
    return (
      path(`M${n(from)} ${n(cy)}H${n(to)}`, {
        fill: 'none',
        stroke: c.line,
        'stroke-width': 4,
        'stroke-dasharray': '9 7',
      }) +
      circle(cx, cy, 29, { fill: c.page, stroke: c.line, 'stroke-width': 3 }) +
      path(
        [-8, 8]
          .map((dy) => `M${n(cx - 14)} ${n(cy + dy + 2)}q7 -8 14 -2t14 -2`)
          .join(''),
        stroke(c.line, 4),
      )
    );
  },

  centre({ cx, cy, w, h, block }) {
    return (
      rect(cx - w / 2, cy - h / 2, w, h, h / 2, { fill: c.line }) +
      rect(
        cx - w / 2 - 10,
        cy - h / 2 - 10,
        w + 20,
        h + 20,
        h / 2 + 10,
        stroke(c.line, 2.5, { 'stroke-dasharray': '10 8' }),
      ) +
      block.draw(cx - block.width / 2, cy - block.height / 2, c.navy, {
        align: 'center',
      })
    );
  },

  cover: {
    textWidth: 600,
    tag: ({ x, y, w, h }) => ({
      ink: c.navy,
      svg: rect(x, y, w, h, 0, { fill: c.line }),
    }),
    background(w, h) {
      const cx = w - 266;
      const cy = h * 0.5;
      let ticks = '';
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const inner = i % 6 === 0 ? 218 : 226;
        ticks += `M${n(cx + Math.cos(a) * inner)} ${n(cy + Math.sin(a) * inner)}L${n(cx + Math.cos(a) * 236)} ${n(cy + Math.sin(a) * 236)}`;
      }
      return (
        grid(w, h) +
        frame(w, h) +
        group(
          circle(cx, cy, 236, stroke(c.mid, 2.5)) +
            path(ticks, { stroke: c.mid, 'stroke-width': 2.5 }) +
            circle(
              cx,
              cy,
              190,
              stroke(c.mid, 2.5, {
                'stroke-dasharray': '10 9',
                'stroke-linecap': 'butt',
              }),
            ) +
            path(
              `M${n(cx - 270)} ${n(cy)}H${n(w - 26)}M${n(cx)} 26V${n(h - 26)}`,
              {
                stroke: '#2f5494',
                'stroke-width': 2,
                'stroke-dasharray': '26 8 6 8',
              },
            ),
        )
      );
    },
    art({ w, h, icons }) {
      const cx = w - 266;
      const cy = h * 0.5;
      const main = 214;
      const node = (x, y, name) =>
        circle(x, y, 66, { fill: c.page, stroke: c.line, 'stroke-width': 4 }) +
        circle(x, y, 55, stroke(c.mid, 2, { 'stroke-dasharray': '6 6' })) +
        icon(name, x - 33, y - 33, 66, c.white, 1.9);
      const spots = [
        [cx + 134, cy - 134],
        [cx - 134, cy + 134],
      ];
      let out = '';
      icons.slice(1, 3).forEach((_, index) => {
        const [x, y] = spots[index];
        out += line(cx, cy, x, y, {
          stroke: c.line,
          'stroke-width': 4,
          'stroke-dasharray': '11 9',
        });
      });
      out +=
        rect(cx - main / 2, cy - main / 2, main, main, 4, { fill: c.line }) +
        rect(
          cx - main / 2 + 10,
          cy - main / 2 + 10,
          main - 20,
          main - 20,
          2,
          stroke('#3f74bf', 2.5),
        ) +
        brackets(
          cx - main / 2 - 16,
          cy - main / 2 - 16,
          main + 32,
          main + 32,
          34,
          c.white,
          4,
        ) +
        icon(icons[0], cx - 72, cy - 72, 144, c.navy, 1.7);
      icons.slice(1, 3).forEach((name, index) => {
        out += node(...spots[index], name);
      });
      return out;
    },
  },
};
