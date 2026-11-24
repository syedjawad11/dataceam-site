// Paper: warm notebook page, thick ink lines, marker swipes, sticker shadows.
import { icon } from '../icons.mjs';
import {
  arrowHead,
  circle,
  direction,
  line,
  n,
  path,
  points,
  random,
  rect,
  rotate,
  roundRect,
  stroke,
} from '../svg.mjs';

const c = {
  page: '#faf6ee',
  ruled: '#f0e9da',
  fleck: '#e6dcc6',
  ink: '#1c1a17',
  body: '#3a362f',
  amber: '#f2b84b',
  amberSoft: '#fce9c2',
  blue: '#2563eb',
  blueSoft: '#dce6ff',
  card: '#fffdf8',
  white: '#ffffff',
};

const tones = {
  plain: {
    fill: c.card,
    ink: c.ink,
    body: c.body,
    accent: c.blue,
    rule: '#d9cfbb',
  },
  soft: {
    fill: c.amberSoft,
    ink: c.ink,
    body: c.body,
    accent: c.blue,
    rule: '#d9b877',
  },
  accent: {
    fill: c.blue,
    ink: c.white,
    body: c.white,
    accent: c.amber,
    rule: c.white,
  },
  deep: { fill: c.amber, ink: c.ink, body: c.ink, accent: c.ink, rule: c.ink },
};
const ink = (width = 3, extra) => stroke(c.ink, width, extra);

/** A felt-tip swipe: uneven edges, slanted ends. */
function swipe(x, y, w, h, color, seed) {
  const next = random(seed);
  const jitter = (size) => (next() - 0.5) * size;
  const top = [];
  const bottom = [];
  const parts = Math.max(3, Math.round(w / 120));
  for (let i = 0; i <= parts; i++) {
    const t = i / parts;
    top.push([x + t * w + (i === 0 ? 6 : 0), y + jitter(7) - t * 4]);
    bottom.unshift([
      x + t * w - (i === parts ? 8 : 0),
      y + h + jitter(7) - t * 4,
    ]);
  }
  return path(`M${points([...top, ...bottom])}Z`, {
    fill: color,
    stroke: color,
    'stroke-width': 8,
    'stroke-linejoin': 'round',
  });
}

function squiggle(x, y, w, color, width = 5) {
  const waves = Math.max(2, Math.round(w / 34));
  const step = w / waves;
  let d = `M${n(x)} ${n(y)}`;
  for (let i = 0; i < waves; i++)
    d += `q${n(step / 4)} -9 ${n(step / 2)} 0t${n(step / 2)} 0`;
  return path(d, stroke(color, width));
}

function texture(w, h, seed) {
  const next = random(seed);
  let lines = '';
  for (let y = 54; y < h; y += 54) lines += `M0 ${y}H${w}`;
  let flecks = '';
  const count = Math.round((w * h) / 9000);
  for (let i = 0; i < count; i++) {
    const x = next() * w;
    const y = next() * h;
    flecks += `M${n(x)} ${n(y)}l${n((next() - 0.5) * 8)} ${n((next() - 0.5) * 8)}`;
  }
  return (
    rect(0, 0, w, h, 0, { fill: c.page }) +
    path(lines, { stroke: c.ruled, 'stroke-width': 2.5 }) +
    path(flecks, stroke(c.fleck, 2.5))
  );
}

const shadowColors = [c.amber, c.blue, c.amber, c.blue, c.amber, c.blue];

