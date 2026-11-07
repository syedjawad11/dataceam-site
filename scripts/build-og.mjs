import { readFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = new URL('../src/assets/og.svg', import.meta.url);
const output = new URL('../public/og-default.png', import.meta.url);

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await sharp(await readFile(source))
  .png()
  .toFile(fileURLToPath(output));
console.log('Generated public/og-default.png (1200×630).');
