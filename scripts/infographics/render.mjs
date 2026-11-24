// SVG in, optimised PNG out. Everything here is deterministic.
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { drawBody, drawCover } from './layouts.mjs';
import { THEMES } from './themes/index.mjs';

const BODY_DENSITY = 1.5;
export const SIZE_LIMITS = {
  body: 250 * 1024,
  cover: 300 * 1024,
  og: 300 * 1024,
};

async function toPng({ width, height, svg }, density, limit) {
  const pixelWidth = Math.round(width * density);
  const document = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svg}</svg>`;
  const image = new Resvg(document, {
    fitTo: { mode: 'width', value: pixelWidth },
    font: { loadSystemFonts: false },
    shapeRendering: 2,
  }).render();
  const encode = (options) =>
    sharp(image.pixels, {
      raw: { width: image.width, height: image.height, channels: 4 },
    })
      .removeAlpha()
      .png({ compressionLevel: 9, ...options })
      .toBuffer();
  // Flat colours compress well without loss; a palette is the fallback.
  let buffer = await encode({});
  if (buffer.length > limit)
    buffer = await encode({
      palette: true,
      quality: 95,
      effort: 10,
      dither: 0,
    });
  return { buffer, width: image.width, height: image.height };
}

/** One picture of a guide; `figure` numbers the body pictures from 1. */
export async function renderImage(themeName, data, figure) {
  const theme = THEMES[themeName];
  if (data.layout === 'cover')
    return toPng(
      await drawCover(theme, data, { width: 1200, height: 675 }),
      1,
      SIZE_LIMITS.cover,
    );
  return toPng(
    await drawBody(theme, data, figure),
    BODY_DENSITY,
    SIZE_LIMITS.body,
  );
}

/** The 1200 x 630 social card, made from the cover. */
export async function renderSocial(themeName, cover) {
  const drawing = await drawCover(THEMES[themeName], cover, {
    width: 1200,
    height: 630,
    social: true,
  });
  return toPng(drawing, 1, SIZE_LIMITS.og);
}