export const paper = {
  name: 'paper',
  colors: c,
  tones,
  margin: 60,
  radius: 16,
  titleInk: c.ink,
  titleMark: c.ink,
  kickerInk: c.ink,
  footerInk: c.ink,
  footerDot: c.blue,
  muted: '#5c564a',
  steps: 'zigzag',
  coverBody: c.body,
  cycleBadge: 'deep',
  arrowWidth: 6,
  contrastPairs: [
    ['title', c.ink, c.page],
    ['marker', c.ink, c.amber],
    ['source', '#5c564a', c.page],
    ['blue block', c.white, c.blue],
    ['blue soft', c.body, c.blueSoft],
    ['amber soft', c.body, c.amberSoft],
  ],

  background(w, h) {
    return (
      texture(w, h, `paper-${w}`) +
      // A strip of washi tape in the top corner.
      rotate(
        rect(w - 190, 22, 240, 62, 0, { fill: c.blueSoft }) +
          path(
            Array.from(
              { length: 12 },
              (_, i) => `M${w - 190 + i * 24} 84l28 -62`,
            ).join(''),
            { stroke: '#b9cdfb', 'stroke-width': 8 },
          ),
        32,
        w - 70,
        53,
      )
    );
  },

  eyebrow({ x, y, h, block, icon: name }) {
    const w = 24 + 36 + 14 + block.width + 28;
    const body =
      rect(x + 6, y + 7, w, h, 10, { fill: c.ink }) +
      rect(x, y, w, h, 10, {
        fill: c.amber,
        stroke: c.ink,
        'stroke-width': 3,
      }) +
      icon(name, x + 22, y + h / 2 - 18, 36, c.ink, 2.2) +
      block.draw(x + 74, y + (h - block.capHeight) / 2, c.ink);
    return { width: w, svg: rotate(body, -1.6, x + w / 2, y + h / 2) };
  },

  titleAccent: () => ({ height: 0, svg: '' }),
  titleMarks(marks, seed) {
    return marks
      .map((mark, index) =>
        swipe(
          mark.x - 5,
          mark.y + mark.height * 0.34,
          mark.width + 14,
          mark.height * 0.86,
          c.amber,
          `${seed}-${index}`,
        ),
      )
      .join('');
  },

  card({ x, y, w, h, tone = 'plain', r = 16, i = 0, shadow }) {
    const t = tones[tone];
    const under = shadow ?? (tone === 'plain' ? shadowColors[i % 6] : c.ink);
    return (
      rect(x + 9, y + 10, w, h, r, {
        fill: under,
        stroke: c.ink,
        'stroke-width': 3,
      }) +
      rect(x, y, w, h, r, { fill: t.fill, stroke: c.ink, 'stroke-width': 3 })
    );
  },

  panelHead({ x, y, w, h, tone, r = 16 }) {
    return path(roundRect(x, y, w, h, [r, r, 0, 0]), {
      fill: tones[tone].fill,
      stroke: c.ink,
      'stroke-width': 3,
    });
  },

  chip({ x, y, s, name, tone = 'solid', i = 0 }) {
    const styles = {
      solid: [c.amber, c.ink],
      blue: [c.blue, c.white],
      deep: [c.ink, c.white],
      soft: [c.amberSoft, c.ink],
      white: [c.white, c.ink],
      ghost: [c.amber, c.ink],
    };
    const [fill, color] = styles[tone];
    const size = s * 0.56;
    return rotate(
      rect(x, y, s, s, s * 0.2, { fill, stroke: c.ink, 'stroke-width': 3 }) +
        icon(name, x + (s - size) / 2, y + (s - size) / 2, size, color, 2),
      [-3.5, 3, -2.5, 3.5, -3, 2.5][i % 6],
      x + s / 2,
      y + s / 2,
    );
  },
  chipTones: ['solid', 'blue', 'solid', 'blue', 'solid', 'blue'],
  softChipTones: ['solid', 'blue', 'solid', 'blue', 'solid', 'blue'],

  badge({ cx, cy, r, block, tone = 'deep' }) {
    const fill = { deep: c.ink, blue: c.blue, white: c.white }[tone];
    return (
      circle(cx, cy, r + 3, { fill, stroke: c.ink, 'stroke-width': 3 }) +
      block.draw(
        cx - block.width / 2,
        cy - block.capHeight / 2,
        tone === 'white' ? c.ink : c.white,
      )
    );
  },

  connector({ from, to, width = 5 }) {
    const dir = direction(from, to);
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const bend = length * 0.18;
    const mid = [
      (from[0] + to[0]) / 2 - dir[1] * bend,
      (from[1] + to[1]) / 2 + dir[0] * bend,
    ];
    const tipDir = direction(mid, to);
    const head = arrowHead(to, tipDir, 22);
    return (
      path(`M${points([from])}Q${points([mid])} ${points([to])}`, ink(width)) +
      path(`M${points([head.left, to, head.right])}`, ink(width))
    );
  },
  curve({ d, tip, dir, width = 6 }) {
    const head = arrowHead(tip, dir, 28);
    return (
      path(d, ink(width)) +
      path(`M${points([head.left, tip, head.right])}`, ink(width))
    );
  },

  bullet({ x, y, s, side }) {
    return (
      circle(x + s / 2, y + s / 2, s / 2 - 3, {
        fill: side === 0 ? c.amber : c.blue,
        stroke: c.ink,
        'stroke-width': 3,
      }) +
      path(
        `M${n(x + s * 0.42)} ${n(y + s * 0.3)}l${n(s * 0.2)} ${n(s * 0.2)}l${n(-s * 0.2)} ${n(s * 0.2)}`,
        stroke(side === 0 ? c.ink : c.white, s * 0.11),
      )
    );
  },

  rule: (x1, y1, x2, y2) =>
    line(x1, y1, x2, y2, stroke('#cfc4ad', 3, { 'stroke-dasharray': '1 11' })),

  versus({ cx, cy, block }) {
    return rotate(
      circle(cx + 4, cy + 5, 46, { fill: c.ink }) +
        circle(cx, cy, 46, {
          fill: c.white,
          stroke: c.ink,
          'stroke-width': 3,
        }) +
        block.draw(cx - block.width / 2, cy - block.capHeight / 2, c.ink),
      -8,
      cx,
      cy,
    );
  },

  cardDeco({ x, y, w, tone, i }) {
    const color = tone === 'plain' ? (i % 2 ? c.amber : c.blue) : c.amber;
    const right = x + w - 34;
    const top = y + 34;
    const marks = [
      // Three quick strokes, a ring, a plus and a squiggle take turns.
      () =>
        path(
          `M${n(right - 44)} ${n(top + 4)}l10 24M${n(right - 18)} ${n(top - 2)}l4 28M${n(right + 8)} ${n(top + 4)}l-4 22`,
          stroke(color, 7),
        ),
      () => circle(right - 14, top + 14, 17, stroke(color, 7)),
      () =>
        path(
          `M${n(right - 16)} ${n(top - 2)}v36M${n(right - 34)} ${n(top + 16)}h36`,
          stroke(color, 7),
        ),
      () => squiggle(right - 78, top + 12, 78, color, 7),
    ];
    return marks[i % 4]();
  },

  bar({ x, y, w, h, full, best, i = 0 }) {
    const width = w > 0 ? Math.max(w, 12) : 0;
    void i;
    return (
      path(
        `M${n(x)} ${n(y + h)}H${n(x + full)}`,
        ink(3, { 'stroke-dasharray': '1 11' }),
      ) +
      rect(x + 7, y + 8, width, h, Math.min(8, width / 2), { fill: c.ink }) +
      rect(x, y, width, h, Math.min(8, width / 2), {
        fill: best ? c.blue : c.amber,
        stroke: c.ink,
        'stroke-width': 3,
      })
    );
  },

  slabTone(index, count) {
    const looks = [
      { fill: c.card, ink: c.ink, body: c.body, number: c.blue },
      { fill: c.amberSoft, ink: c.ink, body: c.body, number: c.ink },
      { fill: c.amber, ink: c.ink, body: c.ink, number: c.ink },
      { fill: c.blueSoft, ink: c.ink, body: c.body, number: c.ink },
      { fill: c.blue, ink: c.white, body: c.white, number: c.white },
      { fill: c.ink, ink: c.white, body: '#f3ead8', number: c.amber },
    ];
    const pick = {
      3: [0, 2, 4],
      4: [0, 1, 2, 4],
      5: [0, 1, 2, 3, 4],
      6: [0, 1, 2, 3, 4, 5],
    };
    return looks[pick[count][index]];
  },
  slab({ x, y, w, h, index, count, depth }) {
    const { fill } = this.slabTone(index, count);
    const d = depth;
    return (
      path(
        `M${n(x + d * 2)} ${n(y - d)}H${n(x + w - d * 2)}L${n(x + w)} ${n(y)}H${n(x)}Z`,
        {
          fill: '#e9dfca',
          stroke: c.ink,
          'stroke-width': 3,
          'stroke-linejoin': 'round',
        },
      ) + rect(x, y, w, h, 4, { fill, stroke: c.ink, 'stroke-width': 3 })
    );
  },

  note({ x, y, w, h, block, name }) {
    return (
      this.card({ x, y, w, h, tone: 'deep', r: 14 }) +
      this.chip({
        x: x + 30,
        y: y + (h - 84) / 2,
        s: 84,
        name,
        tone: 'white',
      }) +
      block.draw(x + 144, y + (h - block.height) / 2, c.ink)
    );
  },

  footerMotif({ right, y }) {
    return squiggle(right - 170, y + 4, 170, c.blue, 6);
  },

  pairLink({ cx, cy, from, to }) {
    return (
      path(`M${n(from + 10)} ${n(cy)}H${n(to)}`, ink(4)) +
      circle(cx, cy, 30, { fill: c.white, stroke: c.ink, 'stroke-width': 3 }) +
      path(
        [-8, 8]
          .map((dy) => `M${n(cx - 14)} ${n(cy + dy + 2)}q7 -8 14 -2t14 -2`)
          .join(''),
        ink(4.5),
      )
    );
  },

  centre({ cx, cy, w, h, block }) {
    return (
      rect(cx - w / 2 + 8, cy - h / 2 + 9, w, h, h / 2, { fill: c.ink }) +
      rect(cx - w / 2, cy - h / 2, w, h, h / 2, {
        fill: c.amber,
        stroke: c.ink,
        'stroke-width': 3,
      }) +
      block.draw(cx - block.width / 2, cy - block.height / 2, c.ink, {
        align: 'center',
      })
    );
  },

  cover: {
    textWidth: 600,
    tag: ({ x, y, w, h }) => ({
      ink: c.ink,
      angle: -1.6,
      svg:
        rect(x + 6, y + 7, w, h, 10, { fill: c.ink }) +
        rect(x, y, w, h, 10, {
          fill: c.white,
          stroke: c.ink,
          'stroke-width': 3,
        }),
    }),
    background(w, h) {
      return texture(w, h, `paper-cover-${h}`);
    },
    art({ w, h, icons }) {
      const cx = w - 256;
      const cy = h * 0.5;
      const sticker = (x, y, s, fill, color, name, angle, weight) =>
        rotate(
          rect(x - s / 2 + 12, y - s / 2 + 13, s, s, s * 0.13, {
            fill: c.ink,
          }) +
            rect(x - s / 2, y - s / 2, s, s, s * 0.13, {
              fill,
              stroke: c.ink,
              'stroke-width': 4,
            }) +
            icon(name, x - s * 0.31, y - s * 0.31, s * 0.62, color, weight),
          angle,
          x,
          y,
        );
      let out =
        // Sparks and scribbles around the stickers.
        path(
          `M${n(cx - 214)} ${n(cy - 150)}l-22 -24M${n(cx - 186)} ${n(cy - 178)}l-10 -38M${n(cx - 226)} ${n(cy - 112)}l-24 -6`,
          ink(6),
        ) +
        squiggle(cx - 176, cy + 226, 150, c.blue, 7) +
        path(
          `M${n(cx + 8)} ${n(cy - 262)}l0 36M${n(cx - 10)} ${n(cy - 244)}l36 0`,
          stroke(c.blue, 7),
        );
      if (icons[1])
        out += sticker(
          cx + 112,
          cy - 152,
          178,
          c.blue,
          c.white,
          icons[1],
          8,
          1.9,
        );
      if (icons[2])
        out += sticker(
          cx + 122,
          cy + 172,
          168,
          c.card,
          c.ink,
          icons[2],
          -7,
          1.9,
        );
      out += sticker(cx - 58, cy + 2, 264, c.amber, c.ink, icons[0], -5, 1.7);
      return out;
    },
  },
};
