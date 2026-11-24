// Daylight: the site's own look. White cards, one blue, dotted corners.
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
  roundRect,
  stroke,
} from '../svg.mjs';

const c = {
  page: '#f6f8fc',
  ink: '#0b1222',
  body: '#3a4660',
  blue: '#2563eb',
  deep: '#1e3a8a',
  strong: '#1d4ed8',
  sky: '#93c5fd',
  pale: '#dbe6ff',
  soft: '#eef3ff',
  white: '#ffffff',
  rule: '#d5def0',
  lip: '#dfe7f7',
};

const tones = {
  plain: {
    fill: c.white,
    ink: c.ink,
    body: c.body,
    accent: c.blue,
    rule: c.rule,
  },
  soft: {
    fill: '#e6eeff',
    ink: c.ink,
    body: c.body,
    accent: c.strong,
    rule: '#c3d5fb',
  },
  accent: {
    fill: c.blue,
    ink: c.white,
    body: c.white,
    accent: c.white,
    rule: '#5b8bf3',
  },
  deep: {
    fill: c.deep,
    ink: c.white,
    body: '#dbe6ff',
    accent: c.sky,
    rule: '#4562ab',
  },
};

const ramp = ['#dbe6ff', '#bcd4fe', '#93c5fd', '#2563eb', '#1d4ed8', '#1e3a8a'];
const rampFor = {
  3: [1, 3, 5],
  4: [0, 2, 3, 5],
  5: [0, 1, 2, 3, 5],
  6: [0, 1, 2, 3, 4, 5],
};

function dots(x, y, columns, rows, keep, color = '#bcd0f7') {
  let out = '';
  for (let row = 0; row < rows; row++)
    for (let column = 0; column < columns; column++)
      if (keep(column, row)) out += circle(x + column * 26, y + row * 26, 4.5);
  return group(out, { fill: color });
}

