// Small SVG helpers. Colours are always plain hex strings from the themes.

export const n = (value) => Math.round(value * 100) / 100;

const attrs = (values) =>
  Object.entries(values)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([key, value]) =>
        ` ${key}="${typeof value === 'number' ? n(value) : value}"`,
    )
    .join('');

export const rect = (x, y, width, height, rx, extra = {}) =>
  `<rect${attrs({ x, y, width, height, rx, ...extra })}/>`;
export const circle = (cx, cy, r, extra = {}) =>
  `<circle${attrs({ cx, cy, r, ...extra })}/>`;
export const path = (d, extra = {}) => `<path${attrs({ d, ...extra })}/>`;
export const line = (x1, y1, x2, y2, extra = {}) =>
  `<path${attrs({ d: `M${n(x1)} ${n(y1)}L${n(x2)} ${n(y2)}`, ...extra })}/>`;
export const group = (content, extra = {}) =>
  `<g${attrs(extra)}>${content}</g>`;
export const rotate = (content, degrees, cx, cy) =>
  `<g transform="rotate(${n(degrees)} ${n(cx)} ${n(cy)})">${content}</g>`;

export const stroke = (color, width, extra = {}) => ({
  fill: 'none',
  stroke: color,
  'stroke-width': width,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  ...extra,
});

/** Rounded rectangle path with a radius per corner: tl, tr, br, bl. */
export function roundRect(x, y, w, h, [tl, tr, br, bl]) {
  return [
    `M${n(x + tl)} ${n(y)}`,
    `H${n(x + w - tr)}`,
    `A${tr} ${tr} 0 0 1 ${n(x + w)} ${n(y + tr)}`,
    `V${n(y + h - br)}`,
    `A${br} ${br} 0 0 1 ${n(x + w - br)} ${n(y + h)}`,
    `H${n(x + bl)}`,
    `A${bl} ${bl} 0 0 1 ${n(x)} ${n(y + h - bl)}`,
    `V${n(y + tl)}`,
    `A${tl} ${tl} 0 0 1 ${n(x + tl)} ${n(y)}Z`,
  ].join('');
}

/** Seeded random numbers (mulberry32), so textures never change. */
export function random(seed) {
  let state = 0;
  for (const char of seed) state = (state * 31 + char.codePointAt(0)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** WCAG contrast ratio of two #rrggbb colours. */
export function contrast(first, second) {
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((at) => {
      const value = Number.parseInt(hex.slice(at, at + 2), 16) / 255;
      return value <= 0.03928
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const [light, dark] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (light + 0.05) / (dark + 0.05);
}

/** A direction (unit vector) and its normal, for arrow heads. */
export function direction(from, to) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  return [dx / length, dy / length];
}

export function arrowHead(tip, [dx, dy], size) {
  const back = [tip[0] - dx * size, tip[1] - dy * size];
  const wide = size * 0.62;
  return {
    left: [back[0] - dy * wide, back[1] + dx * wide],
    right: [back[0] + dy * wide, back[1] - dx * wide],
    back,
  };
}

export const points = (list) =>
  list.map(([x, y]) => `${n(x)} ${n(y)}`).join('L');
