# What a guide contains

File: `src/content/guides/<slug>.md`. The page template adds the H1, meta line, cover, takeaways box, contents list, FAQ, sources and related guides from the frontmatter. The body holds only the article.

## Frontmatter
Keep `title`, `topic`, `tracks` as they are. Take `seoTitle`, `description`, `theme` and `primaryKeyword` from the brief (you may polish the description: 120–155 characters, no em dash).

```yaml
status: live
image: ../../assets/guides/<slug>/cover.png
imageAlt: 'What the cover shows, 40+ characters'
ogImage: /og/guides/<slug>.png
theme: daylight
primaryKeyword: 'what is …'
keywords: ['…']              # primary + the secondaries you really used, 4–10
takeaways:                    # 4–5 full sentences that stand on their own
  - '…'
faq:                          # 5–6; answers 35–80 words, plain text, no links
  - q: '…?'
    a: '…'
sources:                      # 6–10; every one is linked in the body
  - title: 'Publisher: page title'
    url: 'https://…'
    checked: <today>
pubDate: <today, Europe/Malta>
```

## Body, in this order
1. **Direct answer** (no heading, 45–85 words). Sentence one answers the title question and contains the primary keyword's words. The paragraph makes sense if quoted alone. Nothing before it.
2. One short paragraph: why this matters to the reader, with an everyday situation.
3. **5–8 H2 sections.** At least half are questions people really type (use the brief's `questions`). Each section:
   - opens with one or two sentences that answer its own heading (AI answer engines and skimmers read only this);
   - makes sense without the rest of the page;
   - uses H3 only for real sub-parts.
   Cover everything in `mustCover`. For anything in `leaveTo`, give one sentence and a link if that guide is live; otherwise one sentence and no link.
4. Inside those sections, all of these:
   - the **analogy**, carried through, with its limit stated;
   - a **worked example** with real text or numbers, as numbered steps, under its own H2;
   - at least one **table** (comparison, examples, sizes, when to use what);
   - 2–3 **"In short"** callouts: `> **In short:** one or two sentences.`
   - 2–4 **infographics** placed next to the text they explain, each followed by an italic caption line;
   - a **common mistakes or myths** section: 3–5 items, each with the correction;
   - something the reader can **do** or check for themselves.
5. Last section: a useful end (what to try or read next with internal links). No summary that repeats the article. Call it something specific, not "Conclusion".

Length: 1,200–3,000 words. Aim for 1,600–2,200. Stop when it's explained.

## Links
- **Internal:** 4–8 links to live pages (2+ while few guides are live). Always the form `/guides/tokens/`, **with the final slash**. Useful ones: other live guides, the topic page `/guides/topic/<topic>/`, `/guides/`. `/jobs/` only when the text is really about paid AI-training work, and never call it more than "a referrer only". Never link a "coming soon" guide. Never write "coming soon", "upcoming" or "a guide on this will follow" in the text: it goes out of date. Use the plain term instead; a later run turns it into a link.
- **External:** link the source at the claim it supports. The link text describes the page ("OpenAI's tokenizer guide"), never "here" or a bare URL.
- Each factual claim a reader could doubt (dates, numbers, sizes, study results, how a product behaves) has a link.

## Sources
6–10, opened in this session, that say what you cite them for. Prefer original papers, official docs, standards bodies (NIST, OWASP), universities, then well-edited explainers. The brief's `seedSources` are a start; check each one again and add better ones. No Wikipedia, no SEO blogs, no LinkedIn.

## GEO (being quoted by AI answers)
- Definitions as complete sentences: "A token is …", "RAG stands for …".
- Name things fully the first time (full name, then abbreviation).
- One fact per sentence where it matters. Dates and units stated.
- Headings match how people ask. The answer follows immediately.
- Tables and numbered steps with clear labels.

## Markdown notes
- No H1, no FAQ or Sources heading in the body, no HTML, no raw URLs, no footnotes.
- Image: `![Alt text that says what the picture shows](../../assets/guides/<slug>/<file>.png)`, blank line, `*Caption that adds something.*`
- Escape `$` and `|` in tables when needed. Straight quotes are fine.
- content-lint also blocks: "guarantee(d)", "vetted", "data broker", "LinkedIn", "partner/representative of|for|to", buyer or platform names, hype phrases.
