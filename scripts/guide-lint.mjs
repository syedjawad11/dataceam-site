// Guide lint: `npm run guide:lint [-- <slug>]` and `--self-test`.
// Every failure prints "guides/<file> [rule] what is wrong: how to fix".
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  GuideToolError,
  REPO_ROOT,
  assertSlug,
  dateString,
  loadGuides,
  loadInsights,
  parseArgs,
  toDate,
} from './guides/common.mjs';
import {
  blockTexts,
  extractLinks,
  fleschReadingEase,
  inlineText,
  normalizeText,
  parseBlocks,
  sentences,
  words,
  wordCount,
} from './guides/markdown.mjs';

const DAY = 24 * 60 * 60 * 1000;
const STATIC_PAGES = new Set([
  '/',
  '/faq/',
  '/jobs/',
  '/companies/',
  '/insights/',
  '/disclosure/',
  '/guides/',
]);
const STOPWORDS = new Set(
  'a an the of to in on for and or is are was be do does did how what why when which who can with it its vs your you'.split(
    ' ',
  ),
);
const BAD_ANCHORS = new Set([
  'here',
  'click here',
  'read more',
  'more',
  'link',
  'this',
  'this link',
  'learn more',
]);
const REFERRAL_HOST = /micro1|mercor|datafactor|lodex/i;

const clip = (text, count = 8) => {
  const list = text.split(/\s+/);
  return `${list.slice(0, count).join(' ')}${list.length > count ? '...' : ''}`;
};
const normalizeKeyword = (text) =>
  normalizeText(text.replace(/\([^)]*\)|\[[^\]]*\]/g, ' '));
const padded = (text) => ` ${text} `;
const countOccurrences = (haystack, needle) => {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  const hay = padded(haystack);
  const pin = padded(needle);
  for (;;) {
    const at = hay.indexOf(pin, from);
    if (at === -1) return count;
    count += 1;
    from = at + pin.length - 1;
  }
};

function loadBanned(root) {
  const file = path.join(root, 'ops/guides/banned-phrases.json');
  if (!existsSync(file))
    return {
      error:
        'ops/guides/banned-phrases.json is missing: ask Claude Code to restore it (fail closed).',
    };
  let list;
  try {
    list = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return {
      error: `ops/guides/banned-phrases.json is not valid JSON: ${error.message}`,
    };
  }
  if (!Array.isArray(list) || list.some((item) => typeof item !== 'string')) {
    return {
      error:
        'ops/guides/banned-phrases.json must be a JSON array of strings (regex strings, matched case-insensitively).',
    };
  }
  try {
    return { patterns: list.map((item) => [item, new RegExp(item, 'iu')]) };
  } catch (error) {
    return {
      error: `ops/guides/banned-phrases.json has an invalid regex: ${error.message}`,
    };
  }
}

function referralHosts(root) {
  const hosts = new Set();
  const file = path.join(root, 'src/config/site.ts');
  if (!existsSync(file)) return hosts;
  for (const match of readFileSync(file, 'utf8').matchAll(
    /href:\s*'(https?:\/\/[^']+)'/g,
  )) {
    try {
      hosts.add(new URL(match[1]).hostname);
    } catch {
      /* ignore */
    }
  }
  return hosts;
}

function shingles(blocks, size = 10) {
  const tokens = [];
  const push = (text) => {
    for (const word of words(normalizeText(text).replace(/ /g, ' ')))
      tokens.push(word);
  };
  for (const block of blocks) {
    const sources =
      block.type === 'paragraph' ||
      block.type === 'quote' ||
      block.type === 'heading'
        ? [block.text]
        : block.type === 'list'
          ? block.items
          : [];
    for (const source of sources) {
      // Quoted text and link titles may legitimately repeat: cut them out.
      const cleaned = inlineText(
        source
          .replace(/\[[^\]]*\]\([^)]*\)/g, ' \u0000 ')
          .replace(/"[^"]*"|“[^”]*”/g, ' \u0000 '),
      );
      for (const piece of cleaned.split('\u0000')) {
        push(piece);
        tokens.push('\u0000');
      }
    }
  }
  const out = new Set();
  for (let i = 0; i + size <= tokens.length; i += 1) {
    const slice = tokens.slice(i, i + size);
    if (!slice.includes('\u0000')) out.add(slice.join(' '));
  }
  return out;
}

