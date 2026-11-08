import { readFile, readdir, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const source = new URL('../src/assets/og.svg', import.meta.url);
const output = new URL('../public/og-default.png', import.meta.url);

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await sharp(await readFile(source))
  .png()
  .toFile(fileURLToPath(output));
console.log('Generated public/og-default.png (1200×630).');

// The article frontmatter uses single-line titles; quoted YAML is supported.
const insightsDirectory = new URL('../src/content/insights/', import.meta.url);
const ogDirectory = new URL('../public/og/', import.meta.url);
await mkdir(ogDirectory, { recursive: true });

function escapeXml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[character],
  );
}

function parseTitle(value) {
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'"))
    return value.slice(1, -1).replaceAll("''", "'");
  return value;
}

function wrapTitle(title) {
  const words = title.split(/\s+/);
  const candidates = [];
  // Balance lines to avoid leaving a short final word on its own.
  function split(start, lines) {
    if (start === words.length) {
      const target = title.length / lines.length;
      const score = lines.reduce(
        (sum, line) => sum + (line.length - target) ** 2,
        0,
      );
      candidates.push({ lines, score });
      return;
    }
    if (lines.length === 3) return;
    for (let end = start + 1; end <= words.length; end++) {
      const line = words.slice(start, end).join(' ');
      if (line.length > 27) break;
      split(end, [...lines, line]);
    }
  }
  split(0, []);
  candidates.sort(
    (a, b) => a.lines.length - b.lines.length || a.score - b.score,
  );
  if (!candidates.length)
    throw new Error(`OG title needs more than three lines: ${title}`);
  return candidates[0].lines;
}

for (const filename of (await readdir(insightsDirectory)).sort()) {
  if (!filename.endsWith('.md')) continue;
  const markdown = await readFile(new URL(filename, insightsDirectory), 'utf8');
  const frontmatter = markdown.match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/,
  )?.[1];
  if (!frontmatter || /^draft:\s*true\s*(?:#.*)?$/m.test(frontmatter)) continue;
  const rawTitle = frontmatter.match(/^title:\s*(.+)$/m)?.[1]?.trim();
  if (!rawTitle) throw new Error(`Missing title in ${filename}`);
  const title = parseTitle(rawTitle);
  const lines = wrapTitle(title);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="#0B0F19"/>
    <rect x="64" y="68" width="8" height="48" rx="4" fill="#2563EB"/>
    <g font-family="Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
      <text x="96" y="103" font-size="28" font-weight="700" letter-spacing="5" fill="#DBEAFE">INSIGHTS</text>
      <text x="64" y="240" font-size="64" font-weight="700" fill="#FFFFFF">${lines.map((line, index) => `<tspan x="64" dy="${index === 0 ? 0 : 82}">${escapeXml(line)}</tspan>`).join('')}</text>
      <text x="64" y="560" font-size="28" fill="#DBEAFE">dataceam.com</text>
    </g>
  </svg>`;
  const slug = filename.slice(0, -3);
  await sharp(Buffer.from(svg))
    .png()
    .toFile(fileURLToPath(new URL(`${slug}.png`, ogDirectory)));
  console.log(`Generated public/og/${slug}.png (1200×630).`);
}