export const daylight = {
  name: 'daylight',
  colors: c,
  tones,
  margin: 60,
  radius: 28,
  titleInk: c.ink,
  titleMark: c.blue,
  kickerInk: c.strong,
  footerInk: c.ink,
  footerDot: c.blue,
  muted: '#55617b',
  steps: 'chips',
  coverBody: c.body,
  cycleBadge: 'deep',
  arrowWidth: 10,
  contrastPairs: [
    ['title', c.ink, c.page],
    ['title mark', c.blue, c.page],
    ['kicker', c.strong, c.pale],
    ['source', '#55617b', c.page],
    ['ramp light', c.ink, ramp[2]],
    ['ramp dark', c.white, ramp[3]],
    ['badge', c.white, c.deep],
    ['chip', c.white, c.blue],
    ['chip soft', c.strong, '#e3ecff'],
  ],

  background(w, h) {
    return (
      rect(0, 0, w, h, 0, { fill: c.page }) +
      circle(w - 10, 0, 218, { fill: '#e7eefe' }) +
      circle(w - 10, 0, 132, { fill: '#d6e3fe' }) +
      dots(
        w - 320,
        46,
        7,
        4,
        (column, row) => column + row > 1 && column >= row,
      )
    );
  },

  eyebrow({ x, y, h, block, figure, icon: name }) {
    void figure;
    const w = 24 + 34 + 14 + block.width + 28;
    return {
      width: w,
      svg:
        rect(x, y, w, h, h / 2, { fill: c.pale }) +
        icon(name, x + 22, y + h / 2 - 17, 34, c.strong, 2.2) +
        block.draw(x + 72, y + (h - block.capHeight) / 2, c.strong),
    };
  },

  titleAccent({ x, y }) {
    return {
      height: 46,
      svg:
        rect(x, y + 34, 104, 12, 6, { fill: c.blue }) +
        circle(x + 130, y + 40, 6, { fill: c.sky }) +
        circle(x + 154, y + 40, 6, { fill: c.pale }),
    };
  },
  titleMarks: () => '',

  card({ x, y, w, h, tone = 'plain', r = 28 }) {
    const t = tones[tone];
    const shadow =
      rect(x + 4, y + 10, w - 8, h + 6, r, { fill: '#1e3a8a', opacity: 0.05 }) +
      rect(x, y + 5, w, h + 2, r, {
        fill: tone === 'plain' ? c.lip : '#1e3a8a',
        opacity: tone === 'plain' ? 1 : 0.16,
      });
    return (
      shadow +
      rect(x, y, w, h, r, {
        fill: t.fill,
        stroke: tone === 'plain' ? c.rule : undefined,
        'stroke-width': tone === 'plain' ? 2 : undefined,
      })
    );
  },

  /** The coloured head of a panel whose outline is already drawn. */
  panelHead({ x, y, w, h, tone, r = 28 }) {
    return path(roundRect(x, y, w, h, [r, r, 0, 0]), {
      fill: tones[tone].fill,
    });
  },

  chip({ x, y, s, name, tone = 'solid' }) {
    const styles = {
      solid: [c.blue, c.white],
      deep: [c.deep, c.white],
      soft: ['#e3ecff', c.strong],
      white: [c.white, c.blue],
      ghost: ['#4a7df0', c.white],
    };
    const [fill, ink] = styles[tone];
    const size = s * 0.54;
    return (
      rect(x, y, s, s, s * 0.28, { fill }) +
      icon(name, x + (s - size) / 2, y + (s - size) / 2, size, ink, 2)
    );
  },
  chipTones: ['solid', 'solid', 'solid', 'solid', 'solid', 'solid'],
  softChipTones: ['soft', 'soft', 'soft', 'soft', 'soft', 'soft'],

  badge({ cx, cy, r, block, tone = 'deep' }) {
    const fill = { deep: c.deep, blue: c.blue, white: c.white }[tone];
    const ink = tone === 'white' ? c.strong : c.white;
    return (
      circle(cx, cy, r + 5, { fill: c.white }) +
      circle(cx, cy, r, { fill }) +
      block.draw(cx - block.width / 2, cy - block.capHeight / 2, ink)
    );
  },

  connector({ from, to, width = 8, color = c.sky }) {
    const dir = direction(from, to);
    const head = arrowHead(to, dir, 22);
    const end = [to[0] - dir[0] * 14, to[1] - dir[1] * 14];
    return (
      line(...from, ...end, stroke(color, width)) +
      path(`M${points([head.left, to, head.right])}Z`, {
        fill: color,
        stroke: color,
        'stroke-width': 5,
        'stroke-linejoin': 'round',
      })
    );
  },
  curve({ d, tip, dir, width = 10 }) {
    const head = arrowHead(tip, dir, 28);
    return (
      path(d, stroke(c.sky, width)) +
      path(`M${points([head.left, tip, head.right])}Z`, {
        fill: c.sky,
        stroke: c.sky,
        'stroke-width': 6,
        'stroke-linejoin': 'round',
      })
    );
  },

  bullet({ x, y, s, side }) {
    return (
      circle(x + s / 2, y + s / 2, s / 2, {
        fill: side === 0 ? '#c9dafc' : c.blue,
      }) +
      path(
        `M${n(x + s * 0.42)} ${n(y + s * 0.3)}l${n(s * 0.2)} ${n(s * 0.2)}l${n(-s * 0.2)} ${n(s * 0.2)}`,
        stroke(side === 0 ? c.deep : c.white, s * 0.11),
      )
    );
  },

  rule: (x1, y1, x2, y2) => line(x1, y1, x2, y2, stroke(c.rule, 2)),

  versus({ cx, cy, block }) {
    return (
      circle(cx, cy, 50, { fill: c.page }) +
      circle(cx, cy, 42, { fill: c.ink }) +
      block.draw(cx - block.width / 2, cy - block.capHeight / 2, c.white)
    );
  },

  cardDeco({ x, y, w, tone }) {
    const size = 92;
    return path(
      `M${n(x + w - size)} ${n(y + 1)}H${n(x + w - 28)}A27 27 0 0 1 ${n(x + w - 1)} ${n(y + 28)}V${n(y + size)}A${size} ${size} 0 0 1 ${n(x + w - size)} ${n(y + 1)}Z`,
      { fill: tone === 'plain' ? c.soft : '#4a7df0' },
    );
  },

  bar({ x, y, w, h, full, best }) {
    const r = Math.min(h / 2, 22);
    const width = w > 0 ? Math.max(w, 10) : 0;
    return (
      rect(x, y, full, h, r, { fill: '#e6ecf8' }) +
      rect(x, y, width, h, Math.min(r, width / 2), {
        fill: best ? c.blue : c.sky,
      })
    );
  },

  slabTone(index, count) {
    const fill = ramp[rampFor[count][index]];
    const dark = contrast(c.white, fill) > 4.5;
    return {
      fill,
      ink: dark ? c.white : c.ink,
      body: dark ? c.white : '#1c2740',
      number: dark ? c.white : c.deep,
    };
  },
  slab({ x, y, w, h, index, count, depth }) {
    const { fill } = this.slabTone(index, count);
    const top = {
      '#dbe6ff': '#c6d6fa',
      '#bcd4fe': '#a5c2f6',
      '#93c5fd': '#78acf0',
      '#2563eb': '#5b8bf3',
      '#1d4ed8': '#4f78e3',
      '#1e3a8a': '#4562ab',
    }[fill];
    return (
      path(
        `M${n(x + depth * 2)} ${n(y - depth + 4)}H${n(x + w - depth * 2)}L${n(x + w - 5)} ${n(y + 14)}H${n(x + 5)}Z`,
        {
          fill: top,
          stroke: top,
          'stroke-width': 8,
          'stroke-linejoin': 'round',
        },
      ) +
      rect(x, y + 8, w, h, 22, { fill: '#1e3a8a', opacity: 0.1 }) +
      rect(x, y, w, h, 22, { fill })
    );
  },

  note({ x, y, w, h, block, name, tone = 'deep' }) {
    const t = tones[tone];
    return (
      this.card({ x, y, w, h, tone, r: 26 }) +
      this.chip({
        x: x + 30,
        y: y + (h - 84) / 2,
        s: 84,
        name,
        tone: 'white',
      }) +
      block.draw(x + 144, y + (h - block.height) / 2, t.ink)
    );
  },

  footerMotif({ right, y }) {
    return (
      circle(right - 12, y, 12, { fill: c.deep }) +
      circle(right - 46, y, 12, { fill: c.blue }) +
      circle(right - 80, y, 12, { fill: c.sky })
    );
  },

  pairLink({ cx, cy, from, to }) {
    return (
      line(from + 8, cy, to - 8, cy, stroke(c.sky, 8)) +
      circle(cx, cy, 36, { fill: c.page }) +
      circle(cx, cy, 30, { fill: c.deep }) +
      path(
        [-8, 8]
          .map((dy) => `M${n(cx - 14)} ${n(cy + dy + 2)}q7 -8 14 -2t14 -2`)
          .join(''),
        stroke(c.white, 4.5),
      )
    );
  },

  centre({ cx, cy, w, h, block }) {
    return (
      rect(cx - w / 2 - 12, cy - h / 2 - 12, w + 24, h + 24, (h + 24) / 2, {
        fill: c.page,
      }) +
      rect(cx - w / 2, cy - h / 2, w, h, h / 2, { fill: c.deep }) +
      block.draw(cx - block.width / 2, cy - block.height / 2, c.white, {
        align: 'center',
      })
    );
  },

  cover: {
    textWidth: 610,
    tag: ({ x, y, w, h }) => ({
      ink: c.strong,
      svg: rect(x, y, w, h, h / 2, { fill: c.pale }),
    }),
    background(w, h) {
      return (
        rect(0, 0, w, h, 0, { fill: c.page }) +
        circle(w - 170, h * 0.5, 400, { fill: '#e9f0ff' }) +
        circle(w - 170, h * 0.5, 300, { fill: c.blue }) +
        circle(
          w - 170,
          h * 0.5,
          230,
          stroke('#4f83f3', 3, { 'stroke-dasharray': '2 14' }),
        ) +
        dots(w - 500, 44, 5, 4, (column, row) => column + row < 6)
      );
    },
    art({ w, h, icons }) {
      const cx = w - 250;
      const cy = h * 0.5;
      const main = 236;
      let out = '';
      const spots = [
        [cx + 66, cy - 226, 132, c.white, c.strong],
        [cx + 48, cy + 92, 132, c.deep, c.white],
      ];
      icons.slice(1, 3).forEach((name, index) => {
        const [x, y, s, fill, ink] = spots[index];
        out +=
          rect(x + 3, y + 10, s - 6, s, 36, {
            fill: '#0b1222',
            opacity: 0.16,
          }) +
          rect(x, y, s, s, 36, { fill }) +
          icon(name, x + s * 0.22, y + s * 0.22, s * 0.56, ink, 2);
      });
      out =
        rect(cx - main / 2 - 46, cy - main / 2 + 14, main + 4, main, 58, {
          fill: '#0b1222',
          opacity: 0.18,
        }) +
        rect(cx - main / 2 - 50, cy - main / 2 - 6, main, main, 58, {
          fill: c.white,
        }) +
        icon(
          icons[0],
          cx - main / 2 - 50 + main * 0.17,
          cy - main / 2 - 6 + main * 0.17,
          main * 0.66,
          c.blue,
          1.7,
        ) +
        out;
      return out;
    },
  },
};