/** Runs every rule. Returns { failures: [{file, rule, msg}], stats }. */
export function analyzeGuide(root, slug, { now = new Date() } = {}) {
  assertSlug(slug);
  const guides = loadGuides(root);
  const guide = guides.find((item) => item.slug === slug);
  if (!guide)
    throw new GuideToolError(
      `No guide with slug "${slug}" in src/content/guides/.`,
    );
  const { fm, body } = guide;
  const file = `guides/${guide.file}`;
  const failures = [];
  const fail = (rule, msg) => failures.push({ file, rule, msg });
  const str = (key) => (typeof fm[key] === 'string' ? fm[key].trim() : '');

  const blocks = parseBlocks(body);
  const headings = blocks.filter((b) => b.type === 'heading');
  const h2s = headings.filter((h) => h.level === 2);
  const texts = blockTexts(blocks);
  const bodyText = texts.join('\n');
  const bodyWords = wordCount(bodyText);

  // ---- frontmatter -------------------------------------------------------
  const title = str('title');
  const seoTitle = str('seoTitle');
  const description = str('description');
  const keyword = str('primaryKeyword');
  if (title.length < 35 || title.length > 75)
    fail(
      'title-length',
      `title is ${title.length} characters (35-75): rewrite it as the full question or topic.`,
    );
  if (!seoTitle)
    fail(
      'seo-title',
      'seoTitle is missing: add a browser title of at most 49 characters.',
    );
  else if (seoTitle.length > 49)
    fail(
      'seo-title',
      `seoTitle is ${seoTitle.length} characters (max 49): shorten it (" | Dataceam" is added).`,
    );
  if (description.length < 110 || description.length > 160)
    fail(
      'description-length',
      `description is ${description.length} characters (110-160): rewrite it.`,
    );
  if (!keyword)
    fail(
      'keyword-missing',
      'primaryKeyword is missing: add the exact search phrase this guide targets.',
    );
  for (const key of ['topic', 'imageAlt']) {
    if (!str(key))
      fail('frontmatter', `${key} is missing: add it to the frontmatter.`);
  }
  for (const [key, min, max] of [
    ['keywords', 3, 12],
    ['takeaways', 3, 6],
  ]) {
    const list = fm[key];
    if (
      !Array.isArray(list) ||
      list.length < min ||
      list.length > max ||
      list.some((x) => typeof x !== 'string' || !x.trim())
    ) {
      fail(
        'frontmatter',
        `${key} must be a list of ${min}-${max} non-empty strings.`,
      );
    }
  }

  const today = now.getTime();
  const pub = toDate(fm.pubDate);
  if (!pub)
    fail('pub-date', 'pubDate is missing or not a date: use YYYY-MM-DD.');
  else if (pub.getTime() > today + 14 * 60 * 60 * 1000)
    fail(
      'pub-date',
      `pubDate ${dateString(fm.pubDate)} is in the future: use today's date (Europe/Malta).`,
    );
  if (fm.updatedDate !== undefined) {
    const upd = toDate(fm.updatedDate);
    if (!upd) fail('pub-date', 'updatedDate is not a date: use YYYY-MM-DD.');
    else if (upd.getTime() > today + 14 * 60 * 60 * 1000)
      fail('pub-date', 'updatedDate is in the future: use today.');
    else if (pub && upd < pub)
      fail('pub-date', 'updatedDate is before pubDate: fix one of them.');
  }

  const coverRel = `../../assets/guides/${slug}/cover.png`;
  if (fm.image !== coverRel)
    fail(
      'image-file',
      `image must be "${coverRel}" (got "${fm.image}"): fix the frontmatter path.`,
    );
  else if (!existsSync(path.join(root, `src/assets/guides/${slug}/cover.png`)))
    fail(
      'image-file',
      `src/assets/guides/${slug}/cover.png does not exist: run npm run guide:images -- ${slug}.`,
    );
  const ogRel = `/og/guides/${slug}.png`;
  if (fm.ogImage !== ogRel)
    fail('og-file', `ogImage must be "${ogRel}" (got "${fm.ogImage}").`);
  else if (!existsSync(path.join(root, `public/og/guides/${slug}.png`)))
    fail(
      'og-file',
      `public/og/guides/${slug}.png does not exist: run npm run guide:images -- ${slug}.`,
    );

  const infoPath = path.join(root, `ops/guides/infographics/${slug}.json`);
  if (!existsSync(infoPath))
    fail(
      'theme',
      `ops/guides/infographics/${slug}.json is missing: write the infographic spec.`,
    );
  else {
    try {
      const info = JSON.parse(readFileSync(infoPath, 'utf8'));
      if (info.theme !== fm.theme)
        fail(
          'theme',
          `frontmatter theme "${fm.theme}" differs from infographics JSON theme "${info.theme}": make them equal and re-run guide:images.`,
        );
    } catch (error) {
      fail(
        'theme',
        `ops/guides/infographics/${slug}.json is not valid JSON: ${error.message}`,
      );
    }
  }

  // ---- primary keyword ---------------------------------------------------
  if (keyword) {
    const phrase = normalizeKeyword(keyword);
    const inTitle = [title, seoTitle].some((t) =>
      padded(normalizeKeyword(t)).includes(padded(phrase)),
    );
    if (!inTitle)
      fail(
        'keyword-title',
        `primaryKeyword "${keyword}" does not appear as a phrase in the title or seoTitle: work the exact phrase into one of them.`,
      );
    const significant = words(phrase).filter((w) => !STOPWORDS.has(w));
    const hasAll = (text) => {
      const set = new Set(words(normalizeText(text)));
      const missing = significant.filter(
        (w) =>
          !(
            set.has(w) ||
            set.has(`${w}s`) ||
            (w.endsWith('s') && set.has(w.slice(0, -1)))
          ),
      );
      return missing;
    };
    const firstHeading = blocks.findIndex((b) => b.type === 'heading');
    const firstParagraph = blocks
      .slice(0, firstHeading === -1 ? blocks.length : firstHeading)
      .find((b) => b.type === 'paragraph');
    if (firstParagraph) {
      const missing = hasAll(inlineText(firstParagraph.text));
      if (missing.length)
        fail(
          'keyword-first-paragraph',
          `first paragraph lacks keyword word(s): ${missing.join(', ')}: use them in the opening paragraph.`,
        );
    }
    const missingDesc = hasAll(description);
    if (missingDesc.length)
      fail(
        'keyword-description',
        `description lacks keyword word(s): ${missingDesc.join(', ')}: rewrite the description.`,
      );
    if (!h2s.some((h) => hasAll(inlineText(h.text)).length === 0))
      fail(
        'keyword-h2',
        `no h2 contains all the significant words of "${keyword}" (${significant.join(', ')}): rephrase one h2.`,
      );
    const uses = countOccurrences(normalizeText(bodyText), phrase);
    if (uses > 12)
      fail(
        'keyword-density',
        `exact phrase "${keyword}" appears ${uses} times in the body (max 12): vary the wording.`,
      );
  }

  // ---- structure ---------------------------------------------------------
  if (bodyWords < 1200 || bodyWords > 3000)
    fail(
      'word-count',
      `body has ${bodyWords} words (1200-3000): ${bodyWords < 1200 ? 'add substance, not filler' : 'cut or split the guide'}.`,
    );
  const firstBlock = blocks.find((b) => b.type !== 'hr');
  if (!firstBlock || firstBlock.type !== 'paragraph')
    fail(
      'first-paragraph',
      'the body must open with a paragraph before any heading, image or list: add a 40-90 word opening paragraph.',
    );
  else {
    const count = wordCount(inlineText(firstBlock.text));
    if (count < 40 || count > 90)
      fail(
        'first-paragraph',
        `first paragraph has ${count} words (40-90): ${count < 40 ? 'expand it' : 'tighten it'}.`,
      );
  }
  if (h2s.length < 5)
    fail(
      'h2-count',
      `${h2s.length} h2 headings (min 5): split the content into more sections.`,
    );
  const questions = h2s.filter((h) => h.text.trim().endsWith('?'));
  if (questions.length < 2)
    fail(
      'h2-questions',
      `${questions.length} question h2 headings (min 2): phrase at least two h2 as questions.`,
    );
  for (const h of headings.filter((x) => x.level === 1))
    fail(
      'h1',
      `line ${h.line}: "${clip(h.text)}" is an h1: the template renders the h1, use h2 instead.`,
    );
  let previous = 1;
  for (const h of headings) {
    if (h.level > previous + 1)
      fail(
        'heading-jump',
        `line ${h.line}: h${h.level} "${clip(h.text)}" follows h${previous}: do not skip heading levels.`,
      );
    previous = h.level;
  }
  const faq = Array.isArray(fm.faq) ? fm.faq : [];
  const faqQuestions = new Set(
    faq.map((item) => normalizeText(String(item?.q ?? ''))),
  );
  for (const h of h2s) {
    if (faqQuestions.has(normalizeText(inlineText(h.text))))
      fail(
        'faq-duplicate',
        `h2 "${clip(h.text)}" duplicates a FAQ question: rephrase the h2 or the FAQ.`,
      );
  }
  for (const h of headings) {
    if (/^(faq|frequently asked questions|sources|references)\b/i.test(h.text))
      fail(
        'template-section',
        `line ${h.line}: "${h.text}" section: the template renders FAQ and Sources from frontmatter, remove it from the body.`,
      );
  }
  if (!blocks.some((b) => b.type === 'table'))
    fail('table', 'no markdown table: add one comparison or summary table.');
  if (
    !blocks.some((b) => b.type === 'list' && b.ordered) &&
    !h2s.some((h) => /\bexample\b/i.test(h.text))
  )
    fail(
      'ordered-list',
      'no ordered list and no "worked example" heading: add a numbered steps list or an h2 containing "example".',
    );
  const inShort = blocks
    .filter((b) => b.type === 'quote')
    .flatMap((b) => b.lines)
    .filter((l) => /^\*\*In short:\*\*/.test(l.trim())).length;
  if (inShort < 2)
    fail(
      'in-short',
      `${inShort} "**In short:**" callouts (min 2): add blockquote lines like "> **In short:** ...".`,
    );

  // ---- readability -------------------------------------------------------
  const proseTexts = [];
  for (const block of blocks) {
    if (block.type === 'paragraph' || block.type === 'quote')
      proseTexts.push(inlineText(block.text));
    else if (block.type === 'list')
      for (const item of block.items) proseTexts.push(inlineText(item));
  }
  for (const block of blocks.filter(
    (b) => b.type === 'paragraph' || b.type === 'quote',
  )) {
    const count = wordCount(inlineText(block.text));
    if (count > 110)
      fail(
        'paragraph-length',
        `line ${block.line}: paragraph has ${count} words (max 110) starting "${clip(inlineText(block.text), 6)}": split it.`,
      );
  }
  const allSentences = proseTexts.flatMap((text) => sentences(text));
  const counts = allSentences.map(wordCount);
  const average = counts.length
    ? counts.reduce((a, b) => a + b, 0) / counts.length
    : 0;
  if (average > 20)
    fail(
      'sentence-length',
      `average ${average.toFixed(1)} words (max 20): split long sentences`,
    );
  const tooLong = allSentences.filter((s) => wordCount(s) > 40);
  for (const s of tooLong.slice(0, 5))
    fail(
      'sentence-max',
      `sentence of ${wordCount(s)} words (max 40) starting "${clip(s)}": split it.`,
    );
  const flesch = fleschReadingEase(allSentences);
  if (flesch < 50)
    fail(
      'readability',
      `Flesch reading ease ${flesch.toFixed(1)} (min 50): use shorter sentences and plainer words.`,
    );

  // ---- style -------------------------------------------------------------
  guide.raw.split('\n').forEach((line, index) => {
    if (/—|\s--\s/.test(line))
      fail(
        'dash',
        `line ${index + 1}: em dash or " -- " found: use a comma, colon or full stop.`,
      );
  });
  const bangs = (bodyText.match(/!/g) ?? []).length;
  if (bangs > 2)
    fail(
      'exclamation',
      `${bangs} exclamation marks (max 2): remove the extras.`,
    );
  const banned = loadBanned(root);
  const prose = [title, description, bodyText].join('\n');
  if (banned.error) fail('banned-file', banned.error);
  else {
    for (const [source, pattern] of banned.patterns) {
      const match = prose.match(pattern);
      if (match)
        fail(
          'banned-phrase',
          `"${match[0]}" matches banned pattern /${source}/: rewrite that sentence.`,
        );
    }
  }
  if (/\bas an ai\b/i.test(prose))
    fail('as-an-ai', '"As an AI" found: write as Dataceam ("we") instead.');
  const unquoted = bodyText.replace(/"[^"\n]*"|“[^”\n]*”/g, ' ');
  const person =
    unquoted.match(/\bI(?:['’](?:m|ve|ll|d))?\b(?![/])/) ??
    unquoted.match(/\b(?:me|my|mine|myself)\b/i);
  if (person)
    fail(
      'first-person',
      `first person "${person[0]}" found near "${clip(unquoted.slice(Math.max(0, person.index - 20)), 8)}": write "we" or address the reader as "you".`,
    );

  // ---- sources and links -------------------------------------------------
  const sources = Array.isArray(fm.sources) ? fm.sources : [];
  const sourceUrls = [];
  if (sources.length < 5)
    fail(
      'sources-count',
      `${sources.length} sources (min 5): add reputable sources.`,
    );
  const norm = (url) => url.replace(/#.*$/, '').replace(/\/$/, '');
  sources.forEach((source, index) => {
    const label = `sources[${index}]`;
    if (!source || typeof source.url !== 'string' || !source.title) {
      fail('source-shape', `${label} needs title, url and checked.`);
      return;
    }
    if (!/^https:\/\//.test(source.url))
      fail(
        'source-https',
        `${label} ${source.url} is not https: use the https URL.`,
      );
    if (sourceUrls.includes(norm(source.url)))
      fail(
        'source-unique',
        `${label} ${source.url} is listed twice: remove the duplicate.`,
      );
    sourceUrls.push(norm(source.url));
    const checked = toDate(source.checked);
    if (!checked)
      fail(
        'source-checked',
        `${label} has no valid checked date: use YYYY-MM-DD.`,
      );
    else if (today - checked.getTime() > 400 * DAY)
      fail(
        'source-stale',
        `${label} ${source.url} was checked ${dateString(source.checked)}, over 400 days ago: re-check it and update the date.`,
      );
    try {
      const host = new URL(source.url).hostname;
      if (REFERRAL_HOST.test(host))
        fail(
          'referral-link',
          `${label} points at an AI-jobs platform (${host}): remove it.`,
        );
    } catch {
      fail('source-https', `${label} "${source.url}" is not a valid URL.`);
    }
  });

  const links = extractLinks(blocks);
  const refHosts = referralHosts(root);
  const externalHrefs = new Set();
  const internalTargets = new Set();
  const otherGuides = guides.filter((g) => g.slug !== slug);
  const otherLive = otherGuides.filter((g) => g.live);
  const validGuides = new Set(otherLive.map((g) => `/guides/${g.slug}/`));
  const topicsWithLive = new Set([
    ...otherLive.map((g) => g.fm.topic),
    fm.topic,
  ]);
  const insightPages = new Set(
    loadInsights(root)
      .filter((i) => !i.draft)
      .map((i) => `/insights/${i.slug}/`),
  );
  for (const link of links) {
    const text = link.text
      .toLowerCase()
      .replace(/[.!:]+$/, '')
      .trim();
    if (link.bare || BAD_ANCHORS.has(text) || /^https?:\/\//.test(text)) {
      fail(
        'anchor-text',
        `line ${link.line}: link "${clip(link.text, 6)}" has a non-descriptive anchor: use words that say where it goes.`,
      );
    }
    let url;
    if (/^(mailto:|tel:|#)/.test(link.href)) continue;
    try {
      url = new URL(link.href, 'https://dataceam.com/');
    } catch {
      fail(
        'link-form',
        `line ${link.line}: "${link.href}" is not a valid link.`,
      );
      continue;
    }
    const absolute = /^https?:\/\//i.test(link.href);
    const isSite = /^(?:www\.)?dataceam\.com$/.test(url.hostname);
    if (absolute && !isSite) {
      if (url.protocol !== 'https:')
        fail(
          'link-form',
          `line ${link.line}: external link ${link.href} is not https.`,
        );
      if (REFERRAL_HOST.test(url.hostname) || refHosts.has(url.hostname))
        fail(
          'referral-link',
          `line ${link.line}: ${link.href} is an AI-jobs platform link: never link platforms from guides, link /jobs/ instead.`,
        );
      externalHrefs.add(norm(link.href));
      continue;
    }
    if (!absolute && !link.href.startsWith('/')) {
      fail(
        'link-form',
        `line ${link.line}: "${link.href}" is a relative link: use a root-relative path such as /guides/tokens/.`,
      );
      continue;
    }
    if (!url.pathname.endsWith('/')) {
      fail(
        'internal-slash',
        `line ${link.line}: "${link.href}" has no trailing slash: write ${url.pathname}/.`,
      );
      continue;
    }
    if (url.pathname === `/guides/${slug}/`) {
      fail(
        'self-link',
        `line ${link.line}: the guide links to itself: remove the link.`,
      );
      continue;
    }
    const topic = url.pathname.match(/^\/guides\/topic\/([a-z0-9-]+)\/$/);
    const ok =
      STATIC_PAGES.has(url.pathname) ||
      validGuides.has(url.pathname) ||
      insightPages.has(url.pathname) ||
      (topic && topicsWithLive.has(topic[1]));
    if (!ok) {
      fail(
        'link-target',
        `line ${link.line}: ${url.pathname} is not a live page: link a live guide, live topic page, published insight or main page.`,
      );
      continue;
    }
    internalTargets.add(url.pathname);
  }
  const minInternal = otherLive.length < 4 ? 2 : 4;
  if (internalTargets.size < minInternal)
    fail(
      'internal-links',
      `${internalTargets.size} distinct internal page links (min ${minInternal}): link related live guides, /guides/, /faq/ or insights.`,
    );
  for (const url of sourceUrls) {
    if (!externalHrefs.has(url))
      fail(
        'source-unlinked',
        `source ${url} is not linked in the body: cite it inline with a descriptive link.`,
      );
  }
  for (const href of externalHrefs) {
    if (!sourceUrls.includes(href))
      fail(
        'external-unlisted',
        `body links to ${href}, which is not in sources: add it to the frontmatter sources or remove the link.`,
      );
  }

  // ---- images ------------------------------------------------------------
  blocks
    .filter((b) => b.type === 'paragraph' && /!\[[^\]]*\]\(/.test(b.text))
    .forEach((b) =>
      fail(
        'image-inline',
        `line ${b.line}: image inside a paragraph: put each image on its own line, followed by a blank line and an italic caption.`,
      ),
    );
  const imageBlocks = blocks.filter((b) => b.type === 'image');
  if (imageBlocks.length < 2 || imageBlocks.length > 4)
    fail(
      'images-count',
      `${imageBlocks.length} body images (need 2-4): add or remove infographics.`,
    );
  let sinceImage = null;
  const seen = new Set();
  blocks.forEach((block, index) => {
    if (block.type === 'paragraph' && sinceImage !== null) sinceImage += 1;
    if (block.type !== 'image') return;
    const match = block.src.match(
      /^\.\.\/\.\.\/assets\/guides\/([a-z0-9-]+)\/([A-Za-z0-9._-]+\.png)$/,
    );
    if (!match || match[1] !== slug)
      fail(
        'image-file',
        `line ${block.line}: image path "${block.src}" must be ../../assets/guides/${slug}/<file>.png.`,
      );
    else if (match[2] === 'cover.png')
      fail(
        'image-file',
        `line ${block.line}: the cover must not be repeated in the body: use another infographic.`,
      );
    else if (!existsSync(path.join(root, 'src/assets/guides', slug, match[2])))
      fail(
        'image-file',
        `line ${block.line}: src/assets/guides/${slug}/${match[2]} does not exist: run npm run guide:images -- ${slug}.`,
      );
    else if (seen.has(match[2]))
      fail('image-file', `line ${block.line}: ${match[2]} is used twice.`);
    else seen.add(match[2]);
    if (block.alt.length < 40 || block.alt.length > 250)
      fail(
        'image-alt',
        `line ${block.line}: alt text is ${block.alt.length} characters (40-250): describe what the infographic shows.`,
      );
    if (blocks[index + 1]?.type !== 'caption')
      fail(
        'image-caption',
        `line ${block.line}: image needs a blank line and an italic caption line (*Caption.*) right after it.`,
      );
    if (sinceImage === 0)
      fail(
        'image-spread',
        `line ${block.line}: images follow each other with no paragraph between: put at least one paragraph of text between them.`,
      );
    sinceImage = 0;
  });

  // ---- faq ---------------------------------------------------------------
  if (faq.length < 4 || faq.length > 6)
    fail('faq-count', `${faq.length} FAQ entries (need 4-6).`);
  faq.forEach((item, index) => {
    const q = String(item?.q ?? '').trim();
    const a = String(item?.a ?? '').trim();
    if (!q.endsWith('?'))
      fail(
        'faq-question',
        `faq[${index}] question "${clip(q)}" must end with "?".`,
      );
    const count = wordCount(a);
    if (count < 25 || count > 90)
      fail(
        'faq-answer',
        `faq[${index}] answer has ${count} words (25-90): ${count < 25 ? 'give a complete answer' : 'shorten it'}.`,
      );
    if (/[*[\]]\(|\*\*|<[a-z]/i.test(a))
      fail(
        'faq-answer',
        `faq[${index}] answer must be plain text (no markdown or HTML).`,
      );
  });

  // ---- originality ---------------------------------------------------------
  const mine = shingles(blocks);
  for (const other of otherLive) {
    const theirs = shingles(parseBlocks(other.body));
    const shared = [...mine].find((s) => theirs.has(s));
    if (shared)
      fail(
        'originality',
        `shares a 10-word sequence with guides/${other.file}: "${shared}": rewrite that passage in your own words.`,
      );
  }

  return {
    failures,
    stats: {
      words: bodyWords,
      flesch,
      average,
      h2: h2s.length,
      internal: internalTargets.size,
    },
  };
}

export function lintGuides(root, slugs, log = console.log) {
  let failed = 0;
  for (const slug of slugs) {
    const { failures, stats } = analyzeGuide(root, slug);
    const file = `guides/${loadGuides(root).find((g) => g.slug === slug).file}`;
    if (!failures.length) {
      log(
        `OK ${file} (${stats.words} words, Flesch ${stats.flesch.toFixed(1)}, avg sentence ${stats.average.toFixed(1)})`,
      );
      continue;
    }
    failed += failures.length;
    for (const f of failures) log(`${f.file} [${f.rule}] ${f.msg}`);
  }
  return failed;
}

async function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));
  if (flags['self-test']) {
    const { runSelfTest } = await import('./guides/guide-lint-selftest.mjs');
    await runSelfTest({ analyzeGuide });
    return;
  }
  const root =
    typeof flags.root === 'string' ? path.resolve(flags.root) : REPO_ROOT;
  const slugs = positional.length
    ? positional.map(assertSlug)
    : loadGuides(root)
        .filter((g) => g.live)
        .map((g) => g.slug);
  if (!slugs.length) {
    console.log('guide-lint: no live guides to lint.');
    return;
  }
  const failed = lintGuides(root, slugs);
  if (failed) {
    console.error(`guide-lint: ${failed} problem(s).`);
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main().catch((error) => {
    console.error(
      error instanceof GuideToolError ? `guide-lint: ${error.message}` : error,
    );
    process.exitCode = 1;
  });
}
